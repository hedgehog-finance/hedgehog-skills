# listNews

**方法**: GET  
**路径**: /v1/news/list  
**描述**: 分页查询重大新闻，按 `publish_time` 倒序返回。

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
| has_content | bool | 否 | true | true 只查有正文；false 只查无正文 |
| page | int | 否 | 1 | 页码，最小 1 |
| page_size | int | 否 | 50 | 每页条数，范围 1-1000 |

### 请求示例
```json
{
  "source": "财联社",
  "has_content": true,
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
| data.db_source | string | 数据源，通常为 `major_news` |
| data.items[].id | int | 新闻 ID |
| data.items[].title | string | 新闻标题 |
| data.items[].content | string | 新闻正文 |
| data.items[].source | string | 新闻来源 |
| data.items[].publish_time | string | 发布时间 |
| data.items[].url | string | 原文链接 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "db_source": "major_news",
    "items": [
      {
        "id": 1,
        "title": "某行业政策发布",
        "content": "新闻正文...",
        "source": "财联社",
        "publish_time": "2026-05-22T09:30:00",
        "url": "https://example.com/news/1"
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
