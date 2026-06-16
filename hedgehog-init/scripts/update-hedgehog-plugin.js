#!/usr/bin/env node
/**
 * update-hedgehog-plugin.js - 更新 hedgehog-plugin 插件
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const { createWriteStream, mkdirSync, rmSync } = fs;

const HEDGEHOG_PLUGIN_URL = 'https://ciweiai.com/plugins/hedgehog-plugin.zip';

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

function normalizePluginList(parsed) {
	if (Array.isArray(parsed)) return parsed;
	if (!parsed || typeof parsed !== 'object') return [];

	for (const key of ['plugins', 'items', 'data', 'list']) {
		if (Array.isArray(parsed[key])) return parsed[key];
	}

	return Object.entries(parsed)
		.filter(([, value]) => value && typeof value === 'object')
		.map(([key, value]) => ({ id: key, ...value }));
}

function pluginIdentity(plugin) {
	return [
		plugin.id,
		plugin.name,
		plugin.package,
		plugin.packageName,
		plugin.displayName,
		plugin.channel,
		plugin.manifest && plugin.manifest.id,
		plugin.manifest && plugin.manifest.name
	].filter(Boolean).join('\n').toLowerCase();
}

function findHedgehogPlugin(plugins) {
	return plugins.find((plugin) => {
		const identity = pluginIdentity(plugin);
		return identity.includes('@hedgehog-finance/hedgehog-plugin') ||
			identity.includes('hedgehog-plugin') ||
			identity.includes('hedgehog_finance');
	});
}

function getPluginDir(plugin) {
	const candidates = [
		plugin.dir,
		plugin.path,
		plugin.root,
		plugin.location,
		plugin.directory,
		plugin.pluginDir,
		plugin.installDir,
		plugin.installedPath,
		plugin.manifestPath && path.dirname(plugin.manifestPath)
	].filter(Boolean);

	return candidates.find((candidate) => typeof candidate === 'string' && path.isAbsolute(candidate)) || null;
}

function getInstalledPluginDir() {
	const list = execSync('openclaw plugins list --json', { encoding: 'utf8' });
	let parsed;
	try {
		parsed = JSON.parse(list);
	} catch (e) {
		throw new Error(`openclaw plugins list --json 输出不是有效 JSON:${e.message}`);
	}

	const plugin = findHedgehogPlugin(normalizePluginList(parsed));
	if (!plugin) {
		throw new Error('未找到已安装的 hedgehog-plugin');
	}

	const pluginDir = getPluginDir(plugin);
	if (!pluginDir) {
		throw new Error('未能从 openclaw plugins list --json 获取 hedgehog-plugin 安装目录');
	}
	if (!fs.existsSync(pluginDir) || !fs.statSync(pluginDir).isDirectory()) {
		throw new Error(`hedgehog-plugin 安装目录不存在:${pluginDir}`);
	}
	if (!fs.existsSync(path.join(pluginDir, 'openclaw.plugin.json')) && !fs.existsSync(path.join(pluginDir, 'package.json'))) {
		throw new Error(`目标目录不像插件目录，拒绝替换:${pluginDir}`);
	}

	return pluginDir;
}

function replaceDirectoryContents(sourceDir, targetDir) {
	const targetEntries = fs.readdirSync(targetDir);
	for (const entry of targetEntries) {
		rmSync(path.join(targetDir, entry), { recursive: true, force: true });
	}

	const sourceEntries = fs.readdirSync(sourceDir, { withFileTypes: true });
	for (const entry of sourceEntries) {
		const source = path.join(sourceDir, entry.name);
		const target = path.join(targetDir, entry.name);
		fs.cpSync(source, target, { recursive: true, force: true });
	}
}

function npmInstall(pluginDir) {
	if (!fs.existsSync(path.join(pluginDir, 'package.json'))) {
		console.log('插件目录未包含 package.json，跳过 npm install');
		return;
	}

	const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
	console.log('执行 npm install ...');
	execSync(`${npmCmd} install`, { cwd: pluginDir, stdio: 'inherit' });
}

(async () => {
	console.log(`操作系统:${os.type()} ${os.release()} (${process.platform})`);
	console.log('\n更新插件 hedgehog-plugin ...');

	const tmpZip = path.join(os.tmpdir(), 'hedgehog-plugin.zip');
	const tmpDir = path.join(os.tmpdir(), 'hedgehog-plugin-pkg');

	try {
		const installedPluginDir = getInstalledPluginDir();
		console.log(`已安装目录:${installedPluginDir}`);

		console.log(`正在下载插件包:${HEDGEHOG_PLUGIN_URL}`);
		cleanup(tmpZip, tmpDir);
		await download(HEDGEHOG_PLUGIN_URL, tmpZip);
		unzip(tmpZip, tmpDir);

		const packagePluginDir = discoverPluginDir(tmpDir);
		if (!packagePluginDir) {
			throw new Error(`插件包中未找到插件目录:${tmpDir}`);
		}

		console.log('替换已安装插件目录 ...');
		replaceDirectoryContents(packagePluginDir, installedPluginDir);
		npmInstall(installedPluginDir);

		cleanup(tmpZip, tmpDir);
		console.log('hedgehog-plugin 更新完成');
	} catch (e) {
		cleanup(tmpZip, tmpDir);
		console.error(`hedgehog-plugin 更新失败:${e.message}`);
		process.exit(1);
	}
})();
