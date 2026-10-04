/**
 * The scene-close dialogue — the Foundry-touching half.
 *
 * Rebuilt 2026-09-22; see core/scene-close.mjs's header for the failure that
 * caused it (a dialogue too tall to reach its own accept button, mid-session)
 * and for everything that was cut. The shape here follows from that: ONE
 * press closes a scene. A verdict button IS the confirm, so there is no
 * separate accept control that can ever be pushed off-screen again, and no
 * validation state that can leave a GM stranded in a popup.
 *
 * One real world-setting counter (scenes flagged for review) is the "visibly
 * changes something" half of Law 15 — it replaces the two mocked counters
 * (casualties, Anchor violations), whose only inputs were cost options that
 * named CUT systems. It is not a mock: the session review reads it.
 *
 * Closing a scene also writes a real entry through foundry/session-log.mjs —
 * the SAME log the always-on bar input writes to (design/ux-doctrine.md
 * §10.3a: "a text box for adding my own notes" into "the same log as
 * everything else") — and a flagged closure carries that scene's own
 * authored prompts onto the entry as a real review agenda.
 *
 * GM-only throughout: closing a scene is Director's-panel-adjacent
 * bookkeeping, not something a player screen ever needs.
 */

import { canCloseScene, summarizeClosure, openSetups, sceneHighlights, writeDownEntries, ENDING_OPTIONS, VERDICT_OPTIONS } from "../core/scene-close.mjs";
import { recordLogEntry, currentEntries } from "./session-log.mjs";
import { runnerThemeContext } from "./runner-theme.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const SETTING_REVIEW_FLAGS = "sceneCloseReviewFlags";

export function registerSceneCloseSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_REVIEW_FLAGS, { scope: "world", config: false, type: Number, default: 0, onChange });
}

export function currentCounters() {
  return { reviewFlags: game.settings.get(MODULE_ID, SETTING_REVIEW_FLAGS) ?? 0 };
}

/**
 * GM only. The actual mechanical act (Law 15) -- validates, logs, and ticks
 * the review counter when the verdict flags one.
 *
 * `mode` is the scene-brief's own `mode` field, recorded onto the log entry
 * as context (it used to resolve the deleted cost vocabulary; a later review
 * genuinely wants to know a scene was `social` rather than `combat`, and
 * recordLogEntry has always had a `mode` slot that nothing was filling).
 * `reactionPrompts` are the scene's own authored review prompts, which a
 * flagged verdict turns into the agenda for the in-depth session review
 * (core/scene-close.mjs#reviewAgenda).
 */
export async function confirmSceneClosure({ verdict, ending = null, carriesForward = false, notes = "", scene = null, briefRef = null, mode = null, reactionPrompts = [] }) {
  if (!game.user.isGM) return null;
  const result = summarizeClosure({ verdict, ending, carriesForward, notes, reactionPrompts });
  if (!result.ok) return result;

  // WHICH scene closed, not just that one did. A session log full of
  // "Scene closed -- went well" with nothing to attach it to is a much
  // poorer record than the log's own `scene`/`subject`/`mode` fields allow.
  await recordLogEntry({
    text: result.logLine,
    nowIso: new Date().toISOString(),
    scene: scene ?? canvas?.scene?.name ?? null,
    mode,
    subject: briefRef,
    review: result.review
  });

  if (result.delta.reviewFlags) {
    await game.settings.set(MODULE_ID, SETTING_REVIEW_FLAGS, currentCounters().reviewFlags + result.delta.reviewFlags);
  }
  return result;
}

export class SceneCloseDialogue extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Both optional, both nullable, neither able to block the close -- see core/scene-close.mjs#canCloseScene. */
  #ending = null;
  #carriesForward = false;
  /** Which authored scene this is closing, when it was opened from one. `mode` rides onto the log entry as context; `reactionPrompts` become the review agenda for a flagged verdict, and are empty for an ad-hoc close with no brief. `writeDown` is the scene's own list of what the write-up needs (2026-10-04), asked here. */
  #context = { briefRef: null, title: null, mode: null, reactionPrompts: [], writeDown: [] };

  static DEFAULT_OPTIONS = {
    id: "bi-scene-close",
    tag: "section",
    classes: ["bi-scene-close"],
    window: { title: "BLANKINHERITANCE.SceneClose.Title", icon: "fa-solid fa-clapperboard", resizable: false },
    // WIDE, NOT TALL -- Ingram's own correction, 2026-09-22. The recap and
    // the decisions sit side by side instead of stacked, and the body's own
    // CSS caps its height so the verdict row is always on screen. 860 is
    // wide enough for two real columns at this type size and still fits a
    // 1280px-wide Foundry window with the sidebar open.
    position: { width: 860, height: "auto" },
    actions: {
      setEnding: SceneCloseDialogue.#onSetEnding,
      toggleCarriesForward: SceneCloseDialogue.#onToggleCarriesForward,
      verdict: SceneCloseDialogue.#onVerdict
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/console/scene-close.hbs` }
  };

  /** @override */
  async _prepareContext() {
    return {
      ...runnerThemeContext(),
      sceneTitle: this.#context.title,
      carriesForward: this.#carriesForward,
      endings: ENDING_OPTIONS.map((o) => ({ ...o, current: o.id === this.#ending })),
      // The per-verdict booleans exist so the template can write its colour
      // modifier as three literal classes inside {{#if}} blocks rather than a
      // concatenated `--{{id}}`, which tier0-architecture.test.mjs's class
      // lint cannot see (it strips Handlebars before it looks). Same idiom as
      // runner/beat.hbs and stage/banner.hbs — see their own headers.
      verdicts: VERDICT_OPTIONS.map((v) => ({
        ...v,
        isPanic: v.id === "panic",
        isNote: v.id === "note",
        isPositive: v.id === "positive"
      })),
      counters: currentCounters(),
      // Doctrine's own scene-break suggestion, offered here rather than
      // interrupting the scene itself (Law 14) -- purely informational.
      setups: openSetups(currentEntries()),
      // This scene's own tagged log lines, right where the GM is about to
      // write the notes a future session gets written from — see
      // core/scene-close.mjs#sceneHighlights's own header for why.
      highlights: sceneHighlights(currentEntries(), canvas?.scene?.name ?? null),
      // How many scenes this session has already flagged, so the GM can see
      // the review pile they are adding to. Real state, not a mock.
      reviewCount: currentCounters().reviewFlags,
      // The scene's own "Write down" questions, each with a box. Asked here
      // because inside the Runner's ending they went unanswered: this is the
      // one moment the GM is already writing about the scene. Every one is
      // optional, and in the recap column, which is the one part of this
      // dialogue allowed to scroll, so they can never push the verdicts off
      // the screen.
      writeDown: (this.#context.writeDown ?? []).map((text, index) => ({ text, index }))
    };
  }

  /** Told, not guessed: the runner knows which brief it is closing, and that brief's own `mode`/reactionPrompts. */
  setContext({ briefRef = null, title = null, mode = null, reactionPrompts = [], writeDown = [] } = {}) {
    this.#context = { briefRef, title, mode, reactionPrompts, writeDown: Array.isArray(writeDown) ? writeDown.filter((w) => typeof w === "string" && w.trim()) : [] };
    return this;
  }

  /** Tapping the picked ending again clears it — the field is optional, so it has to be un-pickable, or a mis-tap becomes permanent. */
  static #onSetEnding(event, target) {
    const picked = target.dataset.endingId;
    this.#ending = this.#ending === picked ? null : picked;
    this.render();
  }

  static #onToggleCarriesForward() {
    this.#carriesForward = !this.#carriesForward;
    this.render();
  }

  /**
   * The one required choice, and the confirm in the same press.
   *
   * No `canConfirm` gate and no disabled state: the verdict's own id is the
   * validation, resolved in core against the real list, so a button that
   * exists is a button that works.
   */
  static async #onVerdict(event, target) {
    const notesField = this.element.querySelector("[data-scene-close-notes]");
    const verdict = target.dataset.verdictId;
    if (!canCloseScene({ verdict }).ok) return;

    // The write-down answers go into the log first, one line each, so the
    // closure's own line is the last thing the scene's record says.
    const answers = [];
    for (const field of this.element.querySelectorAll("[data-writedown-index]")) answers[Number(field.dataset.writedownIndex)] = field.value ?? "";
    for (const entry of writeDownEntries(this.#context.writeDown, answers, { briefRef: this.#context.briefRef })) {
      await recordLogEntry({
        text: entry.text,
        nowIso: new Date().toISOString(),
        scene: this.#context.title ?? canvas?.scene?.name ?? null,
        subject: entry.subject
      }).catch((err) => console.error("Blank Inheritance | Could not log a write-down answer:", err));
    }

    const result = await confirmSceneClosure({
      verdict,
      ending: this.#ending,
      carriesForward: this.#carriesForward,
      notes: notesField?.value ?? "",
      briefRef: this.#context.briefRef,
      scene: this.#context.title ?? canvas?.scene?.name ?? null,
      mode: this.#context.mode,
      reactionPrompts: this.#context.reactionPrompts
    });
    if (!result?.ok) return; // a null/failed result is a no-op, not a silent-looking success

    ui.notifications.info(
      game.i18n.localize(
        result.flaggedForReview
          ? "BLANKINHERITANCE.SceneClose.ConfirmedFlagged"
          : "BLANKINHERITANCE.SceneClose.Confirmed"
      )
    );
    // `advances` carries BOTH gates (a panic stays put, an unfinished scene
    // stays put) so no listener has to re-derive the rule. `complete` stays
    // on the payload for anything that legitimately wants the raw fact.
    Hooks.callAll("blank-inheritance.sceneClosed", { ...result, briefRef: this.#context.briefRef });
    this.close();
  }
}

export function openSceneCloseDialogue({ briefRef = null, title = null, mode = null, reactionPrompts = [], writeDown = [] } = {}) {
  if (!game.user?.isGM) return null;
  const dialogue = new SceneCloseDialogue();
  dialogue.setContext({ briefRef, title, mode, reactionPrompts, writeDown });
  dialogue.render({ force: true });
  return dialogue;
}
