#!/usr/bin/env node
'use strict';

/**
 * Skill Calculator API：POST /v1/indicators/calculate 调用入口。
 *
 * 用途：
 *   - 使用调用方直接传入的行情/序列数据计算 pandas-ta 指标。
 *   - 不访问外部行情服务，适合调用方已有 K 线数据或做离线回测。
 *
 * 调用方式：
 *   node scripts/call-api-calculate.js '<params-json>'
 *
 * <params-json> 至少包含：
 *   - indicator: string             指标名（与 GET /v1/indicators 中 name 一致）
 *   - data: object[]                行数据，至少包含该指标 required_fields
 *   - params: object (optional)     覆盖 default_params 中允许的键
 *
 * 设计原则：
 *   - 输入/输出参数原样透传，不做任何转换。
 *   - 接口基础路径封装在本脚本内，调用方无需感知。
 *   - 所有百分比字段以小数形式传入（例如 0.05 表示 5%）。
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.CALC_API_BASE_URL || 'https://api.ciweiai.com/api/utils/v1';
const ENDPOINT_PATH = '/indicators/calculate';

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
  if (typeof params.indicator !== 'string' || !params.indicator.trim()) {
    throw new Error('缺少必填字段: indicator (string)');
  }
  if (!Array.isArray(params.data) || params.data.length === 0) {
    throw new Error('缺少必填字段: data (object[])，且不能为空');
  }
  if (params.params !== undefined && (typeof params.params !== 'object' || Array.isArray(params.params))) {
    throw new Error('字段 params 必须是 JSON 对象');
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
    throw new Error("用法: node scripts/call-api-calculate.js '<params-json>'");
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
