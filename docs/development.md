# Development and validation

[Documentation](README.md) · [Repository overview](../README.md)

Repository layout, local commands, generated-file workflow, CI and current scope.

## Repository Structure

```text
config-ecosystem/
├── .github/                     # validation workflow and consumer automation metadata
├── assets/                      # shared profile, ecosystem and collection files
├── config/
│   ├── global.json              # shared domains, profile and ecosystem identity
│   ├── projects/                # one file per canonical project
│   ├── career/                  # experience, freelance and assessments
│   ├── origins/                 # curated early-development entries
│   ├── concepts/                # future project titles
│   ├── career-publication.json  # independent Career publication grants
│   ├── concepts-publication.json # independent Concepts title grants
│   └── production.json          # generated, committed compatibility output
├── dist/ecosystem.json          # identical generated output for new consumers
├── docs/                        # reference, integration and publication guides
├── schema/                      # JSON Schemas for sources and assembled output
├── scripts/                     # assembly, validation, ordering and review tools
├── test/                        # schema, semantic, source and contract checks
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

CI also fails if `config/production.json` or `dist/ecosystem.json` differ from what `pnpm build` produces. After changing `config/global.json`, `config/career-publication.json`, `config/concepts-publication.json` or any source collection (`config/projects/`, `config/career/`, `config/origins/` or `config/concepts/`), run `pnpm build` and commit the regenerated files together with the sources. Don't edit the generated files by hand.

Gateway Career publication is a separate, default-deny contract in `config/career-publication.json`, validated by `schema/career-publication.schema.json` and cross-record semantic checks. All five grant lists initially remain empty. Public listing, parent approval and public repositories never approve other fields or children. See the [M8.4a.1a contract](diagnostics/m8.4a.1a/README.md) for field selectors, link restrictions and the required coordinated Gateway M8.4a.1b schema update. No Career content is newly approved.

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

## Status

The registry is complete for its current scope, at contract `version` 1:

* **Projects:** 33 canonical projects with destinations, relationships, repositories and deployments.
* **Career:** 5 employers (12 work items), 7 professional projects and 7 coding assessments.
* **Origins:** 6 curated early-development entries.
* **Concepts:** 4 future project titles.

Schema validation, cross-collection semantic checks, tests and the generated-file freshness check all run in CI.

Next:

1. Gateway Universe integration (G7): Gateway reads career, origins and concepts, which its resolver currently drops.
2. Consumer fixes tracked outside this repository (see [docs/consumers](consumers/README.md)).
3. Automate dependent rebuilds (proposed only; see [github-actions.md](consumers/github-actions.md)).
