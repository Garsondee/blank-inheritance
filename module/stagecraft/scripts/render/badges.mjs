/**
 * A card's face, with its badges. Every skin draws a face from the person's words and portrait; the badges (core/badges.mjs)
 * are laid over whatever it drew, down the top-left corner, so a skin need know nothing about them and both pictures (the
 * 3D one and the plain one) show the same thing. Canvas only: no Foundry.
 */

import { cleanBadges } from "../core/badges.mjs";

const REF_WIDTH = 360;        // a skin's face is drawn at twice the card's size; the pills are sized against the width

/** Lay the person's badges on a face canvas, in place. Returns the canvas. */
export function paintBadges(canvas, person) {
  const badges = cleanBadges(person?.badges);
  if (!badges.length || !canvas?.getContext) return canvas;
  const ctx = canvas.getContext("2d");
  const k = canvas.width / REF_WIDTH;
  const size = 21 * k;
  const pad = 9 * k;
  const gap = 6 * k;
  const edge = 14 * k;
  ctx.save();
  ctx.font = `700 ${size}px sans-serif`;
  ctx.textBaseline = "middle";
  let y = edge;
  for (const label of badges) {
    const w = Math.min(canvas.width * 0.6, ctx.measureText(label).width + pad * 2);
    const h = size + pad;
    ctx.fillStyle = "rgba(24,16,8,0.88)";
    roundRect(ctx, edge, y, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,226,160,0.85)";
    ctx.lineWidth = Math.max(1, 1.5 * k);
    ctx.stroke();
    ctx.fillStyle = "#fff4d6";
    ctx.fillText(label, edge + pad, y + h / 2 + k, w - pad * 2);
    y += h + gap;
  }
  ctx.restore();
  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A skin's face for a person, with their badges on it. */
export async function faceOf(skin, person, helpers) {
  return paintBadges(await skin.face(person, helpers), person);
}
