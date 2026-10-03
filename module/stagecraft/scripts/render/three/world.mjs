/**
 * The room: the painting, the counter and other cut-outs standing at their own depths, the floor and the back wall that
 * take shadows, the lights, the pools of light, the footlights, and the dust. Built once from a scene description and
 * flickered each frame from the clock.
 */

import * as THREE from "three";
import { noise1 } from "../../core/diorama.mjs";
import { cutoutFade, CUTOUT_FADE, CUTOUT_FADE_MOST } from "../../core/visibility.mjs";
import { atDepth, pointScale, BACKDROP_DEPTH } from "./support.mjs";
const SPOT = 3.2e6;          // candela per unit of a light's authored intensity, tuned for pixel-sized worlds (renderer.md §8.4)

export class World {
  constructor({ scene, rig, tracker, softDot, settings }) {
    this.description = scene;
    this.rig = rig;
    this.T = tracker;
    this.softDot = softDot;
    this.settings = settings;
    this.group = new THREE.Group();
    this.lights = [];          // the lanterns
    this.lanterns = [];        // their places, for lighting the dust
    this.foot = [];
    this.dust = null;
  }

  async build(paintingImage) {
    const { rig, description: d, T } = this;
    const paintTex = T.add(new THREE.Texture(paintingImage));
    paintTex.colorSpace = THREE.SRGBColorSpace;
    paintTex.anisotropy = 8;
    paintTex.generateMipmaps = true;
    paintTex.minFilter = THREE.LinearMipmapLinearFilter;
    paintTex.needsUpdate = true;
    this.paintTex = paintTex;

    // The painting, far behind everything, sized so that it lands one to one on the reference page.
    const [iw, ih] = rig.size;
    const w = iw * rig.map.s;
    const h = ih * rig.map.s;
    const back = T.mesh(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: paintTex, color: 0xdcdcdc })));
    back.position.copy(atDepth(rig, rig.map.ox + w / 2, rig.map.oy + h / 2, -BACKDROP_DEPTH));
    back.scale.set((w * (rig.cam.f + BACKDROP_DEPTH)) / rig.cam.f, (h * (rig.cam.f + BACKDROP_DEPTH)) / rig.cam.f, 1);
    this.group.add(back);
    this.backdrop = back;
    this.#apron(paintTex, w, h);

    // Cut-outs: the painting's own pixels, stood at the depth where they meet the floor, so cards can stand behind them.
    // Each fades in from its top edge (core/visibility.mjs `cutoutFade`), so a card behind it melts into the counter
    // instead of being sliced off, and is drawn after the cards so the ones behind it show through the fade.
    for (const o of d.occluders) {
      const base = rig.standing([o.x, o.base]);
      if (!base) continue;
      const xs = o.poly.map((p) => p[0]);
      const ys = o.poly.map((p) => p[1]);
      const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      const pos = [];
      const uv = [];
      const uv1 = [];
      for (const [fx, fy] of o.poly) {
        const v = atDepth(rig, rig.map.x(fx), rig.map.y(fy), base.Z);
        pos.push(v.x, v.y, v.z);
        uv.push(fx, 1 - fy);
        uv1.push((fx - box[0]) / (box[2] - box[0] || 1), 1 - (fy - box[1]) / (box[3] - box[1] || 1));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setAttribute("uv1", new THREE.Float32BufferAttribute(uv1, 2));
      geo.setIndex(o.poly.length === 4 ? [0, 2, 1, 0, 3, 2] : fanIndices(o.poly.length));
      const fade = this.#fadeTexture(o.poly, box);
      const mesh = T.mesh(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: paintTex, color: 0xdcdcdc, side: THREE.DoubleSide, ...(fade ? { alphaMap: fade, transparent: true } : {}) })));
      mesh.renderOrder = 3;
      this.group.add(mesh);
    }

    // The floor takes shadows and nothing else. It must hide nothing either: it lies in front of the painting, and if it wrote
    // to the depth buffer the zone outlines and the fight board, which are drawn on the painting, would vanish everywhere
    // the floor is nearer than the painting is (found 2026-10-03: only zones at the very back of a room ever showed).
    const floor = T.mesh(new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000), new THREE.ShadowMaterial({ opacity: 0.62, depthWrite: false })));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.renderOrder = 2;
    this.group.add(floor);
    this.floor = floor;

    // Light: ambient, a spot light at each lantern, and a pool of glow where it lands.
    this.ambient = new THREE.AmbientLight(0xffd2a0, d.ambient);
    this.group.add(this.ambient);
    d.lights.forEach((L, i) => this.#lantern(L, i));
    this.#footlights();

    this.#dust();
    return this;
  }

  /**
   * A cut-out's fade as a texture over its bounding box (`box`, fractions of the painting), read through the mesh's second
   * set of texture coordinates: clear at its top edge, solid CUTOUT_FADE reference pixels below it.
   */
  #fadeTexture(poly, [fx0, fy0, fx1, fy1]) {
    const { rig, T } = this;
    const [iw, ih] = rig.size;
    const wPx = (fx1 - fx0) * iw * rig.map.s;
    const hPx = (fy1 - fy0) * ih * rig.map.s;
    if (!(wPx > 0 && hPx > 0)) return null;
    const W = 256;
    const H = Math.max(32, Math.min(512, Math.round((W * hPx) / wPx)));
    const fade = (Math.min(CUTOUT_FADE, hPx * CUTOUT_FADE_MOST) / hPx) * H;
    const alpha = cutoutFade(poly.map(([fx, fy]) => [((fx - fx0) / (fx1 - fx0)) * W, ((fy - fy0) / (fy1 - fy0)) * H]), W, H, fade);
    const data = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = alpha[y * W + x];
        const o = ((H - 1 - y) * W + x) * 4;             // a data texture's first row is its bottom
        data[o] = data[o + 1] = data[o + 2] = data[o + 3] = a;
      }
    }
    const tex = T.add(new THREE.DataTexture(data, W, H, THREE.RGBAFormat));
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.channel = 1;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * The apron (diorama.md §2.4): a painting that is lifted to clear the deck leaves a strip below it, which is filled
   * with the painting's own floor, mirrored and dimmed, so the room seems to run on under whatever covers the bottom.
   */
  #apron(tex, w, h) {
    const { rig, T } = this;
    const bottom = rig.map.oy + h;
    const need = rig.ref.H - bottom + 600;           // down past the bottom of the page, and a little more
    if (need <= 0) return;
    const depth = Math.min(need, h * 0.6);           // a mirror can only reach as far as the painting is tall
    const v = rig.cam.f + BACKDROP_DEPTH;
    const geo = new THREE.PlaneGeometry(1, 1);
    const uv = geo.attributes.uv;
    // the top edge is the painting's bottom edge (v = 0); going down it samples upwards into the painting
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) === 1 ? 0 : depth / h);
    const apron = T.mesh(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: 0x8a8a8a })));
    apron.position.copy(atDepth(rig, rig.map.ox + w / 2, bottom + depth / 2, -BACKDROP_DEPTH));
    apron.scale.set((w * v) / rig.cam.f, (depth * v) / rig.cam.f, 1);
    this.group.add(apron);
  }

  #lantern(L, i) {
    const { rig, T } = this;
    const fp = rig.standing([L.at[0], L.below]);
    if (!fp) return;
    const { cx, cy, f, floorY } = rig.cam;
    const k = f / (f - fp.Z);
    const lx = cx + (rig.map.x(L.at[0]) - cx) / k;
    const ly = cy + (rig.map.y(L.at[1]) - cy) / k;
    const pos = new THREE.Vector3(lx - cx, floorY - ly, fp.Z);
    const col = new THREE.Color(L.colour[0] / 255, L.colour[1] / 255, L.colour[2] / 255);
    const spot = new THREE.SpotLight(col, 0, 0, 1.2, 0.9, 2);
    spot.position.copy(pos);
    spot.target.position.set(pos.x, 0, pos.z);
    spot.userData = { base: L.intensity * SPOT, flicker: L.flicker, hz: L.flickerHz, seed: i + 1 };
    if (L.shadow && this.settings.shadows) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0004;
      spot.shadow.radius = 5;
      spot.shadow.camera.near = 30;
      spot.shadow.camera.far = 3000;
    }
    this.group.add(spot, spot.target);
    this.lights.push(spot);
    this.lanterns.push({ pos, colour: col });
    if (L.pool) {
      const pool = T.mesh(new THREE.Mesh(new THREE.CircleGeometry(L.pool * 0.62, 48), new THREE.MeshBasicMaterial({ map: this.softDot, color: col, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false })));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(pos.x, 1, pos.z);
      pool.renderOrder = 1;
      this.group.add(pool);
    }
  }

  /** Footlights: two low warm lights in front of the stage, throwing every card's shadow up the wall behind. */
  #footlights() {
    const { T } = this;
    for (const sx of [-1, 1]) {
      const spot = new THREE.SpotLight(0xffc27a, 0, 0, 0.66, 0.75, 2);
      spot.position.set(sx * 640, 26, 360);
      spot.target.position.set(sx * 140, 340, -420);
      spot.userData = { base: 2.3e6 };
      spot.visible = false;
      if (this.settings.shadows) {
        spot.castShadow = true;
        spot.shadow.mapSize.set(1024, 1024);
        spot.shadow.bias = -0.0005;
        spot.shadow.radius = 4;
        spot.shadow.camera.near = 40;
        spot.shadow.camera.far = 2800;
      }
      this.group.add(spot, spot.target);
      this.foot.push(spot);
    }
    this.wall = T.mesh(new THREE.Mesh(new THREE.PlaneGeometry(7000, 2600), new THREE.ShadowMaterial({ opacity: 0.72, depthWrite: false })));
    this.wall.position.set(0, 1300, -2300);
    this.wall.receiveShadow = true;
    this.wall.renderOrder = 2;
    this.wall.visible = false;
    this.group.add(this.wall);
  }

  setFootlights(on) {
    on = !!on && this.settings.footlights;
    for (const l of this.foot) { l.visible = on; l.intensity = on ? l.userData.base : 0; }
    this.wall.visible = on;
    this.ambient.intensity = on ? this.description.ambient * 0.75 : this.description.ambient;
    this.footlightsOn = on;
  }

  #dust() {
    const n = this.settings.dust;
    if (!n) return;
    const p = new Float32Array(n * 3);
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < n; i++) { p[i * 3] = (rnd() - 0.5) * 2600; p[i * 3 + 1] = 40 + rnd() * 820; p[i * 3 + 2] = -520 + rnd() * 760; }
    const geo = this.T.add(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(p.slice(), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = this.T.add(new THREE.PointsMaterial({ size: 8 * pointScale(this.rig), map: this.softDot, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    this.dust = new THREE.Points(geo, mat);
    this.dust.frustumCulled = false;
    this.dustBase = p;
    this.group.add(this.dust);
  }

  /** Lanterns flicker; the dust drifts and glimmers near them. */
  update(t) {
    for (const L of this.lights) {
      const u = L.userData;
      L.intensity = u.base * (1 + u.flicker * noise1(t * u.hz, u.seed));
    }
    if (!this.dust) return;
    const a = this.dust.geometry.attributes.position;
    const col = this.dust.geometry.attributes.color;
    const base = this.dustBase;
    for (let i = 0; i < a.count; i++) {
      const x = base[i * 3] + Math.sin(t * 0.21 + i) * 22;
      const y = base[i * 3 + 1] + ((t * (4 + (i % 7))) % 120);
      const z = base[i * 3 + 2];
      a.array[i * 3] = x; a.array[i * 3 + 1] = y; a.array[i * 3 + 2] = z;
      let r = 0; let g = 0; let b = 0;
      for (const l of this.lanterns) {
        const d2 = (x - l.pos.x) ** 2 + (y - l.pos.y) ** 2 + (z - l.pos.z) ** 2;
        const w = Math.max(0, 1 - Math.sqrt(d2) / 900);
        r += l.colour.r * w * w; g += l.colour.g * w * w; b += l.colour.b * w * w;
      }
      col.array[i * 3] = Math.min(1, r); col.array[i * 3 + 1] = Math.min(1, g); col.array[i * 3 + 2] = Math.min(1, b);
    }
    a.needsUpdate = true;
    col.needsUpdate = true;
  }
}

function fanIndices(n) {
  const out = [];
  for (let i = 1; i < n - 1; i++) out.push(0, i + 1, i);
  return out;
}
