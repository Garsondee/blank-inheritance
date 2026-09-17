// Tier 1 — the Sound Desk's own model (scripts/core/audio-desk.mjs): channel
// strips, fader geometry, the meter face's crop, and library browsing.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DESK_CHANNELS,
  FADER_FRAMES,
  LIBRARY_FILTERS,
  VU_SCALE,
  deskChannels,
  faderDbFromPointer,
  faderFrame,
  faderPositionFromPointer,
  libraryRow,
  meterFaceGeometry,
  nowPlayingModel,
  paginate,
  playheadModel,
  vuNeedleDegrees,
  vuNeedlePosition
} from "../module/blank-inheritance/scripts/core/audio-desk.mjs";

test("the desk has exactly three strips, in a fixed order", () => {
  assert.deepEqual(DESK_CHANNELS.map((c) => c.bus), ["music", "ambience", "stings"]);
});

test("a channel strip carries its level, its cap position, and where its needle sits", () => {
  const strips = deskChannels({ music: -6, ambience: 0, stings: 3, muted: { ambience: true } }, { music: { rmsDb: -18, peakDb: -2 }, ambience: { rmsDb: -Infinity, peakDb: -Infinity } });
  const music = strips.find((s) => s.bus === "music");
  assert.equal(music.db, -6);
  assert.equal(music.label, "-6.0");
  assert.ok(music.fader > 0.6 && music.fader < 0.75);
  assert.equal(music.vu, 0, "-18 dBFS is 0 VU");
  assert.equal(music.clipping, false);
  assert.equal(strips.find((s) => s.bus === "ambience").muted, true);
  assert.equal(strips.find((s) => s.bus === "ambience").vu, -Infinity);
  const hot = deskChannels({}, { music: { rmsDb: -4, peakDb: -0.2 } }).find((s) => s.bus === "music");
  assert.equal(hot.clipping, true, "the clip lamp lights near full scale");
});

test("a fader drag reads top-as-loudest, clamps at both stops, and detents at unity", () => {
  const box = (y) => ({ top: 100, height: 200, pointerY: y });
  assert.equal(faderPositionFromPointer(box(100)), 1, "top of the travel");
  assert.equal(faderPositionFromPointer(box(300)), 0, "bottom of the travel");
  assert.equal(faderPositionFromPointer(box(50)), 1, "above the track clamps");
  assert.equal(faderPositionFromPointer(box(999)), 0);
  assert.equal(faderPositionFromPointer({ top: 0, height: 0, pointerY: 5 }), 0, "a zero-height track cannot divide by zero");

  // 0 dB sits at 78% of the travel; a drag landing near it snaps to exactly 0.
  const atUnity = faderDbFromPointer(box(100 + 200 * (1 - 0.78)));
  assert.equal(atUnity, 0);
  const justOff = faderDbFromPointer(box(100 + 200 * (1 - 0.7)));
  assert.notEqual(justOff, 0, "a real move away from unity is not swallowed by the detent");
});

test("the fader filmstrip's frame count matches the stylesheet's, and maps across the whole strip", () => {
  assert.equal(FADER_FRAMES, 150);
  assert.equal(faderFrame(0), 0, "cap at the bottom");
  assert.equal(faderFrame(1), 149, "cap at the top");
  assert.equal(faderFrame(0.5), 75);
  assert.equal(faderFrame(-3), 0);
  assert.equal(faderFrame(9), 149);
});

test("the meter crops to the part of the face that is actually drawn (regression: clipped scale numbers)", () => {
  const g = meterFaceGeometry();
  const [x, y, w, h] = g.viewBox.split(" ").map(Number);
  // The printed numbers sit at radius+reach above the pivot; they must be inside.
  assert.ok(y <= 124 - 86 - 20, `the crop starts at ${y}, below the topmost printed label`);
  assert.ok(y + h >= 124, "the crop must reach the pivot the needle turns on");
  assert.ok(x <= 100 - 86 && x + w >= 100 + 86, "the crop must contain the whole arc");
  assert.ok(g.needleBottomPct > 0 && g.needleBottomPct < 20);
  assert.ok(g.needleHeightPct > 50 && g.needleHeightPct < 100);
});

test("the needle sweeps the printed scale and pins at both ends", () => {
  assert.equal(vuNeedlePosition(VU_SCALE.min), 0);
  assert.equal(vuNeedlePosition(VU_SCALE.max), 1);
  assert.equal(vuNeedlePosition(-99), 0, "far below the scale pins at rest, it does not swing off the face");
  assert.equal(vuNeedlePosition(99), 1);
  assert.equal(vuNeedlePosition(-Infinity), 0);
  assert.equal(vuNeedleDegrees(VU_SCALE.min), -48);
  assert.equal(vuNeedleDegrees(VU_SCALE.max), 48);
});

test("now playing lists what the table is hearing, and says when it is hearing nothing", () => {
  const index = { assets: new Map([["drums", { id: "drums", title: "Drums of War", durationSec: 187, reservedFor: [] }]]) };
  const model = nowPlayingModel({ soundscapeId: "harbour", music: [{ assetId: "drums", playlist: "Music — Battle" }], ambience: [{ assetId: "rain", name: "Rain", gain: 0.5 }], scatterLayers: 2 }, index);
  assert.equal(model.music[0].title, "Drums of War");
  assert.equal(model.music[0].duration, "3:07");
  assert.equal(model.ambience[0].title, "Rain", "an asset missing from the index still shows the name the document carries");
  assert.equal(model.ambience[0].gainLabel, "-6.0");
  assert.equal(model.silent, false);
  assert.equal(nowPlayingModel({}, index).silent, true);
});

test("the playhead reads elapsed and remaining, and says nothing rather than lying", () => {
  assert.deepEqual(playheadModel({ currentTime: 65, duration: 187 }), { elapsed: "1:05", remaining: "-2:02", progress: 0.348 });
  assert.deepEqual(playheadModel({ currentTime: 0, duration: 187 }).remaining, "-3:07");
  assert.deepEqual(playheadModel({ currentTime: 999, duration: 187 }), { elapsed: "3:07", remaining: "-0:00", progress: 1 }, "past the end pins rather than going negative");
  assert.deepEqual(playheadModel({}), { elapsed: "--:--", remaining: "--:--", progress: 0 });
  assert.deepEqual(playheadModel({ currentTime: 5, duration: 0 }), { elapsed: "--:--", remaining: "--:--", progress: 0 }, "a stream with no known length cannot be measured");
});

test("a library row offers only what that kind of sound can actually do", () => {
  const music = libraryRow({ id: "a", title: "A", kind: "music", durationSec: 60, encode: { path: "music/a.ogg" }, status: "proposed", markers: [{ id: "m", at: 1 }] });
  assert.deepEqual([music.canPlayMusic, music.canLayer, music.canFire], [true, false, false]);
  assert.equal(music.markers, 1);
  const bed = libraryRow({ id: "b", kind: "ambience", encode: { path: "x" } });
  assert.deepEqual([bed.canPlayMusic, bed.canLayer, bed.canFire], [false, true, false]);
  const hit = libraryRow({ id: "c", kind: "sting", encode: { path: "x" } });
  assert.deepEqual([hit.canPlayMusic, hit.canLayer, hit.canFire], [false, false, true]);
  const reserved = libraryRow({ id: "d", kind: "music", encode: null, reservedFor: [{ kind: "npc", ref: "the-observer" }] });
  assert.equal(reserved.reserved, true);
  assert.equal(reserved.reservedFor, "the-observer");
  assert.equal(reserved.unbuilt, true, "an asset with no processed file is flagged rather than silently offered");
});

test("the library filters are 'all' plus one per kind", () => {
  assert.equal(LIBRARY_FILTERS[0], "all");
  assert.ok(LIBRARY_FILTERS.includes("music") && LIBRARY_FILTERS.includes("ambience") && LIBRARY_FILTERS.includes("interface"));
});

test("paging clamps rather than showing an empty page", () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  assert.deepEqual(paginate(items, 0, 10).items, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(paginate(items, 0, 10).pages, 3);
  assert.deepEqual(paginate(items, 2, 10).items, [20, 21, 22]);
  assert.equal(paginate(items, 99, 10).page, 2, "past the end clamps to the last page");
  assert.equal(paginate(items, -5, 10).page, 0);
  assert.deepEqual(paginate([], 0, 10), { items: [], page: 0, pages: 1, total: 0 });
});
