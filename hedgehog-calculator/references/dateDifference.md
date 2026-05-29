# dateDifference

**方法**: POST  
**路径**: /v1/general-calculator/dates/difference  
**描述**: 计算两个日期之间的绝对间隔，返回天数、周数、月数和年数。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| start_date | string | 是 | 开始日期，支持 `YYYY-MM-DD` 或 `YYYY年MM月DD日` |
| end_date | string | 是 | 结束日期，支持 `YYYY-MM-DD` 或 `YYYY年MM月DD日` |

### 请求示例
```json
{
  "start_date": "2025-01-01",
  "end_date": "2026-05-23"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| start | string | 输入的开始日期文本 |
| end | string | 输入的结束日期文本 |
| days | integer | 绝对间隔天数 |
| months | integer | 按 30 天折算并取整的月份数 |
| years | number | 按 365.25 天折算的年数，保留 2 位小数 |
| weeks | number | 按 7 天折算的周数，保留 2 位小数 |
| error | string | 日期格式不支持时返回 |

### 响应示例
```json
{
  "start": "2025-01-01",
  "end": "2026-05-23",
  "days": 507,
  "months": 16,
  "years": 1.39,
  "weeks": 72.43
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
