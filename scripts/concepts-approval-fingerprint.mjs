// Same fixed-tuple/UTF-8/SHA-256 conventions as Career, separate versioned domain.
// Pure calculation only: never writes, creates or repairs publication grants.
import { createHash } from "node:crypto";

export function conceptsApprovalFingerprint(config, id, field = "title") {
  if (field !== "title") throw new Error("Unsupported Concepts approval field");
  const record = config.concepts.find(concept => concept.id === id);
  if (!record) throw new Error("Unknown Concepts approval target");
  if (!Object.hasOwn(record, "title") || typeof record.title !== "string" || !record.title.trim()) throw new Error("Missing Concepts title target");
  const tuple = ["gateway-concepts-approval-v1", "concepts", "", id, "fields", field, record.title];
  return `sha256:${createHash("sha256").update(JSON.stringify(tuple), "utf8").digest("hex")}`;
}
