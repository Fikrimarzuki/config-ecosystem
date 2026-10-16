// Career collection rules: schema shape, dates, ordering, local ids, relatedProjects,
// assets and privacy. Each case puts example records into a copy of the assembled
// config and validates it in-process (the same checks as `pnpm build` and `pnpm validate`).
//
// The records below are test fixtures only; real career records are added separately.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { assertInvalid, assertValid, production } from "./helpers.mjs";

const employer = (fields = {}) => ({
  id: "exampleEmployer", company: "Example Company", role: "Engineer",
  start: "2020-06", end: "2021-12", listing: "public", ...fields,
});
const engagement = (fields = {}) => ({ id: "exampleEngagement", title: "Example Engagement", listing: "public", order: 1, ...fields });
const assessment = (fields = {}) => ({ id: "exampleAssessment", title: "Example Assessment", year: 2024, listing: "public", ...fields });
const work = (fields = {}) => ({ id: "example-work", title: "Example work", description: { en: "Example work description." }, ...fields });

/** Mutator that sets one or more career collections. */
const career = (collections) => (c) => Object.assign(c.career, collections);

describe("career output", () => {
  test("always has exactly the three collections, as arrays", () => {
    assert.deepEqual(Object.keys(production.career), ["experience", "freelance", "assessments"]);
    for (const records of Object.values(production.career)) assert.ok(Array.isArray(records));
  });

  test("is required", () => assertInvalid((c) => delete c.career, /\(root\): missing required property "career"/));

  for (const name of ["experience", "freelance", "assessments"]) {
    test(`requires the ${name} collection`, () =>
      assertInvalid((c) => delete c.career[name], new RegExp(`career: missing required property "${name}"`)));
  }

  test("rejects an unknown collection", () =>
    assertInvalid(career({ education: [] }), /career: unknown property "education"/));

  test("collections are arrays, not objects keyed by id", () =>
    assertInvalid(career({ experience: { exampleEmployer: employer() } }), /career\.experience: must be array/));

  test("accepts one valid record in each collection", () =>
    assertValid(career({ experience: [employer()], freelance: [engagement()], assessments: [assessment()] })));
});

describe("career ids", () => {
  for (const id of ["ExampleEmployer", "example-employer", "example_employer", "1example", ""]) {
    test(`rejects ${JSON.stringify(id)}`, () =>
      assertInvalid(career({ experience: [employer({ id })] }), /career\.experience\[0\]\.id: must be a camelCase identifier/));
  }

  test("accepts camelCase ids with digits", () => assertValid(career({ experience: [employer({ id: "hacktiv8" })] })));

  test("rejects a duplicate id across collections", () =>
    assertInvalid(
      career({ experience: [employer({ id: "sameId" })], freelance: [engagement({ id: "sameId" })] }),
      /duplicate career id "sameId": career\.experience\[0\] and career\.freelance\[0\]/,
    ));

  test("rejects a duplicate id within a collection", () =>
    assertInvalid(
      career({ assessments: [assessment({ id: "sameId" }), assessment({ id: "sameId", year: 2023 })] }),
      /duplicate career id "sameId": career\.assessments\[0\] and career\.assessments\[1\]/,
    ));

  test("rejects an id that is already a project id", () =>
    assertInvalid(career({ freelance: [engagement({ id: "playdeck" })] }), /career\.freelance\[0\]: id "playdeck" is already a project id/));
});

describe("required fields", () => {
  const cases = {
    experience: [employer, ["id", "company", "role", "start", "end", "listing"]],
    freelance: [engagement, ["id", "title", "listing", "order"]],
    assessments: [assessment, ["id", "title", "year", "listing"]],
  };
  for (const [name, [make, required]] of Object.entries(cases)) {
    for (const field of required) {
      test(`${name} requires ${field}`, () =>
        assertInvalid((c) => {
          const record = make();
          delete record[field];
          c.career[name] = [record];
        }, new RegExp(`career\\.${name}\\[0\\]: missing required property "${field}"`)));
    }
  }

  test("work items require id, title and description", () => {
    for (const field of ["id", "title", "description"]) {
      const item = work();
      delete item[field];
      assertInvalid(career({ experience: [employer({ work: [item] })] }), new RegExp(`work\\[0\\]: missing required property "${field}"`));
    }
  });

  test("components require id and title", () => {
    for (const field of ["id", "title"]) {
      const component = { id: "part", title: "Part" };
      delete component[field];
      assertInvalid(career({ freelance: [engagement({ components: [component] })] }), new RegExp(`components\\[0\\]: missing required property "${field}"`));
    }
  });

  test("listing must be public or hidden", () =>
    assertInvalid(career({ experience: [employer({ listing: "private" })] }), /career\.experience\[0\]\.listing: must be one of "public", "hidden"/));
});

describe("dates", () => {
  for (const value of ["2020-13", "2020-00", "2020-6", "2020/06", "2020-06-01", "June 2020", "20-06"]) {
    test(`rejects start ${JSON.stringify(value)}`, () =>
      assertInvalid(career({ experience: [employer({ start: value })] }), /career\.experience\[0\]\.start: must be a YYYY-MM date/));
    test(`rejects end ${JSON.stringify(value)}`, () =>
      assertInvalid(career({ experience: [employer({ end: value })] }), /career\.experience\[0\]\.end: must be a YYYY-MM date/));
  }

  test("accepts December and January", () => assertValid(career({ experience: [employer({ start: "2020-01", end: "2020-12" })] })));

  test("accepts a single-month range", () => assertValid(career({ experience: [employer({ start: "2021-03", end: "2021-03" })] })));

  test("rejects experience end before start", () =>
    assertInvalid(career({ experience: [employer({ start: "2021-06", end: "2021-05" })] }), /career\.experience\[0\]: end "2021-05" is before start "2021-06"/));

  test("accepts ongoing employment (end: null)", () => assertValid(career({ experience: [employer({ end: null })] })));

  test("experience end is required even when ongoing", () => {
    const record = employer();
    delete record.end;
    assertInvalid(career({ experience: [record] }), /career\.experience\[0\]: missing required property "end"/);
  });

  test("freelance dates are optional", () => assertValid(career({ freelance: [engagement()] })));

  test("freelance accepts start only", () => assertValid(career({ freelance: [engagement({ start: "2023-01" })] })));

  test("freelance accepts an end date without a start date", () => assertValid(career({ freelance: [engagement({ end: "2023-05" })] })));

  test("freelance accepts an ongoing engagement", () => assertValid(career({ freelance: [engagement({ start: "2023-01", end: null })] })));

  test("rejects freelance end before start", () =>
    assertInvalid(career({ freelance: [engagement({ start: "2026-06", end: "2026-02" })] }), /career\.freelance\[0\]: end "2026-02" is before start "2026-06"/));

  test("accepts the confirmed MyConnect.ai shape (no engagement)", () =>
    assertValid(career({ freelance: [engagement({ id: "myconnect", title: "MyConnect.ai", role: "Senior Frontend Engineer", start: "2026-02", end: "2026-06" })] })));
});

describe("freelance engagement and order", () => {
  test("engagement is optional", () => assert.ok(!("engagement" in engagement())));

  for (const value of ["freelance", "contract", "full-time", "part-time"]) {
    test(`accepts engagement ${value}`, () => assertValid(career({ freelance: [engagement({ engagement: value })] })));
  }

  for (const value of ["Freelance", "employee", "fulltime", ""]) {
    test(`rejects engagement ${JSON.stringify(value)}`, () =>
      assertInvalid(career({ freelance: [engagement({ engagement: value })] }), /career\.freelance\[0\]\.engagement: must be one of/));
  }

  for (const value of [0, -1, 1.5, "1"]) {
    test(`rejects order ${JSON.stringify(value)}`, () =>
      assertInvalid(career({ freelance: [engagement({ order: value })] }), /career\.freelance\[0\]\.order: /));
  }

  test("rejects a duplicate order", () =>
    assertInvalid(
      career({ freelance: [engagement({ id: "first", order: 2 }), engagement({ id: "second", order: 2 })] }),
      /duplicate freelance order 2: career\.freelance\[0\] and career\.freelance\[1\]/,
    ));

  test("accepts gaps between order values", () =>
    assertValid(career({ freelance: [engagement({ id: "first", order: 10 }), engagement({ id: "second", order: 20 })] })));
});

describe("canonical ordering", () => {
  test("experience must be sorted by start ascending", () =>
    assertInvalid(
      career({ experience: [employer({ id: "later", start: "2022-01", end: "2022-06" }), employer({ id: "earlier", start: "2020-01", end: "2020-06" })] }),
      /career\.experience\[1\]: career\.experience must be sorted by start ascending, then id \("later" comes before "earlier"\)/,
    ));

  test("experience ties are broken by id", () =>
    assertInvalid(
      career({ experience: [employer({ id: "beta" }), employer({ id: "alpha" })] }),
      /career\.experience must be sorted by start ascending, then id/,
    ));

  test("freelance must be sorted by order ascending", () =>
    assertInvalid(
      career({ freelance: [engagement({ id: "first", order: 2 }), engagement({ id: "second", order: 1 })] }),
      /career\.freelance must be sorted by order ascending, then id/,
    ));

  test("assessments must be sorted by year descending", () =>
    assertInvalid(
      career({ assessments: [assessment({ id: "older", year: 2020 }), assessment({ id: "newer", year: 2026 })] }),
      /career\.assessments must be sorted by year descending, then id/,
    ));

  test("accepts canonically sorted collections", () =>
    assertValid(career({
      experience: [employer({ id: "alpha", start: "2020-01", end: "2020-06" }), employer({ id: "beta", start: "2020-01", end: "2020-06" }), employer({ id: "gamma", start: "2021-01", end: null })],
      freelance: [engagement({ id: "zeta", order: 1 }), engagement({ id: "alpha2", order: 2 })],
      assessments: [assessment({ id: "newer", year: 2026 }), assessment({ id: "alphaOld", year: 2020 }), assessment({ id: "betaOld", year: 2020 })],
    })));
});

describe("nested work and components", () => {
  test("accepts work items with optional fields", () =>
    assertValid(career({ experience: [employer({
      work: [work({ technologies: ["Go"], start: "2020-07", end: "2021-01", relatedProjects: ["playdeck"] })],
    })] })));

  test("rejects a duplicate work id within one employer", () =>
    assertInvalid(
      career({ experience: [employer({ work: [work(), work()] })] }),
      /duplicate local id "example-work": career\.experience\[0\]\.work\[0\] and career\.experience\[0\]\.work\[1\]/,
    ));

  test("allows the same work id under different employers", () =>
    assertValid(career({ experience: [
      employer({ id: "first", start: "2020-01", work: [work()] }),
      employer({ id: "second", start: "2022-01", end: "2022-12", work: [work()] }),
    ] })));

  test("rejects a work id that is not kebab-case", () =>
    assertInvalid(career({ experience: [employer({ work: [work({ id: "exampleWork" })] })] }), /work\[0\]\.id: must be a lowercase kebab-case identifier/));

  test("rejects work end before start", () =>
    assertInvalid(career({ experience: [employer({ work: [work({ start: "2021-05", end: "2021-01" })] })] }), /work\[0\]: end "2021-01" is before start "2021-05"/));

  test("rejects work starting before the employer", () =>
    assertInvalid(career({ experience: [employer({ work: [work({ start: "2020-01" })] })] }), /work\[0\]\.start: "2020-01" is before the parent's start "2020-06"/));

  test("rejects work ending after the employer", () =>
    assertInvalid(career({ experience: [employer({ work: [work({ end: "2022-03" })] })] }), /work\[0\]\.end: "2022-03" is after the parent's end "2021-12"/));

  test("rejects ongoing work under an employer that has ended", () =>
    assertInvalid(career({ experience: [employer({ work: [work({ start: "2021-01", end: null })] })] }), /work\[0\]\.end: ongoing \(null\), but the parent ended "2021-12"/));

  test("accepts ongoing work under ongoing employment", () =>
    assertValid(career({ experience: [employer({ end: null, work: [work({ start: "2021-01", end: null })] })] })));

  test("accepts work dates at the employer's boundaries", () =>
    assertValid(career({ experience: [employer({ work: [work({ start: "2020-06", end: "2021-12" })] })] })));

  test("accepts components with optional description and technologies", () =>
    assertValid(career({ freelance: [engagement({ components: [
      { id: "operations-app", title: "Operations application" },
      { id: "task-management", title: "Task management", description: { en: "Example." }, technologies: ["React Native"] },
    ] })] })));

  test("rejects a duplicate component id", () =>
    assertInvalid(
      career({ freelance: [engagement({ components: [{ id: "part", title: "A" }, { id: "part", title: "B" }] })] }),
      /duplicate local id "part": career\.freelance\[0\]\.components\[0\] and career\.freelance\[0\]\.components\[1\]/,
    ));

  test("components have no gallery of their own", () =>
    assertInvalid(
      career({ freelance: [engagement({ components: [{ id: "part", title: "A", assets: { cover: "assets/career/freelance/exampleEngagement/a.png" } }] })] }),
      /components\[0\]: unknown property "assets"/,
    ));

  test("freelance has no work items, experience has no components", () => {
    assertInvalid(career({ freelance: [engagement({ work: [work()] })] }), /career\.freelance\[0\]: unknown property "work"/);
    assertInvalid(career({ experience: [employer({ components: [{ id: "part", title: "A" }] })] }), /career\.experience\[0\]: unknown property "components"/);
  });
});

describe("relatedProjects", () => {
  test("accepts canonical project ids, including hidden projects", () =>
    assertValid(career({ experience: [employer({ relatedProjects: ["nikahyuk", "weddingVendorScraper"] })] })));

  for (const [name, make] of [["experience", employer], ["freelance", engagement], ["assessments", assessment]]) {
    test(`rejects an unknown project in ${name}`, () =>
      assertInvalid(career({ [name]: [make({ relatedProjects: ["nikahYuk"] })] }), new RegExp(`career\\.${name}\\[0\\]\\.relatedProjects\\[0\\]: unknown project "nikahYuk"`)));
  }

  test("rejects an unknown project in a work item", () =>
    assertInvalid(career({ experience: [employer({ work: [work({ relatedProjects: ["missing"] })] })] }), /work\[0\]\.relatedProjects\[0\]: unknown project "missing"/));

  test("rejects a career id (references must be project ids)", () =>
    assertInvalid(
      career({ experience: [employer({ relatedProjects: ["exampleEngagement"] })], freelance: [engagement()] }),
      /relatedProjects\[0\]: unknown project "exampleEngagement"/,
    ));

  test("rejects duplicates", () =>
    assertInvalid(career({ experience: [employer({ relatedProjects: ["playdeck", "playdeck"] })] }), /career\.experience\[0\]\.relatedProjects: must NOT have duplicate items/));

  test("rejects an empty list", () =>
    assertInvalid(career({ experience: [employer({ relatedProjects: [] })] }), /career\.experience\[0\]\.relatedProjects: must not be empty/));

  test("does not use the undirected project field name", () =>
    assertInvalid(career({ experience: [employer({ related: ["playdeck"] })] }), /career\.experience\[0\]: unknown property "related"/));
});

describe("assets", () => {
  test("must be in the record's own folder", () =>
    assertInvalid(
      career({ experience: [employer({ assets: { cover: "assets/projects/playdeck/cover.png" } })] }),
      /career\.experience\[0\]\.assets\.cover: must be under assets\/career\/experience\/exampleEmployer\//,
    ));

  test("must not use another career record's folder", () =>
    assertInvalid(
      career({ freelance: [engagement({ assets: { media: [{ type: "image", src: "assets/career/freelance/other/shot.png", alt: { en: "Shot" } }] } })] }),
      /career\.freelance\[0\]\.assets\.media\[0\]\.src: must be under assets\/career\/freelance\/exampleEngagement\//,
    ));

  test("must not use another collection's folder", () =>
    assertInvalid(
      career({ assessments: [assessment({ assets: { thumbnail: "assets/career/experience/exampleAssessment/t.png" } })] }),
      /career\.assessments\[0\]\.assets\.thumbnail: must be under assets\/career\/assessments\/exampleAssessment\//,
    ));

  test("a correctly owned path is only checked for existence", () =>
    assertInvalid(
      career({ experience: [employer({ assets: { cover: "assets/career/experience/exampleEmployer/cover.png" } })] }),
      /career\.experience\[0\]\.assets\.cover: file not found: assets\/career\/experience\/exampleEmployer\/cover\.png/,
    ));

  test("work item assets may use a subfolder of the employer's folder", () =>
    assertInvalid(
      career({ experience: [employer({ work: [work({ assets: { cover: "assets/career/experience/exampleEmployer/example-work/cover.png" } })] })] }),
      /work\[0\]\.assets\.cover: file not found: assets\/career\/experience\/exampleEmployer\/example-work\/cover\.png/,
    ));

  test("work item assets must stay in the employer's folder", () =>
    assertInvalid(
      career({ experience: [employer({ work: [work({ assets: { cover: "assets/career/experience/otherEmployer/cover.png" } })] })] }),
      /work\[0\]\.assets\.cover: must be under assets\/career\/experience\/exampleEmployer\//,
    ));

  test("reuse the project asset path rules", () =>
    assertInvalid(career({ experience: [employer({ assets: { cover: "https://example.com/cover.png" } })] }), /career\.experience\[0\]\.assets\.cover: must be a repository-relative path/));

  test("hidden records must not reference assets", () =>
    assertInvalid(
      career({ freelance: [engagement({ listing: "hidden", assets: { cover: "assets/career/freelance/exampleEngagement/cover.png" } })] }),
      /career\.freelance\[0\]: hidden career records must not reference assets/,
    ));

  test("hidden records must not reference assets in work items", () =>
    assertInvalid(
      career({ experience: [employer({ listing: "hidden", work: [work({ assets: { cover: "assets/career/experience/exampleEmployer/cover.png" } })] })] }),
      /career\.experience\[0\]: hidden career records must not reference assets/,
    ));

  test("hidden records without assets are valid", () =>
    assertValid(career({ experience: [employer({ listing: "hidden" })], assessments: [assessment({ listing: "hidden" })] })));
});

describe("repositories and deployments", () => {
  test("assessments accept a public repository", () =>
    assertValid(career({ assessments: [assessment({ repository: "test-evermos-fe", repositoryVisibility: "public" })] })));

  test("assessments reject a private repository", () =>
    assertInvalid(
      career({ assessments: [assessment({ repository: "test-evermos-fe", repositoryVisibility: "private" })] }),
      /career\.assessments\[0\]\.repositoryVisibility: must be "public" \(got "private"\)/,
    ));

  test("assessments require visibility with a repository", () =>
    assertInvalid(career({ assessments: [assessment({ repository: "test-evermos-fe" })] }), /"repository" requires "repositoryVisibility"/));

  test("assessments require a repository with visibility", () =>
    assertInvalid(career({ assessments: [assessment({ repositoryVisibility: "public" })] }), /"repositoryVisibility" requires "repository"/));

  test("assessments reject a project's repository", () =>
    assertInvalid(
      career({ assessments: [assessment({ repository: "Config-Ecosystem", repositoryVisibility: "public" })] }),
      /career\.assessments\[0\]\.repository: "Config-Ecosystem" is already the repository of projects\.configEcosystem/,
    ));

  test("assessments reject a repository used by another assessment", () =>
    assertInvalid(
      career({ assessments: [
        assessment({ id: "first", repository: "test-pixel-house", repositoryVisibility: "public" }),
        assessment({ id: "second", repository: "TEST-PIXEL-HOUSE", repositoryVisibility: "public" }),
      ] }),
      /duplicate assessment repository "TEST-PIXEL-HOUSE": career\.assessments\[0\] and career\.assessments\[1\]/,
    ));

  const forbidden = {
    experience: [employer, ["repository", "repositoryVisibility", "deployments", "url", "path"]],
    freelance: [engagement, ["repository", "repositoryVisibility", "deployments", "url", "path"]],
    assessments: [assessment, ["deployments", "url", "homepage", "path"]],
  };
  const values = { repository: "web-cv", repositoryVisibility: "private", deployments: { main: { name: "x", subdomain: "x" } }, url: "https://example.com/", homepage: "https://example.com/", path: "app" };
  for (const [name, [make, fields]] of Object.entries(forbidden)) {
    for (const field of fields) {
      test(`${name} rejects ${field}`, () =>
        assertInvalid(career({ [name]: [make({ [field]: values[field] })] }), new RegExp(`career\\.${name}\\[0\\]: unknown property "${field}"`)));
    }
  }
});

describe("assessment company", () => {
  test("is optional", () => assert.ok(!("company" in assessment())));

  test("accepts a company", () => assertValid(career({ assessments: [assessment({ company: "Pixel House Studio" })] })));

  test("accepts an assessment without a company", () => assertValid(career({ assessments: [assessment()] })));

  test("does not affect sorting (year descending, then id)", () =>
    assertValid(career({ assessments: [
      assessment({ id: "zNewer", year: 2024, company: "Zeta" }),
      assessment({ id: "aOlder", year: 2020, company: "Alpha" }),
      assessment({ id: "bOlder", year: 2020 }),
    ] })));

  for (const company of ["", "   "]) {
    test(`rejects ${JSON.stringify(company)}`, () =>
      assertInvalid(career({ assessments: [assessment({ company })] }), /career\.assessments\[0\]\.company: must not be empty or whitespace-only/));
  }

  for (const company of [42, null, true, ["Evermos"], { name: "Evermos" }]) {
    test(`rejects ${JSON.stringify(company)}`, () =>
      assertInvalid(career({ assessments: [assessment({ company })] }), /career\.assessments\[0\]\.company: must be string/));
  }

  test("assessments still have no engagement or type field", () => {
    assertInvalid(career({ assessments: [assessment({ engagement: "freelance" })] }), /career\.assessments\[0\]: unknown property "engagement"/);
    assertInvalid(career({ assessments: [assessment({ type: "take-home" })] }), /career\.assessments\[0\]: unknown property "type"/);
  });
});

describe("other fields", () => {
  test("country is an uppercase ISO 3166-1 alpha-2 code", () => {
    assertValid(career({ experience: [employer({ country: "ID" })], freelance: [engagement({ country: "AU" })] }));
    for (const country of ["id", "IDN", "Indonesia"]) {
      assertInvalid(career({ experience: [employer({ country })] }), /career\.experience\[0\]\.country: must be an ISO 3166-1 alpha-2 country code/);
    }
  });

  test("assessments have no country", () =>
    assertInvalid(career({ assessments: [assessment({ country: "ID" })] }), /career\.assessments\[0\]: unknown property "country"/));

  for (const year of ["2024", 2024.5, 999]) {
    test(`rejects assessment year ${JSON.stringify(year)}`, () =>
      assertInvalid(career({ assessments: [assessment({ year })] }), /career\.assessments\[0\]\.year: /));
  }

  test("description, technologies and tags reuse the project rules", () => {
    assertInvalid(career({ experience: [employer({ description: { en: "x", fr: "y" } })] }), /career\.experience\[0\]\.description: unknown property "fr"/);
    assertInvalid(career({ experience: [employer({ technologies: ["Go", "go"] })] }), /duplicate technology "go": career\.experience\[0\]\.technologies\[0\] and career\.experience\[0\]\.technologies\[1\]/);
    assertInvalid(career({ experience: [employer({ work: [work({ technologies: ["Go", "GO"] })] })] }), /duplicate technology "GO": career\.experience\[0\]\.work\[0\]\.technologies\[0\]/);
    assertInvalid(career({ freelance: [engagement({ components: [{ id: "part", title: "A", technologies: ["React", "react"] }] })] }), /duplicate technology "react": career\.freelance\[0\]\.components\[0\]\.technologies\[0\]/);
    assertInvalid(career({ experience: [employer({ tags: ["x"] })] }), /career\.experience\[0\]: unknown property "tags"/);
  });

  test("whitespace-only strings are rejected", () =>
    assertInvalid(career({ freelance: [engagement({ client: "  " })] }), /career\.freelance\[0\]\.client: must not be empty or whitespace-only/));
});

describe("committed experience records", () => {
  const experience = production.career.experience;
  const workIds = Object.fromEntries(experience.map((record) => [record.id, (record.work ?? []).map((item) => item.id)]));

  test("five employers in chronological order", () =>
    assert.deepEqual(experience.map((record) => record.id), ["pixelHouseStudio", "sekolahmu", "hacktiv8", "bisnistrip", "spacetoco"]));

  test("work items keep their approved source order", () =>
    assert.deepEqual(workIds, {
      pixelHouseStudio: ["managix-page-builder", "nodejs-data-converter"],
      sekolahmu: ["payment-services", "product-and-supporting-services"],
      hacktiv8: ["grading-system", "github-classroom-automation"],
      bisnistrip: ["membership-platform", "apartment-platform", "hotel-platform", "residential-platform", "travel-platform", "digital-document-management"],
      spacetoco: [],
    }));

  test("only the approved relatedProjects reference exists", () => {
    const references = experience.flatMap((record) => [
      ...(record.relatedProjects ?? []).map((id) => `${record.id} -> ${id}`),
      ...(record.work ?? []).flatMap((item) => (item.relatedProjects ?? []).map((id) => `${record.id}.${item.id} -> ${id}`)),
    ]);
    assert.deepEqual(references, ["hacktiv8.github-classroom-automation -> multiRepoClone"]);
  });

  test("work items have no dates or assets yet", () => {
    for (const record of experience) {
      for (const item of record.work ?? []) {
        for (const field of ["start", "end", "assets"]) assert.ok(!(field in item), `${record.id}.${item.id} has ${field}`);
      }
      assert.ok(!("assets" in record), `${record.id} has assets`);
    }
  });
});

describe("committed experience facts", () => {
  test("employer-level facts are unchanged", () =>
    assert.deepEqual(
      production.career.experience.map(({ id, company, role, start, end, country, listing }) => ({ id, company, role, start, end, country, listing })),
      [
        { id: "pixelHouseStudio", company: "Pixel House Studio", role: "Software Engineer", start: "2020-06", end: "2021-12", country: "ID", listing: "public" },
        { id: "sekolahmu", company: "Sekolah.mu", role: "Backend Software Engineer", start: "2022-01", end: "2022-10", country: "ID", listing: "public" },
        { id: "hacktiv8", company: "Hacktiv8", role: "Full Stack JavaScript Instructor", start: "2022-10", end: "2023-09", country: "ID", listing: "public" },
        { id: "bisnistrip", company: "BisnisTrip", role: "Software Engineer", start: "2024-04", end: "2025-12", country: "ID", listing: "public" },
        { id: "spacetoco", company: "SpacetoCo", role: "Full Stack Engineer", start: "2026-04", end: null, country: "AU", listing: "public" },
      ],
    ));

  test("there are 12 work items in total", () =>
    assert.equal(production.career.experience.reduce((total, record) => total + (record.work ?? []).length, 0), 12));
});

describe("committed freelance records", () => {
  const freelance = production.career.freelance;
  const byId = Object.fromEntries(freelance.map((record) => [record.id, record]));

  test("seven records in the curated order", () =>
    assert.deepEqual(
      freelance.map(({ id, order }) => [id, order]),
      [["myconnect", 10], ["miningOperationsPlatform", 20], ["tokenLoyaltyPlatform", 30], ["automotiveInventorySystem", 40], ["shipMonitoringPlatform", 50], ["tradingCommunityPlatform", 60], ["rollingGlory", 70]],
    ));

  test("MyConnect.ai uses the confirmed role and dates", () => {
    const { title, role, country, start, end } = byId.myconnect;
    assert.deepEqual({ title, role, country, start, end }, { title: "MyConnect.ai", role: "Senior Frontend Engineer", country: "US", start: "2026-02", end: "2026-06" });
  });

  test("no record states an engagement type or a client", () => {
    for (const record of freelance) {
      assert.ok(!("engagement" in record), `${record.id} has engagement`);
      assert.ok(!("client" in record), `${record.id} has client`);
    }
  });

  test("every record is public", () => assert.ok(freelance.every((record) => record.listing === "public")));

  test("Mining Operations Platform has its five components in order", () =>
    assert.deepEqual(byId.miningOperationsPlatform.components.map((c) => c.id), ["operations-application", "block-builder", "live-camera-video", "dashboards", "task-management-app"]));

  test("Token Loyalty Platform has its three components in order", () =>
    assert.deepEqual(byId.tokenLoyaltyPlatform.components.map((c) => c.id), ["landing-page", "client-pwa", "admin-dashboard"]));

  test("no other record has components", () =>
    assert.deepEqual(freelance.filter((record) => record.components).map((record) => record.id), ["miningOperationsPlatform", "tokenLoyaltyPlatform"]));

  test("no relatedProjects, assets, repository or deployment information", () => {
    for (const record of freelance) {
      for (const field of ["relatedProjects", "assets", "repository", "repositoryVisibility", "deployments", "url"]) {
        assert.ok(!(field in record), `${record.id} has ${field}`);
      }
    }
    assert.doesNotMatch(JSON.stringify(freelance), /https?:\/\//);
  });

  test("record facts are unchanged", () =>
    assert.deepEqual(
      freelance.map(({ id, title, role, country, start, end }) => [id, title, role, country, start, end]),
      [
        ["myconnect", "MyConnect.ai", "Senior Frontend Engineer", "US", "2026-02", "2026-06"],
        ["miningOperationsPlatform", "Mining Operations Platform", "Frontend Developer", "AU", "2025-06", "2025-10"],
        ["tokenLoyaltyPlatform", "Token Loyalty Platform", "Software Engineer", "MY", "2022-10", "2024-12"],
        ["automotiveInventorySystem", "Automotive Spare Parts Inventory Management System", "Full Stack Developer", "ID", "2024-04", "2024-06"],
        ["shipMonitoringPlatform", "Ship Monitoring Platform", "Frontend Developer", "ID", "2024-01", "2024-03"],
        ["tradingCommunityPlatform", "Trading Community Platform", "Technical Project Consultant", "ID", "2023-10", "2024-02"],
        ["rollingGlory", "Fintech CMS & Client Platform", "Software Developer", "ID", "2022-07", "2022-10"],
      ],
    ));
});

describe("committed assessment records", () => {
  const assessments = production.career.assessments;
  const byId = Object.fromEntries(assessments.map((record) => [record.id, record]));

  test("seven records, sorted by year descending, then id", () =>
    assert.deepEqual(
      assessments.map(({ id, year }) => [id, year]),
      [
        ["aiSessionManager", 2026],
        ["evermosFrontend", 2024],
        ["angularEmployeeManagement", 2023],
        ["pixelHouse1Kanban", 2020],
        ["pixelHouse2DataTable", 2020],
        ["refactoryGraphqlApi", 2020],
        ["refactoryRestApi", 2020],
      ],
    ));

  test("2020 ties are broken alphabetically by id (GraphQL before REST)", () => {
    const ids2020 = assessments.filter((record) => record.year === 2020).map((record) => record.id);
    assert.deepEqual(ids2020, [...ids2020].sort());
    assert.ok(ids2020.indexOf("refactoryGraphqlApi") < ids2020.indexOf("refactoryRestApi"));
  });

  test("titles and companies", () =>
    assert.deepEqual(
      assessments.map(({ id, title, company }) => [id, title, company]),
      [
        ["aiSessionManager", "AI Session Manager", "MyConnect.ai"],
        ["evermosFrontend", "E-commerce Storefront", "Evermos"],
        ["angularEmployeeManagement", "Employee Management App", "Mandiri"],
        ["pixelHouse1Kanban", "Algorithms and Kanban Board", "Pixel House Studio"],
        ["pixelHouse2DataTable", "Data Table Manager", "Pixel House Studio"],
        ["refactoryGraphqlApi", "Meeting Room Booking GraphQL API", "Refactory"],
        ["refactoryRestApi", "Meeting Room Booking REST API", "Refactory"],
      ],
    ));

  test("exactly five public repository references", () =>
    assert.deepEqual(
      Object.fromEntries(assessments.filter((record) => "repository" in record).map(({ id, repository, repositoryVisibility }) => [id, `${repository} (${repositoryVisibility})`])),
      {
        aiSessionManager: "test-ai-session-manager (public)",
        evermosFrontend: "test-evermos-fe (public)",
        angularEmployeeManagement: "test-fe-angular-web-developer (public)",
        pixelHouse1Kanban: "test-pixel-house (public)",
        pixelHouse2DataTable: "test-pixel-house-2 (public)",
      },
    ));

  test("Refactory assessments have no repository references", () => {
    for (const id of ["refactoryRestApi", "refactoryGraphqlApi"]) {
      assert.ok(!("repository" in byId[id]), `${id} has repository`);
      assert.ok(!("repositoryVisibility" in byId[id]), `${id} has repositoryVisibility`);
    }
    assert.doesNotMatch(JSON.stringify(assessments), /skiltestrsp|skilltestrsp/i);
  });

  test("no assets, relatedProjects, deployments, engagement or type", () => {
    for (const record of assessments) {
      for (const field of ["assets", "relatedProjects", "deployments", "url", "homepage", "engagement", "type"]) {
        assert.ok(!(field in record), `${record.id} has ${field}`);
      }
    }
  });

  test("every record is public", () => assert.ok(assessments.every((record) => record.listing === "public")));

  test("no URLs or email addresses", () => {
    const text = JSON.stringify(assessments);
    assert.doesNotMatch(text, /https?:\/\/|www\./);
    assert.doesNotMatch(text, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  });
});
