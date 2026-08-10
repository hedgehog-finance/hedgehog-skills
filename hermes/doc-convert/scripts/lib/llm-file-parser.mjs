/**
 * Abstract LLM file parser.
 *
 * Implements the sync file-parsing protocol: POST multipart/form-data,
 * fields: file(binary) / tool_type / file_type.
 * Response: { status, message, content, task_id, parsing_result_url }.
 * Returns `content` as Markdown when status==="succeeded".
 *
 * Endpoint URL and credentials come from config; this module is vendor-agnostic —
 * switch providers by configuring a different endpoint.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { log } from "./doc-utils.mjs";

/**
 * Convert a document to Markdown via file-parsing service.
 * @param {string} filePath Absolute path to input file
 * @param {string} fileType File type enum (PDF / DOCX / HTML / MD, etc.)
 * @param {{ apiKey: string, endpoint: string, toolType?: string }} config
 * @returns {Promise<string>} Markdown text
 */
export async function parseFileWithLlm(filePath, fileType, config) {
  const { apiKey, endpoint, toolType = "prime-sync" } = config;
  if (!apiKey || !endpoint) {
    throw new Error("LLM parsing path not configured: both endpoint and apiKey required");
  }

  const fileBuffer = readFileSync(filePath);
  const fileName = basename(filePath);

  log("info", `Calling file parser: ${fileName} (file_type=${fileType}, ${fileBuffer.length} bytes)`);

  const body = buildMultipartBody({
    file: { buffer: fileBuffer, filename: fileName },
    tool_type: toolType,
    file_type: fileType,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": `multipart/form-data; boundary=${body.boundary}`,
    },
    body: body.buffer,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `File parser returned HTTP ${response.status}: ${errText.slice(0, 500)}`
    );
  }

  const result = await response.json().catch(() => null);
  if (!result) {
    throw new Error("File parser returned non-JSON response");
  }

  if (result.status === "failed") {
    throw new Error(`File parsing failed: ${result.message || "unknown error"}`);
  }

  const content = result.content;
  if (!content || typeof content !== "string") {
    throw new Error(
      `Parser returned no text content (status=${result.status}, message=${result.message || "none"})`
    );
  }

  log("info", `Parsing complete: ${content.length} chars`);
  return content;
}

/**
 * Build multipart/form-data request body.
 * @param {Record<string, string | { buffer: Buffer, filename: string }>} fields
 */
function buildMultipartBody(fields) {
  const boundary = `----doc-convert-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const parts = [];

  for (const [name, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
        )
      );
    } else {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${value.filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
        )
      );
      parts.push(value.buffer);
      parts.push(Buffer.from("\r\n"));
    }
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, buffer: Buffer.concat(parts) };
}
