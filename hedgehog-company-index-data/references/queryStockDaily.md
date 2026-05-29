# queryStockDaily

**方法**: GET  
**路径**: /v1/stock/daily  
**描述**: 按股票代码和交易日期范围查询 A 股日线行情，按 `trade_date` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| stock_code | string | 否 | - | 股票代码，例如 `000001.SZ` |
| start_date | string | 否 | - | 起始交易日期，按 `trade_date >= start_date` 过滤 |
| end_date | string | 否 | - | 结束交易日期，按 `trade_date <= end_date` 过滤 |
| limit | int | 否 | 100 | 返回条数，范围 1-1000 |

### 请求示例
```json
{
  "stock_code": "000001.SZ",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "limit": 2
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.db_source | string | 数据源，通常为 `stock_daily` |
| data.items[].stock_code | string | 股票代码 |
| data.items[].trade_date | string | 交易日期 |
| data.items[].open | number | 开盘价 |
| data.items[].high | number | 最高价 |
| data.items[].low | number | 最低价 |
| data.items[].close | number | 收盘价 |
| data.items[].pre_close | number | 昨收价 |
| data.items[].change | number | 涨跌额 |
| data.items[].pct_chg | number | 涨跌幅 |
| data.items[].vol | number | 成交量 |
| data.items[].amount | number | 成交额 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "db_source": "stock_daily",
    "items": [
      {
        "stock_code": "000001.SZ",
        "trade_date": "2026-01-30",
        "open": 10.12,
        "high": 10.35,
        "low": 10.01,
        "close": 10.28,
        "pre_close": 10.10,
        "change": 0.18,
        "pct_chg": 1.78,
        "vol": 1234567.0,
        "amount": 1267890.0
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
