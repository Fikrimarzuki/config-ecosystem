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
├── config/
│   └── production.json
├── schema/
│   └── ecosystem.schema.json
├── scripts/
│   └── validate.mjs
├── package.json
└── README.md
```

## Validation

The config is checked in two passes:

* `schema/ecosystem.schema.json` (JSON Schema) defines the structure: required fields, allowed values, hostname formats, and no unknown properties.
* `scripts/validate.mjs` checks rules that span the whole config: no two deployments or aliases may resolve to the same hostname, deployment `name`s must be unique, and strings must not be whitespace-only.

```sh
pnpm install
pnpm validate                                  # validates config/production.json
node scripts/validate.mjs path/to/config.json  # validates another file
```

The command exits non-zero and lists each problem when the config is invalid. GitHub Actions runs it on every push and pull request to `main`.

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
