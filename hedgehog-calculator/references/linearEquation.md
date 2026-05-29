# linearEquation

**方法**: POST  
**路径**: /v1/general-calculator/equations/linear  
**描述**: 求解形如 `ax + b = 0` 的一元一次方程。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| a | number | 是 | 一次项系数 |
| b | number | 是 | 常数项 |

### 请求示例
```json
{
  "a": 2,
  "b": -8
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| equation | string | 方程展示文本 |
| solution | string | 解的展示文本；可能是 `x = ...`、`无解` 或 `无穷多解` |

### 响应示例
```json
{
  "equation": "2x + -8 = 0",
  "solution": "x = 4.0"
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
