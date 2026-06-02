# queryStockDaily 返回字段说明

接口：`queryStockDaily`（A 股日线行情）

## data 结构

分页结构 `{ total, page, page_size, db_source, items[] }`，`db_source = "stock_daily"`，`items` 按 `trade_date` 倒序返回。

## data.items[] 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| stock_code | string | 股票代码（带交易所后缀） |
| trade_date | string(date) | 交易日期 `YYYY-MM-DD` |
| open | float | 开盘价 |
| high | float | 最高价 |
| low | float | 最低价 |
| close | float | 收盘价 |
| pre_close | float | 昨收价 |
| change | float | 涨跌额 |
| pct_chg | float | 涨跌幅（%） |
| vol | float | 成交量（手） |
| amount | float | 成交额（千元） |
