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
import { registerThemeSettings, applyTheme } from "./foundry/theme.mjs";
import { mountCommandBar, refreshCommandBar } from "./foundry/command-bar.mjs";
import { PlayerBar } from "./foundry/player-bar.mjs";
import { DirectorBar } from "./foundry/director-bar.mjs";
import { installDeckFitting, noteRoll, resetActionPips } from "./foundry/deck.mjs";
import { loadSessionLog } from "./foundry/session-log.mjs";
import { ensureIntelVault, writeAuthoredProfile } from "./foundry/social-store.mjs";
import { ensureStageVault, syncStage, writeAuthoredCast } from "./foundry/stage.mjs";
import { syncCameraToScene, unlockCamera } from "./foundry/stage-camera.mjs";
import { buildStageDemoScenes, createStageDemoMacroIfMissing } from "./foundry/stage-demo.mjs";
import { buildSceneSet, createSceneSetMacroIfMissing, quarantineStrayScenes, retireOrphanedScenes, retireTemporaryScenes } from "./foundry/scene-build.mjs";
import { registerPaletteKeybinding, registerPaletteSettings, toggleDirectorPalette } from "./foundry/director-palette.mjs";
import { announceCastChange, primeStingCache } from "./foundry/sting.mjs";
import { checkForSplash, forceDismissSplash, primeSplashCache, registerSplashSettings } from "./foundry/splash.mjs";
import {
  mountSceneRunner,
  openSceneRunner,
  registerSceneRunnerSettings,
  resetSceneRunnerCache
} from "./foundry/scene-runner.mjs";
import { openInductionTerminal, createInductionTerminalMacroIfMissing, registerInductionSettings } from "./foundry/induction-terminal.mjs";
import { registerInductionSocket } from "./foundry/induction-relay.mjs";
import { ensureLandingScene } from "./foundry/landing-scene.mjs";
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
import { mountPhone, refreshPhoneLog, registerPetSettings } from "./foundry/phone.mjs";
import { createDemoMacroIfMissing, mountDemoRunner, toggleDemoRunner } from "./foundry/demo-runner.mjs";
import { createTravelTestMacroIfMissing, placeTestFixturesOnWesternEdge } from "./foundry/travel-test-fixtures.mjs";
import { mountConsoleWindow, refreshConsoleWindow } from "./foundry/console-window.mjs";
import { createDirectorPanelMacroIfMissing, openDirectorPanel, refreshDirectorPanel } from "./foundry/director-panel.mjs";
import { createApprovalsDeskMacroIfMissing, openApprovalsDesk } from "./foundry/approvals-desk.mjs";
import { registerSceneCloseSettings, openSceneCloseDialogue } from "./foundry/scene-close.mjs";
import { registerChatExportHooks } from "./foundry/chat-export.mjs";
import { installAudioEngine, registerAudioSettings, registerAudioSocket } from "./foundry/audio-engine.mjs";
import { onCastRevealed, onSegmentChanged, registerAudioDirectorSettings, registerAudioTriggers, runCue } from "./foundry/audio-director.mjs";
import { syncAudioPlaylists } from "./foundry/audio-playlists.mjs";
import { loadAudio, refreshAudio } from "./foundry/audio-store.mjs";
import { mountSoundDesk, refreshSoundDesk, toggleSoundDesk } from "./foundry/sound-desk.mjs";
import { registerAudioEnricher } from "./foundry/audio-enricher.mjs";
import { ensureBronzeTokenRingStyle } from "./foundry/token-ring-style.mjs";
import { healStuckTiles } from "./foundry/tile-resilience.mjs";
import { registerTravelCameraHook } from "./foundry/travel-camera.mjs";
import { registerTravelTrailHook } from "./foundry/travel-trail.mjs";
import { mountSessionRail, noteSceneActivated, refreshSessionRail, registerSessionRailSettings } from "./foundry/session-rail.mjs";
import { playOpeningForTable, registerOpeningSocket, registerOpeningTitleSettings } from "./foundry/opening-titles.mjs";
import { createLocationEditorMacroIfMissing, openLocationEditor, registerLocationEditorHooks } from "./foundry/location-editor.mjs";
import { registerLocationDrawKeybindings, registerLocationDrawLayer } from "./foundry/location-draw-layer.mjs";

const MODULE_ID = "blank-inheritance";

Hooks.once("init", () => {
  // Must happen during init, before canvas.mjs builds the layer stack from
  // CONFIG.Canvas.layers -- registering later would build the Campaign Map
  // scene's canvas with no locationDraw layer in it at all.
  registerLocationDrawLayer();
  registerLocationDrawKeybindings();
  registerLocationEditorHooks();
  const mod = game.modules.get(MODULE_ID);
  // writeAuthoredProfile is exposed rather than only called from a pipeline
  // because nothing yet carries an authored socialProfile from data/npcs into
  // the vault. The store is finished and so, now, is the first tranche of
  // content: nine recurring NPCs across Episodes One and Two have real Facts
  // and Attitudes (data/npcs/*.json, guarded by
  // test/tier2-npc-social-profiles.test.mjs). This is how one gets seeded by
  // hand until a sync step carries them automatically.
  if (mod) {
    mod.api = {
      // The Location Editor (design/location-editor.md): GM-only, enforced
      // inside openLocationEditor itself.
      openLocationEditor,
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
      // Six temporary, clearly-marked test PCs for verifying map travel end
      // to end (#175) — a diagnostic aid, not a production feature. Has its
      // own macro too; exposed here the same way buildStageDemoScenes is.
      placeTestFixturesOnWesternEdge,
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
      // The Approvals Desk (design/approvals-desk.md, issue #170). GM-only,
      // enforced inside openApprovalsDesk itself.
      openApprovalsDesk,
      // The scene-close dialogue (design/ux-doctrine.md §10.3a). Reachable
      // from the Director's panel's own button; exposed here too for the
      // same "console access alongside the UI trigger" reason every other
      // panel on this API already is.
      openSceneCloseDialogue,
      // The Sound Desk (design/audio-system.md). `syncAudioPlaylists` is the
      // once-per-library-change build step, exposed the same way the sync
      // macros are; the rest is the console-friendly way into what the desk's
      // own controls do, and what a macro or a journal link calls.
      toggleSoundDesk,
      syncAudioPlaylists,
      loadAudio,
      refreshAudio,
      runCue,
      // The real Scene set (data/campaign/scene-set.json): the landing scene,
      // one per beat of the story, the rooms inside them, and the campaign map
      // they are reached from. Idempotent -- running it twice changes nothing.
      buildSceneSet,
      retireTemporaryScenes,
      retireOrphanedScenes,
      quarantineStrayScenes,
      // The three calls above, run in the same order and with the same
      // notify settings as the automatic canvasReady hook below -- the
      // console-friendly way to re-trigger a full sync without reloading
      // Foundry, e.g. right after pushing new campaign data.
      runAutomaticSync,
      // One search box for everything a GM can do, Ctrl+K. Half of it is our
      // own machinery, half is Foundry's own; the group that sorts first is
      // the one for when the table went somewhere nobody wrote down.
      toggleDirectorPalette,
      // The opening titles on every screen (foundry/opening-titles.mjs). The
      // session rail's Opening key and the Palette call this; GM-only, and it
      // asks first unless called with { confirm: false }.
      playOpeningForTable,
      // The demo/walkthrough runner's own macro calls this directly
      // (ideas/entries/ui-demo-walkthrough-system.json) -- the console-
      // friendly way in, same reason every other panel is on this API too.
      toggleDemoRunner
    };
  }

  // Settings must be registered during init. The stylesheets themselves are
  // loaded declaratively from module.json's `styles`; this only controls the
  // body classes that gate them.
  registerThemeSettings();
  registerPaletteSettings();
  registerPaletteKeybinding();

  // The campaign clock is a world setting, so its onChange fires on EVERY
  // client -- which is what makes a segment transition arrive at the whole
  // table at once instead of only where it was clicked. The day ring turning
  // is also one of the audio director's own trigger events (the segment
  // ceremony's sound cue, ux-doctrine §7a) -- fired from here rather than
  // from inside campaign-state.mjs, which knows nothing about audio.
  registerCampaignSettings((moment) => {
    refreshCommandBar();
    onSegmentChanged(moment).catch((err) => console.error("Blank Inheritance | Could not fire the segment audio cue:", err));
  });

  // The mix every client shares (world) and the mixer's own kill switch
  // (client). Registered in init like every other setting; the nodes
  // themselves cannot exist until the audio contexts do -- see ready below.
  registerAudioSettings(() => refreshSoundDesk());
  registerAudioDirectorSettings(() => refreshSoundDesk());

  // `@Cue[...]` links in journals and chat. Registered in init because
  // enrichers have to exist before any content is enriched.
  registerAudioEnricher();

  // The travel camera (design note: foundry/travel-camera.mjs's own
  // header) — every connected client's own view follows the crossing,
  // driven by the SAME updateToken event Foundry already sends everyone
  // for the marker's own movement, not a second, parallel broadcast.
  registerTravelCameraHook();

  // The travel trail (foundry/travel-trail.mjs) — same updateToken event,
  // same reasoning: a real line behind and ahead of every in-motion token,
  // coloured by its own real mode per hop.
  registerTravelTrailHook();

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

  // The scene-close review counter -- how many scenes are waiting to be gone
  // through in the session review. World-scoped and GM-only to write, same as
  // everything else here. It replaced the two MOCKED counters (casualties,
  // Anchor violations) in the 2026-09-22 dialogue rebuild, since the only
  // things that fed those were cost options naming CUT systems.
  registerSceneCloseSettings();

  // Whether the induction terminal shows FORM 1-B, the Service Agreement, as its
  // second page. World-scoped, off by default: the text is drafted and stays
  // hidden from players until Ingram has graded it (design/induction-agreement.md).
  registerInductionSettings();

  // The phone's Pet app. Client-scoped on purpose -- "purely textural, zero
  // mechanical weight" per the idea entry, so it is genuinely each player's
  // (and the GM's) own, never a world setting the whole table watches change.
  registerPetSettings();

  // The session rail's evening (start, end, and whether to show it at all).
  // Client-scoped: the GM's own clock on the GM's own machine.
  registerSessionRailSettings(() => refreshSessionRail());

  // The opening titles: each player's remembered cut (client scope, in Game
  // Settings, so they can change or clear it) and the folder the two videos
  // are served from (world scope, which Foundry shows only to a GM).
  registerOpeningTitleSettings();
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
    // The idle "home base" scene (design/foundry-module-design.md §7) a
    // freshly-created character's token lands on. Check-then-create, same as
    // the vaults above -- a second ready hook (reload, second GM client) must
    // never touch a scene that's already accumulating real player tokens.
    try {
      await ensureLandingScene();
    } catch (err) {
      console.error("Blank Inheritance | Could not create the landing scene:", err);
    }
    // design/harvest-inference.md: nothing exported the chat log for
    // sync-harvest.mjs to pull down until now. Its own internal GM check
    // makes this redundant with the surrounding `if`, kept anyway so this
    // block reads as a complete, self-contained list of what a GM's ready
    // hook sets up.
    try {
      registerChatExportHooks();
    } catch (err) {
      console.error("Blank Inheritance | Could not register the chat export:", err);
    }
    // Every Actor this pipeline creates carries a Dynamic Ring (token-ring.mjs)
    // — this is the one-time world-level move that makes it render in bronze
    // rather than core's own default steel. Its own try: a style mismatch is
    // cosmetic, never worth blocking the rest of ready on.
    try {
      await ensureBronzeTokenRingStyle();
    } catch (err) {
      console.error("Blank Inheritance | Could not set the bronze token ring style:", err);
    }
  }

  // Both directions: a GM listening for players asking to spend a slice, and a
  // player receiving their own private commitments. Registered on every client
  // because each end of that conversation is one of the two.
  try {
    // The downtime selector lives on the deck's right shoulder.
    registerCampaignSocket(() => refreshCommandBar(["right"]));
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

  // A player's Page 9 confirm needs an Actor created on their behalf by the
  // GM's client (Foundry's default ACTOR_CREATE permission excludes plain
  // Players -- see foundry/induction-relay.mjs's header). Same registration
  // shape as the two sockets just above, for the same reason: every client
  // is one of the two possible sides of this conversation.
  try {
    registerInductionSocket();
  } catch (err) {
    console.error("Blank Inheritance | Could not open the induction terminal socket:", err);
  }

  // The opening titles: every client hears the GM start them (and chooses
  // its own cut), and a GM's client hears a player's screen report a file
  // that would not play. Same every-client registration as the three above.
  try {
    registerOpeningSocket();
  } catch (err) {
    console.error("Blank Inheritance | Could not open the opening-titles socket:", err);
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

  // The deck is drawn at one authored size and scaled to fit between whatever
  // Foundry has claimed at the bottom corners, so it has to hear about window
  // resizes and the sidebar opening. Its own try: a fit that fails leaves a
  // deck at scale 1, which is still usable.
  try {
    installDeckFitting();
  } catch (err) {
    console.error("Blank Inheritance | Could not install the deck's fitting:", err);
  }

  // The session rail across the top of the GM's screen (2026-09-23). GM-only
  // is enforced inside mountSessionRail, same as the scene runner below. The
  // scene that is live as the GM arrives opens tonight's timeline.
  try {
    if (game.user.isGM) noteSceneActivated(game.scenes?.active?.name ?? null);
    mountSessionRail();
  } catch (err) {
    console.error("Blank Inheritance | Could not mount the session rail:", err);
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

  // The audio chain, on every client. Splicing our buses into Foundry's own
  // three contexts can only happen after they exist, which is after the first
  // user gesture -- installAudioEngine awaits game.audio.unlock itself. Its
  // own try: if the mixer fails to install, Foundry's plain routing is still
  // in place and the table still hears everything.
  try {
    registerAudioSocket();
    installAudioEngine().catch((err) => console.error("Blank Inheritance | Could not install the audio mixer:", err));
    registerAudioTriggers();
  } catch (err) {
    console.error("Blank Inheritance | Could not set up audio:", err);
  }

  // The GM's mixing console, and the library behind it. GM-only (its own
  // isGM guard); the library load is deliberately not awaited, so a missing
  // or half-synced audio library delays nothing else on the way in.
  if (game.user.isGM) {
    try {
      loadAudio().catch((err) => console.error("Blank Inheritance | Could not load the audio library:", err));
      mountSoundDesk();
    } catch (err) {
      console.error("Blank Inheritance | Could not mount the sound desk:", err);
    }
  }

  // The Console -- the full mimetic sheet/dashboard. Every client, same
  // toggleable-panel shape as the phone; foundry/console-window.mjs's own
  // seat check picks Overview/Skills/Strikes/Spells/Gear for everyone plus
  // Party/Hub/Log for a GM, so there is nothing to branch on here.
  try {
    mountConsoleWindow();
  } catch (err) {
    console.error("Blank Inheritance | Could not mount the console:", err);
  }

  // The demo/walkthrough runner (ideas/entries/ui-demo-walkthrough-system.json,
  // greenlit 2026-09-18) -- GM-only (mountDemoRunner's own isGM guard), same
  // toggleable-panel shape as the phone.
  try {
    mountDemoRunner();
  } catch (err) {
    console.error("Blank Inheritance | Could not mount the demo runner:", err);
  }

  // A characterless Player is a real player who hasn't finished session
  // zero yet -- the whole point of the terminal. Found live 2026-09-16,
  // running a full walkthrough as a genuine new player: without this,
  // nothing at all told them how to reach it (see induction-terminal.mjs's
  // own header). GM-excluded on purpose -- a GM doing prep work with no
  // character of their own must never have this forced open on every reload.
  if (!game.user.isGM && !game.user.character) {
    try {
      openInductionTerminal();
    } catch (err) {
      console.error("Blank Inheritance | Could not auto-open the induction terminal:", err);
    }
  }

  if (!game.user.isGM) return;
  try {
    await createTestSyncMacroIfMissing();
    await createRealSyncMacroIfMissing();
    await createStageDemoMacroIfMissing();
    await createSceneSetMacroIfMissing();
    await createLocationEditorMacroIfMissing();
    await createEquipmentPanelMacroIfMissing();
    await createDirectorPanelMacroIfMissing();
    await createApprovalsDeskMacroIfMissing();
    await createInductionTerminalMacroIfMissing();
    await createDemoMacroIfMissing();
    await createTravelTestMacroIfMissing();
  } catch (err) {
    console.error("Blank Inheritance | Could not create a sync macro (you can still run it from the console):", err);
  }
});

// Ingram's own request, 2026-09-19: "I wouldn't even see a dialogue that I
// have to confirm, every time I load Foundry it just updates, adds or
// removes scenes to get us to the current state of the adventure." Replaces
// the old confirm-first promptToRunSync (sync-dialog.mjs, now deleted).
// Content first, then the scene set built from it, then anything the scene
// set no longer names -- each step gets its own try, same as every other
// multi-step block in the ready hook above, so one failing step never
// silently cancels the others (sync.mjs's own per-case isolation already
// means one bad case inside runRealContentSync won't even get this far).
// Never silent either way: each step's own whispered chat report and
// ui.notifications summaries are unchanged, so a real problem is still
// visible without ever blocking on a click to find out.
async function runAutomaticSync() {
  try {
    await runRealContentSync();
  } catch (err) {
    console.error("Blank Inheritance | Automatic content sync failed:", err);
  }
  try {
    await buildSceneSet({ notify: true });
  } catch (err) {
    console.error("Blank Inheritance | Automatic scene build failed:", err);
  }
  try {
    await retireOrphanedScenes({ notify: true });
  } catch (err) {
    console.error("Blank Inheritance | Automatic orphaned-scene cleanup failed:", err);
  }
}

// GM-only, and Hooks.once means this fires exactly once per client session --
// right as the FIRST scene finishes loading, not on every scene change
// (canvasReady itself fires on every scene activation).
Hooks.once("canvasReady", () => {
  if (!game.user.isGM) return;
  runAutomaticSync().catch((err) => console.error("Blank Inheritance | Automatic sync failed:", err));
});

// NOT GM-gated, unlike the sync hook above -- see tile-resilience.mjs's own
// header for why. Hooks.on, not once: canvasReady fires per scene activation,
// and any scene's own tiles can independently hit the race in any client.
Hooks.on("canvasReady", () => {
  healStuckTiles().catch((err) => console.error("Blank Inheritance | Tile self-heal pass failed:", err));
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

  try {
    mountConsoleWindow();
  } catch (err) {
    console.error("Blank Inheritance | Could not re-assert the console:", err);
  }

  try {
    mountDemoRunner();
  } catch (err) {
    console.error("Blank Inheritance | Could not re-assert the demo runner:", err);
  }

  try {
    mountSoundDesk();
  } catch (err) {
    console.error("Blank Inheritance | Could not re-assert the sound desk:", err);
  }

  try {
    mountSessionRail();
  } catch (err) {
    console.error("Blank Inheritance | Could not re-assert the session rail:", err);
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

  // A fourth consumer: the Deck's own "Staged" chip (2026-09-18 unification)
  // reads this same cast, and without this it only ever showed whatever was
  // true at its OWN last render -- found live the moment a demo staged
  // someone and the Deck kept reporting zero until something ELSE happened
  // to repaint it. GM-only zone, same scoped refresh the segment/log writers
  // already use, not a full-panel re-render for a two-word chip.
  try {
    refreshCommandBar(["right"]);
  } catch (err) {
    console.error("Blank Inheritance | Could not refresh the deck's staged count:", err);
  }
});

// The Deck's "Playing" chip has the identical staleness problem as the
// "Staged" one just above, for the identical reason -- audio-director.mjs's
// own trigger for a scene bringing its own soundscape with it is a document
// update (applySoundscape's playlist writes), not a setting, so nothing told
// the Deck to look again. Scoped to the one case that actually matters here
// (a NEW scene activating, which is what SCENE -> MAP -> SCENE's own
// destination cut fires): a mid-scene cue changing the music without any
// scene or stage change is a known, accepted gap, not chased here.
Hooks.on("updateScene", (scene, changed) => {
  if (changed?.active !== true) return;
  try {
    refreshCommandBar(["right"]);
  } catch (err) {
    console.error("Blank Inheritance | Could not refresh the deck's now-playing chip:", err);
  }
  // The same activation starts a new band on the GM's session rail. Kept in
  // the GM's own browser, not the log (foundry/session-rail.mjs says why).
  try {
    if (game.user?.isGM) {
      noteSceneActivated(scene?.name ?? null);
      refreshSessionRail();
    }
  } catch (err) {
    console.error("Blank Inheritance | Could not mark the scene change on the session rail:", err);
  }
});

// Any log entry, from anywhere — the deck's own field, the Scene Runner, the
// Palette, the rail's Mark key — repaints the two things that draw the log:
// the Director's log shoulder and the session rail's pins. Found live
// 2026-09-23: before this, the deck showed only what was typed on the deck.
Hooks.on("blank-inheritance.logEntry", () => {
  if (!game.user?.isGM) return;
  try {
    refreshCommandBar(["right"]);
    refreshSessionRail();
    // The two other places the whole log is readable: the Comms handset's
    // Session Log and the Console's Log tab — each a no-op unless it is the
    // thing actually on screen.
    refreshPhoneLog();
    refreshConsoleWindow();
  } catch (err) {
    console.error("Blank Inheritance | Could not repaint the log displays:", err);
  }
});

// A character taking the stage is an audio trigger too: a villain can have a
// theme that plays when they appear (Ingram, 2026-09-17). foundry/splash.mjs
// announces the moment; the director decides whether any cue answers it.
Hooks.on("blank-inheritance.splash", (event) => {
  onCastRevealed(event).catch((err) => console.error("Blank Inheritance | Could not fire an arrival's audio cue:", err));
});

// The Director's deck belongs to whatever is selected — both key banks, the
// defences and the instrument's needle — so a selection change repaints all
// of it. Debounced because switching selection fires this twice (release the
// old token, control the new one), and two renders of the whole deck for one
// click is waste the GM would see as a flicker.
const refreshForSelection = foundry.utils.debounce(() => {
  refreshCommandBar();
  // The console's own sheet tabs read the same actorForSeat(DIRECTOR)
  // selection-or-fallback, so a GM's console needs the same nudge.
  refreshConsoleWindow();
}, 40);
Hooks.on("controlToken", () => {
  if (!game.user?.isGM) return;
  refreshForSelection();
});

// The deck and every console sheet tab read the live actor fresh on every
// render (never cached), so the correct fix for "something on the sheet
// changed" is just "render again" -- no diffing needed. The whole deck, not
// just the side tracks: the instrument's needle reads hit points. This fires
// far more often than strictly necessary, but a missed refresh reads as a
// stale, wrong number on a console whose whole point is Law 1 -- the safer
// failure direction is "renders once too often".
for (const hook of ["updateActor", "createItem", "updateItem", "deleteItem"]) {
  Hooks.on(hook, () => {
    refreshCommandBar();
    refreshConsoleWindow();
  });
}

// The instrument reads out the last check rolled for whoever the deck is
// showing. createChatMessage fires on every client that receives the message,
// and noteRoll ignores anything this viewer cannot see.
Hooks.on("createChatMessage", (message) => {
  try {
    noteRoll(message);
  } catch (err) {
    console.error("Blank Inheritance | Could not read a roll onto the deck:", err);
  }
});

// The action pips on the instrument's bezel are a finger on a list: when a
// creature's turn comes round, its three actions and reaction are all back.
Hooks.on("combatTurnChange", (combat, _prior, current) => {
  resetActionPips(combat?.combatants?.get(current?.combatantId)?.actor ?? null);
});
Hooks.on("combatStart", (combat) => {
  resetActionPips(combat?.combatant?.actor ?? null);
});

// A player's own character gets assigned well after the bar first mounts --
// the induction terminal self-assigns user.character once creation
// succeeds (foundry/induction-terminal.mjs), long after Page 1's opening
// render. Found live 2026-09-16: the checks panel kept showing "no
// character assigned" for a freshly-created player until a manual reload,
// because nothing told the bar this had changed. Every client gets this
// update (updateUser fires everywhere a User document changes), but only
// the affected user's own `character` field is worth a repaint here.
Hooks.on("updateUser", (user, changes) => {
  if (user.id !== game.user.id || !("character" in changes)) return;
  refreshCommandBar();
  refreshConsoleWindow();
});

// The mode is derived from combat state rather than stored, so these are
// exactly the moments it can change underneath us.
// createCombat/createCombatant/updateCombatant/deleteCombatant joined the list
// 2026-09-23: the flank keys (Initiative, Turn) and the board's turn order
// read the encounter itself, so an encounter being built or an initiative
// being rolled changes the deck too.
for (const hook of [
  "combatStart", "combatRound", "combatTurn", "combatTurnChange", "deleteCombat",
  "createCombat", "createCombatant", "updateCombatant", "deleteCombatant"
]) {
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
