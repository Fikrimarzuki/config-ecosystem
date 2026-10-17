// Build-time contract shared verbatim with Gateway. Pure calculation, never writes grants.
import { createHash } from "node:crypto";

export const emptyFingerprints = () => ({ fields: {}, technologies: {}, relatedProjects: {} });

/** Fixed JSON tuple of scalars/arrays only: exact UTF-8 strings, no trimming,
 * Unicode normalization, key-order dependence or timestamps. Versioned domain
 * separation and qualified identity prevent moving evidence between targets.
 * Callers validate allowed fields, canonical eligibility and selection membership.
 */
export function careerApprovalFingerprint(config, kind, selector, category, target) {
  const parentKind = kind === "work" ? "experience" : kind === "components" ? "freelance" : kind;
  if (!["experience", "work", "freelance", "components", "assessments"].includes(kind)) throw new Error("Unknown Career approval kind");
  const parentId = kind === "work" ? selector.employerId : kind === "components" ? selector.engagementId : "";
  const parent = config.career[parentKind].find(record => record.id === (parentId || selector.id));
  const record = parentId ? parent?.[kind]?.find(record => record.id === selector.id) : parent;
  if (!record) throw new Error("Unknown Career approval target");
  let value;
  if (category === "fields") {
    const parts = target.split(".");
    value = parts.reduce((object, key) => object != null && Object.hasOwn(object, key) ? object[key] : undefined, record);
    if (target === "repository") {
      if (value === undefined) throw new Error("Missing Career repository target");
      value = [config.username, value, record.repositoryVisibility, `https://github.com/${config.username}/${value}`];
    } else if (value !== null && !["string", "number"].includes(typeof value)) throw new Error("Missing or nonscalar Career approval field");
  } else if (category === "technologies" || category === "relatedProjects") {
    if (!record[category]?.includes(target)) throw new Error("Unknown Career approval value");
    value = target; // Association approval binds the ID, never the public project's other metadata.
  } else throw new Error("Unknown Career approval category");
  const tuple = ["gateway-career-approval-v1", kind, parentId, selector.id, category, target, value];
  return `sha256:${createHash("sha256").update(JSON.stringify(tuple), "utf8").digest("hex")}`;
}

/** Exact evidence coverage: no wildcard, inherited entry, or unused digest. */
export function checkCareerFingerprints(config, kind, grant, at, errors) {
  for (const category of ["fields", "technologies", "relatedProjects"]) {
    const selected = grant[category] ?? [], evidence = grant.fingerprints?.[category];
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence) ||
      JSON.stringify(Object.keys(evidence).sort()) !== JSON.stringify([...selected].sort())) {
      errors.push(`${at}.fingerprints.${category}: must cover exactly the selected targets`);
      continue;
    }
    for (const target of selected) {
      try {
        const digest = evidence[target];
        if (typeof digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(digest) ||
          digest !== careerApprovalFingerprint(config, kind, grant, category, target)) {
          errors.push(`${at}.fingerprints.${category}: missing, invalid or stale approval for ${JSON.stringify(target)}`);
        }
      } catch {
        errors.push(`${at}.fingerprints.${category}: cannot verify approval target ${JSON.stringify(target)}`);
      }
    }
  }
}
