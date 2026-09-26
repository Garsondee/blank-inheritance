/**
 * Director's-console mechanics — pure logic only, matching real numbers
 * from data/campaign/config.json rather than invented ones. The DOM side
 * (the terminal's Director-mode apps) lives in design/ui/phone.js and
 * imports these; this file owns nothing DOM-shaped, same split as
 * phone.mjs and marker-layout.mjs.
 */

/* ------------------------------------------------------------------ *
 * The Contact Pool — data/campaign/config.json's contactPool, made
 * interactive rather than a GM doing this math by hand at the table.
 * Floor: no roll at all inside 2 quiet days of the last Contact (not
 * modelled here as a distinct state — the GM simply doesn't call
 * rollContactPool during that window; there is no "roll" to represent).
 * Rolling starts day 3 post-Contact, i.e. quietMorning 1 on the first
 * morning rolls are allowed.
 * ------------------------------------------------------------------ */

export const CONTACT_POOL = Object.freeze({
  startTarget: 20,     // the first roll morning: only a nat 20 triggers
  floorTarget: 13,     // the target never drops below this
  ceilingMorning: 8    // by this quiet morning, Contact happens regardless of the roll
});

/** The target number for a given quiet morning (1-indexed: the first
 *  morning rolling is allowed is quietMorning 1). Never below floorTarget,
 *  matching "20, then 19+, then 18+... " down to a floor, not to zero. */
export function contactTarget(quietMorning) {
  if (!Number.isInteger(quietMorning) || quietMorning < 1) {
    throw new Error(`quietMorning must be a positive integer, got ${quietMorning}`);
  }
  return Math.max(CONTACT_POOL.floorTarget, CONTACT_POOL.startTarget - (quietMorning - 1));
}

/**
 * Roll the pool for one morning. `random` is injectable for determinism.
 * At or past the ceiling morning, Contact is forced regardless of the die
 * — "the pool can never coast forever" — surfaced as `forced: true` so the
 * UI can say so honestly rather than implying a lucky/unlucky roll decided it.
 */
export function rollContactPool(quietMorning, random = Math.random) {
  const target = contactTarget(quietMorning);
  const roll = Math.floor(random() * 20) + 1;
  const forced = quietMorning >= CONTACT_POOL.ceilingMorning;
  const triggered = forced || roll >= target;
  return { quietMorning, target, roll, forced, triggered };
}

/* ------------------------------------------------------------------ *
 * False Contact — data/campaign/config.json's falseContact.types,
 * verbatim. All three cost the same disrupted evening as a real Contact;
 * the difference is entirely in how the GM resolves it, never in how it
 * reads to the table at the moment the alarm goes off.
 * ------------------------------------------------------------------ */

export const CONTACT_TYPES = Object.freeze([
  { id: "real", label: "Real", description: "A genuine Claimant Contact." },
  { id: "type-a", label: "False · Type A", description: "Genuine false positive. Full scramble, nothing there." },
  { id: "type-b", label: "False · Type B", description: "Role reversal. What needs help is people, not a fight." },
  { id: "type-c", label: "False · Type C", description: "First contact with the Watcher. Resolves as investigation, not combat." }
]);

/* ------------------------------------------------------------------ *
 * Frame Economy — data/campaign/config.json's frameEconomy. HP is a
 * campaign resource: Frames move down this track and do not heal
 * between fights. Repair costs technician-days from one shared pool that
 * Frame modification ALSO draws from — the tension is real, so the pool
 * is a single shared number here too, not one per Frame.
 * ------------------------------------------------------------------ */

export const DAMAGE_STATES = Object.freeze(["operational", "degraded", "critical", "hulked"]);

/** One step worse. Already-hulked stays hulked — there is no fifth state. */
export function damageStepDown(state) {
  const i = DAMAGE_STATES.indexOf(state);
  if (i < 0) throw new Error(`unknown damage state: ${state}`);
  return DAMAGE_STATES[Math.min(DAMAGE_STATES.length - 1, i + 1)];
}

/** One step of repair. Already-operational stays operational. Repairing
 *  FROM hulked is a GM fiction call this function does not forbid —
 *  "can stay hulked" (permanent loss is on the table) is different from
 *  "cannot ever be repaired." */
export function damageStepUp(state) {
  const i = DAMAGE_STATES.indexOf(state);
  if (i < 0) throw new Error(`unknown damage state: ${state}`);
  return DAMAGE_STATES[Math.max(0, i - 1)];
}

/** A Degraded or worse Frame is the risk the repair economy creates —
 *  "the GM never has to force this; the repair economy does it for them." */
export function isDeployable(state) {
  return state === "operational" || state === "degraded";
}
