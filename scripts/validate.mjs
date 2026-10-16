#!/usr/bin/env node
// Validates an ecosystem config file in two passes:
//   1. structure, against schema/ecosystem.schema.json;
//   2. semantics that depend on the config as a whole (unique hostnames,
//      unique deployment names, meaningful strings, project relationships,
//      career, origins and concepts ids, dates, ordering and references).
//
// Usage: node scripts/validate.mjs [config-path]   (default: config/production.json)
// The checks are also exported as validateConfig() for tests.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { CAREER_COLLECTIONS, ORDER_DESCRIPTION } from "./career.mjs";
import { originsOrder, ORIGINS_ORDER_DESCRIPTION } from "./origins.mjs";
import { conceptsOrder, CONCEPTS_ORDER_DESCRIPTION } from "./concepts.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "schema/ecosystem.schema.json");
const projectSchemaPath = resolve(root, "schema/project.schema.json");
const careerSchemaPath = resolve(root, "schema/career.schema.json");
const originsSchemaPath = resolve(root, "schema/origins.schema.json");
const conceptsSchemaPath = resolve(root, "schema/concepts.schema.json");

/** Thrown when a file can't be read or parsed. */
class ReadError extends Error {
  constructor(heading, errors) {
    super(heading);
    this.errors = errors;
  }
}

function readJson(path, label) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new ReadError(`cannot read ${label}`, [error.message]);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ReadError(`${label} is not valid JSON`, [error.message]);
  }
}

// JSON pointer (/projects/cv/deployments/main) → readable path (projects.cv.deployments.main).
function toPath(pointer) {
  if (!pointer) return "(root)";
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .map((part, index) => (/^\d+$/.test(part) ? `[${part}]` : index ? `.${part}` : part))
    .join("");
}

function formatSchemaError(error) {
  const at = toPath(error.instancePath);
  // The branches of a oneOf only add noise; the oneOf error itself carries the message.
  if (error.schemaPath.includes("/oneOf/")) return null;
  switch (error.keyword) {
    case "oneOf":
      return `${at}: must have exactly one of "subdomain" or "url"`;
    case "required":
      return `${at}: missing required property "${error.params.missingProperty}"`;
    case "dependentRequired":
      return `${at}: "${error.params.property}" requires "${error.params.missingProperty}"`;
    case "additionalProperties":
      return `${at}: unknown property "${error.params.additionalProperty}"`;
    case "unevaluatedProperties":
      return `${at}: unknown property "${error.params.unevaluatedProperty}"`;
    case "enum":
      return `${at}: must be one of ${error.params.allowedValues.map((v) => JSON.stringify(v)).join(", ")} (got ${JSON.stringify(error.data)})`;
    case "const":
      return `${at}: must be ${JSON.stringify(error.params.allowedValue)} (got ${JSON.stringify(error.data)})`;
    case "minLength":
    case "minProperties":
    case "minItems":
      return error.params.limit === 1 ? `${at}: must not be empty` : `${at}: ${error.message}`;
    case "propertyNames":
      return null; // reported via the nested pattern error below
    case "pattern":
    case "maxLength":
      if (error.propertyName !== undefined) {
        return `${at}: key "${error.propertyName}" ${error.parentSchema.description ?? error.message}`;
      }
      return `${at}: ${error.parentSchema.description ?? error.message} (got ${JSON.stringify(error.data)})`;
    default:
      return `${at}: ${error.message}`;
  }
}

let compiledSchema;
function validateSchema(config) {
  if (!compiledSchema) {
    const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
    // The ecosystem schema references the shared project and career definitions by
    // relative URI; registering the schemas locally means nothing is ever fetched.
    ajv.addSchema(readJson(projectSchemaPath, "project schema"));
    ajv.addSchema(readJson(careerSchemaPath, "career schema"));
    ajv.addSchema(readJson(originsSchemaPath, "origins schema"));
    ajv.addSchema(readJson(conceptsSchemaPath, "concepts schema"));
    compiledSchema = ajv.compile(readJson(schemaPath, "schema"));
  }
  const validate = compiledSchema;
  if (validate(config)) return [];
  return [...new Set(validate.errors.map(formatSchemaError).filter(Boolean))];
}

// Every string value must carry meaning; whitespace-only values are rejected.
function checkMeaningfulStrings(value, pointer, errors) {
  if (typeof value === "string") {
    if (value.trim() === "") errors.push(`${toPath(pointer)}: must not be empty or whitespace-only`);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => checkMeaningfulStrings(item, `${pointer}/${index}`, errors));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      checkMeaningfulStrings(item, `${pointer}/${key}`, errors);
    }
  }
}

// True only if every path segment exists with exactly this case, so a reference that
// resolves on a case-insensitive filesystem (Windows, macOS) can't break on Linux CI.
function fileExistsExactCase(relativePath) {
  let current = root;
  const segments = relativePath.split("/");
  for (const [index, segment] of segments.entries()) {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return false;
    }
    const entry = entries.find((e) => e.name === segment);
    const last = index === segments.length - 1;
    if (!entry || (last ? !entry.isFile() : !entry.isDirectory())) return false;
    current = resolve(current, segment);
  }
  return true;
}

// Asset paths are shaped by the schema (assets/..., no URLs, backslashes or traversal,
// right extension). Here we check what needs context: the owner's folder and the file itself.
function checkAssets(config, errors) {
  function check(value, location, folder) {
    if (typeof value !== "string") return;
    if (!value.startsWith(folder)) {
      errors.push(`${location}: must be under ${folder} (got "${value}")`);
    } else if (!fileExistsExactCase(value)) {
      errors.push(`${location}: file not found: ${value}`);
    }
  }

  for (const [name, value] of Object.entries(config.profile?.assets ?? {})) {
    check(value, `profile.assets.${name}`, "assets/profile/");
  }
  for (const [name, value] of Object.entries(config.ecosystem?.assets ?? {})) {
    check(value, `ecosystem.assets.${name}`, "assets/ecosystem/");
  }
  for (const [projectKey, project] of Object.entries(config.projects)) {
    const folder = `assets/projects/${projectKey}/`;
    const { media, ...single } = project.assets ?? {};
    for (const [name, value] of Object.entries(single)) {
      check(value, `projects.${projectKey}.assets.${name}`, folder);
    }
    (media ?? []).forEach((item, index) => {
      check(item.src, `projects.${projectKey}.assets.media[${index}].src`, folder);
    });
  }
  // Career records own assets/career/<collection>/<id>/; experience work items use the
  // same folder (subfolders allowed).
  for (const { name } of CAREER_COLLECTIONS) {
    config.career[name].forEach((record, index) => {
      const folder = `assets/career/${name}/${record.id}/`;
      checkAssetSet(record.assets, `career.${name}[${index}].assets`, folder);
      (record.work ?? []).forEach((item, itemIndex) => {
        checkAssetSet(item.assets, `career.${name}[${index}].work[${itemIndex}].assets`, folder);
      });
    });
  }
  // Origins entries own assets/origins/<id>/.
  config.origins.forEach((entry, index) => {
    checkAssetSet(entry.assets, `origins[${index}].assets`, `assets/origins/${entry.id}/`);
  });

  function checkAssetSet(assets, location, folder) {
    const { media, ...single } = assets ?? {};
    for (const [name, value] of Object.entries(single)) check(value, `${location}.${name}`, folder);
    (media ?? []).forEach((item, index) => check(item.src, `${location}.media[${index}].src`, folder));
  }
}

// Technology names are free-form, so "React" and "react" count as the same entry.
function checkTechnologies(list, location, errors) {
  const technologies = new Map(); // lowercased name → index of first occurrence
  (list ?? []).forEach((name, index) => {
    const key = name.trim().toLowerCase();
    if (technologies.has(key)) {
      errors.push(`duplicate technology "${name}": ${location}.technologies[${technologies.get(key)}] and ${location}.technologies[${index}]`);
    } else {
      technologies.set(key, index);
    }
  });
}

// After schema validation, a string date is a valid YYYY-MM (null means ongoing).
const isYearMonth = (value) => typeof value === "string";

/**
 * Concepts semantics: ids unique within the collection and against projects, career records
 * and origins entries, unique order values, and canonical ordering.
 */
function checkConcepts(config, errors) {
  const taken = new Map(); // id → where it is already used
  for (const key of Object.keys(config.projects)) taken.set(key, "a project id");
  for (const { name } of CAREER_COLLECTIONS) {
    config.career[name].forEach((record, index) => taken.set(record.id, `career.${name}[${index}]`));
  }
  config.origins.forEach((entry, index) => taken.set(entry.id, `origins[${index}]`));

  const ids = new Map(); // concepts id → location
  const orders = new Map(); // order → location

  config.concepts.forEach((concept, index) => {
    const at = `concepts[${index}]`;

    if (taken.has(concept.id)) errors.push(`${at}: id "${concept.id}" is already ${taken.get(concept.id)}`);
    if (ids.has(concept.id)) {
      errors.push(`duplicate concepts id "${concept.id}": ${ids.get(concept.id)} and ${at}`);
    } else {
      ids.set(concept.id, at);
    }

    if (orders.has(concept.order)) {
      errors.push(`duplicate concepts order ${concept.order}: ${orders.get(concept.order)} and ${at}`);
    } else {
      orders.set(concept.order, at);
    }

    if (index > 0 && conceptsOrder(config.concepts[index - 1], concept) > 0) {
      errors.push(`${at}: concepts must be sorted by ${CONCEPTS_ORDER_DESCRIPTION} ("${config.concepts[index - 1].id}" comes before "${concept.id}")`);
    }
  });
}

/**
 * Origins semantics: ids unique within the archive and against projects and career records,
 * canonical ordering, unique order values, repositories unique and not already used by a
 * project or an assessment, relatedProjects, technologies, and hidden entries without assets.
 */
function checkOrigins(config, errors) {
  const projectIds = new Set(Object.keys(config.projects));
  const careerIds = new Map(); // career id → location
  for (const { name } of CAREER_COLLECTIONS) {
    config.career[name].forEach((record, index) => careerIds.set(record.id, `career.${name}[${index}]`));
  }

  const usedRepositories = new Map(); // repository (lowercase) → owner outside origins
  for (const [key, project] of Object.entries(config.projects)) {
    if (project.repository !== undefined) usedRepositories.set(project.repository.toLowerCase(), `projects.${key}`);
  }
  config.career.assessments.forEach((record, index) => {
    if (record.repository !== undefined) usedRepositories.set(record.repository.toLowerCase(), `career.assessments[${index}]`);
  });

  const ids = new Map(); // origins id → location
  const orders = new Map(); // order → location
  const repositories = new Map(); // repository (lowercase) → location within origins

  config.origins.forEach((entry, index) => {
    const at = `origins[${index}]`;

    if (projectIds.has(entry.id)) errors.push(`${at}: id "${entry.id}" is already a project id`);
    if (careerIds.has(entry.id)) errors.push(`${at}: id "${entry.id}" is already used by ${careerIds.get(entry.id)}`);
    if (ids.has(entry.id)) {
      errors.push(`duplicate origins id "${entry.id}": ${ids.get(entry.id)} and ${at}`);
    } else {
      ids.set(entry.id, at);
    }

    if (orders.has(entry.order)) {
      errors.push(`duplicate origins order ${entry.order}: ${orders.get(entry.order)} and ${at}`);
    } else {
      orders.set(entry.order, at);
    }

    if (index > 0 && originsOrder(config.origins[index - 1], entry) > 0) {
      errors.push(`${at}: origins must be sorted by ${ORIGINS_ORDER_DESCRIPTION} ("${config.origins[index - 1].id}" comes before "${entry.id}")`);
    }

    (entry.repositories ?? []).forEach((repository, repositoryIndex) => {
      const location = `${at}.repositories[${repositoryIndex}]`;
      const key = repository.name.toLowerCase();
      if (usedRepositories.has(key)) {
        errors.push(`${location}: "${repository.name}" is already the repository of ${usedRepositories.get(key)}`);
      }
      if (repositories.has(key)) {
        errors.push(`duplicate origins repository "${repository.name}": ${repositories.get(key)} and ${location}`);
      } else {
        repositories.set(key, location);
      }
    });

    (entry.relatedProjects ?? []).forEach((projectId, relatedIndex) => {
      if (!projectIds.has(projectId)) errors.push(`${at}.relatedProjects[${relatedIndex}]: unknown project "${projectId}"`);
    });

    checkTechnologies(entry.technologies, at, errors);

    if (entry.listing === "hidden" && entry.assets !== undefined) {
      errors.push(`${at}: hidden origins entries must not reference assets (every committed asset is public)`);
    }
  });
}

/**
 * Career semantics: ids unique across collections and projects, canonical ordering,
 * unique freelance order, date ranges, local ids, relatedProjects, repositories and
 * hidden records without assets.
 */
function checkCareer(config, errors) {
  const projectIds = new Set(Object.keys(config.projects));
  const projectRepositories = new Map(
    Object.entries(config.projects)
      .filter(([, project]) => project.repository !== undefined)
      .map(([key, project]) => [project.repository.toLowerCase(), key]),
  );
  const ids = new Map(); // career id → location
  const assessmentRepositories = new Map(); // repository (lowercase) → location

  function checkRelatedProjects(list, location) {
    (list ?? []).forEach((projectId, index) => {
      if (!projectIds.has(projectId)) errors.push(`${location}.relatedProjects[${index}]: unknown project "${projectId}"`);
    });
  }

  /** end before start, for a record or nested item whose dates are both known. */
  function checkRange(item, location) {
    if (isYearMonth(item.start) && isYearMonth(item.end) && item.end < item.start) {
      errors.push(`${location}: end "${item.end}" is before start "${item.start}"`);
    }
  }

  /** A nested item's known dates must fall within its parent's known dates. */
  function checkWithin(item, parent, location) {
    const parentEnded = isYearMonth(parent.end);
    for (const field of ["start", "end"]) {
      const value = item[field];
      if (!isYearMonth(value)) continue;
      if (isYearMonth(parent.start) && value < parent.start) {
        errors.push(`${location}.${field}: "${value}" is before the parent's start "${parent.start}"`);
      }
      if (parentEnded && value > parent.end) {
        errors.push(`${location}.${field}: "${value}" is after the parent's end "${parent.end}"`);
      }
    }
    if (item.end === null && parentEnded) {
      errors.push(`${location}.end: ongoing (null), but the parent ended "${parent.end}"`);
    }
  }

  function checkLocalIds(items, location) {
    const seen = new Map();
    (items ?? []).forEach((item, index) => {
      if (seen.has(item.id)) {
        errors.push(`duplicate local id "${item.id}": ${location}[${seen.get(item.id)}] and ${location}[${index}]`);
      } else {
        seen.set(item.id, index);
      }
    });
  }

  function hasAssets(record) {
    return record.assets !== undefined || (record.work ?? []).some((item) => item.assets !== undefined);
  }

  for (const { name, order } of CAREER_COLLECTIONS) {
    const records = config.career[name];
    const freelanceOrders = new Map(); // order → location

    records.forEach((record, index) => {
      const at = `career.${name}[${index}]`;

      if (projectIds.has(record.id)) {
        errors.push(`${at}: id "${record.id}" is already a project id`);
      }
      if (ids.has(record.id)) {
        errors.push(`duplicate career id "${record.id}": ${ids.get(record.id)} and ${at}`);
      } else {
        ids.set(record.id, at);
      }

      if (index > 0 && order(records[index - 1], record) > 0) {
        errors.push(`${at}: career.${name} must be sorted by ${ORDER_DESCRIPTION[name]} ("${records[index - 1].id}" comes before "${record.id}")`);
      }

      checkRange(record, at);
      checkRelatedProjects(record.relatedProjects, at);
      checkTechnologies(record.technologies, at, errors);
      (record.work ?? []).forEach((item, itemIndex) => checkTechnologies(item.technologies, `${at}.work[${itemIndex}]`, errors));
      (record.components ?? []).forEach((item, itemIndex) => checkTechnologies(item.technologies, `${at}.components[${itemIndex}]`, errors));

      if (record.listing === "hidden" && hasAssets(record)) {
        errors.push(`${at}: hidden career records must not reference assets (every committed asset is public)`);
      }

      if (name === "experience") {
        checkLocalIds(record.work, `${at}.work`);
        (record.work ?? []).forEach((item, itemIndex) => {
          const itemAt = `${at}.work[${itemIndex}]`;
          checkRange(item, itemAt);
          checkWithin(item, record, itemAt);
          checkRelatedProjects(item.relatedProjects, itemAt);
        });
      }

      if (name === "freelance") {
        checkLocalIds(record.components, `${at}.components`);
        const owner = freelanceOrders.get(record.order);
        if (owner) {
          errors.push(`duplicate freelance order ${record.order}: ${owner} and ${at}`);
        } else {
          freelanceOrders.set(record.order, at);
        }
      }

      if (name === "assessments" && record.repository !== undefined) {
        const repository = record.repository.toLowerCase();
        if (projectRepositories.has(repository)) {
          errors.push(`${at}.repository: "${record.repository}" is already the repository of projects.${projectRepositories.get(repository)}`);
        }
        const owner = assessmentRepositories.get(repository);
        if (owner) {
          errors.push(`duplicate assessment repository "${record.repository}": ${owner} and ${at}`);
        } else {
          assessmentRepositories.set(repository, at);
        }
      }
    });
  }
}

function validateSemantics(config) {
  const errors = [];
  checkMeaningfulStrings(config, "", errors);
  checkAssets(config, errors);
  checkCareer(config, errors);
  checkOrigins(config, errors);
  checkConcepts(config, errors);

  const primary = config.domains.primary.toLowerCase();
  const hostnames = new Map(); // hostname → location that claimed it
  const deploymentNames = new Map(); // deployment name → location that claimed it
  const repositories = new Map(); // repository name (GitHub names are case-insensitive) → first declaring project

  function claimHostname(hostname, location) {
    if (hostname.length > 253) {
      errors.push(`${location}: resolves to "${hostname}", which exceeds 253 characters`);
      return;
    }
    const owner = hostnames.get(hostname);
    if (owner) {
      errors.push(`duplicate hostname "${hostname}": ${owner} and ${location}`);
    } else {
      hostnames.set(hostname, location);
    }
  }

  const externalUrls = new Map(); // normalized external URL → location that claimed it
  const relationships = new Map(); // unordered project pair → location that declared it

  function checkExternalUrl(value, location) {
    let url;
    try {
      url = new URL(value);
    } catch {
      errors.push(`${location}: "${value}" is not a valid URL`);
      return;
    }
    if (url.username || url.password) {
      errors.push(`${location}: must not contain credentials`);
    }
    if (url.hash) {
      errors.push(`${location}: must not contain a #fragment`);
    }
    const host = url.hostname.toLowerCase();
    if (host === primary || host.endsWith(`.${primary}`)) {
      errors.push(`${location}: "${value}" is on the primary domain; use "subdomain" instead of "url"`);
      return;
    }
    // The stored URL is kept exactly as written; only the duplicate check ignores a trailing slash.
    const key = `${host}${url.port ? `:${url.port}` : ""}${url.pathname.replace(/\/+$/, "")}${url.search}`;
    const owner = externalUrls.get(key);
    if (owner) {
      errors.push(`duplicate external URL "${value}": ${owner} and ${location}`);
    } else {
      externalUrls.set(key, location);
    }
  }

  for (const [projectKey, project] of Object.entries(config.projects)) {
    checkTechnologies(project.technologies, `projects.${projectKey}`, errors);

    // Relationships are undirected: each pair is declared once, on either project.
    (project.related ?? []).forEach((relatedKey, index) => {
      const at = `projects.${projectKey}.related[${index}]`;
      if (relatedKey === projectKey) {
        errors.push(`${at}: a project cannot be related to itself`);
      } else if (!Object.hasOwn(config.projects, relatedKey)) {
        errors.push(`${at}: unknown project "${relatedKey}"`);
      } else {
        const pair = [projectKey, relatedKey].sort().join("\u0000");
        const owner = relationships.get(pair);
        if (owner) {
          errors.push(`duplicate relationship between "${projectKey}" and "${relatedKey}": ${owner} and ${at}`);
        } else {
          relationships.set(pair, at);
        }
      }
    });

    if (project.repository !== undefined) {
      // Projects sharing a repository must agree on its visibility.
      const repository = project.repository.toLowerCase();
      const first = repositories.get(repository);
      if (!first) {
        repositories.set(repository, { projectKey, visibility: project.repositoryVisibility });
      } else if (first.visibility !== project.repositoryVisibility) {
        errors.push(
          `conflicting repositoryVisibility for repository "${project.repository}": ` +
            `projects.${first.projectKey} is "${first.visibility}" but projects.${projectKey} is "${project.repositoryVisibility}"`,
        );
      }
    }

    for (const [deploymentKey, deployment] of Object.entries(project.deployments ?? {})) {
      const at = `projects.${projectKey}.deployments.${deploymentKey}`;

      const owner = deploymentNames.get(deployment.name);
      if (owner) {
        errors.push(`duplicate deployment name "${deployment.name}": ${owner} and ${at}`);
      } else {
        deploymentNames.set(deployment.name, at);
      }

      if (deployment.url !== undefined) {
        // External deployment: the schema guarantees there is no subdomain or aliases.
        checkExternalUrl(deployment.url, `${at}.url`);
        continue;
      }

      const { subdomain } = deployment;
      claimHostname(subdomain === null ? primary : `${subdomain.toLowerCase()}.${primary}`, `${at}.subdomain`);
      (deployment.aliases ?? []).forEach((alias, index) => {
        claimHostname(`${alias.toLowerCase()}.${primary}`, `${at}.aliases[${index}]`);
      });
    }
  }

  return errors;
}

/**
 * Validates an assembled config object. Returns { ok: true } or { ok: false, heading, errors },
 * where heading is the CLI's summary line. Semantics run only once the structure is valid.
 */
export function validateConfig(config) {
  const schemaErrors = validateSchema(config);
  if (schemaErrors.length) return { ok: false, heading: "does not match schema/ecosystem.schema.json", errors: schemaErrors };

  const semanticErrors = validateSemantics(config);
  if (semanticErrors.length) return { ok: false, heading: "semantic validation failed", errors: semanticErrors };

  return { ok: true };
}

function main() {
  const configPath = resolve(process.argv[2] ?? resolve(root, "config/production.json"));
  const displayPath = relative(process.cwd(), configPath).replaceAll("\\", "/") || configPath;

  function fail(heading, errors) {
    console.error(`✗ ${displayPath}: ${heading}`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  let result;
  try {
    result = validateConfig(readJson(configPath, "config"));
  } catch (error) {
    if (!(error instanceof ReadError)) throw error;
    fail(error.message, error.errors);
  }
  if (!result.ok) fail(result.heading, result.errors);

  console.log(`✓ ${displayPath} is valid`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
