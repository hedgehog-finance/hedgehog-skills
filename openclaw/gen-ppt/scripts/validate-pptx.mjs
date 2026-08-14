#!/usr/bin/env node
/** Validate a generated PPTX and optionally open/render it in desktop viewers. */

import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { validatePptxPackage } from "./pptx-ooxml.mjs";

const args = process.argv.slice(2);
const fileArg = args.find((arg) => !arg.startsWith("--"));
const viewers = new Set(args.filter((arg) => arg.startsWith("--")).map((arg) => arg.slice(2)));

if (!fileArg || viewers.has("help")) {
  console.error("Usage: validate-pptx.mjs <file.pptx> [--libreoffice] [--keynote] [--powerpoint]");
  process.exit(fileArg ? 0 : 1);
}

const inputPath = resolve(fileArg);
if (!existsSync(inputPath)) {
  console.error(`PPTX not found: ${inputPath}`);
  process.exit(1);
}

try {
  const report = await validatePptxPackage(readFileSync(inputPath));
  console.log(`OOXML validation passed: ${report.partCount} parts, ${report.relationshipCount} relationships, ${report.chartCount} native charts`);

  if (viewers.has("libreoffice")) validateWithLibreOffice(inputPath);
  if (viewers.has("keynote")) validateWithKeynote(inputPath);
  if (viewers.has("powerpoint")) validateWithPowerPoint(inputPath);
} catch (error) {
  console.error(`PPTX validation failed: ${error.message}`);
  process.exit(1);
}

function requireNonEmptyFile(filePath, label) {
  if (!existsSync(filePath) || statSync(filePath).size === 0) {
    throw new Error(`${label} did not produce a non-empty render`);
  }
}

function validateWithLibreOffice(filePath) {
  const workDir = mkdtempSync(join(tmpdir(), "gen-ppt-libreoffice-"));
  try {
    const result = spawnSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", workDir, filePath], { encoding: "utf8" });
    if (result.error) throw new Error(`LibreOffice is unavailable: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`LibreOffice rejected the PPTX: ${(result.stderr || result.stdout).trim()}`);
    const pdfPath = join(workDir, basename(filePath).replace(/\.pptx$/i, ".pdf"));
    requireNonEmptyFile(pdfPath, "LibreOffice");
    console.log("LibreOffice open/render test passed");
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function validateWithKeynote(filePath) {
  if (process.platform !== "darwin" || !existsSync("/Applications/Keynote.app")) {
    throw new Error("Keynote open/render test requested, but Keynote is not installed on macOS");
  }
  const workDir = mkdtempSync(join(tmpdir(), "gen-ppt-keynote-"));
  const pdfPath = join(workDir, "keynote-render.pdf");
  const script = `
on run argv
  set inputAlias to POSIX file (item 1 of argv)
  set outputFile to POSIX file (item 2 of argv)
  tell application "Keynote"
    activate
    set previousDocumentCount to count of documents
    open inputAlias
  end tell
  repeat with attempt from 1 to 120
    delay 0.5
    tell application "Keynote"
      if (count of documents) > previousDocumentCount then exit repeat
    end tell
  end repeat
  tell application "Keynote"
    if (count of documents) is not greater than previousDocumentCount then error "Keynote did not open the PPTX"
    set openedDocument to front document
    with timeout of 180 seconds
      export openedDocument to outputFile as PDF
    end timeout
    close openedDocument saving no
  end tell
end run`;
  try {
    const result = spawnSync("osascript", ["-e", script, filePath, pdfPath], { encoding: "utf8", timeout: 200_000 });
    if (result.error) throw new Error(`Keynote automation failed: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`Keynote rejected the PPTX: ${(result.stderr || result.stdout).trim()}`);
    requireNonEmptyFile(pdfPath, "Keynote");
    console.log("Keynote open/render test passed");
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function validateWithPowerPoint(filePath) {
  if (process.platform !== "darwin" || !existsSync("/Applications/Microsoft PowerPoint.app")) {
    throw new Error("PowerPoint open/render test requested, but Microsoft PowerPoint is not installed on macOS");
  }
  const workDir = mkdtempSync(join(tmpdir(), "gen-ppt-powerpoint-"));
  const pdfPath = join(workDir, "powerpoint-render.pdf");
  const script = `
on run argv
  set inputPath to item 1 of argv
  set outputPath to item 2 of argv
  tell application "Microsoft PowerPoint"
    with timeout of 180 seconds
      open POSIX file inputPath
      set openedPresentation to active presentation
      save openedPresentation in POSIX file outputPath as save as PDF
      close openedPresentation saving no
    end timeout
  end tell
end run`;
  try {
    const result = spawnSync("osascript", ["-e", script, filePath, pdfPath], { encoding: "utf8", timeout: 200_000 });
    if (result.error) throw new Error(`PowerPoint automation failed: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`PowerPoint rejected the PPTX: ${(result.stderr || result.stdout).trim()}`);
    requireNonEmptyFile(pdfPath, "PowerPoint");
    console.log("PowerPoint open/render test passed");
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
