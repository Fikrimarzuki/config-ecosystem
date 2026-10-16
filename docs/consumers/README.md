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
| Projects, Games, Learning (`web-projects`, `web-games`, `web-learning`) | Planned | Not yet integrated; not in the notification registry. |

The registry [`.github/consumers.json`](../../.github/consumers.json) records `web-gateway`, `web-support` and `web-cv` with every notification target **disabled**. It is automation metadata for CI. It is not part of the ecosystem configuration and must never be added to `config/production.json` or `dist/ecosystem.json` (the build does not read it, and consumers must not either).

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
