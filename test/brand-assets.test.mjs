// Brand asset tests for the documentation site: the approved Config Ecosystem browser icons (favicon.ico, SVG icon, Apple
// touch icon) are present, are exactly the approved files, and are declared once each in the VitePress head. Offline and
// dependency-free: PNG/ICO headers are parsed by hand. The generated HTML is verified separately against a docs build.
//
// The files are byte-for-byte copies of the approved exports in the private `ecosystem-assets` repository
// (projects/configEcosystem/branding/exports/, commit 6e3bde1). The SHA-256 digests pin them: change the artwork in
// ecosystem-assets, copy the new files here and update the digests in the same commit.
// docs/public/favicon.svg is a different file: it is the green cube used by the navbar logo and is not part of this set.
// This test reads files only. It never builds or rewrites the registry, and it asserts no registry data beyond the one
// published icon this branding is the source of.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (relative) => readFile(path.join(ROOT, relative));
const readText = (relative) => readFile(path.join(ROOT, relative), "utf8");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const has = (relative) => existsSync(path.join(ROOT, relative));

const APPROVED = {
  "docs/public/favicon.ico": "d27ea82dd850943c86ecb34cc2ab49348b2e33be62614f837ef97f9d6a772827",
  "docs/public/icon.svg": "cf864491acdac8fb2571f47aaacb544c22ebc37442f80f925b3eaa9bf65be7c7",
  "docs/public/apple-touch-icon.png": "29442472c0a3a51f11371f0512c35403f5ade2b6ba4c98ff28d86c1de514d6eb",
};
// The existing navbar logo, unchanged by the branding.
const LOGO_SVG_SHA256 = "af3a2242954b348ba890acdf8742c1511a07bf29e208ab130139e70fd1d455d4";
// The registry's published 512 pixel icon for this project is the approved icon-512.png.
const REGISTRY_ICON = { path: "assets/projects/configEcosystem/icon.png", sha256: "98cae538e91f761e2224068f39e4f6250f67e59a8b779e82d44bfe28e130ad2e" };

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngInfo(bytes, label) {
  assert.ok(bytes.length > 33 && bytes.subarray(0, 8).equals(PNG_SIGNATURE), `${label} is not a PNG`);
  assert.equal(bytes.toString("ascii", 12, 16), "IHDR", `${label}: first chunk is not IHDR`);
  assert.equal(bytes.subarray(bytes.length - 12).toString("hex"), "0000000049454e44ae426082", `${label}: missing IEND trailer`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

function icoFrames(bytes) {
  assert.equal(bytes.readUInt16LE(0), 0, "ICO reserved field");
  assert.equal(bytes.readUInt16LE(2), 1, "ICO type must be 1 (icon)");
  const count = bytes.readUInt16LE(4), frames = [];
  for (let i = 0; i < count; i += 1) {
    const entry = 6 + i * 16, length = bytes.readUInt32LE(entry + 8), offset = bytes.readUInt32LE(entry + 12);
    assert.ok(offset + length <= bytes.length, `ICO frame ${i} runs past the end of the file`);
    frames.push({ width: bytes[entry] || 256, height: bytes[entry + 1] || 256, bitCount: bytes.readUInt16LE(entry + 6), data: bytes.subarray(offset, offset + length) });
  }
  return frames;
}

/** The lines of the `head: [...]` array in the VitePress config. */
async function headEntries() {
  const config = await readText("docs/.vitepress/config.mjs");
  const block = /head: \[\n([\s\S]*?)\n  \],/.exec(config)?.[1] ?? "";
  return { config, entries: block.split("\n").map((line) => line.trim()).filter(Boolean) };
}

describe("approved Config Ecosystem icon files", () => {
  for (const [file, digest] of Object.entries(APPROVED)) {
    it(`${file} is the approved export`, async () => {
      assert.ok(has(file), `${file} is missing`);
      assert.equal(sha256(await read(file)), digest);
    });
  }

  it("favicon.ico holds valid 16, 32 and 48 pixel PNG frames", async () => {
    const frames = icoFrames(await read("docs/public/favicon.ico"));
    assert.deepEqual(frames.map((frame) => frame.width), [16, 32, 48]);
    for (const frame of frames) {
      assert.equal(frame.height, frame.width);
      assert.equal(frame.bitCount, 32);
      const info = pngInfo(Buffer.from(frame.data), `ico ${frame.width}px frame`);
      assert.deepEqual([info.width, info.height], [frame.width, frame.height]);
    }
  });

  it("icon.svg is a well-formed 512 viewBox graphic", async () => {
    const svg = await readText("docs/public/icon.svg");
    assert.match(svg, /^<svg\b[^>]*\bxmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /\bviewBox="0 0 512 512"/);
    assert.equal((svg.match(/<svg\b/g) ?? []).length, 1);
    assert.ok(svg.trimEnd().endsWith("</svg>"));
  });

  it("icon.svg has no scripts, text, embedded images, event handlers or external references", async () => {
    const svg = await readText("docs/public/icon.svg");
    assert.doesNotMatch(svg, /<(script|text|image|foreignObject|style|use)\b/i);
    assert.doesNotMatch(svg, /\son[a-z]+\s*=/i);
    assert.doesNotMatch(svg, /(href|src)\s*=|data:|javascript:|https?:\/\/(?!www\.w3\.org\/2000\/svg)/i);
  });

  it("the Apple touch icon is a 180 x 180 opaque PNG", async () => {
    const info = pngInfo(await read("docs/public/apple-touch-icon.png"), "apple-touch-icon.png");
    assert.deepEqual([info.width, info.height], [180, 180]);
    // Colour type 2 is RGB with no alpha channel: iOS applies its own rounded corners to an opaque square.
    assert.equal(info.colorType, 2);
  });

  it("the published registry icon is still the approved 512 pixel export", async () => {
    assert.equal(sha256(await read(REGISTRY_ICON.path)), REGISTRY_ICON.sha256);
  });
});

describe("VitePress head declarations", () => {
  it("declares the ICO, the SVG icon and the Apple touch icon, each exactly once and base-aware", async () => {
    const { entries } = await headEntries();
    const icons = entries.filter((line) => /rel: '(icon|apple-touch-icon)'/.test(line));
    assert.equal(icons.length, 3, icons.join("\n"));
    const [ico, svg, apple] = icons;
    assert.match(ico, /rel: 'icon'/);
    assert.match(ico, /type: 'image\/x-icon'/);
    assert.match(ico, /href: `\$\{base\}favicon\.ico`/);
    assert.doesNotMatch(ico, /sizes:/);
    assert.match(svg, /rel: 'icon'/);
    assert.match(svg, /type: 'image\/svg\+xml'/);
    assert.match(svg, /href: `\$\{base\}icon\.svg`/);
    assert.match(svg, /sizes: 'any'/);
    assert.match(apple, /rel: 'apple-touch-icon'/);
    assert.match(apple, /href: `\$\{base\}apple-touch-icon\.png`/);
    assert.match(apple, /sizes: '180x180'/);
  });

  it("every declared icon resolves to a file in docs/public", async () => {
    const { entries } = await headEntries();
    const hrefs = entries.flatMap((line) => (/rel: '(?:icon|apple-touch-icon)'/.test(line) ? [/\$\{base\}([\w.-]+)`/.exec(line)?.[1] ?? ""] : []));
    assert.equal(hrefs.length, 3);
    for (const name of hrefs) assert.ok(has(`docs/public/${name}`), name);
  });

  it("the old favicon.svg is no longer a browser icon, but still feeds the navbar logo unchanged", async () => {
    const { config, entries } = await headEntries();
    assert.ok(!entries.some((line) => /favicon\.svg/.test(line)), "favicon.svg is still declared in the head");
    assert.match(config, /logo: '\/favicon\.svg'/);
    assert.equal(sha256(await read("docs/public/favicon.svg")), LOGO_SVG_SHA256);
  });

  it("keeps the site title, description, theme colour and Open Graph entries", async () => {
    const { config, entries } = await headEntries();
    assert.match(config, /title: 'Ecosystem Config'/);
    assert.match(config, /description: 'The shared configuration behind FM Work\./);
    assert.ok(entries.includes("['meta', { name: 'theme-color', content: '#23734f' }],"));
    assert.ok(entries.includes("['meta', { property: 'og:type', content: 'website' }],"));
    assert.ok(entries.includes("['meta', { property: 'og:site_name', content: 'FM Work · Ecosystem Config' }],"));
    assert.ok(!entries.some((line) => /og:image|twitter:|rel: 'manifest'/.test(line)), "unexpected social or manifest entry");
  });

  it("the base path still comes from DOCS_BASE with the project-path default", async () => {
    const { config } = await headEntries();
    assert.match(config, /const base = process\.env\.DOCS_BASE \|\| '\/config-ecosystem\/';/);
  });
});

describe("scope: no PWA, no registry or workflow changes implied by the branding", () => {
  it("no manifest or service worker exists in the site sources", async () => {
    const publicFiles = (await readdir(path.join(ROOT, "docs/public"))).sort();
    assert.deepEqual(publicFiles, ["apple-touch-icon.png", "favicon.ico", "favicon.svg", "icon.svg"]);
    for (const file of ["docs/public/manifest.json", "docs/public/manifest.webmanifest", "docs/public/sw.js", "docs/public/service-worker.js"]) assert.equal(has(file), false, file);
    const pkg = JSON.parse(await readText("package.json"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    assert.deepEqual(deps.filter((name) => /pwa|workbox|serwist/i.test(name)), []);
  });

  it("the registry entry still publishes the same icon and thumbnail paths", async () => {
    const project = JSON.parse(await readText("config/projects/configEcosystem.json"));
    assert.equal(project.assets.icon, REGISTRY_ICON.path);
    assert.equal(project.assets.thumbnail, "assets/projects/configEcosystem/thumbnail.webp");
    assert.equal(project.deployments.main.url, "https://fikrimarzuki.github.io/config-ecosystem/");
  });
});
