# Hedgehog Skills

A collection of AI agent skills for the **Hedgehog Finance (Ciwei)** investment research platform. These skills empower AI agents with professional-grade financial data retrieval, technical analysis, macro-economic indicators, news/research report search, and financial calculation capabilities — all focused on the **China A-share market**.

## Overview

Hedgehog Skills is a modular skill set designed for AI-powered investment research workflows. Each skill is a self-contained module with its own API integration scripts, reference documentation, and workflow definitions (`SKILL.md`). Together, they form a comprehensive toolkit covering stock data, macro indicators, financial news, research reports, technical indicators, and financial calculators.

**Base API**: `https://api.ciweiai.com/api/data` (data endpoints) / `https://api.ciweiai.com/api/utils` (utility endpoints)

## Skills

| Skill | Description |
|---|---|
| **[hedgehog-skills-guide](hedgehog-skills-guide/)** | Central entry point and workflow guide for all Hedgehog skills. Covers A-share quotes, financial news semantic search, research reports, and technical indicators. |
| **[hedgehog-init](hedgehog-init/)** | Installation and configuration skill. Handles plugin setup, user token management, system prompt updates, and agent status queries. |
| **[hedgehog-company-index-data](hedgehog-company-index-data/)** | Listed company and stock data — basic info, daily OHLCV quotes, daily fundamentals (PE/PB/turnover/market cap), money flow, financial statements (income/balance/cash flow), financial indicators, audit opinions, main business composition, and Shenwan industry classification. |
| **[hedgehog-macro-industry-data](hedgehog-macro-industry-data/)** | Macro-economic data — China Shibor, LPR, CPI, PPI, PMI, M0/M1/M2 money supply, social financing; US Treasury nominal & real (TIPS) yields. |
| **[hedgehog-news-reports](hedgehog-news-reports/)** | Financial news, flash news, and research reports — listing, detail retrieval, semantic analysis, stock-specific news analysis, research report analysis, and pipeline status statistics. |
| **[hedgehog-tech-indicator](hedgehog-tech-indicator/)** | Technical indicator calculations on OHLCV candlestick data — SMA, EMA, RSI, MACD, Bollinger Bands, OBV, KDJ, ATR, and VWAP. |
| **[hedgehog-calculator](hedgehog-calculator/)** | Financial and general-purpose calculators — future/present value, discount/markup, annuity (FV/PV), loan payments, investment returns, descriptive statistics, unit conversion, date/age calculations, and linear/quadratic equation solvers. |
| **[hedgehog-stock-research](hedgehog-stock-research/)** | Multi-dimensional individual stock analysis — fundamentals, sentiment/news, technicals, and consolidated strategy report, outputting a professional investment research report with charts and references. |

## Project Structure

```
hedgehog-skills/
├── hedgehog-skills-guide/       # Central skill guide & API workflow
├── hedgehog-init/               # Installation & configuration
├── hedgehog-company-index-data/ # Stock & company data (14 endpoints)
├── hedgehog-macro-industry-data/# Macro-economic data (9 endpoints)
├── hedgehog-news-reports/       # News, flash news & research reports (10 endpoints)
├── hedgehog-tech-indicator/     # Technical indicators (9 indicators)
├── hedgehog-calculator/         # Financial calculators (14 tools)
├── hedgehog-stock-research/     # Multi-dimensional stock research
├── .gitignore
└── LICENSE
```

Each skill module follows a consistent structure:

```
<skill-name>/
├── SKILL.md          # Skill definition, workflow, and tool descriptions
├── scripts/          # Node.js scripts for API calls
│   └── call_api.js
└── references/       # Detailed parameter docs and usage guides
    └── *.md
```

## Prerequisites

- **Node.js** runtime (for executing API call scripts)

## Quick Start

### API Call Pattern

All data-fetching skills share a common invocation pattern:

```bash
node scripts/call_api.js --api <endpoint_name> --params '<JSON_string>'
```

### Example: Look Up a Stock

```bash
# Find stock code by name
node scripts/call_api.js --api getStockBasic --params '{"name": "Ping An Bank"}'

# Fetch 30-day daily quotes
node scripts/call_api.js --api queryStockDaily --params '{"stock_code": "000001.SZ", "limit": 30}'
```

### Example: Calculate a Technical Indicator

```bash
# Compute MACD for stock 000001.SZ
node scripts/call_api.js --api MACD --params '{"stock_code": "000001.SZ", "start_date": "2025-01-01", "end_date": "2025-03-20"}'
```

### Example: Financial Calculation

```bash
# Future value: 100,000 at 5% annual, monthly compounding, 3 years
node scripts/call_api.js --api futureValue --params '{"present_value": 100000, "annual_rate": 0.05, "years": 3, "compounding_frequency": 12}'
```

## Key Conventions

| Convention | Detail |
|---|---|
| **Date format** | `YYYYMMDD` (e.g. `20250320`) for most data endpoints; `YYYY-MM-DD` for some utility endpoints |
| **Stock code** | Use exchange-suffixed format, e.g. `000001.SZ`, `600000.SH` |
| **Rate values** | Use decimal form, e.g. `0.05` for 5% |
| **Pagination** | Use `skip`/`limit` or `page`/`page_size` depending on the endpoint |
| **Semantic search** | Pass natural-language Chinese text as `keyword` — no need to tokenize |
| **Error handling** | Return `null` when no results found; never fabricate data |


## Error Handling

| Error Type | Action |
|---|---|
| HTTP 4xx | Check parameter format and endpoint path |
| HTTP 5xx | Server error — advise retry later |
| Connection Failure | Verify API endpoint reachability |

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2026 HedgehogFinance
