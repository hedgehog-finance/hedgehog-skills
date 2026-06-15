#!/usr/bin/env node
/**
 * get-hedgehog-config-status.js - 查询刺猬投研AI上次配置结果
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function oc(args) {
	try {
		const stdout = execSync(`openclaw ${args}`, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
		return { ok: true, stdout: stdout.trim() };
	} catch (e) {
		return { ok: false, stdout: '', stderr: (e.stderr || '').trim() };
	}
}

function getHedgehogAgentDir() {
	const wsResult = oc('config get agents.defaults.workspace');
	if (!wsResult.ok || !wsResult.stdout) {
		return null;
	}
	return path.join(path.dirname(wsResult.stdout), 'hedgehog-workspace');
}

const agentDir = getHedgehogAgentDir();
if (!agentDir) {
	console.log('未找到配置结果');
	process.exit(0);
}

const statusPath = path.join(agentDir, '.hedgehog-config-status.json');
if (!fs.existsSync(statusPath)) {
	console.log('未找到配置结果');
	process.exit(0);
}

try {
	const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
	console.log(status.configured ? '配置成功' : '配置未完成');
} catch (e) {
	console.log('配置状态异常');
}
