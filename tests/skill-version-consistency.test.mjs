import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EXPECTED = {
  "hedgehog-daily-morning-briefing": "2.2.10",
  "hedgehog-in-depth-analysis": "2.2.4",
  "hedgehog-information-verification": "2.2.4",
  "company-valuation": "3.0.5",
  deliver_files: "2.1.3",
  "doc-convert": "2.1.2",
  "fin-calc": "1.0.4",
  "gen-chart": "2.4.2",
  "gen-ppt": "2.4.3",
  "hedgehog-company-index-data": "1.12.0",
  "hedgehog-macro-industry-data": "1.8.3",
  "hedgehog-news-reports": "1.9.3",
  "hog-gateway-tools": "3.5.3",
  "hog-kb-tools": "1.2.2",
  "hog-memory": "1.3.2",
  math_calc: "1.1.2",
  "table-convert": "1.1.2",
  "tech-indicators": "1.1.2",
  web_fetch: "1.1.3",
  "gen-rich-ppt": "1.1.2",
  "hog-finnhub": "1.1.2",
  "hog-openbb": "1.1.3",
};

function validateSkillDirectory(directory) {
  const packagePath = join(directory, "package.json");
  if (!existsSync(packagePath)) return false;
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  const expected = EXPECTED[packageJson.name];
  if (!expected) return false;
  assert.equal(packageJson.version, expected, packagePath);

  const skillPath = join(directory, "SKILL.md");
  const skillText = readFileSync(skillPath, "utf8");
  assert.match(skillText, new RegExp(`^version: ${expected.replaceAll(".", "\\.")}$`, "m"), skillPath);

  if (packageJson.name === "gen-ppt") {
    assert.ok(skillText.includes("GenPPT `v" + expected + "`"), `${skillPath}: artifact version`);
  }

  const lockPath = join(directory, "package-lock.json");
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    assert.equal(lock.version, expected, lockPath);
    assert.equal(lock.packages[""].version, expected, lockPath);
  }
  return true;
}

test("all changed same-name Skill copies share the selected patch version", () => {
  const roots = ["hogagent", "openclaw", "hermes", "optional"].map((name) => join(REPO_ROOT, name));
  const mainSkills = resolve(REPO_ROOT, "../hedgehog/hogagent/skills");
  if (existsSync(mainSkills)) roots.push(mainSkills);

  const seen = new Map();
  for (const root of roots) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = join(root, entry.name);
      const packagePath = join(directory, "package.json");
      if (!existsSync(packagePath)) continue;
      const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
      if (!validateSkillDirectory(directory)) continue;
      seen.set(packageJson.name, (seen.get(packageJson.name) || 0) + 1);
    }
  }
  for (const name of Object.keys(EXPECTED)) assert.ok(seen.has(name), `missing changed Skill: ${name}`);
});

test("platform manifests and embedded CLI versions match package versions", () => {
  for (const platform of ["hogagent", "openclaw", "hermes", "optional"]) {
    const manifestPath = join(REPO_ROOT, platform, "version.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const [name, version] of Object.entries(manifest)) {
      if (EXPECTED[name]) assert.equal(version, EXPECTED[name], `${manifestPath}: ${name}`);
    }
  }

  for (const platform of ["hogagent", "openclaw", "hermes"]) {
    const gateway = readFileSync(join(REPO_ROOT, platform, "hog-gateway-tools", "cli.mjs"), "utf8");
    const kb = readFileSync(join(REPO_ROOT, platform, "hog-kb-tools", "cli.mjs"), "utf8");
    assert.match(gateway, /const VERSION = "3\.5\.3"/);
    assert.match(kb, /hog-kb-tools v1\.2\.2/);
  }
  for (const platform of ["openclaw", "hermes"]) {
    const deliver = readFileSync(join(REPO_ROOT, platform, "deliver_files", "cli.mjs"), "utf8");
    const memory = readFileSync(join(REPO_ROOT, platform, "hog-memory", "cli.mjs"), "utf8");
    assert.match(deliver, /const VERSION = "2\.1\.3"/);
    assert.match(memory, /hog-memory v1\.3\.2/);
  }
});


function sharedGenPptFiles(directory, relative = "") {
  return readdirSync(join(directory, relative), { withFileTypes: true })
    .filter(entry => !["node_modules", "package-lock.json", "SKILL.md", ".DS_Store"].includes(entry.name))
    .flatMap(entry => {
      const file = join(relative, entry.name);
      return entry.isDirectory() ? sharedGenPptFiles(directory, file) : [file];
    })
    .sort();
}

test("gen-ppt shared files and published version tables stay synchronized", () => {
  const canonical = join(REPO_ROOT, "openclaw", "gen-ppt");
  const copies = [join(REPO_ROOT, "hermes", "gen-ppt")];
  const bundled = resolve(REPO_ROOT, "../hedgehog/hogagent/skills/gen-ppt");
  if (existsSync(bundled)) copies.push(bundled);
  const files = sharedGenPptFiles(canonical);
  for (const copy of copies) {
    assert.deepEqual(sharedGenPptFiles(copy), files, `${copy}: shared file list`);
    for (const file of files) {
      assert.deepEqual(readFileSync(join(copy, file)), readFileSync(join(canonical, file)), `${copy}: ${file}`);
    }
  }
  for (const readme of ["README.md", "openclaw/README.md", "hermes/README.md"]) {
    assert.ok(readFileSync(join(REPO_ROOT, readme), "utf8").includes("| `gen-ppt` | " + EXPECTED["gen-ppt"] + " |"), readme);
  }
});
