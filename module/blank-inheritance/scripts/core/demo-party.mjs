/**
 * Six temporary candidate tokens, scattered across the mainland — the pure
 * planning half. Written 2026-09-22 for Ingram's own test: "Create 6
 * temporary PC tokens, place them around the mainland, let's simulate 'The
 * Road In' actually live." Moved here from the standalone macro
 * (tools/foundry-macros/scatter-party.js) 2026-09-23 so the demo runner can
 * use the exact same plan a macro click would, rather than a second copy
 * that can drift.
 *
 * WHY SIX SEPARATE PLACES. The six real PCs do not exist yet — they are made
 * collaboratively at the table during Induction. Scattering them across six
 * genuinely different kinds of life (a coastal town, stacked hillside
 * streets, a dense flat, the old ferry landing, an outer suburb, a far
 * corner) is itself part of the proof: it shows the coordinate pipeline
 * handles the whole sheet, not just one cluster of points.
 *
 * WHY "Candidate N" AND NOT NAMES. Inventing names here would pre-empt the
 * table's own collaborative chargen. "Candidate" is also what the
 * Directorate's own letter calls them — what the institution would have
 * written on a roster.
 *
 * WHY IT USES sceneCalibration/toScenePoint. The caller supplies the real
 * calibration (core/travel-animation.mjs, derived from the hub's own real
 * Tiles) — the same one foundry/travel.mjs uses for the travel marker. A
 * demo with its own private coordinate conversion would prove nothing about
 * the real pipeline.
 */

import { deriveFoundryId } from "./ids.mjs";
import { toScenePoint } from "./travel-animation.mjs";

// The Foundry-relative path every demo candidate's (and the party marker's
// own) circle-cropped portrait was staged to by
// tools/token-ring/crop_ring_subject.py's own reusable cropping function —
// same treatment, same tool, as the real NPC/creature ring subjects, just
// staged to a demo-only subdirectory rather than driven by
// asset-registry.json (these are temporary "Candidate N" placeholders, never
// a real chargen assignment — CLAUDE.md: "Don't invent the six kids/Frames'
// names, classes, or Anchors").
const PORTRAIT_ROOT = "modules/blank-inheritance/assets/tokens/demo-party";

/** The party marker's own portrait — "some other image ... the same visual treatment" (Ingram, 2026-09-23), distinct from all six candidates. */
export const PARTY_PORTRAIT = `${PORTRAIT_ROOT}/party.webp`;

// Centroids are real data/locations/ coordinates on the 12400x12400 sheet
// (1px = 1m) — never the fortress island, which is the base they have not
// reached yet.
export const DEMO_PARTY_ORIGINS = Object.freeze([
  { id: "north-shore-town", label: "Candidate 1", px: [8975, 797], note: "A coastal settlement on the far side of the headland — one road, one timetable." },
  { id: "upper-wards", label: "Candidate 2", px: [6914, 785], note: "Streets stacked above the coast, reached by stairs as often as by road." },
  { id: "flats", label: "Candidate 3", px: [5369, 3478], note: "The dense low grid behind the waterfront, where the city repeats itself." },
  { id: "old-landing", label: "Candidate 4", px: [5195, 5146], note: "The mainland's original waterfront — ferry stages and chandlers." },
  { id: "southern-reach", label: "Candidate 5", px: [3647, 10482], note: "Outer suburb at the edge of the sheet. The last place with a bus stop." },
  { id: "far-quarter", label: "Candidate 6", px: [1716, 11554], note: "The south-western corner, far enough out that sirens arrive late." }
].map((origin) => ({ ...origin, portrait: `${PORTRAIT_ROOT}/${origin.id}.webp` })));

/**
 * `calibration` is a real `sceneCalibration(...)` result. Returns one plan
 * entry per origin: stable ids (so a re-run is idempotent, same as every
 * other generator in this module) plus the real scene-space point to place
 * it at.
 */
export async function demoPartyPlan(calibration) {
  const plan = [];
  for (const origin of DEMO_PARTY_ORIGINS) {
    const actorId = await deriveFoundryId(`demo-party-${origin.id}`);
    const tokenId = await deriveFoundryId(`demo-party-token-${origin.id}`);
    const point = toScenePoint({ x: origin.px[0], y: origin.px[1] }, calibration);
    plan.push({ originRef: origin.id, label: origin.label, portrait: origin.portrait, actorId, tokenId, x: point.x, y: point.y });
  }
  return plan;
}
