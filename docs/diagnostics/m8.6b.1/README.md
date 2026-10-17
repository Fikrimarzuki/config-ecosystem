# M8.6b.1 — Canonical Concepts Publication Contract

**Implemented; ready for explicit title review, with no real authorization activated.** Work is confined to canonical `config-ecosystem` on `main`. Gateway, including its uncommitted M8.6a/b work, is unchanged. No commit, push, deployment, branch switch, history rewrite or M8.6c work occurred.

## Initial state and preservation

| Repository | Initial branch / HEAD | Initial tree | Final tree |
| --- | --- | --- | --- |
| config-ecosystem | `main` / `6f628d8565b9d8b9b3367a61fd25b275b47ae744` | Clean | Nine tracked modifications plus new contract/test/documentation files, unstaged |
| Gateway (read-only) | `master` / `e4183adec10ae147cfa8f85d41526b97a896573b` | Six tracked M8.6b changes and untracked M8.6a/b source/tests/diagnostics | Exactly the same status and file bytes |

No applicable `AGENTS.md` was found in the repositories or checked ancestors. Inspected canonical Concepts/schema/order/build/validation, existing Career grants/fingerprints/reviewer, Origins semantics, generated files, and Gateway M8.6a/b diagnostics, schema, shared fingerprint module and closed public Concepts adapter.

The scratch preflight manifest `/private/tmp/gateway-m86b1/baseline.json` covers 116 canonical files and 1,531 Gateway files, including its existing uncommitted work, generated public data/profile asset and environment-file hashes. [verification.json](verification.json) confirms protected file bytes, Gateway Git status, both branches/HEADs and both unstaged indexes remain as required. No Gateway test, build, config sync or snapshot refresh was run.

## Limitation resolved and contract design

Previously canonical Concepts had only `id`, `title`, `kind`, `order`, with no record/field authority or reviewed-value evidence. Gateway correctly denied all in M8.6b rather than inventing local grants. The new independent source is:

```json
[]
```

This is assembled into optional top-level `conceptsPublication`. Missing declarations are valid legacy input and deny everything. A missing source file assembles to an explicit empty array. All real source/generated declarations are empty in this milestone.

A nonempty grant has precisely the following shape (metavariables, not real review evidence):

```text
{
  id: <concept reference>,
  fields: ["title"],
  fingerprints: { fields: { title: <reviewed sha256 evidence> } }
}
```

[concepts-publication.schema.json](../../../schema/concepts-publication.schema.json) allows only the title field, exact evidence coverage and known property names. It reuses the existing Career schema's ID/fingerprint format definitions; it does not inherit Career permissions. [concepts-publication.mjs](../../../scripts/concepts-publication.mjs) rejects unknown references, repeated grant identities and stale evidence after structural validation. Missing/malformed/unsupported evidence, fields or algorithms reject the entire config; they do not silently publish remaining grants.

A concept/placeholder record, public project/repository, deployment or another permission domain never creates permission. A placeholder would also require an explicit grant for its exact title; none exists here. No private concept inventory or hardcoded names were added to the authority. Project/Career/Origins schemas, permission sources and publication algorithms remain unchanged.

## Fingerprint binding

[concepts-approval-fingerprint.mjs](../../../scripts/concepts-approval-fingerprint.mjs) uses the established Career conventions: SHA-256, exact UTF-8 `JSON.stringify` of a fixed tuple and lowercase `sha256:<64 hex>` output. Concepts has its own versioned domain:

```text
["gateway-concepts-approval-v1", "concepts", "", conceptId, "fields", "title", exactTitle]
```

This binds domain, specific identity, specific field and exact title value. It is distinct from Career/Origins digests even when text is identical. No trimming, Unicode normalization, newline conversion, object-key dependence, timestamp or unrelated metadata is involved. Changing a title's value, whitespace or Unicode representation invalidates the grant. Reassigning the digest to another concept or field also fails. Removed/unknown targets fail; unsupported algorithms, extra evidence and malformed fingerprints fail schema/semantic checks.

The Career fingerprint/checker files and their conventions remain byte-identical; no Career migration or parallel reviewer command was introduced. This is a small dedicated permission domain registered in the existing schema, assembly, validation and reviewer flow. Validation calculates expected evidence solely to compare it; it never installs replacement digests or repairs stale grants.

Fingerprints are drift detection, not signatures or proof of a human reviewer. Explicit owner review and permission-source access remain the authorization boundary. All proof of valid approvals uses synthetic records. No real expected-title fingerprint was generated or stored during this milestone.

## Public projection semantics

Canonical defines authority; Gateway remains responsible for enforcing browser-facing projection. After full validation:

1. Treat valid Concepts grants as a membership set keyed by canonical reference.
2. Iterate canonical `concepts` in its existing order, not grant order.
3. Omit unauthorized records and copy only the canonical title into `{ title }`.
4. Keep IDs, kind, numeric order, internal keys, grant metadata and fingerprints out of the DTO.

No descriptions, status, dates, repository/deployment actions, media, technologies, relationships or invented details are authorized. Empty/missing grants produce `[]`; newly added concepts are not automatically admitted. The test suite contains a normative title-only consumer example exercising those semantics; there is no new generated public catalog or Gateway runtime integration.

The existing raw canonical records remain in the registry files, as they did before. This contract controls consumer publication, not source secrecy or removal of already published history. Their actual source files/content/order are unchanged. No real title becomes active merely because the new authority exists.

## Read-only approval workflow

The existing [review-career-field.mjs](../../../scripts/review-career-field.mjs) now accepts kind `concepts`, category `fields`, target `title`. A synthetic example:

```sh
node scripts/review-career-field.mjs path/to/candidate.json concepts fictionalIdea fields title
```

It prints one private JSON review record: concept reference, current title, expected title fingerprint, current authorization status, valid/stale/invalid/missing evidence, whole-config validity and `candidateOnly: true`. It has no write/activate option. Career's existing command still prints one digest and retains its earlier behavior.

Existing stale Concepts grants are ignored **only in the reviewer's in-memory candidate** to inspect a replacement; ordinary canonical validation/build never discards them. A target with valid evidence is not reported authorized when another grant invalidates the config. Unknown/malformed target content cannot yield a candidate. CLI tests verify the supplied file and directory contents remain unchanged.

The three stages are distinct:

- **Names approved in principle:** Forgebox, Hearthside, Momee, name only.
- **Candidate grant:** exact current reference/title plus a locally reviewed expected digest; calculation alone grants nothing.
- **Active canonical authorization:** a later explicit owner decision installs selected evidence into the dedicated permission source and passes validation/consumer adoption.

No candidate for a real title or real active grant is included in this report. Do not redirect actual private reviewer output to public logs, generated artifacts or commits. See [the approval workflow](../../concepts-publication-approvals.md) for complete instructions and limits.

## Deterministic build and generated changes

The established builder reads `config/concepts-publication.json`, runs its schema and semantic checks, then serializes grants in deterministic reference order. `global.json` cannot bypass the dedicated source. Canonical concept records retain their original `order`/ID rules and sequence; grant serialization order is not presentation order.

`node scripts/build.mjs` (the exact command behind `pnpm build`) succeeded. Generated `config/production.json` and `dist/ecosystem.json` were updated exclusively through that build. They are byte-identical, match two independent `assemble()` serializations, and differ from HEAD only by **`conceptsPublication: []`**. Every existing project/Career/Origins/Concepts record, prior permission list, metadata value and ordering is unchanged. The new source is also exactly `[]`.

`node scripts/validate.mjs` validated production output; a separate `node scripts/validate.mjs dist/ecosystem.json` validated dist. No generated JSON was edited manually. There are no new dependencies, package/lockfile changes or deployment/CI configuration changes.

## Verification results and failures corrected

| Check | Actual result | Evidence |
| --- | --- | --- |
| New focused Concepts publication suite | **55 passed**, no failures/skips | [concepts-tests.log](concepts-tests.log) |
| Full canonical suite, run once | **741 passed / 1 failed**; failure was the pre-existing exact top-level-field expectation | [canonical-tests.log](canonical-tests.log) |
| Affected build test file after explicit new-field expectation update | **23 passed**, no failures/skips | [build-tests-recheck.log](build-tests-recheck.log) |
| Distinct canonical coverage | **All 742 distinct checks verified** across the full run and affected-file recheck; not a claim that the initial full command was entirely green | [test-summary.json](test-summary.json) |
| Career fingerprints/publication, Concepts/order, Origins, project/schema/build regressions | Passed in the full run except the corrected generated-field assertion above | [canonical-tests.log](canonical-tests.log) |
| Canonical build | Exit 0; generated outputs contain explicit empty Concepts grants | [build.log](build.log) |
| Production and dist validation | Both exit 0 | [validate.log](validate.log), [validate-dist.log](validate-dist.log) |
| Determinism / preservation / compatibility | Generated bytes agree, old data unchanged, Gateway untouched; old Gateway rejects new field as expected | [verification.json](verification.json) |
| JavaScript syntax and Git whitespace | `node --check` on the new source modules/reviewer and `git diff --check` pass | Local verification |

Focused tests cover missing/empty declarations; new/unauthorized/placeholder records; one/multiple synthetic title approvals and canonical order; exact tuple/Unicode/newlines; missing/malformed/stale/foreign-field/domain/algorithm evidence; identity transfer, removed/reassigned content; unknown references; unsupported/duplicate grants; no inheritance; read-only valid/stale review; whole-config denial; deterministic source assembly; and real empty declarations.

Initial focused fixture failures were corrected without changing validation: the test used the assembly API with the wrong parameter shape, reused an assessment repository and omitted a source project's required `id`. The first raw run was 51 passed / 4 failed. An intermediate fixture recheck's exact count was not retained. Final focused tests are green. Only a sanitized summary is retained because the early wrong-API test briefly read the real registry; that raw scratch log is not copied into repository evidence. The full-suite correction explicitly extends the exact top-level-field assertion, preserving all older keys; no validation or permission assertion was weakened. Logs redact canonical concept values when existing test names include them.

Commands (canonical checkout; no Gateway test/build commands):

```sh
TMPDIR=/private/tmp node --test test/concepts-publication.test.mjs
TMPDIR=/private/tmp node --test test/*.test.mjs
TMPDIR=/private/tmp node --test test/build.test.mjs
node scripts/build.mjs
node scripts/validate.mjs
node scripts/validate.mjs dist/ecosystem.json
node docs/diagnostics/m8.6b.1/verify.mjs /private/tmp/gateway-m86b1/baseline.json
git diff --check
```

Only one full suite and one canonical CLI build were run. The deterministic check uses in-memory assembly and compares it to generated bytes; it does not rewrite them. The existing Career CLI/fingerprint tests pass, and no real approval activation is part of testing.

## Gateway compatibility requirements

Confirmed read-only by invoking existing validators in memory:

- Gateway's current schema rejects regenerated canonical output because `conceptsPublication` is unknown under `additionalProperties: false`.
- The same input without the new optional field remains valid in Gateway.
- Gateway's actual legacy raw snapshot remains valid under the new canonical schema, with missing Concepts authority denied.
- The Career fingerprint module is byte-identical between repositories.
- Gateway's M8.6b public Concepts projector remains closed; it has not adopted the new contract or rendered names.

A coordinated later **data-layer** update must vendor/register the new ecosystem/Concepts publication schemas and semantic/fingerprint checks, add the optional canonical input type, verify evidence at the public projection boundary, filter in canonical order and copy only `{ title }`. It must preserve missing-field default denial, invalid-remote no-fallback behavior, raw-snapshot integrity and stale-grant rejection even with recomputed checksums. No private selector/evidence may enter public DTOs or diagnostic fixtures.

This is required even for empty grants, before distributing the new canonical shape to that reader. Adoption does not itself require title activation or UI work. Detailed file/behavior requirements are in [Concepts publication approvals](../../concepts-publication-approvals.md#gateway-compatibility-and-adoption). No consumer schema bypass or Gateway edit occurred here.

## Files changed

Existing files:

- `schema/ecosystem.schema.json`: optional independent Concepts publication declaration.
- `scripts/build.mjs`: existing deterministic permission loading/schema/semantic validation/serialization flow extended.
- `scripts/validate.mjs`: new schema registration and semantic checks.
- `scripts/review-career-field.mjs`: Concepts review mode; Career path preserved.
- `test/build.test.mjs`: exact generated-field assertion updated.
- `config/production.json`, `dist/ecosystem.json`: normal generated addition of empty authority.
- `README.md`, `docs/consumers/integration.md`: distinguish raw canonical records from authorized title-only consumer output.

New files: `config/concepts-publication.json`, `schema/concepts-publication.schema.json`, `scripts/concepts-publication.mjs`, `scripts/concepts-approval-fingerprint.mjs`, `test/concepts-publication.test.mjs`, `docs/concepts-publication-approvals.md`, and this diagnostics directory with verifier, sanitized logs/results and report.

## Final acceptance, remaining decisions and Git status

**Verified:** default denial; zero real grants/title activations; valid synthetic approvals; stale/missing/unknown/duplicate/wrong-field/concept/domain/algorithm rejection; exact canonical order; deterministic/consistent generated output; unchanged Career/Origins/projects and existing metadata; read-only reviewer; unchanged Gateway files and uncommitted work; no dependency/deployment changes.

**Owner decisions remaining:** explicitly review exact current canonical references/titles and expected fingerprints before any of the three names receives a grant. Coordinate Gateway authority adoption before distributing the new registry shape. No real grant or consumer/UI change is authorized or performed by this milestone.

The contract is ready for that review. Gateway title publication remains disabled until adoption and later explicit activation. Historical hosted data/caches are not assessed or remediated; fingerprints are not retrospective revocation.

Final canonical state: `main` at `6f628d8565b9d8b9b3367a61fd25b275b47ae744`, nine tracked modifications and the documented new contract/test/docs files, all unstaged. Gateway remains at its initial `master` HEAD/status with all 1,531 protected files byte-identical. No commit, push, deployment, branch switch or M8.6c work.
