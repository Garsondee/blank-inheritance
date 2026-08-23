/**
 * Flanking (design doc §25 — reference/srd/player-core/423-flanking.json, Player Core pg. 417):
 * "To flank a foe, you and an ally must be on opposite sides of the creature -- a line drawn
 * between the center of your space and the center of your ally's space must pass through opposite
 * sides or opposite corners of the foe's space." When you do, the target is off-guard (-2
 * circumstance to AC) to melee attacks from you and that ally specifically.
 *
 * SCOPE: this checks the straight-8-direction case -- attacker and ally sit on exactly opposite
 * compass headings from the target's own square center (N/S, E/W, or a diagonal), independent of
 * how far away either one stands, which is what "opposite sides or opposite corners" reduces to on
 * a square grid whenever both flankers are cardinally or diagonally aligned with the target (true
 * for every position a reach weapon can actually stand at). NOT a full arbitrary-angle line-through-
 * a-square solver -- a real generalization from "exact midpoint" (which wrongly required attacker
 * and ally to be equidistant, breaking the moment either one used a reach weapon to stand farther
 * back) to "same line, opposite direction, any distance," not the fully general geometry Player
 * Core's own text describes for off-grid or very unusual positioning.
 *
 * NOT modeled: deny advantage (a rogue class feature no current fixture has), all-around-vision
 * immunity (no current fixture has it either). Both are real, documented gaps, not overlooked --
 * nothing in the roster needs them yet, matching this project's own "don't build ahead of need"
 * convention.
 */
import { distanceFeet } from "./grid.mjs";
import { lineOfEffect } from "./terrain.mjs";
import { reachFeetForStrike } from "./grid.mjs";

/** Every melee strike a combatant has (a strike, unarmed or otherwise, that isn't ranged) — the
 * "wielding a melee weapon or able to make an unarmed attack" requirement. */
function meleeReachFeet(combatant) {
  const meleeStrikes = (combatant.strikes ?? []).filter((s) => s.strikeType === "melee");
  if (!meleeStrikes.length) return null; // can't flank at all -- no melee option, ranged doesn't count
  return Math.max(...meleeStrikes.map((s) => reachFeetForStrike(s)));
}

/**
 * Is `attacker` (at `attackerPos`) currently flanking `target` (at `targetPos`) together with
 * ANY one of `alliesOfAttacker` (living allies, each `{id, pos, combatant}`)? Real requirements
 * checked: both attacker and the flanking ally have a melee option, both have the target within
 * their own melee reach, and the ally sits on the EXACT OPPOSITE compass heading from the target
 * that the attacker does (the scoped geometry check, see this file's header) — any distance, not
 * just adjacent. Walls are checked too — a real flank requires both flankers to actually threaten
 * the target, which a wall between either of them and the target would prevent (same lineOfEffect
 * gate every other targeted action uses).
 */
export function isFlanking(attacker, attackerPos, target, targetPos, alliesOfAttacker, walls) {
  const attackerReach = meleeReachFeet(attacker);
  if (attackerReach == null) return false;
  if (distanceFeet(attackerPos, targetPos) > attackerReach) return false;
  if (walls?.length && !lineOfEffect(attackerPos, targetPos, walls)) return false;

  const attackerDir = { col: Math.sign(attackerPos.col - targetPos.col), row: Math.sign(attackerPos.row - targetPos.row) };
  if (attackerDir.col === 0 && attackerDir.row === 0) return false; // standing on the target's own square isn't a real heading

  for (const ally of alliesOfAttacker) {
    if (ally.id === attacker.id) continue;
    const allyPos = ally.pos;
    const allyDir = { col: Math.sign(allyPos.col - targetPos.col), row: Math.sign(allyPos.row - targetPos.row) };
    // Opposite heading from the target: exactly negated on both axes, e.g. attacker at (-1,0)
    // [west] needs the ally at (1,0) [east]; attacker at (-1,-1) [NW] needs the ally at (1,1) [SE].
    if (allyDir.col !== -attackerDir.col || allyDir.row !== -attackerDir.row) continue;

    const allyReach = meleeReachFeet(ally.combatant);
    if (allyReach == null) continue;
    if (distanceFeet(allyPos, targetPos) > allyReach) continue;
    if (walls?.length && !lineOfEffect(allyPos, targetPos, walls)) continue;

    return true;
  }
  return false;
}
