/**
 * The demo/walkthrough runner — the Foundry-touching half of core/demo.mjs.
 *
 * ideas/entries/ui-demo-walkthrough-system.json, greenlit 2026-09-18 as the
 * proof for that same day's integration pass: "a nice big obvious button to
 * access a menu of possible demos... anything which breaks should break
 * during the demo because we always run real commands on the real server."
 *
 * Every step below either calls the exact exported function a macro/menu
 * click would use (openSceneRunner — there is no pre-existing button for
 * "start a session," a GM would run this from a macro too), or clicks a REAL
 * button on the REAL rendered Scene Runner / Deck, the same element a GM's
 * own mouse would land on. A step that cannot find its element, or whose
 * expected end state never arrives, throws — visibly stalling the demo at
 * exactly that step, which is the whole point: a renamed data-action or a
 * broken wire shows up here before it shows up live at the table.
 *
 * A menu of possible demos, per the idea's own framing — DEMOS is an array
 * for exactly that reason, even though only one exists today.
 */

import { advanceDemo, demoState, retreatDemo, validateDemo } from "../core/demo.mjs";
import { demoPartyPlan } from "../core/demo-party.mjs";
import { sceneCalibration } from "../core/travel-animation.mjs";
import { resolveTokenRing } from "../core/generators/token-ring.mjs";
import { SEATS } from "../core/console-model.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { getSceneRunner, openSceneRunner } from "./scene-runner.mjs";
import { soundDeskState } from "./sound-desk.mjs";
import { campaignMapImageWidth, convergeTokensOnHub, hubScene } from "./travel.mjs";
import { frameCameraOn } from "./travel-camera.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/demo`;

// Matches scene-runner.mjs's own SETTING_BRIEF key exactly — that file does
// not export a getter for it (currentBriefId is a private module const
// there), so this reads the same world setting directly by its known name
// rather than duplicating scene-runner's own internals.
const SETTING_BRIEF = "runnerBrief";
const EPISODE_ID = "episode-c1e1-mothers-maiden-name";

function currentBriefId() {
  return game.settings.get(MODULE_ID, SETTING_BRIEF) || "";
}

function stagedSting(portraitId) {
  const cast = canvas?.scene?.getFlag(MODULE_ID, "stage")?.cast ?? [];
  return cast.find((m) => m.portraitId === portraitId)?.sting ?? null;
}

/** Foundry's own deterministic scene id for a scene-set.json entry — the same derivation foundry/scene-build.mjs used to create it. */
function sceneFoundryId(sourceId) {
  return deriveFoundryId(`scene-${sourceId}`);
}

const DEMO_PARTY_FLAG = "demoParty";

/**
 * Create-or-move the six demo candidate tokens onto the hub scene, at their
 * real mainland positions — the exact same plan tools/foundry-macros/
 * scatter-party.js produces, run here instead so the demo button does it
 * without a separate macro paste. Idempotent: a re-run moves the same six
 * tokens rather than creating duplicates.
 */
async function scatterDemoParty() {
  const hub = await hubScene();
  if (!hub) throw new Error("No campaign-map hub scene in this world — build it before running this demo.");
  const imageWidth = await campaignMapImageWidth();
  const calibration = sceneCalibration(hub.tiles?.contents ?? [], hub.width, imageWidth ?? hub.width);
  const plan = await demoPartyPlan(calibration);

  for (const p of plan) {
    let actor = game.actors.get(p.actorId);
    if (!actor) {
      [actor] = await Actor.createDocuments([{
        _id: p.actorId,
        name: p.label,
        type: "character",
        img: p.portrait,
        // The same Dynamic Token Ring every real Actor this pipeline
        // creates carries automatically (CLAUDE.md, core/generators/
        // token-ring.mjs) -- these six are temporary demo fixtures, not a
        // real chargen decision, but they should still LOOK like real
        // production tokens, which is the whole point of the art work
        // this same day. "character" reads as the party's own cyan ring.
        // Linked: Actor.createDocuments does not apply sf2e's own "a character's token is linked"
        // default (Actor.create does), and an unlinked token's synthetic actor can loop forever
        // on an INHERIT ownership entry (core/ownership.mjs).
        prototypeToken: { ring: resolveTokenRing("character", {}), actorLink: true },
        flags: { [MODULE_ID]: { [DEMO_PARTY_FLAG]: true, originRef: p.originRef } }
      }], { keepId: true });
    }
    const existing = hub.tokens.get(p.tokenId);
    if (existing) {
      // "texture.src"/"ring" heal a token placed before the real portrait
      // art (2026-09-23) or the ring (2026-09-23, later the same day)
      // landed — a re-run picks up both instead of leaving the old
      // placeholder in place forever.
      // actorLink heals a token placed before these were linked.
      await existing.update({ x: p.x, y: p.y, "texture.src": p.portrait, ring: resolveTokenRing("character", {}), actorLink: true });
    } else {
      await hub.createEmbeddedDocuments("Token", [{
        _id: p.tokenId,
        actorId: actor.id,
        actorLink: true,
        name: p.label,
        x: p.x,
        y: p.y,
        width: 1,
        height: 1,
        texture: { src: p.portrait },
        ring: resolveTokenRing("character", {}),
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        flags: { [MODULE_ID]: { [DEMO_PARTY_FLAG]: true, originRef: p.originRef } }
      }], { keepId: true });
    }
  }

  // The establishing shot Ingram asked for, 2026-09-23: "keeping the entire
  // party in focus" before the crossing narrows in on it — every scattered
  // candidate framed together, the moment they're all actually placed.
  frameCameraOn(hub, plan.map((p) => ({ x: p.x, y: p.y })));

  return plan.length;
}

/**
 * Undo scatterDemoParty (and anything downstream of it) so "The Road In"
 * can be re-run from a genuinely clean slate — Ingram's own ask, 2026-09-23:
 * "I have no way to reset things currently to before 'The Road In' so that
 * I can test that first transition." Deletes the six candidate Actors and
 * Tokens outright rather than trying to move them back — scatterDemoParty
 * already recreates them fresh on its own next run, so there is nothing
 * worth preserving — and cuts the table back to The Road In itself.
 */
async function resetRoadInDemo() {
  const hub = await hubScene();
  if (hub) {
    const plan = await demoPartyPlan({ originX: 0, originY: 0, scale: 1 });
    const tokenIds = plan.map((p) => p.tokenId).filter((id) => hub.tokens.has(id));
    if (tokenIds.length > 0) await hub.deleteEmbeddedDocuments("Token", tokenIds);
    const actorIds = plan.map((p) => p.actorId).filter((id) => game.actors.has(id));
    if (actorIds.length > 0) await Actor.deleteDocuments(actorIds);
  }
  const targetId = await sceneFoundryId("e1-the-road-in");
  const target = game.scenes.get(targetId);
  if (target) await target.activate();
  ui.notifications.info("Reset — the six candidates are cleared and the table is back at The Road In.");
}

async function waitUntil(predicate, { timeoutMs = 6000, intervalMs = 100, onTimeout } = {}) {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return;
    if (Date.now() - start >= timeoutMs) throw new Error(onTimeout ?? "timed out waiting for the expected state");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Click a real button on the real rendered Scene Runner.
 *
 * Waits briefly for the element to exist first — #onPickScene's own
 * `game.settings.set(...)` resolves before its OWN subsequent `this.render()`
 * repaints the DOM, and a raw `.click()` never awaits the handler it invokes
 * anyway, so a step that just changed the brief and immediately looks for
 * the NEW brief's own backdrop button can otherwise run a beat ahead of the
 * panel's own re-render (found live 2026-09-18, mid-demo, on exactly this
 * sequence). Still throws loudly, same as before, once the short wait is
 * actually exhausted — a genuinely moved/renamed data-action must still
 * stall the demo, not silently skip the step.
 */
async function clickOnRunner(selector, { timeoutMs = 2000 } = {}) {
  const start = Date.now();
  for (;;) {
    const element = getSceneRunner()?.element?.querySelector(selector);
    if (element) return element.click();
    if (Date.now() - start >= timeoutMs) throw new Error(`Could not find "${selector}" on the Scene Runner — has it moved or been renamed?`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Click a real button on the real rendered Deck. */
function clickOnDeck(selector) {
  const element = document.getElementById("bi-command-bar")?.querySelector(selector);
  if (!element) throw new Error(`Could not find "${selector}" on the Deck — has it moved or been renamed?`);
  element.click();
}

/**
 * Proves 2026-09-18's whole integration pass end to end, against real
 * Episode One content — not a synthetic fixture. Kit Issue's Nobu and
 * Canteen's Taka are the two real cast members already authored with a
 * non-default `arrival` tier (announced and splash respectively), so staging
 * them is a real test of automatic sting-tier firing, not a contrived one.
 */
const SESSION_INTEGRATION_DEMO = {
  id: "session-01-integration",
  titleKey: "BLANKINHERITANCE.Demo.SessionIntegration.Title",
  seat: SEATS.DIRECTOR,
  steps: [
    {
      id: "open-session",
      narrationKey: "BLANKINHERITANCE.Demo.SessionIntegration.Step1",
      run: async () => {
        await openSceneRunner(EPISODE_ID, "episode-c1e1--the-road-in");
        await waitUntil(() => getSceneRunner()?.open === true, { onTimeout: "the Scene Runner never opened" });
      }
    },
    {
      // Merged 2026-09-19: picking a scene from the running order and
      // cutting the table there used to be two separate clicks (the second
      // one undiscoverable — a real reported gap). #onCueScene now does
      // both in one action, so this demo step proves that directly rather
      // than performing a two-step dance the real UI no longer has.
      id: "cross-to-kit-issue",
      narrationKey: "BLANKINHERITANCE.Demo.SessionIntegration.Step2",
      run: async () => {
        await clickOnRunner('[data-action="cueScene"][data-brief-id="episode-c1e1--kit-issue"]');
        const targetId = await sceneFoundryId("e1-kit-issue");
        // The map crossing itself runs two 10-second fades either side of an
        // 8-second animation (foundry/travel.mjs) — a generous timeout, not a
        // sign anything is wrong if this step visibly takes half a minute.
        await waitUntil(() => currentBriefId() === "episode-c1e1--kit-issue" && game.scenes.active?.id === targetId, {
          timeoutMs: 45000,
          onTimeout: "the table never actually arrived at Kit Issue"
        });
      }
    },
    {
      id: "stage-nobu",
      narrationKey: "BLANKINHERITANCE.Demo.SessionIntegration.Step3",
      run: async () => {
        await clickOnRunner('[data-action="stagePerson"][data-portrait-id="summon-nobu"]');
        await waitUntil(() => stagedSting("summon-nobu") === "announced", {
          onTimeout: "Nobu never staged with his authored \"announced\" arrival"
        });
      }
    },
    {
      id: "cross-to-canteen",
      narrationKey: "BLANKINHERITANCE.Demo.SessionIntegration.Step4",
      run: async () => {
        await clickOnRunner('[data-action="cueScene"][data-brief-id="episode-c1e1--canteen"]');
        const targetId = await sceneFoundryId("e1-canteen");
        await waitUntil(() => currentBriefId() === "episode-c1e1--canteen" && game.scenes.active?.id === targetId, {
          timeoutMs: 45000,
          onTimeout: "the table never actually arrived at Canteen"
        });
      }
    },
    {
      id: "stage-taka",
      narrationKey: "BLANKINHERITANCE.Demo.SessionIntegration.Step5",
      run: async () => {
        await clickOnRunner('[data-action="stagePerson"][data-portrait-id="summon-taka"]');
        await waitUntil(() => stagedSting("summon-taka") === "splash", {
          onTimeout: "Taka never staged with her authored \"splash\" arrival"
        });
      }
    },
    {
      id: "open-sound-desk",
      narrationKey: "BLANKINHERITANCE.Demo.SessionIntegration.Step6",
      run: async () => {
        clickOnDeck('[data-action="openSoundDesk"]');
        await waitUntil(() => soundDeskState().open === true, { onTimeout: "the Sound Desk never opened from the Deck's own pill" });
      }
    }
  ]
};

/**
 * Ingram's own test, verbatim: "Create 6 temporary PC tokens, place them
 * around the mainland, let's simulate 'The Road In' actually live... I
 * won't believe this system exists until I can see it with my own eyes."
 * Deliberately narrower than SESSION_INTEGRATION_DEMO above (no staging, no
 * Sound Desk) — this proves exactly one thing, the map crossing itself,
 * from The Road In to the very next real scene in sequence, Intake
 * Medicals, with six visibly-scattered mainland tokens on screen as the
 * calibration's own cross-check (2026-09-23's real bug: a Tile's default
 * centre anchor was never accounted for, and it took a wide scatter of
 * points, not just one pin, to make the pattern legible against the map).
 */
// The Road In's own real gazetteer location (data/campaign/scene-set.json's
// e1-the-road-in entry) — where the six scattered candidates are actually
// converging. Hardcoded here the same way this whole demo already hardcodes
// which real scenes/briefs it proves against; if that ever changes, this
// demo is meant to need updating right along with it, not silently drift.
const ROAD_IN_LOCATION_REF = "candidate-gate";

const ROAD_IN_TRAVEL_DEMO = {
  id: "road-in-travel",
  titleKey: "BLANKINHERITANCE.Demo.RoadInTravel.Title",
  seat: SEATS.DIRECTOR,
  // Optional — a demo that defines this gets a Reset control on the panel
  // at every step, not just at the end, so a specific transition (Ingram's
  // own example: "that first transition") can be re-tested repeatedly
  // without re-running everything before it by hand.
  reset: resetRoadInDemo,
  steps: [
    {
      id: "scatter-party",
      narrationKey: "BLANKINHERITANCE.Demo.RoadInTravel.Step1",
      run: async () => {
        const count = await scatterDemoParty();
        ui.notifications.info(`Scattered ${count} candidates across the mainland.`);
      }
    },
    {
      id: "open-session",
      narrationKey: "BLANKINHERITANCE.Demo.RoadInTravel.Step2",
      run: async () => {
        await openSceneRunner(EPISODE_ID, "episode-c1e1--the-road-in");
        await waitUntil(() => getSceneRunner()?.open === true, { onTimeout: "the Scene Runner never opened" });
      }
    },
    {
      // The actual answer to "no visible token movement... complete
      // failure" (Ingram, live): the six scattered candidates are real,
      // separately-routed, real-timed journeys onto Candidate Gate — not a
      // decorative prop sitting still while an unrelated single marker
      // moves somewhere else. `convergeTokensOnHub` moves each candidate's
      // own real token, keeping its own art/identity, never the generic
      // arrow marker.
      id: "converge-on-gate",
      narrationKey: "BLANKINHERITANCE.Demo.RoadInTravel.Step3",
      run: async () => {
        // demoPartyPlan's tokenId is calibration-independent (deriveFoundryId
        // is pure), so the identity calibration here is only ever used to
        // produce an x/y this step throws away -- convergeTokensOnHub
        // resolves each candidate's REAL position itself.
        const plan = await demoPartyPlan({ originX: 0, originY: 0, scale: 1 });
        const moves = plan.map((p) => ({ tokenId: p.tokenId, from: p.originRef, to: ROAD_IN_LOCATION_REF }));
        await convergeTokensOnHub(moves);
      }
    },
    {
      id: "cross-to-intake-medicals",
      narrationKey: "BLANKINHERITANCE.Demo.RoadInTravel.Step4",
      run: async () => {
        await clickOnRunner('[data-action="cueScene"][data-brief-id="episode-c1e1--intake-medicals"]');
        const targetId = await sceneFoundryId("e1-intake-medicals");
        // The travel time itself is no longer a fixed budget (core/
        // travel-speed.mjs's per-hop, per-mode duration replaced that
        // 2026-09-23) -- generous purely for the two 10-second fades
        // either side (foundry/travel.mjs's own FADE_MS).
        await waitUntil(() => currentBriefId() === "episode-c1e1--intake-medicals" && game.scenes.active?.id === targetId, {
          timeoutMs: 60000,
          onTimeout: "the table never actually arrived at Intake Medicals"
        });
      }
    }
  ]
};

export const DEMOS = Object.freeze([SESSION_INTEGRATION_DEMO, ROAD_IN_TRAVEL_DEMO]);

/* ---------------------------------------------------------------------- */
/*  The panel                                                              */
/* ---------------------------------------------------------------------- */

export class DemoRunner extends HandlebarsApplicationMixin(ApplicationV2) {
  #open = false;
  #demo = null;
  #index = 0;
  #busy = false;
  #error = null;

  static DEFAULT_OPTIONS = {
    id: "bi-demo-runner",
    tag: "div",
    classes: ["bi-demo-runner-standalone"],
    window: { frame: false, positioned: false },
    actions: {
      toggle: DemoRunner.#onToggle,
      start: DemoRunner.#onStart,
      next: DemoRunner.#onNext,
      back: DemoRunner.#onBack,
      reset: DemoRunner.#onReset,
      exit: DemoRunner.#onExit
    }
  };

  static PARTS = { body: { template: `${TEMPLATE_ROOT}/panel.hbs` } };

  /** Persistent chrome mounts into #interface, same idiom as every other panel here. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  get open() {
    return this.#open;
  }

  toggle() {
    DemoRunner.#onToggle.call(this);
  }

  /** @override */
  async _prepareContext() {
    if (!this.#demo) {
      return {
        open: this.#open,
        running: false,
        demos: DEMOS.map((d) => ({ id: d.id, title: game.i18n.localize(d.titleKey) })),
        error: this.#error
      };
    }
    const state = demoState(this.#demo.steps, this.#index);
    return {
      open: this.#open,
      running: true,
      title: game.i18n.localize(this.#demo.titleKey),
      progress: state.progress,
      narration: game.i18n.localize(state.step.narrationKey),
      isFirst: state.isFirst,
      isLast: state.isLast,
      busy: this.#busy,
      canReset: Boolean(this.#demo.reset),
      error: this.#error
    };
  }

  static #onToggle() {
    this.#open = !this.#open;
    this.render({});
  }

  static #onStart(event, target) {
    const demo = DEMOS.find((d) => d.id === target.dataset.demoId);
    if (!demo) return;
    const problems = validateDemo(demo);
    if (problems.length) {
      this.#error = problems.join("; ");
      this.render({});
      return;
    }
    this.#demo = demo;
    this.#index = 0;
    this.#error = null;
    this.render({});
  }

  /** GM-paced by construction (design/ux-doctrine.md's own "judgement is never automated" reasoning) — a step only ever runs on a deliberate click here. */
  static async #onNext() {
    if (this.#busy || !this.#demo) return;
    const state = demoState(this.#demo.steps, this.#index);
    this.#busy = true;
    this.#error = null;
    this.render({});
    try {
      await state.step.run();
      this.#index = advanceDemo(this.#demo.steps, this.#index);
    } catch (err) {
      console.error(`Blank Inheritance | Demo step "${state.step.id}" failed:`, err);
      this.#error = err?.message ?? String(err);
    } finally {
      this.#busy = false;
      this.render({});
    }
  }

  static #onBack() {
    if (!this.#demo || this.#busy) return;
    this.#index = retreatDemo(this.#demo.steps, this.#index);
    this.#error = null;
    this.render({});
  }

  /**
   * "I have no way to reset things currently to before 'The Road In' so
   * that I can test that first transition" (Ingram, 2026-09-23) — rewinds
   * whatever the running demo's own `reset` does (e.g. resetRoadInDemo)
   * and restarts its step sequence from the top, without leaving the demo
   * entirely the way Exit does.
   */
  static async #onReset() {
    if (this.#busy || !this.#demo?.reset) return;
    this.#busy = true;
    this.#error = null;
    this.render({});
    try {
      await this.#demo.reset();
      this.#index = 0;
    } catch (err) {
      console.error("Blank Inheritance | Demo reset failed:", err);
      this.#error = err?.message ?? String(err);
    } finally {
      this.#busy = false;
      this.render({});
    }
  }

  static #onExit() {
    this.#demo = null;
    this.#index = 0;
    this.#error = null;
    this.render({});
  }
}

let active = null;

export function mountDemoRunner() {
  if (!game.user?.isGM) return null;
  if (!active) active = new DemoRunner();
  active.render({ force: true });
  return active;
}

export function toggleDemoRunner() {
  (active ?? mountDemoRunner())?.toggle();
  return active;
}

export function getDemoRunner() {
  return active;
}

/** The "big obvious button" — a macro, same idiom as every other GM entry point in this module (createDirectorPanelMacroIfMissing, createSceneSetMacroIfMissing). */
export async function createDemoMacroIfMissing() {
  if (!game.user?.isGM) return;
  const macroId = await deriveFoundryId("demo-runner-macro");
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.Demo.MacroName"),
      type: "script",
      img: "icons/svg/aura.svg",
      command: `await game.modules.get("${MODULE_ID}").api.toggleDemoRunner();`
    },
    { keepId: true }
  );
}
