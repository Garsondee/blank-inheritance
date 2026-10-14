/**
 * The playtest's dice tooling, pure. (design/playtest-process.md, "dice and other tooling")
 *
 * Why a run wants it. The process asks that every check be seen at a success and a failure, every choice both ways, the refusal once.
 * Left to luck that takes dozens of rolls per check. So the rig can (1) seed the dice, so a run is reproducible from its seed;
 * (2) force the next d20 of a seat to a chosen degree of success (or an exact face) so coverage does not depend on luck; and
 * (3) keep a tape of every roll (natural, modifier, total, degree, whether it was forced) for the report. Forced rolls are always
 * marked as forced: the dice are the one part of the system under test the rig is allowed to bend, and it must never do so silently.
 *
 * The degree rule is the system's own, copied from sf2e's DegreeOfSuccess (gamesystems/sf2e/sf2e.mjs): total minus DC of 10 or more
 * is a critical success, DC minus total of 10 or more a critical failure, total at or above the DC a success, else a failure; then
 * a natural 20 raises the result one step and a natural 1 lowers it one, never past either end. test/playtest/dice.test.mjs holds it
 * to that table. Foundry's mapping of a uniform draw to a face is `Math.ceil((1 - r) * faces)` (client/dice/terms/dice.mjs).
 *
 * No imports and no Foundry: browser/dice-governor.mjs embeds this file's source into the page, so the page and the tests run the
 * same functions.
 */

export const DEGREES = ["criticalFailure", "failure", "success", "criticalSuccess"];

/** Names an operator might type, mapped to a degree index (0 critical failure .. 3 critical success). */
const DEGREE_WORDS = new Map([
  ["0", 0], ["cf", 0], ["critfail", 0], ["critical-failure", 0], ["criticalfailure", 0], ["critical failure", 0], ["crit-fail", 0], ["crit fail", 0], ["critical-fail", 0],
  ["1", 1], ["f", 1], ["fail", 1], ["failure", 1],
  ["2", 2], ["s", 2], ["success", 2], ["succeed", 2], ["pass", 2],
  ["3", 3], ["cs", 3], ["critsuccess", 3], ["critical-success", 3], ["criticalsuccess", 3], ["critical success", 3], ["crit-success", 3], ["crit success", 3], ["crit", 3]
]);

/** "failure", "crit-success", "cs", 2 ... -> 0..3, or null. */
export function parseDegree(input) {
  if (typeof input === "number" && Number.isInteger(input) && input >= 0 && input <= 3) return input;
  if (typeof input !== "string") return null;
  const key = input.trim().toLowerCase().replace(/_/g, "-");
  return DEGREE_WORDS.has(key) ? DEGREE_WORDS.get(key) : null;
}

/** The degree (0..3) a natural d20 roll gives against a DC, with a natural 20 or 1 moving it one step. sf2e's own rule. */
export function degreeOf(natural, modifier, dc) {
  const total = natural + modifier;
  let degree;
  if (total - dc >= 10) degree = 3;
  else if (dc - total >= 10) degree = 0;
  else if (total >= dc) degree = 2;
  else degree = 1;
  if (natural === 20) degree = Math.min(3, degree + 1);
  else if (natural === 1) degree = Math.max(0, degree - 1);
  return degree;
}

/** Every natural face (1..20) that gives `target` against this modifier and DC. Empty when the degree is out of reach. */
export function naturalsFor(target, modifier, dc, faces = 20) {
  const out = [];
  for (let face = 1; face <= faces; face++) if (degreeOf(face, modifier, dc) === target) out.push(face);
  return out;
}

/**
 * Choose one natural for a target degree. By default it avoids a natural 1 or 20 when another face does the job, because an extreme
 * face also triggers the system's own reactions (a natural 20 is celebrated in the log and cards) and a forced result should look
 * like an ordinary one; `prefer` can ask for "extreme" (to exercise exactly those reactions), "low" or "high" within the candidates.
 *
 * @returns {number|null} the face, or null when the degree cannot be reached
 */
export function pickNatural(target, modifier, dc, { prefer = "plain", rng = Math.random } = {}) {
  const candidates = naturalsFor(target, modifier, dc);
  if (!candidates.length) return null;
  const plain = candidates.filter((n) => n !== 1 && n !== 20);
  const pool = prefer === "extreme" ? (candidates.filter((n) => n === 1 || n === 20).length ? candidates.filter((n) => n === 1 || n === 20) : candidates) : plain.length ? plain : candidates;
  if (prefer === "low") return pool[0];
  if (prefer === "high") return pool[pool.length - 1];
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

/** The uniform draw r in [0, 1) that Foundry maps to `face`: ceil((1 - r) * faces) === face. The middle of the face's interval. */
export function faceToUniform(face, faces = 20) {
  return 1 - (face - 0.5) / faces;
}

/** Foundry's own mapping, here so the test can hold faceToUniform to it. */
export function uniformToFace(r, faces = 20) {
  return Math.ceil((1 - r) * faces);
}

/** A small, fast, seedable generator (mulberry32). Same seed, same sequence, in the page and in the tests. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit seed from any string (FNV-1a), so "run-7:P3" is a seed. */
export function hashSeed(text) {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Normalise one plan entry. An entry says "the next time <seat> rolls a d20 [in this scene] [for this check], make it <degree> /
 * <this face>", `count` times. `seat` "*" means any seat. Returns { ok, entry } or { ok:false, error }.
 */
export function normalizePlanEntry(spec) {
  const degree = spec.degree === undefined || spec.degree === null ? null : parseDegree(spec.degree);
  if (spec.degree !== undefined && spec.degree !== null && degree === null) return { ok: false, error: `unknown degree ${JSON.stringify(spec.degree)}` };
  const natural = spec.natural === undefined || spec.natural === null ? null : Number(spec.natural);
  if (natural !== null && !(Number.isInteger(natural) && natural >= 1 && natural <= 20)) return { ok: false, error: `a natural must be a whole number 1 to 20, got ${JSON.stringify(spec.natural)}` };
  if (degree === null && natural === null) return { ok: false, error: "give a degree or a natural" };
  const dc = spec.dc === undefined || spec.dc === null ? null : Number(spec.dc);
  if (dc !== null && !Number.isFinite(dc)) return { ok: false, error: `dc must be a number, got ${JSON.stringify(spec.dc)}` };
  const count = spec.count === undefined ? 1 : Number(spec.count);
  if (!(Number.isInteger(count) && count >= 1 && count <= 100)) return { ok: false, error: "count must be a whole number 1 to 100" };
  return {
    ok: true,
    entry: {
      seat: spec.seat ?? "*",
      degree,
      natural,
      dc,
      count,
      scene: spec.scene ?? null,
      check: spec.check ?? null,
      prefer: spec.prefer ?? "plain",
      note: spec.note ?? ""
    }
  };
}

/** The first plan entry that applies to this roll, or -1. A seat-specific entry beats "*" at the same position. */
export function findPlanEntry(plan, ctx) {
  const applies = (e) => (e.seat === "*" || e.seat === ctx.seat) && (!e.scene || e.scene === ctx.scene) && (!e.check || e.check === ctx.check);
  let wildcard = -1;
  for (let i = 0; i < plan.length; i++) {
    if (!applies(plan[i])) continue;
    if (plan[i].seat === ctx.seat) return i;
    if (wildcard < 0) wildcard = i;
  }
  return wildcard;
}

/**
 * Decide the face for a roll under a plan entry. `modifier` and `dc` come from the roll and the check; the entry's own dc wins.
 * @returns {{face:number|null, degree:number|null, reason:string}}
 */
export function decideFace(entry, { modifier, dc, rng = Math.random }) {
  const useDc = entry.dc ?? dc;
  const known = (v) => v !== null && v !== undefined && Number.isFinite(v);
  if (entry.natural !== null) {
    return { face: entry.natural, degree: known(useDc) && known(modifier) ? degreeOf(entry.natural, modifier, useDc) : null, reason: "exact face" };
  }
  if (!known(modifier)) return { face: null, degree: null, reason: "the roll has terms the oracle cannot add up (more dice, or brackets); arm an exact natural instead" };
  if (!known(useDc)) return { face: null, degree: null, reason: "no DC known for this roll (arm it with a dc)" };
  const face = pickNatural(entry.degree, modifier, useDc, { prefer: entry.prefer, rng });
  if (face === null) return { face: null, degree: null, reason: `${DEGREES[entry.degree]} is out of reach at modifier ${modifier} against DC ${useDc}` };
  return { face, degree: entry.degree, reason: "degree" };
}

/** Counts and spread of a tape, for the report. */
export function summarizeTape(tape) {
  const rolls = tape.filter((e) => Number.isInteger(e.natural));
  const byDegree = { criticalFailure: 0, failure: 0, success: 0, criticalSuccess: 0, unknown: 0 };
  let forced = 0;
  let sum = 0;
  let nat1 = 0;
  let nat20 = 0;
  for (const r of rolls) {
    byDegree[r.degree === null || r.degree === undefined ? "unknown" : DEGREES[r.degree]]++;
    if (r.forced) forced++;
    sum += r.natural;
    if (r.natural === 1) nat1++;
    if (r.natural === 20) nat20++;
  }
  return { rolls: rolls.length, forced, natural: rolls.length - forced, byDegree, meanNatural: rolls.length ? Math.round((sum / rolls.length) * 100) / 100 : null, nat1, nat20 };
}
