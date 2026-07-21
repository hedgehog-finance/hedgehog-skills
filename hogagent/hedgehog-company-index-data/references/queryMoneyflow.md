# queryMoneyflow 返回字段说明

接口：`queryMoneyflow`（个股各档位资金净流入额）

> ⚠️ 与 `queryCashFlow`（财务报表-现金流量表）不同，本接口是日频交易资金流统计。

## 返回结构

脚本直接返回数组，元素按 `trade_date` 倒序。

## 数组元素字段

| 字段 | 类型 | 说明 |
|------|------|------|
| stock_code | string | TS 代码 |
| trade_date | string(date) | 交易日期 |
| net_sm_amount | float | 小单净流入额（万元）= 小单买入 - 小单卖出 |
| net_md_amount | float | 中单净流入额（万元）= 中单买入 - 中单卖出 |
| net_lg_amount | float | 大单净流入额（万元）= 大单买入 - 大单卖出 |
| net_elg_amount | float | 特大单净流入额（万元）= 特大单买入 - 特大单卖出 |
| net_mf_amount | float | 总体净流入额（万元） |
