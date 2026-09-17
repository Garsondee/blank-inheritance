/**
 * Building the campaign's real Scene set into a live world.
 *
 * Reads data/campaign/scene-set.json, resolves every pin against the gazetteer
 * locations it names, and creates the scenes, the folders they sit in, the
 * campaign map's pins and the player-facing journal behind those pins.
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

import { hubPinPlan, pinJournalPage, sceneSetPlan, validateSceneSet } from "../core/generators/scene-set.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { fetchModuleJson } from "./io.mjs";
import { cachedAudio, loadAudio } from "./audio-store.mjs";

const MODULE_ID = "blank-inheritance";
const MANIFEST_PATH = "data/campaign/campaign/scene-set.json";
const LOCATION_PATH = (id) => `data/campaign/locations/${id}.json`;

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
 * The single player-facing journal the map's pins open.
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
      ...pinJournalPage({ name: plan.data.name, blurb: plan.blurb }, plan.locationRef ? locations.get(plan.locationRef) : null, {
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
  const report = { created: [], updated: [], pins: 0, bound: 0, problems: [...problems] };

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
      const existing = game.scenes.get(plan.data._id);
      if (existing) {
        // Update, never replace: a GM's own tokens, walls and lights live here.
        await existing.update({ ...plan.data, folder: folder?.id ?? null });
        report.updated.push(plan.data.name);
      } else {
        await Scene.create({ ...plan.data, folder: folder?.id ?? null, flags: flagFor({ sourceId: plan.sourceId, briefRef: plan.briefRef, locationRef: plan.locationRef, kind: plan.kind }) }, { keepId: true });
        report.created.push(plan.data.name);
      }
      const scene = game.scenes.get(plan.data._id);
      await scene.setFlag(MODULE_ID, "sourceId", plan.sourceId);
      if (plan.briefRef) await scene.setFlag(MODULE_ID, "briefRef", plan.briefRef);
      if (plan.locationRef) await scene.setFlag(MODULE_ID, "locationRef", plan.locationRef);
      await scene.setFlag(MODULE_ID, "kind", plan.kind);

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

  // The map's pins, last -- they reference the scenes above by id.
  for (const hub of (manifest.scenes ?? []).filter((s) => s.kind === "hub")) {
    const scene = game.scenes.get(idFor.get(hub.id));
    if (!scene) continue;
    try {
      const pins = hubPinPlan(hub, manifest, {
        locations,
        journalFor: (sourceId) => ({ entryId: journal.id, pageId: pageIdFor.get(sourceId) ?? null })
      });

      // Only ever remove pins WE made. A GM's own note on the map survives.
      const ours = scene.notes.filter((n) => isGenerated(n)).map((n) => n.id);
      if (ours.length) await deleteNotesOffCanvas(scene, ours);
      await scene.createEmbeddedDocuments(
        "Note",
        pins.map((pin) => ({
          ...pin.data,
          flags: flagFor({ kind: "map-pin", sceneRef: pin.sceneRef, targetSceneId: idFor.get(pin.sceneRef) ?? null })
        }))
      );
      report.pins += pins.length;
    } catch (err) {
      report.problems.push(`could not pin the map: ${err.message}`);
    }
  }

  if (activateLanding) {
    const landing = plans.find((p) => p.isLanding);
    const scene = landing ? game.scenes.get(landing.data._id) : null;
    if (scene && !scene.active) await scene.activate();
  }

  if (notify) {
    ui.notifications.info(
      game.i18n.format("BLANKINHERITANCE.Scenes.Built", { created: report.created.length, updated: report.updated.length, pins: report.pins })
    );
    for (const problem of report.problems) ui.notifications.warn(problem);
  }
  return report;
}

/**
 * Delete the scenes that were only ever scaffolding.
 *
 * Names nothing by guesswork: a scene qualifies only by carrying one of the
 * stage demo's own sourceId flags, or by being Foundry's untouched
 * new-world scene. Anything else -- including a scene a GM made themselves --
 * is left alone and reported as skipped.
 */
export const DEMO_SOURCE_IDS = Object.freeze(["stage-demo-bar", "stage-demo-briefing", "stage-demo-command", "stage-demo-summons"]);
const DEFAULT_WORLD_BACKGROUND = "nue/defaultscene/fvtt-background.webp";

export function isTemporaryScene(scene) {
  const sourceId = scene?.getFlag?.(MODULE_ID, "sourceId");
  if (DEMO_SOURCE_IDS.includes(sourceId)) return "stage demo";
  const bg = scene?.levels?.contents?.[0]?.background?.src ?? scene?.background?.src ?? "";
  if (bg === DEFAULT_WORLD_BACKGROUND) return "Foundry's own new-world scene";
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

/** A macro, so building the set is a click rather than a console incantation. */
export async function createSceneSetMacroIfMissing() {
  const macroId = await deriveFoundryId("scene-set-macro");
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.Scenes.MacroName"),
      type: "script",
      img: "icons/svg/direction.svg",
      command: `await game.modules.get("${MODULE_ID}").api.buildSceneSet();`
    },
    { keepId: true }
  );
}
