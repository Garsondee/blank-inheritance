/**
 * The space a stage lives in. Pure.
 *
 * A stage is authored on a reference page of 2560 x 1440 CSS pixels: every length (a card is 280 wide, a stick 134
 * long) is a pixel of that page, and the painting covers it. A world unit is one such pixel on the z = 0 plane.
 * X runs right from the painting's vanishing point, Y up from the floor, Z towards the viewer.
 *
 * `makeRig` turns a painting and its rig (horizon, floor, depth) into the camera of diorama.mjs and the conversions
 * everything else needs: a point marked on the painting to a place on the floor, a place on the floor back to a
 * point on the painting (to ask which zone a card is in), and a place anywhere to the reference page (to put words
 * beside it).
 */

import { coverMap, makeCamera, floorPoint, project } from "./diorama.mjs";

export const REF = Object.freeze({ W: 2560, H: 1440 });

/**
 * How far behind the front of the floor the painting hangs. The three.js stage draws the painting as a backdrop this far
 * back, and nothing standing deeper could be seen (found 2026-10-03: people put at the back of a long room vanished
 * behind it, when it hung 4000 back). At 12000 a card is drawn at a little under half its size at the front, about as
 * small as a face can be and still be read; the floor runs on to the horizon, but nobody is put that far away.
 */
export const BACKDROP_DEPTH = 12000;

/** The deepest a card is ever put: in front of the backdrop, with room to lean. */
export const DEEPEST = -(BACKDROP_DEPTH - 1500);

export function makeRig(painting, rig, ref = REF) {
  const [iw, ih] = painting.size;
  const map = coverMap(iw, ih, ref.W, ref.H, 0.5, rig.lift ?? 0, 0.5);
  const cam = makeCamera(rig, map, ref.W);
  const toFraction = (sx, sy) => [(sx - map.ox) / (iw * map.s), (sy - map.oy) / (ih * map.s)];
  const standing = (at) => {
    const p = floorPoint(cam, at[0], at[1]);
    return p ? { X: p.x - cam.cx, Z: p.z } : null;
  };
  return {
    ref, map, cam, size: [iw, ih],

    /** A point marked on the painting (fractions) to a place on the floor, or null above the horizon. */
    standing,

    /**
     * A point of the painting as a place for a card: the floor there, but never behind the painting's backdrop. A point
     * so near the horizon that it would be is brought forward along the line of sight, so it keeps its place across the
     * page and only stands nearer.
     */
    place(at) {
      const p = standing(at);
      if (!p || p.Z >= DEEPEST) return p;
      return { X: (p.X * (cam.f - DEEPEST)) / (cam.f - p.Z), Z: DEEPEST };
    },

    /** A place on the floor back to the point of the painting it appears at (fractions). */
    fractionOf(X, Z) {
      const s = project(cam, X + cam.cx, cam.floorY, Z);
      return toFraction(s.sx, s.sy);
    },

    /** Anywhere in the world (Y up from the floor) to the reference page, in pixels. */
    screenOf(X, Y, Z) {
      const s = project(cam, X + cam.cx, cam.floorY - Y, Z);
      return { x: s.sx, y: s.sy, k: s.k };
    },

    /** The reference page's pixel back to a fraction of the painting. */
    fractionOfScreen: toFraction
  };
}

/**
 * How much bigger a card is drawn at depth Z than the camera alone would draw it (Ingram, 2026-10-03: "cards which move
 * towards the back shouldn't get small as quickly"). The camera makes a card at depth Z appear `k = f / (f - Z)` as big as
 * at the front; this gives back part of what it takes, `k ^ -DEPTH_EASE`, so a card twice as far away looks about 0.7 of
 * its size rather than half. Never less than 1 (nothing in front is shrunk) and never more than `most`.
 */
export const DEPTH_EASE = 0.5;
export function depthGrow(cam, Z, { ease = DEPTH_EASE, most = 2.2 } = {}) {
  if (!(Z < 0)) return 1;
  const k = cam.f / (cam.f - Z);
  return Math.min(most, Math.max(1, k ** -ease));
}

/**
 * How the reference page (2560 x 1440) sits in a viewport: it is covered, as a painting is, so the viewport sees a
 * centred part of it. `s` converts a reference pixel to a viewport pixel; `ox`, `oy` is the reference point at the
 * viewport's top left. Both backends use it.
 */
export function viewFor(vw, vh, ref = REF) {
  const s = Math.max(vw / ref.W, vh / ref.H);
  const visW = vw / s;
  const visH = vh / s;
  return { vw, vh, s, ox: (ref.W - visW) / 2, oy: (ref.H - visH) / 2, visW, visH };
}
