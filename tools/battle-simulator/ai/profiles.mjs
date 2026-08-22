/**
 * Named weight profiles for the utility-AI framework (design doc §14h).
 * Each weight scales a candidate's raw, mechanically-grounded value
 * (considerations.mjs / candidates.mjs) into a final comparable score.
 * Role differentiation lives ENTIRELY in this table, not in separate
 * decision logic — "what does this combatant care about" is one
 * auditable set of numbers instead of scattered if-branches, and the
 * SAME candidate set (an attacker's Strike, a spotter's Spot, and so on
 * are all generated for everyone) gets ranked differently purely because
 * the weights differ. See profileFor() for how a combatant gets one.
 *
 * Weight keys, matching candidates.mjs's weightKey values:
 *   damage       — Strike AND spellAttack candidates (expected damage — one shared weight, since
 *                  a spell attack is mechanically a Strike wearing different clothes, design doc §14k)
 *   positioning  — Move candidates (flat "worth doing something" baseline)
 *   support      — Spot candidates (expected damage gained by the ally)
 *   civilians     — Evacuate candidates (expected civilians cleared)
 *   repair       — Repair AND healAbility candidates (expected HP restored — same reasoning as damage above)
 *   directive    — Advance candidates (the Claimant's scripted directive)
 */
export const PROFILES = {
  // General direct-damage combatant (Kingfisher, Hod, the Frame): strikes
  // are the point, positioning is worth a little, spotting an ally is a
  // nice-to-have if a real spotter isn't already covering it.
  ATTACKER: { damage: 1, positioning: 2, support: 0.5, civilians: 0, repair: 0, directive: 0 },

  // Vesper's whole job (design doc §14d): making an ally's hit land is
  // worth more than its own middling gun. Low but nonzero damage weight —
  // once nobody's left to spot for, it should still fight rather than
  // stand idle.
  SPOTTER: { damage: 0.3, positioning: 1, support: 6, civilians: 0, repair: 0, directive: 0 },

  // Runabout: never joins the fight at all once evacuation is legal —
  // civilians weight dominates every other consideration by design.
  EVACUATOR: { damage: 0, positioning: 2, support: 0, civilians: 3, repair: 0, directive: 0 },

  // Ladle: no strikes in its data at all, so damage/support/civilians
  // weights are moot — repair is the only real consideration besides
  // positioning to reach whoever's hurt.
  REPAIRER: { damage: 0, positioning: 2, support: 0, civilians: 0, repair: 1, directive: 0 },

  // A combatant with BOTH real attack options (strikes/spells) and a heal
  // ability (design doc §14k, e.g. a Mystic's Transfer Vitality) — damage
  // still comes first (this is a caster who fights, not a dedicated medic
  // like the Ladle), but a real, nonzero repair weight means a genuinely
  // valuable heal (an ally close to Hulked) can outscore a mediocre
  // attack, rather than never being considered at all the way ATTACKER's
  // repair:0 would make it.
  HYBRID_CASTER: { damage: 1, positioning: 2, support: 0.5, civilians: 0, repair: 0.3, directive: 0 },

  // The Claimant: Advance is scripted and near-mandatory (see
  // candidates.mjs's generateAdvanceCandidate) — directive's weight is
  // set far above anything else so it always wins when available; damage
  // still matters for the spare 3rd action once Advance is spent.
  RELENTLESS_ADVANCER: { damage: 1, positioning: 0, support: 0, civilians: 0, repair: 0, directive: 1000 }
};

/**
 * Which profile a combatant plays under. Deliberately explicit and
 * concrete (matching the roles design doc §14d already assigns) rather
 * than an emergent "discover the best role" system — which vehicle does
 * what is a real narrative/mechanical fact about this scenario, not
 * something that needs inferring turn to turn.
 */
export function profileFor(combatant) {
  if (combatant.side === "opposition") return PROFILES.RELENTLESS_ADVANCER;
  if (combatant.id === "vesper") return PROFILES.SPOTTER;
  if (combatant.canEvacuate) return PROFILES.EVACUATOR;
  if (combatant.repairBonus != null && (combatant.strikes ?? []).length === 0) return PROFILES.REPAIRER;
  if ((combatant.healAbilities ?? []).length > 0) return PROFILES.HYBRID_CASTER;
  return PROFILES.ATTACKER;
}
