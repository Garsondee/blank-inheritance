/**
 * The scripted scene of plate 38, as pure data and maths: no three.js, no DOM.
 *
 * It exists so that numbers quoted in the documents (renderer.md §9, feel.md) can be checked by a test instead of
 * remembered: the cast and where each card stands, the hand that picks Yumiko up, wiggles her furiously, winds up and
 * sends her into Tama, and `runScript`, which plays that hand through the same puppet model and reports what happened.
 * three-spike.mjs draws exactly this.
 */

import { coverMap, makeCamera, floorPoint } from "./diorama.mjs";
import { createPuppet, stepPuppet, collide } from "./puppets.mjs";

/* The page and the painting (the Paper Lantern of plate 13) */
export const W = 2560;
export const H = 1440;
export const IMG = [3072, 1536];
export const RIG = { horizon: 0.56, floorFront: 0.935, depth: 1.1, vanish: 0.52, lift: 70 };
export const CARD_SCALE = 0.7;
export const CW = 280;
export const CH = Math.round((CW - 12) * 1.5 + 66);

/** The plate-13 cast. Yumiko and Tama stand in one lane so the scripted bang is a fair one. */
export const CARDS = [
  { id: "kiku", at: [0.548, 0.782], yaw: -8, size: 1.2, demeanour: "calm" },
  { id: "sanzo", at: [0.275, 0.885], yaw: 34, demeanour: "bouncy", emote: "music", t0: 0.5 },
  { id: "hiroshi", at: [0.355, 0.895], yaw: -20, demeanour: "calm", emote: "laugh", t0: 2.6 },
  { id: "masaru", at: [0.43, 0.9], yaw: 168, demeanour: "slouch" },
  { id: "etsuko", at: [0.635, 0.89], yaw: 42, demeanour: "sly", emote: "whisper", t0: 1.2 },
  { id: "yumiko", at: [0.695, 0.885], yaw: -24, demeanour: "calm", role: "held" },
  { id: "nren", at: [0.1, 0.965], yaw: 34, size: 1.05, demeanour: "slouch", emote: "sleep", t0: 0.2 },
  { id: "tama", at: [0.865, 0.885], yaw: -30, demeanour: "nervous", emote: "bowl", t0: 3.1, role: "target" }
];

/** The camera of plate 38, which is the CSS lab's camera. */
export function camera() {
  const map = coverMap(IMG[0], IMG[1], W, H, 0.5, RIG.lift, 0.5);
  return { map, cam: makeCamera(RIG, map, W) };
}

/** Where a card stands on the floor: world X (from the vanishing point) and depth Z, from its fractions of the painting. */
export function standing(cam, at) {
  const p = floorPoint(cam, at[0], at[1]);
  return { X: p.x - cam.cx, Z: p.z };
}

/* The hand */
export const T_PICK = 0.35;                 // Yumiko is picked up
export const T_WIGGLE = 0.8;                // and shaken, hard
export const HAND_FREQ = 3.1;               // swings per second
export const HAND_AMP = 100;                // px each way
export const T_CHARGE = T_WIGGLE + 3.75 / HAND_FREQ; // the wiggle ends on a swing to the far left: a wind-up
export const T_CHARGE_LEN = 0.3;
export const OVERLAP = 90;                  // how far into Tama the hand drives

export const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
export const wiggleAt = (u) => HAND_AMP * Math.min(1, u / 0.35) * Math.sin(2 * Math.PI * HAND_FREQ * u);

/**
 * Where the hand is at time t. `x0` is where Yumiko stands, `etsukoX` and `tamaX` her neighbours, `width` a card's
 * width in world units. She is carried to the middle of the open stretch of bar, clear of both, wiggled there, wound up
 * on a swing to the left and sent into Tama.
 */
export function scriptedHand(t, { x0, etsukoX, tamaX, width }) {
  const half = width / 2;
  const xPick = (etsukoX + half + (tamaX - half)) / 2;
  if (t < T_WIGGLE) return x0 + (xPick - x0) * ease((t - T_PICK) / 0.45);
  if (t < T_CHARGE) return xPick + wiggleAt(t - T_WIGGLE);
  const from = xPick + wiggleAt(T_CHARGE - T_WIGGLE);
  const to = tamaX - width + OVERLAP;
  return from + (to - from) * ease((t - T_CHARGE) / T_CHARGE_LEN);
}

/**
 * Play the script through the puppet model (Etsuko, Yumiko and Tama in one lane) and say what happened.
 * Returns the bonks, the peak leans and the positions, so a test can compare them with what the documents claim.
 */
export function runScript(tEnd = 3.4, dt = 1 / 120) {
  const { cam } = camera();
  const where = Object.fromEntries(CARDS.map((c) => [c.id, standing(cam, c.at)]));
  const width = CW * CARD_SCALE;
  const make = (id) => createPuppet({ id, x: where[id].X, y: 0, rod: 0, w: width, h: CH * CARD_SCALE, scale: 1 });
  const etsuko = make("etsuko");
  const yumiko = make("yumiko");
  const tama = make("tama");
  const lane = [etsuko, yumiko, tama];
  const touching = new Set();
  const bonks = [];
  let wigglePeak = 0;
  let chargePeak = 0;
  let tamaPeak = 0;
  let gripTop = 0;
  const hand = { x0: where.yumiko.X, etsukoX: where.etsuko.X, tamaX: where.tama.X, width };
  for (let t = 0; t < tEnd - 1e-9; t += dt) {
    if (t >= T_PICK) { yumiko.heldBy = "user"; yumiko.target = { x: scriptedHand(t, hand), y: 0 }; }
    for (const p of lane) stepPuppet(p, dt);
    for (const c of collide(lane, touching)) bonks.push({ t, ...c });
    const lean = Math.abs(yumiko.lean);
    if (t > 1.0 && t < T_CHARGE) wigglePeak = Math.max(wigglePeak, lean);
    if (t >= T_CHARGE && t < T_CHARGE + 0.6) chargePeak = Math.max(chargePeak, lean);
    tamaPeak = Math.max(tamaPeak, Math.abs(tama.lean));
    gripTop = Math.max(gripTop, Math.abs(yumiko.vx));
  }
  return { where, bonks, wigglePeak, chargePeak, tamaPeak, gripTop, yumiko, tama, etsuko };
}
