# listFlashNews 返回字段说明

**接口**：`GET /v1/news/flash`
**返回结构**：`{ code, message, data: { total, page, page_size, db_source, items[] } }`

## `data` 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| total | int | 命中总条数 |
| page | int | 当前页码 |
| page_size | int | 每页条数 |
| db_source | string | 数据来源表名，固定 `flash_news` |
| items | array | 快讯列表，元素结构见下表 |

## `data.items[]` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 快讯 ID |
| title | string | 快讯标题 |
| content | string | 快讯正文 |
| source | string | 消息来源（如 `财联社`） |
| publish_time | string | 发布时间，ISO 字符串 |
| hash | string | 内容哈希，用于去重 |
| information_importance | int | 信息重要性评分 |
| emotional_importance | int | 情绪重要性评分 |
| knowledge_value | int | 知识体系价值评分 |
| market_relevance | int | 市场相关性评分 |
| total_score | int | 总分 |
| reasoning | string | 打分依据 |

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 50,
    "db_source": "flash_news",
    "items": [
      {
        "id": 1,
        "title": "市场快讯标题",
        "content": "快讯正文",
        "source": "财联社",
        "publish_time": "2026-05-22T09:31:00",
        "hash": "abc123",
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
