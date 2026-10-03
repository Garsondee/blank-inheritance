/**
 * The adventure's half of the bridge to Stagecraft (design/stagecraft/module.md §3), pure.
 *
 * Stagecraft is a separate module that draws a scene as a puppet stage. The adventure owns WHO is on a stage and WHEN:
 * its theatre-of-the-mind stage (foundry/stage.mjs) already keeps an authored cast, reveals and conceals people, keeps their
 * names back until the table is told, and publishes only the revealed to the scene. This file turns that published cast
 * into Stagecraft's cards, so a scene that has a Stagecraft description is drawn by Stagecraft and nothing about who may
 * be seen changes.
 *
 * Law 11 holds by construction: only a revealed member is in the published cast, a card carries only what the published
 * member carries (the name the table uses, the picture the table sees), and where a card stands is looked up by the
 * member's real id here on the GM's side and stored as plain numbers.
 */

export const STAGECRAFT_ID = "stagecraft";
export const STAGES_PATH = "modules/blank-inheritance/stagecraft/stages.json";

/** The id a stage entry is looked up by: a protected person's real id (never published), else the id the stage files them under. */
export function rawKeyOf(publishedMember, authoredMember = null) {
  return authoredMember?.nameKey ?? String(publishedMember?.portraitId ?? "").replace(/^summon-/, "");
}

/**
 * How the party stands when a stage says nothing else: in the wings, two small groups at the front corners of the stage,
 * turned in towards the middle, so the scene's own people have the whole centre and are never hidden behind the party.
 * `wings` are the outermost places, left and right; each group steps inwards by `step` and a little further back by
 * `back`, so it reads as people standing at an angle, each card clear of the next but for a sliver at its edge. Found
 * 2026-10-03: with cards half as big again (Ingram: "roughly 50% larger"), a row of six across the front was a wall that
 * hid the room behind it.
 */
export const WINGS = Object.freeze({ y: 0.972, wings: [0.12, 0.88], step: 0.072, back: 0.016, of: 6 });

/**
 * Where the n-th member of the party stands, as fractions of the painting. A stage's `partyRow` is either wings (the
 * default, above: the outermost places fill first, one side then the other, so a small party leaves the stage wide open)
 * or a row across the front from `x[0]` to `x[1]`, perhaps with a `gap` in the middle, filled from the middle outwards.
 */
export function partySlot(def, n) {
  const row = def?.partyRow ?? WINGS;
  if (!Array.isArray(row.x)) return wingSlot({ ...WINGS, ...row }, n);
  const [x0, x1] = row.x;
  const of = Math.max(2, row.of ?? 6);
  const gap = Array.isArray(row.gap) && row.gap[0] > x0 && row.gap[1] < x1 && row.gap[0] < row.gap[1] ? row.gap : null;
  const left = gap ? gap[0] - x0 : x1 - x0;
  const total = gap ? left + (x1 - gap[1]) : x1 - x0;
  const at = (i) => {
    const u = (total * i) / (of - 1);
    return gap && u > left ? gap[1] + (u - left) : x0 + u;
  };
  // the order the places are taken in: the two nearest the middle first, then outwards
  const order = [...Array(of).keys()].sort((a, b) => Math.abs(a - (of - 1) / 2) - Math.abs(b - (of - 1) / 2) || a - b);
  return [Math.round(at(order[n % of]) * 1000) / 1000, row.y];
}

/**
 * The n-th place in the wings: one side then the other, outermost first. `split` is how many of the party the left wing
 * holds (half, rounded up, unless a stage keeps one side clearer: a shop door on the right, say); when one wing is full
 * the rest go to the other.
 */
function wingSlot(row, n) {
  const of = Math.max(2, row.of ?? 6);
  const left = Math.max(0, Math.min(of, row.split ?? Math.ceil(of / 2)));
  const taken = [0, 0];
  let side = 0;
  for (let i = 0; i <= n % of; i++) {
    side = i % 2;
    if (taken[side] >= (side === 0 ? left : of - left)) side = 1 - side;
    taken[side]++;
  }
  const k = taken[side] - 1;                         // 0 is the outermost place of its wing
  const x = side === 0 ? row.wings[0] + k * row.step : row.wings[1] - k * row.step;
  return [Math.round(x * 1000) / 1000, Math.round((row.y - k * row.back) * 1000) / 1000];
}

/**
 * Which way a member of the party faces where they stand: turned a little in towards the middle of the stage, more the
 * further out they are, so the two groups at the corners face the scene's people rather than the table.
 */
export function partyYaw(def, at) {
  const row = def?.partyRow ?? WINGS;
  const wings = Array.isArray(row.x) ? null : row.wings ?? WINGS.wings;
  const mid = wings ? (wings[0] + wings[1]) / 2 : row.gap ? (row.gap[0] + row.gap[1]) / 2 : 0.5;
  return Math.round(Math.max(-28, Math.min(28, (mid - at[0]) * 70)) * 10) / 10;
}

/**
 * A short stamp of how a stage entry places people (its places, the party's row, their turns, sizes and routines). The GM's
 * side keeps the stamp a scene was last laid out by; when a deploy changes the entry, the people already on the stage walk
 * to their new places instead of keeping the old ones for ever (found 2026-10-03: placements are kept on the scene once
 * made, so a better staging never reached a scene the table had already opened).
 */
export function layoutOf(def) {
  const text = canonical({ places: def?.places ?? null, partyRow: def?.partyRow ?? null, yaws: def?.yaws ?? null, sizes: def?.sizes ?? null, life: def?.life ?? null });
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

const near = (a, b, d = 0.045) => Math.abs(a[0] - b[0]) < d && Math.abs(a[1] - b[1]) < d * 1.6;

/** The first of `slots` that no card stands on (or the last, nudged, when they are all taken). */
function freeSlot(slots, cards) {
  const taken = cards.map((c) => c.at).filter(Array.isArray);
  for (const s of slots) if (!taken.some((t) => near(t, s))) return s;
  const last = slots[slots.length - 1] ?? [0.5, 0.9];
  return [Math.min(0.95, last[0] + 0.03 * (taken.length % 5)), last[1]];
}

/**
 * Where a new card goes: the stage entry's own place for them if it names one, else the next free slot of their kind.
 * `cards` are the cards already placed (this pass included), so no two arrive on the same spot.
 */
export function placeFor({ member, key, def, cards }) {
  const named = def?.places?.[key];
  if (Array.isArray(named)) return [named[0], named[1]];
  if (member.kind === "pc") {
    const mine = cards.filter((c) => c.pc);
    for (let n = 0; n < (def?.partyRow?.of ?? 6); n++) {
      const slot = partySlot(def, n);
      if (!mine.some((c) => near(c.at ?? [9, 9], slot, 0.03))) return slot;
    }
    return partySlot(def, mine.length);
  }
  return freeSlot(def?.npcSlots ?? [[0.5, 0.82]], cards);
}

/** What Stagecraft writes on a card that the next mirror must keep: where it was put or sent, and how it stands there. */
const KEPT = ["at", "mark", "yaw", "lean", "pitch", "still", "packed", "move", "home", "homeYaw", "enter", "down"];

/** An entrance as a stage entry gives it ("left", or { from, gait }), stamped with when it starts. */
function entranceOf(spec, now) {
  if (!spec || !Number.isFinite(now)) return null;
  const from = typeof spec === "string" ? spec : spec.from;
  if (!["left", "right", "back", "rise"].includes(from)) return null;
  return { from, t0: Math.round(now * 1000) / 1000, gait: (typeof spec === "object" && spec.gait) || "walk" };
}

/**
 * The cards a scene should have, from its published cast.
 *
 * `published` is the old stage's published members, `authored` the GM-side cast (for the real ids), `existing` the cards
 * already on the scene (whose places are kept: a card the table has moved stays where it was put), and `ownersOf(actorId)`
 * says which users hold a player's card. Everyone else's card is held by `npcOwners` (the GMs): a card that names no one is anyone's
 * in Stagecraft, and the people of the story are not for the players to carry about. Returns the cards in the published order.
 *
 * A new card also takes from the stage entry what it does on its own (`life`, a routine), where "Places" sends it back to
 * (`home`, where it first stood), and how it arrives (`enter`: it walks on from that side, starting at `now`, the shared
 * clock in seconds). A card already on the stage keeps everything Stagecraft has written on it (KEPT); its routine always
 * follows the entry, so a deploy that changes a routine changes it.
 */
export function mirrorCards({ published = [], authored = [], existing = [], def = {}, ownersOf = () => [], npcOwners = [], now = null, relayout = false }) {
  const prior = new Map(existing.map((c) => [c.id, c]));
  const real = new Map(authored.map((m) => [m.portraitId, m]));
  const out = [];
  for (const member of published) {
    if (!member?.portraitId) continue;
    const key = rawKeyOf(member, real.get(member.portraitId));
    const before = prior.get(member.portraitId);
    const card = { id: member.portraitId, name: member.label ?? member.portraitId };
    if (member.img) card.portrait = member.img;
    const size = def.sizes?.[key];
    if (size) card.size = size;
    const demeanour = def.demeanours?.[key];
    if (demeanour) card.demeanour = demeanour;
    if (member.kind === "pc") {
      card.pc = true;
      // the party's own characters carry their actor (their players can see it anyway), so their HP can knock them down
      if (member.actorId) card.actor = member.actorId;
      const owners = ownersOf(member.actorId);
      if (owners.length) card.owners = owners;
    } else if (npcOwners.length) {
      card.owners = [...npcOwners];
    }
    const life = member.kind === "pc" ? null : def.life?.[key];
    if (life) card.life = life;
    // a regular's habit, shown now and then over their head (Sanzo humming, a patient asleep), each out of step with the rest
    const emote = member.kind === "pc" ? null : def.emotes?.[key];
    if (typeof emote === "string") card.emote = { id: emote, t0: Math.round(([...key].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 60) / 10 * 10) / 10 };
    if ((before?.at || before?.mark) && !relayout) {
      for (const k of KEPT) if (before[k] !== undefined) card[k] = before[k];
    } else {
      card.at = placeFor({ member, key, def, cards: out });
      const yaw = def.yaws?.[key] ?? (member.kind === "pc" ? partyYaw(def, card.at) : undefined);
      if (yaw !== undefined) card.yaw = yaw;
      if (member.kind !== "pc") {
        card.home = [card.at[0], card.at[1]];
        if (yaw !== undefined) card.homeYaw = yaw;
      }
      if (before) {
        // laid out afresh while already on the stage: it walks over to its new place (and stays down if it was down)
        if (Number.isFinite(now)) card.move = { t0: Math.round(now * 1000) / 1000, gait: "walk" };
        if (before.down === true) card.down = true;
      } else {
        const enter = entranceOf(def.enter?.[key], now);
        if (enter) card.enter = enter;
      }
    }
    out.push(card);
  }
  // a routine that talks to someone names them by key; on the stage they are their card. Someone not on the stage (not
  // revealed yet) is simply not talked to, so a routine never gives away who is coming.
  const cardOf = new Map(published.filter((m) => m?.portraitId).map((m) => [rawKeyOf(m, real.get(m.portraitId)), m.portraitId]));
  for (const card of out) {
    if (typeof card.life?.faces !== "string") continue;
    const id = cardOf.get(card.life.faces);
    card.life = { ...card.life };
    if (id && id !== card.id) card.life.faces = id;
    else delete card.life.faces;
  }
  return out;
}

/**
 * An authored moment of a scene (stage entry `moments`) as moves for Stagecraft: who goes where. `moment.places` maps a
 * person's key to { at: [fx, fy] | mark, yaw?, lean?, pitch?, gait?, still?, packed? }; `keyOf(cardId)` gives the key of a
 * card on the stage. Anyone the moment names who is not on the stage is left out (they have not been revealed).
 * `moment.home` sends everyone else it does not name back home.
 */
export function momentMoves(moment, cards, keyOf) {
  const moves = [];
  const named = moment?.places ?? {};
  for (const card of cards) {
    const key = keyOf(card.id);
    const p = key ? named[key] : null;
    if (p) {
      const move = { id: card.id, gait: p.gait ?? moment.gait ?? "walk", still: p.still ?? true, packed: p.packed ?? false };
      if (p.mark) move.mark = p.mark; else if (Array.isArray(p.at)) move.at = [p.at[0], p.at[1]]; else continue;
      for (const k of ["yaw", "lean", "pitch"]) if (Number.isFinite(p[k])) move[k] = p[k];
      moves.push(move);
    } else if (moment?.home && Array.isArray(card.home) && !card.pc) {
      moves.push({ id: card.id, at: [card.home[0], card.home[1]], yaw: card.homeYaw ?? 0, lean: 0, pitch: 0, gait: moment.gait ?? "walk", still: false, packed: false });
    }
  }
  return moves;
}

/**
 * A moment's formation as a request for Stagecraft's `arrange`, or null when it has nobody to arrange. `who` is "party"
 * (the players' own cards), "all" (everyone on the stage), a list of people's keys, or nothing (the scene's own people);
 * `target` names the one ganged up on, by key. Keys are looked up with `keyOf(cardId)`, so nobody's real id is sent.
 */
export function formationRequest(formation, cards, keyOf) {
  if (!formation?.kind) return null;
  const idOf = (key) => cards.find((c) => keyOf(c.id) === key)?.id ?? null;
  let ids = null;
  let party = formation.party === true;
  if (formation.who === "party") { ids = cards.filter((c) => c.pc).map((c) => c.id); party = true; }
  else if (formation.who === "all") party = true;
  else if (Array.isArray(formation.who)) ids = formation.who.map(idOf).filter(Boolean);
  if (Array.isArray(ids) && !ids.length) return null;
  const target = formation.target ? idOf(formation.target) : null;
  if (target && ids && !ids.includes(target)) ids = [...ids, target];
  const opts = { ids, party, target, focus: formation.focus ?? null, gait: formation.gait ?? "walk", dir: formation.dir ?? "back", away: formation.away === true };
  if (Number.isFinite(formation.size)) opts.size = formation.size;
  return { kind: formation.kind, opts };
}

/**
 * Whether a character is down by their HP (SF2E: at 0 HP they are knocked out and dying), from an actor's data as sf2e
 * keeps it (`system.attributes.hp.value`). Null when the actor has no HP to read, so nothing is changed on a guess.
 */
export function downByHp(actorData) {
  const hp = actorData?.system?.attributes?.hp?.value;
  return Number.isFinite(hp) ? hp <= 0 : null;
}

/** The card of a party member's actor on a stage's published cast, or null. */
export const cardOfActor = (cards, actorId) => cards.find((c) => c.pc && c.actor === actorId) ?? null;

/** The moments a stage entry offers, in its own order: [{ id, label, tip, ... }]. */
export function momentsOf(def) {
  return Object.entries(def?.moments ?? {}).map(([id, m]) => ({ id, ...m }));
}

/** A value written with its keys in order, so two cards with the same fields in a different order read the same. */
const canonical = (v) => (Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}` : JSON.stringify(v));

/** Do two lists of cards differ in anything that matters? (so nothing is written when nothing changed) */
export const sameCards = (a = [], b = []) => canonical(a) === canonical(b);

/** The summons a fired trigger asks for on a stage entry, or []. */
export function summonsForTrigger(def, triggerId) {
  const list = def?.onTrigger?.[triggerId]?.summon;
  return Array.isArray(list) ? list : [];
}

/** Which stage entry a built scene uses, by the scene-set id the builder stamped on it. */
export function entryFor(stages, sourceId) {
  return stages?.stages?.[sourceId] ?? null;
}

/**
 * The description to write on a scene: the entry's description with the painting named, and the skin the whole file uses
 * unless the entry says otherwise.
 */
export function descriptionFor(stages, entry) {
  const description = { ...entry.description };
  if (!description.skin && stages.skin) description.skin = stages.skin;
  return description;
}
