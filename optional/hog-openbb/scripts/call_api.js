#!/usr/bin/env node
'use strict';

/**
 * hog-openbb 统一 API 调用脚本。
 *
 * 调用流程：loadConfig() -> ensureRunning() -> 执行 API 请求 -> touchLastUsed() -> spawnWatchdog()
 *
 * 用法：
 *   node call_api.js --api <接口名> --params '<JSON字符串>'
 *
 * 示例：
 *   node call_api.js --api getMacroIndicators --params '{"symbol":"GDP","provider":"fred"}'
 *   node call_api.js --api getOptionChains  --params '{"symbol":"AAPL","provider":"polygon"}'
 */

const http = require('http');
const { ensureRunning, touchLastUsed, spawnWatchdog, loadConfig, isPidAlive, readPidFile, PID_WATCHDOG_FILE } = require('./server_manager.js');

// ─── API 路由映射 ──────────────────────────────────────────────────────────────
// 每个路由对应 OpenBB Platform 的一个 REST 端点。
// params 中未在 query 列出的字段将作为 path 参数拼入 URL。

const API_ROUTES = {
  // ===== 宏观经济数据 =====
  getMacroIndicators: {
    method: 'GET',
    path: '/api/v1/economy/macro',
    required: [],
    description: 'FRED 宏观经济指标（GDP、CPI、失业率、联邦基金利率等）',
  },
  getTreasuryYields: {
    method: 'GET',
    path: '/api/v1/economy/treasury',
    required: [],
    description: '美国国债收益率曲线（不同期限）',
  },
  getEconomicCalendar: {
    method: 'GET',
    path: '/api/v1/economy/calendar',
    required: [],
    description: '全球经济日历事件（重要数据发布时间）',
  },

  // ===== 期权数据 =====
  getOptionChains: {
    method: 'GET',
    path: '/api/v1/derivatives/options/chains',
    required: ['symbol'],
    description: '期权链数据（行权价、到期日、隐含波动率、Greeks）',
  },
  getOptionExpiry: {
    method: 'GET',
    path: '/api/v1/derivatives/options/expirations',
    required: ['symbol'],
    description: '期权到期日列表',
  },

  // ===== 全球指数 =====
  getGlobalIndices: {
    method: 'GET',
    path: '/api/v1/index/price',
    required: [],
    description: '全球主要股指行情（标普500、纳斯达克、道琼斯等）',
  },

  // ===== 外汇 =====
  getForexRates: {
    method: 'GET',
    path: '/api/v1/currency/price',
    required: [],
    description: '外汇汇率数据',
  },

  // ===== 大宗商品 =====
  getCommodityPrices: {
    method: 'GET',
    path: '/api/v1/commodity/price',
    required: [],
    description: '大宗商品价格（原油、黄金、白银等）',
  },
};

// ─── 参数解析 ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

// ─── HTTP 请求 ─────────────────────────────────────────────────────────────────

/**
 * 向 OpenBB API 发起 HTTP 请求。
 * @param {string} apiUrl  服务地址，如 http://localhost:59201
 * @param {string} method  HTTP 方法
 * @param {string} urlPath API 路径
 * @param {object} params  查询参数
 * @returns {Promise<object>}
 */
function httpRequest(apiUrl, method, urlPath, params) {
  return new Promise((resolve, reject) => {
    const base = apiUrl.replace(/\/+$/, '');
    const url = new URL(`${base}${urlPath}`);

    // 附加查询参数
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
      } else if (typeof value === 'object') {
        url.searchParams.set(key, JSON.stringify(value));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method,
      headers: { 'Accept': 'application/json' },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let body;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch (err) {
          reject(new Error(`响应 JSON 解析失败: ${err.message}\n原始响应: ${raw.slice(0, 500)}`));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const msg = typeof body === 'object' ? JSON.stringify(body) : String(body);
          reject(new Error(`HTTP ${res.statusCode}: ${msg}`));
          return;
        }
        resolve(body);
      });
    });

    req.on('error', (err) => {
      reject(new Error(`请求失败: ${err.message}\n请确认 openbb-api 服务正在运行（${apiUrl}）`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`请求超时（30s），API 路径: ${urlPath}`));
    });

    req.end();
  });
}

// ─── 字段过滤 ──────────────────────────────────────────────────────────────────

function pickFields(obj, fields) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(obj, f)) out[f] = obj[f];
  }
  return out;
}

/**
 * 按 fields 参数裁剪响应中的 items[] 字段。
 * 支持 OpenBB 标准响应结构：{ data: [...] } 或 { data: { items: [...] } }
 */
function filterFieldsInResponse(result, fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) return result;
  if (!result || typeof result !== 'object') return result;

  const data = result.data !== undefined ? result.data : result;

  if (Array.isArray(data)) {
    const filtered = data.map((item) => pickFields(item, fields));
    return result.data !== undefined ? { ...result, data: filtered } : filtered;
  }

  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return { ...result, data: { ...data, items: data.items.map((item) => pickFields(item, fields)) } };
  }

  if (data && typeof data === 'object') {
    return result.data !== undefined ? { ...result, data: pickFields(data, fields) } : pickFields(data, fields);
  }

  return result;
}

// ─── 主流程 ────────────────────────────────────────────────────────────────────

async function callApi(apiName, params = {}) {
  const route = API_ROUTES[apiName];
  if (!route) {
    const available = Object.keys(API_ROUTES)
      .map((k) => `  ${k} — ${API_ROUTES[k].description}`)
      .join('\n');
    throw new Error(`未知接口: ${apiName}\n可用接口:\n${available}`);
  }

  const requestParams = { ...params };

  // 提取 fields（不参与请求，仅用于响应裁剪）
  let fields = null;
  if (Object.prototype.hasOwnProperty.call(requestParams, 'fields')) {
    fields = requestParams.fields;
    delete requestParams.fields;
    if (fields && !Array.isArray(fields)) {
      throw new Error('参数 fields 必须为字符串数组');
    }
    if (Array.isArray(fields) && fields.some((f) => typeof f !== 'string')) {
      throw new Error('参数 fields 必须为字符串数组');
    }
  }

  // 校验必填参数
  for (const req of route.required) {
    if (!requestParams[req]) {
      throw new Error(`接口 ${apiName} 缺少必填参数: ${req}`);
    }
  }

  const config = loadConfig();

  // 确保服务就绪
  await ensureRunning(config);

  // 发起 API 请求
  const result = await httpRequest(config.apiUrl, route.method, route.path, requestParams);

  // 请求成功后更新时间戳 & 续看门狗（失败则不更新，避免无意义保活）
  touchLastUsed();
  // 仅在无活跃看门狗时启动新看门狗，避免每次调用都产生新进程
  const wPid = readPidFile(PID_WATCHDOG_FILE);
  if (!wPid || !isPidAlive(wPid)) {
    spawnWatchdog();
  }

  return filterFieldsInResponse(result, fields);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.api) {
    const available = Object.keys(API_ROUTES)
      .map((k) => `  ${k} — ${API_ROUTES[k].description}`)
      .join('\n');
    console.error(`缺少参数: --api <接口名>\n可用接口:\n${available}`);
    process.exit(1);
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
