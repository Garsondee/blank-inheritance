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
import { toScenePoint } from "../travel-animation.mjs";

/**
 * The size our pins are drawn at, in the hub Scene's own canvas pixels.
 *
 * WAS 64 -- Foundry's own default -- until 2026-09-22/23, when Ingram
 * reported live pins as "huge": at 64, a pin was 4-5x the footprint of
 * Candidate Gate (a real building, ~14m across per its own derived.areaM2),
 * and bigger than most of the buildings it was meant to mark, because this
 * map runs at 1 scene-px = 1m.
 *
 * Wanted 24 at first. That number is unreachable, not just undesirable:
 * Foundry v14's own NoteData schema hard-floors `iconSize` at 32
 * (common/documents/note.mjs's `min: 32`) -- found live the same night,
 * when a sync written with 24 came back from the server reporting every
 * Note's `iconSize` as 32 anyway, silently, with no error. 32 is therefore
 * the smallest a pin can actually be drawn, not a visual call the way 24
 * would have been -- see test/tier3-note-iconsize-contract.test.mjs, which
 * fails loudly if a future Foundry version ever moves that floor.
 */
export const PIN_ICON_SIZE = 32;

/**
 * Two pins closer together than this are sitting on top of each other and
 * one of them wants an explicit offsetPx. Deliberately a WARNING rather than
 * an auto-nudge: a generator that silently moves a signpost is a generator
 * that quietly lies about where a place is.
 *
 * In MASTER-SHEET pixels (metres), not hub-scene pixels -- see
 * validateSceneSet's own crowding check for why: it runs before any Foundry
 * Scene exists to derive a real scale from, so it measures directly in the
 * one coordinate space that is always real regardless of how the hub ends
 * up rendered. This also makes the threshold a stable fact about the CITY
 * ("these two buildings are 24m apart") rather than an accident of however
 * the current hub happens to be scaled.
 */
export const PIN_CROWDING_PX = PIN_ICON_SIZE;

const DEFAULT_WIDTH = 3072;
const DEFAULT_HEIGHT = 1536;

/** Sub-scenes stay off the navigation bar unless the manifest says otherwise. */
const defaultNavigation = (scene) => (scene.kind === "sub" ? false : true);

/**
 * Where a scene's pin sits on the hub, in the hub Scene's own canvas pixels.
 *
 * REWRITTEN 2026-09-23. The previous version invented its own
 * `centroid * mapScale + offsetPx` transform, reading `mapScale` off the
 * MANIFEST's hub entry rather than any real Scene. That number (0.5)
 * described an EARLIER hub layout — one half-resolution background image —
 * and was never updated when the hub was rebuilt as four full-resolution
 * Tiles (this session). It also never added the Scene's own canvas origin
 * at all, which is why every pin landed roughly (sceneX, sceneY) short of
 * where it belonged. That is the identical failure `core/travel-animation.mjs`'s
 * own header describes finding and fixing for the travel marker, ON THIS
 * SAME SCENE — and it was never carried over to pins, so it happened again.
 *
 * Delegates to `toScenePoint`, the one function in this codebase that
 * converts master-sheet pixels to a real Scene's own canvas pixels — derived
 * from the Scene's actual Tiles (`sceneCalibration`), never a copied number
 * that can go stale. A pin and the travel marker now share one transform and
 * cannot drift apart the way this one just did.
 *
 * `offsetPx` is unchanged: a small manual nudge, already in the hub's own
 * canvas pixels, for when two pins share one building and a human decided
 * how far apart to spread them (see PIN_CROWDING_PX).
 *
 * @param {object} location  a data/locations/<id>.json document
 * @param {{originX: number, originY: number, scale: number}} calibration
 *   from core/travel-animation.mjs#sceneCalibration — the real hub Scene's
 *   own origin and scale, or `{originX:0, originY:0, scale:1}` for a
 *   pre-flight check with no live Scene to derive one from (see
 *   validateSceneSet's own crowding check).
 * @param {number[]|null} offsetPx
 */
export function pinPosition(location, calibration, offsetPx = null) {
  const centroid = location?.derived?.centroidPx;
  if (!Array.isArray(centroid) || centroid.length !== 2 || !centroid.every(Number.isFinite)) {
    throw new Error(`location "${location?.id ?? "?"}" has no usable derived.centroidPx to pin from`);
  }
  if (!calibration || !Number.isFinite(calibration.scale) || calibration.scale <= 0) {
    throw new Error("pinPosition needs a real scene calibration (core/travel-animation.mjs#sceneCalibration)");
  }
  const [ox, oy] = Array.isArray(offsetPx) ? offsetPx : [0, 0];
  const at = toScenePoint({ x: centroid[0], y: centroid[1] }, calibration);
  return {
    x: Math.round(at.x + (Number.isFinite(ox) ? ox : 0)),
    y: Math.round(at.y + (Number.isFinite(oy) ? oy : 0))
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

  // {originX:0, originY:0, scale:1} rather than a real sceneCalibration --
  // this runs BEFORE any Foundry Scene exists to derive one from (see
  // scene-build.mjs, which calls validateSceneSet ahead of resolving any
  // live Scene). Measuring directly in master-sheet pixels is the honest
  // choice for a pre-flight check: it is a stable fact about the CITY
  // ("these two buildings are this many metres apart"), not a guess at
  // however the hub eventually gets rendered. See PIN_CROWDING_PX's own note.
  const PREFLIGHT_CALIBRATION = { originX: 0, originY: 0, scale: 1 };
  for (const hub of (manifest?.scenes ?? []).filter((s) => s.kind === "hub")) {
    const placed = [];
    for (const pin of hub.pins ?? []) {
      const target = (manifest.scenes ?? []).find((s) => s.id === pin.sceneRef);
      if (!target) { problems.push(`hub "${hub.id}" pins "${pin.sceneRef}", which is not a scene`); continue; }
      if (!target.locationRef) { problems.push(`hub "${hub.id}" pins "${pin.sceneRef}", which has no locationRef to place it by`); continue; }
      const location = locations.get(target.locationRef);
      if (!location) continue; // already reported above
      try {
        const at = pinPosition(location, PREFLIGHT_CALIBRATION, pin.offsetPx);
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
 * Foundry's own Scene Directory sorts alphabetically by name within a folder
 * by default (confirmed live, 2026-09-18 — `sort`/`order` alone did not
 * change what a GM actually saw) — so the only way to make a folder actually
 * READ in play order is to put that order INTO the name. One counter per
 * group (a folder's own scenes, restarting at 1 -- Episode Two starting over
 * rather than continuing from Episode One's own count reads better with the
 * folders already doing the session-level separation), incrementing on every
 * non-"sub" scene; a "sub" (a room inside a beat, cut to from the Scene
 * Runner rather than navigated to) gets its PARENT beat's own number plus a
 * letter -- 2, 2a, 2b, 3 -- which is exactly the "returned to, or a fork"
 * case Ingram named: a sub-room is a detour off its parent, not a new step in
 * the sequence, so it reads as one. Zero-padded to two digits so a session
 * that ever grows past 9 real beats still sorts correctly as a STRING, not
 * just numerically (found by reasoning, not yet needed at 6 beats — cheap to
 * get right now rather than rediscover the day it matters).
 *
 * `ordered` must already be sorted group-then-order (sceneSetPlan's own
 * sort, above) -- this walks it once, in that order, and never re-sorts.
 *
 * ORDER 0 IS A PROLOGUE, numbered "00" (added 2026-09-24). Ingram asked for a
 * "Scene 0" ahead of The Road In -- From Up Here, a GM speech over one
 * high-altitude picture of the city. Authored as `order: 0`, it takes "00"
 * WITHOUT advancing the counter, so the scene that was already "01" stays
 * "01" and nothing after it renumbers. Keyed on the authored order rather
 * than on `kind: "landing"` on purpose: which scene is the landing scene is a
 * separate fact (it moved to From Up Here the same day, but it need not
 * always be the first scene in its folder), while "this comes before scene
 * one" is exactly what an order of 0 says.
 */
export function computeDisplayPrefixes(ordered) {
  const prefixes = new Map();
  let currentGroup = Symbol("no group seen yet");
  let counter = 0;
  let parentPrefix = null;
  let subIndex = 0;

  for (const scene of ordered) {
    if (scene.group !== currentGroup) {
      currentGroup = scene.group;
      counter = 0;
      parentPrefix = null;
      subIndex = 0;
    }

    if (scene.kind === "sub" && parentPrefix) {
      prefixes.set(scene.id, `${parentPrefix}${String.fromCharCode(97 + subIndex)}`);
      subIndex += 1;
      continue;
    }

    if (scene.order === 0) {
      parentPrefix = "00";
      subIndex = 0;
      prefixes.set(scene.id, parentPrefix);
      continue;
    }

    counter += 1;
    parentPrefix = String(counter).padStart(2, "0");
    subIndex = 0;
    prefixes.set(scene.id, parentPrefix);
  }
  return prefixes;
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
  const displayPrefixes = computeDisplayPrefixes(ordered);

  return ordered.map((scene) => {
    const id = idFor(scene.id);
    const width = scene.width ?? DEFAULT_WIDTH;
    const height = scene.height ?? DEFAULT_HEIGHT;
    const data = buildStageSceneData(scene, id, `${artRoot}/${scene.art}.webp`, { width, height });
    const prefix = displayPrefixes.get(scene.id);

    return {
      sourceId: scene.id,
      kind: scene.kind,
      group: scene.group,
      briefRef: scene.briefRef ?? null,
      locationRef: scene.locationRef ?? null,
      blurb: scene.blurb ?? null,
      isLanding: scene.kind === "landing",
      // The one-time hand-built-scene bridge (see the schema's own doc
      // comment) -- passed through so the adapter never has to re-read the
      // raw manifest entry to find it.
      adoptSceneNamed: scene.adoptSceneNamed ?? null,
      // The CLEAN name, never prefixed — for anything player-facing (the map
      // pin's own label, the journal page behind it). Only data.name below,
      // the actual Foundry Scene document, carries the GM-facing ordering
      // prefix; a player's own journal must never show "03. Kit Issue".
      cleanName: scene.name ?? scene.id,
      data: {
        ...data,
        name: prefix ? `${prefix}. ${data.name}` : data.name,
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
 * @param {{originX: number, originY: number, scale: number}} calibration
 *   the hub's REAL live Scene calibration (core/travel-animation.mjs's
 *   `sceneCalibration`, run against its actual Tiles) — the adapter's job to
 *   supply, never a number copied from the manifest (see pinPosition's own
 *   header for why that drifted stale once already).
 * @param {(sourceId: string) => {entryId: string, pageId: string|null}} journalFor
 */
export function hubPinPlan(hub, manifest, { locations, journalFor, calibration, icon = "modules/blank-inheritance/assets/ui/map-pin.webp" }) {
  return (hub.pins ?? []).flatMap((pin) => {
    const target = (manifest.scenes ?? []).find((s) => s.id === pin.sceneRef);
    const location = target?.locationRef ? locations.get(target.locationRef) : null;
    if (!target || !location) return [];

    const at = pinPosition(location, calibration, pin.offsetPx);
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
