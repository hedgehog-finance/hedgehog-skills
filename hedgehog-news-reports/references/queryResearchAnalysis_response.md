# queryResearchAnalysis 返回字段说明

**接口**：`POST /v1/research/analysis/query`
**返回结构**：`{ code, message, data: { total, page, page_size, db_source, items[] } }`

## `data` 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| total | int | 命中总条数 |
| page | int | 当前页码 |
| page_size | int | 每页条数 |
| db_source | string | 数据来源表名，固定 `research_report_analysis` |
| items | array | 研报分析结果列表，元素结构见下表 |

## `data.items[]` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| report_id | int | 关联的研报 ID（`a_research_reports.id`） |
| research_date | string | 研报日期（`YYYY-MM-DD`） |
| summary | string | 研报摘要 |
| report_type | string | 研报类型，可选值：`stock` / `industry` / `macro` |
| tags | object | 标签 |
| tags.report_type | string | 研报类型 |
| tags.industries | string[] | 涉及行业 |
| tags.stocks | array | 涉及股票，元素含 `name / code` |
| global_scoring | object | 全局评分对象 |
| global_scoring.importance_score | int | 研报重要性 |
| global_scoring.market_sentiment_score | int | 市场情绪影响 |
| global_scoring.horizon_impact_score | int | 长短期影响 |
| max_industry_impact | int | 最大行业影响分 |
| max_stock_impact | int | 最大个股影响分 |
| impacts | object | 详细影响列表 |
| impacts.industry_impacts | array | 行业影响数组，元素含 `target / score` |
| impacts.stock_impacts | array | 股票影响数组，元素含 `name / code / total_score` |
| rating | string | 评级（如 `买入` 等） |
| target_price_lower | number | 目标价下限 |
| target_price_upper | number | 目标价上限 |
| report_analysis | string | 研报分析正文 |

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 3,
    "page": 1,
    "page_size": 10,
    "db_source": "research_report_analysis",
    "items": [
      {
        "report_id": 1,
        "research_date": "2026-05-20",
        "summary": "研报摘要",
        "report_type": "stock",
        "tags": {
          "report_type": "stock",
          "industries": ["银行"],
          "stocks": [{ "name": "平安银行", "code": "000001.SZ" }]
        },
        "global_scoring": {
          "importance_score": 70,
          "market_sentiment_score": 20,
          "horizon_impact_score": 15
        },
        "max_industry_impact": 2,
        "max_stock_impact": 4,
        "impacts": {
          "industry_impacts": [],
          "stock_impacts": []
        },
        "rating": "买入",
        "target_price_lower": 12.5,
        "target_price_upper": 15.0,
        "report_analysis": "研报分析..."
      }
    ]
  }
}
```
