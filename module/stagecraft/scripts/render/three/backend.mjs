/**
 * The Stage Renderer, three.js backend (renderer.md). It draws a snapshot of the stage as a lit room with real
 * objects in it, and answers the few questions the shell needs (what is under the pointer, where on the floor is
 * this point). It owns every GPU resource it makes and frees them all in `dispose`, context included, so a scene
 * that is switched away from leaves nothing behind.
 */

import * as THREE from "three";
import { EMOTES } from "../../core/emotes.mjs";
import { makeRig } from "../../core/rigspace.mjs";
import { tierSettings, pixelRatioFor } from "../contract.mjs";
import { Tracker, ImageCache, softDotTexture, canvasTexture, viewFor, aimCamera, BACKDROP_DEPTH } from "./support.mjs";
import { World } from "./world.mjs";
import { CardView } from "./cards.mjs";
import { BangFx } from "./fx.mjs";
import { ZoneOutlines, MarkDecals, BoardLabels } from "./overlay.mjs";
import { Post } from "./post.mjs";
import { ShadowWatch } from "./shadows.mjs";
import { ChalkTiles, ChalkBox } from "./chalk.mjs";
import { DEFAULT_BOX } from "../../core/chalk.mjs";
import { samplePainting } from "../paint/wall.mjs";
import { wallToWindow } from "../../core/wet.mjs";
import { paintingGrid } from "../grade.mjs";
import { lightAt } from "../../core/grade.mjs";
import { makeTitleBlock } from "../titleblock.mjs";

const COMPILE_WAIT = 4000;           // ms a stage waits for its shaders to be built before it shows itself anyway

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
    this.sharedPool = new Map();     // what every card has the same of (materials, shapes), made once: key -> object
    this.shadowWatch = new ShadowWatch();   // every card's pose as the shadows last saw it, in coarse steps (shadows.mjs)
    this.shadowDirty = true;         // something that casts a shadow came or went: the shadow maps are drawn again at the next frame
  }

  /** One of the things every card has the same of, made the first time it is asked for and shared by all (tracked once, freed with the picture). */
  #shared(key, make) {
    let v = this.sharedPool.get(key);
    if (!v) { v = this.tracker.add(make()); this.sharedPool.set(key, v); }
    return v;
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
    // the shadow maps are drawn again only when something that casts a shadow has moved (`draw`), not at every frame: a still
    // stage (the lamps only flicker) has nothing new to say to them
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
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
    this.ratio = pixelRatioFor(w, h, ratio, this.settings);
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

  /** Look at the stage through another view (core/look.mjs `viewOf`): this screen panned or zoomed. */
  setView(view) {
    if (this.disposed || !view) return;
    this.view = view;
    if (this.rig) aimCamera(this.camera, this.rig, this.view);
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

  setFootlights(on) { this.world?.setFootlights(on); this.shadowDirty = true; }

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
    this.grade = paintingGrid(painting);               // the colours of the painting, coarsely: a card takes the light it stands in

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
    this.#upload(this.tracker);                           // and every picture, now, not at the first frame that shows it
    await this.#compileFor(this.scene);                   // the room, the box of chalk, the marks, the bang: every shader, now
    this.world.setFootlights(description.footlights);
    this.ready = true;
  }

  /**
   * Build the shaders of an object before the first frame that shows it (three.js builds them lazily, at the first draw, and
   * a shader takes as long as the graphics card and its driver make it). Found 2026-10-04 by profiling the first card a
   * player ever picked up: the stick that grows out of a card is made hidden, so its lacquer (a clearcoat material under
   * shadowing lamps) was first compiled at that moment: a stall of 0.6 s on a fast card and seconds on a slow one. `compile`
   * takes the materials of hidden objects too; it is told which scene the object is going to (its lamps change the shader);
   * and where the browser can compile in parallel, the main thread is not held at all. A shader is built for where it will
   * be drawn: with post-processing the stage is drawn into the composer's target, not the screen, and the two are different
   * programs (the colour space the output is written in), so the target is bound while the compile is begun. The wait is
   * bounded: a driver that never says it is done must not keep a stage from starting; the shaders finish on their own.
   */
  async #compileFor(object) {
    let timer = 0;
    try {
      const previous = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this.post?.target ?? null);
      let ready = null;
      try {
        if (this.renderer.compileAsync) ready = this.renderer.compileAsync(object, this.camera, this.scene);   // begins at once, finishes on its own
        else this.renderer.compile(object, this.camera, this.scene);
      } finally {
        this.renderer.setRenderTarget(previous);
      }
      await Promise.race([ready, new Promise((resolve) => { timer = setTimeout(resolve, COMPILE_WAIT); })]);
    } catch (err) {
      console.warn("stagecraft | a shader could not be built ahead; it will be at the first draw", err);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Send the pictures a tracker holds to the graphics card now. three.js sends a texture at the first frame that draws it, and
   * the painting, the cut-outs' fades and every card's face and back are a few megabytes each (with their mipmaps made on the
   * way): at the first frame that was a stall of its own, beside the shaders `#compileFor` already builds ahead.
   */
  #upload(tracker) {
    const r = this.renderer;
    if (typeof r?.initTexture !== "function") return;
    for (const x of tracker.items) {
      if (!x.isTexture || !x.image) continue;
      try { r.initTexture(x); } catch { /* it is sent at the first draw instead */ }
    }
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
      this.titleBlock ??= makeTitleBlock();
      const ctx = { tracker: this.tracker, shared: (key, make) => this.#shared(key, make), images: this.images, titleBlock: this.titleBlock, softDot: this.softDot, scene: this.scene, emoteTexture: (id) => this.#emoteTexture(id), lightAt: (x, z) => this.#lightAt(x, z) };
      const view = new CardView(person, this.skin, ctx, this.description.cardScale * (person.size ?? 1));
      await view.build();
      if (this.disposed) { view.dispose(); return; }
      if (this.ready) {                                           // someone arriving later: their stick and face, built ahead too
        if (view.scope) this.#upload(view.scope);
        await this.#compileFor(view.root);
      }
      if (this.disposed) { view.dispose(); return; }
      this.views.set(person.id, view);               // only now can the frame loop pose it
      this.scene.add(view.root, view.blob);
      this.shadowDirty = true;
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
    this.shadowDirty = true;
  }

  /** A card's words changed (a name learned, a line of text edited): its face is drawn again from the skin. */
  async refreshCard(person) {
    const view = this.views.get(person.id);
    if (!view || this.disposed) return;
    await view.refresh(person);
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
    if (this.settings.shadows) {
      const moved = this.shadowWatch.update(snapshot.cards);
      if (moved || this.shadowDirty) { this.renderer.shadowMap.needsUpdate = true; this.shadowDirty = false; }
    }
    this.renderer.info.reset();
    if (this.post) this.post.render(t);
    else this.renderer.render(this.scene, this.camera);
  }

  /* ---------------------------------------------------------------- questions */

  /** A ray from the camera through a viewport point. One raycaster, kept: chalk asks this for every sample of the pointer. */
  #ray(x, y) {
    this.raycaster ??= new THREE.Raycaster();
    this.ndc ??= new THREE.Vector2();
    this.ndc.set((x / this.width) * 2 - 1, -((y / this.height) * 2 - 1));
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster;
  }

  /**
   * What is under a viewport point: the nearest card, or something in the box of chalk (a stick of one colour, the magic
   * stick, the eraser), with the point it was hit at.
   */
  pick(x, y) {
    if (!this.ready) return null;
    const meshes = (this.pickList ??= []);              // kept from one pointer move to the next: this runs at every one
    meshes.length = 0;
    for (const v of this.views.values()) for (const m of v.pickables) meshes.push(m);
    if (this.chalkBox?.group.visible) for (const m of this.chalkBox.pickables) meshes.push(m);
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
    this.backPlane ??= new THREE.Plane(new THREE.Vector3(0, 0, 1), BACKDROP_DEPTH);
    this.hit ??= new THREE.Vector3();
    const out = this.hit;
    if (!this.#ray(x, y).ray.intersectPlane(this.backPlane, out)) return null;
    const { cx, cy, f, floorY } = this.rig.cam;
    const k = f / (f + BACKDROP_DEPTH);
    const sx = cx + out.x * k;
    const sy = cy + (floorY - cy - out.y) * k;
    const [fx, fy] = this.rig.fractionOfScreen(sx, sy);
    return fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1 ? { x: fx, y: fy } : null;
  }

  /** Floor coordinates of a viewport point, on a plane `height` above the floor. */
  floorAt(x, y, height = 0) {
    this.floorPlane ??= new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.floorPlane.constant = -height;
    this.hit ??= new THREE.Vector3();
    return this.#ray(x, y).ray.intersectPlane(this.floorPlane, this.hit) ? { x: this.hit.x, z: this.hit.z } : null;
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
  setChalkBox(visible) { this.chalkBox?.setVisible(visible); this.shadowDirty = true; }
  /** Stand the box of chalk at another point of the floor (fractions of the painting). */
  setChalkBoxAt(at) { if (this.rig) this.chalkBox?.moveTo(this.rig, at); this.shadowDirty = true; }

  /** The map from wall pixels to window pixels now, for the wet ink laid over the stage while a stroke is painted (core/wet.mjs). */
  wetMap(grid) { return this.rig && this.view ? wallToWindow({ size: this.rig.size, map: this.rig.map, view: this.view }, grid) : null; }

  /** The painting's own colour at a point of it (fractions), as "#rrggbb": what the colour picker takes where there is no chalk. */
  paintingColour(fx, fy) { return samplePainting(this.paintingImage, fx, fy); }

  /** What a card at stage position (x, z) is multiplied by to stand in the painting's light there (core/grade.mjs). */
  #lightAt(x, z) {
    if (!this.grade || !this.rig) return null;
    const [fx, fy] = this.rig.fractionOf(x, z);
    return lightAt(this.grade, fx, fy, { strength: this.description.grade ?? 1 });
  }

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
    this.sharedPool.clear();
    this.chalkTiles?.dispose();
    this.post?.dispose();
    this.tracker?.disposeAll();
    this.scene?.environment?.dispose?.();
    this.renderer?.dispose();
    if (!this.contextLost) this.renderer?.forceContextLoss();      // a context the browser already took has nothing to force
    this.unmount();
  }
}
