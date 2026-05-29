# queryLpr

**方法**: GET  
**路径**: /v1/macro-cn/lpr  
**描述**: 分页查询中国 LPR 利率，按 `date` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| start_date | string | 否 | - | 起始报价日期，通常为 `YYYY-MM-DD` |
| end_date | string | 否 | - | 结束报价日期，通常为 `YYYY-MM-DD` |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-500 |

### 请求示例
```json
{
  "start_date": "2026-01-01"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.total | int | 总条数 |
| data.db_source | string | 数据源，通常为 `shibor_lpr` |
| data.items[].date | string | 报价日期 |
| data.items[].rate_1y | number | 1 年期 LPR |
| data.items[].rate_5y | number | 5 年期以上 LPR |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 1,
    "page": 1,
    "page_size": 20,
    "db_source": "shibor_lpr",
    "items": [
      {
        "id": 1,
        "date": "2026-01-20",
        "rate_1y": 3.0,
        "rate_5y": 3.5
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
