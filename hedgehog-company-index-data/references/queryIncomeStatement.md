# queryIncomeStatement

**方法**: GET  
**路径**: /v1/finance/income  
**描述**: 分页查询利润表，按 `end_date` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| stock_code | string | 否 | - | 股票代码 |
| start_date | string | 否 | - | 起始报告期，按 `end_date >= start_date` 过滤 |
| end_date | string | 否 | - | 结束报告期，按 `end_date <= end_date` 过滤 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-100 |

### 请求示例
```json
{
  "stock_code": "000001.SZ",
  "start_date": "2025-01-01",
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
| data.db_source | string | 数据源，通常为 `income` |
| data.items[].stock_code | string | 股票代码 |
| data.items[].ann_date | string | 公告日期 |
| data.items[].end_date | string | 报告期 |
| data.items[].report_type | string | 报表类型 |
| data.items[].basic_eps | number | 基本每股收益 |
| data.items[].total_revenue | number | 营业总收入 |
| data.items[].operate_profit | number | 营业利润 |
| data.items[].n_income | number | 净利润 |
| data.items[].n_income_attr_p | number | 归母净利润 |
| data.items[].update_flag | string | 更新标识 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 4,
    "page": 1,
    "page_size": 20,
    "db_source": "income",
    "items": [
      {
        "id": 1,
        "stock_code": "000001.SZ",
        "ann_date": "2026-03-28",
        "end_date": "2025-12-31",
        "report_type": "1",
        "basic_eps": 1.85,
        "total_revenue": 198000000000.0,
        "operate_profit": 61000000000.0,
        "n_income": 45000000000.0,
        "n_income_attr_p": 44500000000.0,
        "update_flag": "1"
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
