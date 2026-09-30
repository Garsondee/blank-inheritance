/**
 * The map-travel ritual — the Foundry-touching half.
 *
 * scene-set.json's own rule: "SCENE -> MAP -> SCENE. The map is the hub and
 * the thing to cut back to between beats." Full choreography per
 * ideas/entries/road-network-routing.json (greenlit 2026-09-18): cut to the
 * campaign map, animate the party's marker along a real routed path between
 * the two named locations, then cut on to the destination — with a real fade
 * either side (ideas/entries/scene-transition-fades.json).
 *
 * Every pure calculation this leans on already exists and is already tested
 * (core/travel-route.mjs's Dijkstra router, core/travel-animation.mjs's
 * coordinate bridging and hop-timing, core/travel-trigger.mjs's "did the
 * location actually change" gate). This file is only the plumbing: load the
 * graph, resolve two locations to real map points, drive one token across a
 * real Foundry Scene, and never let a missing piece of that stop the table
 * actually arriving.
 *
 * NEVER BLOCKS ARRIVAL. A missing hub scene, an unmapped location, or a
 * graph that fails to load all fall back to cutting straight to the
 * destination with the same fade — road-network-routing.json's own framing:
 * "Getting to the end destination is far more important than how we get
 * there." The only thing that can go wrong here is the table not seeing the
 * animated crossing; they always still get to the next scene.
 */

import { planRoute } from "../core/travel-route.mjs";
import { travelLegsFor } from "../core/travel-trigger.mjs";
import { sceneCalibration, toScenePoint } from "../core/travel-animation.mjs";
import { hopPlan, totalDurationMs } from "../core/travel-speed.mjs";
import { resolveTokenRing } from "../core/generators/token-ring.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { fetchModuleJson } from "./io.mjs";
import { announceJourney } from "./travel-camera.mjs";

// The party marker's own real portrait — the SAME staged file
// core/demo-party.mjs exports as PARTY_PORTRAIT (not imported from there
// directly: that module is the six DEMO candidates' own home, and this is
// the real, always-on production marker — the two happening to share one
// staged asset today is a fact about art, not a reason to wire the real
// travel system through a demo-only module). "Some other image ... the
// same visual treatment" (Ingram, 2026-09-23) — circle-cropped the same
// way as every candidate, via tools/token-ring/crop_ring_subject.py.
const PARTY_PORTRAIT = "modules/blank-inheritance/assets/tokens/demo-party/party.webp";

const MODULE_ID = "blank-inheritance";
const TRAVEL_GRAPH_PATH = "data/campaign/map/travel-graph.json";
const CAMPAIGN_MAP_MANIFEST_PATH = "data/campaign/map/campaign-map.json";
const LOCATION_PATH = (id) => `data/campaign/locations/${id}.json`;
const HUB_SOURCE_ID = "the-city";
const TRAVEL_TOKEN_SOURCE_ID = "travel-party-marker";

// road-network-routing.json's own resolved choreography names 10 seconds
// for each fade. The travel time itself is no longer a fixed budget split
// across however many hops a route happens to have — core/travel-speed.mjs's
// own per-hop, per-mode duration replaced that 2026-09-23, after a fixed
// ~8-second total made a genuine ~6km crossing look instantaneous and a
// genuine 300m one look sluggish (Ingram, live: "it took seconds, yet the
// tokens had to travel from the edges of the map to the middle").
const FADE_MS = 10000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let graphCache = null;
async function loadTravelGraph() {
  if (graphCache) return graphCache;
  try {
    graphCache = await fetchModuleJson(TRAVEL_GRAPH_PATH);
  } catch (err) {
    console.warn("Blank Inheritance | Could not load the travel graph — travel will fall back to a straight walk:", err);
    graphCache = { nodeXy: {}, wayNodes: {} };
  }
  return graphCache;
}

let manifestCache = null;
/** The campaign map manifest, fetched once and shared by every accessor below — one cached fetch, not one per field. */
async function campaignMapManifest() {
  if (manifestCache !== null) return manifestCache;
  try {
    manifestCache = await fetchModuleJson(CAMPAIGN_MAP_MANIFEST_PATH);
  } catch (err) {
    console.warn("Blank Inheritance | Could not load the campaign map manifest:", err);
    manifestCache = {};
  }
  return manifestCache;
}

/**
 * The master map image's own pixel width (data/map/campaign-map.json's
 * `image.width`) — only needed as sceneCalibration's fallback when the hub
 * Scene has no Tiles.
 *
 * Exported (2026-09-23) so foundry/scene-build.mjs can compute the SAME real
 * calibration this file uses for the travel marker, when placing map pins —
 * one cached fetch, one canonical transform, instead of a second copy that
 * can drift out of sync with this one the way the pin math already did once.
 */
export async function campaignMapImageWidth() {
  const manifest = await campaignMapManifest();
  return manifest?.image?.width ?? null;
}

/**
 * Real metres per output pixel of the master map image
 * (campaign-map.json's own `metresPerPixel`, already derived once from the
 * map's real rotation/projection by tools/location-sync/core/georef.py at
 * build time — reused here as a flat published constant rather than
 * re-derived, since a second hand-written copy of THAT math is exactly the
 * duplicate georef.py's own docstring warns against). Used by
 * foundry/location-editor.mjs's shape/capacity advisory check to turn a
 * drawn footprint's pixel area into real square metres.
 */
export async function campaignMapMetresPerPixel() {
  const manifest = await campaignMapManifest();
  const value = Number(manifest?.metresPerPixel);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

async function locationCentroid(locationRef) {
  if (!locationRef) return null;
  try {
    const location = await fetchModuleJson(LOCATION_PATH(locationRef));
    const px = location?.derived?.centroidPx;
    return Array.isArray(px) && px.length === 2 ? { x: px[0], y: px[1] } : null;
  } catch (err) {
    console.warn(`Blank Inheritance | Could not load location "${locationRef}" for travel:`, err);
    return null;
  }
}

/**
 * Where a place sits on the hub, in the hub Scene's own coordinates -- the same
 * transform a travelling token and a destination marker use, so a marker, a
 * dashed pick line and the pawn that walks to it all meet at one point
 * (foundry/city-layer.mjs, design/world-map-destinations.md). Null when the
 * hub or the place cannot be resolved.
 */
const pointCache = new Map();
export async function scenePointFor(locationRef) {
  if (!locationRef) return null;
  if (pointCache.has(locationRef)) return pointCache.get(locationRef);
  const hub = await hubScene();
  const centroid = await locationCentroid(locationRef);
  if (!hub || !centroid) return null;
  const imageWidth = await campaignMapImageWidth();
  const calibration = sceneCalibration(hub.tiles?.contents ?? [], hub.width, imageWidth ?? hub.width);
  const point = toScenePoint(centroid, calibration);
  pointCache.set(locationRef, point);
  return point;
}

/**
 * The hub scene, found the same way scene-build.mjs itself now finds it —
 * by `sourceId` flag first, not only by the deterministic id. Found live
 * 2026-09-18, against a full local copy of the real remote world: the real
 * "Campaign Map" scene was ADOPTED (scene-build.mjs's own adoptSceneNamed
 * bridge) rather than created fresh, so it keeps its own original Foundry
 * id forever — a lookup that only ever tried the deterministic id would
 * never find it, and travel would silently fall back to a plain cut on
 * every single real crossing. Caught here before it ever reached anything
 * but a local test copy.
 */
export async function hubScene() {
  const bySourceId = game.scenes.find((s) => s.getFlag(MODULE_ID, "sourceId") === HUB_SOURCE_ID);
  if (bySourceId) return bySourceId;
  const id = await deriveFoundryId(`scene-${HUB_SOURCE_ID}`);
  return game.scenes.get(id) ?? null;
}

/**
 * Get-or-create the marker that plays ONE group's journey across the hub map.
 *
 * Was a single shared marker until 2026-09-22, when Ingram pointed out the
 * obvious limit: *"That's great when the party is together, not great when the
 * party splits up."* The id is now derived per group, so a split party puts a
 * marker on the map for each half and they cross at the same time. `groupId`
 * defaults to "party", which derives the identical id the single marker always
 * had -- an undivided party keeps exactly the token it has always used, and no
 * existing world gains a stray second marker.
 */
async function ensureTravelToken(scene, point, { groupId = "party", label = null } = {}) {
  const id = await deriveFoundryId(
    groupId === "party" ? TRAVEL_TOKEN_SOURCE_ID : `${TRAVEL_TOKEN_SOURCE_ID}-${groupId}`
  );
  const existing = scene.tokens.get(id);
  if (existing) {
    // "texture.src" heals a marker created before the 2026-09-23 art fix
    // landed (first the plain white arrow, then a cyan-tinted version of
    // it) — a world with an old marker already on its hub scene would
    // otherwise carry the invisible-on-a-pale-map bug forever, since this
    // branch never re-creates the document. tint is cleared alongside it:
    // a real painted portrait tinted flat cyan would wash its own colours
    // out, the opposite of the fix.
    await existing.update({
      x: point.x,
      y: point.y,
      "texture.src": PARTY_PORTRAIT,
      "texture.tint": null,
      ring: resolveTokenRing("character", {})
    });
    return existing;
  }
  const [created] = await scene.createEmbeddedDocuments(
    "Token",
    [
      {
        _id: id,
        name: label || game.i18n.localize("BLANKINHERITANCE.Travel.TokenName"),
        x: point.x,
        y: point.y,
        // A real portrait, not the plain white "direction" arrow SVG that
        // used to sit here — found live 2026-09-23, Ingram's own words: "the
        // arrow is white on a pale coloured map," effectively invisible
        // against the map's own washed-out palette. Circle-cropped the same
        // way as every other token subject (tools/token-ring/
        // crop_ring_subject.py).
        texture: { src: PARTY_PORTRAIT },
        // Same Dynamic Token Ring every real Actor this pipeline creates
        // gets (CLAUDE.md, core/generators/token-ring.mjs) — this marker
        // isn't backed by an Actor, so it never went through that path on
        // its own; "character" reads as the party's own cyan ring, correct
        // for the one token that literally represents the party.
        ring: resolveTokenRing("character", {}),
        width: 2,
        height: 2,
        flags: { [MODULE_ID]: { generated: true, kind: "travel-marker", groupId } }
      }
    ],
    { keepId: true }
  );
  return created;
}

/**
 * Drive an already-resolved Token document through a real hop plan.
 * Shared by every travel path — the generic marker `animateOnHub` itself
 * creates, and `convergeTokensOnHub`'s own real, pre-existing tokens alike
 * — so a hop's timing/animation behaviour can never quietly drift between
 * the two.
 *
 * Hops are awaited one at a time with an explicit wait alongside the
 * document update, rather than trusting Foundry's own update-promise timing
 * to match the visual animation — the safe default regardless of exactly
 * when that promise resolves, at the cost of nothing worse than a hop that
 * finishes slightly before the next one's update lands.
 */
async function animateTokenAlongHops(token, hops, calibration) {
  if (hops.length > 0) {
    // Stamped once, before the first hop. foundry/travel-camera.mjs's own
    // per-player framing ("frame the player's token and the destination")
    // reads travelDestination; foundry/travel-trail.mjs's own trail
    // ("a trail behind the tokens and a faded version of the path ...
    // in front of them") reads travelPath -- the whole route, scene-space,
    // each point carrying the real mode of the hop that reaches it (`null`
    // for the start, nothing led into it yet).
    const scenePath = [
      { x: token.x, y: token.y, mode: null },
      ...hops.map((hop) => ({ ...toScenePoint(hop.to, calibration), mode: hop.mode }))
    ];
    await token.setFlag(MODULE_ID, "travelDestination", scenePath[scenePath.length - 1]);
    await token.setFlag(MODULE_ID, "travelPath", scenePath);
  }
  for (const hop of hops) {
    const scenePoint = toScenePoint(hop.to, calibration);
    await token.update({ x: scenePoint.x, y: scenePoint.y }, { animation: { duration: hop.durationMs } });
    await wait(hop.durationMs);
  }
}

/**
 * Cut to the hub, animate the marker from one location to the other, then
 * cut back — or just cut back alone if any of that isn't possible yet.
 */
async function animateOnHub(legs) {
  const hub = await hubScene();
  if (!hub) return; // no hub scene built in this world yet -- nothing to animate on

  const imageWidth = await campaignMapImageWidth();
  const calibration = sceneCalibration(hub.tiles?.contents ?? [], hub.width, imageWidth ?? hub.width);
  const graph = await loadTravelGraph();

  // Plan every leg BEFORE cutting to the hub, so the fade is not held open
  // while routes are computed -- and so a leg that cannot be routed simply
  // drops out instead of stalling the others. hopPlan runs on the route's
  // OWN image-px/metre space, never scene-space -- timing is a metric fact
  // about the real distance ridden, not an accident of however this hub
  // scene happens to be scaled (core/travel-speed.mjs's own header).
  const planned = [];
  for (const leg of legs) {
    const [from, to] = await Promise.all([locationCentroid(leg.from), locationCentroid(leg.to)]);
    if (!from || !to) continue;
    const route = planRoute({ graph, start: from, end: to });
    const hops = hopPlan(route.segments, { wayClass: graph.wayClass ?? {} });
    if (hops.length === 0) continue;
    planned.push({ ...leg, startPoint: toScenePoint(from, calibration), endPoint: toScenePoint(to, calibration), hops });
  }
  if (planned.length === 0) return;

  const { cueScene } = await import("./director-panel.mjs");
  await cueScene(hub.id, { transitionType: "fade", transitionDuration: FADE_MS });
  await wait(FADE_MS); // let the fade-in land before anything starts moving

  // Resolve/create every leg's own token FIRST, then announce the whole
  // journey in one Scene flag (foundry/travel-camera.mjs's own
  // announceJourney) -- every connected client computes its own smooth
  // camera curve off THIS, once, rather than reacting hop by hop.
  const withTokens = [];
  for (const leg of planned) {
    const token = await ensureTravelToken(hub, leg.startPoint, { groupId: leg.groupId, label: leg.label });
    withTokens.push({ ...leg, token });
  }
  await announceJourney(
    hub,
    withTokens.map((leg) => ({ tokenId: leg.token.id, start: leg.startPoint, end: leg.endPoint, durationMs: totalDurationMs(leg.hops) }))
  );

  // Concurrently: a split party crosses the city at the same time, not one
  // group and then the other. Each leg now runs its OWN real, mode-aware
  // hop timings rather than sharing one fixed total, so a short leg simply
  // finishes first -- the honest picture of a split party, not a forced
  // synchronised arrival.
  await Promise.all(withTokens.map((leg) => animateTokenAlongHops(leg.token, leg.hops, calibration)));
}

/**
 * Move a set of ALREADY-EXISTING tokens across the hub map, each along its
 * own real route toward a destination — the six scattered demo candidates
 * converging on Candidate Gate being the first real use
 * (foundry/demo-runner.mjs's own scatter-then-cross demo). Unlike
 * `animateOnHub`'s own generic marker, this never creates or re-textures
 * anything: each caller-supplied token keeps whatever art/identity it
 * already has, and simply moves.
 *
 * `moves` is `[{tokenId, from: locationRef, to: locationRef}, ...]`. A move
 * whose token or locations can't be resolved is skipped, same
 * never-block-the-others spirit as `animateOnHub`'s own per-leg handling.
 *
 * CUTS TO THE HUB ITSELF, same fade as animateOnHub — found live
 * 2026-09-23, the first time this ran with a viewer actually watching: the
 * six tokens moved correctly (proven by directly reading their positions
 * mid-journey) but nothing was VISIBLE, because the viewed canvas was still
 * showing whatever scene had been active before. A function whose whole
 * purpose is "a table watches this happen" cannot leave activating the
 * right scene to the caller's memory — never cuts BACK afterward, though:
 * the caller decides what happens once everyone has arrived (the demo's
 * own next step cues the real destination).
 */
export async function convergeTokensOnHub(moves) {
  if (!game.user?.isGM) return;
  const hub = await hubScene();
  if (!hub) return;

  const imageWidth = await campaignMapImageWidth();
  const calibration = sceneCalibration(hub.tiles?.contents ?? [], hub.width, imageWidth ?? hub.width);
  const graph = await loadTravelGraph();

  const planned = [];
  for (const move of moves) {
    const token = hub.tokens.get(move.tokenId);
    if (!token) continue;
    const [from, to] = await Promise.all([locationCentroid(move.from), locationCentroid(move.to)]);
    if (!from || !to) continue;
    const route = planRoute({ graph, start: from, end: to });
    const hops = hopPlan(route.segments, { wayClass: graph.wayClass ?? {} });
    if (hops.length === 0) continue;
    planned.push({ token, hops, startPoint: toScenePoint(from, calibration), endPoint: toScenePoint(to, calibration) });
  }
  if (planned.length === 0) return;

  // Already on the map (a departure is played there: design/world-map-destinations.md)?
  // Then the table is watching already, and a ten-second fade into the scene it
  // is looking at would only be ten seconds of nothing after the GM pressed Go.
  if (game.scenes.active?.id !== hub.id) {
    const { cueScene } = await import("./director-panel.mjs");
    await cueScene(hub.id, { transitionType: "fade", transitionDuration: FADE_MS });
    await wait(FADE_MS);
  }

  // Same "announce the whole journey once, before anything moves" contract
  // as animateOnHub above — foundry/travel-camera.mjs's own smooth curve
  // needs every leg's start/end/duration up front, not discovered hop by hop.
  await announceJourney(
    hub,
    planned.map((p) => ({ tokenId: p.token.id, start: p.startPoint, end: p.endPoint, durationMs: totalDurationMs(p.hops) }))
  );

  await Promise.all(planned.map((p) => animateTokenAlongHops(p.token, p.hops, calibration)));
}

/**
 * The whole ritual, called from wherever a cut between two beats' own
 * locations happens (foundry/scene-runner.mjs's #onCutTo). Always ends by
 * cueing `destinationSceneId` — with the same fade, whether or not the map
 * leg actually played.
 */
/**
 * The split-aware entry point: hand it the two `position` objects off the scene
 * edges (data/schema/scene-brief.schema.json) and it animates one marker per
 * group that actually moves, concurrently, before cueing the destination.
 *
 * Falls through to exactly the same ending as runTravelSequence -- the table
 * always arrives, whether or not the map leg played (this module's own header).
 */
export async function runTravelSequenceForPositions(fromPosition, toPosition, destinationSceneId) {
  if (!game.user?.isGM) return;
  try {
    const legs = travelLegsFor(fromPosition, toPosition);
    if (legs.length > 0) await animateOnHub(legs);
  } catch (err) {
    console.warn("Blank Inheritance | Map travel failed -- cutting straight to the destination:", err);
  }
  const { cueScene } = await import("./director-panel.mjs");
  await cueScene(destinationSceneId, { transitionType: "fade", transitionDuration: FADE_MS });
}

export async function runTravelSequence(fromLocationRef, toLocationRef, destinationSceneId) {
  if (!game.user?.isGM) return;
  try {
    await animateOnHub([{ groupId: "party", label: null, from: fromLocationRef, to: toLocationRef }]);
  } catch (err) {
    console.error("Blank Inheritance | Travel animation failed — cutting straight to the destination instead:", err);
  }
  const { cueScene } = await import("./director-panel.mjs");
  await cueScene(destinationSceneId, { transitionType: "fade", transitionDuration: FADE_MS });
}
