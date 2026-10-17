// Concepts: schema shape, cross-collection rules, ordering, source-level build rules and the
// committed records. Validation cases put example concepts into a copy of the assembled
// config (the same checks as `pnpm build` and `pnpm validate`).

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assemble, BuildError } from "../scripts/build.mjs";
import { assertInvalid, assertValid, production, root, temporaryDirectory, writeSources } from "./helpers.mjs";

const concept = (fields = {}) => ({ id: "exampleConcept", title: "Example Concept", kind: "concept", order: 5, ...fields });

/** Mutator that replaces the concepts collection. */
// Synthetic record replacements have no inherited real publication authority.
const concepts = (list) => (c) => { c.concepts = list; c.conceptsPublication = []; };

describe("concepts collection", () => {
  test("always exists in the generated output, as an array", () => assert.ok(Array.isArray(production.concepts)));

  test("an empty collection is valid", () => assertValid(concepts([])));

  test("is required", () => assertInvalid((c) => delete c.concepts, /\(root\): missing required property "concepts"/));

  test("must be an array, not an object keyed by id", () =>
    assertInvalid(concepts({ exampleConcept: concept() }), /concepts: must be array/));

  test("accepts a minimal concept", () => assertValid(concepts([concept()])));
});

describe("concept fields", () => {
  for (const field of ["id", "title", "kind", "order"]) {
    test(`requires ${field}`, () =>
      assertInvalid((c) => {
        const record = concept();
        delete record[field];
        c.concepts = [record];
      }, new RegExp(`concepts\\[0\\]: missing required property "${field}"`)));
  }

  for (const field of ["description", "technologies", "repositories", "deployments", "assets", "relatedProjects", "listing", "status", "destination", "year", "start", "url"]) {
    test(`rejects unknown field ${field}`, () =>
      assertInvalid(concepts([concept({ [field]: "x" })]), new RegExp(`concepts\\[0\\]: unknown property "${field}"`)));
  }

  for (const id of ["Forgebox", "forge-box", "forge_box", "1forgebox", ""]) {
    test(`rejects id ${JSON.stringify(id)}`, () =>
      assertInvalid(concepts([concept({ id })]), /concepts\[0\]\.id: must be a camelCase identifier/));
  }

  test("accepts camelCase ids", () => assertValid(concepts([concept({ id: "comingSoon" })])));

  for (const kind of ["idea", "Concept", "status", "", null]) {
    test(`rejects kind ${JSON.stringify(kind)}`, () =>
      assertInvalid(concepts([concept({ kind })]), /concepts\[0\]\.kind: must be one of "concept", "placeholder"/));
  }

  test("accepts both kinds", () => {
    assertValid(concepts([concept({ kind: "concept" })]));
    assertValid(concepts([concept({ kind: "placeholder" })]));
  });

  for (const title of ["", "   "]) {
    test(`rejects blank title ${JSON.stringify(title)}`, () =>
      assertInvalid(concepts([concept({ title })]), /concepts\[0\]\.title: must not be empty or whitespace-only/));
  }

  for (const order of [0, -10, 1.5, "10", null]) {
    test(`rejects order ${JSON.stringify(order)}`, () => assertInvalid(concepts([concept({ order })]), /concepts\[0\]\.order: /));
  }
});

describe("concept ids", () => {
  test("rejects a duplicate id within the collection", () =>
    assertInvalid(
      concepts([concept({ id: "sameId", order: 10 }), concept({ id: "sameId", order: 20 })]),
      /duplicate concepts id "sameId": concepts\[0\] and concepts\[1\]/,
    ));

  test("rejects a project id", () =>
    assertInvalid(concepts([concept({ id: "playdeck" })]), /concepts\[0\]: id "playdeck" is already a project id/));

  test("rejects a career id", () =>
    assertInvalid(concepts([concept({ id: "myconnect" })]), /concepts\[0\]: id "myconnect" is already career\.freelance\[\d+\]/));

  test("rejects an origins id", () =>
    assertInvalid(concepts([concept({ id: "weCanCode" })]), /concepts\[0\]: id "weCanCode" is already origins\[\d+\]/));
});

describe("concept ordering", () => {
  test("rejects a duplicate order value", () =>
    assertInvalid(
      concepts([concept({ id: "first", order: 10 }), concept({ id: "second", order: 10 })]),
      /duplicate concepts order 10: concepts\[0\] and concepts\[1\]/,
    ));

  test("must be sorted by order ascending", () =>
    assertInvalid(
      concepts([concept({ id: "later", order: 20 }), concept({ id: "earlier", order: 10 })]),
      /concepts\[1\]: concepts must be sorted by order ascending, then id \("later" comes before "earlier"\)/,
    ));

  test("accepts gaps between order values", () =>
    assertValid(concepts([concept({ id: "first", order: 10 }), concept({ id: "second", order: 99 })])));

  test("is not sorted by title or id", () =>
    assertValid(concepts([concept({ id: "zeta", title: "Zeta", order: 10 }), concept({ id: "alpha", title: "Alpha", order: 20 })])));
});

describe("concept sources", () => {
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

  test("a missing config/concepts folder produces an empty collection", () => assert.deepEqual(assembleWith({}).concepts, []));

  test("concepts keep their id and are sorted by order, never by filename", () =>
    assert.deepEqual(
      assembleWith({
        "concepts/aLast.json": concept({ id: "aLast", order: 30 }),
        "concepts/zFirst.json": concept({ id: "zFirst", order: 10 }),
        "concepts/mMiddle.json": concept({ id: "mMiddle", order: 20 }),
      }).concepts.map((record) => record.id),
      ["zFirst", "mMiddle", "aLast"],
    ));

  test("assembling twice gives byte-identical output", () => {
    const files = { "concepts/b.json": concept({ id: "b", order: 2 }), "concepts/a.json": concept({ id: "a", order: 1 }) };
    assert.equal(JSON.stringify(assembleWith(files)), JSON.stringify(assembleWith(files)));
  });

  test("rejects a filename/id mismatch", () =>
    assertBuildError({ "concepts/comingSoon.json": concept({ id: "comingsoon" }) }, /config\/concepts\/comingSoon\.json: id "comingsoon" does not match filename \(expected "comingSoon"\)/));

  test("rejects a missing id", () => {
    const { id, ...record } = concept();
    assertBuildError({ "concepts/sample.json": record }, /config\/concepts\/sample\.json: missing required "id" field/);
  });

  test("rejects a record that fails the concept schema, naming the file", () =>
    assertBuildError({ "concepts/sample.json": concept({ id: "sample", description: "x" }) }, /config\/concepts\/sample\.json does not match schema\/concepts\.schema\.json#\/\$defs\/concept[\s\S]*unknown property "description"/));

  test("rejects an invalid kind, naming the file", () =>
    assertBuildError({ "concepts/sample.json": concept({ id: "sample", kind: "idea" }) }, /config\/concepts\/sample\.json does not match[\s\S]*kind: must be one of "concept", "placeholder"/));

  test("rejects an id that collides with a project file", () =>
    assertBuildError({ "concepts/gateway.json": concept({ id: "gateway" }) }, /Duplicate id "gateway"[\s\S]*config\/projects\/gateway\.json[\s\S]*config\/concepts\/gateway\.json/));

  test("rejects an id that collides with an origins file", () =>
    assertBuildError(
      {
        "origins/sameId.json": { id: "sameId", title: "Entry", year: 2020, order: 10, listing: "public" },
        "concepts/sameId.json": concept({ id: "sameId" }),
      },
      /Duplicate id "sameId"[\s\S]*config\/origins\/sameId\.json[\s\S]*config\/concepts\/sameId\.json/,
    ));

  test("rejects an id that collides with a career file", () =>
    assertBuildError(
      {
        "career/freelance/sameId.json": { id: "sameId", title: "Engagement", listing: "public", order: 1 },
        "concepts/sameId.json": concept({ id: "sameId" }),
      },
      /Duplicate id "sameId"[\s\S]*config\/career\/freelance\/sameId\.json[\s\S]*config\/concepts\/sameId\.json/,
    ));

  test("rejects a concepts key in global.json", () =>
    assertBuildError({ "global.json": { ...base["global.json"], concepts: [] } }, /config\/global\.json must not contain concepts/));
});

describe("committed concepts", () => {
  test("exactly four approved records, in order, with exactly four fields each", () =>
    assert.deepEqual(production.concepts, [
      { id: "forgebox", title: "Forgebox", kind: "concept", order: 10 },
      { id: "hearthside", title: "Hearthside", kind: "concept", order: 20 },
      { id: "momee", title: "Momee", kind: "concept", order: 30 },
      { id: "comingSoon", title: "Coming Soon", kind: "placeholder", order: 40 },
    ]));

  test("contains no metadata beyond id, title, kind and order", () => {
    for (const record of production.concepts) assert.deepEqual(Object.keys(record), ["id", "title", "kind", "order"]);
    assert.doesNotMatch(JSON.stringify(production.concepts), /https?:\/\/|@|github|description|technolog|repositor|asset|deployment/i);
  });

  test("existing projects, career and origins keep their counts", () => {
    assert.equal(Object.keys(production.projects).length, 33);
    assert.equal(production.career.experience.length, 5);
    assert.equal(production.career.experience.reduce((total, record) => total + (record.work ?? []).length, 0), 12);
    assert.equal(production.career.freelance.length, 7);
    assert.equal(production.career.assessments.length, 7);
    assert.equal(production.origins.length, 6);
  });
});
