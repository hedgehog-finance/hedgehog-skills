#!/usr/bin/env node
'use strict';

/**
 * Ciwei Calculator API 统一调用入口。
 *
 * 调用方式：
 *   node scripts/call-api.js <method> <params>
 *     - <method>: 接口方法路径（不含 /v1/ 前缀），例如：
 *                 financial/future-value
 *                 general-calculator/finance/loan-monthly-payment
 *     - <params>: JSON 字符串，对应接口请求体。
 *
 * 设计原则：
 *   - 所有支持的方法均为 POST，请求体为 JSON。
 *   - 输入/输出参数原样透传，不做任何转换。
 *   - 所有百分比字段以小数形式传入（例如 0.05 表示 5%）。
 *   - 接口基础路径封装在本脚本内，调用方无需感知。
 */

const http = require('http');
const https = require('https');

// 接口基础地址；可通过环境变量覆盖
const BASE_URL = process.env.CALC_API_BASE_URL || 'https://api.ciweiai.com/api/utils/v1';

// 受支持的方法白名单；均为 POST + JSON
const SUPPORTED_METHODS = new Set([
  'financial/future-value',
  'financial/present-value',
  'financial/discount-amount',
  'financial/markup-price',
  'financial/annuity-future-value',
  'financial/annuity-present-value',
  'general-calculator/finance/loan-monthly-payment',
  'general-calculator/finance/investment-return',
  'general-calculator/statistics/basic',
  'general-calculator/units/convert',
  'general-calculator/dates/age',
  'general-calculator/dates/difference',
  'general-calculator/equations/linear',
  'general-calculator/equations/quadratic',
]);

function buildUrl(method) {
  const base = BASE_URL.replace(/\/+$/, '');
  const path = String(method).replace(/^\/+/, '');
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

async function callApi(method, params = {}) {
  if (!SUPPORTED_METHODS.has(method)) {
    const list = Array.from(SUPPORTED_METHODS).join('\n  ');
    throw new Error(`不支持的方法: ${method}\n受支持的方法:\n  ${list}`);
  }

  const url = buildUrl(method);
  const body = JSON.stringify(params || {});

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
    throw new Error('用法: node scripts/call-api.js <method> <params-json>');
  }
  const method = argv[0];
  const rawParams = argv[1];

  let params = {};
  if (rawParams !== undefined && rawParams !== null && rawParams !== '') {
    try {
      params = JSON.parse(rawParams);
    } catch (err) {
      throw new Error(`<params> 不是合法 JSON: ${err.message}`);
    }
  }

  const result = await callApi(method, params);
  // 数值类返回（如 financial/future-value 直接返回 number）也能正确序列化输出
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { callApi, SUPPORTED_METHODS };
