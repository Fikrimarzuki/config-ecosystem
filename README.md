# Ecosystem Config

Central configuration and project registry for my personal developer ecosystem.

This repository acts as the **single source of truth** for shared public configuration used across my projects, including repository mappings, deployments, domains, and project relationships.

## Why?

My projects are spread across multiple GitHub repositories and deployments, but many of them link to each other.

Instead of hardcoding values such as:

```text
https://play.fikrimarzuki.work
https://page-layr.fikrimarzuki.work
https://tinyverse.fikrimarzuki.work
```

inside multiple applications, those applications can consume this shared configuration.

When a shared value such as the primary domain changes, it can be updated here and propagated to dependent projects.

## Naming Layers

The ecosystem intentionally separates three concepts:

```text
GitHub repository → Deployment → Public domain
```

Example:

```text
game-tinyverse → tinyverse → tinyverse.fikrimarzuki.work
```

GitHub repository prefixes describe what a repository is internally and are not automatically exposed through deployment names or public URLs.

## Shared Configuration

Common values are defined once:

```json
{
  "version": 1,
  "username": "Fikrimarzuki",
  "domains": {
    "primary": "fikrimarzuki.work"
  }
}
```

Project URLs and repository URLs can then be derived from this configuration.

For example:

```text
username   = Fikrimarzuki
repository = app-playdeck

→ github.com/Fikrimarzuki/app-playdeck
```

```text
subdomain      = playdeck
primary domain = fikrimarzuki.work

→ playdeck.fikrimarzuki.work
```

### Profile and ecosystem identity

Two optional objects in `config/global.json` carry shared identity. They are additive: `version`, `username`, `domains` and `projects` are unchanged.

```json
{
  "profile": {
    "name": "Fikri Marzuki",
    "links": {
      "github": "https://github.com/Fikrimarzuki"
    }
  },
  "ecosystem": {
    "name": "FM Work"
  }
}
```

* `profile` is the personal identity of the owner. `name` is required; `title` (a non-blank string) and `email` (a valid email address) are optional. `links` holds the canonical social links, keyed by platform (`github`, `linkedin`, `website`, or any other key). Each value must be an absolute `https://` URL. New platforms need no schema or code change; add only links that really exist.
* `ecosystem` is the shared brand identity (`name` is required), separate from the person.

Consumers (Gateway, CV, Support, ...) should read these fields instead of hardcoding names and social URLs, and render whichever links are present. Content that only one app needs (page copy, layout, labels) stays in that app. To change shared metadata, edit `config/global.json`, run `pnpm build`, and commit the regenerated files.

## Project Model

A project defines its repository and one or more deployments.

```json
{
  "name": "Playdeck",
  "status": "active",
  "listing": "public",
  "destination": "platforms",
  "repository": "app-playdeck",
  "repositoryVisibility": "private",
  "deployments": {
    "main": {
      "name": "playdeck",
      "subdomain": "playdeck"
    }
  }
}
```

Using deployments separately from repositories allows the registry to represent projects where:

* one repository has one deployment;
* multiple projects share a repository;
* one project/repository has multiple deployments;
* a repository has no public deployment.

Every project requires `name`, `status`, `listing` and `destination`:

| Field         | Allowed values                                |
| ------------- | --------------------------------------------- |
| `status`      | `active`, `paused`, `completed`, `archived` |
| `listing`     | `public`, `hidden`                            |
| `destination` | see [Destinations](#destinations)             |

Values that consumers parse strictly are validated to match (the Gateway's parser rejects anything else):

* Project IDs are camelCase (`pageLayr`), like every other collection's IDs.
* `name`, `path`, deployment keys, `profile.name` and `profile.title` have no leading or trailing whitespace.
* `repository` is a bare GitHub repository name (letters, digits, `.`, `_`, `-`), never a URL or `owner/name`. The same rule applies to assessment and origins repositories.
* A deployment `name` is a lowercase slug (`page-layr`), because consumers use it as a public identifier (Support's `?project=`).
* `username` is a GitHub username (letters, digits and `-`).

`repository`, `path`, `related` and `deployments` are optional. A project with no registered repository omits `repository`; a project with no registered live deployment omits `deployments` (never an empty object or empty `subdomain`). A deployment on the root domain uses `"subdomain": null` and may list extra subdomains in `aliases` (e.g. `["www"]`).

### Deployment URLs

Each deployment has `name` plus **exactly one** of `subdomain` or `url`:

| Form | Example | Resolved public URL |
| --- | --- | --- |
| `subdomain` | `"subdomain": "playdeck"` | `https://playdeck.<domains.primary>` |
| `subdomain: null` | `"subdomain": null` | `https://<domains.primary>` (apex) |
| `url` | `"url": "https://fikrimarzuki.github.io/lab-css-tricks/"` | the `url`, exactly as written |

* Use `subdomain` for anything served under the primary domain. Use `url` for an externally hosted deployment such as GitHub Pages.
* A `url` must be an absolute `https://` URL. It is stored and published unchanged, so its path and trailing slash are preserved. Credentials and `#fragments` are rejected.
* `aliases` only apply to `subdomain` deployments; they are rejected with a `url`.
* A `url` on the primary domain (or any of its subdomains) is rejected: use `subdomain` there, so hostname collisions are still detected. Two deployments can't share a `url` (a trailing slash or letter case in the host doesn't make it different), and deployment `name`s stay unique across both forms.
* Consumers must resolve a deployment's URL as `url` when present, otherwise from `subdomain` and `domains.primary`.

### Independent facts

Each field describes one thing, and none implies another:

* `status`: the project's lifecycle.
* `listing`: whether the project appears in ecosystem listings. `listing: public` does not mean the source code is public.
* `repositoryVisibility`: whether the GitHub repository in `repository` can be publicly accessed (`public` or `private`). It is required when `repository` is set and not allowed otherwise. It describes the repository, not whether the project is listed, and `public` does not mean a deployment exists.
* `deployments`: the registered live deployments.
* `destination`: where the project lives in the Gateway universe. It says nothing about status, listing or visibility.

Projects that share a repository must declare the same `repositoryVisibility`.

### Destinations

Every project has exactly one primary Gateway destination, a single string:

| Kind | Values |
| --- | --- |
| Main | `games`, `learning`, `tools`, `products`, `platforms`, `career`, `labs` |
| Special | `central-station` (Gateway and this registry), `sun` (CV), `moon` (Support) |

Black Hole (origins archive) and Asteroid Field (future concepts) are not project destinations; they will come from separate collections. Latest Builds is a dynamic Gateway section, not a destination.

The destination is canonical data. How a destination is drawn, named and ordered stays in each consumer.

### Related projects

`related` lists the canonical IDs of related projects:

```json
{
  "related": ["nikahyuk"]
}
```

* Every ID must exist in `config/projects/`. A project can't list itself, and an ID can't appear twice.
* A relationship is **undirected** and declared **once**, on either of the two projects. Declaring it on both is rejected as a duplicate, so the two sides can never drift apart. Consumers that show relationships should check both directions.
* There are no relationship types. Add `related` only for a real, meaningful link; leave it out otherwise (an empty list is rejected).

### Project content

A project file in `config/projects/` can carry reusable content. Every field below is optional, and projects without them stay valid.

```json
{
  "tagline": {
    "en": "Presentations you can play.",
    "id": "Presentasi yang bisa dimainkan."
  },
  "description": {
    "en": "Turn presentations into interactive worlds.",
    "id": "Ubah presentasi menjadi dunia interaktif."
  },
  "technologies": ["React", "TypeScript", "Phaser"],
  "tags": ["presentation", "interactive", "education"],
  "links": {
    "documentation": "https://example.com/docs"
  }
}
```

(Illustrative values. `playdeck` currently has only the fields that its repository confirms.)

* **Localized text** (`tagline`, `description`): an object with `en` (required) and `id` (optional). Other locale keys are rejected, and empty or whitespace-only text is rejected. Falling back to English when `id` is missing is a convention for consumers to implement; this repository stores the data and does not resolve locales.
* **`technologies`**: display names such as `"Next.js"`, kept in the order given. They are free-form, but duplicates are rejected ignoring case (`React` and `react`). There is no central technology registry.
* **`tags`**: lowercase kebab-case identifiers (`live-demo`) for grouping and filtering, kept in the order given, with no duplicates. Use technologies for what a project is built with and tags for what it is about. There is no category hierarchy.
* **`links`**: extra project links such as `documentation` or `figma`, keyed by a lowercase name, each an absolute `https://` URL. Don't add the repository or the live site here. The repository URL comes from `username` + `repository`, and deployment URLs come from `subdomain` + `domains.primary`, so repeating them would create a second copy that can drift out of sync.
* A present `technologies`, `tags` or `links` can't be empty; leave it out instead.

To add content to an existing project, edit `config/projects/<id>.json`, run `pnpm build`, and commit the project file together with the regenerated `config/production.json` and `dist/ecosystem.json`. Only add what you can verify.

### Assets

Shared files (resume, logos, avatar, project images) live in this repository under `assets/` and are referenced by repository-root-relative path. Everything is optional, and no project is required to have assets.

```text
assets/
├── profile/              # profile.assets
├── ecosystem/            # ecosystem.assets
└── projects/<projectId>/ # that project's assets
```

```json
"profile": {
  "assets": {
    "resume": "assets/profile/cv.pdf",
    "logo": "assets/profile/logo.png",
    "avatar": "assets/profile/avatar.jpg"
  }
},
"ecosystem": {
  "assets": { "logo": "assets/ecosystem/logo.png", "icon": "...", "banner": "..." }
}
```

```json
"assets": {
  "icon": "assets/projects/playdeck/icon.png",
  "logo": "assets/projects/playdeck/logo.svg",
  "thumbnail": "assets/projects/playdeck/thumbnail.webp",
  "cover": "assets/projects/playdeck/cover.jpg",
  "media": [
    {
      "type": "image",
      "src": "assets/projects/playdeck/shot-1.png",
      "alt": { "en": "The Creator editor", "id": "Editor Creator" }
    }
  ]
}
```

The second block is a project file example; `playdeck` has no assets yet.

Rules checked by `pnpm build` and `pnpm validate`:

* Paths start with `assets/` and use `/`. URLs, absolute paths, backslashes, `..` and leading-dot segments are rejected. Use only letters, digits, `.`, `_` and `-` in file and folder names.
* A path must stay in its owner's folder: `assets/profile/`, `assets/ecosystem/`, or `assets/projects/<projectId>/`.
* The file must exist, with exactly the same letter case (so a path that works on Windows can't break on Linux CI).
* `resume` must be a `.pdf`. Every other asset must be `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.avif` or `.gif` (lowercase extension).
* `media` entries are `{ "type": "image", "src", "alt" }`. `alt` is localized text like `description` (English required).

Commit the asset files together with the config that references them. Consumers receive paths only; this repository doesn't host or transform the files.

## Monorepo / Shared Repository Projects

Some projects may share the same repository.

For example, prototype projects can reference `lab-projects` while identifying their own path within that repository.

```json
{
  "name": "Foodie Map",
  "status": "paused",
  "listing": "public",
  "destination": "products",
  "repository": "lab-projects",
  "repositoryVisibility": "private",
  "path": "foodie-map",
  "deployments": {
    "main": {
      "name": "foodie-map",
      "subdomain": "foodie-map"
    }
  }
}
```

`path` rules:

* It requires `repository`.
* It is relative to the repository root, with `/` between segments, and may be nested (`apps/web`).
* Rejected: a leading `/` or a drive letter (`C:/...`), backslashes, empty segments (`a//b`, a trailing `/`), and `.` or `..` segments.

## Multiple Deployments

A project can expose multiple deployments.

For example, an ecosystem such as Neuran may contain:

```text
Neuran
├── Main
├── Admin
├── LMS
├── Skill
└── Social
```

Each deployment can have its own public subdomain while still belonging to the same project.

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
  { "id": "forgebox", "title": "Forgebox", "kind": "concept", "order": 10 },
  { "id": "comingSoon", "title": "Coming Soon", "kind": "placeholder", "order": 40 }
]
```

| Field | Rules |
| --- | --- |
| `id` | camelCase, matches the filename, unique across projects, career, origins and concepts |
| `title` | A meaningful (non-blank) string |
| `kind` | `concept` (a project idea) or `placeholder` (a slot that is not an idea yet). A semantic distinction, not styling |
| `order` | A unique positive integer. The array is sorted by `order` ascending, then `id` |

All four fields are required and nothing else is accepted: no `listing`, `status`, `destination`, `description` or `assets`. Every concept is therefore public. Because the whole file is published, only commit a title you are happy to have public, and add nothing that implies a plan or release date.

## Repository Structure

```text
config-ecosystem/
├── .github/
│   ├── consumers.json           # automation metadata (not part of the config)
│   └── workflows/
│       └── validate.yml
├── docs/
│   └── consumers/               # consumer integration guides
├── config/
│   ├── global.json              # global config: version, username, domains, profile, ecosystem
│   ├── production.json          # generated — assembled consumer output (committed)
│   ├── projects/
│   │   ├── gateway.json
│   │   ├── playdeck.json
│   │   └── ...                  # one file per project (id must match filename)
│   ├── career/                  # see Career
│   │   ├── experience/          # one file per record (id must match filename)
│   │   ├── freelance/
│   │   └── assessments/
│   ├── origins/                 # see Origins; one file per entry (id must match filename)
│   └── concepts/                # see Concepts; one file per concept (id must match filename)
├── assets/
│   └── profile/                 # shared files; see Assets
├── dist/
│   └── ecosystem.json           # generated — identical copy; the canonical target for new consumers
├── schema/
│   ├── ecosystem.schema.json    # assembled config; references the project, career and origins schemas
│   ├── project.schema.json      # all project rules (defined once) + the source-file id
│   ├── career.schema.json       # career collections and records (reuses project definitions)
│   ├── origins.schema.json      # origins archive entries (reuses project and career definitions)
│   └── concepts.schema.json     # concepts (reuses the career id and project text definitions)
├── scripts/
│   ├── build.mjs                # assembles modular sources into outputs (exports assemble())
│   ├── career.mjs               # career collections and their generated order
│   ├── origins.mjs              # origins archive order
│   ├── concepts.mjs             # concepts order
│   └── validate.mjs             # validates the assembled config (exports validateConfig())
├── test/
│   ├── helpers.mjs              # shared test helpers
│   ├── validate.test.mjs        # project rules and the validate CLI
│   ├── career.test.mjs          # career rules
│   ├── origins.test.mjs         # origins rules, sources and committed entries
│   ├── concepts.test.mjs        # concepts rules, sources and committed concepts
│   ├── contract.test.mjs        # consumer-contract value rules and source-tree checks
│   └── build.test.mjs           # source-level build rules and generated-file checks
├── package.json
└── README.md
```

## Build and Validation

Project definitions live as individual JSON files in `config/projects/`. The build script assembles them with `config/global.json` into the canonical consumer-facing outputs.

```sh
pnpm install
pnpm build      # assemble modular sources → config/production.json + dist/ecosystem.json
pnpm validate   # validate the assembled config
pnpm test       # validation rule tests (run after pnpm build)
```

The build enforces:

* each project, career, origins and concepts file's `id` must match its filename;
* no duplicate IDs across projects, all career collections, origins and concepts;
* each project file validates against `schema/project.schema.json`, each career file against its collection's definition in `schema/career.schema.json`, and each origins file against `schema/origins.schema.json`;
* `config/global.json` contains none of `projects`, `career`, `origins` or `concepts`, and `config/career/` contains only the three collection folders;
* the assembled config validates against `schema/ecosystem.schema.json`;
* all cross-record semantic rules (unique hostnames, deployment names, shared-repo visibility, related project IDs, career dates, ordering, local IDs and assets, origins order and repositories, concepts order, etc.).

**Generated files** (both committed so consumers can fetch them from GitHub raw URLs):

* `config/production.json` — the assembled config at the existing consumer URL (backward-compat);
* `dist/ecosystem.json` — byte-identical content; the canonical target for new consumers (existing consumers still read `config/production.json`).

Project rules live only in `schema/project.schema.json`. Its `$defs/project` is the project as it appears in the assembled config (no `id`), and the ecosystem schema references it; the schema itself describes a source file, which adds the required `id`. To add or change a project field, edit `project.schema.json` once; both the source files and the assembled output pick it up. References are resolved locally by Ajv, with no network access.

GitHub Actions runs `pnpm build`, `pnpm validate` and `pnpm test` on every push and pull request to `main`.

CI also fails if `config/production.json` or `dist/ecosystem.json` differ from what `pnpm build` produces. After changing `config/global.json`, `config/career-publication.json` or any source collection (`config/projects/`, `config/career/`, `config/origins/` or `config/concepts/`), run `pnpm build` and commit the regenerated files together with the sources. Don't edit the generated files by hand.

Gateway Career publication is a separate, default-deny contract in `config/career-publication.json`, validated by `schema/career-publication.schema.json` and cross-record semantic checks. All five grant lists initially remain empty. Public listing, parent approval and public repositories never approve other fields or children. See the [M8.4a.1a contract](docs/diagnostics/m8.4a.1a/README.md) for field selectors, link restrictions and the required coordinated Gateway M8.4a.1b schema update. No Career content is newly approved.

The build also rejects unexpected source locations instead of skipping them: a folder under `config/` other than `projects`, `career`, `origins` and `concepts` (for example a mistyped `config/concept/`), and anything in a collection folder other than lowercase `<id>.json` files and hidden placeholder files such as `.gitkeep` (for example `example.JSON`, `notes.md` or a nested folder).

## Usage

Applications can retrieve the production registry during development or as part of their build process.

The intended flow is:

```text
config-ecosystem
       │
       ▼
sync configuration
       │
       ▼
consumer application
       │
       ▼
build
       │
       ▼
deploy
```

Eventually, updates to this repository can trigger builds of dependent projects automatically.

## Consumers

Applications that read this configuration (Gateway, CV, Support, and others) follow a shared integration contract: what to read, how to resolve repository and deployment URLs, how to sync at build time, and what to do when data is missing.

* [Consumer integration guide](docs/consumers/README.md): responsibilities, known consumers and the compatibility checklist
* [Integration details](docs/consumers/integration.md)
* [Proposed notification architecture](docs/consumers/github-actions.md): a design only; no notifications or deployments are active

## Security

This repository contains **public configuration only**.

Do not store:

* API keys
* access tokens
* passwords
* private credentials
* database connection strings
* secret environment variables
* other sensitive information

Anything committed to this repository should be considered publicly accessible.

### Listing and visibility

* `listing: hidden` controls **portfolio visibility only**, for projects, career records and origins entries alike (concepts have no `listing`; every concept is public). Consumers don't list hidden records, but hidden records are still published in full in `config/production.json` and `dist/ecosystem.json`.
* Repository names are published for every project, including private repositories. Consumers link a repository only when `repositoryVisibility` is `public`, but the name itself is visible in the JSON.
* Because the repository and its git history are public, never commit sensitive information, even in a hidden record: no personal addresses, private contact details, confidential client or employer details, or deployments that expose them. If a fact must stay private, leave it out of this repository entirely.

## Status

The registry is complete for its current scope, at contract `version` 1:

* **Projects:** 33 canonical projects with destinations, relationships, repositories and deployments.
* **Career:** 5 employers (12 work items), 7 professional projects and 7 coding assessments.
* **Origins:** 6 curated early-development entries.
* **Concepts:** 4 future project titles.

Schema validation, cross-collection semantic checks, tests and the generated-file freshness check all run in CI.

Next:

1. Gateway Universe integration (G7): Gateway reads career, origins and concepts, which its resolver currently drops.
2. Consumer fixes tracked outside this repository (see [docs/consumers](docs/consumers/README.md)).
3. Automate dependent rebuilds (proposed only; see [github-actions.md](docs/consumers/github-actions.md)).
