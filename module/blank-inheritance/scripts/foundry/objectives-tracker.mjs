/**
 * The objectives tracker — on every screen, top right, in three sizes (design/objectives.md §3, D057 §2).
 *
 *   folded     a tab: a lamp, OBJECTIVES, how many are open, and the tracked one's deadline
 *   lines      one line per objective: its mark, title, progress pips and deadline
 *   explained  each one with its giver, their words, every part (required or optional) and what it costs
 *
 * The section's objectives and the player's own character's; everyone else's are in the Journal. New things light the
 * lamp and write a ribbon; nothing pops up (Law 14). A fight folds it to the tab and it comes back after (Laws 6, 13).
 * Each player's size, tracked objective and last look are client settings: their own, kept across reloads, never reset.
 *
 * Mounted like the session rail: a frameless ApplicationV2 placed straight in #interface, never inside #ui-middle
 * (its transform breaks position: fixed), re-asserted on every canvasReady. Its right edge stops at the sidebar or the
 * chat pop-up column, whichever comes first, by the same rule as the rail.
 */

import { SIZES, clampPlace, dragPlace, nextSize, parsePlace, trackerModel } from "../core/objectives.mjs";
import { currentMoment } from "./campaign-state.mjs";
import { objectiveStates } from "./objectives-store.mjs";
import { stageTopControls } from "./stagecraft-bridge.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const TEMPLATE = `modules/${MODULE_ID}/templates/objectives/tracker.hbs`;

export const SETTING_SIZE = "objectivesSize";
export const SETTING_TRACKED = "objectivesTracked";
export const SETTING_SEEN = "objectivesLastSeen";
/** Where this player dragged the tracker to: JSON {right, top}, or empty for the automatic place. */
export const SETTING_PLACE = "objectivesPlace";
/** How long the lamp stays lit after something changes, before this player counts as having seen it. */
const SEEN_AFTER_MS = 12000;
const SIZE_KEYS = Object.freeze({
  folded: "BLANKINHERITANCE.Objectives.Size.folded",
  lines: "BLANKINHERITANCE.Objectives.Size.lines",
  explained: "BLANKINHERITANCE.Objectives.Size.explained"
});

/** init: the three client settings. Client scope, so they are each player's own and never on the admin lists. */
export function registerObjectivesTrackerSettings() {
  const client = { scope: "client", config: false, onChange: () => refreshObjectivesTracker() };
  game.settings.register(MODULE_ID, SETTING_SIZE, { ...client, type: String, default: "lines" });
  game.settings.register(MODULE_ID, SETTING_TRACKED, { ...client, type: String, default: "" });
  game.settings.register(MODULE_ID, SETTING_SEEN, { ...client, type: String, default: "" });
  game.settings.register(MODULE_ID, SETTING_PLACE, { ...client, type: String, default: "" });
}

const getSetting = (key, fallback) => {
  try {
    return game.settings.get(MODULE_ID, key) ?? fallback;
  } catch {
    return fallback;
  }
};

export class ObjectivesTracker extends HandlebarsApplicationMixin(ApplicationV2) {
  #seenTimer = null;

  static DEFAULT_OPTIONS = {
    id: "bi-objectives",
    tag: "aside",
    classes: ["bi-obj-host"],
    window: { frame: false, positioned: false },
    actions: {
      cycleSize: ObjectivesTracker.#onCycleSize,
      setSize: ObjectivesTracker.#onSetSize,
      track: ObjectivesTracker.#onTrack,
      openJournal: ObjectivesTracker.#onOpenJournal
    }
  };

  static PARTS = { tracker: { template: TEMPLATE } };

  /** A direct child of #interface, replacing any node with the same id (the deck's and the rail's mount). */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    const model = trackerModel(objectiveStates(), {
      userId: game.user.id,
      isGM: game.user.isGM,
      trackedId: getSetting(SETTING_TRACKED, "") || null,
      size: getSetting(SETTING_SIZE, "lines"),
      moment: currentMoment(),
      lastSeenIso: getSetting(SETTING_SEEN, "") || null,
      inCombat: Boolean(game.combat?.started)
    });
    const sizes = SIZES.map((id, i) => ({ id, on: i === model.sizeIndex, label: game.i18n.localize(SIZE_KEYS[id]) }));
    return { model, sizes, hidden: model.empty && !game.user.isGM && !objectiveStates().length };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    fitObjectivesTracker();
    this.#wireGrips();
    // The lamp stays lit long enough to be noticed, then this player has seen it.
    clearTimeout(this.#seenTimer);
    if (context.model?.lit) {
      this.#seenTimer = setTimeout(() => game.settings.set(MODULE_ID, SETTING_SEEN, new Date().toISOString()), SEEN_AFTER_MS);
    }
  }

  /**
   * The grip moves the tracker: press and drag (real pointer events, captured so a fast drag cannot lose it), arrow keys
   * nudge it (Shift for more), a double-click or Home puts it back to the automatic place. The new spot is saved when
   * the drag ends, so each player's own survives a reload.
   */
  #wireGrips() {
    for (const grip of this.element.querySelectorAll(".bi-obj__grip")) {
      grip.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const box = hostBox();
        if (!box) return;
        event.preventDefault();
        grip.setPointerCapture(event.pointerId);
        const start = { right: window.innerWidth - box.right, top: box.top };
        const from = { x: event.clientX, y: event.clientY };
        grip.classList.add("is-dragging");
        const move = (e) => applyPlace(dragPlace(start, e.clientX - from.x, e.clientY - from.y));
        const done = async (e) => {
          grip.removeEventListener("pointermove", move);
          grip.removeEventListener("pointerup", done);
          grip.removeEventListener("pointercancel", done);
          grip.classList.remove("is-dragging");
          if (grip.hasPointerCapture?.(e.pointerId)) grip.releasePointerCapture(e.pointerId);
          await savePlace();
        };
        grip.addEventListener("pointermove", move);
        grip.addEventListener("pointerup", done);
        grip.addEventListener("pointercancel", done);
      });
      grip.addEventListener("dblclick", () => resetPlace());
      grip.addEventListener("keydown", async (event) => {
        const step = event.shiftKey ? 40 : 10;
        const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (event.key === "Home") {
          event.preventDefault();
          await resetPlace();
        } else if (moves[event.key]) {
          event.preventDefault();
          const box = hostBox();
          if (!box) return;
          applyPlace(dragPlace({ right: window.innerWidth - box.right, top: box.top }, ...moves[event.key]));
          await savePlace();
        }
      });
    }
  }

  static async #onCycleSize() {
    const shown = getSetting(SETTING_SIZE, "lines");
    await game.settings.set(MODULE_ID, SETTING_SIZE, nextSize(game.combat?.started ? "folded" : shown));
  }

  static async #onSetSize(event, target) {
    if (SIZES.includes(target.dataset.size)) await game.settings.set(MODULE_ID, SETTING_SIZE, target.dataset.size);
  }

  static async #onTrack(event, target) {
    const id = target.dataset.objectiveId;
    const current = getSetting(SETTING_TRACKED, "");
    await game.settings.set(MODULE_ID, SETTING_TRACKED, current === id ? "" : id);
  }

  static async #onOpenJournal() {
    const { toggleJournal } = await import("./journal.mjs");
    return toggleJournal();
  }
}

/**
 * Where the tracker may sit: the top right, left of the sidebar and of the chat pop-up column (a long whisper fills it
 * from the top), and for the GM under the session rail. Two properties on <body>, the deck's and the rail's pattern.
 */
/** The tracker's whole box on screen now (every size, ribbons included), or null. */
function hostBox() {
  const r = document.querySelector("#bi-objectives .bi-obj")?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? r : null;
}

/** Put the tracker at a place now (clamped to the screen), without saving it. Returns what was applied, or null. */
function applyPlace(place) {
  const box = hostBox();
  const clamped = clampPlace(place, { viewW: window.innerWidth, viewH: window.innerHeight, boxW: box?.width ?? 0, boxH: box?.height ?? 0 });
  if (!clamped) return null;
  document.body.style.setProperty("--bi-obj-right", `${clamped.right}px`);
  document.body.style.setProperty("--bi-obj-top", `${clamped.top}px`);
  return clamped;
}

/** Save where the tracker is now as this player's own place. */
async function savePlace() {
  const box = hostBox();
  if (!box) return;
  await game.settings.set(MODULE_ID, SETTING_PLACE, JSON.stringify({ right: Math.round(window.innerWidth - box.right), top: Math.round(box.top) }));
}

/** Back to the automatic place: top right, clear of the sidebar, the chat column and the stage's own controls. */
async function resetPlace() {
  await game.settings.set(MODULE_ID, SETTING_PLACE, "");
  fitObjectivesTracker();
}

export function fitObjectivesTracker() {
  const style = document.body.style;
  // This player's own place, if they dragged it somewhere, wins over every automatic rule below.
  const own = parsePlace(getSetting(SETTING_PLACE, ""));
  if (own && applyPlace(own)) return;
  const edges = ["sidebar", "chat-notifications"]
    .map((id) => document.getElementById(id)?.getBoundingClientRect())
    .filter((r) => r && r.width > 0)
    .map((r) => r.left);
  const right = edges.length ? Math.max(0, window.innerWidth - Math.min(...edges)) : 0;
  const rail = document.getElementById("bi-session-rail")?.getBoundingClientRect();
  let top = (rail && rail.height > 0 ? rail.bottom : 0) + 12;
  // Below any of the stage's own top controls the tracker's width would cover (it is up to 380 px wide).
  const span = [window.innerWidth - right - 14 - 380, window.innerWidth - right - 14];
  for (const r of stageTopControls().rects) if (r.right > span[0] && r.left < span[1]) top = Math.max(top, r.bottom + 8);
  style.setProperty("--bi-obj-right", `${Math.round(right + 14)}px`);
  style.setProperty("--bi-obj-top", `${Math.round(top)}px`);
}

/* ------------------------------------------------------------------ */
/*  The singleton                                                      */
/* ------------------------------------------------------------------ */

let active = null;
let fittingInstalled = false;
let pending = null;

/** Mount it, or re-assert it. Every client, GM included: the GM sees what the table sees, and all of it. */
export function mountObjectivesTracker() {
  if (!active) active = new ObjectivesTracker();
  active.render({ force: true });
  if (!fittingInstalled) {
    fittingInstalled = true;
    window.addEventListener("resize", () => fitObjectivesTracker());
    Hooks.on("collapseSidebar", () => setTimeout(fitObjectivesTracker, 300));
  }
  watchStage();
  return active;
}

/** Repaint soon: a burst of page updates (a chip that ticks and closes) becomes one render. */
/** Refit when the stage's top controls open, close or change (the GM strip toggles a class on the stage). */
let watched = null;
let fitQueued = false;
function watchStage() {
  const { stage } = stageTopControls();
  if (!stage || stage === watched?.stage) return;
  watched?.observer.disconnect();
  const observer = new MutationObserver(() => {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(() => { fitQueued = false; fitObjectivesTracker(); });
  });
  observer.observe(stage, { attributes: true, attributeFilter: ["class", "hidden"], subtree: true, childList: true });
  watched = { stage, observer };
}

export function refreshObjectivesTracker() {
  if (!active?.rendered) return;
  clearTimeout(pending);
  pending = setTimeout(() => active?.render(), 60);
}

export const getObjectivesTracker = () => active;
