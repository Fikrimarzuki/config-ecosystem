# Consumer integration

How applications in the FM Work ecosystem consume `config-ecosystem`.

`config-ecosystem` is the canonical source of shared facts: projects, repositories, deployments, profile, ecosystem identity, and shared assets. Consumers (Gateway, CV, Support, ...) read those facts at build time instead of hardcoding them, so a change made once reaches every application.

This directory is **documentation and templates only**. Nothing described under "proposed" is active: there are no notification workflows, tokens or automatic deployments.

| Guide | Contents |
| --- | --- |
| [integration.md](integration.md) | What to read, how to resolve URLs and metadata, how to sync, how to fail |
| [github-actions.md](github-actions.md) | Proposed `repository_dispatch` architecture and the `ecosystem-updated` event (inactive) |

## Responsibilities

**`config-ecosystem` owns**

* Canonical facts and their schema: what exists, where it lives, what state it is in.
* Validation: a config that fails `pnpm validate` is never published to `main` (CI enforces this).
* The two generated artifacts, `config/production.json` and `dist/ecosystem.json`, kept identical and committed.
* Shared asset files under `assets/`.
* The consumer registry [`.github/consumers.json`](../../.github/consumers.json).

**Consumers own**

* Everything about presentation: layout, copy, ordering, which projects to feature, labels, icons, previews.
* Resolving canonical facts into what their UI needs (URLs, links, localized text).
* Their own sync step, validation of what they depend on, build, and deployment.
* Failing loudly when the canonical source is unavailable or invalid, and never replacing a working deployment with a broken one.

## Known consumers

Status is based on repository evidence, not intent. "Verified" means the consumer's code was inspected; "unverified" means no repository evidence was available.

| Consumer | Status | Evidence |
| --- | --- | --- |
| `web-gateway` | M8.4a.1b compatibility update required before consuming the new artifact | Uses a strict build-time schema and public projection; Career remains withheld. The new additive `careerPublication` property is rejected by its current vendored schema. Update validation/schema packaging and publication integration in Gateway M8.4a.1b before publishing this artifact; do not relax validation or infer grants from listing. |
| `web-support` | Verified integration, compatible | Syncs `dist/ecosystem.json` before dev, build, typecheck and test, with no fallback. Validates and copies only what it uses (`version`, `domains.primary`, `ecosystem.name`, and each project's `status`, `listing`, `name`, `destination`, `deployments.main` and `description`) into a minimal generated file; it ignores the other collections, repositories, assets and taglines. Its contact-form selector offers public, active projects only, excludes Support by its project ID, and fails the build on an unknown destination. It resolves `deployments.main` URLs per section 3 of the integration guide. |
| `web-cv` | Verified integration, **blocked** for automation | Syncs `config/production.json` at build time and accepts the current structure, but has known limitations (see below). Consumer fixes are tracked separately. |
| `web-tools`, `web-devtools`, `web-roadmap`, `web-projects`, `game-tinyverse`, `web-learning` | Verified build-time link integration | Sync `dist/ecosystem.json` before dev, build and typecheck (also before test in Tinyverse and Learning). Validate selected public main deployments and emit only resolved URLs; no full registry reaches visitors. Failed sync removes generated output and fails the command. See [shared navigation consumers](#shared-navigation-consumers). |
| `app-fm-studios`, `app-hearthside`, `web-playnest` | Build-time link integration | Sync the same minimal Support/Gateway projection. FM Studios links from the landing page and studio; Hearthside from its landing and mode chooser; Playnest links are rendered only after the grown-up check described below. |
| `learn-kodestep`, `web-games`, `game-javascriptia` | Build-time link integration | Sync the minimal Support/Gateway URL projection before dev, build, typecheck and tests. KodeStep uses its bilingual footer, Web Games its lobby footer, and JavaScriptia its Contact dialog. |
| `app-pagelayr` | Build-time link integration | Extends its existing `config/production.json` sync; only public active Support/Gateway main URLs are generated. Next dev/build, tests and typecheck sync; failed sync removes stale output. The landing retains same-tab navigation and its local-save notice. |
| `app-playdeck` | Build-time link integration | Syncs `dist/ecosystem.json` before dev/build/typecheck/tests; only public active Support/Gateway URLs are generated. Shared links appear in its landing, mode chooser and project-library footers alongside existing local-save wording. |

The registry [`.github/consumers.json`](../../.github/consumers.json) records Gateway, Support, CV and the shared-navigation consumers with every notification target **disabled**. It is automation metadata for CI. It is not part of the ecosystem configuration and must never be added to `config/production.json` or `dist/ecosystem.json` (the build does not read it, and consumers must not either).

### Registry format

```json
{
  "schemaVersion": 1,
  "consumers": [
    {
      "repository": "web-gateway",
      "status": "blocked",
      "notify": false,
      "notes": ["..."]
    }
  ]
}
```

* `repository`: the consumer's repository name under the ecosystem's GitHub username (`username` in the config).
* `status`: `compatible` (inspected, no known blockers), `blocked` (known incompatibility), or `unverified` (not inspected).
* `notify`: `false` until the checklist below is satisfied **and** someone deliberately enables it. Only `true` entries would ever receive an event, and only a `compatible` consumer should be switched on.
* `notes`: short evidence and blockers for humans.

## Compatibility checklist

A consumer must satisfy all of these before automatic updates are enabled for it.

- [ ] **Current schema.** Accepts the current top-level fields (`version`, `username`, `domains`, `projects`, `profile`, `ecosystem`) and ignores fields it doesn't use, instead of rejecting unknown ones.
- [ ] **External deployment URLs.** Uses `deployment.url` as-is when present (path and trailing slash preserved) and never builds a URL from `subdomain` for such a deployment.
- [ ] **Apex deployments.** Resolves `subdomain: null` to `https://<domains.primary>`.
- [ ] **Private repositories.** Links to a repository only when `repositoryVisibility` is `public`.
- [ ] **Optional metadata.** Works when `description`, `tagline`, `technologies`, `tags`, `links`, `assets` and `related` are absent, and when `id` (Indonesian) text is missing.
- [ ] **Destinations.** Accepts the required `destination` field, and handles a destination value it doesn't know without guessing.
- [ ] **Origins.** Accepts (or ignores) the top-level `origins` array, including when it is empty.
- [ ] **Concepts.** Accepts (or ignores) the top-level `concepts` array, including when it is empty, and handles a `kind` it doesn't know without guessing.
- [ ] **Career.** Accepts (or ignores) the top-level `career` object with its three arrays, including when they are empty, and never labels a `freelance` record with an engagement type it doesn't state.
- [ ] **Shared assets.** Resolves asset paths against the repository root and copies the files at build time.
- [ ] **Synchronization.** Has a working build-time sync with a clear failure mode (no silent stale fallback).
- [ ] **Build validation.** Has a passing build and tests against the current config.
- [ ] **Safe deployment.** Deploys only after a successful build.
- [ ] **Failure reporting.** A failed sync or build is reported and leaves the last working deployment in place.

### Known compatibility issues

* **Gateway** requires the explicit M8.4a.1b update for `careerPublication`; its current strict schema rejects the new property. Existing deployment resolution is unchanged. See the [Career publication compatibility requirements](../diagnostics/m8.4a.1a/README.md#gateway-m84a1b-and-backward-compatibility). No Gateway files are changed by this canonical-contract milestone.
* **`web-cv`** has three known limitations:
  * On a failed sync it falls back to its committed snapshot, which can serve stale data (contrary to section 6 of the integration guide).
  * Its deployment resolver ignores `deployment.url` and builds a URL from `subdomain`, so an external deployment would resolve to the apex domain. No project it links uses an external deployment today.
  * Its Developer Roadmap card resolves the `roadmap` project, which is the Learning Roadmap app; `developerRoadmap` is a separate project. The mapping needs review.
* **Support** resolves `deployments.main` as the guide specifies (an external `url` as written, `subdomain: null` as the apex). Its deployment platform and failure behaviour should still be confirmed before enabling automation (the checklist's last two items).

## M8.4d value-bound Career approval compatibility

Nonempty grants require per-selection fingerprints; legacy nonempty grants are rejected rather than grandfathered. Gateway's vendored schema, semantic checker and fingerprint module must match this repository and revalidate before public projection. Empty/absent grants remain deny-all compatible. No browser-facing Career DTO contains fingerprints. See the [current approval contract](../career-publication-approvals.md); the M8.4a.1b notices above describe the earlier rollout.

## Shared navigation consumers

`web-tools`, `web-devtools`, `web-roadmap`, `web-projects`, `game-tinyverse` and
`web-learning` use `projects.support.deployments.main` for **Support** and
`projects.gateway.deployments.main` for **More projects**. Projects also resolves
`cv`, `playground` and `tools` for its existing ecosystem navigation and Gateway
hero actions; these values replace its old `NEXT_PUBLIC_*_URL` overrides.

Each repository owns `scripts/sync-ecosystem.mjs` and contract tests run by
`npm run test:ecosystem`. The sync validates version 1, `domains.primary`, selected
projects' public listing and lifecycle status, and their main deployment. Support
and Gateway must be active. Projects' Playground link may remain paused, as it is
in the canonical registry. Unknown fields and unrelated collections are ignored.
Only `{ urls: { ... } }` is written to ignored `src/generated/ecosystem-links.json`;
repository names, profile, Career, Origins, Concepts and publication grants are
never copied into these apps' browser data. Labels, translations and local-data
notices remain consumer presentation.

Fresh remote configuration is required for production/CI. Local development can
explicitly select a generated artifact using
`ECOSYSTEM_CONFIG_PATH=../config-ecosystem/dist/ecosystem.json`; this is rejected
in production/CI and is never an automatic fallback. Sync uses a temporary file
and rename; any fetch, parse, validation or write failure removes the previous
generated file and temporary output.

To change URLs, update the canonical domain or project deployment sources, run
`pnpm build && pnpm validate && pnpm test`, and commit both generated artifacts.
Consumers use the change on their next build and deployment. These registry
entries have `status: compatible` and `notify: false`: registering them does not
activate notifications or automatic deployments. Hosting rollback and failure
reporting still need deployment-platform verification before enabling automation.

### FM Studios, Hearthside and Playnest

These three consumers use the same `support` and `gateway` URL contract and failure
policy. The two monorepos keep the sync script inside `apps/web/scripts/` and
chain it explicitly into the web package's dev/build/test/typecheck commands, so
filtered and recursive pnpm commands also sync. FM Studios writes
`apps/web/src/generated/ecosystem-links.json`; Hearthside writes
`apps/web/app/generated/ecosystem-links.json`; Playnest writes
`src/generated/ecosystem-links.json`. All are ignored and contain only resolved URLs.

Playnest keeps both external links out of the children's hub and games. An adult
opens the existing Grown-ups settings dialog, chooses the links section, and
answers a randomized arithmetic question written in words. Only a successful
answer creates the external link elements; closing the dialog or entering a game
removes them. The check is never persisted, and English/Indonesian language
changes do not bypass it. Settings remain directly available. All three consumer
registrations have `notify: false`; no automatic dispatch or deployment is enabled.

### KodeStep, Web Games and JavaScriptia

`learn-kodestep`, `web-games` and `game-javascriptia` also consume the public active
`support` and `gateway` main deployments. Each repository chains
`scripts/sync-ecosystem.mjs` into dev, build, typecheck and test, writes only the
resolved URLs to ignored `src/generated/ecosystem-links.json`, and provides
`npm run test:ecosystem` for deterministic contract tests. Production builds and
CI reject local overrides and require fresh remote configuration; failed syncs
remove stale output, and each sync uses a unique atomic staging file.

KodeStep replaces its hardcoded footer URLs while preserving Indonesian/English
labels. Web Games exposes the links in its lobby footer; JavaScriptia replaces
the hardcoded Website entry with Support and More projects in the main-menu
Contact dialog. Both placements keep links out of active gameplay. The consumers
own local-data notices and do not publish unrelated canonical records. All three
registry entries keep `notify: false`; registration does not enable deployment.

### PageLayr

`app-pagelayr` retains its existing canonical `main/config/production.json` source,
which is identical to `dist/ecosystem.json`. Its Next config syncs before direct
dev/build commands, and package test/browser-test/typecheck commands also sync.
The generated `src/config/ecosystem.generated.ts` contains only
`ecosystemUrls.support.main` and `ecosystemUrls.gateway.main`; unrelated records
and optional fields are ignored. Both projects must be public and active.

The resolver supports external HTTPS URLs as written, apex and subdomain
deployments. Sync uses unique atomic staging files, preserves mtime for unchanged
URLs, and removes stale generated output on failure. `ECOSYSTEM_CONFIG_FILE` is
reserved for explicit local development; production builds and CI require fresh
remote config. The landing's Support and More projects links use its existing
same-tab behavior beside the local-save notice. Its registry entry has
`notify: false`; automatic deployments remain disabled.

### Playdeck

`app-playdeck` consumes `main/dist/ecosystem.json` before its package dev/build,
typecheck, test/watch and browser-test commands. Its
`src/generated/ecosystem-links.json` projection contains only the public active
`support` and `gateway` main URLs. The resolver supports apex, subdomain and
external HTTPS URLs as written; unrelated records and optional fields are ignored.
Failed sync removes stale output, and writes use unique atomic staging files.
`ECOSYSTEM_CONFIG_PATH` selects an explicit local generated artifact for
development; production builds and CI reject it and require fresh remote config.

The shared Support/More projects navigation is in the landing, mode chooser and
project-library footers. Local-save wording stays app-owned; creator and active
game/presentation views keep their existing chrome. The registry entry has
`notify: false`; registering it does not enable automatic deployment.
