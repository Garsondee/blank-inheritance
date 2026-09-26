// Tier 1 — the tile self-heal's pure decision logic (core/tile-resilience.mjs).
//
// The bug this exists for is real and confirmed by reading Foundry v14's own
// source, not inferred from symptoms: client/canvas/loader.mjs's
// TextureLoader#loadTexture awaits PIXI.Assets.load(src) and then checks
// asset.baseTexture.valid SYNCHRONOUSLY the instant that promise resolves --
// but PIXI's own `valid` flag flips on a separate 'loaded' event once the GPU
// upload finishes, not on promise resolution. Under load, the flag can still
// read false at that exact moment, and Foundry gives up permanently rather
// than waiting.
//
// Found live 2026-09-22 on the campaign map's four quarter tiles (14-20MB
// WebP each): a different quarter failed almost every reload, never the same
// one twice, uncorrelated with file size. Confirmed not a bad upload or a
// corrupt file every single time -- the exact bytes that failed to load in
// one attempt decoded perfectly via a raw <img>, createImageBitmap, and
// PIXI.Texture.from() moments later, in the same tab.

import { test } from "node:test";
import assert from "node:assert/strict";
import { REPAIR_PASS_DELAYS_MS, tileNeedsRepair, tilesNeedingRepair } from "../module/blank-inheritance/scripts/core/tile-resilience.mjs";

test("tileNeedsRepair: a tile rendering at its declared size needs nothing", () => {
  assert.equal(
    tileNeedsRepair({ declaredWidth: 6200, declaredHeight: 6200, renderedWidth: 6200, renderedHeight: 6200 }),
    false
  );
});

test("tileNeedsRepair: stuck on Foundry's own placeholder size is exactly the case this catches", () => {
  // 512 is PIXI's own placeholder texture size -- what every stuck tile
  // reported live before repair.
  assert.equal(
    tileNeedsRepair({ declaredWidth: 6200, declaredHeight: 6200, renderedWidth: 512, renderedHeight: 512 }),
    true
  );
});

test("tileNeedsRepair: a tile with no declared size is never flagged -- nothing to compare against", () => {
  assert.equal(tileNeedsRepair({ declaredWidth: 0, declaredHeight: 0, renderedWidth: 512, renderedHeight: 512 }), false);
  assert.equal(tileNeedsRepair({ renderedWidth: 512, renderedHeight: 512 }), false);
  assert.equal(tileNeedsRepair(), false, "must survive being called with nothing at all");
});

test("tileNeedsRepair: a mismatch in only one dimension still counts", () => {
  assert.equal(
    tileNeedsRepair({ declaredWidth: 6200, declaredHeight: 6200, renderedWidth: 6200, renderedHeight: 512 }),
    true
  );
});

test("tilesNeedingRepair: filters a mixed list down to only the stuck ones, preserving their own data", () => {
  const fine = { id: "a", declaredWidth: 6200, declaredHeight: 6200, renderedWidth: 6200, renderedHeight: 6200 };
  const stuck1 = { id: "b", declaredWidth: 6200, declaredHeight: 6200, renderedWidth: 512, renderedHeight: 512 };
  const stuck2 = { id: "c", declaredWidth: 6200, declaredHeight: 6200, renderedWidth: 512, renderedHeight: 512 };
  const result = tilesNeedingRepair([fine, stuck1, stuck2]);
  assert.deepEqual(result.map((t) => t.id), ["b", "c"]);
});

test("tilesNeedingRepair: an empty or missing list is empty, not a throw", () => {
  assert.deepEqual(tilesNeedingRepair([]), []);
  assert.deepEqual(tilesNeedingRepair(undefined), []);
});

test("REPAIR_PASS_DELAYS_MS: increasing delays, matching the 20+ second placeholder window observed live", () => {
  assert.ok(REPAIR_PASS_DELAYS_MS.length >= 3, "too few passes to reliably outlast Foundry's own load attempt");
  for (let i = 1; i < REPAIR_PASS_DELAYS_MS.length; i++) {
    assert.ok(REPAIR_PASS_DELAYS_MS[i] > REPAIR_PASS_DELAYS_MS[i - 1], "delays must strictly increase -- backoff, not a fixed poll");
  }
  const total = REPAIR_PASS_DELAYS_MS.reduce((a, b) => a + b, 0);
  assert.ok(total >= 20000, `total wait (${total}ms) should reach the 20s+ window a genuinely stuck tile was observed to need`);
});
