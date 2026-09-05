import { runDiagnosticTestSync } from "./sync.mjs";

/**
 * Interim step toward GH issue #82's real production Sync button: instead of
 * requiring the GM to dig into the Macro directory, offer a one-click prompt
 * right when their session starts. Still runs the exact same
 * runDiagnosticTestSync() under the hood -- this changes only how/when it's
 * triggered, not what it does.
 *
 * Wired from Hooks.once("canvasReady", ...) in blank-inheritance.mjs, so
 * this fires exactly once per client session, right as the first scene
 * finishes loading -- not on every subsequent scene change (canvasReady
 * itself fires on every scene activation; Hooks.once is what limits it to
 * the first one, confirmed against the real hook call site in
 * foundryvtt's client/canvas/board.mjs).
 */
export async function promptToRunSync() {
  const proceed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("BLANKINHERITANCE.SyncPrompt.Title") },
    content: `<p>${game.i18n.localize("BLANKINHERITANCE.SyncPrompt.Body")}</p>`,
    yes: { label: game.i18n.localize("BLANKINHERITANCE.SyncPrompt.Yes") },
    no: { label: game.i18n.localize("BLANKINHERITANCE.SyncPrompt.No") },
    rejectClose: false
  });
  if (proceed) await runDiagnosticTestSync();
}
