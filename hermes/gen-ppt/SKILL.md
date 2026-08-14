---
name: gen-ppt
description: >
    Generate presentations — defaults to editable .pptx from JSON (native PowerPoint, editable in PowerPoint/Keynote/Google Slides). Only when the user explicitly requests HTML web slides / online playback / interactive browser presentation, generate self-contained .html slides from Markdown (NOT PowerPoint-editable).
    Applicable: slide decks, pitch decks, meeting presentations, web presentations.
    Triggers: PowerPoint, PPTX, editable slides, generate PPT, HTML slides, web slides, markdown to slides, interactive presentation.
    Blocking: Keynote/Google Slides-only exports, video.
version: 2.2.0
compatibility: Requires Node.js >=18 in the Hermes terminal runtime.
prerequisites:
  commands: [node, npm]
---

# GenPPT — Presentation Generator

**Default: native .pptx** (editable in PowerPoint/Keynote/Google Slides). Switch to HTML only when the user explicitly requests online/browser/interactive HTML slides.

## Output Modes

| | Mode A: PPTX (default) | Mode B: HTML Slides (opt-in) |
|---|---|---|
| **Output** | `.pptx` — editable | `.html` — self-contained, browser-only |
| **Input** | JSON config | Markdown (`---` separates slides) |
| **Script** | `scripts/gen-ppt.mjs` | `scripts/md-to-slides.mjs` |
| **Deps** | `pptxgenjs@4.0.1`, `jszip@3.10.1` | `marked`, `highlight.js` |

**HTML triggers:** "HTML slides", "web slides", "网页PPT", "在线播放", "interactive presentation", "browser-based", "markdown to slides". Otherwise → PPTX.

## Usage

```bash
# Mode A: JSON → PPTX (default)
node ${HERMES_SKILL_DIR}/scripts/gen-ppt.mjs <config.json> <output.pptx> [--theme=<name>]
# Re-run structural validation and optional viewer open/render tests
node ${HERMES_SKILL_DIR}/scripts/validate-pptx.mjs <output.pptx> [--libreoffice] [--keynote] [--powerpoint]
# Mode B: Markdown → HTML (opt-in)
node ${HERMES_SKILL_DIR}/scripts/md-to-slides.mjs <input.md> <output.html> [--theme=<name>] [--title="Title"]
```

Resolve `${HERMES_SKILL_DIR}/scripts/*` to absolute paths using this SKILL.md's directory. Use absolute paths for I/O files.

## Themes (shared by both modes)

10 built-in themes via `--theme=<key>` or `"theme"` in JSON. `--theme=list` prints all. Default: `fintech`. Use `--theme=none` for PptxGenJS defaults (PPTX only).

| Key | Name | BG | Best For |
|-----|------|-----|---------|
| `fintech` | Modern FinTech | `#F8FAFC` | SaaS, tech decks |
| `oldmoney` | Traditional Banking | `#FFFFFF` | Wealth, PE |
| `bloomberg` | Bloomberg/Quant | `#09090B` | Dark dashboards |
| `economist` | Economist Style | `#F6F4F0` | Research, journalism |
| `saas` | Silicon Valley SaaS | `#FFFFFF` | Product analytics |
| `mist` | Morning Mist | `#F1F5F9` | Muted blues |
| `twilight` | Twilight | `#F5F3F7` | Muted violets |
| `parchment` | Parchment | `#F5F2EB` | Warm sepia |
| `azure` | Azure | `#EAF2F8` | Coastal blues |
| `gravel` | Gravel | `#F0EFEA` | Warm grays |

---

## Mode A: PPTX (default)

**Workflow:** Write JSON config → run `gen-ppt.mjs` → normalize native Chart OOXML → validate every package relationship and chart part → write `.pptx`. Generation fails instead of emitting an invalid file. Full schema: `references/json-schema.md`.

### Layouts (9 types)

| Layout | Slots |
|--------|-------|
| `title` | title, subtitle, date, author, logo |
| `section` | sectionNumber, title, subtitle |
| `content` | title, bullets/body, footnote |
| `two-column` | title, left, right, footnote |
| `image-text` | title, image, bullets/body, footnote. `image.position`: `left`(default)/`right`/`top`/`bottom` — pick freely per content (e.g. wide charts → top/bottom; tall images → left/right). Images auto-scale proportionally (no stretching), centered in slot |
| `chart` | title, subtitle, chart, footnote |
| `table` | title, subtitle, table, footnote |
| `closing` | title, subtitle, logo |
| `blank` | elements only |

All slides support custom `elements` array. Use editable native charts first for `bar`, `line`, `pie`, `doughnut`, `area`, `scatter`, and `radar`. Use `type: "image"` for an explicitly requested static chart, a chart type with no native implementation, or the fallback procedure below.

For scatter charts, use series objects with matching `xValues` and `yValues` arrays. All scatter series must share the same X values. See `references/json-schema.md`; invalid or incomplete scatter input fails instead of producing an empty chart.

### PPTX Integrity and Viewer QA

`gen-ppt.mjs` automatically repairs known PptxGenJS 4.0.1 chart incompatibilities before writing: schema child order, required line grouping, forbidden series nodes, orphan axis references, single-level category encoding, rounded corners, and absolute chart relationship targets. It then rejects malformed XML, missing package parts, broken relationships, invalid chart ordering, and unresolved axes.

After generation, run `validate-pptx.mjs` with every available target viewer. `--libreoffice` performs a headless PDF render. On macOS, `--keynote` and `--powerpoint` open the deck in the named application and export a PDF. A structural pass alone is not a substitute for a target-viewer test. See `references/ooxml-validation.md`.

If a native chart is blank, invalid, or still cannot be displayed in the target viewer after regeneration and validation, use `gen-chart` to render that chart as PNG. Then replace only the affected chart with `{ "type": "image", "path": "/absolute/path/to/chart.png" }` and regenerate the PPTX. Treat this as an explicit compatibility fallback: preserve the same source data, labels, title, and visual meaning, use an absolute PNG path, inspect the rendered slide, and note that the fallback chart is no longer editable as a native PowerPoint chart.

After changing chart generation, run `npm run test:native-charts -- --libreoffice` and add `--keynote` / `--powerpoint` wherever installed. The smoke test covers all seven native types plus rejection of empty scatter output and unnormalized PptxGenJS OOXML.

### Inline Text Formatting

All text fields (title, subtitle, bullets, body, footnote, table cells, text elements) support simple inline markup:

- Markdown: `**bold**`, `*italic*`, `~~strike~~`, `` `code` `` (monospace). Underscore emphasis (`_x_`) is NOT supported (avoids snake_case false positives); unpaired markers stay literal
- HTML tags: `<strong>`/`<b>`, `<em>`/`<i>`, `<u>`, `<s>`/`<del>`/`<strike>`, `<sub>`, `<sup>`, `<br>` (line break), `<center>` (paragraph centering)

### Minimal JSON

```json
{
  "theme": "fintech",
  "slides": [
    { "layout": "title", "title": "My Presentation", "subtitle": "Created with GenPPT" },
    { "layout": "content", "title": "Key Points", "bullets": ["First", "Second", "Third"] }
  ]
}
```

### Common Mistakes to Avoid

- Relative paths for `image.path` — always absolute
- **SVG image assets — use PNG/JPG.** SVG embeds render blank in many PPT viewers. This rule applies to image assets, not supported native charts
- Converting a supported native chart to PNG before attempting native generation and validation — use the `gen-chart` PNG fallback only when the generated native chart is blank, invalid, or unsupported by the target viewer
- Omitting `"layout"` field (defaults to `"content"`)
- `#` prefix inconsistency in color values (both accepted, be consistent)
- Chart/table options at slide level — nest inside `chart.options` / `table.options`
- Table headers field is `headers`, not `head` (alias tolerated but avoid)

### References
- `references/json-schema.md` — Full JSON schema
- `references/examples.md` — 6 complete examples
- `references/ooxml-validation.md` — Native chart normalization, validation, and viewer test requirements

---

## Mode B: HTML Slides (opt-in)

**Workflow:** Write Markdown (`---` on own line separates slides, `# Title` for title slide) → run `md-to-slides.mjs` → self-contained `.html`.

### Markdown Format

```markdown
# Title
## Subtitle
---
## Slide 2
- Point one
- Point two
---
## Data Table
| Col A | Col B |
|-------|-------|
| Val 1 | Val 2 |
---
## Live Chart
```echarts
{ "title": { "text": "Revenue" }, "xAxis": { "type": "category", "data": ["Q1", "Q2"] }, "yAxis": { "type": "value" }, "series": [{ "type": "bar", "data": [120, 200] }] }
```
---
# Thank You
```

### Guidelines

- **10-20 slides** typical; `##`/`###` heading per slide, 3-6 bullets max
- Fenced code blocks with language tags for syntax highlighting
- **Images: `![alt](path)` — always embedded as base64 data URIs directly into the HTML** (local paths and URLs both supported; use absolute local paths). Never reference external image files. PNG preferred for chart images; SVG also renders fine in browsers (HTML mode only — PPTX still requires PNG)
- **ECharts must be rendered inside the slides**: put the ECharts option JSON (or the `{chart, option}` output of gen-chart `echarts-config.mjs`) in a ` ```echarts ` fenced block. The script injects the ECharts runtime and renders the chart live when the slide is shown. Never paste ECharts JSON as plain code/text
- **Options:** `--theme=<name>`, `--title="Tab Title"`
- **Navigation:** Arrow/Space/PgUp/PgDn keys, on-screen/touch buttons, F=fullscreen, O=overview, Home/End

---

## Dependencies

```bash
cd "${HERMES_SKILL_DIR}" && npm install
```

- `pptxgenjs@4.0.1` and `jszip@3.10.1` (PPTX generation and OOXML verification), `marked` + `highlight.js` (HTML)
