# querySwIndustryDaily

**方法**: GET
**路径**: /v1/stock/sw-industry-daily
**描述**: 分页查询申万行业日线行情，按 `trade_date` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| index_code | string | 否 | - | 申万行业指数代码 |
| start_date | string | 否 | - | 起始交易日期 |
| end_date | string | 否 | - | 结束交易日期 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-500 |

### 请求示例
```json
{
  "index_code": "801780.SI",
  "start_date": "2026-01-01",
  "page": 1,
  "page_size": 10
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.total | int | 总条数 |
| data.db_source | string | 数据源，通常为 `sw_industry_daily` |
| data.items[].index_code | string | 申万行业指数代码 |
| data.items[].trade_date | string | 交易日期 |
| data.items[].name | string | 行业名称 |
| data.items[].open | number | 开盘点位 |
| data.items[].low | number | 最低点位 |
| data.items[].high | number | 最高点位 |
| data.items[].close | number | 收盘点位 |
| data.items[].change | number | 涨跌额 |
| data.items[].pct_change | number | 涨跌幅 |
| data.items[].vol | number | 成交量 |
| data.items[].amount | number | 成交额 |
| data.items[].pe | number | 市盈率 |
| data.items[].pb | number | 市净率 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 10,
    "page": 1,
    "page_size": 10,
    "db_source": "sw_industry_daily",
    "items": [
      {
        "index_code": "801780.SI",
        "trade_date": "2026-01-30",
        "name": "银行",
        "open": 3500.1,
        "low": 3488.2,
        "high": 3560.4,
        "close": 3542.3,
        "change": 21.4,
        "pct_change": 0.61,
        "vol": 12345.6,
        "amount": 98765.4,
        "pe": 5.8,
        "pb": 0.62
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
