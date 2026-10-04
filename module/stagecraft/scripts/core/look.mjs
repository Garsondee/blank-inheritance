/**
 * Where this screen looks at the stage, and how close. Ingram, 2026-10-04: the camera had been pinned ("we currently
 * lock the camera position and zoom during scenes but that's a bad idea. Let's free the user to pan and zoom in and out
 * again"), and, with the GM's own interface over one side of the window, the stage should "zoom out and reposition so
 * that it fits as best as possible in the width remaining".
 *
 * A look is `{ s, cx, cy }`: the scale (a reference-page pixel to a window pixel) and the point of the reference page
 * (rigspace.mjs `REF`) that sits at the middle of the window. It belongs to one screen: it is never sent and never saved
 * in the scene. `viewOf` turns it into the `view` both backends draw through (the shape of rigspace.mjs `viewFor`).
 *
 * The home look is where a screen starts and where it goes back to. With nothing over the window it covers it, as the
 * stage always has (`viewFor`). With margins (what the host's own interface covers along each edge, in window pixels)
 * the whole width of the page is fitted into the band that is left and centred there: nothing of the stage is lost
 * behind the interface, at the price of a little floor or sky above and below.
 */

import { REF } from "./rigspace.mjs";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** How far out and in a screen may go: out to half the size that shows the whole page, in to four times the cover. */
export const ZOOM_OUT = 0.5;
export const ZOOM_IN = 4;
/** How much of the window the page must still cover when panned away from it (a share of the smaller of the two). */
export const KEEP = 0.2;

/** Margins as numbers, each kept between nothing and most of the window. */
export function cleanMargins(m, vw, vh) {
  const n = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
  const left = Math.min(n(m?.left), vw * 0.9);
  const right = Math.min(n(m?.right), vw * 0.9 - left);
  const top = Math.min(n(m?.top), vh * 0.9);
  const bottom = Math.min(n(m?.bottom), vh * 0.9 - top);
  return { left, right, top, bottom };
}

/** The look a screen starts at and goes home to, for a window `vw` x `vh` with `margins` covered. */
export function homeLook(vw, vh, margins = null, ref = REF) {
  const m = cleanMargins(margins, vw, vh);
  const bw = vw - m.left - m.right;
  const bh = vh - m.top - m.bottom;
  const covered = m.left + m.right + m.top + m.bottom > 0;
  const s = covered ? bw / ref.W : Math.max(vw / ref.W, vh / ref.H);
  // the page's middle goes to the band's middle; the look names the page point at the window's middle
  const bx = m.left + bw / 2;
  const by = m.top + bh / 2;
  return { s, cx: ref.W / 2 + (vw / 2 - bx) / s, cy: ref.H / 2 + (vh / 2 - by) / s };
}

/** The view a backend draws through: `s`, the page point at the top left (`ox`, `oy`) and how much of the page shows. */
export function viewOf(vw, vh, look, ref = REF) {
  const l = look ?? homeLook(vw, vh, null, ref);
  const visW = vw / l.s;
  const visH = vh / l.s;
  return { vw, vh, s: l.s, ox: l.cx - visW / 2, oy: l.cy - visH / 2, visW, visH };
}

/** The nearest and farthest a screen may go. The home look is always allowed, however much the margins take. */
export function zoomLimits(vw, vh, margins = null, ref = REF) {
  const contain = Math.min(vw / ref.W, vh / ref.H);
  const cover = Math.max(vw / ref.W, vh / ref.H);
  const home = homeLook(vw, vh, margins, ref).s;
  return { min: Math.min(contain * ZOOM_OUT, home), max: Math.max(cover * ZOOM_IN, home) };
}

/** A look kept within the zoom limits and close enough to the page that some of it is always on the screen. */
export function clampLook(look, vw, vh, margins = null, ref = REF) {
  const { min, max } = zoomLimits(vw, vh, margins, ref);
  const s = clamp(look.s, min, max);
  const visW = vw / s;
  const visH = vh / s;
  const kx = KEEP * Math.min(visW, ref.W);
  const ky = KEEP * Math.min(visH, ref.H);
  return {
    s,
    cx: clamp(look.cx, kx - visW / 2, ref.W - kx + visW / 2),
    cy: clamp(look.cy, ky - visH / 2, ref.H - ky + visH / 2)
  };
}

/** Zoom by `factor` about the window point (x, y): the point of the stage under it stays under it. */
export function zoomAt(look, vw, vh, x, y, factor, margins = null, ref = REF) {
  const { min, max } = zoomLimits(vw, vh, margins, ref);
  const s = clamp(look.s * factor, min, max);
  // the page point under (x, y), before and after, is the same point
  const px = look.cx + (x - vw / 2) / look.s;
  const py = look.cy + (y - vh / 2) / look.s;
  return clampLook({ s, cx: px - (x - vw / 2) / s, cy: py - (y - vh / 2) / s }, vw, vh, margins, ref);
}

/** The look moved by a drag of (dx, dy) window pixels: the stage follows the hand. */
export function panBy(look, dx, dy, vw, vh, margins = null, ref = REF) {
  return clampLook({ s: look.s, cx: look.cx - dx / look.s, cy: look.cy - dy / look.s }, vw, vh, margins, ref);
}

/** How far a wheel event zooms: a notch of a mouse wheel is about 12%, a trackpad's small steps are smooth. */
export function wheelFactor(deltaY, deltaMode = 0) {
  const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  return Math.exp(-clamp(px, -300, 300) * 0.0012);
}

/**
 * Part way from one look to another, `u` from 0 to 1, eased at both ends. The scale goes by ratio, not by difference, so
 * a long zoom does not rush its first half; the middle of the window travels in a straight line.
 */
export function tweenLook(from, to, u) {
  const t = clamp(u, 0, 1);
  const e = t * t * (3 - 2 * t);
  return {
    s: from.s * Math.pow(to.s / from.s, e),
    cx: from.cx + (to.cx - from.cx) * e,
    cy: from.cy + (to.cy - from.cy) * e
  };
}

/** Are two looks the same to the eye (within a hundredth of a pixel of the page and a ten-thousandth of the scale)? */
export function sameLook(a, b) {
  if (!a || !b) return a === b;
  return Math.abs(a.s - b.s) < 1e-4 * Math.max(a.s, b.s) && Math.abs(a.cx - b.cx) < 0.01 && Math.abs(a.cy - b.cy) < 0.01;
}
