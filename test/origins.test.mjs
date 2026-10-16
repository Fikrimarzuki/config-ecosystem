// Origins archive: schema shape, cross-collection rules, ordering, repositories, assets,
// source-level build rules and the committed records. Validation cases put example entries
// into a copy of the assembled config (the same checks as `pnpm build` and `pnpm validate`).

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assemble, BuildError } from "../scripts/build.mjs";
import { assertInvalid, assertValid, production, root, temporaryDirectory, writeSources } from "./helpers.mjs";

const entry = (fields = {}) => ({ id: "exampleEntry", title: "Example Entry", year: 2020, order: 5, listing: "public", ...fields });

/** Mutator that replaces the origins archive. */
const origins = (entries) => (c) => { c.origins = entries; };

describe("origins collection", () => {
  test("always exists in the generated output, as an array", () => assert.ok(Array.isArray(production.origins)));

  test("an empty archive is valid", () => assertValid(origins([])));

  test("is required", () => assertInvalid((c) => delete c.origins, /\(root\): missing required property "origins"/));

  test("is an array, not an object keyed by id", () =>
    assertInvalid(origins({ exampleEntry: entry() }), /origins: must be array/));

  test("accepts a minimal entry", () => assertValid(origins([entry()])));
});

describe("origins fields", () => {
  for (const field of ["id", "title", "year", "order", "listing"]) {
    test(`requires ${field}`, () =>
      assertInvalid((c) => {
        const record = entry();
        delete record[field];
        c.origins = [record];
      }, new RegExp(`origins\\[0\\]: missing required property "${field}"`)));
  }

  for (const id of ["ExampleEntry", "example-entry", "example_entry", "1example"]) {
    test(`rejects id ${JSON.stringify(id)}`, () =>
      assertInvalid(origins([entry({ id })]), /origins\[0\]\.id: must be a camelCase identifier/));
  }

  for (const year of [2020.5, "2020", 999]) {
    test(`rejects year ${JSON.stringify(year)}`, () => assertInvalid(origins([entry({ year })]), /origins\[0\]\.year: /));
  }

  for (const order of [0, -10, 1.5, "10"]) {
    test(`rejects order ${JSON.stringify(order)}`, () => assertInvalid(origins([entry({ order })]), /origins\[0\]\.order: /));
  }

  test("listing must be public or hidden", () =>
    assertInvalid(origins([entry({ listing: "private" })]), /origins\[0\]\.listing: must be one of "public", "hidden"/));

  test("description and technologies reuse the project rules", () => {
    assertInvalid(origins([entry({ description: { en: "x", fr: "y" } })]), /origins\[0\]\.description: unknown property "fr"/);
    assertInvalid(origins([entry({ technologies: ["Vue.js", "vue.js"] })]), /duplicate technology "vue\.js": origins\[0\]\.technologies\[0\] and origins\[0\]\.technologies\[1\]/);
    assertInvalid(origins([entry({ technologies: [] })]), /origins\[0\]\.technologies: must not be empty/);
  });

  for (const field of ["destination", "deployments", "url", "homepage", "company", "engagement", "role", "start", "geometry", "camera", "animation", "repository"]) {
    test(`rejects unknown field ${field}`, () =>
      assertInvalid(origins([entry({ [field]: "x" })]), new RegExp(`origins\\[0\\]: unknown property "${field}"`)));
  }
});

describe("origins ids", () => {
  test("rejects a duplicate id within the archive", () =>
    assertInvalid(
      origins([entry({ id: "sameId", order: 10 }), entry({ id: "sameId", order: 20 })]),
      /duplicate origins id "sameId": origins\[0\] and origins\[1\]/,
    ));

  test("rejects an id that is already a project id", () =>
    assertInvalid(origins([entry({ id: "cssTricks" })]), /origins\[0\]: id "cssTricks" is already a project id/));

  test("rejects an id that is already a career id", () =>
    assertInvalid(origins([entry({ id: "hacktiv8" })]), /origins\[0\]: id "hacktiv8" is already used by career\.experience\[\d+\]/));

  test("rejects an id used by an assessment", () =>
    assertInvalid(origins([entry({ id: "pixelHouse1Kanban" })]), /origins\[0\]: id "pixelHouse1Kanban" is already used by career\.assessments\[\d+\]/));
});

describe("origins ordering", () => {
  test("rejects a duplicate order value", () =>
    assertInvalid(
      origins([entry({ id: "first", order: 10 }), entry({ id: "second", order: 10 })]),
      /duplicate origins order 10: origins\[0\] and origins\[1\]/,
    ));

  test("must be sorted by order ascending", () =>
    assertInvalid(
      origins([entry({ id: "later", order: 20 }), entry({ id: "earlier", order: 10 })]),
      /origins\[1\]: origins must be sorted by order ascending, then id \("later" comes before "earlier"\)/,
    ));

  test("is not sorted by year", () =>
    assertValid(origins([entry({ id: "older", order: 10, year: 2019 }), entry({ id: "newer", order: 20, year: 2026 })])));

  test("accepts gaps between order values", () =>
    assertValid(origins([entry({ id: "first", order: 10 }), entry({ id: "second", order: 60 })])));
});

describe("origins repositories", () => {
  test("accepts repositories with and without roles", () =>
    assertValid(origins([entry({ repositories: [{ name: "example-server", role: "Server" }, { name: "Example.Client_2" }] })])));

  test("rejects an empty list", () => assertInvalid(origins([entry({ repositories: [] })]), /origins\[0\]\.repositories: must not be empty/));

  for (const name of ["https://github.com/Fikrimarzuki/kanban", "Fikrimarzuki/kanban", "kanban porto", ""]) {
    test(`rejects repository name ${JSON.stringify(name)}`, () =>
      assertInvalid(origins([entry({ repositories: [{ name }] })]), /origins\[0\]\.repositories\[0\]\.name: must be a GitHub repository name/));
  }

  test("requires a name", () =>
    assertInvalid(origins([entry({ repositories: [{ role: "Server" }] })]), /origins\[0\]\.repositories\[0\]: missing required property "name"/));

  test("rejects an empty role", () =>
    assertInvalid(origins([entry({ repositories: [{ name: "example", role: " " }] })]), /origins\[0\]\.repositories\[0\]\.role: must not be empty or whitespace-only/));

  for (const field of ["url", "host", "visibility", "repositoryVisibility", "deployment"]) {
    test(`rejects repository field ${field}`, () =>
      assertInvalid(origins([entry({ repositories: [{ name: "example", [field]: "x" }] })]), new RegExp(`origins\\[0\\]\\.repositories\\[0\\]: unknown property "${field}"`)));
  }

  test("rejects a duplicate repository within one entry", () =>
    assertInvalid(
      origins([entry({ repositories: [{ name: "example" }, { name: "example" }] })]),
      /duplicate origins repository "example": origins\[0\]\.repositories\[0\] and origins\[0\]\.repositories\[1\]/,
    ));

  test("rejects a repository used by another entry (ignoring case)", () =>
    assertInvalid(
      origins([entry({ id: "first", order: 10, repositories: [{ name: "Example" }] }), entry({ id: "second", order: 20, repositories: [{ name: "example" }] })]),
      /duplicate origins repository "example": origins\[0\]\.repositories\[0\] and origins\[1\]\.repositories\[0\]/,
    ));

  test("rejects a canonical project's repository", () =>
    assertInvalid(origins([entry({ repositories: [{ name: "lab-css-tricks" }] })]), /origins\[0\]\.repositories\[0\]: "lab-css-tricks" is already the repository of projects\.cssTricks/));

  test("rejects an assessment's repository", () =>
    assertInvalid(origins([entry({ repositories: [{ name: "test-pixel-house" }] })]), /origins\[0\]\.repositories\[0\]: "test-pixel-house" is already the repository of career\.assessments\[\d+\]/));
});

describe("origins relatedProjects", () => {
  test("accepts canonical project ids", () => assertValid(origins([entry({ relatedProjects: ["cssTricks"] })])));

  test("rejects an unknown project", () =>
    assertInvalid(origins([entry({ relatedProjects: ["csstricks"] })]), /origins\[0\]\.relatedProjects\[0\]: unknown project "csstricks"/));

  test("rejects a career id", () =>
    assertInvalid(origins([entry({ relatedProjects: ["hacktiv8"] })]), /origins\[0\]\.relatedProjects\[0\]: unknown project "hacktiv8"/));

  test("rejects duplicates", () =>
    assertInvalid(origins([entry({ relatedProjects: ["cssTricks", "cssTricks"] })]), /origins\[0\]\.relatedProjects: must NOT have duplicate items/));

  test("does not use the undirected project field name", () =>
    assertInvalid(origins([entry({ related: ["cssTricks"] })]), /origins\[0\]: unknown property "related"/));
});

describe("origins assets", () => {
  test("must be in the entry's own folder", () =>
    assertInvalid(origins([entry({ assets: { cover: "assets/projects/playdeck/cover.png" } })]), /origins\[0\]\.assets\.cover: must be under assets\/origins\/exampleEntry\//));

  test("must not use another entry's folder", () =>
    assertInvalid(
      origins([entry({ assets: { media: [{ type: "image", src: "assets/origins/other/shot.png", alt: { en: "Shot" } }] } })]),
      /origins\[0\]\.assets\.media\[0\]\.src: must be under assets\/origins\/exampleEntry\//,
    ));

  test("a correctly owned path is only checked for existence", () =>
    assertInvalid(origins([entry({ assets: { cover: "assets/origins/exampleEntry/cover.png" } })]), /origins\[0\]\.assets\.cover: file not found: assets\/origins\/exampleEntry\/cover\.png/));

  test("reuse the project asset path rules", () =>
    assertInvalid(origins([entry({ assets: { cover: "https://example.com/cover.png" } })]), /origins\[0\]\.assets\.cover: must be a repository-relative path/));

  test("hidden entries must not reference assets", () =>
    assertInvalid(
      origins([entry({ listing: "hidden", assets: { cover: "assets/origins/exampleEntry/cover.png" } })]),
      /origins\[0\]: hidden origins entries must not reference assets/,
    ));

  test("hidden entries without assets are valid", () => assertValid(origins([entry({ listing: "hidden" })])));
});

describe("origins sources", () => {
  const fixtures = temporaryDirectory();
  after(fixtures.cleanup);
  let counter = 0;
  const base = {
    "global.json": JSON.parse(readFileSync(resolve(root, "config/global.json"), "utf8")),
    "projects/gateway.json": JSON.parse(readFileSync(resolve(root, "config/projects/gateway.json"), "utf8")),
  };
  const assembleWith = (files) => assemble({ configDir: writeSources(join(fixtures.dir, `fixture-${++counter}`), { ...base, ...files }) });
  const assertBuildError = (files, message) =>
    assert.throws(() => assembleWith(files), (error) => {
      assert.ok(error instanceof BuildError, `expected BuildError, got ${error}`);
      assert.match(`${error.message}\n${error.details.join("\n")}`, message);
      return true;
    });

  test("a missing config/origins folder produces an empty archive", () => assert.deepEqual(assembleWith({}).origins, []));

  test("entries keep their id and are sorted by order, never by filename", () =>
    assert.deepEqual(
      assembleWith({
        "origins/aLast.json": entry({ id: "aLast", order: 30 }),
        "origins/zFirst.json": entry({ id: "zFirst", order: 10 }),
        "origins/mMiddle.json": entry({ id: "mMiddle", order: 20 }),
      }).origins.map((record) => record.id),
      ["zFirst", "mMiddle", "aLast"],
    ));

  test("rejects a filename/id mismatch", () =>
    assertBuildError({ "origins/firstAttack.json": entry({ id: "firstattack" }) }, /config\/origins\/firstAttack\.json: id "firstattack" does not match filename \(expected "firstAttack"\)/));

  test("rejects a record that fails the entry schema, naming the file", () =>
    assertBuildError({ "origins/sample.json": entry({ id: "sample", destination: "games" }) }, /config\/origins\/sample\.json does not match schema\/origins\.schema\.json#\/\$defs\/entry[\s\S]*unknown property "destination"/));

  test("rejects an id that collides with a project file", () =>
    assertBuildError({ "origins/gateway.json": entry({ id: "gateway" }) }, /Duplicate id "gateway"[\s\S]*config\/projects\/gateway\.json[\s\S]*config\/origins\/gateway\.json/));

  test("rejects an id that collides with a career file", () =>
    assertBuildError(
      {
        "career/assessments/sameId.json": { id: "sameId", title: "Assessment", year: 2024, listing: "public" },
        "origins/sameId.json": entry({ id: "sameId" }),
      },
      /Duplicate id "sameId"[\s\S]*config\/career\/assessments\/sameId\.json[\s\S]*config\/origins\/sameId\.json/,
    ));

  test("rejects an origins key in global.json", () =>
    assertBuildError({ "global.json": { ...base["global.json"], origins: [] } }, /config\/global\.json must not contain origins/));
});

describe("committed origins records", () => {
  const archive = production.origins;
  const byId = Object.fromEntries(archive.map((record) => [record.id, record]));

  test("six entries in curated order", () =>
    assert.deepEqual(
      archive.map(({ id, title, year, order }) => [id, title, year, order]),
      [
        ["coursesLearning", "Courses & Learning", 2020, 10],
        ["realtimeSlideshow", "Real-Time Slideshow", 2020, 20],
        ["ecommerceApplications", "E-commerce Applications", 2020, 30],
        ["fullStackKanban", "Full-Stack Kanban", 2020, 40],
        ["firstAttack", "First Attack!", 2019, 50],
        ["weCanCode", "We Can Code", 2019, 60],
      ],
    ));

  test("technologies", () =>
    assert.deepEqual(Object.fromEntries(archive.map(({ id, technologies }) => [id, technologies])), {
      coursesLearning: ["Python", "JavaScript", "React", "React Native", "PHP", "Laravel", "Kotlin"],
      realtimeSlideshow: ["Vue.js", "BootstrapVue", "Socket.io", "Node.js"],
      ecommerceApplications: ["Node.js", "Express.js", "Sequelize", "PostgreSQL", "JWT", "Jest", "Supertest", "Vue.js", "Vuex", "Vue Router", "Vuetify"],
      fullStackKanban: ["Node.js", "Express.js", "Sequelize", "PostgreSQL", "JWT", "Vue.js", "Google Sign-In"],
      firstAttack: ["HTML", "CSS", "JavaScript"],
      weCanCode: ["HTML", "CSS", "Font Awesome"],
    }));

  test("repository names, roles and exact capitalization", () =>
    assert.deepEqual(Object.fromEntries(archive.map(({ id, repositories }) => [id, (repositories ?? []).map(({ name, role }) => `${name}:${role}`)])), {
      coursesLearning: [],
      realtimeSlideshow: ["realtime-slideshow:Application"],
      ecommerceApplications: ["ecommerce-server:Server", "ecommerce-admin:Admin", "ecommerce-customer:Customer"],
      fullStackKanban: ["kanban:Server", "kanban-porto:Client"],
      firstAttack: ["javascript-Game:Game"],
      weCanCode: ["Fikrimarzuki.github.io:Website"],
    }));

  test("Courses & Learning has no repositories", () => assert.ok(!("repositories" in byId.coursesLearning)));

  test("eight repository references in total, none of them the misspelling ecoommerce", () => {
    assert.equal(archive.reduce((total, record) => total + (record.repositories ?? []).length, 0), 8);
    assert.doesNotMatch(JSON.stringify(archive), /ecoommerce/);
  });

  test("every entry is public, with no assets, relatedProjects or links", () => {
    for (const record of archive) {
      assert.equal(record.listing, "public", record.id);
      for (const field of ["assets", "relatedProjects"]) assert.ok(!(field in record), `${record.id} has ${field}`);
    }
    assert.doesNotMatch(JSON.stringify(archive), /https?:\/\/|www\.|github\.com|gitlab/i);
  });

  test("the excluded repositories stay out of the archive", () => {
    const names = archive.flatMap((record) => (record.repositories ?? []).map((repository) => repository.name.toLowerCase()));
    for (const excluded of ["fancy-todo-1", "hacktiv8-betafox", "converter-temp", "lab-css-tricks", "react-testing-exercise", "elastic-search"]) {
      assert.ok(!names.includes(excluded), excluded);
    }
  });

  test("existing projects and career collections keep their counts", () => {
    assert.equal(Object.keys(production.projects).length, 33);
    assert.equal(production.career.experience.length, 5);
    assert.equal(production.career.experience.reduce((total, record) => total + (record.work ?? []).length, 0), 12);
    assert.equal(production.career.freelance.length, 7);
    assert.equal(production.career.assessments.length, 7);
  });
});
