#!/usr/bin/env node
// HogAgent Gateway Tools CLI — General MCP Server (hedgehog-general-mcp).
//
// Wraps every tool exposed by the Gateway General MCP Server:
//   report_task_result, get_work_context, send_notification,
//   get_watchlist, recommend_resource, push_workflow, list_extensions
//
// Global options (may appear before or after the subcommand):
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

function toInt(v, def, lo, hi) {
  if (v === undefined) return def;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(Math.max(lo, n), hi);
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

// ---------------------------------------------------------------------------
// Commands.
// ---------------------------------------------------------------------------

async function cmdReportTaskResult(url, args) {
  const f = parseFlags(args);
  const taskId = positional(args)[0];
  if (!taskId) {
    console.error("Usage: hedgehog-gateway-tools report-task-result <task_id> [--content C] [--summary S] [--delivery-files-json '<json>']");
    process.exit(1);
  }
  const result = {};
  if (f.content) result.content = f.content;
  if (f.summary) result.summary = f.summary;
  const df = parseJsonFlag(f, "delivery-files-json");
  if (df) result.delivery_files = df;
  printResult(await callMcp(url, "report_task_result", { task_id: taskId, result }));
}

async function cmdGetWorkContext(url, args) {
  const f = parseFlags(args);
  const workId = positional(args)[0];
  if (!workId) {
    console.error("Usage: hedgehog-gateway-tools get-work-context <work_id> [--task-id ID]");
    process.exit(1);
  }
  const payload = { work_id: workId };
  if (f["task-id"]) payload.task_id = f["task-id"];
  printResult(await callMcp(url, "get_work_context", payload));
}

async function cmdSendNotification(url, args) {
  const f = parseFlags(args);
  const pos = positional(args);
  const type = pos[0];
  const title = f.title || pos[1];
  const bodyText = f.body || pos.slice(2).join(" ");
  if (!type || !title || !bodyText) {
    console.error('Usage: hedgehog-gateway-tools send-notification <type> <title> <body>\n       (or use --title / --body flags)\n' +
      "Types: workflow_complete, workflow_failed, checkpoint_confirm, resource_recommend, scheduled_task,\n       auth_required, system_alert, agent_version, gateway_status, agent_connected, client_connected, custom");
    process.exit(1);
  }
  printResult(await callMcp(url, "send_notification", { type, title, body: bodyText }));
}

async function cmdGetWatchlist(url, args) {
  const f = parseFlags(args);
  const payload = {};
  if (f["user-id"]) payload.userId = f["user-id"];
  printResult(await callMcp(url, "get_watchlist", payload));
}

async function cmdRecommendResource(url, args) {
  const f = parseFlags(args);
  if (!f["source-type"] || !f.title) {
    console.error("Usage: hedgehog-gateway-tools recommend-resource --source-type T --title X [--content-type T] [--ciwei-id ID] [--url U] [--summary S] [--full-content C] [--recommend-reason R]");
    process.exit(1);
  }
  const payload = { source_type: f["source-type"], title: f.title };
  if (f["content-type"]) payload.content_type = f["content-type"];
  if (f["ciwei-id"]) payload.ciwei_id = f["ciwei-id"];
  if (f["resource-url"]) payload.url = f["resource-url"];
  if (f.summary) payload.summary = f.summary;
  if (f["full-content"]) payload.full_content = f["full-content"];
  if (f["recommend-reason"]) payload.recommend_reason = f["recommend-reason"];
  printResult(await callMcp(url, "recommend_resource", payload));
}

async function cmdPushWorkflow(url, args) {
  const f = parseFlags(args);
  const def = parseJsonFlag(f, "workflow-def");
  if (!f.name || !def) {
    console.error("Usage: hedgehog-gateway-tools push-workflow --name N --workflow-def '<json>' [--description D] [--agent-type A] [--work-id ID]");
    process.exit(1);
  }
  const payload = { name: f.name, workflow_def: def };
  if (f.description) payload.description = f.description;
  if (f["agent-type"]) payload.agent_type = f["agent-type"];
  if (f["work-id"] && f["work-id"] !== true) payload.work_id = f["work-id"];
  printResult(await callMcp(url, "push_workflow", payload));
}

async function cmdListExtensions(url, args) {
  const f = parseFlags(args);
  const payload = {};
  if (f.type) payload.type = f.type;
  if (f.enabled !== undefined) payload.enabled = f.enabled === true || f.enabled === "true" || f.enabled === "1";
  printResult(await callMcp(url, "list_extensions", payload));
}

// Generic escape hatch: call any tool with raw JSON arguments.
async function cmdCall(url, args) {
  const f = parseFlags(args);
  const tool = positional(args)[0];
  if (!tool) {
    console.error('Usage: hedgehog-gateway-tools call <tool> --json \'{"key":"value"}\'');
    process.exit(1);
  }
  const payload = parseJsonFlag(f, "json") ?? {};
  printResult(await callMcp(url, tool, payload));
}

const HELP = `hedgehog-gateway-tools v2.0.1 — Gateway General MCP Server CLI

Usage:
  hedgehog-gateway-tools report-task-result <task_id> [--content C] [--summary S] [--delivery-files-json '<json>']
  hedgehog-gateway-tools get-work-context <work_id> [--task-id ID]
  hedgehog-gateway-tools send-notification <type> <title> <body>
  hedgehog-gateway-tools get-watchlist [--user-id ID]
  hedgehog-gateway-tools recommend-resource --source-type T --title X [--content-type T] [--ciwei-id ID] [--resource-url U] [--summary S] [--full-content C] [--recommend-reason R]
  hedgehog-gateway-tools push-workflow --name N --workflow-def '<json>' [--description D] [--agent-type A] [--work-id ID]
  hedgehog-gateway-tools list-extensions [--type skill|mcp] [--enabled true|false]
  hedgehog-gateway-tools call <tool> --json '<arguments>'

Global options (may appear before or after the subcommand):
  --url <url>   Override MCP endpoint (highest priority)

Endpoint priority:
  --url  >  $HEDGEHOG_MCP_GENERAL_URL  >  ~/.hogagent/hogagent.json (gateway.mcpGeneralUrl)  >  ${DEFAULT_URL}

Notification types: workflow_complete | workflow_failed | checkpoint_confirm | resource_recommend |
  scheduled_task | auth_required | system_alert | agent_version | gateway_status | agent_connected |
  client_connected | custom`;

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

  const cmd = stripped[0];
  const rest = stripped.slice(1);
  if (!cmd || cmd === "-h" || cmd === "--help") {
    console.log(HELP);
    process.exit(0);
  }

  const url = await resolveMcpUrl(urlOverride);
  try {
    switch (cmd) {
      case "report-task-result": await cmdReportTaskResult(url, rest); break;
      case "get-work-context": await cmdGetWorkContext(url, rest); break;
      case "send-notification": await cmdSendNotification(url, rest); break;
      case "get-watchlist": await cmdGetWatchlist(url, rest); break;
      case "recommend-resource": await cmdRecommendResource(url, rest); break;
      case "push-workflow": await cmdPushWorkflow(url, rest); break;
      case "list-extensions": await cmdListExtensions(url, rest); break;
      case "call": await cmdCall(url, rest); break;
      default:
        console.error(`Unknown command: ${cmd}. Use -h for help.`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
