# getAnnouncementDetail 返回字段说明

**接口**：`GET /v1/announcements/{announcement_id}`
**返回结构**：`{ code, message, data }`，`data` 为单条公告对象。

## `data` 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 公告 ID |
| source_type | string | 公告来源类型（如 `company`） |
| stock_code | string | 证券代码 |
| exchange | string | 交易所代码（如 `szse` / `sse` / `bse`） |
| stock_name | string | 证券简称 |
| title | string | 公告标题 |
| announcement_time | string | 公告发布时间，ISO 字符串 |
| url | string | 公告原文 URL |
| category | string | 公告分类（如 `定期报告`） |
| content_md | string | 公告解析正文（Markdown） |
| content_json | string | 公告结构化解析（JSON 字符串） |
| parse_skip_reason | string | 解析跳过原因：`file_too_large` / `page_count_exceeded` / `non_pdf` / `invalid_pdf` |
| db_source | string | 数据来源表名，固定 `announcements` |
| analysis | object \| null | 公告分析对象，无分析则为 `null`，结构见下表 |

## `data.analysis` 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 公告标题 |
| date | string | 公告日期 |
| summary | string | 公告摘要 |
| tags | object | 标签 |
| tags.announce_type | string | 公告类型枚举（U1~U10） |
| tags.announce_content | string[] | 公告相关事项标签列表 |
| tags.stock | string[] | 股票标签，通常包含股票名称和股票代码 |
| global_scoring | object | 全局评分 |
| global_scoring.importance_score | int | 公告重要性 |
| global_scoring.stock_impact_score | int | 个股影响评分 |
| announce_type | string | 公告类型枚举（U1~U10） |
| announce_analysis | string | 公告分析正文 |

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
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
    "parse_skip_reason": null,
    "db_source": "announcements",
    "analysis": {
      "title": "年度报告",
      "date": "2026-03-28T18:00:00",
      "summary": "公告摘要",
      "tags": {
        "announce_type": "U1",
        "announce_content": ["定期报告"],
        "stock": ["平安银行", "000001.SZ"]
      },
      "global_scoring": {
        "importance_score": 80,
        "stock_impact_score": 3
      },
      "announce_type": "U1",
      "announce_analysis": "公告分析..."
    }
  }
}
```
