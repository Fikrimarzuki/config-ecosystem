import { conceptsApprovalFingerprint } from "./concepts-approval-fingerprint.mjs";

export const emptyConceptsPublication = () => [];

// Semantic checks for schema-valid grants. Structural validation must run first.
// No implicit authorization, projection, mutation, fingerprint refresh or network.
export function checkConceptsPublication(config, errors) {
  if (config.conceptsPublication === undefined) return; // Legacy absence denies all.
  const seen = new Set();
  for (const [index, grant] of config.conceptsPublication.entries()) {
    const at = `conceptsPublication[${index}]`;
    if (seen.has(grant.id)) errors.push(`${at}: duplicate Concepts approval`);
    seen.add(grant.id);
    if (!config.concepts.some(concept => concept.id === grant.id)) {
      errors.push(`${at}: unknown Concepts approval target`);
      continue;
    }
    const digest = grant.fingerprints.fields.title;
    if (!/^sha256:[a-f0-9]{64}$/.test(digest) || digest !== conceptsApprovalFingerprint(config, grant.id, "title")) {
      errors.push(`${at}.fingerprints.fields.title: invalid or stale Concepts approval`);
    }
  }
}
