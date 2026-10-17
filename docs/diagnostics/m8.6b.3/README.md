# M8.6b.3 — Canonical Concepts Title Activation

Completed locally on 2026-10-18 (Asia/Jakarta). Exactly three title-only grants are active. The existing M8.6b.1 contract and read-only reviewer are unchanged. No Gateway file or Frontier UI was changed; nothing was committed, pushed or deployed. M8.6c was not started.

## 1. Initial Git state

| Repository | Branch | HEAD | Existing tracked modifications |
| --- | --- | --- | ---: |
| config-ecosystem | main | 6f628d8565b9d8b9b3367a61fd25b275b47ae744 | 9 |
| web-gateway | master | e4183adec10ae147cfa8f85d41526b97a896573b | 7 |

Both trees already contained uncommitted milestone work. Canonical M8.6b.1 schemas, validation, hashing, reviewer, source declaration and tests were present; Gateway M8.6b.2 schema/helper compatibility and public projection were present. Their instructions and diagnostic reports were read before activation. No applicable AGENTS.md was found. No reset, stash, revert or branch switch was performed.

A temporary preflight manifest recorded 132 canonical files and 1,559 Gateway files, including Gateway generated public data and local configuration hashes. That manifest stays outside this diagnostic directory. Existing source records, prior diagnostics, dependency files, schemas and runtime mechanisms were preserved.

## 2. Owner-approved publication scope

The M8.6b.3 brief explicitly authorizes generating content-bound evidence and activating these exact real title fields. This supersedes the earlier milestone's instruction to leave real grants empty. No further approval was required for this scope.

| Approved title | Authorized fields | Grant count |
| --- | --- | ---: |
| Forgebox | title | 1 |
| Hearthside | title | 1 |
| Momee | title | 1 |

Total: **3 grants**, one per approved concept. No descriptions, statuses, links, repositories, deployments, technologies, media, relationships, release dates, timelines or additional records are authorized.

## 3. Exact records and grants

Each approved name existed exactly once, matched the intended canonical record, and had the exact approved spelling. There were no duplicate identities and no active Concepts grants before activation. Every canonical concept source file was byte-identical to the M8.6b.2 preflight manifest, and the three reviewed names/identities matched that milestone's title review. No record was renamed or edited.

Only the dedicated `config/concepts-publication.json` authority source received the three real grants. Each selects exactly `fields: ["title"]` and contains only its required content-bound evidence. Canonical presentation order was preserved. Real references and digest values are intentionally omitted from this report; they belong in the required authority declaration and trusted generated configuration.

## 4. Content-binding verification

Evidence was calculated using the existing canonical domain-separated SHA-256 implementation. Its input binds the established Concepts domain, canonical identity, title field and exact current title bytes. No algorithm, schema, semantic check, reviewer, Gateway hash or automatic approval workflow was introduced or changed.

Before writing grants, the existing read-only reviewer CLI independently returned the expected candidate evidence for each of the three titles. After activation, all three reviewed as `authorized`, with `valid` evidence matching the current canonical values. Raw reviewer output was inspected in memory, not persisted in diagnostics. See [activation-review.json](activation-review.json) for the sanitized review results.

Seven isolated invalid configurations were rejected by both canonical validation and Gateway validation/projection:

1. A changed approved title.
2. Evidence copied to another concept identity.
3. A different selected field.
4. A replaced digest.
5. An unsupported extra field.
6. An unknown concept grant.
7. A fictional new concept carrying copied, unreviewed evidence.

An eighth isolated scenario adds a fictional record without a grant: canonical storage remains valid and the public projection still contains only the approved three titles. Adding a private record is allowed; it does not authorize publication. No real canonical title or record was modified for these checks. Existing synthetic fingerprint tests also cover domain and identity separation and exact-content drift.

## 5. Generated configuration

The established canonical build regenerated `config/production.json` and `dist/ecosystem.json`. They are byte-identical and each contains exactly three title-only Concepts grants. Two independent in-memory assemblies produce identical bytes matching those generated files.

Replacing only `conceptsPublication` with its prior empty array reconstructs the exact preflight generated-file hash. Thus the only generated-data difference is the authority array changing from zero to three grants. All source records, ordinary canonical data, Career grants and Origins data remain unchanged. Generated JSON was not edited manually.

## 6. Gateway compatibility

Gateway's existing M8.6b.2 validators and projection were imported read-only and exercised in memory. The result, in canonical presentation order, is exactly:

```json
[
  { "title": "Forgebox" },
  { "title": "Hearthside" },
  { "title": "Momee" }
]
```

See [gateway-public-concepts.json](gateway-public-concepts.json). Each record has exactly one key, `title`. No concept identity, publication declaration, digest, unapproved title, repository action or private metadata is projected. Non-Concept portions of the public DTO are identical before and after activation.

No Gateway build, synchronization, snapshot regeneration or UI integration ran. Gateway's on-disk public Concepts data remains empty, as at preflight. The in-memory result demonstrates compatibility; it does not represent a refreshed browser artifact or deployment.

## 7. Publication security

Only the three owner-approved titles become eligible for Gateway projection. Missing grants still deny publication; stale or invalid evidence rejects the configuration rather than permitting partial publication. No Career or Origins authority, repository action, deployment configuration, dependency or unrelated mechanism changed.

Trusted canonical generated configuration retains private records, identities and evidence. It must not be serialized directly to browsers. Gateway must continue validating and projecting the public DTO before serialization. This milestone grants no permission to publish raw canonical records, snapshots or history.

The diagnostic privacy check excludes real concept selectors, unapproved names and real digest values from newly added evidence. Test logs are sanitized; raw reviewer output and the private preflight manifests are not included.

## 8. Exact verification results

| Check | Result |
| --- | --- |
| Focused Concepts publication, fingerprint, Concepts semantic, Career publication and Origins tests | 407 tests, 19 suites, all passed; 0 failed/skipped |
| Complete canonical suite, run once | 742 tests, 50 suites, all passed; 0 failed/skipped |
| Established canonical build | Passed |
| Validate generated production configuration | Passed |
| Validate generated dist configuration | Passed |
| Generated parity and deterministic in-memory assemblies | Passed; two assemblies and both outputs identical |
| Current real grants and post-activation reviewer | 3 of 3 valid and authorized |
| Isolated activation security scenarios | 8 passed: 7 invalid-grant rejections and 1 ungranted-record omission |
| Gateway read-only positive projection | Exactly 3 title-only records, in canonical order |
| Preservation | All 1,559 baseline Gateway file hashes and exact Git status unchanged |

The focused 407 tests are included in the full 742; these are not additive counts. Logs: [build](build.log), [production validation](validate.log), [dist validation](validate-dist.log), [focused tests](focused-tests.log), [complete suite](canonical-tests.log). [verification.json](verification.json) records the activation, negative checks, deterministic output and preservation assertions.

The diagnostic verifier can be rerun locally while the temporary preflight manifest remains available:

```sh
node docs/diagnostics/m8.6b.3/verify-activation.mjs /private/tmp/gateway-m86b3/baseline.json
```

It writes sanitized evidence only in this canonical diagnostic directory. It never writes Gateway files. The temporary manifest is a preservation baseline, not an additional production dependency.

## 9. Files changed in this milestone

Eight existing files differ from the initial uncommitted workspace baseline:

- `config/concepts-publication.json`: exactly three approved title grants.
- `config/production.json` and `dist/ecosystem.json`: canonical build output containing those grants.
- `test/concepts-publication.test.mjs`: real-declaration expectations now assert exactly the three approved titles and valid evidence.
- `test/concepts.test.mjs`: synthetic record replacements clear real grants so schema/order fixtures do not inherit real publication authority.
- `README.md`, `docs/concepts-publication-approvals.md` and `docs/consumers/integration.md`: current activation state and Gateway compatibility documentation.

New files are confined to `docs/diagnostics/m8.6b.3/`: this report, sanitized activation review, verifier and its two JSON results, and five sanitized build/test/validation logs. Historical diagnostics and existing negative validation coverage are preserved. No production script, schema, fingerprint implementation or Gateway file was changed by M8.6b.3.

## 10. Remaining risks

Any future title edit invalidates the current evidence and requires a new explicit review; builds do not refresh authority automatically. Future records remain private unless independently approved. The raw canonical registry contains private data and must remain trusted build input. All work remains local and uncommitted; no deployed behavior changed. Gateway's generated data and UI still require the separately authorized integration milestone.

## 11. M8.6c readiness

The canonical authority and existing Gateway reader are ready for a later M8.6c title-list UI integration: three valid grants, deterministic generated input, exact title-only projection and passing rejection checks. M8.6c has not started. No cards, copy, controls, navigation, UI snapshots or browser artifacts were added.

## 12. Final Git status

Branches and HEADs remain exactly as listed in section 1; both indexes remain unstaged and no commit was created. Canonical has 10 tracked modified files: its original nine plus `test/concepts.test.mjs`. All original untracked contract files and M8.6b.1 diagnostics remain; this milestone adds only the M8.6b.3 diagnostic directory. Some activated files were already untracked at preflight, so Git status alone does not describe this milestone's eight-file delta.

Gateway retains exactly its original seven tracked modifications and original untracked M8.6a/M8.6b/M8.6b.2 files, with identical status and bytes. Prior uncommitted work is preserved. No staging, commit, push, deployment or branch switch occurred.
