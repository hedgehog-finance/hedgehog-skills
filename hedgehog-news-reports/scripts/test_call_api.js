#!/usr/bin/env node
/**
 * call_api.js 端到端测试脚本
 *
 * 用法：
 *   # 测试全部接口（按顺序）
 *   node scripts/test_call_api.js
 *
 *   # 只测试指定接口
 *   node scripts/test_call_api.js --only queryNewsAnalysis
 *   node scripts/test_call_api.js --only queryNewsAnalysis,queryResearchAnalysis
 *
 *   # 同时测试参数校验失败的负向用例（时间超期等）
 *   node scripts/test_call_api.js --negative
 *
 *   # 显式指定详情接口的 ID（默认自动从查询接口取第一条）
 *   node scripts/test_call_api.js --news-id 1 --report-id 1 --announcement-id 1
 *
 *   # 指定测试用的股票代码（默认 000001.SZ）
 *   node scripts/test_call_api.js --stock-code 000001.SZ
 *
 * 环境变量：
 *   CIWEI_AI_TOKEN   API 鉴权 token；未设置时回退到 ~/.openclaw/openclaw.json
 *   API_BASE_URL     API 基地址，默认 https://api.ciweiai.com/api/data
 */

'use strict';

const { callApi, API_ROUTES } = require('./call_api.js');

// -------- 工具函数 --------

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function color(c, s) {
  return `${COLORS[c] || ''}${s}${COLORS.reset}`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
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

function isoDateOffset(days) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function previewJson(value, maxLen = 600) {
  const s = JSON.stringify(value);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + ` ... (truncated, total ${s.length} chars)`;
}

function summarizeResult(result) {
  if (!result || typeof result !== 'object') {
    return { kind: 'raw', value: result };
  }
  const { code, message, data } = result;
  let kind = 'object';
  let stat = {};
  if (Array.isArray(data)) {
    kind = 'array';
    stat = { length: data.length, sample: data[0] };
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.items)) {
      kind = 'paged';
      stat = {
        total: data.total,
        page: data.page,
        page_size: data.page_size,
        items_length: data.items.length,
        sample_item_keys: data.items[0] ? Object.keys(data.items[0]) : [],
      };
    } else {
      kind = 'object';
      stat = { keys: Object.keys(data) };
    }
  } else if (data === null) {
    kind = 'null';
  }
  return { code, message, kind, stat };
}

// -------- 测试用例定义 --------

function buildCases(opts) {
  const stockCode = opts.stockCode || '000001.SZ';

  // 安全的时间窗口（紧贴当前时间）
  const newsStart = isoDateOffset(-30); // queryNewsAnalysis 90 天内
  const researchStart = isoDateOffset(-30); // queryResearchAnalysis 90 天内

  return [
    {
      name: 'queryNewsAnalysis',
      description: '查询重大新闻分析（90 天内 + 行业/主题筛选）',
      params: {
        start_date: newsStart,
        tags: ['银行'],
        fields: ['news_id', 'title', 'publish_time', 'news_type', 'summary'],
      },
    },
    {
      name: 'getNewsDetail',
      description: '查询新闻详情及分析（路径参数 news_id）',
      // news_id 由 newsIdSource 在运行时回填
      params: { fields: ['id', 'title', 'publish_time', 'source', 'analysis'] },
      newsIdSource: true,
    },
    {
      name: 'queryResearchAnalysis',
      description: '查询研报分析（90 天内 + report_type 筛选）',
      params: {
        start_date: researchStart,
        report_type: 'stock',
        fields: ['report_id', 'research_date', 'summary', 'rating'],
      },
    },
    {
      name: 'getResearchReport',
      description: '查询研报详情及分析（路径参数 report_id）',
      params: { fields: ['id', 'title', 'org_name', 'publish_date', 'analysis'] },
      reportIdSource: true,
    },
    {
      name: 'queryAnnouncementAnalysis',
      description: '查询公告分析（指定股票代码）',
      params: {
        tags: [stockCode],
        start_date: newsStart,
        fields: ['announcement_id', 'title', 'announcement_date', 'announce_type'],
      },
    },
    {
      name: 'getAnnouncementDetail',
      description: '查询公告详情及分析（路径参数 announcement_id）',
      params: { fields: ['id', 'title', 'announcement_time', 'category', 'analysis'] },
      announcementIdSource: true,
    },
  ];
}

function buildNegativeCases() {
  return [
    {
      name: 'queryNewsAnalysis',
      description: '负向：start_date 超出 90 天 → 应抛错',
      params: { start_date: isoDateOffset(-200) },
      expectError: /90 天/,
    },
    {
      name: 'queryResearchAnalysis',
      description: '负向：start_date 超出 90 天 → 应抛错',
      params: { start_date: isoDateOffset(-200) },
      expectError: /90 天/,
    },
    {
      name: 'getNewsDetail',
      description: '负向：缺失路径参数 news_id → 应抛错',
      params: {},
      expectError: /路径参数: news_id/,
    },
  ];
}

// -------- 运行器 --------

const idCache = {
  news_id: null,
  report_id: null,
  announcement_id: null,
};

async function runOne(testCase, idx, total) {
  const header = `[${idx}/${total}] ${color('cyan', testCase.name)}  ${color('gray', testCase.description)}`;
  console.log('\n' + header);

  const params = { ...testCase.params };

  // 路径参数自动填充（来自前序查询接口的回填，或 CLI 显式指定）
  if (testCase.newsIdSource) {
    if (!idCache.news_id) {
      console.log(color('yellow', '  → 跳过：未取得 news_id（前序 queryNewsAnalysis 无返回）'));
      return { name: testCase.name, status: 'skipped', reason: 'no news_id' };
    }
    params.news_id = idCache.news_id;
  }
  if (testCase.reportIdSource) {
    if (!idCache.report_id) {
      console.log(color('yellow', '  → 跳过：未取得 report_id（前序 queryResearchAnalysis 无返回）'));
      return { name: testCase.name, status: 'skipped', reason: 'no report_id' };
    }
    params.report_id = idCache.report_id;
  }
  if (testCase.announcementIdSource) {
    if (!idCache.announcement_id) {
      console.log(color('yellow', '  → 跳过：未取得 announcement_id（前序 queryAnnouncementAnalysis 无返回）'));
      return { name: testCase.name, status: 'skipped', reason: 'no announcement_id' };
    }
    params.announcement_id = idCache.announcement_id;
  }

  console.log(color('gray', '  请求参数: ' + previewJson(params, 300)));

  const t0 = Date.now();
  try {
    const result = await callApi(testCase.name, params);
    const cost = Date.now() - t0;

    // 缓存 ID 用于后续详情接口
    cacheIdsFromResult(testCase.name, result);

    const summary = summarizeResult(result);
    console.log(color('green', `  ✓ 成功`) + color('gray', `  (耗时 ${cost} ms)`));
    console.log(color('gray', '  响应概要: ' + previewJson(summary, 400)));
    return { name: testCase.name, status: 'ok', cost, summary };
  } catch (err) {
    const cost = Date.now() - t0;
    if (testCase.expectError) {
      const ok = testCase.expectError.test(err.message);
      if (ok) {
        console.log(color('green', '  ✓ 命中预期错误') + color('gray', `  (耗时 ${cost} ms)`));
        console.log(color('gray', '  错误信息: ' + err.message));
        return { name: testCase.name, status: 'expected-error', cost };
      }
      console.log(color('red', '  ✗ 错误信息与预期不符'));
      console.log(color('red', '  实际错误: ' + err.message));
      console.log(color('red', '  预期匹配: ' + testCase.expectError));
      return { name: testCase.name, status: 'failed', cost, error: err.message };
    }
    console.log(color('red', `  ✗ 失败`) + color('gray', `  (耗时 ${cost} ms)`));
    console.log(color('red', '  错误信息: ' + err.message));
    return { name: testCase.name, status: 'failed', cost, error: err.message };
  }
}

function cacheIdsFromResult(apiName, result) {
  if (!result || !result.data) return;
  const data = result.data;

  // 从分页 items 中拿第一条
  if (apiName === 'queryNewsAnalysis' && data.items && data.items[0]) {
    idCache.news_id = data.items[0].news_id || idCache.news_id;
  }
  if (apiName === 'queryResearchAnalysis' && data.items && data.items[0]) {
    idCache.report_id = data.items[0].report_id || idCache.report_id;
  }
  if (apiName === 'queryAnnouncementAnalysis' && data.items && data.items[0]) {
    idCache.announcement_id = data.items[0].announcement_id || idCache.announcement_id;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // CLI 显式指定 ID（覆盖自动回填）
  if (args['news-id']) idCache.news_id = Number(args['news-id']);
  if (args['report-id']) idCache.report_id = Number(args['report-id']);
  if (args['announcement-id']) idCache.announcement_id = Number(args['announcement-id']);

  const stockCode = typeof args['stock-code'] === 'string' ? args['stock-code'] : undefined;

  const allCases = buildCases({ stockCode });
  let cases = allCases;

  if (args.only && typeof args.only === 'string') {
    const wanted = new Set(args.only.split(',').map((s) => s.trim()));
    cases = allCases.filter((c) => wanted.has(c.name));
    if (cases.length === 0) {
      console.error(color('red', `--only 未匹配到任何接口。可用接口: ${Object.keys(API_ROUTES).join(', ')}`));
      process.exit(2);
    }
  }

  console.log(color('bold', `\n=== 正向用例：共 ${cases.length} 项 ===`));
  const results = [];
  for (let i = 0; i < cases.length; i += 1) {
    /* eslint-disable no-await-in-loop */
    const r = await runOne(cases[i], i + 1, cases.length);
    results.push(r);
  }

  let negResults = [];
  if (args.negative) {
    const negCases = buildNegativeCases();
    console.log(color('bold', `\n=== 负向用例：共 ${negCases.length} 项 ===`));
    for (let i = 0; i < negCases.length; i += 1) {
      /* eslint-disable no-await-in-loop */
      const r = await runOne(negCases[i], i + 1, negCases.length);
      negResults.push(r);
    }
  }

  // 汇总
  const all = [...results, ...negResults];
  const okCount = all.filter((r) => r.status === 'ok' || r.status === 'expected-error').length;
  const failCount = all.filter((r) => r.status === 'failed').length;
  const skipCount = all.filter((r) => r.status === 'skipped').length;

  console.log(color('bold', '\n=== 汇总 ==='));
  for (const r of all) {
    const s = r.status === 'ok' || r.status === 'expected-error'
      ? color('green', '✓ ' + r.status)
      : r.status === 'skipped'
      ? color('yellow', '○ skipped')
      : color('red', '✗ failed');
    console.log(`  ${s.padEnd(20)} ${r.name}`);
  }
  console.log(`\n  通过 ${color('green', okCount)} / 跳过 ${color('yellow', skipCount)} / 失败 ${color('red', failCount)}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(color('red', '测试脚本异常: ' + err.message));
  console.error(err.stack);
  process.exit(1);
});
