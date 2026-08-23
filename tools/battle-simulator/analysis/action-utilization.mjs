/**
 * Action-utilization audit (design doc §14j) — Ingram's direct instruction:
 * "We need a system that only validates if everyone uses 100% of their
 * actions because in SF2E it is very very very rare to run out entirely
 * of things to do." This inspects an already-completed battle log
 * (engine.mjs's own accountForActions already computes exactly how many
 * of each turn's action points were held back and why — this module
 * never re-derives that, only classifies and reports on it) and reports
 * or asserts on how much of the party's/opposition's action economy went
 * unspent, and whether that was for a real mechanical reason or because
 * the AI's action vocabulary was too narrow to find anything to do.
 *
 * Deliberately does NOT special-case "well this combatant genuinely had
 * nothing productive to do" as legitimate on its own — engine.mjs's own
 * heldReason already distinguishes real, unavoidable game-state reasons
 * (Stunned, reduced to 0 HP mid-turn, a damage-state drop shrinking the
 * action cap) from "the AI's candidate generator came up empty," and only
 * the former counts as legitimate here. A combatant that ran out of
 * options because its action vocabulary is too narrow (e.g. no spells, no
 * class abilities, nothing to do but Repair when nobody's hurt) is
 * exactly the gap this audit exists to surface, not paper over — the fix
 * belongs in giving that combatant more real options (ai/decide.mjs's
 * generateProposals), not in excusing the hold here.
 */

/** Every heldReason string engine.mjs actually produces, sorted into what it means. */
export function categorizeHeldReason(accounting) {
  if (!accounting || accounting.held === 0) return "fullyUtilized";
  const reason = accounting.heldReason || "";
  if (reason.startsWith("Stunned")) return "legitimate";
  if (reason.startsWith("Reduced to 0 HP mid-turn")) return "legitimate";
  if (reason.startsWith("Damage state dropped mid-turn")) return "legitimate";
  if (reason.startsWith("AI proposed an illegal")) return "illegalProposal";
  if (reason.startsWith("No legal action")) return "noActionFound";
  return "unknown"; // a heldReason engine.mjs doesn't currently produce — surfaced distinctly rather than silently trusted
}

/** Flatten every turn in a battle log to {round, combatantId, accounting, category}. */
function collectTurns(log) {
  const turns = [];
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      turns.push({ round: round.round, combatantId: turn.combatantId, accounting: turn.actionAccounting, category: categorizeHeldReason(turn.actionAccounting) });
    }
  }
  return turns;
}

/**
 * Full breakdown of a battle's action utilization — counts per category,
 * plus the actual flagged turns (noActionFound/illegalProposal/unknown)
 * so a caller can report exactly who, when, and why, not just a number.
 */
export function auditActionUtilization(log) {
  const turns = collectTurns(log);
  const byCategory = { fullyUtilized: 0, legitimate: 0, noActionFound: 0, illegalProposal: 0, unknown: 0 };
  for (const t of turns) byCategory[t.category] += 1;

  const flagged = turns.filter((t) => t.category === "noActionFound" || t.category === "illegalProposal" || t.category === "unknown");
  const totalActionsAvailable = turns.reduce((sum, t) => sum + (t.accounting?.available ?? 0), 0);
  const totalActionsHeld = turns.reduce((sum, t) => sum + (t.accounting?.held ?? 0), 0);

  return {
    totalTurns: turns.length,
    byCategory,
    utilizationRate: totalActionsAvailable > 0 ? (totalActionsAvailable - totalActionsHeld) / totalActionsAvailable : 1,
    flagged: flagged.map((t) => ({ round: t.round, combatantId: t.combatantId, held: t.accounting.held, heldReason: t.accounting.heldReason, category: t.category }))
  };
}

/**
 * The validation gate itself: throws with every flagged turn listed if
 * ANY turn held an action for a non-legitimate reason. Legitimate holds
 * (Stunned, dead mid-turn, a real damage-state action-cap drop) never
 * fail this — those are real SF2E consequences, not simulator gaps.
 * Everything else failing this check is the actual point: it should stay
 * failing until the action vocabulary is rich enough that it doesn't.
 */
export function assertFullActionUtilization(log) {
  const audit = auditActionUtilization(log);
  if (audit.flagged.length === 0) return audit;
  const lines = audit.flagged.map((f) => `  round ${f.round}, ${f.combatantId}: held ${f.held} (${f.category}) — ${f.heldReason}`);
  throw new Error(`Action utilization check failed: ${audit.flagged.length}/${audit.totalTurns} turn(s) held an action point for a non-legitimate reason:\n${lines.join("\n")}`);
}
