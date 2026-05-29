# quadraticEquation

**方法**: POST  
**路径**: /v1/general-calculator/equations/quadratic  
**描述**: 求解形如 `ax² + bx + c = 0` 的一元二次方程。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| a | number | 是 | 二次项系数；为 0 时会退化为一次方程求解 |
| b | number | 是 | 一次项系数 |
| c | number | 是 | 常数项 |

### 请求示例
```json
{
  "a": 1,
  "b": -3,
  "c": 2
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| equation | string | 方程展示文本 |
| type | string | 根的类型，例如 `两个不等实根`、`重根`、`无实数解（有两个共轭复根）` |
| x1 | number\|string | 第一个根；复根时为字符串 |
| x2 | number\|string | 第二个根；复根时为字符串 |
| x | number | 重根时返回 |
| solution | string | `a = 0` 退化为一次方程时返回 |

### 响应示例
```json
{
  "equation": "1x² + -3x + 2 = 0",
  "type": "两个不等实根",
  "x1": 2.0,
  "x2": 1.0
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
