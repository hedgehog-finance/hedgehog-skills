# listAnnouncements 返回字段说明

**接口**：`GET /v1/announcements/list`
**返回结构**：`{ code, message, data: { total, page, page_size, db_source, items[] } }`

## `data` 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| total | int | 命中总条数 |
| page | int | 当前页码 |
| page_size | int | 每页条数 |
| db_source | string | 数据来源表名，固定 `announcements` |
| items | array | 公告列表，元素结构见下表 |

## `data.items[]` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 公告 ID |
| source_type | string | 公告来源类型（如 `company`） |
| stock_code | string | 证券代码 |
| exchange | string | 交易所代码（如 `szse` / `sse` / `bse`） |
| stock_name | string | 证券简称 |
| title | string | 公告标题 |
| announcement_time | string | 公告发布时间，ISO 字符串 |
| url | string | 公告原文 URL（PDF 等） |
| category | string | 公告分类（如 `定期报告`） |
| content_md | string | 公告解析正文（Markdown），未解析则为 `null` |
| content_json | string | 公告结构化解析（JSON 字符串），未解析则为 `null` |
| parse_skip_reason | string \| null | 解析跳过原因；正常情况为 `null` |

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "page_size": 50,
    "db_source": "announcements",
    "items": [
      {
        "id": 1,
        "source_type": "company",
        "stock_code": "000001.SZ",
        "exchange": "szse",
        "stock_name": "平安银行",
        "title": "年度报告",
        "announcement_time": "2026-03-28T18:00:00",
        "url": "https://example.com/announcement.pdf",
        "category": "定期报告",
        "content_md": "公告解析内容...",
        "content_json": "{}",
        "parse_skip_reason": null
      }
    ]
  }
}
```
