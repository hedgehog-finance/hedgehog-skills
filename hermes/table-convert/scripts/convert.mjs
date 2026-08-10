#!/usr/bin/env node
/**
 * Spreadsheet to JSON / Markdown Converter
 * Usage: node convert.mjs <input> <output> [--format=json|markdown] [--sheet=<name|index>]
 */

import { existsSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import XLSX from "xlsx";
import { markdownTable } from "markdown-table";

// ─── Parse CLI args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const inputPath = args[0];
const outputPath = args[1];

if (!inputPath) {
  console.error("Usage: convert.mjs <input> <output> [--format=json|markdown] [--sheet=<name|index>]");
  console.error("");
  console.error("  <input>    .xlsx, .xls, or .csv file");
  console.error("  <output>   output file path (.json or .md)");
  console.error("  --format   json (default) or markdown");
  console.error("  --sheet    sheet name, 0-based index, or 'list' to print all sheet names");
  process.exit(1);
}

// ─── Resolve options ────────────────────────────────────────────────────────
const formatArg = args.find(a => a.startsWith("--format="));
const sheetArg = args.find(a => a.startsWith("--sheet="));
const format = formatArg ? formatArg.split("=")[1].toLowerCase() : "json";

if (!["json", "markdown"].includes(format)) {
  console.error(`Error: unsupported format "${format}". Use json or markdown.`);
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.error(`Error: input file not found: ${inputPath}`);
  process.exit(1);
}

const ext = extname(inputPath).toLowerCase();
if (![".xlsx", ".xls", ".csv"].includes(ext)) {
  console.error(`Error: unsupported file type "${ext}". Supported: .xlsx, .xls, .csv`);
  process.exit(1);
}

// ─── Read workbook ──────────────────────────────────────────────────────────
const workbook = XLSX.readFile(inputPath);

// Handle --sheet=list
if (sheetArg && sheetArg.split("=")[1] === "list") {
  console.log(JSON.stringify(workbook.SheetNames));
  process.exit(0);
}

// Resolve target sheet
let sheetName;
if (sheetArg) {
  const sheetVal = sheetArg.split("=")[1];
  const idx = Number(sheetVal);
  if (!Number.isNaN(idx) && Number.isInteger(idx)) {
    if (idx < 0 || idx >= workbook.SheetNames.length) {
      console.error(`Error: sheet index ${idx} out of range (0-${workbook.SheetNames.length - 1})`);
      process.exit(1);
    }
    sheetName = workbook.SheetNames[idx];
  } else {
    if (!workbook.Sheets[sheetVal]) {
      console.error(`Error: sheet "${sheetVal}" not found. Available: ${JSON.stringify(workbook.SheetNames)}`);
      process.exit(1);
    }
    sheetName = sheetVal;
  }
} else {
  sheetName = workbook.SheetNames[0];
}

const sheet = workbook.Sheets[sheetName];

// ─── Convert ────────────────────────────────────────────────────────────────
const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

if (!outputPath) {
  console.error("Error: <output> path is required.");
  process.exit(1);
}

let outputContent;

if (format === "json") {
  outputContent = JSON.stringify(jsonRows, null, 2);
} else {
  // markdown
  if (jsonRows.length === 0) {
    outputContent = "(empty sheet)";
  } else {
    const headers = Object.keys(jsonRows[0]);
    const dataRows = jsonRows.map(row => headers.map(h => String(row[h] ?? "")));
    outputContent = markdownTable([headers, ...dataRows]);
  }
}

writeFileSync(outputPath, outputContent, "utf-8");

const rowCount = jsonRows.length;
console.log(`Converted: ${inputPath} [sheet: ${sheetName}] -> ${outputPath} (${format}, ${rowCount} rows)`);
