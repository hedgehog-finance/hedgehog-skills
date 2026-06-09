#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'https://api.ciweiai.com/api/data';

const DAY_MS = 24 * 60 * 60 * 1000;

// 公司类型 -> 字段裁剪集合（用于 *Detail 三个明细 Tool，脚本根据 comp_type 自动设置 fields）
const INCOME_DETAIL_FIELDS = {
  1: 'stock_code,ann_date,end_date,comp_type,n_income_attr_p,net_after_nr_lp_correct,basic_eps,total_revenue,revenue,oper_cost,sell_exp,admin_exp,rd_exp,fin_exp,operate_profit,ebit,ebitda,assets_impair_loss,credit_impa_loss',
  2: 'stock_code,ann_date,end_date,comp_type,n_income_attr_p,net_after_nr_lp_correct,basic_eps,int_income,int_exp,comm_income,comm_exp,n_commis_income,credit_impa_loss',
  3: 'stock_code,ann_date,end_date,comp_type,n_income_attr_p,net_after_nr_lp_correct,basic_eps,prem_earned,prem_income,out_prem,compens_payout,reser_insur_liab,une_prem_reser,invest_income,fv_value_chg_gain',
  4: 'stock_code,ann_date,end_date,comp_type,n_income_attr_p,net_after_nr_lp_correct,basic_eps,n_sec_tb_income,n_sec_uw_income,n_asset_mg_income,int_income,invest_income,fv_value_chg_gain',
};

const BALANCE_DETAIL_FIELDS = {
  1: 'stock_code,ann_date,end_date,comp_type,total_assets,total_liab,total_hldr_eqy_exc_min_int,money_cap,accounts_receiv,inventories,contract_assets,fix_assets_total,cip_total,intan_assets,goodwill,st_borr,lt_borr,accounts_pay,contract_liab',
  2: 'stock_code,ann_date,end_date,comp_type,total_assets,total_liab,total_hldr_eqy_exc_min_int,cash_reser_cb,depos_in_oth_bfi,loanto_oth_bank_fi,decr_in_disbur,trad_asset,cb_borr,depos,depos_oth_bfi,loan_oth_bank',
  3: 'stock_code,ann_date,end_date,comp_type,total_assets,total_liab,total_hldr_eqy_exc_min_int,money_cap,premium_receiv,fair_value_fin_assets,cost_fin_assets,invest_real_estate,rsrv_insur_cont,indem_payable,policy_div_payable',
  4: 'stock_code,ann_date,end_date,comp_type,total_assets,total_liab,total_hldr_eqy_exc_min_int,money_cap,client_depos,client_prov,lending_funds,trad_asset,pur_resale_fa,acting_trading_sec,acting_uw_sec,st_fin_payable,sold_for_repur_fa,bond_payable',
};

const CASHFLOW_DETAIL_FIELDS = {
  1: 'stock_code,ann_date,end_date,comp_type,net_profit,c_fr_sale_sg,c_paid_goods_s,c_paid_to_for_empl,n_cashflow_act,c_pay_acq_const_fiolta,free_cashflow,n_cashflow_inv_act,c_recp_borrow,c_prepay_amt_borr,c_pay_dist_dpcp_int_exp,n_cash_flows_fnc_act,n_incr_cash_cash_equ',
  2: 'stock_code,ann_date,end_date,comp_type,net_profit,n_depos_incr_fi,n_incr_loans_cb,n_inc_borr_oth_fi,n_incr_clt_loan_adv,n_incr_dep_cbob,n_cashflow_act,n_cashflow_inv_act,proc_issue_bonds,n_cash_flows_fnc_act,n_incr_cash_cash_equ',
  3: 'stock_code,ann_date,end_date,comp_type,net_profit,prem_fr_orig_contr,n_reinsur_prem,c_pay_claims_orig_inco,pay_comm_insur_plcy,n_cashflow_act,c_paid_invest,c_recp_return_invest,n_cashflow_inv_act,n_cash_flows_fnc_act,n_incr_cash_cash_equ',
  4: 'stock_code,ann_date,end_date,comp_type,net_profit,net_cash_rece_sec,ifc_cash_incr,n_cap_incr_repur,n_incr_disp_tfa,n_cashflow_act,c_paid_invest,c_recp_return_invest,n_cashflow_inv_act,proc_issue_bonds,c_recp_borrow,n_cash_flows_fnc_act,n_incr_cash_cash_equ',
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
 *   constraints:
 *     dateRange:    { startField, endField, maxDays }
 *     maxStartAge:  { field, maxYears } 起始日期距今不超过 N 年
 */
const API_ROUTES = {
  // ===== Tool-1 股票基础信息 =====
  getStockBasic: {
    method: 'GET',
    path: '/v1/stock/basic',
    requireAny: [['stock_code', 'stock_name']],
    paramMap: { stock_name: 'name' },
    renameMap: { name: 'stock_name' },
  },

  // ===== Tool-2 股票日线行情 =====
  queryStockDaily: {
    method: 'GET',
    path: '/v1/stock/daily',
    require: ['stock_code'],
    forced: { limit: 300 },
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
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 31 },
    },
  },

  // ===== Tool-4 个股资金流向 =====
  queryMoneyflow: {
    method: 'GET',
    path: '/v1/finance/moneyflow',
    require: ['stock_code'],
    forced: { page: 1, page_size: 200 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 31 },
    },
  },

  // ===== Tool-5 利润表（汇总） =====
  queryIncome: {
    method: 'GET',
    path: '/v1/finance/income',
    require: ['stock_code'],
    forced: { page: 1, page_size: 6 },

    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 550 },
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
    compTypeFields: INCOME_DETAIL_FIELDS,

    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 366 },
    },
  },

  // ===== Tool-6 资产负债表（汇总） =====
  queryBalanceSheet: {
    method: 'GET',
    path: '/v1/finance/balance-sheet',
    require: ['stock_code'],
    forced: { page: 1, page_size: 6 },

    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 550 },
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
    compTypeFields: BALANCE_DETAIL_FIELDS,

    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 31 },
    },
  },

  // ===== Tool-7 现金流量表（汇总） =====
  queryCashFlow: {
    method: 'GET',
    path: '/v1/finance/cash-flow',
    require: ['stock_code'],
    forced: { page: 1, page_size: 6 },

    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 550 },
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
    compTypeFields: CASHFLOW_DETAIL_FIELDS,

    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 31 },
    },
  },

  // ===== Tool-8 财务指标 =====
  queryFinanceIndicator: {
    method: 'GET',
    path: '/v1/finance/indicator',
    require: ['stock_code'],
    forced: { page: 1, page_size: 4 },

    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 366 },
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
    forced: { page: 1, page_size: 4 },
    renameMap: { bz_code: 'bz_type' },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 366 },
    },
  },

  // ===== Tool-11 申万行业成分构成 =====
  querySwIndustryMember: {
    method: 'GET',
    path: '/v1/stock/sw-industry-member',
    require: ['stock_code'],
    forced: { is_new: 'Y', page: 1, page_size: 300 },
    renameMap: { name: 'stock_name' },
  },

  // ===== Tool-12 申万行业日线行情 =====
  querySwIndustryDaily: {
    method: 'GET',
    path: '/v1/stock/sw-industry-daily',
    require: ['index_code'],
    forced: { page: 1, page_size: 300 },
    constraints: {
      maxStartAge: { field: 'start_date', maxYears: 10 },
      dateRange: { startField: 'start_date', endField: 'end_date', maxDays: 31 },
    },
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
  if (days > maxDays) {
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

function applyConstraints(route, apiName, params) {
  if (!route.constraints) return;
  if (route.constraints.maxStartAge) {
    validateMaxStartAge(params, route.constraints.maxStartAge, apiName);
  }
  if (route.constraints.dateRange) {
    validateDateRange(params, route.constraints.dateRange, apiName);
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
  applyConstraints(route, apiName, requestParams);

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

  // 先做字段重命名（后端字段 -> skill 对外字段），再按 fields 裁剪
  const renamed = renameFieldsInResponse(result, route.renameMap || {});
  return filterFieldsInResponse(renamed, effectiveFields);
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
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { API_ROUTES, callApi };
