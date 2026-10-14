/**
 * The roster: who sits where in a run, with what kind of brain and what kind of screen. Pure.
 * (design/playtest-process.md, sections 3 and 9: the cast, and the knobs.)
 *
 * A SEAT is always a real browser logged in as a real Foundry user; that is what keeps the table full-sized and the multi-client
 * behaviour real. What differs is the BRAIN behind the seat:
 *   agent  an LLM agent driving the seat through the `pt` verbs (judgement, confusion, improvisation: the expensive part)
 *   bot    a script driving the seat through the same real clicks (routine behaviour, no judgement, no cost)
 *   idle   logged in and doing nothing (a quiet player; also what a seat is before its brain starts)
 *   walker the GM seat only: a script that runs a whole episode through the Scene Runner's buttons (bots/gm-walker.mjs), for the
 *          episode confidence run's cheap pass over every scene (design/playtest-process.md section 13)
 * Ingram, 2026-10-06: "we don't need an agent for every player and for every scene". So the knobs are per seat and per run, and the
 * recommended table ("main") gives agents only to the seats whose personas need judgement, bots to the rest.
 */

export const ROLES = ["gm", "player"];
export const BRAINS = ["agent", "bot", "idle", "walker"];
export const BOTS = ["player"];
/** Foundry's own stated floor (design/induction-terminal.md section 8): below it "some features will not work properly". */
export const MIN_VIEWPORT = [1024, 768];

export const PROFILE_DEFAULTS = Object.freeze({ viewport: [1920, 1080], scale: 1, reducedMotion: false, keyboardOnly: false, network: null, perf: "normal" });

/** A seat's profile: persona and per-seat overrides laid over the defaults. */
export function profileFor(personaProfile = {}, override = {}) {
  return { ...PROFILE_DEFAULTS, ...personaProfile, ...override };
}

/**
 * Check a roster. Returns every problem at once rather than the first.
 * @returns {{ok:boolean, errors:string[], warnings:string[]}}
 */
export function validateRoster(roster, { personas = {} } = {}) {
  const errors = [];
  const warnings = [];
  if (!roster || typeof roster !== "object") return { ok: false, errors: ["the roster is not an object"], warnings };
  if (!roster.run || typeof roster.run !== "string") errors.push("the roster needs a run name");
  const seats = Array.isArray(roster.seats) ? roster.seats : [];
  if (!seats.length) errors.push("the roster has no seats");
  const names = new Set();
  const users = new Set();
  let gms = 0;
  for (const s of seats) {
    const where = s.seat ?? "(unnamed seat)";
    if (!s.seat || !/^[A-Z][A-Z0-9]*$/.test(s.seat)) errors.push(`${where}: a seat id is capital letters and digits (GM, P1)`);
    if (names.has(s.seat)) errors.push(`${where}: duplicate seat`);
    names.add(s.seat);
    if (!s.user) errors.push(`${where}: no Foundry user`);
    if (users.has(s.user)) errors.push(`${where}: user ${s.user} is on another seat; a second login would bump the first off`);
    users.add(s.user);
    if (!ROLES.includes(s.role)) errors.push(`${where}: role must be ${ROLES.join(" or ")}`);
    if (s.role === "gm") gms++;
    if (!BRAINS.includes(s.brain)) errors.push(`${where}: brain must be one of ${BRAINS.join(", ")}`);
    if (s.brain === "bot" && !BOTS.includes(s.bot)) errors.push(`${where}: a bot seat names its bot (${BOTS.join(", ")})`);
    if (s.brain === "walker" && s.role !== "gm") errors.push(`${where}: only the GM seat can be a walker (it runs the Scene Runner)`);
    if (s.persona && !personas[s.persona] && s.persona !== "gm") errors.push(`${where}: unknown persona ${s.persona}`);
    const p = s.profile ?? PROFILE_DEFAULTS;
    const [w, h] = p.viewport ?? [];
    if (!(w > 0 && h > 0)) errors.push(`${where}: the viewport needs a width and a height`);
    else if (w < MIN_VIEWPORT[0] || h < MIN_VIEWPORT[1]) warnings.push(`${where}: ${w}x${h} is below Foundry's ${MIN_VIEWPORT.join("x")} floor; expect warnings that are not the game's`);
    if (p.scale !== undefined && !(p.scale >= 0.5 && p.scale <= 3)) errors.push(`${where}: scale must be between 0.5 and 3`);
    if (p.keyboardOnly && s.brain === "bot") warnings.push(`${where}: a keyboard-only seat run by a bot still clicks; give it an agent to test keyboard reach`);
  }
  if (gms !== 1) errors.push(`a run has exactly one GM seat (this one has ${gms})`);
  return { ok: errors.length === 0, errors, warnings };
}

/** How many of each brain, for the control room and the cost line. */
export function brainCounts(roster) {
  const counts = { agent: 0, bot: 0, idle: 0, walker: 0 };
  for (const s of roster.seats) counts[s.brain]++;
  return counts;
}

/**
 * A roster from the persona file.
 *   shakedown  everyone logged in (so the rig's load is measured at full size); agents for the GM and two players, bots for the rest
 *   main       the recommended table: agents for the GM and two players (brute, chaos-agent), bots for the rest. Ingram, 2026-10-06:
 *              keyboard-only play is not a requirement (Foundry needs a mouse), so the lateral thinker no longer needs an agent for it
 *   full       an agent in every seat (the most expensive table, for a scene that needs the whole table thinking)
 *   bots       agents nowhere: every seat scripted (the cheapest, for load and UI-path coverage)
 *   walk       agents nowhere, and the GM is the walker: the whole episode run by scripts, every scene, beat, check and choice
 */
export function buildRoster(kind, personas, { run, seed = run } = {}) {
  const AGENT_PLAYERS = { shakedown: ["brute", "chaos-agent"], main: ["brute", "chaos-agent"], full: ["caster", "brute", "rules-lawyer", "lateral-thinker", "quiet-one", "chaos-agent"], bots: [], walk: [] };
  if (!(kind in AGENT_PLAYERS)) throw new Error(`unknown roster kind ${JSON.stringify(kind)} (${Object.keys(AGENT_PLAYERS).join(", ")})`);
  const order = ["caster", "brute", "rules-lawyer", "lateral-thinker", "quiet-one", "chaos-agent"];
  const seats = [];
  const gm = personas.gm;
  const gmBrain = kind === "bots" ? "idle" : kind === "walk" ? "walker" : "agent";
  // A seat nobody is watching through its picture does not need ten times the frames: bots and idle seats run lean (profile.perf).
  seats.push({ seat: gm.seat, user: gm.user, role: "gm", persona: "gm", brain: gmBrain, profile: profileFor(gm.profile, gmBrain === "agent" ? {} : { perf: "lean" }) });
  for (const id of order) {
    const p = personas[id];
    const agent = AGENT_PLAYERS[kind].includes(id);
    seats.push({ seat: p.seat, user: p.user, role: "player", persona: id, brain: agent ? "agent" : "bot", ...(agent ? {} : { bot: "player" }), profile: profileFor(p.profile, agent ? {} : { perf: "lean" }) });
  }
  return { run, seed, kind, seats };
}
