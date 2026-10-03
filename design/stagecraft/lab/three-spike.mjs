/**
 * The Stage Renderer, a spike: the Paper Lantern drawn with three.js.
 *
 * Plate 38 of the lab. It exists to answer, with pictures and numbers, what
 * ../renderer.md argues: that a real 3D renderer can draw the same stage (same
 * painting, same camera, same people, same puppet physics) with real lights,
 * cast shadows, real objects and post effects, and that the three things
 * Ingram loves survive the move: the stick, the furious wiggle, the bang.
 *
 * REUSED UNCHANGED from the CSS-3D lab, because it is pure:
 *   diorama.mjs   the camera rig, floor points, idle life, noise
 *   puppets.mjs   the spring model: follow, lean, wobble, jolt, bonk, verbs
 *   emotes.mjs    the sticker SVGs
 * NEW here is only the drawing (and the three-dimensional consequences of it).
 *
 *   ?t=<ms>      freeze the scripted scene at that moment (deterministic)
 *   ?live        run it: drag any card along the floor, wiggle it, bang it into another
 *   ?bench       render a block of frames and report milliseconds per frame on this GPU
 *   ?rw=<px>     drawing-buffer width (the page is always laid out at 2560 x 1440)
 *   ?post=0      no bloom/vignette/grain pass (to measure what post-processing costs)
 *   ?shadows=0   no shadow maps
 *   ?msaa=<n>    samples on the post-processing target (default 4)
 *   ?foot=1      footlights on (the F key in live mode): low warm lights in front, every card's shadow up the wall
 *   ?poster=wiggle|bang|foot   numbered notes over the still
 *
 * COORDINATES. One world unit is one CSS pixel on the z = 0 plane of a 2560 x
 * 1440 page. X is the lab's screen x minus the vanishing point; Y is up from
 * the floor; Z is towards the viewer. The camera sits at (0, floorY - horizonY,
 * f) with an off-axis frustum so the vanishing point lands where the painting's
 * horizon is. That reproduces the CSS camera of diorama.mjs exactly, so a card
 * placed at a painting fraction lands on the same pixel as in plates 13 to 37.
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { coverMap, makeCamera, floorPoint, idle, noise1 } from "./diorama.mjs";
import { createPuppet, stepPuppet, collide, box, perform, verbPose } from "./puppets.mjs";
import { EMOTES } from "./emotes.mjs";
import {
  W, H, IMG, RIG, CARD_SCALE, CW, CH, CARDS, T_PICK, T_WIGGLE, T_CHARGE, ease, scriptedHand as handAt
} from "./spike-script.mjs";

const q = new URLSearchParams(location.search);
// The stage is authored on a 2560 x 1440 page (Ingram's screen: 4K at 150%).
// Every length below is a CSS pixel of that page. `rw` is only the size of the
// drawing buffer, so the same scene can be measured at 1280, 2560 or 3840 wide.
const T_STILL = q.has("t") ? Number(q.get("t")) / 1000 : null;
const BENCH = q.has("bench");
const LIVE = q.has("live") || (T_STILL === null && !BENCH);
const RW = Number(q.get("rw")) || (LIVE ? Math.max(960, Math.min(2560, Math.round(window.innerWidth * window.devicePixelRatio))) : W);
const RH = Math.round((RW * H) / W);
const POSTER = q.has("poster");
const FOOT = q.get("foot") === "1";
const POST = q.get("post") !== "0";
const SHADOWS = q.get("shadows") !== "0";
const MSAA = q.has("msaa") ? Number(q.get("msaa")) : 4;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ */
/*  The scene, as data (the Paper Lantern of plate 13)                  */
/* ------------------------------------------------------------------ */

const ART = "../../../artwork/locations/the-paper-lantern.png";
const STAGE = "../../../module/blank-inheritance/assets/stage/";
const LANTERN = [255, 172, 96];
const HOLD_LIFT = 70;     // how far a held card is raised off the floor
const STICK = 134;        // the stick's length at scale 1 (the CSS lab's 150 px handle less its collar)

const PEOPLE = {
  kiku: { name: "Kiku Enomoto", src: `${STAGE}kiku.webp` },
  sanzo: { name: "Sanzo", src: `${STAGE}sanzo.webp` },
  tama: { name: "Tama", src: `${STAGE}tama.webp` },
  etsuko: { name: "Etsuko", src: `${STAGE}kimura-etsuko.webp`, who: "#5fb3d9" },
  masaru: { name: "Masaru", src: `${STAGE}kaneda-masaru.webp`, who: "#e06a5a" },
  nren: { name: "Ren", src: `${STAGE}nakamura-ren.webp`, who: "#86c76a" },
  hiroshi: { name: "Hiroshi", src: `${STAGE}sato-hiroshi.webp`, who: "#e3c45a" },
  yumiko: { name: "Yumiko", src: `${STAGE}watanabe-yumiko.webp`, who: "#c99be0" }
};

const LIGHTS = [
  { at: [0.165, 0.12], below: 0.97, colour: LANTERN, intensity: 1.0, flicker: 0.06 },
  { at: [0.31, 0.2], below: 0.88, colour: LANTERN, intensity: 0.9, flicker: 0.07 },
  { at: [0.53, 0.29], below: 0.82, colour: LANTERN, intensity: 1.2, flicker: 0.05, pool: 380, shadow: true },
  { at: [0.81, 0.22], below: 0.92, colour: LANTERN, intensity: 1.0, flicker: 0.06, pool: 340, shadow: true },
  { at: [0.37, 0.56], below: 0.78, colour: [255, 120, 60], intensity: 0.8, flicker: 0.18, flickerHz: 11, shadow: true }
];

// The cast (CARDS) and the scripted hand live in spike-script.mjs, which is pure so that a test can check the numbers.

/* ------------------------------------------------------------------ */
/*  The page: HTML for the UI, a canvas for the world                   */
/* ------------------------------------------------------------------ */

const screenEl = document.getElementById("screen");
screenEl.style.width = `${W}px`;
screenEl.style.height = `${H}px`;
const canvas = document.getElementById("gl");
// In a smaller window the whole page is scaled down to fit, as the CSS-3D lab does.
function fitToWindow() {
  const k = Math.min(window.innerWidth / W, window.innerHeight / H, 1);
  screenEl.style.transformOrigin = "0 0";
  screenEl.style.transform = k < 1 ? `scale(${k})` : "none";
}
fitToWindow();
window.addEventListener("resize", fitToWindow);

const el = (tag, cls = "", html = null) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== null) n.innerHTML = html;
  return n;
};

/* ------------------------------------------------------------------ */
/*  The camera: the CSS camera of diorama.mjs, as a three.js camera     */
/* ------------------------------------------------------------------ */

const map = coverMap(IMG[0], IMG[1], W, H, 0.5, RIG.lift, 0.5);
const cam = makeCamera(RIG, map, W);
const { f, cx, cy, floorY } = cam;

const camera = new THREE.PerspectiveCamera();
camera.position.set(0, floorY - cy, f);
{
  const near = 20;
  const far = 30000;
  camera.projectionMatrix.makePerspective((-near * cx) / f, (near * (W - cx)) / f, (near * cy) / f, (-near * (H - cy)) / f, near, far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.updateProjectionMatrix = () => {}; // keep the off-axis frustum
  camera.updateMatrixWorld(true);
}

// PointsMaterial sizes a point as size * (buffer height / 2) / distance, which assumes a 90 degree lens. Ours is f px long.
const POINT_K = f / (H / 2);

/** A point of the painting (screen px, y down) at a depth Z, as a world position. */
const atDepth = (sx, sy, Z) => new THREE.Vector3(((sx - cx) * (f - Z)) / f, floorY - cy - ((sy - cy) * (f - Z)) / f, Z);
/** A point marked on the painting (fractions) on the floor, as world X and Z. */
const floorXZ = (fx, fy) => {
  const p = floorPoint(cam, fx, fy);
  return { X: p.x - cx, Z: p.z };
};

/* ------------------------------------------------------------------ */
/*  The renderer                                                        */
/* ------------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !POST, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(RW, RH, false);              // the buffer
canvas.style.width = `${W}px`;                // the page it is stretched over
canvas.style.height = `${H}px`;
renderer.info.autoReset = false;              // count every pass of a frame, not just the last
renderer.shadowMap.enabled = SHADOWS;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();

const gpu = (() => {
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown GPU";
})();

/* ------------------------------------------------------------------ */
/*  Textures: the painting, and the cards drawn from a "skin"           */
/* ------------------------------------------------------------------ */

const loadImage = (src) => new Promise((resolve, reject) => {
  const im = new Image();
  im.onload = () => resolve(im);
  im.onerror = () => reject(new Error(`failed to load ${src}`));
  im.src = src;
});
const canvasTexture = (c, aniso = 8) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
};
const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

/**
 * The card face: the campaign's brass moulding, the portrait, the bone nameplate.
 * In the module this is the Skin's job (a function from a person to a canvas);
 * here it stands in for the HTML `bi-frame`, drawn at 2x.
 */
function paintFace(img, name, who) {
  const w = CW * 2;
  const h = CH * 2;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  // The brass moulding.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#ecd29a"); g.addColorStop(0.45, "#a98440"); g.addColorStop(1, "#4a3818");
  roundRect(ctx, 0, 0, w, h, 26);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,246,214,0.55)"; roundRect(ctx, 6, 6, w - 12, h - 12, 22); ctx.stroke();
  ctx.strokeStyle = "rgba(40,28,10,0.7)"; roundRect(ctx, 16, 16, w - 32, h - 32, 16); ctx.stroke();
  // The portrait, cover-fitted into a 2:3 window.
  const px = 24; const py = 24; const pw = w - 48; const ph = Math.round(pw * 1.5);
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 10); ctx.clip();
  ctx.fillStyle = "#17201f"; ctx.fillRect(px, py, pw, ph);
  const s = Math.max(pw / img.width, ph / img.height);
  const dw = img.width * s; const dh = img.height * s;
  ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) * 0.15, dw, dh);
  const v = ctx.createRadialGradient(px + pw / 2, py + ph * 0.45, ph * 0.3, px + pw / 2, py + ph * 0.45, ph * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = v; ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  if (who) { ctx.fillStyle = who; ctx.shadowColor = who; ctx.shadowBlur = 16; ctx.fillRect(px, py + 18, 9, ph - 36); ctx.shadowBlur = 0; }
  ctx.fillStyle = "#4fc8d8"; ctx.shadowColor = "#4fc8d8"; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(w - 52, 52, 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  // The nameplate.
  const ny = py + ph + 12; const nh = h - ny - 24;
  const n = ctx.createLinearGradient(0, ny, 0, ny + nh);
  n.addColorStop(0, "#f3ecd6"); n.addColorStop(1, "#cbbf9f");
  roundRect(ctx, px, ny, pw, nh, 8); ctx.fillStyle = n; ctx.fill();
  ctx.fillStyle = "#231c10"; ctx.font = '700 36px "Chakra Petch", sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.letterSpacing = "6px";
  ctx.fillText(name.toUpperCase(), w / 2, ny + nh / 2 + 2);
  return c;
}

/** The brass back, with a typed label: for turning your back on someone. */
function paintBack(name) {
  const w = CW * 2; const h = CH * 2;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#9a7c43"); g.addColorStop(0.6, "#5f4a22"); g.addColorStop(1, "#3e2f14");
  roundRect(ctx, 0, 0, w, h, 26); ctx.fillStyle = g; ctx.fill();
  for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) {
    const r = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 13);
    r.addColorStop(0, "#f1d9a2"); r.addColorStop(1, "#5f4a22");
    ctx.fillStyle = r; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
  }
  ctx.fillStyle = "#efe6cf"; roundRect(ctx, w / 2 - 130, h / 2 - 34, 260, 68, 4); ctx.fill();
  ctx.fillStyle = "#2a2316"; ctx.font = '36px "Special Elite", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(name, w / 2, h / 2 + 2);
  return c;
}

const softDot = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

/** An emote: the campaign's sticker SVG, drawn to a texture and shown as a sprite. */
async function emoteSprite(id) {
  const svg = EMOTES[id].svg.replace("<svg ", '<svg width="256" height="256" ');
  const im = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const c = document.createElement("canvas"); c.width = c.height = 256;
  c.getContext("2d").drawImage(im, 0, 0, 256, 256);
  const mat = new THREE.SpriteMaterial({ map: canvasTexture(c), depthTest: false, transparent: true });
  const sp = new THREE.Sprite(mat);
  sp.renderOrder = 50;
  return sp;
}

/** Brass-edged impact lines, for the bang. */
function impactTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const ctx = c.getContext("2d"); ctx.translate(128, 128); ctx.lineCap = "round";
  const rays = 9;
  for (const [w, col] of [[20, "#1b140c"], [10, "#e6c98d"]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + 0.3; const len = 120 * (0.72 + 0.28 * (((i * 7) % 3) / 2));
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 46, Math.sin(a) * 46); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke();
    }
  }
  ctx.fillStyle = "#fff7d6"; ctx.strokeStyle = "#1b140c"; ctx.lineWidth = 6; ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 18 : 40; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  return canvasTexture(c);
}

/* ------------------------------------------------------------------ */
/*  Building the stage                                                  */
/* ------------------------------------------------------------------ */

const state = { cards: [], lights: [], lanterns: [], foot: [], ambient: null, wall: null, footOn: false, dust: null, dustBase: null, impacts: [], bonks: [], sparks: null, flash: null, ready: false };
const byId = (id) => state.cards.find((c) => c.spec.id === id);

/**
 * The stick: a turned, lacquered walnut grip that tapers to the hand, a brass collar
 * the card stands on, and at the hand a glowing ring in the player's colour (the CSS
 * lab's "whose hand is on it"). Built for every card, shown only while it is held.
 */
function buildStick(s, who, brass) {
  const len = STICK * s;
  const collarH = 18 * s;
  const colour = who ? new THREE.Color(who) : new THREE.Color(0xe8e0c8);
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x80512d, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x42240f, emissiveIntensity: 0.9 });
  const rod = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(8.5 * s, 6.4 * s, len - collarH, 24), lacquer);
  grip.position.y = (len - collarH) / 2;
  const end = new THREE.Mesh(new THREE.SphereGeometry(6.4 * s, 18, 12), lacquer);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(12.5 * s, 10 * s, collarH, 28), brass);
  collar.position.y = len - collarH / 2;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(12 * s, 2.2 * s, 8, 28), brass);
  lip.rotation.x = Math.PI / 2; lip.position.y = len - collarH;
  const hand = new THREE.Mesh(new THREE.TorusGeometry(21, 3.6, 10, 36), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 1.6, roughness: 0.4 }));
  hand.rotation.x = Math.PI / 2; hand.position.y = 8;
  for (const m of [grip, end, collar, lip]) m.castShadow = true;
  rod.add(grip, end, collar, lip, hand);
  rod.visible = false;
  return { rod, len };
}

async function build() {
  await Promise.all(["700 30px 'Chakra Petch'", "30px 'Special Elite'", "400 20px 'Shippori Mincho'"].map((fnt) => document.fonts.load(fnt).catch(() => null)));
  const painting = await loadImage(ART);
  const paintTex = new THREE.Texture(painting);
  paintTex.colorSpace = THREE.SRGBColorSpace; paintTex.anisotropy = 8; paintTex.generateMipmaps = true; paintTex.minFilter = THREE.LinearMipmapLinearFilter; paintTex.needsUpdate = true;

  // The room's own colour, as the environment the brass reflects: the painting, blurred into an environment map.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = new THREE.Texture(painting); envTex.mapping = THREE.EquirectangularReflectionMapping; envTex.colorSpace = THREE.SRGBColorSpace; envTex.needsUpdate = true;
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  scene.environmentIntensity = 0.6;
  envTex.dispose();
  pmrem.dispose();

  // The painting: a plane far behind everything, sized so it lands 1:1 on the screen.
  const D = 4000;
  const iw = IMG[0] * map.s; const ih = IMG[1] * map.s;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: paintTex, color: 0xdcdcdc }));
  back.position.copy(atDepth(map.ox + iw / 2, map.oy + ih / 2, -D));
  back.scale.set((iw * (f + D)) / f, (ih * (f + D)) / f, 1);
  scene.add(back);

  // The counter: cut out of the painting and stood at its own depth. A real occluder.
  {
    const poly = [[0.235, 0.7], [0.728, 0.7], [0.728, 0.9], [0.235, 0.9]];
    const Z = floorPoint(cam, 0.48, 0.86).z;
    const pos = []; const uv = [];
    for (const [fx, fy] of poly) {
      const v = atDepth(map.x(fx), map.y(fy), Z);
      pos.push(v.x, v.y, v.z); uv.push(fx, 1 - fy);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex([0, 2, 1, 0, 3, 2]);
    scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: paintTex, color: 0xdcdcdc, side: THREE.DoubleSide })));
  }

  // The floor: invisible, except where it takes a shadow.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000), new THREE.ShadowMaterial({ opacity: 0.62 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true; floor.renderOrder = 2;
  scene.add(floor);

  // Light. Real spot lights where the lanterns hang, each throwing a cone and (for three of them) a shadow.
  state.ambient = new THREE.AmbientLight(0xffd2a0, 1.7);
  scene.add(state.ambient);
  LIGHTS.forEach((L, i) => {
    const fp = floorPoint(cam, L.at[0], L.below);
    const k = f / (f - fp.z);
    const lx = cx + (map.x(L.at[0]) - cx) / k; const ly = cy + (map.y(L.at[1]) - cy) / k;
    const pos = new THREE.Vector3(lx - cx, floorY - ly, fp.z);
    const col = new THREE.Color(L.colour[0] / 255, L.colour[1] / 255, L.colour[2] / 255);
    const spot = new THREE.SpotLight(col, 0, 0, 1.2, 0.9, 2);
    spot.position.copy(pos);
    spot.target.position.set(pos.x, 0, pos.z);
    scene.add(spot, spot.target);
    spot.userData = { base: L.intensity * 3.2e6, flicker: L.flicker ?? 0, hz: L.flickerHz ?? 7, seed: i + 1 };
    if (L.shadow && SHADOWS) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0004;
      spot.shadow.radius = 5;
      spot.shadow.camera.near = 30; spot.shadow.camera.far = 3000;
    }
    state.lights.push(spot);
    state.lanterns.push({ pos, colour: col });
    if (L.pool) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(L.pool * 0.62, 48), new THREE.MeshBasicMaterial({ map: softDot, color: col, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(pos.x, 1, pos.z); pool.renderOrder = 1;
      scene.add(pool);
    }
  });

  // Footlights: the oldest light in the theatre, low and in front, so every card's shadow climbs the painted wall behind it.
  for (const sx of [-1, 1]) {
    const spot = new THREE.SpotLight(0xffc27a, 0, 0, 0.66, 0.75, 2);
    spot.position.set(sx * 640, 26, 360);
    spot.target.position.set(sx * 140, 340, -420);
    scene.add(spot, spot.target);
    spot.userData = { base: 2.3e6 };
    if (SHADOWS) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0005;
      spot.shadow.radius = 4;
      spot.shadow.camera.near = 40; spot.shadow.camera.far = 2800;
    }
    state.foot.push(spot);
  }
  state.wall = new THREE.Mesh(new THREE.PlaneGeometry(7000, 2600), new THREE.ShadowMaterial({ opacity: 0.72 }));
  state.wall.position.set(0, 1300, -2300);       // the back of the room, behind Kiku: footlight shadows climb it, three times life size
  state.wall.receiveShadow = true; state.wall.renderOrder = 2;
  scene.add(state.wall);

  // Dust: a few hundred points in one draw call, bright only where a lantern reaches it.
  {
    const n = 420; const p = new Float32Array(n * 3);
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < n; i++) { p[i * 3] = (rnd() - 0.5) * 2600; p[i * 3 + 1] = 40 + rnd() * 820; p[i * 3 + 2] = -520 + rnd() * 760; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p.slice(), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    state.dust = new THREE.Points(geo, new THREE.PointsMaterial({ size: 8 * POINT_K, map: softDot, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    state.dust.frustumCulled = false;
    state.dustBase = p;
    scene.add(state.dust);
  }

  // The cards.
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8924f, metalness: 1, roughness: 0.34 });
  for (const spec of CARDS) {
    const who = PEOPLE[spec.id];
    const img = await loadImage(who.src);
    const face = paintFace(img, who.name, who.who);
    const s = CARD_SCALE * (spec.size ?? 1);
    const fp = floorXZ(spec.at[0], spec.at[1]);

    // root (the grip, on the floor) > leanG (the stick swings about the grip) > hinge (the collar; the card swings a little further) > yawG > card
    const root = new THREE.Group();
    const leanG = new THREE.Group();
    root.add(leanG);
    const { rod, len } = buildStick(s, who.who, brass);
    leanG.add(rod);
    const hinge = new THREE.Group();
    leanG.add(hinge);
    const yawG = new THREE.Group();
    yawG.rotation.order = "YXZ";
    hinge.add(yawG);

    const body = new THREE.Mesh(new RoundedBoxGeometry(CW - 3, CH - 3, 12, 3, 6), brass);
    body.position.y = CH / 2; body.castShadow = true;
    const frontMat = new THREE.MeshPhysicalMaterial({ map: canvasTexture(face), roughness: 0.5, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.22, transparent: true, alphaTest: 0.5, envMapIntensity: 0.7 });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), frontMat);
    front.position.set(0, CH / 2, 6.2); front.receiveShadow = true;
    const backMat = new THREE.MeshStandardMaterial({ map: canvasTexture(paintBack(who.name)), roughness: 0.62, metalness: 0.35, transparent: true, alphaTest: 0.5 });
    const backFace = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), backMat);
    backFace.position.set(0, CH / 2, -6.2); backFace.rotation.y = Math.PI;
    // the foot it stands on, with the player's colour in enamel
    const foot = new THREE.Mesh(new THREE.BoxGeometry(CW * 0.5, 12, 54), brass);
    foot.position.set(0, -6, 0); foot.castShadow = true;
    const card = new THREE.Group();
    card.add(body, front, backFace, foot);
    if (who.who) {
      const enamel = new THREE.Mesh(new THREE.BoxGeometry(CW * 0.5 - 8, 3, 8), new THREE.MeshStandardMaterial({ color: who.who, roughness: 0.35, metalness: 0.1 }));
      enamel.position.set(0, -2.5, 24); card.add(enamel);
    }
    card.scale.setScalar(s);
    yawG.add(card);
    root.position.set(fp.X, 0, fp.Z);
    scene.add(root);

    // A soft blob on the floor under it, which stays put while the card is lifted (the CSS lab's .lab-shadow).
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softDot, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2;
    scene.add(blob);

    const entry = {
      blob, spec, who, root, leanG, hinge, yawG, card, rod, s, Z: fp.Z, zOff: 0, rodLen: len, grip: 0,
      seed: 1000 + CARDS.indexOf(spec) * 137, emote: null,
      puppet: createPuppet({ id: spec.id, x: fp.X, y: 0, rod: 0, w: CW * s, h: CH * s, scale: 1 })
    };
    root.traverse((m) => { m.userData.owner = entry; });
    if (spec.emote) {
      entry.emote = await emoteSprite(spec.emote);
      entry.emote.scale.set(96, 96, 1);
      scene.add(entry.emote);
    }
    state.cards.push(entry);
  }

  // Impact marks for the bang (pooled), a flash of real light, and a spray of sparks.
  state.impactTex = impactTexture();
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: state.impactTex, depthTest: false, transparent: true, opacity: 0 }));
    sp.renderOrder = 60; sp.scale.set(180, 180, 1); scene.add(sp); state.impacts.push(sp);
  }
  state.flash = new THREE.PointLight(0xffe2a8, 0, 1100, 2);
  scene.add(state.flash);
  {
    const n = 48; const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    state.sparks = new THREE.Points(geo, new THREE.PointsMaterial({ size: 12 * POINT_K, map: softDot, color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    state.sparkDir = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + (i % 5) * 0.37; const sp = 260 + ((i * 53) % 340);
      return [Math.cos(a) * sp, Math.sin(a) * sp * 0.8 + 120, ((i * 31) % 100) - 50];
    });
    state.sparks.frustumCulled = false;
    scene.add(state.sparks);
  }
  state.ready = true;
}

/* ------------------------------------------------------------------ */
/*  Post: bloom for the lanterns, then a vignette and grain             */
/* ------------------------------------------------------------------ */

let composer = null;
const filmPass = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.022 }, uVig: { value: 0.42 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount; uniform float uVig; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float v = smoothstep(0.95, 0.35, length(d * vec2(1.05, 1.0)));
      c.rgb *= mix(1.0 - uVig, 1.0, v);
      c.rgb += (hash(vUv * vec2(2560.0, 1440.0)) - 0.5) * uAmount;
      gl_FragColor = c;
    }`
};
function buildPost() {
  const target = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.HalfFloatType, samples: MSAA });
  composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1); composer.setSize(RW, RH);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(RW, RH), 0.32, 0.55, 0.82));
  composer.addPass(new ShaderPass(filmPass));
  composer.addPass(new OutputPass());
}

/* ------------------------------------------------------------------ */
/*  The scripted scene: lift, wiggle furiously, wind up, charge, bang   */
/* ------------------------------------------------------------------ */

/** The scripted hand for the scene as it stands in the stage. */
function scriptedHand(t, held, target) {
  return handAt(t, { x0: held.restX0, etsukoX: byId("etsuko").restX0, tamaX: target.restX0, width: held.s * CW });
}

let touching = new Set();
function resetSimulation() {
  touching = new Set();
  state.bonks = [];
  for (const c of state.cards) {
    const p = c.puppet;
    Object.assign(p, { x: c.restX0, vx: 0, ax: 0, lean: 0, leanV: 0, jx: 0, jv: 0, heldBy: null, target: null, restX: c.restX0, turn: 0, turnV: 0, turnTo: 0, verbs: [] });
    c.zOff = 0; c.grip = 0;
  }
}

/** Is `a` standing across `b` on the stage floor (the same lane, boxes overlapping)? */
const inLane = (a, b, depth = 150) => Math.abs(a.Z - b.Z) < depth;
const xOverlap = (a, b) => { const A = box(a.puppet); const B = box(b.puppet); return Math.min(A.right, B.right) - Math.max(A.left, B.left) > 0; };

/** One fixed step of the whole stage: every puppet, every bump, and a held card passing in front of what it overlaps. */
function stepStage(t, dt, holder, hand) {
  for (const c of state.cards) {
    const p = c.puppet;
    p.target = c === holder ? hand : null;
    p.heldBy = c === holder ? "user" : null;
    stepPuppet(p, dt);
  }
  if (!holder) { touching.clear(); return []; }
  const lane = state.cards.filter((c) => c === holder || inLane(c, holder));
  const contacts = collide(lane.map((c) => c.puppet), touching);
  const over = lane.some((c) => c !== holder && xOverlap(holder, c));
  holder.zOff += ((over ? 85 : 0) - holder.zOff) * Math.min(1, dt * 11);
  for (const k of contacts) state.bonks.push({ t, ...k, Z: holder.Z });
  return contacts;
}

function simulateTo(tEnd, dt = 1 / 120) {
  const held = byId("yumiko"); const target = byId("tama");
  for (let t = 0; t < tEnd - 1e-9; t += dt) {
    const picked = t >= T_PICK;
    held.grip = ease((t - T_PICK) / 0.28);
    stepStage(t, dt, picked ? held : null, { x: scriptedHand(t, held, target), y: 0 });
  }
}

/** Put the scripted scene at `ms` and draw it. Deterministic: the same ms gives the same picture. */
function setTime(ms) {
  const t = ms / 1000;
  resetSimulation();
  simulateTo(t);
  pose(t);
  render();
  return t;
}

/* ------------------------------------------------------------------ */
/*  Posing every card for time t                                        */
/* ------------------------------------------------------------------ */

function pose(t) {
  for (const c of state.cards) {
    const sp = c.spec;
    const p = c.puppet;
    const life = idle(t, c.seed, sp.demeanour ?? "calm", { speakerYaw: null });
    const vp = verbPose(p);
    const g = c.grip;
    const X = p.x + p.jx;
    const lean = p.lean + life.lean * (1 - 0.85 * g);
    // The stick swings about the grip; the card hinges at the collar and swings a little further.
    const share = 1 - 0.45 * g;
    c.root.position.set(X, life.lift * (1 - g) + HOLD_LIFT * g + vp.lift, c.Z + c.zOff);
    c.leanG.rotation.z = -lean * share * DEG;
    c.hinge.position.y = c.rodLen * g;
    c.hinge.rotation.z = -lean * (1 - share) * DEG;
    c.blob.position.set(X, 0.6, c.Z + c.zOff);
    c.blob.scale.set(CW * c.s * (0.95 + 0.5 * g), 74 + 46 * g, 1);
    c.blob.material.opacity = 0.62 - 0.26 * g;
    c.rod.visible = g > 0.02;
    c.rod.scale.set(1, Math.max(g, 0.001), 1);
    c.yawG.rotation.set((life.pitch + vp.tipX + vp.dip * 0.4) * DEG, ((sp.yaw ?? 0) + p.turn + vp.shakeY + life.yaw) * DEG, 0);
    c.card.scale.set(c.s, c.s * life.breathe * vp.squash, c.s);
    if (c.emote) {
      const age = (t - (sp.t0 ?? 0)) % 6;
      c.emote.position.set(X + 74 * c.s, c.root.position.y + c.rodLen * g + CH * c.s * life.breathe + 36 + Math.sin(t * 2 + c.seed) * 5, c.Z + c.zOff + 30);
      c.emote.material.opacity = age < 0 ? 0 : age < 0.2 ? age / 0.2 : age > 4.4 ? Math.max(0, 1 - (age - 4.4) / 0.6) : 1;
      const pop = age < 0.3 ? 0.6 + 0.4 * Math.sin((age / 0.3) * Math.PI * 0.5) + 0.12 * Math.sin((age / 0.3) * Math.PI) : 1;
      c.emote.scale.set(96 * pop, 96 * pop, 1);
    }
  }
  // The lanterns flicker; the dust drifts and glimmers near them.
  for (const L of state.lights) {
    const u = L.userData;
    L.intensity = u.base * (1 + u.flicker * noise1(t * u.hz, u.seed));
  }
  if (state.dust) {
    const a = state.dust.geometry.attributes.position;
    const col = state.dust.geometry.attributes.color;
    for (let i = 0; i < a.count; i++) {
      const x = state.dustBase[i * 3] + Math.sin(t * 0.21 + i) * 22;
      const y = state.dustBase[i * 3 + 1] + ((t * (4 + (i % 7))) % 120);
      const z = state.dustBase[i * 3 + 2];
      a.array[i * 3] = x; a.array[i * 3 + 1] = y; a.array[i * 3 + 2] = z;
      let r = 0; let gg = 0; let b = 0;
      for (const l of state.lanterns) {
        const d2 = (x - l.pos.x) ** 2 + (y - l.pos.y) ** 2 + (z - l.pos.z) ** 2;
        const w = Math.max(0, 1 - Math.sqrt(d2) / 900);
        r += l.colour.r * w * w; gg += l.colour.g * w * w; b += l.colour.b * w * w;
      }
      col.array[i * 3] = Math.min(1, r); col.array[i * 3 + 1] = Math.min(1, gg); col.array[i * 3 + 2] = Math.min(1, b);
    }
    a.needsUpdate = true; col.needsUpdate = true;
  }
  // The bang: brass impact lines, a flash of light, and sparks that fly and fall.
  state.impacts.forEach((im) => (im.material.opacity = 0));
  state.flash.intensity = 0;
  state.sparks.material.opacity = 0;
  let slot = 0;
  for (const b of state.bonks) {
    const age = t - b.t;
    if (age < 0 || age > 0.8) continue;
    const y = CH * CARD_SCALE * 0.5 + 60;
    if (age < 0.42 && slot < state.impacts.length) {
      const im = state.impacts[slot++];
      const u = age / 0.42;
      im.position.set(b.x, y + 10, b.Z + 90);
      im.scale.setScalar(120 + 150 * Math.sqrt(u));
      im.material.opacity = 1 - u * u;
      im.material.rotation = 0.2 * u;
    }
    if (age < 0.2) {
      state.flash.position.set(b.x, y, b.Z + 300);
      state.flash.intensity = 5.5e5 * (1 - age / 0.2) ** 2;
    }
    if (b === state.bonks[state.bonks.length - 1]) {
      const pa = state.sparks.geometry.attributes.position;
      state.sparkDir.forEach((v, i) => {
        pa.array[i * 3] = b.x + v[0] * age;
        pa.array[i * 3 + 1] = Math.max(2, y + v[1] * age - 900 * age * age);
        pa.array[i * 3 + 2] = b.Z + 90 + v[2] * age;
      });
      pa.needsUpdate = true;
      state.sparks.material.opacity = Math.max(0, 1 - age / 0.8);
    }
  }
  filmPass.uniforms.uTime.value = (Math.floor(t * 24) % 97) * 0.37;
}

/** Footlights on or off. Off, they are not in the shader at all (it costs nothing). */
function setFoot(on) {
  state.footOn = on;
  for (const L of state.foot) { L.visible = on; L.intensity = on ? L.userData.base : 0; }
  state.wall.visible = on;
  state.ambient.intensity = on ? 1.25 : 1.7;
}

function render() {
  renderer.info.reset();
  if (POST && composer) composer.render();
  else renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ */
/*  The HTML over the canvas: the deck, the title, notes, the HUD       */
/* ------------------------------------------------------------------ */

const NOTES = {
  wiggle: [
    [1, "The lanterns are real spot lights now. Each card is lit by the ones near it, and the brass takes the colour of the room.", 70, 280],
    [2, "Every card is an object: a brass body, glass over the portrait, a brass back, a foot with the player's colour in enamel.", 70, 560],
    [3, "The stick: lacquered walnut, a brass collar, and a glowing ring in the player's colour where the hand is. It grows out as the card lifts.", 1850, 1172],
    [4, "The furious wiggle. The stick swings about the hand and the card swings a little further at the collar, so the two lean by different amounts.", 1640, 560]
  ],
  bang: [
    [1, "One bonk per contact: brass impact lines, and a real flash of light that falls on both cards.", 1420, 430],
    [2, "Sparks fly and fall. Both cards jolt and spin from the same spring model as the CSS lab, then settle back.", 1420, 560],
    [3, "The card in the hand passes in front of the one it hit. In 3D that is a step forward in depth, not a trick of stacking order.", 1420, 690]
  ],
  foot: [
    [1, "Footlights: two low warm lights in front of the stage, which the CSS lab could not do at all.", 70, 280],
    [2, "Every card throws its shadow up the back wall, three times life size, and the shadows move when the cards do.", 70, 460]
  ]
};

function chrome() {
  screenEl.append(el("div", "lab-deck", "<span>The deck</span>"));
  screenEl.append(el("div", "lab-title", `<span>Stagecraft lab · 38</span><b>The Stage Renderer: the Paper Lantern in three.js</b>`));
  if (POSTER) {
    for (const [n, text, x, y] of NOTES[q.get("poster")] ?? NOTES.wiggle) {
      const d = el("div", "lab-note is-caption", `<i>${n}</i><span>${text}</span>`);
      Object.assign(d.style, { left: `${x}px`, top: `${y}px` });
      screenEl.append(d);
    }
  }
}
function hud(extra = "") {
  let h = document.querySelector(".tsp-hud");
  if (!h) { h = el("div", "tsp-hud"); screenEl.append(h); }
  const i = renderer.info;
  h.innerHTML = `three.js r${THREE.REVISION} · ${gpu.replace(/ANGLE \(|\)$/g, "").slice(0, 60)}\nbuffer ${RW}×${RH} · draw calls <b>${i.render.calls}</b> · triangles <b>${i.render.triangles.toLocaleString()}</b> · textures <b>${i.memory.textures}</b>${extra}`;
}

/* ------------------------------------------------------------------ */
/*  Live: drag any card along the floor, wiggle it, bang it             */
/* ------------------------------------------------------------------ */

function startLive() {
  screenEl.append(el("div", "tsp-hint", "<b>DRAG</b> any card along the floor and wiggle it hard<br><b>BANG</b> it into another card<br><b>SPACE</b> hop · <b>N</b> nod · <b>B</b> bow · <b>X</b> shake · <b>T</b> turn your back<br><b>F</b> footlights"));
  resetSimulation();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const pickables = state.cards.flatMap((c) => c.card.children);
  let drag = null; // { c, plane, offX, offZ }
  let hand = { x: 0, y: 0 };
  let handZ = 0;
  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
  };
  canvas.addEventListener("pointerdown", (e) => {
    aim(e);
    const h = ray.intersectObjects(pickables, false)[0];
    if (!h) return;
    const c = h.object.userData.owner;
    drag = { c, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -h.point.y), offX: h.point.x - c.puppet.x, offZ: h.point.z - c.Z };
    hand = { x: c.puppet.x, y: 0 }; handZ = c.Z;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    aim(e);
    if (!drag) { canvas.style.cursor = ray.intersectObjects(pickables, false).length ? "grab" : "default"; return; }
    if (ray.ray.intersectPlane(drag.plane, hit)) {
      hand = { x: Math.max(-1500, Math.min(1500, hit.x - drag.offX)), y: 0 };
      handZ = Math.max(-2000, Math.min(230, hit.z - drag.offZ));
    }
  });
  const release = () => {
    if (!drag) return;
    drag.c.puppet.restX = drag.c.puppet.x;      // it stays where it was put down
    drag = null; canvas.style.cursor = "default";
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyF") { setFoot(!state.footOn); return; }
    const c = drag?.c; if (!c) return;
    const verb = { Space: "hop", KeyN: "nod", KeyB: "bow", KeyX: "shake", KeyT: "turn" }[e.code];
    if (verb) { e.preventDefault(); perform(c.puppet, verb); }
  });

  let last = performance.now(); let acc = 0; let clock = 1.5; let frames = 0; let fpsT = last; let cpu = 0;
  const loop = (now) => {
    const dtReal = Math.min(0.05, (now - last) / 1000); last = now; acc += dtReal; clock += dtReal;
    const holder = drag?.c ?? null;
    for (const c of state.cards) c.grip += ((c === holder ? 1 : 0) - c.grip) * Math.min(1, dtReal * 16);
    while (acc >= 1 / 120) {
      if (holder) holder.Z += (handZ - holder.Z) * 0.2;
      stepStage(clock, 1 / 120, holder, hand);
      acc -= 1 / 120;
    }
    const t0 = performance.now();
    pose(clock);
    render();
    cpu += performance.now() - t0; frames++;
    if (now - fpsT > 1000) {
      hud(`\n${Math.round((frames * 1000) / (now - fpsT))} fps · CPU ${(cpu / frames).toFixed(2)} ms/frame`);
      frames = 0; cpu = 0; fpsT = now;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ */
/*  Benchmark: milliseconds per frame on this GPU                       */
/* ------------------------------------------------------------------ */

function runBench(frames = 150) {
  const gl = renderer.getContext();
  const px = new Uint8Array(4);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  resetSimulation();
  simulateTo(2.0);
  for (let i = 0; i < 16; i++) { pose(2 + i * 0.016); render(); }   // shader compile and texture upload
  sync();
  let cpuPose = 0; let cpuRender = 0;
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    const a = performance.now(); pose(2 + i * 0.016);
    const b = performance.now(); render();
    cpuPose += b - a; cpuRender += performance.now() - b;
  }
  sync();                                                            // wait for the GPU to finish the lot
  const ms = (performance.now() - t0) / frames;
  const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  let gpuMs = null;
  if (ext) {                                                         // true GPU time, where the browser allows it
    const samples = [];
    for (let i = 0; i < 24; i++) {
      pose(2 + i * 0.016);
      const qy = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, qy);
      render();
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      sync();
      let guard = 0;
      while (!gl.getQueryParameter(qy, gl.QUERY_RESULT_AVAILABLE) && guard++ < 1e6);
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) samples.push(gl.getQueryParameter(qy, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(qy);
    }
    if (samples.length) gpuMs = Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2));
  }
  const i = renderer.info;
  const info = {
    gpu, buffer: `${RW}x${RH}`, post: POST, shadows: SHADOWS, msaa: POST ? MSAA : 0, frames,
    msPerFrame: Number(ms.toFixed(2)), fps: Math.round(1000 / ms),
    gpuMs, cpuPoseMs: Number((cpuPose / frames).toFixed(2)), cpuRenderMs: Number((cpuRender / frames).toFixed(2)),
    drawCalls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs?.length ?? null
  };
  console.log("BENCH " + JSON.stringify(info));
  return info;
}

/* ------------------------------------------------------------------ */
/*  Running                                                             */
/* ------------------------------------------------------------------ */

async function main() {
  await build();
  for (const c of state.cards) c.restX0 = c.puppet.x;     // where each card stands to begin with
  if (POST) buildPost();
  chrome();
  setFoot(FOOT);
  window.__stage = { state, renderer, scene, camera, setTime, setFoot, bench: runBench, THREE, gpu, info: () => renderer.info };
  if (LIVE) {
    setTime(1500);
    startLive();
  } else {
    setTime(T_STILL === null ? 2050 : T_STILL * 1000);
  }
  hud();
  if (BENCH) {                       // ?bench: measure this machine and print it on the page
    const r = runBench();
    hud(`
bench: ${r.msPerFrame} ms a frame (${r.fps} a second) · cpu ${r.cpuPoseMs + r.cpuRenderMs} ms · ${r.post ? "post on" : "post off"}, ${r.shadows ? "shadows on" : "shadows off"}`);
    document.body.dataset.bench = JSON.stringify(r);
  }
  document.body.dataset.ready = "1";
}

main().catch((err) => {
  console.error(err);
  document.body.dataset.ready = "error";
  document.body.append(el("pre", "lab-error", `${err.name}: ${err.message}\n${err.stack ?? ""}`));
});
