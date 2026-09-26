/**
 * Six temporary, clearly-marked test PCs for verifying the map-travel
 * system end to end — the pure half.
 *
 * Requested 2026-09-19 (Ingram), diagnosing the map-travel calibration bug
 * (#174): "it also used a generic marker but it would be better to move an
 * actual player token... Feel free to create 6 temporary (marked as such)
 * PCs as just graphics to move around the world map to check that the 'Map
 * Journey' system is working fully."
 *
 * These are NOT the six real kids — CLAUDE.md is explicit that character
 * creation is collaborative table work, never pre-generated. This matches
 * the same "clearly marked, throwaway" convention already used throughout
 * this project (tools/battle-simulator/data/kid-fixtures/'s own "TEST
 * FIXTURE... not one of the six real kids", the world's own "ZZ TEST
 * CHARACTER" Actor, scene-build.mjs's DIAGNOSTIC_NAME_PATTERN) — six plain
 * colour-coded markers standing in for a party, nothing more.
 */

/** One colour per fixture, distinct enough to tell apart on the map at a glance. Foundry's own named colours, no new art needed. */
export const TEST_FIXTURE_PCS = Object.freeze([
  { id: "map-journey-test-1", name: "TEST FIXTURE — Map Journey PC 1 (delete after review)", color: "#d1402a" },
  { id: "map-journey-test-2", name: "TEST FIXTURE — Map Journey PC 2 (delete after review)", color: "#2a7dd1" },
  { id: "map-journey-test-3", name: "TEST FIXTURE — Map Journey PC 3 (delete after review)", color: "#2ad16e" },
  { id: "map-journey-test-4", name: "TEST FIXTURE — Map Journey PC 4 (delete after review)", color: "#d1c02a" },
  { id: "map-journey-test-5", name: "TEST FIXTURE — Map Journey PC 5 (delete after review)", color: "#8a2ad1" },
  { id: "map-journey-test-6", name: "TEST FIXTURE — Map Journey PC 6 (delete after review)", color: "#d1792a" }
]);

/**
 * Where "the western edge of the map" actually is, in master-image pixel
 * space — data/map/campaign-map.json's own border/content split (a 200px
 * painted margin around a 12000x12000 content area), so this lands just
 * inside the real content, not in the unpainted border. Vertically centred
 * on the content area since no specific latitude was asked for.
 */
export function westernEdgePoint(manifest) {
  const border = manifest?.border?.px ?? 0;
  const contentH = manifest?.content?.height ?? manifest?.image?.height ?? 0;
  return { x: border + 40, y: border + contentH / 2 };
}
