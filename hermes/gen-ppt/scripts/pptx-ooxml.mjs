/**
 * Normalize and validate native chart OOXML emitted by PptxGenJS.
 *
 * PptxGenJS 4.0.1 emits chart parts that PowerPoint can sometimes repair but
 * stricter consumers (notably Keynote) reject. Keep this module deterministic:
 * it only repairs known OOXML compatibility issues and fails closed when the
 * resulting package is internally inconsistent.
 */

import JSZip from "jszip";
import { posix as path } from "node:path";

const CHART_NS = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const CHART_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";

const CHART_CHILD_ORDER = {
  lineChart: ["grouping", "varyColors", "ser", "dLbls", "dropLines", "hiLowLines", "upDownBars", "marker", "smooth", "axId", "extLst"],
  barChart: ["barDir", "grouping", "varyColors", "ser", "dLbls", "gapWidth", "overlap", "serLines", "axId", "extLst"],
  areaChart: ["grouping", "varyColors", "ser", "dLbls", "dropLines", "axId", "extLst"],
  scatterChart: ["scatterStyle", "varyColors", "ser", "dLbls", "axId", "extLst"],
  radarChart: ["radarStyle", "varyColors", "ser", "dLbls", "axId", "extLst"],
  pieChart: ["varyColors", "ser", "dLbls", "firstSliceAng", "extLst"],
  doughnutChart: ["varyColors", "ser", "dLbls", "firstSliceAng", "holeSize", "extLst"],
};

const SERIES_CHILD_ORDER = {
  lineChart: ["idx", "order", "tx", "spPr", "marker", "dPt", "dLbls", "trendline", "errBars", "cat", "val", "smooth", "extLst"],
  barChart: ["idx", "order", "tx", "spPr", "invertIfNegative", "pictureOptions", "dPt", "dLbls", "trendline", "errBars", "cat", "val", "shape", "extLst"],
  areaChart: ["idx", "order", "tx", "spPr", "pictureOptions", "dPt", "dLbls", "trendline", "errBars", "cat", "val", "extLst"],
  scatterChart: ["idx", "order", "tx", "spPr", "marker", "dPt", "dLbls", "trendline", "errBars", "xVal", "yVal", "smooth", "extLst"],
  radarChart: ["idx", "order", "tx", "spPr", "marker", "dPt", "dLbls", "cat", "val", "extLst"],
  pieChart: ["idx", "order", "tx", "spPr", "explosion", "dPt", "dLbls", "cat", "val", "extLst"],
  doughnutChart: ["idx", "order", "tx", "spPr", "explosion", "dPt", "dLbls", "cat", "val", "extLst"],
};

const FORBIDDEN_SERIES_CHILDREN = {
  lineChart: new Set(["invertIfNegative"]),
  areaChart: new Set(["invertIfNegative"]),
  radarChart: new Set(["invertIfNegative"]),
};

function localName(qname) {
  return qname.includes(":") ? qname.slice(qname.indexOf(":") + 1) : qname;
}

function getAttribute(xml, name) {
  const match = xml.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return match?.[1];
}

function directChildren(innerXml) {
  const children = [];
  const tags = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>/g;
  let depth = 0;
  let start = -1;
  let qname = "";
  let match;
  while ((match = tags.exec(innerXml))) {
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<?") || token.startsWith("<![CDATA[")) continue;
    if (token.startsWith("<!")) continue;
    const closing = /^<\//.test(token);
    const selfClosing = /\/\s*>$/.test(token);
    if (!closing) {
      const nameMatch = token.match(/^<\s*([^\s/>]+)/);
      if (!nameMatch) continue;
      if (depth === 0) { start = match.index; qname = nameMatch[1]; }
      if (selfClosing) {
        if (depth === 0) {
          children.push({ qname, name: localName(qname), xml: innerXml.slice(start, tags.lastIndex) });
          start = -1; qname = "";
        }
      } else depth += 1;
    } else {
      depth -= 1;
      if (depth < 0) throw new Error("Malformed XML: unexpected closing tag");
      if (depth === 0 && start >= 0) {
        children.push({ qname, name: localName(qname), xml: innerXml.slice(start, tags.lastIndex) });
        start = -1; qname = "";
      }
    }
  }
  if (depth !== 0) throw new Error("Malformed XML: unclosed element");
  return children;
}

function reorderChildren(innerXml, order, forbidden = new Set()) {
  const rank = new Map(order.map((name, index) => [name, index]));
  return directChildren(innerXml)
    .filter((child) => !forbidden.has(child.name))
    .map((child, index) => ({ ...child, index }))
    .sort((a, b) => {
      const ar = rank.has(a.name) ? rank.get(a.name) : order.length - 1;
      const br = rank.has(b.name) ? rank.get(b.name) : order.length - 1;
      return ar - br || a.index - b.index;
    })
    .map((child) => child.xml).join("");
}

function transformBlocks(xml, localTag, transform) {
  const pattern = new RegExp(`<c:${localTag}([^>]*)>([\\s\\S]*?)<\\/c:${localTag}>`, "g");
  return xml.replace(pattern, (whole, attrs, inner) => `<c:${localTag}${attrs}>${transform(inner, whole)}</c:${localTag}>`);
}

function normalizeSingleLevelCategories(xml) {
  return xml.replace(/<c:multiLvlStrRef>([\s\S]*?)<\/c:multiLvlStrRef>/g, (whole, inner) => {
    const levels = [...inner.matchAll(/<c:lvl>([\s\S]*?)<\/c:lvl>/g)];
    if (levels.length !== 1) return whole;
    const formula = inner.match(/<c:f>[\s\S]*?<\/c:f>/)?.[0] || "";
    const pointCount = inner.match(/<c:ptCount\b[^>]*\/>/)?.[0] || "";
    const points = [...levels[0][1].matchAll(/<c:pt\b[\s\S]*?<\/c:pt>/g)].map((match) => match[0]).join("");
    return `<c:strRef>${formula}<c:strCache>${pointCount}${points}</c:strCache></c:strRef>`;
  });
}

function definedAxisIds(xml) {
  const ids = new Set();
  const axes = /<c:(?:catAx|dateAx|valAx|serAx)>[\s\S]*?<\/c:(?:catAx|dateAx|valAx|serAx)>/g;
  for (const match of xml.matchAll(axes)) {
    const id = match[0].match(/<c:axId\b[^>]*\bval="([^"]+)"/)?.[1];
    if (id) ids.add(id);
  }
  return ids;
}

function normalizeChartXml(xml) {
  const axisIds = definedAxisIds(xml);
  let normalized = xml.replace(/<c:roundedCorners\b[^>]*\bval="1"\s*\/>/g, '<c:roundedCorners val="0"/>');
  normalized = normalizeSingleLevelCategories(normalized);
  for (const [chartType, chartOrder] of Object.entries(CHART_CHILD_ORDER)) {
    normalized = transformBlocks(normalized, chartType, (chartInner) => {
      let inner = chartInner;
      if (chartType === "lineChart" && !/<c:grouping\b/.test(inner)) inner = '<c:grouping val="standard"/>' + inner;
      inner = transformBlocks(inner, "ser", (seriesInner) => reorderChildren(
        seriesInner, SERIES_CHILD_ORDER[chartType], FORBIDDEN_SERIES_CHILDREN[chartType] || new Set(),
      ));
      const children = directChildren(inner).filter((child) => {
        if (child.name !== "axId") return true;
        const id = getAttribute(child.xml, "val");
        return !id || axisIds.has(id);
      });
      return reorderChildren(children.map((child) => child.xml).join(""), chartOrder);
    });
  }
  return normalized;
}

function normalizeChartRelationshipTargets(xml) {
  return xml.replace(/(Type="[^"]*\/chart"[^>]*\sTarget=")\/ppt\/charts\//g, "$1../charts/");
}

function assertWellFormedXml(xml, partName) {
  const stack = [];
  const tags = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>/g;
  let match;
  while ((match = tags.exec(xml))) {
    const token = match[0];
    if (/^<(?:\?|!)/.test(token)) continue;
    const closing = token.match(/^<\/\s*([^\s>]+)\s*>$/);
    if (closing) {
      const expected = stack.pop();
      if (expected !== closing[1]) throw new Error(`${partName}: mismatched closing tag ${closing[1]} (expected ${expected || "none"})`);
      continue;
    }
    if (/\/\s*>$/.test(token)) continue;
    const opening = token.match(/^<\s*([^\s/>]+)/);
    if (opening) stack.push(opening[1]);
  }
  if (stack.length) throw new Error(`${partName}: unclosed XML element ${stack.at(-1)}`);
}

function relationshipSourcePart(relPart) {
  if (relPart === "_rels/.rels") return "";
  const marker = "/_rels/";
  const index = relPart.lastIndexOf(marker);
  if (index < 0 || !relPart.endsWith(".rels")) return null;
  return path.join(relPart.slice(0, index), relPart.slice(index + marker.length, -".rels".length));
}

function parseRelationships(xml) {
  const relationships = [];
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const attrs = match[1];
    relationships.push({ id: getAttribute(attrs, "Id"), type: getAttribute(attrs, "Type"), target: getAttribute(attrs, "Target"), targetMode: getAttribute(attrs, "TargetMode") });
  }
  return relationships;
}

function resolveRelationshipTarget(sourcePart, target) {
  const cleanTarget = target.startsWith("/") ? target.slice(1) : target;
  const resolved = sourcePart ? path.normalize(path.join(path.dirname(sourcePart), cleanTarget)) : path.normalize(cleanTarget);
  try { return decodeURIComponent(resolved); } catch { return resolved; }
}

function assertOrderedChildren(innerXml, order, context) {
  const rank = new Map(order.map((name, index) => [name, index]));
  let previous = -1;
  for (const child of directChildren(innerXml)) {
    if (!rank.has(child.name)) continue;
    const current = rank.get(child.name);
    if (current < previous) throw new Error(`${context}: c:${child.name} is out of OOXML schema order`);
    previous = current;
  }
}

function validateChartXml(xml, partName) {
  if (!xml.includes(CHART_NS)) throw new Error(`${partName}: missing DrawingML chart namespace`);
  const axisIds = definedAxisIds(xml);
  for (const [chartType, chartOrder] of Object.entries(CHART_CHILD_ORDER)) {
    const pattern = new RegExp(`<c:${chartType}[^>]*>([\\s\\S]*?)<\\/c:${chartType}>`, "g");
    for (const match of xml.matchAll(pattern)) {
      const inner = match[1];
      if (chartType === "lineChart" && !/<c:grouping\b/.test(inner)) throw new Error(`${partName}: lineChart is missing required grouping`);
      assertOrderedChildren(inner, chartOrder, `${partName}/${chartType}`);
      for (const child of directChildren(inner)) {
        if (child.name === "axId") {
          const id = getAttribute(child.xml, "val");
          if (id && !axisIds.has(id)) throw new Error(`${partName}/${chartType}: orphan axis id ${id}`);
        }
      }
      for (const series of inner.matchAll(/<c:ser[^>]*>([\s\S]*?)<\/c:ser>/g)) {
        const seriesInner = series[1];
        assertOrderedChildren(seriesInner, SERIES_CHILD_ORDER[chartType], `${partName}/${chartType}/ser`);
        for (const forbidden of FORBIDDEN_SERIES_CHILDREN[chartType] || []) {
          if (new RegExp(`<c:${forbidden}\\b`).test(seriesInner)) throw new Error(`${partName}/${chartType}/ser: forbidden c:${forbidden}`);
        }
      }
    }
  }
  for (const match of xml.matchAll(/<c:crossAx\b[^>]*\bval="([^"]+)"/g)) {
    if (!axisIds.has(match[1])) throw new Error(`${partName}: axis crosses missing axis id ${match[1]}`);
  }
}

export async function validatePptxPackage(input) {
  const zip = await JSZip.loadAsync(input, { checkCRC32: true });
  const files = new Set(Object.keys(zip.files).filter((name) => !zip.files[name].dir));
  for (const required of ["[Content_Types].xml", "_rels/.rels", "ppt/presentation.xml"]) {
    if (!files.has(required)) throw new Error(`PPTX package is missing required part: ${required}`);
  }
  const xmlParts = [...files].filter((name) => name.endsWith(".xml") || name.endsWith(".rels"));
  const xmlByPart = new Map();
  for (const partName of xmlParts) {
    const xml = await zip.file(partName).async("string");
    assertWellFormedXml(xml, partName);
    xmlByPart.set(partName, xml);
  }
  let relationshipCount = 0;
  for (const [relPart, xml] of xmlByPart) {
    if (!relPart.endsWith(".rels")) continue;
    const sourcePart = relationshipSourcePart(relPart);
    if (sourcePart === null) continue;
    for (const relationship of parseRelationships(xml)) {
      relationshipCount += 1;
      if (!relationship.target || relationship.targetMode === "External") continue;
      if (relationship.type === CHART_REL_TYPE && relationship.target.startsWith("/")) throw new Error(`${relPart}: chart relationship target must be relative: ${relationship.target}`);
      const targetPart = resolveRelationshipTarget(sourcePart, relationship.target);
      if (!files.has(targetPart)) throw new Error(`${relPart}: relationship ${relationship.id || "(unknown)"} targets missing part ${targetPart}`);
    }
  }
  const chartParts = [...files].filter((name) => /^ppt\/charts\/chart\d+\.xml$/.test(name));
  for (const chartPart of chartParts) validateChartXml(xmlByPart.get(chartPart), chartPart);
  return { partCount: files.size, xmlPartCount: xmlParts.length, relationshipCount, chartCount: chartParts.length };
}

export async function normalizeAndValidatePptx(input) {
  const zip = await JSZip.loadAsync(input, { checkCRC32: true });
  let normalizedChartCount = 0;
  let normalizedRelationshipCount = 0;
  for (const [partName, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (/^ppt\/charts\/chart\d+\.xml$/.test(partName)) {
      const original = await entry.async("string");
      const normalized = normalizeChartXml(original);
      if (normalized !== original) normalizedChartCount += 1;
      zip.file(partName, normalized);
    } else if (/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(partName)) {
      const original = await entry.async("string");
      const normalized = normalizeChartRelationshipTargets(original);
      if (normalized !== original) normalizedRelationshipCount += 1;
      zip.file(partName, normalized);
    }
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const validation = await validatePptxPackage(buffer);
  return { buffer, report: { ...validation, normalizedChartCount, normalizedRelationshipCount } };
}

