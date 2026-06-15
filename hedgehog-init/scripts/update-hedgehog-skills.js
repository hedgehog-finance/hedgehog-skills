#!/usr/bin/env node
/**
 * update-hedgehog-skills.js - 更新 hedgehog-workspace 中的 hedgehog skills
 *
 * 用法:
 * node update-hedgehog-skills.js
 *
 * 参数:
 * 无
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { createWriteStream, mkdirSync, rmSync } = fs;
const HEDGEHOG_VERSION_URL = 'https://ciweiai.com/version.json';

function oc(args) {
	try {
		const stdout = execSync(`openclaw ${args}`, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
		return { ok: true, stdout: stdout.trim() };
	} catch (e) {
		return { ok: false, stdout: '', stderr: (e.stderr || '').trim() };
	}
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

function getSkillVersion(skillDir) {
	try {
		const content = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
		const match = content.match(/^version:\s*([^\s]+)/mi);
		return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
	} catch {
		return null;
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

function copySkill(skillName, sourceDir, agentDir, reason) {
	const skillsDir = path.join(agentDir, 'skills');
	const targetSkillDir = path.join(skillsDir, skillName);
	mkdirSync(skillsDir, { recursive: true });

	fs.cpSync(sourceDir, targetSkillDir, { recursive: true, force: true });
	console.log(`${skillName} 已更新 (${reason})`);
}

function syncSkills(agentDir, skillSources, sourceName) {
	let updatedCount = 0;
	const updatedSkills = [];

	for (const [skillName, sourceDir] of skillSources) {
		const targetDir = path.join(agentDir, 'skills', skillName);
		const remoteVersion = getSkillVersion(sourceDir);
		const localVersion = getSkillVersion(targetDir);

		const fromVersion = localVersion ? `v${localVersion}` : '未安装';
		const toVersion = remoteVersion ? `v${remoteVersion}` : 'unknown';

		copySkill(skillName, sourceDir, agentDir, `${sourceName}: ${fromVersion} -> ${toVersion} (强制更新)`);
		updatedCount++;
		updatedSkills.push(skillName);
	}

	return { updatedCount, updatedSkills };
}

async function updateSkillVersions(agentDir, skillNames) {
	const remoteVersions = await fetchJson(HEDGEHOG_VERSION_URL);
	const versionPath = path.join(agentDir, 'version.json');
	let localVersions = {};
	try {
		localVersions = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
	} catch {
		localVersions = {};
	}

	let writtenCount = 0;
	for (const skillName of skillNames) {
		if (!remoteVersions[skillName]) {
			console.warn(`远端 version.json 未包含 ${skillName} 版本，跳过`);
			continue;
		}
		localVersions[skillName] = remoteVersions[skillName];
		writtenCount++;
	}

	fs.writeFileSync(versionPath, `${JSON.stringify(localVersions, null, 2)}\n`, 'utf8');
	console.log(`hedgehog skill 版本信息已更新: ${writtenCount} 个`);
}

async function updateSkillsFromPackage(agentDir, url, zipName, dirName, sourceName) {
	const tmpRepoZip = path.join(os.tmpdir(), zipName);
	const tmpRepoDir = path.join(os.tmpdir(), dirName);

	try {
		console.log(`正在从${sourceName}下载 hedgehog-skills 技能包...`);
		cleanup(tmpRepoZip, tmpRepoDir);

		await download(url, tmpRepoZip);
		unzip(tmpRepoZip, tmpRepoDir);

		const skillSources = discoverHedgehogSkills(tmpRepoDir);
		if (!skillSources.size) {
			throw new Error('技能包中未找到可更新的 hedgehog skills');
		}

		return { ok: true, ...syncSkills(agentDir, skillSources, sourceName) };
	} catch (e) {
		console.warn(`${sourceName}更新失败:${e.message}`);
		return { ok: false, updatedCount: 0, updatedSkills: [] };
	} finally {
		cleanup(tmpRepoZip, tmpRepoDir);
	}
}

(async () => {
	console.log(`操作系统:${os.type()} ${os.release()} (${process.platform})`);

	console.log('\n[1/3] 获取 hedgehog-workspace 路径 ...');
	const wsResult = oc('config get agents.defaults.workspace');
	if (!wsResult.ok || !wsResult.stdout) {
		console.error('无法读取 agents.defaults.workspace,请检查 openclaw 配置');
		process.exit(1);
	}

	const agentDir = path.join(path.dirname(wsResult.stdout), 'hedgehog-workspace');
	if (!fs.existsSync(agentDir)) {
		console.error(`目标工作空间目录不存在: ${agentDir}`);
		process.exit(1);
	}
	console.log(`工作空间路径确认完成: ${agentDir}`);

	console.log('\n[2/3] 检查并更新 hedgehog skills ...');
	const result = await updateSkillsFromPackage(
		agentDir,
		'https://ciweiai.com/skills/hedgehog-skills.zip',
		'hedgehog-skills-update.zip',
		'hedgehog-skills-update-pkg',
		'备用地址'
	);

	if (!result.ok) {
		console.error('hedgehog skills 更新失败，请稍后重试或手动安装。');
		process.exit(1);
	}

	if (result.updatedCount > 0) {
		try {
			await updateSkillVersions(agentDir, result.updatedSkills);
		} catch (e) {
			console.warn(`hedgehog skill 版本信息写入失败:${e.message}`);
		}
		console.log(`\nhedgehog skills 更新完成，共更新 ${result.updatedCount} 个技能。稍后重新连接即可生效。`);
	} else {
		console.log('\n所有 hedgehog skills 均已是最新版本，无需更新。');
	}
})();
