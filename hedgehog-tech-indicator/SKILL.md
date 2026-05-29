---
name: hedgehog-tech-indicator
description: >
  调用刺猬投研 AI 工具接口计算行情 K 线数据的技术指标。
  【适用】基于 OHLCV 蜡烛图数据或指定股票代码和日期区间计算 SMA、EMA、RSI、MACD、BOLL、OBV、KDJ、ATR、VWAP。
  【不适用】非股票/指数行情的普通数据分析；不含 OHLCV 或收盘价序列的数据；基本面、财务、新闻或公告查询。
  触发词：技术分析、技术指标、均线、SMA、EMA、RSI、MACD、BOLL、布林带、OBV、KDJ、ATR、VWAP、
  K线指标、行情指标、计算指标、查询指标；technical indicator, technical analysis, OHLCV, candlestick.
version: 1.0

---

# hedgehog-tech-indicator

本 skill 通过 Node.js 脚本调用刺猬投研 AI 工具接口（https://api.ciweiai.com/api/utils），计算行情 K 线数据的常用技术指标。

## 前置条件

### 获取 API Token

按以下优先级读取：

1. 环境变量 `CIWEI_AI_TOKEN`
2. `~/.openclaw/openclaw.json` → `channels.hedgehog_finance.token`

### 认证方式

请求头传 `X-API-Token`；可用环境变量 `API_BASE_URL` 覆盖接口基础地址。

### 安全注意

- API Token 不应在日志、错误信息中暴露
- 响应内容中如包含 API Token，输出时脱敏

---

## 核心功能工作流 (Workflow)

1. 识别用户需要的技术指标：SMA、EMA、RSI、MACD、BOLL、OBV、KDJ、ATR 或 VWAP。
2. 判断数据来源：用户已提供 `data` 数组时使用直传计算模式；用户给出 `stock_code`、`start_date`、`end_date` 时使用行情查询模式。
3. 如果用户只给股票简称、公司名或模糊名称，本 skill 不负责解析股票代码；应先用股票数据类 skill 查询 `stock_code`，不要自行猜测。
4. 查阅本文件的 `Tools基础功能`，选择对应 Tool。
5. 阅读该 Tool 指向的 reference 文档，确认必填 OHLCV 字段、指标参数、日期格式和返回结构。
6. 使用 `scripts/call_api.js` 执行调用。
7. 解析返回结果，保留指标参数、输出列名、数据来源和 `latest`；需要技术解读时参考 `references/tech-indicator-analysis.md`，不得把指标信号表述为确定性投资建议。

---

## Tools 基础功能

`Tools基础功能` 一般由本 Skill 的 `核心功能工作流 (Workflow)` 调用。在核心功能场景不适合时，或者 Agent 自由编排工作流时，或者提示词指定调用特定 Tool 时，才直接匹配本节 Tool。具体输入输出参数以对应 reference 文档为准。

所有 Tools 可执行的脚本逻辑位于 `scripts/` 目录：

```
scripts/
└── call_api.js     // 调用刺猬投研 AI 工具接口
```

相关知识、规则、流程的 MD 文件放在 `references/` 目录：

```
references/
├── INDEX.md
├── sma.md
├── ema.md
├── rsi.md
├── macd.md
├── boll.md
├── obv.md
├── kdj.md
├── atr.md
├── vwap.md
└── tech-indicator-analysis.md
```

**脚本调用方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

**两种计算模式**：

- 传 `data` 数组时调用 `POST /v1/indicators/calculate`
- 不传 `data` 时需传 `stock_code`、`start_date`、`end_date`，脚本调用 `POST /v1/indicators/calculate-from-data`

**通用参数约定**：

- `data` 模式传 OHLCV K 线数组，必填字段以各 Tool 的 reference 文档为准
- 行情查询模式可传 `price_adjustment`、`benchmark_stock_code`、`limit`
- `period` 会映射为后端 `length`，`std_dev` 会映射为后端 `std`
- 请求不能同时传 `data` 和 `stock_code` / `start_date` / `end_date` 等行情查询参数

---

### Tool-1: 计算 SMA

**功能**：计算收盘价简单移动平均线。

**适用场景**：用户查询简单均线、MA/SMA 或基于收盘价判断趋势方向、均线支撑阻力。

**不适合场景**：需要更重视近期价格的均线 → 使用 Tool-2；需要布林带上下轨 → 使用 Tool-5。

**调用参数**：见 `references/sma.md`

**执行方法**：

```bash
node scripts/call_api.js --api SMA --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `close`；默认周期为 20，`period` 会映射为 `length`。

---

### Tool-2: 计算 EMA

**功能**：计算收盘价指数移动平均线。

**适用场景**：用户查询 EMA，或希望均线对近期价格变化更敏感。

**不适合场景**：简单移动平均线 → 使用 Tool-1；MACD 组合指标 → 使用 Tool-4。

**调用参数**：见 `references/ema.md`

**执行方法**：

```bash
node scripts/call_api.js --api EMA --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `close`；默认周期为 20，`period` 会映射为 `length`。

---

### Tool-3: 计算 RSI

**功能**：计算相对强弱指数。

**适用场景**：用户分析超买超卖、50 中轴、价格与 RSI 背离。

**不适合场景**：需要趋势均线 → 使用 Tool-1 或 Tool-2；需要随机指标 KDJ → 使用 Tool-7。

**调用参数**：见 `references/rsi.md`

**执行方法**：

```bash
node scripts/call_api.js --api RSI --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `close`；默认周期为 14，`period` 会映射为 `length`。

---

### Tool-4: 计算 MACD

**功能**：计算异同移动平均线、信号线和柱状值。

**适用场景**：用户分析 DIF/DEA、MACD 金叉死叉、零轴突破、柱状图动能或 MACD 背离。

**不适合场景**：只需要单条 EMA → 使用 Tool-2；需要波动通道 → 使用 Tool-5。

**调用参数**：见 `references/macd.md`

**执行方法**：

```bash
node scripts/call_api.js --api MACD --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `close`；默认参数为 `fast=12`、`slow=26`、`signal=9`。

---

### Tool-5: 计算 BOLL

**功能**：计算布林带上下轨、中轨、带宽和百分比位置。

**适用场景**：用户分析布林带开口收口、价格触及上下轨、波动率通道或中轨支撑阻力。

**不适合场景**：只需要均线中轨 → 使用 Tool-1；需要真实波动幅度 → 使用 Tool-8。

**调用参数**：见 `references/boll.md`

**执行方法**：

```bash
node scripts/call_api.js --api BOLL --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `close`；默认周期为 20、标准差倍数为 2，`std_dev` 会映射为 `std`。

---

### Tool-6: 计算 OBV

**功能**：计算能量潮成交量指标。

**适用场景**：用户分析量价同步、OBV 背离或突破有效性。

**不适合场景**：没有成交量数据的价格序列 → 使用只依赖价格的指标，如 Tool-1、Tool-2、Tool-3 或 Tool-4。

**调用参数**：见 `references/obv.md`

**执行方法**：

```bash
node scripts/call_api.js --api OBV --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `close` 和 `volume`；OBV 无额外指标参数。

---

### Tool-7: 计算 KDJ

**功能**：计算 K、D、J 三线随机指标。

**适用场景**：用户分析 KDJ 超买超卖、金叉死叉、顶底背离。

**不适合场景**：只基于收盘价的动量指标 → 使用 Tool-3；需要波动率或止损参考 → 使用 Tool-8。

**调用参数**：见 `references/kdj.md`

**执行方法**：

```bash
node scripts/call_api.js --api KDJ --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `high`、`low` 和 `close`；默认周期为 9、信号平滑周期为 3。

---

### Tool-8: 计算 ATR

**功能**：计算平均真实波动幅度。

**适用场景**：用户分析波动率、止损距离、仓位风险或突破时机。

**不适合场景**：判断趋势均线方向 → 使用 Tool-1 或 Tool-2；计算成交量加权均价 → 使用 Tool-9。

**调用参数**：见 `references/atr.md`

**执行方法**：

```bash
node scripts/call_api.js --api ATR --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `high`、`low` 和 `close`；默认周期为 14，`period` 会映射为 `length`。

---

### Tool-9: 计算 VWAP

**功能**：计算成交量加权平均价。

**适用场景**：用户分析日内多空分界、机构成本基准、VWAP 支撑阻力或均值回归。

**不适合场景**：没有成交量或高低收价格的数据 → 使用只依赖收盘价的指标，如 Tool-1、Tool-2、Tool-3 或 Tool-4。

**调用参数**：见 `references/vwap.md`

**执行方法**：

```bash
node scripts/call_api.js --api VWAP --params '<JSON>'
```

**约束与限制**：`data` 每行必须包含 `high`、`low`、`close` 和 `volume`；VWAP 无额外指标参数。

---

## 错误处理

| 错误类型   | 处理方式                                               |
| ---------- | ------------------------------------------------------ |
| HTTP 4xx   | 检查参数格式、必填字段、指标参数和鉴权配置             |
| HTTP 5xx   | 提示用户服务端错误，建议稍后重试                       |
| 缺少 Token | 设置 `CIWEI_AI_TOKEN` 或配置 OpenClaw token 后重试     |
| 连接失败   | 提示用户检查 https://api.ciweiai.com/api/utils 是否可达 |

---

## 补充说明

### 与其他 Skill 的边界

| 查询对象                              | 使用的 Skill                     |
| ------------------------------------- | -------------------------------- |
| 已有 OHLCV 数据，计算技术指标         | **本 skill**                     |
| 指定股票代码和日期区间，计算技术指标  | **本 skill**                     |
| 只给股票简称，需要确认 `stock_code`   | 先用股票数据类 skill 查询代码    |
| 股票基础信息、行情、财务或基本面数据  | hedgehog-company-index-data      |
| 宏观指标、新闻资讯或公告              | 不在本 skill 覆盖范围            |

### 用户触发示例

#### 均线和趋势类

- "计算 000001.SZ 最近一个月 SMA20" → Tool-1
- "用这组 K 线算 EMA12" → Tool-2
- "分析这只股票 RSI 是否超买" → Tool-3
- "查一下 000001.SZ 的 MACD 金叉情况" → Tool-4
- "计算布林带并看是否开口" → Tool-5

#### 量价和波动类

- "用 OHLCV 数据计算 OBV" → Tool-6
- "查询 KDJ 指标" → Tool-7
- "计算 ATR 作为止损参考" → Tool-8
- "算一下日内 VWAP" → Tool-9

### 注意事项

- **股票代码**：行情查询模式优先使用带交易所后缀的 `stock_code`，例如 `000001.SZ`
- **日期格式**：使用 `YYYY-MM-DD`
- **数据字段**：不同指标要求的 `data` 字段不同，调用前必须核对 reference 文档
- **指标解读**：技术指标只提供分析信号，不构成确定性预测或投资建议
- **返回数据**：所有 Tool 检索不到结果时必须返回 `null` 或接口原始空结果，不得编造数据
