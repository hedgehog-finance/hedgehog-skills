#!/usr/bin/env node
/**
 * install.js - 安装 hedgehog-plugin 插件并完成全套配置
 *
 * 用法:
 * node install.js <token> <accountId>
 *
 * 参数:
 * token      用户的 hedgehog-app token
 * accountId  用户的账号 ID(始终以字符串写入配置)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { createWriteStream, mkdirSync, rmSync } = fs;

// ── 参数校验 ──────────────────────────────────────────────────────────────────
const [token, accountId] = process.argv.slice(2);

if (!token || !accountId) {
	console.error('❌ 用法: node install.js <token> <accountId>');
	process.exit(1);
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function oc(args) {
	try {
		const stdout = execSync(`openclaw ${args}`, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
		return { ok: true, stdout: stdout.trim() };
	} catch (e) {
		return { ok: false, stdout: '', stderr: (e.stderr || '').trim() };
	}
}

function download(url, dest) {
	return new Promise((resolve, reject) => {
		const file = createWriteStream(dest);
		https.get(url, (res) => {
			if (res.statusCode !== 200) {
				return reject(new Error(`HTTP ${res.statusCode}`));
			}
			res.pipe(file);
			file.on('finish', () => file.close(resolve));
		}).on('error', (err) => {
			fs.unlink(dest, () => { });
			reject(err);
		});
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

// ── 主流程 ────────────────────────────────────────────────────────────────────
(async () => {

	console.log(`🔍 操作系统:${os.type()} ${os.release()} (${process.platform})`);

	// ── 1. 安装插件 ──────────────────────────────────────────────────────────────
	console.log('\n📦 [1/7] 安装插件 @hedgehog-finance/hedgehog-plugin ...');

	const npmResult = oc('plugins install @hedgehog-finance/hedgehog-plugin');
	if (npmResult.ok) {
		console.log('✅ npm 安装成功');
	} else {
		console.warn('⚠️  npm 安装失败,切换为备用地址下载...');

		const tmpZip = path.join(os.tmpdir(), 'hedgehog-plugin.zip');
		const tmpDir = path.join(os.tmpdir(), 'hedgehog-plugin-pkg');

		try {
			await download('https://ciweiai.com/hedgehog-plugin.zip', tmpZip);
			unzip(tmpZip, tmpDir);
			const fallbackResult = oc(`plugins install "${tmpDir}"`);
			if (!fallbackResult.ok) throw new Error('本地安装失败');
			console.log('✅ 备用包安装成功');
		} catch (e) {
			console.error(`❌ 插件安装失败:${e.message}`);
			process.exit(1);
		} finally {
			cleanup(tmpZip, tmpDir);
		}
	}

	// ── 2. 写入 channel 配置 ─────────────────────────────────────────────────────
	console.log('\n⚙️  [2/7] 配置 channel ...');

	oc('config set "channels.hedgehog_finance.enabled" true');
	oc(`config set "channels.hedgehog_finance.accountId" "'${accountId}'"`);
	oc(`config set "channels.hedgehog_finance.token" "${token}"`);

	console.log('✅ channel 配置完成');

	// ── 3. 创建独立 agent 与 workspace ───────────────────────────────────────────
	console.log('\n🏠 [3/7] 创建独立 agent 与 workspace ...');

	const wsResult = oc('config get agents.defaults.workspace');
	if (!wsResult.ok || !wsResult.stdout) {
		console.error('❌ 无法读取 agents.defaults.workspace,请检查 openclaw 配置');
		process.exit(1);
	}
	const ocRoot = path.dirname(wsResult.stdout);
	const agentDir = path.join(ocRoot, 'hedgehog_finance');
	const soulPath = path.join(agentDir, 'SOUL.md');

	if (!fs.existsSync(agentDir)) {
		mkdirSync(agentDir, { recursive: true });
		oc(`agents add hedgehog_finance --workspace "${agentDir}" --bind "hedgehog_finance:*"`);

		// 轮询等待 OpenClaw 完成默认模板文件的生成
		console.log('⏳ 等待 Agent 模板初始化...');
		let retries = 10;
		while (retries > 0 && !fs.existsSync(soulPath)) {
			await new Promise(r => setTimeout(r, 500));
			retries--;
		}
	} else {
		console.log('⏭️  Agent 目录已存在，跳过创建');
	}

	console.log('✅ agent 创建完成');

	// ── 4. 追加 SOUL.md 身份设定 ──────────────────────────────────────────────────
	console.log('\n📝 [4/7] 追加 SOUL.md 身份设定 ...');

	let soulExisting = '';
	try { soulExisting = fs.readFileSync(soulPath, 'utf8'); } catch { }

	const soulConfigPath = path.join(__dirname, '..', 'references', 'soul_config.md');
	const soulIdentityFlag = '# hedgehog-app增加的设定';

	if (soulExisting.includes(soulIdentityFlag)) {
		console.log('⏭️  SOUL.md 已包含身份设定，跳过追加');
	} else if (fs.existsSync(soulConfigPath)) {
		const soulContent = fs.readFileSync(soulConfigPath, 'utf8');

		// 确保追加前，原有内容结尾有换行，防止粘连
		if (!soulExisting.endsWith('\n\n')) {
			soulExisting += soulExisting.endsWith('\n') ? '\n' : '\n\n';
		}

		fs.writeFileSync(soulPath, soulExisting + soulContent, 'utf8');
		console.log('✅ SOUL.md 写入完成');
	} else {
		console.warn('⚠️ 未找到 references/soul_config.md，跳过 SOUL.md 追加');
	}

	// ── 5. 写入 AGENTS.md 调度逻辑 ────────────────────────────────────────
	console.log('\n📝 [5/7] 写入 AGENTS.md 调度逻辑 ...');

	const agentsPath = path.join(agentDir, 'AGENTS.md');
	const agentsConfigPath = path.join(__dirname, '..', 'references', 'agents_config.md');
	let agentsExisting = '';
	try { agentsExisting = fs.readFileSync(agentsPath, 'utf8'); } catch { }

	const agentsFlag = '# hedgehog-app增加的设定';

	if (agentsExisting.includes(agentsFlag)) {
		console.log('⏭️  AGENTS.md 已包含调度逻辑，跳过追加');
	} else if (fs.existsSync(agentsConfigPath)) {
		const agentsContent = fs.readFileSync(agentsConfigPath, 'utf8');
		// 确保追加前，原有内容结尾有换行，防止粘连
		if (agentsExisting.trim() && !agentsExisting.endsWith('\n\n')) {
			agentsExisting += agentsExisting.endsWith('\n') ? '\n' : '\n\n';
		}
		fs.writeFileSync(agentsPath, agentsExisting + agentsContent, 'utf8');
		console.log('✅ AGENTS.md 写入完成');
	} else {
		console.warn('⚠️ 未找到 references/agents_config.md，跳过 AGENTS.md 追加');
	}
	// ── 6. 安装 hedgehog-skills-guide skill ─────────────────────────────────────────
	console.log('\n📦 [6/7] 安装 hedgehog-skills-guide skill ...');

	const targetSkillDir = path.join(agentDir, 'skills', 'hedgehog-skills-guide');
	mkdirSync(path.join(agentDir, 'skills'), { recursive: true });

	let githubSuccess = false;
	const tmpSkillZip = path.join(os.tmpdir(), 'hedgehog-skills-guide.zip');
	const tmpSkillDir = path.join(os.tmpdir(), 'hedgehog-skills-guide-pkg');

	try {
		console.log('🔄 正在尝试从 GitHub 下载技能包...');
		cleanup(tmpSkillZip, tmpSkillDir);

		await download('https://github.com/hedgehog-finance/hedgehog-skills/archive/refs/heads/main.zip', tmpSkillZip);
		unzip(tmpSkillZip, tmpSkillDir);

		const githubSkillPath = path.join(tmpSkillDir, 'hedgehog-skills-main', 'hedgehog-skills-guide');

		if (fs.existsSync(path.join(githubSkillPath, 'SKILL.md'))) {
			fs.cpSync(githubSkillPath, targetSkillDir, { recursive: true, force: true });
			console.log('✅ hedgehog-skills-guide 安装成功(GitHub)');
			githubSuccess = true;
		} else {
			throw new Error('解压后未找到 hedgehog-skills-guide 目录');
		}
	} catch (e) {
		console.warn(`⚠️ GitHub 下载失败 (${e.message}),尝试备用 ZIP 地址...`);
	} finally {
		cleanup(tmpSkillZip, tmpSkillDir);
	}

	if (!githubSuccess) {
		try {
			console.log('🔄 正在从备用地址下载技能包...');
			cleanup(tmpSkillZip, tmpSkillDir);

			await download('https://ciweiai.com/hedgehog-skills-guide.zip', tmpSkillZip);
			unzip(tmpSkillZip, tmpSkillDir);

			let realSkillDir = tmpSkillDir;
			const contents = fs.readdirSync(tmpSkillDir).filter(n => n !== '__MACOSX' && !n.startsWith('.'));
			if (contents.length === 1 && fs.statSync(path.join(tmpSkillDir, contents[0])).isDirectory()) {
				realSkillDir = path.join(tmpSkillDir, contents[0]);
			}
			if (!fs.existsSync(path.join(realSkillDir, 'SKILL.md'))) {
				throw new Error('下载的备用包中未找到 SKILL.md');
			}

			fs.cpSync(realSkillDir, targetSkillDir, { recursive: true, force: true });
			console.log('✅ hedgehog-skills-guide 安装成功(备用地址)');
		} catch (e) {
			console.warn(`⚠️ hedgehog-skills-guide 安装失败:${e.message},请事后手动安装。`);
		} finally {
			cleanup(tmpSkillZip, tmpSkillDir);
		}
	}

	// ── 7. 重启 Gateway ───────────────────────────────────────────────────────────
	console.log('\n🔄 [7/7] 重启 Gateway ...');
	oc('gateway restart');

	console.log('\n🎉 全部完成!稍后重新连接即可开始使用 hedgehog-app。');

})();