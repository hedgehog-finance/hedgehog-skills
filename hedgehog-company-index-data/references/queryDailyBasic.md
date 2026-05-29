# queryDailyBasic

**方法**: GET  
**路径**: /v1/daily-basic/query  
**描述**: 按股票和交易日期范围查询每日基本面指标，按 `trade_date` 倒序返回固定数量。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| stock_code | string | 否 | - | 股票代码 |
| start_date | string | 否 | - | 起始交易日期 |
| end_date | string | 否 | - | 结束交易日期 |
| limit | int | 否 | 100 | 返回条数，范围 1-1000 |

### 请求示例
```json
{
  "stock_code": "000001.SZ",
  "limit": 2
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.db_source | string | 数据源，通常为 `daily_basic` |
| data.items[].stock_code | string | 股票代码 |
| data.items[].trade_date | string | 交易日期 |
| data.items[].close | number | 收盘价 |
| data.items[].turnover_rate | number | 换手率 |
| data.items[].volume_ratio | number | 量比 |
| data.items[].pe | number | 市盈率 |
| data.items[].pe_ttm | number | 滚动市盈率 |
| data.items[].pb | number | 市净率 |
| data.items[].total_mv | number | 总市值 |
| data.items[].circ_mv | number | 流通市值 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "db_source": "daily_basic",
    "items": [
      {
        "stock_code": "000001.SZ",
        "trade_date": "2026-01-30",
        "close": 10.28,
        "turnover_rate": 0.72,
        "volume_ratio": 1.12,
        "pe": 6.5,
        "pe_ttm": 6.1,
        "pb": 0.58,
        "total_mv": 1990000.0,
        "circ_mv": 1990000.0
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
