# getResearchReport

**方法**: GET  
**路径**: /v1/research/:report_id  
**描述**: 查询单篇研报详情及分析数据；若没有分析数据，返回 `data: null`。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| report_id | int | 是 | `a_research_reports.id` |

### 请求示例
```json
{
  "report_id": 1
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.id | int | 研报 ID |
| data.report_type | string | 研报类型 |
| data.title | string | 研报标题 |
| data.stock_code | string | 股票代码 |
| data.stock_name | string | 股票名称 |
| data.industry_name | string | 行业名称 |
| data.content_md | string | 研报解析内容 |
| data.org_name | string | 机构名称 |
| data.publish_date | string | 发布日期 |
| data.pdf_url | string | PDF 链接 |
| data.analysis.summary | string | 研报摘要 |
| data.analysis.tags | object | 类型、行业、股票等标签 |
| data.analysis.global_scoring | object | 全局评分 |
| data.analysis.rating | string | 评级 |
| data.analysis.target_price_lower | number | 目标价下限 |
| data.analysis.target_price_upper | number | 目标价上限 |
| data.analysis.report_analysis | string | 研报分析 |

### 响应示例
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
    "org_name": "某证券",
    "publish_date": "2026-05-20",
    "pdf_url": "https://example.com/report.pdf",
    "db_source": "a_research_reports",
    "analysis": {
      "summary": "研报摘要",
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
