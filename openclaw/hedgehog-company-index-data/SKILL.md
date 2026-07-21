---
name: hedgehog-company-index-data
description: >
  Query A-share listed company data: basic info, daily quotes, fundamentals (PE/PB/turnover/market cap),
  capital flow, financial statements (income/balance/cash flow), ratios, audit opinions, main business
  composition; Shenwan industry constituents and quotes; trading calendar and trade day utilities.
  NOT for: macro data (→ hedgehog-macro-industry-data); news/announcements.
version: 1.3.0
---

# 上市公司数据查询

## 1. 核心功能工作流 (Workflow)
1. **识别对象**：股票基础信息、行情、基本面、资金流向、财务报表、审计、主营构成、申万行业、交易日历。
2. **代码核实**：若用户仅提供股票简称/公司名/模糊名称，必须先用 Tool-1 查准 `stock_code`，**严禁盲猜股票代码**。
3. **查阅匹配**：根据 `Tools基础功能` 选择对应 Tool。
4. **统一调度**：使用 `node scripts/call_api.js --api <接口名> --params '<JSON字符串>' [--output save --dir <sessionTaskDir>]` 执行调用。
5. **输出策略（Token 节约）**：
- 预期结果 > 10 条或字符数 > 4000：**必须** `--output save --dir <sessionTaskDir>`
- 预期结果 ≤ 10 条：直接输出（默认）
- save 后按需查看：`read(path, offset, limit)` 或 `bash("head -20 <file>")`
- 禁止 save 后全量 read 回上下文
6. **结果解析**：保留数据来源、日期口径和关键字段；无结果返回 `null`，严禁凭空编造。

## 2. 通用约定
- **返回结构**：
  - 分页接口 → 直接返回 `items[]` 数组
  - 详情接口 → 直接返回单条对象
  - 无数据时返回 `null`
- **约束返回字段**：支持 `fields` 的 Tool 可传入逗号分隔字段名，限制返回字段以节省 Token。
- **日期规范**：强制 `YYYY-MM-DD` 格式。
- **股票代码**：优先使用带交易所后缀格式（如 `000001.SZ`）。
- **财务分析方法**：参考 `references/fin-analysis-guide.md`。

## 接口认证

所有接口需要 Bearer Token 认证。脚本自动从以下位置加载 API Key（按优先级）：

1. `~/.hogagent/skills_config.json` 中 `hedgehog-company-index-data.api-key`
2. 同文件中 `hedgehog-ciweiai.api-key`（共享 Key）
3. 环境变量 `CIWEIAI_API_KEY`
4. 环境变量 `API_KEY`

```json
// ~/.hogagent/skills_config.json
{
  "hedgehog-company-index-data": {
    "api-key": "your-api-key-here"
  }
}
```

---

## 3. Tools 基础功能字典
（Tool标题中的`xxx`内容是接口名）

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

**返回字段**：
| 字段 | 说明 |
|------|------|
| stock_code | 股票代码 |
| stock_name | 股票简称 |
| industry | 所属行业 |
| fullname | 股票全称 |
| enname | 英文全称 |
| cnspell | 拼音缩写 |
| market | 市场类型（主板/创业板/科创板/CDR） |
| exchange | 交易所代码 |
| curr_type | 交易货币 |
| list_date | 上市日期 |
| is_hs | 是否沪深港通标的（N否 H沪股通 S深股通） |

---

### Tool-2: 查询股票日线行情 `queryStockDaily`
**适用场景**：查询单只股票历史收盘价、涨跌幅、成交量、成交额等日线行情。（数据频率：每交易日）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名，OHLCV 用 `trade_date,open,high,low,close,vol` |

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤2年；默认最多 200 条（`fields`≤6 个字段时放宽至 400 条），按 `trade_date` 倒序。
**返回**：见 `references/queryStockDaily.md`
**典型用例**：查询股票一个月收盘价 `... --params '{"stock_code":"000001.SZ","start_date":"2023-05-01","end_date":"2023-05-31","fields":"trade_date,close"}'`

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

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤60 天（`fields`≤6 个字段时放宽至 180 天）；按 `trade_date` 倒序。
**返回**：见 `references/queryDailyBasic.md`

---

### Tool-4: 查询个股成交资金流向 `queryMoneyflow`
**适用场景**：查询各档位资金净流入额（小单/中单/大单/特大单/总体）。（数据频率：每交易日）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤90 天、最多 100 条（`fields`≤3 个字段时放宽至 366 天、最多 300 条）；按 `trade_date` 倒序。
**返回**：见 `references/queryMoneyflow.md`

---

### Tool-5: 查询利润表（简表） `queryIncome`
**适用场景**：查询营业收入、营业利润、净利润、归母净利润、每股收益等利润表科目（汇总视图）。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤366 天、最多 4 条（`fields`≤6 个字段时放宽至 3650 天、最多 40 条）；按 `end_date` 倒序。
**返回**：见 `references/queryIncome.md` 

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
| comp_type | integer | 与 fields 至少填一项 | 公司类型：1一般工商业、2银行、3保险、4证券 |
| report_type | integer | 否 | 报表类型：1合并报表（默认）、4调整合并报表 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤92 天、最多 1 条（`fields`≤6 个字段时放宽至 3650 天、最多 40 条）；按 `end_date` 倒序。用户传入 `fields` 则直接使用，否则按 `comp_type` 自动设置。
**返回字段说明**：见 `references/financial-report-income.md` （文件较大，可以先根据字段名理解意思）

---

### Tool-6: 查询资产负债表（简表） `queryBalanceSheet`
**适用场景**：查询总资产、总负债、股东权益等资产负债表简表（汇总视图）。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤366 天、最多 4 条（`fields`≤6 个字段时放宽至 3650 天、最多 40 条）；按 `end_date` 倒序。
**返回**：见 `references/queryBalanceSheet.md`

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

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤92 天、最多 1 条（`fields`≤6 个字段时放宽至 3650 天、最多 40 条）；按 `end_date` 倒序。用户传入 `fields` 则直接使用，否则按 `comp_type` 自动设置。
**返回字段说明**：见 `references/financial-report-balancesheet.md`（文件较大，可以先根据字段名理解意思）

---

### Tool-7: 查询现金流量表（简表） `queryCashFlow`
**适用场景**：查询经营、投资、筹资现金流及现金净额等财务现金流量简表。（数据频率：每季度末）

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今≤10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤366 天、最多 4 条（`fields`≤6 个字段时放宽至 3650 天、最多 40 条）；按 `end_date` 倒序。
**返回**：见 `references/queryCashFlow.md`

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

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤92 天、最多 1 条（`fields`≤6 个字段时放宽至 3650 天、最多 40 条）；按 `end_date` 倒序。用户传入 `fields` 则直接使用，否则按 `comp_type` 自动设置。
**返回字段说明**：见 `references/financial-report-cashflow.md`（文件较大，可以先根据字段名理解意思）

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

> 脚本内限制：`stock_code` 必填；`end_date - start_date` 默认 ≤366 天、最多 4 条（`fields`≤6 个字段时放宽至 3650 天、最多 40 条）；按 `end_date` 倒序。
**返回**：见 `references/queryFinanceIndicator.md`

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

**返回字段**：
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

> 脚本内限制：`stock_code` 必填；`end_date - start_date`≤1826 天（约 5 年）；按 `end_date` 倒序。最多返回 20 条记录。

**返回字段**：
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
| stock_code | string | 四选一 | 股票代码 |
| l1_code | string | 四选一 | 申万一级行业代码 |
| l2_code | string | 四选一 | 申万二级行业代码 |
| l3_code | string | 四选一 | 申万三级行业代码 |
| fields | string | 否 | 逗号分隔返回字段名 |

> 脚本内限制：`stock_code`、`l1_code`、`l2_code`、`l3_code` 四选一必填；固定查当前有效成分（`is_new=Y`），按 `in_date` 倒序。最多返回 300 条记录。

**返回字段**：
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

> 脚本内限制：`index_code` 必填；`end_date - start_date` 默认 ≤60 天、最多 60 条（`fields`≤6 个字段时放宽至 180 天、最多 180 条）；按 `trade_date` 倒序。
**返回**：见 `references/querySwIndustryDaily.md`

---

### Tool-13: 交易日历 `queryTradeCal`
**适用场景**：查询指定日期区间的交易日历（哪些天开盘/休盘）。

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| start_date | string | 是 | 开始日期 YYYY-MM-DD |
| end_date | string | 是 | 结束日期 YYYY-MM-DD |
| exchange | string | 否 | 交易所代码，默认 SSE |

> 脚本内限制：`start_date` 和 `end_date` 均必填；`end_date - start_date`≤366 天。

**返回字段**：
| 字段 | 说明 |
|------|------|
| cal_date | 日期 YYYY-MM-DD |
| is_open | 是否开盘（1 是 / 0 否） |

---

### Tool-14: 判断交易日 `isTradeDay`
**适用场景**：判断指定日期是否为交易日。

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| trade_date | string | 是 | 日期 YYYY-MM-DD |

> 脚本内限制：`trade_date` 必填，格式 YYYY-MM-DD。

**返回**：
```json
{"trade_date":"2024-01-02","is_open":1}
```

---

### Tool-15: 交易日偏移 `tradeDayOffset`
**适用场景**：根据基准日期和偏移量计算目标交易日（正数向后、负数向前）。

**输入参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| base_date | string | 是 | 基准日期 YYYY-MM-DD |
| offset | integer | 是 | 偏移量（正数向后/负数向前） |

> 脚本内限制：`base_date` 和 `offset` 均必填。

**返回**：
```json
{"base_date":"2024-01-02","offset":5,"target_date":"2024-01-09"}
```

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
| Tool-11 | querySwIndustryMember | 申万行业成分 | stock_code / l1_code / l2_code / l3_code |
| Tool-12 | querySwIndustryDaily | 申万行业指数行情 | index_code |
| Tool-13 | queryTradeCal | 交易日历 | start_date + end_date |
| Tool-14 | isTradeDay | 判断交易日 | trade_date |
| Tool-15 | tradeDayOffset | 交易日偏移 | base_date + offset |

---

## 5. 错误处理
| 错误类型 | 处理方式 |
|----------|----------|
| HTTP 4xx | 检查参数格式和路径参数 |
| HTTP 5xx | 提示用户服务端错误，建议稍后重试 |
| 连接失败 | 提示用户检查 API 可达性 |
| 参数校验失败 | 脚本调用前校验必填项和日期区间，失败则报错且不发请求 |