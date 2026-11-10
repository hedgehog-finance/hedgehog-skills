import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

const MAX_REQUEST_BYTES = 10 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;

// Explicit method + complete-path allowlist. Unknown/new routes stay denied until reviewed.
// IDs are opaque single segments; no generic command, proxy or model-execution endpoints.
const API_ALLOWLIST = {
  GET: [
    /^\/api\/status$/,
    /^\/api\/agent\/(?:status|health|adapters|sessions)$/,
    /^\/api\/agent\/(?:adapters|sessions)\/[A-Za-z0-9_-]+\/status$/,
    /^\/api\/notifications$/,
    /^\/api\/(?:logs(?:\/stats)?|audit-logs|works-logs(?:\/stats)?)$/,
    /^\/api\/watchlist(?:\/[A-Za-z0-9_-]+)?$/,
    /^\/api\/workflows$/,
    /^\/api\/workflows\/[A-Za-z0-9_-]+$/,
    /^\/api\/workflows\/tasks\/[A-Za-z0-9_-]+(?:\/usage)?$/,
    /^\/api\/workflows\/[A-Za-z0-9_-]+\/(?:tasks|usage)$/,
    /^\/api\/scheduled-jobs(?:\/[A-Za-z0-9_-]+(?:\/history)?)?$/,
  ],
  POST: [/^\/api\/watchlist(?:\/move)?$/],
  PUT: [/^\/api\/watchlist\/reorder$/],
  PATCH: [/^\/api\/watchlist\/[A-Za-z0-9_-]+\/mark$/],
  DELETE: [/^\/api\/watchlist\/[A-Za-z0-9_-]+$/],
};

function readFile(path, limit) {
  const stat = statSync(path);
  if (!stat.isFile() || stat.size > limit) throw new Error(`Expected a regular file no larger than ${limit} bytes`);
  return readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
}

export function previewApiRequest(path) {
  const request = JSON.parse(readFile(path, MAX_REQUEST_BYTES));
  const allowed = ['base_url', 'method', 'path', 'body', 'reason', 'effect'];
  if (!request || Array.isArray(request) || typeof request !== 'object' || Object.keys(request).some(key => !allowed.includes(key))) {
    throw new Error('Request must contain only base_url, method, path, optional body, reason and effect');
  }
  for (const key of ['base_url', 'method', 'path', 'reason', 'effect']) {
    if (typeof request[key] !== 'string' || !request[key].trim()) throw new Error(`Missing ${key}`);
  }
  const base = new URL(request.base_url);
  if (!['http:', 'https:'].includes(base.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
    || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('base_url must be the current local Gateway HTTP(S) origin (loopback only), without credentials, query or path');
  }
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) throw new Error('Unsupported HTTP method');
  if (!request.path.startsWith('/api/') || /[\s\\#]/.test(request.path)) throw new Error('Use an existing /api/ path and URL-encoded query');
  const url = new URL(request.path, base);
  // Reject normalized traversal and encoded routing delimiters, including double encoding.
  if (url.origin !== base.origin || url.pathname !== request.path.split('?')[0]
    || /%(?:2e|2f|5c|25)/i.test(url.pathname) || /\/internal(?:\/|$)/i.test(decodeURIComponent(url.pathname))) {
    throw new Error('Internal endpoints, path traversal and encoded path separators are not allowed');
  }
  if (!API_ALLOWLIST[request.method]?.some(route => route.test(url.pathname))) {
    throw new Error('API fallback route is not allowlisted; LLM/Agent execution, Work/Task creation or recovery, scheduling mutations and generic proxies are forbidden even with user confirmation');
  }
  if (request.method === 'GET' && Object.hasOwn(request, 'body')) throw new Error('GET cannot contain body');
  const normalized = { base_url: base.origin, method: request.method, path: url.pathname + url.search,
    ...(Object.hasOwn(request, 'body') ? { body: request.body } : {}), reason: request.reason, effect: request.effect };
  const sha256 = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return { request: normalized, sha256, requires_user_confirmation: true };
}

function apiToken(environment) {
  if (environment.HEDGEHOG_GATEWAY_API_TOKEN && environment.HEDGEHOG_GATEWAY_API_TOKEN_FILE) throw new Error('Use one API token source');
  const token = environment.HEDGEHOG_GATEWAY_API_TOKEN_FILE
    ? readFile(environment.HEDGEHOG_GATEWAY_API_TOKEN_FILE, 16 * 1024).trim()
    : environment.HEDGEHOG_GATEWAY_API_TOKEN;
  if (typeof token !== 'string' || !token.trim() || token.length > 16 * 1024 || /[\r\n]/.test(token)) {
    throw new Error('Set HEDGEHOG_GATEWAY_API_TOKEN or HEDGEHOG_GATEWAY_API_TOKEN_FILE to the authorized local Gateway JWT');
  }
  if (token.startsWith('hgmcp_')) throw new Error('General MCP tokens cannot authenticate the local HTTP API');
  return token;
}

export async function callApprovedApi(path, confirmedSha256, environment = process.env) {
  const preview = previewApiRequest(path);
  if (!confirmedSha256 || confirmedSha256 !== preview.sha256) throw new Error('Explicit user confirmation of this exact api-preview SHA-256 is required; no request sent');
  const request = preview.request;
  const token = apiToken(environment);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let sent = false;
  try {
    sent = true;
    const response = await fetch(request.base_url + request.path, {
      method: request.method, redirect: 'error', signal: controller.signal,
      headers: { authorization: `Bearer ${token}`, accept: 'application/json', ...(Object.hasOwn(request, 'body') ? { 'content-type': 'application/json' } : {}) },
      ...(Object.hasOwn(request, 'body') ? { body: JSON.stringify(request.body) } : {}),
    });
    if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) throw new Error('API response exceeds 20 MiB');
    if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(response.headers.get('content-type') ?? '')) throw new Error('Only JSON API responses are supported; use the documented download flow for files');
    const chunks = []; let size = 0;
    if (response.body) for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_RESPONSE_BYTES) throw new Error('API response exceeds 20 MiB');
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    // Return business receipts intact. Never log the Authorization header or credentials.
    return { http_status: response.status, ok: response.ok && data?.success !== false && !data?.error, data, request_sha256: preview.sha256 };
  } catch (error) {
    const unknown = sent && request.method !== 'GET' ? ' Mutation outcome is unknown; verify it before any user-authorized retry.' : '';
    throw new Error(`API request failed: ${error.message}.${unknown}`);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
