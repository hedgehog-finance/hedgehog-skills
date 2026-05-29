# queryFinanceMainbz

**方法**: GET  
**路径**: /v1/finance/mainbz  
**描述**: 分页查询主营业务构成，按 `end_date` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| stock_code | string | 否 | - | 股票代码 |
| start_date | string | 否 | - | 起始报告期 |
| end_date | string | 否 | - | 结束报告期 |
| bz_code | string | 否 | - | 主营业务来源类型 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-100 |

### 请求示例
```json
{
  "stock_code": "000001.SZ",
  "bz_code": "P",
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
| data.db_source | string | 数据源，通常为 `finance_mainbz` |
| data.items[].stock_code | string | 股票代码 |
| data.items[].end_date | string | 报告期 |
| data.items[].bz_item | string | 主营业务项目 |
| data.items[].bz_code | string | 主营业务来源类型 |
| data.items[].bz_sales | number | 主营业务收入 |
| data.items[].bz_profit | number | 主营业务利润 |
| data.items[].bz_cost | number | 主营业务成本 |
| data.items[].curr_type | string | 货币类型 |
| data.items[].update_flag | string | 更新标识 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 3,
    "page": 1,
    "page_size": 20,
    "db_source": "finance_mainbz",
    "items": [
      {
        "id": 1,
        "stock_code": "000001.SZ",
        "end_date": "2025-12-31",
        "bz_item": "零售金融业务",
        "bz_code": "P",
        "bz_sales": 12300000000.0,
        "bz_profit": 4560000000.0,
        "bz_cost": 7800000000.0,
        "curr_type": "CNY",
        "update_flag": "1"
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
