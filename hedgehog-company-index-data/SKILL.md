---
name: hedgehog-company-index-data
description: >
  查询上市公司/股票基础信息、行情、财务数据等。
  【适用】A股股票基础信息、日线行情、每日基本面指标（PE、PB、换手率、总市值等）、个股成交资金流向、利润表、资产负债表、现金流量表、财务指标、审计意见、主营业务构成；申万行业成分股、申万行业日线行情。
  【不适用】宏观经济数据 → 用 hedgehog-macro-industry-data；新闻资讯、公告 → 不属本 skill。
version: 1.1.0
---

# 上市公司数据查询

## 1. 核心功能工作流 (Workflow)
1. **识别对象**：股票基础信息、行情、基本面、资金流向、财务报表、审计、主营构成、申万行业。
2. **代码核实**：若用户仅提供股票简称/公司名/模糊名称，必须先用 Tool-1 查准 `stock_code`，**严禁盲猜股票代码**。
3. **查阅匹配**：根据 `Tools基础功能` 选择对应 Tool。
4. **统一调度**：使用 `node scripts/call_api.js --api <接口名> --params '<JSON字符串>'` 执行调用。
5. **结果解析**：保留数据来源、日期口径和关键字段；无结果返回 `null`，严禁凭空编造。

## 2. 通用约定
- **返回结构**：`{"code": 200, "message": "success", "data": { ... }}`。code 非 200 视为失败；无数据时 data 为 `null` 或空数组。
- **约束返回字段**：支持 `fields` 的 Tool 可传入逗号分隔字段名，限制返回字段以节省 Token。
- **日期规范**：强制 `YYYY-MM-DD` 格式。
- **股票代码**：优先使用带交易所后缀格式（如 `000001.SZ`）。

---

## 3. Tools 基础功能字典

### Tool-1: 查询股票基础信息 `getStockBasic`
**适用场景**：按股票代码或简称/公司名查基础资料；后续查询需 `stock_code` 时先调用此 Tool。
**不适合场景**：查询个股日线行情 → Tool-2；查询 PE/PB/换手率/市值 → Tool-3。

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 与 stock_name 至少填一项 | 股票代码，如 `000001.SZ` |
| stock_name | string | 与 stock_code 至少填一项 | 股票简称/公司名（模糊匹配） |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 和 `stock_name` 至少填一项，否则报错。

**返回 data 字段**：
| 字段 | 说明 |
|------|------|
| stock_code | 股票代码 |
| stock_name | 股票简称 |
| symbol | 股票代码（不带后缀） |
| area | 地域 |
| industry | 所属行业 |
| fullname | 股票全称 |
| enname | 英文全称 |
| cnspell | 拼音缩写 |
| market | 市场类型（主板/创业板/科创板/CDR） |
| exchange | 交易所代码 |
| curr_type | 交易货币 |
| list_date | 上市日期 |
| is_hs | 是否沪深港通标的（N否 H沪股通 S深股通） |
| act_name | 实控人名称 |
| act_ent_type | 实控人企业性质 |

---

### Tool-2: 查询股票日线行情 `queryStockDaily`
**适用场景**：查询单只股票历史收盘价、涨跌幅、成交量、成交额等日线行情。（数据频率：每交易日）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤2年；最多300条，按 `trade_date` 倒序。
**返回 data**：见 `references/queryStockDaily.md`

---

### Tool-3: 查询指定股票每日基本面指标 `queryDailyBasic`
**适用场景**：查询单只股票 PE、PB、换手率、量比、总市值、流通市值等日频指标。（数据频率：每交易日）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤1年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤31天；按 `trade_date` 倒序。
**返回 data**：见 `references/queryDailyBasic.md`

---

### Tool-4: 查询个股成交资金流向 `queryMoneyflow`
**适用场景**：查询主力、散户、大单、小单净流入量/净流入额等资金流向。（数据频率：每交易日）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤31天；按 `trade_date` 倒序。
**返回 data**：见 `references/queryMoneyflow.md`

---

### Tool-5: 查询利润表（简表） `queryIncome`
**适用场景**：查询营业收入、营业利润、净利润、归母净利润、每股收益等利润表科目（汇总视图）。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤1.5年；按 `end_date` 倒序。默认返回6条记录。
**返回 data**：见 `references/queryIncome.md`

---

### Tool-5b: 查询利润表完整明细（按公司类型明细） `queryIncomeDetail`
**适用场景**：按银行/保险/证券/一般工商业类型查利润表完整明细，每次返回1条记录。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 与 comp_type 至少填一项 | 逗号分隔返回字段名 |
| report_type | integer | 否 | 报表类型：1合并报表（默认）、4调整合并报表 |
| comp_type | integer | 与 fields 至少填一项 | 公司类型：1一般工商业、2银行、3保险、4证券 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤1年；按 `end_date` 倒序。用户传入 `fields` 则直接使用，否则按 `comp_type` 自动设置。默认返回1条记录。
**返回 data 字段说明**：见 `references/financial-report-income.md`

---

### Tool-6: 查询资产负债表（简表） `queryBalanceSheet`
**适用场景**：查询总资产、总负债、股东权益等资产负债表简表（汇总视图）。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤1.5年；按 `end_date` 倒序。默认返回6条记录。
**返回 data**：见 `references/queryBalanceSheet.md`

---

### Tool-6b: 查询资产负债表完整明细（按公司类型明细） `queryBalanceSheetDetail`
**适用场景**：查询资产负债明细表。每次返回1条记录。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 与 comp_type 至少填一项 | 逗号分隔返回字段名 |
| report_type | integer | 否 | 报表类型：1合并报表（默认）、4调整合并报表 |
| comp_type | integer | 与 fields 至少填一项 | 公司类型：1一般工商业、2银行、3保险、4证券 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤31天；按 `end_date` 倒序。默认返回1条记录。
**返回 data 字段说明**：见 `references/financial-report-balancesheet.md`

---

### Tool-7: 查询现金流量表（简表） `queryCashFlow`
**适用场景**：查询经营、投资、筹资现金流及现金净额等财务现金流量简表。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤1.5年；按 `end_date` 倒序。默认返回6条记录。
**返回 data**：见 `references/queryCashFlow.md`

---

### Tool-7b: 查询现金流量表完整明细（按公司类型明细） `queryCashFlowDetail`
**适用场景**：查询现金流量明细表。每次返回1条记录。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 与 comp_type 至少填一项 | 逗号分隔返回字段名 |
| report_type | integer | 否 | 报表类型：1合并报表（默认）、4调整合并报表 |
| comp_type | integer | 与 fields 至少填一项 | 公司类型：1一般工商业、2银行、3保险、4证券 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤31天；按 `end_date` 倒序。默认返回1条记录。
**返回 data 字段说明**：见 `references/financial-report-cashflow.md`

---

### Tool-8: 查询财务指标 `queryFinanceIndicator`
**适用场景**：查询 ROE、ROA、毛利率、净利率等盈利/成长/偿债/运营能力指标。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤1年；按 `end_date` 倒序。默认返回4条记录。
**返回 data**：见 `references/queryFinanceIndicator.md`

---

### Tool-9: 查询财务审计意见 `queryFinanceAudit`
**适用场景**：查询审计机构、审计意见类型、审计结论、审计费用或签字会计师。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤1年；按 `end_date` 倒序。默认返回4条记录。

**返回 data 字段**：
| 字段 | 说明 |
|------|------|
| stock_code | 股票代码 |
| ann_date | 公告日期 |
| end_date | 报告期 |
| audit_result | 审计意见类型 |
| audit_fees | 审计费用（元） |
| audit_agency | 审计机构 |
| audit_sign | 签字会计师 |

---

### Tool-10: 查询主营业务构成 `queryFinanceMainbz`
**适用场景**：按产品、地区或行业维度分析主营业务收入、成本、利润构成。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤1年；按 `end_date` 倒序。默认返回4条记录。

**返回 data 字段**：
| 字段 | 说明 |
|------|------|
| stock_code | 股票代码 |
| end_date | 报告期 |
| bz_item | 主营业务名称 |
| bz_sales | 主营业务收入（元） |
| bz_profit | 主营业务利润（元） |
| bz_cost | 主营业务成本（元） |
| curr_type | 货币类型 |
| bz_type | 构成类型（产品/地区/行业） |

---

### Tool-11: 查询申万行业成分构成 `querySwIndustryMember`
**适用场景**：查询单只股票所属申万行业，或某申万行业下当前有效成分股列表。

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；固定查当前有效成分（`is_new=Y`），按 `in_date` 倒序。默认返回4条记录。

**返回 data 字段**：
| 字段 | 说明 |
|------|------|
| stock_code | 股票代码 |
| stock_name | 股票简称 |
| l1_code | 申万一级行业代码 |
| l1_name | 申万一级行业名称 |
| l2_code | 申万二级行业代码 |
| l2_name | 申万二级行业名称 |
| l3_code | 申万三级行业代码 |
| l3_name | 申万三级行业名称 |
| in_date | 纳入日期 |

---

### Tool-12: 查询申万行业日线行情 `querySwIndustryDaily`
**适用场景**：查询申万行业指数开高低收、涨跌幅、成交量、成交额、PE、PB。（数据频率：每交易日）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| index_code | string | 是 | 申万行业指数代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`index_code` 必填；`end_date - start_date`≤31天；固定第1页、每页31条，按 `trade_date` 倒序。
**返回 data**：见 `references/querySwIndustryDaily.md`

---

## 4. Tool 速查表
| Tool | 接口名 | 主要用途 | 必填参数 |
|------|--------|----------|----------|
| Tool-1 | getStockBasic | 股票基础信息 | stock_code 或 stock_name |
| Tool-2 | queryStockDaily | 日线行情（价量） | stock_code |
| Tool-3 | queryDailyBasic | 每日PE/PB/市值 | stock_code |
| Tool-4 | queryMoneyflow | 大小单资金流向 | stock_code |
| Tool-5 | queryIncome | 利润表汇总 | stock_code |
| Tool-5b | queryIncomeDetail | 利润表明细（按公司类型） | stock_code + fields/comp_type |
| Tool-6 | queryBalanceSheet | 资产负债表汇总 | stock_code |
| Tool-6b | queryBalanceSheetDetail | 资产负债表明细（按公司类型） | stock_code + fields/comp_type |
| Tool-7 | queryCashFlow | 现金流量表汇总 | stock_code |
| Tool-7b | queryCashFlowDetail | 现金流量表明细（按公司类型） | stock_code + fields/comp_type |
| Tool-8 | queryFinanceIndicator | ROE/ROA/毛利率等财务指标 | stock_code |
| Tool-9 | queryFinanceAudit | 审计意见 | stock_code |
| Tool-10 | queryFinanceMainbz | 主营业务构成 | stock_code |
| Tool-11 | querySwIndustryMember | 申万行业成分 | stock_code |
| Tool-12 | querySwIndustryDaily | 申万行业指数行情 | index_code |

---

## 5. 错误处理
| 错误类型 | 处理方式 |
|----------|----------|
| HTTP 4xx | 检查参数格式和路径参数 |
| HTTP 5xx | 提示用户服务端错误，建议稍后重试 |
| 连接失败 | 提示用户检查 API 可达性 |
| 参数校验失败 | 脚本调用前校验必填项和日期区间，失败则报错且不发请求 |