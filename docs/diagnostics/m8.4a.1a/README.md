# M8.4a.1a — Canonical Career Publication Contract

Implemented **2026-10-17** on `main`, baseline `3608e4ff6828de6a9394978821e477fcd6ea59c4`. Config-ecosystem initially had no uncommitted changes. Gateway's existing uncommitted M8.4a audit is preserved; no Gateway files are edited. All changes remain unstaged. No branches, commit, push, merge or deployment.

## Contract design and source

[config/career-publication.json](../../../config/career-publication.json) is the dedicated permission source; [career-publication.schema.json](../../../schema/career-publication.schema.json) defines it. The normal build appends optional top-level `careerPublication` to both generated artifacts. It has five independent arrays:

| Grant collection | Canonical target | Identity selector |
| --- | --- | --- |
| `experience` | `career.experience` employer | `id` |
| `work` | Employer's `work` item | `employerId` + local `id` |
| `freelance` | `career.freelance` engagement | `id` |
| `components` | Engagement's `components` item | `engagementId` + local `id` |
| `assessments` | `career.assessments` record | `id` |

Flat grants avoid parent wrappers being mistaken for authorization. Arrays allow explicit detection of duplicate selectors, including conflicting grants for one identity. Selectors use stable canonical IDs, never positions. No new content facts, aliases or employment types are introduced. This repository has JSON Schema/JavaScript contracts, not a separate TypeScript type package; existing Career content schemas are unchanged.

Each grant requires `fields`, an array of allowed scalar/leaf names. It can additionally select exact `technologies` values and, where the record supports it, exact `relatedProjects` IDs. At least one field/value must be selected. Duplicate/unknown grants, fields, values and references fail validation. Build output sorts grants by qualified ID and selection arrays lexically, without changing canonical record ordering.

## Supported fields and intentionally unsupported approvals

| Target | Allowed `fields` values |
| --- | --- |
| Employer | `company`, `role`, `start`, `end`, `country`, `description.en`, `description.id` |
| Work item | `title`, `start`, `end`, `description.en`, `description.id` |
| Engagement | `title`, `role`, `client`, `engagement`, `country`, `start`, `end`, `description.en`, `description.id` |
| Component | `title`, `description.en`, `description.id` |
| Assessment | `title`, `company`, `year`, `description.en`, `description.id`, `repository` |

`description.en` and `description.id` approve only that complete reviewed string, not the other language, instructions in other fields or any containing object. Dates and organization/client attribution are independent fields. An explicitly supplied `end: null` can be approved; absent optional fields cannot. Technology values are selected individually, with exact case, from that specific record; no parent-tag inheritance. Related-project selections must exist on that exact record and target a canonically public project. Components have no relationship field and cannot grant one.

Intentionally unsupported: broad `description`, whole `technologies`/`relatedProjects` field grants, nested `work`/`components`, `assets`/media/galleries, URLs, deployment approvals, arbitrary links, recruitment instructions as a separate field, `summary` (not a canonical Career field), internal visibility metadata, ordering as published content and wildcard grants. Source IDs/listing/parent selectors are build-only routing/eligibility metadata, not implicitly approved display fields. Future media or related-project action permissions need an explicit contract extension; adding canonical data alone does not authorize unsupported fields.

## Default deny and parent/child isolation

**All five checked-in arrays are empty. Zero actual employers, work items, engagements, components or assessments are approved.** Legacy assembled inputs with no `careerPublication` remain valid and mean deny all. If the property exists, all five lists must be structurally present. Legacy source trees without the dedicated file assemble an explicit deny-all object. A `careerPublication` value in `global.json` is rejected so it cannot be silently shadowed by the dedicated source.

`listing: public` is necessary eligibility, never permission. Grants for a hidden record (or a child of a hidden parent) are invalid. A parent may be canonically public yet have no approved fields: its independently approved child is still eligible. Validation neither adds nor inherits any grants.

| Declaration | Required consumer behavior |
| --- | --- |
| Employer field grant only | Release only those fields; no work children |
| Work grant only | Release only child fields/values; no employer label, role, dates or attribution |
| Engagement field grant only | No component content |
| Component grant only | No engagement title, client, role or other parent fields |
| Assessment title only | No company, narrative, technology or repository action |

For an approved child without approved parent attribution, Gateway M8.4a.1b must render it as a standalone item with an opaque, stable public handle and keep the qualified canonical selector in its Node-only mapping. Never place raw `employerId`/`engagementId`, identifying canonical slugs, permission documents or unapproved parent fields into HTML, URLs, DOM attributes or client JSON merely to key the item. The same principle applies to an employer/assessment ID that embeds an unapproved organization name. A handle derived from the qualified ID can preserve stable identity without embedding its text; it is not a promise of anonymity against correlation with this already-public raw registry.

## Link approval behavior

An assessment `fields: ["repository"]` explicitly permits its canonical repository reference and a source URL derived under canonical `username`. The repository must exist and declare `repositoryVisibility: public`; public visibility without the grant authorizes no link. Title/company/narrative grants never include it implicitly. No remote repository probing or runtime GitHub dependency is added.

Career records have no canonical deployments; no deployment URL approval is accepted. Work/employer/engagement/component source links are unsupported because those records have no direct repository field. `relatedProjects` approves **only the association**, not that project's source/deployment actions in Career context; use static related labels until a separate link permission is defined. Existing ordinary-project actions/publication are unchanged.

## Fictional example — not checked-in approvals

This permission fragment assumes matching **fictional**, canonically public records, the named child, locale and technology value exist. It is documentation/test data only:

```json
{
  "experience": [{ "id": "exampleEmployer", "fields": ["company", "role"] }],
  "work": [{
    "employerId": "exampleEmployer",
    "id": "example-work",
    "fields": ["title", "description.en"],
    "technologies": ["TypeScript"]
  }],
  "freelance": [{ "id": "exampleEngagement", "fields": ["title"] }],
  "components": [],
  "assessments": [{ "id": "exampleAssessment", "fields": ["title"] }]
}
```

Removing the employer grant does not revoke or broaden the independent child grant. The engagement's components stay withheld. The assessment has no source action unless `repository` is explicitly added and the canonical public-repository requirement holds. Approval of a description means reviewing its entire selected-language text before enabling that field.

## Validation and generated artifacts

The new schema is registered locally in both assembly and full validation; no schema fetch is required. [career-publication.mjs](../../../scripts/career-publication.mjs) checks qualified IDs, duplicate identities, existing selected fields/values, parent-scoped references, public listing and repository eligibility. `assemble()` rejects invalid permissions, including programmatic fixture assembly, and the normal build still runs full schema/semantic validation on its temporary artifact **before replacing either generated output**. The validator CLI applies the same rules to assembled inputs. No new dependencies.

`config/production.json` and `dist/ecosystem.json` were generated by the normal build, not edited by hand. Their **only semantic change** is the appended five-empty-list `careerPublication` object. They remain byte-identical and match fresh assembly. All prior top-level values are equal to baseline: 33 project registry records (31 public, 2 hidden) and their listing/relationships/deployments, all Career records/IDs/descriptions/listings, Origins, Concepts, identity and version. No permission is enabled; pre-existing raw Career metadata is neither newly copied to Gateway nor made confidential by this permission layer.

## Gateway M8.4a.1b and backward compatibility

This is an **optional additive version-1 property**. Existing tolerant consumers can continue reading their fields; old artifacts without the property deny all. No endpoint, project contract, Career content schema, canonical identity, relationship or deployment mapping changes. New builds emit the property consistently. Consumer guides now describe it and flag the known strict-consumer dependency.

**Verified compatibility risk:** a read-only call to the current Gateway full validator against the new generated artifact fails with `data must NOT have additional properties`. Gateway's vendored ecosystem schema does not recognize `careerPublication`. Therefore do not publish this canonical artifact independently and assume Gateway remains compatible. Coordinate the M8.4a.1b update before a canonical rollout; no commit/push/deployment occurred here.

M8.4a.1b must:

1. Update the vendored root/new permission schemas and types; validate the new contract and qualified references with the same semantics in its existing build-time path. Retain strict validation and treat absent permissions as deny-all.
2. Replace the old parent-wide Gateway Career allowlist behavior with canonical per-record/per-field/per-value grants. Do not union the old broad allowlist into these grants or publish from listing alone. Keep all actual grants empty until explicit owner decisions.
3. Project only approved leaf fields and selected array values into a narrow DTO; keep the raw canonical registry, permissions and revealing selectors out of client/server-rendered payloads. Support child-only records without parent disclosure and preserve canonical identity internally.
4. Preserve existing freshness/offline policy. Invalid remote data must still fail rather than falling back to a stale snapshot. Refresh the complete snapshot through the normal validated process after coordinating schemas; no manual Career reconstruction.
5. Add synthetic projection/isolation/link tests and emitted HTML/RSC/client exposure checks before content integration. Leave UI/geometry/navigation/walking and ordinary project behavior unchanged in the compatibility milestone.

Grants in this minimal contract refer to **current canonical field values**, not immutable text versions; there is no cryptographic reviewed-content pin. Keep review of changes to already-granted narrative/links explicit. Any additional reviewed-content fingerprint/reapproval mechanism belongs in a separately reviewed contract/integration decision, not an inferred approval here. Nothing is currently approved, so this limitation releases no data in this milestone.

## Verification and preserved work

| Check | Result |
| --- | --- |
| Focused publication schema/semantic/source tests | **187 passed** |
| Complete relevant canonical repository regressions | **670 passed**, including the 187 new tests and 483 existing tests; 29.1s |
| `npm.cmd run build` | Passed; normal assembly plus full temporary-artifact validation |
| `npm.cmd run validate` | Passed |
| Generated byte equality / fresh assembly / baseline semantic comparison | Passed |
| Real grants | All five source/output arrays empty |
| Gateway preservation | Existing M8.4a audit and worktree state preserved; no edits |
| Git scope | `main`, HEAD/index unchanged; changes unstaged |

Commands use the existing Node toolchain (`node --test test/career-publication.test.mjs`, `node --test "test/*.test.mjs"`); no browser or unrelated application suites ran. The initial focused run had **185 pass / 2 fail** because two new test assertions matched only `BuildError.message` while the expected specific rejection was stored in `.details`. Both invalid inputs were correctly rejected. Assertions were corrected to inspect the established error structure, and the focused/full runs passed; no unexplained application failure was classified as harmless.

Changed scope: dedicated source/schema/semantic helper/test; root schema registration; build/validate wiring; generated artifacts; one existing output-shape assertion; root/consumer documentation and this report. No canonical Career/project/Origins/Concept source records changed. Stop after M8.4a.1a for review; combined commits remain the owner's manual decision.
