# queryMoneySupply

**方法**: GET  
**路径**: /v1/macro-cn/money-supply  
**描述**: 分页查询中国货币供应量 M0/M1/M2 数据，按 `month` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| start_month | string | 否 | - | 起始月份，格式 `YYYYMM` |
| end_month | string | 否 | - | 结束月份，格式 `YYYYMM` |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-100 |

### 请求示例
```json
{
  "start_month": "202501"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.total | int | 总条数 |
| data.db_source | string | 数据源，通常为 `cn_money_supply` |
| data.items[].month | string | 月份 |
| data.items[].m0 | number | M0 |
| data.items[].m0_yoy | number | M0 同比 |
| data.items[].m1 | number | M1 |
| data.items[].m1_yoy | number | M1 同比 |
| data.items[].m2 | number | M2 |
| data.items[].m2_yoy | number | M2 同比 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "page_size": 20,
    "db_source": "cn_money_supply",
    "items": [
      {
        "id": 1,
        "month": "202512",
        "m0": 120000.0,
        "m0_yoy": 8.1,
        "m1": 750000.0,
        "m1_yoy": 5.2,
        "m2": 3200000.0,
        "m2_yoy": 7.0
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
