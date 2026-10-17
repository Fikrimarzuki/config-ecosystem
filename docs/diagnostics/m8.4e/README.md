# M8.4e — Career Content Approval Review

Prepared 2026-10-17. **Review proposal only: no Career content or approval evidence was activated.** All five real grant lists and all five public Career collections remain empty.

## Executive summary and artifact handling

The review covers all current canonical Career parents and children. The detailed owner report is intentionally local, outside both repository roots and outside Gateway application/public/build directories, because identifiers, affiliations and review notes may identify confidential work. It contains per-record inventory, 260 independently assessed field/value decisions, the initial proposal, concerns and the explicit approval checklist. It omits source description prose. The owner receives its local path in the completion message.

This sanitized summary is the only new repository file. It contains no raw Career record IDs, employer/client labels, assessment repository names, source narratives, real approval digests or grant objects. The local directory is 0700 and its report/evidence files are 0600; these are access controls, not encryption. No broad ignore rule or repository permission change was made.

## Verified inventory and classification

| Review group | Records | Candidate | Needs Review | Keep Private |
| --- | ---: | ---: | ---: | ---: |
| Employment Experience | 5 | 4 | 1 | 0 |
| Freelance & Engagements | 7 | 0 | 6 | 1 |
| Selected Work: nested work items | 12 | 0 | 12 | 0 |
| Selected Work: engagement components | 8 | 0 | 8 | 0 |
| Technical Assessments | 7 | 0 | 7 | 0 |
| **Total** | **39** | **4** | **34** | **1** |

There are **19 parent records** and **20 children**, counted once each. Counts match the 19 modular source files, assembled config and dist artifact. All parents declare public canonical listing, but listing does not grant Career publication. Children have independent approval boundaries. Thirty-seven records have EN description leaves; no Indonesian (`id`) description is supplied, and two components lack descriptions. There are 116 individual technology values on 24 records, one declared related-project association and five public assessment repository declarations; two assessments have no repository. No Career assets or deployments are supplied.

Candidate means suitable for consideration subject to explicit owner approval and any necessary permission. It never means approved or suitable for whole-record publication. Insufficient permission evidence is classified Needs Review. One engagement has explicit confidentiality language and is recommended Keep Private on current information.

## Recommended initial scope and deferred fields

Propose only four employment identities already represented in Gateway's selected public profile, with `company`, `role`, `start` and `end` assessed separately: **16 possible field approvals**. Existing public profile presence is context, not authorization. The owner must confirm each exact canonical value and attribution permission. One canonical role label differs in wording from the public profile; resolve that content-consistency decision explicitly without silently changing either source. Confirm ongoing status again when approval is actually considered.

Defer all descriptions, countries, employer-associated technologies, engagements, selected work/children, assessments, related-project associations and repository links from initial activation. The private report lists exact IDs/values and decisions for every available supported field/value. Missing fields/locales remain absent. No unsupported selector, client, employment type, translation, outcome, source URL or parent attribution is invented.

## Confidentiality and repository concerns

Commercial/client systems, internal educational tools, operational/camera/location features and recruitment submissions need explicit sharing confirmation. The record with a confidentiality marker remains withheld. An earlier document-management exclusion question is unresolved and remains Needs Review with a publication hold; the review does not invent an identity match or a definitive restriction.

All seven assessments require confirmation of summary/title/year permission, setter attribution and submission/source sharing independently. A canonical public repository flag does not establish sharing rights, actual accessibility, ownership or permission to publish recruitment materials. No repository contents, licenses, hiring terms or agreements were fetched or verified. Assignment/test materials, credentials and evaluation results are not proposed for disclosure. No repository is inferred for the two source-less assessments.

The single public-project relationship authorizes nothing until separately approved; even a future association approval would not authorize source/deployment actions or parent attribution. Raw canonical metadata is already an upstream public source under the existing architecture. Gateway filtering does not make it confidential upstream; any upstream redaction/history decision needs separate owner review.

## Fingerprint approval readiness

The M8.4d contract was inspected and rechecked with fictional fixtures. It binds exact selected content to kind, qualified identity, category and target. Missing, malformed, extra or stale evidence rejects configuration. Locale strings and technology values remain independent; parent/child grants do not inherit approval. Repository evidence includes canonical owner/name/visibility/derived URL. An invalid selection blocks the whole config until removed or explicitly re-reviewed; unchanged selections retain valid evidence.

Build/sync/snapshot paths do not install refreshed approvals. The explicit reviewer command is read-only, prints one candidate digest and does not grant permission. Its actual-record path was not invoked in this milestone. Contract files match Gateway byte for byte. Public DTO construction omits raw Career selectors and evidence. No blocking security gap was identified in the inspected paths; this is a focused review, not a complete security audit or a legal determination.

After a future explicit owner decision:

- Confirm the exact record and individual values privately, including attribution/sharing permission and any wording/date discrepancy.
- Review complete locale strings and each selected technology/association separately; do not infer inherited approval or safe substrings.
- For any later repository proposal, review source-sharing permission and exact owner/name/visibility/derived URL together.
- Only then calculate one candidate digest with the existing reviewer tool; manually add only the approved selection and matching evidence to the dedicated source.
- Validate/build and review the concrete canonical/Gateway public projection and exposure results before any separately authorized commit or deployment. Never batch-refresh evidence to make stale grants pass.

No step of this future activation workflow was applied to real records here.

## Gateway readiness and documented gaps

Existing renderers support partial Experience, engagements, independent Selected Work/components and assessments; missing titles, ID-only fallback labels, individual supplied technologies, locale language tags, opaque IDs and empty arrays. Assessments accepts only the supplied approved repository object. Proposed basic employment fields already render through the existing Work panel.

Two non-blocking future presentation omissions were found: an approved engagement-type enum is projected but not displayed by Work; approved assessment related-project associations are projected but intentionally omitted by Assessments. Neither field currently appears in the relevant real records, and neither is in the proposed first scope. No UI change is needed for that scope. Independent children intentionally remain flat without inferred parent attribution; relationship IDs intentionally grant no external action.

## Preflight, focused verification and preservation

- Gateway remained on `master`, HEAD `d1476a3`, with the pre-existing M8.4c/M8.4d changes (46 files captured).
- Canonical remained on `main`, HEAD `4017dd1`, with the pre-existing M8.4d changes and two unrelated `.DS_Store` files (19 files captured).
- No applicable AGENTS.md instructions were found in the checked repositories/ancestors. Existing M8.4a/b/c/d diagnostics and current schema, checker, reviewer, projection and UI sources were read.
- Fresh focused checks: **16 canonical fingerprint/reviewer tests**, **17 Gateway fingerprint/projection/offline tests**, and **12 Work/Assessments render tests** passed. All approved populated fixtures are fictional.
- Read-only validation/in-memory assembly confirmed modular-source/assembled/dist parity, five-empty-list grants, and parity between the generated public DTO, canonical projection and validated offline snapshot projection.
- All **46 Gateway** and **19 canonical** pre-existing modified/untracked files remained byte-identical. The tracked diffs and HEADs remained unchanged. All **129 existing public/generated/build files** remained byte-identical; no public artifacts were added or removed. No grant source, Career source, generated canonical output, snapshot, generated public DTO or runtime source was changed.
- No build, sync, snapshot refresh, browser run, actual-record reviewer invocation or real approval fingerprint generation was needed. Local test/state/preservation logs are kept with the private report. File-preservation hashes are integrity checks, not approval evidence.
- No reset, stash, revert, branch switch, commit, push, deployment or M8.5 work occurred. Unrelated metadata files were preserved.

Focused commands:

```sh
# config-ecosystem
node --test test/career-approval-fingerprint.test.mjs
# web-gateway
node --test tests/career-approval-fingerprint.test.mjs
node node_modules/@playwright/test/cli.js test --config playwright.unit.config.ts tests/career-work.spec.ts tests/career-assessments.spec.ts
node scripts/check-career-approval-contract.mjs ../config-ecosystem
```

M8.4e is ready for owner review of the proposal. It does not approve publication. Sharing permissions, exact field choices and the initial scope remain owner decisions. Fingerprints detect drift, not reviewer identity or permission; upstream metadata is already public, and previously deployed artifacts are not revoked. Existing deployment restrictions remain unresolved and unchanged. All remaining M8.4 work stays uncommitted for the owner's combined review.
