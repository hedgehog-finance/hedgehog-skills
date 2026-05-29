# statisticsBasic

**方法**: POST  
**路径**: /v1/general-calculator/statistics/basic  
**描述**: 对一组数字做基础描述性统计，方差采用总体方差公式。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| Content-Type | application/json |
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 读取 |

### Body 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| numbers | number[] | 是 | 待统计的数字列表；空列表会返回业务错误对象 |

### 请求示例
```json
{
  "numbers": [12, 15, 15, 18, 21, 30]
}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| count | integer | 数字个数 |
| mean | number | 均值，保留 4 位小数 |
| variance | number | 总体方差，保留 4 位小数 |
| std_dev | number | 总体标准差，保留 4 位小数 |
| median | number | 中位数，保留 4 位小数 |
| mode | array\|string | 众数列表；若所有值出现次数相同，则返回字符串 `无众数` |
| min | number | 最小值 |
| max | number | 最大值 |
| range | number | 极差，即最大值减最小值，保留 4 位小数 |
| error | string | 当 `numbers` 为空时返回 |

### 响应示例
```json
{
  "count": 6,
  "mean": 18.5,
  "variance": 34.25,
  "std_dev": 5.8523,
  "median": 16.5,
  "mode": [15],
  "min": 12,
  "max": 30,
  "range": 18
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 400 | 参数缺失或格式错误 |
| 500 | 服务端异常 |
