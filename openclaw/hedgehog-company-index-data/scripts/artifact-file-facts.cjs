// GENERATED from Hedgehog contracts/artifact-file-facts.ts.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARTIFACT_HASH_LIMIT_BYTES = void 0;
exports.fingerprintFile = fingerprintFile;
exports.sameFileFingerprint = sameFileFingerprint;
exports.isFinalOutputFile = isFinalOutputFile;
exports.sanitizeFileOrigin = sanitizeFileOrigin;
exports.artifactStatePath = artifactStatePath;
exports.writeFileOrigin = writeFileOrigin;
exports.readFileOrigin = readFileOrigin;
exports.assertArtifactOwner = assertArtifactOwner;
exports.assertArtifactOutput = assertArtifactOutput;
// Shared file facts used by the existing Manifest implementations. No directory discovery.
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
exports.ARTIFACT_HASH_LIMIT_BYTES = 50 * 1024 * 1024;
function fingerprintFile(path) {
    const before = (0, node_fs_1.lstatSync)(path);
    if (!before.isFile() || before.isSymbolicLink())
        throw new Error(`Not a regular artifact: ${path}`);
    const sha256 = before.size <= exports.ARTIFACT_HASH_LIMIT_BYTES
        ? (0, node_crypto_1.createHash)('sha256').update((0, node_fs_1.readFileSync)(path)).digest('hex') : undefined;
    const after = (0, node_fs_1.lstatSync)(path);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
        || before.dev !== after.dev || before.ino !== after.ino || !after.isFile()) {
        throw new Error(`Artifact changed while reading: ${path}`);
    }
    return { size: after.size, modified_at: after.mtime.toISOString(), ctimeMs: after.ctimeMs,
        dev: after.dev, ino: after.ino, ...(sha256 ? { sha256 } : {}) };
}
function sameFileFingerprint(before, after) {
    return !!before && before.size === after.size && before.modified_at === after.modified_at
        && before.ctimeMs === after.ctimeMs && before.dev === after.dev && before.ino === after.ino
        && before.sha256 === after.sha256;
}
function isFinalOutputFile(path) {
    return /^final-output-.+\.[^.]+$/.test(path.replace(/\\/g, '/').split('/').pop() ?? '');
}
function sanitizeFileOrigin(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return undefined;
    const input = value;
    if (!['web_fetch', 'web_search', 'api', 'upload', 'database', 'other'].includes(String(input.type)))
        return undefined;
    const origin = { type: input.type };
    for (const [key, limit] of [['tool', 100], ['title', 500], ['content_type', 200], ['data_range', 500]]) {
        if (typeof input[key] === 'string')
            origin[key] = input[key].slice(0, limit);
        if (key === 'title' && /^https?:\/\//.test(origin.title ?? '')) {
            try {
                const url = new URL(origin.title);
                origin.title = `${url.protocol}//${url.host}${url.pathname}`;
            }
            catch {
                delete origin.title;
            }
        }
    }
    if (typeof input.fetched_at === 'string' && Number.isFinite(Date.parse(input.fetched_at))) {
        origin.fetched_at = new Date(input.fetched_at).toISOString();
    }
    if (typeof input.locator === 'string') {
        try {
            const url = new URL(input.locator);
            if (url.protocol === 'http:' || url.protocol === 'https:')
                origin.locator = `${url.protocol}//${url.host}${url.pathname}`;
        }
        catch { /* Never retain non-URL query payloads. */ }
    }
    return origin;
}
function readJson(path) {
    try {
        return JSON.parse((0, node_fs_1.readFileSync)(path, 'utf8'));
    }
    catch {
        return undefined;
    }
}
/** Reject links in internal state as well as escapes through the target file. */
function artifactStatePath(root, ...parts) {
    const canonicalRoot = (0, node_fs_1.realpathSync)(root);
    let path = canonicalRoot;
    for (const part of ['.hedgehog', ...parts]) {
        if (!part || part === '.' || part === '..' || /[\\/]/.test(part))
            throw new Error('Invalid artifact state path');
        path = (0, node_path_1.join)(path, part);
        if ((0, node_fs_1.existsSync)(path) && (0, node_fs_1.lstatSync)(path).isSymbolicLink())
            throw new Error('Artifact state must not contain symbolic links');
    }
    return path;
}
function originNoteName(path, sha256) {
    return `${(0, node_crypto_1.createHash)('sha256').update(path).digest('hex')}.${sha256}.json`;
}
function writeFileOrigin(root, file, origin) {
    const canonicalRoot = (0, node_fs_1.realpathSync)(root);
    const canonicalFile = (0, node_fs_1.realpathSync)(file);
    const path = (0, node_path_1.relative)(canonicalRoot, canonicalFile).replace(/\\/g, '/');
    if (!path || path === '..' || path.startsWith('../') || (0, node_path_1.isAbsolute)(path) || path.split('/').includes('.hedgehog')) {
        throw new Error('Origin file is outside its artifact root');
    }
    const facts = fingerprintFile(canonicalFile);
    if (!facts.sha256)
        throw new Error('Origin content exceeds the supported fingerprint size');
    const target = artifactStatePath(canonicalRoot, 'artifact-origins', originNoteName(path, facts.sha256));
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(target), { recursive: true });
    const temp = `${target}.${(0, node_crypto_1.randomUUID)()}.tmp`;
    (0, node_fs_1.writeFileSync)(temp, JSON.stringify({ schema_version: '1.0', path, sha256: facts.sha256, origin: sanitizeFileOrigin(origin) }) + '\n', { flag: 'wx' });
    (0, node_fs_1.renameSync)(temp, target);
}
/** Read notes only for an already discovered file. Old tables remain compatibility input. */
function readFileOrigin(root, path, facts, previous) {
    try {
        if (facts.sha256) {
            const note = readJson(artifactStatePath(root, 'artifact-origins', originNoteName(path, facts.sha256)));
            if (note?.schema_version === '1.0' && note.path === path && note.sha256 === facts.sha256) {
                const origin = sanitizeFileOrigin(note.origin);
                if (origin)
                    return origin;
            }
        }
        // Once indexed, keep only the previous entry's still-valid origin. Re-reading
        // an old table after invalidation would resurrect stale provenance next run.
        if (previous) {
            const unchanged = previous.size === facts.size && previous.modified_at === facts.modified_at
                && (!previous.sha256 || previous.sha256 === facts.sha256);
            return unchanged ? sanitizeFileOrigin(previous.origin) : undefined;
        }
        const registry = readJson(artifactStatePath(root, 'artifact-origins.json'));
        return sanitizeFileOrigin(registry?.[path]);
    }
    catch {
        return undefined;
    }
}
/** Validate ownership at admission, before any business file writes or model calls. */
function assertArtifactOwner(root, owner, sessionId) {
    if (!(0, node_fs_1.existsSync)(root))
        return;
    const path = artifactStatePath(root, 'artifact-manifest.json');
    if (!(0, node_fs_1.existsSync)(path))
        return;
    const manifest = readJson(path);
    if (!manifest || manifest.owner !== owner || (sessionId && manifest.session_id && manifest.session_id !== sessionId)) {
        throw new Error('Artifact Manifest owner or Session identity conflicts with this run; use its owning runtime or a separate Session directory');
    }
}
/** A producer may validate its output before requesting data, without discovering artifacts. */
function assertArtifactOutput(root, output) {
    const canonicalRoot = (0, node_fs_1.realpathSync)(root);
    const target = (0, node_path_1.resolve)(output);
    let parent = target;
    while (!(0, node_fs_1.existsSync)(parent) && (0, node_path_1.dirname)(parent) !== parent)
        parent = (0, node_path_1.dirname)(parent);
    const canonicalTarget = (0, node_path_1.resolve)((0, node_fs_1.realpathSync)(parent), (0, node_path_1.relative)(parent, target));
    const path = (0, node_path_1.relative)(canonicalRoot, canonicalTarget);
    if ((0, node_path_1.isAbsolute)(path) || path === '..' || path.startsWith('..' + (process.platform === 'win32' ? '\\' : '/'))
        || path.replace(/\\/g, '/').split('/').includes('.hedgehog'))
        throw new Error('Output must be inside the business artifact root');
}
