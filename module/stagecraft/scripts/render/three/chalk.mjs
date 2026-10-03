/**
 * Chalk, in the 3D picture (chalk.md §5): the painted wall laid over the painting, and the box of chalk on the stage. The
 * wall's pixels are painted elsewhere (render/paint/wall.mjs); here each tile of it that has paint is a small plane just in
 * front of the painting and behind every card, so graffiti never covers a face, and only the tiles that changed are sent
 * to the graphics card again.
 */

import * as THREE from "three";
import { BOX, PALETTE, tileRect } from "../../core/chalk.mjs";
import { canvasTexture, paintingPlane, DEG } from "./support.mjs";

const IN_FRONT = 10;                 // how far in front of the painting the wall's paint lies
const ORDER = 2.5;                   // drawn after the painting and the zone outlines, before anything that stands

/** A stick with every colour climbing round it in a spiral, coloured at its corners (no picture needed). */
function rainbowCylinder(radius, height) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 24, 8);
  const position = geometry.getAttribute("position");
  const colours = new Float32Array(position.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const turn = (Math.atan2(position.getZ(i), position.getX(i)) / (Math.PI * 2) + 1) % 1;
    const up = position.getY(i) / height + 0.5;
    c.setHSL((turn + up * 0.75) % 1, 0.7, 0.68, THREE.SRGBColorSpace);
    colours.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return geometry;
}

export class ChalkTiles {
  constructor({ scene, rig }) {
    this.rig = rig;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.tiles = new Map();          // key -> { mesh, texture, material, canvas }
    this.#prime();
  }

  /**
   * A tile of nothing, too small to see and wholly clear, there from the start: the graphics card builds the program that
   * draws chalk while the stage loads, not at the first stroke (where it was a stall on a slow machine), and keeps it.
   */
  #prime() {
    const blank = document.createElement("canvas");
    blank.width = blank.height = 4;
    const texture = canvasTexture(blank, { anisotropy: 4 });
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, color: 0xeeeeee });
    const mesh = paintingPlane(this.rig, material, IN_FRONT, { x0: 0, y0: 0, x1: 0.001, y1: 0.001 }, this.geometry);
    mesh.renderOrder = ORDER;
    this.group.add(mesh);
    this.primer = { mesh, texture, material };
  }

  /** Show what changed on the wall: the tiles `keys`, or (`full`) every tile, as a wall drawn afresh. */
  update(wall, keys, full = false) {
    const grid = wall.grid;
    const todo = full ? new Set([...keys, ...this.tiles.keys(), ...wall.composite.keys()]) : keys;
    for (const key of todo) {
      const canvas = wall.composite.get(key) ?? null;
      const have = this.tiles.get(key);
      if (have && have.canvas === canvas) { have.texture.needsUpdate = true; continue; }
      if (have) this.#remove(key);
      if (!canvas) continue;
      const r = tileRect(grid, key);
      const texture = canvasTexture(canvas, { anisotropy: 4 });
      // a little under full white: chalk on a lit wall is not a lamp
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, color: 0xeeeeee });
      const mesh = paintingPlane(this.rig, material, IN_FRONT, { x0: r.x / grid.w, y0: r.y / grid.h, x1: (r.x + r.w) / grid.w, y1: (r.y + r.h) / grid.h }, this.geometry);
      mesh.renderOrder = ORDER;
      this.group.add(mesh);
      this.tiles.set(key, { mesh, texture, material, canvas });
    }
  }

  #remove(key) {
    const t = this.tiles.get(key);
    if (!t) return;
    this.group.remove(t.mesh);
    t.texture.dispose();
    t.material.dispose();
    this.tiles.delete(key);
  }

  setHidden(hidden) { this.group.visible = !hidden; }

  dispose() {
    for (const key of [...this.tiles.keys()]) this.#remove(key);
    this.primer?.texture.dispose();
    this.primer?.material.dispose();
    this.geometry.dispose();
    this.group.removeFromParent();
  }
}

/**
 * The box of chalk: a low wooden tray with a stick of each colour standing in it like pencils, the magic stick (bands of
 * every colour, a star on its tip: any colour at all) and a felt eraser. Click one to take it. Sticks are small and a stage
 * is deep, so each has an invisible, much larger shape round it that a click can hit; the picture shows the chalk, the
 * pointer feels the generous shape.
 */
export { BOX };

export class ChalkBox {
  constructor({ scene, rig, at, tracker }) {
    this.group = new THREE.Group();
    this.sticks = [];                  // what a click can pick: the invisible shapes round the sticks and the eraser
    const place = rig.standing(at);
    if (!place) { this.group.visible = false; scene.add(this.group); this.hidden = true; return; }
    this.group.position.set(place.X, 0, place.Z);
    this.group.rotation.y = -10 * DEG;
    const { width: W, depth: D, wall: H, stick, hit, magic, eraser: E } = BOX;
    const wood = tracker.add(new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.6 }));
    const dark = tracker.add(new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.8 }));
    const base = tracker.mesh(new THREE.Mesh(new THREE.BoxGeometry(W, 8, D), dark));
    base.position.y = 4;
    this.group.add(base);
    for (const [w, d, x, z] of [[W, 8, 0, D / 2 - 4], [W, 8, 0, -D / 2 + 4], [8, D, W / 2 - 4, 0], [8, D, -W / 2 + 4, 0]]) {
      const wall = tracker.mesh(new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wood));
      wall.position.set(x, H / 2 + 4, z);
      wall.castShadow = true;
      this.group.add(wall);
    }
    // the shape a click can hit: never drawn (it is not visible) but always tested
    const hitMaterial = tracker.add(new THREE.MeshBasicMaterial({ visible: false }));
    const hitCylinder = tracker.add(new THREE.CylinderGeometry(hit.radius, hit.radius, hit.height, 8));
    const target = (x, data) => {
      const t = tracker.mesh(new THREE.Mesh(hitCylinder, hitMaterial));
      t.position.set(x, 4 + hit.height / 2 - 14, 0);
      Object.assign(t.userData, data);
      this.group.add(t);
      this.sticks.push(t);
    };
    // a stick of each colour, standing a little askew
    Object.entries(PALETTE).forEach(([name, hex], i) => {
      const x = stick.first + i * stick.spacing;
      const colour = new THREE.Color(hex);
      const mat = tracker.add(new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95, emissive: colour.clone().multiplyScalar(0.18) }));
      const body = tracker.mesh(new THREE.Mesh(new THREE.CylinderGeometry(stick.radius, stick.radius, stick.height, 14), mat));
      body.position.set(x, 4 + stick.height / 2 - 6, ((i % 2) - 0.5) * 6);
      body.rotation.z = (i % 3 - 1) * 0.07;
      body.rotation.x = ((i + 1) % 3 - 1) * 0.05;
      body.castShadow = true;
      this.group.add(body);
      target(x, { chalk: name });
    });
    // the magic stick: taller, with every colour climbing round it, a little light of its own, and a gold star on its tip
    const rainbow = tracker.add(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: 0x2a2a2a }));
    const wand = tracker.mesh(new THREE.Mesh(rainbowCylinder(magic.radius, magic.height), rainbow));
    wand.position.set(magic.x, 4 + magic.height / 2 - 6, 2);
    wand.rotation.z = 0.06;
    wand.castShadow = true;
    this.group.add(wand);
    const gold = tracker.add(new THREE.MeshStandardMaterial({ color: 0xffd36a, roughness: 0.3, metalness: 0.6, emissive: 0xffb830, emissiveIntensity: 0.55 }));
    const star = tracker.mesh(new THREE.Mesh(new THREE.OctahedronGeometry(magic.radius * 1.15, 0), gold));
    star.position.set(magic.x - Math.sin(0.06) * (magic.height / 2), 4 + magic.height - 2, 2);
    star.scale.set(1, 1.3, 0.55);
    this.group.add(star);
    target(magic.x, { magic: true });
    // the felt eraser
    const felt = tracker.add(new THREE.MeshStandardMaterial({ color: 0x5b6670, roughness: 1 }));
    const pad = tracker.mesh(new THREE.Mesh(new THREE.BoxGeometry(50, 32, 30), felt));
    pad.position.set(E.x, 20, 4);
    pad.rotation.y = 0.12;
    pad.castShadow = true;
    this.group.add(pad);
    const rub = tracker.mesh(new THREE.Mesh(tracker.add(new THREE.BoxGeometry(58, 60, 50)), hitMaterial));
    rub.position.set(E.x, 30, 4);
    rub.userData.eraser = true;
    this.group.add(rub);
    this.sticks.push(rub);
    scene.add(this.group);
  }

  setVisible(on) { if (!this.hidden) this.group.visible = on; }
  get pickables() { return this.sticks; }

  /** Stand the box somewhere else on the floor (core/chalk.mjs `boxSpot`: clear of what covers the stage). */
  moveTo(rig, at) {
    if (this.hidden) return;
    const place = rig.standing(at);
    if (place) this.group.position.set(place.X, 0, place.Z);
  }
}
