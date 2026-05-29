# querySocialFinancing

**方法**: GET  
**路径**: /v1/macro-cn/social-financing  
**描述**: 分页查询中国社会融资规模数据，按 `month` 倒序返回。

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
| data.db_source | string | 数据源，通常为 `cn_social_financing` |
| data.items[].month | string | 月份 |
| data.items[].inc_month | number | 当月新增社融 |
| data.items[].inc_cumval | number | 社融累计新增 |
| data.items[].stk_endval | number | 社融存量期末值 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "page_size": 20,
    "db_source": "cn_social_financing",
    "items": [
      {
        "id": 1,
        "month": "202512",
        "inc_month": 25000.0,
        "inc_cumval": 360000.0,
        "stk_endval": 420.5
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
