/**
 * The Stage Renderer, three.js backend (renderer.md). It draws a snapshot of the stage as a lit room with real
 * objects in it, and answers the few questions the shell needs (what is under the pointer, where on the floor is
 * this point). It owns every GPU resource it makes and frees them all in `dispose`, context included, so a scene
 * that is switched away from leaves nothing behind.
 */

import * as THREE from "three";
import { EMOTES } from "../../core/emotes.mjs";
import { makeRig } from "../../core/rigspace.mjs";
import { tierSettings } from "../contract.mjs";
import { Tracker, ImageCache, softDotTexture, canvasTexture, viewFor, aimCamera, BACKDROP_DEPTH } from "./support.mjs";
import { World } from "./world.mjs";
import { CardView } from "./cards.mjs";
import { BangFx } from "./fx.mjs";
import { ZoneOutlines, MarkDecals, BoardLabels } from "./overlay.mjs";
import { Post } from "./post.mjs";
import { ChalkTiles, ChalkBox } from "./chalk.mjs";
import { DEFAULT_BOX } from "../../core/chalk.mjs";
import { samplePainting } from "../paint/wall.mjs";

export class ThreeBackend {
  constructor({ images = new ImageCache(), onContextLost = null } = {}) {
    this.images = images;
    this.onContextLost = onContextLost;
    this.name = "three";
    this.capabilities = { lights: true, shadows: true, post: true, particles: true, marks: true, zoneOutlines: true, chalk: true, camera: false, capture: true, footlights: true };
    this.views = new Map();          // card id -> CardView (only built ones)
    this.adding = new Set();         // card ids being built
    this.tier = "high";
    this.needsRebuild = false;
    this.zoneSetting = "off";                 // the player's setting's own default (settings.mjs)
    this.calm = false;
    this.disposed = false;
    this.ready = false;              // true once load() has built the whole room: nothing is drawn or picked before that
  }

  /* ---------------------------------------------------------------- lifecycle */

  mount(element, { quality = "high", pixelRatio = 1, width = 1280, height = 720 } = {}) {
    this.tier = quality;
    this.settings = tierSettings(quality);
    this.element = element;
    this.tracker = new Tracker();
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;";
    element.append(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.settings.post, powerPreference: "high-performance" });
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.softDot = this.tracker.add(softDotTexture());
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      if (this.disposed) return;                  // we asked for this one ourselves, in dispose()
      this.contextLost = true;
      this.onContextLost?.();
    });
    this.#size(width, height, pixelRatio);
  }

  #size(w, h, ratio) {
    this.width = w;
    this.height = h;
    this.ratio = Math.min(ratio || 1, this.settings.pixelRatioCap);
    this.view = viewFor(w, h);
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.setSize(w, h, false);
    if (this.rig) aimCamera(this.camera, this.rig, this.view);
    this.post?.setSize(Math.round(w * this.ratio), Math.round(h * this.ratio));
  }

  resize(width, height, ratio = 1) {
    if (this.disposed) return;
    this.#size(width, height, ratio);
  }

  setQuality(tier) {
    if (tier === this.tier) return;
    this.tier = tier;
    this.needsRebuild = true;
  }

  setCalm(calm) {
    this.calm = !!calm;
    if (this.fx) this.fx.calm = this.calm;
    this.post?.setCalm(this.calm);
  }

  setZoneSetting(setting) { this.zoneSetting = setting; }

  setFootlights(on) { this.world?.setFootlights(on); }

  /**
   * Build the room. `description` is a normalised scene (core/scene.mjs); `skin` draws the cards; `people` are the
   * published cast. Resolves when the painting and every card are ready to draw.
   */
  async load(description, skin, people = []) {
    this.description = description;
    this.skin = skin;
    this.rig = makeRig(description.painting, description.rig);
    this.fx = null;
    await Promise.all((skin.fonts ?? []).map((f) => document.fonts?.load(f).catch(() => null)));
    const painting = await this.images.loadImage(description.painting.src);
    if (!painting) throw new Error(`the painting "${description.painting.src}" could not be loaded`);
    if (this.disposed) return;
    this.paintingImage = painting;

    aimCamera(this.camera, this.rig, this.view);
    this.#environment(painting);
    this.world = await new World({ scene: description, rig: this.rig, tracker: this.tracker, softDot: this.softDot, settings: this.settings }).build(painting);
    this.scene.add(this.world.group);
    this.zones = new ZoneOutlines({ scene: this.scene, rig: this.rig, zones: description.zones, tracker: this.tracker });
    this.boardLabels = new BoardLabels({ scene: this.scene, rig: this.rig, zones: description.zones, tracker: this.tracker, cardHeight: skin.size.h * description.cardScale });
    this.marks = new MarkDecals({ scene: this.scene, tracker: this.tracker, softDot: this.softDot });
    this.fx = new BangFx({ scene: this.scene, rig: this.rig, tracker: this.tracker, softDot: this.softDot, settings: this.settings, cardHeight: skin.size.h * description.cardScale });
    this.fx.calm = this.calm;
    this.chalkTiles = new ChalkTiles({ scene: this.scene, rig: this.rig });
    this.chalkBox = new ChalkBox({ scene: this.scene, rig: this.rig, at: description.chalk.box ?? DEFAULT_BOX, tracker: this.tracker });
    this.chalkBox.setVisible(false);
    await Promise.all(people.map((p) => this.addCard(p)));
    if (this.settings.post) {
      this.post = new Post(this.renderer, this.scene, this.camera, { width: Math.round(this.width * this.ratio), height: Math.round(this.height * this.ratio), samples: this.settings.msaa });
      this.post.setCalm(this.calm);
    }
    this.world.setFootlights(description.footlights);
    this.ready = true;
  }

  /** The room's own colour, as what the brass and the glass reflect: the painting, blurred into an environment map. */
  #environment(painting) {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const eq = new THREE.Texture(painting);
    eq.mapping = THREE.EquirectangularReflectionMapping;
    eq.colorSpace = THREE.SRGBColorSpace;
    eq.needsUpdate = true;
    const target = pmrem.fromEquirectangular(eq);
    this.tracker.add(target);
    this.scene.environment = target.texture;
    this.scene.environmentIntensity = 0.6;
    eq.dispose();
    pmrem.dispose();
  }

  async addCard(person) {
    if (this.views.has(person.id) || this.adding.has(person.id) || this.disposed) return;
    this.adding.add(person.id);
    try {
      const ctx = { tracker: this.tracker, images: this.images, softDot: this.softDot, scene: this.scene, emoteTexture: (id) => this.#emoteTexture(id) };
      const view = new CardView(person, this.skin, ctx, this.description.cardScale * (person.size ?? 1));
      await view.build();
      if (this.disposed) { view.dispose(); return; }
      this.views.set(person.id, view);               // only now can the frame loop pose it
      this.scene.add(view.root, view.blob);
      if (person.emote?.id) await view.setEmote(person.emote.id);
    } finally {
      this.adding.delete(person.id);
    }
  }

  removeCard(id) {
    const v = this.views.get(id);
    if (!v) return;
    v.dispose();
    this.views.delete(id);
  }

  #emoteTexture(id) {
    this.emoteCache ??= new Map();
    if (!this.emoteCache.has(id)) {
      const svg = EMOTES[id]?.svg;
      this.emoteCache.set(id, !svg ? Promise.resolve(null) : new Promise((resolve) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement("canvas");
          c.width = c.height = 256;
          c.getContext("2d").drawImage(im, 0, 0, 256, 256);
          resolve(this.tracker.add(canvasTexture(c)));
        };
        im.onerror = () => resolve(null);
        im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace("<svg ", '<svg width="256" height="256" '))}`;
      }));
    }
    return this.emoteCache.get(id);
  }

  /* ---------------------------------------------------------------- drawing */

  /** Draw one moment. `snapshot` is Stage#snapshot(); the clock comes from it, so a still is exact. */
  draw(snapshot) {
    if (!this.ready || this.disposed || this.contextLost) return;
    const t = snapshot.t;
    this.world.update(t);
    for (const c of snapshot.cards) this.views.get(c.id)?.pose(c);
    this.zones.update(snapshot.zones, this.zoneSetting, t, snapshot.board ?? null);
    this.boardLabels.update(snapshot.board ?? null);
    this.marks.update(snapshot.marks, this.views, t);
    this.fx.update(snapshot.bonks, t);
    this.renderer.info.reset();
    if (this.post) this.post.render(t);
    else this.renderer.render(this.scene, this.camera);
  }

  /* ---------------------------------------------------------------- questions */

  #ray(x, y) {
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -((y / this.height) * 2 - 1));
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    return ray;
  }

  /**
   * What is under a viewport point: the nearest card, or something in the box of chalk (a stick of one colour, the magic
   * stick, the eraser), with the point it was hit at.
   */
  pick(x, y) {
    if (!this.ready) return null;
    const meshes = [];
    for (const v of this.views.values()) meshes.push(...v.pickables);
    if (this.chalkBox?.group.visible) meshes.push(...this.chalkBox.pickables);
    if (!meshes.length) return null;
    const hit = this.#ray(x, y).intersectObjects(meshes, false)[0];
    if (!hit) return null;
    const point = { x: hit.point.x, y: hit.point.y, z: hit.point.z };
    if (hit.object.userData.chalk) return { kind: "chalk", colour: hit.object.userData.chalk, point };
    if (hit.object.userData.magic) return { kind: "magic", point };
    if (hit.object.userData.eraser) return { kind: "eraser", point };
    return { kind: "card", id: hit.object.userData.cardId, point };
  }

  /** Where on the painting (fractions) a viewport point falls, or null. */
  paintingAt(x, y) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), BACKDROP_DEPTH);
    const out = new THREE.Vector3();
    if (!this.#ray(x, y).ray.intersectPlane(plane, out)) return null;
    const { cx, cy, f, floorY } = this.rig.cam;
    const k = f / (f + BACKDROP_DEPTH);
    const sx = cx + out.x * k;
    const sy = cy + (floorY - cy - out.y) * k;
    const [fx, fy] = this.rig.fractionOfScreen(sx, sy);
    return fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1 ? { x: fx, y: fy } : null;
  }

  /** Floor coordinates of a viewport point, on a plane `height` above the floor. */
  floorAt(x, y, height = 0) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -height);
    const out = new THREE.Vector3();
    return this.#ray(x, y).ray.intersectPlane(plane, out) ? { x: out.x, z: out.z } : null;
  }

  /** Where a world point falls in the viewport. */
  project({ X, Y, Z }) {
    const s = this.rig.screenOf(X, Y, Z);
    return { x: (s.x - this.view.ox) * this.view.s, y: (s.y - this.view.oy) * this.view.s, k: s.k };
  }

  /* ---------------------------------------------------------------- chalk */

  /** The chalk wall's tiles that changed (render/paint/wall.mjs), or (`full`) all of them. */
  setChalkTiles(wall, keys, full = false) { this.chalkTiles?.update(wall, keys, full); }
  setChalkHidden(hidden) { this.chalkTiles?.setHidden(hidden); }
  setChalkBox(visible) { this.chalkBox?.setVisible(visible); }
  /** Stand the box of chalk at another point of the floor (fractions of the painting). */
  setChalkBoxAt(at) { if (this.rig) this.chalkBox?.moveTo(this.rig, at); }

  /** The painting's own colour at a point of it (fractions), as "#rrggbb": what the colour picker takes where there is no chalk. */
  paintingColour(fx, fy) { return samplePainting(this.paintingImage, fx, fy); }

  async capture() {
    if (this.post) this.post.render(0); else this.renderer.render(this.scene, this.camera);
    return new Promise((resolve) => this.canvas.toBlob(resolve, "image/png"));
  }

  stats() {
    const i = this.renderer?.info;
    return i ? { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, tracked: this.tracker.size } : null;
  }

  unmount() {
    this.canvas?.remove();
  }

  /** Free everything, the GPU context included: a browser allows only so many, and a scene change must not leak one. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
    this.chalkTiles?.dispose();
    this.post?.dispose();
    this.tracker?.disposeAll();
    this.scene?.environment?.dispose?.();
    this.renderer?.dispose();
    if (!this.contextLost) this.renderer?.forceContextLoss();      // a context the browser already took has nothing to force
    this.unmount();
  }
}
