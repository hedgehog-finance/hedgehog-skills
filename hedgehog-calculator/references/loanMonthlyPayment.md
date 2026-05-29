# loanMonthlyPayment

**方法**: POST  
**路径**: /v1/general-calculator/finance/loan-monthly-payment  
**描述**: 按等额本息模型计算固定月供、还款总额和总利息。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| principal | number | 是 | 贷款本金 |
| annual_rate | number | 是 | 贷款年利率小数，例如 `0.042` 表示 4.2% |
| years | integer | 是 | 贷款年限 |

### 请求示例
```json
{
  "principal": 1000000,
  "annual_rate": 0.042,
  "years": 30
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| principal | number | 贷款本金 |
| annual_rate | number | 输入的年利率小数 |
| years | integer | 贷款年限 |
| monthly_payment | number | 每月应还金额，保留 2 位小数 |
| total_payment | number | 整个还款期的还款总额，保留 2 位小数 |
| total_interest | number | 总利息，保留 2 位小数 |

### 响应示例
```json
{
  "principal": 1000000,
  "annual_rate": 0.042,
  "years": 30,
  "monthly_payment": 4890.17,
  "total_payment": 1760461.83,
  "total_interest": 760461.83
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
