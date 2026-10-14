/**
 * The autopilot: stand-in players, so a GM testing alone can run a whole
 * day's worth of systems (Ingram, 2026-09-28: "automation of the player
 * choices during the day ... the goal is to allow me as the GM to test the
 * whole day's worth of systems and make sure they are working").
 *
 * Three things a player does during a day, each switchable on its own:
 *
 *   - DEPARTURES. When a choice opens on The City, every player on the roster
 *     who has not chosen picks somewhere, a moment apart, through the same
 *     rules a real click meets (core/departures.mjs#applyPick with isGM
 *     false): a full place refuses them, a place not open to them refuses
 *     them. Optionally presses Go once everyone has chosen.
 *   - ROLLS. When a check is put to the table in the check console (or the
 *     Scene Runner posts one to chat), every character on the roster who is
 *     asked rolls their best skill of the ways offered, through the console's
 *     own roll, so its gem lights and the Runner records the result exactly as
 *     it records a player's press.
 *   - DOWNTIME. When the day ring moves, everyone with no booking for the new
 *     quarter books one of its offers.
 *
 * The roster is the player accounts that have a character (city-state.mjs
 * #cityRoster); the admin panel's "test party" fills it when nobody is on.
 * Only the active GM's client ever acts, and the switches are that GM's own
 * (client scope): turning the autopilot on for a test never turns it on for
 * the real session.
 */

import {
  AUTOPILOT_DEFAULTS,
  autoCommitChoice,
  autopickChoice,
  bestSlug,
  normalizeAutopilot,
  postedChecks,
  unbookedUsers,
  unpickedUsers
} from "../core/admin.mjs";
import { isChoosing, STATUS } from "../core/departures.mjs";
import { momentKey } from "../core/day-ring.mjs";
import { cityRoster, cityState, gmPick, goCityDeparture, privatePicksForViewer } from "./city-state.mjs";
import { currentMoment, loadOffers, publicCommitments, readPrivateCommitments, writePublicCommitment } from "./campaign-state.mjs";
import { currentCheck, rollForCheck } from "./check-console.mjs";

const MODULE_ID = "blank-inheritance";
export const SETTING_AUTOPILOT = "adminAutopilot";
const LOG_LENGTH = 12;

let onActivity = () => {};
let picking = false;
let booking = false;
let consoleRolling = false;
/** Who has already been rolled for on which check ("<check id>:<user id>"), so a repaint never rolls them twice. */
const consoleRolled = new Set();
const activity = [];

export function registerAutopilotSettings(onChange = () => {}) {
  onActivity = onChange;
  game.settings.register(MODULE_ID, SETTING_AUTOPILOT, {
    scope: "client",
    config: false,
    type: Object,
    default: { ...AUTOPILOT_DEFAULTS },
    onChange: () => {
      onChange();
      kick();
    }
  });
}

export const autopilotSettings = () => normalizeAutopilot(game.settings.get(MODULE_ID, SETTING_AUTOPILOT));

export async function setAutopilot(patch = {}) {
  await game.settings.set(MODULE_ID, SETTING_AUTOPILOT, normalizeAutopilot({ ...autopilotSettings(), ...patch }));
}

/** What the stand-ins did, newest first -- the panel shows it so a test run can be read back. */
export const autopilotActivity = () => [...activity];

function note(text) {
  activity.unshift({ at: new Date().toLocaleTimeString(), text });
  activity.length = Math.min(activity.length, LOG_LENGTH);
  onActivity();
}

const isActiveGM = () => Boolean(game.user?.isGM && game.users.activeGM?.isSelf);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const beat = () => wait(350 + Math.random() * 750);
const nameOf = (userId) => {
  const user = game.users.get(userId);
  return user?.character?.name ?? user?.name ?? userId;
};

/* ------------------------------------------------------------------ */
/*  Departures                                                         */
/* ------------------------------------------------------------------ */

/**
 * Every roster player who has not chosen picks now. Returns how many picked.
 * One pass at a time: a pick changes the City's record, which calls this
 * again through the hook, and the second call must not double up.
 */
export async function pickForEveryone({ strategy = autopilotSettings().strategy, stagger = true } = {}) {
  if (!isActiveGM() || picking) return 0;
  picking = true;
  let picked = 0;
  const skipped = new Set();
  try {
    for (;;) {
      const state = cityState();
      const live = state.departure;
      const privatePicks = privatePicksForViewer();
      const pending = unpickedUsers(live, cityRoster(), privatePicks).filter((uid) => !skipped.has(uid));
      if (!pending.length) break;
      const userId = pending[0];
      const choice = autopickChoice(live, { userId, lastAssignment: state.lastAssignment ?? {}, privatePicks, strategy });
      if (!choice) {
        skipped.add(userId);
        note(`${nameOf(userId)}: nowhere open to them.`);
        continue;
      }
      if (stagger) await beat();
      const result = await gmPick(userId, choice, { isGM: false });
      if (result?.ok) {
        picked++;
        const label = live.destinations.find((d) => d.id === choice)?.label ?? choice;
        note(`${nameOf(userId)} chose ${label}.`);
      } else {
        skipped.add(userId);
        note(`${nameOf(userId)} could not choose (${result?.reason ?? "no answer"}).`);
      }
    }
  } finally {
    picking = false;
  }
  if (autopilotSettings().autoGo) await goWhenEveryoneHasChosen();
  return picked;
}

async function goWhenEveryoneHasChosen() {
  const live = cityState().departure;
  if (!live || !isChoosing(live) || live.status !== STATUS.OPEN) return;
  if (unpickedUsers(live, cityRoster(), privatePicksForViewer()).length) return;
  await wait(1500);
  // Checked again: the GM may have pressed Go, held or cancelled in the pause.
  const now = cityState().departure;
  if (!now || now.id !== live.id || now.status !== STATUS.OPEN) return;
  note("Everyone has chosen: Go.");
  await goCityDeparture();
}

/* ------------------------------------------------------------------ */
/*  Rolls                                                              */
/* ------------------------------------------------------------------ */

function rosterActors() {
  return cityRoster()
    .map((m) => game.users.get(m.userId)?.character)
    .filter(Boolean);
}

function modifierOf(actor, slug) {
  const statistic = actor?.getStatistic?.(slug);
  const mod = statistic?.mod ?? statistic?.check?.mod;
  return Number.isFinite(mod) ? mod : undefined;
}

/**
 * Every character on the roster rolls a check the Runner posted, on their
 * best skill of those it offers. Returns how many rolled.
 */
export async function rollCheckForEveryone(message, { stagger = true } = {}) {
  if (!isActiveGM() || !message) return 0;
  const checks = postedChecks(message.content);
  if (!checks.length) return 0;
  let rolled = 0;
  for (const actor of rosterActors()) {
    const slug = bestSlug(
      checks.map((c) => c.slug),
      (s) => modifierOf(actor, s)
    );
    const check = checks.find((c) => c.slug === slug);
    if (!check) {
      note(`${actor.name}: none of those skills on their sheet.`);
      continue;
    }
    if (stagger) await beat();
    try {
      await actor.getStatistic(slug).roll({
        dc: Number.isInteger(check.dc) ? { value: check.dc } : undefined,
        extraRollOptions: check.options,
        skipDialog: true
      });
      rolled++;
      note(`${actor.name} rolled ${slug}${Number.isInteger(check.dc) ? ` against DC ${check.dc}` : ""}.`);
    } catch (err) {
      console.error(`Blank Inheritance | Autopilot could not roll ${slug} for ${actor.name}:`, err);
      note(`${actor.name}: the ${slug} roll failed.`);
    }
  }
  return rolled;
}

/**
 * Everyone on the roster the open check is put to, and who has not rolled, rolls their best way of those offered
 * (foundry/check-console.mjs#rollForCheck, as the GM for their character). Returns how many rolled.
 */
export async function rollConsoleForEveryone({ stagger = true } = {}) {
  if (!isActiveGM() || consoleRolling) return 0;
  const first = currentCheck();
  if (!first?.skills?.length) return 0;
  consoleRolling = true;
  let rolled = 0;
  try {
    const roster = new Set(cityRoster().map((m) => m.userId));
    for (const userId of first.asked) {
      const session = currentCheck();
      if (!session || session.id !== first.id) break;
      const mark = `${session.id}:${userId}`;
      if (!roster.has(userId) || session.rolls?.[userId] || consoleRolled.has(mark)) continue;
      const actor = game.users.get(userId)?.character;
      if (!actor) continue;
      consoleRolled.add(mark);
      const slug = bestSlug(session.skills, (s) => modifierOf(actor, s));
      if (!slug) {
        note(`${actor.name}: none of those skills on their sheet.`);
        continue;
      }
      if (stagger) await beat();
      try {
        await rollForCheck(currentCheck() ?? session, slug, { actor });
        rolled++;
        note(`${actor.name} rolled ${slug}${Number.isInteger(session.dc) ? ` against DC ${session.dc}` : ""}.`);
      } catch (err) {
        console.error(`Blank Inheritance | Autopilot could not roll ${slug} for ${actor.name}:`, err);
        note(`${actor.name}: the ${slug} roll failed.`);
      }
    }
  } finally {
    consoleRolling = false;
  }
  return rolled;
}

/** The newest check the Runner posted to chat, rolled for everyone. */
export async function rollLastCheckForEveryone() {
  const latest = [...game.messages.contents].reverse().find((m) => !m.rolls?.length && postedChecks(m.content).length);
  if (!latest) {
    note("No check from the Scene Runner in the chat log.");
    return 0;
  }
  return rollCheckForEveryone(latest);
}

/* ------------------------------------------------------------------ */
/*  Downtime                                                           */
/* ------------------------------------------------------------------ */

/** Everyone with no booking this quarter books one of its offers. Returns how many booked. */
export async function bookForEveryone() {
  if (!isActiveGM() || booking) return 0;
  booking = true;
  let booked = 0;
  try {
    const moment = currentMoment();
    const offers = await loadOffers();
    const commitments = [...publicCommitments(), ...(await readPrivateCommitments())];
    const pending = unbookedUsers({ roster: cityRoster(), commitments, momentKey: momentKey(moment) });
    for (const userId of pending) {
      const activityId = autoCommitChoice({ moment, offers });
      if (!activityId) {
        note("Nothing on offer this quarter to book.");
        break;
      }
      await writePublicCommitment({ userId, userName: game.users.get(userId)?.name ?? null, activityId, moment });
      booked++;
      note(`${nameOf(userId)} booked ${offers.find((o) => o.id === activityId)?.name ?? activityId}.`);
    }
  } finally {
    booking = false;
  }
  return booked;
}

/* ------------------------------------------------------------------ */
/*  The hooks                                                          */
/* ------------------------------------------------------------------ */

/** Look again at everything the switches cover: called when a switch turns on. */
function kick() {
  const settings = autopilotSettings();
  if (settings.rolls) rollConsoleForEveryone().catch((err) => console.error("Blank Inheritance | Autopilot roll failed:", err));
  if (settings.departures) pickForEveryone().catch((err) => console.error("Blank Inheritance | Autopilot pick failed:", err));
  if (settings.downtime) bookForEveryone().catch((err) => console.error("Blank Inheritance | Autopilot booking failed:", err));
}

function onSettingChanged(setting) {
  const key = setting?.key;
  const settings = autopilotSettings();
  if (key === `${MODULE_ID}.cityState` && settings.departures) {
    pickForEveryone().catch((err) => console.error("Blank Inheritance | Autopilot pick failed:", err));
  }
  if (key === `${MODULE_ID}.campaignMoment` && settings.downtime) {
    bookForEveryone().catch((err) => console.error("Blank Inheritance | Autopilot booking failed:", err));
  }
  if (key === `${MODULE_ID}.checkConsole` && settings.rolls) {
    rollConsoleForEveryone().catch((err) => console.error("Blank Inheritance | Autopilot roll failed:", err));
  }
}

export function registerAutopilotHooks() {
  Hooks.on("updateSetting", onSettingChanged);
  Hooks.on("createSetting", onSettingChanged);
  Hooks.on("createChatMessage", (message) => {
    if (!autopilotSettings().rolls || !isActiveGM()) return;
    // A request, never a result: a rolled check carries its roll.
    if (message.rolls?.length || message.author?.id !== game.user.id) return;
    if (!postedChecks(message.content).length) return;
    // A check the console also posted to chat: the stand-ins roll it there (rollConsoleForEveryone).
    if (String(message.content ?? "").includes("bi-check:")) return;
    rollCheckForEveryone(message).catch((err) => console.error("Blank Inheritance | Autopilot roll failed:", err));
  });
}
