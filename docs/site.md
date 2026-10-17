# Documentation site

[Documentation](README.md) · [Repository overview](../README.md)

The documentation site uses VitePress to render the Markdown guides in `docs/`. The landing page lives in `docs/index.md`, with its layout and styles in `docs/.vitepress/theme/`. Edit a guide once to update both the repository documentation and the website.

## Local development

Use Node.js 24 and the pnpm version declared in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
```

To verify the production output:

```sh
pnpm docs:build
pnpm docs:preview
```

The default base path is `/config-ecosystem/`, matching a GitHub Pages project site. Open the URL printed by the server. Output and caches live in `docs/.vitepress/` and are ignored by Git; `dist/ecosystem.json` remains the committed registry artifact.

Guides have local search, section navigation and light/dark themes. Historical `docs/diagnostics/` files are excluded from site generation and search; links to them open their source on GitHub. Links to repository files outside `docs/` also point to GitHub. The website does not assemble or publish another copy of the registry or project assets.

## GitHub Pages deployment

In the repository's **Settings → Pages**, select **GitHub Actions** as the build source. The [Documentation workflow](../.github/workflows/docs.yml) builds the site on relevant pushes to `main`, then deploys the static output with GitHub's Pages actions. Pull requests build and check links without deploying. You can also start the workflow manually from the Actions tab.

The workflow obtains the base path from `actions/configure-pages`, so the same configuration supports the default project URL and a custom domain. Markdown references remain in this repository; no separate website repository is needed.

## Custom domain

To use `config.fikrimarzuki.work` later:

1. Verify `fikrimarzuki.work` for GitHub Pages in the account settings.
2. Add `config.fikrimarzuki.work` as the repository's Pages custom domain.
3. Add a DNS `CNAME` for `config` pointing to `fikrimarzuki.github.io` at your DNS provider.
4. Enable **Enforce HTTPS** when the certificate is available, then rerun the Documentation workflow so the build uses the root base path.

For a root-path build locally, use `DOCS_BASE=/ pnpm docs:build`. Because this deployment uses GitHub Actions, configure the domain in Pages settings; a source `CNAME` file is not needed.

See [GitHub's custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) for the current DNS and verification steps.
