# annuityFutureValue

**方法**: POST  
**路径**: /v1/financial/annuity-future-value  
**描述**: 计算普通年金终值，即每期末等额付款累计到最后一期的价值。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| payment | number | 是 | 每期付款金额 |
| rate | number | 是 | 每期利率小数，例如 `0.005` 表示每期 0.5% |
| periods | integer | 是 | 总期数 |

### 请求示例
```json
{
  "payment": 2000,
  "rate": 0.005,
  "periods": 36
}
```

## 响应

### 成功 (200)
| 返回体 | 类型 | 说明 |
|--------|------|------|
| number | number | 普通年金终值；若利率为 0，则返回 `payment × periods` |

### 响应示例
```json
78672.20992936588
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
