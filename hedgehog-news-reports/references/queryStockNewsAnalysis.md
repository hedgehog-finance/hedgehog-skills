# queryStockNewsAnalysis

**方法**: POST  
**路径**: /v1/news/stock-analysis  
**描述**: 按股票名称或股票代码分页查询相关重大新闻分析结果，按发布时间倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |
| Content-Type | application/json |

### Body 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| stock_name | string | 条件必填 | - | 股票名称；与 `stock_code` 至少提供一个 |
| stock_code | string | 条件必填 | - | 股票代码，支持带或不带 `.SH` / `.SZ` / `.BJ` 后缀 |
| importance_score | int | 否 | - | 资讯重要性，精确匹配 |
| market_sentiment_score | int | 否 | - | 市场情绪影响，精确匹配 |
| horizon_impact_score | int | 否 | - | 长短期影响，精确匹配 |
| macro_impact_score | int | 否 | - | 宏观经济影响，精确匹配 |
| disruptive_tech_score | int | 否 | - | 颠覆性技术影响，精确匹配 |
| max_industry_impact | int | 否 | - | 最大行业影响分，精确匹配 |
| max_stock_impact | int | 否 | - | 最大个股影响分，精确匹配 |
| keywords | array[string] | 否 | - | 匹配标题、摘要或分析正文，任一命中 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-100 |

### 请求示例
```json
{
  "stock_name": "山东黄金",
  "stock_code": "600547.SH",
  "importance_score": 80,
  "keywords": ["政策"],
  "page": 1,
  "page_size": 20
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.total | int | 总条数 |
| data.items[].news_id | int | 新闻 ID |
| data.items[].title | string | 新闻标题 |
| data.items[].date | string | 发布时间 |
| data.items[].summary | string | 摘要 |
| data.items[].tags | object | 股票等标签 |
| data.items[].global_scoring | object | 全局评分 |
| data.items[].news_analysis | string | 详细分析 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 3,
    "page": 1,
    "page_size": 20,
    "db_source": "major_news_analysis",
    "items": [
      {
        "news_id": 1,
        "title": "某行业政策发布",
        "date": "2026-05-22T09:30:00",
        "summary": "摘要内容",
        "tags": {
          "stocks": [{ "name": "山东黄金", "code": "600547" }]
        },
        "global_scoring": {
          "importance_score": 80,
          "market_sentiment_score": 20,
          "horizon_impact_score": 15,
          "macro_impact_score": 5,
          "disruptive_tech_score": 0
        },
        "max_industry_impact": 3,
        "max_stock_impact": 4,
        "news_analysis": "详细分析..."
      }
    ]
  }
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数校验失败或业务参数非法 |
| 401 | 缺少或无效的 `X-API-Token` |
| 403 | 权限不足 |
| 500 | 服务端处理失败 |
