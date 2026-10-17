import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assemble } from "../../../scripts/build.mjs";
import { validateConfig } from "../../../scripts/validate.mjs";

if (!process.argv[2]) throw new Error("Usage: node verify.mjs <preflight-manifest>");
const dir = dirname(fileURLToPath(import.meta.url)), root = resolve(dir, "../../.."), gateway = resolve(root, "../web-gateway");
const baseline = JSON.parse(await readFile(process.argv[2], "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trimEnd();
const changed = {};
for (const name of ["config-ecosystem", "web-gateway"]) {
  const repo = resolve(root, "..", name), before = baseline[name]; changed[name] = [];
  for (const [path, digest] of Object.entries(before.files)) if (hash(await readFile(resolve(repo, path))) !== digest) changed[name].push(path);
  assert.equal(git(repo, "branch", "--show-current"), before.branch); assert.equal(git(repo, "rev-parse", "HEAD"), before.head);
  assert.equal(git(repo, "diff", "--cached", "--name-only"), "");
}
assert.deepEqual(changed["web-gateway"], []);
assert.equal(git(gateway, "status", "--porcelain"), baseline["web-gateway"].status.trimEnd());
const expected = ["README.md", "config/production.json", "dist/ecosystem.json", "docs/consumers/integration.md", "schema/ecosystem.schema.json", "scripts/build.mjs", "scripts/review-career-field.mjs", "scripts/validate.mjs", "test/build.test.mjs"].sort();
assert.deepEqual(changed["config-ecosystem"].sort(), expected);
const source = JSON.parse(await readFile(resolve(root, "config/concepts-publication.json"), "utf8")); assert.deepEqual(source, []);
const bytes = await readFile(resolve(root, "config/production.json")), dist = await readFile(resolve(root, "dist/ecosystem.json"));
assert(bytes.equals(dist), "Generated files differ");
const first = JSON.stringify(assemble(), null, 2) + "\n", second = JSON.stringify(assemble(), null, 2) + "\n";
assert.equal(first, second, "Assembly is nondeterministic"); assert.equal(first, bytes.toString("utf8"), "Generated files are stale");
const config = JSON.parse(bytes), prior = JSON.parse(git(root, "show", "HEAD:config/production.json"));
assert(validateConfig(config).ok); assert.deepEqual(config.conceptsPublication, []);
const { conceptsPublication, ...existing } = config;
assert(JSON.stringify(existing) === JSON.stringify(prior), "Existing canonical data/ordering changed");
assert(Object.values(config.careerPublication).every(grants => grants.length === 0));
const { validateCanonicalConfig, readSnapshot } = await import(pathToFileURL(resolve(gateway, "scripts/canonical-snapshot.mjs")));
let gatewayRejectsNewShape = false;
try { validateCanonicalConfig(config); } catch { gatewayRejectsNewShape = true; }
assert(gatewayRejectsNewShape, "Compatibility assessment must reflect old Gateway rejection");
assert.equal(validateCanonicalConfig(existing), existing);
const snapshot = await readSnapshot(); assert(validateConfig(snapshot.config).ok, "Legacy snapshot compatibility changed");
const canonicalCareer = await readFile(resolve(root, "scripts/career-approval-fingerprint.mjs"));
assert.equal(hash(canonicalCareer), baseline["config-ecosystem"].files["scripts/career-approval-fingerprint.mjs"]);
assert(canonicalCareer.equals(await readFile(resolve(gateway, "scripts/career-approval-fingerprint.mjs"))));
const untracked = git(root, "ls-files", "--others", "--exclude-standard").split("\n");
assert(untracked.every(path => path.startsWith("docs/diagnostics/m8.6b.1/") || ["config/concepts-publication.json", "schema/concepts-publication.schema.json", "scripts/concepts-approval-fingerprint.mjs", "scripts/concepts-publication.mjs", "docs/concepts-publication-approvals.md", "test/concepts-publication.test.mjs"].includes(path)));
const secretValues = config.concepts.flatMap(c => [c.id, c.title]).concat([...Object.values(config.career).flat(), ...config.origins].flatMap(c => Object.values(c.description ?? {})));
const approvedNames = new Set(["Forgebox", "Hearthside", "Momee"]);
for (const path of untracked) {
  const text = await readFile(resolve(root, path), "utf8");
  assert(!secretValues.filter(v => !approvedNames.has(v)).some(v => text.includes(v)), `Private record value in new source/evidence: ${path}`);
}
const result = {
  branchesHeadsAndIndexesPreserved: true, baselineFiles: Object.fromEntries(["config-ecosystem", "web-gateway"].map(name => [name, Object.keys(baseline[name].files).length])),
  changedExistingFiles: changed, gatewayStatusAndFilesByteIdentical: true, generatedFilesByteIdentical: true, deterministicAssembly: true,
  onlyGeneratedAddition: "conceptsPublication: []", allExistingRecordsOrderingAndMetadataUnchanged: true, realConceptsGrants: conceptsPublication.length,
  realCareerGrantsEmpty: true, careerFingerprintContractByteIdentical: true, noDeploymentOrDependencyChanges: true,
  gatewayRejectsNewShape, gatewayAcceptsLegacyShape: true, legacySnapshotRemainsValid: true,
  newFiles: untracked, newSourceAndEvidencePrivateValueScan: "No real concept references, unapproved titles, narratives or real approval evidence copied",
};
await writeFile(resolve(dir, "verification.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
