# Hedgehog Skills

A collection of financial research skills for AI Agents, covering A-share company data, macroeconomics, news & sentiment, in-depth analysis, stock research, and more.

## Project Structure

```
hedgehog-skills/
├── hogagent/     # Skills adapted for the HogAgent platform
├── openclaw/     # Skills adapted for the OpenClaw platform (includes extra utility tools)
├── optional/     # Optional extensions (global market data, excludes China A-shares)
├── LICENSE       # GPL-3.0
└── README.md
```

## Platforms

| Platform | Directory | Skills | Description |
|----------|-----------|--------|-------------|
| **HogAgent** | `hogagent/` | 9 | Core A-share investment research skills |
| **OpenClaw** | `openclaw/` | 20 | All HogAgent skills + 11 OpenClaw-only utility skills |
| **Optional** | `optional/` | 2 | Global market data extensions (Finnhub & OpenBB) |

## Skills Overview

### Core Investment Research Skills (shared by hogagent & openclaw)

| Skill | Version | Description |
|-------|---------|-------------|
| `hedgehog-company-index-data` | 1.6.0 | Query A-share listed company data: basic info, daily quotes, fundamentals, capital flow, financial statements, Shenwan industry data, trading calendar |
| `hedgehog-daily-morning-briefing` | 2.2.3 | Pre-market intelligence brief — filters macro, sector and watchlist news to extract core logic |
| `hog-gateway-tools` | 2.0.1 | Gateway General MCP Server CLI: task result reporting, work context, notifications, watchlist, resource recommendation, workflow push |
| `hedgehog-in-depth-analysis` | 2.2.1 | Probability-tree scenario analysis for major events (macro volatility / black swans / geopolitics / policy shifts), predicting high-probability paths and measuring market impact |
| `hedgehog-information-verification` | 2.2.1 | Cross-validate market rumors and unconfirmed news via multi-source verification, quantifying confidence scores to prevent misinformation-driven decisions |
| `hog-kb-tools` | 1.1.0 | Gateway KB MCP Server CLI: knowledge base search and cross-session memory management |
| `hedgehog-macro-industry-data` | 1.6.0 | Query China-US macro data: Shibor, LPR, CPI, PPI, PMI, M0/M1/M2, social financing, US Treasury yields |
| `hedgehog-news-reports` | 1.6.0 | Financial news & reports: breaking news, news analysis, A-share research reports, listed company announcements |
| `hedgehog-stock-research` | 2.2.4 | Multi-dimensional individual stock analysis: fundamentals, sentiment, and technicals analysts + CIO integration for final research report |

### OpenClaw Extra Utility Tools

| Skill | Version | Description |
|-------|---------|-------------|
| `company-valuation` | 2.0.0 | Valuation engine: relative, absolute, and strategic methods |
| `deliver-files` | 1.0.0 | Gateway General MCP Server CLI: deliver downloadable files to the user in batch |
| `doc-convert` | 2.0.0 | Document format conversion: MD / HTML / PDF / DOCX |
| `fin-calc` | 1.0.0 | Financial calculator: PV, FV, PMT, NPV, IRR, RATE |
| `gen-chart` | 2.1.3 | Chart generation (Vega-Lite / Mermaid / ECharts) |
| `gen-ppt` | 2.1.2 | Generate PPTX presentations from Markdown |
| `hog-memory` | 1.1.0 | Cross-session persistent memory CLI: save, search and recall market insights and research conclusions |
| `math_calc` | 1.0.0 | Safe mathematical expression evaluator CLI |
| `table-convert` | 1.0.0 | Spreadsheet conversion (xlsx / xls / csv → JSON / Markdown) |
| `tech-indicators` | 1.0.0 | Local technical indicator calculation engine |
| `web_fetch` | 1.0.0 | Web page fetching and main content extraction (output as Markdown) |

### Optional Extensions (Global Market Data)

| Skill | Version | Description |
|-------|---------|-------------|
| `hog-finnhub` | 1.0.0 | Global stock data via Finnhub API: quotes, fundamentals, analyst ratings, news, forex, crypto (excludes China A-shares) |
| `hog-openbb` | 1.0.1 | Global financial data via OpenBB Platform: macro economics, options chains, global indices, forex, commodities (excludes China A-shares) |

## License

This project is licensed under the [GPL-3.0](LICENSE) open source license.
