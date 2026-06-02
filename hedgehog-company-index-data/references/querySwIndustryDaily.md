# querySwIndustryDaily 返回字段说明

接口：`querySwIndustryDaily`（申万行业指数日线行情）

## data 结构

分页结构 `{ total, page, page_size, db_source, items[] }`，`db_source = "sw_industry_daily"`，`items` 按 `trade_date` 倒序返回。

## data.items[] 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| index_code | string | 申万行业指数代码 |
| trade_date | string(date) | 交易日期 |
| name | string | 指数名称 |
| open | float | 开盘点位 |
| low | float | 最低点位 |
| high | float | 最高点位 |
| close | float | 收盘点位 |
| change | float | 涨跌点位 |
| pct_change | float | 涨跌幅（%） |
| vol | float | 成交量（万股） |
| amount | float | 成交额（万元） |
| pe | float | 市盈率 |
| pb | float | 市净率 |
| float_mv | float | 流通市值（万元） |
| total_mv | float | 总市值（万元） |
