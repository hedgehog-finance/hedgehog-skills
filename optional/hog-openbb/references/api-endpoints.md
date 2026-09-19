# OpenBB API Endpoint Reference

This document lists all API endpoints supported by the `hog-openbb` skill for quick reference.

Service base URL: `http://localhost:59201` (configurable)

---

## Endpoint Summary

| API Name | HTTP Method | API Path | Description |
|---|---|---|---|
| `getMacroIndicators` | GET | `/api/v1/economy/fred_series` | FRED macroeconomic indicators; requires `symbol` |
| `getTreasuryYields` | GET | `/api/v1/fixedincome/government/yield_curve` | US Treasury yield curve; optional `date` |
| `getEconomicCalendar` | GET | `/api/v1/economy/calendar` | Global economic calendar |
| `getOptionChains` | GET | `/api/v1/derivatives/options/chains` | Options chain data |
| `getOptionExpiry` | GET | `/api/v1/derivatives/options/chains` | Extract sorted unique expiration dates from the returned chain |
| `getGlobalIndices` | GET | `/api/v1/index/price/historical` | Historical stock index quotes; requires `symbol` |
| `getForexRates` | GET | `/api/v1/currency/price/historical` | Historical forex rates; requires `symbol` |
| `getCommodityPrices` | GET | `/api/v1/economy/fred_series` | Commodity prices by FRED series ID; requires `symbol` |

Readiness uses `/api/v1/coverage/providers`. Responses use OpenBB's `results` envelope; `fields` filters its rows or columns while preserving metadata. Provider-specific schemas are available from the running service's `/openapi.json`.

---

## Common Query Parameters

The following parameters can be used across multiple endpoints (depending on provider support):

| Parameter | Type | Description |
|---|---|---|
| `provider` | string | Provider supported by the selected route (see below) |
| `symbol` | string | Security/indicator code |
| `start_date` | string | Start date, `YYYY-MM-DD` |
| `end_date` | string | End date, `YYYY-MM-DD` |
| `limit` | integer | Result count limit |

---

## Example Calls

### Query US GDP

```bash
node scripts/call_api.js --api getMacroIndicators --params-file '<workspace>/tmp-hog-openbb-<unique-id>.json'
```

### Query AAPL Options Chain

```bash
node scripts/call_api.js --api getOptionChains --params-file '<workspace>/tmp-hog-openbb-<unique-id>.json'
```

### Query S&P 500 Index

```bash
node scripts/call_api.js --api getGlobalIndices --params-file '<workspace>/tmp-hog-openbb-<unique-id>.json'
```

### Query EUR/USD Exchange Rate

```bash
node scripts/call_api.js --api getForexRates --params-file '<workspace>/tmp-hog-openbb-<unique-id>.json'
```

### Query WTI Crude Oil Price

```bash
node scripts/call_api.js --api getCommodityPrices --params-file '<workspace>/tmp-hog-openbb-<unique-id>.json'
```

---

## Data Provider & Endpoint Compatibility

| Endpoint | Default Provider | Other Providers (OpenBB 4.7.2) |
|---|---|---|
| `getMacroIndicators` | `fred` | `intrinio` |
| `getTreasuryYields` | `fred` | `ecb`, `econdb`, `federal_reserve`, `fmp` |
| `getEconomicCalendar` | `fred` | `fmp`, `nasdaq`, `tradingeconomics` |
| `getOptionChains` / `getOptionExpiry` | `yfinance` | `cboe`, `deribit`, `intrinio`, `tmx`, `tradier` |
| `getGlobalIndices` | `yfinance` | `cboe`, `fmp`, `intrinio` |
| `getForexRates` | `yfinance` | `fmp`, `tiingo` |
| `getCommodityPrices` | `fred` | `intrinio` (series support may differ) |

Providers and series may require their own API keys or subscription. A healthy local service does not imply that every provider is configured.
