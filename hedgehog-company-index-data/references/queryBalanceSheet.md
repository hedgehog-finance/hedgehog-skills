# queryBalanceSheet 返回字段说明

接口：`queryBalanceSheet`（资产负债表汇总视图）

## data 结构

分页结构 `{ total, page, page_size, db_source, items[] }`，`db_source = "balance_sheet"`，`items` 按 `end_date` 倒序返回。

> 脚本已将后端字段 `stock_code` 重命名为 `ts_code` 输出。

## data.items[] 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| ts_code | string | 股票代码 |
| ann_date | string(date) | 公告日期 |
| end_date | string(date) | 报告期 |
| report_type | string | 报表类型 |
| comp_type | string | 公司类型 |
| total_assets | float | 资产总计 |
| total_liab | float | 负债合计 |
| total_hldr_eqy_exc_min_int | float | 股东权益合计（不含少数股东权益） |
| total_cur_assets | float | 流动资产合计 |
| total_nca | float | 非流动资产合计 |
| total_cur_liab | float | 流动负债合计 |
| total_ncl | float | 非流动负债合计 |
| money_cap | float | 货币资金 |
| accounts_receiv | float | 应收账款 |
| inventories | float | 存货 |
| fix_assets | float | 固定资产 |
| goodwill | float | 商誉 |
| intan_assets | float | 无形资产 |
| contract_assets | float | 合同资产 |
| st_borr | float | 短期借款 |
| lt_borr | float | 长期借款 |
| accounts_pay | float | 应付票据及应付账款 |
| contract_liab | float | 合同负债 |
| update_flag | string | 更新标识 |
