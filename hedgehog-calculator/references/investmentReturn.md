# investmentReturn

**方法**: POST  
**路径**: /v1/general-calculator/finance/investment-return  
**描述**: 根据初始本金、最终金额和持有年限，计算总收益率和复合年化收益率。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| principal | number | 是 | 初始本金；小于等于 0 时返回业务错误对象 |
| final_value | number | 是 | 投资期末最终金额 |
| years | number | 是 | 投资年限；小于等于 0 时返回业务错误对象 |

### 请求示例
```json
{
  "principal": 100000,
  "final_value": 138000,
  "years": 3
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| principal | number | 初始本金 |
| final_value | number | 最终金额 |
| years | number | 投资年限 |
| total_return_pct | number | 总收益率小数，保留 6 位小数 |
| annual_return_pct | number | 复合年化收益率小数，保留 6 位小数 |
| error | string | 当本金或期限小于等于 0 时返回 |

### 响应示例
```json
{
  "principal": 100000,
  "final_value": 138000,
  "years": 3,
  "total_return_pct": 0.38,
  "annual_return_pct": 0.113336
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
