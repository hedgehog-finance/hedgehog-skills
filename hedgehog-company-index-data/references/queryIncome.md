# queryIncome 返回字段说明

接口：`queryIncome`（利润表汇总视图）

## data 结构

分页结构 `{ total, page, page_size, db_source, items[] }`，`db_source = "income"`，`items` 按 `end_date` 倒序返回。

> 输出字段 `stock_code` 与后端一致，不做重命名。

## data.items[] 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| stock_code | string | 股票代码 |
| ann_date | string(date) | 公告日期 |
| end_date | string(date) | 报告期 |
| report_type | string | 报告类型 |
| comp_type | string | 公司类型 |
| basic_eps | float | 基本每股收益 |
| total_revenue | float | 营业总收入 |
| revenue | float | 营业收入 |
| operate_profit | float | 营业利润 |
| total_profit | float | 利润总额 |
| n_income | float | 净利润（含少数股东损益） |
| n_income_attr_p | float | 净利润（不含少数股东损益，归母） |
| net_after_nr_lp_correct | float | 扣除非经常性损益后的净利润（更正前） |
| ebit | float | 息税前利润 |
| ebitda | float | 息税折旧摊销前利润 |
| oper_cost | float | 营业成本 |
| sell_exp | float | 销售费用 |
| admin_exp | float | 管理费用 |
| rd_exp | float | 研发费用 |
| fin_exp | float | 财务费用 |
| assets_impair_loss | float | 资产减值损失 |
| credit_impa_loss | float | 信用减值损失 |
| invest_income | float | 投资净收益 |
| fv_value_chg_gain | float | 公允价值变动净收益 |
| update_flag | string | 更新标识 |
