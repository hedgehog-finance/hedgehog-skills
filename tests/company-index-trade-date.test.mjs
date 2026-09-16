import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cases = [
  { api: 'querySwIndustryDailyByTradeDate', path: '/v1/stock/sw-industry-daily', cap: 100, sizeKey: 'page_size', order: 'trade_date_desc' },
  { api: 'queryDailyBasicByTradeDate', path: '/v1/daily-basic/query', cap: 50, sizeKey: 'page_size', order: 'total_mv_desc' },
  { api: 'queryStockDailyByTradeDate', path: '/v1/stock/daily', cap: 50, sizeKey: 'limit', order: 'pct_chg_desc' },
  { api: 'queryMoneyflowByTradeDate', path: '/v1/finance/moneyflow', cap: 50, sizeKey: 'page_size', order: 'net_mf_amount_desc' },
];
const tradeDate = '2026-09-15';
const rows = Array.from({ length: 130 }, (_, i) => ({
  stock_code: `${String(i + 1).padStart(6, '0')}.SZ`,
  index_code: `801${String(i).padStart(3, '0')}.SI`,
  trade_date: tradeDate,
  close: 10 + i,
  total_mv: 50000 - i,
  pe: 10 + i / 10,
  pct_chg: 5 - i / 10,
  buy_sm_amount: 3.25, sell_sm_amount: 1,
  buy_md_amount: 6, sell_md_amount: 2,
  buy_lg_amount: 10, sell_lg_amount: 4,
  buy_elg_amount: 20, sell_elg_amount: 5,
  net_mf_amount: 100 - i,
}));

for (const platform of ['hogagent', 'openclaw', 'hermes']) {
  test(`${platform}: trade-date CLI enforces the request contract and saved result bounds`, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'company-index-trade-date-'));
    const preload = join(dir, 'isolated-home.cjs');
    writeFileSync(preload, `require('os').homedir = () => ${JSON.stringify(dir)};\n`);
    const requests = [];
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      requests.push(url);
      const items = url.searchParams.get('trade_date') === '2026-09-13' ? [] : rows;
      // Exercise both list and paged response shapes, deliberately exceeding the requested cap.
      const data = url.searchParams.has('order_by') ? { items, total: 5000, page: 1 } : items;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 200, data }));
    });
    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      rmSync(dir, { recursive: true, force: true });
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    let sequence = 0;
    const run = async (api, params, fromFile = false) => {
      const out = `result-${++sequence}.json`;
      let args;
      if (fromFile) {
        const file = join(dir, `tmp-hedgehog-company-index-data-${sequence}.json`);
        writeFileSync(file, JSON.stringify(params));
        args = ['--params-file', file];
      } else {
        args = Object.entries(params).flatMap(([key, value]) => [`--${key}`, String(value)]);
      }
      const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [
          '--require', preload, join(root, platform, 'hedgehog-company-index-data/scripts/call_api.js'),
          '--api', api, ...args, '--dir', dir, '--out', out, '--artifact-root', dir,
        ], {
          env: { ...process.env, CIWEIAI_API_KEY: 'test-key', API_BASE_URL: `http://127.0.0.1:${server.address().port}/api/data` },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '', stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', (code) => resolve({ code, stdout, stderr }));
      });
      return { ...result, output: join(dir, out) };
    };

    for (const entry of cases) {
      for (const ordered of [false, true]) {
        const params = { trade_date: tradeDate };
        if (ordered) Object.assign(params, { order_by: entry.order, fields: 'stock_code,trade_date' });
        const before = requests.length;
        const result = await run(entry.api, params, ordered);
        assert.equal(result.code, 0, `${entry.api}: ${result.stderr}`);
        assert.match(result.stdout, /\[DataSaved\]/);
        assert.equal(requests.length, before + 1, 'exactly one request; no pagination');
        const request = requests.at(-1);
        assert.equal(request.pathname, `/api/data${entry.path}`);
        const expected = { trade_date: tradeDate, page: '1', [entry.sizeKey]: String(entry.cap) };
        if (ordered) expected.order_by = entry.order;
        if (entry.api === 'querySwIndustryDailyByTradeDate') expected.is_l1 = 'true';
        assert.deepEqual(Object.fromEntries(request.searchParams), expected);
        const saved = JSON.parse(readFileSync(result.output, 'utf8'));
        assert.equal(saved.length, entry.cap, 'cap applies even when only two fields were requested');
        assert.deepEqual(saved.map((row) => row.stock_code), rows.slice(0, entry.cap).map((row) => row.stock_code));
        if (ordered) assert.deepEqual(Object.keys(saved[0]), ['stock_code', 'trade_date']);
        if (!ordered && entry.api === 'queryMoneyflowByTradeDate') {
          assert.equal(saved[0].net_sm_amount, 2.25);
          assert.equal(saved[0].net_md_amount, 4);
          assert.equal(saved[0].net_lg_amount, 6);
          assert.equal(saved[0].net_elg_amount, 15);
          assert.equal(saved[0].net_mf_amount, 100);
          assert.ok(!('buy_sm_amount' in saved[0]));
        }
      }

      const invalid = [
        {}, { trade_date: null }, { trade_date: '' }, { trade_date: 20260915 },
        { trade_date: '2026-02-30' }, { trade_date: '2026-9-15' },
        ...['page', 'page_size', 'limit', 'offset', 'cursor', 'stock_code', 'index_code', 'start_date', 'end_date']
          .map((key) => ({ trade_date: tradeDate, [key]: 1 })),
        ...[null, '', ' ', 1, true, [], {}].map((value) => ({ trade_date: tradeDate, order_by: value })),
      ];
      if (entry.api === 'querySwIndustryDailyByTradeDate') {
        invalid.push(...[true, false, null].map((is_l1) => ({ trade_date: tradeDate, is_l1 })));
      }
      for (const params of invalid) {
        const before = requests.length;
        const result = await run(entry.api, params, true);
        assert.equal(result.code, 1, `${entry.api} should reject ${JSON.stringify(params)}`);
        assert.match(result.stderr, /缺少必填参数|日期格式|日期不合法|不支持参数|order_by 必须/);
        assert.equal(requests.length, before, 'invalid parameters must not make a request');
        assert.ok(!existsSync(result.output), 'invalid calls must not save output');
      }

      const empty = await run(entry.api, { trade_date: '2026-09-13', order_by: entry.order });
      assert.equal(empty.code, 0, empty.stderr);
      assert.equal(JSON.parse(readFileSync(empty.output, 'utf8')), null);
      assert.match(empty.stdout, /Records: 0/);
    }

    for (const [api, selector, sizeKey, size] of [
      ['queryStockDaily', 'stock_code', 'limit', '200'],
      ['queryDailyBasic', 'stock_code', 'page_size', '200'],
      ['queryMoneyflow', 'stock_code', 'page_size', '100'],
      ['querySwIndustryDaily', 'index_code', 'page_size', '60'],
    ]) {
      const result = await run(api, { [selector]: selector === 'stock_code' ? '000001.SZ' : '801010.SI' });
      assert.equal(result.code, 0, `${api}: ${result.stderr}`);
      assert.equal(requests.at(-1).searchParams.get(sizeKey), size, 'preserve historical query limits');
    }
  });
}
