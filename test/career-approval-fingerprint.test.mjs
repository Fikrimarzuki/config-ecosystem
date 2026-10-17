import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { candidateFingerprint } from "../scripts/review-career-field.mjs";
import { careerApprovalFingerprint } from "../scripts/career-approval-fingerprint.mjs";
import { validateConfig } from "../scripts/validate.mjs";
import { fixture, review, selectors } from "./helpers/career-approval-fixture.mjs";
const valid = c => { const r = validateConfig(c); assert(r.ok, r.errors?.join("\n")); };
const invalid = (c, pattern = /fingerprint|approval/i) => { const r = validateConfig(c); assert(!r.ok); assert.match(r.errors.join("\n"), pattern); };

for (const kind of Object.keys(selectors)) test(`${kind}: unchanged selection is valid; changed value cannot reuse its digest`, () => {
  const c = fixture(), g = review(c, kind); valid(c);
  const record = kind === "work" ? c.career.experience[0].work[0] : kind === "components" ? c.career.freelance[0].components[0] : c.career[kind][0];
  record[g.fields[0]] = "Changed synthetic value"; invalid(c, /stale/);
});

test("missing/malformed fingerprints and obsolete nonempty grants fail closed", () => {
  for (const mutate of [g => { delete g.fingerprints; }, g => { delete g.fingerprints.fields.company; },
    g => { g.fingerprints.fields.company = "sha256:bad"; }, g => { g.fingerprints.fields.company = "sha256:" + "0".repeat(64); },
    g => { g.fingerprints.fields.unselected = g.fingerprints.fields.company; }, g => { g.fingerprints.fields = {}; }]) {
    const c = fixture(); mutate(review(c, "experience")); invalid(c);
  }
});

test("unapproved field edits and added children do not change a selected fingerprint or gain permission", () => {
  const c = fixture(); review(c, "experience");
  const before = structuredClone(c.careerPublication);
  c.career.experience[0].role = "Changed unapproved role";
  c.career.experience[0].work.push({ id: "new-work", title: "Withheld new child", description: { en: "Synthetic withheld description." } });
  valid(c); assert.deepEqual(c.careerPublication, before); assert.deepEqual(c.careerPublication.work, []);
});

test("locales retain independent evidence; stale English must be removed or explicitly re-reviewed", () => {
  const c = fixture(), g = review(c, "work", { fields: ["description.en", "description.id"] });
  const idDigest = g.fingerprints.fields["description.id"];
  c.career.experience[0].work[0].description.en = "Changed English."; invalid(c, /stale/);
  assert.equal(careerApprovalFingerprint(c, "work", g, "fields", "description.id"), idDigest);
  g.fields = ["description.id"]; delete g.fingerprints.fields["description.en"]; valid(c);
});

test("technologies bind exact individual values; additions/order/unapproved changes do not broaden selections", () => {
  const c = fixture(), g = review(c, "work", { fields: [], technologies: ["TypeScript"] });
  c.career.experience[0].work[0].technologies = ["Rust", "TypeScript"]; valid(c);
  g.technologies = ["Rust"]; g.fingerprints.technologies.Rust = g.fingerprints.technologies.TypeScript;
  delete g.fingerprints.technologies.TypeScript; invalid(c, /stale/);
});

for (const key of ["username", "repository"]) test(`repository evidence binds ${key}`, () => {
  const c = fixture(); review(c, "assessments", { fields: ["repository"] }); valid(c);
  if (key === "username") c.username = "another-owner"; else c.career.assessments[0].repository = "another-source";
  invalid(c, /stale/);
});

test("related-project evidence binds the exact association without approving project metadata", () => {
  const c = fixture(), g = review(c, "work", { fields: [], relatedProjects: ["gateway"] });
  c.projects.gateway.name = "New independently public name"; valid(c);
  g.relatedProjects = ["other"]; g.fingerprints.relatedProjects.other = g.fingerprints.relatedProjects.gateway;
  delete g.fingerprints.relatedProjects.gateway; invalid(c, /stale/);
});

test("qualified identity prevents copying evidence between parents or field names", () => {
  const c = fixture(), g = review(c, "work");
  const second = structuredClone(c.career.experience[0]); second.id = "anotherEmployer"; c.career.experience.push(second);
  g.employerId = second.id; invalid(c, /stale/);
  const d = fixture(), parent = review(d, "experience"); d.career.experience[0].role = d.career.experience[0].company;
  parent.fields = ["role"]; parent.fingerprints.fields = { role: parent.fingerprints.fields.company }; invalid(d, /stale/);
});

test("fixed tuple serialization is deterministic, distinguishes null and preserves exact Unicode/newlines", () => {
  const c = fixture(), g = review(c, "experience", { fields: ["end"] });
  const expected = "sha256:" + createHash("sha256").update(JSON.stringify(["gateway-career-approval-v1", "experience", "", "fictionalEmployer", "fields", "end", null]), "utf8").digest("hex");
  assert.equal(g.fingerprints.fields.end, expected);
  const h = review(c, "work", { fields: ["description.en"] });
  c.career.experience[0].work[0].description.en = "Café\r\n";
  const a = careerApprovalFingerprint(c, "work", h, "fields", "description.en");
  c.career.experience[0].work[0].description.en = "Cafe\u0301\n";
  assert.notEqual(careerApprovalFingerprint(c, "work", h, "fields", "description.en"), a);
  assert.equal(careerApprovalFingerprint(JSON.parse(JSON.stringify(c)), "work", h, "fields", "description.en"), careerApprovalFingerprint(c, "work", h, "fields", "description.en"));
});

test("reviewer calculation is read-only, can review stale content and never activates a grant", () => {
  const c = fixture(); review(c, "work"); c.career.experience[0].work[0].title = "Changed work";
  const before = structuredClone(c);
  const digest = candidateFingerprint(c, "work", "fictional-work", "fields", "title", "fictionalEmployer");
  assert.match(digest, /^sha256:[a-f0-9]{64}$/); assert.deepEqual(c, before); invalid(c, /stale/);
  assert.throws(() => candidateFingerprint(c, "work", "fictional-work", "fields", "listing", "fictionalEmployer"));
  c.career.experience[0].listing = "hidden";
  assert.throws(() => candidateFingerprint(c, "work", "fictional-work", "fields", "title", "fictionalEmployer"), /public listing/);
});

test("reviewer CLI prints one digest and never changes the supplied config or creates a grant file", async () => {
  const { mkdtemp, readFile, writeFile, readdir, rm } = await import("node:fs/promises");
  const { execFileSync } = await import("node:child_process");
  const { tmpdir } = await import("node:os"), { join } = await import("node:path");
  const root = await mkdtemp(join(tmpdir(), "career-review-cli-"));
  try {
    const path = join(root, "fictional.json"), original = JSON.stringify(fixture(), null, 2);
    await writeFile(path, original);
    const output = execFileSync(process.execPath, ["scripts/review-career-field.mjs", path, "work", "fictional-work", "fields", "title", "fictionalEmployer"], { encoding: "utf8" });
    assert.match(output, /^sha256:[a-f0-9]{64}\n$/);
    assert.equal(await readFile(path, "utf8"), original);
    assert.deepEqual(await readdir(root), ["fictional.json"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
