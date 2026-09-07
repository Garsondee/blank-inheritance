/**
 * The theatre-of-the-mind stage — the Foundry-touching half.
 *
 * Portraits in frames, over the scene's own background art, revealed and
 * concealed by the Director. See design/theatre-of-the-mind-staging.md; the
 * blocking rules and the redaction boundary are in core/stage-layout.mjs.
 *
 * TWO STORES, AND THE SPLIT IS A SECURITY BOUNDARY, not filing:
 *
 *   THE AUTHORED CAST — everyone who could appear in this scene, including the
 *   ones nobody has met yet — lives in a GM-only JournalEntry
 *   (`ownership.default: NONE`). Foundry only sends a document to clients with
 *   permission on it, so that content genuinely never reaches a player.
 *
 *   THE REVEALED CAST is published onto the Scene as a flag, because a scene
 *   document IS sent to every client. That is precisely why the concealed half
 *   cannot live there: a name and a portrait path in a scene flag have already
 *   crossed the wire by the time any template decides not to draw them.
 *   Doctrine Law 11 is removal, not hiding. Same pattern, same reasoning, as
 *   foundry/social-store.mjs and foundry/campaign-state.mjs.
 */

import { STAGE_LAYOUTS, publishedCast, stageState } from "../core/stage-layout.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { openCharacterCard } from "./character-card.mjs";
import { postInlineCheck } from "./rolls.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/stage`;
const FLAG_KEY = "stage";
const VAULT_SOURCE_ID = "stage-cast-vault";
const VAULT_NAME = "Blank Inheritance — Staged Casts (GM only)";

/* ---------------------------------------------------------------- */
/*  The GM-side store                                                */
/* ---------------------------------------------------------------- */

export async function ensureStageVault() {
  if (!game.user.isGM) return null;
  const id = await deriveFoundryId(VAULT_SOURCE_ID);
  const existing = game.journal.get(id);
  if (existing) return existing;
  return JournalEntry.create(
    {
      _id: id,
      name: VAULT_NAME,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: { [MODULE_ID]: { sourceId: VAULT_SOURCE_ID, casts: {} } }
    },
    { keepId: true }
  );
}

/** GM only. The full authored cast for one scene, concealed members included. */
export async function readAuthoredCast(sceneId) {
  if (!game.user.isGM) return [];
  const vault = await ensureStageVault();
  const casts = vault?.getFlag(MODULE_ID, "casts") ?? {};
  return Array.isArray(casts[sceneId]) ? casts[sceneId] : [];
}

/**
 * GM only. Store an authored cast and publish its revealed subset.
 *
 * The two writes are deliberately one function. Splitting them would make it
 * possible to author a cast and forget to publish, or — far worse — to publish
 * without going through publishedCast at all.
 */
export async function writeAuthoredCast(scene, cast, layout = STAGE_LAYOUTS.LINE) {
  if (!game.user.isGM || !scene) return null;
  const vault = await ensureStageVault();
  if (!vault) return null;

  const casts = foundry.utils.deepClone(vault.getFlag(MODULE_ID, "casts") ?? {});
  casts[scene.id] = cast;
  await vault.setFlag(MODULE_ID, "casts", casts);

  await scene.setFlag(MODULE_ID, FLAG_KEY, { layout, cast: publishedCast(cast) });
  return cast;
}

/** GM only. Reveal or conceal one member, then republish. */
export async function setRevealed(scene, portraitId, revealed) {
  if (!game.user.isGM || !scene) return null;
  const cast = await readAuthoredCast(scene.id);
  const next = cast.map((member) => (member.portraitId === portraitId ? { ...member, revealed } : member));
  const layout = scene.getFlag(MODULE_ID, FLAG_KEY)?.layout ?? STAGE_LAYOUTS.LINE;
  return writeAuthoredCast(scene, next, layout);
}

/** What THIS client is entitled to draw. A player only ever has the published half. */
async function castForThisClient(scene) {
  const published = scene?.getFlag(MODULE_ID, FLAG_KEY);
  if (!published) return null;
  if (!game.user.isGM) return { layout: published.layout, cast: published.cast ?? [] };
  const authored = await readAuthoredCast(scene.id);
  return { layout: published.layout, cast: authored.length ? authored : published.cast ?? [] };
}

/* ---------------------------------------------------------------- */
/*  The overlay                                                      */
/* ---------------------------------------------------------------- */

export class StageOverlay extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bi-stage",
    tag: "div",
    classes: ["bi-stage"],
    window: { frame: false, positioned: false },
    actions: {
      openCard: StageOverlay.#onOpenCard,
      toggleReveal: StageOverlay.#onToggleReveal,
      askCheck: StageOverlay.#onAskCheck
    }
  };

  // The frame partial is declared here rather than only referenced from the
  // template: `templates` is what preloads it and registers it under its full
  // path, which is the name stage.hbs looks it up by.
  static PARTS = {
    frames: {
      template: `${TEMPLATE_ROOT}/stage.hbs`,
      templates: [`${TEMPLATE_ROOT}/frame.hbs`]
    }
  };

  /** Same idiom as the command bar: core's own way of adding persistent chrome. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    const scene = canvas?.scene ?? null;
    const staged = await castForThisClient(scene);
    if (!staged) return { present: false, groups: [], empty: true };

    const canDirect = game.user.isGM;
    // A player's cast contains only revealed members, so `revealed` is absent
    // from it and is normalised to true here. The Director's contains both,
    // and `concealed` is what the frame styles itself by — a ghost in their
    // view and nothing at all in anyone else's.
    const cast = staged.cast.map((member) => ({
      ...member,
      revealed: member.revealed ?? true,
      concealed: canDirect && member.revealed === false
    }));
    const state = stageState({ cast, layout: staged.layout, canDirect });
    return { ...state, present: true, sceneName: scene?.name ?? null };
  }

  /* -------------------------------------------------------------- */
  /*  Actions                                                        */
  /* -------------------------------------------------------------- */

  /**
   * The frame is the button (staging doc §3). Both seats open the same
   * Character Card; what differs is what is INSIDE it, which
   * core/social-intel.mjs already decides from `isGM`. This does not need to
   * know, and must not learn — a second place that reasons about seats is a
   * second place that can get it wrong.
   */
  static async #onOpenCard(event, target) {
    const actorId = target.dataset.actorId;
    if (actorId) return openCharacterCard(actorId);
    // A demo cast member with no Actor behind them is a legitimate state, not
    // an error: staging a scene should not require statting everyone in it.
    ui.notifications.info(
      game.i18n.format("BLANKINHERITANCE.Stage.NoActor", { name: target.dataset.label ?? "" })
    );
    return null;
  }

  /** Director only. The whole reveal ceremony, for now, is this one toggle. */
  static async #onToggleReveal(event, target) {
    const revealed = target.dataset.revealed !== "true";
    await setRevealed(canvas.scene, target.dataset.portraitId, revealed);
  }

  /**
   * Director only. "Somebody roll this" as an interaction ON a frame, which is
   * the same idea as calling for a check on a cast-board row — the person is
   * the subject, so the person is where the control lives.
   */
  static async #onAskCheck(event, target) {
    await postInlineCheck({ slug: "perception", label: target.dataset.label ?? null });
  }
}

/* ---------------------------------------------------------------- */
/*  The singleton                                                    */
/* ---------------------------------------------------------------- */

let active = null;

export function getStage() {
  return active;
}

/**
 * Show the stage if this scene is staged, remove it entirely if not.
 *
 * Removal rather than hiding, and for the ordinary reason as well as the
 * doctrinal one: an empty overlay left in the DOM over a battle map is an
 * invisible sheet of pointer-events waiting to eat somebody's click.
 */
export function syncStage() {
  const staged = Boolean(canvas?.scene?.getFlag(MODULE_ID, FLAG_KEY));
  if (!staged) {
    active?.close();
    active = null;
    return null;
  }
  if (!active) active = new StageOverlay();
  active.render({ force: true });
  return active;
}

export function refreshStage() {
  active?.render({});
  return active;
}
