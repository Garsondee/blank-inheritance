/**
 * The scene-close dialogue — the pure half.
 *
 * design/ux-doctrine.md §10.3a, Ingram's own spec (2026-09-06): "mark if a
 * scene is complete, if it is then I'm forced to select from dropdowns what
 * the result of the scene was... a text box for adding my own notes." The
 * word doing the work is FORCED — the one deliberate-friction point in the
 * whole console. And per Law 15 ("advances state, does not merely record"),
 * a chosen cost has to visibly change something, not just get written down.
 *
 * The doc is explicit that a real per-scene authored vocabulary and real
 * downstream mechanics (casualty track -> next episode's Resonance penalty,
 * Anchor baselines) are future work -- "For this prototype, a mocked/
 * placeholder outcome vocabulary is fine... what this issue must get right
 * is the SHAPE" (GitHub #125). So: a real, generic (not scene-authored)
 * vocabulary, and two simple mocked counters that really do tick, rather
 * than pretending to wire into Resonance/casualty systems that are
 * themselves still flagged NEEDS REWORK (data/campaign/config.json).
 */

/** How the scene ended. No authored-per-scene vocabulary exists yet (episode.schema.json's scene shape has no outcomes field) -- this is the generic fallback §10.3a says improvisation needs anyway. */
// `label` is plain-English text for the session log (a private GM note,
// never localised anywhere else in this codebase -- log-entry.mjs/
// session-log.mjs have no i18n dependency either). `labelKey` is the
// separate, real BLANKINHERITANCE.* key the UI's dropdown renders via
// {{localize}}. core/ can never call game.i18n itself (tier-0 lint), so the
// log line is built from `label` here rather than from a raw, unresolved key.
export const ENDING_OPTIONS = Object.freeze([
  { id: "resolved", label: "Resolved", labelKey: "BLANKINHERITANCE.SceneClose.Ending.Resolved" },
  { id: "resolved-with-complications", label: "Resolved with complications", labelKey: "BLANKINHERITANCE.SceneClose.Ending.ResolvedWithComplications" },
  { id: "interrupted", label: "Interrupted", labelKey: "BLANKINHERITANCE.SceneClose.Ending.Interrupted" },
  { id: "abandoned", label: "Abandoned", labelKey: "BLANKINHERITANCE.SceneClose.Ending.Abandoned" }
]);

/** What it cost -- the doc's own exact list ("casualties, Frame damage, Bleed, technician-days, time, an Anchor violated, or nothing"), not trimmed. */
export const COST_OPTIONS = Object.freeze([
  { id: "nothing", label: "Nothing", labelKey: "BLANKINHERITANCE.SceneClose.Cost.Nothing" },
  { id: "casualties", label: "Casualties", labelKey: "BLANKINHERITANCE.SceneClose.Cost.Casualties" },
  { id: "frame-damage", label: "Frame damage", labelKey: "BLANKINHERITANCE.SceneClose.Cost.FrameDamage" },
  { id: "bleed", label: "Bleed", labelKey: "BLANKINHERITANCE.SceneClose.Cost.Bleed" },
  { id: "technician-days", label: "Technician-days", labelKey: "BLANKINHERITANCE.SceneClose.Cost.TechnicianDays" },
  { id: "time", label: "Time", labelKey: "BLANKINHERITANCE.SceneClose.Cost.Time" },
  { id: "anchor-violated", label: "Anchor violated", labelKey: "BLANKINHERITANCE.SceneClose.Cost.AnchorViolated" }
]);

function findOption(options, id) {
  return options.find((o) => o.id === id) ?? null;
}

/**
 * Is this closure legal to confirm? An incomplete scene needs nothing --
 * "it stays open and carries forward... not an error." A complete one is
 * FORCED to have both dropdowns set, per the doc's own word.
 */
export function canCloseScene({ complete, ending, cost }) {
  if (!complete) return { ok: true, reason: null };
  if (!findOption(ENDING_OPTIONS, ending)) return { ok: false, reason: "ending-required" };
  if (!findOption(COST_OPTIONS, cost)) return { ok: false, reason: "cost-required" };
  return { ok: true, reason: null };
}

/**
 * The whole point of Law 15: closing a scene is the mechanical act, not a
 * record of one. Returns what actually happened -- a log line ready for
 * core/log-entry.mjs, and which mocked counter (if any) actually moves.
 * Real for exactly two costs (casualties, an Anchor violated) since those
 * are the two the doc names a concrete downstream effect for; the other
 * five costs are logged honestly but tick nothing, because inventing a
 * Frame-damage/Bleed/technician-day/time counter here would be a second,
 * uncoordinated copy of systems that have (or will have) their own real
 * homes, not a mock of the SHAPE this issue asks for.
 */
export function summarizeClosure({ complete, ending, cost, notes = "" } = {}) {
  const legality = canCloseScene({ complete, ending, cost });
  if (!legality.ok) return { ok: false, reason: legality.reason };

  if (!complete) {
    return {
      ok: true,
      complete: false,
      logLine: notes ? `Scene left open, carries forward. ${notes}` : "Scene left open, carries forward.",
      delta: { casualties: 0, anchorViolations: 0 }
    };
  }

  const endingLabel = findOption(ENDING_OPTIONS, ending).label;
  const costLabel = findOption(COST_OPTIONS, cost).label;
  const delta = {
    casualties: cost === "casualties" ? 1 : 0,
    anchorViolations: cost === "anchor-violated" ? 1 : 0
  };

  const tag = cost === "anchor-violated" ? "anchor: " : "";
  const base = `${tag}Scene closed -- ${endingLabel} / ${costLabel}.`;
  return {
    ok: true,
    complete: true,
    logLine: notes ? `${base} ${notes}` : base,
    delta
  };
}
