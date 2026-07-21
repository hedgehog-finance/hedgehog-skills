# OpenBB API 端点参考

本文档列出 `hog-openbb` 技能所支持的全部 API 端点，供快速查阅。

服务基地址：`http://localhost:59201`（可通过配置修改）

---

## 端点汇总表

| 接口名 | HTTP 方法 | API 路径 | 说明 |
|---|---|---|---|
| `getMacroIndicators` | GET | `/api/v1/economy/macro` | FRED 宏观经济指标 |
| `getTreasuryYields` | GET | `/api/v1/economy/treasury` | 美国国债收益率 |
| `getEconomicCalendar` | GET | `/api/v1/economy/calendar` | 全球经济日历 |
| `getOptionChains` | GET | `/api/v1/derivatives/options/chains` | 期权链数据 |
| `getOptionExpiry` | GET | `/api/v1/derivatives/options/expirations` | 期权到期日列表 |
| `getGlobalIndices` | GET | `/api/v1/index/price` | 全球股指行情 |
| `getForexRates` | GET | `/api/v1/currency/price` | 外汇汇率 |
| `getCommodityPrices` | GET | `/api/v1/commodity/price` | 大宗商品价格 |

---

## 常用查询参数

以下参数可在多个端点中使用（视 provider 支持情况）：

| 参数 | 类型 | 说明 |
|---|---|---|
| `provider` | string | 数据提供商，如 `fred`、`alpha_vantage`、`polygon`、`intrinio`、`twelve_data` |
| `symbol` | string | 证券/指标代码 |
| `start_date` | string | 起始日期，`YYYY-MM-DD` |
| `end_date` | string | 结束日期，`YYYY-MM-DD` |
| `limit` | integer | 返回条数限制 |

---

## 示例调用

### 查询美国 GDP

```bash
node scripts/call_api.js --api getMacroIndicators \
  --params '{"symbol":"GDP","provider":"fred","start_date":"2020-01-01"}'
```

### 查询 AAPL 期权链

```bash
node scripts/call_api.js --api getOptionChains \
  --params '{"symbol":"AAPL","provider":"polygon"}'
```

### 查询标普500指数

```bash
node scripts/call_api.js --api getGlobalIndices \
  --params '{"symbol":"^GSPC","provider":"alpha_vantage"}'
```

### 查询 EUR/USD 汇率

```bash
node scripts/call_api.js --api getForexRates \
  --params '{"symbol":"EURUSD","provider":"alpha_vantage"}'
```

### 查询 WTI 原油价格

```bash
node scripts/call_api.js --api getCommodityPrices \
  --params '{"symbol":"DCOILWTICO","provider":"fred"}'
```

---

## 数据提供商与端点兼容性

| 端点 | FRED | Alpha Vantage | Polygon | Intrinio | Twelve Data |
|---|---|---|---|---|---|
| `getMacroIndicators` | ✓ | — | — | — | — |
| `getTreasuryYields` | ✓ | — | — | — | — |
| `getEconomicCalendar` | ✓ | — | — | — | — |
| `getOptionChains` | — | — | ✓ | ✓ | — |
| `getOptionExpiry` | — | — | ✓ | ✓ | — |
| `getGlobalIndices` | — | ✓ | ✓ | — | ✓ |
| `getForexRates` | — | ✓ | ✓ | — | ✓ |
| `getCommodityPrices` | ✓ | ✓ | — | — | — |

> `—` 表示该提供商不支持此端点。
