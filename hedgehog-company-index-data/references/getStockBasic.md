# getStockBasic

**方法**: GET  
**路径**: /v1/stock/basic  
**描述**: 查询股票列表基础信息。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| stock_code | string | 否 | - | 股票代码带后缀，精确匹配 |
| name | string | 否 | - | 股票名称，模糊匹配 |
| industry | string | 否 | - | 所属行业，精确匹配 |
| market | string | 否 | - | 市场类型，如主板、创业板、科创板、CDR |

### 请求示例
```json
{
  "name": "平安",
  "market": "主板"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.db_source | string | 数据源，通常为 `stock_basic` |
| data.items[].stock_code | string | 股票代码 |
| data.items[].symbol | string | 股票代码数字部分 |
| data.items[].name | string | 股票简称 |
| data.items[].area | string | 地区 |
| data.items[].industry | string | 所属行业 |
| data.items[].fullname | string | 公司全称 |
| data.items[].market | string | 市场类型 |
| data.items[].exchange | string | 交易所 |
| data.items[].list_date | string | 上市日期 |
| data.items[].is_hs | string | 沪深港通标识 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "db_source": "stock_basic",
    "items": [
      {
        "stock_code": "000001.SZ",
        "symbol": "000001",
        "name": "平安银行",
        "area": "深圳",
        "industry": "银行",
        "fullname": "平安银行股份有限公司",
        "market": "主板",
        "exchange": "SZSE",
        "list_date": "1991-04-03",
        "is_hs": "S"
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
