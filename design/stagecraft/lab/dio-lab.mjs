/**
 * Diorama lab: the cards standing in a painted scene, in 3D.
 *
 * Mockups for design/stagecraft/diorama.md. The pure halves are diorama.mjs (camera,
 * poses, light, life, particles, tracks) and emotes.mjs (the symbols); this
 * file only draws, in layers:
 *
 *   the painting
 *   .dio-floor   canvas: pools of light, shadows, track paths, on the floor
 *   .dio-back    canvas: light shafts and particles behind the cards
 *   .dio         CSS 3D: furniture cut from the painting at its depth, cards
 *   .dio-front   canvas: particles in front, snow and petals resting on cards
 *   .dio-overlay emotes (flat to the viewer), labels, track readouts
 *
 * ?plate=<name>&t=<ms> freezes the scene at that moment (particles are stepped
 * from zero, so every screenshot is the same); without t it runs live.
 */

import { params, FREEZE, W, H, el, screen, title, deck, note, freeze, NPC, PCS, pc, PLACE_ART, SCENE_ART, STAGE_ART, npcFrame, pcFrame, roundedPath } from "./lab.mjs";
import { coverMap, makeCamera, project, unprojectFloor, floorPoint, yawTo, cheatOut, idle, lightCard, emitter, stepParticles, noise1, rng, trackSlots, standOnTrack, stepAlong, huddlePlaces, tablePlaces, counterPlaces, standoffPlaces, clearDeck, riserFor, standOnLift, deckLip } from "./diorama.mjs";
import { EMOTES, EMOTE_ORDER, WHEEL, emotePose } from "./emotes.mjs";

export const CW = 280;                                  // card width (world px)
export const CH = Math.round((CW - 12) * 1.5 + 66);     // card height: the 2:3 portrait, plate and moulding
const DEG = Math.PI / 180;
const T0 = FREEZE !== null ? FREEZE / 1000 : null;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/* People for the diorama plates who are not in lab.mjs's table. */
const MORE = {
  nadi: { name: "Nadi Obasi", line: "Observer's assistant" },
  sayo: { name: "Sayo Iwamura", line: "Stargazer" },
  faruq: { name: "Faruq Sallah", line: "Harmonica" },
  "school-civil-defence-instructor": { name: "The PE instructor", line: "Civil Defence" },
  kaede: { name: "Kaede Ishimori", line: "Night foreman" },
  joji: { name: "Joji Mabuchi", line: "Pit hand" },
  nkiru: { name: "Nkiru Oduya", line: "Crane driver" }
};
for (const [id, p] of Object.entries(MORE)) if (!NPC[id]) NPC[id] = { id, kind: "npc", src: `${STAGE_ART}${id}.webp`, ...p };
const person = (id) => NPC[id] ?? pc(id);

/* ------------------------------------------------------------------ */
/*  The renderer                                                        */
/* ------------------------------------------------------------------ */

function canvasLayer(root, cls, w = W(), h = H()) {
  const c = el("canvas", cls);
  c.width = w;
  c.height = h;
  root.append(c);
  return c.getContext("2d");
}

/**
 * The deck's outline on this screen (lab.css's .lab-deck: 200px tall, at most
 * 1640px or 70% wide, a 236px round collar standing 62px proud of it). The
 * real one is design/visual-identity.md's "The deck"; the shape is what counts.
 */
export function deckShape() {
  const w = Math.min(1640, W() * 0.7);
  const top = H() - 200;
  return { left: (W() - w) / 2, right: (W() + w) / 2, top, crown: { cx: W() / 2, cy: top - 62 + 118, r: 118 } };
}

/**
 * Build a diorama on `root` (a .lab-screen) from a scene description.
 * Returns { cam, cards, lights, render(t) }.
 */
export function buildDiorama(root, scene) {
  // A diorama fills the screen, or the panel it is given (a split stage).
  const SW = scene.screen?.w ?? W();
  const SH = scene.screen?.h ?? H();
  const lift = ((scene.rig.lift ?? 0) * SH) / 1440;
  const map = coverMap(scene.img[0], scene.img[1], SW, SH, scene.posY ?? 0.5, lift, scene.posX ?? 0.5);
  const cam = makeCamera(scene.rig, map, SW);
  const deck = scene.deck === false ? null : deckShape();
  const bg = root.querySelector(".lab-bg");
  if (bg) {
    bg.classList.add("dio-bg");
    bg.style.backgroundSize = `${scene.img[0] * map.s}px ${scene.img[1] * map.s}px`;
    bg.style.backgroundPosition = `${map.ox}px ${map.oy}px`;
    bg.style.backgroundRepeat = "no-repeat";
    if (scene.bgFilter) bg.style.filter = scene.bgFilter;
  }
  // The apron: lifting the painting clear of the deck leaves a strip along the
  // bottom; the painting's own floor, mirrored and dimmed, carries on into it.
  if (lift > 0 && scene.art) {
    const apron = el("div", "dio-apron");
    Object.assign(apron.style, {
      height: `${Math.ceil(lift) + 2}px`,
      backgroundImage: `url("${scene.art}")`,
      backgroundSize: `${scene.img[0] * map.s}px ${scene.img[1] * map.s}px`,
      backgroundPosition: `${map.ox}px ${-(scene.img[1] * map.s - Math.ceil(lift) - 2)}px`
    });
    root.append(apron);
  }
  const floor = canvasLayer(root, "dio-layer dio-floor", SW, SH);
  const glow = canvasLayer(root, "dio-layer dio-glow", SW, SH);
  const back = canvasLayer(root, "dio-layer dio-back", SW, SH);
  const stage = el("div", "dio");
  Object.assign(stage.style, { perspective: `${cam.f}px`, perspectiveOrigin: `${cam.cx}px ${cam.cy}px` });
  const world = el("div", "dio__world");
  stage.append(world);
  root.append(stage);
  const front = canvasLayer(root, "dio-layer dio-front", SW, SH);
  const overlay = el("div", "dio-overlay");
  root.append(overlay);
  if (scene.vignette !== false) root.append(el("div", `dio-vignette${scene.vignetteHeavy ? " is-heavy" : ""}`));
  if (scene.tint) {
    const tint = el("div", "dio-tint");
    tint.style.background = scene.tint;
    root.append(tint);
  }

  // A point on the floor, from where it appears in the painting.
  const onFloor = (fx, fy) => floorPoint(cam, fx, fy);
  // A point in the air: where it appears in the painting, and the floor point beneath it.
  const inAir = (fx, fy, floorFy, floorFx = fx) => {
    const fp = onFloor(floorFx, floorFy);
    const k = cam.f / (cam.f - fp.z);
    return { x: cam.cx + (map.x(fx) - cam.cx) / k, y: cam.cy + (map.y(fy) - cam.cy) / k, z: fp.z };
  };

  const lights = (scene.lights ?? []).map((L, i) => ({ ...L, ...inAir(L.at[0], L.at[1], L.below, L.belowX ?? L.at[0]), seed: i + 1 }));

  // A track: slots on the floor, a sign over each station, cards standing on their slot.
  if (scene.track) {
    const slots = trackSlots(scene.track.points.map(([fx, fy]) => onFloor(fx, fy)), scene.track.labels);
    scene.tracksResolved = [{ slots }];
    const signUp = (scene.track.signHeight ?? 1.25) * CH * (scene.cardScale ?? 1);
    scene.labels = [
      ...(scene.labels ?? []),
      ...slots.filter((s) => s.label).map((s) => ({ world: { x: s.x, z: s.z, y: cam.floorY - signUp }, html: s.label, cls: s.index <= (scene.track.done ?? -1) ? "is-done" : "" }))
    ];
    const positions = {};
    for (const c of scene.cards ?? []) if (c.slot !== undefined) positions[c.id] = c.slot;
    const stand = standOnTrack(slots, positions, 0.55 * CW * (scene.cardScale ?? 1));
    for (const c of scene.cards ?? []) if (stand[c.id]) c.place = { x: stand[c.id].x, z: stand[c.id].z };
  }
  // Walking from one place to another, as a paper doll steps.
  for (const c of scene.cards ?? []) {
    if (c.walkFrom) c.walk = { from: onFloor(...c.walkFrom), to: onFloor(...c.walkTo), t0: c.walkT0 ?? 0, dur: c.walkDur ?? 2 };
  }

  // Furniture cut out of the painting, set at its own depth. Each is a canvas
  // holding that piece of the painting with the room's light laid on it (the
  // lamp's pool on the table, the cone through it), so a cut-out never shows
  // as a darker patch where the light stops.
  const painting = scene.art ? Object.assign(new Image(), { src: scene.art }) : null;
  const bgFilter = scene.bgFilter ?? "saturate(0.92) brightness(0.86)";
  const occluders = (scene.occluders ?? []).map((O) => {
    const fp = onFloor(O.x ?? 0.5, O.base);
    const occ = el("canvas", "dio-occ");
    occ.width = SW;
    occ.height = SH;
    Object.assign(occ.style, {
      width: `${SW}px`, height: `${SH}px`,
      transformOrigin: `${cam.cx}px ${cam.cy}px`,
      transform: `translateZ(${fp.z.toFixed(1)}px) scale(${((cam.f - fp.z) / cam.f).toFixed(5)})`
    });
    world.append(occ);
    return { ctx: occ.getContext("2d"), poly: O.poly.map(([fx, fy]) => [map.x(fx), map.y(fy)]) };
  });
  // The painting, filtered once: a live scene redraws its cut-outs every frame.
  let filtered = null;
  const paintOccluders = () => {
    if (!occluders.length || !painting) return;
    if (!painting.complete) { painting.onload = paintOccluders; return; }
    if (!filtered) {
      filtered = document.createElement("canvas");
      filtered.width = SW;
      filtered.height = SH;
      const f = filtered.getContext("2d");
      f.filter = bgFilter;
      f.drawImage(painting, map.ox, map.oy, scene.img[0] * map.s, scene.img[1] * map.s);
    }
    for (const o of occluders) {
      const c = o.ctx;
      c.clearRect(0, 0, SW, SH);
      c.save();
      c.beginPath();
      o.poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.clip();
      c.drawImage(filtered, 0, 0);
      c.drawImage(floor.canvas, 0, 0);
      c.drawImage(glow.canvas, 0, 0);
      c.restore();
    }
  };

  // The wings: two racks either side of the deck where the party's cards wait,
  // half size, handles slotted in. They belong to the screen, not the painting,
  // so a wing card is placed in screen space (z = 0, where the camera does not scale).
  const dk = deckShape();
  const wingSpot = (c) => {
    const left = c.wing.side === "left";
    const pad = 30;
    const flank = left ? dk.left : SW - dk.right;
    const slotW = (flank - pad * 2) / 3;
    const cx = (left ? 0 : dk.right) + pad + slotW * (c.wing.slot + 0.5);
    const footY = SH - 64 - 22;
    return { x: cx, s: (slotW * 0.86) / CW, lift: cam.floorY - footY };
  };
  if ((scene.cards ?? []).some((c) => c.wing)) {
    for (const side of ["left", "right"]) {
      const rack = el("div", `dio-rack dio-rack--${side}`, `<span>The wings</span>`);
      Object.assign(rack.style, side === "left" ? { left: "12px", width: `${dk.left - 24}px` } : { left: `${dk.right + 12}px`, width: `${SW - dk.right - 24}px` });
      root.append(rack);
    }
  }

  // Cards.
  const cards = (scene.cards ?? []).map((c, i) => {
    const wing = c.wing ? wingSpot(c) : null;
    const fp = wing ? { x: wing.x, z: c.hover ? 30 : 0 } : { ...(c.place ?? onFloor(c.at[0], c.at[1])) };
    const s = wing ? wing.s * (c.hover ?? 1) : (scene.cardScale ?? 1) * (c.size ?? 1);
    // Standing on something painted: a stool, a crate, a step.
    const standLift = c.standOn !== undefined ? standOnLift(cam, c.at[1], c.standOn) : 0;
    // The deck is the stage's front edge: a card that would stand behind it is
    // walked back until its foot shows. Said out loud, because it means the
    // scene asked for a place the screen can't give.
    if (deck && !standLift && !c.walkFrom && !wing) {
      const z = clearDeck(cam, deck, fp.x, fp.z, { w: CW * s, below: 12 * s });
      if (z !== fp.z) {
        console.warn(`diorama: ${c.id} walked back ${Math.round(fp.z - z)}px to clear the deck`);
        fp.z = z;
      }
    }
    const who = person(c.id);
    const node = el("div", `dio-card${c.kind === "pc" || who.kind === "pc" ? " is-pc" : ""}`);
    node.style.width = `${CW}px`;
    node.style.height = `${CH}px`;
    const body = el("div", "dio-card__body");
    const face = el("div", "dio-card__face");
    const fig = who.kind === "pc" ? pcFrame(who, { w: CW, seat: c.seat ?? "player", own: c.own }) : npcFrame(who, { w: CW });
    // The room's colour first, then its light on top, so a lamp's colour stays its own.
    face.append(fig, el("div", "dio-card__ambient"), el("div", "dio-card__lit"), el("div", "dio-card__shade"), el("div", "dio-card__rim"), el("div", "dio-card__sheen"), el("div", "dio-card__haze"));
    if (c.waterline) {
      const water = el("div", "dio-card__water", `<svg viewBox="0 0 280 20" preserveAspectRatio="none"><path d="" /></svg>`);
      water.style.top = `${(1 - c.waterline) * 100}%`;
      face.append(water);
    }
    const backFace = el("div", "dio-card__back", `<span class="lab-puppet__label">${who.name}</span>`);
    body.append(face, backFace, el("div", "dio-card__edge dio-card__edge--l"), el("div", "dio-card__edge dio-card__edge--r"), el("div", "dio-card__base"));
    // A wet or polished floor: the card mirrored in its own plane, below its foot.
    if (scene.reflect && !c.waterline) {
      const mirror = el("div", "dio-card__reflect");
      mirror.append(fig.cloneNode(true));
      mirror.style.opacity = String(scene.reflect);
      body.append(mirror);
    }
    if (who.kind === "pc" && who.who) body.style.setProperty("--who", who.who);
    if (c.hidden) node.classList.add("is-hidden");
    if (c.out) node.classList.add("is-out");
    if (c.showKeys) node.classList.add("show-keys");
    if (wing) node.classList.add("is-wing");
    if (c.held) node.classList.add("is-held");
    // The handle: a card in a hand, or slotted in the wings, shows its grip.
    if (c.held || c.wing || c.rod) body.append(el("div", "dio-card__rod", "<i></i>"));
    // A newcomer's portrait is still developing: an iris opening on the picture.
    if (c.iris !== undefined) fig.querySelector(".bi-frame__art").style.clipPath = `circle(${(c.iris * 100).toFixed(0)}% at 50% 42%)`;
    node.append(body);
    world.append(node);
    return { ...c, who, node, face, fig, x: fp.x, z: fp.z, s, lift: (c.lift ?? 0) + standLift + (wing ? wing.lift : 0), baseYaw: c.yaw ?? 0, seed: c.seed ?? 1000 + i * 137, floorY: cam.floorY, settled: [] };
  });

  // Risers: a card behind a cut-out is raised until its face clears it.
  const cutouts = (scene.occluders ?? []).map((O) => ({
    z: onFloor(O.x ?? 0.5, O.base).z,
    x0: Math.min(...O.poly.map(([fx]) => map.x(fx))), x1: Math.max(...O.poly.map(([fx]) => map.x(fx))),
    top: Math.min(...O.poly.map(([, fy]) => map.y(fy))), bottom: Math.max(...O.poly.map(([, fy]) => map.y(fy)))
  }));
  const riserOf = (c) => {
    const inFront = cutouts.filter((o) => o.z > c.z + 1);
    if (!inFront.length || c.noRiser) return 0;
    const foot = project(cam, c.x, cam.floorY - c.lift, c.z);
    const h = CH * c.s * foot.k;
    const w = CW * c.s * foot.k;
    return riserFor({ x0: foot.sx - w / 2, x1: foot.sx + w / 2, footY: foot.sy, h }, inFront) / foot.k;
  };
  for (const c of cards) c.riser = riserOf(c);

  // Particles, from regions marked on the painting at a depth.
  const emitters = (scene.particles ?? []).map((P, i) => {
    const fp = onFloor(P.depthAt[0], P.depthAt[1]);
    const k = cam.f / (cam.f - fp.z);
    const wx = (fx) => cam.cx + (map.x(fx) - cam.cx) / k;
    const wy = (fy) => cam.cy + (map.y(fy) - cam.cy) / k;
    const spread = P.spread ?? 150;
    return emitter({ kind: P.kind, density: P.density ?? 1, region: { x0: wx(P.box[0]), x1: wx(P.box[2]), y0: wy(P.box[1]), y1: wy(P.box[3]), z0: fp.z - spread, z1: fp.z + spread }, colour: P.colour, over: P.over, core: P.core }, 77 + i * 31);
  });

  const speaker = cards.find((c) => c.id === scene.speaker) ?? null;
  const obstacles = () => cards.map((c) => ({ id: c.id, x: c.pose?.x ?? c.x, z: c.pose?.z ?? c.z, floorY: cam.floorY - (c.pose?.lift ?? 0), w: CW * c.s, h: CH * c.s }));

  /** Pose and light every card for time t. */
  const poseCards = (t) => {
    for (const c of cards) {
      const speakerYaw = speaker && speaker !== c ? Math.sign(speaker.x - c.x) * (c.listens === false ? 0 : 1) : null;
      const life = c.still ? { breathe: 1, lean: 0, pitch: 0, lift: 0, yaw: 0 } : idle(t, c.seed, c.demeanour ?? "calm", { speakerYaw });
      let x = c.x;
      let z = c.z;
      let lift = life.lift + (c.lift ?? 0) + (c.riser ?? 0);
      let rock = 0;
      if (c.walk) {
        const u = Math.max(0, Math.min(1, (t - c.walk.t0) / c.walk.dur));
        const s = stepAlong(c.walk.from, c.walk.to, u);
        x = s.x; z = s.z; lift += s.lift; rock = s.rock;
      }
      if (c.hopAt !== undefined) {
        const u = (t - c.hopAt) / 0.45;
        if (u > 0 && u < 1) lift += 70 * 4 * u * (1 - u);
      }
      if (c.bob) lift += c.bob * Math.sin(t * 1.6 + c.seed);
      // Conditions you can see: a tremble, a wobble off balance, a sag.
      let tremble = 0;
      if (c.tremble) tremble += c.tremble * noise1(t * 26, c.seed + 5);
      if (c.wobble) tremble += c.wobble * Math.sin(t * 5.2 + c.seed);
      // Turning round: a quick half-turn with a little hop, like a paper doll.
      let baseYaw = c.baseYaw;
      if (c.turnAt !== undefined && t > c.turnAt) {
        const u = Math.min(1, (t - c.turnAt) / 0.45);
        const e = u * u * (3 - 2 * u);
        baseYaw = c.baseYaw + (c.turnTo - c.baseYaw) * e;
        lift += 22 * Math.sin(Math.PI * u);
      }
      const yaw = baseYaw + life.yaw;
      const lean = (c.lean ?? 0) + life.lean + rock + tremble;
      const pitch = (c.pitch ?? 0) + life.pitch;
      c.pose = { x, z, yaw, lean, pitch, lift, breathe: life.breathe };
      const top = cam.floorY - CH - lift;
      c.node.style.transform = `translate3d(${(x - CW / 2).toFixed(1)}px, ${top.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${yaw.toFixed(2)}deg) rotateZ(${lean.toFixed(2)}deg) rotateX(${(-pitch).toFixed(2)}deg) scale(${c.s.toFixed(3)}, ${(c.s * life.breathe * (c.sag ?? 1)).toFixed(4)})`;
      if (c.opacity !== undefined) c.node.style.opacity = String(c.opacity);
      // Light.
      const L = lightCard({ x, z, yaw, floorY: cam.floorY - lift }, lights, { t, ambient: scene.ambient ?? 0.55, cardH: CH * c.s });
      c.light = L;
      const k = cam.f / (cam.f - z);
      const ang = Math.atan2(-L.washLx, L.washLy) / DEG;
      const f = c.face.style;
      f.setProperty("--b", (L.bright * (c.dim ?? 1)).toFixed(3));
      const washA = Math.min(0.9, L.washPower * (scene.washGain ?? 2.4));
      f.setProperty("--lit", `linear-gradient(${ang.toFixed(1)}deg, ${rgba(L.wash, washA)}, ${rgba(L.wash, washA * 0.5)} 45%, ${rgba(L.wash, 0)} 92%)`);
      if (scene.cardTint) { f.setProperty("--amb-c", scene.cardTint[0]); f.setProperty("--amb-a", String(scene.cardTint[1])); }
      // The far side of the face falls into shadow; a light behind outlines the edges.
      f.setProperty("--shade", L.shade > 0.02 ? `linear-gradient(${ang.toFixed(1)}deg, rgba(0,0,0,0) 26%, rgba(10,7,5,${L.shade.toFixed(3)}) 100%)` : "none");
      const rims = [];
      if (L.rim > 0.02) {
        const col = rgba(L.rimColour, Math.min(0.95, L.rim));
        const w = Math.round(10 + 12 * L.rim);
        const blur = Math.round(18 + 16 * L.rim);
        if (L.rimSide <= 0) rims.push(`inset ${w}px 0 ${blur}px -6px ${col}`);
        if (L.rimSide >= 0) rims.push(`inset ${-w}px 0 ${blur}px -6px ${col}`);
        if (L.rimTop > 0.2) rims.push(`inset 0 ${Math.round(w * L.rimTop)}px ${blur}px -6px ${col}`);
      }
      f.setProperty("--rim", rims.length ? rims.join(", ") : "none");
      if (c.waterline) {
        const wave = c.face.querySelector(".dio-card__water path");
        let d = "M0 10";
        for (let x = 0; x <= 280; x += 20) d += ` L${x} ${(10 + 3.2 * Math.sin(x / 22 + t * 2.4 + c.seed)).toFixed(2)}`;
        wave.setAttribute("d", `${d} L280 20 L0 20 Z`);
      }
      f.setProperty("--sheen", `${L.sheen.toFixed(1)}%`);
      f.setProperty("--sheen-a", (0.04 + L.sheenPower * 0.38).toFixed(3));
      f.setProperty("--haze-a", ((scene.haze ?? 0.25) * Math.max(0, 1 - k) * 1.6).toFixed(3));
      if (scene.hazeColour) f.setProperty("--haze-c", scene.hazeColour);
      // A card in the wings is part of the screen, not of the scene: never lit like scenery.
      if (c.flat || c.wing) {
        for (const [k, v] of [["--b", "1.04"], ["--lit", "none"], ["--shade", "none"], ["--rim", "none"], ["--haze-a", "0"], ["--amb-a", "0"], ["--sheen-a", "0"]]) f.setProperty(k, v);
      }
      c.node.classList.toggle("is-speaking", c === speaker || !!c.glow);
    }
  };

  /** Pools, shafts and shadows on the floor; cones behind; particles either side. */
  const paintLight = (t) => {
    floor.clearRect(0, 0, SW, SH);
    glow.clearRect(0, 0, SW, SH);
    back.clearRect(0, 0, SW, SH);
    front.clearRect(0, 0, SW, SH);
    // Pools of light on the floor.
    for (const L of lights) {
      if (!L.pool) continue;
      const flick = L.flicker ? 1 + L.flicker * noise1(t * (L.flickerHz ?? 7), L.seed) : 1;
      const c = project(cam, L.x, cam.floorY, L.z);
      const rx = L.pool * c.k;
      const ry = rx * Math.max(0.12, (c.sy - cam.cy) / (cam.floorY - cam.cy) * 0.55);
      floor.save();
      floor.globalCompositeOperation = "screen";
      floor.translate(c.sx, c.sy);
      floor.scale(1, ry / rx);
      const g = floor.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, rgba(L.colour, 0.42 * flick * (L.poolPower ?? 1)));
      g.addColorStop(1, rgba(L.colour, 0));
      floor.fillStyle = g;
      floor.beginPath();
      floor.arc(0, 0, rx, 0, Math.PI * 2);
      floor.fill();
      floor.restore();
    }
    // Shafts of light (windows), drawn in screen space behind the cards.
    for (const S of scene.shafts ?? []) {
      glow.save();
      glow.globalCompositeOperation = "screen";
      const pts = S.poly.map(([fx, fy]) => [map.x(fx), map.y(fy)]);
      const g = glow.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
      const a = S.alpha * (1 + 0.06 * noise1(t * 0.5, 9));
      g.addColorStop(0, rgba(S.colour, a));
      g.addColorStop(1, rgba(S.colour, 0));
      glow.fillStyle = g;
      glow.filter = "blur(10px)";
      glow.beginPath();
      pts.forEach(([x, y], i) => (i ? glow.lineTo(x, y) : glow.moveTo(x, y)));
      glow.closePath();
      glow.fill();
      glow.restore();
    }
    // Cones under hanging lamps.
    for (const L of lights) {
      if (!L.cone) continue;
      const top = project(cam, L.x, L.y, L.z);
      const bottom = project(cam, L.x, cam.floorY, L.z);
      const spread = L.cone * top.k;
      glow.save();
      glow.globalCompositeOperation = "screen";
      glow.filter = "blur(8px)";
      const g = glow.createLinearGradient(top.sx, top.sy, top.sx, bottom.sy);
      g.addColorStop(0, rgba(L.colour, 0.30));
      g.addColorStop(1, rgba(L.colour, 0.02));
      glow.fillStyle = g;
      glow.beginPath();
      glow.moveTo(top.sx - spread * 0.18, top.sy);
      glow.lineTo(top.sx + spread * 0.18, top.sy);
      glow.lineTo(bottom.sx + spread, bottom.sy);
      glow.lineTo(bottom.sx - spread, bottom.sy);
      glow.closePath();
      glow.fill();
      glow.restore();
    }
    // Shadows: each card throws one along the floor, away from its strongest light.
    for (const c of cards) {
      // A card on a hidden riser throws its shadow behind the furniture: none.
      if (c.waterline || c.noShadow || c.riser > 0) continue;
      const P = c.pose;
      const s = c.light.shadow;
      const yaw = P.yaw * DEG;
      const half = (CW * c.s / 2) * 0.92;
      const ax = { x: P.x - Math.cos(yaw) * half, z: P.z + Math.sin(yaw) * half };
      const bx = { x: P.x + Math.cos(yaw) * half, z: P.z - Math.sin(yaw) * half };
      const lift = P.lift;
      // Contact shadow under the base.
      const c0 = project(cam, P.x, cam.floorY, P.z);
      floor.save();
      floor.globalCompositeOperation = "multiply";
      floor.filter = `blur(${Math.max(2, 6 * c0.k)}px)`;
      floor.fillStyle = `rgba(0,0,0,${Math.max(0.12, 0.55 - lift / 160)})`;
      floor.beginPath();
      floor.ellipse(c0.sx, c0.sy, CW * c.s * 0.55 * c0.k * (1 + lift / 200), 16 * c.s * c0.k, 0, 0, Math.PI * 2);
      floor.fill();
      if (s) {
        const len = s.length;
        const far = (p) => ({ x: p.x + s.dirX * len, z: p.z + s.dirZ * len });
        const quad = [ax, bx, far(bx), far(ax)].map((p) => project(cam, p.x, cam.floorY, p.z));
        const g = floor.createLinearGradient(c0.sx, c0.sy, (quad[2].sx + quad[3].sx) / 2, (quad[2].sy + quad[3].sy) / 2);
        g.addColorStop(0, `rgba(0,0,0,${(s.strength * Math.max(0.2, 1 - lift / 220)).toFixed(3)})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        floor.fillStyle = g;
        floor.filter = `blur(${Math.max(3, 10 * c0.k)}px)`;
        floor.beginPath();
        quad.forEach((q, i) => (i ? floor.lineTo(q.sx, q.sy) : floor.moveTo(q.sx, q.sy)));
        floor.closePath();
        floor.fill();
      }
      floor.restore();
    }
    // A dying card: a slow red pulse on the floor round it.
    for (const c of cards) {
      if (!c.pulse) continue;
      const q = project(cam, c.pose.x, cam.floorY, c.pose.z - CH * c.s * 0.4);
      const a = 0.42 + 0.18 * Math.sin(t * 4.2);
      const rx = CW * c.s * 1.1 * q.k;
      floor.save();
      floor.globalCompositeOperation = "source-over";
      floor.translate(q.sx, q.sy);
      floor.scale(1, 0.32);
      const g = floor.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(214,44,30,${a})`);
      g.addColorStop(0.6, `rgba(214,44,30,${a * 0.45})`);
      g.addColorStop(1, "rgba(214,44,30,0)");
      floor.fillStyle = g;
      floor.beginPath();
      floor.arc(0, 0, rx, 0, Math.PI * 2);
      floor.fill();
      floor.restore();
    }
    // Tracks: a dashed path, brass studs and their numbers.
    for (const tr of scene.tracksResolved ?? []) paintTrack(floor, tr);
    for (const z of scene.zones ?? []) paintZone(floor, z, t);
    for (const g of scene.ghosts ?? []) paintGhost(floor, g);
    for (const d of scene.dots ?? []) paintDot(floor, d);
    for (const m of scene.marks ?? []) paintMarks(floor, m);
    // Particles.
    const split = scene.particleSplit ?? (cards.length ? cards.reduce((s, c) => s + c.z, 0) / cards.length : -800);
    for (const em of emitters) {
      // A hot point at the source (a weld, a brazier): a flickering white-gold core.
      if (em.core) {
        const R = em.region;
        const q = project(cam, (R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, (R.z0 + R.z1) / 2);
        const fl = 0.75 + 0.25 * noise1(t * 23, 5);
        const r = 80 * q.k * fl;
        front.save();
        front.globalCompositeOperation = "lighter";
        const g = front.createRadialGradient(q.sx, q.sy, 0, q.sx, q.sy, r);
        g.addColorStop(0, `rgba(255,250,235,${0.95 * fl})`);
        g.addColorStop(0.18, `rgba(255,214,140,${0.7 * fl})`);
        g.addColorStop(1, "rgba(255,140,60,0)");
        front.fillStyle = g;
        front.beginPath();
        front.arc(q.sx, q.sy, r, 0, Math.PI * 2);
        front.fill();
        front.restore();
      }
      for (const p of em.particles) {
        const q = project(cam, p.x, p.y, p.z);
        drawParticle(p.z < split ? back : front, em, p, q, t, lights);
      }
      for (const sp of em.splashes) {
        const q = project(cam, sp.x, sp.y, sp.z);
        front.save();
        if (sp.glint) {
          // A spark striking a card: a short white star.
          const a = 1 - sp.age / 0.25;
          const r = (6 + 14 * a) * q.k;
          front.globalCompositeOperation = "lighter";
          front.strokeStyle = `rgba(255,236,190,${0.95 * a})`;
          front.lineWidth = 1.6;
          front.shadowColor = "rgba(255,170,80,0.9)";
          front.shadowBlur = 10;
          front.beginPath();
          front.moveTo(q.sx - r, q.sy); front.lineTo(q.sx + r, q.sy);
          front.moveTo(q.sx, q.sy - r * 0.7); front.lineTo(q.sx, q.sy + r * 0.7);
          front.stroke();
        } else {
          front.strokeStyle = `rgba(210,230,255,${0.6 * (1 - sp.age / 0.25)})`;
          front.lineWidth = 1.2;
          front.beginPath();
          front.ellipse(q.sx, q.sy, (4 + sp.age * 40) * q.k, (1.5 + sp.age * 10) * q.k, 0, Math.PI, 0);
          front.stroke();
        }
        front.restore();
      }
      // Snow resting on a card builds up into one white cap along its top
      // edge, thicker where more has landed; petals rest one by one.
      if (em.kind === "snow") {
        for (const c of cards) paintSnowCap(front, c, em.settled.filter((s) => s.card === c.id));
      } else {
        for (const s of em.settled) {
          const c = cards.find((cc) => cc.id === s.card);
          if (!c) continue;
          const P = c.pose;
          const q = project(cam, P.x + s.dx * Math.cos(P.yaw * DEG), cam.floorY - CH * c.s * P.breathe - P.lift, P.z - s.dx * Math.sin(P.yaw * DEG));
          drawPetal(front, q.sx, q.sy - 2, s.size * q.k, s.spin, s.hue);
        }
      }
    }
  };

  /** A cap of settled snow along a card's top edge. */
  function paintSnowCap(ctx, c, flakes) {
    // `snowCap` says how long it has been snowing: a depth to start from, and
    // how much each flake that lands adds (a cap is drawn, not simulated).
    const cap = scene.snowCap ?? { start: 0, gain: 1 };
    if (!flakes.length && !cap.start) return;
    const P = c.pose;
    const half = (CW * c.s) / 2;
    const top = cam.floorY - CH * c.s * P.breathe - P.lift;
    const cos = Math.cos(P.yaw * DEG);
    const sin = Math.sin(P.yaw * DEG);
    // Depth along the edge: a histogram of where flakes landed, smoothed.
    const N = 24;
    const depth = Array.from({ length: N + 1 }, (_, j) => cap.start * (0.85 + 0.3 * noise1(j * 0.45, c.seed)));
    for (const f of flakes) {
      const u = Math.max(0, Math.min(1, (f.dx + half) / (2 * half)));
      for (let j = 0; j <= N; j++) depth[j] += cap.gain * f.size * 0.55 * Math.exp(-((((j / N - u) * N) / 2.2) ** 2));
    }
    const at = (u, up) => project(cam, P.x + (u * 2 - 1) * half * cos, top - up, P.z - (u * 2 - 1) * half * sin);
    ctx.save();
    ctx.fillStyle = "rgba(246,249,255,0.97)";
    ctx.shadowColor = "rgba(10,20,40,0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    const a = at(0, 0);
    ctx.moveTo(a.sx, a.sy + 1);
    for (let j = 0; j <= N; j++) {
      const taper = Math.sin((Math.PI / 2) * Math.min(1, (j / N) * 6, ((N - j) / N) * 6));
      const d = Math.min(26, depth[j]) * taper ** 0.5;
      const q = at(j / N, d);
      ctx.lineTo(q.sx, q.sy);
    }
    const b = at(1, 0);
    ctx.lineTo(b.sx, b.sy + 1);
    // A little overhang down the front edge.
    for (let j = N; j >= 0; j--) {
      const q = at(j / N, -Math.min(5, depth[j] * 0.25));
      ctx.lineTo(q.sx, q.sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * A zone: a dashed outline on the painting around a door, a window or a stretch
   * of floor, with a dark halo so it reads on any picture. The one a held card is
   * over is orange and its dashes march. (Where cards stand is the floor below it.)
   */
  function paintZone(ctx, z, t) {
    const pts = z.poly.map(([fx, fy]) => [map.x(fx), map.y(fy)]);
    const path = new Path2D(roundedPath(pts, z.round ?? 18));
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 6;
    ctx.stroke(path);
    ctx.fillStyle = z.target ? "rgba(232,134,58,0.14)" : "rgba(10,10,8,0.16)";
    ctx.fill(path);
    ctx.setLineDash([12, 9]);
    ctx.lineDashOffset = z.target ? -t * 46 : 0;
    ctx.strokeStyle = z.target ? "#e8863a" : "rgba(240,232,210,0.88)";
    ctx.lineWidth = z.target ? 3 : 2.2;
    if (z.target) { ctx.shadowColor = "rgba(232,134,58,0.7)"; ctx.shadowBlur = 12; }
    ctx.stroke(path);
    ctx.restore();
  }

  /** Where a held card will land: its footprint on the floor and its dashed outline standing there. */
  function paintGhost(ctx, g) {
    const fp = onFloor(g.at[0], g.at[1]);
    const sc = (scene.cardScale ?? 1) * (g.size ?? 1);
    const foot = project(cam, fp.x, cam.floorY, fp.z);
    const w = CW * sc * foot.k;
    const h = CH * sc * foot.k;
    const rgb = g.tone === "cyan" ? "79,200,216" : "232,134,58";
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = `rgba(${rgb},0.92)`;
    ctx.fillStyle = `rgba(${rgb},0.12)`;
    ctx.shadowColor = `rgba(${rgb},0.6)`;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(foot.sx - w / 2 - 6, foot.sy - h - 6, w + 12, h + 12, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(foot.sx, foot.sy, w * 0.56, 11 * foot.k + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** A place on the grid: shown while anything is held, so everything lands in line. */
  function paintDot(ctx, d) {
    const fp = onFloor(d[0], d[1]);
    const q = project(cam, fp.x, cam.floorY, fp.z);
    ctx.save();
    ctx.fillStyle = "rgba(233,226,204,0.6)";
    ctx.beginPath();
    ctx.ellipse(q.sx, q.sy, 10 * q.k + 1.5, 4.2 * q.k + 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** The debut's registration marks: four brass corners on the floor where a card will land. */
  function paintMarks(ctx, m) {
    const fp = onFloor(m.at[0], m.at[1]);
    const sc = (scene.cardScale ?? 1) * (m.size ?? 1);
    const hw = (CW * sc * 0.56);
    const hd = 70 * sc;
    const corners = [[-hw, -hd, 1, 1], [hw, -hd, -1, 1], [-hw, hd, 1, -1], [hw, hd, -1, -1]].map(([dx, dz, ax, az]) => ({ p: { x: fp.x + dx, z: fp.z + dz }, ax, az }));
    ctx.save();
    ctx.strokeStyle = "#e6c98d";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(230,201,141,0.8)";
    ctx.shadowBlur = 10;
    for (const { p, ax, az } of corners) {
      const a = project(cam, p.x, cam.floorY, p.z);
      const b = project(cam, p.x + ax * 52 * sc, cam.floorY, p.z);
      const c2 = project(cam, p.x, cam.floorY, p.z + az * 34 * sc);
      ctx.beginPath();
      ctx.moveTo(b.sx, b.sy);
      ctx.lineTo(a.sx, a.sy);
      ctx.lineTo(c2.sx, c2.sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintTrack(ctx, tr) {
    const pts = tr.slots.map((s) => project(cam, s.x, s.y ?? cam.floorY, s.z));
    ctx.save();
    ctx.strokeStyle = "rgba(244,236,214,0.85)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
    ctx.stroke();
    ctx.setLineDash([]);
    pts.forEach((p, i) => {
      const r = 30 * p.k;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(p.sx + 3, p.sy + 4, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(p.sx, p.sy - r, p.sx, p.sy + r);
      g.addColorStop(0, "#e6c98d");
      g.addColorStop(1, "#6a5124");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1b140c";
      ctx.font = `700 ${Math.round(15 * p.k + 6)}px Chakra Petch, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i === 0 ? "S" : i === pts.length - 1 ? "F" : i), p.sx, p.sy + 1);
    });
    ctx.restore();
  }

  /** Emotes, labels: flat to the viewer, over everything. */
  const paintOverlay = (t) => {
    overlay.replaceChildren();
    const put = (anchor, e, i) => {
      const def = EMOTES[e.id];
      if (!def) return;
      const age = t - (e.t0 ?? 0);
      if (age < 0 || age > (e.life ?? 99)) return;
      const pose = emotePose(def.motion, age, i * 13 + 5, e.life ?? 99);
      const size = Math.max(62, Math.min(150, 128 * anchor.k)) * (e.scale ?? 1);
      const node = el("div", "dio-emote", def.svg);
      Object.assign(node.style, {
        left: `${anchor.sx - size / 2}px`, top: `${anchor.sy - size / 2}px`, width: `${size}px`, height: `${size}px`,
        opacity: pose.o.toFixed(3),
        transform: `translate(${(pose.x * anchor.k).toFixed(1)}px, ${(pose.y * anchor.k).toFixed(1)}px) rotate(${pose.r.toFixed(1)}deg) scale(${pose.s.toFixed(3)})`
      });
      overlay.append(node);
    };
    cards.forEach((c, i) => {
      const list = c.emotes ?? (c.emote ? [c.emote] : []);
      if (!list.length) return;
      const P = c.pose;
      const side = c.emoteSide ?? 1;
      const back = -(P.pitch ?? 0) * DEG; // lying back: the top goes away and down
      const h = CH * c.s * P.breathe;
      const a = project(cam, P.x + side * CW * c.s * 0.34 * Math.cos(P.yaw * DEG), cam.floorY - h * Math.cos(back) - P.lift - 26, P.z - h * Math.sin(back) - side * CW * c.s * 0.34 * Math.sin(P.yaw * DEG));
      list.forEach((e, j) => put(a, e, i * 7 + j));
    });
    for (const [i, s] of (scene.sceneryEmotes ?? []).entries()) {
      const a = { sx: map.x(s.at[0]), sy: map.y(s.at[1]), k: s.k ?? 0.7 };
      put(a, s.emote, 50 + i);
    }
    const parts = [
      ...(scene.links ?? []).map((L) => linkSvg(L, t)),
      ...(scene.ranges ?? []).map((R) => rangeSvg(R)),
      ...(scene.arrows ?? []).map((A) => arrowSvg(A)),
      ...(scene.bonks ?? []).map((B) => bonkSvg(B)),
      ...(scene.trails ?? []).map((T) => trailSvg(T))
    ].filter(Boolean);
    if (parts.length) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "dio-links");
      svg.setAttribute("width", SW);
      svg.setAttribute("height", SH);
      svg.innerHTML = `<defs><filter id="dio-glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs>` + parts.join("");
      overlay.prepend(svg);
    }
    // Zone labels: the name in the display type, a hint in small capitals under it.
    for (const z of scene.zones ?? []) {
      const lab = el("div", `bi-zone__label bi-zone${z.target ? " is-target" : ""}`, `<span class="bi-zone__name">${z.name}</span><span class="bi-zone__hint">${z.hint}</span>`);
      Object.assign(lab.style, { left: `${map.x(z.label[0])}px`, top: `${map.y(z.label[1])}px` });
      overlay.append(lab);
    }
    // What a card carries: a badge, a raised hand, a count, a caption under it, speaking bars.
    const tag = (a, cls, html, { dx = 0, dy = 0 } = {}) => {
      const n = el("div", cls, html);
      const sc = Math.max(0.8, Math.min(1.1, a.k));
      Object.assign(n.style, { left: `${a.sx + dx}px`, top: `${a.sy + dy}px`, transform: `translate(-50%, -50%) scale(${sc.toFixed(3)})` });
      overlay.append(n);
    };
    for (const c of cards) {
      if (!c.pose) continue;
      if (c.badge) tag(onCard(c, c.badge.up ?? 0.22, c.badge.side ?? 0.3), `dio-pill ${c.badge.tone ?? ""}`, c.badge.text);
      if (c.raised) tag(onCard(c, 1.0, -0.6), "dio-hand", `<i class="fa-solid fa-hand"></i> ${c.raised}`);
      if (c.count) tag(onCard(c, 1.0, 0.8), "dio-count", `×${c.count}`);
      if (c.caption) tag(project(cam, c.pose.x, cam.floorY - c.pose.lift, c.pose.z), "dio-capt", c.caption, { dy: 30 });
      if (c.speaking) tag(onCard(c, 1.0, 0), "dio-bars", [0, 1, 2].map((i) => `<i style="height:${(6 + 14 * Math.abs(Math.sin(t * 9 + i * 2.1))).toFixed(1)}px"></i>`).join(""), { dy: -24 });
    }
    for (const lbl of scene.labels ?? []) {
      const node = el("div", `dio-label${lbl.cls ? ` ${lbl.cls}` : ""}`, lbl.html);
      const at = lbl.world ? project(cam, lbl.world.x, lbl.world.y ?? cam.floorY, lbl.world.z) : { sx: map.x(lbl.at[0]), sy: map.y(lbl.at[1]) };
      Object.assign(node.style, { left: `${at.sx}px`, top: `${at.sy}px` });
      overlay.append(node);
    }
  };

  /** A range link between two zones in a fight: engaged, near or far. */
  function rangeSvg(R) {
    const a = [map.x(R.a[0]), map.y(R.a[1])];
    const b = [map.x(R.b[0]), map.y(R.b[1])];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    return `<g class="dio-range"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(0,0,0,0.5)" stroke-width="5"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(244,238,220,${R.solid ? 0.9 : 0.6})" stroke-width="2.2" ${R.solid ? "" : 'stroke-dasharray="9 7"'}/><text x="${mx}" y="${my - 12}" text-anchor="middle" font-family="Chakra Petch" font-weight="700" font-size="12" letter-spacing="2.6" fill="rgba(244,238,220,0.9)" stroke="rgba(0,0,0,0.75)" stroke-width="3.5" paint-order="stroke">${R.text}</text></g>`;
  }

  /** A magnet's push: the neighbour slides one place over. */
  function arrowSvg(A) {
    const a = [map.x(A.a[0]), map.y(A.a[1])];
    const b = [map.x(A.b[0]), map.y(A.b[1])];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const h = 16;
    const p1 = [b[0] - Math.cos(ang - 0.45) * h, b[1] - Math.sin(ang - 0.45) * h];
    const p2 = [b[0] - Math.cos(ang + 0.45) * h, b[1] - Math.sin(ang + 0.45) * h];
    return `<g class="dio-arrow" stroke="#4fc8d8" fill="#4fc8d8" stroke-linecap="round"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-width="4" filter="url(#dio-glow)" opacity="0.8"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-width="3.4"/><polygon points="${b[0]},${b[1]} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}" stroke="none"/></g>`;
  }

  /** A bonk: brass impact lines where two cards meet. */
  function bonkSvg(B) {
    const A = cards.find((c) => c.id === B.a);
    const C = cards.find((c) => c.id === B.b);
    if (!A?.pose || !C?.pose) return "";
    const dir = C.pose.x >= A.pose.x ? 1 : -1;
    const a = onCard(A, B.up ?? 0.6, 0.55 * dir);
    const b = onCard(C, B.up ?? 0.6, -0.55 * dir);
    const x = (a.sx + b.sx) / 2;
    const y = (a.sy + b.sy) / 2;
    const rays = Array.from({ length: 9 }, (_, i) => {
      const ang = (i / 9) * Math.PI * 2 + 0.3;
      const len = 62 * (0.72 + 0.28 * (((i * 7) % 3) / 2));
      return `<line x1="${(x + Math.cos(ang) * 28).toFixed(1)}" y1="${(y + Math.sin(ang) * 28).toFixed(1)}" x2="${(x + Math.cos(ang) * len).toFixed(1)}" y2="${(y + Math.sin(ang) * len).toFixed(1)}"/>`;
    }).join("");
    const star = Array.from({ length: 16 }, (_, i) => {
      const ang = (i / 16) * Math.PI * 2;
      const r = i % 2 ? 11 : 24;
      return `${(x + Math.cos(ang) * r).toFixed(1)},${(y + Math.sin(ang) * r).toFixed(1)}`;
    }).join(" ");
    return `<g class="dio-bonk"><g stroke="#1b140c" stroke-width="12" stroke-linecap="round">${rays}</g><g stroke="#e6c98d" stroke-width="6" stroke-linecap="round">${rays}</g><polygon points="${star}" fill="#fff7d6" stroke="#1b140c" stroke-width="3" stroke-linejoin="round"/></g>`;
  }

  /** Speed lines above a falling card. */
  function trailSvg(T) {
    const c = cards.find((cc) => cc.id === T.id);
    if (!c?.pose) return "";
    const top = onCard(c, 1.0, 0);
    const w = CW * c.s * top.k;
    const lines = [-0.34, -0.17, 0, 0.17, 0.34].map((u, i) => {
      const len = (T.len ?? 150) * (0.6 + 0.4 * (((i * 5) % 3) / 2)) * top.k;
      const x = top.sx + u * w * 1.6;
      return `<line x1="${x.toFixed(1)}" y1="${(top.sy - 10).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(top.sy - 10 - len).toFixed(1)}"/>`;
    }).join("");
    return `<g stroke="rgba(244,238,220,0.7)" stroke-width="3" stroke-linecap="round">${lines}</g>`;
  }

  /** A point on a card at a height (0 its foot, 1 its top), nudged sideways (-1..1 of its half-width). */
  const onCard = (c, up, side = 0) => {
    const P = c.pose;
    const dx = side * (CW * c.s / 2);
    return project(cam, P.x + dx * Math.cos(P.yaw * DEG), cam.floorY - CH * c.s * P.breathe * up - P.lift, P.z - dx * Math.sin(P.yaw * DEG));
  };
  /**
   * A link between two cards, for what passes between people: a glare (the
   * spark of a rivalry, crackling eye to eye), a whisper (carried along an arc
   * from one to the other), a look (who is watching whom).
   */
  function linkSvg(L, t) {
    const A = cards.find((c) => c.id === L.from);
    const B = cards.find((c) => c.id === L.to);
    if (!A || !B || t < (L.t0 ?? 0) || t > (L.t0 ?? 0) + (L.life ?? 1e9)) return "";
    const dir = Math.sign(B.pose.x - A.pose.x) || 1;
    if (L.kind === "glare") {
      const a = onCard(A, 0.8, 0.12 * dir);
      const b = onCard(B, 0.8, -0.12 * dir);
      const rnd = rng(1 + Math.floor(t * 14) + (L.seed ?? 0) * 97);
      const n = 12;
      const nx = -(b.sy - a.sy);
      const ny = b.sx - a.sx;
      const len = Math.hypot(nx, ny) || 1;
      const amp = 26 * Math.min(a.k, b.k);
      const pts = Array.from({ length: n + 1 }, (_, i) => {
        const u = i / n;
        const off = i === 0 || i === n ? 0 : (rnd() * 2 - 1) * amp * Math.sin(Math.PI * u) * 1.6;
        return `${(a.sx + (b.sx - a.sx) * u + (nx / len) * off).toFixed(1)},${(a.sy + (b.sy - a.sy) * u + (ny / len) * off).toFixed(1)}`;
      }).join(" ");
      const mx = (a.sx + b.sx) / 2;
      const my = (a.sy + b.sy) / 2;
      const burst = (x, y, r) => `<path d="M${x} ${y - r} L${x + r * 0.22} ${y - r * 0.22} L${x + r} ${y} L${x + r * 0.22} ${y + r * 0.22} L${x} ${y + r} L${x - r * 0.22} ${y + r * 0.22} L${x - r} ${y} L${x - r * 0.22} ${y - r * 0.22} Z" fill="#fff7d6" stroke="#1b140c" stroke-width="2"/>`;
      return `<g class="dio-link dio-link--glare"><polyline points="${pts}" fill="none" stroke="rgba(255,160,50,0.55)" stroke-width="26" stroke-linejoin="round" filter="url(#dio-glow)"/><polyline points="${pts}" fill="none" stroke="#1b140c" stroke-width="11" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="#ffe27a" stroke-width="6" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="#fffdf2" stroke-width="2" stroke-linejoin="round"/>${burst(mx, my, 40 + 8 * Math.sin(t * 30))}${burst(a.sx, a.sy, 18)}${burst(b.sx, b.sy, 18)}</g>`;
    }
    if (L.kind === "whisper") {
      const a = onCard(A, 0.66, 0.3 * dir);
      const b = onCard(B, 0.7, -0.3 * dir);
      const cx = (a.sx + b.sx) / 2;
      const cy = Math.min(a.sy, b.sy) - 120 * Math.min(a.k, b.k);
      const u = (((t - (L.t0 ?? 0)) * 0.45) % 1 + 1) % 1;
      const qx = (1 - u) ** 2 * a.sx + 2 * (1 - u) * u * cx + u * u * b.sx;
      const qy = (1 - u) ** 2 * a.sy + 2 * (1 - u) * u * cy + u * u * b.sy;
      const sz = 70 * Math.min(1.2, (a.k + b.k) / 2);
      return `<g class="dio-link dio-link--whisper"><path d="M${a.sx} ${a.sy} Q${cx} ${cy} ${b.sx} ${b.sy}" fill="none" stroke="rgba(255,244,214,0.9)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/><svg x="${qx - sz / 2}" y="${qy - sz / 2}" width="${sz}" height="${sz}" viewBox="-10 -10 120 120" overflow="visible">${EMOTES.whisper.svg.replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>`;
    }
    // A look: a dashed sightline, an eye at the watcher's end.
    const a = onCard(A, 0.72, 0.2 * dir);
    const b = onCard(B, 0.6, 0);
    const ex = a.sx + (b.sx - a.sx) * 0.16;
    const ey = a.sy + (b.sy - a.sy) * 0.16;
    return `<g class="dio-link dio-link--look"><line x1="${a.sx}" y1="${a.sy}" x2="${b.sx}" y2="${b.sy}" stroke="rgba(150,220,235,0.85)" stroke-width="2.5" stroke-dasharray="10 8"/><g transform="translate(${ex},${ey})"><path d="M-22 0 Q0 -16 22 0 Q0 16 -22 0 Z" fill="#f4ecd6" stroke="#1b140c" stroke-width="2.5"/><circle r="7" fill="#1b140c"/><circle cx="2.5" cy="-2.5" r="2.2" fill="#fff"/></g></g>`;
  }

  const render = (t) => {
    poseCards(t);
    paintLight(t);
    paintOccluders();
    paintOverlay(t);
  };

  /** Step the particles from zero to t at a fixed rate (a still is then exact). */
  const warm = (t) => {
    const dt = 1 / 60;
    for (let s = 0; s < t; s += dt) {
      poseCards(s);
      stepParticles(emitters, obstacles(), dt, { floorY: cam.floorY });
    }
  };

  let clock = 0;
  const live = () => {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      stepParticles(emitters, obstacles(), dt, { floorY: cam.floorY });
      render(clock);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  return { cam, map, cards, lights, emitters, onFloor, inAir, render, warm, live, overlay, world, floor, glow, riserOf, clock: () => clock };
}

function drawParticle(ctx, em, p, q, t, lights = []) {
  const K = em.kind;
  const life = p.age / p.life;
  const fade = Math.min(1, p.age / 0.4) * Math.min(1, (p.life - p.age) / 0.8);
  const size = p.size * q.k;
  ctx.save();
  if (K === "dust") {
    ctx.globalCompositeOperation = "screen";
    const tw = 0.6 + 0.4 * Math.sin(t * 3 + p.hue * 20);
    // A mote is only seen where light falls on it.
    let lit = em.lit ?? 0;
    for (const L of lights) lit += L.intensity / (1 + (Math.hypot(p.x - L.x, p.y - L.y, p.z - L.z) / (L.reach * 0.55)) ** 2);
    if (lit < 0.04) { ctx.restore(); return; }
    const glow = Math.min(1, lit * 1.4);
    const g = ctx.createRadialGradient(q.sx, q.sy, 0, q.sx, q.sy, size * 3);
    g.addColorStop(0, `rgba(255,236,200,${0.9 * fade * tw * glow})`);
    g.addColorStop(1, "rgba(255,236,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(q.sx, q.sy, size * 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (K === "smoke" || K === "steam") {
    const a = (K === "steam" ? 0.22 : 0.11) * fade * (1 - life * 0.6);
    const colour = K === "steam" ? "245,248,250" : "190,184,176";
    ctx.globalCompositeOperation = K === "steam" ? "screen" : "source-over";
    const g = ctx.createRadialGradient(q.sx, q.sy, 0, q.sx, q.sy, size);
    g.addColorStop(0, `rgba(${colour},${a})`);
    g.addColorStop(1, `rgba(${colour},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(q.sx, q.sy, size, 0, Math.PI * 2);
    ctx.fill();
  } else if (K === "sparks") {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,${Math.round(170 + 60 * (1 - life))},90,${fade})`;
    ctx.lineWidth = Math.max(1.4, size * 1.3);
    ctx.shadowColor = "rgba(255,150,60,0.9)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(q.sx, q.sy);
    ctx.lineTo(q.sx - p.vx * 0.032 * q.k, q.sy - p.vy * 0.032 * q.k);
    ctx.stroke();
  } else if (K === "snow") {
    // Soft flakes: far ones small and faint, near ones larger and out of focus.
    const near = Math.max(0, q.k - 1);
    const r = size * (1.5 + near * 3);
    const a = (0.35 + 0.5 * Math.min(1, q.k)) * fade * (1 - Math.min(0.6, near * 1.4));
    const g = ctx.createRadialGradient(q.sx, q.sy, 0, q.sx, q.sy, r);
    g.addColorStop(0, `rgba(250,252,255,${a})`);
    g.addColorStop(0.45, `rgba(250,252,255,${a * 0.75})`);
    g.addColorStop(1, "rgba(250,252,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(q.sx, q.sy, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (K === "rain") {
    ctx.strokeStyle = `rgba(200,220,245,${0.45 * fade})`;
    ctx.lineWidth = Math.max(0.8, size);
    ctx.beginPath();
    ctx.moveTo(q.sx, q.sy);
    ctx.lineTo(q.sx - p.vx * 0.03 * q.k, q.sy - p.vy * 0.03 * q.k);
    ctx.stroke();
  } else if (K === "petals") {
    drawPetal(ctx, q.sx, q.sy, size, p.spin + t * 90, p.hue, fade);
  }
  ctx.restore();
}

function drawPetal(ctx, x, y, size, spin, hue, a = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((spin * Math.PI) / 180);
  ctx.scale(1, 0.55 + 0.35 * Math.sin((spin * Math.PI) / 90));
  ctx.fillStyle = `rgba(${245 - hue * 20},${190 + hue * 30},${200 + hue * 20},${0.92 * a})`;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.9, -size * 0.3, 0, size);
  ctx.quadraticCurveTo(-size * 0.9, -size * 0.3, 0, -size);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Running a plate                                                     */
/* ------------------------------------------------------------------ */

export function stage(scene, { num, name, sub = null, defaultT = 4, after = null } = {}) {
  const root = screen(scene.art);
  const dio = buildDiorama(root, scene);
  if (scene.deck !== false) {
    deck(root);
    root.querySelector(".lab-deck").style.zIndex = "20"; // the real deck sits above the stage
  }
  title(root, num, name, sub);
  if (after) after(root, dio);
  const t = T0 ?? (params.has("live") ? null : defaultT);
  if (t === null) {
    dio.live();
  } else {
    dio.warm(t);
    dio.render(t);
    freeze();
  }
  return { root, dio };
}

/* ------------------------------------------------------------------ */
/*  The scenes                                                          */
/* ------------------------------------------------------------------ */

export const LANTERN = [255, 172, 96];

/** The Paper Lantern: round the bar. */
export function paperLantern() {
  return {
    art: `${PLACE_ART}the-paper-lantern.png`, img: [3072, 1536],
    rig: { horizon: 0.56, floorFront: 0.935, depth: 1.1, vanish: 0.52, lift: 70 },
    cardScale: 0.7, cardTint: ["rgb(255, 196, 140)", 0.42],
    ambient: 0.46, haze: 0.3, hazeColour: "rgba(40,22,10,1)", tint: "rgba(255,150,70,0.06)",
    lights: [
      { at: [0.165, 0.12], below: 0.97, colour: LANTERN, intensity: 1.0, reach: 700, flicker: 0.06 },
      { at: [0.31, 0.2], below: 0.88, colour: LANTERN, intensity: 0.9, reach: 600, flicker: 0.07 },
      { at: [0.53, 0.29], below: 0.82, colour: LANTERN, intensity: 1.2, reach: 650, flicker: 0.05, pool: 380 },
      { at: [0.81, 0.22], below: 0.92, colour: LANTERN, intensity: 1.0, reach: 700, flicker: 0.06, pool: 340 },
      { at: [0.37, 0.56], below: 0.78, colour: [255, 120, 60], intensity: 0.8, reach: 500, flicker: 0.18, flickerHz: 11 }
    ],
    occluders: [{ poly: [[0.235, 0.7], [0.728, 0.7], [0.728, 0.9], [0.235, 0.9]], base: 0.86, x: 0.48 }],
    cards: [
      { id: "kiku", at: [0.548, 0.782], yaw: -8, size: 1.2, demeanour: "calm" },
      { id: "sanzo", at: [0.275, 0.885], yaw: 34, demeanour: "bouncy", emote: { id: "music", t0: 0.5 } },
      { id: "hiroshi", at: [0.355, 0.895], yaw: -20, demeanour: "calm", emote: { id: "laugh", t0: 2.6 } },
      { id: "masaru", at: [0.43, 0.9], yaw: 168, demeanour: "slouch" },
      { id: "etsuko", at: [0.635, 0.89], yaw: 42, lean: 8, pitch: 6, demeanour: "sly", emote: { id: "whisper", t0: 1.2 }, emoteSide: -1 },
      { id: "yumiko", at: [0.695, 0.885], yaw: -44, lean: -8, pitch: 6, demeanour: "nervous" },
      { id: "nren", at: [0.1, 0.965], yaw: 34, lean: 6, size: 1.05, demeanour: "slouch", emote: { id: "sleep", t0: 0.2 } },
      { id: "tama", at: [0.865, 0.875], yaw: -30, demeanour: "nervous", emote: { id: "bowl", t0: 3.1 } }
    ],
    speaker: "sanzo",
    particles: [
      { kind: "smoke", box: [0.33, 0.5, 0.41, 0.57], depthAt: [0.37, 0.8], density: 1.2, spread: 60 },
      { kind: "dust", box: [0.05, 0.15, 0.95, 0.75], depthAt: [0.5, 0.9], density: 1.4, spread: 500 }
    ]
  };
}

/** The card game: round a table under one lamp, and a huddle by the coats. */
export function cardGame() {
  return {
    art: `${PLACE_ART}row-f-block-5--common-room.png`, img: [3072, 1536],
    rig: { horizon: 0.5, floorFront: 0.98, depth: 1.0, vanish: 0.5, lift: 50 },
    cardScale: 0.8, cardTint: ["rgb(170, 200, 196)", 0.3],
    ambient: 0.34, haze: 0.4, hazeColour: "rgba(8,20,22,1)", tint: "rgba(30,70,72,0.10)",
    bgFilter: "saturate(0.95) brightness(0.9)",
    lights: [
      { at: [0.495, 0.34], below: 0.87, colour: [255, 196, 122], intensity: 1.9, reach: 520, flicker: 0.03, pool: 470, poolPower: 1.2, cone: 300 },
      { at: [0.03, 0.25], below: 0.95, belowX: 0.06, colour: [140, 196, 210], intensity: 0.55, reach: 1100 }
    ],
    // The table, solid to the floor: whoever sits behind it is hidden below
    // its top, and raised on a riser until their face clears it.
    occluders: [{ poly: [[0.355, 0.612], [0.632, 0.612], [0.632, 0.9], [0.355, 0.9]], base: 0.86, x: 0.5 }],
    cards: [
      { id: "michiru", at: [0.5, 0.8], yaw: 0, demeanour: "calm", emote: { id: "ellipsis", t0: 1.8 } },
      { id: "lucan", at: [0.318, 0.875], yaw: 36, demeanour: "sly", emote: { id: "sparkle", t0: 0.4 } },
      { id: "chiyo", at: [0.682, 0.875], yaw: -36, demeanour: "nervous", emote: { id: "sweat", t0: 1.1 } },
      { id: "masaru", at: [0.228, 0.845], yaw: 40, demeanour: "proud", emote: { id: "anger", t0: 2.4 } },
      { id: "etsuko", at: [0.772, 0.845], yaw: -40, demeanour: "calm", emote: { id: "think", t0: 3 } },
      { id: "hiroshi", at: [0.835, 0.905], yaw: 42, lean: 9, pitch: 7, demeanour: "sly", emote: { id: "whisper", t0: 0.9 }, emoteSide: -1 },
      { id: "nren", at: [0.9, 0.905], yaw: -46, lean: -9, pitch: 7, demeanour: "nervous" }
    ],
    speaker: "michiru",
    sceneryEmotes: [{ at: [0.17, 0.5], emote: { id: "sleep", t0: 0 }, k: 0.55 }],
    particles: [
      { kind: "smoke", box: [0.37, 0.56, 0.39, 0.58], depthAt: [0.385, 0.855], density: 1, spread: 30 },
      { kind: "dust", box: [0.42, 0.36, 0.58, 0.64], depthAt: [0.5, 0.87], density: 0.9, spread: 120 }
    ]
  };
}

/** The bathhouse: up to the chest in hot water, steam parting round them. */
function bathhouse() {
  return {
    art: `${PLACE_ART}the-bathhouse-447--pool.png`, img: [3072, 1536],
    rig: { horizon: 0.6, floorFront: 1.02, depth: 1.0, vanish: 0.5, lift: 50 },
    cardScale: 1.05, cardTint: ["rgb(205, 228, 222)", 0.28],
    ambient: 0.66, haze: 0.35, hazeColour: "rgba(200,225,225,1)", tint: "rgba(120,180,180,0.05)",
    lights: [
      { at: [0.09, 0.22], below: 0.86, belowX: 0.12, colour: [255, 214, 160], intensity: 1.5, reach: 1500 },
      { at: [0.205, 0.15], below: 0.8, colour: [255, 220, 170], intensity: 0.5, reach: 500 }
    ],
    shafts: [
      { poly: [[0.04, 0.0], [0.13, 0.0], [0.41, 0.66], [0.27, 0.66]], colour: [255, 220, 170], alpha: 0.16 },
      { poly: [[0.19, 0.07], [0.22, 0.07], [0.64, 0.62], [0.54, 0.62]], colour: [255, 220, 170], alpha: 0.1 }
    ],
    cards: [
      { id: "hachi", at: [0.3, 0.8], yaw: 22, demeanour: "calm", waterline: 0.38, bob: 3, emote: { id: "music", t0: 0.6 } },
      { id: "sigrun", at: [0.56, 0.79], yaw: -14, demeanour: "proud", waterline: 0.38, bob: 3, emote: { id: "sparkle", t0: 2.2 } },
      { id: "etsuko", at: [0.41, 0.87], yaw: 18, demeanour: "calm", waterline: 0.42, bob: 4, emote: { id: "blush", t0: 1.4 } },
      { id: "masaru", at: [0.63, 0.875], yaw: -24, demeanour: "nervous", waterline: 0.42, bob: 4, emote: { id: "fume", t0: 0.9 } },
      { id: "kazue", at: [0.87, 0.78], yaw: -28, demeanour: "proud", emote: { id: "ellipsis", t0: 3.0 } }
    ],
    speaker: "hachi",
    particles: [
      { kind: "steam", box: [0.18, 0.66, 0.85, 0.72], depthAt: [0.5, 0.86], density: 3.2, spread: 260 },
      { kind: "dust", box: [0.08, 0.05, 0.5, 0.6], depthAt: [0.3, 0.86], density: 1.6, spread: 300 }
    ],
    particleSplit: -99999
  };
}

/* ------------------------------------------------------------------ */
/*  The plates                                                          */
/* ------------------------------------------------------------------ */

export const DIO_PLATES = {};

DIO_PLATES["dio-bar"] = () => stage(paperLantern(), {
  num: "13", name: "Round the bar at the Paper Lantern", defaultT: 3.6,
  after: (root) => {
    note(root, 1, "Kiku stands behind the counter: the counter is cut out of the painting and set at its own depth, so cards can stand behind it.", 1500, 700);
    note(root, 2, "Two at the end of the bar, leaning in: turned to each other, tops tipped together.", 1700, 610);
    note(root, 3, "Masaru has his back to us, ordering: the brass back, with his name on it.", 1180, 1000);
    note(root, 4, "Everyone glances at whoever is speaking (Sanzo). Lanterns light the side of each card that faces them, and flicker.", 40, 220);
  }
});

DIO_PLATES["dio-table"] = () => stage(cardGame(), {
  num: "14", name: "The card game: a table, and a huddle", defaultT: 3.6,
  after: (root) => {
    note(root, 1, "Seated round the table: the table top is cut from the painting, so it hides their laps. The near side is left open, as on a stage.", 640, 120);
    note(root, 2, "One lamp: a warm cone, a pool on the rug, a rim of light on whoever stands under it, shadows thrown outward.", 1500, 300);
    note(root, 3, "Heads together by the coats: conspiratorial.", 2040, 520);
    note(root, 4, "Emotes work on the scenery too: the cat is asleep.", 120, 600);
  }
});

DIO_PLATES["dio-bath"] = () => stage(bathhouse(), {
  num: "15", name: "The bathhouse: up to the chest in it", defaultT: 5,
  after: (root) => {
    note(root, 1, "In the water: the lower part of each card sits below the waterline, tinted and rippling; they bob.", 1240, 280);
    note(root, 2, "Steam rises from the water and parts round the cards.", 360, 330);
    note(root, 3, "Sunlight from the windows: shafts, dust in them, and a warm wash on each card's side towards the window.", 60, 160);
  }
});

/* ------------------------------------------------------------------ */
/*  More scenes                                                         */
/* ------------------------------------------------------------------ */

/** The gymnasium: an obstacle course the party works through, station by station. */
function gymTrack() {
  return {
    art: `${PLACE_ART}location--school-gymnasium.png`, img: [3072, 1536],
    rig: { horizon: 0.6, floorFront: 1.1, depth: 1.25, vanish: 0.5, lift: 40 },
    cardScale: 1.1, cardTint: ["rgb(255, 224, 186)", 0.22],
    ambient: 0.62, haze: 0.28, hazeColour: "rgba(255,226,190,1)",
    lights: [{ at: [0.96, 0.25], below: 0.86, belowX: 0.9, colour: [255, 206, 150], intensity: 1.7, reach: 2600 }],
    shafts: [
      { poly: [[0.76, 0.06], [0.99, 0.0], [0.6, 0.87], [0.38, 0.87]], colour: [255, 214, 160], alpha: 0.11 },
      { poly: [[0.86, 0.0], [0.99, 0.0], [0.86, 0.87], [0.7, 0.87]], colour: [255, 214, 160], alpha: 0.09 }
    ],
    track: {
      points: [[0.1, 0.93], [0.16, 0.876], [0.25, 0.846], [0.36, 0.83], [0.47, 0.824], [0.58, 0.824], [0.69, 0.83], [0.79, 0.846], [0.86, 0.876], [0.905, 0.93]],
      labels: [null, "<b>Wall bars</b>Athletics 15", "<b>Vault</b>Acrobatics 15", "<b>Rope</b>Athletics 16", "<b>Beam</b>Acrobatics 16", "<b>Mats</b>Athletics 15", "<b>Ladder</b>Acrobatics 16", "<b>Sprint</b>Athletics 15", null, null],
      done: 4, signHeight: 1.22
    },
    cards: [
      { id: "susumu", slot: 1, yaw: 30, demeanour: "nervous", emote: { id: "dizzy", t0: 0.8 } },
      { id: "hiroshi", slot: 2, yaw: 24, demeanour: "nervous", emote: { id: "sweat", t0: 1.6 } },
      { id: "masaru", slot: 3, yaw: 12, demeanour: "proud", emote: { id: "anger", t0: 0.4 } },
      { id: "nren", slot: 4, yaw: 6, demeanour: "calm" },
      { id: "etsuko", slot: 5, yaw: -8, demeanour: "calm", emote: { id: "idea", t0: 2.2 } },
      { id: "yumiko", slot: 7, yaw: -20, demeanour: "bouncy", emote: { id: "sparkle", t0: 1.1 } },
      { id: "school-civil-defence-instructor", slot: 9, yaw: -30, demeanour: "proud", size: 1.1, emote: { id: "hand", t0: 2.8 } }
    ],
    particles: [{ kind: "dust", box: [0.4, 0.05, 0.98, 0.85], depthAt: [0.6, 0.86], density: 1.3, spread: 500 }],
    particleSplit: -99999
  };
}

/** The Crew Mess: everyone emoting at once, a room with a pulse. */
export function crewMess() {
  return {
    art: `${PLACE_ART}the-crew-mess--bar.png`, img: [3072, 1536],
    rig: { horizon: 0.48, floorFront: 0.97, depth: 1.05, vanish: 0.55, lift: 100 },
    cardScale: 0.8, cardTint: ["rgb(176, 208, 204)", 0.3],
    ambient: 0.38, haze: 0.35, hazeColour: "rgba(10,24,26,1)", tint: "rgba(255,170,90,0.04)",
    lights: [
      { at: [0.25, 0.25], below: 0.86, colour: [255, 190, 120], intensity: 1.2, reach: 620, cone: 200, pool: 260, flicker: 0.03 },
      { at: [0.5, 0.24], below: 0.86, colour: [255, 190, 120], intensity: 1.2, reach: 620, cone: 200, pool: 260, flicker: 0.02 },
      { at: [0.71, 0.25], below: 0.86, colour: [255, 190, 120], intensity: 1.2, reach: 620, cone: 200, pool: 260, flicker: 0.04 }
    ],
    // The armour-plate bar, top to floor. The stools stand in front of it.
    occluders: [{ poly: [[0.18, 0.605], [0.83, 0.605], [0.83, 0.885], [0.18, 0.885]], base: 0.87, x: 0.5 }],
    cards: [
      // Behind the bar: the riser lifts her until her face clears it.
      { id: "tomoe", at: [0.47, 0.84], yaw: 14, size: 1.1, demeanour: "proud", emote: { id: "fume", t0: 0.6 } },
      // Up on a stool to sing: a card can stand on anything painted.
      { id: "petr", at: [0.545, 0.885], standOn: 0.73, yaw: -16, demeanour: "bouncy", emote: { id: "music", t0: 0.2 } },
      { id: "ren", at: [0.13, 0.92], yaw: 30, demeanour: "slouch", emote: { id: "gloom", t0: 1.4 } },
      { id: "masaru", at: [0.27, 0.91], yaw: 22, demeanour: "nervous", emote: { id: "sweat", t0: 1.0 } },
      { id: "etsuko", at: [0.39, 0.912], yaw: 14, demeanour: "bouncy", emote: { id: "laugh", t0: 0.8 } },
      { id: "hiroshi", at: [0.665, 0.908], yaw: -14, demeanour: "calm", emote: { id: "idea", t0: 2.0 } },
      { id: "yumiko", at: [0.775, 0.905], yaw: -24, demeanour: "calm", emote: { id: "heart", t0: 1.6 } },
      { id: "susumu", at: [0.9, 0.92], yaw: -34, demeanour: "nervous", emote: { id: "shock", t0: 2.4 } }
    ],
    speaker: "petr",
    particles: [{ kind: "dust", box: [0.15, 0.25, 0.8, 0.7], depthAt: [0.5, 0.86], density: 1.2, spread: 300 }]
  };
}

/** The shrine gate at night, snowing: snow comes to rest on the cards. */
function shrineSnow() {
  return {
    art: `${PLACE_ART}the-shrine-gate-444--gate.png`, img: [3072, 1536],
    rig: { horizon: 0.6, floorFront: 1.06, depth: 1.1, vanish: 0.5, lift: 60 },
    cardScale: 0.9, cardTint: ["rgb(180, 198, 228)", 0.34],
    ambient: 0.4, haze: 0.4, hazeColour: "rgba(20,30,44,1)", tint: "rgba(120,150,200,0.08)",
    lights: [
      { at: [0.75, 0.55], below: 0.88, colour: [255, 116, 76], intensity: 1.6, reach: 620, flicker: 0.08, pool: 300 },
      { at: [0.15, 0.05], below: 0.95, belowX: 0.2, colour: [150, 175, 220], intensity: 0.6, reach: 1600 }
    ],
    cards: [
      { id: "susumu", at: [0.2, 0.875], yaw: 26, demeanour: "nervous", emote: { id: "shiver", t0: 1.2 } },
      { id: "yumiko", at: [0.3, 0.87], yaw: 18, demeanour: "calm", emote: { id: "sparkle", t0: 2.2 } },
      { id: "etsuko", at: [0.43, 0.868], yaw: 4, demeanour: "calm", emote: { id: "think", t0: 3.4 } },
      { id: "tokuji", at: [0.68, 0.862], yaw: -26, demeanour: "calm", size: 1.05 }
    ],
    speaker: "tokuji",
    snowCap: { start: 9, gain: 3 },
    particles: [{ kind: "snow", box: [-0.05, -0.1, 1.05, 0.02], depthAt: [0.5, 0.87], density: 1.5, spread: 650 }],
    particleSplit: -700
  };
}

/** No. 1 Machine Shop, night shift: cold work lamps and welding sparks. */
function machineShop() {
  const lamp = [205, 228, 238];
  return {
    art: `${PLACE_ART}no-1-machine-shop--night-hall.png`, img: [3072, 1536],
    rig: { horizon: 0.62, floorFront: 1.06, depth: 1.1, vanish: 0.5, lift: 60 },
    cardScale: 1.05, cardTint: ["rgb(160, 196, 204)", 0.36],
    ambient: 0.3, haze: 0.4, hazeColour: "rgba(8,18,22,1)",
    lights: [
      { at: [0.15, 0.46], below: 0.86, colour: lamp, intensity: 1.3, reach: 560, cone: 170, pool: 250 },
      { at: [0.27, 0.56], below: 0.86, colour: lamp, intensity: 1.0, reach: 460, cone: 130, pool: 210 },
      { at: [0.84, 0.46], below: 0.86, colour: lamp, intensity: 1.2, reach: 520, cone: 170, pool: 250 },
      // The weld painted at the far end, and Kaede's own, close by: a hot, jumping light low down.
      { at: [0.745, 0.81], below: 0.83, colour: [255, 168, 92], intensity: 1.6, reach: 360, flicker: 0.45, flickerHz: 17, pool: 200, poolPower: 1.2 },
      { at: [0.818, 0.835], below: 0.937, colour: [255, 176, 100], intensity: 2.6, reach: 520, flicker: 0.5, flickerHz: 19, pool: 300, poolPower: 0.9 }
    ],
    cards: [
      { id: "kaede", at: [0.845, 0.93], yaw: -34, demeanour: "proud", emote: { id: "star", t0: 2.4 }, emoteSide: -1 },
      { id: "nkiru", at: [0.17, 0.865], yaw: 26, demeanour: "calm", emote: { id: "music", t0: 0.6 } },
      { id: "joji", at: [0.08, 0.95], yaw: 30, demeanour: "slouch" },
      { id: "hiroshi", at: [0.48, 0.872], yaw: 26, demeanour: "calm", emote: { id: "bowl", t0: 3.0 } },
      { id: "masaru", at: [0.615, 0.875], yaw: 36, demeanour: "nervous", emote: { id: "sweat", t0: 1.4 } }
    ],
    speaker: "kaede",
    particles: [
      { kind: "sparks", box: [0.743, 0.792, 0.75, 0.8], depthAt: [0.745, 0.83], density: 0.8, spread: 20 },
      // Kaede's weld, in front of her and thrown back at her: sparks strike her card and ricochet.
      { kind: "sparks", box: [0.814, 0.83, 0.822, 0.84], depthAt: [0.818, 0.937], density: 6, spread: 10, core: true, over: { vz: [-260, -60], vy: [-520, -180], vx: [-160, 240], life: [0.7, 1.4] } },
      { kind: "dust", box: [0.08, 0.45, 0.9, 0.85], depthAt: [0.5, 0.86], density: 1.0, spread: 300 }
    ],
    particleSplit: -99999
  };
}

DIO_PLATES["dio-track"] = () => stage(gymTrack(), {
  num: "17", name: "A physical challenge you can see: the obstacle course", defaultT: 3.4,
  after: (root) => {
    const panel = el("div", "dio-progress", `<div class="dio-progress__title">Obstacle course · <b>9 stations</b></div>
      ${["yumiko", "etsuko", "nren", "masaru", "hiroshi", "susumu"].map((id) => {
        const at = { susumu: 1, hiroshi: 2, masaru: 3, nren: 4, etsuko: 5, yumiko: 7 }[id];
        return `<div class="dio-progress__row"><img src="${pc(id).src}" style="--who:${pc(id).who}"><span>${pc(id).name}</span><i>${Array.from({ length: 9 }, (_, i) => `<em class="${i < at ? "is-on" : ""}"></em>`).join("")}</i></div>`;
      }).join("")}
      <div class="dio-progress__foot">Victory points <b>22</b> / 36 · two rolls left before the bell</div>`);
    root.append(panel);
    note(root, 1, "Each station is a slot on the floor with a sign: the obstacle, the skill, the DC (SF2E's victory-point subsystem, made physical).", 70, 140);
    note(root, 2, "Move your card to the next slot when you clear a station. Everyone sees who is ahead and who is stuck.", 70, 230);
    note(root, 3, "The GM's own card waits at the finish with a whistle.", 1960, 760);
  }
});

DIO_PLATES["dio-crowd"] = () => stage(crewMess(), {
  num: "18", name: "A room with a pulse: everyone emoting at once", defaultT: 3.0,
  after: (root) => {
    note(root, 1, "Petr sings, up on a stool; Tomoe, behind the bar, is not amused. A card can stand on anything painted, and one behind a bar is raised until its face clears it.", 1640, 300);
    note(root, 2, "Players pop an emote from a wheel on their own card; the GM can pop one on anyone. Each lasts a few seconds.", 60, 300);
  }
});

DIO_PLATES["dio-snow"] = () => stage(shrineSnow(), {
  num: "19", name: "Weather that touches the cards: snow at the shrine", defaultT: 22,
  after: (root) => {
    note(root, 1, "Snow falls in front of and behind the cards, and settles on their tops.", 1500, 240);
    note(root, 2, "The red lantern lights the side of each card that faces it, and flickers.", 1760, 560);
  }
});

DIO_PLATES["dio-sparks"] = () => stage(machineShop(), {
  num: "20", name: "The night shift: work lamps and welding sparks", defaultT: 3.2,
  after: (root) => {
    note(root, 1, "Kaede is welding: sparks strike her card and glance off it with a glint, the weld's light jumps on her face, and the floor glows round her feet.", 1880, 520);
    note(root, 2, "Cold work lamps from above: a pool on the floor, a cone, and short shadows.", 60, 300);
  }
});

/**
 * Lighting studies: the same two cards under three kinds of light, for a
 * triptych. ?light=lantern|work|window
 */
function lightStudy(kind) {
  const two = (a, b, yawA = 24, yawB = -24) => [
    { id: "kiku", at: a, yaw: yawA, demeanour: "calm", still: true },
    { id: "etsuko", at: b, yaw: yawB, demeanour: "calm", still: true }
  ];
  // Each light is one the painting already has; the two cards go and stand in it.
  let scene;
  if (kind === "lantern") {
    scene = { ...paperLantern(), cards: two([0.455, 0.95], [0.6, 0.95]), ambient: 0.26, lights: [{ at: [0.53, 0.29], below: 0.965, colour: LANTERN, intensity: 2.2, reach: 760, flicker: 0.05, pool: 460 }] };
  } else if (kind === "work") {
    scene = { ...machineShop(), cards: two([0.788, 0.875], [0.895, 0.875]), ambient: 0.16, haze: 0.12, cardTint: ["rgb(150, 190, 210)", 0.42], lights: [{ at: [0.84, 0.46], below: 0.9, colour: [205, 228, 238], intensity: 2.6, reach: 560, cone: 220, pool: 300, hard: true }] };
  } else {
    scene = { ...gymTrack(), track: null, cards: two([0.56, 0.86], [0.68, 0.86], 18, -30), ambient: 0.34, haze: 0.1, lights: [{ at: [0.93, 0.28], below: 0.79, belowX: 0.88, colour: [255, 206, 150], intensity: 2.8, reach: 2600 }] };
  }
  return Object.assign(scene, { particles: [], sceneryEmotes: [], speaker: null, cardScale: 1.15, deck: false });
}
const LIGHT_NAMES = { lantern: "A lantern above", work: "A work lamp", window: "A window behind" };

/** Lighting studies, one at a time: ?light=lantern|work|window */
DIO_PLATES["dio-light"] = () => {
  const kind = params.get("light") ?? "lantern";
  stage(lightStudy(kind), { num: "21", name: `Light: ${LIGHT_NAMES[kind].toLowerCase()}`, defaultT: 1 });
};

/** The three studies side by side: the same two cards, three lights. */
DIO_PLATES["dio-light-trio"] = () => {
  const root = screen(null, { plain: true });
  title(root, "21", "Three lights, the same two cards", "The cards take the light of whatever painting they stand in. Nothing here is painted onto the portraits: move a card and its light changes with it.");
  const panels = [
    { kind: "lantern", crop: [860, 330, 960], sub: "Warm and from the top: crowns bright, faces in its glow, a pool on the floor." },
    { kind: "work", crop: [1800, 420, 760], sub: "Cold and hard: the far side of each face in shadow, the cone above them." },
    { kind: "window", crop: [1290, 470, 700], sub: "The sun behind them: faces darkened, a rim of light round the edges." }
  ];
  const PW = 790;
  const PH = 880;
  panels.forEach((P, i) => {
    const left = 50 + i * (PW + 30);
    const box = el("div", "dio-trio__panel");
    Object.assign(box.style, { left: `${left}px`, top: "200px", width: `${PW}px`, height: `${PH}px` });
    const inner = el("div", "dio-trio__inner");
    Object.assign(inner.style, { width: `${W()}px`, height: `${H()}px` });
    const scene = lightStudy(P.kind);
    const bg = el("div", "lab-bg");
    bg.style.backgroundImage = `url("${scene.art}")`;
    inner.append(bg);
    box.append(inner);
    root.append(box);
    const dio = buildDiorama(inner, scene);
    dio.warm(1);
    dio.render(1);
    const [cx, cy, cw] = P.crop;
    inner.style.transform = `scale(${PW / cw}) translate(${-cx}px, ${-cy}px)`;
    root.append(el("div", "dio-trio__label", `<b>${LIGHT_NAMES[P.kind]}</b><span>${P.sub}</span>`));
    const lbl = root.lastChild;
    Object.assign(lbl.style, { left: `${left}px`, top: `${200 + PH + 22}px`, width: `${PW}px` });
  });
  freeze();
};

/** The card itself, taken apart: what it is made of in 3D. */
DIO_PLATES["card-anatomy"] = () => {
  const scene = {
    art: null, img: [2560, 1440], posY: 0.5,
    rig: { horizon: 0.36, floorFront: 1.02, depth: 1.25, vanish: 0.5 },
    cardScale: 2.0, ambient: 0.8, haze: 0, deck: false, vignette: true,
    lights: [
      { at: [0.62, 0.18], below: 0.8, colour: [255, 214, 170], intensity: 1.3, reach: 1400 },
      { at: [0.86, 0.3], below: 0.62, colour: [150, 210, 230], intensity: 1.2, reach: 700 }
    ],
    cards: [
      { id: "etsuko", at: [0.14, 0.74], yaw: 0, still: true, own: true },
      { id: "etsuko", at: [0.38, 0.74], yaw: 58, still: true, seed: 4 },
      { id: "etsuko", at: [0.62, 0.74], yaw: 180, still: true, seed: 5 },
      { id: "etsuko", at: [0.86, 0.725], yaw: -20, still: true, lift: 50, seed: 6, emote: { id: "sparkle", t0: 0 } }
    ]
  };
  const { root, dio } = stage(scene, { num: "22", name: "The card, taken apart", defaultT: 0.6 });
  root.querySelector(".lab-bg").classList.add("lab-plain");
  // The handle: shown on the held card.
  const held = dio.cards[3];
  const rod = el("div", "dio-card__rod", "<i></i>");
  held.node.querySelector(".dio-card__body").append(rod);
  // One caption under each card.
  const caption = (n, text, fx) => {
    const node = note(root, n, text, fx * W() - 200, 1236);
    node.classList.add("is-caption");
  };
  caption(1, "<b>The face.</b> The frame exactly as it is today, portrait and nameplate. The scene's light is laid over it: a warm wash, a cold rim, a sheen on the glass. A player's foot carries their colour.", 0.14);
  caption(2, "<b>Turned.</b> It has thickness, a brass edge either side, so a card at an angle still reads as a thing standing in the room.", 0.38);
  caption(3, "<b>The back.</b> Brass, rivets and a typed label, for turning your back on someone: you still know who it is.", 0.62);
  caption(4, "<b>Picked up.</b> Lifted off its foot on its handle, with an emote at its corner. Put it down and it stands again.", 0.86);
};

/** Setting a scene up: what the engine needs from a painting, and nothing more. */
DIO_PLATES["dio-rig"] = () => {
  const scene = { ...paperLantern(), cards: [], particles: [], sceneryEmotes: [], deck: false };
  const { root, dio } = stage(scene, { num: "23", name: "Setting the scene: what the engine needs", defaultT: 1 });
  const { cam, map } = dio;
  const dk = deckShape();
  // The floor grid, from the camera.
  const ctx = dio.floor;
  ctx.save();
  ctx.strokeStyle = "rgba(120,210,230,0.55)";
  ctx.lineWidth = 1.4;
  for (let gx = -2400; gx <= 4800; gx += 240) {
    const a = project(cam, gx, cam.floorY, 0);
    const b = project(cam, gx, cam.floorY, -6000);
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
  }
  for (let gz = 0; gz >= -6000; gz -= 300) {
    const a = project(cam, -2400, cam.floorY, gz);
    const b = project(cam, 4800, cam.floorY, gz);
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
  }
  // The counter's customer edge and its places (drawn over the cut-out, below).
  const a = dio.onFloor(0.24, 0.88);
  const b = dio.onFloor(0.72, 0.88);
  const places = counterPlaces(a, b, 6, { out: 60 });
  const pa = project(cam, a.x, cam.floorY, a.z);
  const pb = project(cam, b.x, cam.floorY, b.z);
  const placeSvg = `<line x1="${pa.sx}" y1="${pa.sy}" x2="${pb.sx}" y2="${pb.sy}" stroke="rgba(255,190,120,0.95)" stroke-width="3" stroke-dasharray="12 8"/>` +
    places.map((p, i) => { const q = project(cam, p.x, cam.floorY, p.z); return `<g transform="translate(${q.sx},${q.sy})"><ellipse rx="${30 * q.k}" ry="${12 * q.k}" fill="rgba(255,190,120,0.95)" stroke="#1b140c" stroke-width="1.5"/><text y="5" text-anchor="middle" font-family="Chakra Petch" font-weight="700" font-size="15" fill="#1b140c">${i + 1}</text></g>`; }).join("");
  // Reach of each light, on the floor.
  for (const L of dio.lights) {
    const c = project(cam, L.x, cam.floorY, L.z);
    ctx.strokeStyle = "rgba(255,200,120,0.6)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(c.sx, c.sy, L.reach * 0.5 * c.k, L.reach * 0.5 * c.k * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  const svg = `<svg class="dio-rig" width="${W()}" height="${H()}" viewBox="0 0 ${W()} ${H()}">
    <defs><pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="rgba(255,120,90,0.7)" stroke-width="3"/></pattern></defs>
    <line x1="0" x2="${W()}" y1="${cam.cy}" y2="${cam.cy}" stroke="rgba(120,210,230,0.95)" stroke-width="2" stroke-dasharray="16 10"/>
    <polygon points="${[[0.235, 0.7], [0.728, 0.7], [0.728, 0.9], [0.235, 0.9]].map(([fx, fy]) => `${map.x(fx)},${map.y(fy)}`).join(" ")}" fill="url(#hatch)" stroke="rgba(255,120,90,0.95)" stroke-width="2.5"/>
    ${placeSvg}
    ${dio.lights.map((L) => { const q = project(cam, L.x, L.y, L.z); return `<g transform="translate(${q.sx},${q.sy})"><circle r="20" fill="rgba(255,200,120,0.25)" stroke="#ffd59a" stroke-width="2.5"/><path d="M-6 -6 A8 8 0 1 1 6 -6 L4 4 L-4 4 Z" fill="#ffd59a"/></g>`; }).join("")}
    <g transform="translate(${map.x(0.37)},${map.y(0.52)})"><circle r="22" fill="rgba(230,230,230,0.2)" stroke="#e6e6e6" stroke-width="2.5" stroke-dasharray="5 4"/><text y="6" text-anchor="middle" font-family="Chakra Petch" font-weight="700" font-size="15" fill="#fff">smoke</text></g>
    <defs><pattern id="hatch-deck" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="12" stroke="rgba(120,210,230,0.55)" stroke-width="2.5"/></pattern></defs>
    <path d="M${dk.left} ${H()} L${dk.left} ${dk.top} L${dk.crown.cx - 104} ${dk.top} A${dk.crown.r} ${dk.crown.r} 0 0 1 ${dk.crown.cx + 104} ${dk.top} L${dk.right} ${dk.top} L${dk.right} ${H()} Z" fill="url(#hatch-deck)" stroke="rgba(160,225,240,0.95)" stroke-width="2.5" stroke-dasharray="14 8"/>
    <text x="${W() / 2}" y="${dk.top + 120}" text-anchor="middle" font-family="Chakra Petch" font-weight="700" font-size="17" letter-spacing="4" fill="rgba(200,240,250,0.95)">THE DECK: NO CARD STANDS HERE</text>
    <line x1="0" x2="${W()}" y1="${H() - map.lift}" y2="${H() - map.lift}" stroke="rgba(160,225,240,0.6)" stroke-width="1.5" stroke-dasharray="4 6"/>
  </svg>`;
  root.querySelector(".dio-overlay").insertAdjacentHTML("beforebegin", svg);
  // Two ghosts, near and far, to judge the scale by.
  for (const [fx, fy] of [[0.86, 0.95], [0.6, 0.78]]) {
    const fp = dio.onFloor(fx, fy);
    const top = project(cam, fp.x, cam.floorY - CH * 0.7, fp.z);
    const foot = project(cam, fp.x, cam.floorY, fp.z);
    const g = el("div", "dio-ghost");
    const h = foot.sy - top.sy;
    Object.assign(g.style, { left: `${foot.sx - h / 3}px`, top: `${top.sy}px`, width: `${(h * 2) / 3}px`, height: `${h}px` });
    root.append(g);
  }
  const panel = el("div", "dio-setpanel", `<div class="dio-setpanel__title">Set the scene</div>
    <label>Horizon <span class="dio-slider"><i style="left:56%"></i></span><b>0.56</b></label>
    <label>Floor <span class="dio-slider"><i style="left:72%"></i></span><b>0.94</b></label>
    <label>Depth <span class="dio-slider"><i style="left:44%"></i></span><b>1.1</b></label>
    <label>Card size <span class="dio-slider"><i style="left:58%"></i></span><b>0.70</b></label>
    <label>Clear deck <span class="dio-slider"><i style="left:35%"></i></span><b>70</b></label>
    <div class="dio-setpanel__group">Set pieces</div><div class="dio-chips"><span>Counter</span><span>Table</span><span>Bench</span><span>Step</span><span>Door</span><span>Zone</span><span>Track</span><span>Cut-out</span></div>
    <div class="dio-setpanel__group">Light</div><div class="dio-chips"><span>Lantern</span><span>Work lamp</span><span>Window</span><span>Fire</span><span>Neon</span></div>
    <div class="dio-setpanel__group">Air</div><div class="dio-chips"><span>Dust</span><span>Smoke</span><span>Steam</span><span>Rain</span><span>Snow</span><span>Petals</span><span>Sparks</span></div>`);
  root.append(panel);
  note(root, 1, "The horizon: one line on the painting. The floor grid follows from it.", 40, cam.cy - 70);
  note(root, 2, "A cut-out: furniture traced on the painting and set at its depth, so cards can stand behind it.", 560, 960);
  note(root, 3, "Lights belong to the painting: put one where a lamp is painted. Its reach shows on the floor.", 1240, 120);
  note(root, 4, "A set piece: the counter's edge, with places to stand. Poses use them.", 1990, 1120);
  note(root, 5, "Two ghosts, near and far: drag the floor and depth until they look right.", 1640, 700);
  note(root, 6, "The deck is the stage's front edge. The painting is lifted clear of it (the dotted line), the strip below is its own floor mirrored, and a card asked to stand behind the deck is walked back until its foot shows.", 40, 1150);
};

/** Live: the bar, running. Drag a card along the floor; right-click for the emote wheel. */
DIO_PLATES["dio-live"] = () => {
  const scene = paperLantern();
  const root = screen(scene.art);
  const dio = buildDiorama(root, scene);
  deck(root);
  root.querySelector(".lab-deck").style.zIndex = "20";
  root.classList.add("is-live");
  title(root, "Live", "The Paper Lantern, running");
  const hint = el("div", "lab-verbs", `<b>DRAG</b> a card along the floor; it snaps to a place at the bar<br><b>RIGHT-CLICK</b> a card for the emote wheel<br><b>WATCH</b>: nobody touching anything is still a scene`);
  root.append(hint);
  const a = dio.onFloor(0.24, 0.88);
  const b = dio.onFloor(0.72, 0.88);
  const seats = counterPlaces(a, b, 6, { out: 60 });
  let drag = null;
  const local = (e) => { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  root.addEventListener("pointerdown", (e) => {
    const node = e.target.closest(".dio-card");
    const c = node && dio.cards.find((cc) => cc.node === node);
    if (!c || e.button !== 0) return;
    e.preventDefault();
    drag = c;
    c.lift = 46;
    c.riser = 0;
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const pt = local(e);
    const fp = unprojectFloor(dio.cam, pt.x, pt.y + 30);
    if (fp && fp.z < 200) { drag.x = fp.x; drag.z = fp.z; }
  });
  window.addEventListener("pointerup", () => {
    if (!drag) return;
    const near = seats.reduce((best, s) => (Math.hypot(s.x - drag.x, s.z - drag.z) < Math.hypot(best.x - drag.x, best.z - drag.z) ? s : best), seats[0]);
    if (Math.hypot(near.x - drag.x, near.z - drag.z) < 220) { drag.x = near.x; drag.z = near.z; drag.baseYaw = near.yaw; }
    // Never put a card down behind the deck.
    drag.z = clearDeck(dio.cam, deckShape(), drag.x, drag.z, { w: CW * drag.s, below: 12 * drag.s });
    drag.lift = 0;
    drag.riser = dio.riserOf(drag);
    drag.hopAt = dio.clock();
    drag = null;
  });
  root.addEventListener("contextmenu", (e) => {
    const node = e.target.closest(".dio-card");
    const c = node && dio.cards.find((cc) => cc.node === node);
    if (!c) return;
    e.preventDefault();
    root.querySelector(".dio-wheel")?.remove();
    const pt = local(e);
    const wheel = el("div", "dio-wheel");
    Object.assign(wheel.style, { left: `${pt.x}px`, top: `${pt.y}px` });
    WHEEL.forEach((id, i) => {
      const ang = (i / WHEEL.length) * Math.PI * 2 - Math.PI / 2;
      const b2 = el("button", "dio-wheel__item", EMOTES[id].svg);
      b2.title = EMOTES[id].label;
      Object.assign(b2.style, { left: `${Math.cos(ang) * 92}px`, top: `${Math.sin(ang) * 92}px` });
      b2.onclick = () => { c.emote = { id, t0: dio.clock(), life: 4 }; wheel.remove(); };
      wheel.append(b2);
    });
    wheel.append(el("div", "dio-wheel__hub", c.who.name));
    root.append(wheel);
  });
  dio.live();
  window.__dio = dio;
};

/** The emote wheel, as a still: what a player sees on their own card. */
DIO_PLATES["dio-wheel"] = () => {
  const scene = { ...paperLantern() };
  const { root, dio } = stage(scene, { num: "24", name: "The emote wheel", defaultT: 3.6 });
  const c = dio.cards.find((cc) => cc.id === "etsuko");
  const P = c.pose;
  const q = project(dio.cam, P.x, dio.cam.floorY - CH * c.s * 0.55, P.z);
  const wheel = el("div", "dio-wheel is-shot");
  Object.assign(wheel.style, { left: `${q.sx}px`, top: `${q.sy}px` });
  WHEEL.forEach((id, i) => {
    const ang = (i / WHEEL.length) * Math.PI * 2 - Math.PI / 2;
    const b2 = el("div", `dio-wheel__item${id === "whisper" ? " is-hover" : ""}`, EMOTES[id].svg);
    Object.assign(b2.style, { left: `${Math.cos(ang) * 118}px`, top: `${Math.sin(ang) * 118}px` });
    wheel.append(b2);
  });
  wheel.append(el("div", "dio-wheel__hub", "Etsuko"));
  root.append(wheel);
  note(root, 1, "Right-click (or hold E on) your own card: eight emotes in a ring, your own choice of eight. One more click and the table sees it.", q.sx + 200, q.sy - 240);
};

/* ------------------------------------------------------------------ */
/*  Continuing the thought                                              */
/* ------------------------------------------------------------------ */

/** The Met Office roof in the rain: splashes on the cards, the cards in the puddles. */
function metOfficeRain() {
  return {
    art: `${PLACE_ART}the-met-office--roof.png`, img: [3072, 1536],
    rig: { horizon: 0.54, floorFront: 1.1, depth: 1.05, vanish: 0.5, lift: 120 },
    cardScale: 0.95, cardTint: ["rgb(150, 178, 200)", 0.36],
    ambient: 0.36, haze: 0.4, hazeColour: "rgba(14,26,34,1)", tint: "rgba(70,110,150,0.10)",
    reflect: 0.42,
    lights: [
      { at: [0.755, 0.335], below: 0.9, colour: [255, 186, 104], intensity: 1.8, reach: 760, flicker: 0.04, pool: 380, poolPower: 1.1 },
      { at: [0.2, 0.2], below: 0.97, belowX: 0.3, colour: [150, 178, 214], intensity: 0.55, reach: 2200 }
    ],
    cards: [
      { id: "nadi", at: [0.2, 0.93], yaw: 26, demeanour: "nervous", emote: { id: "idea", t0: 0.8 } },
      { id: "etsuko", at: [0.4, 0.92], yaw: 18, demeanour: "calm" },
      { id: "hiroshi", at: [0.5, 0.925], yaw: -6, demeanour: "nervous", emote: { id: "shiver", t0: 1.2 } },
      { id: "genzo", at: [0.655, 0.895], yaw: -22, demeanour: "calm", emote: { id: "ellipsis", t0: 2.0 } },
      { id: "susumu", at: [0.885, 0.955], yaw: -30, demeanour: "nervous", emote: { id: "sweat", t0: 2.6 } }
    ],
    speaker: "genzo",
    particles: [{ kind: "rain", box: [-0.08, -0.15, 1.08, 0.05], depthAt: [0.5, 0.92], density: 1.1, spread: 650 }]
  };
}

DIO_PLATES["dio-rain"] = () => stage(metOfficeRain(), {
  num: "26", name: "Rain on the Met Office roof", defaultT: 3.0,
  after: (root) => {
    note(root, 1, "Rain falls in front of and behind the cards, and splashes off their tops and the roof.", 1560, 160);
    note(root, 2, "A wet roof: each card stands in its own reflection, broken up by the rain.", 60, 860);
    note(root, 3, "The lamp over the door lights the side of each card that faces it; the city's glow is the cold fill.", 1880, 520);
  }
});

/** What passes between cards: the petition at the Crew Mess. */
DIO_PLATES["dio-links"] = () => {
  const scene = crewMess();
  scene.cards = [
    { id: "tomoe", at: [0.47, 0.84], yaw: 14, size: 1.1, demeanour: "proud" },
    { id: "petr", at: [0.575, 0.905], yaw: -40, demeanour: "proud", emote: { id: "anger", t0: 0.4 }, emoteSide: 1 },
    { id: "ren", at: [0.37, 0.91], yaw: 40, demeanour: "proud", emote: { id: "anger", t0: 0.6 }, emoteSide: -1 },
    { id: "etsuko", at: [0.13, 0.92], yaw: 30, lean: 7, pitch: 6, demeanour: "sly" },
    { id: "yumiko", at: [0.225, 0.915], yaw: -34, lean: -7, pitch: 6, demeanour: "nervous", emote: { id: "sweat", t0: 1.6 }, emoteSide: 1 },
    { id: "hiroshi", at: [0.745, 0.905], yaw: -22, demeanour: "calm", emote: { id: "think", t0: 1.0 } },
    { id: "susumu", at: [0.865, 0.915], yaw: -30, demeanour: "nervous" }
  ];
  scene.speaker = null;
  scene.links = [
    { kind: "glare", from: "petr", to: "ren", seed: 3 },
    { kind: "whisper", from: "etsuko", to: "yumiko", t0: 0.2 },
    { kind: "look", from: "tomoe", to: "petr" }
  ];
  stage(scene, {
    num: "25", name: "What passes between them: a glare, a whisper, a look", defaultT: 2.4,
    after: (root) => {
      note(root, 1, "A glare, eye to eye: Petr with his petition against the new machines, Ren who thinks they are the best thing that ever happened to the dock. It crackles for as long as either of them keeps it up.", 1160, 330);
      note(root, 2, "A whisper travels: a dotted arc from one card to the next, the psst riding along it. Pass the rumour on and it hops again.", 60, 330);
      note(root, 3, "A look: who is watching whom. Tomoe has her eye on the trouble.", 1700, 190);
    }
  });
};

/** A photograph on the steps of the Directorate, filed in Papers. */
function hqSteps() {
  const step = (fx, ground, tread, extra = {}) => ({ at: [fx, ground], standOn: tread, ...extra });
  return {
    art: `${PLACE_ART}directorate-headquarters--exterior.png`, img: [3072, 1536],
    rig: { horizon: 0.6, floorFront: 1.15, depth: 1.1, vanish: 0.5 },
    cardScale: 1.0, cardTint: ["rgb(255, 222, 180)", 0.18],
    ambient: 0.66, haze: 0.18, hazeColour: "rgba(255,226,190,1)", deck: false,
    lights: [{ at: [0.95, 0.05], below: 0.8, belowX: 0.8, colour: [255, 214, 160], intensity: 1.4, reach: 3000 }],
    cards: [
      // Third row, high on the steps; the Section Officer at the very top.
      step(0.635, 0.84, 0.615, { id: "section-officer", yaw: -6, demeanour: "proud", size: 0.95 }),
      step(0.5, 0.85, 0.69, { id: "susumu", yaw: 0, demeanour: "nervous", emote: { id: "dizzy", t0: 0.6 } }),
      // Second row, a few steps up.
      step(0.43, 0.87, 0.79, { id: "yumiko", yaw: 8, demeanour: "bouncy", emote: { id: "sparkle", t0: 0.3 } }),
      step(0.57, 0.87, 0.79, { id: "nren", yaw: -8, demeanour: "calm", emote: { id: "laugh", t0: 0.9 } }),
      // Front row, on the street.
      { id: "masaru", at: [0.37, 0.935], yaw: 10, demeanour: "proud", emote: { id: "star", t0: 0.2 } },
      { id: "etsuko", at: [0.5, 0.94], yaw: 0, demeanour: "calm", emote: { id: "ellipsis", t0: 1.1 } },
      { id: "hiroshi", at: [0.63, 0.935], yaw: -10, demeanour: "nervous", emote: { id: "sweat", t0: 0.7 } }
    ],
    particles: [{ kind: "dust", box: [0.3, 0.2, 0.75, 0.8], depthAt: [0.5, 0.9], density: 0.8, spread: 300 }]
  };
}

DIO_PLATES["dio-photo"] = () => {
  const printing = params.get("print") === "1";
  const { root } = stage(hqSteps(), { num: "27", name: printing ? "The photograph, filed in Papers" : "Say cheese: a photograph on the steps", defaultT: 2.0 });
  // The exposure itself: the scene and nothing else, for the print to use.
  if (params.get("clean") === "1") {
    root.querySelectorAll(".lab-title, .lab-sub").forEach((n) => n.remove());
    return;
  }
  if (!printing) {
    // The GM's viewfinder: the deck steps aside, the frame lines come up.
    root.append(el("div", "dio-viewfinder", `<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><b></b><span>1/125 · f/8 · <em>7 in frame</em></span>`));
    note(root, 1, "The GM calls a photograph: the deck steps aside, everyone faces the lens, and the cards fall into rows on the steps (a card can stand on any painted step).", 60, 300);
    note(root, 2, "Emotes are part of the picture: whoever pulled a face pulled it for posterity.", 1990, 300);
    return;
  }
  root.append(el("div", "dio-flash"));
  const print = el("div", "dio-print", `<div class="dio-print__photo"></div><div class="dio-print__caption">The steps · first week</div>`);
  print.querySelector(".dio-print__photo").style.backgroundImage = `url("shots/dio-photo-2000-clean1.png")`;
  root.append(print);
  root.append(el("div", "dio-papers", `<i class="fa-solid fa-folder-open"></i> Filed in <b>Papers</b> · everyone in it can open it again`));
  note(root, 1, "A second later the print slides out, sepia and slightly crooked, and files itself in Papers: a handout like any other, kept for the rest of the campaign.", 60, 300);
};

/** Two haunts on one night: the stage splits like a manga page. */
DIO_PLATES["dio-split"] = () => {
  const root = screen(null, { plain: true });
  const PANEL = 1340;
  const sides = [
    {
      left: 0, clip: `polygon(0 0, ${PANEL}px 0, ${PANEL - 110}px 100%, 0 100%)`, label: "The Roof", sub: "Row E Block 9",
      scene: {
        art: `${PLACE_ART}row-e-block-9--roof.png`, img: [3072, 1536], posX: 0.4,
        rig: { horizon: 0.69, floorFront: 1.15, depth: 1.1, vanish: 0.5, lift: 110 },
        cardScale: 1.35, cardTint: ["rgb(150, 176, 200)", 0.34], ambient: 0.32, haze: 0.3, hazeColour: "rgba(12,22,30,1)", tint: "rgba(70,110,150,0.08)", deck: false,
        lights: [
          { at: [0.47, 0.86], below: 0.905, colour: [255, 176, 96], intensity: 1.6, reach: 520, flicker: 0.07, pool: 300, poolPower: 1.2 },
          { at: [0.6, 0.3], below: 0.8, colour: [150, 176, 214], intensity: 0.6, reach: 2400 }
        ],
        cards: [
          { id: "masaru", at: [0.3, 0.92], yaw: 24, demeanour: "slouch" },
          { id: "sayo", at: [0.4, 0.905], yaw: 18, demeanour: "calm", emote: { id: "sparkle", t0: 0.6 } },
          { id: "faruq", at: [0.5, 0.905], yaw: -14, demeanour: "calm", emote: { id: "music", t0: 0.2 } },
          { id: "nren", at: [0.58, 0.915], yaw: -26, demeanour: "calm", emote: { id: "sleep", t0: 1.4 } }
        ],
        speaker: "faruq",
        particles: [{ kind: "dust", box: [0.38, 0.6, 0.56, 0.9], depthAt: [0.47, 0.9], density: 1.2, spread: 120 }]
      }
    },
    {
      left: 1230, clip: `polygon(110px 0, 100% 0, 100% 100%, 0 100%)`, label: "The Paper Lantern", sub: "the same night",
      scene: {
        ...paperLantern(), deck: false, sceneryEmotes: [], speaker: "kiku", cards: [
          { id: "kiku", at: [0.548, 0.782], yaw: -8, size: 1.2, demeanour: "calm", emote: { id: "ellipsis", t0: 1.6 } },
          { id: "etsuko", at: [0.4, 0.895], yaw: 26, demeanour: "sly", emote: { id: "whisper", t0: 0.8 }, emoteSide: -1 },
          { id: "yumiko", at: [0.6, 0.89], yaw: -20, demeanour: "calm", emote: { id: "bowl", t0: 0.4 } },
          { id: "hiroshi", at: [0.69, 0.885], yaw: -30, demeanour: "bouncy", emote: { id: "laugh", t0: 1.2 } }
        ]
      }
    }
  ];
  for (const side of sides) {
    const panel = el("div", "dio-split__panel");
    Object.assign(panel.style, { left: `${side.left}px`, width: `${PANEL}px`, height: `${H()}px`, clipPath: side.clip });
    const bg = el("div", "lab-bg");
    bg.style.backgroundImage = `url("${side.scene.art}")`;
    panel.append(bg);
    root.append(panel);
    const dio = buildDiorama(panel, { ...side.scene, screen: { w: PANEL, h: H() } });
    dio.warm(2.2);
    dio.render(2.2);
    const plaque = el("div", "dio-split__plaque", `<b>${side.label}</b><span>${side.sub}</span>`);
    plaque.style.left = side.left === 0 ? "40px" : `${side.left + 170}px`;
    root.append(plaque);
  }
  root.append(el("div", "dio-split__gutter"));
  deck(root);
  root.querySelector(".lab-deck").style.zIndex = "20";
  title(root, "28", "Two haunts, one night: the stage splits");
  note(root, 1, "The group chose two places to rest tonight, so the stage splits like a manga page. Each side is its own diorama with its own light and its own people.", 60, 230);
  note(root, 2, "Whoever the GM is talking to gets the wider panel; the gutter slides across when the scene cuts.", 1900, 230);
  freeze();
};

/** The Paper Lantern, alive: a few seconds of a scene nobody is touching. */
function paperLanternAlive() {
  const scene = paperLantern();
  const byId = Object.fromEntries(scene.cards.map((c) => [c.id, c]));
  const swap = (id, extra) => { delete byId[id].emote; Object.assign(byId[id], extra); };
  swap("sanzo", { emotes: [{ id: "music", t0: 0.2, life: 7.6 }] });
  swap("nren", { emotes: [{ id: "sleep", t0: 0, life: 8 }] });
  swap("etsuko", { emotes: [{ id: "whisper", t0: 1.0, life: 2.8 }] });
  swap("yumiko", { emotes: [{ id: "shock", t0: 2.4, life: 2.2 }, { id: "heart", t0: 5.7, life: 2.3 }] });
  swap("hiroshi", { emotes: [{ id: "laugh", t0: 3.0, life: 2.0 }] });
  swap("tama", { walkFrom: [0.865, 0.875], walkTo: [0.775, 0.886], walkT0: 3.6, walkDur: 1.8, emotes: [{ id: "bowl", t0: 3.6, life: 2.4 }] });
  swap("masaru", { turnAt: 5.0, turnTo: 24, emotes: [{ id: "question", t0: 5.4, life: 2.4 }] });
  swap("kiku", { emotes: [{ id: "ellipsis", t0: 6.4, life: 1.6 }] });
  scene.links = [{ kind: "whisper", from: "etsuko", to: "yumiko", t0: 1.0, life: 2.6 }];
  return scene;
}
DIO_PLATES["dio-alive"] = () => stage(paperLanternAlive(), { num: "29", name: "Nobody touching anything: the Paper Lantern, alive", defaultT: 3.0 });

/**
 * Conditions you can see: SF2E's own conditions (sf2e already tracks them; the
 * card only shows them), each as a way of standing. The rules text on each
 * plaque is from reference/srd/player-core's condition articles.
 */
DIO_PLATES["dio-conditions"] = () => {
  const base = gymTrack();
  const row = 0.852;
  const C = [
    { id: "masaru", x: 0.125, pitch: -74, noShadow: true, sign: "Prone", rule: "off-guard · only Crawl or Stand" },
    { id: "hiroshi", x: 0.25, pitch: -80, noShadow: true, dim: 0.62, out: true, pulse: true, still: true, sign: "Dying 1", value: 1, max: 4, rule: "unconscious · dying 4 is death", emote: { id: "dizzy", t0: 0 } },
    { id: "susumu", x: 0.375, tremble: 2.6, pitch: -5, demeanour: "nervous", sign: "Frightened 2", value: 2, max: 4, rule: "−2 to every check and DC", emote: { id: "shiver", t0: 0.3 } },
    { id: "nren", x: 0.5, lean: 6, pitch: 12, sag: 0.94, demeanour: "slouch", sign: "Fatigued", rule: "−1 to AC and saves", emote: { id: "gloom", t0: 0.5 } },
    { id: "yumiko", x: 0.625, wobble: 5, lean: -11, sign: "Off-guard", rule: "−2 to AC", emote: { id: "surprise", t0: 0.2 } },
    { id: "etsuko", x: 0.75, wobble: 3, sign: "Stunned 1", value: 1, max: 3, calm: true, rule: "loses 1 action", emote: { id: "dizzy", t0: 0.4 } },
    { id: "centipede", x: 0.875, hidden: true, opacity: 0.4, still: true, sign: "Hidden", rule: "DC 11 flat check to target it" }
  ];
  const scene = {
    ...base, track: null, labels: [], speaker: null, particles: [], cardScale: 1.05,
    rig: { ...base.rig, lift: 30 },
    cards: C.map(({ x, sign, rule, value, max, calm, ...card }) => ({ at: [x, row], yaw: 0, demeanour: card.demeanour ?? "calm", ...card }))
  };
  stage(scene, {
    num: "30", name: "Conditions you can see", defaultT: 1.4,
    after: (root, dio) => {
      C.forEach((cond, i) => {
        const fp = dio.onFloor(cond.x, row);
        const lying = (cond.pitch ?? 0) < -40;
        const up = lying ? 150 : CH * scene.cardScale * 1.12;
        const pips = cond.value ? `<i>${Array.from({ length: cond.max }, (_, j) => `<em class="${j < cond.value ? "is-on" : ""}"></em>`).join("")}</i>` : "";
        scene.labels.push({ world: { x: fp.x, z: fp.z, y: dio.cam.floorY - up }, cls: `dio-plaque${cond.calm ? " is-calm" : ""}`, html: `<b>${cond.sign}</b>${pips}<span>${cond.rule}</span>`, plaque: true });
        void i;
      });
      note(root, 1, "sf2e already tracks every condition (ux-doctrine §11): the card only shows it. Prone and dying lie down, frightened trembles, fatigued sags, off-guard wobbles off balance, stunned reels, and a hidden enemy is a dashed ghost: you know the space, not the creature.", 60, 150);
      note(root, 2, "The plaque carries the number that matters, from the rules: the value as pips, and the one line a player needs.", 1900, 150);
    }
  });
};

/** The emote sheet: every symbol, drawn for the campaign. */
DIO_PLATES.emotes = () => {
  const root = screen(null, { plain: true });
  title(root, "16", "The emotes", "Manga's own faces and marks, printed as the cards are made: the plate's umber ink and cream, one muted spot colour a hair out of register, a nib that swells and tapers. Each has its own motion.");
  const sheet = el("div", "emote-sheet");
  root.append(sheet);
  EMOTE_ORDER.forEach((id, i) => {
    const def = EMOTES[id];
    const cell = el("div", "emote-cell", `<div class="emote-cell__art">${def.svg}</div><div class="emote-cell__name">${def.label}</div><div class="emote-cell__motion">${def.motion}</div>`);
    sheet.append(cell);
    void i;
  });
  freeze();
};
