#!/usr/bin/env node
/**
 * Mermaid Diagram Generator
 * Usage: node mermaid-chart.mjs <input.mmd> <output.png|svg> [options]
 *
 * Options:
 *   -o <output>           Output file path (alternative to positional)
 *   --format=png|svg      Output format (default: inferred from extension)
 *   --palette=<colors>    Custom color palette (comma-separated hex):
 *                         "#E63946,#457B9D,#2A9D8F,#E9C46A"
 *   --theme=<name>        Color theme — financial presets OR Mermaid built-in:
 *                         Financial: fintech, oldmoney, bloomberg, economist, saas,
 *                                    mist, twilight, parchment, azure, gravel
 *                         Mermaid:   default, dark, forest, neutral
 *                         Use --theme=list to show all financial themes.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir, platform } from "node:os";
import { resolveTheme, toMermaidThemeVars, isDark, THEME_NAMES } from "./themes.mjs";

const IS_WIN = platform() === "win32";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);

// Parse arguments
let inputPath, outputPath, format, palette, themeArg;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "-o" || args[i] === "--output") {
    outputPath = args[++i];
  } else if (args[i] === "--spec") {
    inputPath = args[++i];
  } else if (args[i].startsWith("--spec=")) {
    inputPath = args[i].substring("--spec=".length);
  } else if (args[i].startsWith("--format=")) {
    format = args[i].split("=")[1];
  } else if (args[i].startsWith("--palette=")) {
    palette = args[i].substring("--palette=".length);
  } else if (args[i].startsWith("--theme=")) {
    themeArg = args[i].substring("--theme=".length);
  } else if (!inputPath) {
    inputPath = args[i];
  } else if (!outputPath) {
    outputPath = args[i];
  }
}

// --theme=list: print available themes and exit
if (themeArg === "list") {
  console.log("Available financial color themes:\n");
  for (const key of THEME_NAMES) {
    const t = resolveTheme(key);
    console.log(`  ${key.padEnd(12)} ${t.name.padEnd(35)} ${t.colors.join(", ")}  bg:${t.background}`);
  }
  console.log("\nMermaid built-in themes: default, dark, forest, neutral");
  process.exit(0);
}

if (!inputPath || !outputPath) {
  console.error("Usage: mermaid-chart.mjs --spec <input.mmd> [-o] <output.png|svg> [--format=png|svg] [--palette=<colors>] [--theme=<name>]");
  console.error("  --palette: comma-separated hex colors (e.g. \"#E63946,#457B9D,#2A9D8F\")");
  console.error("  --theme:   financial preset (fintech, bloomberg, ...) or Mermaid built-in (default, dark, forest, neutral)");
  console.error("             use --theme=list to show all financial themes");
  process.exit(1);
}

if (!format) {
  format = outputPath.endsWith(".svg") ? "svg" : "png";
}

const absInput = resolve(inputPath);
const absOutput = resolve(outputPath);

// Find mmdc: walk up from this script to find project root's node_modules/.bin/mmdc
// Cross-platform: on Windows the shim is mmdc.cmd (npm creates .cmd/.ps1 shims)
let mmdcPath;
let searchDir = __dirname;
const binNames = IS_WIN ? ["mmdc.cmd", "mmdc"] : ["mmdc"];
for (let i = 0; i < 10 && !mmdcPath; i++) {
  for (const name of binNames) {
    const candidate = resolve(searchDir, "node_modules", ".bin", name);
    if (existsSync(candidate)) {
      mmdcPath = candidate;
      break;
    }
  }
  const parent = dirname(searchDir);
  if (parent === searchDir) break;
  searchDir = parent;
}

// Fallback: locate mmdc on PATH (which on POSIX, where on Windows)
if (!mmdcPath) {
  try {
    const out = spawnSync(IS_WIN ? "where" : "which", ["mmdc"], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    if (out.status === 0 && out.stdout) {
      mmdcPath = out.stdout.split(/\r?\n/)[0].trim();
    }
  } catch { /* ignore */ }
}

if (!mmdcPath) {
  console.error("Error: mmdc not found. Run: cd <hogagent_root> && npm install");
  process.exit(1);
}

// Resolve theme: financial preset or Mermaid built-in
// Default theme: fintech (pass --theme=none to disable)
const DEFAULT_THEME = "fintech";
const mermaidBuiltinThemes = ["default", "dark", "forest", "neutral"];
const effectiveTheme = themeArg === "none" ? null : (themeArg || (palette ? null : DEFAULT_THEME));
const finTheme = resolveTheme(effectiveTheme);
const mermaidTheme = !finTheme && effectiveTheme && mermaidBuiltinThemes.includes(effectiveTheme) ? effectiveTheme : null;

// Build Mermaid config
let configFile = null;
if (finTheme) {
  // Financial theme preset: generate themeVariables
  const vars = toMermaidThemeVars(finTheme);
  const dark = isDark(finTheme.background);
  const mermaidConfig = {
    theme: "default",
    themeVariables: vars,
    // Force node fill & text via CSS to ensure consistency across Mermaid versions
    themeCSS: [
      `.node rect, .node polygon, .node path, .node circle { fill: ${vars.primaryColor} !important; stroke: ${vars.primaryBorderColor} !important; }`,
      `.node .label, .node text, .nodeLabel { color: ${vars.primaryTextColor} !important; fill: ${vars.primaryTextColor} !important; }`,
      `.edgeLabel, .edgeLabel rect { background-color: ${finTheme.background} !important; color: ${dark ? "#E2E8F0" : "#334155"} !important; }`,
      `.edgeLabel p { background-color: ${finTheme.background} !important; }`,
      `#flowchart-circle-0 circle, #flowchart-circle-1 circle { fill: ${vars.primaryColor} !important; }`,
    ].join("\n"),
  };
  configFile = join(tmpdir(), `mermaid-config-${Date.now()}.json`);
  writeFileSync(configFile, JSON.stringify(mermaidConfig, null, 2));
} else if (palette) {
  // Custom palette
  const colors = palette.split(",").map((c) => c.trim());
  const [primary, secondary, tertiary, note] = [
    colors[0] || "#4C78A8",
    colors[1] || "#F58518",
    colors[2] || "#E45756",
    colors[3] || colors[0] || "#4C78A8",
  ];
  const mermaidConfig = {
    theme: mermaidTheme || "default",
    themeVariables: {
      primaryColor: primary,
      primaryTextColor: "#ffffff",
      primaryBorderColor: primary,
      secondaryColor: secondary,
      tertiaryColor: tertiary,
      lineColor: primary,
      noteBkgColor: note,
      noteTextColor: "#ffffff",
    },
  };
  configFile = join(tmpdir(), `mermaid-config-${Date.now()}.json`);
  writeFileSync(configFile, JSON.stringify(mermaidConfig, null, 2));
}

// Build argument list (array form avoids shell quoting pitfalls across platforms)
const mmdcArgs = ["-i", absInput, "-o", absOutput, "--outputFormat", format, "--backgroundColor", "transparent"];
if (configFile) {
  mmdcArgs.push("--configFile", configFile);
} else if (mermaidTheme) {
  mmdcArgs.push("--theme", mermaidTheme);
}

try {
  // shell:true lets Windows run the .cmd shim; args stay an array so no manual quoting is needed
  const result = spawnSync(mmdcPath, mmdcArgs, { stdio: "pipe", shell: IS_WIN });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : "";
    throw new Error(stderr || `mmdc exited with code ${result.status}`);
  }
  const info = finTheme ? ` (theme: ${finTheme.name})` : "";
  console.log(`Diagram generated: ${outputPath}${info}`);
} catch (err) {
  console.error(`Mermaid CLI error: ${err.message}`);
  process.exit(1);
} finally {
  if (configFile && existsSync(configFile)) {
    try { unlinkSync(configFile); } catch { /* ignore */ }
  }
}
