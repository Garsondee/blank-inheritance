/**
 * Wet ink (chalk.md §11.4): the stroke being painted, shown on plain 2D canvases laid over the stage.
 *
 * The stage is a lit 3D picture with post-processing, drawn at most 60 times a second and taking 7 to 10 ms of the graphics
 * card each time (measured 2026-10-04 in the real Foundry). Paint that waited for that frame trailed the ring round the
 * pointer by several frames, a hand's width at a fast stroke. So while a stroke is being painted it is drawn here instead,
 * at the moment the pointer moves, the way a painting program shows its wet layer; the browser puts a 2D canvas on the screen
 * in the next frame whatever the 3D picture is doing. When the stroke ends it becomes paint on the wall, and the wet ink is
 * cleared in the frame that first draws that paint (`release`).
 *
 * Three canvases: `raw` (not in the page) takes the dabs as they are put down and so does not darken where a stroke crosses
 * itself; `show` is what raw looks like once the wall's grain and the chalk zones have been laid over it, redone only where
 * the newest dabs fell; `tail` is the short stretch between the last dab and the pointer (the curve runs a segment behind the
 * hand), thrown away at every sample.
 *
 * It is the same paint as the wall's (stamp.mjs), a little under full white as the 3D picture shows it, but it lies over the
 * cards while it is wet, has none of the picture's bloom, and magic chalk's glow and sparkle appear when the pointer comes up.
 */

import { toCanvas, tailDabs, dabArea, joinAreas } from "../../core/wet.mjs";
import { TOOLS } from "../../core/brush.mjs";
import { stampDab } from "./stamp.mjs";

const SHOWN = 0xee / 255;          // the 3D picture shows paint a little under full white (render/three/chalk.mjs)
const RATIO_CAP = 1.5;             // a denser canvas costs memory and fill for no difference anyone can see

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class WetInk {
  /**
   * `root` is the stage's element, `wall` the RasterWall (its tips and grain are shared), `mapOf()` the map from wall pixels
   * to window pixels now ({ k, bx, by }, core/wet.mjs `wallToWindow`) or null if there is none.
   */
  constructor({ root, wall, mapOf }) {
    this.root = root;
    this.wall = wall;
    this.mapOf = mapOf;
    this.raw = document.createElement("canvas");
    this.show = this.#element("stagecraft-wet");
    this.tailEl = this.#element("stagecraft-wet stagecraft-wet-tail");
    this.rawX = this.raw.getContext("2d");
    this.showX = this.show.getContext("2d");
    this.tailX = this.tailEl.getContext("2d");
    this.w = 0;
    this.h = 0;
    this.ratio = 1;
    this.stroke = null;
    this.area = null;                // what the stroke has covered, canvas pixels
    this.tailArea = null;
    this.last = null;                // the last dab laid
    this.on = false;
    this.fit();
  }

  #element(className) {
    const c = document.createElement("canvas");
    c.className = className;
    c.setAttribute("aria-hidden", "true");
    this.root.append(c);
    return c;
  }

  /** Size the canvases to the stage (and its pixel density, capped). Returns true if they changed. */
  fit() {
    const ratio = clamp(globalThis.devicePixelRatio || 1, 1, RATIO_CAP);
    const w = Math.max(1, Math.round((this.root.clientWidth || 1) * ratio));
    const h = Math.max(1, Math.round((this.root.clientHeight || 1) * ratio));
    if (w === this.w && h === this.h && ratio === this.ratio) return false;
    this.w = w; this.h = h; this.ratio = ratio;
    for (const c of [this.raw, this.show, this.tailEl]) { c.width = w; c.height = h; }
    return true;
  }

  /**
   * Draw a throw-away dab through every path a stroke takes (a tip at an angle, grain, a zone's mask, the tail), then clear it,
   * so the graphics card has met each before the first real stroke (a first stroke was a stall of a hundred milliseconds).
   */
  warm() {
    const stroke = { def: TOOLS.chalk, colour: "#ffffff", magic: null, opacity: 1 };
    const box = { x: 40, y: 40 };
    if (!this.begin(stroke, [[[box.x - 30, box.y - 30], [box.x + 120, box.y - 30], [box.x + 120, box.y + 80], [box.x - 30, box.y + 80]]])) return;
    this.add([{ x: box.x, y: box.y, size: 12, flow: 0.8, angle: 0.4, seed: 1, dist: 0 }, { x: box.x + 5, y: box.y + 3, size: 12, flow: 0.8, angle: 0.4, seed: 2, dist: 5 }]);
    this.tail({ x: box.x + 30, y: box.y + 8 });
    this.release();
  }

  /** Begin showing a stroke (the wall's stroke: `def`, `colour`, `magic`, `opacity`). Returns false if there is nowhere to show it. */
  begin(stroke, polys = this.wall.mask) {
    this.release();
    this.fit();
    const m = this.mapOf();
    if (!m || !(m.k > 0)) { this.on = false; return false; }
    this.m = toCanvas(m, this.ratio);
    this.stroke = stroke;
    this.last = null;
    this.area = null;
    this.polys = polys?.length ? polys.map((poly) => poly.map(([x, y]) => [x * this.m.k + this.m.bx, y * this.m.k + this.m.by])) : null;
    this.pattern = null;
    const grain = stroke.def.grain;
    if (grain > 0 && typeof DOMMatrix !== "undefined") {
      const p = this.showX.createPattern(this.wall.grain.canvas(Math.round(clamp(grain, 0, 1) * 20) / 20), "repeat");
      // the grain sits still on the wall: wall pixel (0, 0) is at (bx, by), and a wall pixel is k canvas pixels
      p?.setTransform(new DOMMatrix([this.m.k, 0, 0, this.m.k, this.m.bx, this.m.by]));
      this.pattern = p;
    }
    this.on = true;
    return true;
  }

  /** Lay dabs (core/brush.mjs, wall pixels) down. They are on the screen in the next frame the browser makes. */
  add(dabs) {
    if (!this.on || !dabs.length) return;
    const m = this.m;
    const map = { k: m.k, ox: m.bx, oy: m.by };
    for (const dab of dabs) stampDab(this.rawX, this.wall.tips, this.stroke, dab, map, { dim: SHOWN, clip: { w: this.w, h: this.h } });
    this.last = dabs[dabs.length - 1];
    const rect = dabArea(dabs, m, this.w, this.h);
    if (!rect) return;
    this.area = joinAreas(this.area, rect);
    this.#lay(rect);
  }

  /** What `raw` looks like over `rect`, with the stroke's strength, the wall's grain and the chalk zones. */
  #lay(rect) {
    const x = this.showX;
    x.save();
    x.beginPath();
    x.rect(rect.x, rect.y, rect.w, rect.h);
    x.clip();
    x.clearRect(rect.x, rect.y, rect.w, rect.h);
    x.globalAlpha = this.stroke.opacity ?? 1;
    if (this.polys) {
      for (const poly of this.polys) {
        x.save();
        x.beginPath();
        poly.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
        x.closePath();
        x.clip();
        x.drawImage(this.raw, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
        x.restore();
      }
    } else {
      x.drawImage(this.raw, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
    }
    x.globalAlpha = 1;
    if (this.pattern) {
      x.globalCompositeOperation = "destination-in";
      x.fillStyle = this.pattern;
      x.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    x.restore();
  }

  /** The newest stretch, from the last dab to the pointer `to` (wall pixels): drawn now, gone at the next call. */
  tail(to) {
    if (!this.on) return;
    const x = this.tailX;
    if (this.tailArea) { x.clearRect(this.tailArea.x, this.tailArea.y, this.tailArea.w, this.tailArea.h); this.tailArea = null; }
    if (!this.last) return;
    const def = this.stroke.def;
    const dabs = tailDabs(this.last, to, Math.max(0.4, def.spacing * this.last.size));
    if (!dabs.length) return;
    const m = this.m;
    const rect = dabArea(dabs, m, this.w, this.h);
    if (!rect) return;
    x.save();
    x.beginPath();
    x.rect(rect.x, rect.y, rect.w, rect.h);
    x.clip();
    if (this.polys) {               // paint goes only where chalk may (a second clip: the two together)
      x.beginPath();
      for (const poly of this.polys) { poly.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); }
      x.clip();
    }
    const map = { k: m.k, ox: m.bx, oy: m.by };
    for (const dab of dabs) stampDab(x, this.wall.tips, this.stroke, dab, map, { dim: SHOWN, clip: { w: this.w, h: this.h } });
    if (this.pattern) {
      x.globalCompositeOperation = "destination-in";
      x.fillStyle = this.pattern;
      x.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    x.restore();
    this.tailArea = rect;
  }

  /** The stroke has ended: no more dabs. What is shown stays until `release`. */
  end() {
    if (this.tailArea) { this.tailX.clearRect(this.tailArea.x, this.tailArea.y, this.tailArea.w, this.tailArea.h); this.tailArea = null; }
    this.on = false;
  }

  /** Is there wet ink on the screen? */
  get wet() { return this.area !== null || this.tailArea !== null; }

  /** Clear everything shown (the 3D picture now shows the paint, or the stroke was thrown away). */
  release() {
    const a = joinAreas(this.area, this.tailArea);
    if (a) {
      for (const x of [this.rawX, this.showX, this.tailX]) x.clearRect(a.x, a.y, a.w, a.h);
    }
    this.area = null;
    this.tailArea = null;
    this.last = null;
    this.stroke = null;
    this.on = false;
  }

  dispose() {
    this.release();
    this.show.remove();
    this.tailEl.remove();
    this.raw.width = this.raw.height = 0;
  }
}
