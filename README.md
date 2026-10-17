# Ecosystem Config

Central configuration and project registry for my personal developer ecosystem.

[Documentation website](https://fikrimarzuki.github.io/config-ecosystem/)

This repository is the **single source of truth** for shared public facts: projects, repositories, deployments, domains, profile, assets, career records, early work and future concepts. Applications read this registry at build time so shared values can be updated in one place. Each application owns its presentation.

## Quick start

Use Node.js 24 and the pnpm version declared in [package.json](package.json).

```sh
pnpm install
pnpm build      # assemble source files into both committed JSON outputs
pnpm validate   # validate the assembled configuration
pnpm test       # run validation and contract tests
```

Edit the source files, run the commands above, and commit the sources together with both regenerated outputs. **Do not edit generated files by hand.**

## Where to edit

| Content | Source |
| --- | --- |
| Domains, profile and ecosystem identity | [config/global.json](config/global.json) |
| Projects, repositories and deployments | [config/projects/](config/projects/) |
| Employment, professional projects and assessments | [config/career/](config/career/) |
| Curated early-development work | [config/origins/](config/origins/) |
| Future project titles | [config/concepts/](config/concepts/) |
| Shared files | [assets/](assets/) |
| Career publication grants | [config/career-publication.json](config/career-publication.json) |
| Concepts title publication grants | [config/concepts-publication.json](config/concepts-publication.json) |

## Using the registry

New consumers should read [dist/ecosystem.json](dist/ecosystem.json). [config/production.json](config/production.json) remains available for existing consumers; both files are byte-identical and committed.

Consumers sync the configuration before building, resolve repository and deployment URLs from the canonical fields, and validate what they use. See the [consumer integration guide](docs/consumers/README.md) for the contract and known compatibility requirements. Automatic notifications and dependent deployments are proposed only.

## Documentation

| Guide | Contents |
| --- | --- |
| [Shared configuration](docs/configuration.md) | Naming, domains, profile and ecosystem identity |
| [Projects and deployments](docs/projects.md) | Fields, URLs, visibility, destinations and relationships |
| [Shared assets](docs/assets.md) | File paths, formats and validation |
| [Career, Origins and Concepts](docs/collections.md) | Collection models, ordering and privacy |
| [Development and validation](docs/development.md) | Repository layout, build workflow, CI and current scope |
| [Consumer integration](docs/consumers/README.md) | Sync, compatibility and proposed automation |
| [Career publication approvals](docs/career-publication-approvals.md) | Field grants and reviewed-content fingerprints |
| [Concepts publication approvals](docs/concepts-publication-approvals.md) | Title-only grants and consumer adoption |

Browse the [documentation index](docs/README.md) for all guides.

## Public data and publication

Everything committed here, including Git history and hidden records, should be considered publicly accessible. Never commit secrets, credentials, private contact details, confidential client or employer information, or unapproved screenshots.

* `listing: hidden` controls portfolio visibility; hidden records still appear in full in both generated JSON files.
* Private repository names are included in the JSON. Consumers link repositories only when `repositoryVisibility` is `public`.
* Career and Concepts browser publication requires separate content-bound grants; listing or source presence never grants permission. Career grants remain empty. Exactly three Concepts title grants are active for Forgebox, Hearthside and Momee.

Publication grants constrain consumer output; they do not hide canonical records or retract earlier copies.
