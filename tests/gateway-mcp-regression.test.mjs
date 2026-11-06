import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

// Imported from the 2026-11-06 Gateway handoff; optionally verify another platform copy.
const skill = process.env.SKILL_UNDER_TEST
  ? resolve(process.env.SKILL_UNDER_TEST) : fileURLToPath(new URL('../openclaw/hog-gateway-tools/', import.meta.url));
const clientModule = await import(pathToFileURL(join(skill, 'mcp-client.mjs')));
const code = readFileSync(join(skill, 'cli.mjs'), 'utf8')
  .replace(/^#!.*\n/, '').replace(/^import[\s\S]*?;\n/gm, '')
  .replace(/\nmain\(\)\.then\([\s\S]*$/, '');
const functions = runInNewContext(code + '\n({recommendResourceArgs, execute})', {
  ...clientModule, readFileSync, statSync,
});
const validCandidate = { source_type: 'ciwei', title: '电池资讯', importance: -4, relevance: 4 };
const fetchOriginal = globalThis.fetch;
const dirs = [];
afterEach(() => { globalThis.fetch = fetchOriginal; dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })); });
function batchFile(value, bom = false) {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-skill-audit-')); dirs.push(dir);
  const path = join(dir, 'tmp-hog-gateway-tools-test.json');
  writeFileSync(path, (bom ? '\uFEFF' : '') + JSON.stringify(value));
  return path;
}
function clientWithResponse(transform) {
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify(transform({ jsonrpc: '2.0', id: request.id, result: { content: [] } })), {
      headers: { 'content-type': 'application/json' },
    });
  };
  return new clientModule.GeneralMcpClient({ url: 'http://example.invalid/mcp', token: 'synthetic', name: 'test', version: '1' });
}

test('accepts matching JSON-RPC response IDs', async () => {
  assert.deepEqual(await clientWithResponse(r => r).callTool('probe'), { content: [] });
});
for (const [name, transform] of [
  ['wrong ID', r => ({ ...r, id: 'wrong' })],
  ['missing ID', r => ({ jsonrpc: r.jsonrpc, result: r.result })],
  ['wrong version', r => ({ ...r, jsonrpc: '1.0' })],
  ['both result and error', r => ({ ...r, error: { code: -1, message: 'error' } })],
  ['missing result and error', r => ({ jsonrpc: r.jsonrpc, id: r.id })],
]) test(`rejects malformed JSON-RPC: ${name}`, async () => {
  await assert.rejects(clientWithResponse(transform).callTool('probe'), /JSON-RPC/);
});
test('retains Gateway pre-dispatch authentication errors with null ID', async () => {
  await assert.rejects(clientWithResponse(() => ({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } })).callTool('probe'), /Unauthorized/);
});
for (const value of ['NaN', 'Infinity', 'bad', '6', '-6']) test(`rejects invalid candidate importance ${value}`, () => {
  assert.throws(() => functions.recommendResourceArgs(['--source-type', 'ciwei', '--title', 'test', '--importance', value]), /finite number/);
});
test('keeps signed importance and valid BOM/multiline batches', () => {
  const batch = { batch_id: 'b', scene: 'agent', candidates: [{ ...validCandidate, summary: '第一段\n第二段' }] };
  assert.deepEqual(JSON.parse(JSON.stringify(functions.recommendResourceArgs(['--batch-file', batchFile(batch, true)]))), batch);
});
for (const value of [null, [], { batch_id: 'b', scene: 'agent', candidates: [] },
  { batch_id: 'b', scene: 'agent', candidates: [{ ...validCandidate, relevance: '4' }] },
  { batch_id: 'b', scene: 'morning_briefing', candidates: [validCandidate] },
]) test(`rejects invalid recommendation batch ${JSON.stringify(value)}`, () => {
  assert.throws(() => functions.recommendResourceArgs(['--batch-file', batchFile(value)]));
});
test('named receipt/retry commands call the existing capabilities without encoding opaque IDs', async () => {
  const calls = [];
  const client = { callTool: async (name, args) => { calls.push([name, args.id]); return { structuredContent: { id: args.id, status: 'pending' } }; } };
  for (const command of ['recommend-status', 'recommend-retry']) await functions.execute(client, command, ['batch/id%1'], {});
  assert.deepEqual(calls, [['resource_recommend_batch', 'batch/id%1'], ['resource_recommend_retry', 'batch/id%1']]);
  await assert.rejects(functions.execute(client, 'recommend-status', ['id', '--user-id', 'other'], {}), /user-id/);
});
test('malformed task acknowledgement fails instead of reporting success', () => {
  assert.throws(() => clientModule.isTaskStart({ resultType: 'task', status: 'working' }), /Task response/);
});
for (const bad of [{ taskId: 'different', status: 'completed', result: {} }, { taskId: 't', status: 'mystery' }, { taskId: 't', status: 'completed' }]) {
  test(`task polling stops on invalid identity/status/result ${JSON.stringify(bad)}`, async () => {
    let calls = 0;
    const client = { getTask: async () => { calls++; if (calls > 1) throw new Error('Unexpected repeated poll'); return bad; } };
    await assert.rejects(clientModule.waitForTask(client, { taskId: 't', status: 'working' }, 250), /Task response/);
    assert.equal(calls, 1);
  });
}
test('completed tasks retain structured result and resource links', async () => {
  const result = { structuredContent: { delivered: 1 }, content: [{ type: 'resource_link', uri: 'hedgehog://exports/x', name: 'report' }] };
  const task = await clientModule.waitForTask({ getTask: async () => ({ taskId: 't', status: 'completed', result }) }, { taskId: 't', status: 'working' }, 250);
  assert.deepEqual(clientModule.printableToolResult(task.result), { delivered: 1, resource_links: result.content });
});
