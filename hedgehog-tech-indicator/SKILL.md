---
name: hedgehog-tech-indicator
description: >
  技术指标计算 Skill：覆盖 SMA、EMA、RSI、MACD、BOLL（布林带）、OBV、KDJ、ATR、VWAP 共 9 个常用指标，
  每个指标提供两种调用方式 ——
  ① 自带数据计算（调用方传入行情数组）；
  ② 服务端数据计算（按股票代码与日期区间，由服务端从 ciweiai-data 拉取行情后计算）。
  触发词：均线/SMA/EMA、RSI、MACD、布林带/BOLL、能量潮/OBV、KDJ、ATR、VWAP；
  计算指标、技术指标、前复权指标。
  不适用：行情数据查询（请使用 hedgehog-company-index-data）。
version: 1.0
---

# 技术指标 Skill

## 脚本位置
```
scripts/
├── call-api-calculate.js              // POST /v1/indicators/calculate            （自带数据计算）
└── call-api-calculate-from-data.js    // POST /v1/indicators/calculate-from-data （服务端数据计算）
```

## 全局约定
- **Base URL**：`https://api.ciweiai.com/api/utils/v1`，可通过环境变量 `CALC_API_BASE_URL` 覆盖。
- **请求/响应**：均为 `application/json`；输入字段原样透传，不做任何业务转换。
- **参数小数化**：百分比/比例字段统一传小数（如 `0.05` 表示 5%）。
- **`params` 覆盖规则**：仅传需要覆盖的键；传入未知键直接返回 400。
- **错误约定**：
  - `400 {"error": "..."}` — 请求体校验失败或计算异常（指标名错误、缺必需字段、未知 params 键等）。
  - `200 {"error": "..."}` — 部分接口对无效业务输入直接返回错误对象，调用方需在业务层判断。

### 全局参数：`data[]` 行字段（自带数据计算使用）

自带数据计算（`call-api-calculate.js`）的 `data[]` 列结构如下；服务端数据计算（`call-api-calculate-from-data.js`）由服务端自动构造同结构行，调用方无需感知。

| 字段 | 类型 | 是否必需 | 含义 |
|------|------|----------|------|
| `date` | string\|null | 建议提供 | 行情日期或时间，建议 `YYYY-MM-DD`。若所有行日期可解析，服务端会按日期升序排序。 |
| `open` | number\|null | 按指标而定 | 开盘价。 |
| `high` | number\|null | 按指标而定 | 最高价。 |
| `low` | number\|null | 按指标而定 | 最低价。 |
| `close` | number\|null | 按指标而定 | 收盘价，大多数价格指标使用。 |
| `volume` | number\|null | 按指标而定 | 成交量，成交量类指标使用。 |
| `benchmark` | number\|null | `beta`/`correl` 必需 | 基准序列，例如指数收盘价。 |
| `series_a` | number\|null | 数学类指标必需 | `add`、`sub`、`crossover` 的第一个序列。 |
| `series_b` | number\|null | 数学类指标必需 | `add`、`sub`、`crossover` 的第二个序列。 |

### 服务端数据计算公共参数

服务端数据计算（`call-api-calculate-from-data.js`）所有 Tool 共用下列请求参数；各 Tool 仅 `indicator` 与 `params` 不同。

| 字段 | 类型 | 必填 | 默认值 | 含义 |
|------|------|------|--------|------|
| `stock_code` | string | 是 | — | 股票代码，例如 `000001.SZ` |
| `start_date` | string(YYYY-MM-DD) | 是 | — | 开始日期 |
| `end_date` | string(YYYY-MM-DD) | 是 | — | 结束日期，不能早于 `start_date` |
| `indicator` | string | 是 | — | 指标名（每个 Tool 固定）|
| `params` | object | 否 | `{}` | 指标参数覆盖，仅允许该指标 `default_params` 中存在的键 |
| `price_adjustment` | string | 否 | `none` | `none` 走 `/stock/daily`；`forward` 走 `/stock/forward-adjusted` 前复权（前复权接口不返回 `volume`）|
| `benchmark_stock_code` | string\|null | 否 | `null` | `beta`/`correl` 等需要 `benchmark` 的指标必传（本 Skill 9 个指标暂未使用）|
| `limit` | integer | 否 | `1000` | 走 `/stock/daily` 时的条数限制，范围 1~1000；前复权接口当前不使用 |

### 通用返回字段

两种调用方式返回结构基本一致；服务端数据计算额外多一个 `source` 字段。

| 字段 | 类型 | 含义 |
|------|------|------|
| `indicator` | string | 规范化后的指标名 |
| `category` | string | 指标类别（`overlap`/`momentum`/`volatility`/`volume`/`trend`/...）|
| `params` | object | 实际用于计算的参数 = 默认参数 + 调用方覆盖项 |
| `output_columns` | string[] | 本次计算输出的列名 |
| `data[]` | object[] | 逐行计算结果，每行包含 `date`（或 `index`）以及所有输出列 |
| `latest` | object\|null | 从后向前找到的首条所有输出列均非空的记录；数据量不足时可能为 `null` |
| `source` | object | **仅服务端数据计算返回**，含 `service`、`endpoint`、`db_source`、`stock_code`、`start_date`、`end_date`、`price_adjustment`、`rows` |

---

## SMA 简单移动平均

- **指标名**：`sma`
- **类别**：overlap
- **默认参数（`default_params`）**：`{ "length": 10, "talib": true }`
- **必需字段**：`close`
- **输出列**：`SMA_{length}`（如默认输出 `SMA_10`）

### Tool-1: SMA · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"sma",
  "data":[
    {"date":"2026-05-18","close":12.10},
    {"date":"2026-05-19","close":12.35},
    {"date":"2026-05-20","close":12.42},
    {"date":"2026-05-21","close":12.30},
    {"date":"2026-05-22","close":12.58}
  ],
  "params":{"length":3}
}'
```

**返回示例**：
```json
{
  "indicator": "sma",
  "category": "overlap",
  "params": { "length": 3, "talib": true },
  "output_columns": ["SMA_3"],
  "data": [
    {"date": "2026-05-20", "SMA_3": 12.29},
    {"date": "2026-05-21", "SMA_3": 12.356667},
    {"date": "2026-05-22", "SMA_3": 12.433333}
  ],
  "latest": { "date": "2026-05-22", "SMA_3": 12.433333 }
}
```

### Tool-2: SMA · 服务端数据计算

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-05-01",
  "end_date":"2026-05-22",
  "indicator":"sma",
  "params":{"length":5},
  "price_adjustment":"forward"
}'
```

**返回示例**：
```json
{
  "indicator": "sma",
  "category": "overlap",
  "params": { "length": 5, "talib": true },
  "output_columns": ["SMA_5"],
  "data": [
    {"date": "2026-05-21", "SMA_5": 12.27},
    {"date": "2026-05-22", "SMA_5": 12.35}
  ],
  "latest": { "date": "2026-05-22", "SMA_5": 12.35 },
  "source": {
    "service": "ciweiai-data",
    "endpoint": "/stock/forward-adjusted",
    "stock_code": "000001.SZ",
    "start_date": "2026-05-01",
    "end_date": "2026-05-22",
    "price_adjustment": "forward",
    "rows": 15
  }
}
```

---

## EMA 指数移动平均

- **指标名**：`ema`
- **类别**：overlap
- **默认参数**：`{ "length": 10, "talib": true }`
- **必需字段**：`close`
- **输出列**：`EMA_{length}`

### Tool-3: EMA · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"ema",
  "data":[
    {"date":"2026-05-18","close":12.10},
    {"date":"2026-05-19","close":12.35},
    {"date":"2026-05-20","close":12.42},
    {"date":"2026-05-21","close":12.30},
    {"date":"2026-05-22","close":12.58}
  ],
  "params":{"length":3}
}'
```

**返回示意**：
```json
{
  "indicator": "ema",
  "category": "overlap",
  "params": { "length": 3, "talib": true },
  "output_columns": ["EMA_3"],
  "data": [ "..." ],
  "latest": { "date": "2026-05-22", "EMA_3": 12.45 }
}
```

### Tool-4: EMA · 服务端数据计算

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-04-01",
  "end_date":"2026-05-22",
  "indicator":"ema",
  "params":{"length":12},
  "price_adjustment":"forward"
}'
```

---

## RSI 相对强弱指数

- **指标名**：`rsi`
- **类别**：momentum
- **默认参数**：`{ "length": 14, "scalar": 100, "drift": 1 }`
- **必需字段**：`close`
- **输出列**：`RSI_{length}`（如 `RSI_14`）
- **判读**：取值 0~100；`>70` 超买，`<30` 超卖。

### Tool-5: RSI · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"rsi",
  "data":[
    {"date":"2026-05-08","close":11.80},
    {"date":"2026-05-09","close":11.95},
    {"date":"2026-05-12","close":12.10},
    {"date":"2026-05-13","close":12.05},
    {"date":"2026-05-14","close":12.22},
    {"date":"2026-05-15","close":12.18},
    {"date":"2026-05-16","close":12.30},
    {"date":"2026-05-19","close":12.35},
    {"date":"2026-05-20","close":12.42},
    {"date":"2026-05-21","close":12.30},
    {"date":"2026-05-22","close":12.58},
    {"date":"2026-05-23","close":12.66},
    {"date":"2026-05-26","close":12.70},
    {"date":"2026-05-27","close":12.62},
    {"date":"2026-05-28","close":12.78}
  ],
  "params":{"length":14}
}'
```

### Tool-6: RSI · 服务端数据计算

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-03-01",
  "end_date":"2026-05-22",
  "indicator":"rsi",
  "params":{"length":14},
  "price_adjustment":"forward"
}'
```

**返回示意**：
```json
{
  "indicator": "rsi",
  "category": "momentum",
  "params": { "length": 14, "scalar": 100, "drift": 1 },
  "output_columns": ["RSI_14"],
  "latest": { "date": "2026-05-22", "RSI_14": 62.35 }
}
```

---

## MACD 平滑异同移动平均

- **指标名**：`macd`
- **类别**：momentum
- **默认参数**：`{ "fast": 12, "slow": 26, "signal": 9, "talib": true }`
- **必需字段**：`close`
- **输出列**：`MACD_{fast}_{slow}_{signal}`（DIF）、`MACDh_{fast}_{slow}_{signal}`（柱）、`MACDs_{fast}_{slow}_{signal}`（DEA 信号线）
- **判读**：`MACD` 与 `MACDs` 金叉/死叉、`MACDh` 由负转正等判断趋势转折。

### Tool-7: MACD · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"macd",
  "data":[
    {"date":"2026-04-01","close":11.20},
    {"date":"2026-04-02","close":11.30},
    {"date":"...","close":12.00},
    {"date":"2026-05-22","close":12.58}
  ],
  "params":{"fast":12,"slow":26,"signal":9}
}'
```

> 提示：MACD 需要至少 `slow + signal` 根以上 K 线才会出现非空值，建议传入 60 根以上数据。

### Tool-8: MACD · 服务端数据计算

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-01-01",
  "end_date":"2026-05-22",
  "indicator":"macd",
  "params":{"fast":12,"slow":26,"signal":9},
  "price_adjustment":"forward"
}'
```

**返回示意**：
```json
{
  "indicator": "macd",
  "category": "momentum",
  "params": { "fast": 12, "slow": 26, "signal": 9, "talib": true },
  "output_columns": ["MACD_12_26_9", "MACDh_12_26_9", "MACDs_12_26_9"],
  "latest": {
    "date": "2026-05-22",
    "MACD_12_26_9": 0.182,
    "MACDh_12_26_9": 0.046,
    "MACDs_12_26_9": 0.136
  }
}
```

---

## BOLL 布林带（`bbands`）

- **指标名**：`bbands`
- **类别**：volatility
- **默认参数**：`{ "length": 5, "std": 2, "ddof": 0, "mamode": "SMA", "talib": true }`
- **必需字段**：`close`
- **输出列**：`BBL_{length}_{std}`（下轨）、`BBM_{length}_{std}`（中轨）、`BBU_{length}_{std}`（上轨）、`BBB_{length}_{std}`（带宽）、`BBP_{length}_{std}`（%B）
- **判读**：股价触及上/下轨可能反转；带宽 `BBB` 收窄后扩张常伴随突破行情。

### Tool-9: BOLL · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"bbands",
  "data":[
    {"date":"2026-05-12","close":12.05},
    {"date":"2026-05-13","close":12.10},
    {"date":"2026-05-14","close":12.22},
    {"date":"2026-05-15","close":12.18},
    {"date":"2026-05-16","close":12.30},
    {"date":"2026-05-19","close":12.35},
    {"date":"2026-05-20","close":12.42},
    {"date":"2026-05-21","close":12.30},
    {"date":"2026-05-22","close":12.58}
  ],
  "params":{"length":20,"std":2}
}'
```

### Tool-10: BOLL · 服务端数据计算

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-03-01",
  "end_date":"2026-05-22",
  "indicator":"bbands",
  "params":{"length":20,"std":2},
  "price_adjustment":"forward"
}'
```

**返回示意**：
```json
{
  "indicator": "bbands",
  "category": "volatility",
  "params": { "length": 20, "std": 2, "ddof": 0, "mamode": "SMA", "talib": true },
  "output_columns": ["BBL_20_2","BBM_20_2","BBU_20_2","BBB_20_2","BBP_20_2"],
  "latest": {
    "date": "2026-05-22",
    "BBL_20_2": 11.92,
    "BBM_20_2": 12.34,
    "BBU_20_2": 12.76,
    "BBB_20_2": 6.81,
    "BBP_20_2": 0.78
  }
}
```

---

## OBV 能量潮

- **指标名**：`obv`
- **类别**：volume
- **默认参数**：`{ "talib": true }`
- **必需字段**：`close`、`volume`
- **输出列**：`OBV`
- **判读**：累积成交量；OBV 与价格同步创新高为放量上行，背离时警惕反转。

### Tool-11: OBV · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"obv",
  "data":[
    {"date":"2026-05-18","close":12.10,"volume":1820000},
    {"date":"2026-05-19","close":12.35,"volume":2160000},
    {"date":"2026-05-20","close":12.42,"volume":1980000},
    {"date":"2026-05-21","close":12.30,"volume":1530000},
    {"date":"2026-05-22","close":12.58,"volume":2450000}
  ]
}'
```

### Tool-12: OBV · 服务端数据计算

> 注意：OBV 需要 `volume`，**必须**使用 `price_adjustment:"none"`（前复权接口不返回成交量）。

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-04-01",
  "end_date":"2026-05-22",
  "indicator":"obv",
  "price_adjustment":"none",
  "limit":1000
}'
```

**返回示意**：
```json
{
  "indicator": "obv",
  "category": "volume",
  "params": { "talib": true },
  "output_columns": ["OBV"],
  "latest": { "date": "2026-05-22", "OBV": 38560000 }
}
```

---

## KDJ 随机指标

- **指标名**：`kdj`
- **类别**：momentum
- **默认参数**：`{ "length": 9, "signal": 3 }`
- **必需字段**：`high`、`low`、`close`
- **输出列**：`K_{length}_{signal}`、`D_{length}_{signal}`、`J_{length}_{signal}`（如 `K_9_3`、`D_9_3`、`J_9_3`）
- **判读**：J<0 严重超卖、J>100 严重超买；K 上穿 D 为金叉。

### Tool-13: KDJ · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"kdj",
  "data":[
    {"date":"2026-05-12","high":12.18,"low":11.95,"close":12.05},
    {"date":"2026-05-13","high":12.25,"low":12.00,"close":12.10},
    {"date":"2026-05-14","high":12.35,"low":12.08,"close":12.22},
    {"date":"2026-05-15","high":12.30,"low":12.10,"close":12.18},
    {"date":"2026-05-16","high":12.45,"low":12.18,"close":12.30},
    {"date":"2026-05-19","high":12.50,"low":12.22,"close":12.35},
    {"date":"2026-05-20","high":12.55,"low":12.30,"close":12.42},
    {"date":"2026-05-21","high":12.48,"low":12.20,"close":12.30},
    {"date":"2026-05-22","high":12.70,"low":12.32,"close":12.58}
  ],
  "params":{"length":9,"signal":3}
}'
```

### Tool-14: KDJ · 服务端数据计算

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-03-01",
  "end_date":"2026-05-22",
  "indicator":"kdj",
  "params":{"length":9,"signal":3},
  "price_adjustment":"forward"
}'
```

**返回示意**：
```json
{
  "indicator": "kdj",
  "category": "momentum",
  "params": { "length": 9, "signal": 3 },
  "output_columns": ["K_9_3", "D_9_3", "J_9_3"],
  "latest": {
    "date": "2026-05-22",
    "K_9_3": 72.4,
    "D_9_3": 65.1,
    "J_9_3": 87.0
  }
}
```

---

## ATR 平均真实波幅

- **指标名**：`atr`
- **类别**：volatility
- **默认参数**：`{ "length": 14, "mamode": "RMA", "talib": true }`
- **必需字段**：`high`、`low`、`close`
- **输出列**：`ATRr_{length}`（如 `ATRr_14`）
- **判读**：用于衡量波动幅度，常作止损 / 仓位单位设计的参考。

### Tool-15: ATR · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"atr",
  "data":[
    {"date":"2026-05-08","high":11.85,"low":11.70,"close":11.80},
    {"date":"2026-05-09","high":12.00,"low":11.80,"close":11.95},
    {"date":"...","high":12.55,"low":12.30,"close":12.42},
    {"date":"2026-05-22","high":12.70,"low":12.32,"close":12.58}
  ],
  "params":{"length":14}
}'
```

### Tool-16: ATR · 服务端数据计算

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-03-01",
  "end_date":"2026-05-22",
  "indicator":"atr",
  "params":{"length":14},
  "price_adjustment":"forward"
}'
```

**返回示意**：
```json
{
  "indicator": "atr",
  "category": "volatility",
  "params": { "length": 14, "mamode": "RMA", "talib": true },
  "output_columns": ["ATRr_14"],
  "latest": { "date": "2026-05-22", "ATRr_14": 0.286 }
}
```

---

## VWAP 成交量加权平均价

- **指标名**：`vwap`
- **类别**：overlap
- **默认参数**：`{ "anchor": "D" }`（`anchor` 控制重置周期，`D`=按日重置，`W`=按周，`M`=按月）
- **必需字段**：`high`、`low`、`close`、`volume`
- **输出列**：`VWAP_{anchor}`（如 `VWAP_D`）
- **判读**：股价位于 VWAP 上方多头占优；通常用日内或日频比较。

### Tool-17: VWAP · 自带数据计算

```
node scripts/call-api-calculate.js '{
  "indicator":"vwap",
  "data":[
    {"date":"2026-05-19","high":12.40,"low":12.20,"close":12.35,"volume":2160000},
    {"date":"2026-05-20","high":12.55,"low":12.30,"close":12.42,"volume":1980000},
    {"date":"2026-05-21","high":12.48,"low":12.20,"close":12.30,"volume":1530000},
    {"date":"2026-05-22","high":12.70,"low":12.32,"close":12.58,"volume":2450000}
  ]
}'
```

### Tool-18: VWAP · 服务端数据计算

> 注意：VWAP 需要 `volume`，**必须**使用 `price_adjustment:"none"`（前复权接口不返回成交量）。

```
node scripts/call-api-calculate-from-data.js '{
  "stock_code":"000001.SZ",
  "start_date":"2026-04-01",
  "end_date":"2026-05-22",
  "indicator":"vwap",
  "price_adjustment":"none",
  "limit":1000
}'
```

**返回示意**：
```json
{
  "indicator": "vwap",
  "category": "overlap",
  "params": { "anchor": "D" },
  "output_columns": ["VWAP_D"],
  "latest": { "date": "2026-05-22", "VWAP_D": 12.49 }
}
```

---

## 错误响应一览

| 状态码 | 场景 | 返回示例 |
|--------|------|----------|
| 400 | Pydantic 校验失败（字段缺失、类型错误、日期不可解析、`limit` 越界） | `{"error":"[{'type':'missing','loc':('body','indicator'),...}]"}` |
| 400 | 计算异常（指标名不支持、参数名不支持、数据缺必需字段、ciweiai-data 失败） | `{"error":"sma 需要字段: close"}` |
| 200 | 业务错误对象（少数场景） | `{"error":"..."}` |

脚本本身在 HTTP 非 2xx 时会以非 0 退出码退出，并把响应体打印到 stderr。

---

## 调用建议

1. **数据量保证**：传入数据长度建议 ≥ `params.length × 3`，避免大量 `null` 行；MACD 等多周期指标建议 ≥ 60 根。
2. **复权选择**：
   - 价格类指标（SMA/EMA/RSI/MACD/BOLL/KDJ/ATR）推荐 `price_adjustment:"forward"` 以消除分红/送股造成的价格跳变；
   - 成交量类指标（OBV/VWAP）必须用 `price_adjustment:"none"`。
3. **取最新值**：一般业务只关心 `latest` 字段；如需做形态判断或绘图请取整段 `data`。
4. **`params` 覆盖**：只传需要改动的键（如 `{"length":20}`），未知键会被服务端拒绝返回 400。
