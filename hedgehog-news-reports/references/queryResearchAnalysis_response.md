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
| items | array | 研报分析结果记录，元素结构见下表 |

## `data.items[]` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| report_id | int | 关联的研报 ID（`a_research_reports.id`） |
| title | string | 研报标题 |
| research_date | string | 研报日期（`YYYY-MM-DD`） |
| summary | string | 研报摘要 |
| report_type | string | 研报类型枚举：`macro`（宏观）、`industry`（产业）、`stock`（公司） |
| tags | string[] | 标签数组（flat），行业/主题/股票名称/代码统一为数组元素 |
| global_scoring | object | 全局评分对象 |
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
    "total": 3,
    "page": 1,
    "page_size": 10,
    "db_source": "research_report_analysis",
    "items": [
      {
        "report_id": 1,
        "title": "平安银行点评报告",
        "research_date": "2026-05-20",
        "summary": "研报摘要",
        "report_type": "stock",
        "tags": ["stock", "银行", "平安银行", "000001.SZ"],
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
    ]
  }
}
```
