/**
 * The adventure's skin for Stagecraft: brass, enamel and a typed label. This is the campaign's own look, so it lives
 * with the campaign (here, in the sketchbook, until the adventure's bridge file takes it over) and is handed to the
 * module through the public api, never built into the module (module.md §7).
 *
 *   game.modules.get("stagecraft").api.skins.register(brass)
 *
 * The nameplate under the portrait is the card's TITLE BLOCK (Ingram, 2026-10-04: it had to take a lot of text and line
 * breaks, in a bolder face, with the name and a line of text under it): the name in a heavy condensed face, a hairline,
 * and the text under it, laid out by Stagecraft's `helpers.titleBlock` so it fits whatever it is given (a long name is made
 * smaller, a long line of text shorter, Japanese is broken between characters). The plate is as tall as the words need and
 * the portrait is given what is left. A Stagecraft too old to offer `helpers.titleBlock` gets the plain single line.
 */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** The faces the plate is set in: all bundled with this module (styles/bi-fonts.css), each with the Japanese ones to fall back on. */
const JP = '"Noto Sans JP", "Zen Kaku Gothic New", "Yu Gothic UI", Meiryo, sans-serif';
const NAME = { family: `Antonio, ${JP}`, weight: 700, max: 70, min: 36, maxLines: 3, lineHeight: 1.02, tracking: 0.05, upper: true };
const TEXT = { family: `Rajdhani, ${JP}`, weight: 700, max: 36, min: 30, maxLines: 3, lineHeight: 1.12, tracking: 0.02, upper: false };
const TYPED = { family: `"Special Elite", "Courier Prime", ${JP}`, weight: 400, tracking: 0.01, lineHeight: 1.12, upper: false };
const BACK_NAME = { ...TYPED, max: 44, min: 24, maxLines: 3 };
const BACK_TEXT = { ...TYPED, max: 26, min: 20, maxLines: 2 };

export const brass = {
  id: "brass",
  name: "Brass and enamel",
  size: { w: 280, h: 468 },
  thickness: 12,
  fonts: ["700 40px Antonio", "700 30px Rajdhani", "700 30px 'Noto Sans JP'", "30px 'Special Elite'"],
  stick: { length: 134, collar: 0xb8924f, wood: 0x80512d },
  materials: {
    body: { color: 0xb8924f, metalness: 1, roughness: 0.34 },
    face: { metalness: 0.1, roughness: 0.5, clearcoat: 0.6 },
    back: { metalness: 0.35, roughness: 0.62 }
  },

  async face(person, { loadImage, titleBlock } = {}) {
    const w = 560;
    const h = 936;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ecd29a"); g.addColorStop(0.45, "#a98440"); g.addColorStop(1, "#4a3818");
    roundRect(ctx, 0, 0, w, h, 26);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,246,214,0.55)"; roundRect(ctx, 6, 6, w - 12, h - 12, 22); ctx.stroke();
    ctx.strokeStyle = "rgba(40,28,10,0.7)"; roundRect(ctx, 16, 16, w - 32, h - 32, 16); ctx.stroke();
    const px = 24; const py = 24; const pw = w - 48;
    // the words first: how tall the plate must be decides how much of the card the portrait gets
    const block = titleBlock?.fit(person, { width: pw - 52, maxHeight: 236, gap: 14, name: NAME, text: TEXT }) ?? null;
    const nh = block ? Math.min(300, Math.max(108, Math.ceil(block.height) + 46)) : 108;
    const ph = h - py - 12 - nh - 24;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 10); ctx.clip();
    ctx.fillStyle = "#17201f"; ctx.fillRect(px, py, pw, ph);
    const img = person.portrait && loadImage ? await loadImage(person.portrait) : null;
    if (img) {
      const s = Math.max(pw / img.width, ph / img.height);
      const dw = img.width * s; const dh = img.height * s;
      ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) * 0.15, dw, dh);
    }
    const v = ctx.createRadialGradient(px + pw / 2, py + ph * 0.45, ph * 0.3, px + pw / 2, py + ph * 0.45, ph * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = v; ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    if (person.colour) { ctx.fillStyle = person.colour; ctx.shadowColor = person.colour; ctx.shadowBlur = 16; ctx.fillRect(px, py + 18, 9, ph - 36); ctx.shadowBlur = 0; }
    ctx.fillStyle = "#4fc8d8"; ctx.shadowColor = "#4fc8d8"; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(w - 52, 52, 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    const ny = py + ph + 12;
    const n = ctx.createLinearGradient(0, ny, 0, ny + nh);
    n.addColorStop(0, "#f3ecd6"); n.addColorStop(1, "#cbbf9f");
    roundRect(ctx, px, ny, pw, nh, 8); ctx.fillStyle = n; ctx.fill();
    if (block) {
      titleBlock.draw(ctx, block, { x: px, y: ny, w: pw, h: nh }, { ink: "#1f180c", textInk: "#3b2f19", rule: "rgba(120,86,28,0.6)", embolden: 0.035, emboss: "rgba(255,250,232,0.6)" });
    } else {
      ctx.fillStyle = "#231c10"; ctx.font = '700 36px "Chakra Petch", sans-serif';
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.letterSpacing = "6px";
      ctx.fillText((person.name ?? person.id).toUpperCase(), w / 2, ny + nh / 2 + 2);
    }
    return c;
  },

  async back(person, { titleBlock } = {}) {
    const w = 560;
    const h = 936;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#9a7c43"); g.addColorStop(0.6, "#5f4a22"); g.addColorStop(1, "#3e2f14");
    roundRect(ctx, 0, 0, w, h, 26); ctx.fillStyle = g; ctx.fill();
    for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) {
      const r = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 13);
      r.addColorStop(0, "#f1d9a2"); r.addColorStop(1, "#5f4a22");
      ctx.fillStyle = r; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
    }
    // the typed label on the back is as tall as its words need
    const block = titleBlock?.fit(person, { width: 340, maxHeight: 200, gap: 12, name: BACK_NAME, text: BACK_TEXT }) ?? null;
    const lh = block ? Math.min(250, Math.max(68, Math.ceil(block.height) + 36)) : 68;
    const lw = block ? 396 : 260;
    ctx.fillStyle = "#efe6cf"; roundRect(ctx, w / 2 - lw / 2, h / 2 - lh / 2, lw, lh, 4); ctx.fill();
    if (block) {
      titleBlock.draw(ctx, block, { x: w / 2 - lw / 2, y: h / 2 - lh / 2, w: lw, h: lh }, { ink: "#2a2316", textInk: "#4a3d22", rule: "rgba(90,70,30,0.5)", embolden: 0.01 });
    } else {
      ctx.fillStyle = "#2a2316"; ctx.font = '36px "Special Elite", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(person.name ?? person.id, w / 2, h / 2 + 2);
    }
    return c;
  }
};
