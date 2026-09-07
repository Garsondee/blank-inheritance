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
import { mountCommandBar, refreshCommandBar } from "./foundry/command-bar.mjs";
import { PlayerBar } from "./foundry/player-bar.mjs";
import { DirectorBar } from "./foundry/director-bar.mjs";
import { loadSessionLog } from "./foundry/session-log.mjs";
import { ensureIntelVault, writeAuthoredProfile } from "./foundry/social-store.mjs";
import { ensureStageVault, refreshStage, syncStage, writeAuthoredCast } from "./foundry/stage.mjs";
import { syncCameraToScene, unlockCamera } from "./foundry/stage-camera.mjs";
import { buildStageDemoScenes, createStageDemoMacroIfMissing } from "./foundry/stage-demo.mjs";
import {
  advanceSegment,
  ensureDowntimeVault,
  registerCampaignSettings,
  registerCampaignSocket,
  writePrivateCommitment
} from "./foundry/campaign-state.mjs";

const MODULE_ID = "blank-inheritance";

Hooks.once("init", () => {
  const mod = game.modules.get(MODULE_ID);
  // writeAuthoredProfile is exposed rather than only called from a pipeline
  // because no NPC has an authored socialProfile yet -- the store is finished,
  // the content is not. This is how a profile gets seeded until the sync
  // pipeline carries them (see GitHub #131).
  if (mod) {
    mod.api = {
      runDiagnosticTestSync,
      runRealContentSync,
      deriveFoundryId,
      contentHash,
      applyTheme,
      ensureIntelVault,
      writeAuthoredProfile,
      // No control writes a private commitment yet -- the vault and the socket
      // delivery are finished, the GM-side authoring UI is not. Exposed the
      // same way and for the same reason as writeAuthoredProfile above.
      writePrivateCommitment,
      advanceSegment,
      // Staging is GM-authored content with no authoring UI yet, exactly like
      // writeAuthoredProfile above. buildStageDemoScenes also has its own
      // macro; this is the console-friendly way in.
      buildStageDemoScenes,
      writeAuthoredCast
    };
  }

  // Settings must be registered during init. The stylesheets themselves are
  // loaded declaratively from module.json's `styles`; this only controls the
  // body classes that gate them.
  registerThemeSettings();

  // The campaign clock is a world setting, so its onChange fires on EVERY
  // client -- which is what makes a segment transition arrive at the whole
  // table at once instead of only where it was clicked.
  registerCampaignSettings(() => refreshCommandBar());
});

Hooks.once("ready", async () => {
  // Every client, not just the GM: the theme is what the players look at.
  // Failing here must never block the sync macros below, so it is its own try.
  try {
    applyTheme();
  } catch (err) {
    console.error("Blank Inheritance | Could not apply the interface theme:", err);
  }

  // A GM who reloads mid-evening continues the same session file rather than
  // starting a second one that would overwrite the first.
  if (game.user.isGM) {
    try {
      await loadSessionLog(new Date().toISOString());
    } catch (err) {
      console.error("Blank Inheritance | Could not load today's session log:", err);
    }
    try {
      await ensureDowntimeVault();
    } catch (err) {
      console.error("Blank Inheritance | Could not open the private downtime vault:", err);
    }
    try {
      await ensureStageVault();
    } catch (err) {
      console.error("Blank Inheritance | Could not open the staged-cast vault:", err);
    }
  }

  // Both directions: a GM listening for players asking to spend a slice, and a
  // player receiving their own private commitments. Registered on every client
  // because each end of that conversation is one of the two.
  try {
    registerCampaignSocket(() => refreshCommandBar(["left"]));
  } catch (err) {
    console.error("Blank Inheritance | Could not open the campaign socket:", err);
  }

  // The console. Every client, both seats -- the class is picked here once and
  // never switched, so a player's browser never constructs the Director's
  // board at all. Its own try: a bar that fails to mount must not stop the
  // sync macros below from being created.
  try {
    mountCommandBar(game.user.isGM ? DirectorBar : PlayerBar);
  } catch (err) {
    console.error("Blank Inheritance | Could not mount the command bar:", err);
  }

  if (!game.user.isGM) return;
  try {
    await createTestSyncMacroIfMissing();
    await createRealSyncMacroIfMissing();
    await createStageDemoMacroIfMissing();
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

// Re-assert the bar on every scene change. Cheap, and idempotent by way of
// CommandBar#_insertElement replacing a same-id node rather than stacking a
// second one. Hooks.on, not once: canvasReady fires per scene activation, and
// it fires BEFORE ready on first load, so this is usually the first mount and
// the ready hook above is the safety net for a world with no canvas.
//
// Braces on purpose: canvasReady is dispatched with Hooks.call, so returning
// false from any listener silently suppresses every other one. Returning
// undefined can never do that.
Hooks.on("canvasReady", () => {
  try {
    mountCommandBar(game.user.isGM ? DirectorBar : PlayerBar);
  } catch (err) {
    console.error("Blank Inheritance | Could not re-assert the command bar:", err);
  }

  // The stage, and the camera lock that makes a staged scene a picture rather
  // than a map. Both are no-ops on an ordinary scene, and syncCameraToScene
  // actively UNDOES the lock when leaving one -- a prototype override left in
  // place after the GM switches to a battle map would freeze the camera on a
  // map people need to pan.
  try {
    syncStage();
    syncCameraToScene();
  } catch (err) {
    console.error("Blank Inheritance | Could not sync the stage to this scene:", err);
    // Never leave the camera pinned because our own code threw on the way in.
    unlockCamera();
  }
});

// The stage's cast lives on the Scene, so any change to it -- a reveal, a
// re-stage -- has to repaint every client. updateScene fires everywhere.
Hooks.on("updateScene", (scene, changed) => {
  if (scene?.id !== canvas?.scene?.id) return;
  if (!foundry.utils.hasProperty(changed, `flags.${MODULE_ID}.stage`)) return;
  try {
    syncStage();
    refreshStage();
  } catch (err) {
    console.error("Blank Inheritance | Could not refresh the stage:", err);
  }
});

// The Director's checks belong to whatever is selected, so a selection change
// changes what the bar is showing. Only the right track needs repainting,
// which is what render({parts}) is for.
Hooks.on("controlToken", () => {
  if (!game.user?.isGM) return;
  refreshCommandBar(["right"]);
});

// The mode is derived from combat state rather than stored, so these are
// exactly the moments it can change underneath us.
for (const hook of ["combatStart", "combatRound", "combatTurn", "combatTurnChange", "deleteCombat"]) {
  Hooks.on(hook, () => {
    refreshCommandBar();
  });
}
