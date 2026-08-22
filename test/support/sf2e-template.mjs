// Shared helpers for reasoning about gamesystems/sf2e/template.json.
// Used by tier3-contract.test.mjs directly, and by test/support/mock-foundry.mjs
// so the mock's Actor.create validates against the same real template shape
// tier 3 checks independently — see design/testing-strategy.md §3.

export function deepMerge(...objects) {
  const result = {};
  for (const obj of objects) {
    if (!obj || typeof obj !== "object") continue;
    for (const [key, value] of Object.entries(obj)) {
      const existing = result[key];
      if (value && typeof value === "object" && !Array.isArray(value) && existing && typeof existing === "object" && !Array.isArray(existing)) {
        result[key] = deepMerge(existing, value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Resolve an Actor type's EFFECTIVE schema by merging its declared templates
 * (Actor.templates.<name>) with its own fields — mirrors how Foundry's
 * DataModel template composition actually works. Without this, a field that
 * only exists via a template (like character.details.level) reads as
 * missing even though it's real. Verified gotcha, not assumed — see
 * design/testing-strategy.md §3.
 */
export function resolveActorTemplate(templateJson, actorType) {
  const typeDef = templateJson.Actor[actorType];
  if (!typeDef) throw new Error(`Unknown Actor type "${actorType}" in template.json`);
  const templateNames = typeDef.templates ?? [];
  const templates = templateNames.map((name) => templateJson.Actor.templates[name]);
  const { templates: _omit, ...ownFields } = typeDef;
  return deepMerge(...templates, ownFields);
}

export function hasPath(obj, dottedPath) {
  const parts = dottedPath.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object" || !(part in cur)) return false;
    cur = cur[part];
  }
  return true;
}

/** Every dotted field path an object actually has, flattened (leaves only). */
export function flattenPaths(obj, prefix = "", out = []) {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) out.push(prefix);
    return out;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0 && prefix) {
    out.push(prefix);
    return out;
  }
  for (const key of keys) {
    flattenPaths(obj[key], prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

/**
 * Every dotted path in `systemData` that does NOT exist on the real,
 * template-resolved shape of `actorType` — empty array means it's all real.
 * Single source of truth for this check, used by both
 * test/tier3-contract.test.mjs and test/support/mock-foundry.mjs so they
 * can't silently drift apart the way they did the first time this mock ran
 * (2026-08-22 — the mock didn't know about the skills.* exclusion below and
 * rejected a genuinely valid fixture).
 *
 * skills.* is excluded on purpose: template.json declares npc.skills as {}
 * — an empty placeholder, since individual skill slugs are dynamic at
 * runtime, not statically listed. Checking skills.* would reject every real
 * skill entry, which isn't what "does this field exist" means for that one
 * field — see design/testing-strategy.md §3's tier 3 discussion.
 */
export function findInvalidActorFieldPaths(templateJson, actorType, systemData) {
  const resolved = resolveActorTemplate(templateJson, actorType);
  const checkedPaths = flattenPaths(systemData ?? {}).filter((p) => !p.startsWith("skills."));
  return checkedPaths.filter((dottedPath) => !hasPath(resolved, dottedPath));
}
