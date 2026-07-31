---
name: gen-ppt
description: >
    Generate presentations — defaults to editable .pptx from JSON (native PowerPoint, editable in PowerPoint/Keynote/Google Slides). Only when the user explicitly requests HTML web slides / online playback / interactive browser presentation, generate self-contained .html slides from Markdown (NOT PowerPoint-editable).
    Applicable: slide decks, pitch decks, meeting presentations, web presentations.
    Triggers: PowerPoint, PPTX, editable slides, generate PPT, HTML slides, web slides, markdown to slides, interactive presentation.
    Blocking: Keynote/Google Slides-only exports, video.
version: 2.1.2
---

# GenPPT — Presentation Generator

**Default: native .pptx** (editable in PowerPoint/Keynote/Google Slides). Switch to HTML only when the user explicitly requests online/browser/interactive HTML slides.

## Output Modes

| | Mode A: PPTX (default) | Mode B: HTML Slides (opt-in) |
|---|---|---|
| **Output** | `.pptx` — editable | `.html` — self-contained, browser-only |
| **Input** | JSON config | Markdown (`---` separates slides) |
| **Script** | `scripts/gen-ppt.mjs` | `scripts/md-to-slides.mjs` |
| **Deps** | `pptxgenjs` | `marked`, `highlight.js` |

**HTML triggers:** "HTML slides", "web slides", "网页PPT", "在线播放", "interactive presentation", "browser-based", "markdown to slides". Otherwise → PPTX.

## Usage

```bash
# Mode A: JSON → PPTX (default)
node <skill_dir>/scripts/gen-ppt.mjs <config.json> <output.pptx> [--theme=<name>]
# Mode B: Markdown → HTML (opt-in)
node <skill_dir>/scripts/md-to-slides.mjs <input.md> <output.html> [--theme=<name>] [--title="Title"]
```

Resolve `./scripts/*` to absolute paths using this SKILL.md's directory. Use absolute paths for I/O files.

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

**Workflow:** Write JSON config → run `gen-ppt.mjs` → `.pptx`. Full schema: `references/json-schema.md`.

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

All slides support custom `elements` array. Charts: `bar`, `line`, `pie`, `doughnut`, `area`, `scatter`, `radar`, or `image` (pre-rendered chart file, e.g. from gen-chart: `"chart": { "type": "image", "path": "/abs/chart.png" }`).

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
- **SVG images — always use PNG/JPG.** SVG embeds render blank in most PPT viewers (WPS, older Office, macOS Preview). When generating charts with gen-chart for PPT embedding, output PNG
- Omitting `"layout"` field (defaults to `"content"`)
- `#` prefix inconsistency in color values (both accepted, be consistent)
- Chart/table options at slide level — nest inside `chart.options` / `table.options`
- Table headers field is `headers`, not `head` (alias tolerated but avoid)

### References
- `references/json-schema.md` — Full JSON schema
- `references/examples.md` — 5 complete examples

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

Pre-installed in `<hogagent_root>/node_modules/`:
- `pptxgenjs` (PPTX), `marked` + `highlight.js` (HTML)
