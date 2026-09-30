/**
 * The admin panel's rules -- the pure half.
 *
 * Ingram, 2026-09-28: "Could you give me an 'admin' panel ... Its main usage
 * at the moment, resetting everything to the very start of the adventure for
 * testing purposes. Another button would allow automation of the player
 * choices during the day ... the goal is to allow me as the GM to test the
 * whole day's worth of systems and make sure they are working ... this panel
 * is primarily for doing unusual things to all the systems that we've
 * invented and added to Foundry."
 *
 * Three jobs live here, none of them touching Foundry:
 *
 *   1. WHAT "THE START" IS. Read off the episode data, never typed in here:
 *      the first scene in play order, and the first moment on the day ring a
 *      scene is dated to. Moving Episode One's opening moves the reset with it.
 *   2. WHAT A RESET TOUCHES. Every world setting this module registers is on
 *      exactly one of two lists below -- reset to its start, or deliberately
 *      kept -- and test/tier3-admin-contract.test.mjs fails if a new one is on
 *      neither. A system added next month cannot silently survive a reset.
 *   3. HOW A STAND-IN PLAYER BEHAVES. The autopilot picks where to go, which
 *      skill to roll and which slice to book the way a player could: it obeys
 *      the same rules a real pick does (room, who a place is open to), so a
 *      test run exercises the rules instead of stepping round them.
 *
 * foundry/admin-actions.mjs carries these out; foundry/admin-autopilot.mjs
 * runs the stand-ins; foundry/admin-panel.mjs is the window.
 */

import { normalizeMoment } from "./day-ring.mjs";
import { emptyCityState, eligible, isChoosing, STATUS, takers } from "./departures.mjs";
import { offersAt } from "./commitments.mjs";
import { rollTagFromOptions } from "./runner-view.mjs";

/** Where a reset puts the campaign, unless the episode data says otherwise. */
export const START_EPISODE_ID = "episode-c1e1-mothers-maiden-name";

/**
 * World settings a reset returns to the start. Each one is state the table
 * PRODUCED by playing: the clock, bookings, the City, the Runner's position
 * and ticks, the scene-close review count, granted equipment, which portraits
 * have had their first-appearance splash, the soundscape playing, and which
 * events each deck has had drawn and witnessed.
 */
export const RESET_SETTINGS = Object.freeze([
  "campaignMoment",
  "commitments",
  "cityState",
  "runnerEpisode",
  "runnerBrief",
  "runnerRuns",
  "sceneCloseReviewFlags",
  "equipmentGrants",
  "splashedPortraits",
  "audioScape",
  "runnerDecks",
  "hauntAttitudes",
  "hauntFactions"
]);

/** World settings a reset leaves alone, and why. Configuration and records, not play. */
export const KEPT_SETTINGS = Object.freeze({
  worldSync: "which deployed build this world was last brought up to",
  audioMix: "the GM's own faders",
  audioAutoCombat: "a GM preference",
  inductionAgreementEnabled: "a switch Ingram sets once the agreement text is graded",
  openingVideoFolder: "where the opening videos are served from",
  adminSnapshot: "the admin panel's own record of the last reset, which undo reads",
  adminTestParty: "which characters the admin panel lent to which player accounts"
});

/**
 * Where the adventure starts, from an episode document: the first scene in
 * play order, and the first moment any scene is dated to (the opening speech
 * has no date of its own, being a view from above; The Road In's does).
 */
export function episodeStart(episode) {
  const scenes = [...(episode?.scenes ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const first = scenes.find((s) => typeof s.briefRef === "string" && s.briefRef) ?? null;
  const dated = scenes.find((s) => Number.isInteger(s.day) && typeof s.quarter === "string");
  return {
    episodeId: episode?.id ?? START_EPISODE_ID,
    briefId: first?.briefRef ?? "",
    moment: normalizeMoment(dated ? { day: dated.day, quarter: dated.quarter } : {})
  };
}

/** The start value of every setting on RESET_SETTINGS, for one start. */
export function resetValues(start) {
  return {
    campaignMoment: normalizeMoment(start?.moment ?? {}),
    commitments: [],
    cityState: emptyCityState(),
    runnerEpisode: start?.episodeId ?? START_EPISODE_ID,
    runnerBrief: start?.briefId ?? "",
    runnerRuns: {},
    sceneCloseReviewFlags: 0,
    equipmentGrants: [],
    splashedPortraits: [],
    audioScape: { soundscapeId: null, at: null },
    // Every event deck full again: nothing drawn, nothing witnessed (D050).
    runnerDecks: {},
    // Every regular back to how they felt before they met the group (D051).
    hauntAttitudes: {},
    // Every faction back to indifferent too (D052).
    hauntFactions: {}
  };
}

/** The choices a GM makes before a reset. Defaults are the "true fresh start". */
export const RESET_DEFAULTS = Object.freeze({
  // The Runner lists every roll ever made against a scene by reading the chat
  // log, so a log left from the last test run shows last run's results.
  clearChat: true,
  endCombats: true,
  cutToStart: true,
  // Off by default: those are the players' own characters, made at induction.
  deleteInductionCharacters: false,
  // On by default, like the chat log: the notebook's pages are about the run
  // being thrown away (a test NPC's page would otherwise sit in front of real
  // players), and the snapshot keeps every page so undo can put them back.
  clearNotebook: true
});

export function normalizeResetOptions(raw = {}) {
  const out = {};
  for (const [key, fallback] of Object.entries(RESET_DEFAULTS)) out[key] = typeof raw?.[key] === "boolean" ? raw[key] : fallback;
  return out;
}

/**
 * The reset, as an ordered list of steps: what the confirmation shows, and
 * what the adapter runs, in this order. A snapshot always comes first (undo
 * reads it) and the log line always comes last (so it records a reset that
 * actually finished). `undoable: false` is said out loud in the confirmation;
 * `null` means there is nothing to undo.
 */
export function resetPlan(rawOptions = {}) {
  const options = normalizeResetOptions(rawOptions);
  const steps = [
    { id: "snapshot", undoable: true },
    { id: "city", undoable: true },
    { id: "settings", undoable: true },
    { id: "downtime", undoable: true },
    { id: "papers", undoable: true },
    { id: "stage", undoable: true },
    { id: "social", undoable: true },
    { id: "travel", undoable: true }
  ];
  if (options.clearNotebook) steps.push({ id: "notebook", undoable: true });
  if (options.clearChat) steps.push({ id: "chat", undoable: true });
  if (options.endCombats) steps.push({ id: "combats", undoable: false });
  if (options.deleteInductionCharacters) steps.push({ id: "induction", undoable: true });
  if (options.cutToStart) steps.push({ id: "scene", undoable: true });
  // Undo does not unwrite the log line; it adds its own. Neither loses anything, so no warning either way.
  steps.push({ id: "log", undoable: null });
  return steps;
}

/* ------------------------------------------------------------------ */
/*  The snapshot a reset takes first, and undo reads                   */
/* ------------------------------------------------------------------ */

export const SNAPSHOT_KIND = "bi-admin-snapshot";
export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_PREFIX = "admin-snapshot-";

/** A storage filename for a snapshot taken at `iso`, safe on every filesystem. */
export function snapshotFilename(iso) {
  const stamp = String(iso ?? "").replace(/[^0-9TZ]/g, "");
  if (!stamp) throw new Error("snapshotFilename needs a timestamp");
  return `${SNAPSHOT_PREFIX}${stamp}.json`;
}

/** Everything wrong with a snapshot, as a list. An empty list means undo may use it. */
export function snapshotProblems(snapshot) {
  const problems = [];
  if (!snapshot || typeof snapshot !== "object") return ["not a snapshot"];
  if (snapshot.kind !== SNAPSHOT_KIND) problems.push(`kind is ${JSON.stringify(snapshot.kind)}`);
  if (snapshot.version !== SNAPSHOT_VERSION) problems.push(`version ${snapshot.version} is not ${SNAPSHOT_VERSION}`);
  if (typeof snapshot.takenAt !== "string") problems.push("no takenAt");
  if (!snapshot.settings || typeof snapshot.settings !== "object") problems.push("no settings");
  for (const key of Object.keys(snapshot.settings ?? {})) {
    if (!RESET_SETTINGS.includes(key)) problems.push(`setting ${key} is not one a reset touches`);
  }
  for (const list of ["chat", "actors", "pawns", "notebook"]) {
    if (snapshot[list] !== undefined && !Array.isArray(snapshot[list])) problems.push(`${list} is not a list`);
  }
  return problems;
}

/* ------------------------------------------------------------------ */
/*  The test party                                                     */
/* ------------------------------------------------------------------ */

/**
 * Which character to lend to which player account, so a GM testing alone
 * has a roster to pick and roll for. Only accounts with no character of
 * their own are filled, and only with characters nobody has: a real
 * player's character is never moved. Characters whose names say TEST go
 * first, in name order, so the same accounts get the same stand-ins each time.
 *
 * users:  [{ id, isGM, characterId }]
 * actors: [{ id, name, type, assignedTo }]  -- assignedTo: a user id or null
 */
export function testPartyPlan({ users = [], actors = [] } = {}) {
  const open = users.filter((u) => !u.isGM && !u.characterId);
  const taken = new Set(users.map((u) => u.characterId).filter(Boolean));
  const spare = actors
    .filter((a) => a.type === "character" && !a.assignedTo && !taken.has(a.id))
    .sort((a, b) => {
      const ta = /test/i.test(a.name) ? 0 : 1;
      const tb = /test/i.test(b.name) ? 0 : 1;
      return ta - tb || String(a.name).localeCompare(String(b.name));
    });
  return open.slice(0, spare.length).map((user, i) => ({ userId: user.id, actorId: spare[i].id }));
}

/* ------------------------------------------------------------------ */
/*  The stand-in players                                               */
/* ------------------------------------------------------------------ */

export const STRATEGIES = Object.freeze(["random", "spread", "together"]);

export const AUTOPILOT_DEFAULTS = Object.freeze({
  departures: false,
  rolls: false,
  downtime: false,
  autoGo: false,
  strategy: "random"
});

export function normalizeAutopilot(raw = {}) {
  const out = {};
  for (const [key, fallback] of Object.entries(AUTOPILOT_DEFAULTS)) {
    if (key === "strategy") out.strategy = STRATEGIES.includes(raw?.strategy) ? raw.strategy : fallback;
    else out[key] = typeof raw?.[key] === "boolean" ? raw[key] : fallback;
  }
  return out;
}

/** Whether any stand-in is switched on. */
export const autopilotOn = (settings) => {
  const s = normalizeAutopilot(settings);
  return s.departures || s.rolls || s.downtime;
};

/** Everyone on the roster who has not chosen yet, publicly or privately. */
export function unpickedUsers(live, roster = [], privatePicks = {}) {
  if (!live || !isChoosing(live) || live.status === STATUS.GONE) return [];
  return roster.map((m) => m.userId).filter((uid) => !live.picks?.[uid] && !privatePicks?.[uid]);
}

/**
 * Where a stand-in goes. Only places a real player could pick (open to them,
 * not full). A must-go place nobody has taken yet is covered first, the way a
 * table would; after that the strategy decides: random, the least-taken
 * place (spread), or the most-taken (together). `random` is injectable so
 * tests are exact. Null when nothing is open to them.
 */
export function autopickChoice(live, { userId, lastAssignment = {}, privatePicks = {}, strategy = "random", random = Math.random } = {}) {
  if (!live || !isChoosing(live) || !userId) return null;
  const count = (d) => takers(live, d.id, { exceptUserId: userId, privatePicks });
  const open = (live.destinations ?? []).filter((d) => {
    if (!eligible(d, { userId, lastAssignment })) return false;
    return !(d.roomFor && count(d) >= d.roomFor);
  });
  if (!open.length) return null;
  const uncovered = open.filter((d) => d.mustGo && count(d) === 0);
  const pool = uncovered.length ? uncovered : open;
  const pickFrom = (list) => list[Math.min(list.length - 1, Math.floor(random() * list.length))].id;
  if (uncovered.length || strategy === "random") return pickFrom(pool);
  const counts = pool.map(count);
  const target = strategy === "together" ? Math.max(...counts) : Math.min(...counts);
  return pickFrom(pool.filter((d, i) => counts[i] === target));
}

/**
 * The checks a chat message offers, when the Scene Runner posted it: every
 * `@Check[slug|dc:N|options:...]` carrying the Runner's own roll tag. The
 * Runner posts an any-skill check as eighteen of these in one message, one
 * per skill; a stand-in rolls the one its character is best at.
 */
export function postedChecks(content) {
  const out = [];
  for (const match of String(content ?? "").matchAll(/@Check\[([^\]]+)\]/g)) {
    const parts = match[1].split("|");
    const slug = parts[0]?.trim();
    let dc = null;
    let options = [];
    for (const part of parts.slice(1)) {
      const [key, ...rest] = part.split(":");
      const value = rest.join(":");
      if (key === "dc" && /^\d+$/.test(value)) dc = Number(value);
      if (key === "options") options = value.split(",").map((o) => o.trim()).filter(Boolean);
    }
    if (!slug || !rollTagFromOptions(options)) continue;
    out.push({ slug, dc, options });
  }
  return out;
}

/** The highest-modifier skill of those offered. `modFor` returns a number or undefined. */
export function bestSlug(slugs = [], modFor = () => undefined) {
  let best = null;
  let bestMod = -Infinity;
  for (const slug of slugs) {
    const mod = modFor(slug);
    if (!Number.isFinite(mod)) continue;
    if (mod > bestMod) {
      best = slug;
      bestMod = mod;
    }
  }
  return best;
}

/** One offer a stand-in books for the current quarter, or null when there is nothing on. */
export function autoCommitChoice({ moment, offers = [], random = Math.random } = {}) {
  const on = offersAt(normalizeMoment(moment), offers);
  if (!on.length) return null;
  return on[Math.min(on.length - 1, Math.floor(random() * on.length))].id;
}

/** Roster members with no booking for this moment's quarter. */
export function unbookedUsers({ roster = [], commitments = [], momentKey }) {
  const booked = new Set(commitments.filter((c) => c.momentKey === momentKey).map((c) => c.userId));
  return roster.map((m) => m.userId).filter((uid) => !booked.has(uid));
}
