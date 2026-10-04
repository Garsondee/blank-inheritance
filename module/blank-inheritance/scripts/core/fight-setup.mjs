/**
 * Setting up a fight -- the pure half (2026-10-04).
 *
 * Found running Episode One's climax in the live Runner: the nest wakes and
 * six centipede cards walk onto the stage, but there was nothing to fight.
 * No centipede existed in the world as an Actor, the combat tracker was
 * empty, and the beat's card said only "6x Giant Centipede L-1" -- the GM had
 * to leave the script, hunt the bestiary, drag six actors out, build a combat
 * and roll six initiatives, with six players waiting. Now one key on the
 * fight card does all of it (foundry/fight-setup.mjs), and the card carries
 * the creature's stat line so nothing has to be opened to run a turn.
 *
 * The compactor's clock rises by itself at the end of every round (the
 * subsystem's own rule: "the GM advances it, with no roll for the
 * compactor"), which this file decides and foundry/scene-runner.mjs writes.
 */

/**
 * The actors a fight needs: one per creature, numbered when there is more
 * than one ("Giant Centipede 3"), each from the compendium entry the
 * encounter names. A creature with no compendium entry cannot be set up and
 * is named in `missing`, so the card can say so rather than half-build.
 */
export function fightRoster(encounter) {
  const roster = [];
  const missing = [];
  for (const creature of encounter?.creatures ?? []) {
    const count = Math.max(1, Number.isInteger(creature?.count) ? creature.count : 1);
    const name = creature?.name ?? creature?.creatureRef ?? "?";
    if (!creature?.compendium) {
      missing.push(name);
      continue;
    }
    for (let n = 1; n <= count; n += 1) {
      roster.push({ uuid: creature.compendium, baseName: name, name: count > 1 ? `${name} ${n}` : name, n });
    }
  }
  return { roster, missing };
}

/**
 * Whether an update to a combat ended a round: the round went forward and is
 * now 2 or more. Starting the fight (round 0 to 1) ends nothing; going back a
 * round (`direction` -1, Foundry's own previousRound) is the GM correcting a
 * mistake, and the clock is theirs to wind back by hand.
 */
export function roundEnded(newRound, { direction = 1 } = {}) {
  if (!Number.isInteger(newRound)) return false;
  if (direction === -1) return false;
  return newRound >= 2;
}

/**
 * What the clock does when a round ends: rise by one, unless it is already at
 * its ceiling (the compactor's full compaction). Null means no change.
 */
export function clockStepOnRound(clock) {
  if (!clock || !clock.canRaise) return null;
  return 1;
}

/**
 * The stat line a fight card prints for one creature: the encounter's own
 * authored `statline`, or nothing. Kept as authored text rather than read off
 * the compendium at render time, so the card costs nothing to draw; a contract
 * test (test/tier3-fight-setup-contract.test.mjs) holds the numbers in it to
 * the shipped pack, so a system update that changes the creature fails there.
 */
export function creatureLines(encounter) {
  return (encounter?.creatures ?? []).map((creature) => ({
    count: creature?.count ?? 1,
    name: creature?.name ?? creature?.creatureRef ?? "?",
    level: creature?.level ?? null,
    statline: creature?.statline ?? null,
    canSetUp: Boolean(creature?.compendium)
  }));
}
