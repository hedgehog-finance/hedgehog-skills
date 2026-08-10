# queryIncome 返回字段说明

接口：`queryIncome`（利润表汇总视图）

## 返回结构

脚本直接返回数组，元素按 `end_date` 倒序。

> 输出字段 `stock_code` 与后端一致，不做重命名。

## 数组元素字段

| 字段 | 类型 | 说明 |
|------|------|------|
| stock_code | string | 股票代码 |
| ann_date | string(date) | 公告日期 |
| end_date | string(date) | 报告期 |
| report_type | string | 报告类型 |
| comp_type | string | 公司类型 |
| total_revenue | float | 营业总收入 |
| revenue | float | 其中：营业收入 |
| oper_cost | float | 其中：营业成本 |
| sell_exp | float | 其中：销售费用 |
| admin_exp | float | 其中：管理费用 |
| rd_exp | float | 其中：研发费用 |
| fin_exp | float | 其中：财务费用 |
| int_exp | float | 其中：利息费用 |
| int_income | float | 其中：利息收入 |
| assets_impair_loss | float | 其中：资产减值损失 |
| credit_impa_loss | float | 其中：信用减值损失 |
| total_cogs | float | 营业总成本 |
| operate_profit | float | 营业利润 |
| invest_income | float | 其中：投资净收益 |
| joint_ctrl_entp_invest_income | float | 其中：对联营/合营企业投资收益 |
| fv_value_chg_gain | float | 其中：公允价值变动净收益 |
| other_income | float | 其中：其他收益 |
| asset_disposal_income | float | 资产处置收益 |
| non_oper_income | float | 其中：营业外收入 |
| non_oper_exp | float | 其中：营业外支出 |
| total_profit | float | 利润总额 |
| income_tax | float | 其中：所得税费用 |
| n_income | float | 净利润 |
| n_income_attr_p | float | 其中：归属于母公司股东的净利润 |
| minority_income | float | 其中：少数股东损益 |
| basic_eps | float | 基本每股收益 |
| diluted_eps | float | 稀释每股收益 |
| ebit | float | 息税前利润 |
| ebitda | float | 息税折旧摊销前利润 |
| update_flag | string | 更新标识 |
| net_after_nr_lp_correct | float | 观察项：扣非后净利润 |

## 会计等式

- 营业利润 = 营业总收入 − 营业总成本 + 投资净收益 + 公允价值变动净收益 + 其他收益 + 资产处置收益
- 利润总额 = 营业利润 + 营业外收入 − 营业外支出
- 净利润 = 利润总额 − 所得税费用
- 净利润 = 归母净利润 + 少数股东损益