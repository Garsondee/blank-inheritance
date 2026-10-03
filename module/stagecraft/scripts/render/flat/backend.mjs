/**
 * The Stage Renderer, flat backend (renderer.md §6, "flat is the fallback"). The same stage drawn on a plain 2D canvas: the
 * painting, the cut-outs that cards can stand behind, cards that lean, turn and rise on their sticks, shadows that stay on
 * the floor, zones, marks, the chalk wall and its box, and the bang. No lights, no real shadows, no bloom, no sparks that
 * fall: it is what a weak machine, or a browser with no usable graphics card, can still draw. It asks nothing of the GPU,
 * so there is nothing to lose and nothing to rebuild.
 *
 * It answers the same questions as the three.js backend (contract.mjs) from the same rig, so the engine, the pointer and
 * chalk cannot tell them apart. Where a card is, where a click lands and where the floor is come from `geometry.mjs`.
 */

import { EMOTES } from "../../core/emotes.mjs";
import { makeRig, viewFor } from "../../core/rigspace.mjs";
import { DEFAULT_BOX, PALETTE, tileRect, tilesFor } from "../../core/chalk.mjs";
import { zoneKey, drawZoneOutlines, impactCanvas, markCanvas, labelCanvas } from "../canvas-art.mjs";
import { samplePainting } from "../paint/wall.mjs";
import { cutoutFade, CUTOUT_FADE, CUTOUT_FADE_MOST } from "../../core/visibility.mjs";
import { cardPlacement, hitCard, floorAt, paintingAt, project, byDepth, toWindow, FOOT } from "./geometry.mjs";
import { boxLayout, hitBox } from "./box.mjs";

const IMPACT_LIFE = 0.42;
const FLASH_LIFE = 0.2;
const SPARK_LIFE = 0.8;
const SPARKS = 22;
const MAX_FLASHES_PER_SECOND = 3;
const PIXEL_RATIO_CAP = 1;                  // the whole point of this backend is to be cheap

const hex = (n, fallback = "#80512d") => (typeof n === "number" ? `#${n.toString(16).padStart(6, "0")}` : fallback);

/** A canvas the size of the painting (at most 2048 wide), for things drawn in fractions of it: the zone outlines. */
function layer(iw, ih) {
  const cw = Math.min(2048, iw);
  const ch = Math.round((cw * ih) / iw);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  return { canvas, ctx: canvas.getContext("2d"), cw, ch };
}

export class FlatBackend {
  constructor({ images, onContextLost = null } = {}) {
    this.images = images;
    this.onContextLost = onContextLost;      // never called: a 2D canvas is not lost with the graphics card
    this.name = "flat";
    this.capabilities = { lights: false, shadows: false, post: false, particles: false, marks: true, zoneOutlines: true, chalk: true, camera: false, capture: true, footlights: false };
    this.tier = "flat";
    this.views = new Map();                  // card id -> { person, face, back, s, ... }
    this.adding = new Set();
    this.emotes = new Map();                 // emote id -> an image, or null while it loads
    this.calm = false;
    this.zoneSetting = "off";                 // the player's setting's own default (settings.mjs)
    this.disposed = false;
    this.ready = false;
    this.order = [];                         // last frame's drawables, front to back, for picking
    this.flashes = [];
    this.zoneKey = "";
    this.revision = 0;                        // counts wholesale changes to the chalk: the backdrop is drawn again
    this.chalkWall = null;                    // the painted wall (render/paint/wall.mjs), once there is one
    this.chalkDirty = new Set();              // its tiles that changed since the backdrop was drawn: only they are drawn again
    this.hidden = false;
    this.boxShown = false;
    this.draws = 0;
  }

  /* ---------------------------------------------------------------- lifecycle */

  mount(element, { pixelRatio = 1, width = 1280, height = 720 } = {}) {
    this.element = element;
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;";
    element.append(this.canvas);
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    if (!this.ctx) throw new Error("this browser cannot draw on a 2D canvas");
    this.#size(width, height, pixelRatio);
  }

  #size(w, h, ratio) {
    this.width = w;
    this.height = h;
    this.ratio = Math.min(ratio || 1, PIXEL_RATIO_CAP);
    this.view = viewFor(w, h);
    this.canvas.width = Math.max(1, Math.round(w * this.ratio));
    this.canvas.height = Math.max(1, Math.round(h * this.ratio));
    this.backdrop = null;                     // the still things behind the cards, kept as one picture at this size
    this.backdropKey = "";
    this.occluderBitmaps = null;              // and the cut-outs, each cut out of the painting once at this size
    this.boxCache = null;
  }

  resize(width, height, ratio = 1) {
    if (this.disposed) return;
    this.#size(width, height, ratio);
  }

  setQuality() { /* there is only one flat quality */ }
  setCalm(calm) { this.calm = !!calm; }
  setZoneSetting(setting) { this.zoneSetting = setting; this.zoneKey = ""; }
  setFootlights() { /* no footlights without lights */ }

  async load(description, skin, people = []) {
    this.description = description;
    this.skin = skin;
    this.rig = makeRig(description.painting, description.rig);
    await Promise.all((skin.fonts ?? []).map((f) => document.fonts?.load(f).catch(() => null)));
    const painting = await this.images.loadImage(description.painting.src);
    if (!painting) throw new Error(`the painting "${description.painting.src}" could not be loaded`);
    if (this.disposed) return;
    this.painting = painting;
    const [iw, ih] = this.rig.size;
    this.zoneLayer = layer(iw, ih);
    this.impact = impactCanvas();
    this.markImage = markCanvas();
    this.labelImages = new Map();
    // the cut-outs: the painting's own pixels, drawn again over any card that stands further back than their base
    this.occluders = description.occluders.map((o) => {
      const base = this.rig.standing([o.x, o.base]);
      return base ? { poly: o.poly.map(([fx, fy]) => [this.rig.map.x(fx), this.rig.map.y(fy)]), z: base.Z } : null;
    }).filter(Boolean);
    await Promise.all(people.map((p) => this.addCard(p)));
    this.ready = true;
  }

  async addCard(person) {
    if (this.views.has(person.id) || this.adding.has(person.id) || this.disposed) return;
    this.adding.add(person.id);
    try {
      const helpers = { loadImage: this.images.loadImage };
      const [face, back] = await Promise.all([this.skin.face(person, helpers), this.skin.back(person, helpers)]);
      if (this.disposed) return;
      this.views.set(person.id, { id: person.id, person, face: this.#shrink(face), back: this.#shrink(back), w: this.skin.size.w, h: this.skin.size.h });
      if (person.emote?.id) this.#emoteImage(person.emote.id);
    } finally {
      this.adding.delete(person.id);
    }
  }

  removeCard(id) { this.views.delete(id); }

  /** A skin draws a card at twice its size, for the sharp 3D picture. Here it is drawn once at the card's own size (well scaled, once), so every frame scales it by less. */
  #shrink(source) {
    const { w, h } = this.skin.size;
    if (!(source.width > w * 1.3)) return source;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(source, 0, 0, w, h);
    return c;
  }

  #emoteImage(id) {
    if (this.emotes.has(id)) return this.emotes.get(id);
    this.emotes.set(id, null);
    const svg = EMOTES[id]?.svg;
    if (svg) {
      const im = new Image();
      im.onload = () => this.emotes.set(id, im);
      im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace("<svg ", '<svg width="256" height="256" '))}`;
    }
    return null;
  }

  /* ---------------------------------------------------------------- drawing */

  /** The transform that takes reference-page pixels (where the painting and the floor are laid out) to the canvas. */
  #page() {
    const { view, ratio } = this;
    this.#set([view.s, 0, 0, view.s, -view.ox * view.s, -view.oy * view.s], ratio);
  }

  /** A window-pixel transform, as the canvas wants it. */
  #set(m, ratio = this.ratio) {
    this.ctx.setTransform(m[0] * ratio, m[1] * ratio, m[2] * ratio, m[3] * ratio, m[4] * ratio, m[5] * ratio);
  }

  #box() {
    if (!this.boxShown) return null;
    this.boxCache ??= { layout: boxLayout(this.rig, this.view, this.boxAt ?? this.description.chalk?.box ?? DEFAULT_BOX) };
    return this.boxCache.layout;
  }

  /**
   * Everything that lies still behind the cards (the painting, the strip below it that a raised painting leaves, the zone
   * outlines and the chalk) is drawn once into a canvas of its own, and redrawn only when one of them changes or the window
   * does. Each frame is then one copy of it. On a machine with no graphics card, scaling the painting every frame was most
   * of the cost of the stage.
   */
  #backdrop(snapshot, t) {
    const { rig, view, ratio } = this;
    const board = snapshot.board ?? null;
    const zones = this.description.zones.length ? zoneKey(this.description.zones, snapshot.zones, this.zoneSetting, t, board) : "";
    const key = `${this.canvas.width}x${this.canvas.height}|${zones}|${this.revision}|${this.hidden ? 1 : 0}`;
    if (this.backdrop && key === this.backdropKey) {
      // only some tiles of chalk changed (someone is painting): those places are drawn again, nothing else
      if (this.chalkDirty.size) this.#backdropTiles();
      return;
    }
    this.backdropKey = key;
    this.chalkDirty.clear();
    if (!this.backdrop) {
      const canvas = document.createElement("canvas");
      canvas.width = this.canvas.width;
      canvas.height = this.canvas.height;
      this.backdrop = { canvas, ctx: canvas.getContext("2d", { alpha: false }) };
    }
    const ctx = this.backdrop.ctx;
    const map = rig.map;
    const [iw, ih] = rig.size;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0c0a08";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(view.s * ratio, 0, 0, view.s * ratio, -view.ox * view.s * ratio, -view.oy * view.s * ratio);
    ctx.imageSmoothingQuality = "high";           // drawn rarely, so it can be drawn well
    const pw = iw * map.s;
    const ph = ih * map.s;
    ctx.drawImage(this.painting, map.ox, map.oy, pw, ph);
    const bottom = map.oy + ph;
    const need = view.oy + view.visH - bottom;
    if (need > 0) {
      const depth = Math.min(need + 8, ph * 0.6);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.translate(0, bottom);
      ctx.scale(1, -1);
      ctx.drawImage(this.painting, 0, ih - depth / map.s, iw, depth / map.s, map.ox, -depth, pw, depth);
      ctx.restore();
    }
    if (this.zoneLayer && this.description.zones.length) {
      if (zones !== this.zoneKey) { this.zoneKey = zones; drawZoneOutlines(this.zoneLayer.ctx, this.zoneLayer.cw, this.zoneLayer.ch, this.description.zones, snapshot.zones, this.zoneSetting, t, board); }
      ctx.drawImage(this.zoneLayer.canvas, map.ox, map.oy, pw, ph);
    }
    if (!this.hidden && this.chalkWall) for (const key of this.chalkWall.composite.keys()) this.#chalkTile(ctx, key);
  }

  /** One tile of the chalk wall, where it lies on the painting (the backdrop's context, in reference-page pixels). */
  #chalkTile(ctx, key) {
    const tile = this.chalkWall.composite.get(key);
    if (!tile) return;
    const grid = this.chalkWall.grid;
    const r = tileRect(grid, key);
    const map = this.rig.map;
    const [iw, ih] = this.rig.size;
    const pw = iw * map.s;
    const ph = ih * map.s;
    ctx.drawImage(tile, map.ox + (r.x / grid.w) * pw, map.oy + (r.y / grid.h) * ph, (r.w / grid.w) * pw, (r.h / grid.h) * ph);
  }

  /**
   * The places of the tiles of chalk that changed, drawn again in the backdrop: the painting, the zone outlines and the
   * chalk, clipped to each place (and a pixel round it, with the tiles next to it, so no trace of old paint stays at an edge).
   */
  #backdropTiles() {
    const { rig, view, ratio } = this;
    const ctx = this.backdrop.ctx;
    const grid = this.chalkWall?.grid;
    const map = rig.map;
    const [iw, ih] = rig.size;
    const pw = iw * map.s;
    const ph = ih * map.s;
    const e = 1.5 / (view.s * ratio);
    ctx.setTransform(view.s * ratio, 0, 0, view.s * ratio, -view.ox * view.s * ratio, -view.oy * view.s * ratio);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingQuality = "high";
    for (const key of this.chalkDirty) {
      const r = grid ? tileRect(grid, key) : null;
      if (!r) continue;
      const x0 = Math.max(map.ox, map.ox + (r.x / grid.w) * pw - e);
      const y0 = Math.max(map.oy, map.oy + (r.y / grid.h) * ph - e);
      const x1 = Math.min(map.ox + pw, map.ox + ((r.x + r.w) / grid.w) * pw + e);
      const y1 = Math.min(map.oy + ph, map.oy + ((r.y + r.h) / grid.h) * ph + e);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.clip();
      ctx.fillStyle = "#0c0a08";
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.drawImage(this.painting, map.ox, map.oy, pw, ph);
      if (this.zoneLayer && this.description.zones.length) ctx.drawImage(this.zoneLayer.canvas, map.ox, map.oy, pw, ph);
      if (!this.hidden) for (const k of tilesFor(grid, { x0: r.x - 2, y0: r.y - 2, x1: r.x + r.w + 2, y1: r.y + r.h + 2 })) this.#chalkTile(ctx, k);
      ctx.restore();
    }
    this.chalkDirty.clear();
  }

  /** Draw one moment. `snapshot` is Stage#snapshot(). */
  draw(snapshot) {
    if (!this.ready || this.disposed) return;
    const { ctx, rig, view } = this;
    const t = snapshot.t;
    this.draws++;

    ctx.imageSmoothingQuality = "medium";         // the canvas forgets this whenever it is resized, so it is said every frame
    this.#backdrop(snapshot, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(this.backdrop.canvas, 0, 0);

    this.#marks(snapshot, t);
    this.#shadows(snapshot);

    // everything that stands: cards, cut-outs and the box of chalk, further ones first
    const stand = [];
    for (const c of snapshot.cards) {
      const v = this.views.get(c.id);
      if (!v) continue;
      stand.push({ kind: "card", z: c.z, c, v, pl: cardPlacement(c, rig, view, { stickLen: this.skin.stick?.length ?? 134 }) });
    }
    for (const o of this.occluders) stand.push({ kind: "occluder", z: o.z, o });
    const layout = this.#box();
    if (layout) stand.push({ kind: "box", z: layout.z, layout });
    stand.sort(byDepth);
    for (const d of stand) {
      if (d.kind === "card") this.#card(d.c, d.v, d.pl);
      else if (d.kind === "occluder") this.#occluder(d.o);
      else this.#drawBox(d.layout);
    }
    this.order = stand;

    this.#ghostAndEmotes(snapshot);
    this.#bangs(snapshot, t);
  }

  /** A card's shadow stays on the floor while the card is lifted. */
  #shadows(snapshot) {
    const { ctx, rig } = this;
    this.#page();
    for (const c of snapshot.cards) {
      const v = this.views.get(c.id);
      if (!v) continue;
      const g = c.grip ?? 0;
      const s = c.scale ?? 1;
      const at = rig.screenOf(c.x, 0.6, c.z);
      const wide = (v.w * s * (0.95 + 0.5 * g)) / 2 * at.k;
      const deep = (74 + 46 * g) / 2;
      const near = rig.screenOf(c.x, 0.6, c.z + deep);
      const far = rig.screenOf(c.x, 0.6, c.z - deep);
      const tall = Math.max(2, Math.abs(near.y - far.y) / 2);
      if (c.selected || c.speaking) {
        // chosen by the GM for a formation (orange), or has the floor (a pale pool of light): a glow instead of a shadow
        ctx.globalAlpha = c.selected ? 0.85 : 0.6;
        ctx.fillStyle = c.selected ? "#ff9a46" : "#fff0c8";
        ctx.beginPath();
        ctx.ellipse(at.x, at.y, wide * 1.45, tall * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.globalAlpha = 0.62 - 0.26 * g;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, wide, tall, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Marks offered to a held card: tape-mark brackets on the floor, one brighter if it is the one the card would take. */
  #marks(snapshot, t) {
    const { ctx, rig } = this;
    this.#page();
    for (const mk of snapshot.marks.slice(0, 6)) {
      const pulse = mk.target ? 1 + 0.06 * Math.sin(t * 7) : 1;
      const at = rig.screenOf(mk.X, 1.2, mk.Z);
      const w = (mk.target ? 190 : 150) * pulse * at.k;
      const half = ((mk.target ? 120 : 96) * pulse) / 2;
      const h = Math.abs(rig.screenOf(mk.X, 1.2, mk.Z + half).y - rig.screenOf(mk.X, 1.2, mk.Z - half).y);
      ctx.globalAlpha = Math.min(1, mk.alpha) * (mk.target ? 1 : 0.8);
      ctx.drawImage(this.markImage, at.x - w / 2, at.y - h / 2, w, Math.max(h, 4));
    }
    ctx.globalAlpha = 1;
  }

  /** A cut-out is copied over the cards that stand behind it: its own pixels of the painting, cut out once at this window's size. */
  #occluder(o) {
    this.occluderBitmaps ??= new Map();
    let bitmap = this.occluderBitmaps.get(o);
    if (bitmap === undefined) { bitmap = this.#occluderBitmap(o); this.occluderBitmaps.set(o, bitmap); }
    if (!bitmap) return;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(bitmap.canvas, bitmap.x, bitmap.y);
  }

  #occluderBitmap(o) {
    const { view, ratio, rig } = this;
    const win = o.poly.map(([x, y]) => toWindow(view, x, y));
    const x0 = Math.max(0, Math.floor(Math.min(...win.map((p) => p.x)) * ratio));
    const y0 = Math.max(0, Math.floor(Math.min(...win.map((p) => p.y)) * ratio));
    const x1 = Math.min(this.canvas.width, Math.ceil(Math.max(...win.map((p) => p.x)) * ratio));
    const y1 = Math.min(this.canvas.height, Math.ceil(Math.max(...win.map((p) => p.y)) * ratio));
    if (x1 <= x0 || y1 <= y0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = x1 - x0;
    canvas.height = y1 - y0;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.setTransform(view.s * ratio, 0, 0, view.s * ratio, -view.ox * view.s * ratio - x0, -view.oy * view.s * ratio - y0);
    ctx.beginPath();
    o.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    const [iw, ih] = rig.size;
    ctx.drawImage(this.painting, rig.map.ox, rig.map.oy, iw * rig.map.s, ih * rig.map.s);
    ctx.restore();
    // its top edge fades in, as in the 3D picture (core/visibility.mjs `cutoutFade`): a card behind it melts into it
    const ys = o.poly.map((p) => p[1]);
    const fade = Math.min(CUTOUT_FADE, (Math.max(...ys) - Math.min(...ys)) * CUTOUT_FADE_MOST) * view.s * ratio;
    const alpha = cutoutFade(win.map((p) => [p.x * ratio - x0, p.y * ratio - y0]), canvas.width, canvas.height, fade);
    const mask = document.createElement("canvas");
    mask.width = canvas.width;
    mask.height = canvas.height;
    const mx = mask.getContext("2d");
    const img = mx?.createImageData?.(mask.width, mask.height);
    if (img?.data) {
      for (let i = 0; i < alpha.length; i++) img.data[i * 4 + 3] = alpha[i];
      mx.putImageData(img, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    }
    return { canvas, x: x0, y: y0 };
  }

  /** The stick, the foot and the card itself, drawn in the card's own space (origin at the bottom middle, a pixel of its picture a unit). */
  #card(c, v, pl, { ghost = false } = {}) {
    const { ctx, skin } = this;
    const W = v.w;
    const H = v.h;
    const s = c.scale ?? 1;
    const g = c.grip ?? 0;
    if (!ghost && g > 0.02) {
      this.#set(pl.stick);
      const len = pl.hinge;
      const wood = hex(skin.stick?.wood);
      const collar = hex(skin.stick?.collar, "#b8924f");
      const collarH = Math.min(18 * s, len);
      ctx.fillStyle = wood;
      ctx.beginPath();
      ctx.moveTo(-6.4 * s, 0);
      ctx.lineTo(-8.5 * s, -len + collarH);
      ctx.lineTo(8.5 * s, -len + collarH);
      ctx.lineTo(6.4 * s, 0);
      ctx.arc(0, 0, 6.4 * s, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(-4 * s, -len + collarH, 2.4 * s, len - collarH);          // a glint down the grip
      ctx.fillStyle = collar;
      ctx.fillRect(-12.5 * s, -len, 25 * s, collarH);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(-12.5 * s, -len + collarH - 3 * s, 25 * s, 3 * s);
      ctx.strokeStyle = v.person.colour ?? "#e8e0c8";                          // the hand ring, in the holder's colour
      ctx.lineWidth = 3.6;
      ctx.globalAlpha = Math.min(1, g * 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 21, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    this.#set(pl.m);
    if (ghost) ctx.globalAlpha = 0.35;
    const body = hex(skin.materials?.body?.color, "#e7dfcd");
    const edge = (skin.thickness ?? 9) * pl.side / 2;
    ctx.fillStyle = body;                                                       // the foot
    ctx.fillRect(-W * FOOT.width / 2, 0, W * FOOT.width, FOOT.depth);
    if (v.person.colour) { ctx.fillStyle = v.person.colour; ctx.fillRect(-W * FOOT.width / 2 + 4, 1, W * FOOT.width - 8, 3); }
    ctx.fillStyle = body;                                                       // the card's edge, which shows as it turns
    ctx.fillRect(-W / 2 - edge, -H + 2, W + edge * 2, H - 2);
    ctx.drawImage(pl.back ? v.back : v.face, -W / 2, -H, W, H);
    if (!ghost && c.down > 0.02) {
      // down: the face dims, as it does in the 3D picture
      ctx.fillStyle = `rgba(0,0,0,${(0.45 * c.down).toFixed(3)})`;
      ctx.fillRect(-W / 2, -H, W, H);
    }
    if (ghost) ctx.globalAlpha = 1;
  }

  #drawBox(layout) {
    const { ctx } = this;
    const fill = (pts, colour) => {
      ctx.fillStyle = colour;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    this.#set([1, 0, 0, 1, 0, 0]);
    fill(layout.floor, "#3a2412");
    fill(layout.back, "#6a4628");
    ctx.lineCap = "round";
    for (const st of layout.sticks) {
      ctx.strokeStyle = PALETTE[st.colour] ?? PALETTE.white;
      ctx.lineWidth = st.width;
      ctx.beginPath(); ctx.moveTo(st.base.x, st.base.y); ctx.lineTo(st.top.x, st.top.y); ctx.stroke();
    }
    // the magic stick: every colour along it, and a gold star on its tip
    const m = layout.magic;
    const bands = ctx.createLinearGradient(m.base.x, m.base.y, m.top.x, m.top.y);
    for (let i = 0; i <= 6; i++) bands.addColorStop(i / 6, `hsl(${i * 60},70%,72%)`);
    ctx.strokeStyle = bands;
    ctx.lineWidth = m.width;
    ctx.beginPath(); ctx.moveTo(m.base.x, m.base.y); ctx.lineTo(m.top.x, m.top.y); ctx.stroke();
    const r = m.width * 1.1;
    ctx.fillStyle = "#ffd36a";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.42 : r;
      ctx.lineTo(m.top.x + Math.cos(a) * rr, m.top.y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    fill(layout.left, "#7a5230");
    fill(layout.right, "#7a5230");
    fill(layout.front, "#8a5e38");
    fill(layout.eraser.front, "#5b6670");
    fill(layout.eraser.top, "#6c7882");
  }

  /** The ghost of a card on the mark it would take, the mark's caption, and each card's emote. */
  #ghostAndEmotes(snapshot) {
    const { ctx, rig, view } = this;
    for (const mk of snapshot.marks.slice(0, 6)) {
      if (!mk.target) continue;
      const v = this.views.get(mk.for);
      if (!v) continue;
      const s = this.description.cardScale * (v.person.size ?? 1);
      const c = { x: mk.X, z: mk.Z, lift: mk.pose.lift, lean: mk.pose.lean, yaw: mk.pose.yaw, pitch: mk.pose.pitch, grip: 0, scale: s, breathe: 1, squash: 1 };
      this.#card(c, v, cardPlacement(c, rig, view, { stickLen: 0 }), { ghost: true });
      if (mk.label) {
        const top = project(rig, view, { X: mk.X, Y: mk.pose.lift + v.h * s + 40, Z: mk.Z });
        const img = this.#label(mk.label);
        const w = 260 * top.k * view.s;
        this.#set([1, 0, 0, 1, 0, 0]);
        ctx.drawImage(img, top.x - w / 2, top.y - (w * 96) / 512 / 2, w, (w * 96) / 512);
      }
    }
    for (const c of snapshot.cards) {
      const e = c.emote;
      if (!e || e.opacity <= 0.01) continue;
      const img = this.#emoteImage(e.id);
      const v = this.views.get(c.id);
      if (!img || !v) continue;
      const s = c.scale ?? 1;
      const at = project(rig, view, { X: c.x + 74 * s, Y: (c.lift ?? 0) + (this.skin.stick?.length ?? 134) * s * (c.grip ?? 0) + v.h * s * (c.breathe ?? 1) + 36, Z: c.z + 30 });
      const size = 96 * e.pop * at.k * view.s;
      this.#set([1, 0, 0, 1, 0, 0]);
      ctx.globalAlpha = e.opacity;
      ctx.drawImage(img, at.x - size / 2, at.y - size / 2, size, size);
      ctx.globalAlpha = 1;
    }
  }

  #label(text) {
    if (!this.labelImages.has(text)) this.labelImages.set(text, labelCanvas(text));
    return this.labelImages.get(text);
  }

  /** The bang: brass impact lines, a brief glow (never in calm mode, never more than three a second), a few sparks. */
  #bangs(snapshot) {
    const { ctx, rig, view } = this;
    const now = snapshot.t;
    const y = this.skin.size.h * this.description.cardScale * 0.5 + 60;
    this.#set([1, 0, 0, 1, 0, 0]);
    let slot = 0;
    for (const b of snapshot.bonks) {
      const age = now - b.t;
      if (age < 0 || age > SPARK_LIFE) continue;
      const at = project(rig, view, { X: b.x, Y: y + 10, Z: b.Z + 90 });
      if (age < IMPACT_LIFE && slot++ < 3) {
        const u = age / IMPACT_LIFE;
        const size = (120 + 150 * Math.sqrt(u)) * at.k * view.s;
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.rotate(0.2 * u);
        ctx.globalAlpha = 1 - u * u;
        ctx.drawImage(this.impact, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      if (this.calm) continue;
      if (age < FLASH_LIFE && this.#mayFlash(b.t)) {
        const r = 260 * at.k * view.s;
        const a = 0.4 * (1 - age / FLASH_LIFE) ** 2;
        const glow = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
        glow.addColorStop(0, `rgba(255,226,168,${a})`);
        glow.addColorStop(1, "rgba(255,226,168,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = glow;
        ctx.fillRect(at.x - r, at.y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = "source-over";
      }
      if (b === snapshot.bonks[snapshot.bonks.length - 1]) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "#ffd98a";
        ctx.globalAlpha = Math.max(0, 1 - age / SPARK_LIFE);
        for (let i = 0; i < SPARKS; i++) {
          const a = (i / SPARKS) * Math.PI * 2 + (i % 5) * 0.37;
          const sp = 260 + ((i * 53) % 340);
          const p = project(rig, view, { X: b.x + Math.cos(a) * sp * age, Y: Math.max(2, y + Math.sin(a) * sp * 0.8 * age + 120 * age - 900 * age * age), Z: b.Z + 90 });
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1.2, 3 * p.k * view.s), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;
  }

  /** The flash governor: no more than three flashes begin in any second. */
  #mayFlash(t) {
    if (this.flashes.includes(t)) return true;
    this.flashes = this.flashes.filter((x) => t - x < 1);
    if (this.flashes.length >= MAX_FLASHES_PER_SECOND) return false;
    this.flashes.push(t);
    return true;
  }

  /* ---------------------------------------------------------------- questions */

  /** What is under a window point: the nearest card, or something in the box of chalk (a stick, the magic stick, the eraser). */
  pick(x, y) {
    if (!this.ready) return null;
    for (let i = this.order.length - 1; i >= 0; i--) {
      const d = this.order[i];
      if (d.kind === "card") {
        const height = hitCard(d.pl, d.c, d.v, x, y);
        if (height !== null) return { kind: "card", id: d.c.id, point: { x: 0, y: height, z: d.c.z } };
      } else if (d.kind === "box") {
        const hit = hitBox(d.layout, x, y);
        if (hit) return { ...hit, point: { x: 0, y: 0, z: d.z } };
      }
    }
    return null;
  }

  paintingAt(x, y) { return this.rig ? paintingAt(this.rig, this.view, x, y) : null; }
  floorAt(x, y, height = 0) { return this.rig ? floorAt(this.rig, this.view, x, y, height) : null; }
  project(world) { return project(this.rig, this.view, world); }

  /* ---------------------------------------------------------------- chalk */

  /** The chalk wall's tiles that changed (render/paint/wall.mjs), or (`full`) the whole wall afresh. */
  setChalkTiles(wall, keys, full = false) {
    const fresh = wall !== this.chalkWall;
    this.chalkWall = wall;
    if (full || fresh) { this.revision++; return; }
    for (const key of keys) this.chalkDirty.add(key);
  }

  setChalkHidden(hidden) { this.hidden = !!hidden; }
  setChalkBox(visible) { this.boxShown = !!visible; }
  /** Stand the box of chalk at another point of the floor (fractions of the painting). */
  setChalkBoxAt(at) { this.boxAt = [at[0], at[1]]; this.boxCache = null; }

  /** The painting's own colour at a point of it (fractions), as "#rrggbb": what the colour picker takes where there is no chalk. */
  paintingColour(fx, fy) { return samplePainting(this.painting, fx, fy); }

  /* ---------------------------------------------------------------- the rest of the contract */

  async capture() {
    return new Promise((resolve) => this.canvas.toBlob(resolve, "image/png"));
  }

  stats() { return { calls: this.draws, triangles: 0, textures: 0, geometries: 0, tracked: this.views.size }; }

  unmount() { this.canvas?.remove(); }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.views.clear();
    this.order = [];
    this.unmount();
  }
}
