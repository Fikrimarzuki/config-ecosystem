# Shared assets

[Documentation](README.md) · [Repository overview](../README.md)

Use these rules for profile, ecosystem and project files. Career and Origins add the folder and visibility rules in the [collections guide](collections.md).

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

The second block is an illustrative project file; in the registry `playdeck` has only a `thumbnail`.

Project thumbnails are owner-approved screenshots of the public application: 1280×720 WebP, at most about 150 KB, stored as `assets/projects/<projectId>/thumbnail.webp`. They are optional. Consumers copy the ones they use into their own build output (see the [consumer integration guide](consumers/integration.md) ("Shared assets")); a missing thumbnail must never hide a project.

### Project icons

`assets.icon` holds a project's square brand icon. Seven projects have one: `cv`, `playground`, `support`, `projects`, `tools`, `configEcosystem` and `devtools`, each at `assets/projects/<projectId>/icon.png`. The other projects have none, and none is required.

**Source.** The approved Group 1 icons are produced in the private `ecosystem-assets` repository, which owns the SVG masters, the generated export bundle and the review sheets. This repository stores only the approved public raster: `assets/projects/<projectId>/icon.png` is a byte-for-byte copy of `projects/<projectId>/branding/exports/png/icon-512.png` from `ecosystem-assets` (commit `6e3bde1`). It is a 512×512 PNG of about 54 to 71 KB, a rounded-corner tile with transparent corners. It is not transformed here, and it is not an SVG.

**Publication.** The file is committed with the project record, like every other asset. Consumers read `assets.icon` from `dist/ecosystem.json`, join the path onto the repository root and copy the file at build time (see [Shared assets](consumers/integration.md#5-shared-assets) in the consumer guide). The documented source URL is `https://raw.githubusercontent.com/Fikrimarzuki/config-ecosystem/main/<assets.icon>`; it is a build-time download source, not a URL to hotlink from pages.

**`icon` and `logo` are different assets.**

| Field | Purpose | Status |
| --- | --- | --- |
| `icon` | The project's square brand mark, for small identity surfaces a consumer controls: cards, lists, link previews. | Set for the seven projects above |
| `logo` | A larger brand lockup, such as a wordmark with its symbol, usually vector. | Not set for any project; never derived from the icon |
| `thumbnail` | An owner-approved screenshot of the application. | Unchanged |

`icon` is also not a favicon or an install icon. Each application owns its favicon, manifest, Apple touch icon and maskable icon, and takes them from the `ecosystem-assets` exports (`favicon.ico`, `apple-touch-icon.png`, `icon-maskable-512.png`). The registry icon is not maskable and is not meant for a web manifest.

**Updating an icon.**

1. Change the artwork in `ecosystem-assets`: edit the masters, run `pnpm build:icons`, `pnpm verify:icons`, and commit there.
2. Copy the new `exports/png/icon-512.png` over `assets/projects/<projectId>/icon.png`. Keep the same path and file name; do not add version suffixes.
3. Confirm the copy matches its source: `shasum -a 256` of both files must be identical.
4. Run `pnpm build`, `pnpm validate` and `pnpm test`, and commit the changed file here. The generated JSON does not change when only the image changes, but the commit touches `assets/**`, the path the [proposed notification workflow](consumers/github-actions.md) watches (that workflow is not active, so consumers pick the new file up on their next build).
5. To give another project an icon, add the file and `assets.icon` in the same commit, and only from an approved `ecosystem-assets` export. Never commit a draft or a concept.

A missing or unusable icon must never hide a project; consumers fall back to their own presentation. GitHub's raw host may cache a changed file for a few minutes.

Rules checked by `pnpm build` and `pnpm validate`:

* Paths start with `assets/` and use `/`. URLs, absolute paths, backslashes, `..` and leading-dot segments are rejected. Use only letters, digits, `.`, `_` and `-` in file and folder names.
* A path must stay in its owner's folder: `assets/profile/`, `assets/ecosystem/`, or `assets/projects/<projectId>/`.
* The file must exist, with exactly the same letter case (so a path that works on Windows can't break on Linux CI).
* `resume` must be a `.pdf`. Every other asset must be `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.avif` or `.gif` (lowercase extension).
* `media` entries are `{ "type": "image", "src", "alt" }`. `alt` is localized text like `description` (English required).

Commit the asset files together with the config that references them. Consumers receive paths only; this repository doesn't host or transform the files.
