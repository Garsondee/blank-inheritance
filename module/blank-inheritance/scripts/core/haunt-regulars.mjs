/**
 * A haunt's regulars and how they feel about the group
 * (canon/decisions/D051.md, points 11 and 12).
 *
 * Ingram, 2026-09-29: "We need a system for tracking the attitude of NPCs at
 * locations and an easy way for these random events to knock that up or
 * down. And an easy way for me to manually shift it up and down. That then
 * automatically changes how the scene is written next time ... You'd know
 * that location X, has 1,2,3 NPCs and you would know each of their
 * descriptions and attitudes." And: "Did the group trash the bar by accident
 * by failing a skill roll? Whoops! That lowered the attitude..."
 *
 * Attitudes are SF2E's own five steps (core/social-intel.mjs). They are kept
 * per PLACE, not per scene, so the crew mess remembers the group whichever
 * episode brings them back. A regular's brief can say how they behave at
 * each attitude (`byAttitude`), which is how the scene reads differently next
 * time without anyone rewriting it. Every change is kept with its reason, so
 * the history comes home to Claude as context for new material.
 *
 * D052 adds three more levers on the same promise ("if people hate the group
 * then they will make their lives HARDER the next time they are in the same
 * room together"):
 *
 * - `doors`: a regular's own decision tree of what their attitude opens and
 *   closes, so a shift is never just a number -- it is a stated, playable
 *   consequence (a better seat, a tab; or being turned away, a check made
 *   harder).
 * - `faction`: attitudes ripple. A regular can belong to a faction (a kebab-
 *   case id shared by every regular who is really the same group, wherever
 *   they appear); shifting one member's attitude shifts the whole faction's,
 *   kept globally rather than per place, and a regular's attitude AS PLAYED
 *   is the worse of their own personal standing and their faction's.
 * - upgrades and setbacks (`upgradesOf`/`setbacksOf`, kept in the haunt's own
 *   place state as `unlocked`/`broken`): a repeat location can get better
 *   for the group with use, or worse, for a while or for good.
 */

import { ATTITUDES, DEFAULT_ATTITUDE, attitudeIndex, isAttitude, shiftAttitude } from "./social-intel.mjs";

const HISTORY_LENGTH = 60;
const WHEN = Object.freeze(["any", "criticalSuccess", "success", "failure", "criticalFailure"]);
const DOOR_KINDS = Object.freeze(["opens", "closes"]);

/** Where a haunt's attitudes are kept: its place on the map, or the brief when it has none. */
export function hauntKey(brief) {
  return brief?.intro?.position?.locationRef ?? brief?.id ?? null;
}

/** A regular's own doors, made safe: what their attitude opens and closes. */
function doorsOf(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter((d) => d && DOOR_KINDS.includes(d.kind) && isAttitude(d.at) && typeof d.text === "string" && d.text)
    .map((d) => ({ kind: d.kind, at: d.at, text: d.text }));
}

/** The people who are always here: the cast, less anyone written as a one-off walk-on. */
export function regularsOf(brief) {
  return (brief?.cast ?? [])
    .filter((c) => c && typeof c.id === "string" && !c.walkOn)
    .map((c) => ({
      id: c.id,
      name: c.label ?? c.id,
      role: c.role ?? null,
      start: isAttitude(c.brief?.attitude) ? c.brief.attitude : DEFAULT_ATTITUDE,
      byAttitude: c.brief?.byAttitude ?? {},
      faction: typeof c.brief?.faction === "string" && c.brief.faction ? c.brief.faction : null,
      doors: doorsOf(c.brief?.doors)
    }));
}

export function normalizePlaceState(raw) {
  const attitudes = {};
  for (const [id, a] of Object.entries(raw?.attitudes ?? {})) if (isAttitude(a)) attitudes[id] = a;
  const history = Array.isArray(raw?.history) ? raw.history.filter((h) => h && typeof h.regular === "string") : [];
  const unlocked = Array.isArray(raw?.unlocked) ? raw.unlocked.filter((id) => typeof id === "string") : [];
  const broken = {};
  for (const [id, b] of Object.entries(raw?.broken ?? {})) {
    if (b && typeof id === "string") broken[id] = { lasting: b.lasting === "permanent" ? "permanent" : "temporary", since: typeof b.since === "string" ? b.since : null };
  }
  return { attitudes, history, unlocked, broken, names: raw?.names && typeof raw.names === "object" ? raw.names : {} };
}

/** A faction's own standing, made safe. Kept as a place-shaped state, but keyed globally by faction id, not by place. */
export function normalizeFactionState(raw) {
  const attitudes = {};
  for (const [id, a] of Object.entries(raw?.attitudes ?? {})) if (isAttitude(a)) attitudes[id] = a;
  const history = Array.isArray(raw?.history) ? raw.history.filter((h) => h && typeof h.faction === "string") : [];
  return { attitudes, history };
}

/**
 * The attitude a regular is actually played at: the worse of their own
 * personal standing and their faction's, if they have one. This is the
 * ripple (D052): stay on a gang member's own good side all you like, the
 * gang's own grudge still reaches them.
 */
function effectiveAttitude(personal, factionAttitude) {
  if (!factionAttitude) return personal;
  return attitudeIndex(factionAttitude) < attitudeIndex(personal) ? factionAttitude : personal;
}

/** A regular's doors resolved at one attitude: which are open, which are shut. */
function doorsView(doors, attitude) {
  const step = attitudeIndex(attitude);
  return doors.map((d) => ({
    kind: d.kind,
    text: d.text,
    active: d.kind === "opens" ? step >= attitudeIndex(d.at) : step <= attitudeIndex(d.at)
  }));
}

/** Each regular as the Runner shows them: attitude now (faction-adjusted), how they behave, and their doors. */
export function regularsView(brief, placeState, factionState = {}) {
  const s = normalizePlaceState(placeState);
  return regularsOf(brief).map((r) => {
    const personal = s.attitudes[r.id] ?? r.start;
    const factionAttitude = r.faction ? normalizeFactionState(factionState[r.faction]).attitudes.__self ?? null : null;
    const attitude = effectiveAttitude(personal, factionAttitude);
    return {
      id: r.id,
      name: r.name,
      role: r.role,
      faction: r.faction,
      personal,
      attitude,
      loweredByFaction: attitude !== personal,
      step: ATTITUDES.indexOf(attitude),
      line: typeof r.byAttitude[attitude] === "string" ? r.byAttitude[attitude] : null,
      doors: doorsView(r.doors, attitude),
      atTop: attitude === ATTITUDES.at(-1),
      atBottom: attitude === ATTITUDES[0]
    };
  });
}

/**
 * Move one regular's attitude by `change` steps, clamped, and keep the reason.
 * Returns the place's next state, and the change as it actually happened.
 * Does not itself touch the regular's faction -- see `shiftFaction`, called
 * alongside this one by the caller that knows where faction state lives.
 */
export function shiftRegular(brief, placeState, regularId, change, { why = null, at = null } = {}) {
  const s = normalizePlaceState(placeState);
  const regular = regularsOf(brief).find((r) => r.id === regularId);
  if (!regular || !Number.isInteger(change) || change === 0) return { state: s, entry: null };
  const from = s.attitudes[regularId] ?? regular.start;
  const to = shiftAttitude(from, change);
  const entry = { at, regular: regularId, name: regular.name, from, to, why };
  return {
    state: {
      ...s,
      attitudes: { ...s.attitudes, [regularId]: to },
      names: { ...s.names, [regularId]: { name: regular.name, role: regular.role } },
      history: [...s.history, entry].slice(-HISTORY_LENGTH)
    },
    entry
  };
}

/**
 * Move a faction's own attitude by `change` steps, clamped, and keep the
 * reason. `label` names it for the history entry.
 */
export function shiftFaction(factionState, factionId, label, change, { why = null, at = null } = {}) {
  const s = normalizeFactionState(factionState);
  if (!factionId || !Number.isInteger(change) || change === 0) return { state: s, entry: null };
  const from = s.attitudes.__self ?? DEFAULT_ATTITUDE;
  const to = shiftAttitude(from, change);
  const entry = { at, faction: factionId, name: label, from, to, why };
  return {
    state: { attitudes: { __self: to }, history: [...s.history, entry].slice(-HISTORY_LENGTH) },
    entry
  };
}

/** An event's attitude changes, made safe: who, by how much, on which result. */
export function eventShifts(event, brief) {
  const known = new Set(regularsOf(brief).map((r) => r.id));
  return (Array.isArray(event?.shifts) ? event.shifts : [])
    .filter((s) => s && known.has(s.regular) && Number.isInteger(s.change) && s.change !== 0)
    .map((s) => ({ regular: s.regular, change: Math.max(-2, Math.min(2, s.change)), when: WHEN.includes(s.when) ? s.when : "any" }));
}

/** A haunt's upgrades, made safe. */
export function upgradesOf(brief) {
  return (Array.isArray(brief?.haunt?.upgrades) ? brief.haunt.upgrades : [])
    .filter((u) => u && typeof u.id === "string" && typeof u.title === "string" && typeof u.text === "string")
    .map((u) => ({ id: u.id, title: u.title, text: u.text, how: typeof u.how === "string" ? u.how : null }));
}

/** A haunt's setbacks, made safe. */
export function setbacksOf(brief) {
  return (Array.isArray(brief?.haunt?.setbacks) ? brief.haunt.setbacks : [])
    .filter((s) => s && typeof s.id === "string" && typeof s.title === "string" && typeof s.text === "string")
    .map((s) => ({ id: s.id, title: s.title, text: s.text, lasting: s.lasting === "temporary" ? "temporary" : "permanent" }));
}

/** Upgrades and setbacks as the Runner shows them: which are live right now. */
export function conditionOf(brief, placeState) {
  const s = normalizePlaceState(placeState);
  return {
    upgrades: upgradesOf(brief).map((u) => ({ ...u, unlocked: s.unlocked.includes(u.id) })),
    setbacks: setbacksOf(brief).map((b) => ({ ...b, active: Boolean(s.broken[b.id]) }))
  };
}

/** Toggle one upgrade unlocked or not, kept with the place's other state. */
export function toggleUpgrade(brief, placeState, upgradeId) {
  const s = normalizePlaceState(placeState);
  if (!upgradesOf(brief).some((u) => u.id === upgradeId)) return { state: s, unlocked: null };
  const has = s.unlocked.includes(upgradeId);
  const unlocked = has ? s.unlocked.filter((id) => id !== upgradeId) : [...s.unlocked, upgradeId];
  return { state: { ...s, unlocked }, unlocked: !has };
}

/** Toggle one setback active or not, keeping its lasting flag from the haunt's own data. */
export function toggleSetback(brief, placeState, setbackId) {
  const s = normalizePlaceState(placeState);
  const setback = setbacksOf(brief).find((b) => b.id === setbackId);
  if (!setback) return { state: s, active: null };
  const has = Boolean(s.broken[setbackId]);
  const broken = { ...s.broken };
  if (has) delete broken[setbackId];
  else broken[setbackId] = { lasting: setback.lasting, since: new Date().toISOString() };
  return { state: { ...s, broken }, active: !has };
}
