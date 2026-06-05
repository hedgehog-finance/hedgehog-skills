---
name: hedgehog-news-reports
description: >
  从刺猬投研AI数据源查询快讯分析、重大新闻、新闻分析、A股研报、研报分析以及上市公司公告。
  【适用】快讯分析、新闻详情、重大新闻分析、研报详情、研报分析、上市公司公告详情、公告分析。
  【不适用】股票行情、基本面、财务报表、申万行业数据 → 用 hedgehog-company-index-data；
  宏观指标时间序列（CPI / PMI / 利率 / 社融等） → 用 hedgehog-macro-industry-data。
  触发词：财经新闻、重大新闻、快讯、资讯、新闻分析、股票新闻、个股资讯、
  研报、研究报告、报告分析、上市公司公告、交易所公告、年报、季报、定期报告、公告检索、公告详情；
  news, flash news, financial news, stock news, research report, research analysis, announcement, disclosure.
version: 1.1.0

---

# hedgehog-news-reports

本 skill 通过 Node.js 脚本调用刺猬投研 AI 数据接口（`https://api.ciweiai.com/api/data`），
查询快讯分析、重大新闻分析、A 股研报分析以及上市公司公告分析。

---

## 核心功能工作流 (Workflow)

1. 识别查询对象：快讯分析、重大新闻、新闻分析、研报、研报分析、公告详情或公告分析。
2. 区分用户要"原始内容"还是"分析结果"：
   - 要查询快讯分析 → Tool-1；
   - 要新闻原文 → Tool-2；要新闻分析 → Tool-3；
   - 要研报原文 → Tool-4；要研报分析 → Tool-5；
   - 要公告原文 → Tool-6；要公告分析 → Tool-7。
3. 用户要详情但未提供 `news_id` / `report_id` / `announcement_id` 时，
   先用分析类 Tool 找候选 ID；不要自行猜测 ID。
4. 选择对应 Tool 后，按本文件参数表组织调用参数。
5. 使用 `scripts/call_api.js` 执行调用。
6. 解析结果，保留标题、发布时间/日期、来源/机构、摘要、正文或分析结论；
   无结果返回 `null`，不得编造内容。

---

## Tools 基础功能

`Tools 基础功能` 一般由本 Skill 的 `核心功能工作流 (Workflow)` 调用。
核心功能场景不适合、Agent 自由编排工作流或提示词指定特定 Tool 时，才直接匹配本节 Tool。

所有 Tools 执行脚本位于 `scripts/` 目录：

```
scripts/
└── call_api.js     // 调用刺猬投研 AI 数据接口
```

部分接口完整返回字段说明在 `references/` 目录，仅当 Tool 章节注明时查阅。

**脚本调用方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

### 通用响应结构

所有接口返回遵循以下结构：

```json
{
  "code": 200,
  "message": "success",
  "data": ... 
}
```

`data` 具体结构（对象/数组/分页 items）见各 Tool 章节。

### 通用参数：`fields`

所有 Tool 均支持 `fields` 参数（类型：`string[]`，可选）。
若提供，脚本将在响应返回后对 `data` 中每条记录只保留 `fields` 中列出的字段，
其余字段丢弃；未提供则返回全量字段。

- 当 `data` 为单条记录（详情接口）：直接对 `data` 顶层字段过滤。
- 当 `data` 为分页结构（含 `items` 数组）：过滤 `items[]` 每个元素字段，保留外层 `total/page/page_size/db_source`。
- 当 `data` 为数组：对每个元素的字段过滤。

示例：

```json
{ "fields": ["news_id", "title", "publish_time", "summary"] }
```

---

### Tool-1: 查询快讯分析结果 (queryFlashNewsAnalysis)

**功能**：按消息来源和起始发布时间查询快讯分析结果。

**适用场景**：按消息来源或起始发布时间筛选快讯分析。

**不适合场景**：查询重大新闻分析 → Tool-3。

**执行方法**：

```bash
node scripts/call_api.js --api queryFlashNewsAnalysis --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| source | string | 否 | - | 消息来源，精确匹配；可选项：`华尔街见闻`、`第一财经`、`财联社`、`金融界` |
| start_time | string | 否 | - | 起始发布时间；支持 `YYYY-MM-DD HH:MM:SS`、`YYYY-MM-DD HH:MM`、`YYYYMMDD HH:MM:SS`、`YYYYMMDD HH:MM`、`YYYY-MM-DD`、`YYYYMMDD` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 除通用 `fields` 外，接口 JSON Body 仅发送 `source`、`start_time`。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段见字段总览。

字段总览：`id, title, content, source, publish_time, information_importance, emotional_importance, knowledge_value, market_relevance, total_score, reasoning`。

**约束与限制**：无结果返回 `null`，不得编造快讯。

---

### Tool-2: 查询新闻详情及分析数据 (getNewsDetail)

**功能**：按 `news_id` 查询单条重大新闻详情及对应分析数据。无分析数据时，`data.analysis` 为 `null`。

**适用场景**：用户提供新闻 ID，要求查看新闻全文、原文链接、摘要、标签、评分或详细分析。

**不适合场景**：用户未提供新闻 ID → 先用 Tool-3 查候选；查询快讯分析 → Tool-1。

**执行方法**：

```bash
node scripts/call_api.js --api getNewsDetail --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| news_id | int | 是 | - | 路径参数，对应 `major_news.id` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

**返回值**：`data` 为单个新闻对象（字段数≤10），分析数据嵌套在 `data.analysis` 内。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 新闻 ID |
| title | string | 新闻标题 |
| content | string | 新闻正文 |
| source | string | 消息来源 |
| publish_time | string | 发布时间 |
| url | string | 原文链接 |
| db_source | string | 数据来源表名 |
| analysis | object \| null | 分析对象，含 `title / date / summary / tags(news_type, industries, themes, stocks) / global_scoring(importance_score, market_sentiment_score, horizon_impact_score, macro_impact_score, disruptive_tech_score) / max_industry_impact / max_stock_impact / industry_impacts / stock_impacts / news_analysis`；无分析为 `null` |

**约束与限制**：无结果或无分析数据时按接口返回 `null`，不得补写分析。

---

### Tool-3: 查询重大新闻分析结果 (queryNewsAnalysis)

**功能**：查询重大新闻分析结果。传入 `keyword` 时按语义相似度排序，否则按 `sort` 指定字段（默认 `publish_time`）倒序。

**适用场景**：按语义关键词、新闻类型、标签（行业/主题/股票名称/代码）或评分筛选新闻分析。

**不适合场景**：查询单条新闻详情 → Tool-2。

**执行方法**：

```bash
node scripts/call_api.js --api queryNewsAnalysis --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 否 | - | 语义检索关键字，匹配 `major_news_analysis.embedding`（向量来源为 `source_title / title / summary / news_analysis / tags` 以及行业/主题派生文本）；未传 `start_date` 时默认查 `end_date`（未传则当前日期）往前 3 个月内数据；先取最相似的 1000 条候选，再按 `sort` 字段倒序返回 |
| sort | enum | 否 | publish_time | 排序字段，按字段值倒序；枚举：`publish_time`、`importance_score`、`market_sentiment_score`、`horizon_impact_score`、`macro_impact_score`、`disruptive_tech_score`、`max_industry_impact`、`max_stock_impact` |
| start_date | string | 否 | - | 起始发布日期，距当前≤90天，否则脚本拒绝执行 |
| end_date | string | 否 | - | 结束发布日期 |
| importance_score | int | 否 | - | 资讯重要性绝对值下限 |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| disruptive_tech_score | int | 否 | - | 颠覆性技术影响绝对值下限 |
| max_industry_impact | int | 否 | - | 最大行业影响分绝对值下限 |
| max_stock_impact | int | 否 | - | 最大个股影响分绝对值下限 |
| news_type | enum | 否 | - | 新闻类型，可选值：`macro`（宏观，包括政治、经济和政策资讯）、`industry`（产业/行业资讯）、`stock`（公司/个股资讯） |
| tags | string[] | 否 | - | JSONB 任一标签匹配；行业、主题、股票名称/代码统一通过 `tags` 匹配，例如 `["银行", "平安银行", "000001.SZ"]` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=10`。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段数 > 10，**完整返回字段说明见 `references/queryNewsAnalysis_response.md`**。

字段总览：`news_id, source_title, title, publish_time, news_type, summary, news_analysis, global_scoring, max_industry_impact, max_stock_impact, industry_impacts, stock_impacts, tags`。

**约束与限制**：无结果返回 `null`，不得编造分析。

---

### Tool-4: 查询研报详情及分析数据 (getResearchReport)

**功能**：按 `report_id` 查询单篇 A 股研报详情及分析数据。无分析数据时，`data.analysis` 为 `null`。

**适用场景**：用户提供研报 ID，要求查看研报正文、PDF 链接、摘要、标签、评级、目标价或详细分析。

**不适合场景**：用户未提供研报 ID → 先用 Tool-5 查候选；非个股研报筛选 → Tool-5。

**执行方法**：

```bash
node scripts/call_api.js --api getResearchReport --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| report_id | int | 是 | - | 路径参数，对应 `a_research_reports.id` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

**返回值**：`data` 为单篇研报对象（字段数 > 10）。
**完整返回字段说明见 `references/getResearchReport_response.md`**。

字段总览：`id, report_type, title, stock_code, stock_name, industry_name, content_md, content_json, org_name, publish_date, pdf_url, db_source, analysis`。

`analysis` 含：`date / summary / tags(report_type, industries, themes, stocks) / global_scoring(importance_score, market_sentiment_score, horizon_impact_score) / max_industry_impact / max_stock_impact / industry_impacts / stock_impacts / rating / target_price_lower / target_price_upper / report_analysis`。

**约束与限制**：无结果或无分析数据时按接口返回 `null`，不得补写分析。

---

### Tool-5: 查询研报分析结果 (queryResearchAnalysis)

**功能**：查询 A 股研报分析结果。传入 `keyword` 时按语义相似度排序，否则按 `sort` 指定字段（默认 `research_date`）倒序。

**适用场景**：按语义关键词、研报类型、标签（行业/主题/股票名称/代码）、评级、目标价或评分筛选研报分析。

**不适合场景**：查询单篇研报详情 → Tool-4。

**执行方法**：

```bash
node scripts/call_api.js --api queryResearchAnalysis --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 否 | - | 语义检索关键字，匹配 `research_report_analysis.embedding`（向量来源为 `summary / tags`，不包含研报标题或 `report_analysis` 文本）；未传 `start_date` 时默认查 `end_date`（未传则当前日期）往前 3 个月内数据；先取最相似的 1000 条候选，再按 `sort` 字段倒序返回 |
| sort | enum | 否 | research_date | 排序字段，按字段值倒序；枚举：`research_date`、`importance_score`、`market_sentiment_score`、`horizon_impact_score`、`max_industry_impact`、`max_stock_impact` |
| start_date | string | 否 | - | 起始研报日期，距当前≤90天，否则脚本拒绝执行 |
| end_date | string | 否 | - | 结束研报日期 |
| importance_score | int | 否 | - | 研报重要性绝对值下限 |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| max_industry_impact | int | 否 | - | 最大行业影响分绝对值下限 |
| max_stock_impact | int | 否 | - | 最大个股影响分绝对值下限 |
| report_type | enum | 否 | - | 研报类型，可选值：`macro`（宏观研报）、`industry`（行业研报）、`stock`（个股研报） |
| tags | string[] | 否 | - | JSONB 任一标签匹配；行业、主题、股票名称/代码统一通过 `tags` 匹配，例如 `["银行", "平安银行", "000001.SZ"]` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=10`。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段数 > 10，**完整返回字段说明见 `references/queryResearchAnalysis_response.md`**。

字段总览：`report_id, title, research_date, summary, report_type, tags, global_scoring, max_industry_impact, max_stock_impact, industry_impacts, stock_impacts, rating, target_price_lower, target_price_upper, report_analysis`。

**约束与限制**：无结果返回 `null`，不得编造分析。

---

### Tool-6: 查询上市公司公告详情及分析数据 (getAnnouncementDetail)

**功能**：按 `announcement_id` 查询单条公告详情及分析数据。无分析数据时，`data.analysis` 为 `null`。

**适用场景**：用户提供公告 ID，要求查看公告正文、PDF 链接、摘要、分类、评分或详细分析。

**不适合场景**：用户未提供公告 ID → 先用 Tool-7 查候选公告。

**执行方法**：

```bash
node scripts/call_api.js --api getAnnouncementDetail --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| announcement_id | int | 是 | - | 路径参数，对应 `announcements.id` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

**返回值**：`data` 为单条公告对象（字段数 > 10）。
**完整返回字段说明见 `references/getAnnouncementDetail_response.md`**。

字段总览：`id, source_type, stock_code, exchange, stock_name, title, announcement_time, url, category, content_md, content_json, parse_skip_reason, db_source, analysis`。

`analysis` 含：`title / date / summary / tags(announce_type, announce_content, stock) / global_scoring(importance_score, stock_impact_score) / announce_type / announce_analysis`；无分析为 `null`。

**约束与限制**：无结果或无分析数据时按接口返回 `null`，不得补写分析。

---

### Tool-7: 查询公告分析结果 (queryAnnouncementAnalysis)

**功能**：查询成功分析的公告业务结果。传入 `keyword` 时按语义相似度排序，否则按 `sort` 指定字段（默认 `announcement_date`）倒序。

**适用场景**：按语义关键词、公告类型、标签（股票名称/代码）、评分筛选公告分析。

**不适合场景**：查询单条公告详情 → Tool-6；查询新闻或研报 → Tool-1 ~ Tool-5。

**执行方法**：

```bash
node scripts/call_api.js --api queryAnnouncementAnalysis --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 否 | - | 语义检索关键字，匹配 `announcement_analysis.embedding`（向量来源为 `summary / tags`，不包含公告标题或 `announce_analysis` 文本）；未传 `start_date` 时默认查 `end_date`（未传则当前日期）往前 3 个月内数据；先取最相似的 1000 条候选，再按 `sort` 字段倒序返回 |
| sort | enum | 否 | announcement_date | 排序字段，按字段值倒序；枚举：`announcement_date`、`importance_score`、`stock_impact_score` |
| start_date | string | 否 | - | 起始公告分析日期，距当前≤90天，否则脚本拒绝执行 |
| end_date | string | 否 | - | 结束公告分析日期 |
| importance_score | int | 否 | - | 公告重要性绝对值下限 |
| stock_impact_score | int | 否 | - | 个股影响评分绝对值下限 |
| announce_type | enum | 否 | - | 公告类型枚举：`U1` 定期财务报告、`U2` 业绩预告及快报、`U3` 融资与资金管理、`U4` 并购重组与重大交易、`U5` 股东权益变动、`U6` 公司治理与审计、`U7` 异常与风险警示、`U8` 司法与破产重整、`U9` 其他重大事项、`U10` 交易所监管 |
| tags | string[] | 否 | - | JSONB 任一标签匹配；股票名称/代码统一通过 `tags` 匹配，例如 `["平安银行", "000001.SZ"]` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=10`。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段数 = 9，直接列出：

| 字段 | 类型 | 说明 |
|------|------|------|
| announcement_id | int | 公告 ID |
| title | string | 公告标题 |
| announcement_date | string | 公告日期 |
| summary | string | 摘要 |
| announce_type | string | 公告类型（U1~U10） |
| tags | string[] | 标签数组 |
| global_scoring | object | 评分：`importance_score / stock_impact_score` |
| stock_impacts | array | 个股影响明细，元素含 `name / code / total_score` |
| announce_analysis | string | 公告分析正文 |

**约束与限制**：无结果返回 `null`，不得编造分析。

---

## 错误处理

| 错误类型   | 处理方式                                               |
| ---------- | ------------------------------------------------------ |
| 参数校验失败（脚本侧） | 检查 `source`、`start_time`、`start_date` 或必填项是否符合要求 |
| HTTP 4xx   | 检查参数格式与路径参数                                  |
| HTTP 5xx   | 提示用户服务端错误，建议稍后重试                       |
| 连接失败   | 提示用户检查 `https://api.ciweiai.com/api/data` 可达性 |

---

## 补充说明

### 与其他 Skill 的边界

| 查询对象                              | 使用的 Skill                  |
| ------------------------------------- | ----------------------------- |
| 快讯分析                              | **本 skill**                  |
| 重大新闻分析                          | **本 skill**                  |
| 研报详情、研报分析                    | **本 skill**                  |
| 上市公司公告详情、公告分析            | **本 skill**                  |
| 股票行情、基本面、财务报表、申万行业  | hedgehog-company-index-data   |
| 宏观指标（利率 / CPI / PMI / 社融等） | hedgehog-macro-industry-data  |

### 用户触发示例

#### 查询新闻资讯

- "查询财联社最近的快讯分析" → Tool-1
- "查看新闻 ID 123 的详情和分析" → Tool-2
- "搜索和固态电池相关的新闻分析" → Tool-3

#### 查询研报

- "查看研报 ID 456 的详情" → Tool-4
- "搜索机器人主题的研报分析" → Tool-5

#### 查询公告

- "查看公告 ID 1 的详情和分析" → Tool-6
- "平安银行最近的公告分析" → Tool-7

### 注意事项

- **时间格式**：快讯查询 `start_time` 支持 `YYYY-MM-DD HH:MM:SS`、`YYYY-MM-DD HH:MM`、`YYYYMMDD HH:MM:SS`、`YYYYMMDD HH:MM`、`YYYY-MM-DD`、`YYYYMMDD`；
  研报日期、`start_date / end_date` 通常使用 `YYYY-MM-DD`。
- **路径参数**：详情接口必须提供 `news_id` / `report_id` / `announcement_id`。
- **`fields` 参数**：所有 Tool 通用，用于裁剪 `data` 每条记录字段。
- **`tags` 参数**：分析查询接口使用 flat 字符串数组匹配，行业、主题、股票名称/代码统一放入同一数组。
- **返回数据**：所有 Tool 无结果时必须返回 `null`，不得编造数据、新闻、研报或分析结论。
