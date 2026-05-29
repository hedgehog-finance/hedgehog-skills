# unitConvert

**方法**: POST  
**路径**: /v1/general-calculator/units/convert  
**描述**: 将一个数值从原始单位换算到目标单位，支持长度、重量、面积和温度单位别名。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| value | number | 是 | 待换算的数值 |
| from_unit | string | 是 | 原始单位，大小写会被归一化 |
| to_unit | string | 是 | 目标单位 |

### 支持单位
| 类别 | 单位别名 |
|------|----------|
| 长度 | `m`, `meter`, `米`, `km`, `kilometer`, `公里`, `cm`, `centimeter`, `厘米`, `mm`, `inch`, `in`, `ft`, `yd`, `mi` |
| 重量 | `kg`, `kilogram`, `公斤`, `g`, `gram`, `克`, `lb`, `lbs`, `磅`, `oz`, `ounce`, `盎司`, `t`, `ton`, `吨` |
| 面积 | `m2`, `sqm`, `平方米`, `km2`, `sqkm`, `平方公里`, `acre`, `英亩`, `亩` |
| 温度 | `c`, `celsius`, `摄氏度`, `f`, `fahrenheit`, `华氏度` |

### 请求示例
```json
{
  "value": 10,
  "from_unit": "km",
  "to_unit": "m"
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| from | string | 带单位的原始值展示文本 |
| to | string | 带单位的换算结果展示文本 |
| result | number | 换算后的数值；普通单位保留 6 位小数，温度保留 2 位小数 |
| error | string | 单位不支持时返回 |

### 响应示例
```json
{
  "from": "10 km",
  "to": "10000.0 m",
  "result": 10000.0
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
