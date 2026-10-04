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
 *   (`ownership.default: NONE`), which keeps it out of every player's sidebar,
 *   sheets and stage.
 *
 *   VERIFIED LIVE 2026-09-29 (design/theatre-of-the-mind-staging.md §12.1): ownership does NOT
 *   stop a document being sent. A Player-role client held every NONE-ownership Actor and
 *   JournalEntry in full, including this kind of vault and other players' private handouts.
 *   So this is a boundary against the UI and against casual inspection, not against a player
 *   who opens the browser's developer tools. Nothing here is cryptographic secrecy.
 *
 *   THE REVEALED CAST is published onto the Scene as a flag, because a scene
 *   document IS sent to every client. That is precisely why the concealed half
 *   cannot live there: a name and a portrait path in a scene flag have already
 *   crossed the wire by the time any template decides not to draw them.
 *   Doctrine Law 11 is removal, not hiding. Same pattern, same reasoning, as
 *   foundry/social-store.mjs and foundry/campaign-state.mjs.
 */

import { STAGE_LAYOUTS, castMemberFromDescriptor, publishedCast, stageState } from "../core/stage-layout.mjs";
import { isNameProtected, nameKeyOf, presentCast, renamedMembers, stageAlias } from "../core/stage-names.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { STING_TIERS } from "../core/sting.mjs";
import { isFirstSplash } from "../core/splash.mjs";
import { engageArrivals } from "../core/engage.mjs";
import { openCharacterCard } from "./character-card.mjs";
import { ensureStorageImageCopy } from "./io.mjs";
import { openNotebook } from "./notebook.mjs";
import { syncPeoplePages } from "./notebook-store.mjs";
import { MODULE_ID, ensureStageVault, markNameKnown, readKnownNames } from "./stage-store.mjs";
import { postInlineCheck } from "./rolls.mjs";
import { stagecraftDraws } from "./stagecraft-gate.mjs";
// Deliberately one-directional: this file imports FROM foundry/splash.mjs,
// which never imports back — splash.mjs cannot call setRevealed itself
// (that would be a circular import), so #onSplash below performs both
// writes itself, as two sibling steps, in one place.
import { everSplashedPortraits, markSplashed } from "./splash.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/stage`;
const FLAG_KEY = "stage";

/* ---------------------------------------------------------------- */
/*  The GM-side store                                                */
/* ---------------------------------------------------------------- */

// The vault and the record of known names live in foundry/stage-store.mjs so
// that code which only needs to ask "does the table know this name?" does not
// have to load the overlay class. Re-exported: admin-actions and the Runner
// have always imported these from here.
export { ensureStageVault, readKnownNames };

/** GM only. Every scene's authored cast, keyed by scene id. */
async function readAllAuthoredCasts() {
  if (!game.user.isGM) return {};
  const vault = await ensureStageVault();
  return vault?.getFlag(MODULE_ID, "casts") ?? {};
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

  const published = publishedCast(cast, await readKnownNames());
  await scene.setFlag(MODULE_ID, FLAG_KEY, { layout, cast: published });

  // The notebook follows the stage: a page for each NPC newly revealed, and a
  // page retitled the moment the table learns a name. Access is granted when
  // someone is met, and this is the one place a person becomes met. It must
  // never hold up or break a stage write.
  syncPeoplePages(published).catch((err) =>
    console.warn("Blank Inheritance | Could not update the notebook's people:", err)
  );
  return cast;
}

/**
 * GM only. Tell the table someone's real name.
 *
 * One press, and it is known for the rest of the campaign wherever that person
 * appears: the knowledge is filed by person, then every scene that has them
 * staged is republished with the real name in place of the `called` line.
 *
 * `nameSeq` is stamped on each affected member for the same reason `stingSeq`
 * is (see setRevealed): the moment has to reach every client as DATA in the
 * same update that changes the plate, so each screen plays the stamp from one
 * event. `announce` adds the banner half, as Shift does for a reveal.
 */
export async function revealName(nameKey, { announce = false } = {}) {
  if (!game.user.isGM || !nameKey) return null;
  const vault = await ensureStageVault();
  if (!vault) return null;
  const now = Date.now();

  await markNameKnown(nameKey, now);

  const casts = await readAllAuthoredCasts();
  for (const [sceneId, cast] of Object.entries(casts)) {
    const isThem = (member) => isNameProtected(member) && nameKeyOf(member) === nameKey;
    if (!cast.some(isThem)) continue;
    const scene = game.scenes.get(sceneId);
    if (!scene) continue;
    const next = cast.map((member) =>
      isThem(member) ? { ...member, nameSeq: now, nameSting: announce ? STING_TIERS.ANNOUNCED : STING_TIERS.QUIET } : member
    );
    const layout = scene.getFlag(MODULE_ID, FLAG_KEY)?.layout ?? STAGE_LAYOUTS.LINE;
    await writeAuthoredCast(scene, next, layout);
  }
  await unmaskReferenceTokens(nameKey);
  return now;
}

/**
 * GM only. Give a person's hidden reference tokens their real name and
 * picture back. They are held anonymous while the name is held back
 * (foundry/scene-build.mjs) because a Token is part of the Scene, which every
 * client receives; once the table knows the name there is nothing to protect.
 * Best effort: a failure here must not undo the reveal that already happened.
 */
async function unmaskReferenceTokens(nameKey) {
  const alias = stageAlias(nameKey);
  const actor = game.actors.get(await deriveFoundryId(nameKey));
  if (!actor) return;
  for (const scene of game.scenes) {
    const tokens = scene.tokens.filter(
      (t) => t.getFlag(MODULE_ID, "referenceToken") && t.getFlag(MODULE_ID, "npcRef") === alias
    );
    if (!tokens.length) continue;
    try {
      await scene.updateEmbeddedDocuments(
        "Token",
        tokens.map((t) => ({ _id: t.id, name: actor.name, "texture.src": actor.prototypeToken.texture.src }))
      );
    } catch (err) {
      console.warn(`Blank Inheritance | Could not restore the reference tokens on "${scene.name}":`, err);
    }
  }
}

/** GM only. Whether this person's real name has been told to the table yet. */
export async function isNameRevealed(nameKey) {
  return (await readKnownNames()).has(nameKey);
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

/** A picture copied under a name that says nothing about who it is, or null if that could not be done. */
async function protectedArt(sourcePath, id) {
  const extension = String(sourcePath).split(".").pop().toLowerCase();
  const safe = /^[a-z0-9]{2,5}$/.test(extension) ? extension : "webp";
  try {
    return await ensureStorageImageCopy(sourcePath, `stage-art-${id}.${safe}`);
  } catch (err) {
    console.warn("Blank Inheritance | Could not make an anonymous copy of a stage portrait; showing the silhouette instead:", err);
    return null;
  }
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
 *
 * `at` is a point of the painting the GM dropped them on from the stage's
 * wings (2026-10-04): a Stagecraft scene stands their new card there instead
 * of at their authored place (core/stagecraft-bridge.mjs#placeFor). It is kept
 * GM-side on the authored member (`stageAt`, never published), and every
 * summon writes it afresh, so a later plain summon goes back to the place.
 */
export async function summonToStage(scene, descriptor, { side = null, at = null } = {}) {
  if (!game.user.isGM || !scene || !descriptor?.id) return null;
  const member = castMemberFromDescriptor(descriptor);
  if (side) member.side = side;
  member.stageAt = Array.isArray(at) && at.length >= 2 && at.every?.((n) => Number.isFinite(n)) ? [at[0], at[1]] : null;
  // A protected person's picture is shown under an opaque file name, because
  // `assets/stage/<npc id>.webp` is a name in all but spelling. If the copy
  // cannot be made the frame shows its silhouette rather than the real path.
  if (member.called && member.img) {
    const copied = await protectedArt(member.img, descriptor.id);
    if (copied) member.img = copied;
    else delete member.img;
  }
  // Someone who would plainly be introduced (a name badge, a teacher at the
  // front of the class) arrives already named: known BEFORE the cast is
  // published, so no `called` line is ever sent for them.
  if (member.called && descriptor.nameOnArrival) await markNameKnown(member.nameKey);

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
  // The Director sees the stage the way the table does, with the real name on
  // hover, so the two screens never disagree about who is who.
  return {
    layout: published.layout,
    cast: authored.length ? presentCast(authored, await readKnownNames()) : published.cast ?? []
  };
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
      openNotes: StageOverlay.#onOpenNotes,
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
    // Same diff basis, a different question: who was just TOLD their name.
    // Both are read off this render's own before/after, so a re-render for
    // any other reason cannot replay a stamp.
    const renamed = renamedMembers(this._lastVisibleCast, visible);
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
      entrance: arrivals.get(member.portraitId) ?? null,
      // The label they had a moment ago, only for the render their name lands
      // on; frame.hbs draws it struck through beneath the new one.
      renamedFrom: renamed.get(member.portraitId) ?? null
    }));
    const state = stageState({ cast, layout: staged.layout, canDirect });
    return { ...state, present: true, sceneName: scene?.name ?? null };
  }

  /* -------------------------------------------------------------- */
  /*  Actions                                                        */
  /* -------------------------------------------------------------- */

  /**
   * Clicking a portrait opens the notebook on that person's page: the whole
   * table's notes about them, from every session so far, and a place to add
   * more. Everyone has the same page and may write in it at the same time.
   *
   * Refused for a concealed frame (the Director's ghost). A page's title is
   * visible to every player, so someone the table has not met is given no
   * page until they are revealed.
   */
  static async #onOpenNotes(event, target) {
    const { portraitId, label, img, kind, concealed } = target.dataset;
    if (concealed === "true") {
      ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.Notebook.NotMetYet"));
      return null;
    }
    return openNotebook({ subject: portraitId, label, img: img || null, kind: kind || "npc" });
  }

  /**
   * The frame's Card key (staging doc §3). Both seats open the same
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
  // a scene Stagecraft draws shows its people as cards, not as these frames (foundry/stagecraft-bridge.mjs)
  const staged = Boolean(canvas?.scene?.getFlag(MODULE_ID, FLAG_KEY)) && !stagecraftDraws(canvas.scene);
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
