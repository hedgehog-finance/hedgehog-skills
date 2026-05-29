# getNewsDetail

**方法**: GET  
**路径**: /v1/news/:news_id  
**描述**: 查询单条重大新闻详情及对应分析数据；若没有分析数据，返回 `data: null`。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| news_id | int | 是 | `major_news.id` |

### 请求示例
```json
{
  "news_id": 1
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.id | int | 新闻 ID |
| data.title | string | 新闻标题 |
| data.content | string | 新闻正文 |
| data.source | string | 来源 |
| data.publish_time | string | 发布时间 |
| data.url | string | 原文链接 |
| data.db_source | string | 数据源 |
| data.analysis.summary | string | 分析摘要 |
| data.analysis.tags | object | 新闻类型、行业、股票等标签 |
| data.analysis.global_scoring | object | 全局评分 |
| data.analysis.news_analysis | string | 详细分析 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "title": "某行业政策发布",
    "content": "新闻正文...",
    "source": "财联社",
    "publish_time": "2026-05-22T09:30:00",
    "url": "https://example.com/news/1",
    "db_source": "major_news",
    "analysis": {
      "summary": "摘要内容",
      "tags": {
        "news_type": "policy",
        "industries": ["银行"],
        "stocks": [{ "name": "平安银行", "code": "000001.SZ" }]
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
  }
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数校验失败或业务参数非法 |
| 401 | 缺少或无效的 `X-API-Token` |
| 403 | 权限不足 |
| 404 | 指定资源不存在 |
| 500 | 服务端处理失败 |
