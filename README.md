# Hedgehog Skills

A collection of financial research skills for AI Agents, covering A-share company data, macroeconomics, news & sentiment, financial report analysis, stock research, and more.

## Project Structure

```
hedgehog-skills/
├── hogagent/     # Skills adapted for the HogAgent platform
├── openclaw/     # Skills adapted for the OpenClaw platform (includes extra utility tools)
├── hermes/       # Skills adapted for Hermes Agent (Python host + declared Node.js runtime)
├── optional/     # Optional extensions (rich PPT and global market data)
├── tests/        # Cross-platform contracts and synchronization checks
├── LICENSE       # GPL-3.0
└── README.md
```

## Platforms

| Platform | Directory | Skills | Description |
|----------|-----------|--------|-------------|
| **HogAgent** | `hogagent/` | 6 | Core A-share investment research skills |
| **OpenClaw** | `openclaw/` | 16 | All HogAgent skills + 10 additional utility skills |
| **Hermes** | `hermes/` | 16 | OpenClaw-equivalent skill set with Hermes-native secrets and Node.js prerequisites |
| **Optional** | `optional/` | 3 | Rich PPT generation and global market data extensions |

## Windows command compatibility

For CLIs that accept a business parameter object, all Agents use one parameter protocol. Pass safe non-empty top-level scalar values as named arguments; put objects, arrays, `null`, multiline text, difficult quoting, and numeric/boolean-looking strings that must remain strings in a UTF-8 JSON file named `tmp-<skill-name>-<id>.json`. Create JSON with the Agent's file tool, pass only its path through the documented file option, never mix payload sources, and delete the temporary file after use. PowerShell and Git Bash examples follow the same rule; `cmd.exe` is unsupported. Named-command CLIs such as `hog-gateway-tools` use their documented arguments and file options.

## Skills Overview

### Core Investment Research Skills (shared by HogAgent, OpenClaw & Hermes)

| Skill | Version | Description |
|-------|---------|-------------|
| `hedgehog-company-index-data` | 1.12.0 | Query A-share company profiles, daily/minute quotes and financials, domestic/global index quotes and weights, Shenwan industry data, and trading calendars |
| `hedgehog-financial-report-analysis` | 1.3.0 | Financial report interpretation with context-aware anomaly analysis, audit-note checks, cash flow and risk |
| `hog-gateway-tools` | 3.8.0 | Authenticated General MCP CLI with restricted file delivery, Work context, Task Resource status, Knowledge and persistent Memory commands plus verified watchlist additions/transfers, user-confirmed local HTTP API fallback and durable Task polling |
| `hedgehog-macro-industry-data` | 1.8.3 | Query China-US macro data: Shibor, LPR, CPI, PPI, PMI, M0/M1/M2, social financing, US Treasury yields |
| `hedgehog-news-reports` | 1.9.3 | Unified search and analysis across financial news, A-share research reports, and listed company announcements |
| `hedgehog-stock-research` | 2.4.0 | Four workflows: fundamentals, sentiment, technicals, and CIO research (existing-report integration or full research); focused data sub-agents, main-agent analysis and batch calculation, sectional writing |

### Cross-Agent Authentication

`hedgehog-company-index-data`, `hedgehog-macro-industry-data`, and `hedgehog-news-reports` support platform-native authentication. HogAgent prefers `~/.hogagent/skills_config.json`; OpenClaw uses `skills.entries.<skill>.apiKey`; Hermes declares `CIWEIAI_API_KEY` through `required_environment_variables` and stores it in `~/.hermes/.env`. Other Agent runtimes can set `CIWEIAI_API_KEY`; `API_KEY` remains a generic fallback.

### OpenClaw & Hermes Extra Utility Tools

| Skill | Version | Description |
|-------|---------|-------------|
| `company-valuation` | 3.0.5 | Valuation engine with Vega-Lite v6 sensitivity heatmap output |
| `deliver_files` | 2.1.3 | Compatibility wrapper for file delivery; the same restricted Resource Link flow is available in `hog-gateway-tools` 3.8.0 |
| `doc-convert` | 2.1.2 | Document format conversion: MD / HTML / PDF / DOCX |
| `fin-calc` | 1.0.4 | Financial calculator: PV, FV, PMT, NPV, IRR, RATE |
| `gen-chart` | 2.4.2 | Chart generation with Vega-Lite v6, Mermaid, and ECharts |
| `gen-ppt` | 2.4.3 | Generate and validate target-aware PPTX presentations: native charts for PowerPoint, PNG charts for Keynote/universal, or HTML slides from Markdown |
| `math_calc` | 1.1.2 | Safe mathematical expression evaluator CLI |
| `table-convert` | 1.1.2 | Spreadsheet conversion (xlsx / xls / csv → JSON / Markdown) |
| `tech-indicators` | 1.1.2 | Local technical indicator calculation engine |
| `web_fetch` | 1.1.3 | Web page fetching and main content extraction (output as Markdown) |

### Gateway MCP CLI Development

When General MCP is enabled, Gateway-managed Agents receive `HEDGEHOG_MCP_GENERAL_URL` and a reserved
`agent-runtime` Token automatically. That Profile includes Knowledge read,
Memory read/write, and the dedicated `file:deliver` and `resource:recommend`
scopes used by these Skills, so managed Agents do not create a client Token
manually. External MCP clients create a scoped Token from the standalone MCP
Clients card in Gateway settings.

The `cli.mjs`, `mcp-client.mjs`, `watchlist.mjs`, `api-fallback.mjs`, and `package.json` for `hog-gateway-tools` must remain identical across HogAgent, OpenClaw, and Hermes. The runtime files for `deliver_files` must remain identical across OpenClaw and Hermes; platform-specific `SKILL.md` runtime instructions remain separate.

After changing either MCP CLI, run:

```bash
node --test tests/gateway-mcp-clis.test.mjs tests/gateway-mcp-regression.test.mjs
```

### Watchlist and HTTP fallback (3.8.0)

Use `find-stock`, `get-watchlist --list-type`, `watchlist-add`, and `watchlist-move` through General MCP. The companion Gateway runtime Profile needs the existing `watchlist:write` and `stock:read` scopes; business handlers, limits and tenant boundaries are reused. Formal-watchlist classification remains a separate consumer operation.

The [bundled HTTP API reference](hogagent/hog-gateway-tools/references/gateway-api.md) documents the fallback. `api-preview` is offline; `api-call` requires explicit user approval of the exact request and its SHA-256, uses a separate authorized local JWT, and never falls back to WS or retries an uncertain write. The hash protects request integrity, not human authorization.

Run `node --test tests/gateway-watchlist-api.test.mjs` as well as the MCP and version suites. All three platform copies and every maintained Git branch containing the Skill must receive the runtime files and reference together.

### Optional Extensions

| Skill | Version | Description |
|-------|---------|-------------|
| `gen-rich-ppt` | 1.1.2 | Generate polished image-based PPT/PPTX decks with built-in or OpenAI-compatible image models |
| `hog-finnhub` | 1.1.2 | Global stock data via Finnhub API: quotes, fundamentals, analyst ratings, news, forex, crypto (excludes China A-shares) |
| `hog-openbb` | 1.1.3 | Global financial data via OpenBB Platform: macro economics, options chains, global indices, forex, commodities (excludes China A-shares) |

## GenPPT Development

OpenClaw is the canonical shared implementation. Keep its `gen-ppt` scripts, references, assets, and package metadata identical to Hermes and the copy bundled in `hedgehog/hogagent/skills/gen-ppt`. Upgrade the version in each `SKILL.md`, its artifact naming instruction, package metadata, platform `version.json`, README tables, and version-test expectations together. Platform-specific `SKILL.md` runtime instructions remain separate.

Version 2.4.3 fixes HTML slide image resolution for native absolute paths, including Windows drive paths, while retaining paths relative to the Markdown input. Use forward slashes in Markdown/HTML image attributes on Windows; spaces and Chinese characters remain supported.

After synchronization, verify shared-file contents and version consistency:

```bash
node --test tests/skill-version-consistency.test.mjs
```

The check includes the bundled HogAgent copy when the sibling `hedgehog` checkout is available. Run the HTML absolute/relative image regression in that checkout with `npm test -- --run test/skills/skill-script-audit.test.ts -t 'local image paths'` from `hogagent/`.

## License

This project is licensed under the [GPL-3.0](LICENSE) open source license. The derived `optional/gen-rich-ppt` skill retains its upstream MIT license in `optional/gen-rich-ppt/LICENSE`.

## Manifest and delivery alignment

Gateway owns managed Manifests. Native tools and data Skills supply role/source facts; final delivery uses the current Prompt Run diff and explicit file list. Source-producing CLIs accept --artifact-root without changing --dir/--out. Internal groups return output_files; final outputs and companions are declared by the host. Knowledge and Memory use `hog-gateway-tools`; `deliver_files` remains a delivery compatibility wrapper.
