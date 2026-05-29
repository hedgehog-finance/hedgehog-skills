# queryNewsAnalysis

**方法**: POST  
**路径**: /v1/news/analysis/query  
**描述**: 查询重大新闻分析结果；传入 `keyword` 时按语义相似度排序，否则按 `publish_time` 倒序排序。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |
| Content-Type | application/json |

### Body 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| keyword | string | 否 | - | 语义检索关键字 |
| importance_score | int | 否 | - | 资讯重要性绝对值下限 |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| horizon_impact_score | int | 否 | - | 长短期影响绝对值下限 |
| macro_impact_score | int | 否 | - | 宏观经济影响绝对值下限 |
| disruptive_tech_score | int | 否 | - | 颠覆性技术影响绝对值下限 |
| max_industry_impact | int | 否 | - | 最大行业影响分绝对值下限 |
| max_stock_impact | int | 否 | - | 最大个股影响分绝对值下限 |
| start_date | string | 否 | - | 起始发布时间 |
| end_date | string | 否 | - | 结束发布时间 |
| news_type | string | 否 | - | 新闻类型 |
| industries | array[string] | 否 | - | 标签中的行业数组，任一匹配 |
| themes | array[string] | 否 | - | 标签中的主题数组，任一匹配 |
| stock_names | array[string] | 否 | - | 标签中的股票名称，任一匹配 |
| stock_codes | array[string] | 否 | - | 标签中的股票代码，任一匹配 |
| tags_contains | object | 否 | - | JSONB 包含过滤 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-100 |

### 请求示例
```json
{
  "keyword": "银行政策",
  "industries": ["银行"],
  "market_sentiment_score": 4,
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
| data.items[].publish_time | string | 发布时间 |
| data.items[].news_type | string | 新闻类型 |
| data.items[].summary | string | 摘要 |
| data.items[].news_analysis | string | 详细分析 |
| data.items[].global_scoring | object | 全局评分 |
| data.items[].tags | object | 行业、主题、股票等标签 |

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
        "publish_time": "2026-05-22T09:30:00",
        "news_type": "policy",
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
        "tags": {
          "industries": ["银行"],
          "stocks": [{ "name": "平安银行", "code": "000001.SZ" }]
        }
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
