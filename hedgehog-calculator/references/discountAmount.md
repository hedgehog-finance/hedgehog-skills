# discountAmount

**方法**: POST  
**路径**: /v1/financial/discount-amount  
**描述**: 根据商品原价和折扣比例，计算折扣金额、成交价和节省比例。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| original_price | number | 是 | 商品原价 |
| discount_percent | number | 是 | 折扣比例小数，例如 `0.2` 表示优惠 20% |

### 请求示例
```json
{
  "original_price": 1299,
  "discount_percent": 0.2
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| original_price | number | 商品原价 |
| discount_percent | number | 输入折扣比例小数 |
| discount_amount | number | 折扣金额 |
| final_price | number | 折后成交价 |
| savings_percent | number | 节省比例小数，当前等于输入的折扣比例 |

### 响应示例
```json
{
  "original_price": 1299,
  "discount_percent": 0.2,
  "discount_amount": 259.8,
  "final_price": 1039.2,
  "savings_percent": 0.2
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
