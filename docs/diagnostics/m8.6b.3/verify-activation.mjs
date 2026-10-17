import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assemble } from "../../../scripts/build.mjs";
import { validateConfig } from "../../../scripts/validate.mjs";
import { conceptsApprovalFingerprint } from "../../../scripts/concepts-approval-fingerprint.mjs";
import { reviewConceptTitle } from "../../../scripts/review-career-field.mjs";

if (!process.argv[2]) throw new Error("Usage: node verify-activation.mjs <preflight-manifest>");
const dir = dirname(fileURLToPath(import.meta.url)), root = resolve(dir, "../../.."), gateway = resolve(root, "../web-gateway");
const baseline = JSON.parse(await readFile(process.argv[2], "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trimEnd();
const config = JSON.parse(await readFile(resolve(root, "config/production.json"), "utf8"));
const grantSource = JSON.parse(await readFile(resolve(root, "config/concepts-publication.json"), "utf8"));
const approved = ["Forgebox", "Hearthside", "Momee"], selected = config.concepts.filter(record => approved.includes(record.title));
assert.equal(selected.length, 3); assert.equal(grantSource.length, 3); assert.deepEqual(config.conceptsPublication, grantSource);
assert.equal(new Set(grantSource.map(g => g.id)).size, 3); assert(validateConfig(config).ok);
for (const grant of grantSource) {
  assert.deepEqual(grant.fields, ["title"]); assert.deepEqual(Object.keys(grant).sort(), ["fields", "fingerprints", "id"]);
  assert.deepEqual(Object.keys(grant.fingerprints), ["fields"]); assert.deepEqual(Object.keys(grant.fingerprints.fields), ["title"]);
  const record = selected.find(c => c.id === grant.id); assert(record, "Unexpected authorized concept");
  assert.equal(grant.fingerprints.fields.title, conceptsApprovalFingerprint(config, record.id, "title"));
  const reviewed = reviewConceptTitle(config, record.id); assert.equal(reviewed.publicationStatus, "authorized"); assert.equal(reviewed.existingEvidence, "valid");
  assert.equal(reviewed.expectedTitleFingerprint, grant.fingerprints.fields.title);
}
// Only validate/project via Gateway imports. Do not run its build/sync/reviewer
// or write its generated data, snapshots, test output or configuration.
const { validateCanonicalConfig } = await import(pathToFileURL(resolve(gateway, "scripts/canonical-snapshot.mjs")));
const { projectPublicEcosystem, resolveCanonicalEcosystem } = await import(pathToFileURL(resolve(gateway, "scripts/public-ecosystem.mjs")));
const publicExpected = selected.map(({ title }) => ({ title }));
const publicDTO = projectPublicEcosystem(resolveCanonicalEcosystem(config));
assert.deepEqual(publicDTO.concepts, publicExpected);
assert.equal(publicDTO.concepts.length, 3); publicDTO.concepts.forEach(c => assert.deepEqual(Object.keys(c), ["title"]));
const serialized = JSON.stringify(publicDTO);
for (const record of config.concepts) assert(!serialized.includes(record.id), "Concept selector leaked");
for (const record of config.concepts.filter(c => !approved.includes(c.title))) assert(!serialized.includes(record.title), "Unapproved title leaked");
for (const token of ["conceptsPublication", "fingerprints", "sha256:", "gateway-concepts-approval-v1"]) assert(!serialized.includes(token), "Publication evidence leaked");
const negatives = [];
for (const [name, mutate] of [
  ["changed title", c => { c.concepts.find(r => r.id === c.conceptsPublication[0].id).title += " (isolated drift)"; }],
  ["cross-concept evidence reuse", c => { const moved = structuredClone(c.conceptsPublication[0]); moved.id = c.conceptsPublication[1].id; c.conceptsPublication = [moved]; }],
  ["wrong selected field", c => { c.conceptsPublication[0].fields = ["status"]; }],
  ["replaced evidence", c => { c.conceptsPublication[0].fingerprints.fields.title = "sha256:" + "0".repeat(64); }],
  ["unsupported extra field", c => { c.conceptsPublication[0].fields.push("description"); }],
  ["unknown concept grant", c => { c.conceptsPublication[0].id = "fictionalUnknownActivation"; }],
  ["unreviewed new concept grant", c => {
    c.concepts.push({ id: "fictionalUnreviewedActivation", title: "Fictional Unreviewed Idea", kind: "concept", order: Math.max(...c.concepts.map(r => r.order)) + 10 });
    const extra = structuredClone(c.conceptsPublication[0]); extra.id = "fictionalUnreviewedActivation"; c.conceptsPublication.push(extra);
  }],
]) {
  const isolated = structuredClone(config); mutate(isolated); assert.equal(validateConfig(isolated).ok, false, `${name}: canonical must reject`);
  assert.throws(() => validateCanonicalConfig(isolated), undefined, `${name}: Gateway must reject`);
  assert.throws(() => projectPublicEcosystem(resolveCanonicalEcosystem(isolated)), undefined, `${name}: no public output`);
  negatives.push({ case: name, canonicalRejected: true, gatewayRejected: true });
}
const ungranted = structuredClone(config);
ungranted.concepts.push({ id: "fictionalPrivateActivation", title: "Fictional Private Idea", kind: "concept", order: Math.max(...ungranted.concepts.map(r => r.order)) + 10 });
assert(validateConfig(ungranted).ok); assert.deepEqual(projectPublicEcosystem(resolveCanonicalEcosystem(ungranted)).concepts, publicExpected);
const production = await readFile(resolve(root, "config/production.json")), dist = await readFile(resolve(root, "dist/ecosystem.json"));
assert(production.equals(dist)); const one = JSON.stringify(assemble(), null, 2) + "\n", two = JSON.stringify(assemble(), null, 2) + "\n";
assert.equal(one, two); assert.equal(one, production.toString("utf8"));
const before = { ...config, conceptsPublication: [] };
assert.equal(hash(JSON.stringify(before, null, 2) + "\n"), baseline["config-ecosystem"].files["config/production.json"], "Unrelated generated canonical content changed");
const { concepts: previousConcepts, ...previousPublic } = projectPublicEcosystem(resolveCanonicalEcosystem(before));
const { concepts: activeConcepts, ...activePublic } = publicDTO;
assert.deepEqual(previousConcepts, []); assert(JSON.stringify(previousPublic) === JSON.stringify(activePublic));
const changed = {};
for (const name of ["config-ecosystem", "web-gateway"]) {
  const repo = resolve(root, "..", name), original = baseline[name]; changed[name] = [];
  for (const [path, digest] of Object.entries(original.files)) if (hash(await readFile(resolve(repo, path))) !== digest) changed[name].push(path);
  assert.equal(git(repo, "branch", "--show-current"), original.branch); assert.equal(git(repo, "rev-parse", "HEAD"), original.head); assert.equal(git(repo, "diff", "--cached", "--name-only"), "");
}
assert.deepEqual(changed["web-gateway"], []); assert.equal(git(gateway, "status", "--porcelain"), baseline["web-gateway"].status.trimEnd());
const expectedChanges = ["README.md", "config/concepts-publication.json", "config/production.json", "dist/ecosystem.json", "docs/concepts-publication-approvals.md", "docs/consumers/integration.md", "test/concepts-publication.test.mjs", "test/concepts.test.mjs"].sort();
assert.deepEqual(changed["config-ecosystem"].sort(), expectedChanges);
const added = git(root, "ls-files", "--others", "--exclude-standard").split("\n").filter(p => !Object.hasOwn(baseline["config-ecosystem"].files, p));
assert(added.every(p => p.startsWith("docs/diagnostics/m8.6b.3/")));
// Diagnostics contain approved titles and pass/fail facts, not real references,
// unapproved titles, digest values or raw permission records.
const forbidden = [...config.concepts.map(c => c.id), ...config.concepts.filter(c => !approved.includes(c.title)).map(c => c.title), ...grantSource.map(g => g.fingerprints.fields.title)];
for (const path of added) { const text = await readFile(resolve(root, path), "utf8"); assert(!forbidden.some(v => text.includes(v)), `Unnecessary private value in new evidence: ${path}`); }
const result = { approvedTitles: activeConcepts.map(c => c.title), activeGrantCount: 3, fieldsPerGrant: ["title"], allCurrentFingerprintsAndReviewerStatesValid: true,
  canonicalAndGatewayValidate: true, publicConceptKeys: ["title"], publicProjectionOnlyApprovedTitles: true,
  isolatedNegativeChecks: negatives, ungrantedNewRecordRemainsPrivate: true, deterministicAssembly: true, generatedFilesByteIdentical: true,
  onlyGeneratedDifference: "conceptsPublication empty -> exactly three title grants", unrelatedCanonicalAndPublicDataUnchanged: true,
  changedExistingFiles: changed, baselineFiles: Object.fromEntries(["config-ecosystem", "web-gateway"].map(n => [n, Object.keys(baseline[n].files).length])),
  gatewayFilesStatusAndGeneratedDataUnchanged: true, priorEvidenceAndUncommittedWorkPreserved: true, algorithmsSchemasAndReviewerUnchanged: true,
  careerOriginsDeploymentAndDependenciesUnchanged: true, branchesHeadsIndexesPreserved: true, newEvidenceHasNoRealSelectorsOrDigests: true };
await writeFile(resolve(dir, "gateway-public-concepts.json"), JSON.stringify(publicDTO.concepts, null, 2) + "\n");
await writeFile(resolve(dir, "verification.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
