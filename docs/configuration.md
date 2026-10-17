# Shared configuration

[Documentation](README.md) · [Repository overview](../README.md)

Why this registry exists, how repository and deployment names relate, and where shared identity belongs.

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
