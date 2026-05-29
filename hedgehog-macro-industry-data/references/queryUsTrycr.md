# queryUsTrycr

**方法**: GET  
**路径**: /v1/macro-us/trycr  
**描述**: 分页查询美国国债实际收益率，按 `date` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| start_date | string | 否 | - | 起始日期，通常为 `YYYY-MM-DD` |
| end_date | string | 否 | - | 结束日期，通常为 `YYYY-MM-DD` |
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
| data.db_source | string | 数据源，通常为 `us_trycr` |
| data.items[].date | string | 日期 |
| data.items[].y5 | number | 5 年实际收益率 |
| data.items[].y7 | number | 7 年实际收益率 |
| data.items[].y10 | number | 10 年实际收益率 |
| data.items[].y20 | number | 20 年实际收益率 |
| data.items[].y30 | number | 30 年实际收益率 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 20,
    "page": 1,
    "page_size": 20,
    "db_source": "us_trycr",
    "items": [
      {
        "id": 1,
        "date": "2026-01-30",
        "y5": 1.8,
        "y7": 1.85,
        "y10": 1.9,
        "y20": 2.0,
        "y30": 2.05
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
