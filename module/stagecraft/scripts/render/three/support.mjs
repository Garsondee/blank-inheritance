/**
 * Small things the three.js backend shares: tracked disposal (so a scene change leaves nothing behind), textures drawn
 * from canvases, the camera for a viewport, and a cache of loaded images.
 */

import * as THREE from "three";
import { REF, viewFor, BACKDROP_DEPTH } from "../../core/rigspace.mjs";
import { softDotCanvas, impactCanvas } from "../canvas-art.mjs";
import { ImageCache } from "../images.mjs";

export const DEG = Math.PI / 180;

/** Everything the backend creates goes through here, so `disposeAll` frees it all and `size` can prove it did. */
export class Tracker {
  constructor() { this.items = new Set(); }
  add(x) { if (x) this.items.add(x); return x; }
  /** A mesh, its geometry and its materials. */
  mesh(m) {
    this.add(m.geometry);
    for (const mat of [].concat(m.material)) {
      this.add(mat);
      for (const v of Object.values(mat)) if (v?.isTexture) this.add(v);
    }
    return m;
  }
  disposeAll() {
    for (const x of this.items) x.dispose?.();
    this.items.clear();
  }
  get size() { return this.items.size; }
}

export function canvasTexture(canvas, { anisotropy = 8, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/** A soft white dot, for glows, dust and sparks. Tint it with the material's colour. */
export const softDotTexture = () => canvasTexture(softDotCanvas(), { anisotropy: 1 });

/** The impact lines of a bang: cream rays with an ink edge and a burst in the middle. */
export const impactTexture = () => canvasTexture(impactCanvas());

export { ImageCache };

export { viewFor };

/** Aim a camera so the vanishing point falls on the painting's horizon, whatever the viewport (renderer.md §8.3). */
export function aimCamera(camera, rig, view) {
  const { f, cx, cy, floorY } = rig.cam;
  const near = 20;
  const far = 30000;
  camera.position.set(0, floorY - cy, f);
  camera.projectionMatrix.makePerspective(
    (-near * (cx - view.ox)) / f, (near * (view.ox + view.visW - cx)) / f,
    (near * (cy - view.oy)) / f, (-near * (view.oy + view.visH - cy)) / f, near, far
  );
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.updateProjectionMatrix = () => {};   // keep the off-axis frustum
  camera.updateMatrixWorld(true);
}

/** A point of the painting (reference px, y down) at a depth Z, as a world position. */
export function atDepth(rig, sx, sy, Z) {
  const { f, cx, cy, floorY } = rig.cam;
  return new THREE.Vector3(((sx - cx) * (f - Z)) / f, floorY - cy - ((sy - cy) * (f - Z)) / f, Z);
}

/** Point sprites assume a 90 degree lens; ours is `f` pixels long, so sizes need this (renderer.md §8.4). */
export const pointScale = (rig) => rig.cam.f / (REF.H / 2);

// how far back the painting hangs is the core's to say (rigspace.mjs), so nobody is ever put behind it
export { BACKDROP_DEPTH };

/**
 * A plane that covers exactly the painting, at a depth just in front of it (`inFront` units nearer to the viewer), so
 * anything drawn on its texture in painting fractions lands on the painting at any size. The painting itself, the zone
 * outlines and the chalk are all such planes. `part` ({ x0, y0, x1, y1 }, fractions) covers only that rectangle of the
 * painting instead (a tile of the chalk wall); `geometry` lets many planes share one.
 */
export function paintingPlane(rig, material, inFront = 0, part = null, geometry = null) {
  const [iw, ih] = rig.size;
  const w = iw * rig.map.s;
  const h = ih * rig.map.s;
  const { x0, y0, x1, y1 } = part ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
  const Z = -BACKDROP_DEPTH + inFront;
  const k = (rig.cam.f - Z) / rig.cam.f;
  const mesh = new THREE.Mesh(geometry ?? new THREE.PlaneGeometry(1, 1), material);
  mesh.position.copy(atDepth(rig, rig.map.ox + w * (x0 + x1) / 2, rig.map.oy + h * (y0 + y1) / 2, Z));
  mesh.scale.set(w * (x1 - x0) * k, h * (y1 - y0) * k, 1);
  return mesh;
}
