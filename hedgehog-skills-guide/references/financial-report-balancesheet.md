# 财务报表-资产负债表：数据字段及说明

## 输出字段

| 名称                            | 类型  | 默认显示 | 描述                                             |
| --------------------------------- | ------- | ---------- | -------------------------------------------------- |
| ts\_code                        | str   | Y        | TS股票代码                                       |
| ann\_date                       | str   | Y        | 公告日期                                         |
| f\_ann\_date                    | str   | Y        | 实际公告日期                                     |
| end\_date                       | str   | Y        | 报告期                                           |
| report\_type                    | str   | Y        | 报表类型                                         |
| comp\_type                      | str   | Y        | 公司类型(1一般工商业2银行3保险4证券)             |
| end\_type                       | str   | Y        | 报告期类型                                       |
| total\_share                    | float | Y        | 期末总股本                                       |
| cap\_rese                       | float | Y        | 资本公积金                                       |
| undistr\_porfit                 | float | Y        | 未分配利润                                       |
| surplus\_rese                   | float | Y        | 盈余公积金                                       |
| special\_rese                   | float | Y        | 专项储备                                         |
| money\_cap                      | float | Y        | 货币资金                                         |
| trad\_asset                     | float | Y        | 交易性金融资产                                   |
| notes\_receiv                   | float | Y        | 应收票据                                         |
| accounts\_receiv                | float | Y        | 应收账款                                         |
| oth\_receiv                     | float | Y        | 其他应收款                                       |
| prepayment                      | float | Y        | 预付款项                                         |
| div\_receiv                     | float | Y        | 应收股利                                         |
| int\_receiv                     | float | Y        | 应收利息                                         |
| inventories                     | float | Y        | 存货                                             |
| amor\_exp                       | float | Y        | 待摊费用                                         |
| nca\_within\_1y                 | float | Y        | 一年内到期的非流动资产                           |
| sett\_rsrv                      | float | Y        | 结算备付金                                       |
| loanto\_oth\_bank\_fi           | float | Y        | 拆出资金                                         |
| premium\_receiv                 | float | Y        | 应收保费                                         |
| reinsur\_receiv                 | float | Y        | 应收分保账款                                     |
| reinsur\_res\_receiv            | float | Y        | 应收分保合同准备金                               |
| pur\_resale\_fa                 | float | Y        | 买入返售金融资产                                 |
| oth\_cur\_assets                | float | Y        | 其他流动资产                                     |
| total\_cur\_assets              | float | Y        | 流动资产合计                                     |
| fa\_avail\_for\_sale            | float | Y        | 可供出售金融资产                                 |
| htm\_invest                     | float | Y        | 持有至到期投资                                   |
| lt\_eqt\_invest                 | float | Y        | 长期股权投资                                     |
| invest\_real\_estate            | float | Y        | 投资性房地产                                     |
| time\_deposits                  | float | Y        | 定期存款                                         |
| oth\_assets                     | float | Y        | 其他资产                                         |
| lt\_rec                         | float | Y        | 长期应收款                                       |
| fix\_assets                     | float | Y        | 固定资产                                         |
| cip                             | float | Y        | 在建工程                                         |
| const\_materials                | float | Y        | 工程物资                                         |
| fixed\_assets\_disp             | float | Y        | 固定资产清理                                     |
| produc\_bio\_assets             | float | Y        | 生产性生物资产                                   |
| oil\_and\_gas\_assets           | float | Y        | 油气资产                                         |
| intan\_assets                   | float | Y        | 无形资产                                         |
| r\_and\_d                       | float | Y        | 研发支出                                         |
| goodwill                        | float | Y        | 商誉                                             |
| lt\_amor\_exp                   | float | Y        | 长期待摊费用                                     |
| defer\_tax\_assets              | float | Y        | 递延所得税资产                                   |
| decr\_in\_disbur                | float | Y        | 发放贷款及垫款                                   |
| oth\_nca                        | float | Y        | 其他非流动资产                                   |
| total\_nca                      | float | Y        | 非流动资产合计                                   |
| cash\_reser\_cb                 | float | Y        | 现金及存放中央银行款项                           |
| depos\_in\_oth\_bfi             | float | Y        | 存放同业和其它金融机构款项                       |
| prec\_metals                    | float | Y        | 贵金属                                           |
| deriv\_assets                   | float | Y        | 衍生金融资产                                     |
| rr\_reins\_une\_prem            | float | Y        | 应收分保未到期责任准备金                         |
| rr\_reins\_outstd\_cla          | float | Y        | 应收分保未决赔款准备金                           |
| rr\_reins\_lins\_liab           | float | Y        | 应收分保寿险责任准备金                           |
| rr\_reins\_lthins\_liab         | float | Y        | 应收分保长期健康险责任准备金                     |
| refund\_depos                   | float | Y        | 存出保证金                                       |
| ph\_pledge\_loans               | float | Y        | 保户质押贷款                                     |
| refund\_cap\_depos              | float | Y        | 存出资本保证金                                   |
| indep\_acct\_assets             | float | Y        | 独立账户资产                                     |
| client\_depos                   | float | Y        | 其中：客户资金存款                               |
| client\_prov                    | float | Y        | 其中：客户备付金                                 |
| transac\_seat\_fee              | float | Y        | 其中:交易席位费                                  |
| invest\_as\_receiv              | float | Y        | 应收款项类投资                                   |
| total\_assets                   | float | Y        | 资产总计                                         |
| lt\_borr                        | float | Y        | 长期借款                                         |
| st\_borr                        | float | Y        | 短期借款                                         |
| cb\_borr                        | float | Y        | 向中央银行借款                                   |
| depos\_ib\_deposits             | float | Y        | 吸收存款及同业存放                               |
| loan\_oth\_bank                 | float | Y        | 拆入资金                                         |
| trading\_fl                     | float | Y        | 交易性金融负债                                   |
| notes\_payable                  | float | Y        | 应付票据                                         |
| acct\_payable                   | float | Y        | 应付账款                                         |
| adv\_receipts                   | float | Y        | 预收款项                                         |
| sold\_for\_repur\_fa            | float | Y        | 卖出回购金融资产款                               |
| comm\_payable                   | float | Y        | 应付手续费及佣金                                 |
| payroll\_payable                | float | Y        | 应付职工薪酬                                     |
| taxes\_payable                  | float | Y        | 应交税费                                         |
| int\_payable                    | float | Y        | 应付利息                                         |
| div\_payable                    | float | Y        | 应付股利                                         |
| oth\_payable                    | float | Y        | 其他应付款                                       |
| acc\_exp                        | float | Y        | 预提费用                                         |
| deferred\_inc                   | float | Y        | 递延收益                                         |
| st\_bonds\_payable              | float | Y        | 应付短期债券                                     |
| payable\_to\_reinsurer          | float | Y        | 应付分保账款                                     |
| rsrv\_insur\_cont               | float | Y        | 保险合同准备金                                   |
| acting\_trading\_sec            | float | Y        | 代理买卖证券款                                   |
| acting\_uw\_sec                 | float | Y        | 代理承销证券款                                   |
| non\_cur\_liab\_due\_1y         | float | Y        | 一年内到期的非流动负债                           |
| oth\_cur\_liab                  | float | Y        | 其他流动负债                                     |
| total\_cur\_liab                | float | Y        | 流动负债合计                                     |
| bond\_payable                   | float | Y        | 应付债券                                         |
| lt\_payable                     | float | Y        | 长期应付款                                       |
| specific\_payables              | float | Y        | 专项应付款                                       |
| estimated\_liab                 | float | Y        | 预计负债                                         |
| defer\_tax\_liab                | float | Y        | 递延所得税负债                                   |
| defer\_inc\_non\_cur\_liab      | float | Y        | 递延收益-非流动负债                              |
| oth\_ncl                        | float | Y        | 其他非流动负债                                   |
| total\_ncl                      | float | Y        | 非流动负债合计                                   |
| depos\_oth\_bfi                 | float | Y        | 同业和其它金融机构存放款项                       |
| deriv\_liab                     | float | Y        | 衍生金融负债                                     |
| depos                           | float | Y        | 吸收存款                                         |
| agency\_bus\_liab               | float | Y        | 代理业务负债                                     |
| oth\_liab                       | float | Y        | 其他负债                                         |
| prem\_receiv\_adva              | float | Y        | 预收保费                                         |
| depos\_received                 | float | Y        | 存入保证金                                       |
| ph\_invest                      | float | Y        | 保户储金及投资款                                 |
| reser\_une\_prem                | float | Y        | 未到期责任准备金                                 |
| reser\_outstd\_claims           | float | Y        | 未决赔款准备金                                   |
| reser\_lins\_liab               | float | Y        | 寿险责任准备金                                   |
| reser\_lthins\_liab             | float | Y        | 长期健康险责任准备金                             |
| indept\_acc\_liab               | float | Y        | 独立账户负债                                     |
| pledge\_borr                    | float | Y        | 其中:质押借款                                    |
| indem\_payable                  | float | Y        | 应付赔付款                                       |
| policy\_div\_payable            | float | Y        | 应付保单红利                                     |
| total\_liab                     | float | Y        | 负债合计                                         |
| treasury\_share                 | float | Y        | 减:库存股                                        |
| ordin\_risk\_reser              | float | Y        | 一般风险准备                                     |
| forex\_differ                   | float | Y        | 外币报表折算差额                                 |
| invest\_loss\_unconf            | float | Y        | 未确认的投资损失                                 |
| minority\_int                   | float | Y        | 少数股东权益                                     |
| total\_hldr\_eqy\_exc\_min\_int | float | Y        | 股东权益合计(不含少数股东权益)                   |
| total\_hldr\_eqy\_inc\_min\_int | float | Y        | 股东权益合计(含少数股东权益)                     |
| total\_liab\_hldr\_eqy          | float | Y        | 负债及股东权益总计                               |
| lt\_payroll\_payable            | float | Y        | 长期应付职工薪酬                                 |
| oth\_comp\_income               | float | Y        | 其他综合收益                                     |
| oth\_eqt\_tools                 | float | Y        | 其他权益工具                                     |
| oth\_eqt\_tools\_p\_shr         | float | Y        | 其他权益工具(优先股)                             |
| lending\_funds                  | float | Y        | 融出资金                                         |
| acc\_receivable                 | float | Y        | 应收款项                                         |
| st\_fin\_payable                | float | Y        | 应付短期融资款                                   |
| payables                        | float | Y        | 应付款项                                         |
| hfs\_assets                     | float | Y        | 持有待售的资产                                   |
| hfs\_sales                      | float | Y        | 持有待售的负债                                   |
| cost\_fin\_assets               | float | Y        | 以摊余成本计量的金融资产                         |
| fair\_value\_fin\_assets        | float | Y        | 以公允价值计量且其变动计入其他综合收益的金融资产 |
| cip\_total                      | float | Y        | 在建工程(合计)(元)                               |
| oth\_pay\_total                 | float | Y        | 其他应付款(合计)(元)                             |
| long\_pay\_total                | float | Y        | 长期应付款(合计)(元)                             |
| debt\_invest                    | float | Y        | 债权投资(元)                                     |
| oth\_debt\_invest               | float | Y        | 其他债权投资(元)                                 |
| oth\_eq\_invest                 | float | N        | 其他权益工具投资(元)                             |
| oth\_illiq\_fin\_assets         | float | N        | 其他非流动金融资产(元)                           |
| oth\_eq\_ppbond                 | float | N        | 其他权益工具:永续债(元)                          |
| receiv\_financing               | float | N        | 应收款项融资                                     |
| use\_right\_assets              | float | N        | 使用权资产                                       |
| lease\_liab                     | float | N        | 租赁负债                                         |
| contract\_assets                | float | Y        | 合同资产                                         |
| contract\_liab                  | float | Y        | 合同负债                                         |
| accounts\_receiv\_bill          | float | Y        | 应收票据及应收账款                               |
| accounts\_pay                   | float | Y        | 应付票据及应付账款                               |
| oth\_rcv\_total                 | float | Y        | 其他应收款(合计)（元）                           |
| fix\_assets\_total              | float | Y        | 固定资产(合计)(元)                               |
| update\_flag                    | str   | Y        | 更新标识                                         |


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

### 一般工商业资产负债表逻辑结构 (comp_type = 1)
一般工商业围绕“供应链与生产制造”展开，重点在于营运资金循环（存货、应收、应付）与重资产固定资产。关注存货贬值、固定资产折旧、负债结构和期限错配风险。

1. 资产端 (Assets)

[ = ] 一级：total_assets (资产总计)
    [ + ] 二级：total_cur_assets (流动资产合计)
        [ + ] 三级：money_cap (货币资金)
        [ + ] 三级：trad_asset (交易性金融资产)
        [ + ] 三级：accounts_receiv_bill (应收票据及应收账款) --> (含三级：notes_receiv 应收票据、accounts_receiv 应收账款)
        [ + ] 三级：receiv_financing (应收款项融资)
        [ + ] 三级：prepayment (预付款项)
        [ + ] 三级：contract_assets (合同资产)
        [ + ] 三级：oth_rcv_total (其他应收款-合计) --> (含三级：oth_receiv 其他应收款、div_receiv 应收股利、int_receiv 应收利息)
        [ + ] 三级：inventories (存货)
        [ + ] 三级：hfs_assets (持有待售的资产)
        [ + ] 三级：nca_within_1y (一年内到期的非流动资产)
        [ + ] 三级：oth_cur_assets (其他流动资产)
    [ + ] 二级：total_nca (非流动资产合计)
        [ + ] 三级：debt_invest (债权投资)
        [ + ] 三级：oth_debt_invest (其他债权投资)
        [ + ] 三级：lt_eqt_invest (长期股权投资)
        [ + ] 三级：oth_eq_invest (其他权益工具投资)
        [ + ] 三级：invest_real_estate (投资性房地产)
        [ + ] 三级：fix_assets_total (固定资产-合计) --> (含三级：fix_assets 固定资产、fixed_assets_disp 固定资产清理)
        [ + ] 三级：cip_total (在建工程-合计) --> (含三级：cip 在建工程、const_materials 工程物资)
        [ + ] 三级：produc_bio_assets (生产性生物资产)
        [ + ] 三级：use_right_assets (使用权资产)
        [ + ] 三级：intan_assets (无形资产)
        [ + ] 三级：r_and_d (研发支出)
        [ + ] 三级：goodwill (商誉)
        [ + ] 三级：lt_amor_exp (长期待摊费用)
        [ + ] 三级：defer_tax_assets (递延所得税资产)
        [ + ] 三级：oth_nca (其他非流动资产)

2. 负债与权益端 (Liabilities & Equity)


[ = ] 一级：total_liab_hldr_eqy (负债及股东权益总计)
    [ + ] 二级：total_cur_liab (流动负债合计)
        [ + ] 三级：st_borr (短期借款)
        [ + ] 三级：trading_fl (交易性金融负债)
        [ + ] 三级：accounts_pay (应付票据及应付账款) --> (含三级：notes_payable 应付票据、acct_payable 应付账款)
        [ + ] 三级：contract_liab (合同负债)
        [ + ] 三级：adv_receipts (预收款项)
        [ + ] 三级：payroll_payable (应付职工薪酬)
        [ + ] 三级：taxes_payable (应交税费)
        [ + ] 三级：oth_pay_total (其他应付款-合计) --> (含三级：oth_payable 其他应付款、div_payable 应付股利、int_payable 应付利息)
        [ + ] 三级：hfs_sales (持有待售的负债)
        [ + ] 三级：non_cur_liab_due_1y (一年内到期的非流动负债)
        [ + ] 三级：oth_cur_liab (其他流动负债)
    [ + ] 二级：total_ncl (非流动负债合计)
        [ + ] 三级：lt_borr (长期借款)
        [ + ] 三级：bond_payable (应付债券)
        [ + ] 三级：lease_liab (租赁负债)
        [ + ] 三级：long_pay_total (长期应付款-合计) --> (含三级：lt_payable 长期应付款、specific_payables 专项应付款)
        [ + ] 三级：estimated_liab (预计负债)
        [ + ] 三级：defer_tax_liab (递延所得税负债)
        [ + ] 三级：defer_inc_non_cur_liab (递延收益-非流动负债)
        [ + ] 三级：oth_ncl (其他非流动负债)
    [ + ] 二级：total_hldr_eqy_inc_min_int (股东权益合计-含少数股东权益)
        [ = ] 三级：total_hldr_eqy_exc_min_int (股东权益合计-不含少数股东权益)
            └── [ 内部大类 ] + total_share (期末总股本) + cap_rese (资本公积金) + surplus_rese (盈余公积金) + undistr_porfit (未分配利润) + special_rese (专项储备) + oth_comp_income (其他综合收益) + oth_eqt_tools (其他权益工具) - treasury_share (库存股)
        [ + ] 三级：minority_int (少数股东权益)

### 银行资产负债表逻辑结构 (comp_type = 2)
银行由于不区分“流动与非流动”，资产端核心是“贷出去的钱与投资”，负债端核心是“吸收的存款”。关注贷款变成不良资产/坏账风险。

1. 资产端 (Assets)

[ = ] 一级：total_assets (资产总计)
    [ + ] 二级：现金及生息资产基座
        [ + ] 三级：cash_reser_cb (现金及存放中央银行款项)
        [ + ] 三级：depos_in_oth_bfi (存放同业和其它金融机构款项)
        [ + ] 三级：loanto_oth_bank_fi (拆出资金)
        [ + ] 三级：prec_metals (贵金属)
    [ + ] 二级：decr_in_disbur (发放贷款及垫款 - 银行核心生息资产)
    [ + ] 二级：金融投资与衍生品大类
        [ + ] 三级：trad_asset (交易性金融资产)
        [ + ] 三级：deriv_assets (衍生金融资产)
        [ + ] 三级：cost_fin_assets (以摊余成本计量的金融资产)
        [ + ] 三级：fair_value_fin_assets (以公允价值计量且其变动计入其他综合收益的金融资产)
        [ + ] 三级：invest_as_receiv (应收款项类投资)
    [ + ] 二级：中后台基础资产（同工商业二级组件）
        [ + ] 三级：fix_assets_total + lt_eqt_invest + goodwill + defer_tax_assets + oth_assets (其他资产)

2. 负债与权益端 (Liabilities & Equity)

[ = ] 一级：total_liab_hldr_eqy (负债及股东权益总计)
    [ + ] 二级：total_liab (负债合计)
        [ + ] 三级：cb_borr (向中央银行借款)
        [ + ] 三级：depos_ib_deposits (吸收存款及同业存放) --> (注：大口径，含同业存放 `depos_oth_bfi`)
        [ + ] 三级：depos (吸收存款 - 银行核心负债)
        [ + ] 三级：loan_oth_bank (拆入资金)
        [ + ] 三级：trading_fl (交易性金融负债)
        [ + ] 三级：deriv_liab (衍生金融负债)
        [ + ] 三级：sold_for_repur_fa (卖出回购金融资产款)
        [ + ] 三级：st_bonds_payable (应付短期债券) / bond_payable (应付债券)
        [ + ] 三级：taxes_payable + payroll_payable + estimated_liab + defer_tax_liab + oth_liab
    [ + ] 二级：股东权益体系（同工商业，但多出一项核心计提）
        [ + ] 三级：ordin_risk_reser (一般风险准备 - 金融机构强制计提缓冲)

### 保险资产负债表逻辑结构 (comp_type = 3)
保险资产端的核心是“保费资金运用（大类投资）”，负债端的核心是“准备金（未来的赔付义务）”。关注投资组合遭遇系统性暴跌风险。

1. 资产端 (Assets)

[ = ] 一级：total_assets (资产总计)
    [ + ] 二 =：保险特有应收与准备金资产
        [ + ] 三级：premium_receiv (应收保费)
        [ + ] 三级：reinsur_receiv (应收分保账款)
        [ + ] 三级：ph_pledge_loans (保户质押贷款)
        [ + ] 三级：refund_depos (存出保证金) / refund_cap_depos (存出资本保证金)
        [ + ] 三级：应收分保准备金合计
            └── [ 内部包含 ] + rr_reins_une_prem (应收分保未到期责任准备金) + rr_reins_outstd_cla (应收分保未决赔款准备金) + rr_reins_lins_liab (应收分保寿险责任准备金) + rr_reins_lthins_liab (应收分保长期健康险责任准备金)
    [ + ] 二级：大类资产投资组合（同银行/通用金融资产）
        [ + ] 三级：trad_asset + fair_value_fin_assets + cost_fin_assets + lt_eqt_invest + invest_real_estate
    [ + ] 二级：独立核算资产
        [ + ] 三级：indep_acct_assets (独立账户资产 - 投连险等专属资产)

2. 负债与权益端 (Liabilities & Equity)

[ = ] 一级：total_liab_hldr_eqy (负债及股东权益总计)
    [ + ] 二级：total_liab (负债合计)
        [ + ] 三级：rsrv_insur_cont (保险合同准备金 - 保险业最核心负债)
            └── [ 内部包含 ] + reser_une_prem (未到期责任准备金) + reser_outstd_claims (未决赔款准备金) + reser_lins_liab (寿险责任准备金) + reser_lthins_liab (长期健康险责任准备金)
        [ + ] 三级：保户相关负债
            └── [ 内部包含 ] + prem_receiv_adva (预收保费) + ph_invest (保户储金及投资款) + policy_div_payable (应付保单红利) + indem_payable (应付赔付款)
        [ + ] 三级：payable_to_reinsurer (应付分保账款) / depos_received (存入保证金)
        [ + ] 三级：indept_acc_liab (独立账户负债)
        [ + ] 三级：通用金融负债 (st_borr + lt_borr + bond_payable + sold_for_repur_fa)
    [ + ] 二级：股东权益体系（通用结构，含少数股东及一般风险准备）

### 证券（券商）资产负债表逻辑结构 (comp_type = 4)
券商资产负债表的最大特征是包含大量“客户影子资金”（代买卖证券款），在分析和建模时，通常需要将“客户资金”与“券商自营资金”进行剥离。关注自营盘踩雷、两融客户爆仓风险。

1. 资产端 (Assets)

[ = ] 一级：total_assets (资产总计)
    [ + ] 二级：lending_funds (融出资金 - 券商两融业务核心生息资产)
    [ + ] 二级：券商特有结算与席位资产
        [ + ] 三级：sett_rsrv (结算备付金) 
            └── [ 内部重点 ] client_prov (其中：客户备付金 - 属于客户，非券商自营)
        [ + ] 三级：money_cap (货币资金)
            └── [ 内部重点 ] client_depos (其中：客户资金存款 - 属于客户，非券商自营)
        [ + ] 三级：transac_seat_fee (其中:交易席位费)
    [ + ] 二级：自营重资产交易盘
        [ + ] 三级：trad_asset (交易性金融资产) + fair_value_fin_assets + cost_fin_assets + pur_resale_fa (买入返售金融资产)
    [ + ] 二级：中后台基础资产 (fix_assets_total + intan_assets + goodwill)

2. 负债与权益端 (Liabilities & Equity)

[ = ] 一级：total_liab_hldr_eqy (负债及股东权益总计)
    [ + ] 二级：total_liab (负债合计)
        [ + ] 三级：代理业务及客户留存负债（与资产端客户资金严格对账）
            ├── 三级：acting_trading_sec (代理买卖证券款 - 券商核心负债，对应客户资产)
            ├── 三级：acting_uw_sec (代理承销证券款)
            └── 三级：agency_bus_liab (代理业务负债)
        [ + ] 三级：自营及信用加杠杆负债
            ├── 三级：st_fin_payable (应付短期融资款 - 券商特有短期流动性工具)
            ├── 三级：sold_for_repur_fa (卖出回购金融资产款 - 券商质押回购加杠杆核心)
            └── 三级：loan_oth_bank (拆入资金) / st_borr / bond_payable
    [ + ] 二级：股东权益体系（通用结构，券商需强制计提 `ordin_risk_reser` 一般风险准备）