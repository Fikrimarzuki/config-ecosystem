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

The second block is a project file example; `playdeck` has no assets yet.

Rules checked by `pnpm build` and `pnpm validate`:

* Paths start with `assets/` and use `/`. URLs, absolute paths, backslashes, `..` and leading-dot segments are rejected. Use only letters, digits, `.`, `_` and `-` in file and folder names.
* A path must stay in its owner's folder: `assets/profile/`, `assets/ecosystem/`, or `assets/projects/<projectId>/`.
* The file must exist, with exactly the same letter case (so a path that works on Windows can't break on Linux CI).
* `resume` must be a `.pdf`. Every other asset must be `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.avif` or `.gif` (lowercase extension).
* `media` entries are `{ "type": "image", "src", "alt" }`. `alt` is localized text like `description` (English required).

Commit the asset files together with the config that references them. Consumers receive paths only; this repository doesn't host or transform the files.
