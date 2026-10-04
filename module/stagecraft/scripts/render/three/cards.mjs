/**
 * One card as a three.js object: a body with thickness, a face, a back, a foot, and the stick that grows out when it is
 * held. The picture on it comes from the skin; how it stands comes from the snapshot. Nothing here decides anything.
 *
 *   root (the grip, on the floor)
 *   └ leanG   the stick swings about the grip
 *     ├ rod     the stick: grip, end cap, collar, lip, and the hand ring in the holder's colour
 *     └ hinge   the collar; the card swings a little further than the stick
 *       └ yawG    facing and pitch
 *         └ card    body, face, back, foot, enamel   (scaled to the card's size)
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { DEG, canvasTexture } from "./support.mjs";
import { faceOf } from "../badges.mjs";

export class CardView {
  /**
   * @param person  { id, name, colour, ... } as published
   * @param skin    the skin to draw with
   * @param ctx     { tracker, images, scale, emoteTexture(id) -> texture|null, blobTexture }
   */
  constructor(person, skin, ctx, scale) {
    this.id = person.id;
    this.person = person;
    this.skin = skin;
    this.ctx = ctx;
    this.s = scale;
    this.w = skin.size.w;
    this.h = skin.size.h;
    this.stickLen = (skin.stick?.length ?? 134) * scale;
    this.root = new THREE.Group();
    this.root.userData.cardId = person.id;
    this.emote = null;
    this.ghostTexture = null;
  }

  async build() {
    const { skin, ctx, person } = this;
    const T = ctx.tracker;
    const m = skin.materials ?? {};
    const brass = T.add(new THREE.MeshStandardMaterial({ color: m.body?.color ?? 0xe7dfcd, metalness: m.body?.metalness ?? 0, roughness: m.body?.roughness ?? 0.9 }));
    const helpers = this.#helpers();
    const [faceCanvas, backCanvas] = await Promise.all([faceOf(skin, person, helpers), skin.back(person, helpers)]);

    this.leanG = new THREE.Group();
    this.hinge = new THREE.Group();
    this.yawG = new THREE.Group();
    this.yawG.rotation.order = "YXZ";
    this.root.add(this.leanG);
    this.leanG.add(this.hinge);
    this.hinge.add(this.yawG);

    const W = this.w;
    const H = this.h;
    const body = T.mesh(new THREE.Mesh(new RoundedBoxGeometry(W - 3, H - 3, skin.thickness, 3, 6), brass));
    body.position.y = H / 2;
    body.castShadow = true;

    const faceTex = T.add(canvasTexture(faceCanvas));
    this.faceTex = faceTex;
    this.ghostTexture = faceTex;
    const face = T.mesh(new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: m.face?.roughness ?? 0.5, metalness: m.face?.metalness ?? 0.1, clearcoat: m.face?.clearcoat ?? 0.6, clearcoatRoughness: 0.22, transparent: true, alphaTest: 0.5, envMapIntensity: 0.7 })
    ));
    face.position.set(0, H / 2, skin.thickness / 2 + 0.2);
    face.receiveShadow = true;
    this.faceMaterial = face.material;

    this.backTex = T.add(canvasTexture(backCanvas));
    const back = T.mesh(new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({ map: this.backTex, roughness: m.back?.roughness ?? 0.62, metalness: m.back?.metalness ?? 0.35, transparent: true, alphaTest: 0.5 })
    ));
    back.position.set(0, H / 2, -(skin.thickness / 2 + 0.2));
    back.rotation.y = Math.PI;

    const foot = T.mesh(new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, 12, 54), brass));
    foot.position.set(0, -6, 0);
    foot.castShadow = true;

    this.card = new THREE.Group();
    this.card.add(body, face, back, foot);
    if (person.colour) {
      const enamel = T.mesh(new THREE.Mesh(new THREE.BoxGeometry(W * 0.5 - 8, 3, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color(person.colour), roughness: 0.35, metalness: 0.1 })));
      enamel.position.set(0, -2.5, 24);
      this.card.add(enamel);
    }
    this.card.scale.setScalar(this.s);
    this.yawG.add(this.card);

    this.#buildStick(brass);

    // a soft blob on the floor that stays put while the card is lifted
    this.blob = T.mesh(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ctx.softDot, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.renderOrder = 2;

    this.root.traverse((o) => { o.userData.cardId = person.id; });
    this.pickables = [body, face, back, foot];
    return this;
  }

  /** What a skin is handed to draw with: the pictures it may want, and the title block's layout and drawing (render/titleblock.mjs). */
  #helpers() {
    return { loadImage: this.ctx.images.loadImage, titleBlock: this.ctx.titleBlock };
  }

  /**
   * The card's words changed (a name was learned, a line of text edited): its face and back are drawn again, on the same
   * textures, so nothing else about the card is touched.
   */
  async refresh(person) {
    this.person = { ...this.person, ...person };
    const helpers = this.#helpers();
    const [face, back] = await Promise.all([faceOf(this.skin, this.person, helpers), this.skin.back(this.person, helpers)]);
    if (!this.faceTex || !this.backTex) return;
    this.faceTex.image = face;
    this.faceTex.needsUpdate = true;
    this.backTex.image = back;
    this.backTex.needsUpdate = true;
  }

  #buildStick(brass) {
    const { skin, ctx } = this;
    const T = ctx.tracker;
    const s = this.s;
    const len = this.stickLen;
    const collarH = 18 * s;
    const colour = new THREE.Color(this.person.colour ?? "#e8e0c8");
    const wood = skin.stick?.wood ?? 0x80512d;
    const lacquer = T.add(new THREE.MeshPhysicalMaterial({ color: wood, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, emissive: new THREE.Color(wood).multiplyScalar(0.45), emissiveIntensity: 0.9 }));
    const metal = T.add(new THREE.MeshStandardMaterial({ color: skin.stick?.collar ?? 0xb8924f, metalness: 1, roughness: 0.34 }));
    this.rod = new THREE.Group();
    const grip = T.mesh(new THREE.Mesh(new THREE.CylinderGeometry(8.5 * s, 6.4 * s, len - collarH, 24), lacquer));
    grip.position.y = (len - collarH) / 2;
    const end = T.mesh(new THREE.Mesh(new THREE.SphereGeometry(6.4 * s, 18, 12), lacquer));
    const collar = T.mesh(new THREE.Mesh(new THREE.CylinderGeometry(12.5 * s, 10 * s, collarH, 28), metal));
    collar.position.y = len - collarH / 2;
    const lip = T.mesh(new THREE.Mesh(new THREE.TorusGeometry(12 * s, 2.2 * s, 8, 28), metal));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = len - collarH;
    const hand = T.mesh(new THREE.Mesh(new THREE.TorusGeometry(21, 3.6, 10, 36), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 1.6, roughness: 0.4 })));
    hand.rotation.x = Math.PI / 2;
    hand.position.y = 8;
    for (const mesh of [grip, end, collar, lip]) mesh.castShadow = true;
    this.rod.add(grip, end, collar, lip, hand);
    this.rod.visible = false;
    this.leanG.add(this.rod);
    void brass;
  }

  /** Lay the card out as the snapshot says. */
  pose(c) {
    const g = c.grip;
    const grow = c.grow ?? 1;                  // drawn bigger further back (rigspace.mjs depthGrow)
    const s = this.s * grow;
    this.root.position.set(c.x, c.lift, c.z);
    const share = 1 - 0.45 * g;
    this.leanG.rotation.z = -c.lean * share * DEG;
    this.hinge.position.y = this.stickLen * g;
    this.hinge.rotation.z = -c.lean * (1 - share) * DEG;
    this.rod.visible = g > 0.02;
    this.rod.scale.set(1, Math.max(g, 0.001), 1);
    this.yawG.rotation.set(c.pitch * DEG, c.yaw * DEG, 0);
    this.card.scale.set(s, s * (c.down ? 1 : c.breathe) * c.squash, s);
    this.grown = grow;
    // down: the face dims, as a fallen piece does on a board
    const dim = 1 - 0.45 * (c.down ?? 0);
    if (this.faceMaterial && this.lastDim !== dim) { this.faceMaterial.color.setScalar(dim); this.lastDim = dim; }
    this.blob.position.set(c.x, 0.6, c.z);
    if (c.selected) {
      // chosen by the GM for a formation: the shadow under it becomes a warm glow
      this.blob.material.color.setHex(0xff9a46);
      this.blob.material.blending = THREE.AdditiveBlending;
      this.blob.scale.set(this.w * s * 1.5, 120 * grow, 1);
      this.blob.material.opacity = 0.95;
    } else if (c.speaking) {
      // has the floor: a pool of soft light at its feet, breathing a little
      const pulse = 1 + 0.06 * Math.sin((c.breathe - 1) * 400);
      this.blob.material.color.setHex(0xfff0c8);
      this.blob.material.blending = THREE.AdditiveBlending;
      this.blob.scale.set(this.w * s * 1.9 * pulse, 170 * grow * pulse, 1);
      this.blob.material.opacity = 0.8;
    } else {
      this.blob.material.color.setHex(0x000000);
      this.blob.material.blending = THREE.NormalBlending;
      this.blob.scale.set(this.w * s * (0.95 + 0.5 * g), (74 + 46 * g) * grow, 1);
      this.blob.material.opacity = 0.62 - 0.26 * g;
    }
    this.#poseEmote(c);
  }

  async setEmote(id) {
    if (this.emote) { this.emote.sprite.parent?.remove(this.emote.sprite); this.emote = null; }
    if (!id) return;
    const tex = await this.ctx.emoteTexture(id);
    if (!tex) return;
    const sprite = new THREE.Sprite(this.ctx.tracker.add(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })));
    sprite.renderOrder = 50;
    this.emote = { id, sprite };
    this.ctx.scene.add(sprite);
  }

  #poseEmote(c) {
    if (!this.emote) return;
    const e = c.emote;
    const sprite = this.emote.sprite;
    if (!e || e.id !== this.emote.id) { sprite.visible = false; return; }
    sprite.visible = e.opacity > 0.01;
    sprite.material.opacity = e.opacity;
    const grow = c.grow ?? 1;
    sprite.position.set(c.x + 74 * this.s * grow, c.lift + this.stickLen * c.grip + this.h * this.s * grow * c.breathe + 36 * grow, c.z + 30);
    sprite.scale.set(96 * e.pop * grow, 96 * e.pop * grow, 1);
  }

  dispose() {
    this.root.parent?.remove(this.root);
    this.blob.parent?.remove(this.blob);
    if (this.emote) this.emote.sprite.parent?.remove(this.emote.sprite);
  }
}
