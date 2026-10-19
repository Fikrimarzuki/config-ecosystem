// Consumer-contract alignment and source-tree rules: values that the Gateway parser would
// reject must fail here first (repository names, trimmed strings, username), plus project
// ids, deployment slugs, and unexpected folders or files under config/.

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assemble, BuildError } from "../scripts/build.mjs";
import { assertInvalid, assertValid, production, root, temporaryDirectory, writeSources } from "./helpers.mjs";

describe("repository names", () => {
  test("every existing project and assessment repository is a valid name", () => {
    const names = [
      ...Object.values(production.projects).map((project) => project.repository),
      ...production.career.assessments.map((record) => record.repository),
    ].filter(Boolean);
    for (const name of names) assert.match(name, /^[A-Za-z0-9._-]+$/, name);
  });

  // Unused names with the same shapes as real ones (a dotted Pages repository, mixed case, underscores).
  for (const name of ["app-playdeck", "Example.github.io", "example-Game", "lab_projects.v2"]) {
    test(`accepts project repository ${JSON.stringify(name)}`, () => assertValid((c) => (c.projects.playdeck.repository = name)));
  }

  const invalid = {
    "a full URL": "https://github.com/Fikrimarzuki/app-playdeck",
    "owner/name": "Fikrimarzuki/app-playdeck",
    "a leading space": " app-playdeck",
    "a trailing space": "app-playdeck ",
    "an inner space": "app playdeck",
    "an empty name": "",
    "invalid characters": "app@playdeck",
  };
  for (const [label, name] of Object.entries(invalid)) {
    test(`rejects a project repository with ${label}`, () =>
      assertInvalid((c) => (c.projects.playdeck.repository = name), /projects\.playdeck\.repository: must be a GitHub repository name/));
    test(`rejects an assessment repository with ${label}`, () =>
      assertInvalid((c) => (c.career.assessments[0].repository = name), /career\.assessments\[0\]\.repository: must be a GitHub repository name/));
  }

  test("repositoryVisibility behavior is unchanged", () => {
    assertValid((c) => (c.projects.playdeck.repositoryVisibility = "public"));
    assertInvalid((c) => (c.career.assessments[0].repositoryVisibility = "private"), /career\.assessments\[0\]\.repositoryVisibility: must be "public"/);
  });
});

describe("trimmed strings consumed by Gateway", () => {
  const fields = {
    "project name": [(c, v) => (c.projects.playdeck.name = v), /projects\.playdeck\.name: must be a non-empty string without leading or trailing whitespace/],
    "profile name": [(c, v) => (c.profile.name = v), /profile\.name: must be a non-empty string without leading or trailing whitespace/],
    "profile title": [(c, v) => (c.profile.title = v), /profile\.title: must be a non-empty string without leading or trailing whitespace/],
  };
  for (const [label, [set, message]] of Object.entries(fields)) {
    for (const value of [" Leading", "Trailing ", "", "   ", "\tTabbed"]) {
      test(`rejects ${label} ${JSON.stringify(value)}`, () => assertInvalid((c) => set(c, value), message));
    }
  }

  test("accepts inner spaces and existing values", () => {
    assertValid((c) => (c.projects.playdeck.name = "Learning Roadmap"));
    assertValid((c) => (c.profile.title = "Full-Stack Software Engineer"));
  });

  for (const value of [" tcg-hub-starter", "tcg-hub-starter ", "apps/web "]) {
    test(`rejects project path ${JSON.stringify(value)}`, () =>
      assertInvalid((c) => (c.projects.tcgHub.path = value), /projects\.tcgHub\.path: must be a relative path inside the repository/));
  }

  test("accepts existing and nested paths", () => {
    assertValid((c) => (c.projects.tcgHub.path = "tcg-hub-starter"));
    assertValid((c) => (c.projects.tcgHub.path = "apps/web"));
  });

  test("rejects a deployment key with surrounding whitespace", () =>
    assertInvalid((c) => {
      c.projects.playdeck.deployments = { " main": c.projects.playdeck.deployments.main };
    }, /projects\.playdeck\.deployments: key " main" must be a non-empty string without leading or trailing whitespace/));

  test("localized descriptions keep their existing rules (surrounding spaces still allowed)", () =>
    assertValid((c) => (c.projects.playdeck.description = { en: " Turn presentations into playable worlds. " })));
});

describe("GitHub username", () => {
  test("the current username is valid", () => assertValid(() => {}));

  for (const username of ["Fikrimarzuki", "fikri-marzuki", "user123"]) {
    test(`accepts ${JSON.stringify(username)}`, () => assertValid((c) => (c.username = username)));
  }

  for (const username of ["Fikri.marzuki", "fikri_marzuki", "fikri marzuki", " Fikrimarzuki", "", "https://github.com/Fikrimarzuki"]) {
    test(`rejects ${JSON.stringify(username)}`, () =>
      assertInvalid((c) => (c.username = username), /username: must be a GitHub username/));
  }
});

describe("project ids", () => {
  test("all 34 existing project ids are camelCase", () => {
    assert.equal(Object.keys(production.projects).length, 34); // 33 + fmStudios (hidden, M8.8c)
    for (const id of Object.keys(production.projects)) assert.match(id, /^[a-z][a-zA-Z0-9]*$/, id);
  });

  for (const id of ["FooBar", "foo-bar", "foo_bar", "foo bar", "1foo"]) {
    test(`rejects project id ${JSON.stringify(id)}`, () =>
      assertInvalid((c) => {
        c.projects[id] = { name: "Example", status: "active", listing: "public", destination: "labs" };
      }, new RegExp(`projects: key "${id.replace(/[-_ ]/g, (m) => `\\${m}`)}" must be a camelCase identifier`)));
  }

  test("rejects a non-camelCase id in a related reference", () =>
    assertInvalid((c) => (c.projects.playdeck.related = ["Neuran"]), /projects\.playdeck\.related\[0\]: must be a camelCase identifier/));
});

describe("deployment names", () => {
  test("every existing deployment name is a lowercase slug", () => {
    for (const project of Object.values(production.projects)) {
      for (const deployment of Object.values(project.deployments ?? {})) assert.match(deployment.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, deployment.name);
    }
  });

  for (const name of ["play deck", "Playdeck", "play_deck", "play--deck", "-playdeck", "playdeck-", "play.deck", ""]) {
    test(`rejects ${JSON.stringify(name)}`, () =>
      assertInvalid((c) => (c.projects.playdeck.deployments.main.name = name), /projects\.playdeck\.deployments\.main\.name: must be a lowercase slug/));
  }

  test("existing deployment forms remain supported", () => {
    assertValid((c) => (c.projects.playdeck.deployments.main = { name: "playdeck-2", subdomain: "playdeck-2" }));
    assert.equal(production.projects.gateway.deployments.main.subdomain, null);
    assert.deepEqual(production.projects.gateway.deployments.main.aliases, ["www"]);
    assert.equal(production.projects.cssTricks.deployments.main.url, "https://fikrimarzuki.github.io/lab-css-tricks/");
  });

  test("the slug rule applies to name, not to an external url", () =>
    assertValid((c) => (c.projects.cssTricks.deployments.main = { name: "css-tricks", url: "https://fikrimarzuki.github.io/Lab_CSS-Tricks/Index.html" })));
});

describe("source tree", () => {
  const fixtures = temporaryDirectory();
  after(fixtures.cleanup);
  let counter = 0;
  const base = {
    "global.json": JSON.parse(readFileSync(resolve(root, "config/global.json"), "utf8")),
    "projects/gateway.json": JSON.parse(readFileSync(resolve(root, "config/projects/gateway.json"), "utf8")),
  };
  const concept = (id, order) => ({ id, title: id, kind: "concept", order });
  const assembleWith = (files) => assemble({ configDir: writeSources(join(fixtures.dir, `fixture-${++counter}`), { ...base, ...files }) });
  const assertBuildError = (files, message) =>
    assert.throws(() => assembleWith(files), (error) => {
      assert.ok(error instanceof BuildError, `expected BuildError, got ${error}`);
      assert.match(`${error.message}\n${error.details.join("\n")}`, message);
      return true;
    });

  test("the repository's own source tree is valid", () => assert.doesNotThrow(() => assemble()));

  test("valid collection folders assemble", () =>
    assert.deepEqual(assembleWith({ "concepts/forgebox.json": concept("forgebox", 10) }).concepts.map((c) => c.id), ["forgebox"]));

  test("an empty collection folder gives an empty collection", () =>
    assert.deepEqual(assembleWith({ "origins/.gitkeep": "", "concepts/.gitkeep": "" }).concepts, []));

  test("placeholder files such as .gitkeep are allowed in every collection folder", () =>
    assert.doesNotThrow(() => assembleWith({
      "projects/.gitkeep": "",
      "career/experience/.gitkeep": "",
      "career/freelance/.gitkeep": "",
      "career/assessments/.gitkeep": "",
      "origins/.gitkeep": "",
      "concepts/.gitkeep": "",
    })));

  test("rejects a mistyped collection folder under config/", () =>
    assertBuildError({ "concept/forgebox.json": concept("forgebox", 10) }, /config\/ may only contain the projects, career, origins, concepts folders[\s\S]*config\/concept\//));

  test("rejects any unknown folder under config/, listing every one", () =>
    assertBuildError({ "origin/a.json": "{}", "project/b.json": "{}" }, /config\/origin\/[\s\S]*config\/project\//));

  test("allows non-folder files such as a README directly under config/", () =>
    assert.doesNotThrow(() => assembleWith({ "README.md": "# Notes\n" })));

  test("rejects an uppercase .JSON extension", () =>
    assertBuildError({ "origins/example.JSON": "{}" }, /config\/origins\/ contains unsupported entries[\s\S]*config\/origins\/example\.JSON \(only lowercase \.json files are allowed\)/));

  for (const filename of ["notes.md", "example.json5", "example.json.bak", "example"]) {
    test(`rejects ${filename} in a collection folder`, () =>
      assertBuildError({ [`concepts/${filename}`]: "x" }, new RegExp(`config/concepts/${filename.replace(/\./g, "\\.")} \\(only lowercase \\.json files are allowed\\)`)));
  }

  test("rejects a nested folder inside a collection folder", () =>
    assertBuildError({ "projects/archive/old.json": "{}" }, /config\/projects\/archive\/ \(folders are not allowed here\)/));

  test("rejects unsupported files in career collection folders", () =>
    assertBuildError({ "career/freelance/draft.txt": "x" }, /config\/career\/freelance\/draft\.txt \(only lowercase \.json files are allowed\)/));
});

describe("generated data unchanged", () => {
  test("collection counts", () => {
    assert.equal(production.version, 1);
    assert.equal(Object.keys(production.projects).length, 34); // 33 + fmStudios (hidden, M8.8c)
    assert.equal(production.career.experience.length, 5);
    assert.equal(production.career.experience.reduce((total, record) => total + (record.work ?? []).length, 0), 12);
    assert.equal(production.career.freelance.length, 7);
    assert.equal(production.career.assessments.length, 7);
    assert.equal(production.origins.length, 6);
    assert.equal(production.concepts.length, 4);
  });
});
