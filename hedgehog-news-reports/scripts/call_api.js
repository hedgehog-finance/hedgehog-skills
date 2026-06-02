#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'https://api.ciweiai.com/api/data';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 把 SKILL 友好的标签参数 (industries / themes / stock_codes / stock_names)
 * 合并到接口要求的 tags_contains（JSONB 包含）对象中。
 * - 已有 tags_contains 作为基底（仅当为对象时）
 * - stock_codes / stock_names 会合并成 stocks: [{code}, {name}, ...]
 * - 调用方仍可直接传 tags_contains，会与上述字段合并
 */
function mergeTagsContains(params) {
  let merged = null;
  if (
    params.tags_contains &&
    typeof params.tags_contains === 'object' &&
    !Array.isArray(params.tags_contains)
  ) {
    merged = { ...params.tags_contains };
  }
  let touched = merged !== null;

  if (Array.isArray(params.industries)) {
    merged = merged || {};
    merged.industries = params.industries;
    touched = true;
  }
  delete params.industries;

  if (Array.isArray(params.themes)) {
    merged = merged || {};
    merged.themes = params.themes;
    touched = true;
  }
  delete params.themes;

  const stocks = [];
  if (Array.isArray(params.stock_names)) {
    for (const name of params.stock_names) {
      if (name !== undefined && name !== null && name !== '') stocks.push({ name });
    }
  }
  if (Array.isArray(params.stock_codes)) {
    for (const code of params.stock_codes) {
      if (code !== undefined && code !== null && code !== '') stocks.push({ code });
    }
  }
  delete params.stock_names;
  delete params.stock_codes;
  if (stocks.length > 0) {
    merged = merged || {};
    merged.stocks = stocks;
    touched = true;
  }

  if (touched && merged) {
    params.tags_contains = merged;
  }
}

/**
 * API 路由及调用约束。
 * - method/path: HTTP 方法和路径
 * - forced:      内部强制写死的参数（覆盖调用方传值，不对外暴露）
 * - required:    必填参数（缺失则报错）
 * - oneOf:       一组参数中至少需提供一个（如 stock_name / stock_code）
 * - constraints: 调用前的参数校验
 *     - { field: { maxAgeDays: N } } 表示该日期/时间字段距当前不得超过 N 天
 * - transform:   在 forced 之前对参数做转换（如把 industries 合并到 tags_contains）
 */
const API_ROUTES = {
  // ===== 新闻与快讯 =====
  listNewsList: {
    method: 'GET',
    path: '/v1/news/list',
    forced: { page: 1, page_size: 50 },
  },
  listFlashNews: {
    method: 'GET',
    path: '/v1/news/flash',
    forced: { page: 1, page_size: 50 },
    constraints: { start_time: { maxAgeDays: 5 } },
  },
  getNewsDetail: {
    method: 'GET',
    path: '/v1/news/:news_id',
  },
  queryFlashNewsAnalysis: {
    method: 'POST',
    path: '/v1/news/flash/analysis/query',
    forced: { page: 1, page_size: 50 },
  },
  queryNewsAnalysis: {
    method: 'POST',
    path: '/v1/news/analysis/query',
    forced: { page: 1, page_size: 10 },
    constraints: { start_date: { maxAgeDays: 90 } },
    transform: mergeTagsContains,
  },
  queryStockNewsAnalysis: {
    method: 'POST',
    path: '/v1/news/stock-analysis',
    forced: { page: 1, page_size: 10 },
    oneOf: ['stock_name', 'stock_code'],
  },

  // ===== 公告 =====
  listAnnouncements: {
    method: 'GET',
    path: '/v1/announcements/list',
    forced: { page: 1, page_size: 50 },
  },
  getAnnouncementDetail: {
    method: 'GET',
    path: '/v1/announcements/:announcement_id',
  },
  queryAnnouncementAnalysis: {
    method: 'POST',
    path: '/v1/announcements/analysis/query',
    forced: { page: 1, page_size: 10 },
    constraints: { start_date: { maxAgeDays: 90 } },
  },
  queryStockAnnouncementAnalysis: {
    method: 'POST',
    path: '/v1/announcements/stock-analysis',
    forced: { page: 1, page_size: 10 },
    oneOf: ['stock_name', 'stock_code'],
  },

  // ===== 研报 =====
  listResearch: {
    method: 'GET',
    path: '/v1/research/list',
    forced: { page: 1, page_size: 50 },
  },
  getResearchReport: {
    method: 'GET',
    path: '/v1/research/:report_id',
  },
  queryResearchAnalysis: {
    method: 'POST',
    path: '/v1/research/analysis/query',
    forced: { page: 1, page_size: 10 },
    constraints: { start_date: { maxAgeDays: 90 } },
    transform: mergeTagsContains,
  },
  queryStockResearchAnalysis: {
    method: 'POST',
    path: '/v1/research/stock-analysis',
    forced: { page: 1, page_size: 10 },
    oneOf: ['stock_name', 'stock_code'],
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
  let path = routePath.replace(/:(\w+)/g, (_, key) => {
    if (params[key] === undefined || params[key] === null || params[key] === '') {
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

function validateMaxAgeDays(value, maxDays, fieldName, apiName) {
  if (value === undefined || value === null || value === '') return;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) {
    throw new Error(`${apiName} 参数 ${fieldName} 格式不合法: ${value}`);
  }
  const ageDays = (Date.now() - ts) / DAY_MS;
  if (ageDays > maxDays) {
    throw new Error(
      `${apiName} 参数 ${fieldName} (${value}) 距当前时间已超过 ${maxDays} 天，本接口不允许查询更早的数据`
    );
  }
}

function applyConstraints(route, apiName, params) {
  if (route.required) {
    for (const key of route.required) {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        throw new Error(`${apiName} 缺少必填参数: ${key}`);
      }
    }
  }
  if (route.oneOf) {
    const present = route.oneOf.filter(
      (k) => params[k] !== undefined && params[k] !== null && params[k] !== ''
    );
    if (present.length === 0) {
      throw new Error(
        `${apiName} 缺少必填参数: ${route.oneOf.join(' / ')} 至少提供一个`
      );
    }
  }
  if (route.constraints) {
    for (const [field, rule] of Object.entries(route.constraints)) {
      if (rule.maxAgeDays !== undefined) {
        validateMaxAgeDays(params[field], rule.maxAgeDays, field, apiName);
      }
    }
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
 * - data 为数组：对每个元素过滤
 * - data 为对象且含 items 数组：对 items 内每个元素过滤，保留外层分页字段
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

  // 拷贝并提取 fields（fields 不参与请求）
  const requestParams = { ...params };
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

  // 参数转换（如把 industries / themes / stock_codes 合并到 tags_contains）
  if (typeof route.transform === 'function') {
    route.transform(requestParams);
  }

  // 写死内部参数（覆盖调用方）
  applyForced(route, requestParams);

  const url = buildUrl(route.path, requestParams);
  let body = null;

  if (route.method === 'GET') {
    appendQuery(url, requestParams);
  } else {
    body = JSON.stringify(requestParams);
  }

  const headers = {
    Accept: 'application/json',
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  const transport = url.protocol === 'http:' ? http : https;
  const options = { method: route.method, headers };

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
