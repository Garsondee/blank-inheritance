/**
 * The check console, the Foundry half (core/check-console.mjs owns the rules and says why: one challenge at a time,
 * the ways it can be met, the DC, and a light in the bank for each player, lit by their result).
 *
 * WHERE THINGS LIVE
 *   - One world setting, `checkConsole`: the open check. Only the active GM writes it, one change at a time; every
 *     client repaints when it changes, the choice prompt's recipe (foundry/choice-prompt.mjs).
 *   - A player rolls on their own client, through their character's own statistic (sf2e's `Statistic#roll`, the call
 *     the sheet makes), with roll options naming the console and the way they chose (and the Scene Runner's own tag,
 *     so a beat still records its result the way it always has). The roll's chat message is the record; the active
 *     GM's client reads it as it arrives and lights that player's light.
 *   - A blind check (sf2e's secret trait) keeps only "rolled" in the setting. The players' banks light it purple; the
 *     GM's window reads the degree from the roll's own message, which Foundry shows the GM alone, or from what the GM
 *     set by hand (kept on the GM's own browser).
 *
 * WHAT THE SCENE RUNNER ADDS (foundry/scene-runner.mjs, through setCheckConsoleProvider): what the check is called,
 * what each degree means for each way, which degree the beat has recorded, and somewhere to record a result set by
 * hand or a degree marked as the beat's outcome. This file never imports the Runner.
 *
 * The windows are built from the deck's own hardware (design/visual-identity.md's north star, styles/bi-components.css
 * §The deck): a silver plate with an engraved legend, black cells, the filmstrip knob with a printed scale, pill keys,
 * two-way switches, and along the bottom the bank of six tall lights (D062).
 */

import {
  DEGREES,
  STANDARD_DC,
  allIn,
  bankSlots,
  clearRoll,
  consoleRollOptions,
  consoleTagFrom,
  dcBandArcs,
  dcFor,
  dcDial,
  difficultyOf,
  emptyConsoleState,
  hasPerDegreeWays,
  hasWayDcs,
  hasWayResults,
  isFresh,
  ledState,
  levelDc,
  newSession,
  recordRoll,
  resultFor,
  ringAgain,
  rolledCount,
  setBlind,
  setDc,
  setShowDc,
  stepDc,
  summaryLine,
  toggleAsked,
  toggleSkill
} from "../core/check-console.mjs";
import { waysInWords } from "../core/check-pill.mjs";
import { FALLBACK_SKILL_SLUGS, PERCEPTION_SLUG, SAVE_SLUGS, attributeOf, labelForSlug } from "../core/skills.mjs";
import { anySkillCard, enricherFor, rollParamsFromEvent } from "../core/roll-intent.mjs";
import { runnerRollOption } from "../core/runner-view.mjs";
import { recordLogEntry } from "./session-log.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const SETTING = "checkConsole";
const GM_TEMPLATE = `modules/${MODULE_ID}/templates/check-console/gm.hbs`;
const PLAYER_TEMPLATE = `modules/${MODULE_ID}/templates/check-console/player.hbs`;
/** What the GM set by hand on a blind check, on the GM's own browser: the shared record must not say it. */
const KNOWN_KEY = `${MODULE_ID}.checkConsoleKnown`;

/** Every way a GM can add, in the dropdown's three groups. */
const WAY_GROUPS = Object.freeze([
  { key: "BLANKINHERITANCE.CheckConsole.GroupPerception", slugs: [PERCEPTION_SLUG] },
  { key: "BLANKINHERITANCE.CheckConsole.GroupSkills", slugs: [...FALLBACK_SKILL_SLUGS] },
  { key: "BLANKINHERITANCE.CheckConsole.GroupSaves", slugs: [...SAVE_SLUGS] }
]);

/** More ways than this are posted to chat as one compact card (an any-skill check offers eighteen). */
const CARD_FROM = 6;

const DEGREE_KEYS = Object.freeze({
  criticalSuccess: "BLANKINHERITANCE.Runner.CritSuccess",
  success: "BLANKINHERITANCE.Runner.Success",
  failure: "BLANKINHERITANCE.Runner.Failure",
  criticalFailure: "BLANKINHERITANCE.Runner.CritFailure"
});
const DEGREE_SHORT = Object.freeze({ criticalFailure: "✗✗", failure: "✗", success: "✓", criticalSuccess: "✓✓" });
const DIFFICULTY_KEYS = Object.freeze({
  incrediblyEasy: "BLANKINHERITANCE.CheckConsole.Difficulty.IncrediblyEasy",
  veryEasy: "BLANKINHERITANCE.CheckConsole.Difficulty.VeryEasy",
  easy: "BLANKINHERITANCE.CheckConsole.Difficulty.Easy",
  standard: "BLANKINHERITANCE.CheckConsole.Difficulty.Standard",
  hard: "BLANKINHERITANCE.CheckConsole.Difficulty.Hard",
  veryHard: "BLANKINHERITANCE.CheckConsole.Difficulty.VeryHard",
  incrediblyHard: "BLANKINHERITANCE.CheckConsole.Difficulty.IncrediblyHard"
});
/** Dragging the dial: pixels of travel before it counts as a drag, and per step of the DC. */
const FLUSH_MS = 180;
const DRAG_START_PX = 4;
const DRAG_PX = 7;
const STEP_KEYS = Object.freeze({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 });

const degreeLabel = (degree) => (DEGREE_KEYS[degree] ? game.i18n.localize(DEGREE_KEYS[degree]) : null);

/** A way's name: the system's own word for a skill, else the slug in words. */
export function wayLabel(slug) {
  const key = CONFIG?.PF2E?.skills?.[slug]?.label ?? null;
  const said = key ? game.i18n.localize(key) : null;
  return said && said !== key ? said : labelForSlug(slug);
}

/**
 * The party's level, for how hard a DC is: the highest level among the players' characters (the campaign levels in
 * lockstep, so they agree), else the party's own members, else 1.
 */
export function partyLevel() {
  const levels = (game.users?.filter((u) => !u.isGM && u.character) ?? []).map((u) => Number(u.character.level));
  if (!levels.some(Number.isFinite)) for (const actor of game.actors?.party?.members ?? []) levels.push(Number(actor.level));
  const known = levels.filter((l) => Number.isFinite(l) && l >= 0);
  return known.length ? Math.max(...known) : 1;
}

/* ------------------------------------------------------------------ */
/*  The record                                                         */
/* ------------------------------------------------------------------ */

export function registerCheckConsoleSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING, { scope: "world", config: false, type: Object, default: emptyConsoleState(), onChange });
}

/** The open check, or null. */
export function currentCheck() {
  try {
    const stored = game.settings.get(MODULE_ID, SETTING);
    return stored && typeof stored === "object" ? stored.session ?? null : null;
  } catch {
    return null;
  }
}

async function writeSession(session) {
  if (!game.user?.isGM) return null;
  await game.settings.set(MODULE_ID, SETTING, { ...emptyConsoleState(), session });
  return session;
}

let queue = Promise.resolve();
/** Every write on the GM's client, one at a time: a roll landing while the knob turns must not undo either. */
const serially = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

/** Change the open check by a pure step (core/check-console.mjs) and write it, if anything changed. */
const change = (step) =>
  serially(async () => {
    const before = currentCheck();
    if (!before || !game.user?.isGM) return before;
    const after = step(before);
    if (!after || after === before) return before;
    return writeSession(after);
  });

/* ------------------------------------------------------------------ */
/*  What the Scene Runner adds                                         */
/* ------------------------------------------------------------------ */

let provideContext = null;
let recordResult = null;

/**
 * The Scene Runner plugs in here: `context(session)` resolves to { title, outcomes, bySkill, recordedDegree, tally, canMark }
 * for the GM's window, and `record({ kind: "hand" | "outcome", session, userId, actorId, degree })` keeps a result set
 * by hand, or a degree marked as the outcome, in the scene's own run state.
 */
export function setCheckConsoleProvider({ context = null, record = null } = {}) {
  provideContext = typeof context === "function" ? context : null;
  recordResult = typeof record === "function" ? record : null;
}

async function contextFor(session) {
  const fallback = { title: null, outcomes: {}, bySkill: null, recordedDegree: null, tally: null, canMark: false };
  if (!session || !provideContext) return fallback;
  try {
    return { ...fallback, ...((await provideContext(session)) ?? {}) };
  } catch (err) {
    console.warn("Blank Inheritance | The check console could not read its check:", err);
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/*  Who is at the table                                                */
/* ------------------------------------------------------------------ */

/** The user who plays this character: whoever has it assigned, else its first non-GM owner. */
function playerOf(actor) {
  if (!actor) return null;
  const assigned = game.users?.find((u) => !u.isGM && u.character?.id === actor.id);
  if (assigned) return assigned;
  return game.users?.find((u) => !u.isGM && actor.testUserPermission?.(u, "OWNER")) ?? null;
}

/** Everyone a check can be put to: players with a character, and anyone else who is actually here. */
export function checkRoster() {
  return game.users.filter((u) => !u.isGM && (u.character || u.active)).map((u) => u.id);
}

function seatsFor(session) {
  const ids = new Set([...checkRoster(), ...(session?.asked ?? []), ...Object.keys(session?.rolls ?? {})]);
  return [...ids]
    .map((id) => game.users.get(id))
    .filter((u) => u && !u.isGM)
    .map((u) => ({
      userId: u.id,
      name: u.character?.name ?? u.name,
      player: u.name,
      active: u.active,
      asked: session.asked.includes(u.id),
      entry: session.rolls?.[u.id] ?? null
    }));
}

/* ------------------------------------------------------------------ */
/*  What the GM knows                                                  */
/* ------------------------------------------------------------------ */

function knownStore() {
  try {
    return JSON.parse(localStorage.getItem(KNOWN_KEY) || "{}") ?? {};
  } catch {
    return {};
  }
}

function remember(sessionId, userId, value) {
  try {
    const mine = { ...(knownStore()[sessionId] ?? {}) };
    if (value) mine[userId] = value;
    else delete mine[userId];
    // Only the open check is kept: the record of a closed one is the log.
    localStorage.setItem(KNOWN_KEY, JSON.stringify({ [sessionId]: mine }));
  } catch {
    // Private windows and full storage: the GM's window falls back to "rolled".
  }
}

const contextOf = (message) => message?.flags?.sf2e?.context ?? message?.flags?.pf2e?.context ?? null;

/** A roll's degree and total as the GM's screen may see them, whatever the players' screens are allowed. */
function gmResult(session, userId) {
  const entry = session?.rolls?.[userId];
  if (!entry) return null;
  if (DEGREES.includes(entry.degree)) return { degree: entry.degree, total: entry.total ?? null };
  const message = entry.messageId ? game.messages?.get(entry.messageId) : null;
  const context = contextOf(message);
  if (context) return { degree: DEGREES.includes(context.outcome) ? context.outcome : null, total: message.rolls?.[0]?.total ?? null };
  const known = knownStore()[session.id]?.[userId];
  return { degree: DEGREES.includes(known?.degree) ? known.degree : null, total: Number.isFinite(entry.total) ? entry.total : null };
}

/** Each roll's light as the GM's screen shows it, in the order they landed: the Scene Runner's pill shows these. */
export function gmLights(session) {
  if (!session) return [];
  return Object.entries(session.rolls ?? {})
    .sort(([, a], [, b]) => (a.at ?? 0) - (b.at ?? 0))
    .map(([userId, entry]) => {
      const user = game.users.get(userId);
      return { state: ledState(entry, { gm: true, known: gmResult(session, userId)?.degree ?? null }), name: user?.character?.name ?? user?.name ?? null };
    });
}

/* ------------------------------------------------------------------ */
/*  Opening and closing                                                */
/* ------------------------------------------------------------------ */

/** The same check: one scene's beat or topic, and for a trigger's check the same check file entry too. */
const sameSource = (a, b) => {
  if (!a?.source || !b?.source || a.source.kind !== b.source.kind || a.source.kind === "adhoc") return false;
  return a.briefId === b.briefId && a.key === b.key && (a.source.checkRef ?? null) === (b.source.checkRef ?? null);
};

/**
 * Put a check to the table and open the GM's window on it. The same check again only brings its window forward;
 * any other open check is closed and recorded first, since there is only ever one.
 *
 * @param spec.briefId, spec.key, spec.source  where it came from (core/check-console.mjs#newSession)
 * @param spec.skills  the ways it can be met
 * @param spec.dc      the DC, or null
 * @param spec.wayDcs  a DC of its own for some ways, { slug: dc }
 * @param spec.blind   rolled blind
 */
export async function openCheckConsole(spec = {}) {
  if (!game.user?.isGM) return null;
  const current = currentCheck();
  if (current && sameSource(current, spec)) {
    showCheckConsole();
    return current;
  }
  if (current) await closeCheckConsole({ record: true });
  const session = newSession({
    id: foundry.utils.randomID(16).toLowerCase(),
    briefId: spec.briefId ?? null,
    key: spec.key ?? null,
    source: spec.source ?? { kind: "adhoc" },
    skills: spec.skills ?? [],
    dc: spec.dc ?? null,
    wayDcs: spec.wayDcs ?? null,
    blind: spec.blind === true,
    showDc: spec.showDc ?? spec.blind !== true,
    asked: checkRoster(),
    now: Date.now()
  });
  await serially(() => writeSession(session));
  showCheckConsole();
  return session;
}

/**
 * A skill asked for on the spot (the Director's Ask keys, the Palette's "ask"): another way onto the made-up check that
 * is open and nobody has rolled yet, so Athletics and then Acrobatics asks for either; otherwise a new made-up check,
 * at the standard DC for the party's level.
 */
export async function askForWay(slug, { dc = null } = {}) {
  if (!game.user?.isGM || typeof slug !== "string" || !slug) return null;
  const open = currentCheck();
  if (open?.source?.kind === "adhoc" && !Object.keys(open.rolls ?? {}).length) {
    await change((s) => {
      const next = s.skills.includes(slug) ? s : toggleSkill(s, slug);
      return Number.isFinite(dc) ? setDc(next, dc) : next;
    });
    showCheckConsole();
    return currentCheck();
  }
  return openCheckConsole({ briefId: null, key: null, source: { kind: "adhoc" }, skills: [slug], dc: Number.isFinite(dc) ? dc : standardDc() });
}

/** The DC a check made up on the spot starts at: the standard DC for the party's level (STANDARD_DC at level 1). */
export const standardDc = () => levelDc(partyLevel()) ?? STANDARD_DC;

/** Close the open check: its line goes in the log (unless nobody rolled), and every window closes. */
export async function closeCheckConsole({ record = true } = {}) {
  if (!game.user?.isGM) return null;
  return serially(async () => {
    const session = currentCheck();
    if (!session) return null;
    if (record && Object.keys(session.rolls ?? {}).length) {
      const ctx = await contextFor(session);
      const title = ctx.title ?? waysInWords(session.skills.map(wayLabel), game.i18n.localize("BLANKINHERITANCE.CheckConsole.Or"));
      const rows = Object.entries(session.rolls)
        .sort(([, a], [, b]) => (a.at ?? 0) - (b.at ?? 0))
        .map(([userId, entry]) => {
          const result = gmResult(session, userId);
          const user = game.users.get(userId);
          return {
            name: user?.character?.name ?? user?.name ?? "?",
            skillLabel: entry.skill ? wayLabel(entry.skill) : null,
            degreeLabel: degreeLabel(result?.degree) ?? game.i18n.localize("BLANKINHERITANCE.CheckConsole.Rolled"),
            total: result?.total ?? null
          };
        });
      await recordLogEntry({
        text: summaryLine(title, session.dc, rows, wayDcsOf(session)),
        nowIso: new Date().toISOString(),
        scene: canvas?.scene?.name ?? null,
        subject: session.key ? `${session.key}::check` : "check"
      }).catch((err) => console.error("Blank Inheritance | Could not log the check:", err));
    }
    await writeSession(null);
    remember(session.id, "", null);
    return session;
  });
}

/* ------------------------------------------------------------------ */
/*  Rolling                                                            */
/* ------------------------------------------------------------------ */

/** The roll options a roll for this check carries: the Runner's tag (a beat or a person's topic), the console and the way. */
export function checkRollOptions(session, slug) {
  const out = [];
  if (session?.briefId && session?.key) {
    try {
      out.push(runnerRollOption(session.briefId, session.key));
    } catch {
      // An id that cannot ride in a roll option: the console still hears it by its own tag.
    }
  }
  out.push(...consoleRollOptions(session?.id, slug));
  return out;
}

/**
 * Roll one way for this check, as `actor`, through the statistic's own roll: the same call the character sheet makes,
 * so the result, its card and everything sf2e does around it are exactly what a sheet roll would be. A plain press
 * skips sf2e's roll dialog; shift shows it (core/roll-intent.mjs#rollParamsFromEvent).
 */
export async function rollForCheck(session, slug, { actor = game.user?.character ?? null, event = null } = {}) {
  if (!session || !session.skills.includes(slug)) return null;
  if (!actor) {
    ui.notifications?.warn(game.i18n.localize("BLANKINHERITANCE.CheckConsole.NoCharacter"));
    return null;
  }
  const statistic = actor.getStatistic?.(slug);
  if (!statistic) {
    ui.notifications?.warn(game.i18n.format("BLANKINHERITANCE.CheckConsole.NoSuchSkill", { skill: wayLabel(slug) }));
    return null;
  }
  const params = rollParamsFromEvent(event, { showCheckDialogs: false, isGM: game.user?.isGM ?? false });
  const extraRollOptions = checkRollOptions(session, slug);
  if (session.blind) extraRollOptions.push("secret");
  return statistic.roll({
    ...params,
    dc: Number.isFinite(dcFor(session, slug)) ? { value: dcFor(session, slug) } : null,
    extraRollOptions
  });
}

/** The way a roll came by: its own option, or the statistic its domains name. */
function wayOf(tag, context, session) {
  if (tag?.skill) return tag.skill;
  const domains = Array.isArray(context?.domains) ? context.domains : [];
  return session.skills.find((slug) => domains.includes(slug)) ?? null;
}

/**
 * The active GM hears every roll made for the open check and lights its light. Who rolled is the message's author,
 * or, when a GM rolled for a character, the character's player.
 */
export function registerCheckConsoleConversation() {
  Hooks.on("createChatMessage", (message) => {
    if (!game.user?.isGM) return;
    const activeGm = game.users?.activeGM;
    if (activeGm && activeGm.id !== game.user.id) return;
    const context = contextOf(message);
    const tag = consoleTagFrom(context?.options);
    if (!tag) return;
    serially(async () => {
      const session = currentCheck();
      if (!session || session.id !== tag.sessionId) return;
      const author = message.author ?? game.users.get(message.user ?? message._source?.author);
      const actor = context.actor ? game.actors.get(context.actor) : null;
      const userId = author && !author.isGM ? author.id : (playerOf(actor)?.id ?? author?.id ?? null);
      if (!userId) return;
      const total = message.rolls?.[0]?.total;
      const next = recordRoll(session, {
        userId,
        actorId: context.actor ?? null,
        skill: wayOf(tag, context, session),
        degree: context.outcome ?? null,
        total: Number.isFinite(total) ? total : null,
        via: "roll",
        messageId: message.id,
        at: Date.now()
      });
      await writeSession(next);
    }).catch((err) => console.error("Blank Inheritance | The check console could not record that roll:", err));
  });
  syncCheckConsoleWindows();
}

/* ------------------------------------------------------------------ */
/*  The GM's controls                                                  */
/* ------------------------------------------------------------------ */

/** Each way's own DC, for the log line: empty unless some way has one that differs from the check's. */
function authoredDcFor(session, slug) {
  const own = slug ? session?.authoredWayDcs?.[slug] : null;
  return Number.isFinite(own) ? own : (session?.authoredDc ?? null);
}

function wayDcsOf(session) {
  if (!hasWayDcs(session)) return [];
  return session.skills.map((slug) => ({ label: wayLabel(slug), dc: dcFor(session, slug) })).filter((w) => Number.isFinite(w.dc));
}

/** A player's result set by hand, or taken back (`degree` null, or the one they already have). */
async function setResultByHand(userId, degree) {
  const session = currentCheck();
  if (!session || !game.user?.isGM) return;
  const user = game.users.get(userId);
  const actorId = user?.character?.id ?? session.rolls?.[userId]?.actorId ?? null;
  const had = gmResult(session, userId)?.degree ?? null;
  const clearing = !degree || had === degree;
  // Kept before the write: the write repaints this window, which must already know.
  if (session.blind) remember(session.id, userId, clearing ? null : { degree });
  await change((s) => (clearing ? clearRoll(s, userId) : recordRoll(s, { userId, actorId, degree, via: "gm", at: Date.now() })));
  await recordResult?.({ kind: "hand", session: currentCheck() ?? session, userId, actorId, degree: clearing ? null : degree });
}

/** Post the check to chat as well, for anyone without their window: the same tags, so the rolls still land here. */
async function postToChat(session) {
  if (!session?.skills?.length) return null;
  const dc = Number.isFinite(session.dc) ? session.dc : null;
  const tags = checkRollOptions(session, null);
  let content;
  if (session.skills.length > CARD_FROM && !hasWayDcs(session)) {
    content = anySkillCard({
      skillOptions: session.skills,
      dc,
      options: tags,
      secret: session.blind,
      labels: Object.fromEntries(session.skills.map((slug) => [slug, wayLabel(slug)])),
      heading: game.i18n.localize("BLANKINHERITANCE.Runner.AnySkillHeading")
    });
  } else {
    content = session.skills
      .map((slug) => enricherFor({ slug, dc: dcFor(session, slug), secret: session.blind, options: [...tags, ...consoleRollOptions(null, slug)] }))
      .join(` ${game.i18n.localize("BLANKINHERITANCE.CheckConsole.Or")} `);
  }
  return ChatMessage.create({ content });
}

/* ------------------------------------------------------------------ */
/*  The windows                                                        */
/* ------------------------------------------------------------------ */

let gmWindow = null;
let playerWindow = null;
let dismissed = null;

/** Bring the GM's window up on the open check. */
export function showCheckConsole() {
  if (!game.user?.isGM || !currentCheck()) return;
  if (!gmWindow) gmWindow = new CheckConsoleWindow();
  gmWindow.render({ force: true }).catch((err) => console.error("Blank Inheritance | Could not open the check console:", err));
}

/**
 * Called on every client whenever the record changes (and once at ready). The GM's window follows the check and goes
 * when it closes; a player's opens with it, follows it, and comes back when the GM asks again.
 */
export function syncCheckConsoleWindows() {
  const session = currentCheck();
  if (game.user?.isGM) {
    if (!session) gmWindow?.closeFromSync();
    else if (gmWindow?.rendered) gmWindow.render({});
    return;
  }
  if (!session) {
    dismissed = null;
    playerWindow?.closeFromSync();
    return;
  }
  const mark = `${session.id}:${session.ring ?? 0}`;
  if (playerWindow) {
    if (playerWindow.sessionId === session.id) {
      playerWindow.mark = mark;
      playerWindow.render({});
      return;
    }
    playerWindow.closeFromSync();
  }
  if (dismissed === mark) return;
  const app = new CheckPlayerWindow(session.id, mark);
  playerWindow = app;
  app.render({ force: true }).catch((err) => {
    console.error("Blank Inheritance | Could not open the check window:", err);
    if (playerWindow === app) playerWindow = null;
  });
}

/**
 * The knob answers the wheel and the arrow keys, and the add-a-way dropdown adds the way it is set to; wired once per
 * window (the listeners live on the window itself, which outlives its repaints).
 */
function wireControls(root, { onStep = null, onAddWay = null } = {}) {
  if (!root || root.dataset.biControls) return;
  root.dataset.biControls = "1";
  root.addEventListener(
    "wheel",
    (event) => {
      const knob = event.target?.closest?.("[data-bi-wheel]");
      if (!knob || knob.disabled || !onStep) return;
      event.preventDefault();
      event.stopPropagation();
      onStep(knob.dataset.biWheel, (event.deltaY > 0 ? -1 : 1) * (event.shiftKey ? 5 : 1));
    },
    { passive: false }
  );
  root.addEventListener("keydown", (event) => {
    const knob = event.target?.closest?.("[data-bi-wheel]");
    const delta = STEP_KEYS[event.key];
    if (!knob || knob.disabled || !delta || !onStep) return;
    event.preventDefault();
    event.stopPropagation();
    onStep(knob.dataset.biWheel, delta * (event.shiftKey ? 5 : 1));
  });
  root.addEventListener("change", (event) => {
    const select = event.target?.closest?.("select[data-bi-add-way]");
    if (!select || !select.value || !onAddWay) return;
    onAddWay(select.value);
    select.value = "";
  });
  // Dragging the dial: up raises, down lowers, a step for every DRAG_PX of travel. The window repaints on every step (the
  // dial's element is replaced), so the drag listens on the window and keeps its own count rather than holding capture.
  root.addEventListener("pointerdown", (event) => {
    const knob = event.target?.closest?.("[data-bi-drag]");
    if (!knob || event.button !== 0 || !onStep) return;
    const which = knob.dataset.biDrag;
    let lastY = event.clientY;
    let travelled = 0;
    let dragging = false;
    const move = (e) => {
      travelled += Math.abs(e.clientY - lastY);
      if (!dragging && travelled < DRAG_START_PX) return;
      if (!dragging) {
        dragging = true;
        document.body.classList.add("bi-dragging-dial");
      }
      const steps = Math.trunc((lastY - e.clientY) / DRAG_PX);
      if (!steps) return;
      lastY -= steps * DRAG_PX;
      onStep(which, steps);
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.classList.remove("bi-dragging-dial");
      // The click that ends a drag is not a press on the knob's left or right half.
      if (dragging) {
        const swallow = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  });
  // A key visibly goes down, a beat past the click (foundry/deck.mjs's own .is-pressed).
  root.addEventListener("pointerdown", (event) => {
    const key = event.target?.closest?.(".bi-deck-map, .bi-deck-pill__cap, .bi-deck-key, .bi-check__go, .bi-check__seg");
    if (!key || key.disabled) return;
    key.classList.add("is-pressed");
    const release = () => {
      setTimeout(() => key.classList.remove("is-pressed"), 110);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  });
}

/** Which half of a knob was pressed: the left steps back, the right on (a keyboard press steps on). */
function knobDelta(event, target) {
  let delta = 1;
  if (event?.detail > 0) {
    const rect = target.getBoundingClientRect();
    delta = event.clientX < rect.left + rect.width / 2 ? -1 : 1;
  }
  return delta * (event?.shiftKey ? 5 : 1);
}

/** The colour key under each bank of lights: what each colour means, in the bank's own colours. */
function bankKey() {
  return [
    { state: "criticalFailure", label: degreeLabel("criticalFailure") },
    { state: "failure", label: degreeLabel("failure") },
    { state: "success", label: degreeLabel("success") },
    { state: "criticalSuccess", label: degreeLabel("criticalSuccess") },
    { state: "rolled", label: game.i18n.localize("BLANKINHERITANCE.CheckConsole.Hidden") }
  ];
}

class CheckConsoleWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bi-check-console",
    tag: "section",
    classes: ["bi-check-window"],
    window: { title: "BLANKINHERITANCE.CheckConsole.Title", icon: "fa-solid fa-dice-d20", resizable: false },
    position: { width: 820, height: "auto" },
    actions: {
      stepDc: CheckConsoleWindow.#onStepDc,
      resetDc: CheckConsoleWindow.#onResetDc,
      focusWay: CheckConsoleWindow.#onFocusWay,
      setBlind: CheckConsoleWindow.#onSetBlind,
      setShowDc: CheckConsoleWindow.#onSetShowDc,
      toggleWay: CheckConsoleWindow.#onToggleWay,
      showResults: CheckConsoleWindow.#onShowResults,
      toggleAsked: CheckConsoleWindow.#onToggleAsked,
      setResult: CheckConsoleWindow.#onSetResult,
      markOutcome: CheckConsoleWindow.#onMarkOutcome,
      askAgain: CheckConsoleWindow.#onAskAgain,
      postToChat: CheckConsoleWindow.#onPostToChat,
      closeCheck: CheckConsoleWindow.#onCloseCheck
    }
  };

  static PARTS = { body: { template: GM_TEMPLATE } };

  /** Lights that have already played their flare in this window. */
  #played = new Set();
  /** Which way's results the GM chose to read, for this check (null: the way rolled last, else the first). */
  #resultsWay = null;
  #resultsFor = null;
  /** The way whose own DC the knob is turning (null: the check's DC, which every way without one of its own follows). */
  #focusWay = null;
  /**
   * A DC the GM has turned the dial to but the server has not yet been told: { slug, dc, seq }. The dial and its readout
   * show it at once, and only the last value is written, a moment after the hand stops (a world setting is a round trip
   * to the server and a repaint of every window, far too slow to do for each step of a drag).
   */
  #target = null;
  #seq = 0;
  #flushTimer = null;
  #frame = null;

  closeFromSync() {
    if (gmWindow === this) gmWindow = null;
    this.close().catch(() => {});
  }

  /** @override */
  async _prepareContext() {
    const stored = currentCheck();
    if (!stored) return { session: null };
    if (this.#target && this.#target.sessionId !== stored.id) this.#target = null;
    const session = this.#target ? setDc(stored, this.#target.dc, this.#target.slug) : stored;
    const ctx = await contextFor(session);
    const or = game.i18n.localize("BLANKINHERITANCE.CheckConsole.Or");
    const now = Date.now();
    if (this.#resultsFor !== session.id) {
      this.#resultsFor = session.id;
      this.#resultsWay = null;
      this.#focusWay = null;
    }
    // A way taken off (or never on) cannot be the one the knob is turning.
    if (this.#focusWay && !session.skills.includes(this.#focusWay)) this.#focusWay = null;
    const focus = this.#focusWay;
    const shownDc = dcFor(session, focus);

    // The DC, and how hard it is for a party of this level (GM Core's DCs by level, D062).
    const level = partyLevel();
    const dial = dcDial(shownDc);
    const bands = dcBandArcs(level);
    const difficulty = difficultyOf(shownDc, level);
    const signed = (n) => (n > 0 ? `+${n}` : String(n));

    // Everyone at the table, as the bank of lights shows them: the GM sees every degree, even a blind one.
    const seats = seatsFor(session).map((seat) => {
      const result = gmResult(session, seat.userId);
      const entry = seat.entry;
      const state = entry ? ledState(entry, { gm: true, known: result?.degree ?? null }) : "waiting";
      const playKey = entry ? `${seat.userId}:${entry.at}` : null;
      const fresh = Boolean(entry && isFresh(entry, now) && !this.#played.has(playKey));
      if (fresh) this.#played.add(playKey);
      const how = [];
      if (entry?.skill) how.push(wayLabel(entry.skill));
      if (Number.isFinite(result?.total)) how.push(String(result.total));
      return {
        ...seat,
        state,
        fresh,
        hidden: Boolean(entry && session.blind),
        degree: result?.degree ?? null,
        degreeLabel: degreeLabel(result?.degree) ?? (entry ? game.i18n.localize("BLANKINHERITANCE.CheckConsole.Rolled") : null),
        skill: entry?.skill ?? null,
        how: how.join(" · "),
        byHand: entry?.via === "gm",
        degrees: DEGREES.map((degree) => ({ degree, short: DEGREE_SHORT[degree], label: degreeLabel(degree), on: result?.degree === degree }))
      };
    });

    // Results, per way and per degree: the way the GM picked, else the way rolled last, else the first.
    const ways = [...new Set([...session.authoredSkills, ...session.skills])].map((slug) => ({
      slug,
      label: wayLabel(slug),
      on: session.skills.includes(slug),
      dc: Number.isFinite(dcFor(session, slug)) ? String(dcFor(session, slug)) : "—",
      own: Number.isFinite(session.wayDcs?.[slug]) && session.wayDcs[slug] !== session.dc,
      focus: slug === focus,
      locked: session.skills.length === 1 && session.skills.includes(slug)
    }));
    const byWay = hasWayResults(ctx);
    const perDegree = hasPerDegreeWays(ctx);
    const lastRolled = Object.values(session.rolls ?? {}).filter((e) => e.skill).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.skill ?? null;
    const shownWay = [this.#resultsWay, lastRolled, session.skills[0]].find((s) => s && session.skills.includes(s)) ?? null;
    const outcomes = [...DEGREES].reverse().map((degree) => {
      const result = shownWay ? resultFor(ctx, shownWay, degree) : { text: ctx.outcomes?.[degree] ?? null, own: false, note: null };
      const who = seats.filter((s) => s.degree === degree).map((s) => (s.how ? `${s.name} (${s.how})` : s.name));
      return {
        degree,
        label: degreeLabel(degree),
        text: result.text,
        // Said only when some way has results of its own per degree; a check whose ways only have a line each has
        // nothing per degree to set this one apart from. A degree with no result at all is not the same for anyone.
        shared: perDegree && !result.own && Boolean(result.text),
        whoText: who.join(", "),
        hit: who.length > 0,
        isRecorded: ctx.recordedDegree === degree,
        // Every time it has come out this way before, from the log (the Runner's tally).
        tally: Number(ctx.tally?.[degree]) || 0
      };
    });
    const note = byWay && shownWay ? resultFor(ctx, shownWay, "success").note : null;

    // The add-a-way dropdown: every way not yet offered, in its group.
    const addGroups = WAY_GROUPS.map((group) => ({
      label: game.i18n.localize(group.key),
      options: group.slugs.filter((slug) => !session.skills.includes(slug)).map((slug) => ({ slug, label: wayLabel(slug) }))
    })).filter((group) => group.options.length);

    const asked = session.asked.length;
    return {
      session,
      title: ctx.title || waysInWords(session.skills.map(wayLabel), or) || game.i18n.localize("BLANKINHERITANCE.CheckConsole.Title"),
      isAdhoc: session.source?.kind === "adhoc",
      level,
      dial: {
        ...dial,
        lcd: Number.isFinite(shownDc) ? String(shownDc) : "—",
        forWay: focus ? wayLabel(focus) : null,
        changed: focus ? shownDc !== authoredDcFor(session, focus) : session.dc !== session.authoredDc,
        authored: String(Number.isFinite(authoredDcFor(session, focus)) ? authoredDcFor(session, focus) : "—"),
        bands: bands.arcs,
        notch: bands.notch,
        difficulty: difficulty.key
          ? {
              key: difficulty.key,
              label: game.i18n.localize(DIFFICULTY_KEYS[difficulty.key]),
              delta: signed(difficulty.delta),
              base: difficulty.base
            }
          : null
      },
      ways,
      noWays: session.skills.length === 0,
      addGroups,
      results: {
        tabs: byWay ? session.skills.map((slug) => ({ slug, label: wayLabel(slug), on: slug === shownWay })) : [],
        note,
        noteWay: note ? wayLabel(shownWay) : null,
        rows: outcomes
      },
      bank: bankSlots(seats).map((seat) => (seat ? { ...seat, empty: false } : { empty: true })),
      bankKey: bankKey(),
      progress: `${rolledCount(session)}/${asked}`,
      allIn: allIn(session),
      canMark: ctx.canMark === true
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    wireControls(this.element, {
      onStep: (which, delta) => {
        if (which === "dc") this.#nudge(delta);
      },
      onAddWay: (slug) => change((s) => (s.skills.includes(slug) ? s : toggleSkill(s, slug)))
    });
  }

  static #onStepDc(event, target) {
    this.#nudge(knobDelta(event, target));
  }

  static #onResetDc() {
    this.#target = null;
    clearTimeout(this.#flushTimer);
    change((s) => setDc(s, null, this.#focusWay));
  }

  /** Turn the dial: the new DC shows at once (one repaint a frame at most), and is written once the hand has rested. */
  #nudge(delta) {
    const stored = currentCheck();
    if (!stored) return;
    const slug = this.#focusWay;
    if (this.#target && this.#target.slug !== slug) this.#flush();
    const base = this.#target ? setDc(stored, this.#target.dc, this.#target.slug) : stored;
    const next = stepDc(base, delta, slug);
    this.#target = { sessionId: stored.id, slug, dc: dcFor(next, slug), seq: ++this.#seq };
    clearTimeout(this.#flushTimer);
    this.#flushTimer = setTimeout(() => this.#flush(), FLUSH_MS);
    if (this.#frame === null) {
      this.#frame = requestAnimationFrame(() => {
        this.#frame = null;
        if (this.rendered) this.render({});
      });
    }
  }

  /** Write the dial's value, and drop it from the screen's overlay once the record says the same (unless it has moved on). */
  async #flush() {
    clearTimeout(this.#flushTimer);
    const target = this.#target;
    if (!target) return;
    await change((s) => (s.id === target.sessionId ? setDc(s, target.dc, target.slug) : s));
    if (this.#target?.seq === target.seq) this.#target = null;
  }

  /** Point the knob at one way's own DC, or (the same way again) back at the check's. */
  static #onFocusWay(event, target) {
    const slug = target.dataset.slug || null;
    this.#focusWay = this.#focusWay === slug ? null : slug;
    this.render({});
  }

  static #onSetBlind(event, target) {
    change((s) => setBlind(s, target.dataset.value === "1"));
  }

  static #onSetShowDc(event, target) {
    change((s) => setShowDc(s, target.dataset.value === "1"));
  }

  static #onToggleWay(event, target) {
    change((s) => toggleSkill(s, target.dataset.slug));
  }

  static #onShowResults(event, target) {
    this.#resultsWay = target.dataset.slug || null;
    this.render({});
  }

  static #onToggleAsked(event, target) {
    change((s) => toggleAsked(s, target.dataset.userId));
  }

  static async #onSetResult(event, target) {
    await setResultByHand(target.dataset.userId, target.dataset.degree);
  }

  static async #onMarkOutcome(event, target) {
    const session = currentCheck();
    if (!session) return;
    await recordResult?.({ kind: "outcome", session, degree: target.dataset.degree });
    this.render({});
  }

  static #onAskAgain() {
    change((s) => ringAgain(s));
    ui.notifications?.info(game.i18n.localize("BLANKINHERITANCE.CheckConsole.AskedAgain"));
  }

  static async #onPostToChat() {
    try {
      await postToChat(currentCheck());
    } catch (err) {
      console.error("Blank Inheritance | Could not post the check:", err);
      ui.notifications?.warn(String(err?.message ?? err));
    }
  }

  static async #onCloseCheck() {
    await closeCheckConsole({ record: true });
  }

  /** @override */
  _onClose(options) {
    super._onClose?.(options);
    // A turn of the dial not yet written is not lost with the window.
    this.#flush();
    if (this.#frame !== null) cancelAnimationFrame(this.#frame);
    if (gmWindow === this) gmWindow = null;
  }
}

class CheckPlayerWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    // Unique per check ({id} is Foundry's own placeholder): the next check opened as this one closes must not collide.
    id: "bi-check-player-{id}",
    tag: "section",
    classes: ["bi-check-window", "bi-check-window--player"],
    window: { title: "BLANKINHERITANCE.CheckConsole.PlayerTitle", icon: "fa-solid fa-dice-d20", resizable: false, minimizable: false },
    position: { width: 480, height: "auto" },
    actions: { roll: CheckPlayerWindow.#onRoll }
  };

  static PARTS = { body: { template: PLAYER_TEMPLATE } };

  #sessionId;
  #mark;
  #closedBySync = false;
  #played = new Set();

  constructor(sessionId, mark, options = {}) {
    super(options);
    this.#sessionId = sessionId;
    this.#mark = mark;
  }

  get sessionId() {
    return this.#sessionId;
  }

  /** The check and how many times it has been put to the table: a close is remembered against this. */
  set mark(value) {
    this.#mark = value;
  }

  closeFromSync() {
    this.#closedBySync = true;
    if (playerWindow === this) playerWindow = null;
    this.close().catch(() => {});
  }

  /** @override */
  async _prepareContext() {
    const session = currentCheck();
    if (!session || session.id !== this.#sessionId) return { session: null };
    const me = game.user;
    const actor = me.character ?? null;
    const asked = session.asked.includes(me.id);
    const mine = session.rolls?.[me.id] ?? null;
    const now = Date.now();
    const or = game.i18n.localize("BLANKINHERITANCE.CheckConsole.Or");

    const dcShown = session.showDc && !session.blind;
    const showsWayDcs = dcShown && hasWayDcs(session);
    const ways = session.skills.map((slug) => {
      const statistic = actor?.getStatistic?.(slug) ?? null;
      const mod = Number(statistic?.mod ?? statistic?.check?.mod);
      const rank = Number(statistic?.rank) || 0;
      return {
        slug,
        label: wayLabel(slug),
        mod: Number.isFinite(mod) ? (mod >= 0 ? `+${mod}` : String(mod)) : "—",
        rank,
        pips: [1, 2, 3, 4].map((n) => n <= rank),
        // Tinted by the attribute it adds, as the deck's keys are (D063).
        attribute: attributeOf(slug),
        // Its own DC, said only when the check says its DC at all and the ways differ.
        dc: showsWayDcs && Number.isFinite(dcFor(session, slug)) ? dcFor(session, slug) : null,
        disabled: !asked || !statistic || Boolean(mine)
      };
    });

    // The bank as every player sees it: a blind roll lights purple, never its degree.
    const seats = seatsFor(session)
      .filter((seat) => seat.asked || seat.entry)
      .map((seat) => {
        const state = seat.entry ? ledState(seat.entry) : "waiting";
        const playKey = seat.entry ? `${seat.userId}:${seat.entry.at}` : null;
        const fresh = Boolean(seat.entry && isFresh(seat.entry, now) && !this.#played.has(playKey));
        if (fresh) this.#played.add(playKey);
        return {
          name: seat.name,
          state,
          fresh,
          isMe: seat.userId === me.id,
          said: DEGREES.includes(state) ? degreeLabel(state) : seat.entry ? game.i18n.localize("BLANKINHERITANCE.CheckConsole.Hidden") : null
        };
      });

    let result = null;
    if (mine) {
      const state = ledState(mine);
      result = DEGREES.includes(state)
        ? game.i18n.format("BLANKINHERITANCE.CheckConsole.YouGot", { degree: degreeLabel(state), total: Number.isFinite(mine.total) ? mine.total : "—" })
        : game.i18n.localize(session.blind ? "BLANKINHERITANCE.CheckConsole.YouRolledBlind" : "BLANKINHERITANCE.CheckConsole.YouRolled");
    }

    let hint = null;
    if (!actor) hint = game.i18n.localize("BLANKINHERITANCE.CheckConsole.NoCharacter");
    else if (!asked) hint = game.i18n.localize("BLANKINHERITANCE.CheckConsole.NotAsked");
    else if (!mine) hint = game.i18n.localize("BLANKINHERITANCE.CheckConsole.PickAWay");

    return {
      session,
      words: waysInWords(session.skills.map(wayLabel), or),
      dc: dcShown && !showsWayDcs && Number.isFinite(session.dc) ? session.dc : null,
      blind: session.blind,
      ways,
      bank: bankSlots(seats).map((seat) => (seat ? { ...seat, empty: false } : { empty: true })),
      bankKey: bankKey(),
      result,
      hint
    };
  }

  static async #onRoll(event, target) {
    const session = currentCheck();
    if (!session || session.id !== this.#sessionId) return;
    if (!session.asked.includes(game.user.id) || session.rolls?.[game.user.id]) return;
    target.disabled = true;
    try {
      await rollForCheck(session, target.dataset.slug, { event });
    } catch (err) {
      console.error("Blank Inheritance | Could not roll that check:", err);
      ui.notifications?.warn(String(err?.message ?? err));
      target.disabled = false;
    }
  }

  /** @override A window the player closed stays closed until the GM asks again; one the check closed is simply gone. */
  _onClose(options) {
    super._onClose?.(options);
    if (!this.#closedBySync) dismissed = this.#mark;
    if (playerWindow === this) playerWindow = null;
  }
}
