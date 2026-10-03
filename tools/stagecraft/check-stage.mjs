/**
 * The live check's own stage (foundry-check.mjs): the Paper Lantern, with a cast of eight, its lamps, the counter, a door,
 * a spot, a podium, marks to rest on, and a box of chalk for the back wall only. The bench runs the live check's chalk
 * checks on this same stage (bench/live-chalk-check.mjs), so every place they paint is proved there too.
 */

export const PAINTING = "modules/blank-inheritance/assets/scenes/the-paper-lantern.webp";
export const STAGE_ART = "modules/blank-inheritance/assets/stage/";
export const CAST = [
  { id: "kiku", name: "Kiku Enomoto", portrait: "kiku.webp", at: [0.548, 0.782], yaw: -8, size: 1.2, demeanour: "calm" },
  { id: "sanzo", name: "Sanzo", portrait: "sanzo.webp", at: [0.275, 0.885], yaw: 34, demeanour: "bouncy", emote: { id: "music", t0: 0.5 } },
  { id: "hiroshi", name: "Hiroshi", portrait: "sato-hiroshi.webp", colour: "#e3c45a", at: [0.355, 0.895], yaw: -20, demeanour: "calm", emote: { id: "laugh", t0: 2.6 } },
  { id: "masaru", name: "Masaru", portrait: "kaneda-masaru.webp", colour: "#e06a5a", at: [0.43, 0.9], yaw: 168, demeanour: "slouch" },
  { id: "etsuko", name: "Etsuko", portrait: "kimura-etsuko.webp", colour: "#5fb3d9", at: [0.635, 0.89], yaw: 42, demeanour: "sly", emote: { id: "whisper", t0: 1.2 } },
  { id: "yumiko", name: "Yumiko", portrait: "watanabe-yumiko.webp", colour: "#c99be0", at: [0.695, 0.885], yaw: -24, demeanour: "calm" },
  { id: "nren", name: "Ren", portrait: "nakamura-ren.webp", colour: "#86c76a", at: [0.1, 0.965], yaw: 34, size: 1.05, demeanour: "slouch", emote: { id: "sleep", t0: 0.2 } },
  { id: "tama", name: "Tama", portrait: "tama.webp", at: [0.865, 0.885], yaw: -30, demeanour: "nervous", emote: { id: "bowl", t0: 3.1 } }
].map((c) => ({ ...c, portrait: STAGE_ART + c.portrait }));

const LANTERN = [255, 172, 96];
export const DESCRIPTION = {
  painting: { src: PAINTING, size: [1920, 960] },
  rig: { horizon: 0.56, floorFront: 0.935, depth: 1.1, vanish: 0.52, lift: 250 },   // lifted to clear the adventure's deck (about 270 reference pixels)
  cardScale: 0.7,
  skin: "brass",
  lights: [
    { at: [0.165, 0.12], below: 0.97, colour: LANTERN, intensity: 1.0, flicker: 0.06 },
    { at: [0.31, 0.2], below: 0.88, colour: LANTERN, intensity: 0.9, flicker: 0.07 },
    { at: [0.53, 0.29], below: 0.82, colour: LANTERN, intensity: 1.2, flicker: 0.05, pool: 380, shadow: true },
    { at: [0.81, 0.22], below: 0.92, colour: LANTERN, intensity: 1.0, flicker: 0.06, pool: 340, shadow: true },
    { at: [0.37, 0.56], below: 0.78, colour: [255, 120, 60], intensity: 0.8, flicker: 0.18, flickerHz: 11, shadow: true }
  ],
  occluders: [{ id: "counter", poly: [[0.235, 0.7], [0.728, 0.7], [0.728, 0.9], [0.235, 0.9]], base: 0.86, x: 0.48 }],
  zones: [
    // The chalk zone is on the right, clear of the adventure's Scene Runner: its closed drawer was an invisible 826 x 744
    // box in the top left that swallowed every click (found 2026-10-01; made click-through since, bi-foundry-bridge.css).
    { id: "back-wall", kind: "chalk", name: "The back wall", shape: [[0.52, 0.2], [0.88, 0.2], [0.88, 0.6], [0.52, 0.6]] },
    { id: "kitchen", kind: "door", name: "The kitchen", hint: "Go in", shape: [[0.87, 0.35], [0.97, 0.35], [0.97, 0.75], [0.87, 0.75]], floor: [[0.87, 0.8], [0.97, 0.8], [0.97, 0.9], [0.87, 0.9]] },
    { id: "grill", kind: "spot", name: "The grill", hint: "Look closer", shape: [[0.3, 0.5], [0.42, 0.5], [0.42, 0.6], [0.3, 0.6]], floor: [[0.3, 0.8], [0.42, 0.8], [0.42, 0.87], [0.3, 0.87]] },
    { id: "front", kind: "podium", name: "The front", shape: [[0.6, 0.8], [0.8, 0.8], [0.8, 0.95], [0.6, 0.95]] }
  ],
  marks: [
    { id: "bar-1", at: [0.3, 0.895], label: "at the bar", faces: { point: [0.548, 0.782] }, group: "bar" },
    { id: "bar-2", at: [0.4, 0.9], label: "at the bar", faces: { point: [0.548, 0.782] }, group: "bar" },
    { id: "bar-3", at: [0.5, 0.9], label: "at the bar", faces: { point: [0.548, 0.782] }, group: "bar" },
    { id: "booth-a", at: [0.78, 0.885], yaw: -34, lean: 6, label: "the booth", group: "booth" },
    { id: "booth-b", at: [0.86, 0.885], yaw: 34, lean: -6, label: "the booth", group: "booth" },
    { id: "corner", at: [0.12, 0.955], yaw: 34, label: "the corner" }
  ],
  chalk: { mode: "zones", box: [0.77, 0.91] }     // in front of the counter (the counter hides things behind it), clear of cards and the deck
};
