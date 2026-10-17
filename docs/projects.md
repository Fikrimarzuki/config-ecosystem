# Projects and deployments

[Documentation](README.md) · [Repository overview](../README.md)

The project model, field rules, relationships and deployment patterns for `config/projects/<id>.json`.

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
