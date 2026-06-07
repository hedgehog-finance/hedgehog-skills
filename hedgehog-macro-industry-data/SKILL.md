---
name: hedgehog-macro-industry-data
description: >
  查询中美宏观经济数据。
  【适用】中国数据：Shibor、LPR、CPI、PPI、PMI、M0/M1/M2、社融；美国数据：国债名义/实际收益率。
  【不适用】个股行情/基本面/财务（用 hedgehog-company-index-data）；新闻公告（不在本 skill 覆盖）。
  触发词：宏观数据、利率、CPI、PPI、PMI、M1、M2、社融、货币供应量、美国国债收益率。
version: 1.0.2
---

# 宏观经济数据查询

## 1. 核心调度与全局约定

**统一执行脚本**：
```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

**通用响应结构**：
```json
{
  "code": 200, // 200为成功，非200为失败
  "message": "success",
  "data": { "total": 12, "page": 1, "page_size": 40, "db_source": "...", "items": [] } // 无数据时返回null，严禁凭空编造
}
```

**通用参数 `fields`**：
所有 Tool 均支持传入 `fields` (类型 `string[]`)。用于裁剪 `data.items[]` 的返回字段以节约 Token。未传则返回全量字段。

**底层隐藏约束（禁止传入）**：
所有 Tool 内部禁止分页，严禁在 params 中传入 `page` 或 `page_size`。若需更多数据请缩小查询区间。
| 周期类型 | 涉及接口 | 写死 `page_size` | 最大允许区间 |
| --- | --- | --- | --- |
| 月度指标 | CPI, PPI, PMI, 货币供应量, 社融 | 40 | ≤ 36 个月 |
| 日度指标 | Shibor, LPR, 美债名义/实际收益率 | 90 | ≤ 90 天 |

---

## 2. Tools 字典

### Tool-1: 中国 Shibor 利率 (`queryShibor`)
**适用**：Shibor、银行间同业拆借利率。**排雷**：LPR贷款利率 → Tool-2。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_date | string | 否 | - | 起始报价日期，`YYYY-MM-DD` |
| end_date | string | 否 | - | 结束报价日期，`YYYY-MM-DD` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| date | string | 报价日期，`YYYY-MM-DD` |
| rate_on | number | 隔夜（O/N）拆借利率（%） |
| rate_1w | number | 1 周拆借利率（%） |
| rate_2w | number | 2 周拆借利率（%） |
| rate_1m | number | 1 月拆借利率（%） |
| rate_3m | number | 3 月拆借利率（%） |
| rate_6m | number | 6 月拆借利率（%） |
| rate_9m | number | 9 月拆借利率（%） |
| rate_1y | number | 1 年拆借利率（%） |

---

### Tool-2: 中国 LPR 利率 (`queryLpr`)
**适用**：LPR、贷款市场报价、房贷基准利率。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_date | string | 否 | - | 起始报价日期，`YYYY-MM-DD` |
| end_date | string | 否 | - | 结束报价日期，`YYYY-MM-DD` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| date | string | 报价日期 `YYYY-MM-DD` |
| rate_1y | number | 1 年期 LPR（%） |
| rate_5y | number | 5 年期 LPR（%） |

---

### Tool-3: 中国 CPI 数据 (`queryCpi`)
**适用**：CPI、消费者物价指数、通胀数据。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_month | string | 否 | - | 起始月份，`YYYYMM` |
| end_month | string | 否 | - | 结束月份，`YYYYMM` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| month | string | 月份 `YYYYMM` |
| nt_val | number | 全国 CPI 当月值 |
| nt_yoy | number | 全国 CPI 当月同比（%） |
| nt_mom | number | 全国 CPI 当月环比（%） |
| nt_accu | number | 全国 CPI 累计值 |
| town_val | number | 城镇 CPI 当月值 |
| town_yoy | number | 城镇 CPI 当月同比（%） |
| cnt_val | number | 农村 CPI 当月值 |
| cnt_yoy | number | 农村 CPI 当月同比（%） |

---

### Tool-4: 中国 PPI 数据 (`queryPpi`)
**适用**：PPI、生产者价格指数、出厂价格。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_month | string | 否 | - | 起始月份，`YYYYMM` |
| end_month | string | 否 | - | 结束月份，`YYYYMM` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| month | string | 月份 `YYYYMM` |
| ppi_yoy | number | PPI 当月同比（%） |
| ppi_mp_yoy | number | 生产资料 PPI 当月同比（%） |
| ppi_cg_yoy | number | 生活资料 PPI 当月同比（%） |
| ppi_mom | number | PPI 当月环比（%） |
| ppi_accu | number | PPI 累计同比（%） |

---

### Tool-5: 中国 M0/M1/M2 货币供应量 (`queryMoneySupply`)
**适用**：M0、M1、M2、货币供应总量。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_month | string | 否 | - | 起始月份，`YYYYMM` |
| end_month | string | 否 | - | 结束月份，`YYYYMM` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| month | string | 月份 `YYYYMM` |
| m0 | number | M0 期末余额（亿元） |
| m0_yoy | number | M0 同比（%） |
| m1 | number | M1 期末余额（亿元） |
| m1_yoy | number | M1 同比（%） |
| m2 | number | M2 期末余额（亿元） |
| m2_yoy | number | M2 同比（%） |

---

### Tool-6: 中国社融数据 (`querySocialFinancing`)
**适用**：社融、社会融资规模、信贷数据。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_month | string | 否 | - | 起始月份，`YYYYMM` |
| end_month | string | 否 | - | 结束月份，`YYYYMM` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| month | string | 月份 `YYYYMM` |
| inc_month | number | 当月新增社融规模（亿元） |
| inc_cumval | number | 累计新增社融规模（亿元） |
| stk_endval | number | 社融存量（万亿元） |

---

### Tool-7: 中国 PMI 数据 (`queryPmi`)
**适用**：制造业 PMI 综合指数及分项。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_month | string | 否 | - | 起始月份，`YYYYMM` |
| end_month | string | 否 | - | 结束月份，`YYYYMM` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| month | string | 月份 `YYYYMM` |
| pmi | number | 制造业 PMI 综合指数 |
| pmi010500 | number | 生产分项 |
| pmi010800 | number | 新订单分项 |
| pmi010900 | number | 新出口订单分项 |
| pmi011000 | number | 在手订单分项 |

---

### Tool-8: 美国国债名义收益率 (`queryUsTreasury`)
**适用**：美债名义收益率走势。**排雷**：TIPS实际收益率 → Tool-9。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_date | string | 否 | - | 起始日期，`YYYY-MM-DD` |
| end_date | string | 否 | - | 结束日期，`YYYY-MM-DD` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| date | string | 日期 `YYYY-MM-DD` |
| m1 | number | 1 个月期国债名义收益率（%） |
| m2 | number | 2 个月期国债名义收益率（%） |
| m3 | number | 3 个月期国债名义收益率（%） |
| m6 | number | 6 个月期国债名义收益率（%） |
| y1 | number | 1 年期国债名义收益率（%） |
| y2 | number | 2 年期国债名义收益率（%） |
| y10 | number | 10 年期国债名义收益率（%） |
| y30 | number | 30 年期国债名义收益率（%） |

---

### Tool-9: 美国国债实际收益率 (`queryUsTrycr`)
**适用**：TIPS、通胀保值债券实际收益率。

**输入参数**：
| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| start_date | string | 否 | - | 起始日期，`YYYY-MM-DD` |
| end_date | string | 否 | - | 结束日期，`YYYY-MM-DD` |
| fields | string[] | 否 | - | 仅保留 `data.items[]` 指定字段，过滤其余字段 |

**返回值 data.items[] 结构**：
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | int | 记录 ID |
| date | string | 日期 `YYYY-MM-DD` |
| y5 | number | 5 年期实际收益率（TIPS, %） |
| y7 | number | 7 年期实际收益率（TIPS, %） |
| y10 | number | 10 年期实际收益率（TIPS, %） |
| y20 | number | 20 年期实际收益率（TIPS, %） |
| y30 | number | 30 年期实际收益率（TIPS, %） |

---

## 3. 错误处理与熔断机制

| 错误类型 | 处理方式 |
| --- | --- |
| 参数校验失败 (脚本侧) | 检查日期/月份格式，核实验证区间是否越界（超90天/36个月即阻断）。 |
| HTTP 4xx | 复查路径与必填参数格式。 |
| HTTP 5xx / 连接失败 | 提示服务端不可用或连通性异常，阻断当前重试。 |

---

## 4. 与其他 Skill 的边界与路由

| 业务实体 | 指派路由 (使用的 Skill) |
| --- | --- |
| 宏观指标（利率 / 物价 / 社融等） | **本 skill** (`hedgehog-macro-industry-data`) |
| 单只股票行情 / 基本面 / 财报 | `hedgehog-company-index-data` |
| 市场新闻资讯 / 公司公告 / 研报 | `hedgehog-news-reports` |