# listFlashNews

**方法**: GET  
**路径**: /v1/news/flash  
**描述**: 分页查询快讯，按 `publish_time` 倒序返回。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| start_time | string | 否 | - | 起始发布时间，建议 ISO 风格字符串 |
| end_time | string | 否 | - | 结束发布时间，建议 ISO 风格字符串 |
| source | string | 否 | - | 消息来源 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-100 |

### 请求示例
```json
{
  "source": "财联社",
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
| data.page | int | 当前页码 |
| data.page_size | int | 每页条数 |
| data.db_source | string | 数据源，通常为 `flash_news` |
| data.items[].id | int | 快讯 ID |
| data.items[].title | string | 快讯标题 |
| data.items[].content | string | 快讯正文 |
| data.items[].source | string | 来源 |
| data.items[].publish_time | string | 发布时间 |
| data.items[].total_score | int | 总分 |
| data.items[].reasoning | string | 打分依据 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "db_source": "flash_news",
    "items": [
      {
        "id": 1,
        "title": "市场快讯标题",
        "content": "快讯正文",
        "source": "财联社",
        "publish_time": "2026-05-22T09:31:00",
        "information_importance": 40,
        "emotional_importance": 20,
        "knowledge_value": 7,
        "market_relevance": 9,
        "total_score": 76,
        "reasoning": "打分依据..."
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
