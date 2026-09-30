/**
 * Building the campaign's real Scene set into a live world.
 *
 * Reads data/campaign/scene-set.json and the gazetteer locations it names, and
 * creates the scenes, the folders they sit in and the player-facing Scenes
 * journal. (The campaign map's Note pins were retired 2026-09-28; a rebuild
 * deletes any it made. Departures draw their own markers: foundry/city-layer.mjs.)
 *
 * IDEMPOTENT, and deliberately gentler than stage-demo.mjs was. That generator
 * deleted and recreated each scene wholesale, which is fine for a demo and
 * hostile for a scene a GM has been working in -- it would throw away tokens,
 * lights, walls and anything else placed by hand. This one UPDATES in place and
 * only ever deletes documents carrying our own generated flag.
 *
 * All the deciding happens in core/generators/scene-set.mjs. This file is the
 * half that talks to Foundry.
 */

import { pinJournalPage, sceneSetPlan, validateSceneSet } from "../core/generators/scene-set.mjs";
import { sceneCalibration } from "../core/travel-animation.mjs";
import { campaignMapImageWidth } from "./travel.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { DIAGNOSTIC_NAME_PATTERN } from "../core/diagnostic-content.mjs";
import { isDisposableDuplicateScene } from "../core/world-sync.mjs";
import { fetchModuleJson } from "./io.mjs";
import { cachedAudio, loadAudio } from "./audio-store.mjs";
import { readKnownNames } from "./stage-store.mjs";
import { isNameProtected, stageAlias } from "../core/stage-names.mjs";

const MODULE_ID = "blank-inheritance";
const MANIFEST_PATH = "data/campaign/campaign/scene-set.json";
const LOCATION_PATH = (id) => `data/campaign/locations/${id}.json`;

// Foundry's own silhouette, shown on a hidden reference token while the person's
// name is held back: their real portrait path names them.
const ANONYMOUS_TOKEN_IMAGE = "icons/svg/mystery-man.svg";

const flagFor = (payload) => ({ [MODULE_ID]: { generated: true, ...payload } });
const isGenerated = (doc) => doc?.getFlag?.(MODULE_ID, "generated") === true;

/** The manifest plus every gazetteer location it actually references. */
export async function loadSceneSet() {
  const manifest = await fetchModuleJson(MANIFEST_PATH);
  const wanted = [...new Set((manifest.scenes ?? []).map((s) => s.locationRef).filter(Boolean))];
  const locations = new Map();
  const missing = [];

  await Promise.all(
    wanted.map(async (id) => {
      try {
        locations.set(id, await fetchModuleJson(LOCATION_PATH(id)));
      } catch {
        // Reported through validateSceneSet rather than thrown: one missing
        // location must not stop the other fifteen scenes being built.
        missing.push(id);
      }
    })
  );

  const problems = validateSceneSet(manifest, { locations });
  for (const id of missing) problems.push(`location "${id}" could not be loaded — has data/locations/ been pushed?`);
  return { manifest, locations, problems };
}

async function ensureFolder(group) {
  const id = await deriveFoundryId(`scene-folder-${group.id}`);
  const existing = game.folders.get(id);
  if (existing) {
    if (existing.name !== group.name) await existing.update({ name: group.name });
    return existing;
  }
  return Folder.create(
    { _id: id, name: group.name, type: "Scene", color: group.colour ?? null, flags: flagFor({ kind: "scene-folder", group: group.id }) },
    { keepId: true }
  );
}

/**
 * The single player-facing journal of places (the map's pins used to open it).
 *
 * One entry with a page per place rather than an entry per place: a pin can
 * point at a page (Note#pageId), and twenty loose journal entries in a
 * player's sidebar is worse than one they can read end to end.
 *
 * EVERY PAGE HAS A DERIVED, STABLE ID, and rebuilding reconciles rather than
 * replaces. Both halves of that matter, and the first version had neither:
 *
 *   Wholesale delete-then-recreate gave every page a NEW id on every rebuild,
 *   so each map pin's `pageId` pointed at a page that no longer existed. The
 *   pins happened to be rebuilt straight afterwards and re-linked, which is
 *   exactly the kind of accident that works until the day the second half
 *   fails.
 *
 *   It also threw outright when any of those pages was open in a sheet —
 *   ProseMirror's editor teardown reaches for a clipboard that has gone —
 *   which is how it was found: the first build worked and the second did not.
 */
async function ensurePinJournal(plans, locations) {
  const id = await deriveFoundryId("scene-pin-journal");
  const pages = await Promise.all(
    plans.map(async (plan) => ({
      _id: await deriveFoundryId(`scene-pin-page-${plan.sourceId}`),
      // cleanName, never plan.data.name -- the latter now carries the GM-facing
      // "03. " ordering prefix (sceneSetPlan's own display-prefix work), and a
      // player-facing pin journal page must never show it.
      ...pinJournalPage({ name: plan.cleanName, blurb: plan.blurb }, plan.locationRef ? locations.get(plan.locationRef) : null, {
        sceneId: plan.data._id
      })
    }))
  );

  const existing = game.journal.get(id);
  if (!existing) {
    return JournalEntry.create(
      {
        _id: id,
        name: game.i18n.localize("BLANKINHERITANCE.Scenes.PinJournal"),
        pages,
        // Players must be able to read what a pin opens, or the pin is furniture.
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: flagFor({ kind: "pin-journal" })
      },
      { keepId: true }
    );
  }

  const wanted = new Set(pages.map((p) => p._id));
  const have = new Set(existing.pages.map((p) => p.id));
  const toCreate = pages.filter((p) => !have.has(p._id));
  const toUpdate = pages.filter((p) => have.has(p._id));
  const toDelete = [...have].filter((pid) => !wanted.has(pid));

  if (toDelete.length) await existing.deleteEmbeddedDocuments("JournalEntryPage", toDelete);
  if (toUpdate.length) await existing.updateEmbeddedDocuments("JournalEntryPage", toUpdate.map(({ _id, ...rest }) => ({ _id, ...rest })));
  if (toCreate.length) await existing.createEmbeddedDocuments("JournalEntryPage", toCreate, { keepId: true });
  return existing;
}

// Pixel spacing between hidden reference tokens laid along one edge of a
// scene. Position is arbitrary -- these are never composed for a player to
// look at, ever (Token#hidden, enforced server-side, same mechanism
// design/theatre-of-the-mind-staging.md §4 already named as the right way to
// keep something off a player's client) -- this only needs to keep multiple
// NPCs in one scene from stacking exactly on top of each other so the GM can
// tell them apart by hovering.
const REFERENCE_TOKEN_SPACING = 140;

/**
 * Place a hidden, actor-linked Token for every named cast NPC in a scene
 * brief, so the GM can click straight into an NPC's sheet during Theatre of
 * Mind play instead of hunting for it (Ingram, 2026-09-29). Reconciles
 * rather than replaces, same idiom as ensurePinJournal above: create what's
 * missing, update what points at a different actor now, delete what's no
 * longer cast.
 *
 * Never called for an ADOPTED scene (see buildSceneSet's own "HANDS OFF ITS
 * CONTENT" comment) -- a hand-built scene's placeables are a human's, not
 * ours to add to. Silently does nothing if no scene brief is pushed for this
 * scene yet, or it has no cast, or a cast npcRef doesn't resolve to a real
 * Actor (most likely because the npc content sync hasn't run yet this pass
 * -- see world-sync.mjs's call order, which already runs it first).
 */
/**
 * Every distinct npcRef a scene brief's cast actually names, in cast order,
 * de-duplicated -- a walk-on with no npcRef (most of a cast array, by
 * design: see scene-brief.schema.json's own doc comment) contributes
 * nothing here, since there is no npc file to build a reference Actor from.
 * Pure, no Foundry -- separated out so "which ids does this brief want" is
 * testable without a mock Scene at all.
 */
export function castNpcRefs(brief) {
  return [...new Set((brief?.cast ?? []).map((c) => c.npcRef).filter(Boolean))];
}

/**
 * Decide what create/update/delete Foundry actually needs to reconcile a
 * scene's hidden reference tokens against its current cast -- same
 * create/update/delete-by-diff idiom as ensurePinJournal above, but kept
 * PURE and exported so the reconciliation logic itself has real test
 * coverage: this project's mock Foundry deliberately doesn't model Scene's
 * embedded Token collection (see this file's own header on why), so nothing
 * downstream of a real Scene call can be exercised in a unit test -- but the
 * DECIDING can, and that's where a real bug (wrong id kept, a stale actorId
 * left un-updated, the wrong entry deleted) would actually live.
 *
 * @param {Map<string,string>} wantedActorIdByNpcId  npcRef -> Foundry Actor id,
 *   already filtered to ids with a real, existing Actor (a cast npcRef with
 *   no synced Actor yet is simply absent here, not an error -- see
 *   syncCastReferenceTokens's own doc comment).
 * @param {Array<{id:string, actorId:string, hidden:boolean, npcRef:string|null}>} existingTokens
 *   every token on the scene already carrying this pipeline's own
 *   `referenceToken` flag, as plain data (never a real TokenDocument --
 *   the caller reads `.getFlag`/`.id`/`.actorId`/`.hidden` into this shape).
 * @param {(name:string)=>string|undefined} [actorNameFor]  looks up an
 *   Actor's display name for a newly-created token's own `name` field;
 *   falls back to the npcRef itself when omitted (nameless in test data).
 */
export function planReferenceTokens(wantedActorIdByNpcId, existingTokens, actorNameFor = () => undefined, publicFor = () => null) {
  const haveByNpcId = new Map(existingTokens.map((t) => [t.npcRef, t]));

  const toDelete = existingTokens.filter((t) => !wantedActorIdByNpcId.has(t.npcRef)).map((t) => t.id);

  const toCreate = [];
  const toUpdate = [];
  let index = 0;
  for (const [npcId, actorId] of wantedActorIdByNpcId) {
    const existingToken = haveByNpcId.get(npcId);
    const x = REFERENCE_TOKEN_SPACING * (1 + index);
    const y = REFERENCE_TOKEN_SPACING;
    index += 1;
    // A hidden Token is still part of the Scene document, and a Scene reaches
    // every client, so its name and picture are as public as the stage's.
    // `publicFor` returns what to show INSTEAD while a person's real name is
    // being held back ({ name, img }), or null when nothing is held back.
    const held = publicFor(npcId, actorId);
    const wantedName = held?.name ?? actorNameFor(actorId) ?? npcId;
    if (existingToken) {
      const stale = {};
      // Only a token that reports a name is checked; one that does not is
      // left alone rather than renamed on a guess.
      if (existingToken.name !== undefined && existingToken.name !== wantedName) stale.name = wantedName;
      if (held?.img && existingToken.img !== undefined && existingToken.img !== held.img) stale["texture.src"] = held.img;
      if (existingToken.actorId !== actorId || !existingToken.hidden) {
        toUpdate.push({ _id: existingToken.id, actorId, hidden: true, ...stale });
      } else if (Object.keys(stale).length) {
        toUpdate.push({ _id: existingToken.id, ...stale });
      }
    } else {
      toCreate.push({
        actorId,
        hidden: true,
        actorLink: true,
        x,
        y,
        name: wantedName,
        ...(held?.img ? { texture: { src: held.img } } : {}),
        flags: flagFor({ referenceToken: true, npcRef: npcId })
      });
    }
  }

  return { toCreate, toUpdate, toDelete };
}

async function syncCastReferenceTokens(scene, briefRef) {
  let brief;
  try {
    brief = await fetchModuleJson(`data/campaign/scene-briefs/${briefRef}.json`);
  } catch {
    return;
  }

  // The token's own flag is player-readable, so it is keyed by the anonymous
  // alias, never the npc id (core/stage-names.mjs#stageAlias). The plan below
  // does not care what its keys are; this is the only place that knows.
  const wantedActorIdByAlias = new Map();
  const npcIdByAlias = new Map();
  for (const npcId of castNpcRefs(brief)) {
    const actorId = await deriveFoundryId(npcId);
    if (!game.actors.get(actorId)) continue;
    wantedActorIdByAlias.set(stageAlias(npcId), actorId);
    npcIdByAlias.set(stageAlias(npcId), npcId);
  }

  const existingTokens = scene.tokens
    .filter((t) => t.getFlag(MODULE_ID, "referenceToken"))
    .map((t) => ({ id: t.id, actorId: t.actorId, hidden: t.hidden, name: t.name, img: t.texture?.src, npcRef: t.getFlag(MODULE_ID, "npcRef") }));

  const namesTold = await readKnownNames();
  const publicFor = (alias) => {
    const npcId = npcIdByAlias.get(alias);
    const member = (brief.cast ?? []).find((c) => c.npcRef === npcId && isNameProtected(c));
    if (!member || namesTold.has(npcId)) return null;
    return { name: member.called, img: ANONYMOUS_TOKEN_IMAGE };
  };

  const { toCreate, toUpdate, toDelete } = planReferenceTokens(wantedActorIdByAlias, existingTokens, (actorId) => game.actors.get(actorId)?.name, publicFor);

  if (toDelete.length) await scene.deleteEmbeddedDocuments("Token", toDelete);
  if (toUpdate.length) await scene.updateEmbeddedDocuments("Token", toUpdate);
  if (toCreate.length) await scene.createEmbeddedDocuments("Token", toCreate);
}

/**
 * Delete Notes from a scene that is not the one on screen.
 *
 * FOUNDRY v14 BUG, found live 2026-09-17 and worked around rather than
 * avoided. `CanvasDocumentMixin._onDeleteOperation` ends with:
 *
 *     const layer = documents[0].layer;
 *     layer.clipboard.objects = layer.clipboard.objects.filter(...)
 *
 * (client/documents/abstract/canvas-document.mjs:261-265). `document.layer`
 * resolves through `canvas`, so it is NULL for any scene that is not the one
 * currently drawn — and deleting a Note on any other scene throws
 * "Cannot read properties of null (reading 'clipboard')" AFTER the delete has
 * already gone through. The documents really are gone; only the client-side
 * clipboard tidy-up failed.
 *
 * So: swallow exactly that failure and then CHECK, rather than trusting either
 * the throw or the absence of one. Rebuilding the map must not depend on the
 * GM happening to be looking at it.
 */
async function deleteNotesOffCanvas(scene, ids) {
  try {
    await scene.deleteEmbeddedDocuments("Note", ids);
  } catch (err) {
    if (!/clipboard/.test(String(err?.message))) throw err;
  }
  const survivors = ids.filter((id) => scene.notes.get(id));
  if (survivors.length) throw new Error(`${survivors.length} old pin(s) could not be removed`);
}

/**
 * Build (or rebuild) every scene in the manifest.
 *
 * @param {object} [options]
 * @param {boolean} [options.activateLanding]  make the landing scene active. Off by
 *   default: rebuilding mid-session must never yank the table to another scene.
 */
export async function buildSceneSet({ notify = true, activateLanding = false } = {}) {
  if (!game.user.isGM) return { problems: ["only a GM can build scenes"], created: [], updated: [] };

  const { manifest, locations, problems } = await loadSceneSet();
  const report = { created: [], updated: [], pinsRetired: 0, bound: 0, problems: [...problems] };

  // Which briefs actually have a soundscape authored for them. Best-effort:
  // a world with no audio pushed yet must still build all its scenes.
  let soundscapes = new Set();
  try {
    const audio = cachedAudio() ?? (await loadAudio());
    soundscapes = new Set((audio?.soundscapes ?? new Map()).keys());
  } catch (err) {
    report.problems.push(`could not read the audio library to bind soundscapes: ${err.message}`);
  }

  const folders = new Map();
  for (const group of manifest.groups ?? []) folders.set(group.id, await ensureFolder(group));

  const idFor = new Map();
  for (const scene of manifest.scenes ?? []) idFor.set(scene.id, await deriveFoundryId(`scene-${scene.id}`));
  const plans = sceneSetPlan(manifest, (sourceId) => idFor.get(sourceId));

  // Which REAL Foundry scene id ended up representing each manifest entry --
  // almost always idFor's own deterministic one, except for a scene ADOPTED
  // below (see the main loop). The hub pass after the loop must use this,
  // not idFor directly, or an adopted hub would be skipped.
  const realIdFor = new Map();

  const journal = await ensurePinJournal(
    plans.filter((p) => p.blurb),
    locations
  );
  const pageIdFor = new Map();
  for (const plan of plans.filter((p) => p.blurb)) {
    pageIdFor.set(plan.sourceId, await deriveFoundryId(`scene-pin-page-${plan.sourceId}`));
  }

  for (const plan of plans) {
    try {
      const folder = folders.get(plan.group);
      const byId = game.scenes.get(plan.data._id);
      // A scene this pipeline never built (a hub map somebody drew by hand
      // in Foundry before this scene had a sourceId flag to find it by, the
      // real production "Campaign Map" being the known example) still counts
      // as "the same scene" once ADOPTED once -- matched first by a sourceId
      // flag a PRIOR adoption already stamped, or, the very first time, by
      // the explicit adoptSceneNamed bridge (schema's own doc comment: a
      // deliberate, authored name match, never a general heuristic). Without
      // this, re-running against a world with a hand-built hub silently
      // creates a SECOND, empty, duplicate scene at the deterministic id
      // every time.
      const bySourceId = byId ? null : game.scenes.find((s) => s.getFlag(MODULE_ID, "sourceId") === plan.sourceId);
      const byName = byId || bySourceId || !plan.adoptSceneNamed ? null : game.scenes.getName(plan.adoptSceneNamed);
      const adopted = bySourceId ?? byName;
      const existing = byId ?? adopted;

      if (adopted) {
        // HANDS OFF ITS CONTENT -- plan.data is a full single-background
        // picture-scene payload (width/height/padding/grid/environment/...)
        // built by buildStageSceneData for a scene THIS pipeline constructs,
        // and forcing it onto a scene a human already built (the real
        // "Campaign Map"'s own 12400x12400, four-Tile construction, nothing
        // like the manifest's 6200x6200 single-image assumption) would
        // silently corrupt real production geometry. Adoption means exactly
        // what it says -- recognise it, claim it with our own flags, and
        // never touch what is already there.
        //
        // The ONE exception is the display-ordering prefix on `name` itself
        // (sceneSetPlan's own "01. "/"02a. " work, 2026-09-18) -- a rename
        // touches nothing about a Scene's geometry or content, so an adopted
        // scene gets numbered into the sidebar's play order too, same as
        // every scene this pipeline actually builds.
        const adoptedOriginalName = adopted.name;
        if (adoptedOriginalName !== plan.data.name) await adopted.update({ name: plan.data.name });
        // The SECOND exception, the hub only (2026-09-28, design/world-map-
        // destinations.md): every player reads the whole map to choose where
        // to go, and each character's pawn is a real token they own. With
        // token vision or fog exploration on, a player with no pawn yet sees
        // a black screen, and one with a pawn sees a circle round it. Vision
        // is not geometry or content; nothing else here is touched.
        if (plan.kind === "hub" && (adopted.tokenVision || adopted.fog?.exploration)) {
          await adopted.update({ tokenVision: false, "fog.exploration": false });
          report.problems.push(`"${plan.data.name}": token vision and fog were on; turned off so players can read the whole map`);
        }
        report.updated.push(plan.data.name);
        report.adopted = [...(report.adopted ?? []), `"${plan.data.name}" is the real, existing "${adoptedOriginalName}" (${adopted.id})`];
      } else if (byId) {
        // Update, never replace: a GM's own tokens, walls and lights live here.
        // This is a scene OUR OWN pipeline built, so its content is ours to refresh.
        const { _id, ...updateData } = plan.data;
        await existing.update({ ...updateData, folder: folder?.id ?? null });
        report.updated.push(plan.data.name);
      } else {
        await Scene.create({ ...plan.data, folder: folder?.id ?? null, flags: flagFor({ sourceId: plan.sourceId, briefRef: plan.briefRef, locationRef: plan.locationRef, kind: plan.kind }) }, { keepId: true });
        report.created.push(plan.data.name);
      }
      const scene = existing ?? game.scenes.get(plan.data._id);
      realIdFor.set(plan.sourceId, scene.id);
      await scene.setFlag(MODULE_ID, "sourceId", plan.sourceId);
      if (plan.briefRef) await scene.setFlag(MODULE_ID, "briefRef", plan.briefRef);
      if (plan.locationRef) await scene.setFlag(MODULE_ID, "locationRef", plan.locationRef);
      await scene.setFlag(MODULE_ID, "kind", plan.kind);
      // Distinct from sourceId, which both branches set identically: this is
      // the one bit retireOrphanedScenes (below) needs to never delete a hand
      // -built scene just because its manifest entry went away. "We created
      // this, we can always recreate it" only true on the `else` branch above.
      await scene.setFlag(MODULE_ID, "adopted", Boolean(adopted));

      // Hidden GM-reference tokens for this scene's cast -- never on an
      // adopted (hand-built) scene, same "hands off its content" rule as the
      // adoption branch above.
      if (!adopted && plan.briefRef) {
        try {
          await syncCastReferenceTokens(scene, plan.briefRef);
        } catch (err) {
          report.problems.push(`could not place reference tokens on "${plan.data.name}": ${err.message}`);
        }
      }

      // A scene and its soundscape are keyed by the same scene-brief id, so
      // bind them here rather than making a GM press "Bind to scene" sixteen
      // times for a correspondence the data already states. Activating the
      // scene then brings its own audio with it (audio-director.mjs's
      // scene-activate trigger), which is the whole point of both being
      // authored against the brief.
      if (plan.briefRef && soundscapes.has(plan.briefRef)) {
        await scene.setFlag(MODULE_ID, "audio", { soundscape: plan.briefRef });
        report.bound += 1;
      }
    } catch (err) {
      report.problems.push(`could not build "${plan.data.name}": ${err.message}`);
    }
  }

  // The map's old Note pins, retired 2026-09-28 (design/world-map-destinations.md):
  // departures draw their own markers now. Only ever remove pins WE made -- a
  // GM's own note on the map survives.
  for (const hub of (manifest.scenes ?? []).filter((s) => s.kind === "hub")) {
    const scene = game.scenes.get(realIdFor.get(hub.id) ?? idFor.get(hub.id));
    if (!scene) continue;
    try {
      const ours = scene.notes.filter((n) => isGenerated(n)).map((n) => n.id);
      if (ours.length) await deleteNotesOffCanvas(scene, ours);
      report.pinsRetired += ours.length;
    } catch (err) {
      report.problems.push(`could not clear the old map pins: ${err.message}`);
    }
  }

  if (activateLanding) {
    const landing = plans.find((p) => p.isLanding);
    const scene = landing ? game.scenes.get(realIdFor.get(landing.sourceId) ?? landing.data._id) : null;
    if (scene && !scene.active) await scene.activate();
  }

  if (notify) {
    ui.notifications.info(
      game.i18n.format("BLANKINHERITANCE.Scenes.Built", { created: report.created.length, updated: report.updated.length })
    );
    for (const adoption of report.adopted ?? []) ui.notifications.info(`Adopted an existing hand-built scene: ${adoption}`);
    for (const problem of report.problems) ui.notifications.warn(problem);
  }
  return report;
}

/**
 * Delete the scenes that were only ever scaffolding.
 *
 * Names nothing by guesswork: a scene qualifies only by carrying one of the
 * stage demo's own sourceId flags, by being Foundry's untouched new-world
 * scene, or by SELF-LABELLING as scratch in its own name (see
 * core/diagnostic-content.mjs's DIAGNOSTIC_NAME_PATTERN -- this project's own
 * established convention, shared with scene-runner.mjs's summon list, not a
 * heuristic invented here). Anything else -- including a scene a GM made
 * themselves -- is left alone and reported as skipped.
 */
export const DEMO_SOURCE_IDS = Object.freeze(["stage-demo-bar", "stage-demo-briefing", "stage-demo-command", "stage-demo-summons"]);
const DEFAULT_WORLD_BACKGROUND = "nue/defaultscene/fvtt-background.webp";

export function isTemporaryScene(scene) {
  const sourceId = scene?.getFlag?.(MODULE_ID, "sourceId");
  if (DEMO_SOURCE_IDS.includes(sourceId)) return "stage demo";
  const bg = scene?.levels?.contents?.[0]?.background?.src ?? scene?.background?.src ?? "";
  if (bg === DEFAULT_WORLD_BACKGROUND) return "Foundry's own new-world scene";
  if (DIAGNOSTIC_NAME_PATTERN.test(scene?.name ?? "")) return "self-labelled diagnostic/test-fixture scene";
  return null;
}

export async function retireTemporaryScenes({ notify = true } = {}) {
  if (!game.user.isGM) return { removed: [], kept: [] };
  const removed = [];
  const kept = [];

  for (const scene of [...game.scenes]) {
    const why = isTemporaryScene(scene);
    if (!why) { kept.push(scene.name); continue; }
    try {
      // An active scene cannot simply vanish from under the table; move
      // everyone somewhere real first.
      if (scene.active) {
        const landing = game.scenes.find((s) => s.getFlag(MODULE_ID, "kind") === "landing" && s.id !== scene.id);
        if (landing) await landing.activate();
      }
      await scene.delete();
      removed.push(`${scene.name} (${why})`);
    } catch (err) {
      kept.push(`${scene.name} — could not delete: ${err.message}`);
    }
  }

  if (notify) ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Scenes.Retired", { count: removed.length }));
  return { removed, kept };
}

/**
 * Delete a scene THIS PIPELINE built whose source entry no longer exists in
 * the current manifest -- the other half of "add or remove scenes to match
 * the current state of the adventure" (Ingram, 2026-09-19). Proof of
 * ownership, never a guess, same shape as retireTemporaryScenes above: a
 * scene qualifies only if it carries our own sourceId flag (a hand-built
 * scene has none, so it is invisible to this function by construction) AND
 * that sourceId is no longer named anywhere in scene-set.json AND it was
 * never merely ADOPTED (buildSceneSet's `adopted` flag) -- an adopted scene
 * is a human's real work we only ever recognised, not something we can
 * safely destroy just because the manifest stopped mentioning it, and not
 * something we could recreate if the deletion turned out to be wrong. A
 * created-and-now-orphaned scene fails neither test: we made it, we can
 * remake it from the manifest on the next `buildSceneSet()` if a scene
 * comes back, so deleting it is a real, recoverable "remove," not a risk.
 */
export async function retireOrphanedScenes({ notify = true } = {}) {
  if (!game.user.isGM) return { removed: [], kept: [] };
  const { manifest } = await loadSceneSet();
  const knownSourceIds = new Set((manifest.scenes ?? []).map((s) => s.id));
  const removed = [];
  const kept = [];

  for (const scene of [...game.scenes]) {
    const sourceId = scene.getFlag(MODULE_ID, "sourceId");
    if (!sourceId || knownSourceIds.has(sourceId) || scene.getFlag(MODULE_ID, "adopted")) {
      kept.push(scene.name);
      continue;
    }
    try {
      // An active scene cannot simply vanish from under the table; move
      // everyone somewhere real first (same rescue as retireTemporaryScenes).
      if (scene.active) {
        const landing = game.scenes.find((s) => s.getFlag(MODULE_ID, "kind") === "landing" && s.id !== scene.id);
        if (landing) await landing.activate();
      }
      await scene.delete();
      removed.push(`${scene.name} (source "${sourceId}" no longer in scene-set.json)`);
    } catch (err) {
      kept.push(`${scene.name} — could not delete: ${err.message}`);
    }
  }

  if (notify && removed.length) {
    ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Scenes.OrphansRetired", { count: removed.length }));
  }
  return { removed, kept };
}

/**
 * A real playable scene is never this small in EITHER dimension -- even the
 * smallest authored sub-room is thousands of pixels across. Found live
 * 2026-09-18: three stray scenes on the real world (two named "Contact,
 * Unclassified", one "Shucks Mordant" -- both real Claimants, so presumably
 * one-off scenes built to eyeball that ACTOR's own token/ring in isolation)
 * at 1x1 to 4x4. Confident enough that these are not real content to get them
 * off the main scene list; not confident enough about WHY each one exists to
 * delete rather than set aside.
 */
const TINY_SCENE_MAX_DIMENSION = 200;

/**
 * A scene this pipeline doesn't recognise (no sourceId flag matching a real
 * manifest entry) AND isn't already caught by isTemporaryScene's own
 * DELETE-worthy patterns, and is EITHER too small to plausibly be a real
 * place a scene brief ever sends the table to, OR carries the exact clean
 * name of a scene the manifest DOES define -- a duplicate left behind by an
 * older, now-superseded way of building it. Found live 2026-09-18: a loose,
 * unfoldered "Directorate HQ — Lobby" sitting next to the real, properly
 * managed "02. Directorate HQ — Lobby" -- design/foundry-module-design.md
 * §7's OLD ad-hoc landing-scene creator (issue #160, since replaced by this
 * whole scene-set pipeline), never cleaned up after being superseded.
 *
 * @param {Set<string>} knownSourceIds  every scene id data/campaign/scene-set.json actually names
 * @param {Set<string>} knownCleanNames  every scene's own unprefixed `name` in that same manifest
 */
export function isSuspectedStrayScene(scene, knownSourceIds, knownCleanNames = new Set()) {
  const sourceId = scene?.getFlag?.(MODULE_ID, "sourceId");
  if (sourceId && knownSourceIds.has(sourceId)) return false;
  if (isTemporaryScene(scene)) return false; // already handled, by deletion, elsewhere
  if (knownCleanNames.has(scene?.name)) return true; // a real place's name, but not OUR copy of it
  const w = scene?.width ?? Infinity;
  const h = scene?.height ?? Infinity;
  return w <= TINY_SCENE_MAX_DIMENSION && h <= TINY_SCENE_MAX_DIMENSION;
}

async function ensureQuarantineFolder() {
  const id = await deriveFoundryId("scene-folder-diagnostics-fixtures");
  const existing = game.folders.get(id);
  if (existing) return existing;
  return Folder.create(
    { _id: id, name: "Diagnostics & Fixtures", type: "Scene", color: "#555555", flags: flagFor({ kind: "scene-folder", group: "diagnostics-fixtures" }) },
    { keepId: true }
  );
}

/**
 * Set aside, never delete -- the safer half of Ingram's own "get rid of...
 * and/or move... into a special folder" (2026-09-18). Unlike
 * retireTemporaryScenes, which only ever acts on scenes this project can
 * name with certainty, this is the catch-all for something that LOOKS like
 * scratch but was never confidently identified -- moved where it stops
 * cluttering the real session folders, kept in case whoever made it still
 * needs it.
 */
export async function quarantineStrayScenes({ notify = true } = {}) {
  if (!game.user.isGM) return { moved: [], kept: [] };
  const { manifest } = await loadSceneSet();
  const knownSourceIds = new Set((manifest.scenes ?? []).map((s) => s.id));
  const knownCleanNames = new Set((manifest.scenes ?? []).map((s) => s.name).filter(Boolean));
  const folder = await ensureQuarantineFolder();
  const moved = [];
  const kept = [];

  for (const scene of [...game.scenes]) {
    if (!isSuspectedStrayScene(scene, knownSourceIds, knownCleanNames)) { kept.push(scene.name); continue; }
    if (scene.folder?.id === folder.id) { kept.push(scene.name); continue; } // already quarantined
    try {
      await scene.update({ folder: folder.id });
      moved.push(scene.name);
    } catch (err) {
      kept.push(`${scene.name} — could not move: ${err.message}`);
    }
  }

  if (notify) ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Scenes.Quarantined", { count: moved.length }));
  return { moved, kept };
}

/**
 * How many things are placed on a scene: every embedded collection except its
 * levels (Foundry v14 gives every scene a default level, so a level alone is
 * not content). Read from the Scene class's own metadata rather than a
 * hand-kept list, so a collection a later Foundry adds is counted too.
 */
export function placeableCount(scene) {
  const collections = Object.values(scene?.constructor?.metadata?.embedded ?? {}).filter((name) => name !== "levels");
  if (!collections.length) return null; // unknown shape: never read as "empty"
  return collections.reduce((total, name) => total + (scene[name]?.size ?? 0), 0);
}

/**
 * Delete an EMPTY copy of a scene the scene set builds -- one not built by
 * this pipeline, carrying a managed scene's exact name, with nothing placed on
 * it (core/world-sync.mjs#isDisposableDuplicateScene). quarantineStrayScenes
 * below could only set these aside, not being sure what they were; the
 * known one on the live world is the old "Directorate HQ — Lobby" the first
 * landing-scene code made (2026-09-17), sitting in "Diagnostics & Fixtures"
 * with a stale picture and nothing on it. Ingram, 2026-09-27: "get rid of
 * scenes which aren't useful". Empty is the whole test for safety -- a copy
 * with anything on it stays set aside for a person to look at.
 */
export async function retireDuplicateScenes({ notify = true } = {}) {
  if (!game.user.isGM) return { removed: [], kept: [] };
  const { manifest } = await loadSceneSet();
  const knownSourceIds = new Set((manifest.scenes ?? []).map((s) => s.id));
  const knownCleanNames = new Set((manifest.scenes ?? []).map((s) => s.name).filter(Boolean));
  const removed = [];
  const kept = [];

  for (const scene of [...game.scenes]) {
    const summary = { name: scene.name, sourceId: scene.getFlag(MODULE_ID, "sourceId") ?? null, placeables: placeableCount(scene) };
    if (!isDisposableDuplicateScene(summary, { knownSourceIds, knownCleanNames })) continue;
    try {
      // Same rescue as the other retirements: never delete from under the table.
      if (scene.active) {
        const landing = game.scenes.find((s) => s.getFlag(MODULE_ID, "kind") === "landing" && s.id !== scene.id);
        if (landing) await landing.activate();
      }
      await scene.delete();
      removed.push(scene.name);
    } catch (err) {
      kept.push(`${scene.name} — could not delete: ${err.message}`);
    }
  }

  if (notify && removed.length) ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Scenes.DuplicatesRetired", { count: removed.length }));
  return { removed, kept };
}
