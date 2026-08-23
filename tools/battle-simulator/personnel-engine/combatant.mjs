/**
 * Effective stats for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../engine/combatant.mjs with the whole damage-state degradation track (Operational/Degraded/
 * Critical/Hulked, the AC/speed/hardness/action-cap penalty curve) removed entirely. That curve
 * is a Frame/vehicle-specific mechanic — design/scale-and-chassis.md §8's own opening line frames
 * it as "what makes Frames/vehicles feel mechanically distinct from characters", which by that
 * same logic means it must NOT apply to an ordinary SF2E PC or NPC. A real level-1 Mystic or a
 * Security Goon just has flat AC/Speed and the standard 3 actions per turn until it drops to 0 HP,
 * exactly like the Frame-scale file's own fallback branch for anything that isn't kind "frame" or
 * "chassis" already behaves.
 *
 * Pure functions only. No RNG, no mutation, no I/O.
 */
import { isOffGuardFromConditions, isUnconscious } from "./conditions.mjs";

/**
 * An ordinary SF2E combatant's effective stats for the current round — no degradation curve, but
 * DOES fold in Frightened (design doc §19's skill-actions-in-combat expansion; real text mirrored
 * at reference/srd/player-core/condition-18-frightened.json): "you take a status penalty equal to
 * this value to all your checks AND DCs" — AC is a DC, so a frightened combatant is genuinely
 * easier to hit, not just worse at hitting back. combatant.frightened is a flat scalar (not nested
 * under a `conditions` object) specifically so engine.mjs's sandbox clone (a shallow `{...c}` for
 * everything except explicitly-deep-copied arrays) copies it correctly by value with no special
 * handling — a nested object would alias between the live state and a sandbox fork, letting mere
 * *planning* a Demoralize mutate the real battle's condition state.
 *
 * ALSO folds in Off-Guard (design doc §25, conditions.mjs's isOffGuardFromConditions) — a real
 * -2 circumstance penalty to AC from Prone or Unconscious, universal (against every attacker, every
 * attack type), unlike flanking's own off-guard grant, which is scoped to melee attacks from the
 * specific flanking creatures and is therefore computed per-attack in engine.mjs, not here.
 *
 * ALSO folds in Unconscious's OWN separate -4 STATUS penalty to AC (condition-40-unconscious.json:
 * "You take a -4 status penalty to AC, Perception, and Reflex saves, AND you have the... off-guard
 * condition[s]" -- two distinct effects, a status penalty and a granted condition, not one). A
 * status penalty and a circumstance penalty are different bonus types in SF2E and DO stack -- an
 * unconscious combatant's real AC penalty is -6 total (-4 status, -2 circumstance from off-guard),
 * not -2. Perception/Reflex aren't modeled here: this engine never rolls Perception mid-combat, and
 * Reflex only ever matters through saveAttack's own cover-bonus path, a separate code path that
 * reads target.saves directly rather than through this function.
 */
export function resolveEffectiveStats(combatant) {
  const disabled = combatant.currentHP <= 0;
  const frightened = combatant.frightened ?? 0;
  const offGuardPenalty = isOffGuardFromConditions(combatant) ? 2 : 0;
  const unconsciousStatusPenalty = isUnconscious(combatant) ? 4 : 0;
  return {
    ac: combatant.ac - frightened - offGuardPenalty - unconsciousStatusPenalty,
    hardness: combatant.hardness ?? 0,
    speed: disabled ? 0 : combatant.speed,
    actionsAvailable: disabled ? 0 : 3, // standard SF2E action economy — Player Core pg. 406
    disabled
  };
}
