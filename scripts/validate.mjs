#!/usr/bin/env node
// Validates an ecosystem config file in two passes:
//   1. structure, against schema/ecosystem.schema.json;
//   2. semantics that depend on the config as a whole (unique hostnames,
//      unique deployment names, meaningful strings).
//
// Usage: node scripts/validate.mjs [config-path]   (default: config/production.json)

import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "schema/ecosystem.schema.json");
const configPath = resolve(process.argv[2] ?? resolve(root, "config/production.json"));
const displayPath = relative(process.cwd(), configPath).replaceAll("\\", "/") || configPath;

function fail(heading, errors) {
  console.error(`✗ ${displayPath}: ${heading}`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

function readJson(path, label) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    fail(`cannot read ${label}`, [error.message]);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label} is not valid JSON`, [error.message]);
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
  switch (error.keyword) {
    case "required":
      return `${at}: missing required property "${error.params.missingProperty}"`;
    case "additionalProperties":
      return `${at}: unknown property "${error.params.additionalProperty}"`;
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

function validateSchema(config) {
  const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
  const validate = ajv.compile(readJson(schemaPath, "schema"));
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

function validateSemantics(config) {
  const errors = [];
  checkMeaningfulStrings(config, "", errors);

  const primary = config.domains.primary.toLowerCase();
  const hostnames = new Map(); // hostname → location that claimed it
  const deploymentNames = new Map(); // deployment name → location that claimed it

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

  for (const [projectKey, project] of Object.entries(config.projects)) {
    for (const [deploymentKey, deployment] of Object.entries(project.deployments ?? {})) {
      const at = `projects.${projectKey}.deployments.${deploymentKey}`;

      const owner = deploymentNames.get(deployment.name);
      if (owner) {
        errors.push(`duplicate deployment name "${deployment.name}": ${owner} and ${at}`);
      } else {
        deploymentNames.set(deployment.name, at);
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

const config = readJson(configPath, "config");

const schemaErrors = validateSchema(config);
if (schemaErrors.length) fail("does not match schema/ecosystem.schema.json", schemaErrors);

const semanticErrors = validateSemantics(config);
if (semanticErrors.length) fail("semantic validation failed", semanticErrors);

console.log(`✓ ${displayPath} is valid`);
