# markupPrice

**方法**: POST  
**路径**: /v1/financial/markup-price  
**描述**: 根据成本和加价比例计算加价金额、销售价格和毛利率。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| cost | number | 是 | 成本金额 |
| markup_percent | number | 是 | 加价比例小数，例如 `0.3` 表示成本上浮 30% |

### 请求示例
```json
{
  "cost": 80,
  "markup_percent": 0.3
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| cost | number | 成本金额 |
| markup_percent | number | 输入加价比例小数 |
| markup_amount | number | 加价金额 |
| selling_price | number | 销售价格 |
| margin_percent | number | 毛利率小数，按 `加价金额 / 销售价格` 计算 |

### 响应示例
```json
{
  "cost": 80,
  "markup_percent": 0.3,
  "markup_amount": 24.0,
  "selling_price": 104.0,
  "margin_percent": 0.23076923076923078
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
