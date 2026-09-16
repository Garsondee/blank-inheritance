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
import { ensureStageVault, syncStage, writeAuthoredCast } from "./foundry/stage.mjs";
import { syncCameraToScene, unlockCamera } from "./foundry/stage-camera.mjs";
import { buildStageDemoScenes, createStageDemoMacroIfMissing } from "./foundry/stage-demo.mjs";
import { announceCastChange, primeStingCache } from "./foundry/sting.mjs";
import { checkForSplash, forceDismissSplash, primeSplashCache, registerSplashSettings } from "./foundry/splash.mjs";
import {
  mountSceneRunner,
  openSceneRunner,
  registerSceneRunnerSettings,
  resetSceneRunnerCache
} from "./foundry/scene-runner.mjs";
import { openInductionTerminal } from "./foundry/induction-terminal.mjs";
import {
  advanceSegment,
  ensureDowntimeVault,
  registerCampaignSettings,
  registerCampaignSocket,
  writePrivateCommitment
} from "./foundry/campaign-state.mjs";
import {
  createEquipmentPanelMacroIfMissing,
  registerEquipmentSettings,
  registerEquipmentSocket
} from "./foundry/equipment-state.mjs";
import { openEquipmentPanel, refreshEquipmentPanel } from "./foundry/equipment-panel.mjs";
import { mountPhone } from "./foundry/phone.mjs";
import { createDirectorPanelMacroIfMissing, openDirectorPanel, refreshDirectorPanel } from "./foundry/director-panel.mjs";
import { registerSceneCloseSettings, openSceneCloseDialogue } from "./foundry/scene-close.mjs";

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
      writeAuthoredCast,
      // Which episode's running order the scene runner is showing. A
      // once-per-session action rather than an in-play one, so it lives on
      // the API rather than taking up room on a panel used mid-scene.
      openSceneRunner,
      resetSceneRunnerCache,
      // Session-zero character creation (design/induction-terminal.md).
      // Deliberately not auto-mounted on ready -- the "opens automatically
      // for a characterless user" trigger isn't built yet, so this is the
      // manual, once-per-player way in until it is. No isGM gate: any user,
      // including the GM previewing it, may open this.
      openInductionTerminal,
      // Kit Issue's inventory UI (GitHub #139). Opened from the macro
      // foundry/equipment-state.mjs creates and from a content link on the
      // Kit Issue journal page -- see that file's MACRO_SOURCE_ID comment.
      // No isGM gate: every player opens the same panel, acting as themselves.
      openEquipmentPanel,
      // Scene cueing (design/foundry-module-design.md §7). GM-only, enforced
      // inside openDirectorPanel itself.
      openDirectorPanel,
      // The scene-close dialogue (design/ux-doctrine.md §10.3a). Reachable
      // from the Director's panel's own button; exposed here too for the
      // same "console access alongside the UI trigger" reason every other
      // panel on this API already is.
      openSceneCloseDialogue
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

  // No onChange here on purpose -- see foundry/splash.mjs#registerSplashSettings's
  // own comment for why this one world setting doesn't need one.
  registerSplashSettings();

  // Which episode is open, which scene inside it, and which beats have
  // happened. All GM-written, all world-scoped: what the table did is a fact
  // about the campaign, not about one browser.
  registerSceneRunnerSettings();

  // Every equipment grant so far. Not secret -- the whole party can see who
  // took what, same as the downtime board -- so onChange repaints any open
  // Equipment Locker on every client the instant one lands, from whichever
  // client actually caused it.
  registerEquipmentSettings(() => refreshEquipmentPanel());

  // The two mocked scene-close counters (design/ux-doctrine.md §10.3a).
  // World-scoped and GM-only to write, same as everything else here.
  registerSceneCloseSettings();
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

  // A player's take/return request travels to the GM's client over this same
  // socket mechanism -- world settings are GM-writable only, so it cannot
  // land any other way. Registered on every client for the same reason as
  // the campaign socket above: each side of the conversation is one of the two.
  try {
    registerEquipmentSocket();
  } catch (err) {
    console.error("Blank Inheritance | Could not open the equipment locker socket:", err);
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

  // The GM's script. Its own try: a panel that fails to mount must not stop
  // the bar or the sync macros. GM-only is enforced inside mountSceneRunner
  // rather than here, so a player's client never constructs the class at all.
  try {
    mountSceneRunner();
  } catch (err) {
    console.error("Blank Inheritance | Could not mount the scene runner:", err);
  }

  // The personal comm device. Every client -- unlike the scene runner, both
  // seats carry a phone, just with a different app list (foundry/phone.mjs's
  // own GM_APPS/PLAYER_APPS). Its own try, same reasoning as every other
  // persistent-chrome mount here.
  try {
    mountPhone();
  } catch (err) {
    console.error("Blank Inheritance | Could not mount the phone:", err);
  }

  if (!game.user.isGM) return;
  try {
    await createTestSyncMacroIfMissing();
    await createRealSyncMacroIfMissing();
    await createStageDemoMacroIfMissing();
    await createEquipmentPanelMacroIfMissing();
    await createDirectorPanelMacroIfMissing();
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

  try {
    mountPhone();
  } catch (err) {
    console.error("Blank Inheritance | Could not re-assert the phone:", err);
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

  // Seed THIS client's memory of who is already on stage, before any diff is
  // possible -- so opening a scene never reads as everyone in it arriving at
  // once. See foundry/sting.mjs's file header for why priming and diffing
  // are deliberately two different entry points rather than one.
  try {
    primeStingCache(canvas?.scene);
  } catch (err) {
    console.error("Blank Inheritance | Could not prime the arrival-sting cache:", err);
  }

  // Splash's own cache, same priming discipline -- and dismissed BEFORE it
  // is primed: a GM switching scenes mid-splash must never leave one
  // orphaned on any client's screen with nothing left to end it.
  try {
    forceDismissSplash();
    primeSplashCache(canvas?.scene);
  } catch (err) {
    console.error("Blank Inheritance | Could not prime the splash cache:", err);
  }
});

// The stage's cast lives on the Scene, so any change to it -- a reveal, a
// re-stage -- has to repaint every client. updateScene fires everywhere.
Hooks.on("updateScene", (scene, changed) => {
  if (scene?.id !== canvas?.scene?.id) return;
  if (!foundry.utils.hasProperty(changed, `flags.${MODULE_ID}.stage`)) return;
  try {
    // syncStage() ALONE, not also refreshStage(). Both used to be called
    // here, back to back -- harmless when every render was stateless, but
    // syncStage() already does a forced render()  whenever the overlay
    // exists, so refreshStage()'s own render() right after was a pure
    // duplicate the whole time, just an invisible one. FOUND LIVE once it
    // stopped being invisible: core/engage.mjs's arrival diff is stateful
    // (StageOverlay#_lastVisibleCast), so the second, redundant render
    // correctly saw the arrival its own predecessor had just recorded and
    // just as correctly decided it was no longer new -- silently eating
    // every entrance animation, one render later than anyone was checking.
    syncStage();
  } catch (err) {
    console.error("Blank Inheritance | Could not refresh the stage:", err);
  }

  // Same event, a second consumer: whether to also sound the banner. Must
  // run off this SAME hook rather than a separate signal, so every client
  // decides from the identical document update landing at the identical
  // moment (design/theatre-of-the-mind-staging.md §5's timing rule).
  try {
    announceCastChange(scene);
  } catch (err) {
    console.error("Blank Inheritance | Could not process the arrival sting:", err);
  }

  // A third consumer of the same event: whether to play a Splash. Its own
  // try, deliberately separate from the banner's above -- a throw in one
  // must never silently swallow the other.
  try {
    checkForSplash(scene);
  } catch (err) {
    console.error("Blank Inheritance | Could not process a splash trigger:", err);
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

// An open Director's panel needs to know when a scene is cued from ANOTHER
// client (its own "now active" marker), or when a Scene is created/deleted
// entirely -- both cheap, both no-ops if the panel isn't open.
for (const hook of ["createScene", "deleteScene", "updateScene"]) {
  Hooks.on(hook, () => {
    refreshDirectorPanel();
  });
}
