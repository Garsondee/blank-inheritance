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

import { STAGE_LAYOUTS, castMemberFromDescriptor, publishedCast, stageState } from "../core/stage-layout.mjs";
import { STING_TIERS } from "../core/sting.mjs";
import { isFirstSplash } from "../core/splash.mjs";
import { engageArrivals } from "../core/engage.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { openCharacterCard } from "./character-card.mjs";
import { postInlineCheck } from "./rolls.mjs";
// Deliberately one-directional: this file imports FROM foundry/splash.mjs,
// which never imports back — splash.mjs cannot call setRevealed itself
// (that would be a circular import), so #onSplash below performs both
// writes itself, as two sibling steps, in one place.
import { everSplashedPortraits, markSplashed } from "./splash.mjs";

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

/**
 * GM only. Reveal or conceal one member, then republish.
 *
 * `sting` only matters on the reveal edge (concealed -> revealed) — it is
 * the Director's per-click choice of Quiet/Announced/Splash (§5), carried on
 * the cast member itself because the client that plays the effect is never
 * the client that clicked; see foundry/sting.mjs's file header for why the
 * tier has to travel as data rather than as a second message. Concealing
 * writes it too, harmlessly: publishedCast drops a concealed member
 * entirely, so a `sting` value on a concealed record is inert until the
 * next reveal overwrites it fresh.
 *
 * `stingSeq` is a fresh timestamp stamped on EVERY call, revealed or not.
 * Without it, a repeat Splash on someone already `sting: "splash"` (the
 * deliberate re-spotlight case §5 asks for — "we also use the same version
 * where it would add drama to a scene... they don't need to use it every
 * time") writes data byte-identical to the write before it, and there is no
 * guarantee Foundry re-broadcasts an update whose diff is empty. See
 * core/splash.mjs#splashArrivals, which keys off (sting, stingSeq)
 * transitions rather than sting alone for exactly this reason.
 */
export async function setRevealed(scene, portraitId, revealed, sting = STING_TIERS.QUIET) {
  if (!game.user.isGM || !scene) return null;
  const cast = await readAuthoredCast(scene.id);
  const next = cast.map((member) =>
    member.portraitId === portraitId ? { ...member, revealed, sting, stingSeq: Date.now() } : member
  );
  const layout = scene.getFlag(MODULE_ID, FLAG_KEY)?.layout ?? STAGE_LAYOUTS.LINE;
  return writeAuthoredCast(scene, next, layout);
}

/**
 * Bring anyone onto the CURRENT scene's stage, right now — "a way to summon
 * any character to any theatre of the mind scene" (Ingram, 2026-09-17).
 *
 * Works whether or not the scene was already staged: a scene with no cast at
 * all yet is exactly as valid a target as one mid-conversation, and this is
 * often how a stage would get its FIRST member rather than something layered
 * on top of pre-authored content. `descriptor` is the plain shape
 * core/stage-layout.mjs#castMemberFromDescriptor takes — a real Actor is
 * optional; most of this campaign's NPCs have none yet (see that function's
 * own header), and staging is not chargen.
 *
 * Summoning someone already on the stage moves/re-reveals them rather than
 * duplicating them (same portraitId, matching setRevealed's own update
 * pattern) — a Director re-summoning is "bring them back", not "add a
 * second copy of them".
 */
export async function summonToStage(scene, descriptor, { side = null } = {}) {
  if (!game.user.isGM || !scene || !descriptor?.id) return null;
  const member = castMemberFromDescriptor(descriptor);
  if (side) member.side = side;

  const cast = await readAuthoredCast(scene.id);
  const next = cast.some((m) => m.portraitId === member.portraitId)
    ? cast.map((m) => (m.portraitId === member.portraitId ? { ...m, ...member } : m))
    : [...cast, member];

  const layout = scene.getFlag(MODULE_ID, FLAG_KEY)?.layout ?? STAGE_LAYOUTS.LINE;
  const result = await writeAuthoredCast(scene, next, layout);
  // A scene with no prior stage flag never had the overlay mounted at all —
  // writeAuthoredCast just gave it one, so this client (and this client
  // only; everyone else's canvasReady/updateScene hooks handle themselves)
  // needs telling to mount it now rather than waiting for a scene change.
  if (canvas?.scene?.id === scene.id) syncStage();
  return result;
}

/**
 * Take someone off the stage entirely — not concealed (which keeps them in
 * the Director's own board as a ghost, per §4), genuinely removed. The right
 * shape for an ad-hoc summon: nobody authored them into this scene ahead of
 * time, so there is no "them, but hidden" state worth preserving once the
 * Director is done with them.
 */
export async function removeFromStage(scene, portraitId) {
  if (!game.user.isGM || !scene) return null;
  const cast = await readAuthoredCast(scene.id);
  const next = cast.filter((m) => m.portraitId !== portraitId);
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
      askCheck: StageOverlay.#onAskCheck,
      splash: StageOverlay.#onSplash
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

  /**
   * This client's memory of who was VISIBLE the last time this instance
   * rendered — the diff basis for the frame-engage entrance (§5's middle
   * rung, core/engage.mjs). An instance field, not a module-level cache
   * keyed by scene: StageOverlay is a singleton that is fully torn down and
   * recreated on scene change (see syncStage below), so a fresh instance
   * naturally starts with no memory at all, which is exactly the priming
   * behaviour foundry/sting.mjs and foundry/splash.mjs each need an
   * explicit prime function for — here it falls out of the object lifecycle
   * for free. The one consequence worth naming: the very FIRST render of a
   * freshly staged scene has nothing to diff against, so every already-
   * revealed member reads as "arriving" together. Left as the intended
   * behaviour, not a bug — a stage snapping its cast into place as it loads
   * matches the servo-engage aesthetic rather than fighting it.
   * @type {Array<object>}
   */
  _lastVisibleCast = [];

  /** @override */
  async _prepareContext() {
    const scene = canvas?.scene ?? null;
    const staged = await castForThisClient(scene);
    if (!staged) {
      this._lastVisibleCast = [];
      return { present: false, groups: [], empty: true };
    }

    const canDirect = game.user.isGM;
    // A player's cast contains only revealed members, so `revealed` is absent
    // from it and is normalised to true here. The Director's contains both,
    // and `concealed` is what the frame styles itself by — a ghost in their
    // view and nothing at all in anyone else's.
    const everSplashed = canDirect ? everSplashedPortraits() : [];

    // The engage diff has to run against who is VISIBLE, not who is merely
    // PRESENT in staged.cast — a Director's raw cast already contains every
    // concealed member from the very first render (they are simply marked
    // revealed:false), so a plain presence diff would never catch one
    // transitioning to revealed. Filtering to the revealed subset first
    // matches what a player's cast already is by construction (Law 11 drops
    // a concealed member from it entirely).
    const visible = staged.cast.filter((member) => member.revealed !== false);
    const arrivals = new Map(
      engageArrivals(this._lastVisibleCast, visible).map((a) => [a.portraitId, a.entrance])
    );
    this._lastVisibleCast = visible;

    const cast = staged.cast.map((member) => ({
      ...member,
      revealed: member.revealed ?? true,
      concealed: canDirect && member.revealed === false,
      // Both GM-only computed fields: a player's client never renders the
      // splash key at all (frame.hbs gates it on canDirect), so neither is
      // worth computing — or worth being ABLE to leak — for a player.
      isNpc: canDirect && member.kind === "npc",
      firstAppearance: canDirect && isFirstSplash(member.portraitId, everSplashed),
      // null for everyone except a member arriving THIS render — frame.hbs
      // only emits data-entrance when this is set, so an ordinary re-render
      // (someone else's reveal, a sting change) never replays an already-
      // visible member's own entrance animation.
      entrance: arrivals.get(member.portraitId) ?? null
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

  /**
   * Director only, and the whole reveal ceremony is one control with a
   * modifier — the same vocabulary DirectorBar already established for
   * checks ("Click rolls it... Shift asks the table"), reused here rather
   * than adding a fourth key to a frame that already has three (§3's "two or
   * three keys, never six").
   *
   * Plain click: Quiet — the frame just engages, no banner (§5's default).
   * Shift+click: Announced — the same reveal, plus the banner sting.
   * Concealing (the reverse direction) ignores the modifier entirely: there
   * is no such thing as an announced departure in this build (§5: "someone
   * leaving is information, not an event" — see core/sting.mjs).
   */
  static async #onToggleReveal(event, target) {
    const wasRevealed = target.dataset.revealed === "true";
    const revealed = !wasRevealed;
    const sting = revealed && event?.shiftKey ? STING_TIERS.ANNOUNCED : STING_TIERS.QUIET;
    await setRevealed(canvas.scene, target.dataset.portraitId, revealed, sting);
  }

  /**
   * Director only. "Somebody roll this" as an interaction ON a frame, which is
   * the same idea as calling for a check on a cast-board row — the person is
   * the subject, so the person is where the control lives.
   */
  static async #onAskCheck(event, target) {
    await postInlineCheck({ slug: "perception", label: target.dataset.label ?? null });
  }

  /**
   * Director + NPC only — frame.hbs never renders this key for a player or
   * for a PC frame, and core/splash.mjs#splashArrivals refuses a PC's data
   * independently even so (defense in depth, not the primary gate).
   *
   * Two writes, deliberately kept as two separate calls rather than one
   * combined helper in foundry/splash.mjs (which would need to import
   * setRevealed from THIS file, creating the circular import splash.mjs's
   * own header explains it was built to avoid):
   *   1. setRevealed — the actual sting: "splash" write, reusing the exact
   *      same path Quiet/Announced already use. Always `revealed: true`;
   *      on an already-revealed member that half is a no-op and stingSeq is
   *      what makes the re-spotlight case a real, detectable event anyway.
   *   2. markSplashed — records this as no longer a first appearance, so
   *      the frame key's nudge glow does not relight next time. GM-only,
   *      and a no-op if this portraitId is already recorded.
   */
  static async #onSplash(event, target) {
    const portraitId = target.dataset.portraitId;
    await setRevealed(canvas.scene, portraitId, true, STING_TIERS.SPLASH);
    await markSplashed(portraitId);
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
