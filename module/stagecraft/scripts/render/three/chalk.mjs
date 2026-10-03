/**
 * Chalk, drawn (chalk.md §5): the wall of strokes on the painting, the box of chalk on the stage, and the stick in the
 * hand. The wall is two canvases laid just in front of the painting and behind every card, so graffiti never covers a
 * face: one holds the strokes that are kept (a new stroke is added on top without redrawing the rest), the other holds
 * only the line being drawn right now, so a full wall costs nothing extra while someone is drawing.
 */

import * as THREE from "three";
import { pointsOf, COLOURS, BOX } from "../../core/chalk.mjs";
import { chalkHex, seeded, drawChalkLine } from "../canvas-art.mjs";
import { canvasTexture, paintingPlane, DEG } from "./support.mjs";

export { chalkHex };

/** One canvas laid over the painting. */
class Layer {
  constructor({ scene, rig, tracker, order }) {
    const [iw, ih] = rig.size;
    this.cw = Math.min(2048, iw);
    this.ch = Math.round((this.cw * ih) / iw);
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.ctx = this.canvas.getContext("2d");
    this.tex = tracker.add(canvasTexture(this.canvas, { anisotropy: 4 }));
    // a little under full white: chalk on a dim wall is not a lamp
    this.mesh = tracker.mesh(paintingPlane(rig, new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, color: 0xd0d0d0 }), 10));
    this.mesh.renderOrder = order;
    scene.add(this.mesh);
  }
  clear() { this.ctx.clearRect(0, 0, this.cw, this.ch); }
  touch() { this.tex.needsUpdate = true; }
}

export class ChalkWall {
  constructor({ scene, rig, tracker }) {
    this.kept = new Layer({ scene, rig, tracker, order: 2.5 });
    this.live = new Layer({ scene, rig, tracker, order: 2.6 });
    this.strokes = new Map();
    this.hidden = false;
    this.preview = null;
  }

  /** Replace the whole wall. */
  set(strokes) {
    this.strokes = new Map(strokes.map((s) => [s.id, s]));
    this.#redraw();
  }

  add(stroke) {
    if (this.strokes.has(stroke.id)) return;
    this.strokes.set(stroke.id, stroke);
    this.#draw(this.kept, stroke);
    this.kept.touch();
  }

  remove(ids) {
    let any = false;
    for (const id of ids) any = this.strokes.delete(id) || any;
    if (any) this.#redraw();
  }

  setHidden(hidden) {
    this.hidden = hidden;
    this.kept.mesh.visible = !hidden;
    this.live.mesh.visible = !hidden;
  }

  /** The line being drawn right now, before it is a stroke: shown on its own layer and gone when it is saved. */
  setPreview(points, colour, size) {
    this.preview = points && points.length ? { points, colour, size } : null;
    this.live.clear();
    if (this.preview) this.#line(this.live, this.preview.points, colour, size, seeded("preview"));
    this.live.touch();
  }

  #redraw() {
    this.kept.clear();
    for (const s of this.strokes.values()) this.#draw(this.kept, s);
    this.kept.touch();
  }

  #draw(layer, stroke) {
    this.#line(layer, pointsOf(stroke), stroke.colour, stroke.size, seeded(stroke.id));
  }

  #line({ ctx, cw, ch }, pts, colour, size, rnd) {
    drawChalkLine(ctx, cw, ch, pts, colour, size, rnd);
  }
}

/**
 * The box of chalk: a low wooden tray with a stick of each colour standing in it like pencils, and a felt eraser. Click a
 * stick to take it. Sticks are small and a stage is deep, so each one (and the eraser) has an invisible, much larger
 * shape round it that a click can hit; the picture shows the chalk, the pointer feels the generous shape.
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
    const { width: W, depth: D, wall: H, stick, hit } = BOX;
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
    // a stick of each colour, standing a little askew
    COLOURS.forEach((name, i) => {
      const x = stick.first + i * stick.spacing;
      const colour = new THREE.Color(chalkHex(name));
      const mat = tracker.add(new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95, emissive: colour.clone().multiplyScalar(0.18) }));
      const body = tracker.mesh(new THREE.Mesh(new THREE.CylinderGeometry(stick.radius, stick.radius, stick.height, 14), mat));
      body.position.set(x, 4 + stick.height / 2 - 6, ((i % 2) - 0.5) * 6);
      body.rotation.z = (i % 3 - 1) * 0.07;
      body.rotation.x = ((i + 1) % 3 - 1) * 0.05;
      body.castShadow = true;
      this.group.add(body);
      const target = tracker.mesh(new THREE.Mesh(hitCylinder, hitMaterial));
      target.position.set(x, 4 + hit.height / 2 - 14, 0);
      target.userData.chalk = name;
      this.group.add(target);
      this.sticks.push(target);
    });
    // the felt eraser
    const felt = tracker.add(new THREE.MeshStandardMaterial({ color: 0x5b6670, roughness: 1 }));
    const eraser = tracker.mesh(new THREE.Mesh(new THREE.BoxGeometry(50, 32, 30), felt));
    eraser.position.set(W / 2 - 34, 20, 4);
    eraser.rotation.y = 0.12;
    eraser.castShadow = true;
    this.group.add(eraser);
    const target = tracker.mesh(new THREE.Mesh(tracker.add(new THREE.BoxGeometry(58, 60, 50)), hitMaterial));
    target.position.set(W / 2 - 34, 30, 4);
    target.userData.eraser = true;
    this.group.add(target);
    this.sticks.push(target);
    scene.add(this.group);
  }

  setVisible(on) { if (!this.hidden) this.group.visible = on; }
  get pickables() { return this.sticks; }
}

/** The stick of chalk (or the eraser) that follows the pointer while one is in hand, leaning like everything else here. */
export class ChalkCursor {
  constructor({ scene, tracker }) {
    this.mat = tracker.add(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, emissive: 0x333333 }));
    this.chalk = tracker.mesh(new THREE.Mesh(new THREE.CylinderGeometry(BOX.stick.radius, BOX.stick.radius, BOX.stick.height, 14), this.mat));
    this.eraser = tracker.mesh(new THREE.Mesh(new THREE.BoxGeometry(50, 32, 30), tracker.add(new THREE.MeshStandardMaterial({ color: 0x5b6670, roughness: 1 }))));
    this.group = new THREE.Group();
    this.group.add(this.chalk, this.eraser);
    this.group.visible = false;
    this.group.renderOrder = 70;
    this.group.traverse((o) => { o.renderOrder = 70; if (o.material) o.material.depthTest = false; });
    scene.add(this.group);
    this.last = null;
  }

  /** `at` is a world point (or null to put it away); `tool` is a colour name or "rub". */
  set(at, tool, drawing, dt = 1 / 60) {
    if (!at) { this.group.visible = false; this.last = null; return; }
    this.group.visible = true;
    const rub = tool === "rub";
    this.chalk.visible = !rub;
    this.eraser.visible = rub;
    if (!rub) this.mat.color.set(chalkHex(tool));
    const vx = this.last ? (at.x - this.last.x) / Math.max(dt, 1e-3) : 0;
    this.last = at;
    this.group.position.set(at.x, at.y, at.z);
    // held like a pencil: leaning away from the way it moves, down a little when it is drawing
    this.group.rotation.set(0, 0, (rub ? 0 : -0.6) - Math.max(-0.5, Math.min(0.5, vx / 4000)));
    this.group.position.y += drawing ? 10 : 36;
  }
}
