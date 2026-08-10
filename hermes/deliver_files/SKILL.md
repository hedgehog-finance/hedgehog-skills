---
name: deliver_files
version: 1.0.0
description: >
    Deliver downloadable files to the user in batch via the Hedgehog Gateway
    General MCP Server. Use whenever a generated report, chart, document or any
    other artifact needs to be handed over to the user for download.
compatibility: Requires Node.js >=18 in the Hermes terminal runtime.
prerequisites:
  commands: [node]
---

# Deliver Files

A wrapper around the Gateway **General MCP Server** (`hedgehog-general-mcp`) `deliver_files` tool, delivering downloadable files to users in batch. All calls interact with the Gateway via HTTP JSON-RPC 2.0.

## Runtime

- **Node.js**: >=18 (built-in modules only, no external dependencies)

## MCP Endpoint Discovery Priority

The CLI locates the Gateway General MCP Server using the following priority:
1. `--url <url>` command-line argument (highest priority)
2. Environment variable `HEDGEHOG_MCP_GENERAL_URL`
3. `gateway.mcpGeneralUrl` field in `~/.hogagent/hogagent.json`
4. Default `http://127.0.0.1:59102`

## Usage

Executed via the Node.js CLI script. Run in Bash (`${HERMES_SKILL_DIR}` should be replaced with the actual installed path of this tool). File paths are relative to the Gateway workspace directory (or absolute):

```bash
node ${HERMES_SKILL_DIR}/cli.mjs tasks/abc/report.pdf tasks/abc/chart.png --summary "Analysis Report" --task-id abc
# Or use JSON for per-file summary control:
node ${HERMES_SKILL_DIR}/cli.mjs --files-json '[{"path":"tasks/abc/report.pdf","summary":"Report"}]' --task-id abc
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `<path...>` (positional) | Yes* | One or more file paths |
| `--summary S` | No | Description applied to all positional-argument files |
| `--files-json '<json>'` | Yes* | File array `[{path, summary?}]`, mutually exclusive with positional args |
| `--task-id ID` | No | Associated workflow task ID |
| `--url U` | No | Override MCP endpoint (highest priority) |

> `*` At least one of positional arguments or `--files-json` must be provided.

## Output JSON

```json
{
  "delivered": [
    {
      "name": "report.pdf",
      "path": "tasks/abc/report.pdf",
      "size": 1048576,
      "mime_type": "application/pdf",
      "summary": "Report"
    }
  ],
  "errors": []
}
```

Files with out-of-bounds paths or that do not exist are recorded in the `errors` array.

## Constraints

- MCP request timeout is 15 seconds; a timeout returns an error instead of hanging.
- Relative paths must not escape the workspace directory; otherwise the file is rejected and recorded in `errors`.
- The provided `--files-json` must be valid JSON; otherwise the tool exits with an error.
- On failure, an error message is printed to stderr and the process exits with a non-zero code: `Error: MCP request failed: <reason>`
