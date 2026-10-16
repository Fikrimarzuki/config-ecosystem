// Origins archive ordering, shared by build.mjs (sorting) and validate.mjs
// (checking that the assembled array is in canonical order).

/** order ascending, then id by plain code-unit comparison (never locale-dependent). */
export const originsOrder = (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const ORIGINS_ORDER_DESCRIPTION = "order ascending, then id";
