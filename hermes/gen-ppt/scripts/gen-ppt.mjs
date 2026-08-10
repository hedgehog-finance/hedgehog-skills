#!/usr/bin/env node
/**
 * HogAgent GenPPT — JSON to PowerPoint Generator
 * Usage: node gen-ppt.mjs <config.json> <output.pptx> [--theme=<name>]
 *
 * Options:
 *   --theme=<name>   Override theme from JSON config
 *   --theme=list     Print all available themes and exit
 *
 * Reads a JSON configuration file and generates a .pptx presentation
 * using PptxGenJS. Supports 9 layout types, 10 financial color themes,
 * charts, tables, images, and custom positioned elements.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";
import { resolveTheme, toPptxTheme, THEME_NAMES } from "./themes.mjs";

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_LAYOUTS = [
  "title", "section", "content", "two-column",
  "image-text", "chart", "table", "closing", "blank",
];

const DEFAULT_THEME = "fintech";

// Inline formatting tokens: **bold**, *italic*, ~~strike~~, `code`, and HTML tags
// (declared here because top-level `await generate()` runs before later consts)
const INLINE_TOKEN_RE = /(\*\*|\*|~~|`|<\/?(?:strong|b|em|i|u|s|del|strike|sub|sup)\s*>|<br\s*\/?\s*>)/gi;

// HTML tag name → style-state key
const HTML_STATE = {
  strong: "bold", b: "bold", em: "italic", i: "italic", u: "underline",
  s: "strike", del: "strike", strike: "strike", sub: "sub", sup: "sup",
};

// Default PPT theme when --theme=none or unknown theme
const FALLBACK_THEME = {
  name: "Default",
  primary: "1D4ED8", secondary: "215DF2", accent: "818CF8",
  colors: ["1D4ED8", "215DF2", "60A5FA", "818CF8", "A78BFA", "38BDF8"],
  background: "FFFFFF", textColor: "1E293B", subtleText: "64748B",
  tableHeaderBg: "1D4ED8", tableHeaderText: "FFFFFF",
  tableAltRow: "F1F5F9", borderColor: "E2E8F0", decorativeLine: "1D4ED8",
};

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

const args = process.argv.slice(2);
let configPath, outputPath, themeOverride;

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--theme=")) {
    themeOverride = args[i].substring("--theme=".length);
  } else if (!configPath) {
    configPath = args[i];
  } else if (!outputPath) {
    outputPath = args[i];
  }
}

// --theme=list: print available themes and exit
if (themeOverride === "list") {
  console.log("Available financial color themes:\n");
  for (const key of THEME_NAMES) {
    const t = resolveTheme(key);
    console.log(`  ${key.padEnd(12)} ${t.name.padEnd(35)} ${t.colors.join(", ")}  bg:${t.background}`);
  }
  process.exit(0);
}

if (!configPath || !outputPath) {
  console.error("Usage: gen-ppt.mjs <config.json> <output.pptx> [--theme=<name>]");
  console.error("  --theme=<name>  Override theme (fintech, bloomberg, oldmoney, ...)");
  console.error("  --theme=list    Print all themes and exit");
  process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

try {
  await generate();
} catch (err) {
  console.error(`Error [gen-ppt]: ${err.message}`);
  if (err.hint) console.error(`\nHint: ${err.hint}`);
  process.exit(1);
}

async function generate() {
  // 1. Load and parse config
  const config = loadConfig(configPath);

  // 2. Resolve theme
  const themeName = themeOverride || config.theme || DEFAULT_THEME;
  let theme;
  if (themeName === "none") {
    theme = FALLBACK_THEME;
  } else {
    const raw = resolveTheme(themeName);
    if (!raw) {
      console.warn(`Warning [gen-ppt]: Unknown theme "${themeName}", falling back to "${DEFAULT_THEME}"`);
      theme = toPptxTheme(resolveTheme(DEFAULT_THEME));
    } else {
      theme = toPptxTheme(raw);
    }
  }

  // 3. Apply customTheme overrides
  if (config.customTheme) {
    theme = applyCustomTheme(theme, config.customTheme);
  }

  // 4. Create presentation
  const pres = new pptxgen();

  // Global layout
  pres.layout = config.layout || "LAYOUT_16x9";

  // Metadata
  if (config.title) pres.title = config.title;
  if (config.author) pres.author = config.author;
  if (config.date) pres.subject = config.date;

  // 5. Define slide masters
  defineSlideMasters(pres, theme);

  // 6. Process slides
  const slides = config.slides;
  if (!Array.isArray(slides) || slides.length === 0) {
    throw Object.assign(new Error("config.slides must be a non-empty array"), {
      hint: "Add at least one slide object with a 'layout' field.",
    });
  }

  for (let i = 0; i < slides.length; i++) {
    const slideConfig = slides[i];
    const layout = slideConfig.layout || "content";

    if (!VALID_LAYOUTS.includes(layout)) {
      throw Object.assign(
        new Error(`slide[${i}].layout "${layout}" is not valid.`),
        { hint: `Valid layouts: ${VALID_LAYOUTS.join(", ")}` }
      );
    }

    try {
      renderSlide(pres, slideConfig, theme, layout, i);
    } catch (err) {
      if (err.message.startsWith("slide[")) throw err;
      throw Object.assign(
        new Error(`slide[${i}] (${layout}): ${err.message}`),
        { hint: err.hint }
      );
    }
  }

  // Add branding to last slide
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const logoPath = resolve(__dirname, 'logo.png');
  addBranding(pres.slides[pres.slides.length - 1], theme, existsSync(logoPath) ? logoPath : null);

  // 7. Write file
  await pres.writeFile({ fileName: outputPath });
  const themeInfo = theme.name ? ` (theme: ${theme.name})` : "";
  console.log(`PPTX generated: ${outputPath}${themeInfo}`);
}

// ── Config Loading ───────────────────────────────────────────────────────────

function loadConfig(filePath) {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    throw new Error(`Config file not found: ${absPath}`);
  }
  try {
    const raw = readFileSync(absPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw Object.assign(new Error(`Invalid JSON in config file: ${err.message}`), {
        hint: "Check JSON syntax — common issues: trailing commas, unquoted keys, single quotes.",
      });
    }
    throw err;
  }
}

// ── Custom Theme Merge ──────────────────────────────────────────────────────

function applyCustomTheme(theme, custom) {
  const strip = (c) => c ? (c.startsWith("#") ? c.slice(1) : c) : undefined;
  const merged = { ...theme };
  if (custom.primary) merged.primary = strip(custom.primary);
  if (custom.secondary) merged.secondary = strip(custom.secondary);
  if (custom.accent) merged.accent = strip(custom.accent);
  if (custom.background) merged.background = strip(custom.background);
  if (custom.textColor) merged.textColor = strip(custom.textColor);
  if (custom.subtleText) merged.subtleText = strip(custom.subtleText);
  if (custom.colors) merged.colors = custom.colors.map(strip);
  if (custom.borderColor) merged.borderColor = strip(custom.borderColor);
  // Re-derive table colors if primary changed
  if (custom.primary) {
    merged.tableHeaderBg = merged.primary;
    merged.tableHeaderText = isLight(merged.primary) ? "1E293B" : "FFFFFF";
  }
  return merged;
}

function isLight(hex) {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 >= 0.5;
}

// ── Slide Master Definitions ─────────────────────────────────────────────────

function defineSlideMasters(pres, theme) {
  for (const layout of VALID_LAYOUTS) {
    const isTitleLike = layout === "title" || layout === "closing";
    pres.defineSlideMaster({
      title: `MASTER_${layout.toUpperCase().replace("-", "_")}`,
      background: { color: theme.background },
      objects: isTitleLike ? [] : [
        // Thin bottom decorative line
        { rect: { x: 0.5, y: 5.45, w: 9.0, h: 0.015, fill: { color: theme.decorativeLine } } },
      ],
      slideNumber: {
        x: "90%", y: "93%",
        fontSize: 8,
        color: theme.subtleText,
      },
    });
  }
}

// ── Slide Rendering Dispatcher ───────────────────────────────────────────────

function renderSlide(pres, config, theme, layout, index) {
  const masterName = `MASTER_${layout.toUpperCase().replace("-", "_")}`;
  const slide = pres.addSlide({ masterName });

  // Slide-level background override
  if (config.background) {
    const bg = config.background.startsWith("#") ? config.background.slice(1) : config.background;
    slide.background = { color: bg };
  }

  // Speaker notes
  if (config.notes) {
    slide.addNotes(config.notes);
  }

  // Render layout-specific content
  switch (layout) {
    case "title":      renderTitleLayout(slide, config, theme); break;
    case "section":    renderSectionLayout(slide, config, theme); break;
    case "content":    renderContentLayout(slide, config, theme); break;
    case "two-column": renderTwoColumnLayout(slide, config, theme); break;
    case "image-text": renderImageTextLayout(slide, config, theme); break;
    case "chart":      renderChartLayout(slide, config, theme); break;
    case "table":      renderTableLayout(slide, config, theme); break;
    case "closing":    renderClosingLayout(slide, config, theme); break;
    case "blank":      break; // Only custom elements
  }

  // Render custom elements (any layout)
  if (Array.isArray(config.elements)) {
    renderElements(slide, config.elements, theme);
  }
}

// ── Layout: title ────────────────────────────────────────────────────────────

function renderTitleLayout(slide, config, theme) {
  // Optional logo (top-left)
  if (config.logo) {
    renderImage(slide, config.logo, { x: 0.3, y: 0.3, w: 1.2, h: 0.6 });
  }

  // Title
  if (config.title) {
    addFmtText(slide, config.title, {
      x: 0.8, y: 1.5, w: 8.4, h: 1.0,
      fontSize: 36, fontFace: "Calibri", bold: true,
      color: theme.primary, align: "center", valign: "middle",
    });
  }

  // Decorative line
  slide.addShape("rect", {
    x: 1.5, y: 2.55, w: 7.0, h: 0.025,
    fill: { color: theme.decorativeLine },
  });

  // Subtitle
  if (config.subtitle) {
    addFmtText(slide, config.subtitle, {
      x: 0.8, y: 2.7, w: 8.4, h: 0.6,
      fontSize: 18, fontFace: "Calibri",
      color: theme.subtleText, align: "center", valign: "top",
    });
  }

  // Date and author
  const meta = [config.date, config.author].filter(Boolean).join("  |  ");
  if (meta) {
    slide.addText(meta, {
      x: 0.8, y: 3.5, w: 8.4, h: 0.4,
      fontSize: 12, fontFace: "Calibri",
      color: theme.subtleText, align: "center",
    });
  }
}

// ── Layout: section ──────────────────────────────────────────────────────────

function renderSectionLayout(slide, config, theme) {
  // Section number
  if (config.sectionNumber) {
    slide.addText(config.sectionNumber, {
      x: 0.8, y: 1.2, w: 8.4, h: 0.8,
      fontSize: 48, fontFace: "Calibri", bold: true,
      color: theme.primary, align: "left",
    });
  }

  // Short decorative line
  slide.addShape("rect", {
    x: 0.8, y: 2.05, w: 2.0, h: 0.04,
    fill: { color: theme.decorativeLine },
  });

  // Title
  if (config.title) {
    addFmtText(slide, config.title, {
      x: 0.8, y: 2.2, w: 8.4, h: 0.8,
      fontSize: 32, fontFace: "Calibri", bold: true,
      color: theme.textColor, align: "left",
    });
  }

  // Subtitle
  if (config.subtitle) {
    addFmtText(slide, config.subtitle, {
      x: 0.8, y: 3.2, w: 8.4, h: 0.5,
      fontSize: 14, fontFace: "Calibri",
      color: theme.subtleText, align: "left",
    });
  }
}

// ── Layout: content ──────────────────────────────────────────────────────────

function renderContentLayout(slide, config, theme) {
  renderSlideHeader(slide, config, theme);

  // Bullets or body text
  if (config.bullets && config.bullets.length > 0) {
    renderBullets(slide, config.bullets, {
      x: 0.5, y: 1.2, w: 9.0, h: 3.8,
      fontSize: 16, fontFace: "Calibri",
      color: theme.textColor, valign: "top",
    }, theme);
  } else if (config.body) {
    addFmtText(slide, config.body, {
      x: 0.5, y: 1.2, w: 9.0, h: 3.8,
      fontSize: 16, fontFace: "Calibri",
      color: theme.textColor, valign: "top",
      paraSpaceBefore: 4, paraSpaceAfter: 4,
    });
  }

  renderFootnote(slide, config, theme);
}

// ── Layout: two-column ──────────────────────────────────────────────────────

function renderTwoColumnLayout(slide, config, theme) {
  renderSlideHeader(slide, config, theme);

  // Left column
  if (config.left) {
    renderColumn(slide, config.left, {
      x: 0.5, y: 1.2, w: 4.3, h: 3.8,
    }, theme);
  }

  // Right column
  if (config.right) {
    renderColumn(slide, config.right, {
      x: 5.2, y: 1.2, w: 4.3, h: 3.8,
    }, theme);
  }

  renderFootnote(slide, config, theme);
}

// ── Layout: image-text ──────────────────────────────────────────────────────

function renderImageTextLayout(slide, config, theme) {
  renderSlideHeader(slide, config, theme);

  // Four arrangements via image.position: "left" (default) = image left / text
  // right; "right" = text left / image right; "top" = image top / text bottom;
  // "bottom" = text top / image bottom.
  const position = config.image?.position || "left";
  let imgPos, txtPos, txtFontSize;

  if (position === "top" || position === "bottom") {
    // Vertical split: image gets the larger band, text the remainder
    const imgBand = { x: 0.5, w: 9.0, h: 2.3 };
    const txtBand = { x: 0.5, w: 9.0, h: 1.4 };
    if (position === "top") {
      imgPos = { ...imgBand, y: 1.2 };
      txtPos = { ...txtBand, y: 3.6 };
    } else {
      txtPos = { ...txtBand, y: 1.2 };
      imgPos = { ...imgBand, y: 2.7 };
    }
    txtFontSize = 14;
  } else {
    // Horizontal split (original behavior)
    const imgRight = position === "right";
    imgPos = { x: imgRight ? 5.2 : 0.5, y: 1.2, w: imgRight ? 4.3 : 4.7, h: 3.8 };
    txtPos = { x: imgRight ? 0.5 : 5.5, y: 1.2, w: imgRight ? 4.4 : 3.7, h: 3.8 };
    txtFontSize = 14;
  }

  // Image
  if (config.image) {
    renderImage(slide, config.image, imgPos);
  }

  // Text (bullets or body)
  if (config.bullets && config.bullets.length > 0) {
    renderBullets(slide, config.bullets, {
      ...txtPos,
      fontSize: txtFontSize, fontFace: "Calibri",
      color: theme.textColor, valign: "top",
    }, theme);
  } else if (config.body) {
    addFmtText(slide, config.body, {
      ...txtPos,
      fontSize: txtFontSize, fontFace: "Calibri",
      color: theme.textColor, valign: "top",
    });
  }

  renderFootnote(slide, config, theme);
}

// ── Layout: chart ────────────────────────────────────────────────────────────

function renderChartLayout(slide, config, theme) {
  // Title
  if (config.title) {
    addFmtText(slide, config.title, {
      x: 0.5, y: 0.3, w: 9.0, h: 0.5,
      fontSize: 24, fontFace: "Calibri", bold: true,
      color: theme.primary, align: "left",
    });
  }

  // Subtitle
  if (config.subtitle) {
    addFmtText(slide, config.subtitle, {
      x: 0.5, y: 0.85, w: 9.0, h: 0.3,
      fontSize: 12, fontFace: "Calibri",
      color: theme.subtleText, align: "left",
    });
  }

  // Chart
  if (config.chart) {
    renderChart(slide, config.chart, {
      x: 0.5, y: 1.2, w: 9.0, h: 3.8,
    }, theme);
  }

  renderFootnote(slide, config, theme);
}

// ── Layout: table ────────────────────────────────────────────────────────────

function renderTableLayout(slide, config, theme) {
  // Title
  if (config.title) {
    addFmtText(slide, config.title, {
      x: 0.5, y: 0.3, w: 9.0, h: 0.5,
      fontSize: 24, fontFace: "Calibri", bold: true,
      color: theme.primary, align: "left",
    });
  }

  // Subtitle
  if (config.subtitle) {
    addFmtText(slide, config.subtitle, {
      x: 0.5, y: 0.85, w: 9.0, h: 0.3,
      fontSize: 12, fontFace: "Calibri",
      color: theme.subtleText, align: "left",
    });
  }

  // Table
  if (config.table) {
    renderTable(slide, config.table, {
      x: 0.5, y: 1.2, w: 9.0, h: 3.8,
    }, theme);
  }

  renderFootnote(slide, config, theme);
}

// ── Layout: closing ──────────────────────────────────────────────────────────

function renderClosingLayout(slide, config, theme) {
  // Title
  if (config.title) {
    addFmtText(slide, config.title, {
      x: 0.8, y: 1.8, w: 8.4, h: 0.8,
      fontSize: 36, fontFace: "Calibri", bold: true,
      color: theme.primary, align: "center", valign: "middle",
    });
  }

  // Subtitle
  if (config.subtitle) {
    addFmtText(slide, config.subtitle, {
      x: 0.8, y: 2.8, w: 8.4, h: 0.5,
      fontSize: 14, fontFace: "Calibri",
      color: theme.subtleText, align: "center",
    });
  }

  // Logo
  if (config.logo) {
    renderImage(slide, config.logo, { x: 4.0, y: 3.6, w: 2.0, h: 1.0 });
  }
}

// ── Inline Formatting (simple Markdown + HTML tags) ────────────────────────

/**
 * Parse simple inline Markdown (**bold**, *italic*, ~~strike~~, `code`) and
 * HTML tags (<b>/<strong>, <i>/<em>, <u>, <s>/<del>/<strike>, <sub>, <sup>,
 * <br>, <center>) into PptxGenJS text runs.
 * Underscore emphasis (_x_/__x__) is intentionally NOT supported to avoid
 * false positives on snake_case identifiers. Unpaired Markdown toggles are
 * kept as literal text.
 * Returns { runs, blockOpts }: runs is a plain string when no markup is
 * present, otherwise an array of { text, options }; blockOpts carries
 * paragraph-level options (e.g. align from <center>).
 */
function parseFormattedText(text) {
  const str = String(text ?? "");
  const blockOpts = {};
  if (!/[*~`<]/.test(str)) return { runs: str, blockOpts };

  let t = str;
  // <center> is paragraph-level: strip tags, set alignment
  if (/<center\s*>/i.test(t)) {
    blockOpts.align = "center";
    t = t.replace(/<\/?center\s*>/gi, "");
  }

  const parts = t.split(INLINE_TOKEN_RE).filter((p) => p !== undefined && p !== "");
  // Unpaired Markdown toggles are literal (e.g. "5 * 3" stays as-is)
  const counts = { "**": 0, "*": 0, "~~": 0, "`": 0 };
  for (const p of parts) if (p in counts) counts[p]++;
  const literal = new Set(Object.keys(counts).filter((k) => counts[k] % 2 === 1));

  const state = { bold: false, italic: false, underline: false, strike: false, code: false, sub: false, sup: false };
  const optsOf = () => {
    const o = {};
    if (state.bold) o.bold = true;
    if (state.italic) o.italic = true;
    if (state.underline) o.underline = true;
    if (state.strike) o.strike = true;
    if (state.code) o.fontFace = "Courier New";
    if (state.sub) o.subscript = true;
    if (state.sup) o.superscript = true;
    return o;
  };

  const runs = [];
  let buf = "";
  let bufOpts = optsOf();
  const flush = () => {
    if (buf) { runs.push({ text: buf, options: { ...bufOpts } }); buf = ""; }
  };
  const toggle = (key) => { flush(); state[key] = !state[key]; bufOpts = optsOf(); };
  const setState = (key, on) => { flush(); state[key] = on; bufOpts = optsOf(); };

  for (const part of parts) {
    if (part === "**" && !literal.has("**")) { toggle("bold"); continue; }
    if (part === "*" && !literal.has("*")) { toggle("italic"); continue; }
    if (part === "~~" && !literal.has("~~")) { toggle("strike"); continue; }
    if (part === "`" && !literal.has("`")) { toggle("code"); continue; }
    if (/^<br\s*\/?\s*>$/i.test(part)) {
      flush();
      if (runs.length > 0) runs[runs.length - 1].options.breakLine = true;
      else runs.push({ text: "", options: { breakLine: true } });
      continue;
    }
    const m = part.match(/^<(\/?)([a-zA-Z]+)\s*>$/);
    if (m && HTML_STATE[m[2].toLowerCase()]) { setState(HTML_STATE[m[2].toLowerCase()], m[1] !== "/"); continue; }
    buf += part;
  }
  flush();

  if (runs.length === 0) return { runs: "", blockOpts };
  // No effective inline markup → keep plain-string behavior
  if (runs.length === 1 && Object.keys(runs[0].options).length === 0) {
    return { runs: runs[0].text, blockOpts };
  }
  return { runs, blockOpts };
}

/** addText with inline Markdown/HTML formatting support. */
function addFmtText(slide, text, opts) {
  const { runs, blockOpts } = parseFormattedText(text);
  slide.addText(runs, { ...opts, ...blockOpts });
}

/** Format a table cell value → string or text-run array. */
function fmtCellText(text) {
  return parseFormattedText(text).runs;
}

// ── Shared Rendering Helpers ─────────────────────────────────────────────────

/** Render slide title + decorative line (used by content, two-column, image-text). */
function renderSlideHeader(slide, config, theme) {
  if (config.title) {
    addFmtText(slide, config.title, {
      x: 0.5, y: 0.3, w: 9.0, h: 0.6,
      fontSize: 24, fontFace: "Calibri", bold: true,
      color: theme.primary, align: "left",
    });
  }
  // Decorative line under title
  slide.addShape("rect", {
    x: 0.5, y: 0.95, w: 9.0, h: 0.02,
    fill: { color: theme.decorativeLine },
  });
}

/** Render footnote at bottom of slide. */
function renderFootnote(slide, config, theme) {
  if (config.footnote) {
    addFmtText(slide, config.footnote, {
      x: 0.5, y: 5.1, w: 9.0, h: 0.3,
      fontSize: 9, fontFace: "Calibri", italic: true,
      color: theme.subtleText, align: "left",
    });
  }
}

/** Render a column with optional title and bullets/body. */
function renderColumn(slide, col, pos, theme) {
  let yOff = pos.y;
  let hRemain = pos.h;

  if (col.title) {
    addFmtText(slide, col.title, {
      x: pos.x, y: yOff, w: pos.w, h: 0.4,
      fontSize: 16, fontFace: "Calibri", bold: true,
      color: theme.primary, align: "left", valign: "top",
    });
    yOff += 0.45;
    hRemain -= 0.45;
  }

  if (col.bullets && col.bullets.length > 0) {
    renderBullets(slide, col.bullets, {
      x: pos.x, y: yOff, w: pos.w, h: hRemain,
      fontSize: 14, fontFace: "Calibri",
      color: theme.textColor, valign: "top",
    }, theme);
  } else if (col.body) {
    addFmtText(slide, col.body, {
      x: pos.x, y: yOff, w: pos.w, h: hRemain,
      fontSize: 14, fontFace: "Calibri",
      color: theme.textColor, valign: "top",
    });
  }
}

/** Render bullets array to slide. Supports string and { text, level, bold, color } items. */
function renderBullets(slide, bullets, pos, theme) {
  const textItems = [];
  for (const bullet of bullets) {
    const item = typeof bullet === "string" ? { text: bullet, level: 0 } : bullet;
    const fontSize = [16, 14, 12][item.level] || 12;
    const baseOpts = {
      fontSize,
      fontFace: "Calibri",
      bold: item.bold || false,
      italic: item.italic || false,
      color: item.color
        ? (item.color.startsWith("#") ? item.color.slice(1) : item.color)
        : theme.textColor,
      paraSpaceBefore: 6,
      paraSpaceAfter: 3,
    };
    const bulletOpts = { indentLevel: item.level || 0, bullet: true };
    const { runs } = parseFormattedText(item.text);
    if (typeof runs === "string") {
      textItems.push({ text: runs, options: { ...baseOpts, ...bulletOpts } });
    } else {
      // Inline-formatted bullet: first run opens the bulleted paragraph,
      // subsequent runs continue on the same line
      runs.forEach((r, i) => {
        textItems.push({
          text: r.text,
          options: { ...baseOpts, ...r.options, ...(i === 0 ? bulletOpts : {}) },
        });
      });
    }
  }
  slide.addText(textItems, pos);
}

/** Parse intrinsic pixel size from PNG/JPEG/GIF/BMP header bytes (no deps). */
function getImageSizePx(buf) {
  // PNG: IHDR width/height at fixed offsets
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // JPEG: scan for SOFn marker
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }
  // GIF: logical screen size (little-endian)
  if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }
  // BMP: DIB header (little-endian)
  if (buf.length > 26 && buf[0] === 0x42 && buf[1] === 0x4d) {
    return { w: buf.readInt32LE(18), h: Math.abs(buf.readInt32LE(22)) };
  }
  return null;
}

/** Scale image to fit inside the slot preserving aspect ratio, centered. */
function fitImageIntoSlot(px, pos) {
  if (!px || !px.w || !px.h) return pos;
  const imgRatio = px.w / px.h;
  const slotRatio = pos.w / pos.h;
  let w, h;
  if (imgRatio >= slotRatio) {
    w = pos.w;
    h = pos.w / imgRatio;
  } else {
    h = pos.h;
    w = pos.h * imgRatio;
  }
  return {
    x: pos.x + (pos.w - w) / 2,
    y: pos.y + (pos.h - h) / 2,
    w: Math.round(w * 100) / 100,
    h: Math.round(h * 100) / 100,
  };
}

/** Render an image slot (path or base64 data). */
function renderImage(slide, image, pos) {
  if (!image) return;
  let imagePath = image.path;
  // SVG embedding produces a tiny PNG fallback in PptxGenJS that renders blank
  // in most viewers (WPS/older Office/Preview). Prefer a same-name PNG if present.
  if (imagePath && /\.svg$/i.test(imagePath)) {
    const pngPath = imagePath.replace(/\.svg$/i, ".png");
    if (existsSync(pngPath)) {
      console.warn(`Warning [gen-ppt]: SVG replaced with PNG for compatibility: ${pngPath}`);
      imagePath = pngPath;
    } else {
      console.warn(`Warning [gen-ppt]: SVG images render blank in many PPT viewers, use PNG instead: ${imagePath}`);
    }
  }
  const opts = {};
  let sizePx = null;
  if (imagePath) {
    if (!existsSync(imagePath)) {
      console.warn(`Warning [gen-ppt]: Image not found: ${imagePath}`);
      // Render placeholder rectangle
      slide.addShape("roundRect", {
        ...pos,
        fill: { color: "E2E8F0" },
        line: { color: "CBD5E1", width: 1, dashType: "dash" },
      });
      slide.addText(`[Image not found]`, {
        ...pos,
        fontSize: 10, color: "94A3B8", align: "center", valign: "middle",
      });
      return;
    }
    opts.path = imagePath;
    try {
      sizePx = getImageSizePx(readFileSync(imagePath));
    } catch { /* fall back to slot size */ }
  } else if (image.data) {
    opts.data = image.data;
    const b64 = String(image.data).replace(/^data:[^,]*,/, "");
    try {
      sizePx = getImageSizePx(Buffer.from(b64, "base64"));
    } catch { /* fall back to slot size */ }
  } else {
    return; // No image source
  }
  // Preserve aspect ratio: scale to fit inside the slot, centered
  Object.assign(opts, fitImageIntoSlot(sizePx, pos));
  if (image.alt) opts.altText = image.alt;
  slide.addImage(opts);
}

/** Render a chart slot. */
function renderChart(slide, chart, pos, theme) {
  // Pre-rendered chart image (e.g. produced by the gen-chart skill):
  // { "type": "image", "path": "chart.png" } → delegate to image rendering.
  if (chart.type === "image" && (chart.path || chart.data)) {
    renderImage(slide, chart, pos);
    return;
  }

  if (!chart.type || !chart.data) {
    console.warn("Warning [gen-ppt]: Chart missing 'type' or 'data', skipping.");
    return;
  }

  // Map JSON chart type to PptxGenJS ChartType
  const chartTypeMap = {
    bar: "bar", line: "line", pie: "pie", doughnut: "doughnut",
    area: "area", scatter: "scatter", radar: "radar",
    bar3d: "bar3D", bubble: "bubble",
  };
  const chartType = chartTypeMap[chart.type] || chart.type;

  // Build chart data in PptxGenJS format
  const data = chart.data.map(series => ({
    name: series.name || "",
    labels: series.labels || [],
    values: series.values || [],
  }));

  // Merge theme defaults with user options
  const chartOpts = {
    ...pos,
    chartColors: theme.colors,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 10,
    legendColor: theme.textColor,
    titleColor: theme.textColor,
    catAxisLabelColor: theme.textColor,
    valAxisLabelColor: theme.textColor,
    catAxisLineColor: theme.borderColor,
    valAxisLineColor: theme.borderColor,
    showTitle: !!chart.title,
    title: chart.title || "",
    titleColor: theme.textColor,
    ...(chart.options || {}),
  };

  slide.addChart(chartType, data, chartOpts);
}

/** Render a table slot. */
function renderTable(slide, table, pos, theme) {
  if (!table.headers && !table.head && !table.rows) {
    console.warn("Warning [gen-ppt]: Table missing 'headers' or 'rows', skipping.");
    return;
  }

  // Accept "head" as an alias of "headers" (common LLM output variant)
  const headers = table.headers || table.head || [];
  const rows = table.rows || [];

  // Build header row with theme styling
  const headerRow = headers.map(h => ({
    text: fmtCellText(h),
    options: {
      bold: true,
      color: theme.tableHeaderText,
      fill: { color: theme.tableHeaderBg },
      fontSize: 12,
      fontFace: "Calibri",
      align: "center",
      valign: "middle",
    },
  }));

  // Build data rows with alternating colors
  const dataRows = rows.map((row, idx) =>
    row.map(cell => {
      if (typeof cell === "object" && cell.text) {
        return { text: fmtCellText(cell.text), options: { ...cell.options } };
      }
      return {
        text: fmtCellText(cell),
        options: {
          fontSize: 11,
          fontFace: "Calibri",
          color: theme.textColor,
          fill: { color: idx % 2 === 0 ? theme.background : theme.tableAltRow },
          valign: "middle",
        },
      };
    })
  );

  const tableData = headerRow.length > 0 ? [headerRow, ...dataRows] : dataRows;

  // Merge table options
  const tableOpts = {
    ...pos,
    border: { type: "solid", pt: 0.5, color: theme.borderColor },
    colW: table.colW || undefined,
    rowH: table.rowH || undefined,
    autoPage: table.autoPage !== false,
    ...(table.options || {}),
  };

  slide.addTable(tableData, tableOpts);
}

// ── Custom Elements Rendering ────────────────────────────────────────────────

function renderElements(slide, elements, theme) {
  for (const el of elements) {
    if (!el.type) {
      console.warn("Warning [gen-ppt]: Element missing 'type', skipping.");
      continue;
    }

    const pos = {
      x: el.x || 0, y: el.y || 0,
      w: el.w || 1, h: el.h || 1,
    };

    switch (el.type) {
      case "text":
        addFmtText(slide, el.content || "", {
          ...pos,
          fontSize: 12, fontFace: "Calibri",
          color: theme.textColor,
          ...(el.options || {}),
        });
        break;

      case "image":
        renderImage(slide, el.content || el, pos);
        break;

      case "shape":
        slide.addShape(el.shape || "rect", {
          ...pos,
          ...(el.options || {}),
        });
        break;

      case "chart":
        renderChart(slide, el.content || el, pos, theme);
        break;

      case "table":
        renderTable(slide, el.content || el, pos, theme);
        break;

      default:
        console.warn(`Warning [gen-ppt]: Unknown element type "${el.type}", skipping.`);
    }
  }
}

// ── Branding Footer ─────────────────────────────────────────────────────────

/** Add "Powered by: HogAgent (ciweiai.com)" footer to the last slide. */
function addBranding(slide, theme, logoPath) {
  if (logoPath) {
    slide.addImage({
      path: logoPath,
      x: 4.84, y: 4.78, w: 0.33, h: 0.33,
    });
  }
  slide.addText("Powered by: HogAgent (ciweiai.com)", {
    x: 2.5, y: 5.12, w: 5.0, h: 0.3,
    fontSize: 9, fontFace: "Calibri",
    color: theme.subtleText, align: "center",
  });
}
