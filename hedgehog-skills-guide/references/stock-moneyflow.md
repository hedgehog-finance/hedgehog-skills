# 股票资金流向数据：数据字段及说明

## 输出字段

| 名称              | 类型  | 默认显示 | 描述                   |
| ------------------- | ------- | ---------- | ------------------------ |
| ts\_code          | str   | Y        | TS代码                 |
| trade\_date       | str   | Y        | 交易日期               |
| buy\_sm\_vol      | int   | Y        | 小单买入量（手）       |
| buy\_sm\_amount   | float | Y        | 小单买入金额（万元）   |
| sell\_sm\_vol     | int   | Y        | 小单卖出量（手）       |
| sell\_sm\_amount  | float | Y        | 小单卖出金额（万元）   |
| buy\_md\_vol      | int   | Y        | 中单买入量（手）       |
| buy\_md\_amount   | float | Y        | 中单买入金额（万元）   |
| sell\_md\_vol     | int   | Y        | 中单卖出量（手）       |
| sell\_md\_amount  | float | Y        | 中单卖出金额（万元）   |
| buy\_lg\_vol      | int   | Y        | 大单买入量（手）       |
| buy\_lg\_amount   | float | Y        | 大单买入金额（万元）   |
| sell\_lg\_vol     | int   | Y        | 大单卖出量（手）       |
| sell\_lg\_amount  | float | Y        | 大单卖出金额（万元）   |
| buy\_elg\_vol     | int   | Y        | 特大单买入量（手）     |
| buy\_elg\_amount  | float | Y        | 特大单买入金额（万元） |
| sell\_elg\_vol    | int   | Y        | 特大单卖出量（手）     |
| sell\_elg\_amount | float | Y        | 特大单卖出金额（万元） |
| net\_mf\_vol      | int   | Y        | 净流入量（手）         |
| net\_mf\_amount   | float | Y        | 净流入额（万元）       |

各类别统计规则如下：
小单：5万以下 中单：5万～20万 大单：20万～100万 特大单：成交额>=100万 ，数据基于主动买卖单统计

## 分析方法

1. 分析股票的净流入额（net\_mf\_amount）：当日所有股票净流入额排序；一个股票历史每日净流入额走势。
2. 分析股票的大小单买卖资金对比：小单买入金额与小单卖出金额对比；中单买入金额与中单卖出金额对比；大单买入金额与大单卖出金额对比；特大单买入金额与特大单卖出金额对比；