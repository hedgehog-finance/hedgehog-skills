# 财务报表-现金流量表：数据字段及说明

## 输出字段

| 名称                            | 类型  | 默认显示 | 描述                                               |
| --------------------------------- | ------- | ---------- | ---------------------------------------------------- |
| ts\_code                        | str   | Y        | TS股票代码                                         |
| ann\_date                       | str   | Y        | 公告日期                                           |
| f\_ann\_date                    | str   | Y        | 实际公告日期                                       |
| end\_date                       | str   | Y        | 报告期                                             |
| comp\_type                      | str   | Y        | 公司类型(1一般工商业2银行3保险4证券)               |
| report\_type                    | str   | Y        | 报表类型                                           |
| end\_type                       | str   | Y        | 报告期类型                                         |
| net\_profit                     | float | Y        | 净利润                                             |
| finan\_exp                      | float | Y        | 财务费用                                           |
| c\_fr\_sale\_sg                 | float | Y        | 销售商品、提供劳务收到的现金                       |
| recp\_tax\_rends                | float | Y        | 收到的税费返还                                     |
| n\_depos\_incr\_fi              | float | Y        | 客户存款和同业存放款项净增加额                     |
| n\_incr\_loans\_cb              | float | Y        | 向中央银行借款净增加额                             |
| n\_inc\_borr\_oth\_fi           | float | Y        | 向其他金融机构拆入资金净增加额                     |
| prem\_fr\_orig\_contr           | float | Y        | 收到原保险合同保费取得的现金                       |
| n\_incr\_insured\_dep           | float | Y        | 保户储金净增加额                                   |
| n\_reinsur\_prem                | float | Y        | 收到再保业务现金净额                               |
| n\_incr\_disp\_tfa              | float | Y        | 处置交易性金融资产净增加额                         |
| ifc\_cash\_incr                 | float | Y        | 收取利息和手续费净增加额                           |
| n\_incr\_disp\_faas             | float | Y        | 处置可供出售金融资产净增加额                       |
| n\_incr\_loans\_oth\_bank       | float | Y        | 拆入资金净增加额                                   |
| n\_cap\_incr\_repur             | float | Y        | 回购业务资金净增加额                               |
| c\_fr\_oth\_operate\_a          | float | Y        | 收到其他与经营活动有关的现金                       |
| c\_inf\_fr\_operate\_a          | float | Y        | 经营活动现金流入小计                               |
| c\_paid\_goods\_s               | float | Y        | 购买商品、接受劳务支付的现金                       |
| c\_paid\_to\_for\_empl          | float | Y        | 支付给职工以及为职工支付的现金                     |
| c\_paid\_for\_taxes             | float | Y        | 支付的各项税费                                     |
| n\_incr\_clt\_loan\_adv         | float | Y        | 客户贷款及垫款净增加额                             |
| n\_incr\_dep\_cbob              | float | Y        | 存放央行和同业款项净增加额                         |
| c\_pay\_claims\_orig\_inco      | float | Y        | 支付原保险合同赔付款项的现金                       |
| pay\_handling\_chrg             | float | Y        | 支付手续费的现金                                   |
| pay\_comm\_insur\_plcy          | float | Y        | 支付保单红利的现金                                 |
| oth\_cash\_pay\_oper\_act       | float | Y        | 支付其他与经营活动有关的现金                       |
| st\_cash\_out\_act              | float | Y        | 经营活动现金流出小计                               |
| n\_cashflow\_act                | float | Y        | 经营活动产生的现金流量净额                         |
| oth\_recp\_ral\_inv\_act        | float | Y        | 收到其他与投资活动有关的现金                       |
| c\_disp\_withdrwl\_invest       | float | Y        | 收回投资收到的现金                                 |
| c\_recp\_return\_invest         | float | Y        | 取得投资收益收到的现金                             |
| n\_recp\_disp\_fiolta           | float | Y        | 处置固定资产、无形资产和其他长期资产收回的现金净额 |
| n\_recp\_disp\_sobu             | float | Y        | 处置子公司及其他营业单位收到的现金净额             |
| stot\_inflows\_inv\_act         | float | Y        | 投资活动现金流入小计                               |
| c\_pay\_acq\_const\_fiolta      | float | Y        | 购建固定资产、无形资产和其他长期资产支付的现金     |
| c\_paid\_invest                 | float | Y        | 投资支付的现金                                     |
| n\_disp\_subs\_oth\_biz         | float | Y        | 取得子公司及其他营业单位支付的现金净额             |
| oth\_pay\_ral\_inv\_act         | float | Y        | 支付其他与投资活动有关的现金                       |
| n\_incr\_pledge\_loan           | float | Y        | 质押贷款净增加额                                   |
| stot\_out\_inv\_act             | float | Y        | 投资活动现金流出小计                               |
| n\_cashflow\_inv\_act           | float | Y        | 投资活动产生的现金流量净额                         |
| c\_recp\_borrow                 | float | Y        | 取得借款收到的现金                                 |
| proc\_issue\_bonds              | float | Y        | 发行债券收到的现金                                 |
| oth\_cash\_recp\_ral\_fnc\_act  | float | Y        | 收到其他与筹资活动有关的现金                       |
| stot\_cash\_in\_fnc\_act        | float | Y        | 筹资活动现金流入小计                               |
| free\_cashflow                  | float | Y        | 企业自由现金流量                                   |
| c\_prepay\_amt\_borr            | float | Y        | 偿还债务支付的现金                                 |
| c\_pay\_dist\_dpcp\_int\_exp    | float | Y        | 分配股利、利润或偿付利息支付的现金                 |
| incl\_dvd\_profit\_paid\_sc\_ms | float | Y        | 其中:子公司支付给少数股东的股利、利润              |
| oth\_cashpay\_ral\_fnc\_act     | float | Y        | 支付其他与筹资活动有关的现金                       |
| stot\_cashout\_fnc\_act         | float | Y        | 筹资活动现金流出小计                               |
| n\_cash\_flows\_fnc\_act        | float | Y        | 筹资活动产生的现金流量净额                         |
| eff\_fx\_flu\_cash              | float | Y        | 汇率变动对现金的影响                               |
| n\_incr\_cash\_cash\_equ        | float | Y        | 现金及现金等价物净增加额                           |
| c\_cash\_equ\_beg\_period       | float | Y        | 期初现金及现金等价物余额                           |
| c\_cash\_equ\_end\_period       | float | Y        | 期末现金及现金等价物余额                           |
| c\_recp\_cap\_contrib           | float | Y        | 吸收投资收到的现金                                 |
| incl\_cash\_rec\_saims          | float | Y        | 其中:子公司吸收少数股东投资收到的现金              |
| uncon\_invest\_loss             | float | Y        | 未确认投资损失                                     |
| prov\_depr\_assets              | float | Y        | 加:资产减值准备                                    |
| depr\_fa\_coga\_dpba            | float | Y        | 固定资产折旧、油气资产折耗、生产性生物资产折旧     |
| amort\_intang\_assets           | float | Y        | 无形资产摊销                                       |
| lt\_amort\_deferred\_exp        | float | Y        | 长期待摊费用摊销                                   |
| decr\_deferred\_exp             | float | Y        | 待摊费用减少                                       |
| incr\_acc\_exp                  | float | Y        | 预提费用增加                                       |
| loss\_disp\_fiolta              | float | Y        | 处置固定、无形资产和其他长期资产的损失             |
| loss\_scr\_fa                   | float | Y        | 固定资产报废损失                                   |
| loss\_fv\_chg                   | float | Y        | 公允价值变动损失                                   |
| invest\_loss                    | float | Y        | 投资损失                                           |
| decr\_def\_inc\_tax\_assets     | float | Y        | 递延所得税资产减少                                 |
| incr\_def\_inc\_tax\_liab       | float | Y        | 递延所得税负债增加                                 |
| decr\_inventories               | float | Y        | 存货的减少                                         |
| decr\_oper\_payable             | float | Y        | 经营性应收项目的减少                               |
| incr\_oper\_payable             | float | Y        | 经营性应付项目的增加                               |
| others                          | float | Y        | 其他                                               |
| im\_net\_cashflow\_oper\_act    | float | Y        | 经营活动产生的现金流量净额(间接法)                 |
| conv\_debt\_into\_cap           | float | Y        | 债务转为资本                                       |
| conv\_copbonds\_due\_within\_1y | float | Y        | 一年内到期的可转换公司债券                         |
| fa\_fnc\_leases                 | float | Y        | 融资租入固定资产                                   |
| im\_n\_incr\_cash\_equ          | float | Y        | 现金及现金等价物净增加额(间接法)                   |
| net\_dism\_capital\_add         | float | Y        | 拆出资金净增加额                                   |
| net\_cash\_rece\_sec            | float | Y        | 代理买卖证券收到的现金净额(元)                     |
| credit\_impa\_loss              | float | Y        | 信用减值损失                                       |
| use\_right\_asset\_dep          | float | Y        | 使用权资产折旧                                     |
| oth\_loss\_asset                | float | Y        | 其他资产减值损失                                   |
| end\_bal\_cash                  | float | Y        | 现金的期末余额                                     |
| beg\_bal\_cash                  | float | Y        | 减:现金的期初余额                                  |
| end\_bal\_cash\_equ             | float | Y        | 加:现金等价物的期末余额                            |
| beg\_bal\_cash\_equ             | float | Y        | 减:现金等价物的期初余额                            |
| update\_flag                    | str   | Y        | 更新标志(1最新）                                   |

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

### 一般工商业现金流量表逻辑结构 (comp_type = 1)

一般工商业紧密围绕营运资金循环、机器设备购建和对外融资展开。

1. 经营活动产生的现金流量 (Direct Method)

[ = ] 一级：n_cashflow_act (经营活动产生的现金流量净额)
    [ + ] 二级：c_inf_fr_operate_a (经营活动现金流入小计)
        [ + ] 三级：c_fr_sale_sg (销售商品、提供劳务收到的现金) --> (工商核心现金血液)
        [ + ] 三级：recp_tax_rends (收到的税费返还)
        [ + ] 三级：c_fr_oth_operate_a (收到其他与经营活动有关的现金)
    [ - ] 二级：st_cash_out_act (经营活动现金流出小计)
        [ + ] 三级：c_paid_goods_s (购买商品、接受劳务支付的现金)
        [ + ] 三级：c_paid_to_for_empl (支付给职工以及为职工支付的现金)
        [ + ] 三级：c_paid_for_taxes (支付的各项税费)
        [ + ] 三级：oth_cash_pay_oper_act (支付其他与经营活动有关的现金)
        
2. 投资活动产生的现金流量

[ = ] 一级：n_cashflow_inv_act (投资活动产生的现金流量净额)
    [ + ] 二级：stot_inflows_inv_act (投资活动现金流入小计)
        [ + ] 三级：c_disp_withdrwl_invest (收回投资收到的现金)
        [ + ] 三级：c_recp_return_invest (取得投资收益收到的现金)
        [ + ] 三级：n_recp_disp_fiolta (处置固定资产、无形资产和其他长期资产收回的现金净额)
        [ + ] 三级：n_recp_disp_sobu (处置子公司及其他营业单位收到的现金净额)
        [ + ] 三级：oth_recp_ral_inv_act (收到其他与投资活动有关的现金)
    [ - ] 二级：stot_out_inv_act (投资活动现金流出小计)
        [ + ] 三级：c_pay_acq_const_fiolta (购建固定资产、无形资产和其他长期资产支付的现金) --> (CapEx资本开支)
        [ + ] 三级：c_paid_invest (投资支付的现金)
        [ + ] 三级：n_disp_subs_oth_biz (取得子公司及其他营业单位支付的现金净额)
        [ + ] 三级：oth_pay_ral_inv_act (支付其他与投资活动有关的现金)
        
3. 筹资活动产生的现金流量

[ = ] 一级：n_cash_flows_fnc_act (筹资活动产生的现金流量净额)
    [ + ] 二级：stot_cash_in_fnc_act (筹资活动现金流入小计)
        [ + ] 三级：c_recp_borrow (取得借款收到的现金)
        [ + ] 三级：proc_issue_bonds (发行债券收到的现金)
        [ + ] 三级：c_recp_cap_contrib (吸收投资收到的现金)
            └── [ 内部包含 ] incl_cash_rec_saims (子公司吸收少数股东投资收到的现金)
        [ + ] 三级：oth_cash_recp_ral_fnc_act (收到其他与筹资活动有关的现金)
    [ - ] 二级：stot_cashout_fnc_act (筹资活动现金流出小计)
        [ + ] 三级：c_prepay_amt_borr (偿还债务支付的现金)
        [ + ] 三级：c_pay_dist_dpcp_int_exp (分配股利、利润或偿付利息支付的现金)
            └── [ 内部包含 ] incl_dvd_profit_paid_sc_ms (子公司支付给少数股东的股利、利润)
        [ + ] 三级：oth_cashpay_ral_fnc_act (支付其他与筹资活动有关的现金)
        
### 银行现金流量表逻辑结构 (comp_type = 2)

银行的“经营活动”即其资金融通本身。储户存取款、发放贷款都属于经营活动现金流。

[ = ] 一级：n_cashflow_act (经营活动产生的现金流量净额)
    [ + ] 二级：经营活动现金流入小计（激活特有金融科目）
        [ + ] 三级：n_depos_incr_fi (客户存款和同业存放款项净增加额) --> (银行最核心流入)
        [ + ] 三级：n_incr_loans_cb (向中央银行借款净增加额)
        [ + ] 三级：n_inc_borr_oth_fi (向其他金融机构拆入资金净增加额)
        [ + ] 三级：n_incr_loans_oth_bank (拆入资金净增加额)
        [ + ] 三级：n_cap_incr_repur (回购业务资金净增加额)
        [ + ] 三级：ifc_cash_incr (收取利息和手续费净增加额)
    [ - ] 二级：经营活动现金流出小计（激活特有金融科目）
        [ + ] 三级：n_incr_clt_loan_adv (客户贷款及垫款净增加额) --> (银行最核心流出)
        [ + ] 三级：n_incr_dep_cbob (存放央行和同业款项净增加额)
        [ + ] 三级：pay_handling_chrg (支付手续费的现金)
        [ + ] 三级：net_dism_capital_add (拆出资金净增加额)
(注：银行的投资与筹资活动与通用大体一致，主要是自营盘债券的买卖计入投资活动。)

### 保险现金流量表逻辑结构 (comp_type = 3)

保险的经营现金流核心是“收保费、付理赔”。

[ = ] 一级：n_cashflow_act (经营活动产生的现金流量净额)
    [ + ] 二级：经营活动现金流入小计
        [ + ] 三级：prem_fr_orig_contr (收到原保险合同保费取得的现金)
        [ + ] 三级：n_incr_insured_dep (保户储金净增加额)
        [ + ] 三级：n_reinsur_prem (收到再保业务现金净额)
    [ - ] 二级：经营活动现金流出小计
        [ + ] 三级：c_pay_claims_orig_inco (支付原保险合同赔付款项的现金)
        [ + ] 三级：pay_comm_insur_plcy (支付保单红利的现金)
        [ + ] 三级：pay_handling_chrg (支付手续费的现金)
(注：保险的投资流出项中会激活 n_incr_pledge_loan(质押贷款净增加额)，指保单质押贷款。)

### 证券现金流量表逻辑结构 (comp_type = 4)

证券（券商）的经营现金流核心是自营盘的买卖以及代买卖证券款的流入流出。

[ = ] 一级：n_cashflow_act (经营活动产生的现金流量净额)
    [ + ] 二级：经营活动现金流入小计
        [ + ] 三级：n_incr_disp_tfa (处置交易性金融资产净增加额) --> (券商自营盘流转)
        [ + ] 三级：n_incr_disp_faas (处置可供出售金融资产净增加额)
        [ + ] 三级：net_cash_rece_sec (代理买卖证券收到的现金净额) --> (客户保证金流入)
        [ + ] 三级：n_incr_loans_oth_bank (拆入资金净增加额)
        [ + ] 三级：ifc_cash_incr (收取利息和手续费净增加额)

### 底层通用：三大活动汇总与间接法对账

任何行业在计算完三大净额后，最终的底层闭环逻辑完全统一。

1. 终点：总现金流

[ = ] n_incr_cash_cash_equ (现金及现金等价物净增加额)
    [ + ] n_cashflow_act (经营活动现金流量净额)
    [ + ] n_cashflow_inv_act (投资活动现金流量净额)
    [ + ] n_cash_flows_fnc_act (筹资活动现金流量净额)
    [ + ] eff_fx_flu_cash (汇率变动对现金的影响)

[ = ] c_cash_equ_end_period (期末现金及现金等价物余额)
    [ + ] c_cash_equ_beg_period (期初现金及现金等价物余额)
    [ + ] n_incr_cash_cash_equ (现金及现金等价物净增加额)
    
2. 核心对账机制：间接法（从净利润到经营现金流的逻辑推导）

在API字段表中，下半部分科目用于间接法对账。它的作用是将没有现金流支撑的会计利润（净利润）逐步还原为真金白银的经营现金流。

[ = ] im_net_cashflow_oper_act (经营活动产生的现金流量净额，间接法)
    [ + ] net_profit (净利润，推导起点)
    [ + ] 非现金流转调节项：
        ├── + prov_depr_assets (资产减值准备) / credit_impa_loss (信用减值损失)
        ├── + depr_fa_coga_dpba (固定资产折旧等) / use_right_asset_dep (使用权资产折旧)
        ├── + amort_intang_assets (无形资产摊销) + lt_amort_deferred_exp (长期待摊费用摊销)
        └── + decr_deferred_exp (待摊费用减少) - incr_acc_exp (预提费用增加)
    [ + ] 资产处置及投资损益调节（因其属于投资活动，需从经营活动中剔除）：
        ├── + loss_disp_fiolta (处置长期资产的损失，若是收益则为负)
        ├── + loss_scr_fa (固定资产报废损失)
        ├── + loss_fv_chg (公允价值变动损失，浮盈则为负)
        └── + invest_loss (投资损失，收益则为负)
    [ + ] 递延税项调节：
        └── + decr_def_inc_tax_assets (递延所得税资产减少) - incr_def_inc_tax_liab (递延所得税负债增加)
    [ + ] 营运资金变动调节：
        ├── + decr_inventories (存货的减少，若存货增加则为负)
        ├── + decr_oper_payable (经营性应收项目的减少，若应收增加则为负)
        └── + incr_oper_payable (经营性付项目的增加，若应付减少则为负)
    [ + ] others (其他)
