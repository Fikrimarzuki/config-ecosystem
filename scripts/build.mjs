#!/usr/bin/env node
// Assembles modular project sources into the canonical ecosystem config.
//
// Sources:
//   config/global.json         — version, username, domains
//   config/projects/{id}.json  — one file per project; must contain "id" matching filename
//
// Outputs (both committed; dist/ is the new canonical location):
//   config/production.json     — full assembled config (consumer compat, same GitHub raw URL)
//   dist/ecosystem.json        — full assembled config (future canonical consumer target)
//
// Usage: node scripts/build.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectSchemaPath = resolve(root, "schema/project.schema.json");
const globalPath = resolve(root, "config/global.json");
const projectsDir = resolve(root, "config/projects");
const distDir = resolve(root, "dist");

// ─── helpers ─────────────────────────────────────────────────────────────────

function display(path) {
  return relative(process.cwd(), path).replaceAll("\\", "/") || path;
}

function fail(message, details = []) {
  console.error(`✗ ${message}`);
  for (const d of details) console.error(`  - ${d}`);
  process.exit(1);
}

function readJson(path, label) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    fail(`cannot read ${label ?? display(path)}`, [err.message]);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    fail(`${label ?? display(path)} is not valid JSON`, [err.message]);
  }
}

// ─── step 1: global config ───────────────────────────────────────────────────

const global_ = readJson(globalPath, "config/global.json");

const globalRequired = ["version", "username", "domains"];
const missing = globalRequired.filter((k) => !(k in global_));
if (missing.length) fail("config/global.json is missing required fields", missing.map((k) => `"${k}"`));
if ("projects" in global_) fail("config/global.json must not contain projects (edit config/projects/*.json instead)");

// ─── step 2: project schema ───────────────────────────────────────────────────

const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
const validateProject = ajv.compile(readJson(projectSchemaPath, "schema/project.schema.json"));

function formatProjectError(err) {
  const at = err.instancePath
    ? err.instancePath
        .slice(1)
        .split("/")
        .map((p, i) => (/^\d+$/.test(p) ? `[${p}]` : i ? `.${p}` : p))
        .join("")
    : "(root)";
  switch (err.keyword) {
    case "required":
      return `${at}: missing required property "${err.params.missingProperty}"`;
    case "dependentRequired":
      return `${at}: "${err.params.property}" requires "${err.params.missingProperty}"`;
    case "additionalProperties":
      return `${at}: unknown property "${err.params.additionalProperty}"`;
    case "enum":
      return `${at}: must be one of ${err.params.allowedValues.map((v) => JSON.stringify(v)).join(", ")} (got ${JSON.stringify(err.data)})`;
    case "const":
      return `${at}: must be ${JSON.stringify(err.params.allowedValue)} (got ${JSON.stringify(err.data)})`;
    case "minLength":
    case "minProperties":
    case "minItems":
      return err.params.limit === 1 ? `${at}: must not be empty` : `${at}: ${err.message}`;
    case "propertyNames":
      return null; // reported via the nested pattern error
    case "pattern":
    case "maxLength":
      if (err.propertyName !== undefined) {
        return `${at}: key "${err.propertyName}" ${err.parentSchema.description ?? err.message}`;
      }
      return `${at}: ${err.parentSchema.description ?? err.message} (got ${JSON.stringify(err.data)})`;
    default:
      return `${at}: ${err.message}`;
  }
}

// ─── step 3: read and validate project files ─────────────────────────────────

let filenames;
try {
  filenames = readdirSync(projectsDir)
    .filter((f) => f.endsWith(".json"))
    .sort(); // alphabetical = deterministic
} catch (err) {
  fail("cannot read config/projects/", [err.message]);
}

if (!filenames.length) fail("config/projects/ contains no project files");

const projects = {};
const seenIds = new Map(); // id → filename

for (const filename of filenames) {
  const filePath = resolve(projectsDir, filename);
  const project = readJson(filePath, `config/projects/${filename}`);

  // 3a. id field must be present and match the filename
  const expectedId = filename.slice(0, -5); // strip .json
  if (!("id" in project)) {
    fail(`config/projects/${filename}: missing required "id" field`);
  }
  if (project.id !== expectedId) {
    fail(`config/projects/${filename}: id "${project.id}" does not match filename (expected "${expectedId}")`);
  }

  // 3b. duplicate id check
  if (seenIds.has(project.id)) {
    fail(`Duplicate project id "${project.id}"`, [
      `config/projects/${seenIds.get(project.id)}`,
      `config/projects/${filename}`,
    ]);
  }
  seenIds.set(project.id, filename);

  // 3c. schema validation
  const { id, ...projectData } = project;
  if (!validateProject(project)) {
    const errors = [...new Set(validateProject.errors.map(formatProjectError).filter(Boolean))];
    fail(`config/projects/${filename} does not match schema/project.schema.json`, errors);
  }

  projects[id] = projectData;
}

// ─── step 4: assemble ─────────────────────────────────────────────────────────

const assembled = { ...global_, projects };

// ─── step 5: full validation via validate.mjs ─────────────────────────────────

// Write to a temp location first, then validate before overwriting the outputs.
const tmpPath = resolve(root, "dist/.ecosystem.tmp.json");
mkdirSync(distDir, { recursive: true });
writeFileSync(tmpPath, JSON.stringify(assembled, null, 2) + "\n");

const result = spawnSync(process.execPath, [resolve(root, "scripts/validate.mjs"), tmpPath], {
  encoding: "utf8",
  cwd: root,
});
// Clean up temp file regardless.
try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch {}

if (result.status !== 0) {
  // Re-display validate.mjs errors and exit.
  process.stderr.write(result.stderr || result.stdout || "validate.mjs failed\n");
  process.exit(result.status ?? 1);
}

// ─── step 6: write outputs ────────────────────────────────────────────────────

const outputJson = JSON.stringify(assembled, null, 2) + "\n";

mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(root, "dist/ecosystem.json"), outputJson);
writeFileSync(resolve(root, "config/production.json"), outputJson);

console.log(`✓ Built ecosystem config with ${Object.keys(projects).length} projects`);
console.log(`  → dist/ecosystem.json`);
console.log(`  → config/production.json  (consumer compat)`);
