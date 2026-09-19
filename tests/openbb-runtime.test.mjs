import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

const exec = promisify(execFile);
const source = resolve(dirname(fileURLToPath(import.meta.url)), '../optional/hog-openbb/scripts');
const isWin = process.platform === 'win32';

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hog-openbb-runtime-')));
  const scripts = join(root, 'scripts');
  mkdirSync(scripts);
  for (const name of ['server_manager.js', 'python_env.js', 'call_api.js']) copyFileSync(join(source, name), join(scripts, name));
  const env = { ...process.env, HOGAGENT_SYSTEM_DIR: root, HOG_OPENBB_RUNTIME_DIR: join(root, 'runtime') };
  for (const key of ['OPENBB_API_BIN', 'HOG_OPENBB_VENV', 'VIRTUAL_ENV', 'OPENBB_API_URL', 'OPENBB_IDLE_TIMEOUT_MS', 'OPENBB_STARTUP_TIMEOUT_MS']) delete env[key];
  env.PATH = '';
  return { root, scripts, env };
}

function apiFile(venv) {
  const file = join(venv, isWin ? 'Scripts' : 'bin', isWin ? 'openbb-api.exe' : 'openbb-api');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, '', { mode: 0o755 });
  return file;
}

async function command(f, name, args = []) {
  return exec(process.execPath, [join(f.scripts, name), ...args], { env: f.env, timeout: 15000 });
}

function cleanup(f) {
  // These records belong only to this test's isolated fake server/watchdog.
  for (const file of ['.openbb_server.pid', '.openbb_watchdog.pid']) {
    try { process.kill(Number(readFileSync(join(f.env.HOG_OPENBB_RUNTIME_DIR, file), 'utf8')), 'SIGKILL'); } catch (_) {}
  }
  rmSync(f.root, { recursive: true, force: true });
}

async function unusedPort() {
  const server = http.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('OpenBB finds an unactivated skill venv and honors explicit overrides', async () => {
  const f = fixture();
  try {
    const local = apiFile(join(f.root, '.venv'));
    const custom = apiFile(join(f.root, 'custom venv'));
    async function resolved() {
      const { stdout } = await exec(process.execPath, ['-e', 'console.log(JSON.stringify(require(process.argv[1]).findOpenbb()))', join(f.scripts, 'python_env.js')], { env: f.env });
      return JSON.parse(stdout);
    }
    assert.equal(await resolved(), local);
    f.env.HOG_OPENBB_VENV = join(f.root, 'custom venv');
    assert.equal(await resolved(), custom);
    f.env.OPENBB_API_BIN = local;
    assert.equal(await resolved(), local);
    f.env.OPENBB_API_BIN = join(f.root, 'missing');
    assert.equal(await resolved(), null);
    delete f.env.OPENBB_API_BIN;
    f.env.HOG_OPENBB_VENV = join(f.root, 'missing venv');
    assert.equal(await resolved(), null);
    delete f.env.HOG_OPENBB_VENV;
    rmSync(join(f.root, '.venv'), { recursive: true });
    f.env.VIRTUAL_ENV = join(f.root, 'custom venv');
    assert.equal(await resolved(), custom);
    delete f.env.VIRTUAL_ENV;
    f.env.PATH = dirname(custom);
    assert.equal(await resolved(), custom);
  } finally { cleanup(f); }
});

test('OpenBB reports an actionable setup command when Python dependencies are absent', async () => {
  const f = fixture();
  try {
    f.env.OPENBB_API_URL = 'http://127.0.0.1:1';
    await assert.rejects(command(f, 'server_manager.js', ['start']), error => {
      assert.match(error.stderr, /openbb-api command not found/);
      assert.match(error.stderr, /server_manager.js.*setup/);
      assert.match(error.stderr, /HOG_OPENBB_VENV/);
      return true;
    });
    assert.equal(existsSync(join(f.env.HOG_OPENBB_RUNTIME_DIR, '.openbb_start.lock')), false);
  } finally { cleanup(f); }
});

test('OpenBB auto-starts from its venv, uses real readiness/routes, filters results, and stops', { skip: isWin }, async () => {
  const f = fixture();
  try {
    const file = apiFile(join(f.root, '.venv'));
    writeFileSync(file, `#!${process.execPath}
const http = require('http');
if (process.env.FRED_API_KEY !== 'fixture-fred' || process.env.TIINGO_TOKEN !== 'fixture-tiingo') process.exit(9);
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
const paths = new Set(['/api/v1/economy/fred_series', '/api/v1/fixedincome/government/yield_curve', '/api/v1/economy/calendar', '/api/v1/derivatives/options/chains', '/api/v1/index/price/historical', '/api/v1/currency/price/historical']);
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/api/v1/coverage/providers') return res.end('{}');
  if (!paths.has(url.pathname)) { res.statusCode = 404; return res.end('{}'); }
  if (url.searchParams.get('symbol') === 'FAIL') { res.statusCode = 502; return res.end('{"error":"provider unavailable"}'); }
  res.end(JSON.stringify({ provider: url.searchParams.get('provider'), results: url.pathname.endsWith('/chains') ? { expiration: ['2026-10-16', '2026-09-25', '2026-10-16'], strike: [100, 110, 120] } : [{ date: '2026-09-15', close: 100, extra: true }] }));
}).listen(port, '127.0.0.1');
console.error('fake Python startup log');
`);
    f.env.OPENBB_API_URL = `http://127.0.0.1:${await unusedPort()}`;
    writeFileSync(join(f.root, 'skills_config.json'), JSON.stringify({ 'hog-openbb': { 'fred-api-key': 'fixture-fred', 'tiingo-api-token': 'fixture-tiingo' } }));
    f.env.OPENBB_IDLE_TIMEOUT_MS = '60000';
    f.env.OPENBB_STARTUP_TIMEOUT_MS = '5000';
    await assert.rejects(command(f, 'call_api.js', ['--api', 'getGlobalIndices', '--symbol', 'FAIL']), /HTTP 502/);
    let status = JSON.parse((await command(f, 'server_manager.js', ['status'])).stdout);
    assert.equal(status.serverRunning, true);
    assert.ok(status.serverPid);
    assert.ok(status.watchdogPid);
    assert.equal(status.apiBin, file);
    assert.match(readFileSync(status.logFile, 'utf8'), /fake Python startup log/);
    const pid = status.serverPid;
    assert.equal(JSON.parse((await command(f, 'server_manager.js', ['start'])).stdout).status, 'already_running');
    const params = join(f.root, 'tmp-hog-openbb-fields.json');
    writeFileSync(params, JSON.stringify({ symbol: '^GSPC', fields: ['date', 'close'] }));
    const quote = JSON.parse((await command(f, 'call_api.js', ['--api', 'getGlobalIndices', '--params-file', params])).stdout);
    assert.deepEqual(quote, { provider: 'yfinance', results: [{ date: '2026-09-15', close: 100 }] });
    const expiries = JSON.parse((await command(f, 'call_api.js', ['--api', 'getOptionExpiry', '--symbol', 'AAPL'])).stdout);
    assert.deepEqual(expiries.results, [{ expiration: '2026-09-25' }, { expiration: '2026-10-16' }]);
    for (const api of ['getMacroIndicators', 'getTreasuryYields', 'getEconomicCalendar', 'getForexRates', 'getCommodityPrices']) {
      assert.equal(JSON.parse((await command(f, 'call_api.js', ['--api', api, '--symbol', 'GDP'])).stdout).results.length, 1, api);
    }
    status = JSON.parse((await command(f, 'server_manager.js', ['status'])).stdout);
    assert.equal(status.serverPid, pid);
    process.kill(status.watchdogPid, 'SIGTERM');
    assert.equal(JSON.parse((await command(f, 'server_manager.js', ['stop'])).stdout).status, 'stopped');
    assert.equal(JSON.parse((await command(f, 'server_manager.js', ['status'])).stdout).serverRunning, false);
  } finally { cleanup(f); }
});

test('Python startup failures retain logs and release the startup lock promptly', { skip: isWin }, async () => {
  const f = fixture();
  try {
    const file = apiFile(join(f.root, '.venv'));
    writeFileSync(file, `#!${process.execPath}\nconsole.error('ModuleNotFoundError: test_dependency'); process.exit(7);\n`);
    f.env.OPENBB_API_URL = 'http://127.0.0.1:1';
    const started = Date.now();
    await assert.rejects(command(f, 'server_manager.js', ['start']), error => {
      assert.match(error.stderr, /code=7/);
      assert.match(error.stderr, /openbb-server.log/);
      return true;
    });
    assert.ok(Date.now() - started < 5000, 'must stop polling after exit');
    assert.match(readFileSync(join(f.env.HOG_OPENBB_RUNTIME_DIR, 'openbb-server.log'), 'utf8'), /ModuleNotFoundError: test_dependency/);
    assert.equal(existsSync(join(f.env.HOG_OPENBB_RUNTIME_DIR, '.openbb_start.lock')), false);
    assert.equal(existsSync(join(f.env.HOG_OPENBB_RUNTIME_DIR, '.openbb_server.pid')), false);
  } finally { cleanup(f); }
});
