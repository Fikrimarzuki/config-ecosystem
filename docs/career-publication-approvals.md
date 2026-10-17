# Career publication approvals

`config/career-publication.json` is the only canonical source of Gateway Career grants. All five real lists remain empty. Public listing is eligibility, never permission. Every independently selected field, technology value or related-project association requires its own reviewed-content fingerprint. Parent and child grants remain independent.

## Contract

A grant keeps its existing identity selector, `fields`, and optional exact `technologies` / `relatedProjects` selections. It additionally requires:

```json
{
  "fingerprints": {
    "fields": {},
    "technologies": {},
    "relatedProjects": {}
  }
}
```

Each map must contain exactly the keys selected in its corresponding array. Each value is `sha256:` followed by 64 lowercase hexadecimal characters. Empty selections require empty maps. A digest for another field, locale, kind, parent, record or technology cannot authorize the current target. Extra entries, unknown targets, unsupported fields, hidden records and absent canonical values are rejected.

For example, a **fictional** work grant selecting `description.id` and `TypeScript` needs a digest under `fingerprints.fields["description.id"]` and one under `fingerprints.technologies["TypeScript"]`. This document intentionally supplies no active real grant or copyable placeholder digest.

## Exact fingerprint calculation

`scripts/career-approval-fingerprint.mjs` implements the shared build-time contract. SHA-256 hashes the UTF-8 encoding of `JSON.stringify` of this fixed seven-element tuple:

```text
["gateway-career-approval-v1", kind, parentId, recordId, category, target, approvedValue]
```

- `kind`: one of the five grant collection names.
- `parentId`: employer ID for work, engagement ID for components, otherwise the empty string.
- `recordId`: exact canonical ID or parent-local child ID.
- `category`: `fields`, `technologies`, or `relatedProjects`.
- `target`: exact field path, technology string or associated project ID.
- Scalar fields use the exact string/number/null value. Description locales are separate scalar targets.
- A repository field uses `[username, repositoryName, repositoryVisibility, derivedHref]`, where `derivedHref` is exactly `https://github.com/${username}/${repositoryName}`. Owner/name/visibility/link changes require new evidence.
- Technologies use the exact selected string. Related-project selections use the exact association ID; their public project metadata and actions are not granted by this digest.

Inputs are validated JSON scalars and fixed-order arrays, not arbitrary objects. There is no object-key-order dependence, whitespace trimming, Unicode normalization, newline conversion, locale fallback, timestamp or whole-record hashing. JSON formatting, selection order and unrelated unapproved field changes do not invalidate unchanged selections. Changes to a selected value, including exact whitespace or Unicode changes, do invalidate that selection.

A version change to this tuple/domain requires an explicit future contract migration. Existing opaque public IDs remain based only on qualified canonical identity, so content reapproval does not rename them.

## Invalidation and failure behavior

Missing, malformed, extra or stale evidence rejects the entire canonical configuration in assembly/validation and in Gateway's projection preflight. The system does not silently strip or refresh a stale grant. Unaffected fingerprints remain valid, but publication/build resumes only after the invalid selection is removed or explicitly reviewed again. This protects narrow approval boundaries while retaining the existing whole-configuration fail-closed behavior.

Gateway independently runs the vendored canonical checker at the public projection boundary, including for already-resolved internal data. Its public DTOs are constructed explicitly and contain neither fingerprints nor raw Career/parent IDs. The schema, checker and fingerprint module must stay byte-identical to canonical source; run Gateway's `scripts/check-career-approval-contract.mjs` against this checkout after coordinating changes.

Remote invalid data does not trigger snapshot fallback. Existing offline snapshots with absent/empty grant lists remain valid and deny all. A snapshot with a stale or missing digest in a nonempty grant fails even when its storage checksum is valid. Normal builds, sync, snapshot refresh and validation never calculate and install replacement approvals.

## Explicit review workflow

1. Review the changed canonical value and applicable sharing permission. Identify the exact record, parent (for a child), category and target. Review owner/name/link together for a repository.
2. Assemble a candidate config. When an existing stale grant prevents assembly, remove that stale selection **and its matching digest** (or remove its whole grant if no selections remain) from `config/career-publication.json`, then run `pnpm build`. Do not edit generated files by hand. Keep unaffected selections/digests.
3. Request a candidate digest with the read-only command. For a **fictional** work item:

   ```sh
   node scripts/review-career-field.mjs path/to/assembled-candidate.json work fictional-work fields description.id fictionalEmployer
   ```

   The final parent argument is required only for `work` / `components`. For a technology, use category `technologies` and its exact quoted value; for an association use `relatedProjects`; for a repository use category `fields` and target `repository`.
4. The command prints one candidate digest and writes nothing. It ignores existing grants only in its temporary in-memory review candidate, validates canonical eligibility and the single requested target, and cannot approve an unsupported field or hidden target. Calculating a digest is not publication permission.
5. After explicit review, manually add the selected target and its returned digest to the dedicated permission source. Ensure all three evidence maps exist and contain exactly the selected targets. Do not batch-refresh other grants.
6. Run `pnpm validate`, `pnpm build`, focused approval tests, and coordinated Gateway tests/build/exposure scan. Review the permission-source diff and generated outputs before committing manually.

## Migration and limits

Absent publication declarations and all-empty lists require no migration. Nonempty legacy grants without fingerprints now fail closed. Migrate one reviewed selected target at a time with the workflow above; there is no automatic grandfathering, fingerprint refresh, or migration that grants permission. All real lists stay empty for M8.4d.

Fingerprints detect drift against reviewed values; they are not signatures, encryption or proof of a particular human reviewer. Someone authorized to edit both content and grant evidence can deliberately reapprove content. Repository permissions and manual review remain the trust boundary. Previously built/deployed artifacts remain static; this build-time protection does not revoke them retroactively. Canonical IDs remain upstream public data, and opaque public IDs are data minimization rather than anonymity. This milestone does not approve any actual Career publication or deployment.
