/**
 * Planning the campaign's real Scene set.
 *
 * Reads data/campaign/scene-set.json and the gazetteer locations it points at,
 * and decides -- with no Foundry globals anywhere in this file -- exactly what
 * scenes, folders, map pins and journal pages should exist. The adapter
 * (foundry/scene-build.mjs) does nothing but create what this returns.
 *
 * The scene data itself is built by core/generators/stage-scene.mjs, which
 * already carries the two v14 findings that are easy to get wrong (background
 * lives on the embedded Level document, and padding defaults to 0.25). This
 * file is the layer above: which scenes, in what order, with which pins.
 */

import { buildStageSceneData } from "./stage-scene.mjs";

/** Foundry's own default, and the size our pins are drawn at. */
export const PIN_ICON_SIZE = 64;

/**
 * Two pins closer together than this, in scene pixels, are sitting on top of
 * each other and one of them wants an explicit offsetPx. Deliberately a
 * WARNING rather than an auto-nudge: a generator that silently moves a
 * signpost is a generator that quietly lies about where a place is.
 */
export const PIN_CROWDING_PX = PIN_ICON_SIZE;

const DEFAULT_WIDTH = 3072;
const DEFAULT_HEIGHT = 1536;

/** Sub-scenes stay off the navigation bar unless the manifest says otherwise. */
const defaultNavigation = (scene) => (scene.kind === "sub" ? false : true);

/**
 * Where a scene's pin sits on the hub, in hub pixels.
 *
 * `derived.centroidPx` is in campaign-map master pixels (12400 square); the
 * shipped art is a half-scale derivative, so everything multiplies by the
 * hub's own `mapScale`. Reading the location rather than copying a coordinate
 * into the manifest is the whole point: move a building and its pin follows.
 *
 * @param {object} location  a data/locations/<id>.json document
 * @param {number} mapScale
 * @param {number[]|null} offsetPx
 */
export function pinPosition(location, mapScale, offsetPx = null) {
  const centroid = location?.derived?.centroidPx;
  if (!Array.isArray(centroid) || centroid.length !== 2 || !centroid.every(Number.isFinite)) {
    throw new Error(`location "${location?.id ?? "?"}" has no usable derived.centroidPx to pin from`);
  }
  if (!Number.isFinite(mapScale) || mapScale <= 0) throw new Error("a hub scene needs a positive mapScale");
  const [ox, oy] = Array.isArray(offsetPx) ? offsetPx : [0, 0];
  return {
    x: Math.round(centroid[0] * mapScale + (Number.isFinite(ox) ? ox : 0)),
    y: Math.round(centroid[1] * mapScale + (Number.isFinite(oy) ? oy : 0))
  };
}

/**
 * Everything wrong with a manifest, as a list rather than a throw.
 *
 * Same shape as the audio director's validators: a scene set that names one
 * missing location should still build the other fifteen scenes and say what it
 * could not do, because a GM half an hour before a session wants the fifteen.
 */
export function validateSceneSet(manifest, { locations = new Map() } = {}) {
  const problems = [];
  const groupIds = new Set((manifest?.groups ?? []).map((g) => g.id));
  const sceneIds = new Set();

  for (const scene of manifest?.scenes ?? []) {
    if (!scene.id) { problems.push("a scene has no id"); continue; }
    if (sceneIds.has(scene.id)) problems.push(`duplicate scene id "${scene.id}"`);
    sceneIds.add(scene.id);
    if (!scene.art) problems.push(`"${scene.id}" names no art`);
    if (!groupIds.has(scene.group)) problems.push(`"${scene.id}" is in group "${scene.group}", which does not exist`);
    if (scene.locationRef && !locations.has(scene.locationRef)) {
      problems.push(`"${scene.id}" happens at location "${scene.locationRef}", which is not in the gazetteer`);
    }
  }

  const landings = (manifest?.scenes ?? []).filter((s) => s.kind === "landing");
  if (landings.length === 0) problems.push("no scene is marked as the landing scene");
  if (landings.length > 1) problems.push(`${landings.length} scenes claim to be the landing scene`);

  for (const hub of (manifest?.scenes ?? []).filter((s) => s.kind === "hub")) {
    if (!Number.isFinite(hub.mapScale) || hub.mapScale <= 0) problems.push(`hub "${hub.id}" has no usable mapScale`);
    const placed = [];
    for (const pin of hub.pins ?? []) {
      const target = (manifest.scenes ?? []).find((s) => s.id === pin.sceneRef);
      if (!target) { problems.push(`hub "${hub.id}" pins "${pin.sceneRef}", which is not a scene`); continue; }
      if (!target.locationRef) { problems.push(`hub "${hub.id}" pins "${pin.sceneRef}", which has no locationRef to place it by`); continue; }
      const location = locations.get(target.locationRef);
      if (!location) continue; // already reported above
      try {
        const at = pinPosition(location, hub.mapScale, pin.offsetPx);
        for (const other of placed) {
          const d = Math.hypot(at.x - other.at.x, at.y - other.at.y);
          if (d < PIN_CROWDING_PX) {
            problems.push(`pins for "${other.sceneRef}" and "${pin.sceneRef}" are ${Math.round(d)}px apart and will overlap — give one an offsetPx`);
          }
        }
        placed.push({ sceneRef: pin.sceneRef, at });
      } catch (err) {
        problems.push(`hub "${hub.id}" cannot place "${pin.sceneRef}": ${err.message}`);
      }
    }
  }

  return problems;
}

/**
 * The scenes to build, in sidebar order, each with its Foundry-ready data.
 *
 * @param {object} manifest
 * @param {(sourceId: string) => string} idFor  deterministic id for an authoring id
 */
export function sceneSetPlan(manifest, idFor) {
  const artRoot = manifest.artRoot ?? "modules/blank-inheritance/assets/scenes";
  const ordered = [...(manifest.scenes ?? [])].sort((a, b) => {
    const ga = (manifest.groups ?? []).findIndex((g) => g.id === a.group);
    const gb = (manifest.groups ?? []).findIndex((g) => g.id === b.group);
    if (ga !== gb) return ga - gb;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  return ordered.map((scene) => {
    const id = idFor(scene.id);
    const width = scene.width ?? DEFAULT_WIDTH;
    const height = scene.height ?? DEFAULT_HEIGHT;
    const data = buildStageSceneData(scene, id, `${artRoot}/${scene.art}.webp`, { width, height });

    return {
      sourceId: scene.id,
      kind: scene.kind,
      group: scene.group,
      briefRef: scene.briefRef ?? null,
      locationRef: scene.locationRef ?? null,
      blurb: scene.blurb ?? null,
      isLanding: scene.kind === "landing",
      data: {
        ...data,
        navigation: scene.navigation ?? defaultNavigation(scene),
        sort: (scene.order ?? 0) * 100
      }
    };
  });
}

/**
 * The map pins for a hub scene, as Note document data.
 *
 * `texture` rather than `icon`: the Note schema moved its image onto a
 * TextureData field in v14 (common/documents/note.mjs), and writing `icon`
 * does nothing at all -- no error, no pin art.
 *
 * @param {object} hub          the hub scene entry from the manifest
 * @param {Map} locations       id -> location document
 * @param {Map} sceneIdsBySource  authoring id -> built Foundry scene id
 * @param {(sourceId: string) => {entryId: string, pageId: string|null}} journalFor
 */
export function hubPinPlan(hub, manifest, { locations, journalFor, icon = "modules/blank-inheritance/assets/ui/map-pin.webp" }) {
  return (hub.pins ?? []).flatMap((pin) => {
    const target = (manifest.scenes ?? []).find((s) => s.id === pin.sceneRef);
    const location = target?.locationRef ? locations.get(target.locationRef) : null;
    if (!target || !location) return [];

    const at = pinPosition(location, hub.mapScale, pin.offsetPx);
    const journal = journalFor(pin.sceneRef) ?? {};

    return [{
      sceneRef: pin.sceneRef,
      data: {
        entryId: journal.entryId ?? null,
        pageId: journal.pageId ?? null,
        x: at.x,
        y: at.y,
        texture: { src: icon, anchorX: 0.5, anchorY: 0.5, fit: "contain" },
        iconSize: PIN_ICON_SIZE,
        text: pin.label ?? target.name,
        fontSize: 48,
        textColor: "#f4e8d0",
        // Notes are hidden behind token vision otherwise, and the map is a
        // picture nobody has a token on.
        global: true
      }
    }];
  });
}

/**
 * The journal page behind a pin: where this is, and what is there.
 *
 * Player-facing by construction -- it is reached by clicking a pin on a map
 * every player can open. Nothing from the scene brief goes in here; the brief
 * is the GM's script and says what is waiting for them.
 */
export function pinJournalPage(scene, location, { sceneId = null } = {}) {
  const ref = location?.derived?.ref ?? null;
  const name = location?.name ?? null;
  const lines = [];
  if (scene.blurb) lines.push(`<p>${scene.blurb}</p>`);
  if (name || ref) {
    const where = [name, ref ? `map reference <strong>${ref}</strong>` : null].filter(Boolean).join(", ");
    lines.push(`<p class="bi-pin__where">${where}</p>`);
  }
  // The travelling half of scene -> map -> scene. Foundry's own document link,
  // so it needs nothing of ours to work and behaves exactly as a GM expects.
  if (sceneId) lines.push(`<p class="bi-pin__go">@Scene[${sceneId}]{Go to ${scene.name}}</p>`);
  return {
    name: scene.name,
    type: "text",
    title: { show: true, level: 1 },
    text: { format: 1, content: lines.join("\n") || `<p>${scene.name}</p>` }
  };
}
