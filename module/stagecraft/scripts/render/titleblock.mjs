/**
 * A card's title block on a canvas: the name, and a line of text under it, in the real font, laid out to fit (core/
 * titleblock.mjs does the thinking: this measures with the canvas and draws). Skins use it through `helpers.titleBlock`:
 *
 *   const block = helpers.titleBlock.fit(person, style);              // how it lays out, and how tall it is
 *   ... the skin makes its plate as tall as `block.height` needs ...
 *   helpers.titleBlock.draw(ctx, block, { x, y, w, h }, look);        // and draws it, centred in the plate
 *
 * `style` says what the plate can hold and in what type: `{ width, maxHeight, gap, name: spec, text: spec }`, each spec
 * `{ family, weight, max, min, maxLines, lineHeight, tracking, upper }` (sizes in the canvas's pixels, `tracking` in em).
 * Fonts must already be loaded: a skin lists them in `fonts`, and the backend loads them before it draws a face.
 */

import { textOf, fitBlock, clean } from "../core/titleblock.mjs";

/** What a plate's words may be, unless a skin says otherwise: a bold name of up to two lines, and up to three of text. */
export const TYPE = Object.freeze({
  gap: 14,
  name: Object.freeze({ family: "sans-serif", weight: 800, max: 58, min: 32, maxLines: 2, lineHeight: 1.06, tracking: 0.03, upper: true }),
  text: Object.freeze({ family: "sans-serif", weight: 700, max: 34, min: 24, maxLines: 3, lineHeight: 1.18, tracking: 0, upper: false })
});

const fontOf = (spec, size) => `${spec.weight} ${size}px ${spec.family}`;

/** A title block maker. `canvas()` makes a canvas to measure on (a test gives its own). */
export function makeTitleBlock({ canvas = () => document.createElement("canvas") } = {}) {
  let probe = null;
  const measuring = () => (probe ??= canvas().getContext("2d"));

  /** The measuring function for a spec: size -> (text -> width), with the font and the tracking set as they will be drawn. */
  const measureAt = (spec) => (size) => {
    const ctx = measuring();
    ctx.font = fontOf(spec, size);
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${(spec.tracking ?? 0) * size}px`;
    // a context that cannot measure (none, in a test) is given a plain estimate: a letter is about half the size wide
    return (s) => { const m = ctx.measureText(s); return Number.isFinite(m?.width) ? m.width : [...s].length * size * 0.55; };
  };

  const mixed = (base, over) => ({ ...base, ...(over ?? {}) });

  return {
    textOf,

    /** The layout of a person's words in a style: `{ ...fitBlock, style }`; `height` is what the plate must hold. */
    fit(person, style = {}) {
      const name = mixed(TYPE.name, style.name);
      const text = mixed(TYPE.text, style.text);
      const { name: n, text: t } = textOf(person);
      const block = fitBlock(
        { name: name.upper ? n.toLocaleUpperCase("en") : n, text: text.upper ? t.toLocaleUpperCase("en") : t },
        { width: style.width, maxHeight: style.maxHeight, gap: style.gap ?? TYPE.gap, name, text, measureName: measureAt(name), measureText: measureAt(text) }
      );
      // what the table may want to read in full (a hover): the words as they were, not shouted
      block.full = { name: clean(n), text: clean(t) };
      block.style = { name, text };
      return block;
    },

    /**
     * Draw a laid-out block centred in the rect `{ x, y, w, h }`. `look`: `ink` (the name), `textInk`, `rule` (the hairline
     * between them), `embolden` (a stroke in the ink, as a share of the size: the name is made bolder than the font is),
     * `emboss` (a light line under the letters, as on a stamped plate).
     */
    draw(ctx, block, rect, look = {}) {
      const L = { ink: "#231c10", textInk: "rgba(35,28,16,0.86)", rule: "rgba(35,28,16,0.38)", embolden: 0.04, emboss: null, ...look };
      const { x, y, w, h } = rect;
      let top = y + (h - block.height) / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      const lines = (part, spec, ink, embolden) => {
        const size = part.size;
        ctx.font = fontOf(spec, size);
        const spacing = (spec.tracking ?? 0) * size;
        if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
        part.lines.forEach((line, i) => {
          const cy = top + (i + 0.5) * size * part.lineHeight + size * 0.04;
          const cx = x + w / 2 + (spacing ? spacing / 2 : 0);             // the tracking after the last letter is not part of what is seen
          if (L.emboss) { ctx.fillStyle = L.emboss; ctx.fillText(line.text, cx, cy + Math.max(1, size * 0.035)); }
          ctx.fillStyle = ink;
          if (embolden > 0) { ctx.strokeStyle = ink; ctx.lineWidth = size * embolden; ctx.strokeText(line.text, cx, cy); }
          ctx.fillText(line.text, cx, cy);
        });
        top += part.height;
      };
      lines(block.name, block.style.name, L.ink, L.embolden);
      if (block.text) {
        if (L.rule) {
          ctx.fillStyle = L.rule;
          const rw = Math.min(w * 0.32, 150);
          ctx.fillRect(x + (w - rw) / 2, top + block.gap / 2 - 1, rw, 2);
        }
        top += block.gap;
        lines(block.text, block.style.text, L.textInk, 0);
      }
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      ctx.restore();
    }
  };
}
