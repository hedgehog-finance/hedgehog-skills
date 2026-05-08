#!/usr/bin/env node
/**
 * update-sys-prompt.js - 更新 hedgehog-workspace 工作空间的系统提示词 (SOUL.md / AGENTS.md)
 *
 * 用法:
 * node update-sys-prompt.js
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

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function oc(args) {
    try {
        const stdout = execSync(`openclaw ${args}`, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
        return { ok: true, stdout: stdout.trim() };
    } catch (e) {
        return { ok: false, stdout: '', stderr: (e.stderr || '').trim() };
    }
}

function getVersion(content) {
    const match = content.match(/version:\s*([0-9.]+)/i);
    return match ? match[1] : null;
}

const http = require('http');

function download(url, dest, redirectCount = 0) {
    if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));

    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        client.get(url, (res) => {
            // 处理 HTTP 重定向
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                const nextUrl = new URL(res.headers.location, url).href;
                return download(nextUrl, dest, redirectCount + 1).then(resolve).catch(reject);
            }

            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            const file = createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
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

    console.log(`操作系统:${os.type()} ${os.release()} (${process.platform})`);

    // ── 0. 下载最新的配置模板 ──────────────────────────────────────────────────────
    console.log('\n[0/3] 正在从 GitHub 获取最新的配置模板 ...');
    
    const tmpZip = path.join(os.tmpdir(), 'hedgehog-skills-latest.zip');
    const tmpDir = path.join(os.tmpdir(), 'hedgehog-skills-latest-pkg');
    
    // 远程仓库中的配置路径
    let remoteRefDir = '';

    try {
        await download('https://github.com/hedgehog-finance/hedgehog-skills/archive/refs/heads/main.zip', tmpZip);
        unzip(tmpZip, tmpDir);
        remoteRefDir = path.join(tmpDir, 'hedgehog-skills-main', 'hedgehog-init', 'references');
        
        if (!fs.existsSync(remoteRefDir)) {
            throw new Error('未能在下载的包中找到 references 目录');
        }

        console.log('已成功下载云端最新配置模板');
        
        // 尝试更新 Skill 自身的本地 references (仅作为静默备份，失败不影响流程)
        try {
            const localRefDir = path.join(__dirname, '..', 'references');
            if (fs.existsSync(localRefDir)) {
                const files = fs.readdirSync(remoteRefDir);
                files.forEach(file => {
                    fs.copyFileSync(path.join(remoteRefDir, file), path.join(localRefDir, file));
                });
            }
        } catch (e) {
            // 静默处理，不干扰用户
        }
    } catch (e) {
        console.error(`无法获取最新配置: ${e.message}`);
        cleanup(tmpZip, tmpDir);
        process.exit(1);
    }

    // ── 1. 获取目标工作空间路径 ────────────────────────────────────────────────────
    console.log('\n[1/3] 正在获取目标工作空间路径 ...');

    const wsResult = oc('config get agents.defaults.workspace');
    if (!wsResult.ok || !wsResult.stdout) {
        console.error('无法读取 agents.defaults.workspace,请检查 openclaw 配置');
        cleanup(tmpZip, tmpDir);
        process.exit(1);
    }
    const ocRoot = path.dirname(wsResult.stdout);
    const agentDir = path.join(ocRoot, 'hedgehog-workspace');

    if (!fs.existsSync(agentDir)) {
        console.error(`目标工作空间目录不存在: ${agentDir}`);
        cleanup(tmpZip, tmpDir);
        process.exit(1);
    }

    console.log(`工作空间路径确认完成: ${agentDir}`);

    // ── 2. 执行版本检查与更新 ──────────────────────────────────────────────────────
    console.log('\n[2/3] 正在检查系统提示词版本 ...');

    const filesToUpdate = [
        {
            name: 'SOUL.md',
            target: path.join(agentDir, 'SOUL.md'),
            ref: path.join(remoteRefDir, 'soul_config.md')
        },
        {
            name: 'AGENTS.md',
            target: path.join(agentDir, 'AGENTS.md'),
            ref: path.join(remoteRefDir, 'agents_config.md')
        }
    ];

    let updatedCount = 0;
    const flag = '# hedgehog-app增加的设定';

    filesToUpdate.forEach(file => {
        if (!fs.existsSync(file.ref)) {
            console.warn(`未找到参考模板文件: ${file.name}`);
            return;
        }

        if (!fs.existsSync(file.target)) {
            console.warn(`工作空间中未找到目标文件，跳过: ${file.name}`);
            return;
        }

        const refContent = fs.readFileSync(file.ref, 'utf8');
        const targetContent = fs.readFileSync(file.target, 'utf8');
        // 使用正则匹配标记，允许 app 和 增加 之间有零个或多个空格，且不区分大小写
        const startFlagRegex = /#\s*hedgehog-app\s*增加的设定/i;
        const endFlag = 'End: hedgehog-app增加的设定';
        const startFlag = '# hedgehog-app增加的设定'; // 标准标记

        const refVersion = getVersion(refContent);

        // 先尝试用正则查找位置
        const match = targetContent.match(startFlagRegex);

        if (!match) {
            console.log(`[${file.name}] 工作空间文件未包含标记，执行初始化追加...`);
            let newContent = targetContent;
            if (!newContent.endsWith('\n\n')) {
                newContent += newContent.endsWith('\n') ? '\n' : '\n\n';
            }
            fs.writeFileSync(file.target, newContent + refContent, 'utf8');
            updatedCount++;
        } else {
            // 提取标记之前的内容
            const preContent = targetContent.substring(0, match.index);
            
            // 提取标记之后的内容
            const restContent = targetContent.substring(match.index + match[0].length);
            const endIdx = restContent.indexOf(endFlag);
            
            let postContent = '';
            if (endIdx !== -1) {
                // 提取结束标记之后的所有内容
                const afterEnd = restContent.substring(endIdx + endFlag.length);
                
                // 寻找 End 标记后的第一个 --- 分隔符
                const separator = '---';
                const sepIdx = afterEnd.indexOf(separator);
                if (sepIdx !== -1) {
                    // 提取分隔符之后的所有内容，并保留开头的换行
                    postContent = afterEnd.substring(sepIdx + separator.length);
                }
            }

            const currentVersion = getVersion(restContent);
            if (refVersion && currentVersion && refVersion === currentVersion) {
                console.log(`[${file.name}] 已是最新版本 (v${currentVersion})`);
            } else {
                console.log(`[${file.name}] 发现更新 (v${currentVersion} -> v${refVersion})，正在同步...`);
                // 组装：前缀 + 新模板 + 后缀（如果后缀有内容，确保它另起两行以保持整洁）
                const trimmedRef = refContent.trim();
                const finalContent = postContent.trim() 
                    ? trimmedRef + '\n\n' + postContent.trim() 
                    : trimmedRef;
                
                fs.writeFileSync(file.target, preContent + finalContent + '\n', 'utf8');
                updatedCount++;
            }
        }
    });

    // ── 3. 善后处理 ─────────────────────────────────────────────────────────────
    if (updatedCount > 0) {
        console.log('\n[3/3] 正在重启 Gateway 以应用更改 ...');
        oc('gateway restart');
        console.log('\n系统提示词已成功更新至最新版本！');
    } else {
        console.log('\n所有文件均已是最新状态，流程结束');
    }

    cleanup(tmpZip, tmpDir);

})();
