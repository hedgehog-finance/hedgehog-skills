/**
 * Config loader.
 *
 * Reads the "doc-convert" entry from ~/.hogagent/skills_config.json.
 * Fields: apiKey / endpoint / toolType.
 * Env fallback when not set in config file: DOC_CONVERT_API_KEY / DOC_CONVERT_ENDPOINT / DOC_CONVERT_TOOL_TYPE.
 *
 * LLM parsing path enabled when both apiKey and endpoint are present.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { log } from "./doc-utils.mjs";

const SKILL_NAME = "doc-convert";

/** Get HogAgent system dir (overridable via HOGAGENT_SYSTEM_DIR). */
function getSystemDir() {
  return process.env.HOGAGENT_SYSTEM_DIR || join(homedir(), ".hogagent");
}

/** Get skills_config.json path. */
function getSkillConfigPath() {
  return join(getSystemDir(), "skills_config.json");
}

/** Read this skill's config entry from skills_config.json. */
function readSkillEntry() {
  try {
    const raw = readFileSync(getSkillConfigPath(), "utf-8");
    const config = JSON.parse(raw);
    return config[SKILL_NAME] || {};
  } catch (err) {
    log("debug", `skills_config.json read failed, using env vars: ${err.message}`);
    return {};
  }
}

/**
 * Load full config. Priority: skills_config.json entry > env vars > defaults.
 * @returns {{ apiKey: string, endpoint: string, toolType: string }}
 */
export function loadConfig() {
  const entry = readSkillEntry();
  const apiKey = entry.apiKey || process.env.DOC_CONVERT_API_KEY || "";
  const endpoint = entry.endpoint || process.env.DOC_CONVERT_ENDPOINT || "";
  const toolType = entry.toolType || process.env.DOC_CONVERT_TOOL_TYPE || "prime-sync";
  return { apiKey, endpoint, toolType };
}

/** Check if LLM parsing path is configured (both apiKey and endpoint present). */
export function hasLlmConfig(config) {
  return Boolean(config.apiKey && config.endpoint);
}
