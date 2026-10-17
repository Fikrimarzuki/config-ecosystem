// Source-level build rules: assemble() on small fixture source trees, plus a check that the
// committed generated files match what the build produces from this repository.

import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assemble, BuildError } from "../scripts/build.mjs";
import { validateConfig } from "../scripts/validate.mjs";
import { root, temporaryDirectory, writeSources } from "./helpers.mjs";

const realGlobal = JSON.parse(readFileSync(resolve(root, "config/global.json"), "utf8"));
const realProject = (id) => JSON.parse(readFileSync(resolve(root, `config/projects/${id}.json`), "utf8"));

const base = {
  "global.json": realGlobal,
  "projects/gateway.json": realProject("gateway"),
  "projects/support.json": realProject("support"),
};

const employer = (id, fields = {}) => ({ id, company: "Example Company", role: "Engineer", start: "2020-06", end: "2021-12", listing: "public", ...fields });
const engagement = (id, order, fields = {}) => ({ id, title: `Engagement ${id}`, listing: "public", order, ...fields });
const assessment = (id, year, fields = {}) => ({ id, title: `Assessment ${id}`, year, listing: "public", ...fields });

const fixtures = temporaryDirectory();
after(fixtures.cleanup);
let counter = 0;

/** Assembles a fixture made of the base sources plus `files` (paths relative to config/). */
function assembleWith(files, { omit = [] } = {}) {
  const sources = { ...base, ...files };
  for (const path of omit) delete sources[path];
  const configDir = writeSources(join(fixtures.dir, `fixture-${++counter}`), sources);
  return assemble({ configDir });
}

function assertBuildError(files, message, options) {
  assert.throws(() => assembleWith(files, options), (error) => {
    assert.ok(error instanceof BuildError, `expected BuildError, got ${error}`);
    assert.match(`${error.message}\n${error.details.join("\n")}`, message);
    return true;
  });
}

describe("career sources", () => {
  test("missing career folders produce three empty collections", () =>
    assert.deepEqual(assembleWith({}).career, { experience: [], freelance: [], assessments: [] }));

  test("empty folders with a .gitkeep produce empty collections", () =>
    assert.deepEqual(
      assembleWith({ "career/experience/.gitkeep": "", "career/freelance/.gitkeep": "", "career/assessments/.gitkeep": "" }).career,
      { experience: [], freelance: [], assessments: [] },
    ));

  test("records keep their id in the output", () =>
    assert.deepEqual(assembleWith({ "career/experience/hacktiv8.json": employer("hacktiv8") }).career.experience, [employer("hacktiv8")]));

  test("projects stay an object keyed by id, without the id field", () => {
    const { projects } = assembleWith({});
    assert.deepEqual(Object.keys(projects), ["gateway", "support"]);
    assert.ok(!("id" in projects.gateway));
  });

  test("rejects a filename/id mismatch", () =>
    assertBuildError(
      { "career/freelance/myconnect.json": engagement("myConnect", 1) },
      /config\/career\/freelance\/myconnect\.json: id "myConnect" does not match filename \(expected "myconnect"\)/,
    ));

  test("rejects a missing id", () => {
    const { id, ...record } = assessment("sample", 2024);
    assertBuildError({ "career/assessments/sample.json": record }, /config\/career\/assessments\/sample\.json: missing required "id" field/);
  });

  test("rejects a record that fails its collection schema, naming the file", () =>
    assertBuildError(
      { "career/experience/sample.json": employer("sample", { end: "2021-13" }) },
      /config\/career\/experience\/sample\.json does not match schema\/career\.schema\.json#\/\$defs\/experience[\s\S]*end: must be a YYYY-MM date/,
    ));

  test("validates each folder against its own collection schema", () =>
    assertBuildError(
      { "career/assessments/sample.json": engagement("sample", 1) },
      /config\/career\/assessments\/sample\.json does not match schema\/career\.schema\.json#\/\$defs\/assessment/,
    ));

  test("rejects invalid JSON", () =>
    assertBuildError({ "career/freelance/broken.json": "{ not json" }, /config\/career\/freelance\/broken\.json is not valid JSON/));

  test("rejects a duplicate id across career collections", () =>
    assertBuildError(
      { "career/experience/sameId.json": employer("sameId"), "career/assessments/sameId.json": assessment("sameId", 2024) },
      /Duplicate id "sameId"[\s\S]*config\/career\/experience\/sameId\.json[\s\S]*config\/career\/assessments\/sameId\.json/,
    ));

  test("rejects a career id that collides with a project id", () =>
    assertBuildError(
      { "career/freelance/gateway.json": engagement("gateway", 1) },
      /Duplicate id "gateway"[\s\S]*config\/projects\/gateway\.json[\s\S]*config\/career\/freelance\/gateway\.json/,
    ));

  test("rejects an unknown folder in config/career", () =>
    assertBuildError({ "career/education/sample.json": employer("sample") }, /config\/career\/ may only contain[\s\S]*config\/career\/education/));

  test("rejects a career key in global.json", () =>
    assertBuildError({ "global.json": { ...realGlobal, career: { experience: [] } } }, /config\/global\.json must not contain career/));

  test("still rejects a projects key in global.json", () =>
    assertBuildError({ "global.json": { ...realGlobal, projects: {} } }, /config\/global\.json must not contain projects/));
});

describe("deterministic ordering", () => {
  // Filenames sort differently from the presentation order on purpose.
  const files = {
    "career/experience/aLatest.json": employer("aLatest", { start: "2026-04", end: null }),
    "career/experience/zEarliest.json": employer("zEarliest", { start: "2020-06", end: "2021-12" }),
    "career/experience/mMiddleB.json": employer("mMiddleB", { start: "2022-01", end: "2022-10" }),
    "career/experience/mMiddleA.json": employer("mMiddleA", { start: "2022-01", end: "2022-10" }),
    "career/freelance/aThird.json": engagement("aThird", 30),
    "career/freelance/zFirst.json": engagement("zFirst", 10),
    "career/freelance/mSecond.json": engagement("mSecond", 20),
    "career/assessments/aOldest.json": assessment("aOldest", 2020),
    "career/assessments/zNewest.json": assessment("zNewest", 2026),
    "career/assessments/bOld.json": assessment("bOld", 2020),
  };

  test("experience is sorted by start ascending, then id", () =>
    assert.deepEqual(assembleWith(files).career.experience.map((r) => r.id), ["zEarliest", "mMiddleA", "mMiddleB", "aLatest"]));

  test("freelance is sorted by order ascending, then id", () =>
    assert.deepEqual(assembleWith(files).career.freelance.map((r) => r.id), ["zFirst", "mSecond", "aThird"]));

  test("assessments are sorted by year descending, then id", () =>
    assert.deepEqual(assembleWith(files).career.assessments.map((r) => r.id), ["zNewest", "aOldest", "bOld"]));

  test("assembling twice gives byte-identical output", () =>
    assert.equal(JSON.stringify(assembleWith(files), null, 2), JSON.stringify(assembleWith(files), null, 2)));

  test("the assembled fixture passes full validation", () => {
    const result = validateConfig(assembleWith(files));
    assert.ok(result.ok, result.ok ? "" : result.errors.join("\n"));
  });

  test("duplicate freelance order is caught by validation", () => {
    const result = validateConfig(assembleWith({ "career/freelance/a.json": engagement("a", 1), "career/freelance/b.json": engagement("b", 1) }));
    assert.ok(!result.ok);
    assert.match(result.errors.join("\n"), /duplicate freelance order 1/);
  });
});

describe("generated files", () => {
  const production = readFileSync(resolve(root, "config/production.json"), "utf8");
  const dist = readFileSync(resolve(root, "dist/ecosystem.json"), "utf8");

  test("config/production.json and dist/ecosystem.json are byte-identical", () => assert.equal(production, dist));

  test("the committed output matches what the build assembles from this repository", () =>
    assert.equal(production, JSON.stringify(assemble(), null, 2) + "\n"));

  test("the output keeps every existing top-level field and appends independent publication declarations", () =>
    assert.deepEqual(Object.keys(JSON.parse(production)), ["version", "username", "domains", "profile", "ecosystem", "projects", "career", "origins", "concepts", "careerPublication", "conceptsPublication"]));
});
