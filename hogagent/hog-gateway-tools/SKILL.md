---
name: hog-gateway-tools
version: 3.6.0
description: >
  Use authenticated Gateway General MCP for Work/Task coordination, workspace file
  delivery, knowledge-base and cross-session memory retrieval, authorized memory
  changes, notifications, watchlists, and resource recommendations.
---

# Gateway General MCP Tools

Use Node.js >=18: `node <skill_path>/cli.mjs <command> [arguments]`. Run `--help` for syntax. The CLI handles MCP `2026-07-28` headers, authentication, Resource Links, and durable Task polling.

## Connection

Gateway injects `HEDGEHOG_MCP_GENERAL_URL` and `HEDGEHOG_MCP_GENERAL_TOKEN` into managed Agents. The reserved `agent-runtime` Profile covers these commands; do not create a separate Token. External clients obtain a scoped Token from Gateway settings → MCP Clients.

- URL priority: `--url` → `HEDGEHOG_MCP_GENERAL_URL` → `gateway.mcpGeneralUrl` in `~/.hogagent/hogagent.json` → `http://127.0.0.1:59102/mcp`. Use HTTP(S), no embedded credentials, and the `/mcp` endpoint.
- Token priority: `--token` → `HEDGEHOG_MCP_GENERAL_TOKEN`. Prefer the environment variable to avoid shell-history exposure.
- Identity and permissions come from the Token/Profile. `--user-id` is rejected; never switch identities to bypass denial.
- Knowledge and Memory use this General MCP entrypoint only, without the legacy KB endpoint or native memory extension. Arbitrary tool calls, tool/type discovery, `push_workflow`, `list_extensions`, and direct MCP Task control are not exposed.

## Commands

| Command | Purpose |
|---|---|
| `report-task-result <task_id>` | Report a workflow result, optionally with files |
| `deliver-files <path...>` | Deliver existing workspace files as restricted Resource Links |
| `get-work-context <work_id>` | Read Work context; optional `--task-id` |
| `get-task-status <task_id>` | Read business Task status, result, and deliveries |
| `send-notification <type> <title> <body>` | Send a notification |
| `get-watchlist` | Read the authenticated user's watchlist |
| `recommend-resource --source-type T --title X` | Recommend a resource |
| `kb-search <query>` / `kb-get <id>` | Search Knowledge / read the full item and chunks |
| `memory-search [query]` / `memory-recall <id>` | Search Memory / read content and revision |
| `memory-save <content>` | Save one authorized memory |
| `memory-update <id> --expected-revision N` | Update an authorized memory at its read revision |
| `memory-list` / `memory-delete <id>` | List memories / delete an authorized memory |

## Arguments

Keep documented positional inputs positional; use case-sensitive `--key value` or `--key=value` for options. Text values remain strings. Prefer concise, single-line text and shell-safe quoting.

For structured delivery metadata, write UTF-8 JSON (BOM accepted) with the Agent's file-writing tool, then pass `--files-json-file` or `--delivery-files-json-file`. Use a unique `tmp-hog-gateway-tools-<id>.json` outside `.hedgehog/` and remove it when no longer needed. These options carry file metadata only; there is no generic `--json-file` for other commands. Do not inline nested JSON or combine competing sources for the same payload; separate options such as `--task-id` remain valid.

Use PowerShell or verified Git Bash on Windows; `cmd.exe` is unsupported. Keep shell commands on one physical line. Calls use the Agent's native permissions and sandbox; HogAgent's Windows shell is `UNSANDBOXED`.

```bash
node <skill_path>/cli.mjs deliver-files --files-json-file '<workspace>/tmp-hog-gateway-tools-<id>.json' --task-id task-123
node <skill_path>/cli.mjs report-task-result task-123 --content "Task output" --delivery-files-json-file '<workspace>/tmp-hog-gateway-tools-<id>.json'
node <skill_path>/cli.mjs kb-search "白酒行业景气度" --type Research --limit 5
node <skill_path>/cli.mjs memory-search "茅台" --stock-codes "600519.SH" --mode hybrid --limit 10
node <skill_path>/cli.mjs memory-recall memory-123
node <skill_path>/cli.mjs memory-update memory-123 --expected-revision 1 --content "用户已确认的修订结论"
```

## File delivery

- Managed `agent-runtime` delivery requires the current real Work Task. Gateway checks Session, Provider, phase, directory, and lock policy. For ordinary Chat without a Task, declare `delivery_decision` in the final response; never invent a Task ID. Internal groups/sub-agents return complete `output_files`; the host delivers after `long_task` completion. External clients may export Resource Links within their permissions.
- `deliver-files` accepts explicit positional paths or a non-empty JSON array via `--files-json-file`; `report-task-result` attaches files via `--delivery-files-json-file`. Legacy inline JSON options are manual-only.
- Files must already exist inside the current Agent workspace. Missing files, directories, workspace escapes, external symlinks, and `.hedgehog/` paths are rejected. Delivery does not create or modify files.
- The MCP limit is 64 MiB per file. Use an existing HTTP/Relay streaming path for larger files and existing project/resource interfaces for Development files.
- Report both `delivered` and `errors`, including partial failures. A failed explicit list must not trigger extra delivery through wildcards or historical directories.

## Knowledge

`kb-search` accepts `--type News|Research|Announcements|Minutes|Views`, `--importance-min`, `--date-from`, `--date-to`, and `--limit`. Use these exact types without runtime discovery. Update this list and the Skill version when Gateway changes them.

## Long-term memory

- Search proactively when a request depends on past preferences, investment decisions, research, or lessons. Ordinary Chat does not authorize persistence; save only when the user explicitly requests saving the specific content. Update/delete only as authorized, after resolving the exact ID.
- Gateway automatically captures successful Work, notes, completed courses, formal profiles, and user-selected Chats; do not save duplicates. Only the authenticated user UI may enable Session persistence. Quick chats cannot use tools; their selected content is distilled independently by Gateway.
- Store concise facts, preferences, decisions, conclusions, and lessons with essential dates/limits. Do not store source text, full reports, or chat transcripts. `content` directly supplies embeddings; there is no summary field. Its limit is **1800 cl100k_base tokens inclusive**. Condense before writing: the server rejects blank/oversized content without truncation or automatic summarization.
- `memory-save` accepts `--task-type`, `--task-desc`, `--tags` (CSV), `--work-id`, and `--session-id`. Use only real, authorized Work/Session associations; Gateway owns automatic source keys. Useful task types: `market_insight`, `research_record`, `portfolio`, `review`, `strategy_quant`, `other`, `learning_record`, `investor_profile`; other strings are allowed. Tag investment memories with relevant stock codes, industry, and topic.
- Before `memory-update`, use `memory-recall` to obtain `revision` and pass it as `--expected-revision`. On conflict, reread and reconcile; do not overwrite intervening changes. Supply at least one changed field: `--content`, `--tags`, `--task-type`, or `--task-desc`. `--task-type null` / `--task-desc null` clear those fields; `--tags ""` clears tags.
- `memory-search` supports `--task-type`, `--stock-codes`, `--industry`, `--tags`, `--work-id`, `--source-kind`, `--date-from`, `--date-to`, `--mode semantic|text|hybrid`, and `--limit` (1–50).
- `memory-list` supports `--page` (default 1), `--page-size` (1–100, default 20), and `--source-kind`. Delete the resolved memory with `memory-delete <id>`.
- Embedding failure does not imply save failure. Verify uncertain writes with list/search/recall before retrying. Legacy oversized memories are read-only; ask the user to condense, migrate, and confirm them in the management UI.

## Results and failures

The CLI prints JSON, preferring `structuredContent` and retaining `resource_links`. Tool/protocol errors and failed/cancelled Tasks exit non-zero. Each HTTP request times out after 15 seconds.

Durable MCP Tasks are polled to a terminal state at the server interval, clamped to 250–30000 ms (`--poll-interval-ms` overrides it). `input_required` prints the Task and `inputRequests`, then exits **42**. Use another authorized MCP client for follow-up control; use `--no-wait` only if that client will manage the returned Task.

After two consecutive connection, timeout, HTTP 404, unknown-tool/method, or protocol failures, stop and ask the user to check/restart or upgrade Gateway. Do not probe other commands or identities. For invalid arguments or permissions, report the error without unchanged retries. After an ambiguous mutation result, including memory deletion or file delivery, verify its outcome before any authorized retry.

Limits: JSON payload files 10 MiB, configuration files 1 MiB, MCP responses 20 MiB. Authenticated requests reject redirects, malformed JSON-RPC, and multiline/oversized Tokens.
