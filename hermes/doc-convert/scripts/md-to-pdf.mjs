#!/usr/bin/env node
/**
 * Markdown to PDF Converter
 * Usage: node md-to-pdf.mjs <input.md> <output.pdf> [--css="custom.css"]
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { mdToPdf } from "md-to-pdf";

const args = process.argv.slice(2);
const inputPath = args[0];
const outputPath = args[1];

if (!inputPath || !outputPath) {
  console.error("Usage: md-to-pdf.mjs <input.md> <output.pdf> [--css=\"custom.css\"]");
  process.exit(1);
}

const cssArg = args.find(a => a.startsWith("--css="));
const customCss = cssArg ? readFileSync(cssArg.split("=")[1], "utf-8") : "";

// Read and preprocess markdown content
const absInputPath = resolve(inputPath);
const imgDir = dirname(absInputPath);
let content = readFileSync(absInputPath, "utf-8");

/** MIME type lookup for image extensions */
const MIME_MAP = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp" };

/**
 * Convert a local image path to a base64 data URI.
 * Returns the original src if the file doesn't exist or is a remote URL.
 */
function toDataUri(src) {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) return src;
  const imgPath = resolve(imgDir, src);
  try {
    if (!statSync(imgPath).isFile()) return src;
    const ext = extname(imgPath).toLowerCase();
    const mime = MIME_MAP[ext] || "image/png";
    const base64 = readFileSync(imgPath).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return src; // File not found, keep original
  }
}

/**
 * Fix 1: marked does not parse markdown syntax inside HTML blocks (like <div>).
 * Convert ![alt](src) inside <div> wrappers to HTML <img> with base64 data URIs.
 */
content = content.replace(
  /<div[^>]*>\s*!\[([^\]]*)\]\(([^)]+)\)\s*<\/div>/g,
  (_match, alt, src) => {
    const dataUri = toDataUri(src);
    return `<p style="text-align:center"><img src="${dataUri}" alt="${alt}" style="max-width:100%" /></p>`;
  }
);

/**
 * Fix 2: Also convert plain markdown images ![alt](src) to HTML <img> with base64.
 * This ensures all local images are embedded regardless of their context.
 */
content = content.replace(
  /!\[([^\]]*)\]\(([^)]+)\)/g,
  (_match, alt, src) => {
    const dataUri = toDataUri(src);
    if (dataUri === src) return _match; // No conversion needed (remote URL or missing file)
    return `<img src="${dataUri}" alt="${alt}" style="max-width:100%" />`;
  }
);

// Write preprocessed content to a temp file
const tempPath = absInputPath + ".preprocessed.md";
writeFileSync(tempPath, content, "utf-8");

try {
  await mdToPdf(
    { path: tempPath },
    {
      dest: outputPath,
      stylesheet: customCss ? [customCss] : undefined,
      pdf_options: { format: "A4", margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" } },
    }
  );
} finally {
  // Clean up temp file
  if (existsSync(tempPath)) unlinkSync(tempPath);
}

console.log(`PDF generated: ${outputPath}`);
