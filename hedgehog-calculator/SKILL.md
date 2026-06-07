---
name: hedgehog-calculator
description: >
  常用计算器：包含数学表达式计算、金融计算（终值/现值/折扣/加价/年金/贷款/投资回报）、
  统计分析、单位换算、日期计算（年龄/日期差）、一元一次/二次方程求解。
  触发词：计算；计算终值；计算现值；计算折扣；计算加价；年金计算；贷款月供；
  投资回报；统计分析；单位换算；计算年龄；计算日期差；一元一次方程；二次方程。
  不适用：多元方程。
version: 1.0.3
---

# 计算器 Skill

## 全局规则与调用方式
- **百分比/利率规则**：所有比例、利率、折扣率字段**必须使用小数**（如 `0.05`=5%，`0.2`=20%）。
- **执行命令**：`node scripts/call-api.js <method> '<params-json>'`
- **返回值**：由接口决定（数字、JSON对象或带 `error` 的业务错误对象）。

---

### Tool-0: 数学表达式计算
- **功能**：计算数学复合表达式（四则、指数、取模、数学函数、角度制三角函数）。`*`为乘，`**`或`^`为幂，`ln`为自然对数，`log`为以10为底对数，`sqrt`为平方根。
- **调用**：`<method>` = `calculate`
- **输入参数**：
  | 字段 | 类型 | 必填 | 默认值 | 说明 |
  |---|---|---|---|---|
  | `expression` | string | 是 | — | 数学表达式（Python的numexpr使用的表达式），最长300字符。如"5 * 3 / 2 + sin30" |
- **返回字段**：`result` (number, 结果), `parsed` (string, 解释后的表达式), `elapsed_ms` (number, 耗时)

### Tool-1: 终值计算
- **功能**：由现值、年利率、年限、复利频次计算未来价值。
- **调用**：`<method>` = `financial/future-value`
- **输入参数**：
  | 字段 | 类型 | 必填 | 默认值 | 说明 |
  |---|---|---|---|---|
  | `present_value` | number | 是 | — | 初始本金 |
  | `rate` | number | 是 | — | 年利率小数，`0.05`=5% |
  | `periods` | integer | 是 | — | 计息年数 |
  | `compound_frequency` | integer | 否 | 1 | 每年复利次数（1=年，12=月） |
- **返回**：number (未来价值原始精度)

### Tool-2: 现值计算
- **功能**：由未来金额、年贴现率、年限、复利频次折现当前价值。
- **调用**：`<method>` = `financial/present-value`
- **输入参数**：
  | 字段 | 类型 | 必填 | 默认值 | 说明 |
  |---|---|---|---|---|
  | `future_value` | number | 是 | — | 未来金额 |
  | `rate` | number | 是 | — | 年贴现率小数 |
  | `periods` | integer | 是 | — | 贴现年数 |
  | `compound_frequency` | integer | 否 | 1 | 每年复利次数 |
- **返回**：number (折现当前价值)

### Tool-3: 折扣金额计算
- **功能**：计算折扣金额、成交价和节省比例。
- **调用**：`<method>` = `financial/discount-amount`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `original_price` | number | 是 | 商品原价 |
  | `discount_percent` | number | 是 | 折扣比例小数 |
- **返回字段**：`original_price`, `discount_percent`, `discount_amount` (折扣金额), `final_price` (折后价), `savings_percent` (节省比例)

### Tool-4: 加价售价计算
- **功能**：计算加价金额、销售价格和毛利率。
- **调用**：`<method>` = `financial/markup-price`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `cost` | number | 是 | 成本 |
  | `markup_percent` | number | 是 | 加价比例小数 |
- **返回字段**：`cost`, `markup_percent`, `markup_amount` (加价金额), `selling_price` (销售价格), `margin_percent` (毛利率小数)

### Tool-5: 普通年金终值计算
- **功能**：计算每期期末等额付款累计终值。
- **调用**：`<method>` = `financial/annuity-future-value`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `payment` | number | 是 | 每期付款金额 |
  | `rate` | number | 是 | 每期利率小数 |
  | `periods` | integer | 是 | 总期数 |
- **返回**：number（普通年金终值。若rate=0返回 payment×periods）

### Tool-6: 普通年金现值计算
- **功能**：将未来每期等额付款折现至当前。
- **调用**：`<method>` = `financial/annuity-present-value`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `payment` | number | 是 | 每期付款金额 |
  | `rate` | number | 是 | 每期利率小数 |
  | `periods` | integer | 是 | 总期数 |
- **返回**：number（普通年金现值。若rate=0返回 payment×periods）

### Tool-7: 贷款等额本息月供计算
- **功能**：计算固定月供、还款总额、总利息（年利率为0时本金按月平摊）。
- **调用**：`<method>` = `general-calculator/finance/loan-monthly-payment`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `principal` | number | 是 | 贷款本金 |
  | `annual_rate` | number | 是 | 贷款年利率小数 |
  | `years` | integer | 是 | 贷款年限 |
- **返回字段**：`principal`, `annual_rate`, `years`, `monthly_payment` (每月应还), `total_payment` (还款总额), `total_interest` (总利息)

### Tool-8: 投资收益率计算
- **功能**：计算总收益率与复合年化收益率。
- **调用**：`<method>` = `general-calculator/finance/investment-return`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `principal` | number | 是 | 初始本金 |
  | `final_value` | number | 是 | 投资期末最终金额 |
  | `years` | number | 是 | 投资年限 |
- **返回字段**：`principal`, `final_value`, `years`, `total_return_pct` (总收益率小数), `annual_return_pct` (复合年化收益率小数), `error` (principal或years≤0时返回)

### Tool-9: 基础统计分析
- **功能**：计算数量、均值、总体方差、标准差、中位数、众数、最值、极差。
- **调用**：`<method>` = `general-calculator/statistics/basic`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `numbers` | number[] | 是 | 待统计数字列表 |
- **返回字段**：`count`, `mean`, `variance`, `std_dev`, `median`, `mode` (array|string, 无众数时返字符串), `min`, `max`, `range`, `error` (列表为空时返回)

### Tool-10: 单位换算
- **功能**：长度、重量、面积、温度转换。调用方需保证同类换算。
- **调用**：`<method>` = `general-calculator/units/convert`
- **支持单位**：
  - 长度: `m/meter/米`, `km/公里`, `cm/厘米`, `mm/毫米`, `inch/英寸`, `ft/英尺`, `yd/码`, `mi/英里`
  - 重量: `kg/公斤`, `g/克`, `lb/磅`, `oz/盎司`, `t/吨`
  - 面积: `m2/平方米`, `km2/平方公里`, `acre/英亩`, `亩`
  - 温度: `c/celsius/摄氏度`, `f/fahrenheit/华氏度`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `value` | number | 是 | 待换算值 |
  | `from_unit` | string | 是 | 原始单位 |
  | `to_unit` | string | 是 | 目标单位 |
- **返回字段**：`from` (string带单位), `to` (string带单位), `result` (number换算值), `error` (不支持时返回)

### Tool-11: 年龄计算
- **功能**：计算年龄拆分（年/月/日）、总天数及估算总月份。
- **调用**：`<method>` = `general-calculator/dates/age`
- **输入参数**：
  | 字段 | 类型 | 必填 | 默认值 | 说明 |
  |---|---|---|---|---|
  | `birth_date` | string | 是 | — | 出生日期（YYYY-MM-DD 或 YYYY年MM月DD日） |
  | `ref_date` | string\|null | 否 | 服务端当前日期 | 参考日期（仅支持 YYYY-MM-DD） |
- **返回字段**：`birth_date`, `age_years`, `age_months`, `age_days`, `total_days`, `total_months`, `description` (中文描述), `error` (格式错误时返回)

### Tool-12: 日期间隔计算
- **功能**：计算绝对间隔（天/周/月/年）。
- **调用**：`<method>` = `general-calculator/dates/difference`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `start_date` | string | 是 | 开始日期（YYYY-MM-DD 或 YYYY年MM月DD日） |
  | `end_date` | string | 是 | 结束日期（YYYY-MM-DD 或 YYYY年MM月DD日） |
- **返回字段**：`start`, `end`, `days`, `months`, `years`, `weeks`, `error`

### Tool-13: 一元一次方程求解
- **功能**：求解 `ax + b = 0` (a=0时返无解或无穷多解)。
- **调用**：`<method>` = `general-calculator/equations/linear`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `a` | number | 是 | 一次项系数 |
  | `b` | number | 是 | 常数项 |
- **返回字段**：`equation` (展示文本), `solution` (解展示文本)

### Tool-14: 一元二次方程求解
- **功能**：求解 `ax² + bx + c = 0` (支持复根，a=0退化一次方程)。
- **调用**：`<method>` = `general-calculator/equations/quadratic`
- **输入参数**：
  | 字段 | 类型 | 必填 | 说明 |
  |---|---|---|---|
  | `a` | number | 是 | 二次项系数 |
  | `b` | number | 是 | 一次项系数 |
  | `c` | number | 是 | 常数项 |
- **返回字段**：`equation`, `type` (根类型), `x1` (number|string), `x2` (number|string), `x` (number, 重根时返回), `solution` (a=0退化时返回)