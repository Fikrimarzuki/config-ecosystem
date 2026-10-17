#!/usr/bin/env node
// Explicit read-only reviewer tool. Prints ONE candidate digest; never writes permissions.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig } from "./validate.mjs";
import { emptyCareerPublication } from "./career-publication.mjs";
import { careerApprovalFingerprint, emptyFingerprints } from "./career-approval-fingerprint.mjs";

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
      throw new Error("Usage: review-career-field.mjs <assembled-config> <kind> <id> <fields|technologies|relatedProjects> <target> [parent-id for work/components]");
    }
    const config = JSON.parse(await readFile(resolve(path), "utf8"));
    console.log(candidateFingerprint(config, kind, id, category, target, parentId));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
