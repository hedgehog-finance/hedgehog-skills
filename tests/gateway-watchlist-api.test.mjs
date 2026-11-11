import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { addWatchlist, moveWatchlist, findStock } from '../hogagent/hog-gateway-tools/watchlist.mjs';
import { previewApiRequest, callApi } from '../hogagent/hog-gateway-tools/api-fallback.mjs';

const CLI = fileURLToPath(new URL('../hogagent/hog-gateway-tools/cli.mjs', import.meta.url));
const STOCK = { stock_code: '600519.SH', name: '贵州茅台', exchange: 'SSE', market: '主板' };
function client(handler) {
  const calls = [];
  return { calls, async callTool(name, input) { calls.push({ name, input }); return { structuredContent: await handler(name, input) }; } };
}
function stockClient(target = [], other = [], receipt = { id: 'new' }) {
  return client((name, input) => {
    if (name === 'get_stock_basic_info') return { success: true, data: STOCK };
    if (name === 'get_watchlist') return { watchlist: input.list_type === 'watchlist' ? target : other };
    if (name === 'watchlist_add') return receipt;
    throw new Error(`Unexpected call ${name}`);
  });
}
function runCli(args, overrides = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    for (const key of ['HEDGEHOG_MCP_GENERAL_URL', 'HEDGEHOG_MCP_GENERAL_TOKEN', 'HEDGEHOG_GATEWAY_API_TOKEN', 'HEDGEHOG_GATEWAY_API_TOKEN_FILE', 'HEDGEHOG_DATA_DIR', 'HEDGEHOG_GATEWAY_USER_ID']) delete env[key];
    const child = spawn(process.execPath, [CLI, ...args], { env: { ...env, HEDGEHOG_DATA_DIR: join(tmpdir(), 'hog-api-no-login-' + process.pid), ...overrides }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject); child.on('close', code => resolve({ code, stdout, stderr }));
  });
}
async function withServer(handler, run) {
  const server = createServer((req, res) => Promise.resolve(handler(req, res)).catch(error => { res.writeHead(500); res.end(error.message); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
function requestFile(t, request) {
  const directory = mkdtempSync(join(tmpdir(), 'hog-api-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'tmp-hog-gateway-tools-test.json');
  writeFileSync(path, '\uFEFF' + JSON.stringify(request));
  return path;
}
const REQUEST = { base_url: 'http://127.0.0.1:59100', method: 'GET', path: '/api/status', reason: 'Check service version', effect: 'Read only' };
// Synthetic login files only; never read the real Gateway's credentials in tests.
function loginToken(claims = {}) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'hedgehog-gateway', sub: 'user-a', exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}.synthetic-signature`;
}
const LOGIN_TOKEN = loginToken();
function loginEnvironment(t, token = LOGIN_TOKEN) {
  const directory = mkdtempSync(join(tmpdir(), 'hog-api-login-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'keys'));
  if (token !== null) writeFileSync(join(directory, 'keys', 'latest-local-jwt.txt'), token);
  return { HEDGEHOG_DATA_DIR: directory, HEDGEHOG_GATEWAY_USER_ID: 'user-a' };
}


test('stock search preserves ambiguous matches without selecting one', async () => {
  const result = await findStock(client(() => ({ success: true, data: [STOCK, { ...STOCK, stock_code: 'other.HK' }] })), '贵州茅台');
  assert.equal(result.total, 2); assert.equal(result.matches.length, 2);
});
test('add uses verified metadata and the existing application capability once', async () => {
  const c = stockClient();
  const result = await addWatchlist(c, '600519.SS', 'watchlist');
  assert.equal(result.status, 'added');
  assert.deepEqual(c.calls[0].input, { stock_code: '600519.SH' });
  assert.deepEqual(c.calls.at(-1), { name: 'watchlist_add', input: { stock_code: STOCK.stock_code, stock_name: STOCK.name, exchange: STOCK.exchange, market: STOCK.market, list_type: 'watchlist' } });
});
test('unverified stocks and dictionary failures cannot write', async () => {
  const c = client(() => ({ success: true, data: null }));
  await assert.rejects(addWatchlist(c, 'invented', 'watchlist'), /not verified/);
  assert.equal(c.calls.length, 1);
});
test('same-list duplicates skip; other-list duplicates require an explicit move', async () => {
  const item = { ...STOCK, id: 'existing' };
  for (const [target, other, status] of [[[item], [], 'already_present'], [[], [item], 'move_required']]) {
    const c = stockClient(target, other);
    assert.equal((await addWatchlist(c, STOCK.stock_code, 'watchlist')).status, status);
    assert.ok(c.calls.every(call => call.name.startsWith('get_')));
  }
});
test('write error or missing receipt does not retry or fabricate success', async () => {
  for (const receipt of [null, {}]) {
    const c = stockClient([], [], receipt);
    await assert.rejects(addWatchlist(c, STOCK.stock_code, 'watchlist'), /receipt/);
    assert.equal(c.calls.filter(call => call.name === 'watchlist_add').length, 1);
  }
  let writes = 0;
  const c = stockClient(); const invoke = c.callTool;
  c.callTool = async (name, input) => {
    if (name === 'watchlist_add') { writes++; return { isError: true, content: [{ type: 'text', text: 'capacity reached' }] }; }
    return invoke(name, input);
  };
  await assert.rejects(addWatchlist(c, STOCK.stock_code, 'watchlist'), /capacity reached/); assert.equal(writes, 1);
});
test('move reuses original ID and does not delete/recreate or classify', async () => {
  const c = client((name, input) => name === 'get_watchlist' ? { watchlist: [{ id: 'candidate' }] } : { id: input.id, list_type: input.target_list_type });
  assert.equal((await moveWatchlist(c, 'candidate', 'candidate', 'watchlist')).status, 'moved');
  assert.deepEqual(c.calls.map(call => call.name), ['get_watchlist', 'watchlist_move']);
  assert.deepEqual(c.calls[1].input, { id: 'candidate', list_type: 'candidate', target_list_type: 'watchlist' });
});
test('already moved record verifies target membership without reissuing a mutation', async () => {
  const c = client((_name, input) => ({ watchlist: input.list_type === 'watchlist' ? [{ id: 'candidate' }] : [] }));
  assert.equal((await moveWatchlist(c, 'candidate', 'candidate', 'watchlist')).status, 'already_in_target');
  await assert.rejects(moveWatchlist(c, 'foreign', 'candidate', 'watchlist'), /not in/);
  await assert.rejects(moveWatchlist(c, 'candidate', 'watchlist', 'watchlist'), /must differ/);
  assert.ok(c.calls.every(call => call.name === 'get_watchlist'));
});
test('watchlist CLI uses modern MCP and rejects invalid list/identity inputs', async () => {
  const names = [];
  await withServer(async (req, res) => {
    let raw = ''; for await (const data of req) raw += data;
    const rpc = JSON.parse(raw); names.push(rpc.params.name);
    const c = stockClient(); const result = await c.callTool(rpc.params.name, rpc.params.arguments);
    assert.equal(req.headers.authorization, 'Bearer synthetic-mcp');
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }));
  }, async base => {
    const env = { HEDGEHOG_MCP_GENERAL_URL: base + '/mcp', HEDGEHOG_MCP_GENERAL_TOKEN: 'synthetic-mcp' };
    const result = await runCli(['watchlist-add', STOCK.stock_code], env);
    assert.equal(result.code, 0, result.stderr); assert.equal(JSON.parse(result.stdout).status, 'added');
    for (const args of [['get-watchlist', '--list-type', 'bad'], ['watchlist-add', STOCK.stock_code, '--user-id', 'foreign'], ['watchlist-move', 'id', '--from', 'candidate']]) {
      assert.equal((await runCli(args, env)).code, 1);
    }
  });
  assert.deepEqual(names, ['get_stock_basic_info', 'get_watchlist', 'get_watchlist', 'watchlist_add']);
});

test('optional API preview is offline and does not require confirmation', async t => {
  const path = requestFile(t, REQUEST);
  const preview = previewApiRequest(path);
  assert.equal(preview.requires_user_confirmation, false);
  assert.deepEqual(preview.request, REQUEST);
  const result = await runCli(['api-preview', '--request-file', path]);
  assert.equal(result.code, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), preview);
  await assert.rejects(callApi(path, loginEnvironment(t, null)), /login token is unavailable/);
});
test('API send revalidates a file changed after optional preview before reading credentials', async t => {
  const path = requestFile(t, REQUEST);
  previewApiRequest(path);
  writeFileSync(path, JSON.stringify({ ...REQUEST, method: 'POST', path: '/api/workflows' }));
  const env = { get HEDGEHOG_DATA_DIR() { throw new Error('Credentials must not be read'); } };
  await assert.rejects(callApi(path, env), /not allowlisted/);
});
for (const change of [
  { base_url: 'http://example.com' }, { base_url: 'ws://127.0.0.1:59100' }, { base_url: 'http://user:secret@127.0.0.1' },
  { path: '/internal/status' }, { path: '/api/../internal/status' }, { path: '/api/%2e%2e/internal/status' },
  { path: '/api/internal/status' }, { path: '/api/%69nternal/status' }, { path: '//example.com/api/status' }, { path: '/api/%252e%252e/status' },
  { headers: { authorization: 'secret' } }, { method: 'OPTIONS' }, { body: {} },
]) test(`rejects unsupported/unsafe API request ${JSON.stringify(change)}`, t => {
  assert.throws(() => previewApiRequest(requestFile(t, { ...REQUEST, ...change })));
});
test('API fallback uses current Gateway login, returns receipt, rejects redirects and never retries', async t => {
  let calls = 0, redirected = 0;
  await withServer(async (req, res) => {
    calls++;
    assert.equal(req.headers.authorization, 'Bearer ' + LOGIN_TOKEN);
    if (req.url === '/api/watchlist?fixture=redirect') { res.writeHead(302, { location: '/api/target' }); res.end(); return; }
    if (req.url === '/api/target') redirected++;
    res.writeHead(req.url === '/api/watchlist?fixture=denied' ? 403 : 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(req.url === '/api/watchlist?fixture=denied' ? { error: 'Forbidden' } : { success: true, id: 'receipt' }));
  }, async base => {
    const path = requestFile(t, { ...REQUEST, base_url: base });
    for (const env of [loginEnvironment(t, null), loginEnvironment(t, 'hgmcp_invalid')]) await assert.rejects(callApi(path, env));
    assert.equal(calls, 0);
    const env = loginEnvironment(t);
    const result = await runCli(['api-call', '--request-file', path], env);
    assert.equal(result.code, 0, result.stderr); assert.equal(JSON.parse(result.stdout).data.id, 'receipt');
    for (const target of ['/api/watchlist?fixture=denied', '/api/watchlist?fixture=redirect']) {
      writeFileSync(path, JSON.stringify({ ...REQUEST, base_url: base, path: target, method: 'POST' }));
      const failure = await runCli(['api-call', '--request-file', path], env);
      assert.equal(failure.code, 1);
      if (target.endsWith('redirect')) assert.match(failure.stderr, /unknown/);
    }
  });
  assert.equal(calls, 3); assert.equal(redirected, 0);
});
test('API fallback preserves business failure and rejects malformed/non-JSON responses', async t => {
  await withServer((req, res) => {
    res.setHeader('content-type', req.url === '/api/watchlist?fixture=html' ? 'text/html' : 'application/json');
    res.end(req.url === '/api/watchlist?fixture=bad' ? '{' : req.url === '/api/watchlist?fixture=html' ? '<html/>' : '{"success":false,"message":"rejected"}');
  }, async base => {
    const path = requestFile(t, { ...REQUEST, base_url: base });
    const env = loginEnvironment(t);
    assert.equal((await callApi(path, env)).ok, false);
    for (const endpoint of ['/api/watchlist?fixture=html', '/api/watchlist?fixture=bad']) {
      writeFileSync(path, JSON.stringify({ ...REQUEST, base_url: base, path: endpoint, method: 'POST' }));
      await assert.rejects(callApi(path, env), /outcome is unknown/);
    }
  });
});

const ALLOWED_API_REQUESTS = [
  ...[
    '/api/status', '/api/agent/status', '/api/agent/health', '/api/agent/adapters', '/api/agent/sessions',
    '/api/agent/adapters/adapter-1/status', '/api/agent/sessions/session-1/status',
    '/api/notifications?unreadOnly=true', '/api/logs', '/api/logs/stats', '/api/audit-logs',
    '/api/works-logs', '/api/works-logs/stats',
    '/api/watchlist?list_type=candidate', '/api/watchlist/count', '/api/watchlist/sync', '/api/watchlist/item-1',
    '/api/workflows', '/api/workflows/sync', '/api/workflows/work-1', '/api/workflows/tasks',
    '/api/workflows/tasks/task-1', '/api/workflows/tasks/task-1/usage', '/api/workflows/work-1/tasks', '/api/workflows/work-1/usage',
    '/api/scheduled-jobs', '/api/scheduled-jobs/job-1', '/api/scheduled-jobs/job-1/history',
  ].map(path => ({ method: 'GET', path })),
  { method: 'POST', path: '/api/watchlist', body: { stock_code: STOCK.stock_code, list_type: 'candidate' } },
  { method: 'POST', path: '/api/watchlist/move', body: { id: 'item-1', list_type: 'candidate', target_list_type: 'watchlist' } },
  { method: 'PUT', path: '/api/watchlist/reorder', body: { list_type: 'watchlist', items: [{ id: 'item-1', sort_order: 1 }] } },
  { method: 'PATCH', path: '/api/watchlist/item-1/mark', body: { list_type: 'watchlist', mark: 'ready-to-buy' } },
  { method: 'DELETE', path: '/api/watchlist/item-1?list_type=watchlist' },
];
const FORBIDDEN_API_REQUESTS = [
  ...[
    '/api/llm-request', '/api/agent/prompt', '/api/agent/follow-up', '/api/agent/command',
    '/api/agent/sessions', '/api/agent/sessions/session-1/resume', '/api/agent/sessions/session-1/driver',
    '/api/workflows', '/api/workflows/orchestrate', '/api/workflows/works/work-1/retry',
    '/api/workflows/works/work-1/continue', '/api/workflows/tasks/task-1/retry', '/api/workflows/tasks/task-1/continue',
    '/api/workflows/work-1/resume', '/api/workflows/work-1/checkpoint', '/api/workflows/work-1/migrate',
    '/api/scheduled-jobs', '/api/scheduled-jobs/system-report', '/api/scheduled-jobs/job-1/run', '/api/scheduled-jobs/job-1/toggle',
    '/api/request', '/api/rpc', '/api/proxy', '/api/development/research', '/api/unknown',
    '/api/watchlist/move/extra', '/api/watchlist/item-1', '/api/status',
  ].map(path => ({ method: 'POST', path })),
  { method: 'PUT', path: '/api/scheduled-jobs/job-1' },
  { method: 'PATCH', path: '/api/workflows/work-1' },
  { method: 'GET', path: '/api/agent/sessions/session-1/history' },
  { method: 'GET', path: '/api/future-model-execution' },
  { method: 'POST', path: '/api/watchlist?next=/api/agent/prompt', headers: { 'x-http-method-override': 'POST' } },
  { method: 'POST', path: '/api/%61gent/prompt' },
  { method: 'POST', path: '/api/watchlist/../agent/prompt' },
  { method: 'POST', path: '/api/watchlist%2f..%2fagent%2fprompt' },
  { method: 'POST', path: '/api/watchlist//move' },
  { method: 'POST', path: '/api/watchlist/move;action=agent_prompt' },
];

for (const platform of ['hogagent', 'openclaw', 'hermes']) {
  test(`${platform} permits reviewed functional API operations and rejects execution routes offline`, async t => {
    const api = await import(`../${platform}/hog-gateway-tools/api-fallback.mjs`);
    for (const request of ALLOWED_API_REQUESTS) {
      assert.equal(api.previewApiRequest(requestFile(t, { ...REQUEST, ...request })).request.path, request.path);
    }
    for (const request of FORBIDDEN_API_REQUESTS) {
      assert.throws(() => api.previewApiRequest(requestFile(t, { ...REQUEST, ...request })), undefined, `${request.method} ${request.path}`);
    }
  });
}

test('direct API calls with valid credentials still cannot send forbidden execution requests', async t => {
  let calls = 0;
  await withServer((_req, res) => { calls++; res.end('{}'); }, async base => {
    for (const input of FORBIDDEN_API_REQUESTS) {
      const request = { ...REQUEST, base_url: base, ...input };
      const file = requestFile(t, request);
      await assert.rejects(callApi(file, loginEnvironment(t)));
    }
    const request = { ...REQUEST, base_url: base, method: 'POST', path: '/api/workflows', body: { name: 'must not start' } };
    const file = requestFile(t, request);
    const result = await runCli(['api-call', '--request-file', file], loginEnvironment(t));
    assert.equal(result.code, 1); assert.match(result.stderr, /not allowlisted/);
  });
  assert.equal(calls, 0);
});

test('allowlisted writes execute without preview or confirmation and report the actual receipt', async t => {
  const calls = [];
  await withServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    calls.push({ method: req.method, path: req.url, body: JSON.parse(raw) });
    res.writeHead(201, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { id: 'new-item', stock_code: STOCK.stock_code } }));
  }, async base => {
    const body = { stock_code: STOCK.stock_code, list_type: 'watchlist' };
    const file = requestFile(t, { ...REQUEST, base_url: base, method: 'POST', path: '/api/watchlist', body });
    const env = loginEnvironment(t);
    const result = await runCli(['api-call', '--request-file', file], env);
    assert.equal(result.code, 0, result.stderr);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.http_status, 201); assert.equal(receipt.ok, true); assert.equal(receipt.data.data.id, 'new-item');
    assert.deepEqual(calls, [{ method: 'POST', path: '/api/watchlist', body }]);
    const legacy = await runCli(['api-call', '--request-file', file, '--confirmed-sha256', 'obsolete'], env);
    assert.equal(legacy.code, 1); assert.equal(calls.length, 1);
  });
});

test('login credentials refresh per call, cannot switch a bound Agent user, and disappear on logout', async t => {
  const tokens = [];
  await withServer((req, res) => {
    tokens.push(req.headers.authorization);
    res.setHeader('content-type', 'application/json'); res.end('{"success":true}');
  }, async base => {
    const env = loginEnvironment(t);
    // Obsolete per-Skill settings must not override the current login.
    env.HEDGEHOG_GATEWAY_API_TOKEN = 'stale-config-token';
    env.HEDGEHOG_GATEWAY_API_TOKEN_FILE = '/nonexistent/old-skill-token';
    env.HEDGEHOG_MCP_GENERAL_TOKEN = 'synthetic-runtime-token';
    const file = requestFile(t, { ...REQUEST, base_url: base });
    const tokenFile = join(env.HEDGEHOG_DATA_DIR, 'keys', 'latest-local-jwt.txt');
    await callApi(file, env);
    const renewed = loginToken({ jti: 'renewed' });
    writeFileSync(tokenFile, renewed); await callApi(file, env);
    assert.deepEqual(tokens, ['Bearer ' + LOGIN_TOKEN, 'Bearer ' + renewed]);
    const other = loginToken({ sub: 'user-b' });
    writeFileSync(tokenFile, other);
    await assert.rejects(callApi(file, env), /does not match this Agent/);
    assert.equal(tokens.length, 2);
    // A standalone local CLI follows the currently logged-in user.
    await callApi(file, { HEDGEHOG_DATA_DIR: env.HEDGEHOG_DATA_DIR });
    assert.equal(tokens.at(-1), 'Bearer ' + other);
    rmSync(tokenFile);
    // A stale legacy file must not resurrect a logged-out identity.
    writeFileSync(join(env.HEDGEHOG_DATA_DIR, 'latest-local-jwt.txt'), LOGIN_TOKEN);
    await assert.rejects(callApi(file, env), /login token is unavailable/);
    assert.equal(tokens.length, 3);
  });
});

test('missing, invalid, expired or unbound Gateway credentials never send requests or leak tokens', async t => {
  let calls = 0;
  await withServer((_req, res) => { calls++; res.end('{}'); }, async base => {
    const file = requestFile(t, { ...REQUEST, base_url: base });
    for (const token of [null, '', 'hgmcp_secret', 'secret-not-a-jwt',
      loginToken({ iss: 'ciwei-ai' }), loginToken({ sub: '' }), loginToken({ exp: 'later' }),
      loginToken({ exp: null }), loginToken({ exp: 1 }), loginToken({ sub: 'user-b' }),
      'x'.repeat(16 * 1024 + 1)]) {
      const env = loginEnvironment(t, token);
      const result = await runCli(['api-call', '--request-file', file], env);
      assert.equal(result.code, 1);
      if (token) assert.ok(!result.stderr.includes(token));
    }
    const env = loginEnvironment(t);
    delete env.HEDGEHOG_GATEWAY_USER_ID;
    env.HEDGEHOG_MCP_GENERAL_TOKEN = 'existing-agent-token';
    await assert.rejects(callApi(file, env), /caller identity is missing/);
    env.HEDGEHOG_GATEWAY_USER_ID = ' ';
    await assert.rejects(callApi(file, env), /caller identity is missing/);
  });
  assert.equal(calls, 0);
});
