#!/usr/bin/env node
/**
 * install.js - 接入安装配置刺猬投研AI
 *
 * 用法:
 * node install.js <token> <accountId>
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { createWriteStream, mkdirSync, rmSync } = fs;

const [token, accountId] = process.argv.slice(2);
const HEDGEHOG_AGENT_ID = 'hedgehog-finance';
const HEDGEHOG_VERSION_URL = 'https://ciweiai.com/version.json';
const STATUS_FILE_NAME = '.hedgehog-config-status.json';
const INSTALL_STEPS = [
	{ id: 'workspace', label: '初始化刺猬投研插件' },
	{ id: 'plugin', label: '安装刺猬投研插件' },
	{ id: 'account', label: '配置刺猬投研账号' },
	{ id: 'skills', label: '安装hedgehog skills' }
];
const OMITTED_VERSION_KEYS = new Set([
	'hedgehog-plugin-latest',
	'hedgehog-plugin-min',
	'app-version-latest',
	'app-version-min'
]);

if (!token || !accountId) {
	console.error('用法: node install.js <token> <accountId>');
	process.exit(1);
}

function oc(args) {
	try {
		const stdout = execSync(`openclaw ${args}`, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
		return { ok: true, stdout: stdout.trim() };
	} catch (e) {
		return { ok: false, stdout: '', stderr: (e.stderr || '').trim() };
	}
}

function looksAlreadyInstalled(result) {
	const output = `${result.stdout || ''}\n${result.stderr || ''}`.toLowerCase();
	return output.includes('already installed') ||
		output.includes('already exists') ||
		output.includes('is installed') ||
		output.includes('exists') ||
		output.includes('已安装') ||
		output.includes('已存在');
}

function shellQuote(value) {
	return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function isUnsupportedReplaceOption(result) {
	const output = `${result.stdout || ''}\n${result.stderr || ''}`.toLowerCase();
	return output.includes('--replace') && (
		output.includes('unknown option') ||
		output.includes('unknown argument') ||
		output.includes('unrecognized option') ||
		output.includes('unexpected argument') ||
		output.includes('too many arguments')
	);
}

function supportsConfigSetReplace() {
	const help = oc('config set --help');
	return help.ok && /(^|\s)--replace(\s|,|$)/.test(`${help.stdout}\n${help.stderr}`);
}

function setJsonConfig(pathExpr, value, { replace = false } = {}) {
	const json = shellQuote(JSON.stringify(value));
	const baseCommand = `config set ${pathExpr} ${json} --strict-json`;
	if (!replace) return oc(baseCommand);

	if (supportsConfigSetReplace()) {
		const result = oc(`${baseCommand} --replace`);
		if (result.ok || !isUnsupportedReplaceOption(result)) return result;
	}
	return oc(baseCommand);
}

function readJsonConfig(pathExpr, { allowMissing = false } = {}) {
	const result = oc(`config get ${pathExpr} --json`);
	if (!result.ok) {
		if (allowMissing && (result.stderr || '').includes('Config path not found')) return null;
		throw new Error(result.stderr || `无法读取 OpenClaw 配置: ${pathExpr}`);
	}
	if (!result.stdout) return null;
	try {
		return JSON.parse(result.stdout);
	} catch {
		throw new Error(`OpenClaw 配置不是有效 JSON: ${pathExpr}`);
	}
}

function upsertAgent(list, agentId, update) {
	const index = list.findIndex((agent) => agent && agent.id === agentId);
	const nextList = [...list];
	const current = index >= 0 ? nextList[index] : { id: agentId };
	const next = update(current);
	if (index >= 0) nextList[index] = next;
	else nextList.push(next);
	return nextList;
}

function ensureHedgehogAgentWorkspaceConfig(agentDir) {
	const list = readJsonConfig('agents.list', { allowMissing: true });
	const agents = list == null ? [] : list;
	if (!Array.isArray(agents)) {
		throw new Error('OpenClaw 配置 agents.list 不是数组，无法更新 hedgehog-finance agent');
	}
	const nextList = upsertAgent(agents, HEDGEHOG_AGENT_ID, (agent) => ({
		...agent,
		workspace: agentDir
	}));

	const setResult = setJsonConfig('agents.list', nextList, { replace: true });
	if (!setResult.ok) {
		throw new Error(setResult.stderr || 'hedgehog-finance agent workspace 写入失败');
	}
}

function bindHedgehogChannel() {
	const bindResult = oc('agents bind --agent hedgehog-finance --bind "hedgehog_finance:*"');
	if (!bindResult.ok && !looksAlreadyInstalled(bindResult)) {
		throw new Error(bindResult.stderr || 'hedgehog_finance channel binding 写入失败');
	}
}

function hasHedgehogAgentConfig() {
	const list = readJsonConfig('agents.list', { allowMissing: true });
	if (list == null) return false;
	if (!Array.isArray(list)) {
		throw new Error('OpenClaw 配置 agents.list 不是数组，无法判断 hedgehog-finance agent 是否存在');
	}
	return list.some((agent) => agent && agent.id === HEDGEHOG_AGENT_ID);
}

function download(url, dest, redirects = 0) {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
				res.resume();
				if (!res.headers.location) {
					return reject(new Error(`HTTP ${res.statusCode} without location`));
				}
				if (redirects >= 5) {
					return reject(new Error('Too many redirects'));
				}
				const redirectUrl = new URL(res.headers.location, url).toString();
				return resolve(download(redirectUrl, dest, redirects + 1));
			}
			if (res.statusCode !== 200) {
				res.resume();
				return reject(new Error(`HTTP ${res.statusCode}`));
			}
			const file = createWriteStream(dest);
			res.pipe(file);
			file.on('finish', () => file.close(resolve));
			file.on('error', (err) => {
				fs.unlink(dest, () => { });
				reject(err);
			});
		}).on('error', (err) => {
			fs.unlink(dest, () => { });
			reject(err);
		});
	});
}

function fetchJson(url, redirects = 0) {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
				res.resume();
				if (!res.headers.location) {
					return reject(new Error(`HTTP ${res.statusCode} without location`));
				}
				if (redirects >= 5) {
					return reject(new Error('Too many redirects'));
				}
				const redirectUrl = new URL(res.headers.location, url).toString();
				return resolve(fetchJson(redirectUrl, redirects + 1));
			}
			if (res.statusCode !== 200) {
				res.resume();
				return reject(new Error(`HTTP ${res.statusCode}`));
			}

			let body = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => { body += chunk; });
			res.on('end', () => {
				try {
					resolve(JSON.parse(body));
				} catch (e) {
					reject(new Error(`JSON 解析失败:${e.message}`));
				}
			});
		}).on('error', reject);
	});
}

function unzip(zipPath, destDir) {
	mkdirSync(destDir, { recursive: true });
	if (process.platform === 'win32') {
		execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'inherit' });
	} else {
		execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
	}
}

function cleanup(...paths) {
	for (const p of paths) {
		try { rmSync(p, { recursive: true, force: true }); } catch { }
	}
}

function filterStoredVersions(versions) {
	return Object.fromEntries(
		Object.entries(versions).filter(([key]) => !OMITTED_VERSION_KEYS.has(key))
	);
}

function discoverPluginDir(baseDir) {
	const stack = [baseDir];

	while (stack.length) {
		const current = stack.pop();
		if (fs.existsSync(path.join(current, 'openclaw.plugin.json'))) {
			return current;
		}

		let entries = [];
		try {
			entries = fs.readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			if (entry.isDirectory() && entry.name !== '__MACOSX' && !entry.name.startsWith('.')) {
				stack.push(path.join(current, entry.name));
			}
		}
	}

	return null;
}

function installPluginDependencies(pluginDir) {
	const packageJsonPath = path.join(pluginDir, 'package.json');
	if (!fs.existsSync(packageJsonPath)) {
		console.log('插件包未包含 package.json，跳过依赖安装');
		return;
	}

	const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
	const hasLockFile = fs.existsSync(path.join(pluginDir, 'package-lock.json'));
	const command = hasLockFile ? `${npmCmd} ci --omit=dev` : `${npmCmd} install --omit=dev`;

	console.log(`安装插件生产依赖: ${command}`);
	try {
		execSync(command, { cwd: pluginDir, stdio: 'inherit' });
	} catch (e) {
		throw new Error(`插件依赖安装失败:${e.message}`);
	}
}

function getHedgehogAgentDir() {
	const wsResult = oc('config get agents.defaults.workspace');
	if (!wsResult.ok || !wsResult.stdout) {
		console.error('无法读取 agents.defaults.workspace，请检查 openclaw 配置');
		process.exit(1);
	}
	return path.join(path.dirname(wsResult.stdout), 'hedgehog-workspace');
}

function getSkillVersion() {
	try {
		const content = fs.readFileSync(path.join(__dirname, '..', 'SKILL.md'), 'utf8');
		const match = content.match(/^version:\s*([^\s]+)/mi);
		return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
	} catch {
		return null;
	}
}

function createStatusSteps() {
	return INSTALL_STEPS.map((step) => ({
		id: step.id,
		label: step.label,
		status: 'pending'
	}));
}

function readExistingStatus(agentDir) {
	const statusPath = path.join(agentDir, STATUS_FILE_NAME);
	if (!fs.existsSync(statusPath)) return null;
	try {
		return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
	} catch {
		return null;
	}
}

function writeStatusFile(agentDir, status) {
	mkdirSync(agentDir, { recursive: true });
	const statusPath = path.join(agentDir, STATUS_FILE_NAME);
	fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
	return statusPath;
}

function updateInstallStatus(agentDir, patch = {}) {
	const existing = readExistingStatus(agentDir) || {};
	const status = {
		configured: false,
		status: 'running',
		accountId,
		version: getSkillVersion(),
		startedAt: existing.startedAt || new Date().toISOString(),
		steps: Array.isArray(existing.steps) ? existing.steps : createStatusSteps(),
		...existing,
		...patch,
		updatedAt: new Date().toISOString()
	};

	if (!Array.isArray(status.steps)) {
		status.steps = createStatusSteps();
	}

	return writeStatusFile(agentDir, status);
}

function setStepStatus(agentDir, stepId, stepStatus, extra = {}) {
	const existing = readExistingStatus(agentDir) || {};
	const steps = Array.isArray(existing.steps) ? existing.steps : createStatusSteps();
	const now = new Date().toISOString();
	const nextSteps = steps.map((step) => {
		if (step.id !== stepId) return step;
		return {
			...step,
			status: stepStatus,
			...(stepStatus === 'running' ? { startedAt: step.startedAt || now } : {}),
			...(stepStatus === 'completed' || stepStatus === 'failed' ? { finishedAt: now } : {}),
			...extra
		};
	});

	const currentStep = stepStatus === 'running' ? INSTALL_STEPS.find((step) => step.id === stepId) : null;
	return updateInstallStatus(agentDir, {
		steps: nextSteps,
		currentStepId: currentStep ? currentStep.id : existing.currentStepId,
		currentStep: currentStep ? currentStep.label : existing.currentStep
	});
}

async function runTrackedStep(agentDir, stepId, fn) {
	setStepStatus(agentDir, stepId, 'running');
	try {
		const result = await fn();
		setStepStatus(agentDir, stepId, 'completed', result && typeof result === 'object' ? { result } : {});
		return result;
	} catch (e) {
		setStepStatus(agentDir, stepId, 'failed', { error: e.message });
		updateInstallStatus(agentDir, {
			status: 'failed',
			configured: false,
			failedAt: new Date().toISOString(),
			error: e.message
		});
		throw e;
	}
}

function discoverHedgehogSkills(baseDir) {
	const skills = new Map();
	const stack = [baseDir];

	while (stack.length) {
		const current = stack.pop();
		let entries = [];
		try {
			entries = fs.readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			if (!entry.isDirectory() || entry.name === '__MACOSX' || entry.name.startsWith('.')) {
				continue;
			}

			const dir = path.join(current, entry.name);
			if (entry.name !== 'hedgehog-init' && fs.existsSync(path.join(dir, 'SKILL.md'))) {
				skills.set(entry.name, dir);
				continue;
			}
			stack.push(dir);
		}
	}

	return skills;
}

async function preparePluginInstall() {
	console.log('\n安装插件 hedgehog-plugin ...');

	const pluginsResult = oc('plugins list');
	const pluginAlreadyInstalled = Boolean(
		pluginsResult.ok &&
		pluginsResult.stdout &&
		(pluginsResult.stdout.includes('hedgehog_finance') || pluginsResult.stdout.includes('hedgehog-plugin'))
	);
	if (pluginAlreadyInstalled) {
		console.log('hedgehog-plugin 已安装，跳过安装步骤');
		return { success: true, status: 'already_installed', skipInstall: true };
	}

	const tmpZip = path.join(os.tmpdir(), 'hedgehog-plugin.zip');
	const tmpDir = path.join(os.tmpdir(), 'hedgehog-plugin-pkg');

	try {
		console.log('正在下载插件包并使用本地安装...');
		cleanup(tmpZip, tmpDir);

		await download('https://ciweiai.com/plugins/hedgehog-plugin.zip', tmpZip);
		unzip(tmpZip, tmpDir);

		const pluginDir = discoverPluginDir(tmpDir);
		if (!pluginDir) {
			throw new Error(`插件包中未找到插件目录:${tmpDir}`);
		}

		installPluginDependencies(pluginDir);
		cleanup(tmpZip);
		return { success: true, status: 'install_requested', pluginDir };
	} catch (e) {
		console.error(`插件准备失败:${e.message}`);
		cleanup(tmpZip, tmpDir);
		throw e;
	}
}

function installPreparedPlugin(pluginDir) {
	if (!pluginDir) return { success: true, status: 'already_installed' };

	const result = oc(`plugins install ${shellQuote(pluginDir)}`);
	if (result.ok) {
		console.log('本地插件包安装成功');
		return { success: true, status: 'installed' };
	}
	if (looksAlreadyInstalled(result)) {
		console.log('hedgehog-plugin 已安装，跳过安装步骤');
		return { success: true, status: 'already_installed' };
	}

	throw new Error(result.stderr || '本地安装失败');
}

async function initializeHedgehogAgentWorkspace() {
	console.log('初始化独立 agent 与 workspace ...');
	const agentDir = getHedgehogAgentDir();
	const soulPath = path.join(agentDir, 'SOUL.md');

	if (!fs.existsSync(agentDir)) {
		mkdirSync(agentDir, { recursive: true });
	}

	if (!hasHedgehogAgentConfig()) {
		const agentResult = oc(`agents add hedgehog-finance --workspace ${shellQuote(agentDir)}`);
		if (!agentResult.ok) {
			throw new Error(agentResult.stderr || 'agent 创建失败');
		}
		console.log('等待 Agent 模板初始化...');
		let retries = 10;
		while (retries > 0 && !fs.existsSync(soulPath)) {
			await new Promise(r => setTimeout(r, 500));
			retries--;
		}
		console.log('agent 创建完成');
	} else {
		console.log('hedgehog-finance agent 已存在，更新 workspace');
	}
	ensureHedgehogAgentWorkspaceConfig(agentDir);

	const maxSpawnDepthResult = oc('config set agents.defaults.subagents.maxSpawnDepth 2');
	const maxChildrenResult = oc('config set agents.defaults.subagents.maxChildrenPerAgent 10');
	if (!maxSpawnDepthResult.ok || !maxChildrenResult.ok) {
		console.warn('subagents 配置写入失败，可能是当前 OpenClaw 版本暂不支持该配置，继续后续安装');
	} else {
		console.log('subagents 配置完成');
	}

	console.log('写入 SOUL.md 身份设定 ...');
	let soulExisting = '';
	try { soulExisting = fs.readFileSync(soulPath, 'utf8'); } catch { }

	const soulConfigPath = path.join(__dirname, '..', 'references', 'soul_config.md');
	const soulIdentityFlag = '# hedgehog-app增加的设定';

	if (soulExisting.includes(soulIdentityFlag)) {
		console.log('SOUL.md 已包含身份设定，跳过追加');
	} else if (fs.existsSync(soulConfigPath)) {
		const soulContent = fs.readFileSync(soulConfigPath, 'utf8');
		if (!soulExisting.endsWith('\n\n')) {
			soulExisting += soulExisting.endsWith('\n') ? '\n' : '\n\n';
		}
		fs.writeFileSync(soulPath, soulExisting + soulContent, 'utf8');
		console.log('SOUL.md 写入完成');
	} else {
		console.warn('未找到 references/soul_config.md，跳过 SOUL.md 追加');
	}

	console.log('写入 AGENTS.md 调度逻辑 ...');
	const agentsPath = path.join(agentDir, 'AGENTS.md');
	const agentsConfigPath = path.join(__dirname, '..', 'references', 'agents_config.md');
	let agentsExisting = '';
	try { agentsExisting = fs.readFileSync(agentsPath, 'utf8'); } catch { }

	const agentsFlag = '# hedgehog-app增加的设定';

	if (agentsExisting.includes(agentsFlag)) {
		console.log('AGENTS.md 已包含调度逻辑，跳过追加');
	} else if (fs.existsSync(agentsConfigPath)) {
		const agentsContent = fs.readFileSync(agentsConfigPath, 'utf8');
		if (agentsExisting.trim() && !agentsExisting.endsWith('\n\n')) {
			agentsExisting += agentsExisting.endsWith('\n') ? '\n' : '\n\n';
		}
		fs.writeFileSync(agentsPath, agentsExisting + agentsContent, 'utf8');
		console.log('AGENTS.md 写入完成');
	} else {
		console.warn('未找到 references/agents_config.md，跳过 AGENTS.md 追加');
	}

	return agentDir;
}

async function configureHedgehogAppInfo() {
	console.log('\n配置刺猬投研用户信息 ...');

	oc('config set "channels.hedgehog_finance.enabled" true');
	oc(`config set "channels.hedgehog_finance.accountId" "'${accountId}'"`);
	oc(`config set "channels.hedgehog_finance.token" "${token}"`);
	bindHedgehogChannel();
	console.log('刺猬投研用户信息配置完成');
}

function setGatewayReloadMode(mode, { required = true } = {}) {
	const result = oc(`config set gateway.reload.mode ${mode}`);
	if (!result.ok) {
		const message = result.stderr || `gateway.reload.mode 设置为 ${mode} 失败`;
		if (required) throw new Error(message);
		console.warn(message);
		return { success: false, status: 'failed' };
	}
	console.log(`gateway.reload.mode 已设置为 ${mode}`);
	return { success: true, status: mode };
}

function restartGateway() {
	const result = oc('gateway restart');
	if (!result.ok) {
		throw new Error(result.stderr || 'Gateway 重启失败');
	}
	console.log('Gateway 重启指令已执行');
	return { success: true, status: 'requested' };
}

function copySkill(skillName, sourceDir, agentDir, installSource) {
	const skillsDir = path.join(agentDir, 'skills');
	const targetSkillDir = path.join(skillsDir, skillName);
	mkdirSync(skillsDir, { recursive: true });

	fs.cpSync(sourceDir, targetSkillDir, { recursive: true, force: true });
	console.log(`${skillName} 安装成功(${installSource})`);
}

async function writeHedgehogVersionFile(agentDir) {
	const versionInfo = await fetchJson(HEDGEHOG_VERSION_URL);
	const versionPath = path.join(agentDir, 'version.json');
	fs.writeFileSync(versionPath, `${JSON.stringify(filterStoredVersions(versionInfo), null, 2)}\n`, 'utf8');
	console.log(`hedgehog 版本信息已记录: ${versionPath}`);
}

async function installSkillsFromPackage(agentDir, url, zipName, dirName, sourceName) {
	const tmpRepoZip = path.join(os.tmpdir(), zipName);
	const tmpRepoDir = path.join(os.tmpdir(), dirName);
	const installed = new Set();
	let discoveredCount = 0;
	let failed = false;

	try {
		console.log(`正在从${sourceName}下载 hedgehog-skills 技能包...`);
		cleanup(tmpRepoZip, tmpRepoDir);

		await download(url, tmpRepoZip);
		unzip(tmpRepoZip, tmpRepoDir);

		for (const [skillName, sourceDir] of discoverHedgehogSkills(tmpRepoDir)) {
			discoveredCount++;
			copySkill(skillName, sourceDir, agentDir, sourceName);
			installed.add(skillName);
		}
	} catch (e) {
		failed = true;
		console.warn(`${sourceName}技能包安装失败:${e.message}`);
	} finally {
		cleanup(tmpRepoZip, tmpRepoDir);
	}

	return { installed, discoveredCount, failed };
}

async function installHedgehogSkills(agentDir) {
	console.log('\n安装 hedgehog skills ...');

	const result = await installSkillsFromPackage(
		agentDir,
		'https://ciweiai.com/skills/hedgehog-skills.zip',
		'hedgehog-skills.zip',
		'hedgehog-skills-pkg',
		'ciweiai'
	);

	if (result.installed.size > 0) {
		try {
			await writeHedgehogVersionFile(agentDir);
		} catch (e) {
			console.warn(`hedgehog 版本信息写入失败:${e.message}`);
		}
		return { success: true, status: 'installed' };
	}

	return { success: true, status: 'completed' };
}

function updateGroupChatsPolicy(agentDir) {
	const agentsPath = path.join(agentDir, 'AGENTS.md');
	const policy = 'You are prohibited from participating in group chats.';
	let content = '';
	try {
		content = fs.readFileSync(agentsPath, 'utf8');
	} catch {
		content = '';
	}

	const lines = content.split(/\r?\n/);
	const headingIndex = lines.findIndex((line) => /^ {0,3}#{1,6}\s+Group Chats\s*$/i.test(line));
	if (headingIndex < 0) {
		const nextContent = `${content.replace(/\s*$/, '')}\n\n## Group Chats\n${policy}\n`;
		fs.writeFileSync(agentsPath, nextContent, 'utf8');
		console.log('AGENTS.md Group Chats 配置已追加');
		return { success: true, status: 'appended' };
	}

	const headingMatch = lines[headingIndex].match(/^ {0,3}(#{1,6})\s+/);
	const headingLevel = headingMatch ? headingMatch[1].length : 2;
	let endIndex = lines.length;
	for (let i = headingIndex + 1; i < lines.length; i++) {
		const match = lines[i].match(/^ {0,3}(#{1,6})\s+/);
		if (match && match[1].length <= headingLevel) {
			endIndex = i;
			break;
		}
	}

	const nextLines = [
		...lines.slice(0, headingIndex + 1),
		policy,
		...lines.slice(endIndex)
	];
	fs.writeFileSync(agentsPath, `${nextLines.join('\n').replace(/\s*$/, '')}\n`, 'utf8');
	console.log('AGENTS.md Group Chats 配置已更新');
	return { success: true, status: 'updated' };
}

function writeConfigStatus(agentDir, installResults) {
	const statusPath = path.join(agentDir, STATUS_FILE_NAME);
	const status = {
		configured: true,
		status: 'completed',
		configuredAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		accountId,
		pluginInstalled: true,
		pluginStatus: installResults.plugin.status,
		workspaceInitialized: true,
		skillsInstalled: true,
		skillsStatus: installResults.skills.status,
		groupChatsPolicyUpdated: true,
		groupChatsPolicyStatus: installResults.groupChats.status,
		gatewayRestartRequested: true,
		gatewayRestartStatus: 'requested',
		skippedAsSuccess: true,
		version: getSkillVersion(),
		steps: installResults.steps
	};

	fs.writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
	console.log(`配置状态已记录: ${statusPath}`);
}

async function runInstall() {
	console.log(`操作系统:${os.type()} ${os.release()} (${process.platform})`);
	const agentDir = getHedgehogAgentDir();

	try {
		setGatewayReloadMode('off');
		updateInstallStatus(agentDir, {
			status: 'running',
			configured: false,
			processPid: process.pid,
			currentStepId: 'workspace',
			currentStep: INSTALL_STEPS[0].label,
			steps: createStatusSteps()
		});

		await runTrackedStep(agentDir, 'workspace', initializeHedgehogAgentWorkspace);
		setStepStatus(agentDir, 'plugin', 'running');
		const pluginResult = await preparePluginInstall();
		installPreparedPlugin(pluginResult.pluginDir);
		setStepStatus(agentDir, 'plugin', 'completed', { result: pluginResult });
		await runTrackedStep(agentDir, 'account', configureHedgehogAppInfo);
		const skillsResult = await runTrackedStep(agentDir, 'skills', () => installHedgehogSkills(agentDir));
		const groupChatsResult = updateGroupChatsPolicy(agentDir);
		updateInstallStatus(agentDir, {
			groupChatsPolicyUpdated: true,
			groupChatsPolicyStatus: groupChatsResult.status
		});
		const existing = readExistingStatus(agentDir) || {};
		writeConfigStatus(agentDir, {
			plugin: pluginResult,
			skills: skillsResult,
			groupChats: groupChatsResult,
			steps: existing.steps
		});

		console.log('\n接入安装配置完成');
		setGatewayReloadMode('hybrid');
		restartGateway();
	} catch (e) {
		updateInstallStatus(agentDir, {
			status: 'failed',
			configured: false,
			failedAt: new Date().toISOString(),
			error: e.message
		});
		setGatewayReloadMode('hybrid', { required: false });
		console.error(`\n接入安装配置失败:${e.message}`);
		process.exit(1);
	}
}

runInstall();
