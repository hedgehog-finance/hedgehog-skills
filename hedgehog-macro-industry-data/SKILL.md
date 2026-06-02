---
name: hedgehog-macro-industry-data
description: >
  从刺猬投研AI数据源查询宏观经济数据。
  【适用】中国宏观数据（Shibor利率、LPR利率、CPI、PPI、PMI、M0/M1/M2货币供应量、社融）；
  美国宏观数据（国债名义收益率、国债实际收益率）。
  【不适用】个股行情、个股基本面、个股财务数据 → 改用 hedgehog-company-index-data；新闻资讯、公告 → 不在本 skill 覆盖范围。
  触发词：宏观数据、利率、CPI、PPI、PMI、M1、M2、社融、货币供应量、美国国债收益率；
  macro data, interest rate, money supply, US treasury yield, Shibor, LPR, social financing.
version: 1.0

---

# hedgehog-macro-industry-data

本 skill 通过 Node.js 脚本调用刺猬投研 AI 数据接口（`https://api.ciweiai.com/api/data`），查询宏观经济数据。

---

## Tools 基础功能

`Tools 基础功能` 一般由本 Skill 的 `核心功能工作流(Workflow)` 调用。在核心功能场景不适合时，或者 Agent 自由编排工作流时，或者提示词指定调用特定 Tool 时，才直接匹配本节 Tool。

所有 Tools 可执行的脚本逻辑位于 `scripts/` 目录：

```
scripts/
└── call_api.js     // 调用刺猬投研 AI 数据接口
```

**脚本调用方式**：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

### 通用响应结构

所有接口返回均遵循以下结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "page_size": 40,
    "db_source": "...",
    "items": [ /* 单条记录，结构见各 Tool */ ]
  }
}
```

- `code`：业务状态码，`200` 表示成功；
- `message`：业务消息；
- `data`：分页结构 `{ total, page, page_size, db_source, items[] }`；
- `items[]` 内单条记录的字段定义见对应 Tool 的"返回值 data.items[] 结构"小节。

### 通用参数：`fields`

**所有 Tool 均支持 `fields` 参数**（类型：`string[]`，可选）。
若提供，脚本将在响应返回后对 `data.items[]` 中每条记录只保留 `fields` 中列出的字段，
其余字段被丢弃，外层分页字段（`total/page/page_size/db_source`）保留；若未提供，则返回全量字段。

示例：

```json
{ "fields": ["month", "nt_yoy", "nt_mom"] }
```

> 目的：让结果更加简洁，节省 token。

### 通用约束：固定/隐藏的请求参数

所有 Tool 均**不接受** `page`、`page_size` 参数；脚本会强制写死：

| 周期类型     | 接口                                                                                  | 强制 `page_size` |
| ------------ | ------------------------------------------------------------------------------------- | ---------------- |
| 月度宏观指标 | `queryCpi` / `queryPpi` / `queryPmi` / `queryMoneySupply` / `querySocialFinancing`    | 40               |
| 日度利率/收益率 | `queryShibor` / `queryLpr` / `queryUsTreasury` / `queryUsTrycr`                    | 90               |

`page` 一律为 `1`。如需更多数据，请通过缩小起止日期/月份的方式获取。

---

### Tool-1: 查询中国 Shibor 利率 (queryShibor)

**功能**：查询中国银行间同业拆借利率（Shibor）历史数据。

**适用场景**：用户查询 Shibor、银行间利率、同业拆借利率。

**不适合场景**：查询 LPR 贷款利率 → 使用 Tool-2。

**执行方法**：

```bash
node scripts/call_api.js --api queryShibor --params '<JSON>'
```

**输入参数**：

| 字段       | 类型     | 必填 | 默认值 | 说明                                                       |
| ---------- | -------- | ---- | ------ | ---------------------------------------------------------- |
| start_date | string   | 否   | -      | 起始报价日期，格式 `YYYY-MM-DD`                            |
| end_date   | string   | 否   | -      | 结束报价日期，格式 `YYYY-MM-DD`                            |
| fields     | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段             |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=90`。
> **区间约束**：当同时传 `start_date` 与 `end_date` 时，二者间隔必须 ≤ 90 天，否则脚本拒绝执行。

**返回值 data.items[] 结构**：

| 字段     | 类型   | 说明                          |
| -------- | ------ | ----------------------------- |
| id       | int    | 记录 ID                       |
| date     | string | 报价日期，`YYYY-MM-DD`        |
| rate_on  | number | 隔夜（O/N）拆借利率（%）      |
| rate_1w  | number | 1 周拆借利率（%）             |
| rate_2w  | number | 2 周拆借利率（%）             |
| rate_1m  | number | 1 月拆借利率（%）             |
| rate_3m  | number | 3 月拆借利率（%）             |
| rate_6m  | number | 6 月拆借利率（%）             |
| rate_9m  | number | 9 月拆借利率（%）             |
| rate_1y  | number | 1 年拆借利率（%）             |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

### Tool-2: 查询中国 LPR 利率 (queryLpr)

**功能**：查询中国贷款市场报价利率（LPR）历史数据。

**适用场景**：用户查询 LPR、贷款市场报价利率、房贷利率基准。

**不适合场景**：查询银行间拆借利率 → 使用 Tool-1。

**执行方法**：

```bash
node scripts/call_api.js --api queryLpr --params '<JSON>'
```

**输入参数**：

| 字段       | 类型     | 必填 | 默认值 | 说明                                           |
| ---------- | -------- | ---- | ------ | ---------------------------------------------- |
| start_date | string   | 否   | -      | 起始报价日期，格式 `YYYY-MM-DD`                |
| end_date   | string   | 否   | -      | 结束报价日期，格式 `YYYY-MM-DD`                |
| fields     | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=90`。
> **区间约束**：当同时传 `start_date` 与 `end_date` 时，二者间隔必须 ≤ 90 天。

**返回值 data.items[] 结构**：

| 字段    | 类型   | 说明                  |
| ------- | ------ | --------------------- |
| id      | int    | 记录 ID               |
| date    | string | 报价日期 `YYYY-MM-DD` |
| rate_1y | number | 1 年期 LPR（%）       |
| rate_5y | number | 5 年期 LPR（%）       |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

### Tool-3: 查询中国 CPI 数据 (queryCpi)

**功能**：查询中国消费者价格指数（CPI）历史数据。

**适用场景**：用户查询 CPI、消费者物价指数、通货膨胀数据。

**不适合场景**：查询生产者价格 → 使用 Tool-4。

**执行方法**：

```bash
node scripts/call_api.js --api queryCpi --params '<JSON>'
```

**输入参数**：

| 字段        | 类型     | 必填 | 默认值 | 说明                                           |
| ----------- | -------- | ---- | ------ | ---------------------------------------------- |
| start_month | string   | 否   | -      | 起始月份，格式 `YYYYMM`                        |
| end_month   | string   | 否   | -      | 结束月份，格式 `YYYYMM`                        |
| fields      | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=40`。
> **区间约束**：当同时传 `start_month` 与 `end_month` 时，二者间隔必须 ≤ 36 个月（3 年）。

**返回值 data.items[] 结构**：

| 字段      | 类型   | 说明                       |
| --------- | ------ | -------------------------- |
| id        | int    | 记录 ID                    |
| month     | string | 月份 `YYYYMM`              |
| nt_val    | number | 全国 CPI 当月值            |
| nt_yoy    | number | 全国 CPI 当月同比（%）     |
| nt_mom    | number | 全国 CPI 当月环比（%）     |
| nt_accu   | number | 全国 CPI 累计值            |
| town_val  | number | 城镇 CPI 当月值            |
| town_yoy  | number | 城镇 CPI 当月同比（%）     |
| cnt_val   | number | 农村 CPI 当月值            |
| cnt_yoy   | number | 农村 CPI 当月同比（%）     |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

### Tool-4: 查询中国 PPI 数据 (queryPpi)

**功能**：查询中国生产者价格指数（PPI）历史数据。

**适用场景**：用户查询 PPI、生产者价格指数、出厂价格数据。

**不适合场景**：查询消费者价格 → 使用 Tool-3。

**执行方法**：

```bash
node scripts/call_api.js --api queryPpi --params '<JSON>'
```

**输入参数**：

| 字段        | 类型     | 必填 | 默认值 | 说明                                           |
| ----------- | -------- | ---- | ------ | ---------------------------------------------- |
| start_month | string   | 否   | -      | 起始月份，格式 `YYYYMM`                        |
| end_month   | string   | 否   | -      | 结束月份，格式 `YYYYMM`                        |
| fields      | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=40`。
> **区间约束**：`start_month` 与 `end_month` 同时存在时间隔 ≤ 36 个月（3 年）。

**返回值 data.items[] 结构**：

| 字段       | 类型   | 说明                                  |
| ---------- | ------ | ------------------------------------- |
| id         | int    | 记录 ID                               |
| month      | string | 月份 `YYYYMM`                         |
| ppi_yoy    | number | PPI 当月同比（%）                     |
| ppi_mp_yoy | number | 生产资料 PPI 当月同比（%）            |
| ppi_cg_yoy | number | 生活资料 PPI 当月同比（%）            |
| ppi_mom    | number | PPI 当月环比（%）                     |
| ppi_accu   | number | PPI 累计同比（%）                     |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

### Tool-5: 查询中国 M0/M1/M2 货币供应量 (queryMoneySupply)

**功能**：查询中国货币供应量（M0、M1、M2）历史数据。

**适用场景**：用户查询 M0、M1、M2、货币供应量、货币总量。

**不适合场景**：查询社会融资规模 → 使用 Tool-6。

**执行方法**：

```bash
node scripts/call_api.js --api queryMoneySupply --params '<JSON>'
```

**输入参数**：

| 字段        | 类型     | 必填 | 默认值 | 说明                                           |
| ----------- | -------- | ---- | ------ | ---------------------------------------------- |
| start_month | string   | 否   | -      | 起始月份，格式 `YYYYMM`                        |
| end_month   | string   | 否   | -      | 结束月份，格式 `YYYYMM`                        |
| fields      | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=40`。
> **区间约束**：`start_month` 与 `end_month` 同时存在时间隔 ≤ 36 个月（3 年）。

**返回值 data.items[] 结构**：

| 字段   | 类型   | 说明                  |
| ------ | ------ | --------------------- |
| id     | int    | 记录 ID               |
| month  | string | 月份 `YYYYMM`         |
| m0     | number | M0 期末余额（亿元）   |
| m0_yoy | number | M0 同比（%）          |
| m1     | number | M1 期末余额（亿元）   |
| m1_yoy | number | M1 同比（%）          |
| m2     | number | M2 期末余额（亿元）   |
| m2_yoy | number | M2 同比（%）          |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

### Tool-6: 查询中国社融数据 (querySocialFinancing)

**功能**：查询中国社会融资规模历史数据。

**适用场景**：用户查询社融、社会融资规模、信贷数据。

**不适合场景**：查询货币供应量 M1/M2 → 使用 Tool-5。

**执行方法**：

```bash
node scripts/call_api.js --api querySocialFinancing --params '<JSON>'
```

**输入参数**：

| 字段        | 类型     | 必填 | 默认值 | 说明                                           |
| ----------- | -------- | ---- | ------ | ---------------------------------------------- |
| start_month | string   | 否   | -      | 起始月份，格式 `YYYYMM`                        |
| end_month   | string   | 否   | -      | 结束月份，格式 `YYYYMM`                        |
| fields      | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=40`。
> **区间约束**：`start_month` 与 `end_month` 同时存在时间隔 ≤ 36 个月（3 年）。

**返回值 data.items[] 结构**：

| 字段       | 类型   | 说明                              |
| ---------- | ------ | --------------------------------- |
| id         | int    | 记录 ID                           |
| month      | string | 月份 `YYYYMM`                     |
| inc_month  | number | 当月新增社融规模（亿元）          |
| inc_cumval | number | 累计新增社融规模（亿元）          |
| stk_endval | number | 社融存量（万亿元）                |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

### Tool-7: 查询中国 PMI 数据 (queryPmi)

**功能**：查询中国采购经理人指数（PMI）历史数据。

**适用场景**：用户查询 PMI、制造业景气指数、采购经理指数。

**不适合场景**：查询其他宏观价格指标（CPI/PPI）→ 使用 Tool-3 或 Tool-4。

**执行方法**：

```bash
node scripts/call_api.js --api queryPmi --params '<JSON>'
```

**输入参数**：

| 字段        | 类型     | 必填 | 默认值 | 说明                                           |
| ----------- | -------- | ---- | ------ | ---------------------------------------------- |
| start_month | string   | 否   | -      | 起始月份，格式 `YYYYMM`                        |
| end_month   | string   | 否   | -      | 结束月份，格式 `YYYYMM`                        |
| fields      | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=40`。
> **区间约束**：`start_month` 与 `end_month` 同时存在时间隔 ≤ 36 个月（3 年）。

**返回值 data.items[] 结构**：

| 字段        | 类型   | 说明                              |
| ----------- | ------ | --------------------------------- |
| id          | int    | 记录 ID                           |
| month       | string | 月份 `YYYYMM`                     |
| pmi         | number | 制造业 PMI 综合指数               |
| pmi010500   | number | 生产分项                          |
| pmi010800   | number | 新订单分项                        |
| pmi010900   | number | 新出口订单分项                    |
| pmi011000   | number | 在手订单分项                      |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

### Tool-8: 查询美国国债名义收益率 (queryUsTreasury)

**功能**：查询美国国债名义收益率历史数据。

**适用场景**：用户查询美债收益率、美国国债利率、名义收益率。

**不适合场景**：查询扣除通胀后的实际收益率 → 使用 Tool-9。

**执行方法**：

```bash
node scripts/call_api.js --api queryUsTreasury --params '<JSON>'
```

**输入参数**：

| 字段       | 类型     | 必填 | 默认值 | 说明                                           |
| ---------- | -------- | ---- | ------ | ---------------------------------------------- |
| start_date | string   | 否   | -      | 起始日期，格式 `YYYY-MM-DD`                    |
| end_date   | string   | 否   | -      | 结束日期，格式 `YYYY-MM-DD`                    |
| fields     | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=90`。
> **区间约束**：`start_date` 与 `end_date` 同时存在时间隔 ≤ 90 天。

**返回值 data.items[] 结构**：

| 字段 | 类型   | 说明                       |
| ---- | ------ | -------------------------- |
| id   | int    | 记录 ID                    |
| date | string | 日期 `YYYY-MM-DD`          |
| m1   | number | 1 个月期国债名义收益率（%）|
| m2   | number | 2 个月期国债名义收益率（%）|
| m3   | number | 3 个月期国债名义收益率（%）|
| m6   | number | 6 个月期国债名义收益率（%）|
| y1   | number | 1 年期国债名义收益率（%）  |
| y2   | number | 2 年期国债名义收益率（%）  |
| y10  | number | 10 年期国债名义收益率（%） |
| y30  | number | 30 年期国债名义收益率（%） |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

### Tool-9: 查询美国国债实际收益率 (queryUsTrycr)

**功能**：查询美国国债实际收益率（TIPS）历史数据。

**适用场景**：用户查询实际收益率、TIPS、通胀保值债券收益率。

**不适合场景**：查询名义收益率 → 使用 Tool-8。

**执行方法**：

```bash
node scripts/call_api.js --api queryUsTrycr --params '<JSON>'
```

**输入参数**：

| 字段       | 类型     | 必填 | 默认值 | 说明                                           |
| ---------- | -------- | ---- | ------ | ---------------------------------------------- |
| start_date | string   | 否   | -      | 起始日期，格式 `YYYY-MM-DD`                    |
| end_date   | string   | 否   | -      | 结束日期，格式 `YYYY-MM-DD`                    |
| fields     | string[] | 否   | -      | 仅保留 `data.items[]` 中指定字段，过滤其余字段 |

> 内部写死参数（不对外暴露）：`page=1`、`page_size=90`。
> **区间约束**：`start_date` 与 `end_date` 同时存在时间隔 ≤ 90 天。

**返回值 data.items[] 结构**：

| 字段 | 类型   | 说明                          |
| ---- | ------ | ----------------------------- |
| id   | int    | 记录 ID                       |
| date | string | 日期 `YYYY-MM-DD`             |
| y5   | number | 5 年期实际收益率（TIPS, %）   |
| y7   | number | 7 年期实际收益率（TIPS, %）   |
| y10  | number | 10 年期实际收益率（TIPS, %）  |
| y20  | number | 20 年期实际收益率（TIPS, %）  |
| y30  | number | 30 年期实际收益率（TIPS, %）  |

**约束与限制**：检索不到结果时返回 `null`，不得编造数据。

---

## 错误处理

| 错误类型               | 处理方式                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| 参数校验失败（脚本侧） | 检查日期/月份格式是否合法；检查起止区间是否超过限制（90 天 / 36 个月） |
| HTTP 4xx               | 检查参数格式、路径参数                                                  |
| HTTP 5xx               | 提示用户服务端错误，建议稍后重试                                        |
| 连接失败               | 提示用户检查 `https://api.ciweiai.com/api/data` 是否可达                |

---

## 补充说明

### 与其他 Skill 的边界

| 查询对象                              | 使用的 Skill                |
| ------------------------------------- | --------------------------- |
| 宏观指标（利率 / CPI / PMI / 社融等） | **本 skill**                |
| 某只股票的行情、基本面、财务数据      | hedgehog-company-index-data |
| 新闻资讯、研报、公告                  | hedgehog-news-reports       |

### 用户触发示例

#### 查询宏观数据（触发对应 Tool）

- "查一下最近的 CPI 数据" → Tool-3
- "LPR 最新是多少" → Tool-2
- "美国10年期国债收益率走势" → Tool-8
- "最新 M2 同比增速" → Tool-5
- "近三个月社融数据" → Tool-6
- "制造业 PMI 最新数据" → Tool-7

### 注意事项

- **时间格式**：日期接口使用 `YYYY-MM-DD`；月份接口使用 `YYYYMM`。
- **区间限制**：日度接口最长 90 天，月度接口最长 36 个月（3 年）。
- **`fields` 参数**：所有 Tool 通用，用于裁剪 `data.items[]` 中每条记录的字段。
- **返回数据**：所有 Tool 检索不到结果时必须返回 `null`，不得编造数据。
