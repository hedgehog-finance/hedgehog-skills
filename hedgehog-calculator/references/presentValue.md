# presentValue

**方法**: POST  
**路径**: /v1/financial/present-value  
**描述**: 根据未来金额、贴现率、年限和每年复利次数，计算当前价值。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| future_value | number | 是 | 未来金额 |
| rate | number | 是 | 年贴现率小数，例如 `0.05` 表示 5% |
| periods | integer | 是 | 贴现年数 |
| compound_frequency | integer | 否 | 每年复利次数，默认 `1` |

### 请求示例
```json
{
  "future_value": 120000,
  "rate": 0.05,
  "periods": 3,
  "compound_frequency": 12
}
```

## 响应

### 成功 (200)
| 返回体 | 类型 | 说明 |
|--------|------|------|
| number | number | 折现后的当前价值 |

### 响应示例
```json
103317.14935812965
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
