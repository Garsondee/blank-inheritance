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
import { easeLight } from "../../core/grade.mjs";
import { EMOTE_PIVOT } from "../../core/emotes.mjs";

const GAMMA = 1.5;

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
    // what this card makes on the graphics card is its own, and goes with it (a card that leaves must not stay in video memory
    // until the scene changes); what every card has the same of (the brass, the lacquer, the shape of the body) is shared
    this.scope = ctx.tracker.scoped?.() ?? null;
  }

  /** The tracker this card's own things are made through. */
  get T() { return this.scope ?? this.ctx.tracker; }

  /** One of the things every card has the same of: made once by the picture and shared (so a crowd is not a crowd of copies). */
  #shared(key, make) {
    return this.ctx.shared ? this.ctx.shared(key, make) : this.T.add(make());
  }

  async build() {
    const { skin, ctx, person } = this;
    const T = this.T;
    const m = skin.materials ?? {};
    const brass = this.#shared(`brass:${m.body?.color}:${m.body?.metalness}:${m.body?.roughness}`, () => new THREE.MeshStandardMaterial({ color: m.body?.color ?? 0xe7dfcd, metalness: m.body?.metalness ?? 0, roughness: m.body?.roughness ?? 0.9 }));
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
    const body = T.mesh(new THREE.Mesh(this.#shared(`body:${W}:${H}:${skin.thickness}`, () => new RoundedBoxGeometry(W - 3, H - 3, skin.thickness, 3, 6)), brass));
    body.position.y = H / 2;
    body.castShadow = true;

    const faceTex = T.add(canvasTexture(faceCanvas));
    this.faceTex = faceTex;
    this.ghostTexture = faceTex;
    const plane = () => this.#shared(`plane:${W}:${H}`, () => new THREE.PlaneGeometry(W, H));
    const face = T.mesh(new THREE.Mesh(
      plane(),
      new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: m.face?.roughness ?? 0.5, metalness: m.face?.metalness ?? 0.1, clearcoat: m.face?.clearcoat ?? 0.6, clearcoatRoughness: 0.22, transparent: true, alphaTest: 0.5, envMapIntensity: 0.7 })
    ));
    face.position.set(0, H / 2, skin.thickness / 2 + 0.2);
    face.receiveShadow = true;
    this.faceMaterial = face.material;

    this.backTex = T.add(canvasTexture(backCanvas));
    const back = T.mesh(new THREE.Mesh(
      plane(),
      new THREE.MeshStandardMaterial({ map: this.backTex, roughness: m.back?.roughness ?? 0.62, metalness: m.back?.metalness ?? 0.35, transparent: true, alphaTest: 0.5 })
    ));
    back.position.set(0, H / 2, -(skin.thickness / 2 + 0.2));
    back.rotation.y = Math.PI;

    const foot = T.mesh(new THREE.Mesh(this.#shared(`foot:${W}`, () => new THREE.BoxGeometry(W * 0.5, 12, 54)), brass));
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
    this.blob = T.mesh(new THREE.Mesh(this.#shared("plane:1:1", () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: ctx.softDot, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.renderOrder = 2;

    // the card's token is the one this user controls: a gold ring round its feet, on the floor, that stays put as the card is lifted
    this.ring = T.mesh(new THREE.Mesh(this.#shared("plane:1:1", () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: ctx.ringTexture(), color: 0xffd45a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 3;
    this.ring.visible = false;
    // and a gold outline round the card itself, behind it so only the margin shows (Foundry's border round a controlled token); it turns with the card
    this.halo = T.mesh(new THREE.Mesh(this.#shared(`plane:${W + 24}:${H + 24}`, () => new THREE.PlaneGeometry(W + 24, H + 24)), new THREE.MeshBasicMaterial({ map: ctx.haloTexture(W, H), color: 0xffd45a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    this.halo.position.set(0, H / 2, -(skin.thickness / 2 + 1.5));
    this.halo.visible = false;
    this.card.add(this.halo);
    // and someone is aiming at it: Foundry's four arrows round it, in the aimer's colour, with a pip for each aimer
    this.reticleKey = "";
    this.reticleAspect = (H * 1.22) / (W * 1.3);
    this.reticle = new THREE.Sprite(T.add(new THREE.SpriteMaterial({ map: ctx.reticleTexture(["#e8493c"], this.reticleAspect), depthWrite: false, transparent: true })));
    this.reticle.renderOrder = 48;
    this.reticle.visible = false;

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
    const { skin } = this;
    const T = this.T;
    const s = this.s;
    const len = this.stickLen;
    const collarH = 18 * s;
    const colour = new THREE.Color(this.person.colour ?? "#e8e0c8");
    const wood = skin.stick?.wood ?? 0x80512d;
    // the same for every card of a skin (and for every card of a size): made once, shared
    const lacquer = this.#shared(`lacquer:${wood}`, () => new THREE.MeshPhysicalMaterial({ color: wood, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, emissive: new THREE.Color(wood).multiplyScalar(0.45), emissiveIntensity: 0.9 }));
    const metal = this.#shared(`metal:${skin.stick?.collar}`, () => new THREE.MeshStandardMaterial({ color: skin.stick?.collar ?? 0xb8924f, metalness: 1, roughness: 0.34 }));
    const size = `${s.toFixed(4)}:${len.toFixed(2)}`;
    this.rod = new THREE.Group();
    const grip = T.mesh(new THREE.Mesh(this.#shared(`grip:${size}`, () => new THREE.CylinderGeometry(8.5 * s, 6.4 * s, len - collarH, 24)), lacquer));
    grip.position.y = (len - collarH) / 2;
    const end = T.mesh(new THREE.Mesh(this.#shared(`end:${size}`, () => new THREE.SphereGeometry(6.4 * s, 18, 12)), lacquer));
    const collar = T.mesh(new THREE.Mesh(this.#shared(`collar:${size}`, () => new THREE.CylinderGeometry(12.5 * s, 10 * s, collarH, 28)), metal));
    collar.position.y = len - collarH / 2;
    const lip = T.mesh(new THREE.Mesh(this.#shared(`lip:${size}`, () => new THREE.TorusGeometry(12 * s, 2.2 * s, 8, 28)), metal));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = len - collarH;
    const hand = T.mesh(new THREE.Mesh(this.#shared("hand", () => new THREE.TorusGeometry(21, 3.6, 10, 36)), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 1.6, roughness: 0.4 })));
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
    // and it stands in the light of the painting under it: dimmer in a dark corner, warmer under a lantern
    const lit = this.ctx.lightAt?.(c.x, c.z);
    if (lit) this.light = easeLight(this.light, lit);
    if (this.faceMaterial) {
      const l = this.light ?? [1, 1, 1];
      // the grade is how the card should look on screen; the material multiplies in linear light, and the scene's lights are bright, so it is raised to a power first
      this.faceMaterial.color.setRGB(dim * l[0] ** GAMMA, dim * l[1] ** GAMMA, dim * l[2] ** GAMMA);
    }
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
    this.#poseMarks(c, grow, s);
    this.#poseEmote(c);
  }

  /** The ring of a controlled card and the arrows of an aimed-at one (their token's state, read by the host). */
  #poseMarks(c, grow, s) {
    this.ring.visible = this.halo.visible = c.controlled === true;
    if (this.ring.visible) {
      this.ring.position.set(c.x, 0.9, c.z);
      this.ring.scale.set(this.w * s * 1.75, 190 * grow, 1);
    }
    const colours = Array.isArray(c.targeted) && c.targeted.length ? c.targeted : null;
    this.reticle.visible = !!colours;
    if (!colours) return;
    const key = colours.join("|");
    if (key !== this.reticleKey) { this.reticle.material.map = this.ctx.reticleTexture(colours, this.reticleAspect); this.reticleKey = key; }
    const pulse = 1 + 0.04 * Math.sin((c.breathe - 1) * 400);
    this.reticle.position.set(c.x, c.lift + this.stickLen * c.grip + (this.h * s) / 2, c.z + 30);
    this.reticle.scale.set(this.w * s * 1.3 * pulse, this.h * s * 1.22 * pulse, 1);
  }

  async setEmote(id) {
    if (this.emote) { this.#dropEmote(); }
    this.wanted = id ?? null;
    if (!id) return;
    const tex = await this.ctx.emoteTexture(id);
    if (!tex || this.wanted !== id || this.emote || this.gone) return;     // another was asked for while this one loaded, or the card went
    const sprite = new THREE.Sprite(this.T.add(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })));
    sprite.renderOrder = 50;
    sprite.center.set(0.5, 1 - EMOTE_PIVOT);   // it turns about a point low down, near where it meets its card
    this.emote = { id, sprite };
    this.ctx.scene.add(sprite);
  }

  #poseEmote(c) {
    // the card's emote changed (someone chose one from its menu, or cleared it): the new picture is fetched, once
    const want = c.emote?.id ?? null;
    if (want && want !== (this.wanted ?? null)) this.setEmote(want).catch(() => {});
    if (!this.emote) return;
    const e = c.emote;
    const sprite = this.emote.sprite;
    if (!e || e.id !== this.emote.id) { sprite.visible = false; return; }
    sprite.visible = e.opacity > 0.01;
    sprite.material.opacity = e.opacity;
    const grow = c.grow ?? 1;
    const size = 96 * e.pop * grow;
    // its own motion: a drift (in the emote's own box, a hundred to its width, y down) and a turn (clockwise, in degrees)
    const unit = 0.96 * grow;
    sprite.position.set(
      c.x + 74 * this.s * grow + (e.x ?? 0) * unit,
      c.lift + this.stickLen * c.grip + this.h * this.s * grow * c.breathe + 36 * grow - (e.y ?? 0) * unit - (EMOTE_PIVOT - 0.5) * size,
      c.z + 30
    );
    sprite.scale.set(size, size, 1);
    sprite.material.rotation = -(e.r ?? 0) * DEG;
  }

  /** Take the emote's sprite off the stage and free its material (the picture itself is the backend's, shared by every card). */
  #dropEmote() {
    const { sprite } = this.emote;
    sprite.parent?.remove(sprite);
    this.T.release(sprite.material);
    this.emote = null;
  }

  dispose() {
    this.gone = true;
    this.root.parent?.remove(this.root);
    this.blob?.parent?.remove(this.blob);
    this.ring?.parent?.remove(this.ring);
    this.reticle?.parent?.remove(this.reticle);
    if (this.emote) this.#dropEmote();
    // gone from the stage: its pictures, shapes and materials go from video memory too, not at the scene's end
    this.faceTex = this.backTex = null;
    this.scope?.disposeScope();
  }
}
