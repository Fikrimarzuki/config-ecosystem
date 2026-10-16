// Career collections shared by build.mjs (loading and sorting) and validate.mjs
// (checking that the assembled arrays are in canonical order).

// Plain code-unit comparison, so ordering never depends on the machine's locale.
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Each collection: its folder in config/career/, its schema definition and its presentation order. */
export const CAREER_COLLECTIONS = [
  { name: "experience", definition: "experience", order: (a, b) => compare(a.start, b.start) || byId(a, b) },
  { name: "freelance", definition: "freelance", order: (a, b) => a.order - b.order || byId(a, b) },
  { name: "assessments", definition: "assessment", order: (a, b) => b.year - a.year || byId(a, b) },
];

export const ORDER_DESCRIPTION = {
  experience: "start ascending, then id",
  freelance: "order ascending, then id",
  assessments: "year descending, then id",
};
