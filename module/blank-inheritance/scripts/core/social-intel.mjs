/**
 * The Character Card — the pure half.
 *
 * Persistent, learnable social intel per NPC (design/npc-social-intel.md).
 * Two things are tracked and they are deliberately different in kind:
 *
 *   ATTITUDE is a state. It moves, both ways, and it is never secret in the
 *   sense that matters — a player can perceive that someone has warmed to
 *   them. SF2E's own five-step scale, not an invented one.
 *
 *   FACTS are permanent. Authored ahead of time, hidden until something
 *   reveals them, and then known FOR GOOD — usable in any later scene with
 *   that NPC, not just the one where they were learned.
 *
 * The rule this file exists to enforce: a player's view REMOVES what they
 * have not learned. It does not render it and hide it. That is doctrine Law
 * 11, and the whole point is that "hidden" in a browser is not hidden.
 */

/**
 * SF2E's real Attitudes, worst to best
 * (reference/srd/player-core/504-conditions-appendix.json). Order is
 * load-bearing: Make an Impression, Request and Coerce all move a target one
 * or two STEPS along this list, so the index is the mechanic.
 */
export const ATTITUDES = Object.freeze([
  "hostile",
  "unfriendly",
  "indifferent",
  "friendly",
  "helpful"
]);

/** Where an unspecified NPC starts. RAW's own default for a stranger. */
export const DEFAULT_ATTITUDE = "indifferent";

export function isAttitude(value) {
  return ATTITUDES.includes(value);
}

export function attitudeIndex(value) {
  const index = ATTITUDES.indexOf(value);
  return index === -1 ? ATTITUDES.indexOf(DEFAULT_ATTITUDE) : index;
}

/**
 * Move an attitude by whole steps, clamped at both ends.
 *
 * Clamped rather than wrapping, obviously, but worth stating: a critical
 * success on someone already Helpful does not roll them around to Hostile.
 */
export function shiftAttitude(value, steps = 0) {
  const next = attitudeIndex(value) + Math.trunc(steps);
  return ATTITUDES[Math.min(Math.max(next, 0), ATTITUDES.length - 1)];
}

/**
 * Written out rather than built from the slug, so every key is a literal the
 * tier-0 localisation lint can actually check. A key assembled at runtime is
 * exactly the kind that renders as a raw dotted string on screen and fails
 * silently.
 */
const ATTITUDE_LABEL_KEYS = Object.freeze({
  hostile: "BLANKINHERITANCE.Console.Card.Attitude.Hostile",
  unfriendly: "BLANKINHERITANCE.Console.Card.Attitude.Unfriendly",
  indifferent: "BLANKINHERITANCE.Console.Card.Attitude.Indifferent",
  friendly: "BLANKINHERITANCE.Console.Card.Attitude.Friendly",
  helpful: "BLANKINHERITANCE.Console.Card.Attitude.Helpful"
});

export function attitudeLabelKey(value) {
  return ATTITUDE_LABEL_KEYS[isAttitude(value) ? value : DEFAULT_ATTITUDE];
}

/**
 * The three RAW actions that move an attitude, with what each actually does.
 *
 * Listed as data rather than prose so the card can show a GM the real
 * consequences at the moment they matter, instead of the GM remembering them.
 * Nothing here is invented — see design/npc-social-intel.md, which cites the
 * Player Core text for each.
 */
export const SOCIAL_ACTIONS = Object.freeze([
  Object.freeze({
    id: "make-an-impression",
    skill: "diplomacy",
    labelKey: "BLANKINHERITANCE.Console.Card.Action.MakeAnImpression",
    // Critical failure worsens by one; failure has NO listed effect at all,
    // which is the real "neutral" outcome the design doc had to go and find.
    steps: { criticalSuccess: 2, success: 1, failure: 0, criticalFailure: -1 }
  }),
  Object.freeze({
    id: "request",
    skill: "diplomacy",
    labelKey: "BLANKINHERITANCE.Console.Card.Action.Request",
    // Request does not move attitude on a success; it is the action that
    // SPENDS one. Only a critical failure moves it, downward.
    steps: { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: -1 }
  }),
  Object.freeze({
    id: "coerce",
    skill: "intimidation",
    labelKey: "BLANKINHERITANCE.Console.Card.Action.Coerce",
    steps: { criticalSuccess: 0, success: 0, failure: -1, criticalFailure: -1 }
  })
]);

/**
 * Build the card for one viewer.
 *
 * `isGM` decides what EXISTS in the returned object, not what gets a CSS
 * class. An unrevealed fact's text never appears in a player's card at all,
 * so there is nothing for a curious player to find in the DOM or in a
 * network payload.
 *
 * A player is still told how many facts they have not learned, because "there
 * is more to know about this person" is information the fiction gives them
 * anyway, and it is the hook that makes asking around feel worthwhile.
 */
export function buildCard({ name = null, profile = null, revealedIds = [], isGM = false } = {}) {
  const revealed = new Set(revealedIds ?? []);
  const authored = Array.isArray(profile?.facts) ? profile.facts : [];

  const attitude = isAttitude(profile?.attitude) ? profile.attitude : DEFAULT_ATTITUDE;

  const facts = [];
  let unlearned = 0;

  for (const fact of authored) {
    const known = revealed.has(fact.id);
    if (!known) unlearned += 1;

    if (!isGM && !known) continue;

    facts.push({
      id: fact.id,
      text: fact.text,
      revealed: known,
      trigger: isGM ? describeTrigger(fact.revealTrigger) : null
    });
  }

  return {
    name,
    attitude,
    attitudeLabelKey: attitudeLabelKey(attitude),
    facts,
    // Both seats get the count: a player is told there is more to know,
    // just never what.
    unlearned,
    hasProfile: authored.length > 0 || isAttitude(profile?.attitude),
    isGM
  };
}

/**
 * A one-line summary of how a fact is learned, for the GM's own view.
 *
 * Returns null rather than a placeholder when there is no trigger: a fact the
 * GM reveals by judgement is a perfectly normal thing, and printing "no
 * trigger" would make it look like unfinished authoring.
 */
export function describeTrigger(trigger) {
  if (!trigger || typeof trigger !== "object") return null;
  if (typeof trigger.narrative === "string" && trigger.narrative.trim()) {
    return { kind: "narrative", text: trigger.narrative.trim() };
  }
  if (typeof trigger.skill === "string" && trigger.skill.trim()) {
    return {
      kind: "check",
      skill: trigger.skill.trim(),
      dc: Number.isInteger(trigger.dc) ? trigger.dc : null
    };
  }
  return null;
}

/**
 * The guard that makes Law 11 testable rather than aspirational: nothing in a
 * player's card may contain the text of a fact they have not learned.
 *
 * Exported so the test suite asserts it directly against a real card rather
 * than trusting the branch above to stay correct.
 */
export function leaksUnrevealedText(card, profile) {
  const authored = Array.isArray(profile?.facts) ? profile.facts : [];
  const serialised = JSON.stringify(card ?? null);
  return authored
    .filter((fact) => !card?.facts?.some((shown) => shown.id === fact.id))
    .some((fact) => typeof fact.text === "string" && fact.text && serialised.includes(fact.text));
}
