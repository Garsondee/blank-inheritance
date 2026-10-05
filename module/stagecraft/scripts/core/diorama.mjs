/**
 * The diorama: a sketch of scripts/core/diorama.mjs.
 *
 * Pure. Turns a painted scene into a small 3D stage the cards stand in:
 *
 *   THE CAMERA. Every painting has a horizon and a floor. Mark the horizon,
 *   say where the floor meets the front of the picture and how deep the room
 *   feels (one number), and the camera follows: a CSS perspective whose
 *   vanishing point sits on the painting's horizon. Cards placed on that floor
 *   shrink with distance, sort in depth, and turn in real 3D, consistently in
 *   every scene, because it is the same camera rule everywhere.
 *
 *   SET PIECES. A counter, a table, a bench, a doorway, a track: shapes drawn
 *   on the painting, unprojected onto the floor, each offering places to stand
 *   and something to face. Poses are built from them.
 *
 *   CHEAT OUT. The theatre's oldest blocking rule: an actor turns towards the
 *   person they're talking to, but only so far, so the audience still sees their
 *   face. Every pose here faces its target and then cheats out towards the table.
 *
 *   LIGHT. Lamps, windows and fires belong to the painting. Each card is lit by
 *   them: a warm wash on the side facing the lamp, a rim of light when the lamp
 *   is behind it, a sheen that slides as it turns, and a shadow on the floor
 *   thrown away from the light.
 *
 *   LIFE. Each character has a demeanour (calm, nervous, proud, slouching,
 *   bouncy, sly) that sets how they breathe, sway, fidget and glance at whoever
 *   is speaking, so a scene nobody touches is still worth watching.
 *
 * Coordinates: CSS pixels. x right, y down, z towards the viewer; the scene is
 * at z < 0. The floor is the plane y = floorY.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, u) => a + (b - a) * u;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ */
/*  Seeded noise (shared shape with flourish.mjs)                       */
/* ------------------------------------------------------------------ */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1-D value noise in [-1, 1]: for flicker and idle sway. */
export function noise1(t, seed = 0) {
  const i = Math.floor(t);
  const f = t - i;
  const h = (n) => {
    let x = Math.imul((n + seed * 7919) | 0, 0x27d4eb2d);
    x ^= x >>> 15;
    x = Math.imul(x, 0x85ebca6b);
    x ^= x >>> 13;
    return ((x >>> 0) / 4294967296) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

/* ------------------------------------------------------------------ */
/*  The camera                                                          */
/* ------------------------------------------------------------------ */

/**
 * A rig is authored on the painting in fractions of the IMAGE, so it survives
 * any screen size. `cover` maps the image onto the screen the way the stage
 * already does (CSS background cover).
 *
 *   horizon     the painting's eye level (fraction of image height)
 *   floorFront  where the floor plane meets the front of the picture (fraction;
 *               may be below 1 when the floor runs out of frame)
 *   depth       how deep the room feels: the perspective distance as a fraction
 *               of the screen width (smaller = a stronger, closer perspective)
 *   vanish      the vanishing point's x (fraction of image width; default 0.5)
 */
export function coverMap(imgW, imgH, screenW, screenH, posY = 0.5, lift = 0, posX = 0.5) {
  const s = Math.max(screenW / imgW, screenH / imgH);
  const ox = (screenW - imgW * s) * posX;
  // `lift` raises the painting so its floor clears the deck; the strip it
  // leaves at the bottom shows the plain stage background.
  const oy = (screenH - imgH * s) * posY - lift;
  return { s, ox, oy, lift, x: (fx) => ox + fx * imgW * s, y: (fy) => oy + fy * imgH * s };
}

export function makeCamera(rig, map, screenW) {
  return {
    f: rig.depth * screenW,
    cx: map.x(rig.vanish ?? 0.5),
    cy: map.y(rig.horizon),
    floorY: map.y(rig.floorFront),
    map
  };
}

/** World to screen. k is the perspective scale at that depth. */
export function project(cam, x, y, z) {
  const k = cam.f / (cam.f - z);
  return { sx: cam.cx + (x - cam.cx) * k, sy: cam.cy + (y - cam.cy) * k, k };
}

/** A screen point on the floor, back into the world. */
export function unprojectFloor(cam, sx, sy) {
  const k = (sy - cam.cy) / (cam.floorY - cam.cy);
  if (k <= 0) return null; // above the horizon: not on the floor
  const z = cam.f - cam.f / k;
  return { x: cam.cx + (sx - cam.cx) / k, z };
}

/** A point marked on the painting (image fractions), placed on the floor. */
export function floorPoint(cam, fx, fy) {
  return unprojectFloor(cam, cam.map.x(fx), cam.map.y(fy));
}

/* ------------------------------------------------------------------ */
/*  The deck is the front of the stage                                  */
/* ------------------------------------------------------------------ */

/**
 * The deck sits along the bottom of every player's screen, so the floor a card
 * may stand on ends at the deck's top edge, the way a stage ends at its lip.
 * `deck` is its outline in screen px: { left, right, top, crown: { cx, cy, r } }
 * (the crown is the round collar the orb sits in). Returns the y a card's
 * bottom edge must stay above at screen x; Infinity where there is no deck.
 */
export function deckLip(deck, x) {
  if (!deck || x < deck.left || x > deck.right) return Infinity;
  let y = deck.top;
  if (deck.crown) {
    const dx = Math.abs(x - deck.crown.cx);
    if (dx < deck.crown.r) y = Math.min(y, deck.crown.cy - Math.sqrt(deck.crown.r ** 2 - dx ** 2));
  }
  return y;
}

/** The highest point of the lip anywhere under a span of screen x. */
export function lipOver(deck, x0, x1, samples = 11) {
  let y = Infinity;
  for (let i = 0; i < samples; i++) y = Math.min(y, deckLip(deck, x0 + ((x1 - x0) * i) / (samples - 1)));
  return y;
}

/**
 * Walk a card back along the floor until its bottom edge clears the deck.
 * `w` is the card's width and `below` how far its foot reaches under the floor
 * line (both world px). Returns the z to stand at: the same z when it clears.
 */
export function clearDeck(cam, deck, x, z, { w = 280, below = 12, margin = 6 } = {}) {
  for (let i = 0; i < 400; i++) {
    const foot = project(cam, x, cam.floorY, z);
    const half = (w / 2) * foot.k;
    if (foot.sy + below * foot.k <= lipOver(deck, foot.sx - half, foot.sx + half) - margin) return z;
    z -= 10;
  }
  return z;
}

/**
 * A riser: a card standing behind a cut-out (a bar, a counter, a wall) is raised
 * until no more than `hideAtMost` of it is hidden, the way a stage puts a box
 * under an actor who stands behind a bar. Only a cut-out that reaches down to
 * the card's foot counts; a band across the middle (a table top over a lap) is
 * meant to hide what it hides. All in screen px; returns how far to raise it.
 */
export function riserFor(card, occs, { hideAtMost = 0.45, most = 0.8 } = {}) {
  let need = 0;
  for (const o of occs) {
    if (card.x1 < o.x0 || card.x0 > o.x1) continue;
    if (o.bottom < card.footY - 4) continue;
    // Raised until the cut-out's top edge sits no higher than hideAtMost of the way up.
    need = Math.max(need, card.footY - (o.top + hideAtMost * card.h));
  }
  return Math.min(Math.max(0, need), most * card.h);
}

/**
 * Standing on something painted (a stool, a crate, a step): the card stands at
 * the depth of the thing's feet, raised to its top. `feetFy` and `topFy` are
 * where the feet and the top appear in the painting. Returns the lift in world px.
 */
export function standOnLift(cam, feetFy, topFy) {
  const feet = cam.map.y(feetFy);
  const k = (feet - cam.cy) / (cam.floorY - cam.cy);
  return k > 0 ? (feet - cam.map.y(topFy)) / k : 0;
}

/* ------------------------------------------------------------------ */
/*  Facing, and cheating out                                            */
/* ------------------------------------------------------------------ */

/** The yaw that turns a card at (x, z) to face (tx, tz). 0 faces the viewer. */
export function yawTo(x, z, tx, tz) {
  return Math.atan2(tx - x, tz - z) / DEG;
}

/**
 * Cheat out: keep a share of the true facing, then never turn further than
 * `max` from the viewer, so a face is always seen. A target directly behind a
 * card becomes a three-quarter view, the way a stage actor plays to a bar at
 * the back of the set.
 */
export function cheatOut(yaw, { share = 0.62, max = 52 } = {}) {
  let a = ((yaw + 540) % 360) - 180;
  if (Math.abs(a) > 90) a = Math.sign(a) * (180 - Math.abs(a)) * 0.5 + Math.sign(a) * 35;
  return clamp(a * share, -max, max);
}

/* ------------------------------------------------------------------ */
/*  Set pieces and poses                                                */
/* ------------------------------------------------------------------ */

/**
 * Places along a counter. `a`, `b` are floor points (world) of the counter's
 * customer-side edge; customers stand `out` in front of it, facing it, cheated
 * out. Returns places in order from a to b.
 */
export function counterPlaces(a, b, n, { out = 70, endGap = 0.08 } = {}) {
  const places = [];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  // The customers' side: towards the viewer (larger z).
  let nx = -dz / len;
  let nz = dx / len;
  if (nz < 0) { nx = -nx; nz = -nz; }
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : endGap + (1 - 2 * endGap) * (i / (n - 1));
    const px = a.x + dx * u + nx * out;
    const pz = a.z + dz * u + nz * out;
    places.push({ x: px, z: pz, yaw: cheatOut(yawTo(px, pz, px - nx * out, pz - nz * out)) });
  }
  return places;
}

/**
 * Places round a table (an ellipse on the floor), the near side left open as a
 * stage would ("never turn your back on the house"). `open` is the arc, in
 * degrees, left free towards the viewer.
 */
export function tablePlaces(c, r, n, { open = 110, start = 0 } = {}) {
  const places = [];
  const span = 360 - open;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    // 0° = straight towards the viewer; the open arc is centred there.
    const deg = 180 + start - span / 2 + u * span;
    const a = deg * DEG;
    const x = c.x + Math.sin(a) * r;
    const z = c.z + Math.cos(a) * r * 0.9;
    places.push({ x, z, yaw: cheatOut(yawTo(x, z, c.x, c.z), { share: 0.7, max: 58 }) });
  }
  return places;
}

/**
 * A huddle: heads together. Members stand close round a point, turn in, and
 * lean their tops towards the middle. The conspiratorial look is the lean, not
 * the distance.
 */
export function huddlePlaces(c, n, { r = 95, lean = 9, pitch = 7 } = {}) {
  const places = [];
  for (let i = 0; i < n; i++) {
    const deg = n === 1 ? 180 : 180 - 70 + (140 * i) / (n - 1);
    const a = deg * DEG;
    const x = c.x + Math.sin(a) * r;
    const z = c.z + Math.cos(a) * r * 0.55;
    const side = Math.sign(c.x - x) || 1;
    places.push({ x, z, yaw: cheatOut(yawTo(x, z, c.x, c.z), { share: 0.8, max: 50 }), lean: side * lean, pitch });
  }
  return places;
}

/** Two sides facing off across a gap. */
export function standoffPlaces(c, left, right, { gap = 380, spread = 150, depthStep = 60 } = {}) {
  const out = [];
  left.forEach((_, i) => {
    const x = c.x - gap / 2 - i * spread * 0.7;
    const z = c.z - i * depthStep;
    out.push({ x, z, yaw: cheatOut(yawTo(x, z, c.x + gap / 2, c.z), { share: 0.75, max: 48 }), lean: 0, pitch: -3 });
  });
  right.forEach((_, i) => {
    const x = c.x + gap / 2 + i * spread * 0.7;
    const z = c.z - i * depthStep;
    out.push({ x, z, yaw: cheatOut(yawTo(x, z, c.x - gap / 2, c.z), { share: 0.75, max: 48 }), lean: 0, pitch: -3 });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/*  Demeanour: how a character idles                                    */
/* ------------------------------------------------------------------ */

export const DEMEANOURS = Object.freeze({
  calm:    { breathe: 0.006, breatheHz: 0.22, sway: 0.5, swayHz: 0.09, fidget: 0, pitch: 0, lean: 0, glance: 0.7 },
  nervous: { breathe: 0.01, breatheHz: 0.45, sway: 1.1, swayHz: 0.6, fidget: 0.25, pitch: 2, lean: 0, glance: 1.2, jitter: 0.6 },
  proud:   { breathe: 0.007, breatheHz: 0.18, sway: 0.3, swayHz: 0.07, fidget: 0, pitch: -4, lean: 0, glance: 0.4 },
  slouch:  { breathe: 0.008, breatheHz: 0.15, sway: 0.9, swayHz: 0.06, fidget: 0.05, pitch: 3, lean: 4, glance: 0.3 },
  bouncy:  { breathe: 0.009, breatheHz: 0.5, sway: 0.8, swayHz: 0.35, fidget: 0.4, pitch: 0, lean: 0, glance: 1, hop: 6 },
  sly:     { breathe: 0.006, breatheHz: 0.2, sway: 0.6, swayHz: 0.12, fidget: 0.1, pitch: 4, lean: -3, glance: 1.4 }
});

/**
 * The idle pose offset for a card at time t. `seed` keeps every character out
 * of step with every other; `speakerYaw` (degrees, or null) turns heads a
 * little towards whoever is talking.
 */
export function idle(t, seed, demeanour = "calm", { speakerYaw = null } = {}) {
  const d = DEMEANOURS[demeanour] ?? DEMEANOURS.calm;
  const phase = (seed % 1000) / 1000;
  const breathe = 1 + d.breathe * Math.sin(2 * Math.PI * (t * d.breatheHz + phase));
  let lean = d.lean + d.sway * noise1(t * d.swayHz * 4 + phase * 10, seed);
  let lift = 0;
  if (d.jitter) lean += d.jitter * noise1(t * 9 + phase * 31, seed + 3) * 0.6;
  // A fidget: now and then, a little hop or a shift of weight.
  if (d.fidget) {
    const slot = Math.floor(t * d.fidget + phase * 7);
    const u = t * d.fidget + phase * 7 - slot;
    const roll = Math.abs(noise1(slot * 1.7, seed + 11));
    if (roll > 0.55 && u < 0.18) {
      const w = Math.sin((u / 0.18) * Math.PI);
      lift += (d.hop ?? 3) * w;
      lean += 2.5 * w * (roll > 0.8 ? 1 : -1);
    }
  }
  const glance = speakerYaw === null ? 0 : clamp(speakerYaw, -1, 1) * 6 * d.glance;
  return { breathe, lean, pitch: d.pitch, lift, yaw: glance };
}

/**
 * Walking between places: a card doesn't slide, it steps, like a paper doll.
 * Returns the position along the way and the little lift and rock of a step.
 */
export function stepAlong(from, to, u, { steps = null, height = 14, rock = 4 } = {}) {
  const dist = Math.hypot(to.x - from.x, to.z - from.z);
  const n = steps ?? Math.max(2, Math.round(dist / 90));
  const e = u * u * (3 - 2 * u);
  const s = (u * n) % 1;
  return {
    x: lerp(from.x, to.x, e),
    z: lerp(from.z, to.z, e),
    lift: u >= 1 ? 0 : height * Math.sin(s * Math.PI),
    rock: u >= 1 ? 0 : rock * Math.sin(s * Math.PI * 2) * Math.sign(to.x - from.x || 1)
  };
}

/* ------------------------------------------------------------------ */
/*  Light                                                               */
/* ------------------------------------------------------------------ */

/**
 * How the scene's lights fall on one card. Lights are { x, y, z, colour:
 * [r,g,b], intensity, reach, flicker? }. Returns what the renderer needs:
 * a wash (direction and strength), a rim (side and strength, when the light is
 * behind), a sheen position, an overall brightness, and the floor shadow.
 */
export function lightCard(card, lights, { t = 0, ambient = 0.55, cardH = 470 } = {}) {
  const yaw = card.yaw * DEG;
  const n = { x: Math.sin(yaw), z: Math.cos(yaw) };      // the face's normal
  const right = { x: Math.cos(yaw), z: -Math.sin(yaw) }; // the face's own right
  const cx = card.x;
  const cy = card.floorY - cardH * 0.55;
  const cz = card.z;
  let bright = ambient;
  let washX = 0;
  let washY = 0;
  let washW = 0;
  let wash = [0, 0, 0];
  let rim = 0;
  let rimSide = 0;
  let rimUp = 0;
  let rimColour = [255, 220, 170];
  let hard = 0;
  let key = null;
  let keyPower = 0;
  let keyFront = 0;
  for (const L of lights) {
    const flick = L.flicker ? 1 + L.flicker * noise1(t * (L.flickerHz ?? 7), L.seed ?? 1) : 1;
    const dx = L.x - cx;
    const dy = L.y - cy;
    const dz = L.z - cz;
    const r = Math.hypot(dx, dy, dz) || 1;
    const fall = (L.intensity * flick) / (1 + (r / L.reach) ** 2);
    // Where the light is, seen from the face, in three dimensions: in front or
    // behind, to its right or left, above or below. A lamp straight overhead
    // is neither in front nor behind: it grazes the face from the top.
    const front = (n.x * dx + n.z * dz) / r;
    const across = (right.x * dx + right.z * dz) / r;
    const up = -dy / r;
    const onFace = Math.max(0, front + 0.12) + 0.6 * Math.max(0, up) * (1 - Math.min(1, Math.abs(front)));
    if (onFace > 0.02) {
      const p = fall * onFace;
      bright += p * 0.55;
      washX += across * p;
      washY -= up * p;
      washW += p;
      wash = wash.map((c, i) => c + L.colour[i] * p);
      if (L.hard) hard += p;
    }
    if (front < -0.08) {
      // Behind the card: a rim of light round its edges on the light's side.
      const p = fall * Math.min(1, -front * 1.6);
      rim += p;
      rimSide += across * p;
      rimUp += Math.max(0, up) * p;
      rimColour = L.colour;
    }
    if (fall > keyPower) { keyPower = fall; key = L; keyFront = front; }
  }
  const total = Math.max(1e-6, washW);
  const angle = Math.atan2(washY / total, washX / total) / DEG; // screen-ish direction the light comes from
  // How hard the light is: a strong key against a dim room leaves the far side
  // of the face in shadow; a backlit card is darker all over, outlined by its rim.
  const keyShare = washW / (washW + ambient + 0.15);
  const shade = clamp(0.12 + 0.5 * keyShare + 0.25 * Math.min(1, hard), 0, 0.72);
  const backlit = clamp(rim / (rim + washW + ambient * 0.6), 0, 1);
  // Shadow: away from the strongest light, along the floor.
  let shadow = null;
  if (key) {
    const ax = cx - key.x;
    const az = cz - key.z;
    const height = Math.max(40, card.floorY - key.y);
    const along = Math.hypot(ax, az) || 1;
    shadow = {
      dirX: ax / along, dirZ: az / along,
      length: clamp((cardH * along) / height, cardH * 0.25, cardH * 1.6),
      strength: clamp(keyPower * 0.9, 0.15, 0.75)
    };
  }
  // Sheen: the glass catches the key light as the card turns.
  const keyYaw = key ? Math.atan2(key.x - cx, key.z - cz) : 0;
  const sheen = 50 + 50 * Math.sin((keyYaw - yaw) * 1.4);
  return {
    // A floor under the dark: a room can be moody, but a face must stay readable.
    bright: clamp(bright * (1 - 0.45 * backlit), 0.5, 1.35),
    wash: wash.map((c) => Math.round(clamp(c / total, 0, 255))),
    washPower: clamp(washW, 0, 1.2),
    washAngle: angle,
    // Where on the card's face the light comes from: x across (+ right), y down (+ below).
    washLx: clamp(washX / total, -1, 1),
    washLy: clamp(washY / total, -1, 1),
    shade,
    backlit,
    rim: clamp(rim, 0, 1.2),
    // Which edge the rim is on: -1 left, +1 right, 0 both (straight behind).
    rimSide: rim > 0 ? (Math.abs(rimSide / rim) < 0.25 ? 0 : Math.sign(rimSide)) : 1,
    rimTop: rim > 0 ? clamp(rimUp / rim, 0, 1) : 0,
    rimColour,
    sheen: clamp(sheen, -10, 110),
    // The glass only catches a light that is in front of it.
    sheenPower: key ? clamp(keyPower * 0.8, 0, 0.6) * clamp(keyFront + 0.2, 0, 1) : 0,
    shadow
  };
}

/* ------------------------------------------------------------------ */
/*  Particles                                                           */
/* ------------------------------------------------------------------ */

/**
 * A particle system with world positions, stepped at a fixed rate from a
 * seed, so a screenshot at time t is the same every time. Kinds: dust, smoke,
 * steam, sparks, petals, snow, rain. Cards are obstacles: smoke and steam part
 * round them, sparks bounce off their tops, petals and snow come to rest on
 * them, rain splashes off them.
 */
export const PARTICLE_KINDS = Object.freeze({
  dust:   { rate: 26, life: [5, 9], size: [1.2, 2.8], vy: [-6, 6], vx: [-8, 8], vz: [-6, 6], gravity: 0, drag: 0.4, glow: true },
  smoke:  { rate: 5, life: [5, 8], size: [26, 46], vy: [-26, -14], vx: [-6, 6], vz: [-4, 4], gravity: 0, drag: 0.2, grow: 9, soft: true },
  steam:  { rate: 9, life: [3.5, 6], size: [30, 56], vy: [-34, -18], vx: [-8, 8], vz: [-6, 6], gravity: 0, drag: 0.2, grow: 14, soft: true },
  sparks: { rate: 60, life: [0.5, 1.1], size: [1.6, 3], vy: [-260, -90], vx: [-140, 140], vz: [-60, 60], gravity: 520, drag: 0.1, glow: true, bounce: 0.35, streak: true },
  petals: { rate: 3, life: [9, 14], size: [5, 8], vy: [10, 22], vx: [-22, 4], vz: [-6, 6], gravity: 0, drag: 0.1, settle: true, spin: true },
  snow:   { rate: 30, life: [18, 26], size: [1.6, 3.6], vy: [50, 80], vx: [-10, 10], vz: [-10, 10], gravity: 0, drag: 0.1, settle: true },
  rain:   { rate: 240, life: [0.9, 1.3], size: [1, 1.6], vy: [900, 1200], vx: [-90, -60], vz: [0, 0], gravity: 0, drag: 0, streak: true, splash: true }
});

export function emitter(spec, seed = 1) {
  return { ...spec, kind: PARTICLE_KINDS[spec.kind] ? spec.kind : "dust", rnd: rng(seed), acc: 0, particles: [], settled: [], splashes: [] };
}

/**
 * Step every emitter by dt. `cards` are obstacles: { x, z, floorY, w, h } in
 * world units (the top of a card is floorY - h). The region of an emitter is
 * { x0, x1, y0, y1, z0, z1 } in world units.
 */
export function stepParticles(emitters, cards, dt, { floorY }) {
  for (const em of emitters) {
    // An emitter may override its kind's ranges: a welder's sparks thrown at a
    // wall are not a grinder's thrown at the floor.
    const K = em.over ? { ...PARTICLE_KINDS[em.kind], ...em.over } : PARTICLE_KINDS[em.kind];
    const R = em.region;
    const r = em.rnd;
    const between = (pair) => pair[0] + (pair[1] - pair[0]) * r();
    em.acc += K.rate * (em.density ?? 1) * dt;
    while (em.acc >= 1) {
      em.acc -= 1;
      em.particles.push({
        x: between([R.x0, R.x1]), y: between([R.y0, R.y1]), z: between([R.z0, R.z1]),
        vx: between(K.vx), vy: between(K.vy), vz: between(K.vz),
        size: between(K.size), age: 0, life: between(K.life), spin: r() * 360, hue: r()
      });
    }
    const keep = [];
    for (const p of em.particles) {
      p.age += dt;
      if (p.age > p.life) continue;
      p.vy += (K.gravity ?? 0) * dt;
      p.vx *= 1 - (K.drag ?? 0) * dt;
      p.vz *= 1 - (K.drag ?? 0) * dt;
      const z0 = p.z;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (K.grow) p.size += K.grow * dt;
      // Cards as obstacles.
      for (const c of cards) {
        const half = c.w / 2;
        const top = c.floorY - c.h;
        // A spark that meets a card's face ricochets off it, with a glint.
        if (K.bounce && (z0 - c.z) * (p.z - c.z) < 0 && p.x > c.x - half && p.x < c.x + half && p.y > top && p.y < c.floorY) {
          p.vz = -p.vz * K.bounce * 1.4;
          p.vx *= 0.7;
          p.z = c.z + Math.sign(z0 - c.z || 1) * 2;
          em.splashes.push({ x: p.x, y: p.y, z: p.z, age: 0, glint: true });
          continue;
        }
        if (Math.abs(p.z - c.z) > 60 || p.x < c.x - half || p.x > c.x + half) continue;
        if (K.soft && p.y > top && p.y < c.floorY) {
          // Smoke and steam part round a card.
          p.vx += Math.sign(p.x - c.x || 1) * 120 * dt;
        } else if (Math.abs(p.y - top) < Math.max(4, Math.abs(p.vy) * dt + 2)) {
          if (K.settle) { em.settled.push({ card: c.id, dx: p.x - c.x, size: p.size, spin: p.spin, hue: p.hue }); p.age = p.life + 1; }
          else if (K.bounce && p.vy > 0) { p.vy = -p.vy * K.bounce; p.y = top - 1; }
          else if (K.splash) { em.splashes.push({ x: p.x, y: top, z: c.z, age: 0 }); p.age = p.life + 1; }
        }
      }
      if (p.y > floorY) {
        if (K.bounce && p.vy > 0) { p.vy = -p.vy * K.bounce; p.y = floorY - 1; }
        else if (K.splash) { em.splashes.push({ x: p.x, y: floorY, z: p.z, age: 0 }); continue; }
        else if (K.settle) continue;
        else continue;
      }
      keep.push(p);
    }
    em.particles = keep;
    for (const s of em.splashes) s.age += dt;
    em.splashes = em.splashes.filter((s) => s.age < 0.25);
    const keepSettled = em.kind === "snow" ? 600 : 120;
    if (em.settled.length > keepSettled) em.settled.splice(0, em.settled.length - keepSettled);
  }
  return emitters;
}

/* ------------------------------------------------------------------ */
/*  Tracks: progress you can stand on                                   */
/* ------------------------------------------------------------------ */

/**
 * A track is a path of places across the scene: a climb, a crossing, a chase,
 * an obstacle course. Each slot can carry a label (the obstacle, the skill and
 * the DC) and a threshold (the victory points it stands for, in SF2E's own
 * subsystem terms). Cards stand on slots; the slot a card stands on is its
 * progress, which the whole table can see.
 */
export function trackSlots(points, labels = []) {
  return points.map((p, i) => ({ ...p, index: i, label: labels[i] ?? null }));
}

/** Where a card stands on a track: on its slot, nudged aside if it shares it. */
export function standOnTrack(slots, positions, spacing = 70) {
  const bySlot = new Map();
  for (const [id, index] of Object.entries(positions)) {
    if (!bySlot.has(index)) bySlot.set(index, []);
    bySlot.get(index).push(id);
  }
  const out = {};
  for (const [index, ids] of bySlot) {
    const s = slots[index];
    ids.forEach((id, i) => {
      out[id] = { x: s.x + (i - (ids.length - 1) / 2) * spacing, z: s.z - i * 6, y: s.y ?? null };
    });
  }
  return out;
}
