<script setup>
import { withBase } from 'vitepress';
import ConfigPreview from './ConfigPreview.vue';

const repository = 'https://github.com/Fikrimarzuki/config-ecosystem';
const guides = [
  { number: '01', title: 'Know the registry', text: 'Explore shared identity, project models, deployment URLs and collection rules.', link: '/configuration.html', label: 'Registry reference' },
  { number: '02', title: 'Connect a consumer', text: 'Sync configuration at build time and turn canonical facts into application data.', link: '/consumers/integration.html', label: 'Integration guide' },
  { number: '03', title: 'Publish deliberately', text: 'Understand the separate, content-bound approvals for Career and Concepts.', link: '/career-publication-approvals.html', label: 'Publication contracts' },
];
</script>

<template>
  <div class="ecosystem-home">
    <section class="registry-hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="brand-marker" aria-hidden="true"></span>THE SHARED FOUNDATION OF FM WORK</p>
        <h1 id="hero-title">One registry.<br>Every project.<br><span>In sync.</span></h1>
        <p class="hero-description">A common language for my developer ecosystem. Define projects, deployments and shared identity once. Build something different with each.</p>
        <div class="hero-actions">
          <a class="action-primary" :href="withBase('/README.html')">Explore the docs <span aria-hidden="true">↗</span></a>
          <a class="action-secondary" :href="repository">View on GitHub <span aria-hidden="true">↗</span></a>
        </div>
        <p class="hero-note">Public configuration <span aria-hidden="true">/</span> Contract v1 <span aria-hidden="true">/</span> FM Work</p>
      </div>

      <div class="hero-visual">
        <div class="visual-orbit orbit-one" aria-hidden="true"></div><div class="visual-orbit orbit-two" aria-hidden="true"></div>
        <div class="visual-label"><span class="brand-marker" aria-hidden="true"></span>SMALL FILES. SHARED CONTEXT.</div>
        <ConfigPreview />
        <div class="build-receipt"><span class="receipt-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7"/></svg></span><div><strong>Validated before it travels.</strong><span>Schema checks → semantic checks → consumer build</span></div></div>
      </div>
    </section>

    <section class="principles" aria-label="Registry principles">
      <div><span class="principle-mark" aria-hidden="true">01 /</span><h2>Define once</h2><p>Canonical facts live together.<br> Each application owns its presentation.</p></div>
      <div><span class="principle-mark" aria-hidden="true">02 /</span><h2>Validate first</h2><p>Schemas and cross-record checks<br> keep the registry consistent.</p></div>
      <div><span class="principle-mark" aria-hidden="true">03 /</span><h2>Build together</h2><p>Consumers sync the same JSON<br> before their own build and deploy.</p></div>
    </section>

    <section class="explore" aria-labelledby="explore-title">
      <div class="section-heading"><div><p class="eyebrow">A MAP FOR THE ECOSYSTEM</p><h2 id="explore-title">Find your starting point.</h2></div><a :href="withBase('/README.html')">All documentation <span aria-hidden="true">↗</span></a></div>
      <div class="guide-grid">
        <a v-for="guide in guides" :key="guide.number" class="guide-card" :href="withBase(guide.link)"><div class="guide-top"><span class="guide-icon" aria-hidden="true"><svg v-if="guide.number === '01'" viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></svg><svg v-else-if="guide.number === '02'" viewBox="0 0 24 24"><path d="M9 8H6a4 4 0 0 0 0 8h3M15 8h3a4 4 0 0 1 0 8h-3M8 12h8"/></svg><svg v-else viewBox="0 0 24 24"><path d="m12 3 8 4v5c0 4-4 7-8 9-4-2-8-5-8-9V7l8-4Z"/><path d="m8 12 3 3 5-6"/></svg></span><span class="guide-number">/ {{ guide.number }}</span></div><h3>{{ guide.title }}</h3><p>{{ guide.text }}</p><span class="guide-link">{{ guide.label }} <span aria-hidden="true">↗</span></span></a>
      </div>
    </section>

    <aside class="artifact-strip" aria-label="Registry resources"><div><span class="artifact-symbol" aria-hidden="true">{ }</span><div><p class="eyebrow">THE ACTUAL ARTIFACT</p><h2>Configuration you can build on.</h2><p>Modular sources in. One validated JSON file out.</p></div></div><div class="artifact-links"><a class="artifact-primary" href="https://raw.githubusercontent.com/Fikrimarzuki/config-ecosystem/main/dist/ecosystem.json">Open the registry <span aria-hidden="true">↗</span></a><a :href="`${repository}/tree/main/schema`">Browse schemas <span aria-hidden="true">↗</span></a></div></aside>
  </div>
</template>
