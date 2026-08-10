/**
 * Shared utils: logging, file-type detection, arg validation, output writing.
 * Logs go to stderr; stdout reserved for result summaries.
 */
import { writeFileSync } from "node:fs";
import { extname } from "node:path";

const LEVEL_TAG = { info: "INFO", warn: "WARN", error: "ERROR", debug: "DEBUG" };

/** Log to stderr (keeps stdout clean for result capture). */
export function log(level, msg) {
  const tag = LEVEL_TAG[level] || String(level).toUpperCase();
  process.stderr.write(`[${tag}] ${msg}\n`);
}

/** File extension → protocol file_type enum (uppercase). */
export function detectFileType(filePath) {
  const ext = extname(filePath).toLowerCase().replace(".", "");
  const map = {
    pdf: "PDF",
    docx: "DOCX",
    doc: "DOC",
    html: "HTML",
    htm: "HTML",
    md: "MD",
    markdown: "MD",
  };
  return map[ext] || ext.toUpperCase();
}

/**
 * Validate CLI arg count.
 * @param {string} usage Usage string
 * @param {string[]} args Argument array
 * @param {number} minCount Minimum required args
 * @returns {string[]} Validated args
 */
export function parseArgs(usage, args, minCount = 2) {
  if (!args || args.length < minCount) {
    console.error(`Usage: ${usage}`);
    process.exit(1);
  }
  return args;
}

/** Write output file and log summary. */
export function writeOutput(path, content) {
  writeFileSync(path, content, "utf-8");
  log("info", `Output written: ${path} (${content.length} chars)`);
}
