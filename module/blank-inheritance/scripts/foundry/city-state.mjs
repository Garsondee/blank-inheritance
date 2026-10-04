/**
 * The City's live record, and the GM's hand on it -- the Foundry half of the
 * world map destination system (design/world-map-destinations.md). The rules
 * live in core/departures.mjs; this file only stores, asks and moves.
 *
 * WHERE THINGS LIVE
 *   - The shared record is one world setting, `cityState`: where each
 *     character is, the open departure and its public picks, and after Go the
 *     groups and the queue. Only the active GM writes it; every client repaints
 *     when it changes, the way the campaign clock already works.
 *   - A private pick never touches that record (it is readable by every
 *     client). The GM keeps it on the GM-only downtime vault, and a player gets
 *     their own back by asking.
 *   - Who is browsing right now is not state at all: a small socket
 *     broadcast, kept in memory, so the readiness row can say who is stuck
 *     (Ingram: "so that we can see which player is struggling, not just how
 *     many haven't done it yet").
 *
 * HOW A PLAYER PICKS
 *   Through Foundry's own query system (CONFIG.queries / User#query): the
 *   player's client asks the active GM's client and gets an answer back, so a
 *   card can say "on the list" or "full" instead of guessing. Picks are
 *   resolved one at a time on the GM's side, so two players clicking the last
 *   place at once cannot both get it.
 */

import {
  applyPick,
  departureFromThen,
  emptyCityState,
  formGroups,
  formation,
  isChoosing,
  markRun,
  nextInQueue,
  normalizeDeparture,
  openDeparture,
  reassign as reassignCore,
  resolutionQueue,
  STATUS
} from "../core/departures.mjs";
import { ensureDowntimeVault } from "./campaign-state.mjs";
import { convergeTokensOnHub, hubScene, scenePointFor } from "./travel.mjs";
import { ensurePawns, pawnFor, pawnSize } from "./city-pawns.mjs";

const MODULE_ID = "blank-inheritance";
const SETTING = "cityState";
const SOCKET = `module.${MODULE_ID}`;
const QUERY_PICK = `${MODULE_ID}.cityPick`;
const QUERY_MINE = `${MODULE_ID}.cityMine`;
const VAULT_FLAG = "cityPrivate";
const FADE_MS = 10000;
const ACTIVITY_THROTTLE_MS = 8000;

export { emptyCityState };

export function registerCitySettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING, { scope: "world", config: false, type: Object, default: emptyCityState(), onChange });
}

/** How each player arrived (The Road In's departure): user id -> destination id ("ferry"). Empty until they have. */
export function cityArrivals() {
  const arrivals = cityState().arrivals;
  return arrivals && typeof arrivals === "object" ? arrivals : {};
}

export function cityState() {
  const stored = game.settings.get(MODULE_ID, SETTING);
  return { ...emptyCityState(), ...(stored && typeof stored === "object" ? stored : {}) };
}

async function writeState(next) {
  if (!game.user?.isGM) return null;
  await game.settings.set(MODULE_ID, SETTING, next);
  return next;
}

/** Every player who has a character: the people a departure waits on. */
export function cityRoster() {
  return game.users
    .filter((u) => !u.isGM && u.character)
    .map((u) => ({
      userId: u.id,
      name: u.name,
      characterName: u.character?.name ?? null,
      color: u.color?.css ?? (typeof u.color === "string" ? u.color : null),
      img: u.character?.img || u.avatar || null,
      active: u.active
    }));
}

/* ------------------------------------------------------------------ */
/*  Private picks                                                      */
/* ------------------------------------------------------------------ */

let gmPrivate = {};
let myPrivate = {};

async function readPrivate() {
  if (!game.user?.isGM) return myPrivate;
  const vault = await ensureDowntimeVault();
  // Stored as pairs, because setFlag MERGES objects and a merge can never
  // remove a key -- a taken-back private pick would survive forever.
  const pairs = vault?.getFlag(MODULE_ID, VAULT_FLAG) ?? [];
  gmPrivate = Object.fromEntries(Array.isArray(pairs) ? pairs : []);
  return gmPrivate;
}

async function writePrivate(map) {
  gmPrivate = map;
  const vault = await ensureDowntimeVault();
  if (vault) await vault.setFlag(MODULE_ID, VAULT_FLAG, Object.entries(map).filter(([, v]) => v));
}

/** What this client may know of private picks: all of them for the GM, its own for a player. */
export const privatePicksForViewer = () => (game.user?.isGM ? gmPrivate : myPrivate);

/* ------------------------------------------------------------------ */
/*  Activity: who is looking                                           */
/* ------------------------------------------------------------------ */

const activity = {};
let onActivityChange = () => {};
export const cityActivity = () => activity;

/** Called when a player opens a card or the arrival dialogue. Throttled; costs one tiny broadcast. */
export function noteCityActivity() {
  if (game.user?.isGM) return;
  const now = Date.now();
  if (now - (activity[game.user.id] ?? 0) < ACTIVITY_THROTTLE_MS) return;
  activity[game.user.id] = now;
  game.socket.emit(SOCKET, { type: "city-activity", userId: game.user.id, at: now });
  onActivityChange();
}

/* ------------------------------------------------------------------ */
/*  The conversation                                                   */
/* ------------------------------------------------------------------ */

let queue = Promise.resolve();
/** Picks are applied one at a time on the GM's client, so two at once cannot both take the last place. */
const serially = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

export function registerCityConversation(onActivity = () => {}) {
  onActivityChange = onActivity;
  CONFIG.queries ??= {};
  CONFIG.queries[QUERY_PICK] = async (data, { user } = {}) => gmPick(user?.id, data?.destinationId ?? null, { isGM: false });
  CONFIG.queries[QUERY_MINE] = async (_data, { user } = {}) => (await readPrivate())[user?.id] ?? null;
  game.socket.on(SOCKET, (payload, senderId) => {
    if (payload?.type !== "city-activity") return;
    if (senderId && payload.userId !== senderId) return; // a player speaks only for themselves
    activity[payload.userId] = payload.at;
    onActivityChange();
  });
  if (game.user?.isGM) readPrivate().catch(() => {});
}

/** A player asks for their own private pick back -- after a reload, nothing else would remember it. */
export async function refreshMyPrivatePick() {
  if (game.user?.isGM) return;
  const gm = game.users.activeGM;
  if (!gm) return;
  try {
    const pick = await gm.query(QUERY_MINE, {}, { timeout: 8000 });
    myPrivate = pick ? { [game.user.id]: pick } : {};
  } catch {
    /* the GM is not listening yet; the next state change will ask again */
  }
}

/**
 * A player's pick: sent to the active GM, answered. `destinationId` null takes it back.
 * Resolves to `{ok, reason?}` so the card can say what happened.
 */
export async function requestCityPick(destinationId) {
  if (game.user?.isGM) return { ok: false, reason: "gm-uses-send" };
  const gm = game.users.activeGM;
  if (!gm) return { ok: false, reason: "no-gm" };
  try {
    const result = await gm.query(QUERY_PICK, { destinationId }, { timeout: 10000 });
    if (result?.ok) myPrivate = result.private ? { [game.user.id]: result.destinationId } : {};
    return result ?? { ok: false, reason: "no-answer" };
  } catch {
    return { ok: false, reason: "no-answer" };
  }
}

/** The GM's own hand on a pick (placing a player, or answering a query). */
export function gmPick(userId, destinationId, { isGM = true } = {}) {
  return serially(async () => {
    if (!game.user?.isGM || !userId) return { ok: false, reason: "not-gm" };
    const state = cityState();
    const priv = await readPrivate();
    const result = applyPick(state.departure, { userId, destinationId, isGM, lastAssignment: state.lastAssignment, privatePicks: priv });
    if (!result.ok) return { ok: false, reason: result.reason };
    const nextPrivate = { ...priv };
    if (result.privatePick?.destinationId) nextPrivate[userId] = result.privatePick.destinationId;
    else delete nextPrivate[userId];
    await writePrivate(nextPrivate);
    await writeState({ ...state, departure: result.live });
    return { ok: true, destinationId, private: Boolean(result.privatePick?.destinationId) };
  });
}

/* ------------------------------------------------------------------ */
/*  The GM's controls                                                  */
/* ------------------------------------------------------------------ */

/** The Foundry Scene a brief plays on: its main backdrop, never a sub-room. */
export function sceneForBrief(briefRef) {
  const scenes = game.scenes.filter((s) => s.getFlag(MODULE_ID, "briefRef") === briefRef);
  return scenes.find((s) => s.getFlag(MODULE_ID, "kind") !== "sub") ?? scenes[0] ?? null;
}

async function cue(sceneId) {
  if (!sceneId) return;
  const { cueScene } = await import("./director-panel.mjs");
  await cueScene(sceneId, { transitionType: "fade", transitionDuration: FADE_MS });
}

/**
 * Open a departure: the map comes up with the question on it. Picks start
 * empty; any private pick from a previous departure is cleared.
 */
export async function openCityDeparture(rawDeparture, { sourceBriefId = null, nextBriefRef = null } = {}) {
  if (!game.user?.isGM) return null;
  const departure = normalizeDeparture(rawDeparture, { sourceBriefId, nextBriefRef });
  const live = openDeparture(departure, { id: foundry.utils.randomID(), openedAt: Date.now() });
  await writePrivate({});
  const state = cityState();
  const hub = await hubScene();
  // Everyone needs a pawn to draw a journey from. Anyone without one stands
  // where the scene that opened this departure happened. Not for an arrival:
  // nobody is in the city yet, and Go puts them at their way in.
  const placed = hub && live.kind !== "arrive" ? await standMissingPawns(hub, state, sourceBriefId) : {};
  const pawns = { ...state.pawns };
  for (const [userId, placeRef] of Object.entries(placed)) pawns[userId] = { placeRef };
  await writeState({ ...state, pawns, departure: live, groups: [], queue: [], currentKey: null, assignment: {} });
  if (hub && game.scenes.active?.id !== hub.id) await cue(hub.id);
  return live;
}

/** Pawns for everyone on the roster who has none: at their last known place, or where this scene happened. */
async function standMissingPawns(hub, state, sourceBriefId) {
  const here = sourceBriefId ? sceneForBrief(sourceBriefId)?.getFlag(MODULE_ID, "locationRef") ?? null : null;
  const placeOf = {};
  for (const member of cityRoster()) {
    if (pawnFor(hub, member.userId)) continue;
    const at = state.pawns?.[member.userId]?.placeRef ?? here;
    if (at) placeOf[member.userId] = at;
  }
  if (Object.keys(placeOf).length === 0) return {};
  await ensurePawns(hub, placeOf);
  await settlePawns(hub, placeOf);
  return placeOf;
}

export async function holdCityDeparture(held = true) {
  const state = cityState();
  if (!state.departure) return;
  await writeState({ ...state, departure: { ...state.departure, status: held ? STATUS.HELD : STATUS.OPEN } });
}

export async function cancelCityDeparture() {
  const state = cityState();
  await writePrivate({});
  await writeState({ ...state, departure: null, groups: [], queue: [], currentKey: null, assignment: {} });
}

/** Everyone to one destination: the GM's override, one press. */
export function everyoneTo(destinationId) {
  return serially(async () => {
    const state = cityState();
    if (!state.departure) return;
    const picks = Object.fromEntries(cityRoster().map((m) => [m.userId, destinationId]));
    await writePrivate({});
    await writeState({ ...state, departure: { ...state.departure, picks, ready: {} } });
  });
}

/** Stand every pawn in a ring at its place, so a crowd reads as people rather than one stack. */
async function settlePawns(hub, placeOf) {
  const byPlace = new Map();
  for (const [userId, placeRef] of Object.entries(placeOf)) {
    if (!placeRef) continue;
    if (!byPlace.has(placeRef)) byPlace.set(placeRef, []);
    byPlace.get(placeRef).push(userId);
  }
  const updates = [];
  for (const [placeRef, userIds] of byPlace) {
    const point = await scenePointFor(placeRef);
    if (!point) continue;
    const spots = formation(point, userIds.length, { spacing: pawnSize(hub) * 0.9 });
    userIds.forEach((userId, i) => {
      const token = pawnFor(hub, userId);
      if (!token) return;
      const half = pawnSize(hub) / 2;
      updates.push({ _id: token.id, x: Math.round(spots[i].x - half), y: Math.round(spots[i].y - half) });
    });
  }
  if (updates.length) await hub.updateEmbeddedDocuments("Token", updates, { animation: { duration: 600 } });
}

/** Walk every listed player's pawn to a place, all at once, on the hub. */
async function walk(hub, moves) {
  const legs = [];
  for (const move of moves) {
    const token = pawnFor(hub, move.userId);
    if (token && move.from && move.to && move.from !== move.to) legs.push({ tokenId: token.id, from: move.from, to: move.to });
  }
  if (legs.length) await convergeTokensOnHub(legs);
}

/**
 * Go. Picks lock, groups form, pawns walk, and the first group's scene starts.
 * One press, whatever state the picks are in: anyone undecided goes with the
 * largest group (core/departures.mjs#formGroups).
 */
export async function goCityDeparture({ choice = null } = {}) {
  if (!game.user?.isGM) return null;
  const state = cityState();
  const live = state.departure;
  if (!live) return null;
  const hub = await hubScene();
  if (!hub) return null;
  const roster = cityRoster();
  const priv = await readPrivate();
  const { assignment, groups } = formGroups(live, { roster, privatePicks: priv, lastAssignment: state.lastAssignment, choice });
  const destinationOf = new Map(live.destinations.map((d) => [d.id, d]));
  const locked = { ...live, status: STATUS.GONE };
  await writeState({ ...state, departure: locked, assignment, groups });

  const pawns = { ...state.pawns };
  if (live.kind === "arrive") {
    // Each pawn appears where its player came in, then all of them walk to the muster.
    const starts = Object.fromEntries(roster.map((m) => [m.userId, destinationOf.get(assignment[m.userId])?.placeRef ?? null]));
    await ensurePawns(hub, starts);
    await settlePawns(hub, starts);
    const then = departureFromThen(live.then, { sourceBriefId: live.sourceBriefId });
    const target = then?.destinations?.[0] ?? null;
    if (target?.placeRef) {
      await walk(hub, roster.map((m) => ({ userId: m.userId, from: starts[m.userId], to: target.placeRef })));
      for (const m of roster) pawns[m.userId] = { placeRef: target.placeRef };
      await settlePawns(hub, Object.fromEntries(roster.map((m) => [m.userId, target.placeRef])));
    } else {
      for (const m of roster) pawns[m.userId] = { placeRef: starts[m.userId] };
    }
    await writePrivate({});
    // How each player came to Kurose, kept for good (2026-10-04): later scenes
    // name who it applies to ("if anyone arrived by ferry", The Walk Down), and
    // `lastAssignment` is overwritten by the very next departure.
    await writeState({ ...cityState(), pawns, departure: null, groups: [], queue: [], currentKey: null, lastAssignment: assignment, arrivals: { ...(cityState().arrivals ?? {}), ...assignment } });
    const scene = target?.briefRef ? sceneForBrief(target.briefRef) : null;
    if (scene) await cue(scene.id);
    return { assignment };
  }

  // Everyone else walks from wherever their pawn stands to where they are going.
  const placeOf = Object.fromEntries(roster.map((m) => [m.userId, destinationOf.get(assignment[m.userId])?.placeRef ?? state.pawns[m.userId]?.placeRef ?? null]));
  await ensurePawns(hub, Object.fromEntries(roster.map((m) => [m.userId, state.pawns[m.userId]?.placeRef ?? placeOf[m.userId]])));
  await walk(hub, roster.map((m) => ({ userId: m.userId, from: state.pawns[m.userId]?.placeRef ?? null, to: placeOf[m.userId] })));
  await settlePawns(hub, placeOf);
  for (const m of roster) pawns[m.userId] = { placeRef: placeOf[m.userId] };

  if (isChoosing(live)) {
    const entries = resolutionQueue(groups, live.destinations);
    const first = nextInQueue(entries);
    await writeState({ ...cityState(), pawns, departure: locked, assignment, groups, queue: entries, currentKey: first?.key ?? null, lastAssignment: assignment });
    const scene = first?.briefRef ? sceneForBrief(first.briefRef) : null;
    if (scene) await cue(scene.id);
    return { assignment, queue: entries };
  }

  // Sent or muster: one place, one scene, and the departure is finished.
  const only = live.destinations[0] ?? null;
  await writeState({ ...cityState(), pawns, departure: null, groups: [], queue: [], currentKey: null });
  const scene = only?.briefRef ? sceneForBrief(only.briefRef) : null;
  if (scene) await cue(scene.id);
  return { assignment };
}

/**
 * The Scene Runner's hand after Go: move one player to another destination,
 * for a player who changes their mind or a scene that calls for it. Their
 * pawn steps across; scenes already run stay run.
 */
export async function reassignCityPlayer(userId, destinationId) {
  if (!game.user?.isGM) return { ok: false };
  const state = cityState();
  const result = reassignCore(state, { userId, destinationId });
  if (!result.ok) return result;
  const place = state.departure?.destinations?.find((d) => d.id === destinationId)?.placeRef ?? null;
  const pawns = { ...state.pawns, [userId]: { placeRef: place ?? state.pawns[userId]?.placeRef ?? null } };
  await writeState({ ...result.state, pawns, lastAssignment: result.state.assignment });
  const hub = await hubScene();
  if (hub && place) await settlePawns(hub, Object.fromEntries(Object.entries(pawns).map(([uid, p]) => [uid, p.placeRef])));
  return { ok: true };
}

/** Does the party have pawns on the map yet? Before The Road In's arrival, it does not. */
export function hasPawns() {
  return Object.values(cityState().pawns ?? {}).some((p) => p?.placeRef);
}

/**
 * A sent departure with pawns on the map: everyone walks to the next scene's
 * place, then the scene starts. Called by the Scene Runner in place of the
 * old single party marker once the characters have pawns.
 */
export async function sendPartyTo(placeRef, sceneId) {
  if (!game.user?.isGM) return;
  const state = cityState();
  const hub = await hubScene();
  if (hub && placeRef) {
    const roster = cityRoster();
    await walk(hub, roster.map((m) => ({ userId: m.userId, from: state.pawns[m.userId]?.placeRef ?? null, to: placeRef })));
    const placeOf = Object.fromEntries(roster.map((m) => [m.userId, placeRef]));
    await settlePawns(hub, placeOf);
    await writeState({ ...cityState(), pawns: Object.fromEntries(roster.map((m) => [m.userId, { placeRef }])) });
  }
  await cue(sceneId);
}

/**
 * The Scene Runner closed a scene. If it was one group's turn, the next
 * group's scene starts; when the queue empties, the departure's `then` (a
 * muster) opens. If the closed scene has its own departure, it opens.
 * Returns true when this handled the move, false to let the Runner's own
 * episode-order advance run.
 */
export async function onCitySceneClosed(closedBriefId, brief) {
  if (!game.user?.isGM) return false;
  const state = cityState();
  const current = state.queue.find((e) => e.key === state.currentKey);
  if (current && current.briefRef === closedBriefId) {
    const entries = markRun(state.queue, current.key);
    const next = nextInQueue(entries);
    if (next) {
      await writeState({ ...state, queue: entries, currentKey: next.key });
      const scene = next.briefRef ? sceneForBrief(next.briefRef) : null;
      if (scene) await cue(scene.id);
      return true;
    }
    const then = state.departure?.then ?? null;
    await writeState({ ...state, queue: [], currentKey: null, groups: [], departure: null });
    if (then) {
      await openCityDeparture({ kind: then.kind, question: then.question, placeRef: then.placeRef, briefRef: then.briefRef, label: then.label }, { sourceBriefId: closedBriefId });
      return true;
    }
    return false;
  }
  const raw = brief?.outro?.departure ?? null;
  if (raw && raw.kind && raw.kind !== "sent") {
    await openCityDeparture(raw, { sourceBriefId: closedBriefId });
    return true;
  }
  return false;
}

/** For the Runner: who went where in the departure that led into this brief, by destination id. */
/** The players whose destination runs this scene, by user id. Empty when no departure sent anyone here. */
export function participantUserIds(briefRef) {
  const state = cityState();
  const here = new Set((state.departure?.destinations ?? []).filter((d) => d.briefRef === briefRef).map((d) => d.id));
  return Object.entries(state.assignment ?? {}).filter(([, id]) => here.has(id)).map(([uid]) => uid);
}

export function participantsFor(briefRef) {
  const state = cityState();
  const destinations = state.departure?.destinations ?? [];
  const names = new Map(cityRoster().map((m) => [m.userId, m.characterName || m.name]));
  const out = {};
  for (const d of destinations) {
    if (d.briefRef !== briefRef) continue;
    out[d.id] = Object.entries(state.assignment ?? {}).filter(([, id]) => id === d.id).map(([uid]) => names.get(uid) ?? uid);
  }
  return out;
}
