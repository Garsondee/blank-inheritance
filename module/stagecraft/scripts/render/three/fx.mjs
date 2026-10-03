/**
 * The bang as light and sparks (feel.md §4, §5): brass impact lines, a flash of real light that falls on both cards for
 * a fifth of a second, and sparks that fly and fall. Drawn from the snapshot's recent bonks, so it has no state of its
 * own, and a limiter keeps the flashes under three a second however many cards are banging (renderer.md §6.3).
 */

import * as THREE from "three";
import { impactTexture, pointScale } from "./support.mjs";

const FLASH_LIFE = 0.2;
const IMPACT_LIFE = 0.42;
const SPARK_LIFE = 0.8;
const MAX_FLASHES_PER_SECOND = 3;

export class BangFx {
  constructor({ scene, rig, tracker, softDot, settings, cardHeight }) {
    this.T = tracker;
    this.cardHeight = cardHeight;
    const tex = tracker.add(impactTexture());
    this.impacts = [];
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(tracker.add(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, opacity: 0 })));
      sp.renderOrder = 60;
      sp.scale.set(180, 180, 1);
      scene.add(sp);
      this.impacts.push(sp);
    }
    this.flash = new THREE.PointLight(0xffe2a8, 0, 1100, 2);
    scene.add(this.flash);
    const n = settings.sparks;
    this.sparkCount = n;
    if (n) {
      const geo = tracker.add(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      this.sparks = new THREE.Points(geo, tracker.add(new THREE.PointsMaterial({ size: 12 * pointScale(rig), map: softDot, color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
      this.sparks.frustumCulled = false;
      this.dir = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 5) * 0.37;
        const sp = 260 + ((i * 53) % 340);
        return [Math.cos(a) * sp, Math.sin(a) * sp * 0.8 + 120, ((i * 31) % 100) - 50];
      });
      scene.add(this.sparks);
    }
    this.flashTimes = [];
    this.calm = false;
  }

  /** `bonks` are recent bonks from the snapshot, each { t, x, Z }; `now` is the stage clock. */
  update(bonks, now) {
    for (const im of this.impacts) im.material.opacity = 0;
    this.flash.intensity = 0;
    if (this.sparks) this.sparks.material.opacity = 0;
    let slot = 0;
    const y = this.cardHeight * 0.5 + 60;
    for (const b of bonks) {
      const age = now - b.t;
      if (age < 0 || age > SPARK_LIFE) continue;
      if (age < IMPACT_LIFE && slot < this.impacts.length) {
        const im = this.impacts[slot++];
        const u = age / IMPACT_LIFE;
        im.position.set(b.x, y + 10, b.Z + 90);
        im.scale.setScalar(120 + 150 * Math.sqrt(u));
        im.material.opacity = 1 - u * u;
        im.material.rotation = 0.2 * u;
      }
      if (age < FLASH_LIFE && !this.calm && this.#mayFlash(b.t)) {
        this.flash.position.set(b.x, y, b.Z + 300);
        this.flash.intensity = 5.5e5 * (1 - age / FLASH_LIFE) ** 2;
      }
      if (this.sparks && !this.calm && b === bonks[bonks.length - 1]) {
        const pa = this.sparks.geometry.attributes.position;
        this.dir.forEach((v, i) => {
          pa.array[i * 3] = b.x + v[0] * age;
          pa.array[i * 3 + 1] = Math.max(2, y + v[1] * age - 900 * age * age);
          pa.array[i * 3 + 2] = b.Z + 90 + v[2] * age;
        });
        pa.needsUpdate = true;
        this.sparks.material.opacity = Math.max(0, 1 - age / SPARK_LIFE);
      }
    }
  }

  /** The flash governor: no more than three flashes begin in any second. */
  #mayFlash(t) {
    if (this.flashTimes.includes(t)) return true;
    this.flashTimes = this.flashTimes.filter((x) => t - x < 1);
    if (this.flashTimes.length >= MAX_FLASHES_PER_SECOND) return false;
    this.flashTimes.push(t);
    return true;
  }
}
