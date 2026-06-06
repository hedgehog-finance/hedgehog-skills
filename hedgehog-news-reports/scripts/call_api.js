#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'https://api.ciweiai.com/api/data';

const DAY_MS = 24 * 60 * 60 * 1000;
const FLASH_NEWS_SOURCES = ['华尔街见闻', '第一财经', '财联社', '金融界'];

/**
 * API 路由及调用约束。
 * - method/path: HTTP 方法和路径
 * - forced:      内部强制写死的参数（覆盖调用方传值，不对外暴露）
 * - required:    必填参数（缺失则报错）
 * - constraints: 调用前的参数校验
 *     - { field: { maxAgeDays: N } } 表示该日期/时间字段距当前不得超过 N 天
 */
const API_ROUTES = {
  // ===== 新闻与快讯 =====
  getNewsDetail: {
    method: 'GET',
    path: '/v1/news/:news_id',
  },
  queryFlashNewsAnalysis: {
    method: 'POST',
    path: '/v1/news/flash/analysis/query',
    forced: { page: 1, page_size: 10 },
    constraints: { start_time: { maxAgeDays: 5 } },
  },
  queryNewsAnalysis: {
    method: 'POST',
    path: '/v1/news/analysis/query',
    forced: { page: 1 },
    defaultPageSize: 10,
    defaultFields: [
      'news_id',
      'source_title',
      'title',
      'publish_time',
      'news_type',
      'summary',
      'news_analysis',
    ],
    constraints: { start_date: { maxAgeDays: 90 } },
  },

  // ===== 公告 =====
  getAnnouncementDetail: {
    method: 'GET',
    path: '/v1/announcements/:announcement_id',
  },
  queryAnnouncementAnalysis: {
    method: 'POST',
    path: '/v1/announcements/analysis/query',
    forced: { page: 1 },
    defaultPageSize: 10,
    defaultFields: [
      'announcement_id',
      'title',
      'announcement_date',
      'announce_type',
      'summary',
      'announce_analysis',
    ],
    constraints: { start_date: { maxAgeDays: 1 } },
  },

  // ===== 研报 =====
  getResearchReport: {
    method: 'GET',
    path: '/v1/research/:report_id',
  },
  queryResearchAnalysis: {
    method: 'POST',
    path: '/v1/research/analysis/query',
    forced: { page: 1 },
    defaultPageSize: 10,
    defaultFields: [
      'report_id',
      'title',
      'research_date',
      'report_type',
      'summary',
      'report_analysis',
      'rating',
      'target_price_lower',
      'target_price_upper',
    ],
    constraints: { start_date: { maxAgeDays: 90 } },
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
  const flashStartTime =
    apiName === 'queryFlashNewsAnalysis' && fieldName === 'start_time'
      ? parseFlashNewsStartTime(value)
      : null;
  const ts = flashStartTime ? flashStartTime.getTime() : Date.parse(value);
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

function parseFlashNewsStartTime(value) {
  if (typeof value !== 'string') return null;

  const match = value.match(
    /^(\d{4})(?:-(\d{2})-(\d{2})|(\d{2})(\d{2}))(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2] || match[4]);
  const day = Number(match[3] || match[5]);
  const hour = match[6] === undefined ? 0 : Number(match[6]);
  const minute = match[7] === undefined ? 0 : Number(match[7]);
  const second = match[8] === undefined ? 0 : Number(match[8]);

  if (hour > 23 || minute > 59 || second > 59) return null;

  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }
  return date;
}

function validateFlashNewsQueryParams(apiName, params) {
  const allowedParams = new Set(['source', 'start_time']);
  for (const key of Object.keys(params)) {
    if (!allowedParams.has(key)) {
      throw new Error(`${apiName} 不支持参数: ${key}. 可用参数: source, start_time`);
    }
  }

  if (params.source !== undefined && params.source !== null && params.source !== '') {
    if (typeof params.source !== 'string' || !FLASH_NEWS_SOURCES.includes(params.source)) {
      throw new Error(`${apiName} 参数 source 必须为: ${FLASH_NEWS_SOURCES.join('、')}`);
    }
  }

  if (params.start_time !== undefined && params.start_time !== null && params.start_time !== '') {
    const startTime = parseFlashNewsStartTime(params.start_time);
    if (!startTime) {
      throw new Error(
        `${apiName} 参数 start_time 格式不合法: ${params.start_time}. 支持 YYYY-MM-DD HH:MM:SS、YYYY-MM-DD HH:MM、YYYYMMDD HH:MM:SS、YYYYMMDD HH:MM、YYYY-MM-DD、YYYYMMDD`
      );
    }
  }
}

function applyConstraints(route, apiName, params) {
  if (apiName === 'queryFlashNewsAnalysis') {
    validateFlashNewsQueryParams(apiName, params);
  }

  if (route.required) {
    for (const key of route.required) {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        throw new Error(`${apiName} 缺少必填参数: ${key}`);
      }
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

function applyDefaultPageSize(route, apiName, params) {
  if (route.defaultPageSize === undefined) return;

  let pageSize = route.defaultPageSize;
  if (Object.prototype.hasOwnProperty.call(params, 'limit')) {
    const limit = params.limit;
    delete params.limit;
    if (limit !== null && limit !== undefined && limit !== '') {
      const parsed = Number(limit);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${apiName} 参数 limit 必须为正整数`);
      }
      pageSize = parsed;
    }
  }

  delete params.page_size;
  params.page_size = pageSize;
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
  } else if (route.defaultFields) {
    fields = route.defaultFields;
  }

  // 参数校验（基于调用方原始入参，校验完成后再写死内部参数）
  applyConstraints(route, apiName, requestParams);

  // 写死内部参数（覆盖调用方）
  applyForced(route, requestParams);
  applyDefaultPageSize(route, apiName, requestParams);

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
