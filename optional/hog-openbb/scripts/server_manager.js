#!/usr/bin/env node
'use strict';

/**
 * OpenBB API service lifecycle manager.
 *
 * Core responsibilities:
 *   1. Start openbb-api service on demand (auto-start on first call)
 *   2. Auto-shutdown after idle timeout (watchdog mechanism, default 30 minutes)
 *   3. Provide manual start / stop / status CLI entry points
 *
 * Runtime state files (stored in a user-writable runtime directory):
 *   .openbb_server.pid   — openbb-api process PID
 *   .openbb_watchdog.pid — watchdog process PID
 *   .openbb_last_used    — last API call timestamp (epoch ms)
 */

const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { findOpenbb, setup } = require('./python_env.js');

// Cross-platform note: POSIX signals and executable permissions differ on Windows.
const IS_WIN = process.platform === 'win32';

// ─── Path Constants ─────────────────────────────────────────────────────────────
// Skill root directory = parent of scripts/
const SKILL_DIR = path.resolve(__dirname, '..');

const defaultSystemDir = process.env.HOGAGENT_SYSTEM_DIR || path.join(os.homedir(), '.hogagent');
const RUNTIME_DIR = path.resolve(process.env.HOG_OPENBB_RUNTIME_DIR || path.join(defaultSystemDir, 'runtime', 'hog-openbb'));
const PID_SERVER_FILE   = path.join(RUNTIME_DIR, '.openbb_server.pid');
const PID_WATCHDOG_FILE = path.join(RUNTIME_DIR, '.openbb_watchdog.pid');
const LAST_USED_FILE    = path.join(RUNTIME_DIR, '.openbb_last_used');
const START_LOCK_FILE   = path.join(RUNTIME_DIR, '.openbb_start.lock');
const SERVER_LOG_FILE   = path.join(RUNTIME_DIR, 'openbb-server.log');
const MAX_IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true, mode: 0o700 });
  if (!IS_WIN) fs.chmodSync(RUNTIME_DIR, 0o700);
}

// ─── Configuration Loading ───────────────────────────────────────────────────────

/**
 * Read skill configuration.
 * Reads from ~/.hogagent/skills_config.json (written by both WebUI and RPC).
 */
function readSkillConfig() {
  const systemDir = process.env.HOGAGENT_SYSTEM_DIR || path.join(os.homedir(), '.hogagent');
  const systemPath = path.join(systemDir, 'skills_config.json');
  try {
    const configStat = fs.statSync(systemPath);
    if (!configStat.isFile() || configStat.size > 1024 * 1024) {
      throw new Error(`Skill config must be a regular file no larger than 1MB: ${systemPath}`);
    }
    const raw = fs.readFileSync(systemPath, 'utf-8').replace(/^\uFEFF/, '');
    const config = JSON.parse(raw);
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error(`Skill config root must be a JSON object: ${systemPath}`);
    }
    const entry = config['hog-openbb'];
    if (entry === undefined) return {};
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('hog-openbb skill config must be a JSON object');
    }
    return entry;
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in skill config ${systemPath}: ${error.message}`);
    throw error;
  }
}

/**
 * Compatible with two key name formats: camelCase (legacy) and kebab-case (WebUI format).
 * For example: both fredApiKey and fred-api-key will be recognized.
 */
function getConfigValue(entry, camelKey, envKey) {
  // Convert camelCase to kebab-case (e.g. fredApiKey -> fred-api-key)
  const kebabKey = camelKey.replace(/([A-Z])/g, '-$1').toLowerCase();
  return entry[camelKey] ?? entry[kebabKey] ?? process.env[envKey] ?? '';
}

function loadConfig() {
  const entry = readSkillConfig();
  const apiUrl = entry.apiUrl ?? entry['api-url'] ?? process.env.OPENBB_API_URL ?? 'http://localhost:59201';
  const rawIdleTimeout = entry.idleTimeoutMs ?? entry['idle-timeout-ms'] ?? process.env.OPENBB_IDLE_TIMEOUT_MS ?? 1800000;
  const idleTimeoutMs = Number(rawIdleTimeout);
  const startupTimeoutMs = Number(entry.startupTimeoutMs ?? entry['startup-timeout-ms'] ?? process.env.OPENBB_STARTUP_TIMEOUT_MS ?? 120000);
  let parsed;
  try {
    if (typeof apiUrl !== 'string' || apiUrl.length > 2048 || /[\0\r\n]/.test(apiUrl)) throw new Error('invalid URL value');
    parsed = new URL(apiUrl);
  } catch (_) {
    throw new Error('OpenBB API URL must be a valid HTTP or HTTPS URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('OpenBB API URL must use HTTP or HTTPS');
  }
  if (parsed.username || parsed.password) {
    throw new Error('OpenBB API URL must not contain embedded credentials');
  }
  if (parsed.search || parsed.hash) {
    throw new Error('OpenBB API URL must not contain a query string or fragment');
  }
  if (!Number.isSafeInteger(idleTimeoutMs) || idleTimeoutMs < 1000 || idleTimeoutMs > MAX_IDLE_TIMEOUT_MS) {
    throw new Error(`OpenBB idle timeout must be an integer from 1000 through ${MAX_IDLE_TIMEOUT_MS} milliseconds`);
  }
  if (!Number.isSafeInteger(startupTimeoutMs) || startupTimeoutMs < 1000 || startupTimeoutMs > 600000) {
    throw new Error('OpenBB startup timeout must be an integer from 1000 through 600000 milliseconds');
  }
  return { apiUrl: parsed.toString().replace(/\/$/, ''), idleTimeoutMs, startupTimeoutMs };
}

// ─── Port Parsing ───────────────────────────────────────────────────────────────

function parsePort(apiUrl) {
  const parsed = new URL(apiUrl);
  if (parsed.port) return parsed.port;
  return parsed.protocol === 'https:' ? '443' : '80';
}

// ─── PID File Operations ─────────────────────────────────────────────────────────

function readPidFile(filePath) {
  try {
    const fileStat = fs.statSync(filePath);
    if (!fileStat.isFile() || fileStat.size > 64) return null;
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const pid = Number(raw);
    return Number.isSafeInteger(pid) ? pid : null;
  } catch (_) {
    return null;
  }
}

function writeRuntimeFile(filePath, content) {
  ensureRuntimeDir();
  const tempPath = path.join(RUNTIME_DIR, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tempPath, content, { encoding: 'utf-8', mode: 0o600, flag: 'wx' });
    if (!IS_WIN) fs.chmodSync(tempPath, 0o600);
    fs.renameSync(tempPath, filePath);
  } finally {
    try { fs.unlinkSync(tempPath); } catch (_) { /* already renamed or never created */ }
  }
}

function writePidFile(filePath, pid) {
  writeRuntimeFile(filePath, String(pid));
}

async function acquireStartLock(apiUrl, startupTimeoutMs) {
  ensureRuntimeDir();
  const deadline = Date.now() + startupTimeoutMs + 5000;
  while (Date.now() < deadline) {
    try {
      const fd = fs.openSync(START_LOCK_FILE, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, `${process.pid}\n`, 'utf8');
      } catch (error) {
        try { fs.closeSync(fd); } catch (_) { /* ignore cleanup failure */ }
        try { fs.unlinkSync(START_LOCK_FILE); } catch (_) { /* ignore cleanup failure */ }
        throw error;
      }
      return () => {
        try { fs.closeSync(fd); } catch (_) { /* already closed */ }
        try { fs.unlinkSync(START_LOCK_FILE); } catch (_) { /* already removed */ }
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      if (await isRunning(apiUrl)) return null;
      try {
        const owner = readPidFile(START_LOCK_FILE);
        const lockAgeMs = Date.now() - fs.statSync(START_LOCK_FILE).mtimeMs;
        if ((owner && !isPidAlive(owner)) || (!owner && lockAgeMs > 5000)) {
          fs.unlinkSync(START_LOCK_FILE);
          continue;
        }
      } catch (statError) {
        if (statError?.code !== 'ENOENT') throw statError;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Timed out waiting for another OpenBB startup attempt');
}

function removePidFile(filePath) {
  try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
}

function removePidFileIfOwned(filePath, pid) {
  if (readPidFile(filePath) === pid) removePidFile(filePath);
}

/**
 * Check if a given PID is alive.
 * Probes by sending signal 0 to the process (does not actually kill it).
 */
function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function isLoopbackApiUrl(apiUrl) {
  const hostname = new URL(apiUrl).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/**
 * Cross-platform process termination.
 * POSIX: sends SIGTERM for graceful exit; Windows has no signal semantics, process.kill terminates directly.
 */
function terminateProcess(pid) {
  try { process.kill(pid, IS_WIN ? undefined : 'SIGTERM'); } catch (_) { /* ignore */ }
}

/**
 * Cross-platform force kill.
 * POSIX: sends SIGKILL; Windows equivalent to terminateProcess (direct termination).
 */
function forceKillProcess(pid) {
  try { process.kill(pid, IS_WIN ? undefined : 'SIGKILL'); } catch (_) { /* ignore */ }
}

// ─── Health Check ───────────────────────────────────────────────────────────────

/**
 * OpenBB exposes provider coverage (no /health endpoint); probe it without a data request.
 * @returns {Promise<boolean>}
 */
function isRunning(apiUrl) {
  return new Promise((resolve) => {
    const url = new URL(`${apiUrl.replace(/\/+$/, '')}/api/v1/coverage/providers`);
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.get(
      url,
      { timeout: 1000 },
      (res) => {
        // Consume response body to avoid memory leaks
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

/**
 * Poll for service readiness; stop polling immediately if the child exits.
 * @returns {Promise<boolean>}
 */
async function waitForReady(apiUrl, maxWaitMs, signal) {
  const interval = 500;
  const deadline = Date.now() + maxWaitMs;
  while (!signal.aborted && Date.now() < deadline) {
    if (await isRunning(apiUrl)) return true;
    const remaining = deadline - Date.now();
    if (remaining > 0) await new Promise((r) => setTimeout(r, Math.min(interval, remaining)));
  }
  return false;
}

// ─── Service Start / Stop ────────────────────────────────────────────────────────

/**
 * Start the openbb-api process.
 * - Detached mode, independent of parent process lifecycle
 * - PID written to .openbb_server.pid
 * - Save Python output and wait for health check readiness (default 120s)
 */
async function startServer(config, entry) {
  config = config || loadConfig();
  entry = entry || readSkillConfig();
  const port = parsePort(config.apiUrl);

  // Skip if already running
  if (await isRunning(config.apiUrl)) {
    return { alreadyRunning: true };
  }
  if (!isLoopbackApiUrl(config.apiUrl)) {
    throw new Error(`Refusing to start a local openbb-api process for non-loopback URL: ${config.apiUrl}`);
  }
  if (new URL(config.apiUrl).protocol !== 'http:') {
    throw new Error('Locally managed openbb-api requires an http:// loopback URL');
  }

  const startupTimeoutMs = config.startupTimeoutMs ?? 120000;
  const releaseStartLock = await acquireStartLock(config.apiUrl, startupTimeoutMs);
  if (!releaseStartLock) return { alreadyRunning: true };
  try {
    if (await isRunning(config.apiUrl)) return { alreadyRunning: true };

    // Resolve the skill's isolated Python environment without shell activation.
    const openbbBin = findOpenbb();
    if (!openbbBin) {
      throw new Error(
        'openbb-api command not found. Install the isolated Python runtime with:\n' +
        `node "${path.join(__dirname, 'server_manager.js')}" setup\n` +
        'For an existing venv, set HOG_OPENBB_VENV to its directory or OPENBB_API_BIN to its openbb-api executable.'
      );
    }

    // Preserve the Skill's public aliases while passing OpenBB's native credential names.
    const envExtras = {};
    const envMap = {
      fredApiKey:         ['OPENBB_FRED_API_KEY', 'FRED_API_KEY'],
      alphaVantageApiKey: ['OPENBB_ALPHA_VANTAGE_API_KEY', 'ALPHA_VANTAGE_API_KEY'],
      twelveDataApiKey:   ['OPENBB_TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY'],
      polygonApiKey:      ['OPENBB_POLYGON_API_KEY', 'POLYGON_API_KEY'],
      intrinioApiKey:     ['OPENBB_INTRINIO_API_KEY', 'INTRINIO_API_KEY'],
      tiingoApiToken:     ['OPENBB_TIINGO_API_TOKEN', 'TIINGO_TOKEN'],
    };
    for (const [cfgKey, [envKey, pythonKey]] of Object.entries(envMap)) {
      const val = getConfigValue(entry, cfgKey, envKey);
      if (val) {
        if (typeof val !== 'string' || val.length > 8192 || /[\0\r\n]/.test(val)) {
          throw new Error(`${cfgKey} must be a single-line string no longer than 8192 characters`);
        }
        envExtras[envKey] = val;
        envExtras[pythonKey] = val;
      }
    }

    const logFd = fs.openSync(SERVER_LOG_FILE, 'w', 0o600);
    if (!IS_WIN) fs.fchmodSync(logFd, 0o600);
    const hostname = new URL(config.apiUrl).hostname.replace(/^\[|\]$/g, '');
    let child;
    try {
      child = spawn(openbbBin, ['--host', hostname, '--port', port], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        shell: false,
        env: { ...process.env, ...envExtras, PYTHONUNBUFFERED: '1' },
      });
    } finally {
      fs.closeSync(logFd);
    }
    const abort = new AbortController();
    const childFailure = new Promise((resolve) => {
      child.once('error', (error) => resolve({ error }));
      child.once('exit', (code, signal) => resolve({
        error: new Error(`openbb-api exited before becoming ready (code=${code}, signal=${signal})`),
      }));
    });
    child.unref();

    // Wait for readiness
    const outcome = await Promise.race([
      waitForReady(config.apiUrl, startupTimeoutMs, abort.signal).then((ready) => ({ ready })),
      childFailure,
    ]);
    abort.abort();
    if (outcome.error) {
      removePidFile(PID_SERVER_FILE);
      throw new Error(`openbb-api failed to start: ${outcome.error.message}. Python output: ${SERVER_LOG_FILE}`);
    }
    if (!outcome.ready || !child.pid) {
      // Startup timeout, clean up child process
      if (child.pid) terminateProcess(child.pid);
      removePidFile(PID_SERVER_FILE);
      throw new Error(
        `openbb-api startup timeout (not ready within ${startupTimeoutMs / 1000}s). Python output: ${SERVER_LOG_FILE}`
      );
    }

    writePidFile(PID_SERVER_FILE, child.pid);

    return { alreadyRunning: false, pid: child.pid, port };
  } finally {
    releaseStartLock();
  }
}

/**
 * Stop the openbb-api process.
 * Reads PID file, requests termination (SIGTERM on POSIX, direct kill on Windows), waits up to 5s, force kills on timeout.
 */
async function stopServer() {
  const pid = readPidFile(PID_SERVER_FILE);
  if (!pid || !isPidAlive(pid)) {
    removePidFile(PID_SERVER_FILE);
    return { wasRunning: false };
  }
  const config = loadConfig();
  if (!await isRunning(config.apiUrl)) {
    // A live PID without the expected health endpoint is stale or unrelated.
    // Never signal it solely because an old PID file happens to match.
    removePidFile(PID_SERVER_FILE);
    return { wasRunning: false };
  }

  terminateProcess(pid);

  // Wait for exit (max 5s)
  for (let i = 0; i < 50; i++) {
    if (!isPidAlive(pid)) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  // Force kill if still running
  if (isPidAlive(pid)) {
    forceKillProcess(pid);
  }

  removePidFile(PID_SERVER_FILE);
  return { wasRunning: true, pid };
}

/**
 * Ensure openbb-api is running.
 * Called by call_api.js before each invocation.
 */
async function ensureRunning(config, entry) {
  config = config || loadConfig();
  if (await isRunning(config.apiUrl)) {
    return { alreadyRunning: true };
  }
  if (!isLoopbackApiUrl(config.apiUrl)) {
    throw new Error(`Configured remote OpenBB API is unreachable: ${config.apiUrl}`);
  }
  return startServer(config, entry);
}

// ─── Timestamp & Watchdog ────────────────────────────────────────────────────────

/** Update the last call timestamp. */
function touchLastUsed() {
  writeRuntimeFile(LAST_USED_FILE, String(Date.now()));
}

/** Read the last call timestamp; returns 0 if not present. */
function readLastUsed() {
  try {
    const fileStat = fs.statSync(LAST_USED_FILE);
    if (!fileStat.isFile() || fileStat.size > 64) return 0;
    const raw = fs.readFileSync(LAST_USED_FILE, 'utf-8').trim();
    if (!/^\d+$/.test(raw)) return 0;
    const value = Number(raw);
    return Number.isSafeInteger(value) ? value : 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Spawn the watchdog process.
 *
 * The watchdog is a detached Node.js child process with the following logic:
 *   1. Sleep for idleTimeoutMs (default 30min)
 *   2. Read .openbb_last_used timestamp
 *   3. If a newer call occurred within the idle window, schedule the next check
 *      for the remaining interval instead of exiting
 *   4. Otherwise, recheck for a concurrent call and then stop the service
 *
 * A single watchdog therefore renews across repeated calls; call_api.js only
 * replaces it after the watchdog has actually exited.
 */
function spawnWatchdog() {
  const config = loadConfig();
  ensureRuntimeDir();
  const runtimeDir = RUNTIME_DIR;
  const idleTimeoutMs = config.idleTimeoutMs;

  // Inline watchdog script: executed via node -e to avoid an extra file
  const watchdogScript = `
    'use strict';
    const fs = require('fs');
    const path = require('path');
    const { isRunning } = require(${JSON.stringify(__filename)});

    const IS_WIN = process.platform === 'win32';
    const RUNTIME_DIR = ${JSON.stringify(runtimeDir)};
    const LAST_USED_FILE = path.join(RUNTIME_DIR, '.openbb_last_used');
    const PID_SERVER_FILE = path.join(RUNTIME_DIR, '.openbb_server.pid');
    const PID_WATCHDOG_FILE = path.join(RUNTIME_DIR, '.openbb_watchdog.pid');
    const IDLE_TIMEOUT_MS = ${idleTimeoutMs};
    const API_URL = ${JSON.stringify(config.apiUrl)};
    // Write own PID
    fs.writeFileSync(PID_WATCHDOG_FILE, String(process.pid), 'utf-8');

    function readLastUsed() {
      try { return parseInt(fs.readFileSync(LAST_USED_FILE, 'utf-8').trim(), 10) || 0; }
      catch(_) { return 0; }
    }

    function readServerPid() {
      try { return parseInt(fs.readFileSync(PID_SERVER_FILE, 'utf-8').trim(), 10) || null; }
      catch(_) { return null; }
    }

    function removeOwnWatchdogPid() {
      try {
        if (fs.readFileSync(PID_WATCHDOG_FILE, 'utf-8').trim() === String(process.pid)) {
          fs.unlinkSync(PID_WATCHDOG_FILE);
        }
      } catch(_) {}
    }

    function isPidAlive(pid) {
      if (!pid) return false;
      try { process.kill(pid, 0); return true; } catch(_) { return false; }
    }

    function terminate(pid) {
      try { process.kill(pid, IS_WIN ? undefined : 'SIGTERM'); } catch(_) {}
    }

    function forceKill(pid) {
      try { process.kill(pid, IS_WIN ? undefined : 'SIGKILL'); } catch(_) {}
    }

    function isApiRunning(done) {
      isRunning(API_URL).then(done, () => done(false));
    }

    // Cross-platform synchronous wait: Atomics.wait does not depend on shell (replaces POSIX sleep command)
    function sleepMs(ms) {
      try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
      catch(_) { const t = Date.now() + ms; while (Date.now() < t) {} }
    }

    function stopServer() {
      const pid = readServerPid();
      if (!pid || !isPidAlive(pid)) {
        try { fs.unlinkSync(PID_SERVER_FILE); } catch(_) {}
        return;
      }
      terminate(pid);
      // Synchronous wait for exit (max 5s); cannot use setInterval because process.exit ends the event loop immediately
      let waited = 0;
      while (waited < 5000) {
        sleepMs(100);
        waited += 100;
        if (!isPidAlive(pid)) break;
      }
      if (isPidAlive(pid)) { forceKill(pid); }
      try { fs.unlinkSync(PID_SERVER_FILE); } catch(_) {}
    }

    function scheduleNextCheck() {
      const lastUsed = readLastUsed();
      const idleFor = lastUsed > 0 ? Math.max(0, Date.now() - lastUsed) : IDLE_TIMEOUT_MS;
      const remaining = Math.max(1, Math.min(IDLE_TIMEOUT_MS, IDLE_TIMEOUT_MS - idleFor));
      setTimeout(checkIdle, remaining);
    }

    function checkIdle() {
      const observedLastUsed = readLastUsed();
      if (observedLastUsed > 0 && Date.now() - observedLastUsed < IDLE_TIMEOUT_MS) {
        scheduleNextCheck();
        return;
      }
      // No new calls. Only signal the recorded PID if the expected OpenBB health
      // endpoint is still present; a stale, reused PID must never be killed.
      isApiRunning((running) => {
        if (readLastUsed() > observedLastUsed) {
          scheduleNextCheck();
          return;
        }
        if (running) stopServer();
        else { try { fs.unlinkSync(PID_SERVER_FILE); } catch(_) {} }
        removeOwnWatchdogPid();
        process.exit(0);
      });
    }

    setTimeout(checkIdle, IDLE_TIMEOUT_MS);
  `;

  const child = spawn(process.execPath, ['-e', watchdogScript], {
    detached: true,
    stdio: 'ignore',
    shell: false,
  });
  child.once('error', () => removePidFileIfOwned(PID_WATCHDOG_FILE, child.pid));
  child.unref();

  if (child.pid) {
    writePidFile(PID_WATCHDOG_FILE, child.pid);
  }

  return child.pid;
}

// ─── Status Query ───────────────────────────────────────────────────────────────

async function getStatus() {
  const config = loadConfig();
  const running = await isRunning(config.apiUrl);
  const serverPid = readPidFile(PID_SERVER_FILE);
  const watchdogPid = readPidFile(PID_WATCHDOG_FILE);
  const lastUsedTs = readLastUsed();
  const serverPidAlive = isPidAlive(serverPid);
  const watchdogPidAlive = isPidAlive(watchdogPid);

  return {
    apiUrl: config.apiUrl,
    idleTimeoutMs: config.idleTimeoutMs,
    startupTimeoutMs: config.startupTimeoutMs,
    apiBin: findOpenbb(),
    logFile: SERVER_LOG_FILE,
    serverRunning: running,
    serverPid: serverPidAlive ? serverPid : null,
    watchdogPid: watchdogPidAlive ? watchdogPid : null,
    lastUsedAt: lastUsedTs ? new Date(lastUsedTs).toISOString() : null,
    idleMinutes: lastUsedTs ? ((Date.now() - lastUsedTs) / 60000).toFixed(1) : null,
  };
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────────

async function main() {
  const cmd = process.argv[2];
  if (process.argv.length !== 3 || cmd === '-h' || cmd === '--help') {
    console.log('Usage: node server_manager.js <setup|start|stop|status>');
    return cmd === '-h' || cmd === '--help' ? 0 : 1;
  }

  if (cmd === 'setup') {
    console.log(JSON.stringify(await setup()));
  } else if (cmd === 'start') {
    try {
      const config = loadConfig();
      const entry = readSkillConfig();
      const result = await startServer(config, entry);
      if (result.alreadyRunning) {
        console.log(JSON.stringify({ status: 'already_running', apiUrl: config.apiUrl }));
      } else {
        touchLastUsed();
        spawnWatchdog();
        console.log(JSON.stringify({ status: 'started', pid: result.pid, port: result.port }));
      }
    } catch (err) {
      console.error(JSON.stringify({ status: 'error', message: err.message }));
      return 1;
    }
  } else if (cmd === 'stop') {
    const result = await stopServer();
    // A stale watchdog is harmless after the server PID file is removed. Do not
    // signal a possibly reused PID from an old watchdog record.
    removePidFile(PID_WATCHDOG_FILE);
    console.log(JSON.stringify({ status: result.wasRunning ? 'stopped' : 'not_running' }));
  } else if (cmd === 'status') {
    const status = await getStatus();
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.error('Usage: node server_manager.js <setup|start|stop|status>');
    return 1;
  }
  return 0;
}

// Execute CLI directly
if (require.main === module) {
  main().then(
    (exitCode) => { process.exitCode = exitCode; },
    (err) => {
      console.error(JSON.stringify({ status: 'error', message: err.message }));
      process.exitCode = 1;
    },
  );
}

// Exports for use by call_api.js
module.exports = {
  loadConfig,
  readSkillConfig,
  getConfigValue,
  isRunning,
  startServer,
  stopServer,
  ensureRunning,
  touchLastUsed,
  spawnWatchdog,
  getStatus,
  isPidAlive,
  readPidFile,
  SKILL_DIR,
  RUNTIME_DIR,
  PID_SERVER_FILE,
  PID_WATCHDOG_FILE,
  LAST_USED_FILE,
};
