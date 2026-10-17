# Career, Origins and Concepts

[Documentation](README.md) · [Repository overview](../README.md)

Source layouts, output shapes and validation rules for collections outside the project registry. Shared content and asset fields follow the [project](projects.md) and [asset](assets.md) rules.

## Career

Career content lives in three collections, separate from `projects`:

```text
config/career/
├── experience/<id>.json    # one employer per file: the employment history
├── freelance/<id>.json     # one project-focused engagement per file
└── assessments/<id>.json   # one curated technical assessment per file
```

The output gains a top-level `career` object. Unlike `projects` (an object keyed by ID), each collection is an **array**, and every record **keeps its `id`**. All three arrays are always present, even when empty:

```json
"career": {
  "experience": [],
  "freelance": [],
  "assessments": []
}
```

Rules shared by all collections:

* IDs are camelCase, match the filename, and are unique across all three collections. A career ID can't reuse a project ID.
* `listing` (`public` or `hidden`) is required and works like a project's: it controls portfolio visibility only.
* `description` and `technologies` follow the project rules.
* `relatedProjects` (optional) lists canonical **project** IDs. It is one-directional: projects never point back, and it is not the undirected project `related` field. Unknown IDs and duplicates are rejected.
* Dates are `YYYY-MM` strings. `end: null` means ongoing. When both dates are known, `end` can't be before `start`. No rule depends on today's date.

### The three collections

| Collection | Required | Optional | Generated order |
| --- | --- | --- | --- |
| `experience` | `id`, `company`, `role`, `start`, `end`, `listing` | `country`, `description`, `technologies`, `work[]`, `assets`, `relatedProjects` | `start` ascending, then `id` |
| `freelance` | `id`, `title`, `listing`, `order` | `role`, `client`, `engagement`, `country`, `start`, `end`, `description`, `technologies`, `components[]`, `assets`, `relatedProjects` | `order` ascending, then `id` |
| `assessments` | `id`, `title`, `year`, `listing` | `company`, `description`, `technologies`, `repository` + `repositoryVisibility`, `assets`, `relatedProjects` | `year` descending, then `id` |

* **Experience** is the employment history. `end` is required: a date, or `null` for current employment. A missing `end` is an error, so "current" is never confused with "unknown".
* **Freelance** is a *project-focused grouping*, not an employment type. `engagement` (`freelance`, `contract`, `full-time`, `part-time`) is optional: state it only when it is known, and never infer it from the collection. Consumers choose the section's public title. `order` is a unique positive integer that sets the curated order (gaps such as 10, 20, 30 are fine). Dates are optional, and an `end` without a `start` is allowed.
* **Assessments** use a `year` (integer). `company` (optional text) names the company that set the assessment, so consumers can show it next to the title instead of inside it; omit it when it isn't verified. A repository may be linked only when it is public (`repositoryVisibility` must be `"public"`); it can't be a project's repository or another assessment's.
* `country` is an uppercase ISO 3166-1 alpha-2 code such as `ID` or `AU`.

The build sorts each array by the rule above, never by filename, so the output order is deterministic. Validation rejects an array that isn't in that order.

### Nested work and components

* `experience[].work[]`: pieces of work at that employer. Each has a kebab-case local `id` (unique within the employer), `title` and `description`, plus optional `technologies`, `start`/`end`, `assets` and `relatedProjects`. Known dates must fall within the employer's dates, and ongoing work can't belong to an employment that has ended.
* `freelance[].components[]`: parts of one engagement (for example, five apps in one platform). Each has a kebab-case local `id` (unique within the record) and `title`, plus optional `description` and `technologies`. Components have no assets; the record's own `assets` is the one shared gallery.

Work items and components are **not** canonical projects and never get project records.

### Career assets and privacy

* Career assets use the project asset shape (`icon`, `logo`, `thumbnail`, `cover`, `media[]`) and live in `assets/career/<collection>/<id>/`. Work items use the same folder (subfolders allowed).
* **A hidden career record can't reference assets**, including in its work items. Every committed file is public, so approve images first, then commit them.
* Experience and freelance records have **no** `repository`, `repositoryVisibility`, `deployments` or `url` fields. Assessments have no deployment fields. These are rejected as unknown properties, so private source links and live deployments can't be added.
* `listing: hidden` keeps a record out of portfolio listings but **not** out of the public JSON. Don't commit private client details, end-client identities, screenshots that haven't been approved, internal URLs or confidential information, in any record.

## Origins

The Origins archive is a curated history of early development work (2019–2020), for the Gateway Black Hole and any other consumer. It is **curated, not exhaustive**, and separate from projects and career: an archive entry is never a canonical project, has no destination, and has no presentation fields (geometry, animation, camera). Consumers own all presentation.

```text
config/origins/<id>.json    # one file per archive entry (id must match filename)
```

The output gains a top-level `origins` **array**. Entries keep their `id`, and the array is always present, even when empty:

```json
"origins": [
  {
    "id": "fullStackKanban",
    "title": "Full-Stack Kanban",
    "year": 2020,
    "order": 40,
    "listing": "public",
    "description": { "en": "A full-stack Kanban board with a REST API and Vue client, …" },
    "technologies": ["Node.js", "Express.js", "Vue.js"],
    "repositories": [
      { "name": "kanban", "role": "Server" },
      { "name": "kanban-porto", "role": "Client" }
    ]
  }
]
```

| Field | Rules |
| --- | --- |
| `id` | Required. camelCase, matches the filename, unique across projects, career and origins |
| `title`, `year`, `listing` | Required. `year` is an integer; `listing` is `public` or `hidden` |
| `order` | Required. A unique positive integer that sets the curated order (gaps such as 10, 20, 30 are fine) |
| `description`, `technologies` | Optional; the project rules |
| `repositories` | Optional, at least one item. Each item is `{ "name", "role"? }`: a **public GitHub** repository name (not a URL) under `username`, with an optional role such as `Server`. A repository can appear only once in the archive and can't be a project's or an assessment's repository |
| `relatedProjects` | Optional canonical project IDs, one-directional (as in career) |
| `assets` | Optional, the project asset shape, in `assets/origins/<id>/`. Hidden entries can't have assets |

* The array is sorted by `order` ascending, then `id`, never by year or filename. Validation rejects duplicate `order` values and an array out of that order.
* There are no deployment, link or GitLab fields. Repository URLs are derived like a project's (`https://github.com/<username>/<name>`), and a repository listed here must be public.
* Unknown fields are rejected. Hidden entries are still published in full, like every other record.

## Concepts

Concepts are future project ideas that a consumer (the Gateway Asteroid Field) may show. A concept is **a title only**: no description, features, dates, technologies, repositories or commitments, and it is never a canonical project. Consumers own all presentation.

```text
config/concepts/<id>.json    # one file per concept (id must match filename)
```

The output gains a top-level `concepts` **array**. Concepts keep their `id`, and the array is always present, even when empty (a missing `config/concepts/` folder gives `[]`):

```json
"concepts": [
  { "id": "fictionalIdea", "title": "Fictional Idea", "kind": "concept", "order": 10 }
]
```

| Field | Rules |
| --- | --- |
| `id` | camelCase, matches the filename, unique across projects, career, origins and concepts |
| `title` | A meaningful (non-blank) string |
| `kind` | `concept` (a project idea) or `placeholder` (a slot that is not an idea yet). A semantic distinction, not styling |
| `order` | A unique positive integer. The array is sorted by `order` ascending, then `id` |

All four source fields are required and nothing else is accepted: no `listing`, `status`, `destination`, `description` or `assets`. Raw canonical records remain in the registry; their presence does **not** authorize browser publication.

Gateway Concepts publication is independently controlled by `config/concepts-publication.json`, assembled as optional `conceptsPublication`. Absence or `[]` denies all; each permitted title needs an exact, domain-separated content fingerprint. Initially only `title` can be selected. A consumer must validate all declarations before producing title-only `{ "title": "..." }` records, filtering in canonical order and omitting selectors/kind/order/evidence. Exactly three title-only grants are active for Forgebox, Hearthside and Momee; no other concept or field is authorized. See [Concepts publication approvals](concepts-publication-approvals.md) for the contract, read-only reviewer and coordinated Gateway adoption requirements.

Canonical files and repository history remain publicly accessible. Publication permissions constrain consumer output; they do not encrypt source records or retract earlier copies. Do not commit confidential content.

## Career publication approvals

Every nonempty Career grant now requires independently reviewed fingerprints for its selected fields and values. Missing or stale evidence rejects validation; normal builds never refresh it. See [Career publication approvals](career-publication-approvals.md) for exact canonicalization, explicit reviewer commands, fail-closed migration and Gateway compatibility. All real grants remain empty.
