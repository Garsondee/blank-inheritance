/**
 * Planning the campaign's real Scene set.
 *
 * Reads data/campaign/scene-set.json and the gazetteer locations it points at,
 * and decides -- with no Foundry globals anywhere in this file -- exactly what
 * scenes, folders and journal pages should exist. (The campaign map's Note
 * pins were retired 2026-09-28: where the party can go is each scene brief's
 * own outro.departure now, drawn by foundry/city-layer.mjs.) The adapter
 * (foundry/scene-build.mjs) does nothing but create what this returns.
 *
 * The scene data itself is built by core/generators/stage-scene.mjs, which
 * already carries the two v14 findings that are easy to get wrong (background
 * lives on the embedded Level document, and padding defaults to 0.25). This
 * file is the layer above: which scenes, in what order.
 */

import { buildStageSceneData } from "./stage-scene.mjs";

const DEFAULT_WIDTH = 3072;
const DEFAULT_HEIGHT = 1536;

/** Sub-scenes stay off the navigation bar unless the manifest says otherwise. */
const defaultNavigation = (scene) => (scene.kind === "sub" ? false : true);

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

  // Retired 2026-09-28 (design/world-map-destinations.md): a pin list on the
  // hub would silently do nothing now, so say so rather than ignore it.
  for (const hub of (manifest?.scenes ?? []).filter((s) => s.kind === "hub")) {
    if (Array.isArray(hub.pins) && hub.pins.length) {
      problems.push(`hub "${hub.id}" still lists pins; map pins were retired -- destinations are each scene brief's outro.departure now`);
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
 * A place's page in the players' Scenes journal: where this is, and what is
 * there. (It was the page behind a map pin until the pins were retired on
 * 2026-09-28; the function keeps its name so the journal keeps its ids.)
 *
 * Player-facing by construction -- every player can open that journal. Nothing from the scene brief goes in here; the brief
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
