#!/usr/bin/env node
'use strict';

/**
 * OpenBB API 服务生命周期管理器。
 *
 * 核心职责：
 *   1. 按需启动 openbb-api 服务（首次调用时自动拉起）
 *   2. 空闲超时后自动关闭（看门狗机制，默认 30 分钟）
 *   3. 提供手动 start / stop / status CLI 入口
 *
 * 运行时状态文件（存放于技能根目录，以 . 开头隐藏）：
 *   .openbb_server.pid   — openbb-api 进程 PID
 *   .openbb_watchdog.pid — 看门狗进程 PID
 *   .openbb_last_used    — 最后一次 API 调用时间戳（epoch ms）
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 跨平台标记：Windows 下 which/SIGTERM 等 POSIX 语义不可用
const IS_WIN = process.platform === 'win32';

// ─── 路径常量 ──────────────────────────────────────────────────────────────────
// 技能根目录 = scripts/ 的上一级
const SKILL_DIR = path.resolve(__dirname, '..');

const PID_SERVER_FILE   = path.join(SKILL_DIR, '.openbb_server.pid');
const PID_WATCHDOG_FILE = path.join(SKILL_DIR, '.openbb_watchdog.pid');
const LAST_USED_FILE    = path.join(SKILL_DIR, '.openbb_last_used');

// ─── 配置加载 ──────────────────────────────────────────────────────────────────

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
    return config['hog-openbb'] || {};
  } catch (_) { /* ignore */ }
  return {};
}

/**
 * 兼容两种 key 名格式：camelCase（旧格式）和 kebab-case（WebUI 格式）。
 * 例如：fredApiKey 和 fred-api-key 都会被识别。
 */
function getConfigValue(entry, camelKey, envKey) {
  // 将 camelCase 转为 kebab-case（如 fredApiKey -> fred-api-key）
  const kebabKey = camelKey.replace(/([A-Z])/g, '-$1').toLowerCase();
  return entry[camelKey] || entry[kebabKey] || process.env[envKey] || '';
}

function loadConfig() {
  const entry = readSkillConfig();
  const apiUrl        = entry.apiUrl        || entry['api-url']        || process.env.OPENBB_API_URL        || 'http://localhost:59201';
  const idleTimeoutMs = Number(entry.idleTimeoutMs || entry['idle-timeout-ms'] || process.env.OPENBB_IDLE_TIMEOUT_MS || 1800000);
  return { apiUrl, idleTimeoutMs };
}

// ─── 端口解析 ──────────────────────────────────────────────────────────────────

function parsePort(apiUrl) {
  try {
    return new URL(apiUrl).port || '59201';
  } catch (_) {
    return '59201';
  }
}

// ─── PID 文件操作 ──────────────────────────────────────────────────────────────

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
 * 判断给定 PID 是否存活。
 * 向进程发送 signal 0（不实际杀死）探测。
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
 * 跨平台查找可执行文件。
 * Windows 使用 `where`（可能返回多行，取首个），POSIX 使用 `which`。
 * @returns {string|null} 可执行文件路径，未找到返回 null
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
 * 跨平台终止进程。
 * POSIX：发送 SIGTERM 请求优雅退出；Windows 无信号语义，process.kill 直接终止进程。
 */
function terminateProcess(pid) {
  try { process.kill(pid, IS_WIN ? undefined : 'SIGTERM'); } catch (_) { /* ignore */ }
}

/**
 * 跨平台强制终止进程。
 * POSIX：发送 SIGKILL；Windows 与 terminateProcess 等价（直接终止）。
 */
function forceKillProcess(pid) {
  try { process.kill(pid, IS_WIN ? undefined : 'SIGKILL'); } catch (_) { /* ignore */ }
}

// ─── 健康检查 ──────────────────────────────────────────────────────────────────

/**
 * HTTP GET apiUrl/health，200ms 超时视为不可达。
 * @returns {Promise<boolean>}
 */
function isRunning(apiUrl) {
  return new Promise((resolve) => {
    const url = new URL(`${apiUrl.replace(/\/+$/, '')}/health`);
    const req = http.get(
      { hostname: url.hostname, port: url.port, path: url.pathname, timeout: 200 },
      (res) => {
        // 消费响应体，避免内存泄漏
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

/**
 * 轮询等待服务就绪，最多 maxWaitMs（默认 15 000ms），间隔 500ms。
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

// ─── 服务启动 / 停止 ───────────────────────────────────────────────────────────

/**
 * 启动 openbb-api 进程。
 * - detached 模式，独立于父进程生命周期
 * - PID 写入 .openbb_server.pid
 * - 等待健康检查就绪（最多 15s）
 */
async function startServer(config, entry) {
  config = config || loadConfig();
  entry = entry || readSkillConfig();
  const port = parsePort(config.apiUrl);

  // 已运行则跳过
  if (await isRunning(config.apiUrl)) {
    return { alreadyRunning: true };
  }

  // 检查 openbb-api 命令是否存在（跨平台：which / where）
  const openbbBin = findExecutable('openbb-api');
  if (!openbbBin) {
    throw new Error(
      '未找到 openbb-api 命令。请先安装 OpenBB 平台：pip install openbb[all]\n' +
      '安装后运行一次 `openbb-api --help` 确认命令可用。'
    );
  }

  // 将数据源 API Key 注入环境变量（OpenBB 通过环境变量读取 provider 配置）
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
    throw new Error('openbb-api 启动失败：未能获取子进程 PID');
  }

  writePidFile(PID_SERVER_FILE, child.pid);

  // 等待就绪
  const ready = await waitForReady(config.apiUrl, 15000);
  if (!ready) {
    // 启动超时，清理子进程
    terminateProcess(child.pid);
    removePidFile(PID_SERVER_FILE);
    throw new Error(
      `openbb-api 启动超时（15s 内未就绪）。端口 ${port} 可能被占用，或 Python 环境存在问题。`
    );
  }

  return { alreadyRunning: false, pid: child.pid, port };
}

/**
 * 停止 openbb-api 进程。
 * 读取 PID 文件，请求终止（POSIX 为 SIGTERM，Windows 直接终止），等待最多 5s，超时则强杀。
 */
async function stopServer() {
  const pid = readPidFile(PID_SERVER_FILE);
  if (!pid || !isPidAlive(pid)) {
    removePidFile(PID_SERVER_FILE);
    return { wasRunning: false };
  }

  terminateProcess(pid);

  // 等待退出（最多 5s）
  for (let i = 0; i < 50; i++) {
    if (!isPidAlive(pid)) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  // 仍未退出则强杀
  if (isPidAlive(pid)) {
    forceKillProcess(pid);
  }

  removePidFile(PID_SERVER_FILE);
  return { wasRunning: true, pid };
}

/**
 * 确保 openbb-api 正在运行。
 * 供 call_api.js 在每次调用前执行。
 */
async function ensureRunning(config, entry) {
  config = config || loadConfig();
  if (await isRunning(config.apiUrl)) {
    return { alreadyRunning: true };
  }
  return startServer(config, entry);
}

// ─── 时间戳 & 看门狗 ──────────────────────────────────────────────────────────

/** 更新最后一次调用时间戳。 */
function touchLastUsed() {
  fs.writeFileSync(LAST_USED_FILE, String(Date.now()), 'utf-8');
}

/** 读取最后一次调用时间戳，不存在则返回 0。 */
function readLastUsed() {
  try {
    return parseInt(fs.readFileSync(LAST_USED_FILE, 'utf-8').trim(), 10) || 0;
  } catch (_) {
    return 0;
  }
}

/**
 * 启动看门狗进程。
 *
 * 看门狗为 detached Node.js 子进程，执行逻辑：
 *   1. sleep idleTimeoutMs（默认 30min）
 *   2. 读取 .openbb_last_used 时间戳
 *   3. 若时间戳 > 看门狗启动时间 → 有新调用，watchdog 自行退出
 *   4. 否则 → 调用 stopServer() 关闭服务
 *
 * 防重叠：旧 watchdog 醒来后检测到时间戳已更新，自行退出。
 */
function spawnWatchdog() {
  const config = loadConfig();
  const skillDir = SKILL_DIR;
  const idleTimeoutMs = config.idleTimeoutMs;

  // 内联 watchdog 脚本：通过 node -e 执行，避免额外文件
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

    // 写入自身 PID
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

    // 跨平台同步等待：Atomics.wait 不依赖 shell（替代 POSIX 的 sleep 命令）
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
      // 同步等待退出（最多 5s），不能用 setInterval 因为 process.exit 会立即结束事件循环
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
        // 有新调用，watchdog 自行退出
        try { fs.unlinkSync(PID_WATCHDOG_FILE); } catch(_) {}
        process.exit(0);
      }
      // 无新调用，关闭服务
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

// ─── 状态查询 ──────────────────────────────────────────────────────────────────

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

// ─── CLI 入口 ──────────────────────────────────────────────────────────────────

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
    // 同时停止看门狗
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
    console.error('用法: node server_manager.js <start|stop|status>');
    process.exit(1);
  }
}

// 直接执行 CLI
if (require.main === module) {
  main().catch((err) => {
    console.error(JSON.stringify({ status: 'error', message: err.message }));
    process.exit(1);
  });
}

// 导出供 call_api.js 引用
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
