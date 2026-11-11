---
name: hog-gateway-tools
version: 3.8.2
description: >
  Use authenticated Gateway General MCP for Work/Task coordination, workspace file
  delivery, knowledge-base and cross-session memory retrieval, authorized memory
  changes, notifications, verified watchlist additions/transfers, resource recommendations,
  and allowlisted local Gateway HTTP API troubleshooting without extra confirmation.
compatibility: Requires Node.js >=18 in the Hermes terminal runtime.
prerequisites:
  commands: [node]
---

# Gateway General MCP Tools

Use Node.js >=18: `node ${HERMES_SKILL_DIR}/cli.mjs <command> [arguments]`. Run `--help` for syntax. The CLI handles MCP `2026-07-28` authentication and Task polling.

## Connection

Gateway injects `HEDGEHOG_MCP_GENERAL_URL` and `HEDGEHOG_MCP_GENERAL_TOKEN` into managed Agents. The reserved `agent-runtime` Profile covers the named MCP commands (HTTP fallback uses separate credentials); do not create a separate Token. External clients obtain a scoped Token from Gateway settings → MCP Clients.

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
| `get-watchlist [--list-type watchlist|candidate]` | Read the authenticated user's chosen list |
| `find-stock <name-or-code>` | Resolve stock identity from the Gateway dictionary |
| `watchlist-add <stock_code>` | Verify and add to the selected list |
| `watchlist-move <id> --from candidate --to watchlist` | Move an existing record between lists |
| `api-preview --request-file <file>` | Prepare a concrete HTTP fallback request offline |
| `api-call --request-file <file>` | Execute an allowlisted local HTTP request without extra confirmation |
| `recommend-resource --source-type T --title X` | Submit one recommendation candidate |
| `recommend-resource --batch-file <file>` | Submit a candidate batch with a stable ID |
| `recommend-status <batch_id>` / `recommend-retry <batch_id>` | Read a batch receipt / explicitly retry a failed batch |
| `kb-search <query>` / `kb-get <id>` | Search Knowledge / read the full item and chunks |
| `memory-search [query]` / `memory-recall <id>` | Search Memory / read content and revision |
| `memory-save <content>` | Save one authorized memory |
| `memory-update <id> --expected-revision N` | Update an authorized memory at its read revision |
| `memory-list` / `memory-delete <id>` | List memories / delete an authorized memory |

## Arguments

Keep documented positional inputs positional; use case-sensitive `--key value` or `--key=value` for options. Text values remain strings. Prefer concise, single-line text and shell-safe quoting.

For structured payloads, write UTF-8 JSON (BOM accepted) with the Agent's file-writing tool: use `--files-json-file` or `--delivery-files-json-file` for delivery metadata, and `--batch-file` for recommendation batches. Use a unique `tmp-hog-gateway-tools-<id>.json` outside `.hedgehog/` and remove it when no longer needed. There is no generic `--json-file`. Do not inline nested JSON or combine competing payload sources; delivery options such as `--task-id` remain valid, but `--batch-file` cannot mix with candidate flags.

Use PowerShell or verified Git Bash on Windows; `cmd.exe` is unsupported. Keep shell commands on one physical line. Calls use the Agent's native permissions and sandbox; HogAgent's Windows shell is `UNSANDBOXED`.

```bash
node ${HERMES_SKILL_DIR}/cli.mjs deliver-files --files-json-file '<workspace>/tmp-hog-gateway-tools-<id>.json' --task-id task-123
node ${HERMES_SKILL_DIR}/cli.mjs report-task-result task-123 --content "Task output" --delivery-files-json-file '<workspace>/tmp-hog-gateway-tools-<id>.json'
node ${HERMES_SKILL_DIR}/cli.mjs kb-search "白酒行业景气度" --type Research --limit 5
node ${HERMES_SKILL_DIR}/cli.mjs memory-search "茅台" --stock-codes "600519.SH" --mode hybrid --limit 10
node ${HERMES_SKILL_DIR}/cli.mjs memory-recall memory-123
node ${HERMES_SKILL_DIR}/cli.mjs memory-update memory-123 --expected-revision 1 --content "用户已确认的修订结论"
```

## Watchlist changes

Use explicit user intent, not a stock mention or a recommendation, to authorize a change. An unambiguous add instruction is sufficient; ask only to resolve ambiguous stocks/list changes. `get-watchlist --list-type candidate` reads candidates; no flag retains the existing formal-watchlist behavior.

1. `find-stock <name-or-code>` searches the existing Gateway stock dictionary and returns up to 20 matches with a total/truncation flag. Resolve the exact stock code and market; never choose the first ambiguous match or invent a code. If the dictionary is missing, stop.
2. `watchlist-add <verified-stock-code> [--list-type watchlist|candidate]` defaults to formal watchlist. It verifies the exact dictionary entry, queries both lists, and calls the existing `watchlist_add` with authoritative name/exchange/market. It does not set a ready-to-buy mark.
3. The result is `added`, `already_present`, or `move_required` (exit 2; no write). For `move_required`, explain the source list and obtain the user's transfer intent, unless already explicit. Then call `watchlist-move <actual-id> --from candidate --to watchlist` (or the reverse). This queries source membership and uses `watchlist_move`; `already_in_target` means no new mutation. Preserve existing categories and marks.
4. Report only the actual receipt. Capacity, duplicate and ownership checks remain server-side (currently 10 formal including ready-to-buy, 500 candidates). Never silently delete, replace or divert a stock when full. For a batch, resolve all targets and clarify insufficient capacity before sequential calls; preserve/report partial successes and stop on an unknown result. No blind mutation retries; HTTP fallback follows the allowlist rules below.

These commands need `watchlist:read`, `watchlist:write` and `stock:read`; the companion Gateway update grants these existing scopes to its reserved `agent-runtime` Profile. External clients keep their explicitly granted scopes. An older runtime or denied scope must be reported, not bypassed with HTTP.

Adding is a short deterministic operation, not a new Work. Long research/filtering remains Work/Task. Formal-watchlist classification is currently a separate consumer-side step, so the CLI does not claim completion or create a parallel LLM workflow. Candidate classification is already asynchronous server-side; move preserves existing tags. Read the list to verify persistence; this Skill does not promise a new push event or immediate refresh in every frontend.

## Allowlisted HTTP API fallback

Use named MCP commands first. When they do not cover the authorized business operation or a verified compatibility issue requires HTTP, `api-call --request-file <file>` may execute an allowlisted request directly. No additional API confirmation, confirmation hash or prior preview is required. This does not expand the user's business request (for example, mentioning a stock alone does not authorize adding it).

**Execution boundary:** Both `api-preview` and `api-call` enforce the method/path allowlist. LLM/Agent execution, Work/Task creation, orchestration, retry/continue/resume, scheduling mutations and generic proxies are excluded. Use an authorized named MCP capability for model execution; if unavailable, stop. Existing watchlist business side effects (such as candidate classification) remain supported.

Read the [Gateway HTTP API category index](references/gateway-api.md), then only the relevant category and its linked common request flow; do not preload every API document. `api-preview --request-file <file>` is an optional offline request check. `api-call` independently validates the actual file before sending; a prior preview never authorizes a different or forbidden route. Report the receipt and verify uncertain writes before considering a retry.

Fallback uses a separately authorized local Gateway JWT via `HEDGEHOG_GATEWAY_API_TOKEN` or `HEDGEHOG_GATEWAY_API_TOKEN_FILE`, never the MCP token. Missing credentials, permission denial, sandbox restrictions and internal endpoint boundaries are not bypassed. Only allowlisted local loopback JSON `/api/` calls are supported, without redirects or automatic retries. Do not read private credential stores, obtain a new token, or replace this flow with curl, ad hoc scripts or WS. There is no WS fallback or generic MCP call command.

## File delivery

- Managed `agent-runtime` delivery requires the current real Work Task. Gateway checks Session, Provider, phase, directory, and lock policy. For ordinary Chat without a Task, declare `delivery_decision` in the final response; never invent a Task ID. Internal groups/sub-agents return complete `output_files`; the host delivers after `long_task` completion. External clients may export Resource Links within their permissions.
- `deliver-files` accepts explicit positional paths or a non-empty JSON array via `--files-json-file`; `report-task-result` attaches files via `--delivery-files-json-file`. Legacy inline JSON options are manual-only.
- Files must already exist inside the current Agent workspace. Missing files, directories, workspace escapes, external symlinks, and `.hedgehog/` paths are rejected. Delivery does not create or modify files.
- The MCP limit is 64 MiB per file. Use an existing HTTP/Relay streaming path for larger files and existing project/resource interfaces for Development files.
- Report both `delivered` and `errors`, including partial failures. A failed explicit list must not trigger extra delivery through wildcards or historical directories.

## Knowledge

`kb-search` accepts `--type News|Research|Announcements|Minutes|Views|Document`, `--importance-min` (0–5), `--date-from`, `--date-to`, and `--limit` (1–20). Keep these categories/version aligned with Gateway; do not discover types at runtime.

Inspect `match_type`, `degraded`, `fragments`, and `rank_score`. Search combines text and semantic recall; rank is not similarity, text-only `score=-1`, and there is no default similarity threshold. Archived/deleted documents are excluded by default. Knowledge writes and connector authorization/sync are outside this Skill.

## Resource recommendations

- Use the actual provider as `source_type`, a Knowledge category as `content_type`, and an evidenced source ID (`ciwei_id`) or URL. **Batch JSON uses `url`; single-candidate CLI uses `--resource-url`.** Put obtained original text in `full_content`, otherwise an excerpt in `summary`; include `published_at` only when known.
- Scores must be finite: `importance` −5…5, `relevance` 1…5. Preserve importance's sign without inferring sentiment. Publication requires `abs(importance)>=4`, `relevance>=4`, and a non-empty `recommend_reason`. Relevance 4 means directly related to the current stock/watchlist/research; 5 affects a key judgment. Impact alone is not relevance. Omit unknown scores for Gateway evaluation; skip known ineligible candidates. Unscorable candidates are skipped; evaluation errors can fail the batch.
- `--batch-file` takes an object with non-empty `batch_id`, `scene`, and 1–90 candidates, each with `source_type` and `title`. Scenes: `agent`; `stock_news` with a watched `stock_code`; `morning_briefing` / `closing_summary` with real `work_id` and `task_id`. Gateway validates ownership, sources, scoring, and quotas. Single-candidate mode supports the same content/scoring fields via named flags in `--help`.
- Reuse the same batch ID and unchanged payload after an uncertain submission; this returns the existing receipt, **not a retry of a failed batch**. Changed payloads need a new ID. Single-candidate submissions receive fresh server IDs; use batch mode when submission retries must be idempotent.

Example batch file; replace placeholders with actual evidence:

```json
{
  "batch_id": "stable-operation-id", "scene": "morning_briefing",
  "work_id": "actual-work-id", "task_id": "actual-task-id",
  "candidates": [{
    "source_type": "ciwei", "content_type": "News", "ciwei_id": "actual-news-id",
    "title": "Actual title", "summary": "Evidence used in the report",
    "importance": -4, "relevance": 4, "recommend_reason": "Directly affects the watched company"
  }]
}
```

- For morning/closing reports, submit candidates actually used, including those awaiting scores, with the matching scene/Work/Task **before reporting completion**. If none remain after excluding known ineligible candidates, submit nothing. Gateway waits for successful Work completion, then publishes at most five per user/report date/type across Agents, retries, and remakes. Never bypass this quota with `agent` scene; finish the report without waiting for its pending batch.
- Read the returned receipt ID with `recommend-status`; when `status=failed` and a retry is appropriate, use `recommend-retry`, then query again. `completed` may publish zero items after filtering; the receipt is not a publication count. Missing receipts fail. These application batches are separate from MCP Tasks, so Task polling/`--no-wait` do not control them.
- Receipt commands require `resource:recommend` and the Gateway companion fixes. Recommendations expire after 30 days; duplicates do not extend expiry. Users choose classification, tags, and optional comments when saving to Knowledge.

## Long-term memory

- Search when the request depends on past preferences, decisions, research, or lessons. Ordinary Chat saves require an explicit request for that content; update/delete require authorization and an exact ID. Do not duplicate Gateway's automatic capture of successful Work, notes, completed courses, profiles, or user-selected Chats. Only the user UI enables Session persistence; Quick chats cannot use tools.
- Store concise facts, preferences, decisions, conclusions, or lessons with key dates/limits, never source text, reports, or transcripts. `content` directly supplies embeddings; there is no summary field. The server rejects blank content or more than **1800 cl100k_base tokens**, without truncation or summarization; condense first.
- Write “time + action + specifics”, using evidenced activity times at their known precision. Month-or-longer summaries may use supported periods. Omit unknown times; never substitute publication/report/save dates or note periods. Keep activity times, objects, and completion states distinct: plans are not completed actions, generated reports need not have been read, and generated courses need not have been learned. Ground preferences/profiles in expression, confirmation, or assessment.
- Save options are in `--help`. Use real, authorized Work/Session associations; Gateway owns automatic source keys. Tag investment memories with stock codes, industry, and topic. Suggested task types: `market_insight`, `research_record`, `portfolio`, `review`, `strategy_quant`, `other`, `learning_record`, `investor_profile`; other strings are allowed.
- Before updating, recall the memory and pass its `revision` as `--expected-revision`. On conflict, reread and reconcile. Change at least one of content/tags/task-type/task-desc; `--task-type null` / `--task-desc null` clear fields, `--tags ""` clears tags. Search filters and list pagination are in `--help`.
- Embedding failure does not prove save failure; verify uncertain writes with list/search/recall before retrying. Legacy oversized memories are read-only; ask the user to condense and confirm migration in the management UI.

## Results and failures

The CLI prints JSON, preferring `structuredContent` and retaining `resource_links`. Tool/protocol errors and failed/cancelled Tasks exit non-zero. Each HTTP request times out after 15 seconds. Responses must match the JSON-RPC version and request ID with exactly one of result/error; pre-dispatch errors may have `id:null`. Invalid Task identity, status, or completion result stops polling with an error, without repeating the mutation.

Durable MCP Tasks are polled to a terminal state at the server interval, clamped to 250–30000 ms (`--poll-interval-ms` overrides it). `input_required` prints the Task and `inputRequests`, then exits **42**. Use another authorized MCP client for follow-up control; use `--no-wait` only if that client will manage the returned Task.

Report invalid arguments or permission denial without unchanged retries. Unknown Gateway tools/methods or protocol incompatibility require a Gateway version check; never silently switch transports. An independently documented HTTP operation is available only through the allowlisted fallback flow above, never to evade denied permissions. Stop after two consecutive connection/timeout/HTTP 404 failures and ask the user to check/restart Gateway. For uncertain mutations, verify the outcome before retrying; recommendation receipts and memory checks are described above.

Limits: JSON payload files 10 MiB, configuration files 1 MiB, MCP responses 20 MiB. Authenticated requests reject redirects and multiline/oversized Tokens.
