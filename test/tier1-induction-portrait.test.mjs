// Tier 1 -- the induction terminal's Page 6 crop-geometry math.
//
// Pure logic only: given an image's natural size, a fixed crop-box size,
// and a pan/zoom state, where does the crop box sit and what source
// rectangle does it describe? No Foundry, no DOM, no Canvas -- loading a
// real file, drag/zoom event wiring, and the actual canvas draw all live in
// the adapter and were validated live instead (module/blank-inheritance/
// scripts/foundry/induction-terminal.mjs, see design/induction-terminal.md's
// Page 6 build-status paragraph).
//
// Every case below is hand-computed, not just asserted against the
// implementation -- see the comment on each block for the arithmetic.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  OUTPUT_WIDTH, OUTPUT_HEIGHT, MAX_ZOOM_MULTIPLIER,
  coverScale, clampOffset, initialCropState, panBy, zoomTo, cropSourceRect,
  sliderValueToScale, scaleToSliderValue
} from "../module/blank-inheritance/scripts/core/induction-portrait.mjs";

test("OUTPUT_WIDTH/OUTPUT_HEIGHT are a real 2:3 ratio", () => {
  assert.equal(OUTPUT_HEIGHT / OUTPUT_WIDTH, 1.5);
});

test("coverScale: the larger of the two axis ratios wins, whichever axis that is", () => {
  // 400x200 image (2:1) into a 200x300 box (2:3): width alone needs 0.5,
  // height alone needs 1.5 -- height dominates.
  assert.equal(coverScale(400, 200, 200, 300), 1.5);
  // 200x400 image (1:2) into a 300x200 box (3:2): width alone needs 1.5,
  // height alone needs 0.5 -- width dominates this time.
  assert.equal(coverScale(200, 400, 300, 200), 1.5);
  // Exact match needs no scaling at all.
  assert.equal(coverScale(200, 300, 200, 300), 1);
});

test("coverScale: throws on a non-positive image dimension rather than dividing by zero", () => {
  assert.throws(() => coverScale(0, 100, 10, 10), /positive image size/i);
  assert.throws(() => coverScale(100, -5, 10, 10), /positive image size/i);
});

test("clampOffset: passes through an in-range value, clamps below zero and above the real max", () => {
  // naturalDimension(400) * scale(1) - boxDimension(200) = 200 is the max.
  assert.equal(clampOffset(50, 1, 400, 200), 50);
  assert.equal(clampOffset(-10, 1, 400, 200), 0);
  assert.equal(clampOffset(500, 1, 400, 200), 200);
});

test("clampOffset: collapses to a single point when the scaled image is smaller than the box", () => {
  // 50 * 0.1 = 5 wide, box is 200 -- max(0, 5-200) = 0, so both bounds are 0
  // regardless of the requested offset (a degenerate case that shouldn't
  // arise once scale is held at/above coverScale, but must not crash).
  assert.equal(clampOffset(10, 0.1, 50, 200), 0);
});

test("initialCropState: cover-scaled and centered, landscape image into a portrait box", () => {
  // 400x300 image into a 200x300 box: coverScale = max(200/400, 300/300) = 1.
  // Scaled image is 400x300 -- exactly fills the box vertically (offsetY
  // pins to 0) and overflows horizontally by 200px, so offsetX centers at 100.
  const state = initialCropState(400, 300, 200, 300);
  assert.equal(state.scale, 1);
  assert.equal(state.offsetX, 100);
  assert.equal(state.offsetY, 0);
});

test("initialCropState: cover-scaled and centered, a near-square image into the same box", () => {
  // 300x400 image into a 200x300 box: coverScale = max(200/300, 300/400) = 0.75.
  // Scaled image is 225x300 -- exactly fills vertically again, overflows
  // horizontally by 25px, so offsetX centers at 12.5.
  const state = initialCropState(300, 400, 200, 300);
  assert.equal(state.scale, 0.75);
  assert.equal(state.offsetX, 12.5);
  assert.equal(state.offsetY, 0);
});

test("panBy: dragging right/down moves the box's offset the OPPOSITE way, and clamps at both ends", () => {
  const start = { scale: 1, offsetX: 100, offsetY: 0 }; // from the first initialCropState case above
  assert.equal(panBy(start, 20, 0, 400, 300, 200, 300).offsetX, 80, "dragging right reveals more of the image's left edge");
  assert.equal(panBy(start, -150, 0, 400, 300, 200, 300).offsetX, 200, "dragging far left clamps at the real max (200)");
  assert.equal(panBy(start, 300, 0, 400, 300, 200, 300).offsetX, 0, "dragging far right clamps at 0");
  // This image exactly fills the box vertically at scale 1, so vertical pan
  // range is [0,0] -- any dy reclamps straight back to 0.
  assert.equal(panBy(start, 0, 50, 400, 300, 200, 300).offsetY, 0);
});

test("zoomTo: rescaling keeps the box's current CENTER fixed in image space", () => {
  // Same starting state as the panBy test: box is showing image-space
  // x=[100,300], y=[0,300] -- center (200, 150). Zooming to scale 2 should
  // leave that same point centered, now with a tighter (half-size) window
  // around it: x=[150,250], y=[75,225].
  const start = { scale: 1, offsetX: 100, offsetY: 0 };
  const zoomed = zoomTo(start, 2, 400, 300, 200, 300);
  assert.deepEqual(zoomed, { scale: 2, offsetX: 300, offsetY: 150 });

  const rect = cropSourceRect(zoomed, 200, 300);
  assert.deepEqual(rect, { sx: 150, sy: 75, sWidth: 100, sHeight: 150 });
});

test("zoomTo: never zooms out past coverScale, even if asked to", () => {
  // coverScale for this image/box pair is 1 (see the coverScale test above) --
  // requesting 0.3 must clamp up to 1, which leaves this particular state
  // unchanged since it was already sitting at scale 1.
  const start = { scale: 1, offsetX: 100, offsetY: 0 };
  assert.deepEqual(zoomTo(start, 0.3, 400, 300, 200, 300), start);
});

test("cropSourceRect: divides the box's offset/size by scale to land in source-image pixels", () => {
  assert.deepEqual(
    cropSourceRect({ scale: 1, offsetX: 100, offsetY: 0 }, 200, 300),
    { sx: 100, sy: 0, sWidth: 200, sHeight: 300 }
  );
});

test("sliderValueToScale/scaleToSliderValue: 0 is always coverScale, 1 is always MAX_ZOOM_MULTIPLIER x coverScale", () => {
  assert.equal(sliderValueToScale(0, 1), 1);
  assert.equal(sliderValueToScale(1, 1), MAX_ZOOM_MULTIPLIER);
  assert.equal(sliderValueToScale(0.5, 1), 2); // halfway to a 3x default multiplier is 2x
  assert.equal(scaleToSliderValue(1, 1), 0);
  assert.equal(scaleToSliderValue(MAX_ZOOM_MULTIPLIER, 1), 1);
  // A non-1 coverScale must scale proportionally, not just shift by a constant.
  assert.equal(sliderValueToScale(1, 0.75), 2.25);
  assert.equal(scaleToSliderValue(2.25, 0.75), 1);
});

test("sliderValueToScale and scaleToSliderValue are exact inverses of each other", () => {
  for (const coverScaleValue of [0.3, 1, 1.6, 2.5]) {
    for (const sliderValue of [0, 0.2, 0.5, 0.83, 1]) {
      const scale = sliderValueToScale(sliderValue, coverScaleValue);
      assert.ok(Math.abs(scaleToSliderValue(scale, coverScaleValue) - sliderValue) < 1e-9);
    }
  }
});
