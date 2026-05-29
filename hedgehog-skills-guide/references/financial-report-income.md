# 财务报表-利润表：数据字段及说明

## 输出字段

| 名称                         | 类型  | 默认显示 | 描述                                 |
| ------------------------------ | ------- | ---------- | -------------------------------------- |
| ts\_code                     | str   | Y        | TS股票代码                               |
| ann\_date                    | str   | Y        | 公告日期                             |
| f\_ann\_date                 | str   | Y        | 实际公告日期                         |
| end\_date                    | str   | Y        | 报告期                               |
| report\_type                 | str   | Y        | 报告类型 见底部表                    |
| comp\_type                   | str   | Y        | 公司类型(1一般工商业2银行3保险4证券) |
| end\_type                    | str   | Y        | 报告期类型                           |
| basic\_eps                   | float | Y        | 基本每股收益                         |
| diluted\_eps                 | float | Y        | 稀释每股收益                         |
| total\_revenue               | float | Y        | 营业总收入                           |
| revenue                      | float | Y        | 营业收入                             |
| int\_income                  | float | Y        | 利息收入                             |
| prem\_earned                 | float | Y        | 已赚保费                             |
| comm\_income                 | float | Y        | 手续费及佣金收入                     |
| n\_commis\_income            | float | Y        | 手续费及佣金净收入                   |
| n\_oth\_income               | float | Y        | 其他经营净收益                       |
| n\_oth\_b\_income            | float | Y        | 加:其他业务净收益                    |
| prem\_income                 | float | Y        | 保险业务收入                         |
| out\_prem                    | float | Y        | 减:分出保费                          |
| une\_prem\_reser             | float | Y        | 提取未到期责任准备金                 |
| reins\_income                | float | Y        | 其中:分保费收入                      |
| n\_sec\_tb\_income           | float | Y        | 代理买卖证券业务净收入               |
| n\_sec\_uw\_income           | float | Y        | 证券承销业务净收入                   |
| n\_asset\_mg\_income         | float | Y        | 受托客户资产管理业务净收入           |
| oth\_b\_income               | float | Y        | 其他业务收入                         |
| fv\_value\_chg\_gain         | float | Y        | 加:公允价值变动净收益                |
| invest\_income               | float | Y        | 加:投资净收益                        |
| ass\_invest\_income          | float | Y        | 其中:对联营企业和合营企业的投资收益  |
| forex\_gain                  | float | Y        | 加:汇兑净收益                        |
| total\_cogs                  | float | Y        | 营业总成本                           |
| oper\_cost                   | float | Y        | 减:营业成本                          |
| int\_exp                     | float | Y        | 减:利息支出                          |
| comm\_exp                    | float | Y        | 减:手续费及佣金支出                  |
| biz\_tax\_surchg             | float | Y        | 减:营业税金及附加                    |
| sell\_exp                    | float | Y        | 减:销售费用                          |
| admin\_exp                   | float | Y        | 减:管理费用                          |
| fin\_exp                     | float | Y        | 减:财务费用                          |
| assets\_impair\_loss         | float | Y        | 减:资产减值损失                      |
| prem\_refund                 | float | Y        | 退保金                               |
| compens\_payout              | float | Y        | 赔付总支出                           |
| reser\_insur\_liab           | float | Y        | 提取保险责任准备金                   |
| div\_payt                    | float | Y        | 保户红利支出                         |
| reins\_exp                   | float | Y        | 分保费用                             |
| oper\_exp                    | float | Y        | 营业支出                             |
| compens\_payout\_refu        | float | Y        | 减:摊回赔付支出                      |
| insur\_reser\_refu           | float | Y        | 减:摊回保险责任准备金                |
| reins\_cost\_refund          | float | Y        | 减:摊回分保费用                      |
| other\_bus\_cost             | float | Y        | 其他业务成本                         |
| operate\_profit              | float | Y        | 营业利润                             |
| non\_oper\_income            | float | Y        | 加:营业外收入                        |
| non\_oper\_exp               | float | Y        | 减:营业外支出                        |
| nca\_disploss                | float | Y        | 其中:减:非流动资产处置净损失         |
| total\_profit                | float | Y        | 利润总额                             |
| income\_tax                  | float | Y        | 所得税费用                           |
| n\_income                    | float | Y        | 净利润(含少数股东损益)               |
| n\_income\_attr\_p           | float | Y        | 净利润(不含少数股东损益)             |
| minority\_gain               | float | Y        | 少数股东损益                         |
| oth\_compr\_income           | float | Y        | 其他综合收益                         |
| t\_compr\_income             | float | Y        | 综合收益总额                         |
| compr\_inc\_attr\_p          | float | Y        | 归属于母公司(或股东)的综合收益总额   |
| compr\_inc\_attr\_m\_s       | float | Y        | 归属于少数股东的综合收益总额         |
| ebit                         | float | Y        | 息税前利润                           |
| ebitda                       | float | Y        | 息税折旧摊销前利润                   |
| insurance\_exp               | float | Y        | 保险业务支出                         |
| undist\_profit               | float | Y        | 年初未分配利润                       |
| distable\_profit             | float | Y        | 可分配利润                           |
| rd\_exp                      | float | Y        | 研发费用                             |
| fin\_exp\_int\_exp           | float | Y        | 财务费用:利息费用                    |
| fin\_exp\_int\_inc           | float | Y        | 财务费用:利息收入                    |
| transfer\_surplus\_rese      | float | Y        | 盈余公积转入                         |
| transfer\_housing\_imprest   | float | Y        | 住房周转金转入                       |
| transfer\_oth                | float | Y        | 其他转入                             |
| adj\_lossgain                | float | Y        | 调整以前年度损益                     |
| withdra\_legal\_surplus      | float | Y        | 提取法定盈余公积                     |
| withdra\_legal\_pubfund      | float | Y        | 提取法定公益金                       |
| withdra\_biz\_devfund        | float | Y        | 提取企业发展基金                     |
| withdra\_rese\_fund          | float | Y        | 提取储备基金                         |
| withdra\_oth\_ersu           | float | Y        | 提取任意盈余公积金                   |
| workers\_welfare             | float | Y        | 职工奖金福利                         |
| distr\_profit\_shrhder       | float | Y        | 可供股东分配的利润                   |
| prfshare\_payable\_dvd       | float | Y        | 应付优先股股利                       |
| comshare\_payable\_dvd       | float | Y        | 应付普通股股利                       |
| capit\_comstock\_div         | float | Y        | 转作股本的普通股股利                 |
| net\_after\_nr\_lp\_correct  | float | N        | 扣除非经常性损益后的净利润（更正前） |
| credit\_impa\_loss           | float | N        | 信用减值损失                         |
| net\_expo\_hedging\_benefits | float | N        | 净敞口套期收益                       |
| oth\_impair\_loss\_assets    | float | N        | 其他资产减值损失                     |
| total\_opcost                | float | N        | 营业总成本（二）                     |
| amodcost\_fin\_assets        | float | N        | 以摊余成本计量的金融资产终止确认收益 |
| oth\_income                  | float | N        | 其他收益                             |
| asset\_disp\_income          | float | N        | 资产处置收益                         |
| continued\_net\_profit       | float | N        | 持续经营净利润                       |
| end\_net\_profit             | float | N        | 终止经营净利润                       |
| update\_flag                 | str   | Y        | 更新标识                             |

report\_type说明

| 代码 | 类型 | 说明 |
---- | ----- | ---- |
| 1 | 合并报表 | 上市公司最新报表（默认） |
| 2 | 单季合并 | 单一季度的合并报表 |
| 3 | 调整单季合并表 | 调整后的单季合并报表（如果有） |
| 4 | 调整合并报表 | 本年度公布上年同期的财务报表数据，报告期为上年度 |
| 5 | 调整前合并报表 | 数据发生变更，将原数据进行保留，即调整前的原数据 |
| 6 | 母公司报表 | 该公司母公司的财务报表数据 |
| 7 | 母公司单季表 | 母公司的单季度表 |
| 8 | 母公司调整单季表 | 母公司调整后的单季表 |
| 9 | 母公司调整表 | 该公司母公司的本年度公布上年同期的财务报表数据 |
| 10 | 母公司调整前报表 | 母公司调整之前的原始财务报表数据 |
| 11 | 母公司调整前合并报表 | 母公司调整之前合并报表原数据 |
| 12 | 母公司调整前报表 | 母公司报表发生变更前保留的原数据 |

## 财务报表相关知识说明

### 一般工商业利润表逻辑结构 (comp_type = 1)
一般工商业的核心逻辑是围绕“产品/服务”的销售、制造和期间费用展开。
[ = ] 一级：operate_profit (营业利润)
    [ + ] 二级：total_revenue (营业总收入)
        [ = ] 三级：revenue (营业收入)
    [ - ] 二级：total_cogs (营业总成本)
        [ + ] 三级：oper_cost (营业成本)
        [ + ] 三级：biz_tax_surchg (营业税金及附加)
        [ + ] 三级：sell_exp (销售费用)
        [ + ] 三级：admin_exp (管理费用)
        [ + ] 三级：fin_exp (财务费用) $\rightarrow$ 下设：fin_exp_int_exp(利息支出)、- fin_exp_int_inc(利息收入)
        [ + ] 三级：rd_exp (研发费用)
        [ + ] 三级：assets_impair_loss (资产减值损失)
        [ + ] 三级：credit_impa_loss (信用减值损失)
        [ + ] 三级：oth_impair_loss_assets (其他资产减值损失)
    [ + ] 二级：其他经营收益（净额）
        [ + ] 三级：invest_income (投资净收益) $\rightarrow$ 包含：ass_invest_income(联营/合营企业收益)
        [ + ] 三级：fv_value_chg_gain (公允价值变动净收益)
        [ + ] 三级：forex_gain (汇兑净收益)
        [ + ] 三级：oth_income (其他收益)
        [ + ] 三级：asset_disp_income (资产处置收益)
        [ + ] 三级：net_expo_hedging_benefits (净敞口套期收益)
        [ + ] 三级：n_oth_b_income (其他业务净收益) $\rightarrow$ 由 oth_b_income(收入) - other_bus_cost(成本) 构成

### 银行利润表逻辑结构 (comp_type = 2)
银行的核心逻辑是“利息净收入”与“手续费净收入”双轮驱动，且风险拨备（信用减值）对利润影响极大。
[ = ] 一级：operate_profit (营业利润)
    [ + ] 二级：利息净收入（衍生核心，数据源于总收入/总成本）
        [ + ] 三级：int_income (利息收入)
        [ - ] 三级：int_exp (利息支出)
    [ + ] 二级：n_commis_income（手续费及佣金净收入）
        [ + ] 三级：comm_income (手续费及佣金收入)
        [ - ] 三级：comm_exp (手续费及佣金支出)
    [ + ] 二级：其他中后台经营收益（净额）
        [ + ] 三级：invest_income (投资净收益) $\rightarrow$ 包含：amodcost_fin_assets(摊余成本金融资产终止确认收益)
        [ + ] 三级：fv_value_chg_gain (公允价值变动净收益)
        [ + ] 三级：forex_gain (汇兑净收益)
        [ + ] 三级：oth_income (其他收益)
        [ + ] 三级：asset_disp_income (资产处置收益)
    [ - ] 二级：运营及风险成本
        [ + ] 三级：admin_exp (管理费用) (注：银行通常无标准销售费用，统称业务及管理费)
        [ + ] 三级：biz_tax_surchg (营业税金及附加)
        [ + ] 三级：credit_impa_loss (信用减值损失) (注：即贷款损失准备/拨备计提，银行核心放大器)
        [ + ] 三级：assets_impair_loss (资产减值损失)

### 保险利润表逻辑结构 (comp_type = 3)
保险的核心逻辑是“保费收入”减去“赔付与准备金提存”，再叠加“保险资金运用（投资收益）”。
[ = ] 一级：operate_profit (营业利润)
    [ + ] 二级：prem_earned（已赚保费)
        [ + ] 三级：prem_income (保险业务收入)
        [ - ] 三级：out_prem (分出保费)
        [ - ] 三级：une_prem_reser (提取未到期责任准备金)
    [ + ] 二级：reins_income (分保费收入)
    [ + ] 二级：投资与大类大资金收益
        [ + ] 三级：invest_income (投资净收益)
        [ + ] 三级：fv_value_chg_gain (公允价值变动净收益)
    [ - ] 二级：insurance_exp (保险业务支出)
        [ + ] 三级：compens_payout (赔付总支出) $\rightarrow$ 减项：- compens_payout_refu(摊回赔付支出)
        [ + ] 三级：reser_insur_liab (提取保险责任准备金) $\rightarrow$ 减项：- insur_reser_refu(摊回保险责任准备金)
        [ + ] 三级：reins_exp (分保费用) $\rightarrow$ 减项：- reins_cost_refund(摊回分保费用)
        [ + ] 三级：prem_refund (退保金)
        [ + ] 三级：div_payt (保户红利支出)
    [ - ] 二级：中后台期间费用与减值
        [ + ] 三级：sell_exp (销售费用) (注：主要是手续费及佣金支出)
        [ + ] 三级：admin_exp (管理费用)
        [ + ] 三级：biz_tax_surchg (营业税金及附加)
        [ + ] 三级：credit_impa_loss / assets_impair_loss (减值损失)

### 证券利润表逻辑结构 (comp_type = 4)
证券（券商）的核心逻辑是通道业务（经纪、投行、资管）的手续费净收入，加上自营业务（投资/公允变动）和信用业务（利息净收入）。
[ = ] 一级：operate_profit (营业利润)
    [ + ] 二级：手续费及佣金净收入（券商三大传统支柱）
        [ + ] 三级：n_sec_tb_income (代理买卖证券业务净收入) (经纪业务)
        [ + ] 三级：n_sec_uw_income (证券承销业务净收入) (投行业务)
        [ + ] 三级：n_asset_mg_income (受托客户资产管理业务净收入) (资管业务)
    [ + ] 二级：利息净收入（信用业务：两融及股票质押）
        [ + ] 三级：int_income (利息收入)
        [ - ] 三级：int_exp (利息支出)
    [ + ] 二级：自营及资金交易收益
        [ + ] 三级：invest_income (投资净收益)
        [ + ] 三级：fv_value_chg_gain (公允价值变动净收益)
        [ + ] 三级：forex_gain (汇兑净收益)
    [ - ] 二级：total_cogs / oper_exp (营业支出)
        [ + ] 三级：admin_exp (管理费用) (券商核心支出，含常年高额的人力成本)
        [ + ] 三级：biz_tax_surchg (营业税金及附加)
        [ + ] 三级：credit_impa_loss (信用减值损失) (注：主要针对两融及股票质押业务的违约计提)

### 通用：从“营业利润”到“综合收益”的汇总
无论何种行业（comp_type 1~4），在计算出 operate_profit (营业利润) 后，向下通往净利润和综合收益的会计加减路径完全一致：
[ = ] operate_profit (营业利润)
    [ + ] non_oper_income (营业外收入)
    [ - ] non_oper_exp (营业外支出)  --> (含三级：nca_disploss 非流动资产处置净损失)
[ = ] total_profit (利润总额)
    [ - ] income_tax (所得税费用)
[ = ] n_income (净利润，含少数股东损益)
    ├── [ 分拆 ] continued_net_profit (持续经营净利润) + end_net_profit (终止经营净利润)
    └── [ 分拆 ] n_income_attr_p (归母净利润) + minority_gain (少数股东损益)

最终复原全貌（综合收益表）：
[ = ] n_income (净利润)
    [ + ] oth_compr_income (其他综合收益)
[ = ] t_compr_income (综合收益总额)
    └── [ 分拆 ] compr_inc_attr_p (归母综合收益) + compr_inc_attr_m_s (少数股东综合收益)

