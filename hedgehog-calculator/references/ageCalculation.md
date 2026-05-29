# ageCalculation

**方法**: POST  
**路径**: /v1/general-calculator/dates/age  
**描述**: 根据出生日期和可选参考日期计算年龄拆分、总天数和估算总月份。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| birth_date | string | 是 | 出生日期，支持 `YYYY-MM-DD` 或 `YYYY年MM月DD日` |
| ref_date | string\|null | 否 | 参考日期；不传时使用服务端当前日期，当前实现只按 `YYYY-MM-DD` 解析 |

### 请求示例
```json
{
  "birth_date": "1990-05-20",
  "ref_date": "2026-05-23"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| birth_date | string | 输入的出生日期文本 |
| age_years | integer | 完整年龄年数 |
| age_months | integer | 扣除完整年后的月份数 |
| age_days | integer | 扣除完整年和月后的天数 |
| total_days | integer | 出生日期到参考日期之间的总天数 |
| total_months | integer | 按 `total_days // 30` 估算的总月份 |
| description | string | 中文年龄描述 |
| error | string | 日期格式不支持时返回 |

### 响应示例
```json
{
  "birth_date": "1990-05-20",
  "age_years": 36,
  "age_months": 0,
  "age_days": 3,
  "total_days": 13152,
  "total_months": 438,
  "description": "36岁0个月3天"
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
