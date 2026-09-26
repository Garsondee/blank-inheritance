/**
 * Simulates data/subsystems/day-1-ground-layer.json for real: five actual
 * kid statblocks (tools/battle-simulator/data/kid-fixtures) rolling real
 * d20s against the subsystem's own obstacles, instead of the Frame-scale
 * scenario's previous flat assumption ("the ground team did their job,
 * field breaks at round 2"). Whether and when the Interdiction Field
 * actually collapses is now a real result of this roll, not a given.
 *
 * DELIBERATELY SEPARATE from engine/ (the retired two-scale design (deleted 2026-09-25) §2: "a
 * personnel-scale number never appears on the same side of a comparison
 * as a Frame-scale number"). This module only ever compares a kid's
 * modifier against a personnel-scale DC (15, or 16 for the hazard) — it
 * has no notion of the Claimant's AC or attack bonus, and never will. The
 * one number that crosses the boundary is the ROUND the field breaks (an
 * integer, not a modifier or a DC), read by the Frame-scale scenario
 * builder to decide when to fire its existing scriptedEvent.
 *
 * Reuses the Frame-scale engine's dice primitives (rollD20, degreeOfSuccess,
 * rollFormula, basicSaveDamage) — those are generic dice math, not
 * Frame-scale rules, so sharing them isn't a scale-separation violation.
 */
import { rollD20, rollFormula } from "../shared/rng.mjs";
import { degreeOfSuccess, basicSaveDamage } from "../shared/resolve.mjs";

const OBSTACLES = {
  spot: { id: "spot", poolRef: "field-integrity", skillOptions: ["perception", "crafting", "occultism", "arcana", "society"], dc: 15 },
  shepherd: { id: "shepherd", poolRef: "shelter-evacuation", skillOptions: ["diplomacy", "athletics", "medicine", "intimidation", "society"], dc: 15 }
};
const POOL_EFFECT = { criticalSuccess: 2, success: 1, failure: 0, criticalFailure: 0 };
const HAZARD_DC = 16;
const HAZARD_DAMAGE_FORMULA = "2d6";
const ROUNDS = 3; // data/subsystems/day-1-ground-layer.json's own bound: "5 kids x 3 rounds = 15 actions total"

/**
 * A kid's modifier for one of the obstacles' candidate skills. "perception"
 * is a real option on Spot's skillOptions list, but kid.schema.json (via
 * sf2e-common's pcStatblock) stores it as its own top-level `perception`
 * field, separate from the 18-skill `skills` map — found empirically as a
 * real bug here: reading it through `kid.skills.perception` silently comes
 * back undefined, scoring it 0 and systematically undervaluing Spot for
 * every kid whose best option was Perception.
 */
function modifierFor(kid, skill) {
  return skill === "perception" ? (kid.perception?.proficiency?.modifier ?? 0) : (kid.skills[skill]?.modifier ?? 0);
}

/**
 * Assigns each kid to Spot or Shepherd for the whole scene (a lane picked
 * once, not re-litigated every 6 seconds — matching how a table actually
 * divides up when a scene like this opens). Letting every kid simply pick
 * their own single best-fitting obstacle was tried first and produced a
 * real bug in practice: it let comparative advantage go unbalanced (4 of 5
 * kids independently preferred Spot in one run, starving Shepherd of
 * attempts entirely) — the opposite of what "they cannot do both" is
 * supposed to dramatize. This instead ranks kids by how much MORE they
 * favor Spot over Shepherd (their comparative advantage, not their raw
 * best), and assigns the top slice to Spot — sized proportionally to the
 * two pools' own win targets (field-integrity 6, shelter-evacuation 8;
 * 6:8 of 5 kids rounds to 2:3) — so the split is justified by the
 * subsystem's own numbers, not hand-tuned to produce a particular outcome.
 * Everything past this point (which specific rounds succeed, whether
 * either pool actually hits its target) is left to the dice.
 */
function assignLanes(kids) {
  const withAdvantage = kids.map((kid) => {
    const spotBest = Math.max(...OBSTACLES.spot.skillOptions.map((s) => modifierFor(kid, s)));
    const shepherdBest = Math.max(...OBSTACLES.shepherd.skillOptions.map((s) => modifierFor(kid, s)));
    return { kid, advantage: spotBest - shepherdBest };
  });
  withAdvantage.sort((a, b) => b.advantage - a.advantage);
  const spotCount = Math.round(kids.length * (6 / (6 + 8)));
  const lanes = new Map();
  withAdvantage.forEach(({ kid }, i) => lanes.set(kid.id, i < spotCount ? "spot" : "shepherd"));
  return lanes;
}

function bestSkillFor(kid, skillOptions) {
  let best = null;
  for (const skill of skillOptions) {
    const modifier = modifierFor(kid, skill);
    if (!best || modifier > best.modifier) best = { skill, modifier };
  }
  return best;
}

/**
 * @param {object[]} kids - the five non-piloting kid statblocks (kid.schema.json shape)
 * @param {number} seed
 * @returns structured log: per-round kid actions + collateral hazard saves, running pool
 *   totals, and fieldBreaksAtRound (first round Field Integrity reaches 6, or null).
 */
export function runGroundLayer({ kids, seed }) {
  const rng = (() => {
    // Local, not imported from engine/rng.mjs's makeRng, to guarantee this
    // resolver can never accidentally share PRNG STATE with a Frame-scale
    // battle run from the same seed — same algorithm, independently seeded.
    let a = (seed ^ 0x6d75674b) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();

  const lanes = assignLanes(kids);
  const pools = { "field-integrity": 0, "shelter-evacuation": 0 };
  const rounds = [];
  let fieldBreaksAtRound = null;

  for (let round = 1; round <= ROUNDS; round++) {
    const roundLog = { round, kidActions: [], hazardSaves: [] };

    for (const kid of kids) {
      const obstacleId = lanes.get(kid.id);
      const obstacle = OBSTACLES[obstacleId];
      const best = bestSkillFor(kid, obstacle.skillOptions);
      const d20 = rollD20(rng);
      const total = d20 + best.modifier;
      const degree = degreeOfSuccess(d20, total, obstacle.dc);
      const points = POOL_EFFECT[degree];
      pools[obstacle.poolRef] += points;

      roundLog.kidActions.push({
        kidId: kid.id, kidName: kid.name, obstacle: obstacleId, skillUsed: best.skill,
        roll: { d20, modifier: best.modifier, total, dc: obstacle.dc, degree },
        pointsGained: points, poolRef: obstacle.poolRef, poolTotalAfter: pools[obstacle.poolRef]
      });
    }

    // Collateral hazard: "fires once per round, automatically... is NOT an
    // action and does not compete" (day-1-ground-layer.json) — every kid
    // saves regardless of which obstacle they attempted.
    for (const kid of kids) {
      const reflexMod = kid.savingThrows?.reflex?.modifier ?? 0;
      const d20 = rollD20(rng);
      const total = d20 + reflexMod;
      const degree = degreeOfSuccess(d20, total, HAZARD_DC);
      const raw = rollFormula(rng, HAZARD_DAMAGE_FORMULA).total;
      const damage = basicSaveDamage(raw, degree);
      roundLog.hazardSaves.push({ kidId: kid.id, kidName: kid.name, roll: { d20, modifier: reflexMod, total, dc: HAZARD_DC, degree }, rawDamage: raw, damageTaken: damage });
    }

    if (fieldBreaksAtRound === null && pools["field-integrity"] >= 6) fieldBreaksAtRound = round;

    roundLog.poolsAfter = { ...pools };
    rounds.push(roundLog);
  }

  return {
    seed, lanes: Object.fromEntries(lanes), rounds, finalPools: pools, fieldBreaksAtRound,
    fieldIntegrityWinTarget: 6, shelterEvacuationWinTarget: 8,
    outcome: {
      fieldIntegrity: pools["field-integrity"] >= 6 ? "collapsed" : "held",
      shelterEvacuation: pools["shelter-evacuation"] >= 8 ? "fully-clear" : pools["shelter-evacuation"] >= 4 ? "half-clear" : "not-cleared"
    }
  };
}
