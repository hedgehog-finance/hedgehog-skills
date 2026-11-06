# HogAgent Skills

A collection of A-share investment research skills adapted for the HogAgent platform, containing 6 skill modules.

## Skill List

| Skill | Version | Description |
|-------|---------|-------------|
| `hedgehog-company-index-data` | 1.12.0 | Query A-share company profiles, daily/minute quotes and financials, domestic/global index quotes and weights, Shenwan industry data, and trading calendars |
| `hedgehog-financial-report-analysis` | 1.3.1 | Financial report interpretation with context-aware anomaly analysis, audit-note checks, cash flow and risk |
| `hog-gateway-tools` | 3.7.1 | Authenticated General MCP CLI: task result reporting, restricted file delivery, Work context, Task Resource status, Knowledge, Memory, notifications, watchlist and resource recommendations |
| `hedgehog-macro-industry-data` | 1.8.3 | Query China-US macro data: Shibor, LPR, CPI, PPI, PMI, M0/M1/M2, social financing, US Treasury yields |
| `hedgehog-news-reports` | 1.9.3 | Unified search and analysis across financial news, A-share research reports, and listed company announcements |
| `hedgehog-stock-research` | 2.4.0 | Four workflows: fundamentals, sentiment, technicals, and CIO research (existing-report integration or full research); focused data sub-agents, main-agent analysis and batch calculation, sectional writing |

## Authentication

For `hedgehog-company-index-data`, `hedgehog-macro-industry-data`, and `hedgehog-news-reports`, HogAgent prefers skill-specific keys in `~/.hogagent/skills_config.json`, followed by the shared `hedgehog-ciweiai` key. `CIWEIAI_API_KEY` and `API_KEY` remain cross-Agent fallbacks.

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
