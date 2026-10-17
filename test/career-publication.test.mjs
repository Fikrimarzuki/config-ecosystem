import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assemble, BuildError } from "../scripts/build.mjs";
import { careerApprovalFingerprint, emptyFingerprints } from "../scripts/career-approval-fingerprint.mjs";
import { emptyCareerPublication } from "../scripts/career-publication.mjs";
import { validateConfig } from "../scripts/validate.mjs";
import { production, root, temporaryDirectory, writeSources } from "./helpers.mjs";

const work = () => ({ id: "shared-work", title: "Example work", description: { en: "Reviewed English.", id: "Reviewed Indonesian." }, technologies: ["TypeScript", "Node.js"], relatedProjects: ["gateway"] });
const employer = id => ({ id, company: "Example employer", role: "Engineer", start: "2020-01", end: null, listing: "public", work: [work()] });
const engagement = (id, order) => ({ id, title: "Example engagement", listing: "public", order, components: [{ id: "shared-part", title: "Example component", technologies: ["TypeScript"] }] });
const assessment = () => ({ id: "exampleAssessment", title: "Example assessment", year: 2024, listing: "public", repository: "example-assessment-source", repositoryVisibility: "public" });
const target = {
  experience: { id: "employerA", fields: ["company"], fingerprints: emptyFingerprints() },
  work: { employerId: "employerA", id: "shared-work", fields: ["title"], fingerprints: emptyFingerprints() },
  freelance: { id: "engagementA", fields: ["title"], fingerprints: emptyFingerprints() },
  components: { engagementId: "engagementA", id: "shared-part", fields: ["title"], fingerprints: emptyFingerprints() },
  assessments: { id: "exampleAssessment", fields: ["title"], fingerprints: emptyFingerprints() },
};
function fixture() {
  const c = structuredClone(production);
  c.career = { experience: [employer("employerA"), employer("employerB")], freelance: [engagement("engagementA", 10), engagement("engagementB", 20)], assessments: [assessment()] };
  c.careerPublication = emptyCareerPublication();
  return c;
}
function valid(c) { const r = validateConfig(c); assert.equal(r.ok, true, r.errors?.join("\n")); }
function invalid(c, pattern, heading) {
  const r = validateConfig(c); assert.equal(r.ok, false); assert.match(r.errors.join("\n"), pattern);
  if (heading) assert.match(r.heading, heading);
}
function reviewed(c, kind, selection) {
  const g = { ...structuredClone(selection), fingerprints: emptyFingerprints() };
  for (const category of Object.keys(g.fingerprints)) for (const field of g[category] ?? [])
    g.fingerprints[category][field] = careerApprovalFingerprint(c, kind, g, category, field);
  return g;
}
function reviewSelections(c) {
  for (const [kind, selections] of Object.entries(c.careerPublication))
    c.careerPublication[kind] = selections.map(g => reviewed(c, kind, g));
}
function grant(kind) { const c = fixture(); c.careerPublication[kind].push(reviewed(c, kind, target[kind])); return c; }
function buildFailure(load, pattern) {
  assert.throws(load, error => {
    assert(error instanceof BuildError);
    assert.match([error.message, ...error.details].join("\n"), pattern);
    return true;
  });
}

describe("publication default deny and independent selectors", () => {
  test("real source and both generated artifacts have zero grants", () => {
    const empty = emptyCareerPublication();
    assert.deepEqual(JSON.parse(readFileSync(join(root, "config/career-publication.json"))), empty);
    assert.deepEqual(production.careerPublication, empty);
    assert.deepEqual(JSON.parse(readFileSync(join(root, "dist/ecosystem.json"))).careerPublication, empty);
  });
  test("legacy absence is valid and does not alter canonical listing", () => {
    const c = fixture(); delete c.careerPublication; valid(c);
    assert(c.career.experience.every(p => p.listing === "public"));
  });
  for (const kind of Object.keys(target)) test(`${kind} grant is independent; validation adds no implicit grants`, () => {
    const c = grant(kind), before = structuredClone(c); valid(c); assert.deepEqual(c, before);
    for (const other of Object.keys(target)) if (other !== kind) assert.deepEqual(c.careerPublication[other], []);
  });
  test("employer fields never grant a work item; child-only grant never grants employer fields", () => {
    const parent = grant("experience"), child = grant("work"); valid(parent); valid(child);
    assert.deepEqual(parent.careerPublication.work, []); assert.deepEqual(child.careerPublication.experience, []);
    assert.deepEqual(child.careerPublication.work[0].fields, ["title"]);
  });
  test("engagement fields never grant a component; component-only grant never grants engagement fields", () => {
    const parent = grant("freelance"), child = grant("components"); valid(parent); valid(child);
    assert.deepEqual(parent.careerPublication.components, []); assert.deepEqual(child.careerPublication.freelance, []);
  });
  test("same local id under different parents is independently approvable", () => {
    const c = grant("work"); c.careerPublication.work.push({ ...target.work, employerId: "employerB", fields: ["description.id"] });
    c.careerPublication.components = [target.components, { ...target.components, engagementId: "engagementB" }]; reviewSelections(c); valid(c);
  });
  test("public repository is not an implicit repository grant", () => {
    const c = grant("assessments"); valid(c);
    assert.equal(c.career.assessments[0].repositoryVisibility, "public");
    assert(!c.careerPublication.assessments[0].fields.includes("repository"));
  });
  test("description locale, null end date and exact technology/relationship selections are independent", () => {
    const c = grant("work"); c.careerPublication.work[0] = { ...target.work, fields: ["description.en"], technologies: ["TypeScript"], relatedProjects: ["gateway"] };
    c.careerPublication.experience = [{ id: "employerA", fields: ["end"] }]; reviewSelections(c); valid(c);
    assert(!c.careerPublication.work[0].fields.includes("description.id"));
    assert.deepEqual(c.careerPublication.work[0].technologies, ["TypeScript"]);
  });
  test("exact technology values can be granted without scalar fields", () => {
    const c = grant("components"); c.careerPublication.components[0] = { ...target.components, fields: [], technologies: ["TypeScript"] }; reviewSelections(c); valid(c);
  });
});

describe("publication schema rejects unsupported/malformed declarations", () => {
  for (const value of [null, true, [], "all", {}, { experience: [] }]) test(`rejects structure ${JSON.stringify(value)}`, () => {
    const c = fixture(); c.careerPublication = value; invalid(c, /careerPublication/, /schema/);
  });
  for (const kind of Object.keys(target)) {
    test(`${kind} rejects object maps rather than explicit grant arrays`, () => {
      const c = fixture(); c.careerPublication[kind] = {}; invalid(c, /must be array/, /schema/);
    });
    for (const field of ["*", "id", "listing", "description", "technologies", "relatedProjects", "assets", "deployments", "summary", "work", "components", "repositoryUrl"]) {
      test(`${kind} rejects broad/unknown field ${field}`, () => {
        const c = grant(kind); c.careerPublication[kind][0].fields = [field]; invalid(c, /fields\[0\]: must be one of/, /schema/);
      });
    }
    for (const value of [null, "title", true, [true], [{}]]) test(`${kind} rejects invalid field type ${JSON.stringify(value)}`, () => {
      const c = grant(kind); c.careerPublication[kind][0].fields = value; invalid(c, /fields/, /schema/);
    });
    test(`${kind} rejects duplicate field approvals`, () => {
      const c = grant(kind); const g = c.careerPublication[kind][0]; g.fields.push(g.fields[0]); invalid(c, /duplicate items/, /schema/);
    });
    test(`${kind} rejects exact duplicate grants`, () => {
      const c = grant(kind); c.careerPublication[kind].push(structuredClone(c.careerPublication[kind][0])); invalid(c, /duplicate items/, /schema/);
    });
    test(`${kind} rejects duplicate identity with different fields`, () => {
      const c = grant(kind); c.careerPublication[kind].push({ ...target[kind], fields: [] , technologies: ["TypeScript"] });
      invalid(c, /duplicate approval/, /semantic/);
    });
    for (const extra of ["approved", "all", "links", "repository", "deployment", "items"]) test(`${kind} rejects unknown grant property ${extra}`, () => {
      const c = grant(kind); c.careerPublication[kind][0][extra] = true; invalid(c, /unknown property/, /schema/);
    });
  }
  test("rejects unknown collection instead of silently ignoring it", () => {
    const c = fixture(); c.careerPublication.employers = []; invalid(c, /unknown property "employers"/, /schema/);
  });
  test("rejects numeric, wildcard and wrong-case selector ids", () => {
    for (const id of [0, "*", "EmployerA", "0"]) { const c = grant("experience"); c.careerPublication.experience[0].id = id; invalid(c, /\.id/); }
  });
  test("requires child parent selectors and does not allow positional paths", () => {
    for (const kind of ["work", "components"]) {
      const c = grant(kind); delete c.careerPublication[kind][0][kind === "work" ? "employerId" : "engagementId"]; invalid(c, /missing required/);
      const d = grant(kind); d.careerPublication[kind][0].id = "work[0]"; invalid(d, /\.id/);
    }
  });
  test("rejects duplicate or empty technology/relationship selections", () => {
    for (const property of ["technologies", "relatedProjects"]) for (const values of [[], ["gateway", "gateway"]]) {
      const c = grant("work"); c.careerPublication.work[0][property] = values; invalid(c, /must not be empty|duplicate items/, /schema/);
    }
  });
  test("components cannot grant parent relationships or client identity", () => {
    const c = grant("components"); c.careerPublication.components[0].relatedProjects = ["gateway"]; invalid(c, /unknown property/);
    delete c.careerPublication.components[0].relatedProjects; c.careerPublication.components[0].fields = ["client"]; invalid(c, /must be one of/);
  });
});

describe("publication semantic references and link safety", () => {
  for (const kind of Object.keys(target)) {
    test(`${kind} rejects unknown record/local id`, () => {
      const c = grant(kind); c.careerPublication[kind][0].id = kind === "work" || kind === "components" ? "missing-child" : "missingRecord";
      invalid(c, /unknown .* id/, /semantic/);
    });
    test(`${kind} rejects an empty no-op grant`, () => {
      const c = grant(kind); c.careerPublication[kind][0].fields = []; invalid(c, /at least one field or value/, /semantic/);
    });
    test(`${kind} does not allow grants for canonically hidden records/parents`, () => {
      const c = grant(kind), group = kind === "work" ? "experience" : kind === "components" ? "freelance" : kind;
      c.career[group][0].listing = "hidden"; invalid(c, /requires canonical public listing/, /semantic/);
    });
  }
  for (const kind of ["work", "components"]) test(`${kind} rejects unknown parent and child under the wrong parent`, () => {
    const c = grant(kind), key = kind === "work" ? "employerId" : "engagementId";
    c.careerPublication[kind][0][key] = "unknownParent"; invalid(c, /unknown .* parent/);
    c.careerPublication[kind][0][key] = kind === "work" ? "employerB" : "engagementB";
    c.career[kind === "work" ? "experience" : "freelance"][1][kind] = undefined; invalid(c, /unknown .* id/);
  });
  test("rejects approving a missing locale or optional field rather than guessing content", () => {
    const c = grant("work"); delete c.career.experience[0].work[0].description.id;
    c.careerPublication.work[0].fields = ["description.id"]; invalid(c, /absent from the canonical record/);
    const d = grant("freelance"); d.careerPublication.freelance[0].fields = ["client"]; invalid(d, /absent from the canonical record/);
  });
  test("technology selection is exact and scoped to the record, without parent inheritance", () => {
    const c = grant("components"); c.careerPublication.components[0].technologies = ["Unapproved technology"]; invalid(c, /not a canonical technology/);
    c.career.freelance[0].technologies = ["Node.js"]; c.careerPublication.components[0].technologies = ["Node.js"]; invalid(c, /not a canonical technology/);
  });
  test("relationships must be declared by this exact record and target a public project", () => {
    const c = grant("work"); c.careerPublication.work[0].relatedProjects = ["support"]; invalid(c, /not a canonical relationship/);
    c.careerPublication.work[0].relatedProjects = ["unknownProject"]; invalid(c, /must reference a public project/);
    c.career.experience[0].work[0].relatedProjects = ["wedding"]; c.careerPublication.work[0].relatedProjects = ["wedding"]; invalid(c, /must reference a public project/);
  });
  test("explicit repository grant requires the canonical public repository; absence is rejected", () => {
    const c = grant("assessments"); c.careerPublication.assessments[0].fields = ["repository"]; reviewSelections(c); valid(c);
    delete c.career.assessments[0].repository; delete c.career.assessments[0].repositoryVisibility;
    invalid(c, /absent from the canonical record|requires a declared public repository/);
  });
  test("private assessment repository declaration still fails the original Career schema", () => {
    const c = grant("assessments"); c.career.assessments[0].repositoryVisibility = "private"; invalid(c, /must be "public"/, /schema/);
  });
  test("repository approvals are unsupported for employers, work, engagements and components", () => {
    for (const kind of ["experience", "work", "freelance", "components"]) {
      const c = grant(kind); c.careerPublication[kind][0].fields = ["repository"]; invalid(c, /must be one of/, /schema/);
    }
  });
});

describe("publication source and generated contract", () => {
  function source(files, run) {
    const tmp = temporaryDirectory();
    try {
      const configDir = writeSources(tmp.dir, {
        "global.json": JSON.parse(readFileSync(join(root, "config/global.json"))),
        "projects/gateway.json": JSON.parse(readFileSync(join(root, "config/projects/gateway.json"))),
        "career/experience/employerA.json": employer("employerA"),
        ...files,
      });
      run(() => assemble({ configDir }));
    } finally { tmp.cleanup(); }
  }
  test("missing publication source explicitly assembles deny-all for legacy source trees", () => source({}, load => assert.deepEqual(load().careerPublication, emptyCareerPublication())));
  test("invalid source approvals cannot bypass validation through assemble()", () => source({ "career-publication.json": { ...emptyCareerPublication(), experience: [{ id: "unknownEmployer", fields: ["company"], fingerprints: emptyFingerprints() }] } }, load => buildFailure(load, /unknown experience id/)));
  test("assembly rejects changed approved source without rewriting evidence", () => {
    const c = fixture(), g = reviewed(c, "work", target.work);
    const permissions = { ...emptyCareerPublication(), work: [g] }, before = structuredClone(permissions);
    source({ "career/experience/employerA.json": { ...employer("employerA"), work: [{ ...work(), title: "Changed approved title" }] },
      "career-publication.json": permissions }, load => buildFailure(load, /stale/));
    assert.deepEqual(permissions, before);
  });
  test("malformed source approval file fails before output replacement", () => source({ "career-publication.json": { ...emptyCareerPublication(), experience: [{ id: "employerA", fields: ["*"] }] } }, load => assert.throws(load, BuildError)));
  test("global approvals cannot be silently shadowed by the dedicated source", () => source({ "global.json": { ...JSON.parse(readFileSync(join(root, "config/global.json"))), careerPublication: emptyCareerPublication() } }, load => assert.throws(load, /must not contain careerPublication/)));
  test("assembly sorts grants by stable ids independently of insertion order", () => {
    const c = fixture(); c.career.experience[0].work.push({ ...work(), id: "z-work" });
    const a = { ...emptyCareerPublication(), work: [reviewed(c, "work", { ...target.work, id: "z-work" }), reviewed(c, "work", target.work)] };
    source({ "career/experience/employerA.json": employer("employerA"), "career-publication.json": a }, load => buildFailure(load, /unknown work id/));
    source({ "career/experience/employerA.json": { ...employer("employerA"), work: [work(), { ...work(), id: "z-work" }] }, "career-publication.json": a }, load => {
      assert.deepEqual(load().careerPublication.work.map(g => g.id), ["shared-work", "z-work"]);
      assert.deepEqual(load(), load());
    });
  });
});
