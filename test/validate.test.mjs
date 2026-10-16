// Focused tests for destination, relationship and monorepo path validation.
// Each case mutates the assembled config/production.json and validates it with the same
// checks as `pnpm build` and `pnpm validate` (validateConfig, in-process).
//
// Usage: pnpm test   (run `pnpm build` first so config/production.json is current)

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";
import { assertInvalid, assertValid, production, root, temporaryDirectory } from "./helpers.mjs";

const DESTINATIONS = ["games", "learning", "tools", "products", "platforms", "career", "labs", "central-station", "sun", "moon"];

test("the current production config is valid", () => assertValid(() => {}));

describe("validate.mjs CLI", () => {
  const { dir, cleanup } = temporaryDirectory();
  after(cleanup);
  const run = (config) => {
    const path = join(dir, "config.json");
    writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
    return spawnSync(process.execPath, [resolve(root, "scripts/validate.mjs"), path], { encoding: "utf8", cwd: root });
  };

  test("exits 0 for a valid config", () => {
    const result = run(production);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /✓ .*config\.json is valid/);
  });

  test("exits 1 and lists errors for an invalid config", () => {
    const config = structuredClone(production);
    delete config.projects.playdeck.destination;
    const result = run(config);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /✗ .*does not match schema\/ecosystem\.schema\.json\n {2}- projects\.playdeck: missing required property "destination"/);
  });
});

describe("destination", () => {
  test("every existing project has exactly one known destination", () => {
    for (const [id, project] of Object.entries(production.projects)) {
      assert.ok(DESTINATIONS.includes(project.destination), `${id} has destination ${JSON.stringify(project.destination)}`);
    }
  });

  test("is required", () => assertInvalid((c) => delete c.projects.playdeck.destination, /projects\.playdeck: missing required property "destination"/));

  for (const destination of DESTINATIONS) {
    test(`accepts ${destination}`, () => assertValid((c) => (c.projects.playdeck.destination = destination)));
  }

  for (const destination of ["black-hole", "asteroid-field", "Games", "latest", ""]) {
    test(`rejects ${JSON.stringify(destination)}`, () =>
      assertInvalid((c) => (c.projects.playdeck.destination = destination), /projects\.playdeck\.destination: must be one of/));
  }

  test("rejects more than one destination", () =>
    assertInvalid((c) => (c.projects.playdeck.destination = ["platforms", "games"]), /projects\.playdeck\.destination: must be one of/));
});

describe("related", () => {
  test("is optional", () => assert.ok(Object.values(production.projects).some((p) => !("related" in p))));

  test("existing relationships are declared once, on one side", () => {
    const declared = Object.fromEntries(Object.entries(production.projects).filter(([, p]) => p.related).map(([id, p]) => [id, p.related]));
    assert.deepEqual(declared, { weddingVendorScraper: ["nikahyuk"] });
  });

  test("accepts canonical project IDs", () => assertValid((c) => (c.projects.nikahyukPrototype.related = ["nikahyuk", "nikahkuy"])));

  test("accepts a hidden target", () => assertValid((c) => (c.projects.playdeck.related = ["wedding"])));

  test("rejects an unknown project", () =>
    assertInvalid((c) => (c.projects.playdeck.related = ["nikahYuk"]), /projects\.playdeck\.related\[0\]: unknown project "nikahYuk"/));

  test("rejects a self-reference", () =>
    assertInvalid((c) => (c.projects.playdeck.related = ["playdeck"]), /projects\.playdeck\.related\[0\]: a project cannot be related to itself/));

  test("rejects a duplicate in one list", () =>
    assertInvalid((c) => (c.projects.playdeck.related = ["neuran", "neuran"]), /projects\.playdeck\.related: must NOT have duplicate items/));

  test("rejects the same relationship declared on both projects", () =>
    assertInvalid((c) => {
      c.projects.nikahyuk.related = ["nikahyukPrototype"];
      c.projects.nikahyukPrototype.related = ["nikahyuk"];
    }, /duplicate relationship between "nikahyukPrototype" and "nikahyuk"/));

  test("rejects an empty list", () => assertInvalid((c) => (c.projects.playdeck.related = []), /projects\.playdeck\.related: must not be empty/));

  test("rejects a non-string entry", () => assertInvalid((c) => (c.projects.playdeck.related = [42]), /projects\.playdeck\.related\[0\]/));
});

describe("path", () => {
  test("existing monorepo paths stay valid", () => {
    const paths = Object.fromEntries(Object.entries(production.projects).filter(([, p]) => p.path).map(([id, p]) => [id, p.path]));
    assert.deepEqual(paths, { foodieMap: "foodie-map", nikahkuy: "nikah-kuy", nikahyukPrototype: "nikah-yuk", tcgHub: "tcg-hub-starter" });
  });

  for (const path of ["apps/web", "packages/ui/src", "a.b/c_d-e", ".config", "nikah-kuy"]) {
    test(`accepts ${JSON.stringify(path)}`, () => assertValid((c) => (c.projects.tcgHub.path = path)));
  }

  test("requires a repository", () =>
    assertInvalid((c) => {
      delete c.projects.tcgHub.repository;
      delete c.projects.tcgHub.repositoryVisibility;
    }, /projects\.tcgHub: "path" requires "repository"/));

  const invalid = {
    "absolute path": "/foodie-map",
    "Windows drive path": "C:/projects/foodie-map",
    "parent traversal": "../foodie-map",
    "nested parent traversal": "apps/../../secret",
    "trailing parent segment": "apps/..",
    "current-directory segment": "./foodie-map",
    backslash: "apps\\web",
    "empty segment": "apps//web",
    "trailing slash": "apps/web/",
    "lone slash": "/",
    "empty string": "",
  };
  for (const [label, path] of Object.entries(invalid)) {
    test(`rejects ${label} (${JSON.stringify(path)})`, () =>
      assertInvalid((c) => (c.projects.tcgHub.path = path), /projects\.tcgHub\.path: /));
  }
});

describe("project source schema", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validateSource = ajv.compile(JSON.parse(readFileSync(resolve(root, "schema/project.schema.json"), "utf8")));
  const source = { id: "example", name: "Example", status: "active", listing: "public", destination: "labs" };

  test("accepts a minimal project with a destination", () => assert.ok(validateSource(source)));

  test("rejects a project file without a destination", () => {
    const { destination, ...withoutDestination } = source;
    assert.ok(!validateSource(withoutDestination));
  });

  test("rejects a path without a repository", () => assert.ok(!validateSource({ ...source, path: "apps/web" })));

  test("accepts a nested path with a repository", () =>
    assert.ok(validateSource({ ...source, repository: "lab-projects", repositoryVisibility: "private", path: "apps/web" })));
});
