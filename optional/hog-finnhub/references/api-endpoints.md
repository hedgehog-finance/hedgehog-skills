# Finnhub API 端点参考

本文档列出 `hog-finnhub` 技能所支持的全部 API 端点，供快速查阅。

基地址：`https://finnhub.io/api/v1`

认证方式：每次请求附加 `token=<API_KEY>` 查询参数。

---

## 端点汇总表

| 接口名 | HTTP 方法 | API 路径 | 必填参数 | 说明 |
|---|---|---|---|---|
| `getQuote` | GET | `/quote` | `symbol` | 实时股票报价 |
| `getCompanyProfile` | GET | `/stock/profile2` | `symbol` | 公司概况 |
| `getFinancials` | GET | `/stock/metric` | `symbol` | 核心财务指标（自动注入 `metric=all`） |
| `getRecommendations` | GET | `/scan/recommendation-trends` | `symbol` | 分析师评级趋势 |
| `getEarnings` | GET | `/stock/earnings` | `symbol` | 历史 EPS（实际 vs 预期） |
| `getInsiderTransactions` | GET | `/stock/insider-transactions` | `symbol` | 内部人士交易记录 |
| `getMarketNews` | GET | `/news` | — | 市场新闻 |
| `getEconomicCalendar` | GET | `/calendar/economic` | — | 经济日历 |
| `getForexRates` | GET | `/forex/rates` | — | 外汇汇率 |
| `getCryptoQuote` | GET | `/quote` | `symbol` | 加密货币报价 |
| `searchSymbol` | GET | `/search` | `q` | 股票代码搜索 |

---

## 常用查询参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | string | 证券代码，如 `AAPL`、`MSFT`、`TSLA` |
| `q` | string | 搜索关键词（用于 `searchSymbol`） |
| `category` | string | 新闻类别：`general`、`forex`、`crypto`、`merger` |
| `base` | string | 外汇基础货币，默认 `USD` |
| `from` / `to` | string | 日期范围，`YYYY-MM-DD`（经济日历） |
| `exchange` | string | 交易所代码（加密货币：`BINANCE`、`COINBASE`） |

---

## 示例调用

### 查询苹果实时报价

```bash
node scripts/call_api.js --api getQuote --params '{"symbol":"AAPL"}'
```

响应示例：
```json
{
  "c": 185.42,
  "d": 1.23,
  "dp": 0.668,
  "h": 186.10,
  "l": 184.05,
  "o": 184.30,
  "pc": 184.19,
  "t": 1700000000
}
```

### 查询特斯拉公司概况

```bash
node scripts/call_api.js --api getCompanyProfile --params '{"symbol":"TSLA"}'
```

### 查询分析师对微软的评级

```bash
node scripts/call_api.js --api getRecommendations --params '{"symbol":"MSFT"}'
```

### 查询加密货币（比特币）

```bash
node scripts/call_api.js --api getCryptoQuote --params '{"symbol":"BINANCE:BTCUSDT"}'
```

### 搜索包含"apple"的股票代码

```bash
node scripts/call_api.js --api searchSymbol --params '{"q":"apple"}'
```

### 查询外汇汇率（以 USD 为基础货币）

```bash
node scripts/call_api.js --api getForexRates --params '{"base":"USD"}'
```

### 查询经济日历（指定日期范围）

```bash
node scripts/call_api.js --api getEconomicCalendar \
  --params '{"from":"2024-01-01","to":"2024-01-31"}'
```

---

## 响应结构说明

Finnhub 响应格式较简单，与 OpenBB 的多层嵌套不同：

- **单对象响应**（`getQuote`、`getCompanyProfile`、`getFinancials`、`getForexRates`）：
  直接返回 JSON 对象，字段在顶层。

- **数组响应**（`getRecommendations`、`getEarnings`、`getInsiderTransactions`、`getMarketNews`、`searchSymbol`）：
  返回 JSON 数组，每个元素为一条记录。

- **经济日历**（`getEconomicCalendar`）：
  返回 `{ "economicCalendar": [...] }` 结构。

---

## 免费套餐速率限制

| 场景 | 建议 |
|---|---|
| 单只股票查询 | 正常使用，无压力 |
| 批量查询多只股票 | 每次请求间隔至少 1 秒（60 次/分钟） |
| 高频轮询 | 建议增加查询间隔或使用付费套餐 |
| 收到 HTTP 429 | 脚本自动重试 1 次，若仍失败则提示降速 |
