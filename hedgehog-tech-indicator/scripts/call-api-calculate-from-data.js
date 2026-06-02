#!/usr/bin/env node
'use strict';

/**
 * Skill Calculator API：POST /v1/indicators/calculate-from-data 调用入口。
 *
 * 用途：
 *   - 由服务端根据股票代码、日期范围从内部 ciweiai-data 拉取行情，再计算指标。
 *   - 适合调用方不想自行准备 K 线数据的场景。
 *
 * 调用方式：
 *   node scripts/call-api-calculate-from-data.js '<params-json>'
 *
 * <params-json> 字段：
 *   - stock_code: string             必填，股票代码，如 "000001.SZ"
 *   - start_date: string(YYYY-MM-DD) 必填
 *   - end_date:   string(YYYY-MM-DD) 必填，不能早于 start_date
 *   - indicator:  string             必填，指标名（与 GET /v1/indicators 中 name 一致）
 *   - params:                object  可选，指标参数覆盖项
 *   - price_adjustment:      string  可选，"none"(默认) 或 "forward" 前复权
 *   - benchmark_stock_code:  string  可选，beta/correl 等指标必传
 *   - limit:                 integer 可选，默认 1000，范围 1~1000
 *
 * 设计原则：
 *   - 输入/输出参数原样透传，不做任何转换。
 *   - 接口基础路径封装在本脚本内，调用方无需感知。
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.CALC_API_BASE_URL || 'https://api.ciweiai.com/api/utils/v1';
const ENDPOINT_PATH = '/indicators/calculate-from-data';

function buildUrl() {
  const base = BASE_URL.replace(/\/+$/, '');
  const path = ENDPOINT_PATH.replace(/^\/+/, '');
  return new URL(`${base}/${path}`);
}

function parseBody(raw, contentType) {
  if (!raw) return null;
  if (contentType && contentType.includes('application/json')) {
    return JSON.parse(raw);
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    return raw;
  }
}

function validateParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('参数必须是 JSON 对象');
  }
  for (const key of ['stock_code', 'start_date', 'end_date', 'indicator']) {
    if (typeof params[key] !== 'string' || !params[key].trim()) {
      throw new Error(`缺少必填字段: ${key} (string)`);
    }
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(params.start_date)) {
    throw new Error('start_date 格式必须为 YYYY-MM-DD');
  }
  if (!dateRe.test(params.end_date)) {
    throw new Error('end_date 格式必须为 YYYY-MM-DD');
  }
  if (params.end_date < params.start_date) {
    throw new Error('end_date 不能早于 start_date');
  }
  if (params.params !== undefined && (typeof params.params !== 'object' || Array.isArray(params.params))) {
    throw new Error('字段 params 必须是 JSON 对象');
  }
  if (params.price_adjustment !== undefined &&
      params.price_adjustment !== 'none' &&
      params.price_adjustment !== 'forward') {
    throw new Error('price_adjustment 仅支持 "none" 或 "forward"');
  }
  if (params.limit !== undefined) {
    if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 1000) {
      throw new Error('limit 必须是 1~1000 的整数');
    }
  }
  if (params.benchmark_stock_code !== undefined &&
      params.benchmark_stock_code !== null &&
      typeof params.benchmark_stock_code !== 'string') {
    throw new Error('benchmark_stock_code 必须是字符串或 null');
  }
}

async function callApi(params) {
  validateParams(params);

  const url = buildUrl();
  const body = JSON.stringify(params);

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };

  const transport = url.protocol === 'http:' ? http : https;
  const options = { method: 'POST', headers };

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
          const text = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          reject(new Error(`HTTP ${res.statusCode}: ${text}`));
          return;
        }
        resolve(parsed);
      });
    });
    req.on('error', (err) => reject(new Error(`请求失败: ${err.message}`)));
    req.write(body);
    req.end();
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    throw new Error("用法: node scripts/call-api-calculate-from-data.js '<params-json>'");
  }

  let params;
  try {
    params = JSON.parse(argv[0]);
  } catch (err) {
    throw new Error(`<params> 不是合法 JSON: ${err.message}`);
  }

  const result = await callApi(params);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { callApi };
