// A small stage description used by the module's tests: one painting, five lamps, a counter, three zones and some marks.
// It is plain data in the module's own format; it names no campaign.

export const PAINTING = { src: "paintings/tavern.png", size: [3072, 1536] };
export const RIG = { horizon: 0.56, floorFront: 0.935, depth: 1.1, vanish: 0.52, lift: 70 };

export const RAW_SCENE = {
  painting: PAINTING,
  rig: RIG,
  cardScale: 0.7,
  lights: [
    { at: [0.165, 0.12], below: 0.97, colour: [255, 172, 96], intensity: 1.0, flicker: 0.06 },
    { at: [0.31, 0.2], below: 0.88, colour: [255, 172, 96], intensity: 0.9, flicker: 0.07 },
    { at: [0.53, 0.29], below: 0.82, colour: [255, 172, 96], intensity: 1.2, flicker: 0.05, pool: 380, shadow: true },
    { at: [0.81, 0.22], below: 0.92, colour: [255, 172, 96], intensity: 1.0, flicker: 0.06, pool: 340, shadow: true },
    { at: [0.37, 0.56], below: 0.78, colour: [255, 120, 60], intensity: 0.8, flicker: 0.18, flickerHz: 11, shadow: true }
  ],
  occluders: [{ id: "counter", poly: [[0.235, 0.7], [0.728, 0.7], [0.728, 0.9], [0.235, 0.9]], base: 0.86, x: 0.48 }],
  zones: [
    { id: "back-wall", kind: "chalk", name: "The back wall", shape: [[0.05, 0.2], [0.45, 0.2], [0.45, 0.62], [0.05, 0.62]] },
    { id: "kitchen", kind: "door", name: "The kitchen", shape: [[0.87, 0.35], [0.97, 0.35], [0.97, 0.75], [0.87, 0.75]], floor: [[0.87, 0.8], [0.97, 0.8], [0.97, 0.9], [0.87, 0.9]], to: "kitchen-scene" },
    { id: "grill", kind: "spot", name: "The grill", shape: [[0.3, 0.5], [0.42, 0.5], [0.42, 0.6], [0.3, 0.6]], floor: [[0.3, 0.8], [0.42, 0.8], [0.42, 0.87], [0.3, 0.87]] },
    { id: "front", kind: "podium", name: "The front", shape: [[0.6, 0.8], [0.8, 0.8], [0.8, 0.95], [0.6, 0.95]] }
  ],
  marks: [
    { id: "bar-1", at: [0.3, 0.895], label: "at the bar", faces: { point: [0.548, 0.782] }, capacity: 1, group: "bar" },
    { id: "bar-2", at: [0.4, 0.9], label: "at the bar", faces: { point: [0.548, 0.782] }, capacity: 1, group: "bar" },
    { id: "bar-3", at: [0.5, 0.9], label: "at the bar", faces: { point: [0.548, 0.782] }, capacity: 1, group: "bar" },
    { id: "booth-a", at: [0.78, 0.885], yaw: -34, lean: 6, label: "the booth", group: "booth" },
    { id: "booth-b", at: [0.86, 0.885], yaw: 34, lean: -6, label: "the booth", group: "booth" },
    { id: "corner", at: [0.12, 0.955], yaw: 34, label: "the corner" }
  ],
  chalk: { mode: "zones" }
};

export const PEOPLE = [
  { id: "ana", name: "Ana", at: [0.275, 0.885], yaw: 34, demeanour: "bouncy" },
  { id: "bo", name: "Bo", at: [0.355, 0.895], yaw: -20 },
  { id: "cy", name: "Cy", at: [0.635, 0.89], yaw: 42, demeanour: "sly" },
  { id: "di", name: "Di", at: [0.695, 0.885], yaw: -24 },
  { id: "ed", name: "Ed", at: [0.865, 0.885], yaw: -30, demeanour: "nervous" }
];
