/**
 * Blank Inheritance — module entry point.
 *
 * Thin on purpose: this file only wires Foundry's hook lifecycle to the
 * real logic, which lives in ./core/ (pure, Foundry-free, unit-tested in
 * plain Node — see test/) and ./foundry/ (the Foundry-touching adapter).
 * See design/testing-strategy.md for why the split exists and what each
 * side is and isn't allowed to do.
 *
 * It also applies the campaign's visual identity (design/visual-identity.md):
 * module.json loads the stylesheets declaratively, and foundry/theme.mjs adds
 * the body classes that gate them plus the SVG filter definitions the
 * redaction bars need. Both are switchable per client from module settings.
 *
 * Run the diagnostic test sync from the "Blank Inheritance: Run Test Sync"
 * macro this script creates on first load (GM only), or from the console:
 *   await game.modules.get("blank-inheritance").api.runDiagnosticTestSync()
 */

import { deriveFoundryId, contentHash } from "./core/ids.mjs";
import {
  runDiagnosticTestSync,
  runRealContentSync,
  createTestSyncMacroIfMissing,
  createRealSyncMacroIfMissing
} from "./foundry/sync.mjs";
import { promptToRunSync } from "./foundry/sync-dialog.mjs";
import { registerThemeSettings, applyTheme } from "./foundry/theme.mjs";

const MODULE_ID = "blank-inheritance";

Hooks.once("init", () => {
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = { runDiagnosticTestSync, runRealContentSync, deriveFoundryId, contentHash, applyTheme };

  // Settings must be registered during init. The stylesheets themselves are
  // loaded declaratively from module.json's `styles`; this only controls the
  // body classes that gate them.
  registerThemeSettings();
});

Hooks.once("ready", async () => {
  // Every client, not just the GM: the theme is what the players look at.
  // Failing here must never block the sync macros below, so it is its own try.
  try {
    applyTheme();
  } catch (err) {
    console.error("Blank Inheritance | Could not apply the interface theme:", err);
  }

  if (!game.user.isGM) return;
  try {
    await createTestSyncMacroIfMissing();
    await createRealSyncMacroIfMissing();
  } catch (err) {
    console.error("Blank Inheritance | Could not create a sync macro (you can still run it from the console):", err);
  }
});

// GM-only, and Hooks.once means this fires exactly once per client session --
// right as the FIRST scene finishes loading, not on every scene change
// (canvasReady itself fires on every scene activation).
Hooks.once("canvasReady", () => {
  if (!game.user.isGM) return;
  promptToRunSync().catch((err) => console.error("Blank Inheritance | Sync prompt failed:", err));
});
