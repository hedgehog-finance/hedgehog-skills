---
name: ciwei-calculator
description: >
  常用计算器：包含金融计算（终值/现值/折扣/加价/年金/贷款/投资回报）、
  统计分析、单位换算、日期计算（年龄/日期差）、一元一次/二次方程求解。
  触发词：计算终值；计算现值；计算折扣；计算加价；年金计算；贷款月供；
  投资回报；统计分析；单位换算；计算年龄；计算日期差；一元一次方程；二次方程。
  不适用：多元方程、基础四则运算、三角函数。
version: 1.0.0
---

# 计算器 Skill

## 脚本位置
```
scripts/
└── call-api.js   // 统一接口调用入口
```

## 全局约定
- 所有百分比、利率、收益率、折扣率字段均用**小数形式**：`0.05`=5%，`0.2`=20%。
- 调用方式：`node scripts/call-api.js <method> '<params-json>'`。
- 返回由接口决定，可能为对象、数字或带 `error` 的业务错误对象。

---

### Tool-1: 终值计算

**功能**：由现值、年利率、年限和复利频次计算未来价值。

**适用场景**：投资/储蓄按指定复利频率增长后的终值估算（需原始浮点精度）。

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `present_value` | number | 是 | — | 当前金额/初始本金 |
| `rate` | number | 是 | — | 年利率小数，`0.05`=5% |
| `periods` | integer | 是 | — | 计息年数 |
| `compound_frequency` | integer | 否 | 1 | 每年复利次数（1=年复利，12=月复利） |

**执行方法**：
```
node scripts/call-api.js financial/future-value '{"present_value":100000,"rate":0.05,"periods":3,"compound_frequency":12}'
```

**返回示例**：
```json
116147.22313334678
```

**返回字段说明**：返回未来价值（number），不四舍五入。

---

### Tool-2: 现值计算

**功能**：由未来金额、年贴现率、年限和复利频次计算当前价值。

**适用场景**：现金流折现、估算未来金额的当前价值。

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `future_value` | number | 是 | — | 未来金额 |
| `rate` | number | 是 | — | 年贴现率小数，`0.05`=5% |
| `periods` | integer | 是 | — | 贴现年数 |
| `compound_frequency` | integer | 否 | 1 | 每年复利次数 |

**执行方法**：
```
node scripts/call-api.js financial/present-value '{"future_value":120000,"rate":0.05,"periods":3,"compound_frequency":12}'
```

**返回示例**：
```json
103317.14935812965
```

**返回字段说明**：返回折现后的当前价值（number）。

---

### Tool-3: 折扣金额计算

**功能**：由商品原价和折扣比例计算折扣金额、成交价和节省比例。

**适用场景**：购物折扣、优惠促销估算。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `original_price` | number | 是 | 商品原价 |
| `discount_percent` | number | 是 | 折扣比例小数，`0.2`=优惠20% |

**执行方法**：
```
node scripts/call-api.js financial/discount-amount '{"original_price":1299,"discount_percent":0.2}'
```

**返回示例**：
```json
{
  "original_price": 1299,
  "discount_percent": 0.2,
  "discount_amount": 259.8,
  "final_price": 1039.2,
  "savings_percent": 0.2
}
```

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `original_price` | number | 商品原价 |
| `discount_percent` | number | 输入折扣比例小数 |
| `discount_amount` | number | 折扣金额 |
| `final_price` | number | 折后成交价 |
| `savings_percent` | number | 节省比例小数 |

---

### Tool-4: 加价售价计算

**功能**：由成本和加价比例计算加价金额、销售价格和毛利率。

**适用场景**：商品定价、毛利率测算。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cost` | number | 是 | 成本 |
| `markup_percent` | number | 是 | 加价比例小数，`0.3`=成本上浮30% |

**执行方法**：
```
node scripts/call-api.js financial/markup-price '{"cost":80,"markup_percent":0.3}'
```

**返回示例**：
```json
{
  "cost": 80,
  "markup_percent": 0.3,
  "markup_amount": 24.0,
  "selling_price": 104.0,
  "margin_percent": 0.23076923076923078
}
```

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `cost` | number | 成本 |
| `markup_percent` | number | 输入加价比例小数 |
| `markup_amount` | number | 加价金额 |
| `selling_price` | number | 销售价格 |
| `margin_percent` | number | 毛利率小数（=加价金额/销售价格） |

---

### Tool-5: 普通年金终值计算

**功能**：计算每期期末等额付款按每期利率累计至末期的价值。

**适用场景**：定投终值、退休金累计、按月还款累计估算。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `payment` | number | 是 | 每期付款金额 |
| `rate` | number | 是 | 每期利率小数，`0.005`=每期0.5% |
| `periods` | integer | 是 | 总期数 |

**执行方法**：
```
node scripts/call-api.js financial/annuity-future-value '{"payment":2000,"rate":0.005,"periods":36}'
```

**返回示例**：
```json
78672.20992936588
```

**返回字段说明**：返回普通年金终值（number）；若 `rate` 为0，则返回 `payment × periods`。

---

### Tool-6: 普通年金现值计算

**功能**：将未来每期等额付款按每期利率折现至当前。

**适用场景**：贷款额度、定投本金价值、租赁付款现值估算。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `payment` | number | 是 | 每期付款金额 |
| `rate` | number | 是 | 每期利率小数，`0.005`=每期0.5% |
| `periods` | integer | 是 | 总期数 |

**执行方法**：
```
node scripts/call-api.js financial/annuity-present-value '{"payment":2000,"rate":0.005,"periods":36}'
```

**返回示例**：
```json
65742.03247853054
```

**返回字段说明**：返回普通年金现值（number）；若 `rate` 为0，则返回 `payment × periods`。

---

### Tool-7: 贷款等额本息月供计算

**功能**：按等额本息模型计算固定月供、还款总额、总利息。

**适用场景**：房贷/车贷/消费贷月供测算（年利率为0时本金按月平摊）。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `principal` | number | 是 | 贷款本金 |
| `annual_rate` | number | 是 | 贷款年利率小数，`0.042`=4.2% |
| `years` | integer | 是 | 贷款年限 |

**执行方法**：
```
node scripts/call-api.js general-calculator/finance/loan-monthly-payment '{"principal":1000000,"annual_rate":0.042,"years":30}'
```

**返回示例**：
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

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `principal` | number | 贷款本金 |
| `annual_rate` | number | 输入年利率小数 |
| `years` | integer | 贷款年限 |
| `monthly_payment` | number | 每月应还（保留2位小数） |
| `total_payment` | number | 还款总额（保留2位小数） |
| `total_interest` | number | 总利息（保留2位小数） |

---

### Tool-8: 投资收益率计算

**功能**：由初始本金、最终金额和持有年限计算总收益率与复合年化收益率。

**适用场景**：基金/股票/项目持有期回报率评估。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `principal` | number | 是 | 初始本金（≤0时返回业务错误对象） |
| `final_value` | number | 是 | 投资期末最终金额 |
| `years` | number | 是 | 投资年限（≤0时返回业务错误对象） |

**执行方法**：
```
node scripts/call-api.js general-calculator/finance/investment-return '{"principal":100000,"final_value":138000,"years":3}'
```

**返回示例**：
```json
{
  "principal": 100000,
  "final_value": 138000,
  "years": 3,
  "total_return_pct": 0.38,
  "annual_return_pct": 0.113336
}
```

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `principal` | number | 初始本金 |
| `final_value` | number | 最终金额 |
| `years` | number | 投资年限 |
| `total_return_pct` | number | 总收益率小数（保留6位小数） |
| `annual_return_pct` | number | 复合年化收益率小数（保留6位小数） |
| `error` | string | 仅在 `principal` 或 `years` ≤ 0 时返回 |

---

### Tool-9: 基础统计分析

**功能**：计算一组数字的数量、均值、（总体）方差、标准差、中位数、众数、最小值、最大值和极差。

**适用场景**：批量数据描述性统计；方差按总体公式（除以 `n`）。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `numbers` | number[] | 是 | 待统计数字列表（空列表返回业务错误对象） |

**执行方法**：
```
node scripts/call-api.js general-calculator/statistics/basic '{"numbers":[12,15,15,18,21,30]}'
```

**返回示例**：
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

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `count` | integer | 数字个数 |
| `mean` | number | 均值（保留4位小数） |
| `variance` | number | 总体方差（保留4位小数） |
| `std_dev` | number | 总体标准差（保留4位小数） |
| `median` | number | 中位数（保留4位小数） |
| `mode` | array \| string | 众数列表；全部值同频时返回字符串 `无众数` |
| `min` | number | 最小值 |
| `max` | number | 最大值 |
| `range` | number | 极差（保留4位小数） |
| `error` | string | 仅在 `numbers` 为空时返回 |

---

### Tool-10: 单位换算

**功能**：将数值从原始单位换算至目标单位，支持长度、重量、面积、温度。

**适用场景**：日常单位转换；调用方需保证 `from_unit`/`to_unit` 同类（接口不强制校验）。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `value` | number | 是 | 待换算值 |
| `from_unit` | string | 是 | 原始单位（大小写归一化） |
| `to_unit` | string | 是 | 目标单位 |

**支持单位（部分别名）**：
- 长度：`m/meter/米`、`km/公里`、`cm/厘米`、`mm/毫米`、`inch/英寸`、`ft/英尺`、`yd/码`、`mi/英里`
- 重量：`kg/公斤`、`g/克`、`lb/磅`、`oz/盎司`、`t/吨`
- 面积：`m2/平方米`、`km2/平方公里`、`acre/英亩`、`亩`
- 温度：`c/celsius/摄氏度`、`f/fahrenheit/华氏度`

**执行方法**：
```
node scripts/call-api.js general-calculator/units/convert '{"value":10,"from_unit":"km","to_unit":"m"}'
```

**返回示例**：
```json
{
  "from": "10 km",
  "to": "10000.0 m",
  "result": 10000.0
}
```

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `from` | string | 带单位原始值文本 |
| `to` | string | 带单位结果文本 |
| `result` | number | 换算值（普通单位6位小数，温度2位小数） |
| `error` | string | 单位不支持时返回 |

---

### Tool-11: 年龄计算

**功能**：由出生日期和参考日期计算年龄拆分（年/月/日）、总天数和估算总月份。

**适用场景**：年龄展示、年龄段判断。

**输入参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `birth_date` | string | 是 | — | 出生日期，支持 `YYYY-MM-DD` 或 `YYYY年MM月DD日` |
| `ref_date` | string\|null | 否 | 服务端当前日期 | 参考日期，仅按 `YYYY-MM-DD` 解析 |

**执行方法**：
```
node scripts/call-api.js general-calculator/dates/age '{"birth_date":"1990-05-20","ref_date":"2026-06-01"}'
```

**返回示例**：
```json
{
  "birth_date": "1990-05-20",
  "age_years": 36,
  "age_months": 0,
  "age_days": 12,
  "total_days": 13161,
  "total_months": 438,
  "description": "36岁0个月12天"
}
```

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `birth_date` | string | 输入出生日期文本 |
| `age_years` | integer | 完整年龄年数 |
| `age_months` | integer | 扣除完整年后的月数 |
| `age_days` | integer | 扣除完整年和月后的天数 |
| `total_days` | integer | 出生到参考日期的总天数 |
| `total_months` | integer | 按 `total_days // 30` 估算总月份 |
| `description` | string | 中文年龄描述 |
| `error` | string | 日期格式不支持时返回 |

---

### Tool-12: 日期间隔计算

**功能**：计算两日期绝对间隔，返回天数、周数（按7天）、月数（按30天）和年数（按365.25天）。

**适用场景**：项目周期、纪念日间隔、合同期限计算。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `start_date` | string | 是 | 开始日期，支持 `YYYY-MM-DD` 或 `YYYY年MM月DD日` |
| `end_date` | string | 是 | 结束日期，支持 `YYYY-MM-DD` 或 `YYYY年MM月DD日` |

**执行方法**：
```
node scripts/call-api.js general-calculator/dates/difference '{"start_date":"2025-01-01","end_date":"2026-06-01"}'
```

**返回示例**：
```json
{
  "start": "2025-01-01",
  "end": "2026-06-01",
  "days": 516,
  "months": 17,
  "years": 1.41,
  "weeks": 73.71
}
```

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `start` | string | 输入开始日期文本 |
| `end` | string | 输入结束日期文本 |
| `days` | integer | 绝对间隔天数 |
| `months` | integer | 按30天折算取整的月数 |
| `years` | number | 按365.25天折算的年数（保留2位小数） |
| `weeks` | number | 按7天折算的周数（保留2位小数） |
| `error` | string | 日期格式不支持时返回 |

---

### Tool-13: 一元一次方程求解

**功能**：求解形如 `ax + b = 0` 的一元一次方程。

**适用场景**：基础代数求解；`a = 0` 时返回 `无解` 或 `无穷多解`。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `a` | number | 是 | 一次项系数 |
| `b` | number | 是 | 常数项 |

**执行方法**：
```
node scripts/call-api.js general-calculator/equations/linear '{"a":2,"b":-8}'
```

**返回示例**：
```json
{
  "equation": "2x + -8 = 0",
  "solution": "x = 4.0"
}
```

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `equation` | string | 方程展示文本 |
| `solution` | string | 解展示文本，可能是 `x = ...`、`无解` 或 `无穷多解` |

---

### Tool-14: 一元二次方程求解

**功能**：求解形如 `ax² + bx + c = 0` 的一元二次方程；按判别式返回两个不等实根、重根或两个共轭复根；`a = 0` 时退化为一次方程结果。

**适用场景**：二次代数求解、寻找抛物线零点。

**输入参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `a` | number | 是 | 二次项系数 |
| `b` | number | 是 | 一次项系数 |
| `c` | number | 是 | 常数项 |

**执行方法**：
```
node scripts/call-api.js general-calculator/equations/quadratic '{"a":1,"b":-3,"c":2}'
```

**返回示例**：
```json
{
  "equation": "1x² + -3x + 2 = 0",
  "type": "两个不等实根",
  "x1": 2.0,
  "x2": 1.0
}
```

**返回字段说明**：

| 字段 | 类型 | 含义 |
|------|------|------|
| `equation` | string | 方程展示文本 |
| `type` | string | 根类型，如 `两个不等实根`、`重根`、`无实数解（有两个共轭复根）` |
| `x1` | number\|string | 第一根；复根为字符串 |
| `x2` | number\|string | 第二根；复根为字符串 |
| `x` | number | 重根时返回 |
| `solution` | string | `a = 0` 退化一次方程时返回 |
