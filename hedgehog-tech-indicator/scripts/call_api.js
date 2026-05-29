#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'https://api.ciweiai.com/api/utils';
const API_TOKEN_ENV_NAME = 'CIWEI_AI_TOKEN';
const CALCULATE_PATH = '/v1/indicators/calculate';
const CALCULATE_FROM_DATA_PATH = '/v1/indicators/calculate-from-data';
const FROM_DATA_FIELDS = [
  'stock_code',
  'start_date',
  'end_date',
  'price_adjustment',
  'benchmark_stock_code',
  'limit',
];

const API_ROUTES = {
  SMA: {
    method: 'POST',
    indicator: 'sma',
    aliases: ['sma'],
    defaultParams: { length: 20 },
    paramAliases: { period: 'length' },
  },
  EMA: {
    method: 'POST',
    indicator: 'ema',
    aliases: ['ema'],
    defaultParams: { length: 20 },
    paramAliases: { period: 'length' },
  },
  RSI: {
    method: 'POST',
    indicator: 'rsi',
    aliases: ['rsi'],
    defaultParams: { length: 14 },
    paramAliases: { period: 'length' },
  },
  MACD: {
    method: 'POST',
    indicator: 'macd',
    aliases: ['macd'],
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    paramAliases: {},
  },
  BOLL: {
    method: 'POST',
    indicator: 'bbands',
    aliases: ['boll', 'bbands'],
    defaultParams: { length: 20, std: 2 },
    paramAliases: { period: 'length', std_dev: 'std' },
  },
  OBV: {
    method: 'POST',
    indicator: 'obv',
    aliases: ['obv'],
    defaultParams: {},
    paramAliases: {},
  },
  KDJ: {
    method: 'POST',
    indicator: 'kdj',
    aliases: ['kdj'],
    defaultParams: { length: 9, signal: 3 },
    paramAliases: { period: 'length' },
  },
  ATR: {
    method: 'POST',
    indicator: 'atr',
    aliases: ['atr'],
    defaultParams: { length: 14 },
    paramAliases: { period: 'length' },
  },
  VWAP: {
    method: 'POST',
    indicator: 'vwap',
    aliases: ['vwap'],
    defaultParams: {},
    paramAliases: {},
  },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function apiNames() {
  return Object.keys(API_ROUTES).join(', ');
}

function resolveRoute(apiName) {
  if (!apiName) {
    throw new Error(`缺少参数: --api <接口名>. 可用接口: ${apiNames()}`);
  }

  const requested = String(apiName).trim();
  const upper = requested.toUpperCase();
  if (API_ROUTES[requested]) return { apiName: requested, route: API_ROUTES[requested] };
  if (API_ROUTES[upper]) return { apiName: upper, route: API_ROUTES[upper] };

  const lower = requested.toLowerCase();
  for (const [name, route] of Object.entries(API_ROUTES)) {
    if (route.aliases.includes(lower) || route.indicator === lower) {
      return { apiName: name, route };
    }
  }

  throw new Error(`未知接口: ${apiName}. 可用接口: ${apiNames()}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function allowedParams(route) {
  return [
    ...Object.keys(route.defaultParams),
    ...Object.keys(route.paramAliases),
  ];
}

function hasFromDataFields(input) {
  return FROM_DATA_FIELDS.some((key) => input[key] !== undefined);
}

function applyIndicatorParams(target, route, values) {
  if (!isPlainObject(values)) {
    throw new Error('params 必须是 JSON object');
  }

  for (const [key, value] of Object.entries(values)) {
    const mappedKey = route.paramAliases[key] || key;
    if (!hasOwn(route.defaultParams, mappedKey)) {
      throw new Error(`不支持参数: ${key}. 可用参数: ${allowedParams(route).join(', ') || '<无>'}`);
    }
    target[mappedKey] = value;
  }
}

function buildIndicatorParams(route, input) {
  const indicatorParams = { ...route.defaultParams };

  if (input.params !== undefined) {
    applyIndicatorParams(indicatorParams, route, input.params);
    delete input.params;
  }

  for (const key of allowedParams(route)) {
    if (input[key] === undefined) continue;
    const mappedKey = route.paramAliases[key] || key;
    indicatorParams[mappedKey] = input[key];
    delete input[key];
  }

  return indicatorParams;
}

function buildIndicatorBody(apiName, route, inputParams) {
  if (!isPlainObject(inputParams)) {
    throw new Error('--params 必须是 JSON object');
  }

  const input = { ...inputParams };
  if (input.indicator !== undefined) {
    const indicator = String(input.indicator).toLowerCase();
    if (indicator !== route.indicator && !route.aliases.includes(indicator)) {
      throw new Error(`${apiName} 不接受 indicator=${input.indicator}`);
    }
    delete input.indicator;
  }

  if (!Array.isArray(input.data)) {
    return buildFromDataBody(apiName, route, input);
  }

  if (hasFromDataFields(input)) {
    throw new Error(`${apiName} 请求不能同时传 data 和 stock_code/start_date/end_date 等行情查询参数`);
  }

  const body = {
    indicator: route.indicator,
    data: input.data,
    params: buildIndicatorParams(route, input),
  };
  delete input.data;

  if (Object.keys(input).length > 0) {
    throw new Error(`不支持参数: ${Object.keys(input).join(', ')}`);
  }

  return { path: CALCULATE_PATH, body };
}

function buildFromDataBody(apiName, route, input) {
  const missing = ['stock_code', 'start_date', 'end_date'].filter((key) => input[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`${apiName} 缺少必填参数: data 或 ${missing.join(', ')}`);
  }

  const body = {
    stock_code: input.stock_code,
    start_date: input.start_date,
    end_date: input.end_date,
    indicator: route.indicator,
    params: buildIndicatorParams(route, input),
  };

  delete input.stock_code;
  delete input.start_date;
  delete input.end_date;

  for (const key of ['price_adjustment', 'benchmark_stock_code', 'limit']) {
    if (input[key] === undefined) continue;
    body[key] = input[key];
    delete input[key];
  }

  if (Object.keys(input).length > 0) {
    throw new Error(`不支持参数: ${Object.keys(input).join(', ')}`);
  }

  return { path: CALCULATE_FROM_DATA_PATH, body };
}

function buildUrl(baseUrl, routePath, params) {
  const path = routePath.replace(/:(\w+)/g, (_, key) => {
    if (params[key] === undefined) {
      throw new Error(`缺少路径参数: ${key}`);
    }
    const value = params[key];
    delete params[key];
    return encodeURIComponent(String(value));
  });

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  return new URL(`${normalizedBase}${path}`);
}

function parseBody(rawBody) {
  if (!rawBody) return null;
  try {
    return JSON.parse(rawBody);
  } catch (_) {
    return rawBody;
  }
}

function resolveApiToken() {
  let apiToken = process.env[API_TOKEN_ENV_NAME];

  if (!apiToken) {
    try {
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        apiToken = config?.channels?.hedgehog_finance?.token;
      }
    } catch (e) {
      // 忽略读取错误，继续走缺少环境变量的报错
    }
  }

  if (!apiToken) {
    throw new Error(`缺少鉴权配置: 请提供环境变量 ${API_TOKEN_ENV_NAME} (在 OpenClaw 中将自动读取 channels.hedgehog_finance.token)`);
  }

  return apiToken;
}

async function callApi(requestedApiName, inputParams = {}) {
  const { apiName, route } = resolveRoute(requestedApiName);
  const requestParams = { ...inputParams };
  const request = buildIndicatorBody(apiName, route, requestParams);
  const url = buildUrl(BASE_URL, request.path, {});
  const apiToken = resolveApiToken();

  if (route.method === 'GET') {
    Object.entries(request.body).forEach(([key, value]) => {
      url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  }

  const body = route.method !== 'GET' ? JSON.stringify(request.body) : null;
  const transport = url.protocol === 'http:' ? http : https;
  const options = {
    method: route.method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-Token': apiToken,
    },
  };

  if (body !== null) {
    options.headers['Content-Length'] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(url, options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        const parsedBody = parseBody(rawBody);

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${rawBody || '<empty body>'}`));
          return;
        }

        resolve(parsedBody);
      });
    });

    req.on('error', (err) => reject(new Error(`请求失败: ${err.message}`)));

    if (body !== null) {
      req.write(body);
    }
    req.end();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let params = {};
  if (args.params) {
    try {
      params = JSON.parse(args.params);
    } catch (err) {
      throw new Error(`--params 不是合法 JSON: ${err.message}`);
    }
  }

  const result = await callApi(args.api, params);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = {
  API_ROUTES,
  CALCULATE_PATH,
  CALCULATE_FROM_DATA_PATH,
  buildIndicatorBody,
  callApi,
  resolveApiToken,
};
