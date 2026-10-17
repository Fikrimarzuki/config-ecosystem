// Fictional records only. This reviewer helper is test-only and never runs during validation/sync.
import { careerApprovalFingerprint, emptyFingerprints } from "../../scripts/career-approval-fingerprint.mjs";
export const fixture = () => ({
  version: 1, username: "fictional-owner", domains: { primary: "example.com" },
  profile: { name: "Fictional Owner", email: "owner@example.com", links: { linkedin: "https://www.linkedin.com/in/fictional" }, assets: { resume: "assets/profile/cv.pdf" } },
  projects: { gateway: { name: "Fictional Gateway", status: "active", listing: "public", destination: "tools", deployments: { main: { name: "gateway", subdomain: null } } },
    other: { name: "Fictional Other", status: "active", listing: "public", destination: "tools" } },
  career: {
    experience: [{ id: "fictionalEmployer", company: "Fictional Studio", role: "Engineer", start: "2020-01", end: null, listing: "public",
      description: { en: "Reviewed English.", id: "Ringkasan sintetis." }, technologies: ["TypeScript", "SQL"], relatedProjects: ["gateway", "other"],
      work: [{ id: "fictional-work", title: "Fictional Work", description: { en: "Child English.", id: "Ringkasan karya." }, technologies: ["TypeScript", "SQL"], relatedProjects: ["gateway", "other"] }] }],
    freelance: [{ id: "fictionalEngagement", title: "Fictional Engagement", order: 1, listing: "public", components: [{ id: "fictional-part", title: "Fictional Component", technologies: ["TypeScript"] }] }],
    assessments: [{ id: "fictionalAssessment", title: "Fictional Assessment", year: 2024, listing: "public", repository: "fictional-source", repositoryVisibility: "public",
      description: { en: "Assessment English.", id: "Ringkasan penilaian." }, technologies: ["TypeScript", "SQL"] }],
  },
  careerPublication: { experience: [], work: [], freelance: [], components: [], assessments: [] }, origins: [], concepts: [],
});
export const selectors = {
  experience: { id: "fictionalEmployer", fields: ["company"] },
  work: { employerId: "fictionalEmployer", id: "fictional-work", fields: ["title"] },
  freelance: { id: "fictionalEngagement", fields: ["title"] },
  components: { engagementId: "fictionalEngagement", id: "fictional-part", fields: ["title"] },
  assessments: { id: "fictionalAssessment", fields: ["title"] },
};
export function review(c, kind, changes = {}) {
  const grant = { ...structuredClone(selectors[kind]), ...changes, fingerprints: emptyFingerprints() };
  for (const category of Object.keys(grant.fingerprints)) for (const target of grant[category] ?? [])
    Object.defineProperty(grant.fingerprints[category], target, { value: careerApprovalFingerprint(c, kind, grant, category, target), enumerable: true, writable: true, configurable: true });
  c.careerPublication[kind].push(grant);
  return grant;
}
