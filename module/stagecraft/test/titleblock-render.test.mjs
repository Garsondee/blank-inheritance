// The title block on a canvas (render/titleblock.mjs): it measures with the canvas, lays a card's words out with core/
// titleblock.mjs, and draws them. A canvas double that can measure text stands in for the page's.

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTitleBlock, TYPE } from "../scripts/render/titleblock.mjs";
import { recordingContext } from "./fake-canvas.mjs";

/** A context that records what is drawn and can measure: half the font size a letter. */
function measuringContext() {
  const log = [];
  const state = { font: "10px sans-serif", letterSpacing: "0px" };
  return new Proxy({ log, state }, {
    get(target, name) {
      if (name === "log" || name === "state") return target[name];
      if (name === "measureText") return (s) => ({ width: [...s].length * Number(/(\d+(?:\.\d+)?)px/.exec(state.font)?.[1] ?? 10) * 0.5 });
      if (name in state) return state[name];
      return (...args) => { log.push({ call: name, args, with: { ...state } }); };
    },
    set(target, name, value) { state[name] = value; return true; },
    has(target, name) { return name in state; }
  });
}

const helper = () => makeTitleBlock({ canvas: () => ({ getContext: () => measuringContext() }) });
const STYLE = { width: 440, maxHeight: 236, gap: 14, name: { family: "TestSans", weight: 700, max: 60, min: 32, maxLines: 3, tracking: 0.04 }, text: { family: "TestText", weight: 600, max: 34, min: 28, maxLines: 3 } };

test("fit: the name is set in capitals, the text as it was written, in the sizes the style allows", () => {
  const tb = helper();
  const b = tb.fit({ name: "Kiku Enomoto", title: "Class representative, 2B" }, STYLE);
  assert.deepEqual(b.name.lines.map((l) => l.text), ["KIKU ENOMOTO"]);
  assert.deepEqual(b.text.lines.map((l) => l.text), ["Class representative, 2B"]);
  assert.ok(b.name.size <= 60 && b.name.size >= 32);
  assert.ok(b.text.size <= 34 && b.text.size >= 28);
  assert.ok(b.name.size > b.text.size);
  assert.equal(b.height, b.name.height + b.gap + b.text.height);
  assert.deepEqual(b.full, { name: "Kiku Enomoto", text: "Class representative, 2B" }, "the words as they were, to be read in full");
  assert.equal(b.style.name.family, "TestSans");
  assert.equal(b.style.text.weight, 600);
});

test("fit: a name with a line break is a name and a line of text; a name alone has no text", () => {
  const tb = helper();
  const a = tb.fit({ name: "Etsuko\nthe girl from the library" }, STYLE);
  assert.deepEqual(a.name.lines.map((l) => l.text), ["ETSUKO"]);
  assert.deepEqual(a.text.lines.map((l) => l.text), ["the girl from the library"]);
  const alone = tb.fit({ name: "Tama" }, STYLE);
  assert.equal(alone.text, null);
  assert.equal(alone.name.size, 60);
});

test("fit: it is measured as it will be drawn, with the font and the tracking of the spec", () => {
  const tb = makeTitleBlock({ canvas: () => ({ getContext: () => { const c = measuringContext(); return c; } }) });
  const b = tb.fit({ name: "Tama" }, STYLE);
  assert.equal(b.name.lines[0].width, 4 * b.name.size * 0.5, "four letters, half the size each");
  const wide = tb.fit({ name: "x".repeat(200) }, STYLE);
  assert.equal(wide.truncated.name, true);
  assert.ok(wide.name.lines.every((l) => l.width <= STYLE.width + 0.5));
});

test("fit: a context that cannot measure is given an estimate, and nothing throws", () => {
  const tb = makeTitleBlock({ canvas: () => ({ getContext: () => recordingContext() }) });
  const b = tb.fit({ name: "Kiku Enomoto", title: "the clerk" }, STYLE);
  assert.ok(b.name.lines.length >= 1 && b.text.lines.length >= 1);
  assert.ok(b.height > 0);
});

test("fit: the defaults are a bold name and a smaller line of text, and a style may change any of it", () => {
  assert.ok(TYPE.name.weight >= 700 && TYPE.name.max > TYPE.text.max);
  const tb = helper();
  const b = tb.fit({ name: "Tama", title: "the cook" }, { width: 400, maxHeight: 200 });
  assert.equal(b.style.name.weight, TYPE.name.weight);
  assert.equal(b.name.lines[0].text, "TAMA", "capitals unless the style says not");
  const plain = tb.fit({ name: "Tama" }, { width: 400, maxHeight: 200, name: { upper: false } });
  assert.equal(plain.name.lines[0].text, "Tama");
});

test("draw: every line is drawn, the name emboldened, a hairline between the name and the text, the type put back after", () => {
  const tb = helper();
  const b = tb.fit({ name: "Kiku Enomoto", title: "Class representative, 2B" }, STYLE);
  const ctx = measuringContext();
  tb.draw(ctx, b, { x: 24, y: 800, w: 512, h: 130 }, { emboss: "rgba(255,255,255,0.5)" });
  const fills = ctx.log.filter((e) => e.call === "fillText");
  const strokes = ctx.log.filter((e) => e.call === "strokeText");
  assert.equal(strokes.length, b.name.lines.length, "the name is made bolder than its font with a stroke, the text is not");
  assert.equal(fills.length, 2 * (b.name.lines.length + b.text.lines.length), "an embossed plate draws every line twice, the light one under the ink");
  assert.equal(ctx.log.filter((e) => e.call === "fillRect").length, 1, "a hairline between the name and the text");
  assert.equal(ctx.log.filter((e) => e.call === "save").length, 1);
  assert.equal(ctx.log.filter((e) => e.call === "restore").length, 1);
  assert.equal(ctx.state.letterSpacing, "0px", "the tracking is put back");
  const main = fills.filter((e) => e.args[0] === "KIKU ENOMOTO").at(-1);
  assert.equal(main.with.textAlign, "center");
  assert.ok(/^700 \d+px TestSans$/.test(main.with.font), main.with.font);
  const text = fills.find((e) => e.args[0] === "Class representative, 2B");
  assert.ok(/^600 \d+px TestText$/.test(text.with.font), text.with.font);
  assert.ok(Math.abs(main.args[1] - (24 + 256 + b.name.size * 0.04 / 2)) < 1e-6, "centred in the plate (the tracking after the last letter is not part of what is seen)");
});

test("draw: no text means no hairline, and no embossing unless asked for", () => {
  const tb = helper();
  const b = tb.fit({ name: "Tama" }, STYLE);
  const ctx = measuringContext();
  tb.draw(ctx, b, { x: 0, y: 0, w: 512, h: 108 });
  assert.equal(ctx.log.filter((e) => e.call === "fillRect").length, 0);
  assert.equal(ctx.log.filter((e) => e.call === "fillText").length, b.name.lines.length);
});

test("draw: the words are centred in the plate, top to bottom, and stay inside it", () => {
  const tb = helper();
  const b = tb.fit({ name: "Captain Isamu Kobayashi-Takahashi the Third", title: "Commander of the Seventh Fleet of the Outer Reach" }, STYLE);
  const rect = { x: 0, y: 500, w: 512, h: Math.ceil(b.height) + 40 };
  const ctx = measuringContext();
  tb.draw(ctx, b, rect, { embolden: 0 });
  const ys = ctx.log.filter((e) => e.call === "fillText").map((e) => e.args[2]);
  const first = ys[0] - b.name.size * b.name.lineHeight / 2;
  const last = ys.at(-1) + b.text.size * b.text.lineHeight / 2;
  assert.ok(first >= rect.y + 19 && last <= rect.y + rect.h - 19, `${first} .. ${last} in ${rect.y} .. ${rect.y + rect.h}`);
  assert.ok(Math.abs((first - rect.y) - (rect.y + rect.h - last)) < b.name.size * 0.1, "the same room above and below");
});

test("draw: a block with no lines draws nothing and does not throw", () => {
  const tb = helper();
  const b = tb.fit({ name: "" }, STYLE);
  const ctx = measuringContext();
  tb.draw(ctx, b, { x: 0, y: 0, w: 512, h: 108 });
  assert.equal(ctx.log.filter((e) => e.call === "fillText").length, 0);
});
