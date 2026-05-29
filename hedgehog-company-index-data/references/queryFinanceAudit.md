# queryFinanceAudit

**方法**: GET  
**路径**: /v1/finance/audit  
**描述**: 分页查询财务审计意见，按 `end_date` 倒序返回。

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
  "start_date": "2025-01-01"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.total | int | 总条数 |
| data.db_source | string | 数据源，通常为 `finance_audit` |
| data.items[].stock_code | string | 股票代码 |
| data.items[].ann_date | string | 公告日期 |
| data.items[].end_date | string | 报告期 |
| data.items[].audit_result | string | 审计意见 |
| data.items[].audit_fees | number | 审计费用 |
| data.items[].audit_agency | string | 审计机构 |
| data.items[].audit_sign | string | 签字会计师 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 1,
    "page": 1,
    "page_size": 20,
    "db_source": "finance_audit",
    "items": [
      {
        "id": 1,
        "stock_code": "000001.SZ",
        "ann_date": "2026-03-28",
        "end_date": "2025-12-31",
        "audit_result": "标准无保留意见",
        "audit_fees": 5000000.0,
        "audit_agency": "某会计师事务所",
        "audit_sign": "张三;李四"
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
