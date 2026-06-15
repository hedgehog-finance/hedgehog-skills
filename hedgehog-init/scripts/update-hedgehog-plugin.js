#!/usr/bin/env node
/**
 * update-hedgehog-plugin.js - 更新 hedgehog-plugin 插件
 */

'use strict';

const { execSync } = require('child_process');
const os = require('os');

function oc(args) {
	try {
		const stdout = execSync(`openclaw ${args}`, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
		return { ok: true, stdout: stdout.trim() };
	} catch (e) {
		return { ok: false, stdout: '', stderr: (e.stderr || '').trim() };
	}
}

(async () => {
	console.log(`操作系统:${os.type()} ${os.release()} (${process.platform})`);
	console.log('\n更新插件 hedgehog-plugin ...');

	try {
		const result = oc('plugins update @hedgehog-finance/hedgehog-plugin');
		if (result.ok) {
			console.log('hedgehog-plugin 更新完成');
			return;
		}

		console.error(`hedgehog-plugin 更新失败:${result.stderr || 'plugins update 执行失败'}`);
		process.exit(1);
	} catch (e) {
		console.error(`hedgehog-plugin 更新失败:${e.message}`);
		process.exit(1);
	}
})();
