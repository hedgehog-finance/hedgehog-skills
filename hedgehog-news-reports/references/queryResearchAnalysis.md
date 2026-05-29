# queryResearchAnalysis

**方法**: POST  
**路径**: /v1/research/analysis/query  
**描述**: 查询研报分析结果；传入 `keyword` 时按语义相似度排序，否则按 `research_date` 倒序排序。

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
| importance_score | int | 否 | - | 研报重要性绝对值下限 |
| market_sentiment_score | int | 否 | - | 市场情绪影响绝对值下限 |
| horizon_impact_score | int | 否 | - | 长短期影响绝对值下限 |
| max_industry_impact | int | 否 | - | 最大行业影响分绝对值下限 |
| max_stock_impact | int | 否 | - | 最大个股影响分绝对值下限 |
| start_date | string | 否 | - | 起始研报日期 |
| end_date | string | 否 | - | 结束研报日期 |
| report_type | string | 否 | - | 研报类型，常见值 `stock`、`industry`、`macro` |
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
  "keyword": "银行资产质量",
  "report_type": "stock",
  "stock_codes": ["000001.SZ"],
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
| data.items[].report_id | int | 研报 ID |
| data.items[].research_date | string | 研报日期 |
| data.items[].summary | string | 研报摘要 |
| data.items[].report_type | string | 研报类型 |
| data.items[].tags | object | 类型、行业、股票等标签 |
| data.items[].global_scoring | object | 全局评分 |
| data.items[].rating | string | 评级 |
| data.items[].target_price_lower | number | 目标价下限 |
| data.items[].target_price_upper | number | 目标价上限 |
| data.items[].report_analysis | string | 研报分析 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 3,
    "page": 1,
    "page_size": 20,
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
        "rating": "买入",
        "target_price_lower": 12.5,
        "target_price_upper": 15.0,
        "report_analysis": "研报分析..."
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
