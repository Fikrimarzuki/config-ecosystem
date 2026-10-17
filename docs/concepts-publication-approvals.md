# Concepts title publication approvals

## Authority and default denial

Canonical source records are not consumer publication grants. The source `config/concepts-publication.json` is an array; assembly includes it as `conceptsPublication`. Missing source uses `[]`; missing assembled declarations are legacy-compatible and deny all. The empty form remains the default. M8.6b.3 explicitly activates exactly three title-only grants for Forgebox, Hearthside and Momee; no other concept or field is authorized.

A grant has exactly:

```text
{
  id: <canonical concept reference>,
  fields: ["title"],
  fingerprints: { fields: { title: <reviewed sha256 evidence> } }
}
```

This notation is a shape description, not installable evidence. The schema references the existing Career schema's fingerprint format; Concepts' domain and permission semantics are separate. Only `title` is supported. Empty/duplicate/unsupported fields, extra evidence/metadata, malformed fingerprints and duplicate grant identities are rejected. The target must exist in canonical `concepts`. A record's kind, repository visibility, deployment, project identity or another permission domain never confers permission.

A title in a concept or placeholder record needs its own explicit grant; a placeholder is never automatically displayed. This generic contract contains no local inventory of the owner's three potential names and invents no placeholder or title. Validation/build never creates, repairs or refreshes evidence. Missing or stale evidence rejects the whole nonempty declaration/configuration, rather than silently publishing other grants.

## Exact content fingerprint

Use SHA-256 over UTF-8 bytes of `JSON.stringify` of this fixed tuple:

```text
["gateway-concepts-approval-v1", "concepts", "", conceptId, "fields", "title", exactTitle]
```

Output format: `sha256:` followed by 64 lowercase hexadecimal characters. No alternative algorithm or unversioned/foreign domain is supported. The empty parent component and fixed category/target positions match Career's established conventions, while the domain string is distinct from Career and any Origins domain. The existing Career hashing/checking modules remain byte-identical.

Identity, field and exact value are bound together. Even identical title text cannot reuse a digest on another concept. Title changes, including whitespace, case, Unicode normalization or newline differences, invalidate its existing evidence. Removing/renaming the referenced record or using another field's digest also fails. No trimming, normalization, fallback text, timestamp, object-key order or unrelated record metadata participates in this hash. A future algorithm/domain change requires an explicit migration.

Fingerprints detect content drift; they are **not** signatures or proof of a particular person's review. Anyone allowed to edit both source and evidence can deliberately authorize content. Repository access and explicit human review remain the trust boundary.

## Public projection semantics

After full structural and semantic validation, use the valid grant references as a membership set. Iterate canonical `concepts` in its existing order, omit unauthorized entries, and copy only the canonical `title` into a new object:

```json
[{ "title": "Fictional approved title" }]
```

Never serialize canonical IDs, keys, kind, order, grant/evidence data, descriptions, statuses, links, repositories, dates, media, technologies or relationships. Grant-list ordering is deterministic by ID for registry serialization; it does **not** replace canonical Concepts presentation order. An empty/missing grant array yields `[]`; newly added concepts stay unapproved.

This repository defines authority and a tested normative consumer example. It does not emit a second public Concepts catalog or implement Gateway's browser projection. Raw canonical records still exist in generated registry files and repository history; this contract is output minimization, not source secrecy or retroactive withdrawal.

## Read-only review

Use the **existing** review command with kind `concepts`, category `fields`, target `title`. A fictional example:

```sh
node scripts/review-career-field.mjs path/to/candidate.json concepts fictionalIdea fields title
```

Unlike the unchanged Career path (one digest), this path prints one JSON review record containing `conceptReference`, `currentTitle`, `publicationStatus`, `expectedTitleFingerprint`, `existingEvidence`, `canonicalValid`, `candidateOnly`.

- `existingEvidence` reports missing, invalid, stale or valid evidence for the requested reference.
- `publicationStatus` is `authorized` only if the **whole current config** validates and that target has a valid grant. An invalid/stale grant anywhere yields `denied-invalid`; valid evidence for one target cannot hide invalid authorization elsewhere.
- With no active target grant, a valid config reports `not-authorized`. The candidate fingerprint alone grants nothing.
- To calculate a replacement for stale Concepts evidence, the reviewer clears Concepts declarations **in memory only**, validates canonical records/other domains, then calculates the candidate. Normal validation/build never takes that review-only path. Missing/invalid target content or unknown references cannot produce a candidate.

The command writes no files, grants or evidence and has no activation flag. Its output contains private review material: inspect locally, do not redirect real reviews into public artifacts, diagnostics or commits. Do not batch-generate approvals. M8.6b.1 exercised only synthetic review records. M8.6b.3 uses this existing read-only reviewer for the three explicitly authorized real titles; evidence is installed only in the dedicated permission source, not diagnostic dumps.

Owner-approved names in principle, candidate grants and active authorization are separate:

1. The owner identifies the permitted names/scope.
2. Review the exact current canonical reference/title and a candidate fingerprint locally.
3. Only a later explicit approval may place the reviewed grant/evidence in the dedicated source file.
4. Rebuild/validate and coordinate consumer schema, fingerprint and emitted-output checks before any release.

The owner explicitly authorized activation of Forgebox, Hearthside and Momee in M8.6b.3. Their exact source values and expected evidence were reviewed through the existing command before activating the three title-only grants. This document includes no private selectors or fingerprint values. Other fields and records remain unapproved.

## Gateway compatibility and adoption

Gateway M8.6b.2 now vendors the new schema/checkers, verifies evidence and projects title-only records. M8.6b.3 verifies that reader in memory against the active grants while leaving every Gateway file unchanged. Existing Gateway raw snapshots omit the field and remain legacy-compatible/default-deny; this activation does not refresh them or publish a browser build.

The consumer requirements below remain the compatibility contract (implemented by Gateway M8.6b.2):

1. Vendor the new ecosystem and Concepts publication schemas, register the new schema in Ajv, and retain existing Career schema dependencies. Schema compatibility is required even while grants are empty.
2. Adopt/check the pure Concepts semantic/fingerprint modules verbatim or establish equivalent parity. Run structural checks before semantic grants; reject duplicate/unknown/stale/wrong-domain grants consistently across remote, snapshot and explicit checkout paths.
3. Add the optional canonical `conceptsPublication` input type while keeping selectors/fingerprints build-only. Keep public `PublicConcept` exactly `{ title: string }`.
4. Enforce explicit authority at the public projection boundary: independently verify declarations at the public projection boundary, filter in canonical order and copy only titles. No hardcoded private inventory or inferred grants.
5. Keep old snapshot absence valid and denied; do not auto-refresh snapshots or auto-activate real titles. A rechecksummed stale-grant snapshot must still fail. Invalid remote config must not fall back.
6. Exercise synthetic valid/invalid grants, all parity/offline/publication regressions and emitted selectors/evidence/placeholder scans before considering UI integration. Real grants may remain empty through that adoption.

Review and publish canonical changes separately from consumer releases; a local commit does not publish them. Coordinate consumer adoption before distributing the new schema shape. Canonical release preparation does not approve a deployment or modify Gateway's checks/UI. Career and Origins publication behavior remains independent and unchanged. Historical deployments/caches/source copies are not remediated by a build-time contract.
