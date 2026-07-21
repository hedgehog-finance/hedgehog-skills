#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'https://api.ciweiai.com/api/data';

/**
 * 加载 API Key（按优先级）：
 * 1. ~/.hogagent/skills_config.json → hedgehog-company-index-data.api-key
 * 2. 同文件 → hedgehog-ciweiai.api-key（共享 Key）
 * 3. 环境变量 CIWEIAI_API_KEY
 * 4. 环境变量 API_KEY
 */
function loadApiKey() {
  try {
    const configPath = path.join(require('os').homedir(), '.hogagent', 'skills_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const skillKey = config['hedgehog-company-index-data'] && config['hedgehog-company-index-data']['api-key'];
      if (skillKey) return skillKey;
      const sharedKey = config['hedgehog-ciweiai'] && config['hedgehog-ciweiai']['api-key'];
      if (sharedKey) return sharedKey;
    }
  } catch (_) { /* ignore */ }
  return process.env.CIWEIAI_API_KEY || process.env.API_KEY || '';
}

const API_KEY = loadApiKey();

const DAY_MS = 24 * 60 * 60 * 1000;

// 公司类型 -> 字段裁剪集合（用于 *Detail 三个明细 Tool，脚本根据 comp_type 自动设置 fields）
// 利润表明细字段集（按公司类型）：一级科目满足会计等式 + 重要二级科目
const INCOME_DETAIL_FIELDS = {
  1: 'stock_code,ann_date,end_date,report_type,comp_type,basic_eps,diluted_eps,total_revenue,revenue,total_cogs,oper_cost,sell_exp,admin_exp,rd_exp,fin_exp,assets_impair_loss,credit_impa_loss,operate_profit,invest_income,fv_value_chg_gain,other_income,asset_disposal_income,non_oper_income,non_oper_exp,total_profit,income_tax,n_income,n_income_attr_p,minority_income,ebit,ebitda,net_after_nr_lp_correct',
  2: 'stock_code,ann_date,end_date,report_type,comp_type,basic_eps,diluted_eps,total_revenue,int_income,int_exp,n_commis_income,comm_income,comm_exp,invest_income,fv_value_chg_gain,other_income,operate_profit,total_cogs,biz_tax_surchg,assets_impair_loss,credit_impa_loss,non_oper_income,non_oper_exp,total_profit,income_tax,n_income,n_income_attr_p,minority_income,ebit,ebitda,net_after_nr_lp_correct',
  3: 'stock_code,ann_date,end_date,report_type,comp_type,basic_eps,diluted_eps,total_revenue,prem_earned,prem_income,out_prem,une_prem_reser,invest_income,fv_value_chg_gain,other_income,operate_profit,total_cogs,compens_payout,reser_insur_liab,comm_exp,biz_tax_surchg,assets_impair_loss,credit_impa_loss,non_oper_income,non_oper_exp,total_profit,income_tax,n_income,n_income_attr_p,minority_income,ebit,ebitda,net_after_nr_lp_correct',
  4: 'stock_code,ann_date,end_date,report_type,comp_type,basic_eps,diluted_eps,total_revenue,n_sec_tb_income,n_sec_uw_income,n_asset_mg_income,int_income,int_exp,n_commis_income,comm_income,comm_exp,invest_income,fv_value_chg_gain,other_income,operate_profit,total_cogs,biz_tax_surchg,assets_impair_loss,credit_impa_loss,non_oper_income,non_oper_exp,total_profit,income_tax,n_income,n_income_attr_p,minority_income,ebit,ebitda,net_after_nr_lp_correct',
};

// 资产负债表明细字段集（按公司类型）：一级科目满足会计等式 + 重要二级科目
// 等式：总资产 = 总负债 + 所有者权益；流动资产 + 非流动资产 = 总资产；流动负债 + 非流动负债 = 总负债
const BALANCE_DETAIL_FIELDS = {
  1: 'stock_code,ann_date,end_date,report_type,comp_type,total_assets,total_cur_assets,money_cap,accounts_receiv,inventories,total_nca,fix_assets,intan_assets,goodwill,total_liab,total_cur_liab,st_borr,accounts_pay,total_ncl,lt_borr,bond_payable,total_hldr_eqy_exc_min_int,total_share,cap_rese,undistr_porfit,surplus_rese,minority_int,total_hldr_eqy_inc_min_int',
  2: 'stock_code,ann_date,end_date,report_type,comp_type,total_assets,cash_reser_cb,depos_in_oth_bfi,loanto_oth_bank_fi,decr_in_disbur,trad_asset,total_cur_assets,total_nca,total_liab,cb_borr,depos,depos_oth_bfi,loan_oth_bank,sold_for_repur_fa,total_cur_liab,total_ncl,bond_payable,total_hldr_eqy_exc_min_int,total_share,cap_rese,undistr_porfit,surplus_rese,minority_int,total_hldr_eqy_inc_min_int',
  3: 'stock_code,ann_date,end_date,report_type,comp_type,total_assets,money_cap,fair_value_fin_assets,premium_receiv,invest_real_estate,total_cur_assets,total_nca,total_liab,rsrv_insur_cont,indem_payable,policy_div_payable,total_cur_liab,total_ncl,total_hldr_eqy_exc_min_int,total_share,cap_rese,undistr_porfit,surplus_rese,minority_int,total_hldr_eqy_inc_min_int',
  4: 'stock_code,ann_date,end_date,report_type,comp_type,total_assets,money_cap,client_depos,client_prov,lending_funds,trad_asset,pur_resale_fa,total_cur_assets,total_nca,total_liab,st_fin_payable,sold_for_repur_fa,acting_trading_sec,acting_uw_sec,total_cur_liab,total_ncl,bond_payable,total_hldr_eqy_exc_min_int,total_share,cap_rese,undistr_porfit,surplus_rese,minority_int,total_hldr_eqy_inc_min_int',
};

// 现金流量表明细字段集（按公司类型）：一级科目满足会计等式 + 重要二级科目
// 等式：现金净增加额 = 经营 + 投资 + 筹资 + 汇率变动；期末 = 期初 + 净增加；自由现金流 = 经营 - 资本支出
const CASHFLOW_DETAIL_FIELDS = {
  1: 'stock_code,ann_date,end_date,report_type,comp_type,net_profit,c_fr_sale_sg,c_paid_goods_s,c_paid_to_for_empl,c_paid_for_taxes,c_inf_fr_operate_a,st_cash_out_act,n_cashflow_act,c_pay_acq_const_fiolta,c_paid_invest,c_recp_return_invest,stot_inflows_inv_act,stot_out_inv_act,n_cashflow_inv_act,c_recp_borrow,c_prepay_amt_borr,c_pay_dist_dpcp_int_exp,stot_cash_in_fnc_act,stot_cashout_fnc_act,n_cash_flows_fnc_act,eff_fx_flu_cash,n_incr_cash_cash_equ,c_cash_equ_beg_period,c_cash_equ_end_period,free_cashflow',
  2: 'stock_code,ann_date,end_date,report_type,comp_type,net_profit,n_depos_incr_fi,n_incr_loans_cb,n_inc_borr_oth_fi,n_incr_clt_loan_adv,n_incr_dep_cbob,c_inf_fr_operate_a,st_cash_out_act,n_cashflow_act,c_paid_invest,c_recp_return_invest,stot_inflows_inv_act,stot_out_inv_act,n_cashflow_inv_act,proc_issue_bonds,c_recp_borrow,c_prepay_amt_borr,stot_cash_in_fnc_act,stot_cashout_fnc_act,n_cash_flows_fnc_act,eff_fx_flu_cash,n_incr_cash_cash_equ,c_cash_equ_beg_period,c_cash_equ_end_period,free_cashflow',
  3: 'stock_code,ann_date,end_date,report_type,comp_type,net_profit,prem_fr_orig_contr,n_reinsur_prem,c_pay_claims_orig_inco,pay_comm_insur_plcy,c_inf_fr_operate_a,st_cash_out_act,n_cashflow_act,c_paid_invest,c_recp_return_invest,stot_inflows_inv_act,stot_out_inv_act,n_cashflow_inv_act,proc_issue_bonds,c_recp_borrow,c_prepay_amt_borr,stot_cash_in_fnc_act,stot_cashout_fnc_act,n_cash_flows_fnc_act,eff_fx_flu_cash,n_incr_cash_cash_equ,c_cash_equ_beg_period,c_cash_equ_end_period,free_cashflow',
  4: 'stock_code,ann_date,end_date,report_type,comp_type,net_profit,net_cash_rece_sec,ifc_cash_incr,n_cap_incr_repur,n_incr_disp_tfa,c_inf_fr_operate_a,st_cash_out_act,n_cashflow_act,c_paid_invest,c_recp_return_invest,stot_inflows_inv_act,stot_out_inv_act,n_cashflow_inv_act,proc_issue_bonds,c_recp_borrow,c_prepay_amt_borr,stot_cash_in_fnc_act,stot_cashout_fnc_act,n_cash_flows_fnc_act,eff_fx_flu_cash,n_incr_cash_cash_equ,c_cash_equ_beg_period,c_cash_equ_end_period,free_cashflow',
};

/**
 * API 路由及调用约束。
 * 字段说明：
 *   method/path:    HTTP 方法和路径
 *   require:        必填字段数组（任一缺失直接报错）
 *   requireAny:     二维数组，每组中至少有一项必填
 *   paramMap:       入参别名映射（skill 友好名 -> 后端字段名）
 *   defaults:       未传时填入的默认参数
 *   forced:         强制写死的参数（覆盖调用方传值，不对外暴露）
 *   compTypeFields: 公司类型 -> 字段裁剪字符串；未传 fields 时按 comp_type 自动设置
 *   renameMap:      响应 items[] 字段重命名（后端字段 -> skill 对外字段）
 *   stripFields:    响应中始终剔除的字段数组（黑名单，与 fields 白名单互补）
 *   constraints:
 *     dateRange:         { startField, endField, maxDays }
 *     dynamicDateRange:  { startField, endField, default, sparse, threshold } fields数≤threshold时放宽maxDays
 *     maxStartAge:       { field, maxYears } 起始日期距今不超过 N 年
 *   dynamicLimit:     { default, sparse, threshold } limit 参数动态值（基于 fields 字段数）
 *   dynamicPageSize:  { default, sparse, threshold } page_size 参数动态值（基于 fields 字段数）
 *   transform:        响应数据变换函数名（在 stripFields/filterFields 之前执行）
 */
const API_ROUTES = {
  // ===== Tool-1 股票基础信息 =====
  getStockBasic: {
    method: 'GET',
    path: '/v1/stock/basic',
    requireAny: [['stock_code', 'stock_name']],
    paramMap: { stock_name: 'name' },
    renameMap: { name: 'stock_name' },
    stripFields: ['symbol', 'area', 'act_name', 'act_ent_type'],
  },

  // ===== Tool-2 股票日线行情 =====
  queryStockDaily: {
    method: 'GET',
    path: '/v1/stock/daily',
    require: ['stock_code'],
    forced: { limit: 200 },
    dynamicLimit: { default: 200, sparse: 400, threshold: 6 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 365 * 2 },
    },
  },

  // ===== Tool-3 每日基本面指标 =====
  queryDailyBasic: {
    method: 'GET',
    path: '/v1/daily-basic/query',
    require: ['stock_code'],
    forced: { page: 1, page_size: 200 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 1 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 60, sparse: 180, threshold: 6 },
    },
  },

  // ===== Tool-4 个股资金流向 =====
  queryMoneyflow: {
    method: 'GET',
    path: '/v1/finance/moneyflow',
    require: ['stock_code'],
    forced: { page: 1, page_size: 100 },
    dynamicPageSize: { default: 100, sparse: 300, threshold: 3 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 90, sparse: 366, threshold: 3 },
    },
    stripFields: [
      'buy_sm_vol', 'sell_sm_vol', 'buy_md_vol', 'sell_md_vol',
      'buy_lg_vol', 'sell_lg_vol', 'buy_elg_vol', 'sell_elg_vol', 'net_mf_vol',
      'buy_sm_amount', 'sell_sm_amount', 'buy_md_amount', 'sell_md_amount',
      'buy_lg_amount', 'sell_lg_amount', 'buy_elg_amount', 'sell_elg_amount',
    ],
    transform: 'moneyflowNet',
  },

  // ===== Tool-5 利润表（汇总） =====
  queryIncome: {
    method: 'GET',
    path: '/v1/finance/income',
    require: ['stock_code'],
    forced: { page: 1, page_size: 4 },
    dynamicPageSize: { default: 4, sparse: 40, threshold: 6 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 366, sparse: 3650, threshold: 6 },
    },
  },

  // ===== Tool-5b 利润表（按公司类型明细） =====
  queryIncomeDetail: {
    method: 'GET',
    path: '/v1/finance/income',
    require: ['stock_code'],
    requireAny: [['fields', 'comp_type']],
    defaults: { report_type: 1 },
    forced: { page: 1, page_size: 1 },
    dynamicPageSize: { default: 1, sparse: 40, threshold: 6 },
    compTypeFields: INCOME_DETAIL_FIELDS,
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 92, sparse: 3650, threshold: 6 },
    },
  },

  // ===== Tool-6 资产负债表（汇总） =====
  queryBalanceSheet: {
    method: 'GET',
    path: '/v1/finance/balance-sheet',
    require: ['stock_code'],
    forced: { page: 1, page_size: 4 },
    dynamicPageSize: { default: 4, sparse: 40, threshold: 6 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 366, sparse: 3650, threshold: 6 },
    },
  },

  // ===== Tool-6b 资产负债表（按公司类型明细） =====
  queryBalanceSheetDetail: {
    method: 'GET',
    path: '/v1/finance/balance-sheet',
    require: ['stock_code'],
    requireAny: [['fields', 'comp_type']],
    defaults: { report_type: 1 },
    forced: { page: 1, page_size: 1 },
    dynamicPageSize: { default: 1, sparse: 40, threshold: 6 },
    compTypeFields: BALANCE_DETAIL_FIELDS,
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 92, sparse: 3650, threshold: 6 },
    },
  },

  // ===== Tool-7 现金流量表（汇总） =====
  queryCashFlow: {
    method: 'GET',
    path: '/v1/finance/cash-flow',
    require: ['stock_code'],
    forced: { page: 1, page_size: 4 },
    dynamicPageSize: { default: 4, sparse: 40, threshold: 6 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 366, sparse: 3650, threshold: 6 },
    },
  },

  // ===== Tool-7b 现金流量表（按公司类型明细） =====
  queryCashFlowDetail: {
    method: 'GET',
    path: '/v1/finance/cash-flow',
    require: ['stock_code'],
    requireAny: [['fields', 'comp_type']],
    defaults: { report_type: 1 },
    forced: { page: 1, page_size: 1 },
    dynamicPageSize: { default: 1, sparse: 40, threshold: 6 },
    compTypeFields: CASHFLOW_DETAIL_FIELDS,
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 92, sparse: 3650, threshold: 6 },
    },
  },

  // ===== Tool-8 财务指标 =====
  queryFinanceIndicator: {
    method: 'GET',
    path: '/v1/finance/indicator',
    require: ['stock_code'],
    forced: { page: 1, page_size: 4 },
    dynamicPageSize: { default: 4, sparse: 40, threshold: 6 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 366, sparse: 3650, threshold: 6 },
    },
  },

  // ===== Tool-9 财务审计意见 =====
  queryFinanceAudit: {
    method: 'GET',
    path: '/v1/finance/audit',
    require: ['stock_code'],
    forced: { page: 1, page_size: 4 },

    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 366 },
    },
  },

  // ===== Tool-10 主营业务构成 =====
  queryFinanceMainbz: {
    method: 'GET',
    path: '/v1/finance/mainbz',
    require: ['stock_code'],
    forced: { page: 1, page_size: 20 },
    renameMap: { bz_code: 'bz_type' },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 1826 },
    },
  },

  // ===== Tool-11 申万行业成分构成 =====
  querySwIndustryMember: {
    method: 'GET',
    path: '/v1/stock/sw-industry-member',
    requireAny: [['stock_code', 'l1_code', 'l2_code', 'l3_code']],
    forced: { is_new: 'Y', page: 1, page_size: 300, sort: '-in_date' },
    renameMap: { name: 'stock_name' },
  },

  // ===== Tool-12 申万行业日线行情 =====
  querySwIndustryDaily: {
    method: 'GET',
    path: '/v1/stock/sw-industry-daily',
    require: ['index_code'],
    forced: { page: 1, page_size: 60 },
    dynamicPageSize: { default: 60, sparse: 180, threshold: 6 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dynamicDateRange: { startField: 'start_date', endField: 'end_date', default: 60, sparse: 180, threshold: 6 },
    },
  },

  // ===== Tool-13 交易日历 =====
  queryTradeCal: {
    method: 'GET',
    path: '/v1/market/trade-cal',
    require: ['start_date', 'end_date'],
    defaults: { exchange: 'SSE' },
    forced: { page: 1, page_size: 400 },
    constraints: {
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 366 },
    },
  },

  // ===== Tool-14 判断交易日 =====
  isTradeDay: {
    method: 'GET',
    path: '/v1/market/trade-cal',
    require: ['trade_date'],
    forced: { page: 1, page_size: 1 },
  },

  // ===== Tool-15 交易日偏移 =====
  tradeDayOffset: {
    method: 'GET',
    path: '/v1/market/trade-day-offset',
    require: ['base_date', 'offset'],
  },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function buildUrl(routePath, params) {
  const path = routePath.replace(/:(\w+)/g, (_, key) => {
    if (params[key] === undefined || params[key] === null) {
      throw new Error(`缺少路径参数: ${key}`);
    }
    const value = params[key];
    delete params[key];
    return encodeURIComponent(String(value));
  });

  const base = BASE_URL.replace(/\/+$/, '');
  return new URL(`${base}${path}`);
}

function appendQuery(url, params) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
    } else if (typeof value === 'object') {
      url.searchParams.set(key, JSON.stringify(value));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

function parseBody(raw, contentType) {
  if (!raw) return null;
  if (contentType.includes('application/json')) {
    return JSON.parse(raw);
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    return raw;
  }
}

function isEmpty(v) {
  return v === undefined || v === null || v === '';
}

function applyRequired(route, apiName, params) {
  if (Array.isArray(route.require)) {
    for (const key of route.require) {
      if (isEmpty(params[key])) {
        throw new Error(`${apiName} 缺少必填参数: ${key}`);
      }
    }
  }
  if (Array.isArray(route.requireAny)) {
    for (const group of route.requireAny) {
      const ok = group.some((k) => !isEmpty(params[k]));
      if (!ok) {
        throw new Error(`${apiName} 必须至少提供其中一个参数: ${group.join(' / ')}`);
      }
    }
  }
}

function applyParamMap(route, params) {
  if (!route.paramMap) return;
  for (const [from, to] of Object.entries(route.paramMap)) {
    if (Object.prototype.hasOwnProperty.call(params, from)) {
      if (!Object.prototype.hasOwnProperty.call(params, to) || isEmpty(params[to])) {
        params[to] = params[from];
      }
      delete params[from];
    }
  }
}

function applyDefaults(route, params) {
  if (!route.defaults) return;
  for (const [k, v] of Object.entries(route.defaults)) {
    if (isEmpty(params[k])) {
      params[k] = v;
    }
  }
}

function parseDate(value, fieldName, apiName) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${apiName} 参数 ${fieldName} 日期格式必须为 YYYY-MM-DD: ${value}`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const t = Date.UTC(year, month - 1, day);
  const d = new Date(t);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    throw new Error(`${apiName} 参数 ${fieldName} 日期不合法: ${value}`);
  }
  return t;
}

function validateDateRange(params, rule, apiName) {
  const { startField, endField, maxDays } = rule;
  const sv = params[startField];
  const ev = params[endField];
  if (isEmpty(sv) || isEmpty(ev)) return;
  const s = parseDate(sv, startField, apiName);
  const e = parseDate(ev, endField, apiName);
  const days = Math.abs(e - s) / DAY_MS;
  // 安全缓冲：>90天放宽4天，≥3天放宽2天，避免LLM按月估算时被边界拒绝
  const effectiveMax = maxDays > 90 ? maxDays + 4 : (maxDays >= 3 ? maxDays + 2 : maxDays);
  if (days > effectiveMax) {
    throw new Error(
      `${apiName} 参数 ${startField}(${sv}) 与 ${endField}(${ev}) 间隔超过 ${maxDays} 天，请缩小查询区间`
    );
  }
}

function validateMaxStartAge(params, rule, apiName) {
  const { field, maxYears } = rule;
  const sv = params[field];
  if (isEmpty(sv)) return;
  const s = parseDate(sv, field, apiName);
  const now = Date.now();
  const years = (now - s) / (DAY_MS * 365.25);
  if (years > maxYears) {
    throw new Error(
      `${apiName} 参数 ${field}(${sv}) 距今超过 ${maxYears} 年，请使用更近的起始日期`
    );
  }
}

function applyConstraints(route, apiName, params, userFields) {
  if (!route.constraints) return;
  if (route.constraints.maxStartAge) {
    validateMaxStartAge(params, route.constraints.maxStartAge, apiName);
  }
  if (route.constraints.dateRange) {
    validateDateRange(params, route.constraints.dateRange, apiName);
  }
  if (route.constraints.dynamicDateRange) {
    const dr = route.constraints.dynamicDateRange;
    const count = userFields ? userFields.length : 0;
    const maxDays = (count > 0 && count <= dr.threshold) ? dr.sparse : dr.default;
    validateDateRange(params, { ...dr, maxDays }, apiName);
  }
}

function applyForced(route, params) {
  if (!route.forced) return;
  for (const key of Object.keys(route.forced)) {
    delete params[key];
  }
  Object.assign(params, route.forced);
}

function normalizeFields(value, apiName) {
  if (value === null || value === undefined || value === '') return null;
  let arr;
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === 'string') {
    arr = value.split(',');
  } else {
    throw new Error(`${apiName} 参数 fields 必须为字符串或字符串数组`);
  }
  arr = arr.map((s) => String(s).trim()).filter(Boolean);
  if (arr.length === 0) return null;
  return arr;
}

function applyCompTypeFields(route, apiName, params) {
  if (!route.compTypeFields) return null;
  const ct = params.comp_type;
  const key = String(ct);
  const fieldsStr = route.compTypeFields[key] || route.compTypeFields[ct];
  if (!fieldsStr) {
    const allowed = Object.keys(route.compTypeFields).join('/');
    throw new Error(`${apiName} 参数 comp_type 非法: ${ct}（允许值：${allowed}）`);
  }
  return fieldsStr.split(',').map((s) => s.trim()).filter(Boolean);
}

function pickFields(obj, fields) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(obj, f)) {
      out[f] = obj[f];
    }
  }
  return out;
}

function renameKeys(obj, renameMap) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = Object.prototype.hasOwnProperty.call(renameMap, k) ? renameMap[k] : k;
    out[nk] = v;
  }
  return out;
}

/**
 * 对响应中的 items[]（或 data 顶层对象/数组）应用字段重命名。
 */
function renameFieldsInResponse(result, renameMap) {
  if (!renameMap || Object.keys(renameMap).length === 0) return result;
  if (!result || typeof result !== 'object' || result.data === undefined || result.data === null) {
    return result;
  }
  const data = result.data;
  if (Array.isArray(data)) {
    result.data = data.map((item) => renameKeys(item, renameMap));
  } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
    result.data = {
      ...data,
      items: data.items.map((item) => renameKeys(item, renameMap)),
    };
  } else if (data && typeof data === 'object') {
    result.data = renameKeys(data, renameMap);
  }
  return result;
}

/**
 * 按 fields 过滤 data 中的字段。
 * - data 为对象且含 items 数组：对 items[] 每个元素过滤，外层分页字段保留
 * - data 为数组：对每个元素过滤
 * - data 为对象：对 data 顶层字段过滤
 */
function filterFieldsInResponse(result, fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) return result;
  if (!result || typeof result !== 'object' || result.data === undefined || result.data === null) {
    return result;
  }
  const data = result.data;
  if (Array.isArray(data)) {
    result.data = data.map((item) => pickFields(item, fields));
  } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
    result.data = {
      ...data,
      items: data.items.map((item) => pickFields(item, fields)),
    };
  } else if (data && typeof data === 'object') {
    result.data = pickFields(data, fields);
  }
  return result;
}

/**
 * 穿透响应结构：去掉外层 {code, message, data}，直接返回 data 值。
 * - data 为分页结构（含 items 数组）→ 返回 items[]
 * - data 为数组 → 直接返回数组
 * - data 为单对象 → 直接返回对象
 */
function unwrapResponse(result) {
  if (!result || typeof result !== 'object') return result;
  const data = result.data;
  if (data === undefined || data === null) return null;
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && Array.isArray(data.items)) return data.items;
  return data;
}

/**
 * 剔除响应中 stripFields 指定的字段（黑名单机制）。
 * 在 renameFieldsInResponse 之后、filterFieldsInResponse 之前调用。
 */
function stripFieldsInResponse(result, stripFields) {
  if (!stripFields || !Array.isArray(stripFields) || stripFields.length === 0) return result;
  if (!result || typeof result !== 'object' || result.data === undefined || result.data === null) {
    return result;
  }
  const data = result.data;
  const remove = (obj) => {
    for (const f of stripFields) delete obj[f];
    return obj;
  };
  if (Array.isArray(data)) {
    result.data = data.map(remove);
  } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
    result.data = { ...data, items: data.items.map(remove) };
  } else if (data && typeof data === 'object') {
    remove(data);
  }
  return result;
}

/**
 * 响应数据变换函数注册表。
 * 变换在 stripFields / filterFields 之前执行，可直接操作原始字段计算派生值。
 */
const TRANSFORMS = {
  /**
   * moneyflowNet: 将买卖金额转换为净额
   * - net_sm_amount = buy_sm_amount - sell_sm_amount
   * - net_md_amount = buy_md_amount - sell_md_amount
   * - net_lg_amount = buy_lg_amount - sell_lg_amount
   * - net_elg_amount = buy_elg_amount - sell_elg_amount
   * - net_mf_amount 保持原值
   */
  moneyflowNet(result) {
    if (!result || typeof result !== 'object' || result.data === undefined || result.data === null) {
      return result;
    }
    const transform = (obj) => {
      obj.net_sm_amount = round4((obj.buy_sm_amount || 0) - (obj.sell_sm_amount || 0));
      obj.net_md_amount = round4((obj.buy_md_amount || 0) - (obj.sell_md_amount || 0));
      obj.net_lg_amount = round4((obj.buy_lg_amount || 0) - (obj.sell_lg_amount || 0));
      obj.net_elg_amount = round4((obj.buy_elg_amount || 0) - (obj.sell_elg_amount || 0));
      return obj;
    };
    const data = result.data;
    if (Array.isArray(data)) {
      result.data = data.map(transform);
    } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
      result.data = { ...data, items: data.items.map(transform) };
    } else if (data && typeof data === 'object') {
      transform(data);
    }
    return result;
  },
};

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function applyTransform(result, transformName) {
  if (!transformName || !TRANSFORMS[transformName]) return result;
  return TRANSFORMS[transformName](result);
}

function assertBusinessSuccess(result) {
  if (!result || typeof result !== 'object' || !Object.prototype.hasOwnProperty.call(result, 'code')) {
    return;
  }
  if (result.code !== 200) {
    const message = result.message || JSON.stringify(result);
    throw new Error(`API 返回失败 code=${result.code}: ${message}`);
  }
}

function normalizeEmptyData(result) {
  if (!result || typeof result !== 'object' || result.data === undefined || result.data === null) {
    return result;
  }
  const data = result.data;
  if (Array.isArray(data) && data.length === 0) {
    result.data = null;
  } else if (data && typeof data === 'object' && Array.isArray(data.items) && data.items.length === 0) {
    result.data = null;
  }
  return result;
}

async function callApi(apiName, params = {}) {
  const route = API_ROUTES[apiName];
  if (!route) {
    const names = Object.keys(API_ROUTES).join(', ');
    throw new Error(`未知接口: ${apiName}. 可用接口: ${names}`);
  }

  const requestParams = { ...params };

  // 提取 fields（不参与请求，仅用于响应字段裁剪）
  let userFields = null;
  if (Object.prototype.hasOwnProperty.call(requestParams, 'fields')) {
    userFields = normalizeFields(requestParams.fields, apiName);
    requestParams.fields = userFields && userFields.length > 0 ? userFields.join(',') : '';
  }

  // 必填项校验（基于 skill 友好的入参名，比如 stock_name）
  applyRequired(route, apiName, requestParams);
  delete requestParams.fields;

  // 入参别名映射：skill 友好名 -> 后端字段名（如 stock_name -> name）
  applyParamMap(route, requestParams);

  // 默认值（如 report_type=1）
  applyDefaults(route, requestParams);

  // 区间/起始日期校验
  applyConstraints(route, apiName, requestParams, userFields);

  // 按 comp_type 自动注入裁剪字段（明细 Tool 用）
  // 优先级：用户传入 fields > comp_type 对应的默认字段集
  let effectiveFields = userFields;
  if (route.compTypeFields) {
    if (userFields && userFields.length > 0) {
      // 用户明确指定了 fields，直接使用
      effectiveFields = userFields;
    } else if (!isEmpty(requestParams.comp_type)) {
      // 未传 fields，根据 comp_type 自动确定字段集
      const ctFields = applyCompTypeFields(route, apiName, requestParams);
      effectiveFields = ctFields;
    }
  }

  // 写死内部参数（覆盖调用方传入的 page / page_size 等）
  applyForced(route, requestParams);

  // 动态 limit：fields 字段数 ≤ threshold 时放宽到 sparse，否则使用 default
  if (route.dynamicLimit) {
    const dl = route.dynamicLimit;
    const count = effectiveFields ? effectiveFields.length : 0;
    requestParams.limit = (count > 0 && count <= dl.threshold) ? dl.sparse : dl.default;
  }

  // 动态 page_size：fields 字段数 ≤ threshold 时放宽到 sparse，否则使用 default
  if (route.dynamicPageSize) {
    const dps = route.dynamicPageSize;
    const count = effectiveFields ? effectiveFields.length : 0;
    requestParams.page_size = (count > 0 && count <= dps.threshold) ? dps.sparse : dps.default;
  }

  const url = buildUrl(route.path, requestParams);
  let body = null;

  if (route.method === 'GET') {
    appendQuery(url, requestParams);
  } else {
    body = JSON.stringify(requestParams);
  }

  const headers = {
    'Accept': 'application/json',
  };
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  const transport = url.protocol === 'http:' ? http : https;
  const options = {
    method: route.method,
    headers,
  };

  const result = await new Promise((resolve, reject) => {
    const req = transport.request(url, options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const contentType = res.headers['content-type'] || '';
        let parsed;

        try {
          parsed = parseBody(raw, contentType);
        } catch (err) {
          reject(new Error(`响应 JSON 解析失败: ${err.message}. 原始响应: ${raw}`));
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const bodyText = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          reject(new Error(`HTTP ${res.statusCode}: ${bodyText}`));
          return;
        }

        resolve(parsed);
      });
    });

    req.on('error', (err) => reject(new Error(`请求失败: ${err.message}`)));

    if (body !== null) req.write(body);
    req.end();
  });

  assertBusinessSuccess(result);
  normalizeEmptyData(result);

  // 字段重命名 → 变换计算 → 剔除黑名单 → fields 白名单裁剪 → 穿透
  const renamed = renameFieldsInResponse(result, route.renameMap || {});
  const transformed = applyTransform(renamed, route.transform);
  const stripped = stripFieldsInResponse(transformed, route.stripFields);
  const filtered = filterFieldsInResponse(stripped, effectiveFields);
  return unwrapResponse(filtered);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.api) {
    throw new Error('缺少参数: --api <接口名>');
  }

  let params = {};
  if (args.params) {
    try {
      params = JSON.parse(args.params);
    } catch (err) {
      throw new Error(`--params 不是合法 JSON: ${err.message}`);
    }
  }

  const result = await callApi(args.api, params);

  if (args.output === 'save') {
    // Save full data to file, print summary only (token-saving mode)
    const outDir = args.dir || process.cwd();
    fs.mkdirSync(outDir, { recursive: true });

    // Filename: data-<datetime>-<N>.json (N prevents collision within same second)
    const ts = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    let n = 1;
    let filepath;
    do {
      filepath = path.join(outDir, `data-${ts}-${n}.json`);
      n++;
    } while (fs.existsSync(filepath));

    const jsonStr = JSON.stringify(result, null, 2);
    fs.writeFileSync(filepath, jsonStr, 'utf-8');

    // Print summary to stdout
    const records = Array.isArray(result) ? result : (result && result.items ? result.items : [result]);
    const count = Array.isArray(records) ? records.length : 1;
    const fields = count > 0 && typeof records[0] === 'object' ? Object.keys(records[0]).join(', ') : '';
    const sample = JSON.stringify(records.slice(0, 2));

    console.log(`[DataSaved] ${filepath}`);
    console.log(`Records: ${count} | Fields: ${fields}`);
    if (count > 0) console.log(`Sample(2): ${sample.slice(0, 500)}`);
    console.log(`Hint: read("${filepath}", offset, limit) 按需查看`);
  } else {
    // Default: full output (backward compatible)
    console.log(JSON.stringify(result, null, 2));
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { API_ROUTES, callApi };
