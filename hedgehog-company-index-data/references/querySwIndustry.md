# querySwIndustry

**方法**: GET  
**路径**: /v1/stock/sw-industry  
**描述**: 查询申万行业分类。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| index_code | string | 否 | - | 申万行业指数代码 |
| level | string | 否 | - | 行业层级 |
| parent_code | string | 否 | - | 父级行业代码 |

### 请求示例
```json
{
  "level": "L1"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.db_source | string | 数据源，通常为 `sw_industry_classify` |
| data.items[].index_code | string | 申万行业指数代码 |
| data.items[].industry_name | string | 行业名称 |
| data.items[].parent_code | string/null | 父级行业代码 |
| data.items[].level | string | 行业层级 |
| data.items[].industry_code | string | 行业代码 |
| data.items[].is_pub | string | 是否发布 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "db_source": "sw_industry_classify",
    "items": [
      {
        "index_code": "801780.SI",
        "industry_name": "银行",
        "parent_code": null,
        "level": "L1",
        "industry_code": "801780",
        "is_pub": "1"
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
