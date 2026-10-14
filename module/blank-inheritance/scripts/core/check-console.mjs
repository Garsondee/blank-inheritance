/**
 * The check console (2026-10-05), the pure half. Ingram: "When a scene includes a skill check we put it all into the same
 * pill shaped cartouche with the dice symbol ... which opens up a new dialogue which controls the DC setting and
 * collecting area", and "the dialogue is per challenge, but allows a range of different solutions to that challenge".
 *
 * One challenge is put to the table at a time: the ways it can be met (its skills: bluff OR intimidate), the DC, who is
 * asked, and each player's roll as it lands, a gem lit in its degree's colour. The GM's window and every player's own
 * are foundry/check-console.mjs; the Scene Runner opens one from a check's pill in its prose (core/check-pill.mjs).
 *
 * THE RECORD is one world setting the active GM writes and every screen repaints from, the choice prompt's recipe
 * (core/choice-prompt.mjs). It holds nothing a player's window should show them that they should not see: no check
 * name (some give the find away: "The stamp"), no outcome text, and for a blind check no degree or total, only that the
 * player rolled. The GM's window gets those from the scene's own files and from the rolls themselves (the chat message
 * a roll made, which Foundry shows the GM alone).
 *
 * Pure: no Foundry, no DOM, no clock but the one passed in.
 */

/** The four degrees, worst first (the order they light up the scale). */
export const DEGREES = Object.freeze(["criticalFailure", "failure", "success", "criticalSuccess"]);

/** What a DC can be set to on the dial. SF2E's simple DCs run 10 (untrained) to 40 (legendary); 5 is a gimme. */
export const DC_RANGE = Object.freeze({ min: 5, max: 40 });

/** The DC a check with none starts from: SF2E's simple DC for a trained task. */
export const STANDARD_DC = 15;

/** The dial's sweep, in degrees, and how many frames the knob's filmstrip has (core/deck-layout.mjs#selectorState). */
const SWEEP = 270;
const FRAMES = 128;

/** A gem that lit up this recently (ms) plays its arrival. */
export const FRESH_MS = 2600;

/** The setting's empty value. */
export const emptyConsoleState = () => ({ session: null });

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const clampDc = (dc) => Math.min(DC_RANGE.max, Math.max(DC_RANGE.min, Math.round(Number(dc))));
const slugs = (list) => [...new Set((Array.isArray(list) ? list : []).filter((s) => typeof s === "string" && SAFE_SLUG.test(s)))];
const ids = (list) => [...new Set((Array.isArray(list) ? list : []).filter((s) => typeof s === "string" && s))];
const cleanWayDcs = (map) =>
  Object.fromEntries(Object.entries(map && typeof map === "object" ? map : {}).filter(([slug, dc]) => SAFE_SLUG.test(slug) && isDc(dc)).map(([slug, dc]) => [slug, clampDc(dc)]));
const isDc = (dc) => dc !== null && dc !== undefined && dc !== "" && Number.isFinite(Number(dc));

/**
 * A challenge put to the table.
 *
 * @param o.id       this opening's own id (a later one replaces it); lower-case letters and digits, since it rides in a
 *                   roll option
 * @param o.briefId  the scene brief it belongs to, or null for one made up on the spot
 * @param o.key      what its rolls are tagged with in the Runner: a beat id, a person's topic key, or null
 * @param o.source   how the GM's screen finds the check again: { kind: "beat" | "topic" | "adhoc", ... }
 * @param o.skills   the ways it can be met, as skill slugs (perception and the saves too)
 * @param o.dc       the DC, or null when the check has none
 * @param o.wayDcs   a DC of its own for some ways, { slug: dc }: a way not named here is met at `dc`
 * @param o.blind    rolled blind: a player sees only that they rolled
 * @param o.showDc   the players' windows say the DC
 * @param o.asked    the users it is put to
 */
export function newSession({ id, briefId = null, key = null, source = null, skills = [], dc = null, wayDcs = null, blind = false, showDc = false, asked = [], now = 0 }) {
  const set = slugs(skills);
  const value = isDc(dc) ? clampDc(dc) : null;
  const own = cleanWayDcs(wayDcs);
  return {
    id: String(id),
    briefId: typeof briefId === "string" && briefId ? briefId : null,
    key: typeof key === "string" && key ? key : null,
    source: source && typeof source === "object" ? { ...source } : { kind: "adhoc" },
    skills: set,
    authoredSkills: [...set],
    dc: value,
    authoredDc: value,
    wayDcs: { ...own },
    authoredWayDcs: { ...own },
    blind: blind === true,
    showDc: showDc === true,
    asked: ids(asked),
    rolls: {},
    ring: 0,
    openedAt: Number(now) || 0
  };
}

/**
 * The DC this way is met at: its own if it has one, else the check's. A session from before ways had their own DCs has
 * no `wayDcs` at all, which reads the same as none.
 */
export function dcFor(session, slug = null) {
  const own = slug ? session?.wayDcs?.[slug] : null;
  return Number.isFinite(own) ? own : (session?.dc ?? null);
}

/** Does any way have a DC that differs from the check's? Then the console names each way's DC. */
export function hasWayDcs(session) {
  return (session?.skills ?? []).some((slug) => Number.isFinite(session?.wayDcs?.[slug]) && session.wayDcs[slug] !== session.dc);
}

/**
 * The DC moved along the dial by `delta` (a check with none starts from the standard 15). With a `slug` it is that way's
 * own DC that moves, from where it stands now; without, the check's, which every way without a DC of its own follows.
 */
export function stepDc(session, delta, slug = null) {
  if (!session) return session;
  const by = Math.round(Number(delta) || 0);
  if (slug && SAFE_SLUG.test(String(slug))) {
    const from = dcFor(session, slug);
    return { ...session, wayDcs: { ...(session.wayDcs ?? {}), [slug]: clampDc((Number.isFinite(from) ? from : STANDARD_DC) + by) } };
  }
  const from = Number.isFinite(session.dc) ? session.dc : STANDARD_DC;
  return { ...session, dc: clampDc(from + by) };
}

/** The DC set outright; null takes it back to what the scene wrote. With a `slug`, that way's own DC. */
export function setDc(session, dc, slug = null) {
  if (!session) return session;
  if (slug && SAFE_SLUG.test(String(slug))) {
    const wayDcs = { ...(session.wayDcs ?? {}) };
    const authored = session.authoredWayDcs?.[slug];
    if (dc === null && Number.isFinite(authored)) wayDcs[slug] = authored;
    else if (dc === null) delete wayDcs[slug];
    else wayDcs[slug] = clampDc(dc);
    return { ...session, wayDcs };
  }
  return { ...session, dc: dc === null ? session.authoredDc : clampDc(dc) };
}

/** One way to meet the challenge offered or taken away. The last one cannot be taken away. */
export function toggleSkill(session, slug) {
  if (!session || !SAFE_SLUG.test(String(slug))) return session;
  const has = session.skills.includes(slug);
  if (has && session.skills.length === 1) return session;
  return { ...session, skills: has ? session.skills.filter((s) => s !== slug) : [...session.skills, slug] };
}

/** Someone asked, or no longer asked. A player who has already rolled stays: their roll is part of the record. */
export function toggleAsked(session, userId) {
  if (!session || typeof userId !== "string" || !userId) return session;
  const has = session.asked.includes(userId);
  if (has && session.rolls?.[userId]) return session;
  return { ...session, asked: has ? session.asked.filter((u) => u !== userId) : [...session.asked, userId] };
}

export const setBlind = (session, on) => (session ? { ...session, blind: on === true } : session);
export const setShowDc = (session, on) => (session ? { ...session, showDc: on === true } : session);

/** Put it in front of the players again: a window someone closed opens once more. */
export const ringAgain = (session) => (session ? { ...session, ring: (Number(session.ring) || 0) + 1 } : session);

/**
 * A roll landed (or the GM set a result by hand). Written to the record the way every screen may see it: a blind check
 * keeps only that they rolled and with what. Someone who rolled without being asked is asked now.
 *
 * @param o.userId     who rolled
 * @param o.actorId    as whom
 * @param o.skill      the way they chose
 * @param o.degree     how it came out
 * @param o.total      the number, if there is one
 * @param o.via        "roll" (their own die) or "gm" (set by hand)
 * @param o.messageId  the chat message the roll made, where the GM's screen reads a blind result
 */
export function recordRoll(session, { userId, actorId = null, skill = null, degree = null, total = null, via = "roll", messageId = null, at = 0 } = {}) {
  if (!session || typeof userId !== "string" || !userId) return session;
  const entry = { skill: SAFE_SLUG.test(String(skill)) ? skill : null, via: via === "gm" ? "gm" : "roll", at: Number(at) || 0 };
  if (typeof actorId === "string" && actorId) entry.actorId = actorId;
  if (typeof messageId === "string" && messageId) entry.messageId = messageId;
  if (session.blind) entry.rolled = true;
  else {
    // A check with no DC has no degree: it is in all the same, with its number.
    if (DEGREES.includes(degree)) entry.degree = degree;
    else entry.rolled = true;
    if (Number.isFinite(total)) entry.total = total;
  }
  const asked = session.asked.includes(userId) ? session.asked : [...session.asked, userId];
  return { ...session, asked, rolls: { ...session.rolls, [userId]: entry } };
}

/** A result taken back. */
export function clearRoll(session, userId) {
  if (!session?.rolls?.[userId]) return session;
  const rolls = { ...session.rolls };
  delete rolls[userId];
  return { ...session, rolls };
}

/**
 * What a gem shows: "waiting" (asked, not rolled), "rolled" (a blind roll, on a player's screen; or the GM's while its
 * degree is unknown), or a degree. `known` is the degree the GM's own screen knows for a blind roll.
 */
export function ledState(entry, { gm = false, known = null } = {}) {
  if (!entry) return "waiting";
  if (DEGREES.includes(entry.degree)) return entry.degree;
  if (entry.rolled) return gm && DEGREES.includes(known) ? known : "rolled";
  return "waiting";
}

/** Did this gem light up a moment ago? Then it plays its arrival, once. */
export const isFresh = (entry, now, ms = FRESH_MS) => Boolean(entry?.at) && now - entry.at >= 0 && now - entry.at < ms;

/** Did everyone asked roll? */
export function allIn(session) {
  if (!session?.asked?.length) return false;
  return session.asked.every((u) => session.rolls?.[u]);
}

/** How many of those asked have rolled. */
export const rolledCount = (session) => (session?.asked ?? []).filter((u) => session.rolls?.[u]).length;

/**
 * The degrees as the GM reads them, best first: what each one means (the check's own outcomes) and who it landed on.
 * `rows` are the GM's rows: [{ name, degree }].
 */
export function outcomeRows(outcomes = {}, rows = [], labels = {}) {
  return [...DEGREES].reverse().map((degree) => {
    const who = rows.filter((r) => r.degree === degree).map((r) => r.name);
    return { degree, label: labels[degree] ?? degree, text: outcomes?.[degree] ?? null, who, hit: who.length > 0 };
  });
}

/**
 * The line the log keeps when the GM closes it: what was tried, at what DC, and how each player did.
 * `rows` are [{ name, skillLabel, degreeLabel, total }], in the order they rolled.
 */
export function summaryLine(title, dc, rows = [], wayDcs = []) {
  // A check whose ways have DCs of their own names each; otherwise the one DC.
  const dcWords = wayDcs.length ? wayDcs.map((w) => `${w.label} DC ${w.dc}`).join(", ") : Number.isFinite(dc) ? `DC ${dc}` : "";
  const head = `${title ?? "Check"}${dcWords ? ` (${dcWords})` : ""}`;
  const done = rows.filter((r) => r.degreeLabel);
  if (!done.length) return `${head}: nobody rolled.`;
  const parts = done.map((r) => `${r.name} ${r.degreeLabel}${r.skillLabel ? ` (${r.skillLabel}${Number.isFinite(r.total) ? ` ${r.total}` : ""})` : ""}`);
  return `${head}: ${parts.join(", ")}.`;
}

/* ------------------------------------------------------------------ */
/*  How hard a DC is (2026-10-05, D062)                                */
/* ------------------------------------------------------------------ */

/**
 * SF2E's DC by level (GM Core, Difficulty Classes; reference/tables/dc-and-check-math.json, dcTables.dcByLevel, which
 * test/tier1-check-console.test.mjs holds this to). The standard DC for a task of the party's own level.
 */
export const LEVEL_DC = Object.freeze({
  0: 14, 1: 15, 2: 16, 3: 18, 4: 19, 5: 20, 6: 22, 7: 23, 8: 24, 9: 26, 10: 27, 11: 28, 12: 30,
  13: 31, 14: 32, 15: 34, 16: 35, 17: 36, 18: 38, 19: 39, 20: 40, 21: 42, 22: 44, 23: 46, 24: 48, 25: 50
});

/** GM Core's difficulty adjustments, easiest first (dcTables.difficultyAdjustments). */
export const DIFFICULTIES = Object.freeze([
  { key: "incrediblyEasy", delta: -10 },
  { key: "veryEasy", delta: -5 },
  { key: "easy", delta: -2 },
  { key: "standard", delta: 0 },
  { key: "hard", delta: 2 },
  { key: "veryHard", delta: 5 },
  { key: "incrediblyHard", delta: 10 }
]);

/** The standard DC for a party of this level (0 to 25; anything else is clamped, and nonsense reads as level 1). */
export function levelDc(level) {
  const n = Number(level);
  const l = Number.isFinite(n) ? Math.min(25, Math.max(0, Math.round(n))) : 1;
  return LEVEL_DC[l];
}

/**
 * How hard a DC is for a party of this level: the difficulty step nearest to how far it sits from the level's
 * standard DC (a DC between two steps reads as the nearer; one exactly between reads as the one nearer standard).
 */
export function difficultyOf(dc, level = 1) {
  const base = levelDc(level);
  if (!Number.isFinite(dc)) return { key: null, delta: null, base };
  const delta = Math.round(dc) - base;
  let best = DIFFICULTIES[3];
  for (const step of DIFFICULTIES) {
    const nearer = Math.abs(delta - step.delta) < Math.abs(delta - best.delta);
    const tieTowardStandard = Math.abs(delta - step.delta) === Math.abs(delta - best.delta) && Math.abs(step.delta) < Math.abs(best.delta);
    if (nearer || tieTowardStandard) best = step;
  }
  return { key: best.key, delta, base };
}

/**
 * The dial's printed difficulty bands for a party of this level: each step's run of DCs, from the dial's lowest to its
 * highest, end to end. `from`/`to` are the first and last DC in the band.
 */
export function difficultyBands(level = 1) {
  const bands = [];
  for (let v = DC_RANGE.min; v <= DC_RANGE.max; v++) {
    const { key } = difficultyOf(v, level);
    const last = bands[bands.length - 1];
    if (last?.key === key) last.to = v;
    else bands.push({ key, from: v, to: v });
  }
  return bands;
}

/* ------------------------------------------------------------------ */
/*  Results, per way and per degree (2026-10-05, D062)                 */
/* ------------------------------------------------------------------ */

/**
 * Does this check say anything of its own for any way (`bySkill`)? Then the console's Results lead with the ways.
 * A way's entry is either its own result for each degree ({ criticalSuccess, success, failure, criticalFailure }, any
 * of them), or, written before that, one line that holds for every degree.
 */
export function hasWayResults(check) {
  return Object.values(check?.bySkill ?? {}).some((v) => said(v) || saysPerDegree(v));
}

/** Does any way carry its own result for a degree (not only a one-line note)? Then a degree a way has no result of its
 * own for is worth saying is the same for every way. */
export function hasPerDegreeWays(check) {
  return Object.values(check?.bySkill ?? {}).some(saysPerDegree);
}

const said = (text) => typeof text === "string" && text.trim().length > 0;
const saysPerDegree = (way) => Boolean(way) && typeof way === "object" && Object.values(way).some(said);

/**
 * What a check gives someone who met it this way at this degree: the way's own result when the check has one, else
 * the check's result for that degree (`own` says which). A way's one-line note comes back as `note`.
 */
export function resultFor(check, skill, degree) {
  const way = check?.bySkill?.[skill];
  const perDegree = way && typeof way === "object" ? way : null;
  const own = typeof perDegree?.[degree] === "string" && perDegree[degree].trim() ? perDegree[degree] : null;
  return {
    text: own ?? check?.outcomes?.[degree] ?? null,
    own: Boolean(own),
    note: typeof way === "string" && way.trim() ? way : null
  };
}

/* ------------------------------------------------------------------ */
/*  The bank of lights                                                 */
/* ------------------------------------------------------------------ */

/** How many lights the bank has: one per player at a table of six. */
export const BANK_SIZE = 6;

/** The bank's slots, in order: the first six people given, then empty slots to fill the row. */
export function bankSlots(people = [], size = BANK_SIZE) {
  const filled = people.slice(0, size);
  return [...filled, ...Array.from({ length: Math.max(0, size - filled.length) }, () => null)];
}

/* ------------------------------------------------------------------ */
/*  Roll options                                                       */
/* ------------------------------------------------------------------ */

export const CHECK_OPTION_PREFIX = "bi-check:";
export const WAY_OPTION_PREFIX = "bi-way:";

/** The roll options a roll made for this console carries, so the GM's client knows which check and which way. */
export function consoleRollOptions(sessionId, skill) {
  const out = [];
  if (/^[a-z0-9]+$/.test(String(sessionId))) out.push(`${CHECK_OPTION_PREFIX}${sessionId}`);
  if (SAFE_SLUG.test(String(skill))) out.push(`${WAY_OPTION_PREFIX}${skill}`);
  return out;
}

/** The console and the way a roll's options name, or null. */
export function consoleTagFrom(options = []) {
  if (!Array.isArray(options)) return null;
  let sessionId = null;
  let skill = null;
  for (const option of options) {
    if (typeof option !== "string") continue;
    if (option.startsWith(CHECK_OPTION_PREFIX)) {
      const id = option.slice(CHECK_OPTION_PREFIX.length);
      if (/^[a-z0-9]+$/.test(id)) sessionId = id;
    } else if (option.startsWith(WAY_OPTION_PREFIX)) {
      const slug = option.slice(WAY_OPTION_PREFIX.length);
      if (SAFE_SLUG.test(slug)) skill = slug;
    }
  }
  return sessionId ? { sessionId, skill } : null;
}

/* ------------------------------------------------------------------ */
/*  The DC dial                                                        */
/* ------------------------------------------------------------------ */

const round = (n) => Math.round(n * 100) / 100;
const point = (deg, radius, size = 100) => {
  const rad = (deg * Math.PI) / 180;
  return { x: round(size / 2 + radius * Math.sin(rad)), y: round(size / 2 - radius * Math.cos(rad)) };
};

/** The angle a DC sits at on the dial, from straight up, clockwise. */
export const dcAngle = (dc) => -SWEEP / 2 + ((clampDc(dc) - DC_RANGE.min) / (DC_RANGE.max - DC_RANGE.min)) * SWEEP;

/**
 * The DC dial's face, for an SVG of viewBox 0 0 100 100 around the knob (the north star's knob with a printed scale,
 * design/visual-identity.md): the knob's filmstrip frame, a tick for every DC (a longer one every five, numbered) and the
 * tick of the DC set now lit.
 */
export function dcDial(dc, { inner = 33, outer = 37, major = 40, label = 46 } = {}) {
  const value = Number.isFinite(dc) ? clampDc(dc) : null;
  const ticks = [];
  const numerals = [];
  for (let v = DC_RANGE.min; v <= DC_RANGE.max; v++) {
    const deg = dcAngle(v);
    const isMajor = v % 5 === 0;
    const a = point(deg, inner);
    const b = point(deg, isMajor ? major : outer);
    ticks.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major: isMajor, active: v === value });
    if (isMajor) {
      const n = point(deg, label);
      numerals.push({ x: n.x, y: n.y, text: String(v), active: v === value });
    }
  }
  const frame = value === null ? Math.round((FRAMES - 1) / 2) : Math.round(((value - DC_RANGE.min) / (DC_RANGE.max - DC_RANGE.min)) * (FRAMES - 1));
  return { value, frame, ticks, numerals };
}

/**
 * The difficulty bands printed round the dial for a party of this level, as SVG arcs (viewBox 0 0 100 100) at
 * `radius`, each running half a step past its first and last DC so the bands meet; and the notch where the level's
 * standard DC sits.
 */
export function dcBandArcs(level = 1, radius = 29.5) {
  const half = SWEEP / (DC_RANGE.max - DC_RANGE.min) / 2;
  const arcs = difficultyBands(level).map((band) => {
    const from = Math.max(-SWEEP / 2, dcAngle(band.from) - half);
    const to = Math.min(SWEEP / 2, dcAngle(band.to) + half);
    const a = point(from, radius);
    const b = point(to, radius);
    const large = to - from >= 180 ? 1 : 0;
    return { key: band.key, from: band.from, to: band.to, d: `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}` };
  });
  const base = levelDc(level);
  const notch = base >= DC_RANGE.min && base <= DC_RANGE.max ? (() => {
    const deg = dcAngle(base);
    const a = point(deg, radius - 3.2);
    const b = point(deg, radius + 3.2);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, dc: base };
  })() : null;
  return { arcs, notch };
}
