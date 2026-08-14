# Native PPTX Chart Integrity

Use this reference when generating or troubleshooting editable native charts in `.pptx` output.

## Invariants

`gen-ppt.mjs` must preserve `bar`, `line`, `pie`, `doughnut`, `area`, `scatter`, and `radar` as native editable Office charts. Do not replace these types with PNG/SVG to hide a package or viewer compatibility failure.

The export pipeline in `scripts/pptx-ooxml.mjs` must:

1. Serialize with the pinned `pptxgenjs@4.0.1` runtime.
2. Normalize native chart XML before writing the final file.
3. Convert slide-to-chart relationship targets from absolute `/ppt/charts/...` paths to relative `../charts/...` paths.
4. Enforce DrawingML child order for supported chart containers and data series.
5. Insert required `lineChart/grouping`, remove series nodes forbidden for that chart type, and remove chart-axis references that have no matching axis definition.
6. Convert a one-level `multiLvlStrRef` category cache to `strRef` for cross-viewer compatibility while retaining genuinely multi-level categories.
7. Validate ZIP CRCs, required package parts, XML nesting, internal relationship targets, chart ordering, and axis cross-references.
8. Abort generation on any validation failure. Never emit the unverified PptxGenJS buffer and never silently switch to an image chart.

Input validation must also reject empty/mismatched series, non-finite numbers, negative pie/doughnut values, incomplete scatter X/Y data, and undocumented native chart types before serialization.

## Commands

Generation already runs structural validation:

```bash
node <skill_dir>/scripts/gen-ppt.mjs <config.json> <output.pptx>
```

Run the validator independently when auditing an existing result:

```bash
node <skill_dir>/scripts/validate-pptx.mjs <output.pptx>
```

Add every available target viewer:

```bash
node <skill_dir>/scripts/validate-pptx.mjs <output.pptx> --libreoffice
# macOS, when the application is installed:
node <skill_dir>/scripts/validate-pptx.mjs <output.pptx> --keynote
node <skill_dir>/scripts/validate-pptx.mjs <output.pptx> --powerpoint
```

Viewer flags open the PPTX and export a non-empty PDF. A missing viewer is a failed requested check, not a skipped success.

Run the bundled regression suite after any generator or dependency change:

```bash
cd <skill_dir>
npm run test:native-charts -- --libreoffice
# Add installed macOS target viewers:
npm run test:native-charts -- --libreoffice --keynote --powerpoint
```

## Release Checklist

- Generate a smoke-test deck containing all seven native chart types.
- Use explicit `xValues`/`yValues` for the scatter slide and confirm visible points, not only axes.
- Confirm `validate-pptx.mjs` reports all seven chart parts.
- Confirm ZIP and internal relationship validation pass.
- Run LibreOffice rendering when `soffice` is available.
- Run Keynote and PowerPoint tests on macOS when those target applications are installed.
- Inspect rendered pages and confirm every chart contains visible axes/marks/labels as applicable.
- Test an intentionally unnormalized PptxGenJS chart deck and confirm validation rejects it.
- Keep `pptxgenjs` pinned; do not change the version without repeating this checklist.

## Static Images

`type: "image"` is valid when the user explicitly wants a static chart, requests a chart type without native support such as candlestick or heatmap, or a native chart remains blank/invalid in the target viewer after regeneration and validation. In the last case, use `gen-chart` to render the same chart data as PNG, replace only the affected chart, inspect the rendered slide, and disclose that the chart is no longer natively editable. Do not switch silently or emit an unverified native PPTX.
