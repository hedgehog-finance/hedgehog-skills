---
name: hedgehog-calculator
description: >
  调用刺猬投研 AI 工具接口执行常用计算。
  【适用】金融计算（终值、现值、折扣、加价、年金、贷款月供、投资收益率）、描述性统计、日期计算、
  单位换算、一元一次方程和一元二次方程求解。
  【不适用】基础加减乘除、三角函数等可直接心算或本地计算的简单数学；多元方程、多次方程或符号推导。
  触发词：计算终值、计算现值、折扣价、加价、年金终值、年金现值、贷款月供、投资收益率、描述性统计、
  均值、方差、标准差、中位数、众数、单位换算、日期差、年龄计算、一元一次方程、一元二次方程；
  future value, present value, discount, markup, annuity, loan payment, investment return, statistics, unit conversion.
version: 1.0

---

# hedgehog-calculator

本 skill 通过 Node.js 脚本调用刺猬投研 AI 工具接口（https://api.ciweiai.com/api/utils），执行常用金融、统计、日期、单位和简单方程计算。

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

1. 识别用户计算对象：金融计算、统计分析、日期计算、单位换算或简单方程求解。
2. 如果输入缺少必要参数，先向用户确认；不要自行补造本金、利率、期限、日期或单位。
3. 查阅本文件的 `Tools基础功能`，选择对应 Tool。
4. 阅读该 Tool 指向的 reference 文档，确认参数名、单位口径、日期格式和返回结构。
5. 使用 `scripts/call_api.js` 执行调用。
6. 解析返回结果，保留计算口径、关键参数和单位；接口返回业务错误时如实说明，不得改写为成功结果。

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
├── futureValue.md
├── presentValue.md
├── discountAmount.md
├── markupPrice.md
├── annuityFutureValue.md
├── annuityPresentValue.md
├── loanMonthlyPayment.md
├── investmentReturn.md
├── statisticsBasic.md
├── unitConvert.md
├── ageCalculation.md
├── dateDifference.md
├── linearEquation.md
└── quadraticEquation.md
```

**脚本调用方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

---

### Tool-1: 计算终值

**功能**：根据现值、年利率、年限和复利频率计算未来价值。

**适用场景**：用户查询一笔本金按指定收益率和复利频率增长后的终值。

**不适合场景**：根据未来金额倒推现值 → 使用 Tool-2；普通年金终值 → 使用 Tool-5。

**调用参数**：见 `references/futureValue.md`

**执行方法**：

```bash
node scripts/call_api.js --api futureValue --params '<JSON>'
```

**约束与限制**：利率使用小数形式，例如 `0.05` 表示 5%；缺少本金、利率或期限时先确认参数。

---

### Tool-2: 计算现值

**功能**：根据未来金额、贴现率、年限和复利频率计算当前价值。

**适用场景**：用户需要把未来现金金额折现到当前。

**不适合场景**：计算未来价值 → 使用 Tool-1；普通年金现值 → 使用 Tool-6。

**调用参数**：见 `references/presentValue.md`

**执行方法**：

```bash
node scripts/call_api.js --api presentValue --params '<JSON>'
```

**约束与限制**：贴现率使用小数形式；复利频率不明确时按 reference 默认值处理或向用户确认。

---

### Tool-3: 计算折扣金额

**功能**：根据商品原价和折扣比例计算折扣金额、折后成交价和节省比例。

**适用场景**：用户查询优惠、打折、折后价或节省金额。

**不适合场景**：按成本上浮计算售价和毛利率 → 使用 Tool-4。

**调用参数**：见 `references/discountAmount.md`

**执行方法**：

```bash
node scripts/call_api.js --api discountAmount --params '<JSON>'
```

**约束与限制**：`discount_percent` 使用小数形式，例如 `0.2` 表示优惠 20%。

---

### Tool-4: 计算加价价格

**功能**：根据成本和加价比例计算加价金额、销售价格和毛利率。

**适用场景**：用户按成本、加价率或毛利分析销售价格。

**不适合场景**：计算折扣、折后价或优惠金额 → 使用 Tool-3。

**调用参数**：见 `references/markupPrice.md`

**执行方法**：

```bash
node scripts/call_api.js --api markupPrice --params '<JSON>'
```

**约束与限制**：`markup_percent` 使用小数形式；毛利率按 `加价金额 / 销售价格` 计算。

---

### Tool-5: 计算普通年金终值

**功能**：计算每期末等额付款累计到最后一期的价值。

**适用场景**：用户查询定投、等额存款或普通年金在期末的累计价值。

**不适合场景**：单笔本金复利终值 → 使用 Tool-1；普通年金现值 → 使用 Tool-6。

**调用参数**：见 `references/annuityFutureValue.md`

**执行方法**：

```bash
node scripts/call_api.js --api annuityFutureValue --params '<JSON>'
```

**约束与限制**：`rate` 是每期利率，不是年利率，除非用户明确每年一期。

---

### Tool-6: 计算普通年金现值

**功能**：将未来每期等额付款折现到当前，计算普通年金现值。

**适用场景**：用户查询固定现金流、租金或分期付款的现值。

**不适合场景**：单笔未来金额折现 → 使用 Tool-2；普通年金终值 → 使用 Tool-5。

**调用参数**：见 `references/annuityPresentValue.md`

**执行方法**：

```bash
node scripts/call_api.js --api annuityPresentValue --params '<JSON>'
```

**约束与限制**：`rate` 是每期利率；期数和付款频率需与利率口径一致。

---

### Tool-7: 计算贷款月供

**功能**：按等额本息模型计算固定月供、还款总额和总利息。

**适用场景**：用户查询房贷、车贷等贷款月供，且还款方式为等额本息。

**不适合场景**：等额本金、提前还款、浮动利率或还款计划明细 → 不在本 skill 覆盖范围。

**调用参数**：见 `references/loanMonthlyPayment.md`

**执行方法**：

```bash
node scripts/call_api.js --api loanMonthlyPayment --params '<JSON>'
```

**约束与限制**：`annual_rate` 使用年利率小数；未说明还款方式时必须说明本 Tool 使用等额本息。

---

### Tool-8: 计算投资收益率

**功能**：根据初始本金、最终金额和持有年限计算总收益率和复合年化收益率。

**适用场景**：用户查询一笔投资从初始金额到最终金额的总收益和年化收益。

**不适合场景**：现金流多次进出、IRR、定投收益率 → 不在本 skill 覆盖范围。

**调用参数**：见 `references/investmentReturn.md`

**执行方法**：

```bash
node scripts/call_api.js --api investmentReturn --params '<JSON>'
```

**约束与限制**：本金和年限需大于 0；接口返回业务错误时如实返回错误。

---

### Tool-9: 基础描述性统计

**功能**：对一组数字计算数量、均值、方差、标准差、中位数、众数、最小值、最大值和极差。

**适用场景**：用户提供数字列表并要求做描述性统计。

**不适合场景**：百分位、频数统计、异常值检测、回归或显著性检验 → 不在当前脚本接口覆盖范围。

**调用参数**：见 `references/statisticsBasic.md`

**执行方法**：

```bash
node scripts/call_api.js --api statisticsBasic --params '<JSON>'
```

**约束与限制**：方差为总体方差；空列表会返回业务错误对象，不得替用户补数据。

---

### Tool-10: 单位换算

**功能**：将一个数值从原始单位换算到目标单位，支持长度、重量、面积和温度单位别名。

**适用场景**：用户查询长度、重量、面积、温度单位之间的换算。

**不适合场景**：货币汇率、体积、速度、压力、能量等未在 reference 中列出的单位 → 不在本 Tool 覆盖范围。

**调用参数**：见 `references/unitConvert.md`

**执行方法**：

```bash
node scripts/call_api.js --api unitConvert --params '<JSON>'
```

**约束与限制**：只使用 reference 中支持的单位别名；单位不支持时返回接口错误，不得自行换算未覆盖单位。

---

### Tool-11: 计算年龄

**功能**：根据出生日期和可选参考日期计算年龄拆分、总天数和估算总月份。

**适用场景**：用户查询年龄、周岁或从出生日期到参考日期的年龄明细。

**不适合场景**：两个普通日期之间的间隔 → 使用 Tool-12。

**调用参数**：见 `references/ageCalculation.md`

**执行方法**：

```bash
node scripts/call_api.js --api ageCalculation --params '<JSON>'
```

**约束与限制**：优先使用 `YYYY-MM-DD`；未传参考日期时使用服务端当前日期。

---

### Tool-12: 计算日期差

**功能**：计算两个日期之间的绝对间隔，返回天数、周数、月数和年数。

**适用场景**：用户查询两个日期相差多少天、周、月或年。

**不适合场景**：根据出生日期计算年龄描述 → 使用 Tool-11；工作日、交易日或节假日计算 → 不在本 Tool 覆盖范围。

**调用参数**：见 `references/dateDifference.md`

**执行方法**：

```bash
node scripts/call_api.js --api dateDifference --params '<JSON>'
```

**约束与限制**：返回绝对间隔；月份按 30 天折算并取整，年份按 365.25 天折算。

---

### Tool-13: 求解一元一次方程

**功能**：求解形如 `ax + b = 0` 的一元一次方程。

**适用场景**：用户给出一次项系数和常数项，或明确要求求解一元一次方程。

**不适合场景**：一元二次方程 → 使用 Tool-14；多元方程或符号方程组 → 不在本 skill 覆盖范围。

**调用参数**：见 `references/linearEquation.md`

**执行方法**：

```bash
node scripts/call_api.js --api linearEquation --params '<JSON>'
```

**约束与限制**：参数为系数 `a`、`b`；`a = 0` 时可能返回无解或无穷多解。

---

### Tool-14: 求解一元二次方程

**功能**：求解形如 `ax² + bx + c = 0` 的一元二次方程。

**适用场景**：用户给出二次项、一次项和常数项系数，或明确要求求解一元二次方程。

**不适合场景**：多元方程、多次方程或符号推导 → 不在本 skill 覆盖范围。

**调用参数**：见 `references/quadraticEquation.md`

**执行方法**：

```bash
node scripts/call_api.js --api quadraticEquation --params '<JSON>'
```

**约束与限制**：`a = 0` 时退化为一次方程求解；复根会以字符串形式返回。

---

## 错误处理

| 错误类型   | 处理方式                                               |
| ---------- | ------------------------------------------------------ |
| HTTP 4xx   | 检查参数格式、路径参数和鉴权配置                       |
| HTTP 5xx   | 提示用户服务端错误，建议稍后重试                       |
| 缺少 Token | 设置 `CIWEI_AI_TOKEN` 或配置 OpenClaw token 后重试     |
| 连接失败   | 提示用户检查 https://api.ciweiai.com/api/utils 是否可达 |

---

## 补充说明

### 与其他能力的边界

| 查询对象                              | 使用方式                  |
| ------------------------------------- | ------------------------- |
| 简单加减乘除、比例或可直接推导的计算  | 直接计算，不必调用本 skill |
| 金融终值、现值、年金、贷款和收益率    | **本 skill**              |
| 描述性统计、单位换算和日期差          | **本 skill**              |
| 一元一次 / 一元二次方程               | **本 skill**              |
| 多元方程、IRR、回归、显著性检验       | 不在本 skill 覆盖范围     |

### 用户触发示例

#### 金融计算

- "10 万元年化 5%，月复利 3 年后是多少钱" → Tool-1
- "三年后 20 万，贴现率 4%，现在值多少" → Tool-2
- "原价 899 打八折便宜多少" → Tool-3
- "成本 50，加价 30% 卖多少钱" → Tool-4
- "每月存 1000，月利率 0.5%，36 期终值" → Tool-5
- "未来每月拿 3000，贴现到现在值多少" → Tool-6
- "贷款 100 万，年利率 4.2%，30 年月供" → Tool-7
- "本金 10 万变成 16 万，5 年年化收益多少" → Tool-8

#### 统计、日期和单位

- "这组数的均值和标准差是多少" → Tool-9
- "10 公里等于多少米" → Tool-10
- "1990-01-01 到今天多少岁" → Tool-11
- "2024-01-01 到 2024-12-31 相差多少天" → Tool-12

#### 方程求解

- "求解 2x + 6 = 0" → Tool-13
- "求解 x² - 3x + 2 = 0" → Tool-14

### 注意事项

- **比例口径**：利率、折扣比例、加价比例均使用小数，例如 `0.05` 表示 5%
- **日期格式**：优先使用 `YYYY-MM-DD`
- **单位范围**：单位换算只覆盖 reference 文档列出的单位类型和别名
- **返回数据**：业务错误和空结果必须如实返回，不得编造计算结果
