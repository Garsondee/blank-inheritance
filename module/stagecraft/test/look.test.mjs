// core/look.mjs: where a screen looks at the stage, and how close (Ingram, 2026-10-04: free pan and zoom, and with the
// GM's drawer open the whole stage fitted into the width that is left).

import { test } from "node:test";
import assert from "node:assert/strict";
import { homeLook, viewOf, zoomLimits, clampLook, zoomAt, panBy, wheelFactor, tweenLook, sameLook, cleanMargins } from "../scripts/core/look.mjs";
import { viewFor, REF } from "../scripts/core/rigspace.mjs";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test("with nothing over the window, home is the cover the stage always had", () => {
  for (const [w, h] of [[1920, 1080], [1280, 1024], [3440, 1440], [800, 1200]]) {
    const v = viewOf(w, h, homeLook(w, h));
    const old = viewFor(w, h);
    for (const k of ["s", "ox", "oy", "visW", "visH"]) near(v[k], old[k]);
  }
});

test("with a drawer down the left, home fits the page's whole width into what is left, centred there", () => {
  const w = 1920, h = 1080, left = 830;
  const look = homeLook(w, h, { left });
  const v = viewOf(w, h, look);
  near(v.s, (w - left) / REF.W);
  // the page's left edge is at the drawer's edge, its right edge at the window's
  near((0 - v.ox) * v.s, left);
  near((REF.W - v.ox) * v.s, w);
  // and it is centred top to bottom
  near((REF.H / 2 - v.oy) * v.s, h / 2);
  assert.ok(v.s < viewFor(w, h).s, "zoomed out from the cover");
});

test("margins are cleaned: nonsense counts as nothing and they never take the whole window", () => {
  assert.deepEqual(cleanMargins({ left: -5, right: NaN, top: "x" }, 1000, 800), { left: 0, right: 0, top: 0, bottom: 0 });
  const m = cleanMargins({ left: 5000, right: 5000 }, 1000, 800);
  assert.ok(m.left + m.right < 1000);
  assert.ok(homeLook(1000, 800, { left: 5000 }).s > 0);
});

test("zooming keeps the point under the pointer where it is, within the limits", () => {
  const w = 1600, h = 900;
  const look = homeLook(w, h);
  const at = { x: 400, y: 300 };
  const before = viewOf(w, h, look);
  const page = { x: before.ox + at.x / before.s, y: before.oy + at.y / before.s };
  const zoomed = zoomAt(look, w, h, at.x, at.y, 1.5);
  const after = viewOf(w, h, zoomed);
  near(after.s, before.s * 1.5);
  near(after.ox + at.x / after.s, page.x, 1e-6);
  near(after.oy + at.y / after.s, page.y, 1e-6);
  const { min, max } = zoomLimits(w, h);
  near(zoomAt(look, w, h, 800, 450, 1000).s, max);
  near(zoomAt(look, w, h, 800, 450, 0.0001).s, min);
});

test("the home look is always within the limits, however much a margin takes", () => {
  const { min } = zoomLimits(1920, 1080, { left: 1700 });
  assert.ok(homeLook(1920, 1080, { left: 1700 }).s >= min);
});

test("panning follows the hand, and never loses the stage off the screen", () => {
  const w = 1920, h = 1080;
  const look = zoomAt(homeLook(w, h), w, h, 960, 540, 2);
  const moved = panBy(look, 100, -50, w, h);
  near(moved.cx, look.cx - 100 / look.s);
  near(moved.cy, look.cy + 50 / look.s);
  const flung = viewOf(w, h, panBy(look, 1e6, 1e6, w, h));
  const overlapX = Math.min(flung.ox + flung.visW, REF.W) - Math.max(flung.ox, 0);
  const overlapY = Math.min(flung.oy + flung.visH, REF.H) - Math.max(flung.oy, 0);
  assert.ok(overlapX > 0 && overlapY > 0, "some of the page is still on the screen");
});

test("clamping leaves a reasonable look alone", () => {
  const look = homeLook(1920, 1080, { left: 800 });
  assert.ok(sameLook(clampLook(look, 1920, 1080, { left: 800 }), look));
});

test("the wheel zooms in when rolled forward and out when rolled back, the same for lines and pixels", () => {
  assert.ok(wheelFactor(-100) > 1);
  assert.ok(wheelFactor(100) < 1);
  near(wheelFactor(100) * wheelFactor(-100), 1);
  near(wheelFactor(3, 1), wheelFactor(48, 0));
  assert.ok(wheelFactor(1e9) > 0, "a huge flick is still a sane step");
});

test("a glide starts where it was, ends where it goes, and changes scale by ratio", () => {
  const a = { s: 0.5, cx: 100, cy: 200 };
  const b = { s: 2, cx: 300, cy: 400 };
  assert.ok(sameLook(tweenLook(a, b, 0), a));
  assert.ok(sameLook(tweenLook(a, b, 1), b));
  near(tweenLook(a, b, 0.5).s, 1);
  assert.ok(sameLook(tweenLook(a, b, -1), a) && sameLook(tweenLook(a, b, 2), b));
});
