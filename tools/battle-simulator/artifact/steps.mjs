/**
 * Flattens one run's battle log into a linear step sequence for the replay
 * scrubber: deployment, then one step per turn, then the outcome. Extracted
 * out of template.html's inline script (design doc §15m) so this real,
 * non-trivial logic is covered by node:test instead of only ever being
 * exercised by clicking through the UI — the same pattern geometry.mjs
 * already established for this file.
 */

/** One step per turn (never per action) — deployment first, outcome last. */
export function buildSteps(run) {
  const deploymentSnapshot = run.log.deployment?.snapshot ?? {};
  const out = [{ kind: "deployment", round: 0, snapshot: deploymentSnapshot, scriptedEvents: [] }];
  for (const round of run.log.rounds) {
    round.turns.forEach((turn, i) => {
      out.push({
        kind: "turn",
        round: round.round,
        combatantId: turn.combatantId,
        stunned: !!turn.stunned,
        // Real value, not just the boolean — was silently dropped before this fix, so every
        // stunned-turn render fell back to its own hardcoded default (?? 3 / ?? 0) instead of the
        // real lost-action count. Same-shaped gap as dying/recoveryCheck below; fixed together.
        stunnedActionsLost: turn.stunnedActionsLost,
        // design doc §25: a downed PC's own turn is a real recovery check (engine.mjs's
        // isUnconscious branch), not a normal action turn — both fields must survive the flatten
        // for the artifact viewer to render it as anything other than an empty "held" row.
        dying: !!turn.dying,
        recoveryCheck: turn.recoveryCheck || null,
        actions: turn.actions || [],
        actionAccounting: turn.actionAccounting || null,
        effectiveStats: turn.effectiveStats || null,
        snapshot: turn.snapshot,
        scriptedEvents: i === 0 ? round.scriptedEvents : []
      });
    });
  }
  const last = out[out.length - 1];
  out.push({ kind: "outcome", round: last.round, snapshot: last.snapshot, outcome: run.log.outcome });
  return out;
}

/**
 * Design doc §30 — the "heal spammed on a full-health target" report: the target WASN'T full when
 * the AI decided (decide.mjs's own proposal gate and legality.mjs's checkHealAbilityLegal both
 * refuse a full-HP target outright — verified directly, not assumed), it only LOOKED that way
 * because the roster panel used to jump straight to step.snapshot (the turn's END state) the
 * instant a turn's playback began, while the beat sequencer then spent many seconds narrating the
 * turn's actions as if still in progress. This is the fix: which action types carry a real
 * "after" value for a given combatant field, checked one at a time so an action missing a field
 * (an older log written before that field existed, or an action type that never touches it)
 * leaves that field exactly as the prior beat already had it, rather than clobbering it with
 * undefined.
 */
const SNAPSHOT_FIELD_FROM_ACTION = {
  currentHP: "targetHPAfter",
  dyingValue: "targetDyingValueAfter",
  woundedValue: "targetWoundedValueAfter",
  prone: "targetProneAfter",
  unconscious: "targetUnconsciousAfter",
  dead: "targetDeadAfter"
};

/**
 * One resolved action -> the target's updated snapshot entry, immutably (never mutates `snapshot`
 * or any entry inside it — every beat in the sequence calls this in turn, and an earlier beat's
 * result must stay untouched by a later one reusing the same object). Actions with no real target
 * effect (move/step/advance/demoralize's frightened-only application, or a rejected proposal) pass
 * through unchanged — `targetHPAfter == null` is the one universal signal every HP-affecting action
 * type (strike/spellAttack/saveAttack/healAbility) already sets, so it doubles as "did this action
 * change its target's condition state at all" without needing a separate flag.
 */
export function applyActionToSnapshot(snapshot, action) {
  if (!action || action.legal === false || !action.targetId || action.targetHPAfter == null) return snapshot;
  const prior = snapshot[action.targetId];
  if (!prior) return snapshot;
  const next = { ...prior };
  for (const [field, actionKey] of Object.entries(SNAPSHOT_FIELD_FROM_ACTION)) {
    if (action[actionKey] != null) next[field] = action[actionKey];
  }
  return { ...snapshot, [action.targetId]: next };
}

/** Which action types read as "shots fired" — a real, targeted, hostile act against an enemy.
 * Movement and healing don't count (design doc §30: Ingram's "fast forward to first contact" ask
 * is about skipping the pre-battle approach/positioning phase, not the first supportive action). */
const CONTACT_ACTION_TYPES = new Set(["strike", "spellAttack", "saveAttack", "conditionSave", "demoralize"]);

export function isContactAction(action) {
  return !!action && action.legal !== false && CONTACT_ACTION_TYPES.has(action.type);
}

/** The index of the first step whose turn contains a real contact action — -1 if the battle log
 * never has one (every proposal held/rejected, or a pure-maneuver scenario). One fixed landmark
 * per run, not a relative search from wherever playback currently sits — see design doc §30. */
export function findFirstContactStepIndex(steps) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.kind !== "turn") continue;
    if ((step.actions || []).some(isContactAction)) return i;
  }
  return -1;
}
