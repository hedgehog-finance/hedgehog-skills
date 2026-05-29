# MACD

**方法**: POST  
**路径**: /v1/indicators/calculate 或 /v1/indicators/calculate-from-data  
**描述**: 计算异同移动平均线、信号线和柱状值。脚本会固定提交 `"indicator": "macd"`。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### data 模式 Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| data | object[] | 是 | K线数据数组；每行必须包含 `close` |
| data[].date | string | 否 | 行情日期或时间；建议 `YYYY-MM-DD` |
| data[].close | number | 是 | 收盘价 |
| fast | number | 否 | 快线周期，默认 `12` |
| slow | number | 否 | 慢线周期，默认 `26` |
| signal | number | 否 | 信号线周期，默认 `9` |
| params | object | 否 | 可传 `{ "fast": 12, "slow": 26, "signal": 9 }` 覆盖参数 |

### 行情查询模式 Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| stock_code | string | 是 | 股票代码，例如 `000001.SZ`；不传 `data` 时脚本调用 `/v1/indicators/calculate-from-data` |
| start_date | string | 是 | 开始日期，格式 `YYYY-MM-DD` |
| end_date | string | 是 | 结束日期，格式 `YYYY-MM-DD` |
| price_adjustment | string | 否 | 价格复权方式，默认 `none`，可传 `forward` |
| limit | number | 否 | 查询行情条数限制，默认由服务端决定 |
| fast | number | 否 | 快线周期，默认 `12` |
| slow | number | 否 | 慢线周期，默认 `26` |
| signal | number | 否 | 信号线周期，默认 `9` |
| params | object | 否 | 可传 `{ "fast": 12, "slow": 26, "signal": 9 }` 覆盖参数 |

### 请求示例
```json
{
  "data": [
    { "date": "2026-05-18", "close": 12.10 },
    { "date": "2026-05-19", "close": 12.35 },
    { "date": "2026-05-20", "close": 12.42 }
  ],
  "fast": 12,
  "slow": 26,
  "signal": 9
}
```

### 行情查询请求示例
```json
{
  "stock_code": "000001.SZ",
  "start_date": "2026-05-01",
  "end_date": "2026-05-22",
  "fast": 12,
  "slow": 26,
  "signal": 9,
  "price_adjustment": "forward"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| indicator | string | 固定为 `macd` |
| category | string | 指标类别 |
| params | object | 实际用于计算的参数 |
| output_columns | string[] | 输出列名，如 `MACD_12_26_9`, `MACDh_12_26_9`, `MACDs_12_26_9` |
| data | object[] | 逐行计算结果 |
| latest | object\|null | 最近一条完整结果 |
| source | object | 行情查询模式返回的数据来源信息 |

### 响应示例
```json
{
  "indicator": "macd",
  "category": "momentum",
  "params": { "fast": 12, "slow": 26, "signal": 9 },
  "output_columns": ["MACD_12_26_9", "MACDh_12_26_9", "MACDs_12_26_9"],
  "data": [{ "date": "2026-05-20", "MACD_12_26_9": null, "MACDh_12_26_9": null, "MACDs_12_26_9": null }],
  "latest": null
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
