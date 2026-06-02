---
name: hedgehog-news-reports
description: >
  从刺猬投研AI数据源查询财经快讯、重大新闻、新闻分析、A股研报、研报分析以及上市公司公告。
  【适用】快讯列表、新闻详情、重大新闻分析、个股相关新闻分析、研报详情、研报分析、上市公司公告检索、上市公司公告详情。
  【不适用】股票行情、基本面、财务报表、申万行业数据 → 改用 hedgehog-company-index-data；
  宏观指标时间序列（CPI / PMI / 利率 / 社融等） → 改用 hedgehog-macro-industry-data。
  触发词：财经新闻、重大新闻、快讯、资讯、新闻分析、股票新闻、个股资讯、
  研报、研究报告、报告分析、上市公司公告、交易所公告、年报、季报、定期报告、公告检索、公告详情；
  news, flash news, financial news, stock news, research report, research analysis, announcement, disclosure.
version: 2.0

---

# hedgehog-news-reports

本 skill 通过 Node.js 脚本调用刺猬投研 AI 数据接口（`https://api.ciweiai.com/api/data`），
查询财经快讯、重大新闻分析、A 股研报分析以及上市公司公告。

---

## 核心功能工作流 (Workflow)

1. 识别用户查询对象：快讯、重大新闻、新闻分析、个股相关新闻、研报、研报分析或上市公司公告。
2. 区分用户要"原始内容"还是"分析结果"：
   - 要快讯/新闻/研报/公告原文 → 列表或详情 Tool；
   - 要按评分、标签、语义关键词筛选 → 分析 Tool。
3. 如果用户要详情但未提供 `news_id` / `report_id` / `announcement_id`，
   先用列表或分析 Tool 找候选 ID；不要自行猜测 ID。
4. 选择对应 Tool 后，按本文件给出的参数表组织调用参数。
5. 使用 `scripts/call_api.js` 执行调用。
6. 解析返回结果，保留标题、发布时间/日期、来源/机构、摘要、正文或分析结论；
   检索不到结果时返回 `null`，不得编造内容。

---

## Tools 基础功能

`Tools 基础功能` 一般由本 Skill 的 `核心功能工作流 (Workflow)` 调用。
当核心功能场景不适合时、Agent 自由编排工作流时，或提示词指定调用特定 Tool 时，才直接匹配本节 Tool。

所有 Tools 的执行脚本位于 `scripts/` 目录：

```
scripts/
└── call_api.js     // 调用刺猬投研 AI 数据接口
```

部分接口的完整返回字段说明放在 `references/` 目录，仅当 Tool 章节注明时才需查阅。

**脚本调用方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

### 通用响应结构

所有接口返回均遵循以下结构：

```json
{
  "code": 0,
  "message": "success",
  "data": ... 
}
```

`data` 的具体结构（对象/数组/分页 items）见各 Tool 章节。

### 通用参数：`fields`

所有 Tool 均支持 `fields` 参数（类型：`string[]`，可选）。
若提供，脚本将在响应返回后对 `data` 中每条记录只保留 `fields` 中列出的字段，
其余字段被丢弃；若未提供，则返回全量字段。

- 当 `data` 为单条记录（详情接口）：直接对 `data` 顶层字段过滤。
- 当 `data` 为分页结构（含 `items` 数组）：对 `items[]` 每个元素的字段过滤，外层 `total/page/page_size/db_source` 保留。
- 当 `data` 为数组：对每个元素的字段过滤。

示例：

```json
{ "fields": ["news_id", "title", "publish_time", "summary"] }
```

---

### Tool-1: 查询快讯列表 (listFlashNews)

**功能**：分页查询快讯，按 `publish_time` 倒序返回。

**适用场景**：用户查询最新快讯、实时资讯、短新闻列表，需要快讯标题、正文、来源、发布时间。

**不适合场景**：按语义关键词或评分筛选 → 使用 Tool-3；查询单条新闻详情 → 使用 Tool-2。

**执行方法**：

```bash
node scripts/call_api.js --api listFlashNews --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| start_time | string | 否 | - | 起始发布时间（ISO 字符串），距当前时间不得超过 5 天，否则脚本拒绝执行 |
| source | string | 否 | - | 消息来源，例如 `财联社` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=50`、`end_time` 不传（采用接口默认值）。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段数 > 10，**完整返回字段说明见 `references/listFlashNews_response.md`**。

字段总览：`id, title, content, source, publish_time, hash, information_importance, emotional_importance, knowledge_value, market_relevance, total_score, reasoning`。

**约束与限制**：检索不到结果时返回 `null`，不得编造快讯。

---

### Tool-2: 查询新闻详情及分析数据 (getNewsDetail)

**功能**：按 `news_id` 查询单条重大新闻详情及对应分析数据。若没有分析数据，`data.analysis` 为 `null`。

**适用场景**：用户提供新闻 ID 并要求查看新闻全文、原文链接、摘要、标签、评分或详细分析。

**不适合场景**：用户未提供新闻 ID → 先用 Tool-3 查候选；查询快讯 → 使用 Tool-1。

**执行方法**：

```bash
node scripts/call_api.js --api getNewsDetail --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| news_id | int | 是 | - | 路径参数，对应 `major_news.id` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

**返回值**：`data` 为单个新闻对象（字段数 ≤ 10），分析数据嵌套在 `data.analysis` 内。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 新闻 ID |
| title | string | 新闻标题 |
| content | string | 新闻正文 |
| source | string | 消息来源 |
| publish_time | string | 发布时间 |
| url | string | 原文链接 |
| db_source | string | 数据来源表名 |
| analysis | object \| null | 分析对象，含 `title / date / summary / tags(news_type, industries, themes, stocks) / global_scoring(importance_score, market_sentiment_score, horizon_impact_score, macro_impact_score, disruptive_tech_score) / max_industry_impact / max_stock_impact / impacts / news_analysis`；无分析则为 `null` |

**约束与限制**：检索不到结果或无分析数据时按接口返回 `null`，不得补写分析。

---

### Tool-3: 查询重大新闻分析结果 (queryNewsAnalysis)

**功能**：查询重大新闻分析结果。传入 `keyword` 时按语义相似度排序，否则按 `publish_time` 倒序。

**适用场景**：用户按语义关键词、新闻类型、行业、主题、股票标签或评分筛选新闻分析。

**不适合场景**：按单只股票名称或代码检索 → 使用 Tool-4；查询单条新闻详情 → 使用 Tool-2。

**执行方法**：

```bash
node scripts/call_api.js --api queryNewsAnalysis --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 否 | - | 语义检索关键字 |
| start_date | string | 否 | - | 起始发布日期，距当前不得超过 90 天，否则脚本拒绝执行 |
| importance_score | int | 否 | - | 资讯重要性绝对值下限 |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| news_type | string | 否 | - | 新闻类型，可选值：`macro`（宏观，包括政治、经济和政策资讯）、`industry`（产业/行业资讯）、`stock`（公司/个股资讯） |
| industries | string[] | 否 | - | 行业标签数组，脚本会自动合并到接口的 `tags_contains.industries`，任一匹配 |
| themes | string[] | 否 | - | 主题标签数组，脚本会自动合并到接口的 `tags_contains.themes`，任一匹配 |
| stock_codes | string[] | 否 | - | 股票代码数组，脚本会自动合并为 `tags_contains.stocks=[{code}]`，任一匹配 |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=10`、
> `end_date / horizon_impact_score / macro_impact_score / disruptive_tech_score / max_industry_impact / max_stock_impact` 均不传（采用接口默认值）。
> 上表 `industries / themes / stock_codes` 由脚本自动合并到接口最新要求的 `tags_contains`（JSONB 包含过滤）对象中，调用方无需直接构造 `tags_contains`。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段数 > 10，**完整返回字段说明见 `references/queryNewsAnalysis_response.md`**。

字段总览：`news_id, title, publish_time, news_type, summary, news_analysis, global_scoring, max_industry_impact, max_stock_impact, impacts, tags`。

**约束与限制**：检索不到结果时返回 `null`，不得编造分析。

---

### Tool-4: 按个股查询新闻分析结果 (queryStockNewsAnalysis)

**功能**：按 `tags.stocks` 中的股票代码分页查询相关重大新闻分析，按发布时间倒序返回。

**适用场景**：用户查询某只股票相关新闻、个股资讯影响、股票相关重大新闻分析。

**不适合场景**：查询股票行情、PE/PB、财务报表 → 使用 `hedgehog-company-index-data`；
非个股限定的新闻分析 → 使用 Tool-3。

**执行方法**：

```bash
node scripts/call_api.js --api queryStockNewsAnalysis --params '<JSON>'
```

**输入参数**（`stock_name` 与 `stock_code` 至少提供一个，否则脚本拒绝执行）：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| stock_name | string | 条件必填 | - | 股票名称，与 `stock_code` 至少二选一 |
| stock_code | string | 条件必填 | - | 股票代码，支持带或不带 `.SH` / `.SZ` / `.BJ` 后缀，与 `stock_name` 至少二选一 |
| importance_score | int | 否 | - | 资讯重要性绝对值下限 |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| horizon_impact_score | int | 否 | - | 长短期影响绝对值下限 |
| macro_impact_score | int | 否 | - | 宏观经济影响绝对值下限 |
| disruptive_tech_score | int | 否 | - | 颠覆性技术影响绝对值下限 |
| max_industry_impact | int | 否 | - | 最大行业影响分绝对值下限 |
| max_stock_impact | int | 否 | - | 最大个股影响分绝对值下限 |
| keywords | string[] | 否 | - | 关键词过滤，匹配 `title / summary / news_analysis`，任一命中即返回 |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=10`。
> 接口已不再接受 `start_date / end_date`，需要时间过滤请改用 Tool-3。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段数 = 10，直接列出：

| 字段 | 类型 | 说明 |
|------|------|------|
| news_id | int | 新闻 ID |
| title | string | 新闻标题 |
| date | string | 发布时间 |
| summary | string | 摘要 |
| tags | object | 标签：`stocks[{name, code}]` 等 |
| global_scoring | object | 全局评分：`importance_score / market_sentiment_score / horizon_impact_score / macro_impact_score / disruptive_tech_score` |
| max_industry_impact | int | 最大行业影响分 |
| max_stock_impact | int | 最大个股影响分 |
| impacts | object | `industry_impacts[]` / `stock_impacts[]` 详细影响列表 |
| news_analysis | string | 详细分析正文 |

**约束与限制**：检索不到结果时返回 `null`，不得编造新闻；`stock_name` 与 `stock_code` 至少二选一，否则脚本拒绝执行。

---

### Tool-5: 查询研报详情及分析数据 (getResearchReport)

**功能**：按 `report_id` 查询单篇 A 股研报详情及分析数据。若没有分析数据，`data.analysis` 为 `null`。

**适用场景**：用户提供研报 ID 并要求查看研报正文、PDF 链接、摘要、标签、评级、目标价或详细分析。

**不适合场景**：用户未提供研报 ID → 先用 Tool-6 查候选；非个股研报筛选 → 使用 Tool-6。

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

**约束与限制**：检索不到结果或无分析数据时按接口返回 `null`，不得补写分析。

---

### Tool-6: 查询研报分析结果 (queryResearchAnalysis)

**功能**：查询 A 股研报分析结果。传入 `keyword` 时按语义相似度排序，否则按 `research_date` 倒序。

**适用场景**：用户按语义关键词、研报类型、行业、主题、股票标签、评级、目标价或评分筛选研报分析。

**不适合场景**：查询单篇研报详情 → 使用 Tool-5。

**执行方法**：

```bash
node scripts/call_api.js --api queryResearchAnalysis --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 否 | - | 语义检索关键字 |
| start_date | string | 否 | - | 起始研报日期，距当前不得超过 90 天，否则脚本拒绝执行 |
| importance_score | int | 否 | - | 研报重要性绝对值下限 |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| report_type | string | 否 | - | 研报类型，可选值：`macro`（宏观研报）、`industry`（行业研报）、`stock`（个股研报） |
| industries | string[] | 否 | - | 行业标签数组，脚本会自动合并到接口的 `tags_contains.industries`，任一匹配 |
| themes | string[] | 否 | - | 主题标签数组，脚本会自动合并到接口的 `tags_contains.themes`，任一匹配 |
| stock_codes | string[] | 否 | - | 股票代码数组，脚本会自动合并为 `tags_contains.stocks=[{code}]`，任一匹配 |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=10`、
> `end_date / horizon_impact_score / max_industry_impact / max_stock_impact` 均不传（采用接口默认值）。
> 上表 `industries / themes / stock_codes` 由脚本自动合并到接口最新要求的 `tags_contains`（JSONB 包含过滤）对象中，调用方无需直接构造 `tags_contains`。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段数 > 10，**完整返回字段说明见 `references/queryResearchAnalysis_response.md`**。

字段总览：`report_id, research_date, summary, report_type, tags, global_scoring, max_industry_impact, max_stock_impact, impacts, rating, target_price_lower, target_price_upper, report_analysis`。

**约束与限制**：检索不到结果时返回 `null`，不得编造分析。

---

### Tool-7: 查询上市公司公告列表 (listAnnouncements)

**功能**：分页查询上市公司公告，按 `announcement_time` 倒序返回。

**适用场景**：用户查询某股票/某分类/某时间段的上市公司公告原文（含定期报告、临时公告等）。

**不适合场景**：要分析、评分、按主题筛选公告 → 当前 skill 不覆盖（仅返回原文与解析）；
查询新闻或研报 → 使用 Tool-1 ~ Tool-6。

**执行方法**：

```bash
node scripts/call_api.js --api listAnnouncements --params '<JSON>'
```

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| stock_code | string | 否 | - | 证券代码 |
| exchange | string | 否 | - | 交易所代码（如 `szse`、`sse`、`bse`） |
| category | string | 否 | - | 公告分类（如 `定期报告` 等） |
| start_time | string | 否 | - | 起始公告时间 |
| end_time | string | 否 | - | 结束公告时间 |
| has_content | bool | 否 | - | `true` 只查已解析正文；`false` 只查无正文 |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=50`。

**返回值**：`data` 为分页结构 `{ total, page, page_size, db_source, items[] }`。
单条 `items[]` 字段数 > 10，**完整返回字段说明见 `references/listAnnouncements_response.md`**。

字段总览：`id, source_type, stock_code, exchange, stock_name, title, announcement_time, url, category, content_md, content_json, parse_skip_reason`。

**约束与限制**：检索不到结果时返回 `null`，不得编造公告。

---

### Tool-8: 查询上市公司公告详情及分析数据 (getAnnouncementDetail)

**功能**：按 `announcement_id` 查询单条公告详情及分析数据。若没有分析数据，`data.analysis` 为 `null`。

**适用场景**：用户提供公告 ID 并要求查看公告正文、PDF 链接、摘要、分类、评分或详细分析。

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

**约束与限制**：检索不到结果或无分析数据时按接口返回 `null`，不得补写分析。

---

## 错误处理

| 错误类型   | 处理方式                                               |
| ---------- | ------------------------------------------------------ |
| 参数校验失败（脚本侧） | 检查 `start_date / start_time` 是否在允许范围；必填项是否提供 |
| HTTP 4xx   | 检查参数格式与路径参数                                  |
| HTTP 5xx   | 提示用户服务端错误，建议稍后重试                       |
| 连接失败   | 提示用户检查 `https://api.ciweiai.com/api/data` 是否可达 |

---

## 补充说明

### 与其他 Skill 的边界

| 查询对象                              | 使用的 Skill                  |
| ------------------------------------- | ----------------------------- |
| 财经快讯、重大新闻分析、个股新闻分析  | **本 skill**                  |
| 研报详情、研报分析                    | **本 skill**                  |
| 上市公司公告检索、公告详情            | **本 skill**                  |
| 股票行情、基本面、财务报表、申万行业  | hedgehog-company-index-data   |
| 宏观指标（利率 / CPI / PMI / 社融等） | hedgehog-macro-industry-data  |

### 用户触发示例

#### 查询新闻资讯

- "最新市场快讯有哪些" → Tool-1
- "查看新闻 ID 123 的详情和分析" → Tool-2
- "搜索和固态电池相关的新闻分析" → Tool-3
- "宁德时代最近相关新闻影响" → Tool-4

#### 查询研报

- "查看研报 ID 456 的详情" → Tool-5
- "搜索机器人主题的研报分析" → Tool-6

#### 查询公告

- "平安银行最近发了哪些公告" → Tool-7
- "查看公告 ID 1 的详情和分析" → Tool-8

### 注意事项

- **时间格式**：`publish_time / announcement_time` 通常使用 ISO 字符串；
  研报日期、`start_date / end_date` 通常使用 `YYYY-MM-DD`。
- **路径参数**：详情接口必须提供 `news_id` / `report_id` / `announcement_id`。
- **`fields` 参数**：所有 Tool 通用，用于裁剪 `data` 中每条记录的字段。
- **返回数据**：所有 Tool 检索不到结果时必须返回 `null`，不得编造数据、新闻、研报或分析结论。
