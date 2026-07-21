#!/usr/bin/env node

/**
 * Web Fetch CLI Skill
 *
 * Fetches a web page and extracts its main content as Markdown.
 * Supports auto-save to file for large content (> 1600 tokens).
 *
 * Usage:
 *   node cli.mjs --url <url> [--max-length N] [--output save --dir <dir>]
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ─── Argument Parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { url: null, maxLength: 8000, output: null, dir: null };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--url':
        args.url = argv[++i];
        break;
      case '--max-length':
        args.maxLength = Math.min(Math.max(parseInt(argv[++i], 10) || 8000, 500), 40000);
        break;
      case '--output':
        args.output = argv[++i];
        break;
      case '--dir':
        args.dir = argv[++i];
        break;
    }
  }
  return args;
}

// ─── Token Estimation (CJK-aware) ──────────────────────────────────────────────

const CJK_REGEX = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF01-\uFF60\u3040-\u30FF\uAC00-\uD7AF]/g;
const COMPLEX_REGEX = /[\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF\u0F00-\u0FFF]/g;
const INDIC_REGEX = /[\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F]/g;
const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

function estimateTokens(text) {
  const cjk = (text.match(CJK_REGEX) ?? []).length;
  const complex = (text.match(COMPLEX_REGEX) ?? []).length;
  const indic = (text.match(INDIC_REGEX) ?? []).length;
  const rtl = (text.match(RTL_REGEX) ?? []).length;
  const latin = text.length - cjk - complex - indic - rtl;
  return Math.ceil(cjk * 1.3 + complex * 0.7 + indic * 0.6 + rtl * 0.5 + latin * 0.25);
}

function truncateText(text, maxTokens, suffix = '\n...(truncated)') {
  const total = estimateTokens(text);
  if (total <= maxTokens) return { text, truncated: false };
  const budget = Math.max(0, maxTokens - estimateTokens(suffix));
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (estimateTokens(text.slice(0, mid)) <= budget) lo = mid;
    else hi = mid - 1;
  }
  return { text: text.slice(0, lo) + suffix, truncated: true };
}

// ─── Fetch & Extract ───────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 30_000;

async function fetchAndExtract(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HogAgent/3.0 (compatible; research bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      const text = await response.text();
      return { title: url, content: text.slice(0, 10000), excerpt: text.slice(0, 200) };
    }

    const html = await response.text();
    const { JSDOM } = await import('jsdom');
    const { Readability } = await import('@mozilla/readability');
    const TurndownService = (await import('turndown')).default;

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.content) {
      const body = dom.window.document.body?.innerHTML || html;
      const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
      const md = turndown.turndown(body);
      return { title: url, content: md, excerpt: md.slice(0, 200) };
    }

    const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    const markdown = turndown.turndown(article.content);

    return {
      title: article.title || url,
      content: markdown,
      excerpt: article.excerpt || markdown.slice(0, 200),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (!args.url) {
    console.error('Error: --url is required');
    console.error('Usage: node cli.mjs --url <url> [--max-length N] [--output save --dir <dir>]');
    process.exit(1);
  }

  try {
    const article = await fetchAndExtract(args.url);
    const rawOutput = `# ${article.title}\n\n${article.content}`;

    // Save mode: --output save --dir <dir>
    const saveDir = args.output === 'save' ? args.dir : null;
    const autoSaveThreshold = estimateTokens(rawOutput) > 1600;
    const targetDir = saveDir || (autoSaveThreshold ? args.dir : null);

    if (targetDir) {
      try {
        if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
        const ts = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        // Filename: data-<datetime>-<N>.md (N prevents collision)
        let n = 1;
        let filepath;
        do {
          filepath = join(targetDir, `data-${ts}-${n}.md`);
          n++;
        } while (existsSync(filepath));
        writeFileSync(filepath, rawOutput, 'utf-8');

        const { text: preview } = truncateText(rawOutput, 800, '...');
        const summary = [
          `[WebFetch Saved] ${filepath}`,
          `URL: ${args.url}`,
          `Title: ${article.title}`,
          `Size: ${rawOutput.length} chars`,
          '',
          'Preview:',
          preview,
          '',
          `Hint: read("${filepath}", offset, limit) to view full content`,
        ].join('\n');
        console.log(summary);
        return;
      } catch {
        // Fall through to direct output
      }
    }

    // Direct output with optional truncation
    const { text } = truncateText(rawOutput, args.maxLength);
    console.log(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Fetch error: ${message}`);
    process.exit(1);
  }
}

main();
