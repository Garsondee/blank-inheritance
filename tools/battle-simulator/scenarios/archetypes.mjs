/**
 * TACTICAL ARCHETYPE BATTERY (design doc §17) — five encounter SHAPES, each chosen because SF2E
 * play wisdom gives it a known correct answer, and each therefore able to detect a specific,
 * named AI malfunction.
 *
 * The point is not that these are good encounters to run at a table. It is that each one isolates
 * a different tactical competence, so a failure tells you WHICH competence is missing:
 *
 *   swarm            → focus fire.        Malfunction detected: damage spreading.
 *   soloBoss         → MAP discipline.    Malfunction detected: swinging three times at a wall.
 *   mixedLevels      → threat priority.   Malfunction detected: proximity bias / target fixation.
 *   mirror           → symmetry.          Malfunction detected: positional or initiative bias.
 *   rangeAsymmetry   → the closing gradient, in both directions at once.
 *                                          Malfunction detected: passive melee, or suicidal ranged.
 *
 * DELIBERATELY NO WALLS in any archetype. Terrain is already covered by the stress-test mission
 * and its own tests; including it here would (a) multiply runtime by ~1000x, since the wall-aware
 * path runs real Dijkstra where the open-field path runs straight-line arithmetic, and (b) confound
 * "did it choose well" with "did it path well". One variable at a time.
 *
 * Every builder accepts an `ai` override so the SAME scenario can be run with the real decide()
 * or with any of ai/baselines.mjs's naive policies — that substitution is the entire basis of the
 * head-to-head comparison, and it only works because the scenarios never hardcode a policy.
 */
import { decide } from "../ai/decide.mjs";
import { makeReferenceFrame, makeMysticFrame, makeHod, makeVesper } from "../data/combatants.mjs";
import { makeSwarmUnit, makeSoloBoss, makeArtillery, makeChaff, makeMirrorUnit, makeSkirmisher, makeBrawler } from "../data/archetype-fixtures.mjs";

const GRID = { cols: 44, rows: 44 };

/**
 * "Few complete misplays, but not no misplays" — Ingram's explicit direction for how optimally
 * both sides should be assumed to play. 0.88 on decide()'s existing softmax competence knob:
 * near-optimal, with occasional non-best choices, rather than a perfect-information machine.
 */
export const COMPETENCE = 0.88;

/** Default policy: the real AI, for every side. Overridable per-scenario for baseline comparison. */
function realAI(state, combatantId, turn) {
  return decide(state, combatantId, turn, { competence: COMPETENCE });
}

/**
 * Build the per-combatant policy dispatcher. `partyAI`/`oppositionAI` each default to the real AI,
 * so a head-to-head run only has to override the one side under test.
 */
function makeDispatcher({ partyAI = realAI, oppositionAI = realAI } = {}) {
  return function ai(state, combatantId, turn) {
    const combatant = state.combatants.get(combatantId);
    return combatant.side === "party" ? partyAI(state, combatantId, turn) : oppositionAI(state, combatantId, turn);
  };
}

/** The standard 4-unit party used by every archetype except the mirror, so results are comparable across shapes. */
function standardParty() {
  return [
    makeReferenceFrame({ position: { col: 8, row: 20 } }),
    makeMysticFrame({ position: { col: 8, row: 24 } }),
    makeHod({ position: { col: 6, row: 22 } }),
    makeVesper({ position: { col: 6, row: 18 } })
  ];
}

/**
 * SWARM — 8 x level-8 lackeys (10 XP each = 80 XP, moderate at the 4-PC baseline).
 *
 * WHAT CORRECT PLAY LOOKS LIKE: concentrate. Every lackey killed is a whole enemy turn removed
 * from every subsequent round, so damage spread across eight healthy targets is strictly worse
 * than the same damage spent killing them one at a time. SF2E's action economy makes this one of
 * the least ambiguous pieces of tactical wisdom there is.
 *
 * WHAT MALFUNCTION LOOKS LIKE: a high mid-turn target-switch rate (focusFireStats), and a battle
 * where enemy count stays flat for many rounds and then collapses all at once.
 */
export function buildSwarm({ seed = 4001, roundLimit = 10, partyAI, oppositionAI } = {}) {
  const swarm = [];
  for (let i = 0; i < 8; i++) {
    swarm.push(makeSwarmUnit({
      id: `swarm-${i + 1}`,
      name: `TEST FIXTURE — Swarm Lackey ${i + 1}`,
      position: { col: 30 + (i % 2), row: 14 + i }
    }));
  }
  return {
    seed, gridSize: GRID, roundLimit,
    combatants: [...standardParty(), ...swarm],
    ai: makeDispatcher({ partyAI, oppositionAI }),
    scriptedEvents: {}
  };
}

/**
 * SOLO BOSS — 1 x level-16 boss (160 XP, extreme).
 *
 * WHAT CORRECT PLAY LOOKS LIKE: against AC 38, a Frame's +25 first attack hits on 13+ (40%), its
 * second at -5 on 18+ (15%), its third at -10 only on a natural 20 (5%). The third action is worth
 * more spent on almost anything else. Note this is genuinely a JUDGEMENT call, not a rule — if
 * literally nothing else is available, swinging at 5% is still correct — which is why the test
 * reads this as a *comparison against the swarm scenario* rather than an absolute threshold.
 *
 * WHAT MALFUNCTION LOOKS LIKE: identical third-attack share regardless of target AC, i.e. an AI
 * that has no idea the multiple attack penalty exists.
 */
export function buildSoloBoss({ seed = 4002, roundLimit = 12, partyAI, oppositionAI } = {}) {
  return {
    seed, gridSize: GRID, roundLimit,
    combatants: [...standardParty(), makeSoloBoss({ position: { col: 28, row: 21 } })],
    ai: makeDispatcher({ partyAI, oppositionAI }),
    scriptedEvents: {}
  };
}

/**
 * MIXED LEVELS — 1 x level-14 artillery (80 XP) + 4 x level-9 chaff (15 each = 60 XP) = 140 XP,
 * between severe (120) and extreme (160).
 *
 * WHAT CORRECT PLAY LOOKS LIKE: kill the artillery. It deals ~38 per hit at 1500ft range; the
 * chaff screening it deal ~13 at 100ft. The chaff are nearer, tougher, and almost harmless. This
 * is the textbook "the dangerous one is not the close one" problem.
 *
 * WHAT MALFUNCTION LOOKS LIKE: threatAttackCorrelation at or below zero — attacks distributed by
 * proximity rather than danger. The `nearest` baseline should fail this badly by construction,
 * which is what makes the metric trustworthy when the real AI passes it.
 */
export function buildMixedLevels({ seed = 4003, roundLimit = 12, partyAI, oppositionAI } = {}) {
  const chaff = [];
  for (let i = 0; i < 4; i++) {
    chaff.push(makeChaff({ id: `chaff-${i + 1}`, name: `TEST FIXTURE — Chaff Escort ${i + 1}`, position: { col: 18 + (i % 2), row: 19 + i } }));
  }
  return {
    seed, gridSize: GRID, roundLimit,
    // Artillery sits far behind its screen — reachable, but only past the chaff.
    combatants: [...standardParty(), makeArtillery({ position: { col: 34, row: 21 } }), ...chaff],
    ai: makeDispatcher({ partyAI, oppositionAI }),
    scriptedEvents: {}
  };
}

/**
 * MIRROR — three identical units per side, mirrored across the map's vertical centre line.
 *
 * WHY THIS IS THE MOST ELEGANT TEST IN THE BATTERY: it needs no theory of correct play at all. The
 * situation is symmetric by construction, so across many seeds the win rate MUST approach 50/50.
 * Any reliable deviation is proof of a bias that no amount of reading transcripts would reveal —
 * a positional term that favours one facing, an initiative tie-break that always resolves the same
 * way, an evaluator that is subtly better at attacking than defending. It converts "does this feel
 * fair?" into a falsifiable statistical claim.
 *
 * Initiative modifiers are deliberately left IDENTICAL rather than jittered: if turn order is
 * decisive and ties resolve consistently, that is exactly the bias worth exposing.
 */
export function buildMirror({ seed = 4004, roundLimit = 12, partyAI, oppositionAI } = {}) {
  const combatants = [];
  for (let i = 0; i < 3; i++) {
    combatants.push(makeMirrorUnit({ id: `mirror-party-${i + 1}`, name: `Mirror Party ${i + 1}`, side: "party", position: { col: 14, row: 19 + i * 2 } }));
    combatants.push(makeMirrorUnit({ id: `mirror-opp-${i + 1}`, name: `Mirror Opposition ${i + 1}`, side: "opposition", position: { col: 30, row: 19 + i * 2 } }));
  }
  return { seed, gridSize: GRID, roundLimit, combatants, ai: makeDispatcher({ partyAI, oppositionAI }), scriptedEvents: {} };
}

/**
 * RANGE ASYMMETRY — 2 melee-only brawlers (party) vs 2 ranged-only skirmishers (opposition),
 * starting far apart.
 *
 * WHAT CORRECT PLAY LOOKS LIKE: opposite answers for the two sides from the same evaluator. The
 * brawlers must close aggressively and accept damage on the way in — they literally cannot score
 * otherwise. The skirmishers must retreat and shoot, since letting a brawler reach them is fatal.
 *
 * WHAT MALFUNCTION LOOKS LIKE: brawlers that hover outside reach (the §15k passivity failure,
 * where symmetric threat pricing made the party refuse to engage), or skirmishers that walk into
 * melee. Both are unambiguous — there is no defensible reading of either as good play.
 */
export function buildRangeAsymmetry({ seed = 4005, roundLimit = 12, partyAI, oppositionAI } = {}) {
  return {
    seed, gridSize: GRID, roundLimit,
    combatants: [
      makeBrawler({ id: "brawler-1", name: "Brawler 1", side: "party", position: { col: 6, row: 20 } }),
      makeBrawler({ id: "brawler-2", name: "Brawler 2", side: "party", position: { col: 6, row: 24 } }),
      makeSkirmisher({ id: "skirmisher-1", name: "Skirmisher 1", side: "opposition", position: { col: 36, row: 20 } }),
      makeSkirmisher({ id: "skirmisher-2", name: "Skirmisher 2", side: "opposition", position: { col: 36, row: 24 } })
    ],
    ai: makeDispatcher({ partyAI, oppositionAI }),
    scriptedEvents: {}
  };
}

export const ARCHETYPES = {
  swarm: buildSwarm,
  "solo-boss": buildSoloBoss,
  "mixed-levels": buildMixedLevels,
  mirror: buildMirror,
  "range-asymmetry": buildRangeAsymmetry
};
