#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'https://api.ciweiai.com/api/utils';
const API_TOKEN_ENV_NAME = 'CIWEI_AI_TOKEN';

const API_ROUTES = {
  futureValue: { method: 'POST', path: '/v1/financial/future-value' },
  presentValue: { method: 'POST', path: '/v1/financial/present-value' },
  discountAmount: { method: 'POST', path: '/v1/financial/discount-amount' },
  markupPrice: { method: 'POST', path: '/v1/financial/markup-price' },
  annuityFutureValue: { method: 'POST', path: '/v1/financial/annuity-future-value' },
  annuityPresentValue: { method: 'POST', path: '/v1/financial/annuity-present-value' },
  loanMonthlyPayment: { method: 'POST', path: '/v1/general-calculator/finance/loan-monthly-payment' },
  investmentReturn: { method: 'POST', path: '/v1/general-calculator/finance/investment-return' },
  statisticsBasic: { method: 'POST', path: '/v1/general-calculator/statistics/basic' },
  unitConvert: { method: 'POST', path: '/v1/general-calculator/units/convert' },
  ageCalculation: { method: 'POST', path: '/v1/general-calculator/dates/age' },
  dateDifference: { method: 'POST', path: '/v1/general-calculator/dates/difference' },
  linearEquation: { method: 'POST', path: '/v1/general-calculator/equations/linear' },
  quadraticEquation: { method: 'POST', path: '/v1/general-calculator/equations/quadratic' },
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

async function callApi(apiName, inputParams = {}) {
  const route = API_ROUTES[apiName];
  if (!route) {
    const names = Object.keys(API_ROUTES).join(', ');
    throw new Error(`未知接口: ${apiName}. 可用接口: ${names}`);
  }

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

  const params = { ...inputParams };
  const url = buildUrl(BASE_URL, route.path, params);
  let body = null;

  if (route.method === 'GET') {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  } else {
    body = JSON.stringify(params);
  }

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

module.exports = {
  API_ROUTES,
  callApi,
};
