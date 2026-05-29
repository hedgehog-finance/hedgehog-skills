# listDailyBasic

**方法**: GET  
**路径**: /v1/daily-basic/list  
**描述**: 分页查询所有或指定股票每日基本面指标，过滤条件与 `queryDailyBasic` 相同。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| stock_code | string | 否 | - | 股票代码；不传则可返回所有股票 |
| start_date | string | 否 | - | 起始交易日期 |
| end_date | string | 否 | - | 结束交易日期 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-500 |

### 请求示例
```json
{
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
| data.page | int | 当前页码 |
| data.page_size | int | 每页条数 |
| data.db_source | string | 数据源，通常为 `daily_basic` |
| data.items[].stock_code | string | 股票代码 |
| data.items[].trade_date | string | 交易日期 |
| data.items[].close | number | 收盘价 |
| data.items[].pe_ttm | number | 滚动市盈率 |
| data.items[].pb | number | 市净率 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 220,
    "page": 1,
    "page_size": 20,
    "db_source": "daily_basic",
    "items": [
      {
        "stock_code": "000001.SZ",
        "trade_date": "2026-01-30",
        "close": 10.28,
        "pe_ttm": 6.1,
        "pb": 0.58
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
