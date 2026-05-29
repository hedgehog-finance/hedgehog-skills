# listResearchReports

**方法**: GET  
**路径**: /v1/research/list  
**描述**: 分页查询 A 股研报，按 `publish_date` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| report_type | string | 否 | - | 研报类型，常见值 `stock`、`industry`、`macro` |
| stock_code | string | 否 | - | 股票代码 |
| industry_name | string | 否 | - | 行业名称，模糊匹配 |
| status | string | 否 | - | Pipeline 状态，过滤用；响应不返回内部状态字段 |
| start_date | string | 否 | - | 起始发布日期 |
| end_date | string | 否 | - | 结束发布日期 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-100 |

### 请求示例
```json
{
  "report_type": "stock",
  "stock_code": "000001.SZ",
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
| data.db_source | string | 数据源，通常为 `a_research_reports` |
| data.items[].id | int | 研报 ID |
| data.items[].report_type | string | 研报类型 |
| data.items[].title | string | 研报标题 |
| data.items[].stock_code | string | 股票代码 |
| data.items[].stock_name | string | 股票名称 |
| data.items[].industry_name | string | 行业名称 |
| data.items[].content_md | string | 研报解析内容 |
| data.items[].org_name | string | 机构名称 |
| data.items[].publish_date | string | 发布日期 |
| data.items[].pdf_url | string | PDF 链接 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 6,
    "page": 1,
    "page_size": 20,
    "db_source": "a_research_reports",
    "items": [
      {
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
        "pdf_url": "https://example.com/report.pdf"
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
