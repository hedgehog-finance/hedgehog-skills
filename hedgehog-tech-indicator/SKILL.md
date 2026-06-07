---
name: hedgehog-tech-indicator
description: >
  技术指标计算 Skill：覆盖 SMA、EMA、RSI、MACD、BOLL、OBV、KDJ、ATR、VWAP 9 个常用指标。
  调用方式：① 自带数据计算（传行情数组）；② 服务端数据计算（按代码与日期从服务器缓存拉取）。
  触发词：均线/SMA/EMA、RSI、MACD、布林带/BOLL、能量潮/OBV、KDJ、ATR、VWAP、计算指标、技术指标、前复权指标。
  不适用：单纯行情数据查询（用 hedgehog-company-index-data）。
version: 1.0.1
---

# 技术指标 Skill

## 脚本位置
```text
scripts/
├── call-api-calculate.js              // （自带数据计算）
└── call-api-calculate-from-data.js    // （服务端数据计算）
```

## 全局约定
- **请求/响应**：`application/json`；输入字段原样透传。
- **参数小数化**：比例/百分比统一传小数（如 5% 传 `0.05`）。
- **`params` 覆盖**：仅传需覆盖的键；未知键报 400。
- **错误约定**：
  - `400` — 校验失败或计算异常（缺字段、未知参数等）。
  - `200 {"error": "..."}` — 部分无效业务输入直接返回对象，需业务层判断。

### 全局参数：`data[]` 行字段（自带数据计算使用）
自带数据计算 `data[]` 结构如下（服务端计算由底层自动构造同构数据）：

| 字段 | 类型 | 是否必需 | 含义 |
|------|------|----------|------|
| `date` | string\| null | 建议提供 | 行情日期/时间(建议 `YYYY-MM-DD`)。服务端按日期升序排列。 |
| `open` | number\|null | 按指标而定 | 开盘价。 |
| `high` | number\|null | 按指标而定 | 最高价。 |
| `low` | number\|null | 按指标而定 | 最低价。 |
| `close` | number\|null | 按指标而定 | 收盘价，多数价格指标使用。 |
| `volume` | number\|null | 按指标而定 | 成交量，成交量类指标使用。 |
| `benchmark` | number\|null | `beta`/`correl` 必需 | 基准序列（如指数收盘价）。 |
| `series_a` | number\|null | 数学类指标必需 | `add`/`sub`/`crossover` 的首个序列。 |
| `series_b` | number\|null | 数学类指标必需 | `add`/`sub`/`crossover` 的第二序列。 |

### 服务端数据计算公共参数
各 Tool 仅 `indicator` 与 `params` 不同，其余共用以下参数：

| 字段 | 类型 | 必填 | 默认值 | 含义 |
|------|------|------|--------|------|
| `stock_code` | string | 是 | — | 股票代码（如 `000001.SZ`） |
| `start_date` | string(YYYY-MM-DD) | 是 | — | 开始日期 |
| `end_date` | string(YYYY-MM-DD) | 是 | — | 结束日期（不早于 `start_date`） |
| `indicator` | string | 是 | — | 指标名（按 Tool 固定）|
| `params` | object | 否 | `{}` | 参数覆盖（仅限 `default_params` 已有键） |
| `price_adjustment` | string | 否 | `none` | `none` 走 daily；`forward` 走前复权（前复权不返回 `volume`）|
| `benchmark_stock_code` | string\|null | 否 | `null` | 需 `benchmark` 指标必传|
| `limit` | integer | 否 | `1000` | 日K线行情条数限制(1~1000)；前复权接口不使用 |

### 通用返回字段
服务端数据计算额外多出 `source` 字段：

| 字段 | 类型 | 含义 |
|------|------|------|
| `indicator` | string | 规范化后的指标名 |
| `category` | string | 类别（`overlap`/`momentum`/`volatility`/`volume`等）|
| `params` | object | 实际计算参数（默认 + 调用方覆盖） |
| `output_columns` | string[] | 本次输出列名 |
| `data[]` | object[] | 逐行结果，含 `date` 及所有输出列 |
| `latest` | object\|null | 核心节点：首条输出列全非空记录（数据不足返回 `null`） |
| `source` | object | **仅服务端计算返回**（含 endpoint、数据量等元数据） |

---

## SMA 简单移动平均
- **指标名**：`sma` | **类别**：overlap | **必需**：`close`
- **默认参数**：`{ "length": 10, "talib": true }` | **输出列**：`SMA_{length}`

### Tool-1: SMA · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"sma", "data":[{"date":"2026-05-21","close":12.30}, {"date":"2026-05-22","close":12.58}], "params":{"length":3}}'
```
**返回示例**：
```json
{
  "indicator": "sma", "category": "overlap", "params": { "length": 3, "talib": true },
  "output_columns": ["SMA_3"],
  "data": [{"date": "2026-05-22", "SMA_3": 12.433333}],
  "latest": { "date": "2026-05-22", "SMA_3": 12.433333 }
}
```

### Tool-2: SMA · 服务端数据计算
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-05-01", "end_date":"2026-05-22", "indicator":"sma", "params":{"length":5}, "price_adjustment":"forward"}'
```
**返回示例**：
```json
{
  "indicator": "sma", "category": "overlap", "params": { "length": 5, "talib": true },
  "output_columns": ["SMA_5"],
  "latest": { "date": "2026-05-22", "SMA_5": 12.35 },
  "source": { "service": "ciweiai-data", "endpoint": "/stock/forward-adjusted", "rows": 15 }
}
```

---

## EMA 指数移动平均
- **指标名**：`ema` | **类别**：overlap | **必需**：`close`
- **默认参数**：`{ "length": 10, "talib": true }` | **输出列**：`EMA_{length}`

### Tool-3: EMA · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"ema", "data":[{"date":"2026-05-22","close":12.58}], "params":{"length":3}}'
```

### Tool-4: EMA · 服务端数据计算
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-04-01", "end_date":"2026-05-22", "indicator":"ema", "params":{"length":12}, "price_adjustment":"forward"}'
```

---

## RSI 相对强弱指数
- **指标名**：`rsi` | **类别**：momentum | **必需**：`close` | **判读**：`>70`超买，`<30`超卖
- **默认参数**：`{ "length": 14, "scalar": 100, "drift": 1 }` | **输出列**：`RSI_{length}`

### Tool-5: RSI · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"rsi", "data":[{"date":"2026-05-22","close":12.58}], "params":{"length":14}}'
```

### Tool-6: RSI · 服务端数据计算
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-03-01", "end_date":"2026-05-22", "indicator":"rsi", "params":{"length":14}, "price_adjustment":"forward"}'
```

---

## MACD 平滑异同移动平均
- **指标名**：`macd` | **类别**：momentum | **必需**：`close` | **判读**：趋势转折(金叉/死叉)
- **默认参数**：`{ "fast": 12, "slow": 26, "signal": 9, "talib": true }`
- **输出列**：`MACD_..`(DIF)、`MACDh_..`(柱)、`MACDs_..`(DEA)
- **提示**：需至少传入 `slow + signal`（建议 ≥60 根）K 线数据。

### Tool-7: MACD · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"macd", "data":[{"date":"2026-05-22","close":12.58}], "params":{"fast":12,"slow":26,"signal":9}}'
```

### Tool-8: MACD · 服务端数据计算
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-01-01", "end_date":"2026-05-22", "indicator":"macd", "params":{"fast":12,"slow":26,"signal":9}, "price_adjustment":"forward"}'
```

---

## BOLL 布林带
- **指标名**：`bbands` | **类别**：volatility | **必需**：`close` | **判读**：触轨反转；带宽收窄扩张伴随突破。
- **默认参数**：`{ "length": 5, "std": 2, "ddof": 0, "mamode": "SMA", "talib": true }`
- **输出列**：`BBL_..`(下)、`BBM_..`(中)、`BBU_..`(上)、`BBB_..`(带宽)、`BBP_..`(%B)

### Tool-9: BOLL · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"bbands", "data":[{"date":"2026-05-22","close":12.58}], "params":{"length":20,"std":2}}'
```

### Tool-10: BOLL · 服务端数据计算
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-03-01", "end_date":"2026-05-22", "indicator":"bbands", "params":{"length":20,"std":2}, "price_adjustment":"forward"}'
```

---

## OBV 能量潮
- **指标名**：`obv` | **类别**：volume | **必需**：`close`、`volume` | **判读**：累积成交量，量价背离警惕反转。
- **默认参数**：`{ "talib": true }` | **输出列**：`OBV`

### Tool-11: OBV · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"obv", "data":[{"date":"2026-05-22","close":12.58,"volume":2450000}]}'
```

### Tool-12: OBV · 服务端数据计算
> **铁律**：需 `volume` 字段，**必须**使用 `price_adjustment:"none"`。
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-04-01", "end_date":"2026-05-22", "indicator":"obv", "price_adjustment":"none"}'
```

---

## KDJ 随机指标
- **指标名**：`kdj` | **类别**：momentum | **必需**：`high`、`low`、`close` | **判读**：J<0超卖，J>100超买，K穿D金叉。
- **默认参数**：`{ "length": 9, "signal": 3 }` | **输出列**：`K_..`、`D_..`、`J_..`

### Tool-13: KDJ · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"kdj", "data":[{"date":"2026-05-22","high":12.7,"low":12.32,"close":12.58}], "params":{"length":9,"signal":3}}'
```

### Tool-14: KDJ · 服务端数据计算
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-03-01", "end_date":"2026-05-22", "indicator":"kdj", "params":{"length":9,"signal":3}, "price_adjustment":"forward"}'
```

---

## ATR 平均真实波幅
- **指标名**：`atr` | **类别**：volatility | **必需**：`high`、`low`、`close` | **判读**：衡量波动幅度（止损参考）。
- **默认参数**：`{ "length": 14, "mamode": "RMA", "talib": true }` | **输出列**：`ATRr_{length}`

### Tool-15: ATR · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"atr", "data":[{"date":"2026-05-22","high":12.70,"low":12.32,"close":12.58}], "params":{"length":14}}'
```

### Tool-16: ATR · 服务端数据计算
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-03-01", "end_date":"2026-05-22", "indicator":"atr", "params":{"length":14}, "price_adjustment":"forward"}'
```

---

## VWAP 成交量加权平均价
- **指标名**：`vwap` | **类别**：overlap | **必需**：`high`、`low`、`close`、`volume` | **判读**：股价居其上多头占优。
- **默认参数**：`{ "anchor": "D" }`（D=日重置，W=周，M=月） | **输出列**：`VWAP_{anchor}`

### Tool-17: VWAP · 自带数据计算
```bash
node scripts/call-api-calculate.js '{"indicator":"vwap", "data":[{"date":"2026-05-22","high":12.70,"low":12.32,"close":12.58,"volume":2450000}]}'
```

### Tool-18: VWAP · 服务端数据计算
> **铁律**：需 `volume` 字段，**必须**使用 `price_adjustment:"none"`。
```bash
node scripts/call-api-calculate-from-data.js '{"stock_code":"000001.SZ", "start_date":"2026-04-01", "end_date":"2026-05-22", "indicator":"vwap", "price_adjustment":"none"}'
```

---

## 错误响应一览

| 状态码 | 场景 | 返回示例 |
|--------|------|----------|
| 400 | 校验失败（缺字段、类型错、`limit` 越界等） | `{"error":"[{'type':'missing','loc':...}]"}` |
| 400 | 计算异常（不支持指标/参数、缺必需行情字段等） | `{"error":"sma 需要字段: close"}` |
| 200 | 业务错误对象（部分特定接口反馈） | `{"error":"..."}` |

*(注：脚本在 HTTP 非 2xx 时将以非 0 退出码退出，并向 stderr 打印响应体)*

---

## 调用建议

1. **数据量**：传入长度建议 ≥ `params.length × 3` 避开全 null；MACD 等指标建议 ≥ 60 根。
2. **复权隔离**：
   - 价格指标（SMA/EMA/RSI/MACD/BOLL/KDJ/ATR）建议 `price_adjustment:"forward"`。
   - 成交量指标（OBV/VWAP）必须 `price_adjustment:"none"`。
3. **节点提取**：常规业务取 `latest` 即可；画图或判断连续形态取 `data` 数组。
4. **参数覆盖**：`params` 只传变动项，禁止传入冗余/未知键（触发 400）。