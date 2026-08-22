/**
 * Deterministic Foundry document ids and content hashing.
 *
 * Pure module — no Foundry globals. Runs identically in Node (tests) and
 * inside Foundry's browser environment, because both expose the same
 * standard Web Crypto `crypto.subtle` global (verified in both — see
 * design/testing-strategy.md).
 */

/**
 * Derive a stable 16-char alphanumeric Foundry document id from a repo id
 * string, so re-running the sync against unchanged data is idempotent and
 * cross-references resolve without a lookup table. Hex digest characters
 * are already a subset of [a-zA-Z0-9], so a straight truncation is valid.
 */
export async function deriveFoundryId(sourceId) {
  const bytes = new TextEncoder().encode(`blank-inheritance:${sourceId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 16);
}

/** Content hash of a source JSON object, for the push/harvest hash-flag mechanism. */
export async function contentHash(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
