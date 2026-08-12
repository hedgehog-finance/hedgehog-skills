---
name: gen-chart
description: >
    Generate charts as PNG/SVG (Vega-Lite, Mermaid) or ECharts JSON configurations. You MUST select either “Image Mode” or “ECharts Mode” before generating data.
    Triggers: chart, diagram, graph, flowchart, sequence diagram, mermaid, vega, echarts.
version: 2.1.3
compatibility: Requires Node.js >=18 in the Hermes terminal runtime.
prerequisites:
  commands: [node, npm]
---

# GenChart — Chart & Diagram Generator

Generate charts (Vega-Lite) and diagrams (Mermaid) as PNG/SVG images, or ECharts JSON configs.
Two usage scenarios: **Standalone Generation** and **In-text Embedding**.

## Chart Generation modes (Mandatory)

Target modes must be declared prior to data generation. Mixing protocols is strictly prohibited:

* **Image Mode**: Uses the **Vega-Lite JSON specification** or **Mermaid syntax** (outputs PNG/SVG via `vega-chart.mjs` / `mermaid-chart.mjs`).
* **ECharts Mode**: Outputs **ECharts JSON configuration** via `echarts-config.mjs` (no files generated). Use only when the user explicitly requests ECharts.

**Execution Rules:**
1. **Strict Isolation**: Never pass ECharts JSON to `vega-chart.mjs` (this causes rendering failures). Never pass Vega-Lite specifications to `echarts-config.mjs`.
2. **Data Authenticity**: `gen-chart` requires real data inputs. Mock data and placeholders are prohibited.
3. **Default Mode**: Image Mode is the default. Use ECharts Mode only when the user explicitly requests it.

## Scripts

### vega-chart.mjs — Data charts (line, bar, pie, scatter, etc.)
```bash
node ${HERMES_SKILL_DIR}/scripts/vega-chart.mjs --spec <spec.json> --output <output.png|svg> [--theme=<name>]
```

### mermaid-chart.mjs — Diagrams (flowchart, sequence, class, etc.)
```bash
node ${HERMES_SKILL_DIR}/scripts/mermaid-chart.mjs --spec <input.mmd> --output <output.png|svg> [--theme=<name>]
```

### echarts-config.mjs — ECharts config (JSON output, no files)
```bash
node ${HERMES_SKILL_DIR}/scripts/echarts-config.mjs --spec <chart-def.json> [--theme=<name>] [--width=<n>] [--height=<n>]
```
Outputs `{ chart, option }` JSON to **stdout**. No files generated.

> Resolve `${HERMES_SKILL_DIR}/scripts/*` to absolute paths using this SKILL.md's directory.

## Supported Chart & Diagram Types

| Mode | Engine | Type | Chart Types |
|------|--------|------|-------------|
| **Image** | Vega-Lite | Data charts | line, bar, area, point (scatter), arc (pie/donut), rect, rule, text + all Vega-Lite marks |
| **Image** | Mermaid | Diagrams | flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, gitgraph |
| **ECharts** | ECharts | Data charts | line, area, bar, horizontal bar, histogram, pie, donut, radar, scatter, scatter plot, bubble |

> Vega-Lite/Mermaid support additional types beyond those listed. ECharts validates against the 11 types above.

---

## Scenario A: Standalone Generation

Single chart output, no surrounding text.

**Image Mode (default):**
1. Write input to file in session task dir (NOT inline on CLI)
2. Run: `node ${HERMES_SKILL_DIR}/scripts/<script>.mjs --spec <input> --output <output> [--theme=...]`
3. Deliver the output image file.

**ECharts Mode (opt-in, user must explicitly request):**
1. Write chart def JSON: `{ "chart": "<type>", "option": { ... } }`
2. Run: `node ${HERMES_SKILL_DIR}/scripts/echarts-config.mjs --spec <chart-def.json> [--theme=<name>]`
3. Deliver the stdout JSON text directly (no files generated).

---

## Scenario B: In-text Embedding

Embed charts in longer body text. Following user requests or system prompts, embed the chart content or citations into the text, or insert placeholders in the text and append a list of charts at the end.

---

## ECharts Details

- **Default size**: 16:9 (800×450). Actual rendering size controlled by frontend.
- **Theme**: `--theme=<name>` (default: `fintech`). `--theme=list` to see all.
- See `references/echarts-examples.md` for complete examples.

## Best Practices

- **Aspect ratio**: Default to **16:9** (`width: 800, height: 450`).
- **Vega-Lite numeric on ordinal axis**: Convert to string via `transform` to avoid rendering issues:
  ```json
  "transform": [{ "calculate": "toString(datum.year)", "as": "year_string" }],
  "encoding": { "x": { "field": "year_string", "type": "ordinal" } }
  ```

### Auto-fix (Data Format)

Script auto-detects and fixes common LLM data issues (stderr warnings):

| Issue | Symptom | Auto-fix |
|-------|---------|----------|
| Chinese/non-ISO dates + `temporal` | Blank chart | `"2024年1月"` → `"2024-01-01"` |
| String numbers + `quantitative` | Missing marks | `"100"` → `100` |
| Empty `data.values` | Blank chart | Warn + suggest fix |

**Best practice**: Use ISO 8601 dates and numeric values to avoid auto-fix overhead.

## Options
- `-o <output>` — Alt output flag
- `--format=svg` — Force SVG (or use `.svg` extension)
- `--theme=<name>` — Theme preset. **Default: `fintech`** (auto-applied). `none` to disable. Mermaid also: `default`, `dark`, `forest`, `neutral`. `list` to print all.

**Output format choice**: Use **PNG** when the chart will be embedded into PPTX/DOCX/PDF (gen-ppt, gen-doc, etc.) — SVG embeds render blank in most office viewers. Use SVG only for web/HTML display.

## Financial Color Themes

`--theme=<key>` for pre-tuned financial color schemes (6 colors + background):

| Key | Name | Colors (6) | BG | Best For |
|-----|------|-----------|-----|----------|
| `fintech` | Modern FinTech | `#1D4ED8 #215DF2 #60A5FA #818CF8 #A78BFA #38BDF8` | `#F8FAFC` | SaaS, tech charts |
| `oldmoney` | Traditional Banking | `#0A2540 #B4975A #115E59 #8B2500 #D4A76A #2E8B6F` | `#FFFFFF` | Wealth mgmt |
| `bloomberg` | Bloomberg / Quant | `#10B981 #EF4444 #0EA5E9 #F59E0B #A855F7 #06B6D4` | `#09090B` | Dark dashboards |
| `economist` | Economist Style | `#0F2B5B #D73027 #4575B4 #E8A735 #1B7A5A #6C7B8A` | `#F6F4F0` | Data journalism |
| `saas` | Silicon Valley SaaS | `#635BFF #00D4B6 #FF8A65 #3B82F6 #EC4899 #84CC16` | `#FFFFFF` | Product analytics |
| `mist` | Morning Mist | `#64748B #7A8C9F #8F9FB1 #9EAEBF #B0BFCF #C2CEDD` | `#F1F5F9` | Muted slate blues |
| `twilight` | Twilight | `#776B87 #8A7D9A #9C90AC #AFA3BD #C0B5CE #D1C6DD` | `#F5F3F7` | Muted violets |
| `parchment` | Parchment | `#947E70 #A69082 #B5A092 #C4B1A3 #D1C0B3 #DDCFC3` | `#F5F2EB` | Warm sepia |
| `azure` | Azure | `#5E7B9E #728EAF #86A0BE #9BB1CD #ADC1DA #BFD1E6` | `#EAF2F8` | Coastal blues |
| `gravel` | Gravel | `#73716D #868480 #989691 #A9A7A2 #B9B7B2 #C9C7C2` | `#F0EFEA` | Neutral grays |

> No `--theme` given: **`fintech` auto-applied**. Use `--theme=none` for Vega/Mermaid defaults.

## Dependencies

```bash
cd "${HERMES_SKILL_DIR}" && npm install
```

Installs `vega` (`^6.3.1`), `vega-lite` (`^6.4.3`), `canvas`, `@mermaid-js/mermaid-cli`, and `puppeteer` locally.

Vega-Lite specs should use the v6 schema when `$schema` is included: `https://vega.github.io/schema/vega-lite/v6.json`.

ECharts is NOT a Node.js dependency — frontend loads ECharts 5.5.1 from CDN.
