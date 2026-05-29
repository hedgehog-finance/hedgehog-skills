# futureValue

**方法**: POST  
**路径**: /v1/financial/future-value  
**描述**: 根据现值、年利率小数、年限和每年复利次数，计算未来价值。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| present_value | number | 是 | 当前金额或初始本金 |
| rate | number | 是 | 年利率小数，例如 `0.05` 表示 5% |
| periods | integer | 是 | 投资或计息年数 |
| compound_frequency | integer | 否 | 每年复利次数，默认 `1`；`12` 表示月复利 |

### 请求示例
```json
{
  "present_value": 100000,
  "rate": 0.05,
  "periods": 3,
  "compound_frequency": 12
}
```

## 响应

### 成功 (200)
| 返回体 | 类型 | 说明 |
|--------|------|------|
| number | number | 未来价值，即现值按指定复利频率增长后的终值 |

### 响应示例
```json
116147.22313334678
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
