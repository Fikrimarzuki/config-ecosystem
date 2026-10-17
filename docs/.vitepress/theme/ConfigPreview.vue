<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

// Illustrative excerpts, not a second published registry.
const examples = [
  { label: 'Identity', filename: 'config/global.json', note: 'Shared identity and domains, defined once.', value: { version: 1, username: 'Fikrimarzuki', domains: { primary: 'fikrimarzuki.work' } } },
  { label: 'Projects', filename: 'config/projects/playdeck.json', note: 'A project connects its repository to its deployments.', value: { id: 'playdeck', name: 'Playdeck', repository: 'app-playdeck', deployments: { main: { name: 'playdeck', subdomain: 'playdeck' } } } },
  { label: 'Output', filename: 'dist/ecosystem.json', note: 'Validated sources become one consumer-facing artifact.', value: { version: 1, username: 'Fikrimarzuki', domains: { primary: 'fikrimarzuki.work' }, projects: { playdeck: { name: 'Playdeck', repository: 'app-playdeck' } } } },
];
const selected = ref(0);
const tabs = ref([]);
const copyState = ref('Copy excerpt');
const example = computed(() => examples[selected.value]);
const code = computed(() => JSON.stringify(example.value.value, null, 2));
const lines = computed(() => code.value.split('\n').map(line => line.split(/("(?:[^"\\]|\\.)*"|\b\d+\b)/g).filter(Boolean)));
let resetCopy;

function select(index, focus = false) {
  selected.value = (index + examples.length) % examples.length;
  copyState.value = 'Copy excerpt';
  clearTimeout(resetCopy);
  if (focus) tabs.value[selected.value]?.focus();
}

function navigate(event) {
  const destinations = { ArrowRight: selected.value + 1, ArrowLeft: selected.value - 1, Home: 0, End: examples.length - 1 };
  if (event.key in destinations) {
    event.preventDefault();
    select(destinations[event.key], true);
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(code.value);
    copyState.value = 'Copied';
  } catch {
    copyState.value = 'Select text to copy';
  }
  clearTimeout(resetCopy);
  resetCopy = setTimeout(() => { copyState.value = 'Copy excerpt'; }, 2500);
}
onBeforeUnmount(() => clearTimeout(resetCopy));
</script>

<template>
  <div class="config-preview">
    <div class="preview-chrome"><span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>CONFIG ECOSYSTEM</span><span class="preview-format">JSON</span></div>
    <div class="preview-tabs" role="tablist" aria-label="Configuration excerpts" @keydown="navigate">
      <button v-for="(item, index) in examples" :id="`config-tab-${index}`" :key="item.label" :ref="element => tabs[index] = element" role="tab" :aria-selected="index === selected" :tabindex="index === selected ? 0 : -1" aria-controls="config-example" @click="select(index)">{{ item.label }}</button>
    </div>
    <div id="config-example" class="preview-panel" role="tabpanel" :aria-labelledby="`config-tab-${selected}`" tabindex="0">
      <div class="preview-file"><span><span aria-hidden="true">{ }</span> {{ example.filename }}</span><button class="copy-excerpt" :aria-label="copyState" @click="copy"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M12 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2"/></svg><span aria-live="polite">{{ copyState }}</span></button></div>
      <pre class="preview-code"><code><span v-for="(line, index) in lines" :key="index" class="code-line"><span class="line-number" aria-hidden="true">{{ index + 1 }}</span><span><span v-for="(token, position) in line" :key="position" :class="token.startsWith('&quot;') ? (line[position + 1]?.startsWith(':') ? 'json-key' : 'json-string') : /^\d+$/.test(token) ? 'json-number' : ''">{{ token }}</span></span></span></code></pre>
    </div>
    <div class="preview-caption"><span class="excerpt-label">EXCERPT</span><p>{{ example.note }}</p></div>
  </div>
</template>
