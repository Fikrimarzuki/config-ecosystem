import { existsSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';

const docsRoot = fileURLToPath(new URL('..', import.meta.url));
const repositoryRoot = resolve(docsRoot, '..');
const repository = 'https://github.com/Fikrimarzuki/config-ecosystem';
// configure-pages supplies the actual path, including custom-domain hosting.
const base = process.env.DOCS_BASE || '/config-ecosystem/';

export default defineConfig({
  title: 'Ecosystem Config',
  description: 'The shared configuration behind FM Work. Reference guides for projects, deployments, collections and consumer integration.',
  lang: 'en-US',
  base,
  cleanUrls: false,
  srcExclude: ['diagnostics/**'],
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#23734f' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'FM Work · Ecosystem Config' }],
  ],
  themeConfig: {
    logo: '/favicon.svg',
    nav: [
      { text: 'Documentation', link: '/README' },
      { text: 'Integration', link: '/consumers/integration' },
      { text: 'Registry ↗', link: 'https://raw.githubusercontent.com/Fikrimarzuki/config-ecosystem/main/dist/ecosystem.json' },
    ],
    sidebar: [
      {
        text: 'Registry reference',
        items: [
          { text: 'Overview', link: '/README' },
          { text: 'Shared configuration', link: '/configuration' },
          { text: 'Projects & deployments', link: '/projects' },
          { text: 'Shared assets', link: '/assets' },
          { text: 'Career, Origins & Concepts', link: '/collections' },
        ],
      },
      {
        text: 'Building & integrating',
        items: [
          { text: 'Development & validation', link: '/development' },
          { text: 'Documentation site', link: '/site' },
          { text: 'Consumer overview', link: '/consumers/README' },
          { text: 'Integration details', link: '/consumers/integration' },
          { text: 'Proposed automation', link: '/consumers/github-actions' },
        ],
      },
      {
        text: 'Publication approvals',
        items: [
          { text: 'Career field grants', link: '/career-publication-approvals' },
          { text: 'Concepts title grants', link: '/concepts-publication-approvals' },
        ],
      },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: 'On this page' },
    socialLinks: [{ icon: 'github', link: repository }],
    editLink: { pattern: `${repository}/edit/main/docs/:path`, text: 'Edit this page on GitHub' },
    footer: {
      message: 'Shared facts. Independent projects.',
      copyright: 'Part of FM Work · Fikri Marzuki',
    },
  },
  markdown: {
    // Keep Markdown links useful on GitHub and on the generated site. Sources
    // outside the published guides (including diagnostics) stay on GitHub.
    config(md) {
      const originalLink = md.renderer.rules.link_open;
      md.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
        const token = tokens[index];
        const href = token.attrGet('href');
        if (href && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) {
          const [path, fragment] = href.split('#');
          const target = resolve(dirname(env.path), decodeURIComponent(path));
          const sourcePath = relative(docsRoot, target).split(sep).join('/');
          if (sourcePath.startsWith('../') || sourcePath === 'diagnostics' || sourcePath.startsWith('diagnostics/')) {
            const repositoryPath = relative(repositoryRoot, target).split(sep).join('/');
            if (repositoryPath.startsWith('../') || !existsSync(target)) {
              throw new Error(`Invalid repository link in ${env.path}: ${href}`);
            }
            const kind = statSync(target).isDirectory() ? 'tree' : 'blob';
            token.attrSet('href', `${repository}/${kind}/main/${repositoryPath}${fragment ? `#${fragment}` : ''}`);
          }
        }
        // VitePress prefixes numbered heading IDs with an underscore. Keep
        // GitHub's original fragment in source and adapt only website links.
        const siteHref = token.attrGet('href');
        if (siteHref && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(siteHref)) {
          token.attrSet('href', siteHref.replace(/#(?=\d)/, '#_'));
        }
        return originalLink ? originalLink(tokens, index, options, env, renderer) : renderer.renderToken(tokens, index, options);
      };
    },
  },
});
