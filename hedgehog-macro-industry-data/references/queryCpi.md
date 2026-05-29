# queryCpi

**方法**: GET  
**路径**: /v1/macro-cn/cpi  
**描述**: 分页查询中国 CPI 数据，按 `month` 倒序返回。

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
  "start_month": "202501",
  "end_month": "202512"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.total | int | 总条数 |
| data.db_source | string | 数据源，通常为 `cn_cpi` |
| data.items[].month | string | 月份 |
| data.items[].nt_val | number | 全国当月值 |
| data.items[].nt_yoy | number | 全国同比 |
| data.items[].nt_mom | number | 全国环比 |
| data.items[].nt_accu | number | 全国累计值 |
| data.items[].town_val | number | 城市当月值 |
| data.items[].town_yoy | number | 城市同比 |
| data.items[].cnt_val | number | 农村当月值 |
| data.items[].cnt_yoy | number | 农村同比 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "page_size": 20,
    "db_source": "cn_cpi",
    "items": [
      {
        "id": 1,
        "month": "202512",
        "nt_val": 101.2,
        "nt_yoy": 1.2,
        "nt_mom": 0.1,
        "nt_accu": 100.8,
        "town_val": 101.1,
        "town_yoy": 1.1,
        "cnt_val": 101.4,
        "cnt_yoy": 1.4
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
