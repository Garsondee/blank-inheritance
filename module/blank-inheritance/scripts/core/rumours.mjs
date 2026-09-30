/**
 * The rumour mill (canon/decisions/D051.md, points 3 and 4).
 *
 * Ingram, 2026-09-29: "Each Episode we generate three sets of rumours ...
 * Players roll blind on a skill, any skill they like if they can justify it,
 * on a Crit Fail they get three pieces of wrong information, on a fail they
 * get two pieces of wrong information and one piece of truth, success is two
 * pieces of correct information and one lie and crit success is three pieces
 * of correct information ... perhaps only one answer per round should even
 * attempt to reveal (or mislead) about something important to the actual
 * plot."
 *
 * A set holds true rumours and lies. A deal takes the count each degree
 * gives, prefers statements this set has not dealt yet (so the next player
 * hears something new while there is something new), and shuffles them, so
 * where a truth sits in the three tells the player nothing.
 */

export const RUMOUR_DEGREES = Object.freeze({
  criticalFailure: Object.freeze({ truths: 0, lies: 3 }),
  failure: Object.freeze({ truths: 1, lies: 2 }),
  success: Object.freeze({ truths: 2, lies: 1 }),
  criticalSuccess: Object.freeze({ truths: 3, lies: 0 })
});

const statement = (raw, isTrue, setId, i) => {
  if (!raw) return null;
  const text = typeof raw === "string" ? raw : typeof raw.text === "string" ? raw.text : null;
  if (!text) return null;
  return {
    key: `${setId}:${isTrue ? "t" : "l"}${i}`,
    text,
    isTrue,
    plot: raw.plot === true,
    hint: typeof raw.hint === "string" ? raw.hint : null,
    fact: typeof raw.fact === "string" ? raw.fact : null
  };
};

/** A brief's rumour sets, made safe. */
export function normalizeRumourSets(rumours = []) {
  return (Array.isArray(rumours) ? rumours : [])
    .filter((r) => r && typeof r.id === "string" && Number.isInteger(r.set))
    .map((r) => ({
      id: r.id,
      episode: typeof r.episode === "string" ? r.episode : null,
      set: r.set,
      truths: (r.truths ?? []).map((t, i) => statement(t, true, r.id, i)).filter(Boolean),
      lies: (r.lies ?? []).map((l, i) => statement(l, false, r.id, i)).filter(Boolean)
    }));
}

/** The sets for one episode, in set order. */
export function setsFor(rumours, episodeId) {
  return normalizeRumourSets(rumours)
    .filter((r) => !episodeId || !r.episode || r.episode === episodeId)
    .sort((a, b) => a.set - b.set);
}

/** Everything wrong with a set: too few to deal from, or more than one touching the plot. */
export function rumourSetProblems(set) {
  const problems = [];
  if (set.truths.length < 3) problems.push(`${set.id} has ${set.truths.length} true rumours; a critical success deals three`);
  if (set.lies.length < 3) problems.push(`${set.id} has ${set.lies.length} lies; a critical failure deals three`);
  const plot = [...set.truths, ...set.lies].filter((s) => s.plot).length;
  if (plot > 1) problems.push(`${set.id} has ${plot} rumours touching the plot; at most one`);
  return problems;
}

function pick(list, count, used, random) {
  const fresh = list.filter((s) => !used.has(s.key));
  const stale = list.filter((s) => used.has(s.key));
  const out = [];
  for (const pool of [fresh, stale]) {
    const bag = [...pool];
    while (out.length < count && bag.length) out.push(bag.splice(Math.floor(random() * bag.length), 1)[0]);
  }
  return out;
}

/**
 * Deal one player's rumours for a degree of success. Returns the three
 * statements (each marked true or false, for the GM) and the keys now used.
 */
export function dealRumours(set, degree, { used = [], random = Math.random } = {}) {
  const want = RUMOUR_DEGREES[degree];
  if (!set || !want) return { statements: [], used: [...used] };
  const seen = new Set(used);
  const chosen = [...pick(set.truths, want.truths, seen, random), ...pick(set.lies, want.lies, seen, random)];
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return { statements: chosen, used: [...new Set([...used, ...chosen.map((s) => s.key)])] };
}
