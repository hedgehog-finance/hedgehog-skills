---
name: hedgehog-news-reports
description: >
  查询金融资讯数据：快讯分析、重大新闻、新闻分析、A股研报、研报分析以及上市公司公告。
  【适用】查询新闻、研报、公告等。
  【不适用】股票行情、基本面、财务报表、申万行业数据。
  触发词：财经新闻、股票新闻、快讯、资讯、研报、公司公告、财务报告。
  news, financial news, stock news, research report, announcements.
version: 1.1.7
---

# 财经资讯数据

本 skill 通过接口查询财经相关快讯、新闻、研报以及上市公司公告等。

## 核心功能工作流 (Workflow)
1. 识别查询对象：快讯分析、重大新闻、新闻分析、研报、研报分析、公告详情或公告分析。
2. 区分用户要"原始单篇内容"还是"检索列表"：
   - 要查询快讯列表 → Tool-1；
   - 要新闻原文 → Tool-2；要新闻列表 → Tool-3；
   - 要研报原文 → Tool-4；要研报列表 → Tool-5；
   - 要公告原文 → Tool-6；要公告列表 → Tool-7。
3. 用户要原文详情但未提供 ID 时，先用分析类 Tool 找候选 ID；不要自行猜测 ID。
4. 选择对应 Tool 后，按本文件参数表组织调用参数。
5. 使用 `scripts/call_api.js` 执行调用。
6. 解析结果，保留标题、发布时间/日期、来源/机构、摘要、正文或分析结论；无结果返回 `null`，不得编造内容。

## Tools 基础功能
**执行方法**：`node scripts/call_api.js --api <接口名> --params '<JSON>'`
**检索区分**：`keyword` 向量匹配，须配合 `start_date` 限定时间；`tags` 用于精确匹配（行业/主题/股票名称/代码统一放入 tags）。

---

### Tool-1: queryFlashNewsAnalysis (查询快讯列表)
**适用场景**：获取最近快讯列表。
**典型调用指南**：查询最近一天的快讯：参数 source:[一天前的时间]

**输入参数 `params`：**
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| start_time | string | 否 | - | 起始时间（≤5天内，支持YYYY-MM-DD HH:MM:SS等） |
| source | string | 否 | - | 来源精确匹配：`华尔街见闻`、`第一财经`、`财联社`、`金融界` |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

**返回值 `data` (items[] 结构)：**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int | 快讯ID |
| title | string | 标题 |
| content | string | 正文 |
| source | string | 消息来源 |
| publish_time | string | 发布时间 |
| total_score | float | 总评分 |

---

### Tool-2: getNewsDetail (查询新闻详情)
**适用场景**：查看新闻全文及摘要、标签、评分和分析。

**输入参数 `params`：**
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| news_id | int | 是 | - | 新闻ID |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

**返回值 `data` (单对象结构)：**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int | 新闻ID |
| title | string | 新闻标题 |
| content | string | 新闻正文 |
| source | string | 消息来源 |
| publish_time | string | 发布时间 |
| url | string | 原文链接 |
| db_source | string | 数据库表名 |
| analysis | object\|null | 新闻分析json对象，无分析为null |

---

### Tool-3: queryNewsAnalysis (查询新闻列表)
**适用场景**：按语义关键词、新闻类型、标签或评分筛选新闻列表。
**典型调用指南**：
- 最近3天宏观新闻：news_type:'macro', start_date:[3天前], importance_score:4
- 最近3天'电子'行业新闻：news_type:'industry', start_date:[3天前], tags:["电子"], importance_score:4
- 最近一周'伊朗冲突'相关新闻：keyword:'伊朗冲突', start_date:[7天前], importance_score:4

**输入参数 `params`：**
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| keyword | string | 否 | - | 语义检索关键字（一定要输入start_date限定时间） |
| sort | enum | 否 | publish_time | 倒序字段：`publish_time`、`importance_score`、`market_sentiment_score`、`vector_distance` |
| start_date | string | 否 | - | 起始发布日期，只能查询90天内 |
| end_date | string | 否 | - | 结束发布日期 |
| importance_score | int | 是 | - | 重要性绝对值下限（2扩大，3重要，4特重） |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| news_type | enum | 否 | - | 类型：`macro`(宏观)、`industry`(产业/行业)、`stock`(公司/个股) |
| tags | string[] | 否 | - | 标签精确匹配（行业/主题/股票名称/代码） |
| limit | int | 否 | 10 | 返回限制条数 |
| fields | string[] | 否 | 默认字段 | 仅保留指定字段，过滤其余字段 |

**返回值 `data` (items[] 结构)：**
| 字段 | 类型 | 说明 |
|---|---|---|
| news_id | int | 新闻ID |
| source_title | string | 来源标题 |
| title | string | 标题 |
| publish_time | string | 发布时间 |
| news_type | string | 新闻类型 |
| summary | string | 摘要 |
| news_analysis| string | 新闻分析正文 |

---

### Tool-4: getResearchReport (查询研报详情)
**适用场景**：用户提供研报 ID，查询研报详情。

**输入参数 `params`：**
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| report_id | int | 是 | - | 研报ID |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

**返回值 `data` (单对象结构)：**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int | 研报ID |
| report_type | string | 研报类型 |
| title | string | 标题 |
| stock_code | string | 股票代码 |
| stock_name | string | 股票名称 |
| industry_name | string | 行业名称 |
| content_md | string | Markdown格式正文 |
| content_json | string | JSON格式正文 |
| org_name | string | 机构名称 |
| publish_date | string | 发布日期 |
| pdf_url | string | PDF链接 |
| db_source | string | 数据库表名 |
| analysis | object\|null | 详细分析数据，无则为null |

---

### Tool-5: queryResearchAnalysis (查询研报列表)
**适用场景**：查询宏观、行业、个股相关研报列表。
**典型调用指南**：
- 最近3天'平安银行'研报：report_type:'stock', start_date:[3天前], tags:["平安银行"], importance_score:3

**输入参数 `params`：**
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| keyword | string | 否 | - | 检索关键字 |
| sort | enum | 否 | research_date| 倒序字段：`research_date`、`importance_score`、`market_sentiment_score`、`vector_distance` |
| start_date | string | 否 | - | 起始研报日期，限≤90天内 |
| end_date | string | 否 | - | 结束研报日期 |
| importance_score | int | 否 | - | 研报重要性绝对值下限 |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| report_type | enum | 否 | - | 类型：`macro`(宏观)、`industry`(行业)、`stock`(个股) |
| tags | string[] | 否 | - | 标签精确匹配（行业/主题/股票名称/代码） |
| limit | int | 否 | 10 | 返回限制条数 |
| fields | string[] | 否 | 默认字段 | 仅保留指定字段，过滤其余字段 |

**返回值 `data` (items[] 结构)：**
| 字段 | 类型 | 说明 |
|---|---|---|
| report_id | int | 研报ID |
| title | string | 研报标题 |
| research_date| string | 研报日期 |
| report_type | string | 研报类型 |
| summary | string | 摘要 |
| report_analysis| string| 研报分析 |
| rating | string | 评级 |
| target_price_lower| float | 目标价下限 |
| target_price_upper| float | 目标价上限 |

---

### Tool-6: getAnnouncementDetail (查询上市公司公告详情)
**适用场景**：用户提供公告 ID，查询股票公告详情。

**输入参数 `params`：**
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| announcement_id| int | 是 | - | 公告ID |
| fields | string[] | 否 | - | 仅保留指定字段，过滤其余字段 |

**返回值 `data` (单对象结构)：**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int | 公告ID |
| source_type | string | 来源类型 |
| stock_code | string | 股票代码 |
| exchange | string | 交易所 |
| stock_name | string | 股票名称 |
| title | string | 公告标题 |
| announcement_time| string| 发布时间 |
| url | string | 原文链接 |
| category | string | 分类 |
| content_md | string | MD正文 |
| content_json | string | JSON正文 |
| parse_skip_reason| string| 解析跳过原因 |
| db_source | string | 数据库表名 |
| analysis | object\|null | 包含详细分析数据，无则为null |

---

### Tool-7: queryAnnouncementAnalysis (查询上市公司公告列表)
**适用场景**：按语义关键词、公告类型、标签（股票名称/代码）、评分筛选公告分析。
**典型调用指南**：
- 最近1天所有财报公告：announce_type:'U1', start_date:[1天前], importance_score:3, limit:30
- 最近3天'平安银行'业绩快报：announce_type:'U2', start_date:[3天前], tags:["平安银行"], importance_score:3

**输入参数 `params`：**
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| stock_code | string | 否 | - | 股票代码，如“000001.SZ” |
| keyword | string | 否 | - | 搜索关键词 |
| sort | enum | 否 | announcement_date| 倒序字段：`announcement_date`、`importance_score`、`stock_impact_score`、`vector_distance` |
| start_date | string | 否 | - | 起始公告分析日期，限30天内 |
| end_date | string | 否 | - | 结束公告分析日期 |
| importance_score | int | 否 | - | 公告重要性绝对值下限 |
| stock_impact_score | int | 否 | - | 个股影响评分绝对值下限 |
| announce_type | enum | 否 | - | 公告类型：`U1` 定期财务报告、`U2` 业绩预告及快报、`U3` 融资与资金管理、`U4` 并购重组与重大交易、`U5` 股东权益变动、`U6` 公司治理与审计、`U7` 异常与风险警示、`U8` 司法与破产重整、`U9` 其他重大事项、`U10` 交易所监管 |
| tags | string[] | 否 | - | 标签精确匹配（股票名称/代码） |
| limit | int | 否 | 10 | 返回限制条数 |
| fields | string[] | 否 | 默认字段 | 仅保留指定字段，过滤其余字段 |

**返回值 `data` (items[] 结构)：**
| 字段 | 类型 | 说明 |
|---|---|---|
| announcement_id| int | 公告ID |
| title | string | 公告标题 |
| announcement_date| string| 公告日期 |
| summary | string | 摘要 |
| announce_type | string | 公告类型 |
| tags | string[] | 标签数组 |
| global_scoring | object | 评分对象 |
| stock_impacts | array | 个股影响明细 |
| announce_analysis| string| 公告分析正文 |

## 错误处理
| 错误类型 | 处理方式 |
|---|---|
| 参数校验失败 | 检查必填项及时间范围（快讯≤5天，新闻/研报≤90天，公告≤30天） |
| HTTP 4xx | 检查参数格式与路径参数 |
| HTTP 5xx | 提示用户服务端错误，建议稍后重试 |
| 连接失败 | 提示检查 api.ciweiai.com 可达性 |