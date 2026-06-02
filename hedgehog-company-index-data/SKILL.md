---
name: hedgehog-company-index-data
description: >
  从刺猬投研AI数据源查询上市公司和股票相关数据。
  【适用】A股股票基础信息、日线行情、每日基本面指标（PE、PB、换手率、总市值等）、个股成交资金流向、
  利润表、资产负债表、现金流量表、财务指标、审计意见、主营业务构成；申万行业成分股、申万行业日线行情。
  【不适用】宏观经济数据 → 改用 hedgehog-macro-industry-data；新闻资讯、公告 → 不在本 skill 覆盖范围。
  触发词：股票基本信息、股票行情、日线行情、基本面数据、PE、PB、换手率、市值、资金流向、财务报表、利润表、资产负债表、
  现金流量表、财务指标、审计意见、主营业务构成、申万行业、行业分类、行业成分、行业行情；
  stock basic, stock daily, market data, quote data, daily basic, money flow, financial statements, financial indicator.
version: 2.0

---

# hedgehog-company-index-data

本 skill 通过 Node.js 脚本调用刺猬投研 AI 数据接口（https://api.ciweiai.com/api/data），查询上市公司和股票相关数据。

可用环境变量 `API_BASE_URL` 覆盖接口基础地址。

---

## 核心功能工作流 (Workflow)

1. 识别用户查询对象：股票基础信息、个股行情、每日基本面、资金流向、财务报表、财务指标、审计意见、主营业务构成、申万行业成分或行业行情。
2. 如果用户只给股票简称、公司名或模糊名称，先用 Tool-1 查询 `stock_code`；不要自行猜测股票代码。
3. 查阅本文件的 `Tools基础功能`，选择对应 Tool。
4. 使用 `scripts/call_api.js` 执行调用。
5. 解析返回结果，保留数据来源、日期口径和关键字段；检索不到结果时返回 `null`，不得编造数据。

---

## 通用约定

### 脚本调用方式

所有 Tool 均通过同一脚本执行：

```bash
node scripts/call_api.js --api <接口名> --params '<JSON字符串>'
```

### 通用返回结构

```json
{
  "code": 200,
  "msg": "success",
  "data": { ... }  // 具体结构见各 Tool 说明
}
```

- `code` 非 200 时视为失败，根据错误处理表处理。
- 检索不到数据时，`data` 为 `null` 或空数组，不得编造数据。

### fields 参数说明

支持 `fields` 参数的 Tool，可传入逗号分隔的字段名字符串，脚本将仅返回指定字段，节省 token。未传则返回默认字段集。

### 日期约束通用规则

| 约束项 | 说明 |
|--------|------|
| 日期格式 | `YYYY-MM-DD` |
| start_date 上限 | 各接口不同，见对应 Tool 说明 |
| 日期区间上限 | 各接口不同，见对应 Tool 说明 |

### 股票代码

优先使用带交易所后缀的 `stock_code`，例如 `000001.SZ`。

---

## Tools 基础功能

### Tool-1: 查询股票基础信息 `getStockBasic`

**适用场景**：按股票代码或股票简称/公司名查询上市公司基础资料；后续查询需要 `stock_code` 时先调用此 Tool。

**不适合场景**：查询个股日线行情 → Tool-2；查询 PE/PB/换手率/市值 → Tool-3。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 与 stock_name 至少填一项 | 股票代码，如 `000001.SZ` |
| stock_name | string | 与 stock_code 至少填一项 | 股票简称或公司名（模糊匹配） |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`stock_code` 和 `stock_name` 至少必填一项，否则报错。

**返回 data 字段**（≤10个，直接说明）：

| 字段 | 说明 |
|------|------|
| stock_code | 股票代码 |
| stock_name | 股票简称 |
| area | 地域 |
| industry | 所属行业 |
| list_date | 上市日期 |
| market | 市场类型 |
| exchange | 交易所 |

---

### Tool-2: 查询股票日线行情 `queryStockDaily`

**适用场景**：查询某只股票历史收盘价、涨跌幅、成交量、成交额等日线行情。

**不适合场景**：PE/PB/换手率/市值 → Tool-3；资金流向 → Tool-5。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 2年；最多返回300条，按 `trade_date` 倒序。

**返回 data**：见 `references/queryStockDaily.md`（字段数 > 10）

---

### Tool-3: 查询指定股票每日基本面指标 `queryDailyBasic`

**适用场景**：查询单只股票的 PE、PB、换手率、量比、总市值、流通市值等日频指标。

**不适合场景**：财务报表科目 → Tool-6/7/8；行情价格和成交量 → Tool-2。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过1年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过1年；`end_date - start_date` ≤ 31天；最多返回200条，按 `trade_date` 倒序。`limit` 参数已移除。

**返回 data**：见 `references/queryDailyBasic.md`（字段数 > 10）

---

### Tool-4: 查询个股成交资金流向 `queryMoneyflow`

> ⚠️ 注意：本 Tool 查询的是**每日大小单交易统计**资金流向，与 Tool-8 现金流量表无关。

**适用场景**：查询主力、散户、大单、小单净流入量/净流入额等资金流向数据。

**不适合场景**：查询成交量/成交额日线行情 → Tool-2；市值或估值指标 → Tool-3。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 31天；固定返回第1页，每页3条，按 `trade_date` 倒序。`page`、`page_size` 参数已移除。

**返回 data**：见 `references/queryMoneyflow.md`（字段数 > 10）

---

### Tool-5: 查询利润表（汇总） `queryIncome`

**适用场景**：查询营业收入、营业利润、净利润、归母净利润、每股收益等利润表科目（汇总视图）。

**不适合场景**：按公司类型查询利润明细 → Tool-5b；资产/负债/股东权益 → Tool-6；现金流科目 → Tool-7/7b。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 1年；固定返回第1页，每页4条，按 `end_date` 倒序。`page`、`page_size` 参数已移除。原接口名 `queryIncomeStatement`。

**返回 data**：见 `references/queryIncome.md`（字段数 > 10）

---

### Tool-5b: 查询利润表（按公司类型明细） `queryIncomeDetail`

**适用场景**：需要按银行/保险/证券/一般工商业公司类型查询利润明细字段时使用。每次返回一条记录。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| report_type | integer | 否 | 报表类型：1合并报表（默认）、4调整合并报表 |
| comp_type | integer | 是 | 公司类型：1一般工商业、2银行、3保险、4证券 |

> 脚本内限制：`stock_code`、`comp_type` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 1年；固定返回第1页，每页4条，按 `end_date` 倒序。脚本根据 `comp_type` 自动设置 `fields`，不可手动覆盖。

**各公司类型返回字段**：

- **1 一般工商业**：`ts_code, ann_date, end_date, comp_type, n_income_attr_p, net_after_nr_lp_correct, basic_eps, total_revenue, revenue, oper_cost, sell_exp, admin_exp, rd_exp, fin_exp, operate_profit, ebit, ebitda, assets_impair_loss, credit_impa_loss`
- **2 银行**：`ts_code, ann_date, end_date, comp_type, n_income_attr_p, net_after_nr_lp_correct, basic_eps, int_income, int_exp, comm_income, comm_exp, n_commis_income, credit_impa_loss`
- **3 保险**：`ts_code, ann_date, end_date, comp_type, n_income_attr_p, net_after_nr_lp_correct, basic_eps, prem_earned, prem_income, out_prem, compens_payout, reser_insur_liab, une_prem_reser, invest_income, fv_value_chg_gain`
- **4 证券**：`ts_code, ann_date, end_date, comp_type, n_income_attr_p, net_after_nr_lp_correct, basic_eps, n_sec_tb_income, n_sec_uw_income, n_asset_mg_income, int_income, invest_income, fv_value_chg_gain`

**返回 data 字段说明**：见 guide 技能文档。

---

### Tool-6: 查询资产负债表（汇总） `queryBalanceSheet`

**适用场景**：查询总资产、总负债、股东权益等资产负债表科目（汇总视图）。

**不适合场景**：按公司类型查询资产负债明细 → Tool-6b；利润表科目 → Tool-5；现金流科目 → Tool-7。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 1年；固定返回第1页，每页4条，按 `end_date` 倒序。`page`、`page_size` 参数已移除。

**返回 data**：见 `references/queryBalanceSheet.md`（字段数 > 10）

---

### Tool-6b: 查询资产负债表（按公司类型明细） `queryBalanceSheetDetail`

**适用场景**：需要按银行/保险/证券/一般工商业公司类型查询资产负债明细字段时使用。每次返回一条记录。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| report_type | integer | 否 | 报表类型：1合并报表（默认）、4调整合并报表 |
| comp_type | integer | 是 | 公司类型：1一般工商业、2银行、3保险、4证券 |

> 脚本内限制：`stock_code`、`comp_type` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 31天；固定返回第1页，每页3条，按 `end_date` 倒序。脚本根据 `comp_type` 自动设置 `fields`，不可手动覆盖。

**各公司类型返回字段**：

- **1 一般工商业**：`ts_code, ann_date, end_date, comp_type, total_assets, total_liab, total_hldr_eqy_exc_min_int, money_cap, accounts_receiv, inventories, contract_assets, fix_assets_total, cip_total, intan_assets, goodwill, st_borr, lt_borr, accounts_pay, contract_liab`
- **2 银行**：`ts_code, ann_date, end_date, comp_type, total_assets, total_liab, total_hldr_eqy_exc_min_int, cash_reser_cb, depos_in_oth_bfi, loanto_oth_bank_fi, decr_in_disbur, trad_asset, cb_borr, depos, depos_oth_bfi, loan_oth_bank`
- **3 保险**：`ts_code, ann_date, end_date, comp_type, total_assets, total_liab, total_hldr_eqy_exc_min_int, money_cap, premium_receiv, fair_value_fin_assets, cost_fin_assets, invest_real_estate, rsrv_insur_cont, indem_payable, policy_div_payable`
- **4 证券**：`ts_code, ann_date, end_date, comp_type, total_assets, total_liab, total_hldr_eqy_exc_min_int, money_cap, client_depos, client_prov, lending_funds, trad_asset, pur_resale_fa, acting_trading_sec, acting_uw_sec, st_fin_payable, sold_for_repur_fa, bond_payable`

**返回 data 字段说明**：见 guide 技能文档。

---

### Tool-7: 查询现金流量表（汇总） `queryCashFlow`

> ⚠️ 注意：本 Tool 查询的是**财务报表现金流量表**，与 Tool-4 个股交易资金流向无关。

**适用场景**：查询经营、投资、筹资现金流及现金净额等科目（汇总视图）。

**不适合场景**：按公司类型查询现金流明细 → Tool-7b；利润表科目 → Tool-5；资产负债表科目 → Tool-6。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 1年；固定返回第1页，每页4条，按 `end_date` 倒序。`page`、`page_size` 参数已移除。

**返回 data**：见 `references/queryCashFlow.md`（字段数 > 10）

---

### Tool-7b: 查询现金流量表（按公司类型明细） `queryCashFlowDetail`

**适用场景**：需要按银行/保险/证券/一般工商业公司类型查询现金流量明细字段时使用。每次返回一条记录。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| report_type | integer | 否 | 报表类型：1合并报表（默认）、4调整合并报表 |
| comp_type | integer | 是 | 公司类型：1一般工商业、2银行、3保险、4证券 |

> 脚本内限制：`stock_code`、`comp_type` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 31天；固定返回第1页，每页3条，按 `end_date` 倒序。脚本根据 `comp_type` 自动设置 `fields`，不可手动覆盖。

**各公司类型返回字段**：

- **1 一般工商业**：`ts_code, ann_date, end_date, comp_type, net_profit, c_fr_sale_sg, c_paid_goods_s, c_paid_to_for_empl, n_cashflow_act, c_pay_acq_const_fiolta, free_cashflow, n_cashflow_inv_act, c_recp_borrow, c_prepay_amt_borr, c_pay_dist_dpcp_int_exp, n_cash_flows_fnc_act, n_incr_cash_cash_equ`
- **2 银行**：`ts_code, ann_date, end_date, comp_type, net_profit, n_depos_incr_fi, n_incr_loans_cb, n_inc_borr_oth_fi, n_incr_clt_loan_adv, n_incr_dep_cbob, n_cashflow_act, n_cashflow_inv_act, proc_issue_bonds, n_cash_flows_fnc_act, n_incr_cash_cash_equ`
- **3 保险**：`ts_code, ann_date, end_date, comp_type, net_profit, prem_fr_orig_contr, n_reinsur_prem, c_pay_claims_orig_inco, pay_comm_insur_plcy, n_cashflow_act, c_paid_invest, c_recp_return_invest, n_cashflow_inv_act, n_cash_flows_fnc_act, n_incr_cash_cash_equ`
- **4 证券**：`ts_code, ann_date, end_date, comp_type, net_profit, net_cash_rece_sec, ifc_cash_incr, n_cap_incr_repur, n_incr_disp_tfa, n_cashflow_act, c_paid_invest, c_recp_return_invest, n_cashflow_inv_act, proc_issue_bonds, c_recp_borrow, n_cash_flows_fnc_act, n_incr_cash_cash_equ`

**返回 data 字段说明**：见 guide 技能文档。

---

### Tool-8: 查询财务指标 `queryFinanceIndicator`

**适用场景**：查询 ROE、ROA、毛利率、净利率等盈利/成长/偿债/运营能力指标。

**不适合场景**：日频 PE/PB/换手率/市值 → Tool-3；财务报表原始科目 → Tool-5/6/7。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 1年；固定返回第1页，每页4条，按 `end_date` 倒序。`page`、`page_size` 参数已移除。

**返回 data**：见 `references/queryFinanceIndicator.md`（字段数 > 10）

---

### Tool-9: 查询财务审计意见 `queryFinanceAudit`

**适用场景**：查询审计机构、审计意见类型、审计结论、审计费用或签字会计师。

**不适合场景**：公告原文或新闻资讯 → 不在本 skill 覆盖范围；财务指标 → Tool-8。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 1年；固定返回第1页，每页4条，按 `end_date` 倒序。`page`、`page_size` 参数已移除。

**返回 data 字段**（≤10个，直接说明）：

| 字段 | 说明 |
|------|------|
| ts_code | 股票代码 |
| ann_date | 公告日期 |
| end_date | 报告期 |
| audit_result | 审计意见类型 |
| audit_fees | 审计费用（元） |
| audit_agency | 审计机构 |
| audit_sign | 签字会计师 |

---

### Tool-10: 查询主营业务构成 `queryFinanceMainbz`

**适用场景**：按产品、地区或行业维度分析主营业务收入、成本和利润构成。

**不适合场景**：利润表整体科目 → Tool-5；行业成分股列表 → Tool-11。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`stock_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 1年；固定返回第1页，每页4条，按 `end_date` 倒序。`page`、`page_size` 参数已移除。

**返回 data 字段**（≤10个，直接说明）：

| 字段 | 说明 |
|------|------|
| ts_code | 股票代码 |
| end_date | 报告期 |
| bz_item | 主营业务名称 |
| bz_sales | 主营业务收入（元） |
| bz_profit | 主营业务利润（元） |
| bz_cost | 主营业务成本（元） |
| curr_type | 货币类型 |
| bz_type | 构成类型（产品/地区/行业） |

---

### Tool-11: 查询申万行业成分构成 `querySwIndustryMember`

**适用场景**：查询某只股票所属的申万行业，或查询某申万行业下当前有效的成分股列表。

**不适合场景**：行业日线行情 → Tool-12。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| stock_code | string | 是 | 股票代码 |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`stock_code` 必填；固定查询当前有效成分（`is_new=Y`），固定返回第1页，每页31条，按 `in_date` 倒序。`l1_code`、`l2_code`、`l3_code`、`is_new`、`page`、`page_size` 参数已移除。

**返回 data 字段**（≤10个，直接说明）：

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

**适用场景**：查询申万行业指数的开高低收、涨跌幅、成交量、成交额、PE、PB。

**不适合场景**：个股日线行情 → Tool-2。

**输入参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| index_code | string | 是 | 申万行业指数代码 |
| start_date | string | 否 | 开始日期，距今不超过10年 |
| end_date | string | 否 | 结束日期 |
| fields | string | 否 | 逗号分隔的返回字段名 |

> 脚本内限制：`index_code` 必填；`start_date` 距今不超过10年；`end_date - start_date` ≤ 31天；固定返回第1页，每页31条，按 `trade_date` 倒序。`page`、`page_size` 参数已移除。

**返回 data**：见 `references/querySwIndustryDaily.md`（字段数 > 10）

---

## Tool 速查表

| Tool | 接口名 | 主要用途 | 必填参数 |
|------|--------|----------|----------|
| Tool-1 | getStockBasic | 股票基础信息 | stock_code 或 stock_name |
| Tool-2 | queryStockDaily | 日线行情（价量） | stock_code |
| Tool-3 | queryDailyBasic | 每日PE/PB/市值 | stock_code |
| Tool-4 | queryMoneyflow | 大小单资金流向 | stock_code |
| Tool-5 | queryIncome | 利润表汇总 | stock_code |
| Tool-5b | queryIncomeDetail | 利润表明细（按公司类型） | stock_code, comp_type |
| Tool-6 | queryBalanceSheet | 资产负债表汇总 | stock_code |
| Tool-6b | queryBalanceSheetDetail | 资产负债表明细（按公司类型） | stock_code, comp_type |
| Tool-7 | queryCashFlow | 现金流量表汇总 | stock_code |
| Tool-7b | queryCashFlowDetail | 现金流量表明细（按公司类型） | stock_code, comp_type |
| Tool-8 | queryFinanceIndicator | ROE/ROA/毛利率等财务指标 | stock_code |
| Tool-9 | queryFinanceAudit | 审计意见 | stock_code |
| Tool-10 | queryFinanceMainbz | 主营业务构成 | stock_code |
| Tool-11 | querySwIndustryMember | 申万行业成分 | stock_code |
| Tool-12 | querySwIndustryDaily | 申万行业指数行情 | index_code |

---

## 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| HTTP 4xx | 检查参数格式和路径参数 |
| HTTP 5xx | 提示用户服务端错误，建议稍后重试 |
| 连接失败 | 提示用户检查 https://api.ciweiai.com/api/data 是否可达 |
| 参数校验失败 | 脚本在调用前校验必填项和日期区间，校验失败直接报错，不发起请求 |

---

## 补充说明

### 与其他 Skill 的边界

| 查询对象 | 使用的 Skill |
|----------|--------------|
| 某只股票的基础信息、行情、基本面 | **本 skill** |
| 某只股票的资金流向、财务数据、财务指标 | **本 skill** |
| 申万行业成分 / 行业行情 | **本 skill** |
| 宏观指标（利率 / CPI / PMI / 社融等） | hedgehog-macro-industry-data |
| 新闻资讯、公告 | 不适用任何本系列 skill |

### 用户触发示例

- "平安银行的股票代码和上市日期" → Tool-1
- "查一下 000001.SZ 近一个月日线行情" → Tool-2
- "贵州茅台最近的 PE 和 PB" → Tool-1 → Tool-3
- "招商银行最近资金流向" → Tool-1 → Tool-4
- "宁德时代近三年利润表" → Tool-1 → Tool-5
- "平安银行利润明细（银行类型）" → Tool-1 → Tool-5b（comp_type=2）
- "比亚迪最新资产负债表" → Tool-1 → Tool-6
- "隆基绿能经营现金流变化" → Tool-1 → Tool-7
- "万科近几年 ROE 和毛利率" → Tool-1 → Tool-8
- "某公司审计意见是什么" → Tool-1 → Tool-9
- "某公司主营业务按产品怎么分布" → Tool-1 → Tool-10
- "近一个月医药生物行业行情走势" → Tool-12