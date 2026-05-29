---
name: hedgehog-macro-industry-data
description: >
  从刺猬投研AI数据源查询宏观经济数据。
  【适用】中国宏观数据（Shibor利率、LPR利率、CPI、PPI、PMI、M0/M1/M2货币供应量、社融）；
  美国宏观数据（国债名义收益率、国债实际收益率）。
  【不适用】个股行情、个股基本面、个股财务数据 → 改用 hedgehog-company-index-data；新闻资讯、公告 → 不在本 skill 覆盖范围。
  触发词：宏观数据、利率、CPI、PPI、PMI、M1、M2、社融、货币供应量、美国国债收益率；
  macro data, interest rate, money supply, US treasury yield, Shibor, LPR, social financing.
version: 1.0

---

# hedgehog-macro-industry-data

本 skill 通过 Node.js 脚本调用刺猬投研 AI 数据接口（https://api.ciweiai.com/api/data），查询宏观经济数据。

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

## Tools 基础功能

`Tools基础功能` 一般由本 Skill 的 `核心功能工作流(Workflow)` 调用。在核心功能场景不适合时，或者 Agent 自由编排工作流时，或者提示词指定调用特定 Tool 时，才直接匹配本节 Tool。具体输入输出参数以对应 reference 文档为准。

所有 Tools 可执行的脚本逻辑位于 `scripts/` 目录：

```
scripts/
└── call_api.js     // 调用刺猬投研 AI 数据接口
```

相关知识、规则、流程的 MD 文件放在 `references/` 目录：

```
references/
├── queryShibor.md
├── queryLpr.md
├── queryCpi.md
├── queryPpi.md
├── queryMoneySupply.md
├── querySocialFinancing.md
├── queryPmi.md
├── queryUsTreasury.md
└── queryUsTrycr.md
```

**脚本调用方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

---

### Tool-1: 查询中国 Shibor 利率

**功能**：查询中国银行间同业拆借利率（Shibor）历史数据。

**适用场景**：用户查询 Shibor、银行间利率、同业拆借利率。

**不适合场景**：查询 LPR 贷款利率 → 使用 Tool-2。

**调用参数**：见 `references/queryShibor.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryShibor --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-2: 查询中国 LPR 利率

**功能**：查询中国贷款市场报价利率（LPR）历史数据。

**适用场景**：用户查询 LPR、贷款市场报价利率、房贷利率基准。

**不适合场景**：查询银行间拆借利率 → 使用 Tool-1。

**调用参数**：见 `references/queryLpr.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryLpr --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-3: 查询中国 CPI 数据

**功能**：查询中国消费者价格指数（CPI）历史数据。

**适用场景**：用户查询 CPI、消费者物价指数、通货膨胀数据。

**不适合场景**：查询生产者价格 → 使用 Tool-4。

**调用参数**：见 `references/queryCpi.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryCpi --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-4: 查询中国 PPI 数据

**功能**：查询中国生产者价格指数（PPI）历史数据。

**适用场景**：用户查询 PPI、生产者价格指数、出厂价格数据。

**不适合场景**：查询消费者价格 → 使用 Tool-3。

**调用参数**：见 `references/queryPpi.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryPpi --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-5: 查询中国 M0/M1/M2 货币供应量

**功能**：查询中国货币供应量（M0、M1、M2）历史数据。

**适用场景**：用户查询 M0、M1、M2、货币供应量、货币总量。

**不适合场景**：查询社会融资规模 → 使用 Tool-6。

**调用参数**：见 `references/queryMoneySupply.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryMoneySupply --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-6: 查询中国社融数据

**功能**：查询中国社会融资规模历史数据。

**适用场景**：用户查询社融、社会融资规模、信贷数据。

**不适合场景**：查询货币供应量 M1/M2 → 使用 Tool-5。

**调用参数**：见 `references/querySocialFinancing.md`

**执行方法**：

```bash
node scripts/call_api.js --api querySocialFinancing --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-7: 查询中国 PMI 数据

**功能**：查询中国采购经理人指数（PMI）历史数据。

**适用场景**：用户查询 PMI、制造业景气指数、采购经理指数。

**不适合场景**：查询其他宏观价格指标（CPI/PPI）→ 使用 Tool-3 或 Tool-4。

**调用参数**：见 `references/queryPmi.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryPmi --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-8: 查询美国国债名义收益率

**功能**：查询美国国债名义收益率历史数据。

**适用场景**：用户查询美债收益率、美国国债利率、名义收益率。

**不适合场景**：查询扣除通胀后的实际收益率 → 使用 Tool-9。

**调用参数**：见 `references/queryUsTreasury.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryUsTreasury --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造数据。

---

### Tool-9: 查询美国国债实际收益率

**功能**：查询美国国债实际收益率（TIPS）历史数据。

**适用场景**：用户查询实际收益率、TIPS、通胀保值债券收益率。

**不适合场景**：查询名义收益率 → 使用 Tool-8。

**调用参数**：见 `references/queryUsTrycr.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryUsTrycr --params '<JSON>'
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

| 查询对象                              | 使用的 Skill                |
| ------------------------------------- | --------------------------- |
| 宏观指标（利率 / CPI / PMI / 社融等） | **本 skill**                |
| 某只股票的行情、基本面、财务数据      | hedgehog-company-index-data |
| 新闻资讯、公告                        | 不适用任何本系列 skill      |

### 用户触发示例

#### 查询宏观数据（触发对应 Tool）

- "查一下最近的 CPI 数据" → Tool-3
- "LPR 最新是多少" → Tool-2
- "美国10年期国债收益率走势" → Tool-8
- "最新 M2 同比增速" → Tool-5
- "近三个月社融数据" → Tool-6
- "制造业 PMI 最新数据" → Tool-7

### 注意事项

- **时间格式**：`2026-04-29` 或 `2026-04-29T15:00:00`
- **返回数据**：所有 Tool 检索不到结果时必须返回 `null`，不得编造数据
