import { checkCareerFingerprints } from "./career-approval-fingerprint.mjs";

// Semantic checks for schema-valid permissions. No projection, content mutation,
// inferred grants or network access; callers run structural validation first.
export const emptyCareerPublication = () => ({ experience: [], work: [], freelance: [], components: [], assessments: [] });

export function checkCareerPublication(config, errors) {
  if (config.careerPublication === undefined) return; // Legacy contract: deny everything.
  const collections = {
    experience: config.career.experience,
    freelance: config.career.freelance,
    assessments: config.career.assessments,
  };
  for (const [kind, grants] of Object.entries(config.careerPublication)) {
    const seen = new Set();
    for (const [index, grant] of grants.entries()) {
      const at = `careerPublication.${kind}[${index}]`;
      const parentId = kind === "work" ? grant.employerId : kind === "components" ? grant.engagementId : undefined;
      const key = JSON.stringify([parentId ?? null, grant.id]);
      if (seen.has(key)) errors.push(`${at}: duplicate approval for ${key}`);
      seen.add(key);

      let record, parent;
      if (kind === "work" || kind === "components") {
        const parentKind = kind === "work" ? "experience" : "freelance";
        parent = collections[parentKind].find(p => p.id === parentId);
        if (!parent) { errors.push(`${at}: unknown ${parentKind} parent "${parentId}"`); continue; }
        record = (parent[kind] ?? []).find(p => p.id === grant.id);
      } else record = collections[kind].find(p => p.id === grant.id);
      if (!record) { errors.push(`${at}: unknown ${kind} id "${grant.id}"${parentId ? ` under "${parentId}"` : ""}`); continue; }
      if ((parent ?? record).listing !== "public") errors.push(`${at}: approval requires canonical public listing (not publication permission)`);
      if (!grant.fields.length && !grant.technologies?.length && !grant.relatedProjects?.length) errors.push(`${at}: approval must select at least one field or value`);

      checkCareerFingerprints(config, kind, grant, at, errors);

      for (const field of grant.fields) {
        const present = field.split(".").reduce((value, part) => value != null && Object.hasOwn(value, part) ? value[part] : undefined, record);
        if (present === undefined) errors.push(`${at}.fields: "${field}" is absent from the canonical record`);
        if (field === "repository" && record.repositoryVisibility !== "public") errors.push(`${at}.fields: repository approval requires a declared public repository`);
      }
      for (const technology of grant.technologies ?? []) {
        if (!(record.technologies ?? []).includes(technology)) errors.push(`${at}.technologies: value is not a canonical technology of this record`);
      }
      for (const id of grant.relatedProjects ?? []) {
        if (!(record.relatedProjects ?? []).includes(id)) errors.push(`${at}.relatedProjects: "${id}" is not a canonical relationship of this record`);
        if (!Object.hasOwn(config.projects, id) || config.projects[id].listing !== "public") errors.push(`${at}.relatedProjects: "${id}" must reference a public project`);
      }
    }
  }
}
