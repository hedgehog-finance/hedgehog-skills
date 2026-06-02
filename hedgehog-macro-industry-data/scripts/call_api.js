#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'https://api.ciweiai.com/api/data';
const API_TOKEN_ENV_NAME = 'CIWEI_AI_TOKEN';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * API 路由及调用约束。
 * - method/path: HTTP 方法和路径
 * - forced:      内部强制写死的参数（覆盖调用方传值，不对外暴露）
 * - constraints: 调用前的参数校验
 *     - monthRange: { startField, endField, maxMonths }  YYYYMM 起止月份间隔上限
 *     - dateRange:  { startField, endField, maxDays }    起止日期（ISO）间隔上限
 */
const API_ROUTES = {
  // ===== 中国宏观（按月） =====
  queryCpi: {
    method: 'GET',
    path: '/v1/macro-cn/cpi',
    forced: { page: 1, page_size: 40 },
    constraints: {
      monthRange: { startField: 'start_month', endField: 'end_month', maxMonths: 36 },
    },
  },
  queryPpi: {
    method: 'GET',
    path: '/v1/macro-cn/ppi',
    forced: { page: 1, page_size: 40 },
    constraints: {
      monthRange: { startField: 'start_month', endField: 'end_month', maxMonths: 36 },
    },
  },
  queryMoneySupply: {
    method: 'GET',
    path: '/v1/macro-cn/money-supply',
    forced: { page: 1, page_size: 40 },
    constraints: {
      monthRange: { startField: 'start_month', endField: 'end_month', maxMonths: 36 },
    },
  },
  querySocialFinancing: {
    method: 'GET',
    path: '/v1/macro-cn/social-financing',
    forced: { page: 1, page_size: 40 },
    constraints: {
      monthRange: { startField: 'start_month', endField: 'end_month', maxMonths: 36 },
    },
  },
  queryPmi: {
    method: 'GET',
    path: '/v1/macro-cn/pmi',
    forced: { page: 1, page_size: 40 },
    constraints: {
      monthRange: { startField: 'start_month', endField: 'end_month', maxMonths: 36 },
    },
  },

  // ===== 中国宏观（按日） =====
  queryShibor: {
    method: 'GET',
    path: '/v1/macro-cn/shibor',
    forced: { page: 1, page_size: 90 },
    constraints: {
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 90 },
    },
  },
  queryLpr: {
    method: 'GET',
    path: '/v1/macro-cn/lpr',
    forced: { page: 1, page_size: 90 },
    constraints: {
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 90 },
    },
  },

  // ===== 美国宏观（按日） =====
  queryUsTreasury: {
    method: 'GET',
    path: '/v1/macro-us/treasury',
    forced: { page: 1, page_size: 90 },
    constraints: {
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 90 },
    },
  },
  queryUsTrycr: {
    method: 'GET',
    path: '/v1/macro-us/trycr',
    forced: { page: 1, page_size: 90 },
    constraints: {
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 90 },
    },
  },
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

function parseYYYYMM(value, fieldName, apiName) {
  const s = String(value).trim();
  const m = /^(\d{4})(\d{2})$/.exec(s);
  if (!m) {
    throw new Error(`${apiName} 参数 ${fieldName} 格式不合法（应为 YYYYMM）: ${value}`);
  }
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) {
    throw new Error(`${apiName} 参数 ${fieldName} 月份非法: ${value}`);
  }
  return year * 12 + month;
}

function validateMonthRange(params, rule, apiName) {
  const { startField, endField, maxMonths } = rule;
  const sv = params[startField];
  const ev = params[endField];
  if (sv === undefined || sv === null || sv === '') return;
  if (ev === undefined || ev === null || ev === '') return;
  const s = parseYYYYMM(sv, startField, apiName);
  const e = parseYYYYMM(ev, endField, apiName);
  if (Math.abs(e - s) > maxMonths) {
    const years = (maxMonths / 12).toFixed(0);
    throw new Error(
      `${apiName} 参数 ${startField}(${sv}) 与 ${endField}(${ev}) 间隔超过 ${maxMonths} 个月（${years} 年），请缩小查询区间`
    );
  }
}

function validateDateRange(params, rule, apiName) {
  const { startField, endField, maxDays } = rule;
  const sv = params[startField];
  const ev = params[endField];
  if (sv === undefined || sv === null || sv === '') return;
  if (ev === undefined || ev === null || ev === '') return;
  const s = Date.parse(sv);
  const e = Date.parse(ev);
  if (Number.isNaN(s)) throw new Error(`${apiName} 参数 ${startField} 格式不合法: ${sv}`);
  if (Number.isNaN(e)) throw new Error(`${apiName} 参数 ${endField} 格式不合法: ${ev}`);
  const days = Math.abs(e - s) / DAY_MS;
  if (days > maxDays) {
    throw new Error(
      `${apiName} 参数 ${startField}(${sv}) 与 ${endField}(${ev}) 间隔超过 ${maxDays} 天，请缩小查询区间`
    );
  }
}

function applyConstraints(route, apiName, params) {
  if (!route.constraints) return;
  if (route.constraints.monthRange) {
    validateMonthRange(params, route.constraints.monthRange, apiName);
  }
  if (route.constraints.dateRange) {
    validateDateRange(params, route.constraints.dateRange, apiName);
  }
}

function applyForced(route, params) {
  if (!route.forced) return;
  for (const key of Object.keys(route.forced)) {
    delete params[key];
  }
  Object.assign(params, route.forced);
}

function pickFields(obj, fields) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(obj, f)) {
      out[f] = obj[f];
    }
  }
  return out;
}

/**
 * 按 fields 过滤 data 中的字段。
 * - data 为对象且含 items 数组：对 items[] 每个元素过滤，外层分页字段保留
 * - data 为数组：对每个元素过滤
 * - data 为对象：对 data 顶层字段过滤
 */
function filterFieldsInResponse(result, fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) return result;
  if (!result || typeof result !== 'object' || result.data === undefined || result.data === null) {
    return result;
  }
  const data = result.data;
  if (Array.isArray(data)) {
    result.data = data.map((item) => pickFields(item, fields));
  } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
    result.data = {
      ...data,
      items: data.items.map((item) => pickFields(item, fields)),
    };
  } else if (data && typeof data === 'object') {
    result.data = pickFields(data, fields);
  }
  return result;
}

async function callApi(apiName, params = {}) {
  const route = API_ROUTES[apiName];
  if (!route) {
    const names = Object.keys(API_ROUTES).join(', ');
    throw new Error(`未知接口: ${apiName}. 可用接口: ${names}`);
  }

  const apiToken = getApiToken();
  const requestParams = { ...params };

  // 提取 fields（fields 不参与请求，仅用于响应字段裁剪）
  let fields = null;
  if (Object.prototype.hasOwnProperty.call(requestParams, 'fields')) {
    fields = requestParams.fields;
    delete requestParams.fields;
    if (fields !== null && fields !== undefined) {
      if (!Array.isArray(fields) || fields.some((f) => typeof f !== 'string')) {
        throw new Error(`参数 fields 必须为字符串数组`);
      }
    }
  }

  // 参数校验（基于调用方原始入参，校验完成后再写死内部参数）
  applyConstraints(route, apiName, requestParams);

  // 写死内部参数（覆盖调用方传入的 page / page_size 等）
  applyForced(route, requestParams);

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

  const result = await new Promise((resolve, reject) => {
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

  return filterFieldsInResponse(result, fields);
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
