/**
 * What the deck's central instrument is saying right now — pure.
 *
 * The orb's readout window has three states, in strict priority:
 *   1. HOVER — a hand is on a control, so show what that control would do:
 *      the check's name and the modifier that will actually be rolled
 *      (design/ux-doctrine.md Law 1). The same move a hardware synth makes
 *      when you touch a knob and its display names the parameter.
 *   2. ROLL — something was just rolled for the subject: the total, and the
 *      MARGIN against the DC when there is one (Law 2 — "hit by 7" beats
 *      "success"). It holds for a short while, then gives way.
 *   3. IDLE — who the subject is and how they are.
 *
 * Nothing here localises: it returns plain facts and i18n keys, and
 * foundry/deck.mjs turns them into words.
 */

export const ORB_ROLL_HOLD_MS = 45000;

const OUTCOMES = Object.freeze(["criticalSuccess", "success", "failure", "criticalFailure"]);

/**
 * Spelled out in full rather than built with a template string: the
 * localisation lint (tier0-architecture.test.mjs) reads keys out of source
 * text, and `${outcome}` would hide four real keys from it.
 */
const OUTCOME_KEYS = Object.freeze({
  criticalSuccess: "BLANKINHERITANCE.Deck.Outcome.criticalSuccess",
  success: "BLANKINHERITANCE.Deck.Outcome.success",
  failure: "BLANKINHERITANCE.Deck.Outcome.failure",
  criticalFailure: "BLANKINHERITANCE.Deck.Outcome.criticalFailure"
});

/**
 * A roll's title as the instrument's narrow window shows it. sf2e titles its
 * checks "Kind: Subject" — "Skill Check: Zon-Shelyn Lore", "Melee Strike:
 * Unarmed Attack" (verified live 2026-09-17) — and the subject is the part a
 * glance needs; the kind is obvious from which key was pressed. A title with
 * no such prefix ("Perception Check") is shown whole.
 */
export function readoutTitle(title) {
  let text = String(title ?? "").trim();
  // An ACTION's check carries its title as markup, not text — sf2e renders
  // `<h4 class="action"><strong>Seek</strong> <span class="action-glyph">1</span>
  // <span class="subtitle">(Perception Check)</span></h4>` into the context
  // (found live 2026-09-23, the first time the deck's Action selector rolled
  // one: the orb printed the raw tags). The action's name is its <strong>;
  // failing that, the markup is stripped to its words.
  if (text.includes("<")) {
    const strong = /<strong[^>]*>([\s\S]*?)<\/strong>/i.exec(text);
    text = (strong ? strong[1] : text).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const cut = text.indexOf(": ");
  const subject = cut >= 0 ? text.slice(cut + 2).trim() : "";
  return subject || text;
}

/** "+4" / "-2" / "+0" — a margin is always signed. */
export function signed(n) {
  const v = Math.round(Number(n) || 0);
  return v >= 0 ? `+${v}` : `${v}`;
}

/** Which state wins, given what is currently true. */
export function orbMode({ now = 0, hover = null, lastRoll = null, holdMs = ORB_ROLL_HOLD_MS } = {}) {
  if (hover) return "hover";
  if (lastRoll && Number.isFinite(lastRoll.at) && now - lastRoll.at >= 0 && now - lastRoll.at <= holdMs) return "roll";
  return "idle";
}

/**
 * The facts of one roll, read out of a chat message's plain data.
 *
 * `flags` is the message's flags object and `rolls` its Roll list, both as
 * plain data. sf2e writes its check context under `flags.sf2e.context`
 * (verified live 2026-09-17: title, type, dc, outcome, identifier); pf2e's
 * namespace is accepted too, since sf2e is built on that codebase and a
 * shared bug fix upstream should not break this.
 *
 * Returns null for anything that is not a check with a numeric total —
 * a damage roll or a plain /r is not something the orb reads out.
 */
export function rollFromMessage({ flags = {}, rolls = [], speakerActorId = null, at = 0 } = {}) {
  const context = flags?.sf2e?.context ?? flags?.pf2e?.context ?? null;
  const roll = rolls?.[0];
  if (!context || !roll || !Number.isFinite(roll.total)) return null;
  if (typeof context.type === "string" && /damage/.test(context.type)) return null;

  const d20 = (roll.dice ?? []).find((die) => die?.faces === 20);
  const natural = d20?.results?.find((r) => r?.active !== false && !r?.discarded)?.result ?? null;

  const rawDc = context.dc;
  const dcValue = typeof rawDc === "number" ? rawDc : Number.isFinite(rawDc?.value) ? rawDc.value : null;

  return {
    at,
    actorId: speakerActorId,
    title: typeof context.title === "string" ? context.title : "",
    type: context.type ?? null,
    total: roll.total,
    natural: Number.isFinite(natural) ? natural : null,
    dc: dcValue,
    // pf2e's CheckDC carries `visible: false` when the table should not see
    // the number. Missing means visible — that is sf2e's own default.
    dcVisible: rawDc && typeof rawDc === "object" ? rawDc.visible !== false : true,
    outcome: OUTCOMES.includes(context.outcome) ? context.outcome : null
  };
}

/**
 * How one roll reads on the orb for a given seat.
 *
 * Law 11 is applied here, not in a template: a player never sees a DC or a
 * margin their character has not been shown (dcVisible false), and the
 * outcome only appears when the metagame setting lets the table see results.
 * The GM always sees everything.
 */
export function rollSummary(roll, { isGM = false, showResults = true } = {}) {
  if (!roll) return null;
  const canSeeDc = roll.dc !== null && (isGM || roll.dcVisible);
  const canSeeOutcome = roll.outcome !== null && (isGM || showResults);
  const margin = canSeeDc ? roll.total - roll.dc : null;
  let tone = "neutral";
  if (canSeeOutcome) tone = roll.outcome === "criticalSuccess" || roll.outcome === "success" ? "good" : "bad";
  else if (roll.natural === 20) tone = "good";
  else if (roll.natural === 1) tone = "bad";
  return {
    title: readoutTitle(roll.title),
    total: roll.total,
    natural: roll.natural,
    dc: canSeeDc ? roll.dc : null,
    margin,
    marginLabel: margin === null ? null : signed(margin),
    outcome: canSeeOutcome ? roll.outcome : null,
    outcomeKey: canSeeOutcome ? OUTCOME_KEYS[roll.outcome] : null,
    tone
  };
}
