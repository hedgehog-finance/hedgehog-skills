# queryMoneyflow 返回字段说明

接口：`queryMoneyflow`（个股大小单成交资金流向）

> ⚠️ 与 `queryCashFlow`（财务报表-现金流量表）不同，本接口是日频交易资金流统计。

## data 结构

分页结构 `{ total, page, page_size, db_source, items[] }`，`db_source = "a_moneyflow"`，`items` 按 `trade_date` 倒序返回。

## data.items[] 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| stock_code | string | TS 代码 |
| trade_date | string(date) | 交易日期 |
| buy_sm_vol | int | 小单买入量（手） |
| buy_sm_amount | float | 小单买入金额（万元） |
| sell_sm_vol | int | 小单卖出量（手） |
| sell_sm_amount | float | 小单卖出金额（万元） |
| buy_md_vol | int | 中单买入量（手） |
| buy_md_amount | float | 中单买入金额（万元） |
| sell_md_vol | int | 中单卖出量（手） |
| sell_md_amount | float | 中单卖出金额（万元） |
| buy_lg_vol | int | 大单买入量（手） |
| buy_lg_amount | float | 大单买入金额（万元） |
| sell_lg_vol | int | 大单卖出量（手） |
| sell_lg_amount | float | 大单卖出金额（万元） |
| buy_elg_vol | int | 特大单买入量（手） |
| buy_elg_amount | float | 特大单买入金额（万元） |
| sell_elg_vol | int | 特大单卖出量（手） |
| sell_elg_amount | float | 特大单卖出金额（万元） |
| net_mf_vol | int | 净流入量（手） |
| net_mf_amount | float | 净流入额（万元） |
