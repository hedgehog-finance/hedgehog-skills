# queryMoneyflow

**方法**: GET  
**路径**: /v1/finance/moneyflow  
**描述**: 分页查询个股成交资金流向，按 `trade_date` 倒序返回。

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
| data.db_source | string | 数据源，通常为 `a_moneyflow` |
| data.items[].stock_code | string | 股票代码 |
| data.items[].trade_date | string | 交易日期 |
| data.items[].buy_sm_vol | number | 小单买入量 |
| data.items[].buy_sm_amount | number | 小单买入额 |
| data.items[].sell_sm_vol | number | 小单卖出量 |
| data.items[].sell_sm_amount | number | 小单卖出额 |
| data.items[].buy_lg_amount | number | 大单买入额 |
| data.items[].sell_lg_amount | number | 大单卖出额 |
| data.items[].net_mf_vol | number | 净流入量 |
| data.items[].net_mf_amount | number | 净流入额 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 60,
    "page": 1,
    "page_size": 20,
    "db_source": "a_moneyflow",
    "items": [
      {
        "stock_code": "000001.SZ",
        "trade_date": "2026-01-30",
        "buy_sm_vol": 12000,
        "buy_sm_amount": 1300.5,
        "sell_sm_vol": 11000,
        "sell_sm_amount": 1250.2,
        "buy_lg_amount": 8800.0,
        "sell_lg_amount": 7600.0,
        "net_mf_vol": 2100,
        "net_mf_amount": 950.3
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
