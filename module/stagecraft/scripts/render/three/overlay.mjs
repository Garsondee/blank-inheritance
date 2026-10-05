/**
 * The subtle things: zone outlines drawn on the painting, and the marks and ghost shown while a card is in a hand
 * (stage.md §8.8, §8.10). Everything here is quiet by design: outlines are hairlines at rest, marks do not exist until a
 * card is picked up, and nothing is ever drawn that is not worth looking at.
 */

import * as THREE from "three";
import { zoneKey, drawZoneOutlines, markCanvas, labelCanvas, boardLabelCanvas, boardLabelPoint } from "../canvas-art.mjs";
import { canvasTexture, paintingPlane } from "./support.mjs";
import { depthGrow } from "../../core/rigspace.mjs";

/** Dashed outlines of every zone, on one canvas laid just in front of the painting. */
export class ZoneOutlines {
  constructor({ scene, rig, zones, tracker }) {
    this.zones = zones;
    this.rig = rig;
    const [iw, ih] = rig.size;
    this.cw = Math.min(2048, iw);
    this.ch = Math.round((this.cw * ih) / iw);
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.ctx = this.canvas.getContext("2d");
    this.tex = tracker.add(canvasTexture(this.canvas, { anisotropy: 4 }));
    const mesh = tracker.mesh(paintingPlane(rig, new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }), 20));
    mesh.renderOrder = 3;
    scene.add(mesh);
    this.mesh = mesh;
    this.key = "";
    mesh.visible = zones.length > 0;
  }

  /** Redraw only when something changed: a state, the player's setting, or (while a card is over one) the marching dashes. */
  update(states, setting, t, board = null) {
    if (!this.zones.length) return;
    const key = zoneKey(this.zones, states, setting, t, board);
    if (key === this.key) return;
    this.key = key;
    // the board's labels stand up in front of the cards (BoardLabels), so they are not drawn on the painting here
    drawZoneOutlines(this.ctx, this.cw, this.ch, this.zones, states, setting, t, board, { boardLabels: false });
    this.tex.needsUpdate = true;
  }
}

/**
 * The fight board's labels (stage.md §8.6): one for each position, standing on its floor, drawn over the cards so a
 * position's name, rules and headcount can always be read. A label is redrawn only when its headcount changes.
 */
export class BoardLabels {
  constructor({ scene, rig, zones, tracker, cardHeight = 300 }) {
    this.T = tracker;
    this.scene = scene;
    this.rig = rig;
    this.cardHeight = cardHeight;          // a label hangs just above head height, like a sign, so it never covers a face
    this.areas = zones.filter((z) => z.kind === "area");
    this.labels = new Map();
  }

  update(board) {
    for (const z of this.areas) {
      let label = this.labels.get(z.id);
      if (!board) { if (label) label.sprite.visible = false; continue; }
      const n = board.counts?.[z.id] ?? 0;
      const d = board.downs?.[z.id] ?? 0;
      if (!label || label.n !== n || label.d !== d) label = this.#draw(z, n, d, label);
      label.sprite.visible = !!label.at;
    }
  }

  #draw(z, n, d, label) {
    const { canvas, w, h } = boardLabelCanvas(z, n, d);
    const tex = this.T.add(canvasTexture(canvas, { anisotropy: 4 }));
    if (!label) {
      const sprite = new THREE.Sprite(this.T.add(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })));
      sprite.renderOrder = 45;
      this.scene.add(sprite);
      label = { sprite, at: this.rig.standing(boardLabelPoint(z)) };
      this.labels.set(z.id, label);
    } else {
      this.T.release(label.sprite.material.map);          // the old picture goes from video memory and from the tracker's list
      label.sprite.material.map = tex;
      label.sprite.material.needsUpdate = true;
    }
    label.n = n;
    label.d = d;
    if (label.at) {
      // further back is smaller, as everything is, but not as much smaller: a label at the back of a room must still be read
      const { f } = this.rig.cam;
      const k = f / (f - label.at.Z);
      const s = 1.45 / Math.sqrt(Math.max(0.15, k));
      label.sprite.scale.set(w * s, h * s, 1);
      label.sprite.position.set(label.at.X, this.cardHeight * depthGrow(this.rig.cam, label.at.Z) * 1.08 + (h * s) / 2, label.at.Z);
    }
    return label;
  }
}

/** The marks offered to a held card, and a ghost of the pose it would take. A fixed handful of meshes, reused. */
export class MarkDecals {
  constructor({ scene, tracker, softDot }) {
    this.T = tracker;
    this.scene = scene;
    this.pool = [];
    const tick = tracker.add(markTexture());
    for (let i = 0; i < 6; i++) {
      const m = tracker.mesh(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tick, transparent: true, opacity: 0, depthWrite: false })));
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 4;
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
    this.ghost = tracker.mesh(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })));
    this.ghost.visible = false;
    this.ghost.renderOrder = 5;
    scene.add(this.ghost);
    this.label = null;
    this.softDot = softDot;
    this.labelText = "";
  }

  /** `marks` from the snapshot; `views` maps a card id to its CardView (for the ghost's face and size). */
  update(marks, views, t) {
    this.pool.forEach((m) => { m.visible = false; });
    this.ghost.visible = false;
    if (this.label) this.label.visible = false;
    marks.slice(0, this.pool.length).forEach((mk, i) => {
      const m = this.pool[i];
      const pulse = mk.target ? 1 + 0.06 * Math.sin(t * 7) : 1;
      m.visible = true;
      m.position.set(mk.X, 1.2, mk.Z);
      m.scale.set((mk.target ? 190 : 150) * pulse, (mk.target ? 120 : 96) * pulse, 1);
      m.material.opacity = Math.min(1, mk.alpha) * (mk.target ? 1 : 0.8);
      if (mk.target) this.#ghost(mk, views, t);
    });
  }

  #ghost(mk, views, t) {
    const view = views.get(mk.for);
    if (!view) return;
    const g = this.ghost;
    if (g.material.map !== view.ghostTexture) { g.material.map = view.ghostTexture; g.material.needsUpdate = true; }
    const p = mk.pose;
    g.visible = true;
    g.material.opacity = 0.32 + 0.06 * Math.sin(t * 6);
    g.scale.set(view.w * view.s, view.h * view.s, 1);
    g.position.set(mk.X, p.lift + (view.h * view.s) / 2, mk.Z + 4);
    g.rotation.set(0, 0, 0);
    g.rotateY(p.yaw * Math.PI / 180);
    g.rotateX(p.pitch * Math.PI / 180);
    g.rotateZ(-p.lean * Math.PI / 180);
    if (mk.label) this.#setLabel(mk.label, mk.X, p.lift + view.h * view.s + 40, mk.Z + 10);
  }

  #setLabel(text, x, y, z) {
    if (!this.label || this.labelText !== text) {
      if (this.label) {
        this.label.parent?.remove(this.label);
        this.T.release(this.label.material.map);
        this.T.release(this.label.material);
      }
      const mat = this.T.add(new THREE.SpriteMaterial({ map: this.T.add(canvasTexture(labelCanvas(text))), depthTest: false, transparent: true }));
      this.label = new THREE.Sprite(mat);
      this.label.renderOrder = 55;
      this.label.scale.set(260, 49, 1);
      this.scene.add(this.label);
      this.labelText = text;
    }
    this.label.visible = true;
    this.label.position.set(x, y, z);
  }
}

const markTexture = () => canvasTexture(markCanvas(), { anisotropy: 4 });
