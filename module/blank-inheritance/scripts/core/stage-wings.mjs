/**
 * The stage's wings, the adventure's half (pure): who in a scene's cast is still waiting to come on and where each would
 * stand, who is already there when a scene first opens (`present`), who else the GM can find, and what the GM's card menu
 * offers for someone on the stage. Stagecraft draws the wings (its `api.wings`, design/stagecraft/module.md §38); the
 * Foundry half that answers it is foundry/stagecraft-bridge.mjs.
 *
 * Law 11 holds by construction: nothing here is published. The wings are drawn on the GM's screen alone, so a protected
 * person is shown there by their real name, with what the table calls them beside it.
 */

/** How someone can come on: the stage's own sting tiers (core/sting.mjs), quietest first. */
export const WAY_IDS = Object.freeze(["quiet", "announced", "splash"]);

/** A way someone was asked to come on, or null for their own. */
export const wayOf = (way) => (WAY_IDS.includes(way) ? way : null);

/**
 * Everyone in a scene's cast who is not on its stage now, in the brief's order, with where each would stand.
 *
 * @param o.cast       the brief's cast (scene-brief.schema.json)
 * @param o.published  who the table can see on this scene now: the stage's published cast, [{ portraitId }]
 * @param o.def        the scene's stage entry (stagecraft/stages.json, the GM's kept places laid over): `places`, `sizes`
 * @param o.idOf       cast member -> the id the stage files them under (`summon-...`, an alias for a protected person)
 * @param o.keyOf      cast member -> the key their place is filed under (their real id)
 * @returns [{ id, key, member, at, size }]
 */
export function waitingInWings({ cast = [], published = [], def = null, idOf, keyOf }) {
  const up = new Set((published ?? []).map((m) => m?.portraitId).filter(Boolean));
  const out = [];
  for (const member of cast ?? []) {
    if (!member || typeof member !== "object") continue;
    const id = idOf(member);
    if (!id || up.has(id) || out.some((p) => p.id === id)) continue;
    const key = keyOf(member);
    const at = def?.places?.[key];
    const size = def?.sizes?.[key];
    out.push({ id, key, member, at: Array.isArray(at) && at.length >= 2 ? [at[0], at[1]] : null, size: Number.isFinite(size) ? size : 1 });
  }
  return out;
}

/**
 * Who is already standing on a scene when it is first opened: the cast members marked `present`, on the scene a brief
 * opens on (not one of its sub-scenes, which the GM moves the table into), and only while nobody has been put on that
 * stage yet (`staged`: the scene already has a cast, a reset to the start of the episode clears it). Brought on quietly:
 * they were there before the players walked in.
 */
export function presentOnOpen({ cast = [], kind = null, staged = false }) {
  if (staged || kind === "sub") return [];
  return (cast ?? []).filter((m) => m && m.present === true);
}

const fold = (s) => String(s ?? "").normalize("NFKD").replace(/[\u{0300}-\u{036f}]/gu, "").toLowerCase().trim();

/** How well a name answers a query: 2 when it starts with it (or a word in it does), 1 when it holds it, 0 otherwise. */
function score(text, q) {
  const t = fold(text);
  if (!t || !q) return 0;
  if (t.startsWith(q) || t.split(/[\s\-–—'"“”(),.]+/).some((w) => w.startsWith(q))) return 2;
  return t.includes(q) ? 1 : 0;
}

/**
 * Who else the GM can bring on, for what was typed: anyone in any scene's cast (each person once: from the first scene that
 * holds their name back if any does, so a name the table may not know never reaches a card, else from the first scene that
 * names them), then any character or NPC in the world who is not one of those people. Nobody already on the stage or
 * waiting in this scene's wings.
 *
 * @param o.query    what was typed
 * @param o.briefs   [{ id, title, cast }] in running order
 * @param o.actors   [{ id, name, img, npcRef, isPc }] (the world's, test fixtures already left out)
 * @param o.exclude  ids not to offer: the stage ids and actor ids of everyone on the stage or in the wings
 * @param o.idOf     cast member -> stage id; o.keyOf cast member -> real id; o.nameOf cast member -> the GM's name for them
 * @returns [{ kind: "cast", briefId, briefTitle, member, stageId } | { kind: "actor", actor }], best first, at most `most`
 */
export function findInCasts({ query, briefs = [], actors = [], exclude = new Set(), idOf, keyOf, nameOf, most = 8 }) {
  const q = fold(query);
  if (!q) return [];
  const people = new Map();                          // real id -> the scene they are offered from
  const realIds = new Set();
  const names = new Set();
  for (const brief of briefs ?? []) {
    for (const member of brief?.cast ?? []) {
      if (!member) continue;
      const key = keyOf(member);
      const stageId = idOf(member);
      realIds.add(key);
      names.add(fold(nameOf(member)));
      if (!stageId) continue;
      const have = people.get(key);
      // the same person, protected in one scene and named outright in a later one (the table learns the name between them):
      // offered as protected, so the stage decides from what the table knows, never from where the GM found them
      if (!have || (!have.member.called && member.called)) people.set(key, { brief, member, stageId, key });
    }
  }
  const hits = [];
  for (const { brief, member, stageId, key } of people.values()) {
    if (exclude.has(stageId) || exclude.has(`summon-${key}`)) continue;
    // by name or what the table calls them, or the start of a word of their id: never a word in their role ("takes" is not
    // Taka) or the middle of an id ("intake" is not Taka either)
    const s = Math.max(score(nameOf(member), q), score(member.called, q), score(keyOf(member), q) === 2 ? 2 : 0);
    if (s) hits.push({ s, order: hits.length, hit: { kind: "cast", briefId: brief.id, briefTitle: brief.title ?? brief.id, member, stageId } });
  }
  for (const actor of actors ?? []) {
    if (!actor?.id || exclude.has(actor.id) || exclude.has(`summon-${actor.id}`)) continue;
    // someone a scene's cast already names is offered from there, as that scene knows them (their own picture, a name held back)
    if ((actor.npcRef && realIds.has(actor.npcRef)) || names.has(fold(actor.name))) continue;
    const s = score(actor.name, q);
    if (s) hits.push({ s: s - 0.5, order: hits.length, hit: { kind: "actor", actor } });
  }
  return hits.sort((a, b) => b.s - a.s || a.order - b.order).slice(0, most).map((h) => h.hit);
}

/**
 * What the GM's menu on a card offers, beyond the stage's own: **send them off** (anyone the adventure's stage put there
 * who is not one of the party: they go back to the wings if their scene names them) and **tell the table their name**
 * (someone whose real name is held back and not yet told). `published` is the stage's published cast, `authored` the
 * GM-side one (with the real ids), `known` the name keys the table has been told.
 * @returns ["send-off"?, "tell-name"?]
 */
export function cardActionIds({ cardId, card = null, published = [], authored = [], known = new Set() }) {
  const out = [];
  const member = (published ?? []).find((m) => m?.portraitId === cardId);
  if (!member || card?.pc === true || member.kind === "pc") return out;
  out.push("send-off");
  const real = (authored ?? []).find((m) => m?.portraitId === cardId);
  const called = typeof real?.called === "string" && real.called.trim();
  if (called && real.nameKey && !known.has(real.nameKey)) out.push("tell-name");
  return out;
}
