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
 * Runtime state files (stored in skill root directory, hidden with . prefix):
 *   .openbb_server.pid   — openbb-api process PID
 *   .openbb_watchdog.pid — watchdog process PID
 *   .openbb_last_used    — last API call timestamp (epoch ms)
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Cross-platform note: which/SIGTERM and other POSIX semantics are unavailable on Windows
const IS_WIN = process.platform === 'win32';

// ─── Path Constants ─────────────────────────────────────────────────────────────
// Skill root directory = parent of scripts/
const SKILL_DIR = path.resolve(__dirname, '..');

const PID_SERVER_FILE   = path.join(SKILL_DIR, '.openbb_server.pid');
const PID_WATCHDOG_FILE = path.join(SKILL_DIR, '.openbb_watchdog.pid');
const LAST_USED_FILE    = path.join(SKILL_DIR, '.openbb_last_used');

// ─── Configuration Loading ───────────────────────────────────────────────────────

/**
 * Read skill configuration.
 * Reads from ~/.hogagent/skills_config.json (written by both WebUI and RPC).
 */
function readSkillConfig() {
  try {
    const systemDir = process.env.HOGAGENT_SYSTEM_DIR || path.join(os.homedir(), '.hogagent');
    const systemPath = path.join(systemDir, 'skills_config.json');
    const raw = fs.readFileSync(systemPath, 'utf-8');
    const config = JSON.parse(raw);
    return config['hog-openbb'] || {};
  } catch (_) { /* ignore */ }
  return {};
}

/**
 * Compatible with two key name formats: camelCase (legacy) and kebab-case (WebUI format).
 * For example: both fredApiKey and fred-api-key will be recognized.
 */
function getConfigValue(entry, camelKey, envKey) {
  // Convert camelCase to kebab-case (e.g. fredApiKey -> fred-api-key)
  const kebabKey = camelKey.replace(/([A-Z])/g, '-$1').toLowerCase();
  return entry[camelKey] || entry[kebabKey] || process.env[envKey] || '';
}

function loadConfig() {
  const entry = readSkillConfig();
  const apiUrl        = entry.apiUrl        || entry['api-url']        || process.env.OPENBB_API_URL        || 'http://localhost:59201';
  const idleTimeoutMs = Number(entry.idleTimeoutMs || entry['idle-timeout-ms'] || process.env.OPENBB_IDLE_TIMEOUT_MS || 1800000);
  return { apiUrl, idleTimeoutMs };
}

// ─── Port Parsing ───────────────────────────────────────────────────────────────

function parsePort(apiUrl) {
  try {
    return new URL(apiUrl).port || '59201';
  } catch (_) {
    return '59201';
  }
}

// ─── PID File Operations ─────────────────────────────────────────────────────────

function readPidFile(filePath) {
  try {
    const pid = parseInt(fs.readFileSync(filePath, 'utf-8').trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch (_) {
    return null;
  }
}

function writePidFile(filePath, pid) {
  fs.writeFileSync(filePath, String(pid), 'utf-8');
}

function removePidFile(filePath) {
  try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
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

/**
 * Cross-platform executable lookup.
 * Windows uses `where` (may return multiple lines, takes the first); POSIX uses `which`.
 * @returns {string|null} Executable path, or null if not found
 */
function findExecutable(name) {
  try {
    const out = execSync(`${IS_WIN ? 'where' : 'which'} ${name}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const first = out.split(/\r?\n/)[0].trim();
    return first || null;
  } catch (_) {
    return null;
  }
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
 * HTTP GET apiUrl/health; 200ms timeout considered unreachable.
 * @returns {Promise<boolean>}
 */
function isRunning(apiUrl) {
  return new Promise((resolve) => {
    const url = new URL(`${apiUrl.replace(/\/+$/, '')}/health`);
    const req = http.get(
      { hostname: url.hostname, port: url.port, path: url.pathname, timeout: 200 },
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
 * Poll and wait for service readiness, up to maxWaitMs (default 15,000ms), interval 500ms.
 * @returns {Promise<boolean>}
 */
async function waitForReady(apiUrl, maxWaitMs = 15000) {
  const interval = 500;
  let elapsed = 0;
  while (elapsed < maxWaitMs) {
    if (await isRunning(apiUrl)) return true;
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;
  }
  return false;
}

// ─── Service Start / Stop ────────────────────────────────────────────────────────

/**
 * Start the openbb-api process.
 * - Detached mode, independent of parent process lifecycle
 * - PID written to .openbb_server.pid
 * - Wait for health check readiness (max 15s)
 */
async function startServer(config, entry) {
  config = config || loadConfig();
  entry = entry || readSkillConfig();
  const port = parsePort(config.apiUrl);

  // Skip if already running
  if (await isRunning(config.apiUrl)) {
    return { alreadyRunning: true };
  }

  // Check if openbb-api command exists (cross-platform: which / where)
  const openbbBin = findExecutable('openbb-api');
  if (!openbbBin) {
    throw new Error(
      'openbb-api command not found. Please install OpenBB Platform first: pip install openbb[all]\n' +
      'After installation, run `openbb-api --help` once to confirm the command is available.'
    );
  }

  // Inject data source API Keys into environment variables (OpenBB reads provider config via env vars)
  const envExtras = {};
  const envMap = {
    fredApiKey:         'OPENBB_FRED_API_KEY',
    alphaVantageApiKey: 'OPENBB_ALPHA_VANTAGE_API_KEY',
    twelveDataApiKey:   'OPENBB_TWELVE_DATA_API_KEY',
    polygonApiKey:      'OPENBB_POLYGON_API_KEY',
    intrinioApiKey:     'OPENBB_INTRINIO_API_KEY',
    tiingoApiToken:     'OPENBB_TIINGO_API_TOKEN',
  };
  for (const [cfgKey, envKey] of Object.entries(envMap)) {
    const val = getConfigValue(entry, cfgKey, envKey);
    if (val) envExtras[envKey] = val;
  }

  const child = spawn(openbbBin, ['--port', port], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, ...envExtras },
  });

  child.unref();

  if (!child.pid) {
    throw new Error('openbb-api failed to start: unable to get child process PID');
  }

  writePidFile(PID_SERVER_FILE, child.pid);

  // Wait for readiness
  const ready = await waitForReady(config.apiUrl, 15000);
  if (!ready) {
    // Startup timeout, clean up child process
    terminateProcess(child.pid);
    removePidFile(PID_SERVER_FILE);
    throw new Error(
      `openbb-api startup timeout (not ready within 15s). Port ${port} may be occupied, or there may be a Python environment issue.`
    );
  }

  return { alreadyRunning: false, pid: child.pid, port };
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
  return startServer(config, entry);
}

// ─── Timestamp & Watchdog ────────────────────────────────────────────────────────

/** Update the last call timestamp. */
function touchLastUsed() {
  fs.writeFileSync(LAST_USED_FILE, String(Date.now()), 'utf-8');
}

/** Read the last call timestamp; returns 0 if not present. */
function readLastUsed() {
  try {
    return parseInt(fs.readFileSync(LAST_USED_FILE, 'utf-8').trim(), 10) || 0;
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
 *   3. If timestamp > watchdog start time → new calls occurred, watchdog exits on its own
 *   4. Otherwise → call stopServer() to shut down the service
 *
 * Anti-overlap: an old watchdog waking up detects the updated timestamp and exits on its own.
 */
function spawnWatchdog() {
  const config = loadConfig();
  const skillDir = SKILL_DIR;
  const idleTimeoutMs = config.idleTimeoutMs;

  // Inline watchdog script: executed via node -e to avoid an extra file
  const watchdogScript = `
    'use strict';
    const fs = require('fs');
    const path = require('path');

    const IS_WIN = process.platform === 'win32';
    const SKILL_DIR = ${JSON.stringify(skillDir)};
    const LAST_USED_FILE = path.join(SKILL_DIR, '.openbb_last_used');
    const PID_SERVER_FILE = path.join(SKILL_DIR, '.openbb_server.pid');
    const PID_WATCHDOG_FILE = path.join(SKILL_DIR, '.openbb_watchdog.pid');
    const IDLE_TIMEOUT_MS = ${idleTimeoutMs};
    const START_TIME = Date.now();

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

    setTimeout(() => {
      const lastUsed = readLastUsed();
      if (lastUsed > START_TIME) {
        // New calls occurred, watchdog exits on its own
        try { fs.unlinkSync(PID_WATCHDOG_FILE); } catch(_) {}
        process.exit(0);
      }
      // No new calls, shut down the service
      stopServer();
      try { fs.unlinkSync(PID_WATCHDOG_FILE); } catch(_) {}
      process.exit(0);
    }, IDLE_TIMEOUT_MS);
  `;

  const child = spawn(process.execPath, ['-e', watchdogScript], {
    detached: true,
    stdio: 'ignore',
  });

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

  if (cmd === 'start') {
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
      process.exit(1);
    }
  } else if (cmd === 'stop') {
    const result = await stopServer();
    // Also stop the watchdog
    const wPid = readPidFile(PID_WATCHDOG_FILE);
    if (wPid && isPidAlive(wPid)) {
      terminateProcess(wPid);
    }
    removePidFile(PID_WATCHDOG_FILE);
    console.log(JSON.stringify({ status: result.wasRunning ? 'stopped' : 'not_running' }));
  } else if (cmd === 'status') {
    const status = await getStatus();
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.error('Usage: node server_manager.js <start|stop|status>');
    process.exit(1);
  }
}

// Execute CLI directly
if (require.main === module) {
  main().catch((err) => {
    console.error(JSON.stringify({ status: 'error', message: err.message }));
    process.exit(1);
  });
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
  PID_SERVER_FILE,
  PID_WATCHDOG_FILE,
  LAST_USED_FILE,
};
