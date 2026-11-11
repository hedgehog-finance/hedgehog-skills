# OpenClaw Skills

A collection of skills adapted for the OpenClaw platform, containing 16 skill modules. Includes all HogAgent core investment research skills plus 10 utility skills.

## Skill List

### Core Investment Research Skills

| Skill | Version | Description |
|-------|---------|-------------|
| `hedgehog-company-index-data` | 1.12.0 | Query A-share company profiles, daily/minute quotes and financials, domestic/global index quotes and weights, Shenwan industry data, and trading calendars |
| `hedgehog-financial-report-analysis` | 1.3.1 | Financial report interpretation with context-aware anomaly analysis, audit-note checks, cash flow and risk |
| `deliver_files` | 2.1.3 | Compatibility wrapper for restricted Gateway file delivery, now also available in `hog-gateway-tools` |
| `hog-gateway-tools` | 3.8.3 | Authenticated General MCP CLI: task result reporting, restricted file delivery, Work context, Task Resource status, Knowledge, Memory, notifications, verified watchlist additions/transfers, resource recommendations and allowlisted HTTP API fallback without extra confirmation |
| `hedgehog-macro-industry-data` | 1.8.3 | Query China-US macro data: Shibor, LPR, CPI, PPI, PMI, M0/M1/M2, social financing, US Treasury yields |
| `hedgehog-news-reports` | 1.9.3 | Unified search and analysis across financial news, A-share research reports, and listed company announcements |
| `hedgehog-stock-research` | 2.4.0 | Four workflows: fundamentals, sentiment, technicals, and CIO research (existing-report integration or full research); focused data sub-agents, main-agent analysis and batch calculation, sectional writing |

### Authentication

For `hedgehog-company-index-data`, `hedgehog-macro-industry-data`, and `hedgehog-news-reports`, configure `skills.entries.<skill>.apiKey` in `~/.openclaw/openclaw.json`. Each skill declares `metadata.openclaw.primaryEnv: CIWEIAI_API_KEY`, so OpenClaw injects the configured key for the host Agent run. Existing `CIWEIAI_API_KEY` values are preserved by OpenClaw; `API_KEY` and HogAgent config remain compatibility fallbacks.

### Extra Utility Tools

| Skill | Version | Description |
|-------|---------|-------------|
| `company-valuation` | 3.0.5 | Valuation engine with Vega-Lite v6 sensitivity heatmap output |
| `doc-convert` | 2.1.2 | Document format conversion: MD / HTML / PDF / DOCX |
| `fin-calc` | 1.0.4 | Financial calculator: PV, FV, PMT, NPV, IRR, RATE |
| `gen-chart` | 2.4.2 | Chart generation with Vega-Lite v6, Mermaid, and ECharts |
| `gen-ppt` | 2.4.3 | Generate and validate target-aware PPTX presentations: native charts for PowerPoint, PNG charts for Keynote/universal, or HTML slides from Markdown |
| `math_calc` | 1.1.2 | Safe mathematical expression evaluator CLI |
| `table-convert` | 1.1.2 | Spreadsheet conversion (xlsx / xls / csv → JSON / Markdown) |
| `tech-indicators` | 1.1.2 | Local technical indicator calculation engine |
| `web_fetch` | 1.1.3 | Web page fetching and main content extraction (output as Markdown) |

## Directory Structure

Standard structure for each skill module:

```
<skill-name>/
├── SKILL.md        # Skill definition file (Agent instructions & tool descriptions)
├── package.json    # Metadata & dependency declarations
├── references/     # (Optional) Reference documents
└── scripts/        # (Optional) Invocation scripts
```

## License

[GPL-3.0](../LICENSE)

## Gateway HTTP API fallback

`hog-gateway-tools` 3.8.3 uses named MCP commands for normal work. Read its [API category index](hog-gateway-tools/references/gateway-api.md) and only the relevant category/common flow for optional offline preview, direct allowlisted requests without extra confirmation, automatic current-Gateway login authentication (no Skill token configuration) and errors. The method/path allowlist permits functional operations and diagnostics only; LLM/Agent execution, Work/Task writes, scheduling mutations and generic proxies are rejected even after user confirmation. No generic WS fallback is provided.
