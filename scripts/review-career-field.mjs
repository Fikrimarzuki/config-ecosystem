#!/usr/bin/env node
// Read-only publication reviewer. Career prints one candidate digest; Concepts
// prints a review record. Neither path writes permissions or activates grants.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig } from "./validate.mjs";
import { emptyCareerPublication } from "./career-publication.mjs";
import { careerApprovalFingerprint, emptyFingerprints } from "./career-approval-fingerprint.mjs";
import { emptyConceptsPublication } from "./concepts-publication.mjs";
import { conceptsApprovalFingerprint } from "./concepts-approval-fingerprint.mjs";

/** Private review output only; never serialize this record into public content. */
export function reviewConceptTitle(config, id) {
  // Ignore existing Concepts evidence only in memory to review a replacement.
  // Ordinary validation/build never discards stale grants this way.
  const candidate = { ...config, conceptsPublication: emptyConceptsPublication() };
  const result = validateConfig(candidate);
  if (!result.ok) throw new Error(`${result.heading}: ${result.errors.join("; ")}`);
  const expected = conceptsApprovalFingerprint(candidate, id, "title");
  const grants = Array.isArray(config.conceptsPublication) ? config.conceptsPublication.filter(g => g?.id === id) : [];
  const digest = grants[0]?.fingerprints?.fields?.title;
  const evidence = grants.length === 0 ? "missing" : grants.length > 1 ? "invalid"
    : digest === undefined ? "missing" : typeof digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(digest) ? "invalid"
    : digest === expected ? "valid" : "stale";
  const canonicalValid = validateConfig(config).ok;
  return {
    conceptReference: id, currentTitle: candidate.concepts.find(record => record.id === id).title,
    publicationStatus: !canonicalValid ? "denied-invalid" : grants.length === 1 && evidence === "valid" ? "authorized" : "not-authorized",
    expectedTitleFingerprint: expected, existingEvidence: evidence, canonicalValid, candidateOnly: true,
  };
}

export function candidateFingerprint(config, kind, id, category, target, parentId) {
  // Existing stale grants must not prevent reviewing a replacement. Ignore them
  // only in this in-memory candidate; validation/build/sync never use this path.
  const candidate = { ...config, careerPublication: emptyCareerPublication() };
  const canonical = validateConfig(candidate);
  if (!canonical.ok) throw new Error(`${canonical.heading}: ${canonical.errors.join("; ")}`);
  if (!["fields", "technologies", "relatedProjects"].includes(category)) throw new Error("Unknown approval category");
  const grant = { id, fields: [], fingerprints: emptyFingerprints(),
    ...(kind === "work" ? { employerId: parentId } : kind === "components" ? { engagementId: parentId } : {}) };
  grant[category] = [target];
  const digest = careerApprovalFingerprint(candidate, kind, grant, category, target);
  grant.fingerprints[category] = Object.fromEntries([[target, digest]]);
  candidate.careerPublication[kind].push(grant);
  const result = validateConfig(candidate);
  if (!result.ok) throw new Error(`${result.heading}: ${result.errors.join("; ")}`);
  return digest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [path, kind, id, category, target, parentId, ...extra] = process.argv.slice(2);
    if (!path || !kind || !id || !category || !target || extra.length ||
      (["work", "components"].includes(kind) ? !parentId : parentId !== undefined)) {
      throw new Error("Usage: review-career-field.mjs <assembled-config> <career-kind|concepts> <id> <category> <target> [parent-id for work/components]");
    }
    const config = JSON.parse(await readFile(resolve(path), "utf8"));
    if (kind === "concepts") {
      if (category !== "fields" || target !== "title") throw new Error("Concepts review supports fields title only");
      console.log(JSON.stringify(reviewConceptTitle(config, id), null, 2));
    } else console.log(candidateFingerprint(config, kind, id, category, target, parentId));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
