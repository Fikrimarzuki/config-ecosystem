// Shared test helpers: validate mutated copies of the assembled config in-process, and
// build small source fixtures for assemble().

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig } from "../scripts/validate.mjs";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The committed assembled config (run `pnpm build` first so it is current). */
export const production = JSON.parse(readFileSync(resolve(root, "config/production.json"), "utf8"));

/** Applies `mutate` to a copy of the production config and validates it. */
export function validateWith(mutate) {
  const config = structuredClone(production);
  mutate(config);
  const result = validateConfig(config);
  return { ok: result.ok, output: result.ok ? "" : `${result.heading}\n${result.errors.join("\n")}` };
}

export function assertValid(mutate) {
  const { ok, output } = validateWith(mutate);
  assert.ok(ok, `expected valid, got:\n${output}`);
}

export function assertInvalid(mutate, message) {
  const { ok, output } = validateWith(mutate);
  assert.ok(!ok, "expected validation to fail");
  assert.match(output, message);
}

/** Creates a temporary directory removed by the returned cleanup function. */
export function temporaryDirectory() {
  const dir = mkdtempSync(join(tmpdir(), "config-ecosystem-test-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/**
 * Writes a config/ source tree under `dir`: { "global.json": {...}, "projects/gateway.json": {...}, ... }.
 * Objects are written as JSON; strings are written as-is.
 */
export function writeSources(dir, files) {
  for (const [path, content] of Object.entries(files)) {
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, typeof content === "string" ? content : JSON.stringify(content, null, 2) + "\n");
  }
  return dir;
}
