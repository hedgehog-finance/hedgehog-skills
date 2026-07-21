# newsDetail 返回字段说明

**接口**：`GET /v1/news/:news_id`

## 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 新闻 ID |
| title | string | 新闻标题 |
| content | string | 新闻正文 |
| source | string | 消息来源 |
| publish_time | string | 发布时间 |
| url | string | 原文链接 |
| db_source | string | 数据库表名 |
| analysis | object \| null | 新闻分析对象，无分析时为 `null`，结构见下表 |

## `analysis` 对象字段

| 字段 | 类型 | 说明 |
|------|------|------|
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

## 示例

```json
{
  "id": 1,
  "title": "某行业政策发布",
  "content": "新闻正文...",
  "source": "财联社",
  "publish_time": "2026-05-22T09:30:00",
  "url": "https://example.com/news/1",
  "db_source": "major_news",
  "analysis": {
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
}
```
