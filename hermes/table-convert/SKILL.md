---
name: table-convert
description: >
    Convert spreadsheets (.xlsx, .xls, .csv) to JSON or Markdown table.
    Triggers: Excel, CSV, spreadsheet, table convert, xlsx, xls.
    Blocking: PDF/Word export, database import, chart generation from raw data.
version: 1.0.0
compatibility: Requires Node.js >=18 in the Hermes terminal runtime.
prerequisites:
  commands: [node, npm]
---

# TableConvert — Spreadsheet to JSON / Markdown

Convert .xlsx, .xls, .csv files to structured JSON arrays or Markdown tables.

## Scripts

### convert.mjs — Main converter
```bash
node ${HERMES_SKILL_DIR}/scripts/convert.mjs <input> <output> [--format=json|markdown] [--sheet=<name|index>]
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--format` | `json` | Output format: `json` or `markdown` |
| `--sheet` | first sheet | Sheet name, 0-based index, or `list` to print all sheet names |

## Workflow

1. **Identify** the input spreadsheet file (.xlsx, .xls, or .csv)
2. **Run**: `node ${HERMES_SKILL_DIR}/scripts/convert.mjs <input> <output> [options]`
3. Output is written to the specified `<output>` path (use session task dir)

## Examples

```bash
# CSV to JSON (default format)
node ${HERMES_SKILL_DIR}/scripts/convert.mjs data.csv output.json

# Excel to Markdown table
node ${HERMES_SKILL_DIR}/scripts/convert.mjs report.xlsx output.md --format=markdown

# Convert a specific sheet by name
node ${HERMES_SKILL_DIR}/scripts/convert.mjs multi.xlsx output.json --sheet=Sales

# Convert by sheet index (0-based)
node ${HERMES_SKILL_DIR}/scripts/convert.mjs multi.xlsx output.json --sheet=1

# List all sheet names
node ${HERMES_SKILL_DIR}/scripts/convert.mjs multi.xlsx dummy --sheet=list
```

> Resolve `${HERMES_SKILL_DIR}/scripts/*` to absolute paths using this SKILL.md's directory (shown in system prompt `available_skills`).
> Use absolute paths for input/output files. Write output to session task dir.

## Dependencies

```bash
cd "${HERMES_SKILL_DIR}" && npm install
```

Installs `xlsx` and `markdown-table` locally.
