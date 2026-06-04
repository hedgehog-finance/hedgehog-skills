# queryNewsAnalysis 返回字段说明

**接口**：`POST /v1/news/analysis/query`
**返回结构**：`{ code, message, data: { total, page, page_size, db_source, items[] } }`

## `data` 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| total | int | 命中总条数 |
| page | int | 当前页码 |
| page_size | int | 每页条数 |
| db_source | string | 数据来源表名，固定 `major_news_analysis` |
| items | array | 重大新闻分析结果记录，元素结构见下表 |

## `data.items[]` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| news_id | int | 关联的新闻 ID（`major_news.id`） |
| source_title | string | 原始新闻标题 |
| title | string | 分析标题 |
| publish_time | string | 发布时间，ISO 字符串 |
| news_type | string | 新闻类型枚举：`macro`（宏观）、`industry`（产业）、`stock`（公司） |
| summary | string | 摘要 |
| news_analysis | string | 详细分析正文 |
| global_scoring | object | 全局评分对象 |
| global_scoring.importance_score | int | 资讯重要性 |
| global_scoring.market_sentiment_score | int | 市场情绪影响 |
| global_scoring.horizon_impact_score | int | 长短期影响 |
| global_scoring.macro_impact_score | int | 宏观经济影响 |
| global_scoring.disruptive_tech_score | int | 颠覆性技术影响 |
| max_industry_impact | int | 最大行业影响分 |
| max_stock_impact | int | 最大个股影响分 |
| industry_impacts | array | 行业影响数组，元素含 `target / score` |
| stock_impacts | array | 股票影响数组，元素含 `name / code / total_score` |
| tags | string[] | 标签数组（flat），行业/主题/股票名称/代码统一为数组元素 |

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 3,
    "page": 1,
    "page_size": 10,
    "db_source": "major_news_analysis",
    "items": [
      {
        "news_id": 1,
        "source_title": "某行业政策发布",
        "title": "某行业政策发布",
        "publish_time": "2026-05-22T09:30:00",
        "news_type": "macro",
        "summary": "摘要内容",
        "news_analysis": "详细分析...",
        "global_scoring": {
          "importance_score": 80,
          "market_sentiment_score": 20,
          "horizon_impact_score": 15,
          "macro_impact_score": 5,
          "disruptive_tech_score": 0
        },
        "max_industry_impact": 3,
        "max_stock_impact": 4,
        "industry_impacts": [],
        "stock_impacts": [],
        "tags": ["stock", "银行", "山东黄金", "600547.SH"]
      }
    ]
  }
}
```
