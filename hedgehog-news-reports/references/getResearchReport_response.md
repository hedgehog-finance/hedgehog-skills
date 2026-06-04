# getResearchReport 返回字段说明

**接口**：`GET /v1/research/{report_id}`
**返回结构**：`{ code, message, data }`，`data` 为单篇研报对象。

## `data` 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 研报 ID |
| report_type | string | 研报类型，可选值：`stock` / `industry` / `macro` |
| title | string | 研报标题 |
| stock_code | string | 关联股票代码 |
| stock_name | string | 关联股票名称 |
| industry_name | string | 关联行业名称 |
| content_md | string | 研报正文（Markdown） |
| content_json | string | 研报结构化解析（JSON 字符串） |
| org_name | string | 出具机构名称 |
| publish_date | string | 发布日期（`YYYY-MM-DD`） |
| pdf_url | string | 研报 PDF 链接 |
| db_source | string | 数据来源表名，固定 `a_research_reports` |
| analysis | object \| null | 研报分析对象，无分析则为 `null`，结构见下表 |

## `data.analysis` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| date | string | 研报日期 |
| summary | string | 研报摘要 |
| tags | object | 标签 |
| tags.report_type | string | 研报类型 |
| tags.industries | string[] | 涉及行业 |
| tags.themes | string[] | 投资主题或概念标签列表 |
| tags.stocks | array | 涉及股票，元素含 `name / code` |
| global_scoring | object | 全局评分 |
| global_scoring.importance_score | int | 研报重要性 |
| global_scoring.market_sentiment_score | int | 市场情绪影响 |
| global_scoring.horizon_impact_score | int | 长短期影响 |
| max_industry_impact | int | 最大行业影响分 |
| max_stock_impact | int | 最大个股影响分 |
| industry_impacts | array | 行业影响数组，元素含 `target / score` |
| stock_impacts | array | 股票影响数组，元素含 `name / code / total_score` |
| rating | string | 评级（如 `买入`、`增持` 等） |
| target_price_lower | number | 目标价下限 |
| target_price_upper | number | 目标价上限 |
| report_analysis | string | 研报分析正文 |

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "report_type": "stock",
    "title": "平安银行点评报告",
    "stock_code": "000001.SZ",
    "stock_name": "平安银行",
    "industry_name": "银行",
    "content_md": "研报解析内容...",
    "content_json": "{}",
    "org_name": "某证券",
    "publish_date": "2026-05-20",
    "pdf_url": "https://example.com/report.pdf",
    "db_source": "a_research_reports",
    "analysis": {
      "date": "2026-05-20",
      "summary": "研报摘要",
      "tags": {
        "report_type": "stock",
        "industries": ["银行"],
        "themes": [],
        "stocks": [{ "name": "平安银行", "code": "000001.SZ" }]
      },
      "global_scoring": {
        "importance_score": 70,
        "market_sentiment_score": 20,
        "horizon_impact_score": 15
      },
      "max_industry_impact": 2,
      "max_stock_impact": 4,
      "industry_impacts": [],
      "stock_impacts": [],
      "rating": "买入",
      "target_price_lower": 12.5,
      "target_price_upper": 15.0,
      "report_analysis": "研报分析..."
    }
  }
}
```
