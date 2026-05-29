# querySwIndustryMember

**方法**: GET
**路径**: /v1/stock/sw-industry-member
**描述**: 分页查询申万行业成分股，按 `in_date` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| l1_code | string | 否 | - | 一级行业代码 |
| l2_code | string | 否 | - | 二级行业代码 |
| l3_code | string | 否 | - | 三级行业代码 |
| stock_code | string | 否 | - | 成分股票代码 |
| is_new | string | 否 | - | 是否最新，通常为 `Y` 或 `N` |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-500 |

### 请求示例
```json
{
  "l1_code": "801780.SI",
  "is_new": "Y",
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
| data.db_source | string | 数据源，通常为 `sw_industry_member` |
| data.items[].l1_code | string | 一级行业代码 |
| data.items[].l1_name | string | 一级行业名称 |
| data.items[].l2_code | string | 二级行业代码 |
| data.items[].l2_name | string | 二级行业名称 |
| data.items[].l3_code | string | 三级行业代码 |
| data.items[].l3_name | string | 三级行业名称 |
| data.items[].stock_code | string | 成分股票代码 |
| data.items[].name | string | 成分股票名称 |
| data.items[].in_date | string | 纳入日期 |
| data.items[].out_date | string/null | 剔除日期 |
| data.items[].is_new | string | 是否最新 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 42,
    "page": 1,
    "page_size": 20,
    "db_source": "sw_industry_member",
    "items": [
      {
        "id": 1,
        "l1_code": "801780.SI",
        "l1_name": "银行",
        "l2_code": "801780.SI",
        "l2_name": "银行",
        "l3_code": "851911.SI",
        "l3_name": "国有大型银行",
        "stock_code": "000001.SZ",
        "name": "平安银行",
        "in_date": "2024-12-13",
        "out_date": null,
        "is_new": "Y"
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
