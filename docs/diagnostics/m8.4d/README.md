# M8.4d — Content-Change Approval Protection

Implemented 2026-10-17 in `/Users/mfm/code/porto-projects/config-ecosystem`, on `main` at `4017dd1e6009d43b2d59f1eb6dbd61a8eedc9116` (`feat: add granular career publication approvals`). The checkout was located after the owner supplied its path; it was clean at inspection. During work, unrelated untracked `.DS_Store` and `assets/.DS_Store` files appeared and were preserved. No branch change, commit, push, deployment or real content approval.

Gateway remained on `master` at `d1476a3`, with uncommitted M8.4c changes. They are preserved; its diagnostics include the initial status and a preservation check. This milestone is intended for review with those changes before one manual commit per affected repository.

## Problem and architecture

A grant previously authorized named fields/values without binding the permission to reviewed content. A later edit to an approved narrative or repository owner/name could retain publication permission silently.

Every selected field, technology and related-project association now requires independent evidence. The existing selectors and narrow field enums are retained; a required `fingerprints` object adds three maps (`fields`, `technologies`, `relatedProjects`) whose keys must exactly equal their corresponding selection arrays. Missing/malformed/extra/stale evidence rejects configuration assembly/validation. Unknown/hidden targets, unsupported fields and missing canonical values remain rejected.

The shared fingerprint contract hashes the UTF-8 `JSON.stringify` encoding of:

```text
["gateway-career-approval-v1", kind, parentIdOrEmptyString, recordId, category, target, approvedValue]
```

The digest is `sha256:` plus 64 lowercase hexadecimal characters. Ordinary fields use exact scalar/null values. Locale strings are separate targets. Technology evidence binds the exact selected string; association evidence binds its selected project ID, not the project's separately public metadata or actions. Repository evidence binds `[username, repositoryName, repositoryVisibility, derivedHref]`. There is no normalization, trimming, newline conversion, timestamp, arbitrary-object serialization or whole-record version.

The canonical checker and schema are vendored into Gateway as before; the new fingerprint module is also byte-identical. There is one approval algorithm, with an explicit parity command rather than separately maintained validation implementations. Gateway retains independent fail-closed enforcement by revalidating current input in its existing projection preflight, including already-resolved internal data. Opaque public IDs and the browser-facing DTO shape are unchanged; evidence/selectors never enter them.

## Invalidation and migration

A selected edit invalidates its digest only. An unchanged locale/technology/field retains valid evidence; unrelated unapproved edits and added unapproved children do not invalidate it or acquire permission. Existing whole-config fail-closed behavior means publication resumes only after every stale selection is removed or explicitly reviewed again. The build does not partially accept an invalid grant document.

Absent publication declarations and all-empty grant lists remain deny-all compatible. Nonempty legacy grants without fingerprints are rejected. There is no automatic grandfathering or migration. All real source and generated grant lists remain empty; `config/career-publication.json`, `config/production.json` and `dist/ecosystem.json` are unchanged after the build.

`node scripts/review-career-field.mjs <assembled-config> <kind> <id> <category> <target> [parent-id]` prints one candidate digest and writes nothing. Tests verify in-memory and file immutability. This explicit review-only command clears old grants solely in its temporary validation candidate, validates the requested field and canonical eligibility, and never installs approvals. Normal validation/build/sync/snapshot paths never refresh evidence.

The future reviewer workflow is fully described in [Career publication approvals](../../career-publication-approvals.md): review the exact value and sharing permission, remove stale selections/evidence to assemble a candidate if needed, calculate one digest, explicitly add only the reviewed selection/evidence to the dedicated source, validate/build, and manually review generated diffs. No real value was reviewed or approved in M8.4d.

## Files changed in this repository

- `schema/career-publication.schema.json`: required fingerprint maps and digest format.
- `scripts/career-publication.mjs`: calls the shared fingerprint check alongside existing semantics.
- `scripts/career-approval-fingerprint.mjs`: versioned tuple hashing and exact evidence coverage checks.
- `scripts/review-career-field.mjs`: explicit read-only single-target reviewer tool.
- `test/career-publication.test.mjs`: existing synthetic approvals bound explicitly; stale-source assembly rejection/no refresh added.
- `test/career-approval-fingerprint.test.mjs`, `test/helpers/career-approval-fixture.mjs`: fictional drift/isolation/canonicalization/reviewer cases.
- `README.md`, `docs/consumers/README.md`, `docs/consumers/integration.md`, `docs/career-publication-approvals.md`: current contract, consumer coordination and review/migration instructions.
- This diagnostics directory: report and verification logs.

Gateway changes include matching vendored contract files, supporting build-only grant types, registration of the new suite, parity tooling, projection/offline tests and exposure evidence. Its Work/Assessments UI and M8.4c work remain unchanged. See Gateway's `docs/diagnostics/m8.4d/README.md` for the full counterpart file list.

## Verification

- **280 relevant canonical tests passed**, zero failures/skips: `node --test test/career-publication.test.mjs test/career-approval-fingerprint.test.mjs test/build.test.mjs test/validate.test.mjs`. See [config-tests.log](config-tests.log). Coverage includes unchanged/changed grants in all five scopes, missing/invalid evidence, independent locales/tags/associations, repository-owner/name changes, parent/child independence, evidence transplantation, hidden/unknown/unsupported targets, source assembly and the read-only reviewer command.
- **Canonical production build passed once**: `node scripts/build.mjs`; full validation ran before output replacement. See [build.log](build.log). All generated output bytes remain unchanged.
- **Scoped ESLint passed**, using Gateway's installed ESLint/config without adding a canonical dependency: `../web-gateway/node_modules/.bin/eslint --config ../web-gateway/eslint.config.mjs scripts/career-publication.mjs scripts/career-approval-fingerprint.mjs scripts/review-career-field.mjs test/career-publication.test.mjs test/career-approval-fingerprint.test.mjs test/helpers/career-approval-fixture.mjs`. See [lint.log](lint.log). Shared Next/React lint settings emit environment notices because this repository is not a React app; there are no lint errors.
- **Node syntax checks passed** for all six touched/new MJS files. See [syntax.log](syntax.log). This repository has no TypeScript project; Gateway's TypeScript check passed separately.
- **Gateway: 111 publication/offline/configuration tests passed**, plus **16 Work/Assessments/navigation source tests**; TypeScript/scoped lint and one fresh-remote production build passed with walking disabled.
- **Contract parity passed** for schema/checker/fingerprint module. **Public artifact scan passed** across 45 artifacts, 159 forbidden patterns, zero findings; all five public Career arrays empty, local canonical and snapshot Career inventory/public projection parity confirmed. No scanner exception was broadened.
- **No new browser run**: M8.4d changes no browser-facing behavior; M8.4c browser evidence remains preserved. No renderer measurements are claimed.
- `git diff --check` passed. No actual grants or canonical Career facts changed.

Dependency setup used the locked pnpm dependencies with network access; no dependency or lockfile edits were needed. An initial synthetic added-child test omitted the existing required description and was corrected; final checks above passed.

## Risks and review status

Ready for manual M8.4d review with Gateway's uncommitted M8.4c changes. Hashes detect content drift; they are not signatures or reviewer authentication. An actor able to edit both content and evidence can deliberately reapprove it; repository permissions and manual review remain the trust boundary. Existing deployed artifacts are not retroactively revoked. Related-project evidence grants only association IDs, not future metadata/actions. Older consumers must update before accepting nonempty fingerprinted grants. All real grants stay empty until a separate explicit publication review. No M8.4e work or deployment is authorized by this milestone.
