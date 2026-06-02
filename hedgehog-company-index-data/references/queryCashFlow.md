# queryCashFlow 返回字段说明

接口：`queryCashFlow`（财务报表-现金流量表，汇总视图）

> ⚠️ 与 `queryMoneyflow`（个股每日大小单交易资金流向）不同，本接口是公司财务报告的现金流量表科目。

## data 结构

分页结构 `{ total, page, page_size, db_source, items[] }`，`db_source = "cash_flow"`，`items` 按 `end_date` 倒序返回。

> 脚本已将后端字段 `stock_code` 重命名为 `ts_code` 输出。

## data.items[] 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| ts_code | string | 股票代码 |
| ann_date | string(date) | 公告日期 |
| end_date | string(date) | 报告期 |
| report_type | string | 报表类型 |
| comp_type | string | 公司类型 |
| net_profit | float | 净利润 |
| n_cashflow_act | float | 经营活动产生的现金流量净额 |
| n_cashflow_inv_act | float | 投资活动产生的现金流量净额 |
| n_cash_flows_fnc_act | float | 筹资活动产生的现金流量净额 |
| n_incr_cash_cash_equ | float | 现金及现金等价物净增加额 |
| free_cashflow | float | 企业自由现金流量 |
| c_cash_equ_beg_period | float | 期初现金及现金等价物余额 |
| c_cash_equ_end_period | float | 期末现金及现金等价物余额 |
| c_fr_sale_sg | float | 销售商品、提供劳务收到的现金 |
| c_paid_goods_s | float | 购买商品、接受劳务支付的现金 |
| c_paid_to_for_empl | float | 支付给职工以及为职工支付的现金 |
| c_pay_acq_const_fiolta | float | 购建固定资产、无形资产和其他长期资产支付的现金 |
| c_recp_borrow | float | 取得借款收到的现金 |
| c_prepay_amt_borr | float | 偿还债务支付的现金 |
| c_pay_dist_dpcp_int_exp | float | 分配股利、利润或偿付利息支付的现金 |
| update_flag | string | 更新标识 |
