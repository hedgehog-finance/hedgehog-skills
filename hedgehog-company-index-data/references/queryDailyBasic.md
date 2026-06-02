# queryDailyBasic 返回字段说明

接口：`queryDailyBasic`（每日基本面指标）

## data 结构

分页结构 `{ total, page, page_size, db_source, items[] }`，`db_source = "daily_basic"`，`items` 按 `trade_date` 倒序返回。

## data.items[] 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| stock_code | string | 股票代码 |
| trade_date | string(date) | 交易日期 |
| close | float | 当日收盘价 |
| turnover_rate | float | 换手率（%） |
| turnover_rate_f | float | 换手率（自由流通股，%） |
| volume_ratio | float | 量比 |
| pe | float | 市盈率（总市值/净利润） |
| pe_ttm | float | 市盈率（TTM） |
| pb | float | 市净率（总市值/净资产） |
| ps | float | 市销率 |
| ps_ttm | float | 市销率（TTM） |
| dv_ratio | float | 股息率（%） |
| dv_ttm | float | 股息率（TTM，%） |
| total_share | float | 总股本（万股） |
| float_share | float | 流通股本（万股） |
| free_share | float | 自由流通股本（万股） |
| total_mv | float | 总市值（万元） |
| circ_mv | float | 流通市值（万元） |
