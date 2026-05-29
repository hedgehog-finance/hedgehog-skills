---
name: hedgehog-news-reports
description: >
  从刺猬投研AI数据源查询财经新闻资讯、快讯和股市研究报告。
  【适用】重大新闻列表、快讯列表、新闻详情、新闻分析、快讯分析、个股相关新闻分析、A股研报列表、研报详情、研报分析、研报处理状态统计。
  【不适用】股票行情、基本面、财务报表、申万行业数据 → 改用 hedgehog-company-index-data；宏观指标时间序列 → 改用 hedgehog-macro-industry-data；
  上市公司公告、交易所公告、监管函 → 不在本 skill 覆盖范围。
  触发词：财经新闻、重大新闻、快讯、资讯、新闻分析、股票新闻、个股资讯、研报、研究报告、报告分析；
  news, flash news, financial news, stock news, research report, research analysis.
version: 1.0

---

# hedgehog-news-reports

本 skill 通过 Node.js 脚本调用刺猬投研 AI 数据接口（https://api.ciweiai.com/api/data），查询财经新闻资讯、快讯和股市研究报告。

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

1. 识别用户查询对象：重大新闻、快讯、新闻分析、个股相关新闻、研报列表、研报详情、研报分析或研报状态统计。
2. 区分用户要“原始列表/详情”还是“分析结果”：原始内容用列表或详情 Tool；按评分、标签、语义关键词筛选时优先用分析 Tool。
3. 如果用户要新闻或研报详情但未提供 `news_id` / `report_id`，先用列表或分析 Tool 找候选 ID；不要自行猜测 ID。
4. 查阅本文件的 `Tools基础功能`，选择对应 Tool。
5. 阅读该 Tool 指向的 reference 文档，确认参数名、日期字段、分页字段、GET/POST 语义和返回结构。
6. 使用 `scripts/call_api.js` 执行调用。
7. 解析返回结果，保留标题、发布时间/发布日期、来源/机构、摘要、正文或分析结论；检索不到结果时返回 `null`，不得编造内容。

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
├── listNews.md
├── listFlashNews.md
├── getNewsDetail.md
├── queryFlashAnalysis.md
├── queryNewsAnalysis.md
├── queryStockNewsAnalysis.md
├── listResearchReports.md
├── countResearchStatus.md
├── getResearchReport.md
└── queryResearchAnalysis.md
```

**脚本调用方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

---

### Tool-1: 查询重大新闻列表

**功能**：分页查询重大新闻，按 `publish_time` 倒序返回。

**适用场景**：用户查询财经新闻、重大新闻、某时间段新闻列表、某来源新闻列表，且需要原始新闻标题/正文/来源/发布时间。

**不适合场景**：按语义关键词、评分、行业/主题/股票标签查询新闻分析 → 使用 Tool-5；查询单条新闻详情 → 使用 Tool-3。

**调用参数**：见 `references/listNews.md`

**执行方法**：

```bash
node scripts/call_api.js --api listNews --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造新闻。

---

### Tool-2: 查询快讯列表

**功能**：分页查询快讯，按 `publish_time` 倒序返回。

**适用场景**：用户查询最新快讯、实时资讯、短新闻列表，且需要快讯标题、正文、来源、发布时间。

**不适合场景**：按评分筛选快讯分析结果 → 使用 Tool-4；查询重大新闻列表 → 使用 Tool-1。

**调用参数**：见 `references/listFlashNews.md`

**执行方法**：

```bash
node scripts/call_api.js --api listFlashNews --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造快讯。

---

### Tool-3: 查询新闻详情及分析数据

**功能**：按 `news_id` 查询单条重大新闻详情及对应分析数据。

**适用场景**：用户提供新闻 ID 并要求查看新闻全文、原文链接、摘要、标签、评分或详细分析。

**不适合场景**：用户未提供新闻 ID → 先用 Tool-1 或 Tool-5 查候选新闻；查询快讯 → 使用 Tool-2 或 Tool-4。

**调用参数**：见 `references/getNewsDetail.md`

**执行方法**：

```bash
node scripts/call_api.js --api getNewsDetail --params '<JSON>'
```

**约束与限制**：如果检索不到结果或无分析数据，按接口返回 `null`，不得补写分析。

---

### Tool-4: 查询快讯分析结果

**功能**：按快讯评分绝对值下限查询快讯分析结果，默认按 `total_score` 倒序返回。

**适用场景**：用户查询高重要性快讯、市场相关快讯、情绪影响较大的快讯，或需要快讯打分依据。

**不适合场景**：查询原始快讯列表 → 使用 Tool-2；查询重大新闻分析 → 使用 Tool-5。

**调用参数**：见 `references/queryFlashAnalysis.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryFlashAnalysis --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造分析。

---

### Tool-5: 查询重大新闻分析结果

**功能**：查询重大新闻分析结果；传入 `keyword` 时按语义相似度排序，否则按 `publish_time` 倒序排序。

**适用场景**：用户按语义关键词、新闻类型、行业、主题、股票标签或评分筛选新闻分析结果。

**不适合场景**：查询原始新闻列表 → 使用 Tool-1；按单只股票名称或代码查询相关新闻分析 → 使用 Tool-6。

**调用参数**：见 `references/queryNewsAnalysis.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryNewsAnalysis --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造分析。

---

### Tool-6: 按个股查询新闻分析结果

**功能**：按股票名称或股票代码分页查询相关重大新闻分析结果，按发布时间倒序返回。

**适用场景**：用户查询某只股票相关新闻、个股资讯影响、股票相关重大新闻分析。

**不适合场景**：查询股票行情、PE/PB、财务报表 → 使用 `hedgehog-company-index-data`；查询非个股限定的新闻分析 → 使用 Tool-5。

**调用参数**：见 `references/queryStockNewsAnalysis.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryStockNewsAnalysis --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造新闻；`stock_name` 与 `stock_code` 至少提供一个。

---

### Tool-7: 查询 A 股研报列表

**功能**：分页查询 A 股研报，按 `publish_date` 倒序返回。

**适用场景**：用户查询研报列表、某股票研报、某行业研报、某机构或时间段内的研究报告。

**不适合场景**：按语义关键词或评分筛选研报分析 → 使用 Tool-10；查询单篇研报详情 → 使用 Tool-9。

**调用参数**：见 `references/listResearchReports.md`

**执行方法**：

```bash
node scripts/call_api.js --api listResearchReports --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造研报。

---

### Tool-8: 统计研报处理状态

**功能**：统计各 Pipeline 状态下的研报数量。

**适用场景**：用户查询研报解析/分析处理进度、不同处理状态数量。

**不适合场景**：查询研报正文或分析内容 → 使用 Tool-7、Tool-9 或 Tool-10。

**调用参数**：见 `references/countResearchStatus.md`

**执行方法**：

```bash
node scripts/call_api.js --api countResearchStatus --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造状态数量。

---

### Tool-9: 查询研报详情及分析数据

**功能**：按 `report_id` 查询单篇研报详情及分析数据。

**适用场景**：用户提供研报 ID 并要求查看研报正文、PDF 链接、摘要、标签、评级、目标价或详细分析。

**不适合场景**：用户未提供研报 ID → 先用 Tool-7 或 Tool-10 查候选研报；查询研报列表 → 使用 Tool-7。

**调用参数**：见 `references/getResearchReport.md`

**执行方法**：

```bash
node scripts/call_api.js --api getResearchReport --params '<JSON>'
```

**约束与限制**：如果检索不到结果或无分析数据，按接口返回 `null`，不得补写分析。

---

### Tool-10: 查询研报分析结果

**功能**：查询研报分析结果；传入 `keyword` 时按语义相似度排序，否则按 `research_date` 倒序排序。

**适用场景**：用户按语义关键词、研报类型、行业、主题、股票标签、评级、目标价或评分筛选研报分析。

**不适合场景**：查询原始研报列表 → 使用 Tool-7；查询单篇研报详情 → 使用 Tool-9。

**调用参数**：见 `references/queryResearchAnalysis.md`

**执行方法**：

```bash
node scripts/call_api.js --api queryResearchAnalysis --params '<JSON>'
```

**约束与限制**：如果检索不到结果，返回 `null`，不得编造分析。

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
| 财经新闻、快讯、新闻分析              | **本 skill**                  |
| 研报列表、研报详情、研报分析          | **本 skill**                  |
| 股票行情、基本面、财务报表、申万行业  | hedgehog-company-index-data   |
| 宏观指标（利率 / CPI / PMI / 社融等） | hedgehog-macro-industry-data  |
| 上市公司公告、交易所公告、监管函      | 不适用任何本系列 skill        |

### 用户触发示例

#### 查询新闻资讯

- "查一下今天的财经重大新闻" → Tool-1
- "最新市场快讯有哪些" → Tool-2
- "查看新闻 ID 123 的详情和分析" → Tool-3
- "找总分较高的快讯分析" → Tool-4
- "搜索和固态电池相关的新闻分析" → Tool-5
- "宁德时代最近相关新闻影响" → Tool-6

#### 查询研报

- "最近有哪些半导体行业研报" → Tool-7
- "研报处理状态统计" → Tool-8
- "查看研报 ID 456 的详情" → Tool-9
- "搜索机器人主题的研报分析" → Tool-10

### 注意事项

- **时间格式**：新闻时间字段通常使用 ISO 风格字符串；研报日期通常使用 `YYYY-MM-DD`
- **路径参数**：详情接口必须提供 `news_id` 或 `report_id`
- **分页参数**：批量接口通常使用 `page` 和 `page_size`，具体限制以 reference 文档为准
- **返回数据**：所有 Tool 检索不到结果时必须返回 `null`，不得编造数据、新闻、研报或分析结论
