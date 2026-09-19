#!/usr/bin/env node
'use strict';

/**
 * hog-openbb unified API invocation script.
 *
 * Call flow: loadConfig() -> ensureRunning() -> execute API request -> touchLastUsed() -> spawnWatchdog()
 *
 * Usage:
 *   node call_api.js --api <api-name> [--key value ... | --params-file <tmp-*.json>]
 *
 * Examples:
 *   node call_api.js --api getMacroIndicators --symbol GDP
 *   node call_api.js --api getOptionChains --symbol AAPL
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const { ensureRunning, touchLastUsed, spawnWatchdog, loadConfig, isPidAlive, readPidFile, PID_WATCHDOG_FILE } = require('./server_manager.js');
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;

// ─── API Route Mapping ─────────────────────────────────────────────────────────
// Each route corresponds to an OpenBB Platform REST endpoint.
// Fields in params not listed in query will be appended as path parameters to the URL.

const API_ROUTES = {
  // ===== Macroeconomic Data =====
  getMacroIndicators: {
    method: 'GET',
    path: '/api/v1/economy/fred_series',
    required: ['symbol'],
    defaults: { provider: 'fred' },
    description: 'FRED macroeconomic indicators (GDP, CPI, unemployment, federal funds rate, etc.)',
  },
  getTreasuryYields: {
    method: 'GET',
    path: '/api/v1/fixedincome/government/yield_curve',
    required: [],
    defaults: { provider: 'fred' },
    description: 'US Treasury yield curve (various maturities)',
  },
  getEconomicCalendar: {
    method: 'GET',
    path: '/api/v1/economy/calendar',
    required: [],
    defaults: { provider: 'fred' },
    description: 'Global economic calendar events (major data release times)',
  },

  // ===== Options Data =====
  getOptionChains: {
    method: 'GET',
    path: '/api/v1/derivatives/options/chains',
    required: ['symbol'],
    defaults: { provider: 'yfinance' },
    description: 'Options chain data (strike prices, expiry, implied volatility, Greeks)',
  },
  getOptionExpiry: {
    method: 'GET',
    path: '/api/v1/derivatives/options/chains',
    required: ['symbol'],
    defaults: { provider: 'yfinance' },
    description: 'Options expiry date list',
  },

  // ===== Global Indices =====
  getGlobalIndices: {
    method: 'GET',
    path: '/api/v1/index/price/historical',
    required: ['symbol'],
    defaults: { provider: 'yfinance' },
    description: 'Global major stock index quotes (S&P 500, Nasdaq, Dow Jones, etc.)',
  },

  // ===== Forex =====
  getForexRates: {
    method: 'GET',
    path: '/api/v1/currency/price/historical',
    required: ['symbol'],
    defaults: { provider: 'yfinance' },
    description: 'Forex rate data',
  },

  // ===== Commodities =====
  getCommodityPrices: {
    method: 'GET',
    path: '/api/v1/economy/fred_series',
    required: ['symbol'],
    defaults: { provider: 'fred' },
    description: 'Commodity prices (crude oil, gold, silver, etc.)',
  },
};

// ─── Argument Parsing ──────────────────────────────────────────────────────────

const CONTROL_PARAMETER_NAMES = new Set(['api', 'params', 'params-file', 'dir', 'out', 'output']);
const UNSUPPORTED_CONTROL_PARAMETERS = new Set(['dir', 'out', 'output']);
const NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function parseScalar(raw, name) {
  if (raw.trim() === '') throw new Error(`--${name} requires a non-empty value`);
  if (/\r|\n/.test(raw)) throw new Error(`--${name} contains multiple lines; use --params-file <tmp-*.json>`);
  if (raw === 'null' || /^[\[{]/.test(raw.trim())) {
    throw new Error(`--${name} is not a flat scalar; use --params-file <tmp-*.json>`);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (NUMBER_PATTERN.test(raw)) {
    const number = Number(raw);
    if (Number.isFinite(number)) return number;
  }
  return raw;
}

function parseArgs(argv) {
  const controls = {};
  const flatParams = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`Unsupported positional argument: ${arg}`);

    const equalAt = arg.indexOf('=');
    const key = arg.slice(2, equalAt === -1 ? undefined : equalAt);
    if (!key) throw new Error(`Invalid parameter name: ${arg}`);
    const raw = equalAt === -1 ? argv[i + 1] : arg.slice(equalAt + 1);
    if (equalAt === -1) {
      if (raw === undefined || raw.startsWith('--')) throw new Error(`--${key} requires a value`);
      i += 1;
    }

    if (raw.trim() === '') throw new Error(`--${key} requires a non-empty value`);
    const target = CONTROL_PARAMETER_NAMES.has(key) ? controls : flatParams;
    if (Object.prototype.hasOwnProperty.call(target, key)) throw new Error(`Duplicate parameter: --${key}`);
    target[key] = CONTROL_PARAMETER_NAMES.has(key) ? raw : parseScalar(raw, key);
  }
  return { controls, flatParams };
}

function parseJsonObject(raw, source) {
  let value;
  try {
    value = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (error) {
    const advice = source === '--params'
      ? '; use flat named parameters or write UTF-8 JSON to tmp-*.json and use --params-file'
      : '';
    throw new Error(`Invalid JSON from ${source}: ${error.message}${advice}`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${source} must contain a JSON object`);
  }
  return value;
}

function readJsonParams(args, flatParams) {
  const sourceCount = [
    Object.keys(flatParams).length > 0,
    args.params !== undefined,
    args['params-file'] !== undefined,
  ].filter(Boolean).length;
  if (sourceCount > 1) throw new Error('Flat parameters, --params-file, and --params are mutually exclusive');
  if (args.params === undefined && args['params-file'] === undefined) return flatParams;

  let raw = args.params;
  let source = '--params';
  if (args['params-file'] !== undefined) {
    source = `--params-file ${args['params-file']}`;
    try {
      const fileStat = fs.statSync(args['params-file']);
      if (!fileStat.isFile() || fileStat.size > 10 * 1024 * 1024) throw new Error('parameter file must be a regular file no larger than 10MB');
      raw = fs.readFileSync(args['params-file'], 'utf8');
    } catch (error) {
      throw new Error(`Unable to read ${source}: ${error.message}`);
    }
  }
  return parseJsonObject(raw, source);
}

// ─── HTTP Request ───────────────────────────────────────────────────────────────

/**
 * Send an HTTP request to the OpenBB API.
 * @param {string} apiUrl  Service address, e.g. http://localhost:59201
 * @param {string} method  HTTP method
 * @param {string} urlPath API path
 * @param {object} params  Query parameters
 * @returns {Promise<object>}
 */
function httpRequest(apiUrl, method, urlPath, params) {
  return new Promise((resolve, reject) => {
    const base = apiUrl.replace(/\/+$/, '');
    const url = new URL(`${base}${urlPath}`);

    // Append query parameters
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => {
          const encoded = v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v);
          url.searchParams.append(key, encoded);
        });
      } else if (typeof value === 'object') {
        url.searchParams.set(key, JSON.stringify(value));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
    if (url.toString().length > 65_536) {
      reject(new Error('Request URL exceeds the 65536-character limit'));
      return;
    }

    const options = {
      method,
      headers: { 'Accept': 'application/json' },
      timeout: 30000,
    };

    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(url, options, (res) => {
      const chunks = [];
      let received = 0;
      const declaredLength = Number(res.headers['content-length']);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
        req.destroy(new Error(`Response exceeds ${MAX_RESPONSE_BYTES} bytes`));
        return;
      }
      res.on('data', (chunk) => {
        received += chunk.length;
        if (received > MAX_RESPONSE_BYTES) {
          req.destroy(new Error(`Response exceeds ${MAX_RESPONSE_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let body;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch (err) {
          reject(new Error(`Response JSON parse failed: ${err.message}\nRaw response: ${raw.slice(0, 500)}`));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const msg = (typeof body === 'object' ? JSON.stringify(body) : String(body)).slice(0, 500);
          reject(new Error(`HTTP ${res.statusCode}: ${msg}`));
          return;
        }
        resolve(body);
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}\nPlease ensure the openbb-api service is running (${apiUrl})`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout (30s), API path: ${urlPath}`));
    });

    req.end();
  });
}

// ─── Field Filtering ───────────────────────────────────────────────────────────

function pickFields(obj, fields) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(obj, f)) out[f] = obj[f];
  }
  return out;
}

/**
 * Trim response items[] fields based on the fields parameter.
 * Supports OpenBB's { results: ... } envelope and legacy { data: ... } responses.
 */
function filterFieldsInResponse(result, fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) return result;
  if (!result || typeof result !== 'object') return result;

  const key = result.results !== undefined ? 'results' : result.data !== undefined ? 'data' : null;
  const data = key ? result[key] : result;

  if (Array.isArray(data)) {
    const filtered = data.map((item) => pickFields(item, fields));
    return key ? { ...result, [key]: filtered } : filtered;
  }

  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    const filtered = { ...data, items: data.items.map((item) => pickFields(item, fields)) };
    return key ? { ...result, [key]: filtered } : filtered;
  }

  if (data && typeof data === 'object') {
    return key ? { ...result, [key]: pickFields(data, fields) } : pickFields(data, fields);
  }

  return result;
}

// ─── Main Flow ─────────────────────────────────────────────────────────────────

async function callApi(apiName, params = {}) {
  const route = API_ROUTES[apiName];
  if (!route) {
    const available = Object.keys(API_ROUTES)
      .map((k) => `  ${k} — ${API_ROUTES[k].description}`)
      .join('\n');
    throw new Error(`Unknown API: ${apiName}\nAvailable APIs:\n${available}`);
  }

  const requestParams = { ...route.defaults, ...params };

  // Extract fields (not sent in request, only used for response trimming)
  let fields = null;
  if (Object.prototype.hasOwnProperty.call(requestParams, 'fields')) {
    fields = requestParams.fields;
    delete requestParams.fields;
    if (fields && !Array.isArray(fields)) {
      throw new Error('Parameter fields must be a string array');
    }
    if (Array.isArray(fields) && fields.some((f) => typeof f !== 'string' || !f.trim())) {
      throw new Error('Parameter fields must be a string array');
    }
  }

  // Validate required parameters
  for (const req of route.required) {
    if (!Object.prototype.hasOwnProperty.call(requestParams, req)
      || requestParams[req] === null
      || requestParams[req] === undefined
      || (typeof requestParams[req] === 'string' && !requestParams[req].trim())) {
      throw new Error(`API ${apiName} missing required parameter: ${req}`);
    }
  }

  const config = loadConfig();

  // Ensure service is ready
  await ensureRunning(config);

  // Send API request
  let result;
  try {
    result = await httpRequest(config.apiUrl, route.method, route.path, requestParams);
  } finally {
    // A provider error must not leave an automatically started Python process unmanaged.
    touchLastUsed();
    const wPid = readPidFile(PID_WATCHDOG_FILE);
    if (!wPid || !isPidAlive(wPid)) spawnWatchdog();
  }

  if (apiName === 'getOptionExpiry') {
    // OpenBB returns chains as a column-oriented object (older versions used rows).
    const chains = result.results;
    const dates = Array.isArray(chains)
      ? chains.map((row) => row.expiration)
      : chains?.expiration;
    if (!Array.isArray(dates)) throw new Error('OpenBB options response is missing expiration dates');
    result = { ...result, results: [...new Set(dates.filter((date) => typeof date === 'string'))].sort().map((expiration) => ({ expiration })) };
  }

  return filterFieldsInResponse(result, fields);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 1 && ['-h', '--help'].includes(argv[0])) {
    console.log(`Usage: node call_api.js --api <api-name> [--key value ... | --params-file <tmp-*.json>]\nAPIs: ${Object.keys(API_ROUTES).join(', ')}`);
    return;
  }
  const { controls: args, flatParams } = parseArgs(argv);

  for (const name of UNSUPPORTED_CONTROL_PARAMETERS) {
    if (args[name] !== undefined) {
      throw new Error(`--${name} is a reserved control parameter and is not supported by hog-openbb; use --params-file when the API payload needs a business field named ${name}`);
    }
  }

  if (!args.api) {
    const available = Object.keys(API_ROUTES)
      .map((k) => `  ${k} — ${API_ROUTES[k].description}`)
      .join('\n');
    console.error(`Missing parameter: --api <api-name>\nAvailable APIs:\n${available}`);
    process.exit(1);
  }

  const params = readJsonParams(args, flatParams);

  const result = await callApi(args.api, params);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { API_ROUTES, callApi, parseArgs, readJsonParams };
