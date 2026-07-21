#!/usr/bin/env node
'use strict';

/**
 * hog-finnhub 统一 API 调用脚本。
 *
 * 基于 Finnhub REST API（https://finnhub.io/docs/api）。
 * 免费套餐：每分钟 60 次调用，超出返回 HTTP 429。
 *
 * 用法：
 *   node call_api.js --api <接口名> --params '<JSON字符串>'
 *
 * 示例：
 *   node call_api.js --api getQuote        --params '{"symbol":"AAPL"}'
 *   node call_api.js --api getCompanyProfile --params '{"symbol":"TSLA"}'
 *   node call_api.js --api searchSymbol     --params '{"q":"apple"}'
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── 配置 ──────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://finnhub.io/api/v1';
const MAX_RETRIES = 1; // 429 重试次数（指数退避）

/**
 * 读取技能配置。
 * 统一从 ~/.hogagent/skills_config.json 读取（WebUI 和 RPC 均写入此文件）。
 */
function readSkillConfig() {
  try {
    const systemDir = process.env.HOGAGENT_SYSTEM_DIR || path.join(os.homedir(), '.hogagent');
    const systemPath = path.join(systemDir, 'skills_config.json');
    const raw = fs.readFileSync(systemPath, 'utf-8');
    const config = JSON.parse(raw);
    return config['hog-finnhub'] || {};
  } catch (_) { /* ignore */ }
  return {};
}

/**
 * 加载配置。优先级：skills_config.json > 环境变量。
 * @returns {{ apiKey: string }}
 */
function loadConfig() {
  const entry = readSkillConfig();
  // 兼容两种 key 名：api-key（WebUI）和 apiKey（RPC 旧格式）
  const apiKey = entry['api-key'] || entry.apiKey || process.env.FINNHUB_API_KEY || '';
  if (!apiKey) {
    throw new Error(
      'Finnhub API Key 未配置。\n' +
      '请通过以下任一方式配置：\n' +
      '  1. WebUI 技能配置按钮 → 输入 API Key\n' +
      '  2. 手动编辑 ~/.hogagent/skills_config.json\n' +
      '  3. 设置环境变量 FINNHUB_API_KEY=your-key\n' +
      '注册地址：https://finnhub.io/register（免费，60 次/分钟）'
    );
  }
  return { apiKey };
}

// ─── API 路由映射 ──────────────────────────────────────────────────────────────
// Finnhub REST 端点映射。
// required 字段在调用前校验，缺失则直接报错。

const API_ROUTES = {
  getQuote: {
    method: 'GET',
    path: '/quote',
    required: ['symbol'],
    description: '实时股票报价（当前价、涨跌幅、成交量、52周高低）',
  },
  getCompanyProfile: {
    method: 'GET',
    path: '/stock/profile2',
    required: ['symbol'],
    description: '公司概况（行业、市值、交易所、上市国家、Logo）',
  },
  getFinancials: {
    method: 'GET',
    path: '/stock/metric',
    required: ['symbol'],
    forced: { metric: 'all' },
    description: '公司核心财务指标（市盈率、市净率、营收增长、利润率等）',
  },
  getRecommendations: {
    method: 'GET',
    path: '/stock/recommendation',
    required: ['symbol'],
    description: '分析师评级与目标价趋势（买入/持有/卖出数量）',
  },
  getEarnings: {
    method: 'GET',
    path: '/stock/earnings',
    required: ['symbol'],
    maxItems: 20, // 限制返回条数，默认取最新 20 条
    description: '历史与预期 EPS（实际值 vs 预期值、惊喜幅度）',
  },
  getInsiderTransactions: {
    method: 'GET',
    path: '/stock/insider-transactions',
    required: ['symbol'],
    description: '内部人士交易（高管/大股东的买入/卖出记录）',
  },
  getMarketNews: {
    method: 'GET',
    path: '/news',
    required: [],
    description: '市场新闻（可按 category 过滤：general/forex/crypto/merger）',
    dynamicPath: (params) => params.symbol ? '/company-news' : '/news',
  },
  getEconomicCalendar: {
    method: 'GET',
    path: '/calendar/economic',
    required: [],
    description: '经济日历（重要数据发布、央行决议等）',
  },
  getForexRates: {
    method: 'GET',
    path: '/forex/rates',
    required: [],
    description: '外汇汇率（base 货币对全部货币，默认 USD）',
  },
  getCryptoQuote: {
    method: 'GET',
    path: '/quote',
    required: ['symbol'],
    description: '加密货币报价（symbol 格式：BINANCE:BTCUSDT）',
  },
  searchSymbol: {
    method: 'GET',
    path: '/search',
    required: ['q'],
    description: '股票代码搜索（按关键词模糊匹配）',
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

// ─── HTTP 请求（含 429 重试） ──────────────────────────────────────────────────

/**
 * 向 Finnhub 发起 HTTPS 请求。
 * 遇到 429 时按指数退避重试（最多 MAX_RETRIES 次）。
 */
function httpRequest(method, urlPath, params, apiKey, attempt = 0) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${urlPath}`);
    // 注入 API Key
    url.searchParams.set('token', apiKey);

    // 附加其他查询参数
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}${url.search}`,
      method,
      headers: { 'Accept': 'application/json' },
      timeout: 20000,
    };

    const req = https.request(options, (res) => {
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

        if (res.statusCode === 429) {
          if (attempt < MAX_RETRIES) {
            // 指数退避：1s, 2s...
            const delay = Math.pow(2, attempt) * 1000;
            setTimeout(() => {
              httpRequest(method, urlPath, params, apiKey, attempt + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
            return;
          }
          reject(new Error(
            'HTTP 429: Finnhub 速率限制（免费套餐 60 次/分钟）。\n' +
            '请稍后重试，或检查是否短时间内发送了过多请求。'
          ));
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

    req.on('error', (err) => reject(new Error(`请求失败: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error(`请求超时（20s），API 路径: ${urlPath}`)); });
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
 * Finnhub 响应结构较简单，直接裁剪顶层或数组元素字段。
 */
function filterFieldsInResponse(result, fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) return result;
  if (Array.isArray(result)) {
    return result.map((item) => pickFields(item, fields));
  }
  if (result && typeof result === 'object') {
    return pickFields(result, fields);
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

  // 提取 fields
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

  // 注入 forced 参数（覆盖调用方，不对外暴露）
  if (route.forced) {
    for (const [k, v] of Object.entries(route.forced)) {
      delete requestParams[k];
      requestParams[k] = v;
    }
  }

  const config = loadConfig();
  // 动态路径（getMarketNews 按 symbol 路由到 /news 或 /company-news）
  const actualPath = route.dynamicPath ? route.dynamicPath(requestParams) : route.path;
  const result = await httpRequest(route.method, actualPath, requestParams, config.apiKey);

  // 限制返回数据量（如 getEarnings 可能返回大量历史记录）
  if (route.maxItems && Array.isArray(result) && result.length > route.maxItems) {
    return filterFieldsInResponse(result.slice(0, route.maxItems), fields);
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

module.exports = { API_ROUTES, callApi, loadConfig };
