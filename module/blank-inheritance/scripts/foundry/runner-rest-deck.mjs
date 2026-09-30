/**
 * The Scene Runner's rest and event deck: the Foundry half of
 * core/rest.mjs and core/event-deck.mjs (canon/decisions/D050.md).
 *
 * The deck's state lives in one world setting, `runnerDecks` (deck id ->
 * which events are on the table and which were witnessed), so a lesson
 * nobody saw is still in the deck next week and one they did see never comes
 * back. The admin panel's reset clears it (core/admin.mjs#RESET_SETTINGS).
 *
 * A rest heals the characters of the players who went to this scene (a
 * departure on The City sent them), or, when nobody was sent, every player
 * character on the roster. GM only.
 */

import { deckIdFor, deckView, drawEvent, normalizeDeckState, putBack, witness } from "../core/event-deck.mjs";
import { restHealing, restOf } from "../core/rest.mjs";
import { dealRumours, setsFor } from "../core/rumours.mjs";
import {
  conditionOf,
  eventShifts,
  hauntKey,
  regularsOf,
  regularsView,
  setbacksOf,
  shiftFaction,
  shiftRegular,
  toggleSetback,
  toggleUpgrade,
  upgradesOf
} from "../core/haunt-regulars.mjs";
import { writeStorageJson } from "./io.mjs";
import { cityRoster, participantUserIds } from "./city-state.mjs";
import { recordLogEntry } from "./session-log.mjs";

const MODULE_ID = "blank-inheritance";
export const SETTING_DECKS = "runnerDecks";

export function registerDeckSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_DECKS, { scope: "world", config: false, type: Object, default: {}, onChange });
  registerHauntSettings(onChange);
}

function allDecks() {
  const stored = game.settings.get(MODULE_ID, SETTING_DECKS);
  return stored && typeof stored === "object" ? stored : {};
}

export function deckStateFor(brief) {
  const id = deckIdFor(brief);
  return id ? normalizeDeckState(allDecks()[id]) : normalizeDeckState(null);
}

async function saveDeck(brief, state) {
  const id = deckIdFor(brief);
  if (!id || !game.user?.isGM) return;
  await game.settings.set(MODULE_ID, SETTING_DECKS, { ...allDecks(), [id]: state });
}

/** What the Runner shows for this brief's deck, or null when it has none. */
export function deckContext(brief, episodeId = null) {
  if (!Array.isArray(brief?.events) || !brief.events.length) return null;
  const view = deckView(brief.events, deckStateFor(brief), { episodeId });
  // Each drawn event carries its one-press attitude changes (D051).
  return { ...view, drawn: view.drawn.map((e) => ({ ...e, shifts: shiftsForEvent(brief, e.id) })) };
}

const log = (text) =>
  recordLogEntry({ text, nowIso: new Date().toISOString(), scene: canvas?.scene?.name ?? null }).catch((err) =>
    console.warn("Blank Inheritance | Could not log a deck or rest event:", err)
  );

export async function drawFor(brief, episodeId = null) {
  if (!game.user?.isGM) return null;
  const { event, state } = drawEvent(brief.events ?? [], deckStateFor(brief), { episodeId });
  if (!event) return null;
  await saveDeck(brief, state);
  return event;
}

export async function witnessFor(brief, eventId) {
  if (!game.user?.isGM) return;
  await saveDeck(brief, witness(deckStateFor(brief), eventId));
  const event = (brief.events ?? []).find((e) => e.id === eventId);
  await log(`${brief.title ?? brief.id}: ${event?.title ?? eventId}.`);
}

export async function putBackFor(brief, eventId) {
  if (!game.user?.isGM) return;
  await saveDeck(brief, putBack(deckStateFor(brief), eventId));
}

/** Whose characters this scene's rest heals. */
export function restTargets(briefId) {
  const sent = participantUserIds(briefId);
  const userIds = sent.length ? sent : cityRoster().map((m) => m.userId);
  return userIds.map((uid) => game.users.get(uid)?.character).filter(Boolean);
}

/** The rest block the Runner shows, or null when this scene is not a rest. */
export function restContext(brief) {
  const rest = restOf(brief);
  if (!rest) return null;
  return {
    labelKey: rest.grade.labelKey,
    buff: rest.buff,
    who: restTargets(brief.id).map((actor) => {
      const hp = actor.system?.attributes?.hp ?? {};
      return { name: actor.name, value: hp.value ?? 0, max: hp.max ?? 0 };
    })
  };
}

/** Heal everyone this rest covers. Returns [{ name, from, to, gained }]. */
export async function applyRest(brief) {
  const rest = restOf(brief);
  if (!game.user?.isGM || !rest) return [];
  const results = [];
  for (const actor of restTargets(brief.id)) {
    const hp = actor.system?.attributes?.hp ?? {};
    const outcome = restHealing({ value: hp.value, max: hp.max }, rest.grade.id);
    if (outcome.gained > 0) await actor.update({ "system.attributes.hp.value": outcome.to });
    results.push({ name: actor.name, ...outcome });
  }
  const gained = results.filter((r) => r.gained > 0).map((r) => `${r.name} +${r.gained}`);
  await log(`${brief.title ?? brief.id}: the night's rest. ${gained.length ? gained.join(", ") : "Nobody needed healing"}.`);
  return results;
}

/* ------------------------------------------------------------------ */
/*  The rumour mill (core/rumours.mjs, D051)                           */
/* ------------------------------------------------------------------ */

const rumourKey = (brief) => `${deckIdFor(brief)}#rumours`;

function rumourState(brief) {
  const raw = allDecks()[rumourKey(brief)];
  return raw && typeof raw === "object" ? raw : {};
}

async function saveRumourState(brief, next) {
  if (!game.user?.isGM) return;
  await game.settings.set(MODULE_ID, SETTING_DECKS, { ...allDecks(), [rumourKey(brief)]: next });
}

/** What the Runner shows for this brief's rumours in this episode, or null when it has none. */
export function rumourContext(brief, episodeId = null) {
  const sets = setsFor(brief?.rumours ?? [], episodeId);
  if (!sets.length) return null;
  const state = rumourState(brief);
  const current = sets.find((x) => x.id === state.setId) ?? sets[0];
  return {
    sets: sets.map((x) => ({ id: x.id, n: x.set, current: x.id === current.id, used: (state.used?.[x.id] ?? []).length, size: x.truths.length + x.lies.length })),
    current: current.id,
    last: state.last?.setId === current.id ? state.last : null
  };
}

export async function chooseRumourSet(brief, setId) {
  await saveRumourState(brief, { ...rumourState(brief), setId, last: null });
}

/** Deal one player's rumours for a degree, in the current set. */
export async function dealRumoursFor(brief, degree, episodeId = null) {
  if (!game.user?.isGM) return null;
  const sets = setsFor(brief?.rumours ?? [], episodeId);
  const state = rumourState(brief);
  const set = sets.find((x) => x.id === state.setId) ?? sets[0];
  if (!set) return null;
  const { statements, used } = dealRumours(set, degree, { used: state.used?.[set.id] ?? [] });
  await saveRumourState(brief, { ...state, setId: set.id, used: { ...(state.used ?? {}), [set.id]: used }, last: { setId: set.id, degree, statements } });
  return statements;
}

/* ------------------------------------------------------------------ */
/*  A haunt's regulars (core/haunt-regulars.mjs, D051)                 */
/* ------------------------------------------------------------------ */

export const SETTING_ATTITUDES = "hauntAttitudes";
/** Faction standing (D052), kept globally rather than per place -- one gang has one grudge, wherever it's met. */
export const SETTING_FACTIONS = "hauntFactions";
/** The copy in storage/ that `npm run haunts` brings home as context for writing. */
export const ATTITUDES_FILE = "haunt-attitudes.json";

export function registerHauntSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_ATTITUDES, { scope: "world", config: false, type: Object, default: {}, onChange });
  game.settings.register(MODULE_ID, SETTING_FACTIONS, { scope: "world", config: false, type: Object, default: {}, onChange });
}

function allPlaces() {
  const stored = game.settings.get(MODULE_ID, SETTING_ATTITUDES);
  return stored && typeof stored === "object" ? stored : {};
}

function allFactions() {
  const stored = game.settings.get(MODULE_ID, SETTING_FACTIONS);
  return stored && typeof stored === "object" ? stored : {};
}

/** The regulars block the Runner shows for a haunt, or null for any other scene. */
export function regularsContext(brief) {
  if (!brief?.haunt) return null;
  const key = hauntKey(brief);
  const regulars = regularsView(brief, allPlaces()[key], allFactions());
  return regulars.length ? { key, regulars } : null;
}

/** The upgrades/setbacks block the Runner shows for a haunt, or null when it has neither. */
export function conditionContext(brief) {
  if (!brief?.haunt) return null;
  const c = conditionOf(brief, allPlaces()[hauntKey(brief)]);
  return c.upgrades.length || c.setbacks.length ? c : null;
}

/** The attitude changes a drawn event offers, named for their buttons. */
export function shiftsForEvent(brief, eventId) {
  const raw = (brief?.events ?? []).find((e) => e.id === eventId);
  const names = new Map(regularsOf(brief).map((r) => [r.id, r.name]));
  return eventShifts(raw, brief).map((s) => ({ ...s, name: names.get(s.regular) ?? s.regular }));
}

let harvestTimer = null;
function writeHarvestSoon() {
  clearTimeout(harvestTimer);
  harvestTimer = setTimeout(() => {
    const payload = {
      kind: "bi-haunt-attitudes",
      version: 1,
      writtenAt: new Date().toISOString(),
      places: allPlaces(),
      factions: allFactions()
    };
    writeStorageJson("", ATTITUDES_FILE, payload).catch((err) => console.warn("Blank Inheritance | Could not file the haunt attitudes:", err));
  }, 1500);
}

/**
 * Move one regular's attitude by whole steps; `why` is kept with it. When
 * the regular belongs to a faction, the faction moves the same amount too
 * (D052) -- the ripple that makes falling out with one gang member cost the
 * whole gang's goodwill.
 */
export async function shiftRegularFor(brief, regularId, change, why = null) {
  if (!game.user?.isGM || !brief?.haunt) return null;
  const key = hauntKey(brief);
  const regular = regularsOf(brief).find((r) => r.id === regularId);
  const { state, entry } = shiftRegular(brief, allPlaces()[key], regularId, change, { why, at: new Date().toISOString() });
  if (!entry) return null;
  await game.settings.set(MODULE_ID, SETTING_ATTITUDES, { ...allPlaces(), [key]: state });
  if (entry.from !== entry.to) await log(`${brief.title ?? brief.id}: ${entry.name} is now ${entry.to}${why ? ` (${why})` : ""}.`);
  if (regular?.faction) {
    const { state: factionState, entry: factionEntry } = shiftFaction(allFactions()[regular.faction], regular.faction, regular.faction, change, {
      why: why ? `${why} -- ${regular.name}` : regular.name,
      at: new Date().toISOString()
    });
    if (factionEntry) {
      await game.settings.set(MODULE_ID, SETTING_FACTIONS, { ...allFactions(), [regular.faction]: factionState });
      if (factionEntry.from !== factionEntry.to) await log(`${regular.faction}: the whole faction is now ${factionEntry.to}${why ? ` (${why})` : ""}.`);
    }
  }
  writeHarvestSoon();
  return entry;
}

/** Unlock (or re-lock) one haunt upgrade by hand. */
export async function toggleUpgradeFor(brief, upgradeId) {
  if (!game.user?.isGM || !brief?.haunt) return null;
  const key = hauntKey(brief);
  const { state, unlocked } = toggleUpgrade(brief, allPlaces()[key], upgradeId);
  if (unlocked === null) return null;
  await game.settings.set(MODULE_ID, SETTING_ATTITUDES, { ...allPlaces(), [key]: state });
  const title = upgradesOf(brief).find((u) => u.id === upgradeId)?.title ?? upgradeId;
  await log(`${brief.title ?? brief.id}: ${title} is now ${unlocked ? "unlocked" : "locked again"}.`);
  writeHarvestSoon();
  return unlocked;
}

/** Trigger (or clear) one haunt setback by hand. */
export async function toggleSetbackFor(brief, setbackId) {
  if (!game.user?.isGM || !brief?.haunt) return null;
  const key = hauntKey(brief);
  const { state, active } = toggleSetback(brief, allPlaces()[key], setbackId);
  if (active === null) return null;
  await game.settings.set(MODULE_ID, SETTING_ATTITUDES, { ...allPlaces(), [key]: state });
  const title = setbacksOf(brief).find((b) => b.id === setbackId)?.title ?? setbackId;
  await log(`${brief.title ?? brief.id}: ${title} is now ${active ? "in effect" : "cleared"}.`);
  writeHarvestSoon();
  return active;
}
