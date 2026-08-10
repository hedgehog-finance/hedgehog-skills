#!/usr/bin/env node
/**
 * HTML to PDF Converter (Puppeteer-based)
 *
 * Renders HTML in headless Chrome and exports to PDF.
 * Automatically waits for ECharts charts to finish rendering before capture.
 *
 * Usage: node html-to-pdf.mjs <input.html> <output.pdf> [--timeout=15000]
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer";

const args = process.argv.slice(2);
const inputPath = args[0];
const outputPath = args[1];

if (!inputPath || !outputPath) {
  console.error("Usage: node html-to-pdf.mjs <input.html> <output.pdf> [--timeout=15000]");
  process.exit(1);
}

const timeoutArg = args.find(a => a.startsWith("--timeout="));
const parsedTimeout = timeoutArg ? parseInt(timeoutArg.split("=")[1], 10) : NaN;
const ECHARTS_WAIT_MS = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 10000;

const absInputPath = resolve(inputPath);
const htmlContent = readFileSync(absInputPath, "utf-8");

const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
});

try {
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0", timeout: 30000 });

  // Wait for ECharts to finish rendering (if any charts exist on the page)
  const chartsFound = await page.evaluate(() => {
    const containers = document.querySelectorAll("[_echarts_instance_]");
    return containers.length;
  });

  if (chartsFound > 0) {
    console.log(`Detected ${chartsFound} ECharts container(s), waiting for render...`);
    let renderOk = false;
    await page.waitForFunction(
      () => {
        const containers = document.querySelectorAll("[_echarts_instance_]");
        if (containers.length === 0) return true;
        // All containers must have a rendered canvas with non-zero dimensions
        return Array.from(containers).every((el) => {
          const canvas = el.querySelector("canvas");
          return canvas && canvas.width > 0 && canvas.height > 0;
        });
      },
      { timeout: ECHARTS_WAIT_MS }
    ).then(() => { renderOk = true; })
     .catch(() => {
      console.warn(`ECharts render timeout after ${ECHARTS_WAIT_MS}ms, proceeding with current state`);
    });
    if (renderOk) console.log("ECharts render complete");
  }

  await page.pdf({
    path: resolve(outputPath),
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  });

  console.log(`PDF generated: ${outputPath}`);
} finally {
  await browser.close();
}
