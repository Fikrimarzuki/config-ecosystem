#!/usr/bin/env node
// Assembles modular sources into the canonical ecosystem config.
//
// Sources:
//   config/global.json                        — version, username, domains, profile, ecosystem
//   config/career-publication.json            — independent field-level Gateway permissions
//   config/projects/{id}.json                 — one file per project; must contain "id" matching filename
//   config/career/{collection}/{id}.json      — one file per career record (experience, freelance,
//                                               assessments); must contain "id" matching filename
//   config/origins/{id}.json                  — one file per origins archive entry; must contain "id"
//                                               matching filename
//   config/concepts/{id}.json                 — one file per concept; must contain "id" matching filename
//
// Outputs (both committed; dist/ is the new canonical location):
//   config/production.json     — full assembled config (consumer compat, same GitHub raw URL)
//   dist/ecosystem.json        — full assembled config (future canonical consumer target)
//
// Usage: node scripts/build.mjs
// The assembly step is also exported as assemble() so tests can run it on fixture sources.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { CAREER_COLLECTIONS } from "./career.mjs";
import { originsOrder } from "./origins.mjs";
import { conceptsOrder } from "./concepts.mjs";
import { checkCareerPublication, emptyCareerPublication } from "./career-publication.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectSchemaPath = resolve(root, "schema/project.schema.json");
const careerSchemaPath = resolve(root, "schema/career.schema.json");
const careerPublicationSchemaPath = resolve(root, "schema/career-publication.schema.json");
const originsSchemaPath = resolve(root, "schema/origins.schema.json");
const conceptsSchemaPath = resolve(root, "schema/concepts.schema.json");
const distDir = resolve(root, "dist");

/** The source folders allowed directly under config/. */
const SOURCE_FOLDERS = ["projects", "career", "origins", "concepts"];

// ─── helpers ─────────────────────────────────────────────────────────────────

function display(path) {
  return relative(process.cwd(), path).replaceAll("\\", "/") || path;
}

/** A source problem. The CLI prints it as "✗ message" followed by "  - detail" lines. */
export class BuildError extends Error {
  constructor(message, details = []) {
    super(message);
    this.details = details;
  }
}

function fail(message, details = []) {
  throw new BuildError(message, details);
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

// ─── schemas ──────────────────────────────────────────────────────────────────

let validators;
function getValidators() {
  if (validators) return validators;
  const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
  const projectSchema = readJson(projectSchemaPath, "schema/project.schema.json");
  const careerSchema = readJson(careerSchemaPath, "schema/career.schema.json");
  const originsSchema = readJson(originsSchemaPath, "schema/origins.schema.json");
  ajv.addSchema(projectSchema);
  ajv.addSchema(careerSchema);
  const careerPublicationSchema = readJson(careerPublicationSchemaPath, "schema/career-publication.schema.json");
  ajv.addSchema(careerPublicationSchema);
  const conceptsSchema = readJson(conceptsSchemaPath, "schema/concepts.schema.json");
  ajv.addSchema(originsSchema);
  ajv.addSchema(conceptsSchema);
  validators = {
    careerPublication: { validate: ajv.getSchema(careerPublicationSchema.$id), schema: "schema/career-publication.schema.json" },
    project: { validate: ajv.getSchema(projectSchema.$id), schema: "schema/project.schema.json" },
    concepts: { validate: ajv.getSchema(`${conceptsSchema.$id}#/$defs/concept`), schema: "schema/concepts.schema.json#/$defs/concept" },
    origins: { validate: ajv.getSchema(`${originsSchema.$id}#/$defs/entry`), schema: "schema/origins.schema.json#/$defs/entry" },
    ...Object.fromEntries(CAREER_COLLECTIONS.map(({ name, definition }) => [name, {
      validate: ajv.getSchema(`${careerSchema.$id}#/$defs/${definition}`),
      schema: `schema/career.schema.json#/$defs/${definition}`,
    }])),
  };
  return validators;
}

function formatProjectError(err) {
  const at = err.instancePath
    ? err.instancePath
        .slice(1)
        .split("/")
        .map((p, i) => (/^\d+$/.test(p) ? `[${p}]` : i ? `.${p}` : p))
        .join("")
    : "(root)";
  // The branches of a oneOf only add noise; the oneOf error itself carries the message.
  if (err.schemaPath.includes("/oneOf/")) return null;
  switch (err.keyword) {
    case "oneOf":
      return `${at}: must have exactly one of "subdomain" or "url"`;
    case "required":
      return `${at}: missing required property "${err.params.missingProperty}"`;
    case "dependentRequired":
      return `${at}: "${err.params.property}" requires "${err.params.missingProperty}"`;
    case "additionalProperties":
      return `${at}: unknown property "${err.params.additionalProperty}"`;
    case "unevaluatedProperties":
      return `${at}: unknown property "${err.params.unevaluatedProperty}"`;
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

// ─── source loading ───────────────────────────────────────────────────────────

/**
 * Reads every <id>.json in a folder (alphabetically), checks that its id matches the
 * filename and validates it. Returns the records with their ids.
 */
function loadRecords(dir, label, { validate, schema }) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    fail(`cannot read ${label}/`, [err.message]);
  }

  // Only <id>.json records belong here. Hidden files (such as .gitkeep) are allowed; anything
  // else would otherwise be skipped silently, so a typo can't make records disappear.
  const unsupported = entries
    .filter((entry) => !entry.name.startsWith(".") && (!entry.isFile() || !entry.name.endsWith(".json")))
    .map((entry) => `${label}/${entry.name}${entry.isDirectory() ? "/ (folders are not allowed here)" : " (only lowercase .json files are allowed)"}`)
    .sort();
  if (unsupported.length) fail(`${label}/ contains unsupported entries`, unsupported);

  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort(); // alphabetical = deterministic

  const records = [];
  for (const filename of filenames) {
    const source = `${label}/${filename}`;
    const record = readJson(resolve(dir, filename), source);

    // id field must be present and match the filename
    const expectedId = filename.slice(0, -5); // strip .json
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      fail(`${source}: must contain a JSON object`);
    }
    if (!("id" in record)) {
      fail(`${source}: missing required "id" field`);
    }
    if (record.id !== expectedId) {
      fail(`${source}: id "${record.id}" does not match filename (expected "${expectedId}")`);
    }

    if (!validate(record)) {
      const errors = [...new Set(validate.errors.map(formatProjectError).filter(Boolean))];
      fail(`${source} does not match ${schema}`, errors);
    }

    records.push({ record, source });
  }
  return records;
}

/**
 * Assembles global.json, projects, career collections and the origins archive from a config directory
 * (default: this repository's config/). Throws BuildError on any source problem.
 * Cross-record semantics are checked afterwards by validate.mjs.
 */
export function assemble({ configDir = resolve(root, "config") } = {}) {
  const schemas = getValidators();

  // step 0: only known source folders may exist under config/, so a mistyped folder
  // (config/concept/) fails instead of being skipped. Files such as a README are left alone.
  const unknownFolders = readdirSync(configDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !SOURCE_FOLDERS.includes(entry.name))
    .map((entry) => `config/${entry.name}/`)
    .sort();
  if (unknownFolders.length) {
    fail(`config/ may only contain the ${SOURCE_FOLDERS.join(", ")} folders`, unknownFolders);
  }

  // step 1: global config
  const global_ = readJson(resolve(configDir, "global.json"), "config/global.json");
  const globalRequired = ["version", "username", "domains"];
  const missing = globalRequired.filter((k) => !(k in global_));
  if (missing.length) fail("config/global.json is missing required fields", missing.map((k) => `"${k}"`));
  if ("projects" in global_) fail("config/global.json must not contain projects (edit config/projects/*.json instead)");
  if ("career" in global_) fail("config/global.json must not contain career (edit config/career/<collection>/*.json instead)");
  if ("careerPublication" in global_) fail("config/global.json must not contain careerPublication (edit config/career-publication.json instead)");
  if ("concepts" in global_) fail("config/global.json must not contain concepts (edit config/concepts/*.json instead)");
  if ("origins" in global_) fail("config/global.json must not contain origins (edit config/origins/*.json instead)");

  // step 2: projects (keyed by id; the id is not part of the output)
  const projectRecords = loadRecords(resolve(configDir, "projects"), "config/projects", schemas.project);
  if (!projectRecords.length) fail("config/projects/ contains no project files");

  const owners = new Map(); // id → source file, across projects, every career collection, origins and concepts
  function claim(id, source) {
    if (owners.has(id)) fail(`Duplicate id "${id}"`, [owners.get(id), source]);
    owners.set(id, source);
  }

  const projects = {};
  for (const { record, source } of projectRecords) {
    claim(record.id, source);
    const { id, ...projectData } = record;
    projects[id] = projectData;
  }

  // step 3: career collections (arrays; records keep their id). A missing folder is an empty collection.
  const careerDir = resolve(configDir, "career");
  if (existsSync(careerDir)) {
    const known = new Set(CAREER_COLLECTIONS.map(({ name }) => name));
    const unexpected = readdirSync(careerDir).filter((entry) => !entry.startsWith(".") && !known.has(entry));
    if (unexpected.length) {
      fail("config/career/ may only contain the experience, freelance and assessments folders", unexpected.map((e) => `config/career/${e}`));
    }
  }

  const career = {};
  for (const { name, order } of CAREER_COLLECTIONS) {
    const dir = resolve(careerDir, name);
    const label = `config/career/${name}`;
    if (existsSync(dir) && !statSync(dir).isDirectory()) fail(`${label} must be a folder`);
    const records = existsSync(dir) ? loadRecords(dir, label, schemas[name]) : [];
    for (const { record, source } of records) claim(record.id, source);
    // Presentation order comes from the data, never from filenames.
    career[name] = records.map(({ record }) => record).sort(order);
  }

  // step 4: origins archive (an array; entries keep their id). A missing folder is an empty archive.
  const originsDir = resolve(configDir, "origins");
  if (existsSync(originsDir) && !statSync(originsDir).isDirectory()) fail("config/origins must be a folder");
  const originsRecords = existsSync(originsDir) ? loadRecords(originsDir, "config/origins", schemas.origins) : [];
  for (const { record, source } of originsRecords) claim(record.id, source);
  const origins = originsRecords.map(({ record }) => record).sort(originsOrder);

  // step 5: concepts (an array; concepts keep their id). A missing folder is an empty collection.
  const conceptsDir = resolve(configDir, "concepts");
  if (existsSync(conceptsDir) && !statSync(conceptsDir).isDirectory()) fail("config/concepts must be a folder");
  const conceptRecords = existsSync(conceptsDir) ? loadRecords(conceptsDir, "config/concepts", schemas.concepts) : [];
  for (const { record, source } of conceptRecords) claim(record.id, source);
  const concepts = conceptRecords.map(({ record }) => record).sort(conceptsOrder);

  const publicationPath = resolve(configDir, "career-publication.json");
  const careerPublication = existsSync(publicationPath) ? readJson(publicationPath, "config/career-publication.json") : emptyCareerPublication();
  if (!schemas.careerPublication.validate(careerPublication)) {
    fail("config/career-publication.json does not match schema/career-publication.schema.json",
      [...new Set(schemas.careerPublication.validate.errors.map(formatProjectError).filter(Boolean))]);
  }
  const assembled = { ...global_, projects, career, origins, concepts, careerPublication };
  const publicationErrors = [];
  checkCareerPublication(assembled, publicationErrors);
  if (publicationErrors.length) fail("Invalid Career publication approvals", publicationErrors);
  // Stable selector order, independent of grant insertion order. No array index is an identity.
  for (const grants of Object.values(careerPublication)) {
    grants.sort((a, b) => {
      const left = JSON.stringify([a.employerId ?? a.engagementId ?? "", a.id]);
      const right = JSON.stringify([b.employerId ?? b.engagementId ?? "", b.id]);
      return left < right ? -1 : left > right ? 1 : 0;
    });
    for (const grant of grants) {
      grant.fields.sort(); grant.technologies?.sort(); grant.relatedProjects?.sort();
    }
  }
  return assembled;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function main() {
  let assembled;
  try {
    assembled = assemble();
  } catch (err) {
    if (!(err instanceof BuildError)) throw err;
    console.error(`✗ ${err.message}`);
    for (const d of err.details) console.error(`  - ${d}`);
    process.exit(1);
  }

  // Full validation via validate.mjs: write to a temp location first, then validate
  // before overwriting the outputs.
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

  // Write outputs
  const outputJson = JSON.stringify(assembled, null, 2) + "\n";

  mkdirSync(distDir, { recursive: true });
  writeFileSync(resolve(root, "dist/ecosystem.json"), outputJson);
  writeFileSync(resolve(root, "config/production.json"), outputJson);

  const careerCounts = CAREER_COLLECTIONS.map(({ name }) => `${assembled.career[name].length} ${name}`).join(", ");
  console.log(`✓ Built ecosystem config with ${Object.keys(assembled.projects).length} projects; career: ${careerCounts}; origins: ${assembled.origins.length}; concepts: ${assembled.concepts.length}`);
  console.log(`  → dist/ecosystem.json`);
  console.log(`  → config/production.json  (consumer compat)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
