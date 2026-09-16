/**
 * Generic dotted-path get/set for a plain state object -- no induction- or
 * page-specific meaning at all, just a small utility. Originally written
 * inside induction-intake.mjs for Pages 7-8's free-text field bindings,
 * extracted here 2026-09-10 when the ancestry/background free-boost-slot
 * picking logic (induction-terminal.mjs's #pickFreeSlot) needed the exact
 * same "write to state.<path>, whichever page it belongs to" mechanism, to
 * replace an identity-comparison hack that only worked for exactly two
 * hardcoded arrays.
 */

/**
 * Read a dotted path ("finishing.pronouns", "ancestry.boostPicks") off a
 * plain object. A missing segment reads as "" (not undefined) so a template
 * value binding never has to null-guard. Callers that need array/object
 * semantics (not a display string) should read the target directly instead
 * -- this default suits free-text field values, not general-purpose data.
 */
export function getPath(obj, path) {
  const value = path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), obj);
  return value ?? "";
}

/**
 * Write a dotted path, creating intermediate plain objects as needed.
 * Mutates `obj` in place.
 */
export function setPath(obj, path, value) {
  const segments = path.split(".");
  const last = segments.pop();
  const target = segments.reduce((node, key) => {
    if (node[key] == null || typeof node[key] !== "object") node[key] = {};
    return node[key];
  }, obj);
  target[last] = value;
}
