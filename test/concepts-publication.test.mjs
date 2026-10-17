import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateConfig } from "../scripts/validate.mjs";
import { assemble, BuildError } from "../scripts/build.mjs";
import { conceptsApprovalFingerprint } from "../scripts/concepts-approval-fingerprint.mjs";
import { emptyConceptsPublication } from "../scripts/concepts-publication.mjs";
import { reviewConceptTitle } from "../scripts/review-career-field.mjs";
import { fixture as careerFixture } from "./helpers/career-approval-fixture.mjs";
import { root, temporaryDirectory, writeSources } from "./helpers.mjs";

const fixture = () => ({ ...careerFixture(), conceptsPublication: [], concepts: [
  { id: "zFirst", title: "Fictional First", kind: "concept", order: 10 },
  { id: "aSecond", title: "Fictional Second", kind: "concept", order: 20 },
] });
const review = (c, id = "zFirst") => {
  const grant = { id, fields: ["title"], fingerprints: { fields: { title: conceptsApprovalFingerprint(c, id) } } };
  c.conceptsPublication.push(grant); return grant;
};
const valid = c => { const r = validateConfig(c); assert(r.ok, r.errors?.join("\n")); };
const invalid = (c, pattern = /fingerprint|approval|title|field|property/i) => {
  const before = structuredClone(c), r = validateConfig(c); assert(!r.ok); assert.match(r.errors.join("\n"), pattern); assert.deepEqual(c, before);
};
// Normative consumer example, test-only: full validation precedes title copying.
// Gateway must independently enforce this contract; no public file is generated.
const publicTitles = c => {
  valid(c);
  const ids = new Set((c.conceptsPublication ?? []).map(grant => grant.id));
  return c.concepts.filter(record => ids.has(record.id)).map(record => ({ title: record.title }));
};

for (const state of ["missing", "empty", "new", "placeholder"]) test(`Concepts default deny: ${state}`, () => {
  const c = fixture();
  if (state === "missing") delete c.conceptsPublication;
  if (state === "new") c.concepts.push({ id: "newIdea", title: "Fictional New Idea", kind: "concept", order: 30 });
  if (state === "placeholder") c.concepts[0].kind = "placeholder";
  const before = structuredClone(c); assert.deepEqual(publicTitles(c), []); assert.deepEqual(c, before);
  const empty = emptyConceptsPublication(); empty.push({}); assert.deepEqual(emptyConceptsPublication(), []);
});

test("one synthetic approval publishes only its exact title, never selectors or permissions", () => {
  const c = fixture(); review(c); const before = structuredClone(c);
  assert.deepEqual(publicTitles(c), [{ title: "Fictional First" }]); assert.deepEqual(c, before);
  c.concepts.push({ id: "newIdea", title: "Fictional New Idea", kind: "concept", order: 30 });
  assert.deepEqual(publicTitles(c), [{ title: "Fictional First" }]);
});

test("multiple synthetic approvals preserve canonical order independently of grant order", () => {
  const c = fixture(); review(c, "aSecond"); review(c, "zFirst");
  assert.deepEqual(publicTitles(c), [{ title: "Fictional First" }, { title: "Fictional Second" }]);
  assert.deepEqual(c.concepts.map(r => r.id), ["zFirst", "aSecond"]);
});

test("fingerprint is the exact domain-separated Career-compatible tuple convention", () => {
  const c = fixture(), expected = "sha256:" + createHash("sha256").update(JSON.stringify(["gateway-concepts-approval-v1", "concepts", "", "zFirst", "fields", "title", "Fictional First"]), "utf8").digest("hex");
  assert.equal(conceptsApprovalFingerprint(c, "zFirst"), expected);
  assert.equal(conceptsApprovalFingerprint(JSON.parse(JSON.stringify(c)), "zFirst"), expected);
});

for (const title of ["Changed title", "Fictional First ", " Fictional First", "Fictional First\n", "Fictional First\r\n"]) test(`title edit invalidates evidence: ${JSON.stringify(title)}`, () => {
  const c = fixture(); review(c); c.concepts[0].title = title; invalid(c, /stale/);
});

test("Unicode is exact: no normalization or trimming before hashing", () => {
  const c = fixture(); c.concepts[0].title = "Caf\u00e9"; review(c); c.concepts[0].title = "Cafe\u0301"; invalid(c, /stale/);
});

test("removed or non-string title is invalid rather than silently revoking or repairing a grant", () => {
  for (const value of [undefined, null, 123, {}, "", "  "]) {
    const c = fixture(); review(c); c.concepts[0].title = value; invalid(c, /title/);
    assert.throws(() => conceptsApprovalFingerprint(c, "zFirst"));
  }
});

test("moving approval to another concept fails even with identical title content", () => {
  const c = fixture(); c.concepts[1].title = c.concepts[0].title; const g = review(c); g.id = "aSecond"; invalid(c, /stale/);
});

test("renaming an identity, removing its record or reassigning title values cannot retain authorization", () => {
  for (const mutate of [c => { c.concepts[0].id = "renamedIdea"; }, c => { c.concepts.shift(); }, c => { [c.concepts[0].title, c.concepts[1].title] = [c.concepts[1].title, c.concepts[0].title]; }]) {
    const c = fixture(); review(c); mutate(c); invalid(c, /unknown|stale/);
  }
});

for (const domain of ["gateway-career-approval-v1", "gateway-origins-approval-v1", "gateway-concepts-approval-v2"]) test(`wrong domain is rejected: ${domain}`, () => {
  const c = fixture(), g = review(c);
  g.fingerprints.fields.title = "sha256:" + createHash("sha256").update(JSON.stringify([domain, "concepts", "", "zFirst", "fields", "title", c.concepts[0].title]), "utf8").digest("hex");
  invalid(c, /stale/);
});

test("another field's digest cannot authorize the title", () => {
  const c = fixture(), g = review(c);
  g.fingerprints.fields.title = "sha256:" + createHash("sha256").update(JSON.stringify(["gateway-concepts-approval-v1", "concepts", "", "zFirst", "fields", "status", c.concepts[0].title]), "utf8").digest("hex");
  invalid(c, /stale/); assert.throws(() => conceptsApprovalFingerprint(c, "zFirst", "status"));
});

const malformed = [undefined, null, "", "sha256:bad", "sha256:" + "0".repeat(64), "sha512:" + "a".repeat(128), "sha256:" + "A".repeat(64), "sha256:" + "a".repeat(63), " sha256:" + "a".repeat(64)];
malformed.forEach((digest, i) => test(`missing/malformed/stale or unsupported fingerprint ${i + 1}`, () => {
  const c = fixture(), g = review(c); g.fingerprints.fields.title = digest; invalid(c);
}));

for (const [label, mutate] of [
  ["missing fingerprints", g => { delete g.fingerprints; }],
  ["missing evidence map", g => { delete g.fingerprints.fields; }],
  ["extra evidence target", g => { g.fingerprints.fields.status = g.fingerprints.fields.title; }],
  ["unsupported evidence category", g => { g.fingerprints.technologies = {}; }],
  ["empty fields", g => { g.fields = []; }],
  ["duplicate field", g => { g.fields = ["title", "title"]; }],
  ["unsupported field", g => { g.fields = ["status"]; }],
  ["wildcard", g => { g.fields = ["*"]; }],
  ["unsupported metadata", g => { g.repository = "fictional-source"; }],
  ["missing identity", g => { delete g.id; }],
  ["unknown identity", g => { g.id = "unknownIdea"; }],
]) test(`invalid Concepts grant: ${label}`, () => { const c = fixture(); mutate(review(c)); invalid(c, /fingerprint|approval|field|property|title|empty|duplicate|unknown|select/i); });

for (const value of [null, {}, true, "allow", [null], ["*"]]) test(`malformed publication collection ${JSON.stringify(value)}`, () => {
  const c = fixture(); c.conceptsPublication = value; invalid(c, /conceptsPublication/);
});

test("duplicate grant identity is rejected for equal and unequal evidence", () => {
  for (const altered of [false, true]) {
    const c = fixture(), g = review(c), copy = structuredClone(g); if (altered) copy.fingerprints.fields.title = "sha256:" + "0".repeat(64);
    c.conceptsPublication.push(copy); invalid(c, /duplicate/);
  }
});

test("unapproved changes and other collection permissions do not create Concepts grants", () => {
  const c = fixture(); review(c); const before = structuredClone(c.conceptsPublication);
  c.projects.gateway.repository = "fictional-gateway-source"; c.projects.gateway.repositoryVisibility = "public";
  c.career.experience[0].role = "Changed unapproved role"; c.concepts[1].title = "Changed unapproved title";
  valid(c); assert.deepEqual(c.conceptsPublication, before); assert.deepEqual(c.careerPublication, careerFixture().careerPublication);
  c.conceptsPublication = []; assert.deepEqual(publicTitles(c), []);
});

test("read-only Concepts review distinguishes candidate, active, stale and invalid evidence", () => {
  const c = fixture(); let before = structuredClone(c), r = reviewConceptTitle(c, "zFirst");
  assert.deepEqual(c, before); assert.equal(r.currentTitle, "Fictional First"); assert.equal(r.publicationStatus, "not-authorized"); assert.equal(r.existingEvidence, "missing"); assert.equal(r.candidateOnly, true);
  review(c); before = structuredClone(c); r = reviewConceptTitle(c, "zFirst"); assert.equal(r.publicationStatus, "authorized"); assert.equal(r.existingEvidence, "valid"); assert.deepEqual(c, before);
  c.concepts[0].title = "Changed title"; before = structuredClone(c); r = reviewConceptTitle(c, "zFirst"); assert.equal(r.publicationStatus, "denied-invalid"); assert.equal(r.existingEvidence, "stale"); assert.deepEqual(c, before);
  c.conceptsPublication[0].fingerprints.fields.title = "invalid"; assert.equal(reviewConceptTitle(c, "zFirst").existingEvidence, "invalid");
  assert.throws(() => reviewConceptTitle(c, "unknownIdea"));
  c.conceptsPublication = null; r = reviewConceptTitle(c, "zFirst"); assert.equal(r.publicationStatus, "denied-invalid");
});

test("valid target evidence cannot report active publication when another grant invalidates the config", () => {
  const c = fixture(); review(c); const other = review(c, "aSecond"); other.fingerprints.fields.title = "sha256:" + "0".repeat(64);
  const r = reviewConceptTitle(c, "zFirst"); assert.equal(r.existingEvidence, "valid"); assert.equal(r.publicationStatus, "denied-invalid"); assert.equal(r.canonicalValid, false);
});

test("existing reviewer CLI supports Concepts without writing config, grants or review artifacts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "concepts-review-"));
  try {
    const file = join(dir, "fictional.json"), original = JSON.stringify(fixture(), null, 2); await writeFile(file, original);
    const output = execFileSync(process.execPath, ["scripts/review-career-field.mjs", file, "concepts", "zFirst", "fields", "title"], { cwd: root, encoding: "utf8" });
    const r = JSON.parse(output); assert.equal(r.currentTitle, "Fictional First"); assert.equal(r.publicationStatus, "not-authorized"); assert.match(r.expectedTitleFingerprint, /^sha256:[a-f0-9]{64}$/);
    assert.equal(await readFile(file, "utf8"), original); assert.deepEqual(await readdir(dir), ["fictional.json"]);
    for (const args of [["concepts", "zFirst", "fields", "status"], ["concepts", "zFirst", "fields", "title", "extra"]]) {
      assert.throws(() => execFileSync(process.execPath, ["scripts/review-career-field.mjs", file, ...args], { cwd: root, stdio: "pipe" }));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

const global = JSON.parse(readFileSync(join(root, "config/global.json"), "utf8"));
const sourceFixture = (load, grants) => {
  const tmp = temporaryDirectory();
  try {
    const c = fixture(), files = { "global.json": global, "projects/gateway.json": { id: "gateway", ...careerFixture().projects.gateway }, "concepts/zFirst.json": c.concepts[0], "concepts/aSecond.json": c.concepts[1] };
    if (grants !== undefined) files["concepts-publication.json"] = grants;
    writeSources(tmp.dir, files); return load(tmp.dir);
  } finally { tmp.cleanup(); }
};

test("builder defaults missing declarations to empty and deterministically sorts only grant serialization", () => {
  assert.deepEqual(sourceFixture(dir => assemble({ configDir: dir })).conceptsPublication, []);
  const c = fixture(); review(c, "zFirst"); review(c, "aSecond");
  const a = sourceFixture(dir => assemble({ configDir: dir }), c.conceptsPublication), b = sourceFixture(dir => assemble({ configDir: dir }), [...c.conceptsPublication].reverse());
  assert.equal(JSON.stringify(a), JSON.stringify(b)); assert.deepEqual(a.concepts.map(r => r.id), ["zFirst", "aSecond"]);
  assert.deepEqual(a.conceptsPublication.map(g => g.id), ["aSecond", "zFirst"]); assert.deepEqual(publicTitles(a), [{ title: "Fictional First" }, { title: "Fictional Second" }]);
});

test("builder rejects stale, missing, malformed and unknown grants without repairing them", () => {
  const c = fixture(); review(c); const stale = structuredClone(c.conceptsPublication); stale[0].fingerprints.fields.title = "sha256:" + "0".repeat(64);
  for (const grants of [stale, null, [{ id: "unknownIdea", fields: ["title"], fingerprints: { fields: { title: "sha256:" + "a".repeat(64) } } }], [{ id: "zFirst", fields: ["title"] }]]) {
    assert.throws(() => sourceFixture(dir => assemble({ configDir: dir }), grants), error => error instanceof BuildError && /Concepts|concepts-publication/.test(error.message));
  }
});

test("global config cannot bypass the dedicated Concepts permission source", () => {
  const tmp = temporaryDirectory();
  try { writeSources(tmp.dir, { "global.json": { ...global, conceptsPublication: [] } }); assert.throws(() => assemble({ configDir: tmp.dir }), /global.json must not contain conceptsPublication/); }
  finally { tmp.cleanup(); }
});

test("real declarations authorize exactly the three owner-approved titles and nothing else", () => {
  const c = JSON.parse(readFileSync(join(root, "config/production.json"), "utf8"));
  const approved = ["Forgebox", "Hearthside", "Momee"];
  for (const path of ["config/concepts-publication.json", "config/production.json", "dist/ecosystem.json"]) {
    const data = JSON.parse(readFileSync(join(root, path), "utf8")), grants = Array.isArray(data) ? data : data.conceptsPublication;
    assert.equal(grants.length, 3); assert.equal(new Set(grants.map(g => g.id)).size, 3);
    assert.deepEqual(grants, c.conceptsPublication);
    for (const g of grants) {
      assert.deepEqual(Object.keys(g).sort(), ["fields", "fingerprints", "id"]);
      assert.deepEqual(g.fields, ["title"]); assert.deepEqual(Object.keys(g.fingerprints), ["fields"]); assert.deepEqual(Object.keys(g.fingerprints.fields), ["title"]);
      assert.equal(g.fingerprints.fields.title, conceptsApprovalFingerprint(c, g.id, "title"));
    }
    assert.deepEqual(c.concepts.filter(r => grants.some(g => g.id === r.id)).map(r => r.title).sort(), [...approved].sort());
  }
  assert.deepEqual(publicTitles(c), c.concepts.filter(r => approved.includes(r.title)).map(({ title }) => ({ title })));
});
