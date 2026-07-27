#!/usr/bin/env node
// HogAgent Deliver Files CLI — Gateway General MCP Server (hedgehog-general-mcp).
//
// Single-purpose wrapper around the `deliver_files` tool: deliver downloadable
// files to the user (in batch) via HTTP JSON-RPC.
//
// Usage:
//   deliver-files <path...> [--summary S] [--task-id ID]
//   deliver-files --files-json '[{"path":"...","summary":"..."}]' [--task-id ID]
//
// Global options (may appear anywhere):
//   --url <url>   Override Gateway General MCP endpoint (highest priority)
//
// Endpoint discovery priority:
//   --url  >  $HEDGEHOG_MCP_GENERAL_URL  >  ~/.hogagent/hogagent.json (gateway.mcpGeneralUrl)
//   >  http://127.0.0.1:59102 (default)

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DEFAULT_URL = "http://127.0.0.1:59102";

// ---------------------------------------------------------------------------
// MCP endpoint discovery.
// ---------------------------------------------------------------------------

async function resolveMcpUrl(override) {
  if (override) return override;
  if (process.env.HEDGEHOG_MCP_GENERAL_URL) return process.env.HEDGEHOG_MCP_GENERAL_URL;
  const candidates = [
    join(homedir(), ".hogagent", "hogagent.json"),
    join(dirname(process.cwd()), "hogagent.json"),
  ];
  for (const cfg of candidates) {
    try {
      const j = JSON.parse(await readFile(cfg, "utf8"));
      if (j?.gateway?.mcpGeneralUrl) return j.gateway.mcpGeneralUrl;
    } catch {
      // ignore
    }
  }
  return DEFAULT_URL;
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC caller with bounded timeout.
// ---------------------------------------------------------------------------

async function callMcp(url, toolName, args) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const bodyText = await resp.text().catch(() => "");
      throw new Error(`MCP HTTP error ${resp.status} ${resp.statusText}: ${bodyText.slice(0, 200)}`);
    }
    const body = await resp.json();
    if (body.error) {
      throw new Error(`MCP error ${body.error.code}: ${body.error.message || "unknown"}`);
    }
    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

function extractText(result) {
  const text = Array.isArray(result?.content) ? result.content[0]?.text : undefined;
  if (typeof text === "string") return text;
  if (typeof result === "string") return result;
  return "";
}

function printResult(result) {
  const text = extractText(result);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
}

// ---------------------------------------------------------------------------
// Argument parsing helpers.
// ---------------------------------------------------------------------------

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq !== -1) {
      flags[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    const val = argv[i + 1];
    if (val !== undefined && !val.startsWith("--")) {
      flags[key] = val;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

function positional(argv) {
  const f = parseFlags(argv);
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      if (a.indexOf("=") === -1) {
        const key = a.slice(2);
        if (f[key] !== true) i++;
      }
      continue;
    }
    pos.push(a);
  }
  return pos;
}

function parseJsonFlag(f, key) {
  if (!f[key] || f[key] === true) return undefined;
  try {
    return JSON.parse(f[key]);
  } catch (err) {
    console.error(`Invalid --${key} JSON: ${err.message}`);
    process.exit(1);
  }
}

const HELP = `deliver-files — deliver downloadable files to the user via Gateway General MCP

Usage:
  deliver-files <path...> [--summary S] [--task-id ID]
  deliver-files --files-json '[{"path":"...","summary":"..."}]' [--task-id ID]

Options:
  --summary S             Summary applied to all positional file paths
  --files-json '<json>'   File array [{path, summary?}] (alternative to positional paths)
  --task-id ID            Associated workflow task ID
  --url <url>             Override MCP endpoint (highest priority)

Endpoint priority:
  --url  >  $HEDGEHOG_MCP_GENERAL_URL  >  ~/.hogagent/hogagent.json (gateway.mcpGeneralUrl)  >  ${DEFAULT_URL}`;

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

async function main() {
  // Strip the global --url flag from anywhere in argv.
  let urlOverride;
  const stripped = [];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.indexOf("=");
    if (eq !== -1 && a.slice(0, eq) === "--url") {
      urlOverride = a.slice(eq + 1);
      continue;
    }
    if (a === "--url") {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        urlOverride = next;
        i++;
        continue;
      }
    }
    stripped.push(a);
  }

  if (stripped[0] === "-h" || stripped[0] === "--help") {
    console.log(HELP);
    process.exit(0);
  }

  // deliver_files: positional file paths + optional --summary applied to all,
  // or --files-json for full control (path + per-file summary). Exactly one
  // of the two input forms must be used.
  const f = parseFlags(stripped);
  let files = parseJsonFlag(f, "files-json");
  const paths = positional(stripped);
  if (files && paths.length) {
    console.error("Error: <path...> and --files-json are mutually exclusive; provide exactly one.");
    process.exit(1);
  }
  if (!files) {
    if (!paths.length) {
      console.error(HELP);
      process.exit(1);
    }
    files = paths.map((p) => (f.summary && f.summary !== true ? { path: p, summary: f.summary } : { path: p }));
  }
  const payload = { files };
  if (f["task-id"]) payload.task_id = f["task-id"];

  const url = await resolveMcpUrl(urlOverride);
  try {
    printResult(await callMcp(url, "deliver_files", payload));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
