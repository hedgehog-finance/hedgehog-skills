#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'https://api.ciweiai.com/api/data';
const API_TOKEN_ENV_NAME = 'CIWEI_AI_TOKEN';

const API_ROUTES = {
  getStockBasic: { method: 'GET', path: '/v1/stock/basic' },
  queryStockDaily: { method: 'GET', path: '/v1/stock/daily' },
  queryDailyBasic: { method: 'GET', path: '/v1/daily-basic/query' },
  listDailyBasic: { method: 'GET', path: '/v1/daily-basic/list' },
  queryMoneyflow: { method: 'GET', path: '/v1/finance/moneyflow' },
  queryIncomeStatement: { method: 'GET', path: '/v1/finance/income' },
  queryBalanceSheet: { method: 'GET', path: '/v1/finance/balance-sheet' },
  queryCashFlow: { method: 'GET', path: '/v1/finance/cash-flow' },
  queryFinanceIndicator: { method: 'GET', path: '/v1/finance/indicator' },
  queryFinanceAudit: { method: 'GET', path: '/v1/finance/audit' },
  queryFinanceMainbz: { method: 'GET', path: '/v1/finance/mainbz' },
  querySwIndustry: { method: 'GET', path: '/v1/stock/sw-industry' },
  querySwIndustryMember: { method: 'GET', path: '/v1/stock/sw-industry-member' },
  querySwIndustryDaily: { method: 'GET', path: '/v1/stock/sw-industry-daily' },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function buildUrl(routePath, params) {
  const path = routePath.replace(/:(\w+)/g, (_, key) => {
    if (params[key] === undefined || params[key] === null) {
      throw new Error(`缺少路径参数: ${key}`);
    }
    const value = params[key];
    delete params[key];
    return encodeURIComponent(String(value));
  });

  const base = BASE_URL.replace(/\/+$/, '');
  return new URL(`${base}${path}`);
}

function appendQuery(url, params) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
    } else if (typeof value === 'object') {
      url.searchParams.set(key, JSON.stringify(value));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

function parseBody(raw, contentType) {
  if (!raw) return null;
  if (contentType.includes('application/json')) {
    return JSON.parse(raw);
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    return raw;
  }
}

function getApiToken() {
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
    } catch (_) {
      // 忽略读取错误，继续走缺少鉴权配置的报错
    }
  }

  if (!apiToken) {
    throw new Error(`缺少鉴权配置: 请提供环境变量 ${API_TOKEN_ENV_NAME} (在 OpenClaw 中将自动读取 channels.hedgehog_finance.token)`);
  }

  return apiToken;
}

async function callApi(apiName, params = {}) {
  const route = API_ROUTES[apiName];
  if (!route) {
    const names = Object.keys(API_ROUTES).join(', ');
    throw new Error(`未知接口: ${apiName}. 可用接口: ${names}`);
  }

  const apiToken = getApiToken();
  const requestParams = { ...params };
  const url = buildUrl(route.path, requestParams);
  let body = null;

  if (route.method === 'GET') {
    appendQuery(url, requestParams);
  } else {
    body = JSON.stringify(requestParams);
  }

  const headers = {
    'Accept': 'application/json',
    'X-API-Token': apiToken,
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  const transport = url.protocol === 'http:' ? http : https;
  const options = {
    method: route.method,
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = transport.request(url, options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const contentType = res.headers['content-type'] || '';
        let parsed;

        try {
          parsed = parseBody(raw, contentType);
        } catch (err) {
          reject(new Error(`响应 JSON 解析失败: ${err.message}. 原始响应: ${raw}`));
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const bodyText = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          reject(new Error(`HTTP ${res.statusCode}: ${bodyText}`));
          return;
        }

        resolve(parsed);
      });
    });

    req.on('error', (err) => reject(new Error(`请求失败: ${err.message}`)));

    if (body !== null) req.write(body);
    req.end();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.api) {
    throw new Error('缺少参数: --api <接口名>');
  }

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

module.exports = { API_ROUTES, callApi };
