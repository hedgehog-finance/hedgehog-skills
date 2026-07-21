#!/usr/bin/env node
/**
 * Tech-Indicators — 本地技术指标计算引擎
 * Usage: node calc.mjs <data.json> <output> [options]
 *
 * 输入: JSON 数组 [{open, high, low, close, volume?, date?}, ...]
 * 输出: 追加指标列的 JSON 或 Markdown 表格
 */

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { markdownTable } from "markdown-table";

const require = createRequire(import.meta.url);
const FTI = require("fast-technical-indicators");

// ─── CLI ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const inputPath = args[0];
const outputPath = args[1];

if (!inputPath) {
  console.error("Usage: calc.mjs <data.json> <output> [options]");
  console.error("");
  console.error("Options:");
  console.error("  --indicators=sma,ema,rsi,...   逗号分隔指标名（默认: sma,ema,rsi,macd,bollingerbands）");
  console.error("  --params=<file.json>            自定义参数覆盖（可选）");
  console.error("  --format=json|markdown          输出格式（默认: json）");
  console.error("  --list                          列出所有支持的指标名称");
  process.exit(1);
}

// ─── 指标注册表 ─────────────────────────────────────────────────────────────

/** 简单收盘价指标: (values, params) => number[] */
const VALUE_INDICATORS = {
  sma:           (v, p) => FTI.sma({ values: v, period: p.period ?? 14 }),
  ema:           (v, p) => FTI.ema({ values: v, period: p.period ?? 14 }),
  wma:           (v, p) => FTI.wma({ values: v, period: p.period ?? 14 }),
  wema:          (v, p) => FTI.wema({ values: v, period: p.period ?? 14 }),
  rsi:           (v, p) => FTI.rsi({ values: v, period: p.period ?? 14 }),
  macd:          (v, p) => FTI.macd({
                   values: v,
                   fastPeriod: p.fastPeriod ?? 12,
                   slowPeriod: p.slowPeriod ?? 26,
                   signalPeriod: p.signalPeriod ?? 9,
                   SimpleMAOscillator: false,
                   SimpleMASignal: false,
                 }),
  bollingerbands:(v, p) => FTI.bollingerbands({ values: v, period: p.period ?? 20, stdDev: p.stdDev ?? 2 }),
  roc:           (v, p) => FTI.roc({ values: v, period: p.period ?? 9 }),
  ppo:           (v, p) => FTI.ppo({
                   values: v,
                   fastPeriod: p.fastPeriod ?? 12,
                   slowPeriod: p.slowPeriod ?? 26,
                   signalPeriod: p.signalPeriod ?? 9,
                   SimpleMAOscillator: false,
                   SimpleMASignal: false,
                 }),
  trix:          (v, p) => FTI.trix({ values: v, period: p.period ?? 15 }),
  sd:            (v, p) => FTI.sd({ values: v, period: p.period ?? 14 }),
  kst:           (v, p) => FTI.kst({
                   values: v,
                   ROCPer1: p.ROCPer1 ?? 10,
                   ROCPer2: p.ROCPer2 ?? 15,
                   ROCPer3: p.ROCPer3 ?? 20,
                   ROCPer4: p.ROCPer4 ?? 30,
                   SMAROCPer1: p.SMAROCPer1 ?? 10,
                   SMAROCPer2: p.SMAROCPer2 ?? 10,
                   SMAROCPer3: p.SMAROCPer3 ?? 10,
                   SMAROCPer4: p.SMAROCPer4 ?? 15,
                   signalPeriod: p.signalPeriod ?? 3,
                 }),
  dpo:           (v, p) => FTI.dpo({ values: v, period: p.period ?? 21 }),
  linearregression:(v, p) => FTI.linearregression({ values: v, period: p.period ?? 14 }),
  cci:           (v, p) => FTI.cci({ high: [], low: [], close: [], period: p.period ?? 20 }),
  // cci 需要 OHLC，放到 OHLC 组
  stochasticrsi: (v, p) => FTI.stochasticrsi({
                   values: v,
                   rsiPeriod: p.rsiPeriod ?? 14,
                   stochasticPeriod: p.stochasticPeriod ?? 14,
                   kPeriod: p.kPeriod ?? 3,
                   dPeriod: p.dPeriod ?? 3,
                 }),
  maenvelope:    (v, p) => FTI.maenvelope({
                   values: v,
                   period: p.period ?? 20,
                   type: p.type ?? "SMA",
                   deviation: p.deviation ?? 0.025,
                 }),
  ultimateoscillator:(v, p) => FTI.ultimateoscillator({
                   high: [], low: [], close: [],
                   shortPeriod: p.shortPeriod ?? 7,
                   mediumPeriod: p.mediumPeriod ?? 14,
                   longPeriod: p.longPeriod ?? 28,
                 }),
  priceoscillator:(v, p) => FTI.priceoscillator({
                   values: v,
                   fastPeriod: p.fastPeriod ?? 10,
                   slowPeriod: p.slowPeriod ?? 21,
                 }),
  fibonacci:     (v, p) => FTI.fibonacci({ high: Math.max(...v), low: Math.min(...v), period: p.period ?? 200 }),
  renko:         (v, p) => FTI.renko({ values: v, fixedBrickSize: p.fixedBrickSize ?? 2 }),
  volatilityindex:(v, p) => FTI.volatilityindex({ values: v, period: p.period ?? 14 }),
  heikinashi:    null, // 特殊处理：需要 OHLC 结构
};

/** OHLC 指标: (data, params) => object[]|number[] */
const OHLC_INDICATORS = {
  stochastic:    (d, p) => FTI.stochastic({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 14, signalPeriod: p.signalPeriod ?? 3,
                 }),
  kdj:           (d, p) => {
                   const stoch = FTI.stochastic({
                     high: d.high, low: d.low, close: d.close,
                     period: p.period ?? 9, signalPeriod: p.signalPeriod ?? 3,
                   });
                   return stoch.map(item => {
                     const k = item.k ?? null;
                     const d_val = item.d ?? null;
                     const j = (k !== null && d_val !== null) ? 3 * k - 2 * d_val : null;
                     return { k, d: d_val, j };
                   });
                 },
  adx:           (d, p) => FTI.adx({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 14,
                 }),
  atr:           (d, p) => FTI.atr({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 14,
                 }),
  williamsr:     (d, p) => FTI.williamsr({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 14,
                 }),
  psar:          (d, p) => FTI.psar({
                   high: d.high, low: d.low,
                   step: p.step ?? 0.02, max: p.max ?? 0.2,
                 }),
  supertrend:    (d, p) => FTI.supertrend({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 10, multiplier: p.multiplier ?? 3,
                 }),
  mfi:           (d, p) => FTI.mfi({
                   high: d.high, low: d.low, close: d.close, volume: d.volume,
                   period: p.period ?? 14,
                 }),
  dmi:           (d, p) => FTI.dmi({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 14,
                 }),
  cci:           (d, p) => FTI.cci({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 20,
                 }),
  aroon:         (d, p) => FTI.aroon({
                   high: d.high, low: d.low,
                   period: p.period ?? 25,
                 }),
  aroonoscillator:(d, p) => FTI.aroonoscillator({
                   high: d.high, low: d.low,
                   period: p.period ?? 25,
                 }),
  adl:           (d, p) => FTI.adl({
                   high: d.high, low: d.low, close: d.close, volume: d.volume,
                 }),
  donchianchannels:(d, p) => FTI.donchianchannels({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 20,
                 }),
  keltnerchannels:(d, p) => FTI.keltnerchannels({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 20, atrPeriod: p.atrPeriod ?? 10,
                   multiplier: p.multiplier ?? 2,
                 }),
  chandelierexit:(d, p) => FTI.chandelierexit({
                   high: d.high, low: d.low, close: d.close,
                   period: p.period ?? 22, multiplier: p.multiplier ?? 3,
                 }),
  forceindex:    (d, p) => FTI.forceindex({
                   high: d.high, low: d.low, close: d.close, volume: d.volume,
                   period: p.period ?? 13,
                 }),
  vwap:          (d, p) => FTI.vwap({
                   high: d.high, low: d.low, close: d.close, volume: d.volume,
                 }),
  obv:           (d, p) => FTI.obv({ close: d.close, volume: d.volume }),
  ichimokucloud: (d, p) => FTI.ichimokucloud({
                   high: d.high, low: d.low,
                   conversionPeriod: p.conversionPeriod ?? 9,
                   basePeriod: p.basePeriod ?? 26,
                   spanPeriod: p.spanPeriod ?? 52,
                   displacement: p.displacement ?? 26,
                 }),
  ultimateoscillator:(d, p) => FTI.ultimateoscillator({
                   high: d.high, low: d.low, close: d.close,
                   shortPeriod: p.shortPeriod ?? 7,
                   mediumPeriod: p.mediumPeriod ?? 14,
                   longPeriod: p.longPeriod ?? 28,
                 }),
};

/** K 线形态识别: (candles) => boolean[] */
const PATTERN_INDICATORS = {
  doji:                     c => FTI.doji({ candles: c }),
  hammer:                   c => FTI.hammer({ candles: c }),
  spinningtop:              c => FTI.spinningtop({ candles: c }),
  marubozu:                 c => FTI.marubozu({ candles: c }),
  shootingstar:             c => FTI.shootingstar({ candles: c }),
  bullishengulfing:         c => FTI.bullishengulfingpattern({ candles: c }),
  bearishengulfing:         c => FTI.bearishengulfingpattern({ candles: c }),
  bullishharami:            c => FTI.bullishharami({ candles: c }),
  bearishharami:            c => FTI.bearishharami({ candles: c }),
  bullishharamicross:       c => FTI.bullishharamicross({ candles: c }),
  bearishharamicross:       c => FTI.bearishharamicross({ candles: c }),
  morningstar:              c => FTI.morningstar({ candles: c }),
  eveningstar:              c => FTI.eveningstar({ candles: c }),
  morningdojistar:          c => FTI.morningdojistar({ candles: c }),
  eveningdojistar:          c => FTI.eveningdojistar({ candles: c }),
  threewhitesoldiers:       c => FTI.threewhitesoldiers({ candles: c }),
  threeblackcrows:          c => FTI.threeblackcrows({ candles: c }),
  piercingline:             c => FTI.piercingline({ candles: c }),
  darkcloudcover:           c => FTI.darkcloudcover({ candles: c }),
  dragonflydoji:            c => FTI.dragonflydoji({ candles: c }),
  gravestonedoji:           c => FTI.gravestonedoji({ candles: c }),
  bullishhammerstick:       c => FTI.bullishhammerstick({ candles: c }),
  bearishhammerstick:       c => FTI.bearishhammerstick({ candles: c }),
  bullishinvertedhammer:    c => FTI.bullishinvertedhammer({ candles: c }),
  bearishinvertedhammer:    c => FTI.bearishinvertedhammer({ candles: c }),
  bullishmarubozu:          c => FTI.bullishmarubozu({ candles: c }),
  bearishmarubozu:          c => FTI.bearishmarubozu({ candles: c }),
  bullishspinningtop:       c => FTI.bullishspinningtop({ candles: c }),
  bearishspinningtop:       c => FTI.bearishspinningtop({ candles: c }),
  hangingman:               c => FTI.hangingman({ candles: c }),
  hangingmanunconfirmed:    c => FTI.hangingmanunconfirmed({ candles: c }),
  tweezerbottom:            c => FTI.tweezerbottom({ candles: c }),
  tweezertop:               c => FTI.tweezertop({ candles: c }),
  abandonedbaby:            c => FTI.abandonedbaby({ candles: c }),
  downsidetasukigap:        c => FTI.downsidetasukigap({ candles: c }),
};

// ─── 列出所有指标 ────────────────────────────────────────────────────────────
const listArg = args.find(a => a === "--list");
if (listArg) {
  const all = [
    ...Object.keys(VALUE_INDICATORS).filter(k => k !== "cci" && k !== "ultimateoscillator" && k !== "fibonacci" && k !== "heikinashi"),
    ...Object.keys(OHLC_INDICATORS),
    ...Object.keys(PATTERN_INDICATORS),
  ];
  const unique = [...new Set(all)].sort();
  console.log(`共 ${unique.length} 个指标:\n${unique.join(", ")}`);
  process.exit(0);
}

// ─── 解析选项 ────────────────────────────────────────────────────────────────
const indArg = args.find(a => a.startsWith("--indicators="));
const paramsArg = args.find(a => a.startsWith("--params="));
const formatArg = args.find(a => a.startsWith("--format="));
const format = formatArg ? formatArg.split("=")[1].toLowerCase() : "json";

if (!["json", "markdown"].includes(format)) {
  console.error(`Error: 不支持的格式 "${format}"，可选: json, markdown`);
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.error(`Error: 文件不存在: ${inputPath}`);
  process.exit(1);
}

// ─── 读取数据 ────────────────────────────────────────────────────────────────
const rawData = JSON.parse(readFileSync(inputPath, "utf-8"));
if (!Array.isArray(rawData) || rawData.length === 0) {
  console.error("Error: 输入必须是 JSON 数组且至少包含 1 条数据");
  process.exit(1);
}

// 标准化字段名
const data = rawData.map(row => ({
  date:   row.date ?? row.time ?? row.timestamp ?? "",
  open:   Number(row.open ?? row.Open ?? 0),
  high:   Number(row.high ?? row.High ?? 0),
  low:    Number(row.low ?? row.Low ?? 0),
  close:  Number(row.close ?? row.Close ?? 0),
  volume: Number(row.volume ?? row.Volume ?? 0),
}));

// 提取数组
const closeArr = data.map(d => d.close);
const ohlcData = {
  high: data.map(d => d.high),
  low: data.map(d => d.low),
  close: closeArr,
  volume: data.map(d => d.volume),
};
const candles = data.map(d => ({ open: d.open, high: d.high, low: d.low, close: d.close }));

// ─── 加载自定义参数 ─────────────────────────────────────────────────────────
let customParams = {};
if (paramsArg) {
  const pFile = paramsArg.split("=")[1];
  if (existsSync(pFile)) {
    customParams = JSON.parse(readFileSync(pFile, "utf-8"));
  } else {
    console.error(`Warning: params file not found: ${pFile}`);
  }
}

// ─── 解析指标列表 ────────────────────────────────────────────────────────────
const DEFAULT_INDICATORS = ["sma", "ema", "rsi", "macd", "bollingerbands"];
const requestedNames = indArg
  ? indArg.split("=")[1].split(",").map(s => s.trim().toLowerCase())
  : DEFAULT_INDICATORS;

// 处理 "all" 快捷方式
const ALL_NAMES = [
  ...Object.keys(VALUE_INDICATORS).filter(k => k !== "cci" && k !== "ultimateoscillator" && k !== "fibonacci" && k !== "heikinashi"),
  ...Object.keys(OHLC_INDICATORS),
  ...Object.keys(PATTERN_INDICATORS),
];
const allUnique = [...new Set(ALL_NAMES)];
const finalNames = requestedNames.includes("all") ? allUnique : requestedNames;

// ─── 计算指标 ────────────────────────────────────────────────────────────────
const resultRows = data.map(d => ({ date: d.date, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume }));
const computed = [];
const warnings = [];

for (const name of finalNames) {
  const params = customParams[name] ?? {};

  // 1) K 线形态
  if (PATTERN_INDICATORS[name]) {
    try {
      const res = PATTERN_INDICATORS[name](candles);
      for (let i = 0; i < resultRows.length; i++) {
        resultRows[i][name] = res[i] ?? null;
      }
      computed.push(name);
    } catch (e) {
      warnings.push(`${name}: ${e.message}`);
    }
    continue;
  }

  // 2) OHLC 指标
  if (OHLC_INDICATORS[name]) {
    try {
      const res = OHLC_INDICATORS[name](ohlcData, params);
      applyResult(resultRows, name, res);
      computed.push(name);
    } catch (e) {
      warnings.push(`${name}: ${e.message}`);
    }
    continue;
  }

  // 3) 简单收盘价指标
  if (VALUE_INDICATORS[name] && name !== "cci" && name !== "ultimateoscillator" && name !== "fibonacci" && name !== "heikinashi") {
    try {
      const res = VALUE_INDICATORS[name](closeArr, params);
      applyResult(resultRows, name, res);
      computed.push(name);
    } catch (e) {
      warnings.push(`${name}: ${e.message}`);
    }
    continue;
  }

  warnings.push(`${name}: 未知指标`);
}

// ─── 结果映射 ────────────────────────────────────────────────────────────────
function applyResult(rows, name, res) {
  if (!res || res.length === 0) return;

  // 结果可能是 number[] 或 object[]
  const first = res[0];
  if (typeof first === "number" || first === null) {
    // number[] — 前 N 个元素可能缺失（前导 null）
    const offset = rows.length - res.length;
    for (let i = 0; i < rows.length; i++) {
      const idx = i - offset;
      rows[i][name] = idx >= 0 && idx < res.length ? res[idx] : null;
    }
  } else if (typeof first === "object" && first !== null) {
    // object[] — 展开字段，如 {MACD, signal, histogram}
    const keys = Object.keys(first);
    const offset = rows.length - res.length;
    for (let i = 0; i < rows.length; i++) {
      const idx = i - offset;
      if (idx >= 0 && idx < res.length && res[idx]) {
        for (const k of keys) {
          rows[i][`${name}_${k}`] = res[idx][k] ?? null;
        }
      } else {
        for (const k of keys) {
          rows[i][`${name}_${k}`] = null;
        }
      }
    }
  }
}

// ─── 输出 ────────────────────────────────────────────────────────────────────
if (!outputPath) {
  console.error("Error: 需要指定 <output> 路径");
  process.exit(1);
}

let outputContent;

if (format === "markdown") {
  if (resultRows.length === 0) {
    outputContent = "(无数据)";
  } else {
    const headers = Object.keys(resultRows[0]);
    const dataRows = resultRows.map(row =>
      headers.map(h => {
        const v = row[h];
        if (v === null || v === undefined) return "-";
        if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
        return String(v);
      })
    );
    outputContent = markdownTable([headers, ...dataRows]);
  }
} else {
  // JSON — 保留合理精度
  outputContent = JSON.stringify(resultRows, (key, val) => {
    if (typeof val === "number" && !Number.isInteger(val)) {
      return Number(val.toFixed(6));
    }
    return val;
  }, 2);
}

writeFileSync(outputPath, outputContent, "utf-8");

// 状态汇报
console.log(`计算完成: ${computed.length} 个指标, ${data.length} 条数据`);
if (computed.length) console.log(`  已计算: ${computed.join(", ")}`);
if (warnings.length) console.log(`  警告: ${warnings.join("; ")}`);
console.log(`  输出: ${outputPath} (${format})`);
