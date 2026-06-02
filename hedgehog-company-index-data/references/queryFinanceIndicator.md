# queryFinanceIndicator 返回字段说明

接口：`queryFinanceIndicator`（财务指标）

## data 结构

分页结构 `{ total, page, page_size, db_source, items[] }`，`db_source = "finance_indicator"`，`items` 按 `end_date` 倒序返回。

> 脚本已将后端字段 `stock_code` 重命名为 `ts_code` 输出。

## data.items[] 字段（常用）

| 字段 | 类型 | 说明 |
|------|------|------|
| ts_code | string | 股票代码 |
| ann_date | string(date) | 公告日期 |
| end_date | string(date) | 报告期 |
| eps | float | 基本每股收益 |
| dt_eps | float | 稀释每股收益 |
| gross_margin | float | 毛利 |
| grossprofit_margin | float | 销售毛利率（%） |
| netprofit_margin | float | 销售净利率（%） |
| roe | float | 净资产收益率 |
| roe_waa | float | 加权平均净资产收益率 |
| roe_dt | float | 净资产收益率（扣除非经常损益） |
| roa | float | 总资产报酬率 |
| roic | float | 投入资本回报率 |
| current_ratio | float | 流动比率 |
| quick_ratio | float | 速动比率 |
| cash_ratio | float | 现金比率 |
| debt_to_assets | float | 资产负债率 |
| assets_turn | float | 总资产周转率 |
| inv_turn | float | 存货周转率 |
| ar_turn | float | 应收账款周转率 |
| ocfps | float | 每股经营活动现金流 |
| cfps | float | 每股现金流 |
| fcff | float | 企业自由现金流量 |
| fcfe | float | 股权自由现金流量 |
| profit_dedt | float | 扣非净利润 |
| tr_yoy | float | 营业总收入同比（%） |
| or_yoy | float | 营业收入同比（%） |
| netprofit_yoy | float | 净利润同比（%） |
| dt_netprofit_yoy | float | 扣非净利润同比（%） |
| roe_yoy | float | ROE 同比（%） |
| assets_yoy | float | 总资产同比（%） |
| rd_exp | float | 研发费用 |

> 字段表来源：`api-doc/hedgehog-company-index-data.md` 第 8 节摘录的盈利、成长、偿债、运营和每股指标。完整字段以后端响应为准。
