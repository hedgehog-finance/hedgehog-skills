import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const facts = require('../hogagent/hedgehog-macro-industry-data/scripts/artifact-file-facts.cjs');

test('parallel CLI saves preserve every file and content-bound origin without changing business JSON', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-origin-')); const output = join(dir, '中文 空格'); mkdirSync(output);
  const preload = join(dir, 'clock.cjs');
  writeFileSync(preload, `require('os').homedir = () => ${JSON.stringify(dir)}; const DateBefore = Date; global.Date = class extends DateBefore { constructor(...args) { super(...(args.length ? args : ['2026-09-12T10:00:00Z'])); } };`);
  let requests = 0;
  const server = createServer((_req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ code: 200, data: [{ value: ++requests }] })); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const run = (platform, extra = []) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--require', preload, join(root, platform, 'hedgehog-macro-industry-data/scripts/call_api.js'), '--api', 'queryShibor', '--dir', output, ...extra], {
      env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${server.address().port}/api/data`, CIWEIAI_API_KEY: 'fixture' },
    });
    let stdout = '', stderr = ''; child.stdout.on('data', text => stdout += text); child.stderr.on('data', text => stderr += text);
    child.on('error', reject); child.on('close', code => resolve({ code, stdout, stderr }));
  });
  try {
    const results = await Promise.all(Array.from({ length: 18 }, (_, i) => run(['hogagent','openclaw','hermes'][i % 3], ['--artifact-root', dir])));
    for (const result of results) assert.equal(result.code, 0, result.stderr);
    const names = readdirSync(output); assert.equal(names.length, 18); assert.equal(requests, 18);
    const values = new Set();
    for (const name of names) {
      const parsed = JSON.parse(readFileSync(join(output, name), 'utf8')); assert.ok(Array.isArray(parsed)); assert.deepEqual(Object.keys(parsed[0]), ["value"]); values.add(parsed[0].value);
      const origin = facts.readFileOrigin(dir, `中文 空格/${name}`, facts.fingerprintFile(join(output, name)));
      assert.equal(origin.type, 'api'); assert.equal(origin.tool, 'queryShibor'); assert.ok(!origin.locator.includes('?'));
    }
    assert.equal(values.size, 18); assert.equal(readdirSync(join(dir, '.hedgehog/artifact-origins')).length, 18);
    const prior = requests;
    const collision = await run('hogagent', ['--out', names[0], '--artifact-root', dir]); assert.notEqual(collision.code, 0); assert.equal(requests, prior);
    const legacy = await run('openclaw'); assert.equal(legacy.code, 0); assert.match(legacy.stderr, /without origin registration/);
    const outside = join(dir, 'external'); mkdirSync(outside); symlinkSync(outside, join(output, 'link'));
    assert.throws(() => facts.assertArtifactOutput(output, join(output, 'link', 'data.json')), /inside/);
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true, force: true }); }
});

test('new notes expire on content changes while old tables are read only as legacy evidence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-legacy-origin-')); const file = join(dir, 'data.json');
  try {
    writeFileSync(file, 'first'); const before = facts.fingerprintFile(file);
    facts.writeFileOrigin(dir, file, { type: 'api', locator: 'https://user:secret@example.com/api?token=secret', title: 'https://example.com/page?secret=yes' });
    const origin = facts.readFileOrigin(dir, 'data.json', before); assert.equal(origin.locator, 'https://example.com/api'); assert.equal(origin.title, 'https://example.com/page');
    writeFileSync(file, 'second'); assert.equal(facts.readFileOrigin(dir, 'data.json', facts.fingerprintFile(file), { ...before, origin }), undefined);
    writeFileSync(join(dir, '.hedgehog/artifact-origins.json'), JSON.stringify({ 'legacy.json': { type: 'api', locator: 'https://example.com/legacy?token=secret' } }));
    writeFileSync(join(dir, 'legacy.json'), '{}'); const legacy = facts.fingerprintFile(join(dir, 'legacy.json'));
    const legacyOrigin = facts.readFileOrigin(dir, 'legacy.json', legacy);
    assert.equal(legacyOrigin.locator, 'https://example.com/legacy');
    writeFileSync(join(dir, 'legacy.json'), '{"changed":true}');
    const changed = facts.fingerprintFile(join(dir, 'legacy.json'));
    assert.equal(facts.readFileOrigin(dir, 'legacy.json', changed, { ...legacy, origin: legacyOrigin }), undefined);
    assert.equal(facts.readFileOrigin(dir, 'legacy.json', changed, changed), undefined);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
