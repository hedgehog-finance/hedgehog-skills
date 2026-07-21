---
name: hog-finnhub
description: >
  Global stock data via Finnhub API: quotes, company profiles, financials, analyst ratings,
  earnings, insider transactions, market/company news, forex, crypto, symbol search.
  Excludes China A-shares.
  Priority for: stock quotes, fundamentals, analyst ratings, market news.
  Triggers: stock quote, price, company profile, PE ratio, market cap, recommendation,
  buy/sell rating, target price, EPS, insider trading, financial news, forex, crypto.
  NOT for: China A-shares (use hedgehog-company-index-data); options/macro (use hog-openbb).
version: 1.0.0
---

# 全球金融数据查询（Finnhub）

基于 [Finnhub REST API](https://finnhub.io/docs/api) 的全球金融数据查询技能。
覆盖股票报价、公司基本面、分析师评级、财报、市场新闻、外汇等数据，**不支持中国A股市场数据**。

---

## 1. 前置依赖

无额外依赖，仅需 Node.js 内置模块（`https`、`fs`、`path`、`os`）。

---

## 2. 配置说明

配置优先级：**`~/.hogagent/skills_config.json`（WebUI / RPC 统一写入）> 环境变量**。

```
value = skills_config.json["hog-finnhub"]["api-key" || "apiKey"] ?? process.env.ENV_VAR
```

> 推荐通过 **WebUI 技能配置界面** 设置 API Key（点击技能旁的配置按钮），配置将自动保存到 `skills_config.json`。

### 配置项

| 配置字段 | 环境变量 | 说明 |
|---|---|---|
| `api-key`（WebUI）/ `apiKey`（兼容） | `FINNHUB_API_KEY` | Finnhub API 密钥（**必填**） |

### API 密钥获取

1. 访问 https://finnhub.io/register 注册免费账号
2. 登录后在 Dashboard 中获取 API Key
3. 免费套餐限制：**每分钟 60 次 API 调用**，超出返回 HTTP 429（脚本内置指数退避重试）

### 配置示例

**方式一：WebUI 技能配置（推荐）**

在 WebUI 技能管理界面，点击本技能的配置按钮，输入 API Key 并保存。

**方式二：手动编辑配置文件**

直接编辑 `~/.hogagent/skills_config.json`，添加本技能约定的 key：

```json
{
  "hog-finnhub": {
    "api-key": "your-finnhub-api-key"
  }
}
```

**方式三：环境变量**

```bash
export FINNHUB_API_KEY="your-finnhub-api-key"
```

---

## 3. 速率限制说明

| 套餐 | 调用限制 | 说明 |
|---|---|---|
| 免费 | 60 次/分钟 | 适合一般查询场景，批量查询需注意间隔 |
| 付费 | 更高额度 | 详见 https://finnhub.io/pricing |

- 脚本在收到 HTTP 429 响应时，自动执行**指数退避重试**（最多 1 次，间隔 1s→2s）
- 建议在高频调用场景中，合理分散请求时间，避免集中触发限流

---

## 4. Tools 字典

**统一执行方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

**通用参数 `fields`**：所有 Tool 均支持传入 `fields`（类型 `string[]`），用于裁剪响应字段以节约 Token。

---

### Tool-1: 实时股票报价 (`getQuote`)

**适用**：查询任意全球股票的实时价格、涨跌幅、成交量。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 股票代码，如 `AAPL`、`TSLA`、`MSFT` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**响应字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `c` | number | 当前价格 |
| `d` | number | 价格变动（绝对值） |
| `dp` | number | 价格变动（百分比） |
| `h` | number | 当日最高价 |
| `l` | number | 当日最低价 |
| `o` | number | 开盘价 |
| `pc` | number | 昨日收盘价 |
| `t` | number | 时间戳（Unix秒） |

---

### Tool-2: 公司概况 (`getCompanyProfile`)

**适用**：查询上市公司基本信息——行业、市值、交易所、上市国家、Logo URL。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 股票代码 |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**响应字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `country` | string | 上市国家 |
| `currency` | string | 报价货币 |
| `exchange` | string | 交易所代码 |
| `name` | string | 公司名称 |
| `ticker` | string | 股票代码 |
| `ipo` | string | IPO 日期 |
| `marketCapitalization` | number | 市值（百万美元） |
| `shareOutstanding` | number | 流通股数（百万股） |
| `logo` | string | 公司 Logo URL |
| `weburl` | string | 公司官网 |
| `finnhubIndustry` | string | 所属行业 |

---

### Tool-3: 财务指标快照 (`getFinancials`)

**适用**：查询公司关键财务指标快照——市盈率、市净率、52 周高低、Beta、股息率等当前值。

> 注意：本接口返回的是当前时点的**关键指标快照**（单一扁平对象），不是完整的财务报表（利润表/资产负债表/现金流量表）。如需完整财务报表数据，请使用其他数据源。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 股票代码 |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

> 内部自动注入 `metric=all`，返回全部可用财务指标。

---

### Tool-4: 分析师评级 (`getRecommendations`)

**适用**：查询分析师对股票的评级趋势——买入/持有/卖出数量及目标价。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 股票代码 |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**响应字段（数组，每条为一个月份的汇总）**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `period` | string | 月份，`YYYY-MM-DD` |
| `strongBuy` | int | 强烈买入数量 |
| `buy` | int | 买入数量 |
| `hold` | int | 持有数量 |
| `sell` | int | 卖出数量 |
| `strongSell` | int | 强烈卖出数量 |

---

### Tool-5: 盈利预期 (`getEarnings`)

**适用**：查询公司历史实际 EPS vs 预期 EPS，以及惊喜幅度。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 股票代码 |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**响应字段（数组）**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `actual` | number | 实际 EPS |
| `estimate` | number | 预期 EPS |
| `hour` | string | 报告时间（BMO=开盘前，AMC=收盘后） |
| `quarter` | int | 季度（1-4） |
| `surprise` | number | EPS 惊喜幅度 |
| `surprisePercent` | number | 惊喜百分比 |
| `symbol` | string | 股票代码 |
| `year` | int | 年份 |

---

### Tool-6: 内部人士交易 (`getInsiderTransactions`)

**适用**：查询公司高管/大股东的买卖记录。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 股票代码 |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-7: 市场新闻 (`getMarketNews`)

**适用**：查询市场新闻。传入 `symbol` 时返回该公司相关新闻（路由至 `/company-news`），否则返回通用市场新闻（路由至 `/news`）。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `category` | string | 否 | 新闻类别（无 symbol 时有效）：`general`（默认）、`forex`、`crypto`、`merger` |
| `symbol` | string | 否 | 股票代码（传入时自动路由至公司新闻端点，此时 category 无效） |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-8: 经济日历 (`getEconomicCalendar`)

**适用**：查询重要经济数据发布时间（非农、GDP、央行决议等）。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `from` | string | 否 | 起始日期，`YYYY-MM-DD` |
| `to` | string | 否 | 结束日期，`YYYY-MM-DD` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-9: 外汇汇率 (`getForexRates`)

**适用**：查询外汇汇率（base 货币对全球主要货币）。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `base` | string | 否 | 基础货币代码，默认 `USD` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-10: 加密货币报价 (`getCryptoQuote`)

**适用**：查询加密货币实时价格。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 加密货币代码，格式：`交易所:交易对`，如 `BINANCE:BTCUSDT`、`COINBASE:BTC-USD` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**常用代码**：

| 代码 | 说明 |
|---|---|
| `BINANCE:BTCUSDT` | 比特币（USDT 计价） |
| `BINANCE:ETHUSDT` | 以太坊（USDT 计价） |
| `COINBASE:BTC-USD` | 比特币（USD 计价，Coinbase） |

---

### Tool-11: 股票代码搜索 (`searchSymbol`)

**适用**：按关键词搜索全球股票代码（模糊匹配）。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `q` | string | 是 | 搜索关键词（公司名称或代码片段） |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**响应字段（数组）**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `description` | string | 公司/证券描述 |
| `displaySymbol` | string | 显示用代码 |
| `symbol` | string | 完整代码（可直接用于其他接口） |
| `type` | string | 证券类型（Common Stock、ETP 等） |

---

## 5. 错误处理

| 错误类型 | 处理方式 |
|---|---|
| API Key 未配置 | 报错提示配置方式（WebUI 技能配置 / 环境变量） |
| HTTP 401/403 | API Key 无效，请检查密钥是否正确 |
| HTTP 429 | 速率限制，脚本自动重试（最多 1 次，指数退避） |
| HTTP 4xx | 检查参数格式（symbol 代码是否正确、日期格式是否为 YYYY-MM-DD） |
| HTTP 5xx | 服务端错误，建议稍后重试 |
| 连接超时 | 检查网络连通性 |

---

## 6. 与其他 Skill 的边界与路由

| 数据类型 | 优先技能 | 条件 |
|---|---|---|
| 期权数据（链、到期日、Greeks） | `hog-openbb` | 始终优先 |
| 宏观经济数据（全球/美国） | `hog-openbb` | 始终优先 |
| 股票报价/基本面/财报 | **本 skill**（`hog-finnhub`） | API Key 有效时优先 |
| 市场新闻/分析师评级 | **本 skill**（`hog-finnhub`） | API Key 有效时优先 |
| 外汇/加密货币 | **本 skill**（`hog-finnhub`） | API Key 有效时优先 |
| 中国 A 股数据 | `hedgehog-company-index-data` / `hedgehog-macro-industry-data` | 不使用本技能 |

**降级策略**：若本技能的 API Key 未配置或调用返回 401/403，应降级至 `hog-openbb`（需 OpenBB 服务可用且对应 provider 已配置）。

> Resolve `./scripts/*` to absolute paths using this SKILL.md's directory (shown in system prompt `available_skills`).
> Output is JSON to stdout; redirect to session task dir if needed.
