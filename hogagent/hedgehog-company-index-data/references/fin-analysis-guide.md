# 财务报表分析指南

按公司类型（comp_type）和商业模型分类的财务报表穿透分析框架。配合 `hedgehog-company-index-data` 的财务数据接口使用。

## 公司类型枚举

| comp_type | 公司类型 | 典型行业 |
|-----------|----------|----------|
| 1 | 一般工商业 | 机械、钢铁、化工、光伏、食品饮料、医药、SaaS、建筑工程等 |
| 2 | 银行 | 商业银行、政策性银行 |
| 3 | 保险 | 寿险、财险、再保险 |
| 4 | 证券/券商 | 券商、投行 |

> 查询三表明细时必须传入 `comp_type` 参数：`queryIncomeDetail` / `queryBalanceSheetDetail` / `queryCashFlowDetail`
> 由于财务表格字段较多，查询前如已明确需要的字段，请务必填写fields参数，防止返回数据过大使上下文溢出。
> 季度更新的财务报表的报告期日期标志是报告季度的最后一天（如20260331）。
> 财务指标接口 `queryFinanceIndicator` 无需 `comp_type`，可直接读取 ROE、毛利率等计算值。

---

## 一、一般工商业 (comp_type = 1)

### 1. 重资产周期模型（机械、钢铁、化工、光伏）

商业本质：巨资建产，高利用率摊薄成本赚取周转溢价。

#### 资产负债表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| FA Ratio | 固定资产占比 | fix_assets | queryBalanceSheetDetail(comp_type=1) | fix_assets / total_assets | 占总资产30%-60%（钢铁可达70%） | 占比持续攀升超70%且产能利用率下降→产能过剩风险 |
| CIP | 在建工程 | cip | 同上 | 直接读取 | 占总资产5%-20% | cip持续高位但未转fix_assets→工程烂尾或延迟投产 |
| AIL | 资产减值损失 | assets_impair_loss | queryIncomeDetail(comp_type=1) | 直接读取 | 占营收1%-5% | 突然飙升至营收10%以上→巨额减值暴雷 |
| DAR | 资产负债率 | debt_to_assets | queryFinanceIndicator | 直接读取 | 40%-65%（化工偏高50%-70%） | 持续超70%且自由现金流为负→债务危机 |

#### 利润表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| GPM | 毛利率 | grossprofit_margin | queryFinanceIndicator | 直接读取，或 (revenue - oper_cost) / revenue * 100% | 钢铁10%-20%，化工20%-35%，光伏15%-30%，机械25%-40% | 持续降至10%以下→价格战或成本失控 |
| OC Growth | 营业成本增速 | oper_cost | queryIncomeDetail(comp_type=1) | 当期oper_cost / 上期oper_cost - 1 | 增速应与revenue增速同步 | 增速持续超营收增速→成本端挤压，利润承压 |
| NPM | 净利率 | netprofit_margin | queryFinanceIndicator | 直接读取 | 3%-15%（钢铁低谷期可至负值） | 由正转负且持续2个季度以上→行业景气底部 |

#### 现金流

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| FCF | 自由现金流 | free_cashflow | queryCashFlowDetail(comp_type=1) | 直接读取，或 n_cashflow_act - c_pay_acq_const_fiolta | 景气周期为正，占营收5%-15% | 连续3年为负且债务攀升→资金链断裂风险 |
| CapEx | 资本开支 | c_pay_acq_const_fiolta | 同上 | 直接读取 | 占营收10%-25% | 占比超40%且ROIC下降→低效扩产 |
| OCF | 经营现金流净额 | n_cashflow_act | 同上 | 直接读取 | 应为正且大于净利润 | 连续为负但利润为正→利润质量存疑 |

---

### 2. 分销高周转模型（大宗供应链、电商、连锁零售）

商业本质：轻资产运作，靠低毛利、高周转与强渠道话语权赚差价。

#### 资产负债表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| INV Ratio | 存货占比 | inventories | queryBalanceSheetDetail(comp_type=1) | inventories / total_assets | 占总资产20%-50%（供应链可更高） | 占比持续上升且营收增速放缓→存货积压 |
| AR Ratio | 应收账款占比 | accounts_receiv | 同上 | accounts_receiv / total_assets | 占总资产10%-30% | 占比骤升且账龄超90天→坏账风险 |
| DAR | 资产负债率 | debt_to_assets | queryFinanceIndicator | 直接读取 | 50%-70%（供应链偏高60%-75%） | 超过80%且短期借款激增→流动性危机 |

#### 利润表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| GPM | 毛利率 | grossprofit_margin | queryFinanceIndicator | 直接读取，或 (revenue - oper_cost) / revenue * 100% | 3%-10%（大宗供应链可低至1%-3%） | 毛利率跌破2%且持续→薄利难覆盖固定费用 |
| ROE | 净资产收益率 | roe / roe_waa | queryFinanceIndicator | 直接读取 | 12%-20% | ROE持续低于8%且周转率下降→模式失效 |
| NPM | 净利率 | netprofit_margin | queryFinanceIndicator | 直接读取 | 1%-5% | 持续低于1%→抗风险能力极弱 |

#### 现金流

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| Sales Receipt | 销售回款 | c_fr_sale_sg | queryCashFlowDetail(comp_type=1) | c_fr_sale_sg / revenue | 应大于或接近1.0（含税因素） | 持续低于0.8→回款恶化，渠道话语权下降 |
| Purchase Pay | 采购付款 | c_paid_goods_s | 同上 | c_paid_goods_s / oper_cost | 应小于或接近1.0 | 远大于1.0→供应商收紧账期 |
| Pay Time Diff | 收付时差 | — | 同上 | (c_fr_sale_sg - c_paid_goods_s) / total_assets | 正值表明占用上下游资金 | 时差转负→无息资金占用能力丧失 |

---

### 3. 品牌消费模型（食品饮料、医药消费、服装）

商业本质：品牌溢价与用户粘性构筑超额定价权。

#### 资产负债表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| Cash | 货币资金 | money_cap | queryBalanceSheetDetail(comp_type=1) | money_cap / total_assets | 占总资产20%-50%（白酒可超60%） | 现金充裕却大举借债→资金挪用嫌疑 |
| CL | 合同负债 | contract_liab | 同上 | contract_liab / revenue | 占营收10%-40%（白酒经销商打款积极可达50%+） | 骤降超30%→经销商提货意愿下降，渠道压货退潮 |
| IBL Ratio | 有息负债率 | — | 同上 | (st_borr + lt_borr + bond_payable) / total_assets | 低于10%（优质品牌消费趋近于0） | 有息负债率超20%且money_cap充裕→存贷双高异常 |

#### 利润表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| GPM | 毛利率 | grossprofit_margin | queryFinanceIndicator | 直接读取，或 (revenue - oper_cost) / revenue * 100% | 食品饮料50%-80%，医药60%-85%，服装30%-55% | 毛利率持续下滑且无提价动作→品牌力衰退 |
| SER | 销售费用率 | sell_exp | queryIncomeDetail(comp_type=1) | sell_exp / revenue * 100% | 10%-30%（医药销售费用率偏高20%-40%） | 销售费用率持续上升但营收增速放缓→品牌护城河削弱 |
| NPM | 净利率 | netprofit_margin | queryFinanceIndicator | 直接读取 | 15%-30%（白酒可达30%-50%） | 持续低于10%→品牌溢价不足以覆盖费用 |

#### 现金流

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| OCF/NP | 经营现金流/净利润 | — | queryCashFlowDetail(comp_type=1) | n_cashflow_act / n_income | 大于1.0（优质品牌常达1.2-1.5） | 持续低于0.7→利润含金量不足，可能存在渠道压货 |
| Div & Int Pay | 分红付息现金 | c_pay_dist_dpcp_int_exp | 同上 | 直接读取 | 分红率稳定在30%-60% | 突然大幅削减分红且无投资计划→现金流承压 |

---

### 4. 轻资产科技模型（SaaS、半导体设计、生物医药）

商业本质：高研发与尖端人才筑基，输出技术壁垒。

#### 资产负债表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| GW Ratio | 商誉占比 | goodwill | queryBalanceSheetDetail(comp_type=1) | goodwill / total_hldr_eqy_exc_min_int | 占净资产低于15% | 占净资产超30%→商誉暴雷风险；超50%→极度危险 |
| IA | 无形资产 | intan_assets | 同上 | intan_assets / total_assets | 占总资产5%-15% | 无形资产占比持续攀升且摊销周期拉长→资本化粉饰嫌疑 |
| R&D Cap Rate | 研发资本化率 | — | queryBalanceSheetDetail + queryIncomeDetail | r_and_d / (r_and_d + rd_exp) | 低于30% | 超过50%→研发过度资本化粉饰利润 |
| Cash | 货币资金 | money_cap | 同上 | money_cap / total_assets | 占总资产15%-40% | 现金充裕但持续亏损烧钱→关注烧钱速度与融资能力 |

#### 利润表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| GPM | 毛利率 | grossprofit_margin | queryFinanceIndicator | 直接读取，或 (revenue - oper_cost) / revenue * 100% | SaaS 60%-85%，半导体设计35%-55%，生物医药40%-70% | 毛利率持续下降→技术壁垒削弱或竞争加剧 |
| R&D Ratio | 研发费用率 | rd_exp | queryIncomeDetail(comp_type=1) | rd_exp / revenue * 100% | 10%-25%（生物医药可达30%-50%） | 持续低于5%且无外部技术来源→技术护城河不足 |
| NPM | 净利率 | netprofit_margin | queryFinanceIndicator | 直接读取 | 成熟期10%-25%；成长期可为负 | 持续亏损且毛利率同步下降→商业模式存疑 |

#### 现金流

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| Empl Pay | 支付职工现金 | c_paid_to_for_empl | queryCashFlowDetail(comp_type=1) | c_paid_to_for_empl / revenue | 占营收15%-35%（人才密集型偏高） | 人均创收(revenue/员工数)持续下降→研发转化效能不足 |
| FCF | 自由现金流 | free_cashflow | 同上 | 直接读取 | 成熟期为正；成长期可为负 | 亏损扩大且自由现金流持续为负→关注现金跑道(cash runway) |

---

### 5. 项目合同模型（建筑工程、系统集成、环保设施）

商业本质："垫资-施工-按节点结算"的重资产长周期模型。

#### 资产负债表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| CA | 合同资产 | contract_assets | queryBalanceSheetDetail(comp_type=1) | contract_assets / total_assets | 占总资产10%-30% | 合同资产飙升且未转accounts_receiv→结算滞后坏账风险 |
| CL | 合同负债 | contract_liab | 同上 | contract_liab / revenue | 为营收0.5-1.5倍 | 骤降且无新签订单→项目储备不足 |
| DAR | 资产负债率 | debt_to_assets | queryFinanceIndicator | 直接读取 | 60%-80%（建筑行业偏高） | 超过85%且短期借款占比高→流动性危机 |

#### 利润表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| GPM | 毛利率 | grossprofit_margin | queryFinanceIndicator | 直接读取，或 (revenue - oper_cost) / revenue * 100% | 8%-15%（系统集成10%-20%） | 毛利率持续低于5%→低价竞标，盈利空间压缩 |
| TP | 利润总额 | total_profit | queryIncomeDetail(comp_type=1) | total_profit / revenue * 100% | 2%-8% | 利润增速远超营收增速且无合理说明→完工百分比调节嫌疑 |
| NPM | 净利率 | netprofit_margin | queryFinanceIndicator | 直接读取 | 1%-6% | 持续低于1%→项目亏损面扩大 |

#### 现金流

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| OCF | 经营现金流净额 | n_cashflow_act | queryCashFlowDetail(comp_type=1) | n_cashflow_act / n_income | 比值应接近1.0（实际常低于0.5） | 连续为负但利润为正→"有利润无现金"，利润注水重灾区 |
| Borrow Cash | 取得借款现金 | c_recp_borrow | 同上 | c_recp_borrow / total_assets | 占总资产10%-30% | 借款现金持续上升且经营现金流为负→依赖筹资维系运转 |
| CapEx | 资本开支 | c_pay_acq_const_fiolta | 同上 | 直接读取 | 占营收3%-10% | 占比异常高且无对应收入增长→无效投资 |

---

## 二、银行 (comp_type = 2)

商业本质：经营社会流动性与信用风险的特许杠杆生意。

#### 资产负债表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| Loans | 发放贷款及垫款 | decr_in_disbur | queryBalanceSheetDetail(comp_type=2) | decr_in_disbur / total_assets | 占总资产50%-70% | 增速持续超存款增速→流动性压力 |
| Deposits | 吸收存款 | depos | 同上 | depos / total_assets | 占总资产60%-80% | 存款负增长→负债端流失，成本上升 |
| LDR | 存贷比 | — | 同上 | decr_in_disbur / depos | 70%-85% | 超过100%→过度放贷，流动性风险 |

#### 利润表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| NIM | 净息差 | — | queryIncomeDetail(comp_type=2) | (int_income - int_exp) / 平均生息资产 | 1.8%-2.5%（大行偏低1.5%-2.0%，农商行偏高2.0%-2.8%） | 持续收窄至1.5%以下→盈利能力衰退 |
| CIL | 信用减值损失 | credit_impa_loss | 同上 | credit_impa_loss / total_revenue | 占营收15%-25% | 占营收超30%→资产质量恶化；超40%→严重不良暴露 |
| FI Ratio | 手续费及佣金净收入占比 | n_commis_income | 同上 | n_commis_income / total_revenue | 占营收15%-30% | 中收占比持续下降→过度依赖利息收入，抗周期能力弱 |
| NPM | 净利率 | netprofit_margin | queryFinanceIndicator | 直接读取 | 25%-40% | 持续低于20%→减值侵蚀利润 |

#### 现金流与监管指标

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| CET1 | 核心一级资本充足率 | — | 年报/公告 | 直接读取 | 最低监管要求7.5%，实际8.5%-12% | 接近8%→信贷扩张受限，需补充资本 |
| PCR | 拨备覆盖率 | — | 年报/公告 | 贷款损失准备/不良贷款余额 | 150%-300% | 低于130%→风险缓冲不足；超500%→隐藏利润 |
| NPL | 不良贷款率 | — | 年报/公告 | 不良贷款余额/贷款总额 | 低于2% | 突然上升超0.5个百分点→资产质量恶化 |

> 银行常规现金流量表失真（因资产负债表本身即为资金表），降维盯紧监管红线即可。

---

## 三、保险 (comp_type = 3)

商业本质："先收后付"。赚负债端死/费差与资产端利差。

#### 资产负债表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| Ins Reserves | 保险合同准备金 | rsrv_insur_cont | queryBalanceSheetDetail(comp_type=3) | rsrv_insur_cont / total_assets | 占总资产50%-75%（寿险更高60%-80%） | 准备金占比较同业异常偏低→精算假设激进，未来赔付压力 |
| Inv Assets | 投资资产 | — | 同上 | (fair_value_fin_assets + cost_fin_assets + trad_asset) / total_assets | 占总资产40%-60% | 投资资产占比骤降且未对应赔付→投资亏损或资产挪用 |
| TIR | 总投资收益率 | — | queryIncomeDetail(comp_type=3) | (invest_income + fv_value_chg_gain) / 平均投资资产 | 4.5%-5.5% | 持续低于4%→覆盖负债成本困难，利差损风险 |

#### 利润表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| EP | 已赚保费 | prem_earned | queryIncomeDetail(comp_type=3) | prem_earned / total_revenue | 占营收70%-90% | 增速持续低于行业且市场份额下降→竞争力衰退 |
| COR | 综合成本率 | — | 年报/公告 | (赔付率 + 费用率) | 财险COR<100%为承保盈利；寿险不适用COR | 财险COR>105%→承保亏损，纯靠投资端填坑 |
| Surrender | 退保金 | prem_refund | queryIncomeDetail(comp_type=3) | prem_refund / prem_income | 低于5% | 退保率突然上升超10%→产品竞争力下降或销售误导 |

#### 现金流

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| Prem Cash | 收到原保费现金 | prem_fr_orig_contr | queryCashFlowDetail(comp_type=3) | prem_fr_orig_contr / prem_income | 应接近或大于1.0 | 持续低于0.8→保费回款质量差 |
| RP Ratio | 期缴保费占比 | — | 年报/公告 | 期缴保费 / 总保费 | 寿险50%-80% | 期缴占比持续下降→业务结构恶化，续期收入不稳定 |
| OCF | 经营现金流净额 | n_cashflow_act | queryCashFlowDetail(comp_type=3) | 直接读取 | 应为正且稳定增长 | 由正转负且投资资产缩水→现金流恶化 |

---

## 四、证券/券商 (comp_type = 4)

商业本质：高 beta 生意，业绩弹性强绑定资本市场牛熊。

#### 资产负债表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| Real DAR | 真实资产负债率 | — | queryBalanceSheetDetail(comp_type=4) | (total_liab - acting_trading_sec) / total_assets | 剔除客户资金后30%-50% | 超过65%→自营杠杆过高 |
| Lending | 融出资金 | lending_funds | 同上 | lending_funds / total_assets | 占总资产15%-25% | 占比骤降→两融需求萎缩，市场活跃度下降；占比超30%→集中度风险 |
| TFA | 交易性金融资产 | trad_asset | 同上 | trad_asset / total_assets | 占总资产15%-30% | 占比持续上升且市场下行→自营浮亏风险 |
| ST Fin Pay | 应付短期融资款 | st_fin_payable | 同上 | st_fin_payable / total_assets | 占总资产5%-15% | 激增且无对应资产增长→发债加杠杆，风险敞口扩大 |

#### 利润表

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| Brokerage | 代理买卖证券净收入 | n_sec_tb_income | queryIncomeDetail(comp_type=4) | n_sec_tb_income / total_revenue | 占营收15%-30% | 占比骤降→交投清淡，经纪业务萎缩 |
| UW Income | 证券承销净收入 | n_sec_uw_income | 同上 | n_sec_uw_income / total_revenue | 占营收5%-15% | 持续下降且IPO收紧→投行业务承压 |
| Prop P&L | 自营损益 | — | 同上 | (invest_income + fv_value_chg_gain) / total_revenue | 占营收20%-40% | 公允价值变动(fv_value_chg_gain)由正转负且trad_asset缩水→自营亏损 |
| NPM | 净利率 | netprofit_margin | queryFinanceIndicator | 直接读取 | 25%-40%（牛市可达50%+） | 持续低于15%→市场低迷或成本失控 |

#### 现金流

| 指标 | 名称 | API字段 | 数据来源 | 计算方法 | 正常值参考 | 异常预警 |
|------|------|---------|----------|----------|------------|----------|
| TFA Disp | 处置交易性资产净额 | n_incr_disp_tfa | queryCashFlowDetail(comp_type=4) | 直接读取 | 牛市为负（加仓），熊市为正（减仓） | 熊市大幅净卖出→止损或流动性紧张 |
| Fin CF | 筹资活动现金净额 | n_cash_flows_fnc_act | 同上 | 直接读取 | 视融资周期而定 | 持续为正且经营现金流为负→依赖外部融资维持 |
| OCF | 经营现金流净额 | n_cashflow_act | 同上 | 直接读取 | 波动大，牛市为正 | 与净利润严重背离→盈利质量存疑 |

---

## 五、通用财务指标速查

以下指标通过 `queryFinanceIndicator` 接口直接获取，日频数据，无需指定 comp_type，适用于一般工商业（comp_type=1）公司的通用分析。

| 指标 | 名称 | API字段 | 计算公式 | 行业参考区间 |
|------|------|---------|----------|-------------|
| ROE | 加权净资产收益率 | roe_waa | 净利润 / 加权平均净资产 * 100% | 消费>15%，制造8%-15%，公用事业8%-12% |
| ROA | 总资产报酬率 | roa | 净利润 / 平均总资产 * 100% | 3%-8%（重资产偏低2%-5%） |
| ROIC | 投入资本回报率 | roic | 息税后利润 / 投入资本 * 100% | 应高于WACC，通常>8%为优 |
| GPM | 销售毛利率 | grossprofit_margin | (revenue - oper_cost) / revenue * 100% | 因行业而异，见各模型 |
| NPM | 销售净利率 | netprofit_margin | 净利润 / revenue * 100% | 因行业而异，见各模型 |
| DAR | 资产负债率 | debt_to_assets | 总负债 / 总资产 * 100% | 40%-65%为常态，超70%需警惕 |
| CR | 流动比率 | current_ratio | 流动资产 / 流动负债 | 1.5-2.5为正常，低于1需警惕 |
| QR | 速动比率 | quick_ratio | (流动资产 - 存货) / 流动负债 | 大于1为安全 |
| ITR | 存货周转率 | inv_turn | 营业成本 / 平均存货 | 因行业而异，越高越好 |
| ARTR | 应收账款周转率 | ar_turn | 营业收入 / 平均应收账款 | 大于6次/年为优 |
| FCFF | 企业自由现金流 | fcff | 经营现金流净额 - 资本开支 | 持续为正为健康 |
| FCFE | 股权自由现金流 | fcfe | FCFF - 税后利息 + 净新借 | 持续为正为健康 |
| OR_YOY | 营业收入同比 | or_yoy | 当期revenue / 上年同期revenue - 1 | 正增长为佳 |
| NP_YOY | 净利润同比 | netprofit_yoy | 当期净利润 / 上年同期净利润 - 1 | 正增长为佳 |
| DT_NP_YOY | 扣非净利润同比 | dt_netprofit_yoy | 当期扣非净利润 / 上年同期 - 1 | 应与NP_YOY趋势一致，差异过大需关注非经常损益 |
| R&D | 研发费用 | rd_exp | 直接读取 | 科技企业应占营收10%以上 |
