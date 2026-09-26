// Tier 1 — the six temporary test PCs, and where "the western edge" is.
//
// Requested 2026-09-19 (Ingram), diagnosing #174: real, distinct, clearly
// disposable markers for verifying map travel, instead of one generic
// direction-arrow icon.

import { test } from "node:test";
import assert from "node:assert/strict";
import { TEST_FIXTURE_PCS, westernEdgePoint } from "../module/blank-inheritance/scripts/core/travel-test-fixtures.mjs";

test("there are exactly six test PCs, each clearly marked as a throwaway fixture", () => {
  assert.equal(TEST_FIXTURE_PCS.length, 6);
  for (const pc of TEST_FIXTURE_PCS) {
    assert.match(pc.name, /test fixture/i, `"${pc.name}" doesn't match this project's own established diagnostic-content naming convention (scene-build.mjs's DIAGNOSTIC_NAME_PATTERN)`);
    assert.match(pc.name, /delete after review/i);
  }
});

test("every test PC has a distinct id and a distinct colour — nothing collides", () => {
  const ids = TEST_FIXTURE_PCS.map((pc) => pc.id);
  const colors = TEST_FIXTURE_PCS.map((pc) => pc.color);
  assert.equal(new Set(ids).size, 6, "two test PCs share the same id");
  assert.equal(new Set(colors).size, 6, "two test PCs share the same colour and would be indistinguishable on the map");
  for (const color of colors) assert.match(color, /^#[0-9a-f]{6}$/i, `"${color}" is not a real hex colour`);
});

test("westernEdgePoint lands just inside the real content area, not in the painted border", () => {
  const manifest = { border: { px: 200 }, content: { width: 12000, height: 12000 }, image: { width: 12400, height: 12400 } };
  const p = westernEdgePoint(manifest);
  assert.ok(p.x > manifest.border.px, "the point is inside the border margin, not past it");
  assert.ok(p.x < manifest.border.px + 200, "the point is not actually near the western EDGE any more");
  assert.equal(p.y, manifest.border.px + manifest.content.height / 2, "not vertically centred on the content area");
});

test("westernEdgePoint tolerates a missing border/content block rather than throwing", () => {
  assert.doesNotThrow(() => westernEdgePoint({}));
  assert.doesNotThrow(() => westernEdgePoint(undefined));
});
