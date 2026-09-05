/**
 * Blank Inheritance — module entry point.
 *
 * Thin on purpose: this file only wires Foundry's hook lifecycle to the
 * real logic, which lives in ./core/ (pure, Foundry-free, unit-tested in
 * plain Node — see test/) and ./foundry/ (the Foundry-touching adapter).
 * See design/testing-strategy.md for why the split exists and what each
 * side is and isn't allowed to do.
 *
 * Run the diagnostic test sync from the "Blank Inheritance: Run Test Sync"
 * macro this script creates on first load (GM only), or from the console:
 *   await game.modules.get("blank-inheritance").api.runDiagnosticTestSync()
 */

import { deriveFoundryId, contentHash } from "./core/ids.mjs";
import { runDiagnosticTestSync, createTestSyncMacroIfMissing } from "./foundry/sync.mjs";
import { promptToRunSync } from "./foundry/sync-dialog.mjs";

const MODULE_ID = "blank-inheritance";

Hooks.once("init", () => {
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = { runDiagnosticTestSync, deriveFoundryId, contentHash };
});

Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  try {
    await createTestSyncMacroIfMissing();
  } catch (err) {
    console.error("Blank Inheritance | Could not create the test-sync macro (you can still run it from the console):", err);
  }
});

// GM-only, and Hooks.once means this fires exactly once per client session --
// right as the FIRST scene finishes loading, not on every scene change
// (canvasReady itself fires on every scene activation).
Hooks.once("canvasReady", () => {
  if (!game.user.isGM) return;
  promptToRunSync().catch((err) => console.error("Blank Inheritance | Sync prompt failed:", err));
});
