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

function formatList(items) {
	if (!items.length) return '无';
	return items.map((item) => `- ${item}`).join('\n');
}

function inferLegacySteps(status) {
	const steps = [];
	if (status.workspaceInitialized) {
		steps.push({ label: '初始化刺猬投研插件', status: 'completed' });
	}
	if (status.skillsInstalled) {
		steps.push({ label: '安装hedgehog skills', status: 'completed' });
	}
	if (status.pluginInstalled) {
		steps.push({ label: '安装刺猬投研插件', status: 'completed' });
	}
	if (status.accountId) {
		steps.push({ label: '配置刺猬投研账号', status: 'completed' });
	}
	return steps;
}

function getSteps(status) {
	if (Array.isArray(status.steps) && status.steps.length) {
		return status.steps;
	}
	return inferLegacySteps(status);
}

function isConfigured(status) {
	if (status.configured || status.status === 'completed') {
		return true;
	}
	return false;
}

function describeStatus(status) {
	const steps = getSteps(status);
	if (isConfigured(status)) {
		return '刺猬投研AI集成龙虾成功。';
	}

	const completed = steps
		.filter((step) => step.status === 'completed')
		.map((step) => step.label || step.id);
	const running = steps
		.filter((step) => step.status === 'running')
		.map((step) => step.label || step.id);
	const pending = steps
		.filter((step) => step.status === 'pending')
		.map((step) => step.label || step.id);
	const lines = [];
	lines.push('刺猬投研AI集成龙虾正在配置中。');

	lines.push('');
	lines.push(`已完成事项：\n${formatList(completed)}`);
	lines.push('');
	lines.push(`当前执行事项：\n${formatList(running.length ? running : (status.currentStep ? [status.currentStep] : []))}`);
	lines.push('');
	lines.push(`待处理事项：\n${formatList(pending)}`);

	return lines.join('\n');
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
	console.log(describeStatus(status));
} catch (e) {
	console.log('刺猬投研AI集成龙虾正在配置中。');
}
