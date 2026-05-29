# queryShibor

**方法**: GET  
**路径**: /v1/macro-cn/shibor  
**描述**: 分页查询中国 Shibor 利率，按 `date` 倒序返回。

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
  "start_date": "2026-01-01",
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
| data.db_source | string | 数据源，通常为 `shibor` |
| data.items[].date | string | 报价日期 |
| data.items[].rate_on | number | 隔夜利率 |
| data.items[].rate_1w | number | 1 周利率 |
| data.items[].rate_2w | number | 2 周利率 |
| data.items[].rate_1m | number | 1 月利率 |
| data.items[].rate_3m | number | 3 月利率 |
| data.items[].rate_6m | number | 6 月利率 |
| data.items[].rate_9m | number | 9 月利率 |
| data.items[].rate_1y | number | 1 年利率 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 20,
    "page": 1,
    "page_size": 20,
    "db_source": "shibor",
    "items": [
      {
        "id": 1,
        "date": "2026-01-30",
        "rate_on": 1.45,
        "rate_1w": 1.62,
        "rate_2w": 1.74,
        "rate_1m": 1.85,
        "rate_3m": 1.92,
        "rate_6m": 2.01,
        "rate_9m": 2.10,
        "rate_1y": 2.18
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
