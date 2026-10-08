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

* `profile` is the personal identity of the owner. `name` is required. `links` holds the canonical social links, keyed by platform (`github`, `linkedin`, `website`, or any other key). Each value must be an absolute `https://` URL. New platforms need no schema or code change; add only links that really exist.
* `ecosystem` is the shared brand identity (`name` is required), separate from the person.

Consumers (Gateway, CV, Support, ...) should read these fields instead of hardcoding names and social URLs, and render whichever links are present. Content that only one app needs (page copy, layout, labels) stays in that app. To change shared metadata, edit `config/global.json`, run `pnpm build`, and commit the regenerated files.

## Project Model

A project defines its repository and one or more deployments.

```json
{
  "name": "Playdeck",
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

Every project requires `name`, `status` and `listing`:

| Field     | Allowed values                                |
| --------- | --------------------------------------------- |
| `status`  | `active`, `paused`, `completed`, `archived` |
| `listing` | `public`, `hidden`                            |

`repository`, `path` and `deployments` are optional. A project with no registered repository omits `repository`; a project with no registered live deployment omits `deployments` (never an empty object or empty `subdomain`). A deployment on the root domain uses `"subdomain": null` and may list extra subdomains in `aliases` (e.g. `["www"]`).

### Independent facts

Each field describes one thing, and none implies another:

* `status`: the project's lifecycle.
* `listing`: whether the project appears in ecosystem listings. `listing: public` does not mean the source code is public.
* `repositoryVisibility`: whether the GitHub repository in `repository` can be publicly accessed (`public` or `private`). It is required when `repository` is set and not allowed otherwise. It describes the repository, not whether the project is listed, and `public` does not mean a deployment exists.
* `deployments`: the registered live deployments.

Projects that share a repository must declare the same `repositoryVisibility`.

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

## Monorepo / Shared Repository Projects

Some projects may share the same repository.

For example, prototype projects can reference `lab-projects` while identifying their own path within that repository.

```json
{
  "name": "Foodie Map",
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

## Repository Structure

```text
config-ecosystem/
├── .github/
│   └── workflows/
│       └── validate.yml
├── config/
│   ├── global.json              # global config: version, username, domains, profile, ecosystem
│   ├── production.json          # generated — assembled consumer output (committed)
│   └── projects/
│       ├── gateway.json
│       ├── playdeck.json
│       └── ...                  # one file per project (id must match filename)
├── dist/
│   └── ecosystem.json           # generated — future canonical consumer target
├── schema/
│   ├── ecosystem.schema.json    # assembled config; references project.schema.json
│   └── project.schema.json      # all project rules (defined once) + the source-file id
├── scripts/
│   ├── build.mjs                # assembles modular sources into outputs
│   └── validate.mjs             # validates the assembled config
├── package.json
└── README.md
```

## Build and Validation

Project definitions live as individual JSON files in `config/projects/`. The build script assembles them with `config/global.json` into the canonical consumer-facing outputs.

```sh
pnpm install
pnpm build      # assemble modular sources → config/production.json + dist/ecosystem.json
pnpm validate   # validate the assembled config
```

The build enforces:

* each project file's `id` must match its filename;
* no duplicate project IDs;
* each project file validates against `schema/project.schema.json`;
* the assembled config validates against `schema/ecosystem.schema.json`;
* all cross-project semantic rules (unique hostnames, deployment names, shared-repo visibility, etc.).

**Generated files** (both committed so consumers can fetch them from GitHub raw URLs):

* `config/production.json` — the assembled config at the existing consumer URL (backward-compat);
* `dist/ecosystem.json` — canonical output for future consumer migration.

Project rules live only in `schema/project.schema.json`. Its `$defs/project` is the project as it appears in the assembled config (no `id`), and the ecosystem schema references it; the schema itself describes a source file, which adds the required `id`. To add or change a project field, edit `project.schema.json` once; both the source files and the assembled output pick it up. References are resolved locally by Ajv, with no network access.

GitHub Actions runs `pnpm build && pnpm validate` on every push and pull request to `main`.

CI also fails if `config/production.json` or `dist/ecosystem.json` differ from what `pnpm build` produces. After changing `config/global.json` or anything in `config/projects/`, run `pnpm build` and commit the regenerated files. Don't edit the generated files by hand.

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

## Status

Early development.

Current goals:

1. Establish the project and deployment registry.
2. Integrate the Developer Ecosystem Gateway as the first consumer.
3. ~~Add schema validation.~~ Done (`pnpm validate`).
4. Integrate additional projects.
5. Automate dependent project rebuilds.
