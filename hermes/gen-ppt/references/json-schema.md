# GenPPT JSON Configuration Specification

## Top-Level Structure

```json
{
  "title": "Presentation Title",
  "author": "Author Name",
  "date": "2026-06-26",
  "layout": "LAYOUT_16x9",
  "theme": "fintech",
  "customTheme": {},
  "slides": []
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | No | — | Presentation title (metadata) |
| `author` | string | No | — | Author (metadata) |
| `date` | string | No | — | Date (metadata) |
| `layout` | string | No | `"LAYOUT_16x9"` | `LAYOUT_16x9`, `LAYOUT_16x10`, `LAYOUT_4x3`, `LAYOUT_WIDE` |
| `theme` | string | No | `"fintech"` | Theme name or `"none"` |
| `customTheme` | object | No | — | Color overrides (see below) |
| `slides` | Slide[] | **Yes** | — | Slide array |

## customTheme

All fields optional. Hex values may include or omit `#`.

```json
{
  "primary": "1D4ED8",
  "secondary": "60A5FA",
  "accent": "F59E0B",
  "background": "FFFFFF",
  "textColor": "1E293B",
  "subtleText": "64748B",
  "colors": ["1D4ED8", "215DF2", "60A5FA", "818CF8", "A78BFA", "38BDF8"]
}
```

## Slide Object

All text fields (title, subtitle, bullets, body, footnote, table cells, text elements) support inline formatting:

| Markup | Effect |
|--------|--------|
| `**text**`, `<strong>`, `<b>` | Bold |
| `*text*`, `<em>`, `<i>` | Italic (underscore `_x_` NOT supported — avoids snake_case false positives) |
| `~~text~~`, `<s>`, `<del>`, `<strike>` | Strikethrough |
| `` `text` `` | Monospace (Courier New) |
| `<u>` | Underline |
| `<sub>` / `<sup>` | Subscript / superscript |
| `<br>` | Line break |
| `<center>` | Center the paragraph |

Unpaired Markdown markers (e.g. `5 * 3`) are kept as literal text.

```json
{
  "layout": "content",
  "title": "Slide Title",
  "subtitle": "Optional subtitle",
  "bullets": ["Point 1", "Point 2"],
  "body": "Paragraph text (alt to bullets)",
  "footnote": "Source citation",
  "image": {}, "chart": {}, "table": {},
  "left": {}, "right": {},
  "sectionNumber": "01",
  "date": "2026-06-26",
  "author": "Author",
  "logo": {},
  "background": "F8FAFC",
  "elements": [],
  "notes": "Speaker notes"
}
```

| Field | Type | Used By |
|-------|------|---------|
| `layout` | string | All (required) |
| `title` | string | All except `blank` |
| `subtitle` | string | `title`, `section`, `closing` |
| `bullets` | (string\|BulletItem)[] | `content`, `image-text`, `two-column` (via left/right) |
| `body` | string | `content`, `image-text` |
| `footnote` | string | `content`, `two-column`, `image-text`, `chart`, `table` |
| `image` | ImageSlot | `image-text`, `title`, `closing` |
| `chart` | ChartSlot | `chart` |
| `table` | TableSlot | `table` |
| `left` / `right` | ColumnContent | `two-column` |
| `sectionNumber` | string | `section` |
| `date` / `author` | string | `title` |
| `logo` | ImageSlot | `title`, `closing` |
| `background` | string | All |
| `elements` | Element[] | All |
| `notes` | string | All |

---

## Layout Types

| Layout | Accepted Fields |
|--------|----------------|
| `title` — Cover page | title, subtitle, date, author, logo |
| `section` — Divider | sectionNumber, title, subtitle |
| `content` — Bullets/text | title, bullets/body, footnote |
| `two-column` — Side-by-side | title, left (ColumnContent), right (ColumnContent), footnote |
| `image-text` — Image+text | title, image, bullets/body, footnote. `image.position` picks the arrangement: `"left"` (default, image left / text right), `"right"` (text left / image right), `"top"` (image top / text bottom), `"bottom"` (text top / image bottom) |
| `chart` — Data chart | title, subtitle, chart, footnote |
| `table` — Data table | title, subtitle, table, footnote |
| `closing` — End page | title, subtitle, logo |
| `blank` — Custom only | elements array |

---

## Slot Types

### BulletItem

```json
{ "text": "Main point", "level": 0, "bold": true, "italic": false, "color": "EF4444" }
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | string | — | Bullet text |
| `level` | number | `0` | 0=main, 1=sub, 2=sub-sub |
| `bold` | boolean | `false` | Bold |
| `italic` | boolean | `false` | Italic |
| `color` | string | theme | Text color override |

Plain strings also work: `"Simple bullet"` = `{ text: "Simple bullet", level: 0 }`.

### ColumnContent

```json
{ "title": "Column Title", "bullets": ["Item 1", "Item 2"], "body": "Paragraph" }
```

### ImageSlot

Images are never stretched: the intrinsic pixel size (PNG/JPEG/GIF/BMP) is read from the file header and the image is scaled proportionally to fit its slot, centered.

```json
// File path (absolute) or base64
{ "path": "/absolute/path/to/image.png", "alt": "Description" }
{ "data": "data:image/png;base64,iVBOR..." }
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Absolute file path (mutual exclusive with `data`). **Use PNG/JPG — SVG renders blank in most PPT viewers** (a same-name `.png` is auto-substituted if present) |
| `data` | string | Base64 data URI (mutual exclusive with `path`) |
| `alt` | string | Alt text |
| `position` | string | `"left"` (default), `"right"`, `"top"`, `"bottom"` — image placement relative to text (image-text only) |

### ChartSlot

```json
{
  "type": "bar",
  "title": "Revenue by Quarter",
  "data": [
    { "name": "2025", "labels": ["Q1", "Q2", "Q3"], "values": [120, 150, 180] }
  ],
  "options": {
    "barDir": "col", "showLegend": true, "legendPos": "b",
    "showValue": true, "valAxisTitle": "Revenue (M USD)", "catAxisTitle": "Quarter"
  }
}
```

Editable native types: `bar`, `line`, `pie`, `doughnut`, `area`, `scatter`, `radar`.

Native chart data is strict: each non-scatter series needs equal-length, non-empty `labels` and numeric `values`; pie/doughnut values cannot be negative. Unsupported native types and invalid data abort generation instead of producing an empty chart.

**Static chart image** — use `type: "image"` when the user explicitly requests a static chart, the requested chart type has no native implementation (for example candlestick or heatmap), or a native chart remains blank/invalid in the target viewer after regeneration and validation. For that compatibility fallback, render the same chart data with `gen-chart` as PNG and replace only the affected chart. The `data` field is not required:

```json
{ "type": "image", "path": "/absolute/path/to/chart.png", "alt": "Chart description" }
```

**Series:** `{ "name": string, "labels": string[], "values": number[] }`

**Scatter series:** use explicit X/Y values. Every series must have equal-length arrays and share the same `xValues`:

```json
{
  "type": "scatter",
  "data": [
    { "name": "Observed", "xValues": [1, 2, 3], "yValues": [2.4, 3.1, 4.8] },
    { "name": "Forecast", "xValues": [1, 2, 3], "yValues": [2.1, 3.5, 5.2] }
  ]
}
```

The lower-level PptxGenJS form—one X-axis `values` series followed by one or more Y `values` series—is also accepted. A single generic `{labels, values}` series is invalid for scatter charts because it has no Y series.

**Options** (all optional, passed to PptxGenJS):

| Option | Values |
|--------|--------|
| `barDir` | `"col"`, `"bar"` |
| `barGrouping` | `"clustered"`, `"stacked"`, `"percentStacked"` |
| `showLegend` | boolean |
| `legendPos` | `"t"`, `"b"`, `"l"`, `"r"` |
| `showValue` | boolean |
| `dataLabelPosition` | `"outEnd"`, `"inEnd"`, `"ctr"` |
| `showPercent` | boolean (pie/doughnut) |
| `holeSize` | number (%) |
| `lineSize` | number |
| `valAxisTitle` / `catAxisTitle` | string |
| `valAxisHidden` / `catAxisHidden` | boolean |

### Native Chart Integrity

`gen-ppt.mjs` keeps supported charts editable. Before writing the file it normalizes PptxGenJS chart parts, converts chart relationships to relative package paths, and validates ZIP integrity, required OOXML parts, XML nesting, relationship targets, chart child ordering, required line grouping, forbidden series nodes, and axis references. Any failure aborts generation; there is no silent image fallback.

Re-run validation or target-viewer tests with:

```bash
node ${HERMES_SKILL_DIR}/scripts/validate-pptx.mjs <output.pptx>
node ${HERMES_SKILL_DIR}/scripts/validate-pptx.mjs <output.pptx> --libreoffice
# macOS, when installed:
node ${HERMES_SKILL_DIR}/scripts/validate-pptx.mjs <output.pptx> --keynote
node ${HERMES_SKILL_DIR}/scripts/validate-pptx.mjs <output.pptx> --powerpoint
```

See `references/ooxml-validation.md` for the enforced invariants and release checklist.

### TableSlot

```json
{
  "headers": ["Metric", "2024", "2025"],
  "rows": [["Revenue", "$1.2B", "$1.5B"], ["Net Income", "$180M", "$240M"]],
  "colW": [2.0, 1.5, 1.5],
  "options": { "border": { "pt": 0.5, "color": "CBD5E1" } }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `headers` | string[] | Column headers (`head` accepted as alias) |
| `rows` | (string\|object)[][] | Row data (strings or `{text, options}` objects) |
| `colW` | number[] | Column widths (inches) |
| `rowH` | number[] | Row heights (inches) |
| `autoPage` | boolean | Auto-paginate (default: true) |
| `options` | object | PptxGenJS table options |

### Element (Custom Positioned)

```json
{
  "type": "text", "content": "Custom text",
  "x": 0.5, "y": 4.0, "w": 9.0, "h": 0.5,
  "options": { "fontSize": 10, "color": "64748B", "align": "center" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `text`, `image`, `shape`, `chart`, `table` |
| `content` | any | Type-dependent content |
| `x`, `y`, `w`, `h` | number | Position & size (inches) |
| `shape` | string | For `shape` type: `rect`, `ellipse`, `roundRect`, `line`, `arrow` |
| `options` | object | PptxGenJS options (passed through) |

---

## Color Values

`#` prefix optional: `"1D4ED8"` and `"#1D4ED8"` both valid. Converted to PptxGenJS format internally.

## Validation Rules

1. `slides` must be non-empty array
2. Each slide needs valid `layout`
3. Chart `data[].values.length` must match `data[].labels.length`
4. Table row columns must match `headers` length
5. Image `path` must be absolute
6. Missing slot data: slot skipped (no error), warning printed
