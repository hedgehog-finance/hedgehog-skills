---
name: hedgehog-company-index-data
description: >
  从刺猬投研AI数据源查询上市公司和股票相关数据。
  【适用】A股股票基础信息、日线行情、每日基本面指标（PE、PB、换手率、总市值等）、个股成交资金流向、
  利润表、资产负债表、现金流量表、财务指标、审计意见、主营业务构成；申万行业分类体系、申万行业成分股、申万行业日线行情。
  【不适用】宏观经济数据 → 改用 hedgehog-macro-industry-data；新闻资讯、公告 → 不在本 skill 覆盖范围。
  触发词：股票基本信息、股票行情、日线行情、基本面数据、PE、PB、换手率、市值、资金流向、财务报表、利润表、资产负债表、
  现金流量表、财务指标、审计意见、主营业务构成、申万行业、行业分类、行业成分、行业行情；
  stock basic, stock daily, market data, quote data, daily basic, money flow, financial statements, financial indicator.
version: 1.0

---

# hedgehog-company-index-data

本 skill 通过 Node.js 脚本调用刺猬投研 AI 数据接口（https://api.ciweiai.com/api/data），查询上市公司和股票相关数据。

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

1. 识别用户查询对象：股票基础信息、个股行情、每日基本面、资金流向、财务报表、财务指标、审计意见、主营业务构成、申万行业分类、行业成分或行业行情。
2. 如果用户只给股票简称、公司名或模糊名称，先用 Tool-1 查询 `stock_code`；不要自行猜测股票代码。
3. 查阅本文件的 `Tools基础功能`，选择对应 Tool。
4. 阅读该 Tool 指向的 reference 文档，确认参数名、日期字段、分页字段和返回结构。
5. 使用 `scripts/call_api.js` 执行调用。
6. 解析返回结果，保留数据来源、日期口径和关键字段；检索不到结果时返回 `null`，不得编造数据。

---

## Tools 基础功能

`Tools基础功能` 一般由本 Skill 的 `核心功能工作流 (Workflow)` 调用。在核心功能场景不适合时，或者 Agent 自由编排工作流时，或者提示词指定调用特定 Tool 时，才直接匹配本节 Tool。具体输入输出参数以对应 reference 文档为准。

所有 Tools 可执行的脚本逻辑位于 `scripts/` 目录：

```
scripts/
└── call_api.js     // 调用刺猬投研 AI 数据接口
```

相关知识、规则、流程的 MD 文件放在 `references/` 目录：

```
references/
├── getStockBasic.md
├── queryStockDaily.md
├── queryDailyBasic.md
├── listDailyBasic.md
├── queryMoneyflow.md
├── queryIncomeStatement.md
├── queryBalanceSheet.md
├── queryCashFlow.md
├── queryFinanceIndicator.md
├── queryFinanceAudit.md
├── queryFinanceMainbz.md
├── querySwIndustry.md
├── querySwIndustryMember.md
└── querySwIndustryDaily.md
```

**脚本调用方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

---

### Tool-1: 查询股票基础信息

**功能**：查询 A 股上市公司基础资料。

**适用场景**：用户按股票代码、股票简称、公司名、行业或市场查询上市公司基础信息；用户只给名称且后续查询需要 `stock_code`。

**不适合场景**：查询个股日线行情 → 使用 Tool-2；查询 PE/PB/换手率/市值等每日基本面指标 → 使用 Tool-3 或 Tool-4。

**调用参数**：见 `references/getStockBasic.md`

**执行方法**：

```bash
node scripts/call_api.js --api getStockBasic --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据；名称匹配出多只股票时，向用户列出候选项或说明筛选条件。

---

### Tool-2: 查询股票日线行情

**功能**：查询指定股票在指定交易日期范围内的开高低收、成交量、成交额等日线行情。

**适用场景**：用户查询某只股票的历史行情、收盘价、涨跌幅、成交量、成交额。

**不适合场景**：查询 PE/PB/换手率/市值等每日基本面指标 → 使用 Tool-3 或 Tool-4；查询资金流向 → 使用 Tool-5。

**调用参数**：见 `references/queryStockDaily.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryStockDaily --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-3: 查询指定股票每日基本面指标

**功能**：按股票代码和交易日期范围查询每日基本面指标，按 `trade_date` 倒序返回固定数量。

**适用场景**：用户查询单只股票的 PE、PB、换手率、量比、总市值、流通市值等指标。

**不适合场景**：批量或分页查询多只股票的每日基本面指标 → 使用 Tool-4；查询财务报表科目 → 使用 Tool-6、Tool-7 或 Tool-8。

**调用参数**：见 `references/queryDailyBasic.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryDailyBasic --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-4: 分页查询每日基本面指标

**功能**：分页查询所有或指定股票的每日基本面指标。

**适用场景**：用户需要批量拉取 PE、PB、市值等基本面指标，或在未指定单只股票时分页浏览每日基本面数据。

**不适合场景**：查询单只股票少量最近记录 → 优先使用 Tool-3；查询日线行情价格和成交量 → 使用 Tool-2。

**调用参数**：见 `references/listDailyBasic.md`

**执行方法**：

```bash
node scripts/call_api.js --api listDailyBasic --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据；批量结果较多时说明分页参数。

---

### Tool-5: 查询个股成交资金流向

**功能**：分页查询个股成交资金流向，按 `trade_date` 倒序返回。

**适用场景**：用户查询主力、散户、大单、小单、净流入量、净流入额等资金流向数据。

**不适合场景**：查询成交量、成交额等日线行情字段 → 使用 Tool-2；查询市值或估值指标 → 使用 Tool-3 或 Tool-4。

**调用参数**：见 `references/queryMoneyflow.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryMoneyflow --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-6: 查询利润表

**功能**：分页查询上市公司利润表，按 `end_date` 倒序返回。

**适用场景**：用户查询营业收入、营业利润、净利润、归母净利润、每股收益等利润表科目。

**不适合场景**：查询资产、负债、股东权益 → 使用 Tool-7；查询现金流科目 → 使用 Tool-8。

**调用参数**：见 `references/queryIncomeStatement.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryIncomeStatement --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-7: 查询资产负债表

**功能**：分页查询上市公司资产负债表，按 `end_date` 倒序返回。

**适用场景**：用户查询总资产、总负债、股东权益等资产负债表科目。

**不适合场景**：查询利润表科目 → 使用 Tool-6；查询现金流科目 → 使用 Tool-8。

**调用参数**：见 `references/queryBalanceSheet.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryBalanceSheet --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-8: 查询现金流量表

**功能**：分页查询上市公司现金流量表，按 `end_date` 倒序返回。

**适用场景**：用户查询经营、投资、筹资现金流，以及现金流量净额等现金流科目。

**不适合场景**：查询利润表科目 → 使用 Tool-6；查询资产负债表科目 → 使用 Tool-7。

**调用参数**：见 `references/queryCashFlow.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryCashFlow --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-9: 查询财务指标

**功能**：分页查询上市公司财务指标，按 `end_date` 倒序返回。

**适用场景**：用户查询 ROE、ROA、毛利率、净利率等盈利能力、成长能力、偿债能力、运营能力指标。

**不适合场景**：查询日频 PE/PB/换手率/市值 → 使用 Tool-3 或 Tool-4；查询财务报表原始科目 → 使用 Tool-6、Tool-7 或 Tool-8。

**调用参数**：见 `references/queryFinanceIndicator.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryFinanceIndicator --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-10: 查询财务审计意见

**功能**：分页查询上市公司财报审计意见，按 `end_date` 倒序返回。

**适用场景**：用户查询审计机构、审计意见类型、审计结论、审计费用或签字会计师。

**不适合场景**：查询公告原文或新闻资讯 → 不在本 skill 覆盖范围；查询财务指标 → 使用 Tool-9。

**调用参数**：见 `references/queryFinanceAudit.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryFinanceAudit --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-11: 查询主营业务构成

**功能**：分页查询上市公司主营业务构成，按 `end_date` 倒序返回。

**适用场景**：用户按产品、地区或行业维度分析主营业务收入、成本和利润构成。

**不适合场景**：查询利润表整体科目 → 使用 Tool-6；查询行业成分股列表 → 使用 Tool-13。

**调用参数**：见 `references/queryFinanceMainbz.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryFinanceMainbz --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-12: 查询申万行业分类

**功能**：查询申万行业分类体系（一级、二级、三级行业列表）。

**适用场景**：用户查询申万行业分类、SW 行业体系、行业代码列表。

**不适合场景**：查询行业成分股 → 使用 Tool-13；查询行业日线行情 → 使用 Tool-14。

**调用参数**：见 `references/querySwIndustry.md`

**执行方法**：

```bash
node scripts/call_api.js --api querySwIndustry --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-13: 查询申万行业成分构成

**功能**：分页查询申万行业成分股，按 `in_date` 倒序返回。

**适用场景**：用户查询某个申万行业下的成分股列表，或查询某只股票所属的申万行业成分记录。

**不适合场景**：查询申万行业分类体系 → 使用 Tool-12；查询行业日线行情 → 使用 Tool-14。

**调用参数**：见 `references/querySwIndustryMember.md`

**执行方法**：

```bash
node scripts/call_api.js --api querySwIndustryMember --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-14: 查询申万行业日线行情

**功能**：分页查询申万行业指数日线行情，按 `trade_date` 倒序返回。

**适用场景**：用户查询申万行业指数的开高低收、涨跌幅、成交量、成交额、PE、PB。

**不适合场景**：查询个股日线行情 → 使用 Tool-2；查询申万行业分类体系 → 使用 Tool-12。

**调用参数**：见 `references/querySwIndustryDaily.md`

**执行方法**：

```bash
node scripts/call_api.js --api querySwIndustryDaily --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

## 错误处理

| 错误类型   | 处理方式                                               |
| ---------- | ------------------------------------------------------ |
| HTTP 4xx   | 检查参数格式、路径参数和鉴权配置                       |
| HTTP 5xx   | 提示用户服务端错误，建议稍后重试                       |
| 缺少 Token | 设置 `CIWEI_AI_TOKEN` 或配置 OpenClaw token 后重试     |
| 连接失败   | 提示用户检查 https://api.ciweiai.com/api/data 是否可达 |

---

## 补充说明

### 与其他 Skill 的边界

| 查询对象                              | 使用的 Skill                  |
| ------------------------------------- | ----------------------------- |
| 某只股票的基础信息、行情、基本面      | **本 skill**                  |
| 某只股票的资金流向、财务数据、财务指标 | **本 skill**                  |
| 申万行业分类 / 行业成分 / 行业行情    | **本 skill**                  |
| 宏观指标（利率 / CPI / PMI / 社融等） | hedgehog-macro-industry-data  |
| 新闻资讯、公告                        | 不适用任何本系列 skill        |

### 用户触发示例

#### 查询股票基础信息和行情

- "平安银行的股票代码和上市日期" → Tool-1
- "查一下 000001.SZ 近一个月日线行情" → Tool-2
- "贵州茅台最近的 PE 和 PB" → Tool-1 → Tool-3
- "分页拉取所有股票最新基本面指标" → Tool-4
- "招商银行最近资金流向" → Tool-1 → Tool-5

#### 查询财务数据

- "宁德时代近三年利润表" → Tool-1 → Tool-6
- "比亚迪最新资产负债表" → Tool-1 → Tool-7
- "隆基绿能经营现金流变化" → Tool-1 → Tool-8
- "万科近几年 ROE 和毛利率" → Tool-1 → Tool-9
- "某公司审计意见是什么" → Tool-1 → Tool-10
- "某公司主营业务按产品怎么分布" → Tool-1 → Tool-11

#### 查询申万行业数据

- "申万一级行业有哪些" → Tool-12
- "申万食品饮料行业有哪些成分股" → Tool-13
- "近一个月医药生物行业行情走势" → Tool-14

### 注意事项

- **股票代码**：优先使用带交易所后缀的 `stock_code`，例如 `000001.SZ`
- **日期格式**：使用 `YYYY-MM-DD`
- **分页参数**：批量接口通常使用 `page` 和 `page_size`，具体限制以 reference 文档为准
- **返回数据**：所有 Tool 检索不到结果时必须返回 `null`，不得编造数据
