/**
 * Pictures drawn on a plain 2D canvas, shared by both backends so that a zone outline, a mark or a bang looks the same
 * whichever one is drawing: three.js lays these canvases on the painting as textures, the flat backend lays them on the
 * page directly. Nothing here knows about three.js, Foundry or the stage: it is given a context and numbers. (Chalk is
 * painted in pixels of its own, render/paint/wall.mjs, since 2026-10-03.)
 */

import { outlineStrength } from "../core/zones.mjs";

/* ------------------------------------------------------------------ zones */

/**
 * What the zone outlines look like right now, as a short string: the outlines are only redrawn when it changes (a state,
 * the player's setting, or, while a card is over one, the marching dashes).
 */
export function zoneKey(zones, states, setting, t, board = null) {
  const parts = [];
  let marching = false;
  for (const z of zones) {
    const st = states[z.id] ?? "rest";
    if (st === "target") marching = true;
    parts.push(`${z.id}:${st}:${outlineStrength(z, st, setting).toFixed(2)}`);
  }
  if (board) parts.push(`B${Object.entries(board.counts ?? {}).map(([id, n]) => `${id}=${n}/${board.downs?.[id] ?? 0}`).join(",")}`);
  return parts.join("|") + (marching ? `|t${Math.floor(t * 20)}` : "");
}

/** The washes of the fight board's positions, in order, when a zone does not choose its own. */
export const BOARD_COLOURS = Object.freeze([[240, 186, 92], [112, 196, 222], [226, 118, 104], [146, 208, 126], [196, 150, 232], [242, 150, 72], [230, 220, 140]]);

/** The places on the board a zone's label goes: the middle of its floor, near the top. */
function labelPoint(pts) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const top = Math.min(...pts.map((p) => p[1]));
  const bottom = Math.max(...pts.map((p) => p[1]));
  return [cx, top + (bottom - top) * 0.32];
}

/** Where on a zone its board label stands, in fractions of the painting: the middle of its floor, near the top. */
export function boardLabelPoint(zone) {
  return labelPoint(zone.floor ?? zone.shape);
}

/**
 * The fight board (stage.md §8.6): every position (a zone of kind `area`) washed in its own colour with a plain outline,
 * its name, its rules as tags ("cover", "difficult terrain") and how many stand in it; and a dashed line between each
 * pair of positions that are near each other (one Stride; the board's key says so). Drawn under the outlines of the other
 * zones. A backend that can stand the labels up in front of the cards (three.js) passes `labels: false` and draws them
 * itself (`boardLabelCanvas`); the flat one draws them here.
 */
export function drawBoard(ctx, cw, ch, zones, board, states, t, { labels = true } = {}) {
  const areas = zones.filter((z) => z.kind === "area");
  const centre = new Map();
  areas.forEach((z, i) => {
    const pts = (z.floor ?? z.shape).map(([x, y]) => [x * cw, y * ch]);
    const [r, g, b] = z.colour ?? BOARD_COLOURS[i % BOARD_COLOURS.length];
    const lit = states?.[z.id] === "target";
    const path = () => { ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    ctx.save();
    path(); ctx.fillStyle = `rgba(${r},${g},${b},${lit ? 0.3 : 0.17})`; ctx.fill();
    ctx.lineJoin = "round";
    ctx.setLineDash([18, 9]);
    ctx.lineDashOffset = lit ? -t * 60 : 0;
    path(); ctx.strokeStyle = "rgba(16,10,5,0.6)"; ctx.lineWidth = 7; ctx.stroke();
    path(); ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`; ctx.lineWidth = lit ? 4.5 : 3.2; ctx.stroke();
    ctx.restore();
    centre.set(z.id, labelPoint(pts));
  });
  // the range bands first, so the labels sit on top of them
  ctx.save();
  ctx.setLineDash([10, 10]);
  ctx.lineCap = "round";
  for (const { a, b } of board.bands ?? []) {
    const p = centre.get(a);
    const q = centre.get(b);
    if (!p || !q) continue;
    ctx.beginPath(); ctx.moveTo(p[0], p[1] + 30); ctx.lineTo(q[0], q[1] + 30);
    ctx.strokeStyle = "rgba(16,10,5,0.45)"; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = "rgba(255,236,200,0.7)"; ctx.lineWidth = 2.6; ctx.stroke();
  }
  ctx.restore();
  if (!labels) return;
  areas.forEach((z) => {
    const [cx, cy] = centre.get(z.id);
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = '600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif';
    ctx.lineWidth = 7; ctx.strokeStyle = "rgba(16,10,5,0.78)"; ctx.strokeText(z.name || z.id, cx, cy);
    ctx.fillStyle = "rgba(255,240,212,1)"; ctx.fillText(z.name || z.id, cx, cy);
    const n = board.counts?.[z.id] ?? 0;
    const fallen = board.downs?.[z.id] ?? 0;
    const chips = [...(z.tags ?? []).map((tag) => tag.toUpperCase()), n ? `${n} HERE` : null, fallen ? `${fallen} DOWN` : null].filter(Boolean);
    if (chips.length) {
      ctx.font = "700 15px system-ui, sans-serif";
      const widths = chips.map((c) => ctx.measureText(c).width + 18);
      let x = cx - (widths.reduce((s, w) => s + w, 0) + 6 * (chips.length - 1)) / 2;
      chips.forEach((c, i) => {
        const here = c.endsWith(" HERE");
        pill(ctx, x + widths[i] / 2, cy + 24, c, 15, here ? "rgba(20,12,6,0.95)" : "rgba(255,236,200,0.95)", here ? "rgba(255,190,110,0.95)" : "rgba(16,10,5,0.72)");
        x += widths[i] + 6;
      });
    }
    ctx.restore();
  });
}

/**
 * A fight-board label on a canvas of its own, to stand up in front of the cards: the position's name, its tags, and how
 * many are in it. Returns { canvas, w, h }: the canvas is 2 x the size it is meant to be drawn at, for sharpness.
 */
export function boardLabelCanvas(zone, count = 0, fallen = 0) {
  const name = zone.name || zone.id;
  const chips = [...(zone.tags ?? []).map((tag) => tag.toUpperCase()), count ? `${count} HERE` : null, fallen ? `${fallen} DOWN` : null].filter(Boolean);
  const measure = makeCanvas(8, 8).getContext("2d");
  measure.font = '600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif';
  const nameW = measure.measureText(name).width;
  measure.font = "700 17px system-ui, sans-serif";
  const widths = chips.map((c) => measure.measureText(c).width + 20);
  const chipsW = widths.reduce((s, w) => s + w, 0) + 7 * Math.max(0, chips.length - 1);
  const w = Math.ceil(Math.max(nameW + 24, chipsW + 12));
  const h = chips.length ? 84 : 50;
  const c = makeCanvas(w * 2, h * 2);
  const ctx = c.getContext("2d");
  ctx.scale(2, 2);
  ctx.textAlign = "center";
  ctx.font = '600 34px "Shippori Mincho", "Hiragino Mincho ProN", serif';
  ctx.lineJoin = "round";
  ctx.lineWidth = 7; ctx.strokeStyle = "rgba(16,10,5,0.82)"; ctx.strokeText(name, w / 2, 36);
  ctx.fillStyle = "rgba(255,240,212,1)"; ctx.fillText(name, w / 2, 36);
  let x = w / 2 - chipsW / 2;
  chips.forEach((chip, i) => {
    const here = chip.endsWith(" HERE");
    const down = chip.endsWith(" DOWN");
    pill(ctx, x + widths[i] / 2, 64, chip, 17, here || down ? "rgba(20,12,6,0.95)" : "rgba(255,236,200,0.95)", here ? "rgba(255,190,110,0.95)" : down ? "rgba(170,160,150,0.9)" : "rgba(16,10,5,0.75)");
    x += widths[i] + 7;
  });
  return { canvas: c, w, h };
}

/** A rounded label: text on a filled pill, centred at (x, y). */
function pill(ctx, x, y, text, size, ink, fill) {
  ctx.save();
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 16;
  const h = size + 10;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.fillStyle = ink; ctx.fillText(text, x, y + 1);
  ctx.restore();
}

/** Dashed outlines of every zone on a canvas `cw` x `ch` (cleared first): hairlines at rest, brighter near a held card. */
export function drawZoneOutlines(ctx, cw, ch, zones, states, setting, t, board = null, { boardLabels = true } = {}) {
  ctx.clearRect(0, 0, cw, ch);
  if (board) drawBoard(ctx, cw, ch, zones, board, states, t, { labels: boardLabels });
  for (const z of zones) {
    if (board && z.kind === "area") continue;   // the board has drawn the positions already
    const st = states[z.id] ?? "rest";
    const a = outlineStrength(z, st, setting);
    if (a <= 0.01) continue;
    const pts = z.shape.map(([x, y]) => [x * cw, y * ch]);
    const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    const lit = st === "target";
    ctx.lineJoin = "round";
    ctx.setLineDash([14, 11]);
    ctx.lineDashOffset = lit ? -t * 60 : 0;
    path(); ctx.strokeStyle = `rgba(20,12,6,${0.55 * a})`; ctx.lineWidth = 6; ctx.stroke();
    path(); ctx.strokeStyle = lit ? `rgba(255,150,70,${a})` : `rgba(255,222,170,${0.9 * a})`; ctx.lineWidth = lit ? 4 : 2.4; ctx.stroke();
    ctx.setLineDash([]);
    if (a >= 0.8 && z.name) {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const top = Math.min(...pts.map((p) => p[1])) - 10;
      ctx.font = '600 30px "Shippori Mincho", "Hiragino Mincho ProN", serif';
      ctx.textAlign = "center";
      ctx.lineWidth = 7; ctx.strokeStyle = `rgba(20,12,6,${0.7 * a})`; ctx.strokeText(z.name, cx, top);
      ctx.fillStyle = `rgba(255,236,200,${a})`; ctx.fillText(z.name, cx, top);
      if (z.hint) {
        ctx.font = '600 20px sans-serif';
        ctx.lineWidth = 5; ctx.strokeStyle = `rgba(20,12,6,${0.7 * a})`; ctx.strokeText(z.hint.toUpperCase(), cx, top + 26);
        ctx.fillStyle = `rgba(255,222,170,${0.85 * a})`; ctx.fillText(z.hint.toUpperCase(), cx, top + 26);
      }
    }
  }
}

/* ------------------------------------------------------------------ small pictures */

const makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
};

/** A soft white dot, for glows, dust and sparks. */
export function softDotCanvas() {
  const c = makeCanvas(64, 64);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return c;
}

/** The impact lines of a bang: cream rays with an ink edge and a burst in the middle. */
export function impactCanvas() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext("2d");
  ctx.translate(128, 128);
  ctx.lineCap = "round";
  const rays = 9;
  for (const [w, col] of [[20, "#1b140c"], [10, "#e6c98d"]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + 0.3;
      const len = 120 * (0.72 + 0.28 * (((i * 7) % 3) / 2));
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 46, Math.sin(a) * 46); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke();
    }
  }
  ctx.fillStyle = "#fff7d6"; ctx.strokeStyle = "#1b140c"; ctx.lineWidth = 6; ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 18 : 40; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  return c;
}

/** A stage manager's tape mark: four corner brackets round a faint dotted oval, in brass. */
export function markCanvas() {
  const c = makeCanvas(256, 160);
  const ctx = c.getContext("2d");
  ctx.lineCap = "round";
  const brackets = (w, col) => {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = 128 + sx * 100; const y = 80 + sy * 56;
      ctx.beginPath(); ctx.moveTo(x - sx * 34, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy * 30); ctx.stroke();
    }
  };
  brackets(13, "rgba(20,12,6,0.7)");
  brackets(7, "#e6c98d");
  ctx.setLineDash([2, 12]); ctx.strokeStyle = "rgba(255,226,170,0.75)"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(128, 80, 66, 36, 0, 0, Math.PI * 2); ctx.stroke();
  return c;
}

/** The ring a controlled card stands in: a soft white ellipse outline, tinted by whoever draws it. */
export function ringCanvas() {
  const c = makeCanvas(512, 256);
  const ctx = c.getContext("2d");
  ctx.strokeStyle = "#fff";
  ctx.shadowColor = "rgba(255,255,255,0.95)";
  ctx.shadowBlur = 22;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.ellipse(256, 128, 220, 90, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(256, 128, 220, 90, 0, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}

/**
 * What aiming at a card looks like, as Foundry's own targeting does: four small arrows pointing in at the middle of each side, in
 * the colour of whoever aims (the first colour; this user's own comes first), and a pip in each aiming user's colour along the
 * top right. Drawn at the proportions of the box it will be laid over (`aspect` is its height over its width), so the arrows are
 * the same size whatever the card's shape and are not stretched.
 */
export function reticleCanvas(colours = ["#e8493c"], aspect = 1) {
  const W = 256;
  const H = Math.max(64, Math.round(W * aspect));
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.lineJoin = "round";
  const arrow = (points) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.stroke();
    ctx.fillStyle = colours[0] ?? "#e8493c"; ctx.fill();
  };
  const half = 17;                  // half the base of an arrow
  const len = 24;                   // from base to point
  const gap = 4;                    // in from the edge
  arrow([[W / 2 - half, gap], [W / 2 + half, gap], [W / 2, gap + len]]);
  arrow([[W / 2 - half, H - gap], [W / 2 + half, H - gap], [W / 2, H - gap - len]]);
  arrow([[gap, H / 2 - half], [gap, H / 2 + half], [gap + len, H / 2]]);
  arrow([[W - gap, H / 2 - half], [W - gap, H / 2 + half], [W - gap - len, H / 2]]);
  colours.slice(0, 6).forEach((colour, i) => {
    ctx.beginPath();
    ctx.arc(W - 14 - i * 22, 16, 8, 0, Math.PI * 2);
    ctx.fillStyle = colour; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.stroke();
  });
  return c;
}

/**
 * The outline of a chosen card: a soft gold border round a rounded rectangle, the size of the card plus `pad` on every side, as
 * Foundry draws round a controlled token. Laid behind the card, so only the margin shows.
 */
export function haloCanvas(w, h, pad = 12) {
  const c = makeCanvas(Math.round(w + pad * 2), Math.round(h + pad * 2));
  const ctx = c.getContext("2d");
  const r = 10;
  const x = pad - 3;
  const y = pad - 3;
  const ww = w + 6;
  const hh = h + 6;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, r);
    ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.closePath();
  };
  ctx.shadowColor = "rgba(255,255,255,0.95)";
  ctx.shadowBlur = pad * 0.9;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  path();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  path();
  ctx.stroke();
  return c;
}

/** The small caption shown beside a mark that is the one a card would take. */
export function labelCanvas(text) {
  const c = makeCanvas(512, 96);
  const ctx = c.getContext("2d");
  ctx.font = '700 40px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 9; ctx.strokeStyle = "rgba(20,12,6,0.8)"; ctx.strokeText(text.toUpperCase(), 256, 48);
  ctx.fillStyle = "#ffe9c4"; ctx.fillText(text.toUpperCase(), 256, 48);
  return c;
}
