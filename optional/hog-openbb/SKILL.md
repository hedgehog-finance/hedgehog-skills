---
name: hog-openbb
description: >
  Global financial data via OpenBB Platform: macro economics (FRED), treasury yields,
  options chains/expiry, global indices, forex, commodities. Excludes China A-shares.
  Priority for: macro data, options, FRED indicators.
  Triggers: GDP, CPI, unemployment, federal funds rate, options chain, Greeks, treasury yield,
  economic calendar, stock index, forex, commodity, gold, crude oil.
  NOT for: China A-shares (use hedgehog-company-index-data).
version: 1.0.1
---

# 全球金融数据查询（OpenBB Platform）

基于 [OpenBB Platform](https://github.com/OpenBB-finance/OpenBB) 的全球金融数据查询技能。
覆盖宏观经济、期权链、全球指数、外汇、大宗商品等数据，**不支持中国A股市场数据**。

---

## 1. 前置依赖

```bash
pip install openbb[all]
```

> 脚本自动管理 `openbb-api` 服务的启停（首次调用时自动启动，空闲 30 分钟后自动关闭），无需手动启动。

---

## 2. 配置说明

配置优先级：**`~/.hogagent/skills_config.json`（WebUI / RPC 统一写入）> 环境变量 > 默认值**。

```
value = skills_config.json["hog-openbb"][field] ?? process.env.ENV_VAR ?? defaultValue
```

> 推荐通过 **WebUI 技能配置界面** 设置配置项（点击技能旁的配置按钮），配置将自动保存到 `skills_config.json`。
> 脚本同时兼容 camelCase（如 `fredApiKey`）和 kebab-case（如 `fred-api-key`，WebUI 格式）两种 key 名。

### 核心配置项

| 配置字段 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| `api-url` / `apiUrl` | `OPENBB_API_URL` | `http://localhost:59201` | OpenBB API 服务地址 |
| `idle-timeout-ms` / `idleTimeoutMs` | `OPENBB_IDLE_TIMEOUT_MS` | `1800000`（30 分钟） | 空闲自动关闭时间（毫秒） |

### 免费数据源 API Key

| 配置字段 | 环境变量 | 说明 | 获取地址 |
|---|---|---|---|
| `fred-api-key` / `fredApiKey` | `OPENBB_FRED_API_KEY` | FRED 宏观经济数据 | https://fred.stlouisfed.org/docs/api/api_key.html |
| `alpha-vantage-api-key` / `alphaVantageApiKey` | `OPENBB_ALPHA_VANTAGE_API_KEY` | Alpha Vantage 股票/外汇数据 | https://www.alphavantage.co/support/#api-key |
| `twelve-data-api-key` / `twelveDataApiKey` | `OPENBB_TWELVE_DATA_API_KEY` | Twelve Data 实时行情 | https://twelvedata.com/account |

### 付费数据源 API Key（可选）

| 配置字段 | 环境变量 | 说明 | 获取地址 |
|---|---|---|---|
| `polygon-api-key` / `polygonApiKey` | `OPENBB_POLYGON_API_KEY` | Polygon 股票/期权数据 | https://polygon.io/ |
| `intrinio-api-key` / `intrinioApiKey` | `OPENBB_INTRINIO_API_KEY` | Intrinio 基本面数据 | https://intrinio.com/ |
| `tiingo-api-token` / `tiingoApiToken` | `OPENBB_TIINGO_API_TOKEN` | Tiingo 新闻/行情数据 | https://api.tiingo.com/ |

### 配置示例

**方式一：WebUI 技能配置（推荐）**

在 WebUI 技能管理界面，点击本技能的配置按钮，添加以下自定义配置项：

| Key | Value |
|---|---|
| `fred-api-key` | your-fred-api-key |
| `alpha-vantage-api-key` | your-av-api-key |
| `polygon-api-key` | your-polygon-api-key |

**方式二：手动编辑配置文件**

直接编辑 `~/.hogagent/skills_config.json`，在 `hog-openbb` 节点下添加本技能约定的 key：

```json
{
  "hog-openbb": {
    "fred-api-key": "your-fred-api-key",
    "alpha-vantage-api-key": "your-av-api-key",
    "polygon-api-key": "your-polygon-api-key"
  }
}
```

**方式三：环境变量**

```bash
export OPENBB_API_URL="http://localhost:59201"
export OPENBB_FRED_API_KEY="your-fred-api-key"
export OPENBB_ALPHA_VANTAGE_API_KEY="your-av-api-key"
export OPENBB_POLYGON_API_KEY="your-polygon-api-key"
```

---

## 3. 服务生命周期管理

OpenBB API 服务（`openbb-api`）为 Python 进程，**由脚本自动管理**：

- **自动启动**：首次调用 `call_api.js` 时，若服务未运行则自动拉起
- **自动关闭**：最后一次调用后 30 分钟（可配置）无新请求，自动终止
- **状态文件**（自动创建于技能根目录，`.` 开头隐藏）：
  - `.openbb_server.pid` — 服务进程 PID
  - `.openbb_watchdog.pid` — 看门狗进程 PID
  - `.openbb_last_used` — 最后调用时间戳

### 手动管理命令

```bash
node scripts/server_manager.js start    # 手动启动
node scripts/server_manager.js stop     # 手动停止
node scripts/server_manager.js status   # 查看运行状态（JSON 输出）
```

---

## 4. Tools 字典

**统一执行方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

**通用参数 `fields`**：所有 Tool 均支持传入 `fields`（类型 `string[]`），用于裁剪响应字段以节约 Token。

---

### Tool-1: 宏观经济指标 (`getMacroIndicators`)

**适用**：GDP、CPI、失业率、联邦基金利率、工业产出等 FRED 宏观指标。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 否 | FRED 指标代码，如 `GDP`、`CPIAUCSL`、`UNRATE`、`FEDFUNDS` |
| `provider` | string | 否 | 数据提供商，默认 `fred` |
| `start_date` | string | 否 | 起始日期，`YYYY-MM-DD` |
| `end_date` | string | 否 | 结束日期，`YYYY-MM-DD` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**常用 symbol 代码**：

| 代码 | 说明 |
|---|---|
| `GDP` | 美国 GDP（季度） |
| `CPIAUCSL` | 美国 CPI（城市消费者，季调） |
| `UNRATE` | 美国失业率 |
| `FEDFUNDS` | 联邦基金有效利率 |
| `INDPRO` | 工业生产指数 |
| `PAYEMS` | 非农就业总人数 |
| `PCEPI` | 个人消费支出价格指数 |

---

### Tool-2: 美国国债收益率 (`getTreasuryYields`)

**适用**：美国国债收益率曲线，各期限利率。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `provider` | string | 否 | 数据提供商，默认 `fred` |
| `start_date` | string | 否 | 起始日期，`YYYY-MM-DD` |
| `end_date` | string | 否 | 结束日期，`YYYY-MM-DD` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-3: 全球经济日历 (`getEconomicCalendar`)

**适用**：全球重要经济数据发布时间、预期值与实际值。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `start_date` | string | 否 | 起始日期，`YYYY-MM-DD` |
| `end_date` | string | 否 | 结束日期，`YYYY-MM-DD` |
| `provider` | string | 否 | 数据提供商 |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-4: 期权链数据 (`getOptionChains`)

**适用**：指定期权的完整链数据——行权价、到期日、隐含波动率、Greeks（Delta/Gamma/Theta/Vega）。
**优先使用本 Tool 查询期权数据**（优于 hog-finnhub）。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 股票代码，如 `AAPL`、`TSLA` |
| `provider` | string | 否 | 数据提供商，如 `polygon`、`intrinio` |
| `expiration` | string | 否 | 到期日过滤，`YYYY-MM-DD` |
| `option_type` | string | 否 | `call` 或 `put` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-5: 期权到期日 (`getOptionExpiry`)

**适用**：查询某股票所有可用期权到期日列表。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 是 | 股票代码，如 `AAPL` |
| `provider` | string | 否 | 数据提供商 |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-6: 全球股指行情 (`getGlobalIndices`)

**适用**：标普 500、纳斯达克、道琼斯等主要股指实时/历史行情。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 否 | 指数代码，如 `^GSPC`（标普500）、`^IXIC`（纳斯达克） |
| `provider` | string | 否 | 数据提供商 |
| `start_date` | string | 否 | 起始日期，`YYYY-MM-DD` |
| `end_date` | string | 否 | 结束日期，`YYYY-MM-DD` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**常用指数代码**：

| 代码 | 说明 |
|---|---|
| `^GSPC` | 标普 500 |
| `^IXIC` | 纳斯达克综合指数 |
| `^DJI` | 道琼斯工业平均指数 |
| `^RUT` | 罗素 2000 小盘股指数 |
| `^VIX` | CBOE 波动率指数（VIX） |

---

### Tool-7: 外汇汇率 (`getForexRates`)

**适用**：主要货币对汇率数据。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 否 | 货币对代码，如 `EURUSD`、`USDJPY` |
| `provider` | string | 否 | 数据提供商 |
| `start_date` | string | 否 | 起始日期，`YYYY-MM-DD` |
| `end_date` | string | 否 | 结束日期，`YYYY-MM-DD` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

---

### Tool-8: 大宗商品价格 (`getCommodityPrices`)

**适用**：原油、黄金、白银、天然气等大宗商品价格。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `symbol` | string | 否 | 商品代码，如 `CL`（原油）、`GC`（黄金） |
| `provider` | string | 否 | 数据提供商 |
| `start_date` | string | 否 | 起始日期，`YYYY-MM-DD` |
| `end_date` | string | 否 | 结束日期，`YYYY-MM-DD` |
| `fields` | string[] | 否 | 仅保留响应中指定字段 |

**常用商品代码（FRED）**：

| 代码 | 说明 |
|---|---|
| `DCOILWTICO` | WTI 原油现货价 |
| `DCOILBRENTEU` | 布伦特原油现货价 |
| `GOLDAMGBD228NLBM` | 黄金现货价（伦敦） |
| `SILVER` | 白银现货价 |
| `DHHNGSP` | 天然气现货价 |

---

## 5. 错误处理

| 错误类型 | 处理方式 |
|---|---|
| openbb-api 命令不存在 | 提示安装：`pip install openbb[all]` |
| 服务启动超时（15s） | 检查端口 59201 是否被占用，或 Python 环境是否正确 |
| HTTP 4xx | 检查参数格式与 provider 是否配置正确 |
| HTTP 5xx | 提示服务端错误，建议稍后重试或 `node scripts/server_manager.js stop` 后重启 |
| 数据源 API Key 未配置 | 返回空数据或报错，需通过 WebUI 技能配置或环境变量配置对应 Key |

---

## 6. 与其他 Skill 的边界与路由

| 数据类型 | 优先技能 | 条件 |
|---|---|---|
| 期权数据（链、到期日、Greeks） | **本 skill**（`hog-openbb`） | 始终优先 |
| 宏观经济数据（全球/美国） | **本 skill**（`hog-openbb`） | 始终优先 |
| 股票报价/基本面/财报 | `hog-finnhub` | API Key 有效时优先 |
| 市场新闻/分析师评级 | `hog-finnhub` | API Key 有效时优先 |
| 外汇/加密货币 | `hog-finnhub` | API Key 有效时优先 |
| 中国 A 股数据 | `hedgehog-company-index-data` / `hedgehog-macro-industry-data` | 不使用本技能 |

**降级策略**：若 `hog-finnhub` 的 API Key 未配置或调用返回 401/403，可降级至本技能查询（需 OpenBB 服务可用且对应 provider 已配置）。

> Resolve `./scripts/*` to absolute paths using this SKILL.md's directory (shown in system prompt `available_skills`).
> Output is JSON to stdout; redirect to session task dir if needed.
