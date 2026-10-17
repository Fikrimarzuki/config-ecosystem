# Integration guide

How to read and use the ecosystem configuration from an application. See the [consumer overview](README.md) for responsibilities, known consumers and the compatibility checklist.

## 1. Canonical sources

Consume only the **generated** files:

| File | Role | Raw URL |
| --- | --- | --- |
| `config/production.json` | The compatibility artifact. Existing consumers read this. | `https://raw.githubusercontent.com/Fikrimarzuki/config-ecosystem/main/config/production.json` |
| `dist/ecosystem.json` | Identical content; the intended canonical target for new consumers. | `https://raw.githubusercontent.com/Fikrimarzuki/config-ecosystem/main/dist/ecosystem.json` |

The two files are byte-for-byte identical and committed together (CI fails if either is out of date). New consumers should prefer `dist/ecosystem.json`; moving an existing consumer is a separate, coordinated change.

Do **not** read `config/global.json` or `config/projects/*.json`. They are build inputs, and project files carry an `id` field that doesn't exist in the output. Do not read `.github/consumers.json` either: it is automation metadata, not configuration.

Top-level shape of the output:

```json
{
  "version": 1,
  "username": "Fikrimarzuki",
  "domains": { "primary": "fikrimarzuki.work" },
  "profile": { "name": "...", "title": "...", "email": "...", "links": {}, "assets": {} },
  "ecosystem": { "name": "FM Work" },
  "projects": { "playdeck": { "name": "Playdeck" } },
  "career": { "experience": [], "freelance": [], "assessments": [] },
  "origins": [],
  "concepts": [],
  "careerPublication": { "experience": [], "work": [], "freelance": [], "components": [], "assessments": [] }
}
```

* `version` is `1`. Reject any other value rather than guessing.
* `profile` and `ecosystem` are optional objects; their members are optional too, except `name`.
* `projects` is an object keyed by **project ID**. IDs are stable identifiers; never rename them locally.
* `career` is always present, with three **arrays** (`experience`, `freelance`, `assessments`) that may be empty. See [section 6](#6-career).
* `origins` is always present, as an **array** that may be empty. See [section 7](#7-origins).
* `concepts` is always present, as an **array** that may be empty. See [section 8](#8-concepts).
* `careerPublication` is optional for older version-1 inputs; absence denies all Gateway Career publication. The current build emits five empty independent grant lists from `config/career-publication.json`. Canonical listing is not permission. See the [publication contract](../diagnostics/m8.4a.1a/README.md) before consuming it; grants, their canonical selectors and content fingerprints are build-only, not a visitor-facing DTO. Every nonempty grant requires per-selection fingerprints; missing/stale evidence fails validation. See the [current value-bound approval contract](../career-publication-approvals.md) for coordinated consumer updates and migration.

## 2. Build-time synchronization

Fetch the config **at build time**, validate what you depend on, and bake the result into your build. Do not fetch it from visitors' browsers at runtime.

```js
// scripts/sync-ecosystem.mjs (sketch)
const URL_ = "https://raw.githubusercontent.com/Fikrimarzuki/config-ecosystem/main/dist/ecosystem.json";
const response = await fetch(URL_, { signal: AbortSignal.timeout(15000), cache: "no-store" });
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const config = await response.json();
if (config.version !== 1) throw new Error(`Unsupported ecosystem version ${config.version}`);
// ...validate the fields you use, then write the result to a generated file.
```

Run it before dev, build, typecheck and test (for example as `prebuild`). Write to a temporary file and rename it, and delete the previous output if the sync fails, so a stale copy can never ship.

Validate only the fields you use, and **ignore unknown fields**. The schema grows additively (new optional fields), and a consumer that rejects unknown fields breaks on every addition.

## 3. Resolving project facts

### Repository URL

```js
const githubUrl = `https://github.com/${config.username}`;
const repositoryUrl =
  project.repository && project.repositoryVisibility === "public"
    ? `${githubUrl}/${project.repository}`
    : undefined;
```

`repositoryVisibility` is required whenever `repository` is present and describes the repository only. **Link a repository only when it is `"public"`.** A private repository still exists, so its name can be shown as text if you want, but a link would 404 for visitors. `path`, when present, is the project's folder inside a shared repository (several projects can share one, e.g. `lab-projects`).

### `listing`, `status` and `repositoryVisibility` are independent

| Field | Meaning | Does **not** imply |
| --- | --- | --- |
| `listing: "public" \| "hidden"` | Whether the project belongs in ecosystem listings | a public repository, a live deployment |
| `status: active \| paused \| completed \| archived` | Lifecycle of the project | anything about visibility or deployments |
| `repositoryVisibility: public \| private` | Whether the repository can be opened publicly | that the project is listed or deployed |
| `deployments` present | A registered live deployment exists | a public repository |
| `destination` | The project's one primary Gateway destination | anything about status, listing or visibility |

`listing: "hidden"` keeps a project out of listings, but the record is still in the public JSON. Never treat `hidden` as confidential.

Typical filters: list `listing === "public"`; offer support/contact only for `listing === "public" && status === "active"` (as Support does); link source only for `repositoryVisibility === "public"`; show an "Open" action only when a deployment exists. Whether to show archived or paused projects, and how, is your decision.

### Destination

Every project has exactly one `destination` (required):

* Main: `games`, `learning`, `tools`, `products`, `platforms`, `career`, `labs`
* Special: `central-station`, `sun`, `moon`

A destination may have no projects yet (`career` has none today). Group projects by this value instead of keeping a local project-to-destination map. How each destination is drawn, labelled and ordered is still your decision. If you meet a value you don't know, skip the project or fail the build with a clear message; don't guess a destination.

### Related projects

`related` (optional) lists canonical project IDs. Every ID exists, a project never lists itself, and a relationship is **undirected** and declared once, on either project. To find everything related to `id`, check both directions:

```js
const relatedTo = (config, id) => Object.keys(config.projects).filter(
  (other) => config.projects[id].related?.includes(other) || config.projects[other].related?.includes(id),
);
```

Apply your usual `listing` filter to the related projects as well.

### Deployment URL resolution

A deployment has `name` and exactly one of `subdomain` or `url`:

```js
function deploymentUrl(config, deployment) {
  if (deployment.url !== undefined) return deployment.url;              // external, use as-is
  const host = deployment.subdomain === null
    ? config.domains.primary                                             // apex
    : `${deployment.subdomain}.${config.domains.primary}`;
  return `https://${host}`;
}
```

| Deployment | Example | Resolves to |
| --- | --- | --- |
| `subdomain: "playdeck"` | `{ "name": "playdeck", "subdomain": "playdeck" }` | `https://playdeck.fikrimarzuki.work` |
| `subdomain: null` | `{ "name": "gateway", "subdomain": null, "aliases": ["www"] }` | `https://fikrimarzuki.work` |
| `url` | `{ "name": "css-tricks", "url": "https://fikrimarzuki.github.io/lab-css-tricks/" }` | exactly that string |

* **Use an external `url` exactly as written.** Don't normalize it, add or strip a trailing slash, or rebuild it from a hostname; paths such as `/lab-css-tricks/` matter on GitHub Pages.
* **Never read `subdomain` from a `url` deployment.** It isn't there.
* **`aliases`** are extra hostnames under the primary domain for the *same* `subdomain` deployment (`https://<alias>.<primary>`, e.g. `www`). They are never present on a `url` deployment. Treat the main URL as canonical, and use aliases only if you need to recognise them (redirects, allow-lists).
* **A project may have several deployments** (Neuran has five, under keys such as `main`, `admin`, `lms`). The key `main` is a convention, not a guarantee: a project may have no deployments at all, or none called `main`. Don't assume one exists.
* **`name`** is the deployment's identity and is unique across the ecosystem. Support uses `deployments.main.name` as a project's public slug.

## 4. Optional project metadata

All of these may be absent on any project. Render only what exists, and never invent a placeholder fact.

| Field | Shape | Notes |
| --- | --- | --- |
| `tagline`, `description` | `{ "en": "...", "id": "..." }` | `en` is required whenever the object exists; `id` is optional |
| `technologies` | `["Next.js", "React"]` | Display names in display order; free-form |
| `tags` | `["games", "kids"]` | Lowercase kebab-case identifiers for grouping and filtering |
| `links` | `{ "documentation": "https://..." }` | Extra links only. Repository and deployment URLs are never duplicated here; derive them as above |
| `assets` | see section 5 | Local file references |

**Locale fallback is the consumer's job.** Pick `text[locale] ?? text.en`. The config stores data and does not resolve locales.

```js
const t = (text, locale) => text?.[locale] ?? text?.en;
```

## 5. Shared assets

Assets are files in `config-ecosystem/assets/`, referenced by **repository-root-relative paths**:

```text
assets/profile/            profile.assets            resume (pdf), logo, avatar
assets/ecosystem/          ecosystem.assets          logo, icon, banner
assets/projects/<id>/      project.assets            icon, logo, thumbnail, cover, media[]
```

A project's `media` entries are `{ "type": "image", "src": "assets/projects/<id>/shot.png", "alt": { "en": "..." } }`; use `alt` as the image's alternative text.

Paths are validated upstream (they start with `assets/`, stay in the owner's folder, and the file exists), so they are safe to join onto the repository root:

```js
const ASSET_ROOT = "https://raw.githubusercontent.com/Fikrimarzuki/config-ecosystem/main/";
const assetUrl = new URL(config.profile.assets.resume, ASSET_ROOT).href;
```

**Copy the files you use at build time** into your own build output and serve them from your own origin. Don't hotlink `raw.githubusercontent.com` from pages: it has no availability guarantees, and a failure at runtime can't be rolled back. Verify what you downloaded (the Gateway checks the PDF signature and trailer before publishing a resume download, and refuses to publish if it's wrong). Copy only the assets you use; no consumer needs all of them.

## 6. Career

`career` holds three arrays. Unlike `projects`, they are arrays because their order is meaningful, and each record carries its own `id`:

| Collection | What it is | Generated order |
| --- | --- | --- |
| `experience` | Employment history, one record per employer | `start` ascending, then `id` (chronological) |
| `freelance` | A **project-focused grouping** of engagements | `order` ascending, then `id` (curated) |
| `assessments` | Curated technical assessments | `year` descending, then `id` (newest first) |

You can render the arrays in the order given. Re-sort only if your presentation needs a different order.

* **Every record has `id`, `listing` and its title field** (`company` + `role` for experience, `title` for the others). Apply your usual `listing === "public"` filter.
* **Dates** are `"YYYY-MM"` strings, which sort and compare as plain text. In `experience`, `end` is always present: `null` means current employment ("Present"). In `freelance`, `start` and `end` are both optional, `end` may appear without `start`, and `end: null` means ongoing. Assessments have an integer `year` instead.
* **Don't present every freelance entry as freelance work.** The collection is a navigation grouping. `engagement` (`freelance`, `contract`, `full-time`, `part-time`) is optional. Show it only when present, and never derive it from the collection name. You choose the section's public title.
* **Nested items:** `experience[].work[]` (pieces of work at that employer) and `freelance[].components[]` (parts of one engagement) have local kebab-case `id`s, unique only within their parent. They are not projects; don't look them up in `projects`. Components share the parent record's gallery.
* **`relatedProjects`** (on records and work items) lists canonical project IDs, which always exist in `projects`. Apply the project's `listing` filter before linking it.
* **Assessment company:** an assessment may carry an optional `company` (the company that set it). Show it beside the title (for example "Pixel House Studio · 2020") when present, and never infer it when absent.
* **Links:** experience and freelance records never contain repository or deployment fields. An assessment may carry a public `repository` (`repositoryVisibility` is always `"public"`); build its URL like a project's. Assessments never contain deployments.
* **Assets** use the project asset shape and paths under `assets/career/<collection>/<id>/`; resolve and copy them as in section 5. Hidden records never have assets.
* **`country`** is an ISO 3166-1 alpha-2 code (`ID`, `AU`). Localize the country name yourself.

```js
const formatMonth = (value, locale = "en") =>
  new Date(`${value}-01T00:00:00Z`).toLocaleDateString(locale, { month: "short", year: "numeric", timeZone: "UTC" });

const period = ({ start, end }) =>
  `${start ? formatMonth(start) : "?"} – ${end === null ? "Present" : end ? formatMonth(end) : "?"}`;

const visibleExperience = config.career.experience.filter((record) => record.listing === "public");
```

## 7. Origins

`origins` is a curated **array** of early-development entries (the Gateway Black Hole archive), always present and possibly empty. Entries are not projects: don't look them up in `projects`, and don't expect a `destination`.

```js
const visibleOrigins = config.origins.filter((entry) => entry.listing === "public");
const repositoryUrls = (entry) =>
  (entry.repositories ?? []).map(({ name, role }) => ({ role, href: `https://github.com/${config.username}/${name}` }));
```

* **Order:** the array is sorted by `order` ascending, then `id`. Render it as given. `year` is informational; several entries can share a year, so don't sort by it.
* **Required fields:** `id`, `title`, `year`, `order`, `listing`. Optional: `description`, `technologies`, `repositories`, `relatedProjects`, `assets`.
* **Repositories:** each item is `{ "name", "role"? }`, a **public GitHub** repository under `username`. Build its URL as above; there are no deployment or link fields. An entry may have several repositories (for example a server and a client), or none.
* **`relatedProjects`** lists canonical project IDs, as in career. Apply the project's `listing` filter before linking.
* **Assets** (none yet) use the project asset shape under `assets/origins/<id>/`. Hidden entries never have assets.
* **Visibility:** apply `listing === "public"`. Hidden entries are still in the public JSON.

## 8. Concepts

`concepts` is an **array** of future project ideas (the Gateway Asteroid Field), always present and possibly empty. A concept is a title only and is not a project: don't look it up in `projects`.

```js
const slots = config.concepts; // already in display order
const ideas = slots.filter((concept) => concept.kind === "concept");
```

* **Fields:** exactly `id`, `title`, `kind` and `order`. There is no description, listing, link, date or status, so don't invent any, and don't present a concept as a planned or scheduled project.
* **`kind`:** `concept` is a project idea; `placeholder` is a slot that isn't an idea yet (for example "Coming Soon"). It is a semantic distinction. Whether a placeholder looks different is your decision, and an unknown `kind` should be skipped or fail the build, not guessed.
* **Order:** sorted by `order` ascending, then `id`. Render it as given.
* **Visibility:** every concept is public. There is no `listing` field to filter on.

## 9. When things are unavailable or missing

| Situation | Do |
| --- | --- |
| Config can't be fetched (network, HTTP error) | **Fail the build.** Don't fall back to a stale copy or hardcoded values. The previous deployment keeps serving. |
| Config isn't valid JSON, or `version` isn't `1` | Fail the build with a clear message. |
| A field you *require* is missing or malformed | Fail the build and name the field. |
| An optional field is missing | Omit that part of the UI. Don't show empty labels, placeholders, or invented text. |
| A locale is missing (`id`) | Fall back to `en`. |
| A required asset can't be downloaded or fails verification | Fail the build. Don't publish a broken file. |
| An optional asset can't be downloaded | Decide per asset: omit the element, or fail if the page is useless without it. Don't ship a broken `<img>`. |
| Unknown extra fields | Ignore them. |

The principle: **a failed sync must never produce a deployment that looks fine but is wrong.** A red build that leaves the last good deployment up is the correct outcome.

## 10. Ownership boundary

| Canonical (this repository) | Consumer-specific (stays local) |
| --- | --- |
| Project name, status, listing | Page layout, ordering, sections |
| Primary destination, related projects | How destinations are drawn, named and ordered |
| Career records, their dates, engagement types and canonical order | Career section titles, timeline layout, landmarks and navigation |
| Origins entries, their repositories and curated order | Archive presentation (for example the Black Hole), geometry, animation and interaction |
| Concept titles, kinds and order | Asteroid Field presentation, geometry, placement and interaction |
| Repository, visibility, path | Which projects to feature, hide or promote |
| Deployments, URLs, aliases | Buttons, labels and calls to action ("Open app", "View source") |
| Shared description, tagline, tags, technologies | Marketing copy, longer descriptions, page-only text |
| Profile and ecosystem identity | Navigation, footers, SEO metadata |
| Shared assets (logo, avatar, resume, project images) | Preview art, themes, accents, animations specific to one app |

If a fact is needed by more than one application, it belongs here. If only one application needs it, it stays in that application. Don't copy canonical values into local files; resolve them from the synced config so they can't drift.

## 11. Example: a project card

```js
function projectCard(config, id, locale = "en") {
  const project = config.projects[id];
  const deployments = Object.values(project.deployments ?? {});
  const live = deployments[0] && deploymentUrl(config, deployments[0]);
  return {
    title: project.name,
    summary: project.description && (project.description[locale] ?? project.description.en),
    openUrl: live,                                                    // undefined when not deployed
    sourceUrl: project.repositoryVisibility === "public"
      ? `https://github.com/${config.username}/${project.repository}`
      : undefined,                                                    // private or no repository
    tags: project.tags ?? [],
  };
}
```

A project with a private repository and no deployment yields a card with a title and nothing to open, which is the correct representation of that project.
