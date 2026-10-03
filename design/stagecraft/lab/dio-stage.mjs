/**
 * The stage's older systems, drawn on the diorama floor.
 *
 * design/stagecraft/diorama.md §11 says how each system from design/stagecraft/stage.md (zones,
 * the blueprint, formations, magnets and stacks, puppets and the wings, debuts)
 * works once the stage is a painting with a floor and a camera. These plates are
 * the proof: the same ideas as plates 01 to 12, none of them lost, now standing
 * in the painting.
 *
 *   31 dio-zones    the Errand's street: doors, a window, an alley, cards docked
 *   32 dio-fight    the flood tunnel: a fight in zones, with the blueprint
 *   33 dio-wings    the party in the wings; one card picked up and bonking
 *   34 dio-talk     a conversation the party is part of
 *   35 dio-arrange  the GM arranging a crowded stage
 *   36 dio-gangup   a gang-up
 *   37 dio-debut    a first appearance, landing
 */

import { el, note, pc, PLACE_ART, SCENE_ART, floodPlan, planPanel } from "./lab.mjs";
import { stage, paperLantern, cardGame, LANTERN, CW, CH } from "./dio-lab.mjs";
import { project } from "./diorama.mjs";

export const STAGE_PLATES = {};

/* ------------------------------------------------------------------ */
/*  Pieces of the GM's and players' screens                             */
/* ------------------------------------------------------------------ */

/** The GM's stage bar (stage.md §7): one press per job. */
function stageBar(root, active, stacked = null) {
  const items = [["line", "fa-grip-lines", "Line"], ["talk", "fa-comments", "Talk"], ["gangup", "fa-people-group", "Gang-up"], ["panel", "fa-landmark", "Panel"], ["split", "fa-code-branch", "Split"], ["stack", "fa-layer-group", "Stack"], ["tidy", "fa-broom", "Tidy"], ["lock", "fa-lock", "Lock"]];
  const bar = el("div", "bi-stagebar", `<span class="bi-stagebar__legend">Stage</span>${items.map(([k, i, l]) => `<button class="${k === active ? "is-on" : ""}"><i class="fa-solid ${i}"></i>${l}</button>`).join("")}${stacked ? `<span class="bi-stagebar__crowd">+${stacked} stacked</span>` : ""}`);
  root.append(bar);
}

/** The key to a fight's range bands. */
function bandsLegend(root, left, top) {
  const bands = el("div", "bi-bands", `<span style="--band:#f4eedc">Engaged</span><span class="is-dash" style="--band:#f4eedc">Near · one Stride</span><span class="is-dash" style="--band:rgb(244 238 220 / 50%)">Far · two</span>`);
  Object.assign(bands.style, { left: `${left}px`, top: `${top}px` });
  root.append(bands);
}

/** People somewhere else in this scene: still visible, never on stage. */
function elsewhereTray(root, ids, where, { left = 40, bottom = 262 } = {}) {
  const faces = ids.map((id) => `<img src="${pc(id).src}" style="--who:${pc(id).who}">`).join("");
  const names = ids.map((id) => pc(id).name).join(", ");
  const tray = el("div", "bi-elsewhere", `<div class="bi-elsewhere__title">Elsewhere in this scene</div><div class="bi-elsewhere__row">${faces}<span>${names} <em>· ${where}</em></span></div>`);
  Object.assign(tray.style, { left: `${left}px`, bottom: `${bottom}px` });
  root.append(tray);
}

/** A fanned stack of one kind of person, folded into a count. */
function fan(id, x, y, n, seed, { yawStep = 9, spread = 0.013 } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    id, at: [x + (i - (n - 1) / 2) * spread, y + i * 0.0016], yaw: (i - (n - 1) / 2) * yawStep,
    dim: i === n - 1 ? 1 : 0.58 + 0.15 * i, seed: seed + i * 41, still: i < n - 1, demeanour: "nervous"
  }));
}

/* ------------------------------------------------------------------ */
/*  31. Zones: places in the picture, and cards that go to them         */
/* ------------------------------------------------------------------ */

function errandStreet() {
  return {
    art: `${SCENE_ART}episode-c1e1--the-errand.webp`, img: [1920, 960],
    rig: { horizon: 0.6, floorFront: 1.0, depth: 1.1, vanish: 0.5, lift: 150 },
    cardScale: 0.74, cardTint: ["rgb(255, 232, 196)", 0.12],
    ambient: 0.68, haze: 0.1, hazeColour: "rgba(255,226,190,1)",
    lights: [{ at: [0.93, 0.04], below: 0.95, belowX: 0.8, colour: [255, 236, 200], intensity: 1.5, reach: 3000 }],
    zones: [
      { name: "The Tea House", hint: '<i class="fa-solid fa-door-open"></i> Go in · 2 waiting', poly: [[0.672, 0.6], [0.79, 0.6], [0.8, 0.79], [0.66, 0.79]], label: [0.66, 0.5], target: true },
      { name: "The Shop Window", hint: '<i class="fa-solid fa-magnifying-glass"></i> Look closer', poly: [[0.33, 0.52], [0.6, 0.52], [0.6, 0.74], [0.33, 0.74]], label: [0.36, 0.45] },
      { name: "The Alley", hint: '<i class="fa-solid fa-door-open"></i> Round the side', poly: [[0.86, 0.55], [1.02, 0.55], [1.02, 0.82], [0.86, 0.82]], label: [0.84, 0.47] }
    ],
    ghosts: [{ at: [0.632, 0.945] }],
    cards: [
      { id: "etsuko", at: [0.705, 0.945], yaw: -8, own: true, demeanour: "calm", badge: { text: "Searching" } },
      { id: "yumiko", at: [0.775, 0.945], yaw: -16, demeanour: "calm" },
      { id: "masaru", at: [0.545, 0.925], yaw: 18, held: true, lift: 66, lean: -7, still: true },
      { id: "nren", at: [0.115, 0.95], yaw: 24, demeanour: "calm" },
      { id: "hiroshi", at: [0.215, 0.95], yaw: 14, demeanour: "nervous", badge: { text: "Following Ren" } },
      { id: "susumu", at: [0.315, 0.95], yaw: 6, demeanour: "calm" }
    ],
    particles: [{ kind: "dust", box: [0.1, 0.2, 0.9, 0.85], depthAt: [0.5, 0.95], density: 0.7, spread: 300 }]
  };
}

STAGE_PLATES["dio-zones"] = () => stage(errandStreet(), {
  num: "31", name: "Zones in the diorama: go in, look closer, round the side", defaultT: 1.2,
  after: (root) => {
    note(root, 1, "A zone is a place in the picture: a dashed outline and its name. The outline sits on the painting, around the door or the window. The places to stand are on the floor below it.", 70, 215);
    note(root, 2, "Drag a card to a door's row and it waits there ('2 waiting'). When the GM says yes, or the door is open, the cards walk in. The zone it is over lights orange and its dashes march; a dashed ghost shows where it will land.", 2090, 130);
    note(root, 3, "Look-closer zones are points of interest: standing in front of one is how you say 'I'm looking at the window.'", 70, 560);
    note(root, 4, "Whoever stays outside stays on the street. The party can split; the camera cuts between them, and nobody is ever off the screen.", 2090, 330);
  }
});

/* ------------------------------------------------------------------ */
/*  32. A fight in zones, and the blueprint                             */
/* ------------------------------------------------------------------ */

function floodFight() {
  const teal = [120, 230, 205];
  const slugA = fan("centipede", 0.3, 0.79, 3, 500);
  const slugB = fan("centipede", 0.56, 0.79, 2, 900);
  Object.assign(slugA[2], { count: 4, caption: "In the sludge" });
  Object.assign(slugB[1], { count: 2, caption: "At the grate" });
  return {
    art: `${SCENE_ART}episode-c1e1--flood-tunnel.webp`, img: [1920, 960],
    rig: { horizon: 0.36, floorFront: 1.08, depth: 1.0, vanish: 0.5, lift: 110 },
    cardScale: 0.85, cardTint: ["rgb(150, 215, 190)", 0.3],
    ambient: 0.42, haze: 0.3, hazeColour: "rgba(6,22,18,1)", reflect: 0.2,
    lights: [
      { at: [0.37, 0.1], below: 0.7, colour: teal, intensity: 1.2, reach: 900 },
      { at: [0.61, 0.17], below: 0.7, colour: teal, intensity: 1.1, reach: 900 },
      { at: [0.63, 0.46], below: 0.62, colour: [150, 230, 190], intensity: 0.9, reach: 500 }
    ],
    zones: [
      { name: "The Panels", hint: "Cover · the controls", poly: [[0.585, 0.43], [0.72, 0.43], [0.72, 0.6], [0.585, 0.6]], label: [0.6, 0.355] },
      { name: "The Compactor", hint: "Cover", poly: [[0.3, 0.32], [0.44, 0.32], [0.44, 0.6], [0.3, 0.6]], label: [0.24, 0.255] },
      { name: "The Sludge", hint: "Difficult terrain", poly: [[0.12, 0.63], [0.88, 0.63], [0.84, 0.84], [0.16, 0.84]], label: [0.43, 0.655] },
      { name: "The Stair", hint: "Way out", poly: [[0.8, 0.4], [0.93, 0.4], [0.93, 0.62], [0.8, 0.62]], label: [0.79, 0.36] }
    ],
    ranges: [
      { a: [0.44, 0.47], b: [0.585, 0.5], text: "NEAR" },
      { a: [0.72, 0.52], b: [0.8, 0.52], text: "NEAR" },
      { a: [0.37, 0.6], b: [0.37, 0.7], text: "ENGAGED", solid: true }
    ],
    cards: [
      { id: "masaru", at: [0.335, 0.615], size: 1.7, yaw: 12, demeanour: "nervous" },
      { id: "nren", at: [0.405, 0.615], size: 1.7, yaw: 6, demeanour: "calm" },
      { id: "etsuko", at: [0.625, 0.615], size: 1.7, yaw: -8, own: true, demeanour: "calm", badge: { text: "At the panel", up: 0.2 } },
      { id: "susumu", at: [0.685, 0.615], size: 1.7, yaw: -14, demeanour: "nervous" },
      ...slugA, ...slugB
    ],
    particles: [{ kind: "dust", box: [0.1, 0.3, 0.9, 0.8], depthAt: [0.5, 0.8], density: 0.8, spread: 300 }]
  };
}

STAGE_PLATES["dio-fight"] = () => stage(floodFight(), {
  num: "32", name: "A fight in zones, and the blueprint", defaultT: 1.4,
  after: (root) => {
    bandsLegend(root, 40, 120);
    elsewhereTray(root, ["hiroshi", "yumiko"], "Generator Room");
    root.append(planPanel(floodPlan(), { width: 440, height: 290 }));
    note(root, 1, "Fight zones are positions. Moving between near zones is a Stride; SF2E's cover and difficult terrain apply as written. The links say how far apart they are.", 40, 190);
    note(root, 2, "A crowd of foes stacks, with a count that drops as they fall. They stand in the sludge, in front of the party.", 1560, 1010);
    note(root, 3, "The blueprint: solid where you've been, dashed where you've glimpsed, nothing where you haven't. Orange is you.", 1640, 60);
    note(root, 4, "Split up and the others are still on screen: where they are, one press to cut to them.", 40, 1060);
  }
});

/* ------------------------------------------------------------------ */
/*  33. The wings, and a card in a hand                                 */
/* ------------------------------------------------------------------ */

function rumourWings() {
  const lamp = [255, 190, 120];
  const wing = (id, side, slot, extra = {}) => ({ id, wing: { side, slot }, still: true, noShadow: true, ...extra });
  return {
    art: `${PLACE_ART}row-b-block-8--common-room.png`, img: [3072, 1536],
    rig: { horizon: 0.62, floorFront: 1.0, depth: 1.05, vanish: 0.5, lift: 130 },
    cardScale: 0.82, cardTint: ["rgb(240, 190, 140)", 0.26],
    ambient: 0.42, haze: 0.28, hazeColour: "rgba(20,12,8,1)",
    lights: [
      { at: [0.2, 0.52], below: 0.92, colour: lamp, intensity: 1.7, reach: 700, flicker: 0.04, pool: 360 },
      { at: [0.55, 0.5], below: 0.92, colour: [130, 170, 210], intensity: 0.6, reach: 1500 }
    ],
    cards: [
      { id: "mrs-ueda", at: [0.3, 0.935], yaw: 18, demeanour: "proud", emote: { id: "ellipsis", t0: 0.6 } },
      { id: "hana", at: [0.625, 0.935], yaw: -14, demeanour: "calm", emote: { id: "question", t0: 0.4 } },
      // In a hand: lifted off its foot on the handle, leaning towards where it is going.
      { id: "yumiko", at: [0.55, 0.95], yaw: -22, held: true, lift: 62, lean: 11, still: true },
      wing("etsuko", "left", 0, { own: true, showKeys: true, hover: 1.4 }),
      wing("masaru", "left", 1, { seat: "player" }),
      wing("nren", "left", 2),
      wing("hiroshi", "right", 0, { raised: 1 }),
      wing("susumu", "right", 1)
    ],
    bonks: [{ a: "yumiko", b: "hana", up: 0.62 }],
    particles: [{ kind: "dust", box: [0.1, 0.4, 0.9, 0.9], depthAt: [0.5, 0.9], density: 0.9, spread: 250 }]
  };
}

STAGE_PLATES["dio-wings"] = () => stage(rumourWings(), {
  num: "33", name: "The party in the wings, and a card in a hand", defaultT: 1.6,
  after: (root) => {
    note(root, 1, "The party waits in the wings: two racks either side of the deck, each card at half size with its handle slotted in. A player's colour is on the foot and on the ring round the grip.", 70, 880);
    note(root, 2, "Your own card shows your keys: raise a hand, say what you're doing, open your notes. A teammate's shows follow and their page.", 70, 1000);
    note(root, 3, "Pick one up by its handle and it grows to full size and comes to your hand, leaning as you swing it. Swing into someone and both bonk. Nobody can move your card but you.", 640, 280);
    note(root, 4, "A raised hand, numbered in the order they went up.", 2110, 1000);
  }
});

/* ------------------------------------------------------------------ */
/*  34. A conversation the party is part of                             */
/* ------------------------------------------------------------------ */

function wardScene() {
  return {
    art: `${PLACE_ART}general-hospital--ward.png`, img: [3072, 1536],
    rig: { horizon: 0.6, floorFront: 1.0, depth: 1.0, vanish: 0.54, lift: 120 },
    cardScale: 0.8, cardTint: ["rgb(150, 200, 200)", 0.3],
    ambient: 0.46, haze: 0.2, hazeColour: "rgba(6,20,22,1)", reflect: 0.2,
    lights: [
      { at: [0.545, 0.63], below: 0.8, colour: [255, 150, 80], intensity: 1.6, reach: 600, flicker: 0.05, pool: 300 },
      { at: [0.13, 0.62], below: 0.85, colour: [120, 220, 240], intensity: 0.8, reach: 700 },
      { at: [0.87, 0.62], below: 0.85, colour: [120, 220, 240], intensity: 0.8, reach: 700 }
    ]
  };
}

STAGE_PLATES["dio-talk"] = () => {
  const scene = {
    ...wardScene(),
    speaker: "tsubaki",
    cards: [
      // The two talking: turned to each other across a gap.
      { id: "tsubaki", at: [0.44, 0.885], yaw: 30, size: 1.24, demeanour: "proud", speaking: true, glow: true },
      { id: "gennai", at: [0.59, 0.885], yaw: -30, size: 1.24, demeanour: "calm" },
      // A listener, a row back and dimmed.
      { id: "mori", at: [0.515, 0.79], yaw: 0, size: 1.1, dim: 0.58, demeanour: "slouch" },
      // The party's arc, facing them: the table is in the conversation.
      { id: "etsuko", at: [0.115, 0.935], yaw: 38, size: 0.9, demeanour: "calm" },
      { id: "masaru", at: [0.21, 0.915], yaw: 28, size: 0.9, demeanour: "nervous" },
      { id: "nren", at: [0.305, 0.895], yaw: 16, size: 0.9, demeanour: "calm" },
      { id: "hiroshi", at: [0.725, 0.895], yaw: -16, size: 0.9, demeanour: "calm", raised: 1 },
      { id: "yumiko", at: [0.82, 0.915], yaw: -28, size: 0.9, demeanour: "calm" },
      { id: "susumu", at: [0.915, 0.935], yaw: -38, size: 0.9, demeanour: "nervous" }
    ]
  };
  return stage(scene, {
    num: "34", name: "Formation: a conversation the party is part of", defaultT: 1.6,
    after: (root) => {
      stageBar(root, "talk");
      note(root, 1, "The two talking turn towards each other across a gap. Whoever is speaking lights up, with three small speaking bars; the Runner already knows who that is.", 1330, 330);
      note(root, 2, "Anyone listening stands a row back, dimmed.", 1180, 720);
      note(root, 3, "The party's arc faces them, so the table reads as part of the conversation, not watching it from outside.", 60, 640);
    }
  });
};

/* ------------------------------------------------------------------ */
/*  35. Arranging a crowded stage                                       */
/* ------------------------------------------------------------------ */

STAGE_PLATES["dio-arrange"] = () => {
  const patients = fan("kuroki", 0.2, 0.855, 3, 300, { yawStep: 7, spread: 0.014 });
  patients[0].id = "imai";
  patients[1].id = "aucourt";
  Object.assign(patients[2], { count: 3, caption: "Ward Four patients" });
  const wing = (id, side, slot, extra = {}) => ({ id, wing: { side, slot }, still: true, noShadow: true, ...extra });
  const dots = [];
  for (const fy of [0.86, 0.93]) for (let i = 0; i < 11; i++) dots.push([0.1 + i * 0.08, fy]);
  const scene = {
    ...wardScene(),
    cards: [
      ...patients,
      { id: "tsubaki", at: [0.4, 0.86], yaw: 10, demeanour: "proud" },
      // The porter, lifted in the GM's hand, heading for the cleaner's place.
      { id: "gennai", at: [0.575, 0.835], yaw: -10, held: true, lift: 56, lean: 7, still: true },
      // The cleaner, sliding one place over to make room.
      { id: "mori", at: [0.705, 0.86], yaw: -8, demeanour: "slouch" },
      wing("etsuko", "left", 0),
      wing("masaru", "left", 1, { seat: "gm", showKeys: true, hover: 1.4 }),
      wing("nren", "left", 2),
      wing("hiroshi", "right", 0),
      wing("yumiko", "right", 1),
      wing("susumu", "right", 2)
    ],
    ghosts: [{ at: [0.655, 0.86] }, { at: [0.745, 0.86], tone: "cyan" }],
    arrows: [{ a: [0.672, 0.79], b: [0.738, 0.79] }],
    dots
  };
  return stage(scene, {
    num: "35", name: "Arranging a crowded stage (GM)", defaultT: 1.6,
    after: (root) => {
      stageBar(root, "line", 3);
      note(root, 1, "Formations are one press each; cards glide to their places.", 1700, 40);
      note(root, 2, "Picked up: lifted on its handle, tilting with the speed of the hand. It lands in the dashed slot.", 1210, 470);
      note(root, 3, "Magnets: whoever is in the way slides one place over, so two cards never stand on top of each other.", 1560, 690);
      note(root, 4, "Too many people: the least recent fold into a stack with a count. One press fans them out again, and anyone who speaks steps out on their own.", 60, 470);
      note(root, 5, "Places appear on the floor while a card is held, so everything lands in line.", 60, 1060);
      note(root, 6, "The GM's view of a player's card in the wings: Hero Point, ask to roll, give the floor.", 540, 1060);
    }
  });
};

/* ------------------------------------------------------------------ */
/*  36. A gang-up                                                       */
/* ------------------------------------------------------------------ */

STAGE_PLATES["dio-gangup"] = () => {
  const base = cardGame();
  const scene = {
    ...base,
    rig: { ...base.rig, lift: 260 },
    vignetteHeavy: true, sceneryEmotes: [], speaker: "masaru",
    cards: [
      { id: "masaru", at: [0.5, 0.962], yaw: 0, size: 1.08, demeanour: "nervous", glow: true, emote: { id: "sweat", t0: 0.4 } },
      { id: "michiru", at: [0.5, 0.915], yaw: 0, size: 1.12, pitch: 7, demeanour: "proud" },
      { id: "lucan", at: [0.395, 0.925], yaw: 34, lean: 8, pitch: 6, demeanour: "sly" },
      { id: "chiyo", at: [0.605, 0.925], yaw: -34, lean: -8, pitch: 6, demeanour: "sly" },
      { id: "etsuko", at: [0.085, 0.935], yaw: 30, dim: 0.55, demeanour: "calm" },
      { id: "nren", at: [0.175, 0.935], yaw: 26, dim: 0.55, demeanour: "calm" },
      { id: "hiroshi", at: [0.265, 0.935], yaw: 20, dim: 0.55, demeanour: "calm" },
      { id: "yumiko", at: [0.735, 0.935], yaw: -20, dim: 0.55, demeanour: "calm" },
      { id: "susumu", at: [0.825, 0.935], yaw: -26, dim: 0.55, demeanour: "calm" }
    ]
  };
  return stage(scene, {
    num: "36", name: "Formation: ganging up", defaultT: 1.6,
    after: (root) => {
      stageBar(root, "gangup");
      note(root, 1, "One press, then a click on the target: the crowd closes round them, leaning in, allowed to overlap. The one straight behind stands tallest.", 1610, 300);
      note(root, 2, "Everyone else is pushed to the ends of the row, dimmed: present, not in it. The edges of the screen darken for as long as the formation holds.", 60, 600);
    }
  });
};

/* ------------------------------------------------------------------ */
/*  37. A first appearance, landing                                     */
/* ------------------------------------------------------------------ */

STAGE_PLATES["dio-debut"] = () => {
  const base = paperLantern();
  const scene = {
    ...base,
    sceneryEmotes: [],
    speaker: "kiku",
    lights: [
      ...base.lights,
      // The pool of light under the landing spot.
      { at: [0.865, 0.6], below: 0.885, colour: LANTERN, intensity: 1.1, reach: 420, pool: 300, poolPower: 1.5 }
    ],
    marks: [{ at: [0.865, 0.885], size: 1.0 }],
    trails: [{ id: "tama", len: 170 }],
    cards: [
      { id: "kiku", at: [0.548, 0.782], yaw: -8, size: 1.2, demeanour: "calm" },
      { id: "sanzo", at: [0.275, 0.885], yaw: 34, demeanour: "bouncy", emote: { id: "music", t0: 0.5 } },
      { id: "hiroshi", at: [0.555, 0.91], yaw: -30, demeanour: "calm", emote: { id: "surprise", t0: 0.3 } },
      { id: "etsuko", at: [0.63, 0.9], yaw: -34, demeanour: "calm" },
      { id: "yumiko", at: [0.705, 0.895], yaw: -40, demeanour: "nervous" },
      // The newcomer, mid-entry: dropping in, the portrait still developing.
      { id: "tama", at: [0.865, 0.885], yaw: -6, lift: 118, pitch: -3, iris: 0.5, still: true, noShadow: false }
    ]
  };
  return stage(scene, {
    num: "37", name: "A first appearance, landing", defaultT: 1.2,
    after: (root, dio) => {
      // The name caption beside the newcomer, on the side with room, never over a face.
      const tama = dio.cards.find((c) => c.id === "tama");
      const q = project(dio.cam, tama.x, dio.cam.floorY - tama.lift - CH * tama.s * 0.62, tama.z);
      const cap = el("div", "bi-debut-card bi-debut-card--ribbon is-left", `<span class="bi-debut-card__body"><span class="bi-debut-card__kicker">The Paper Lantern</span><span class="bi-debut-card__name">Tama</span><span class="bi-debut-card__line">Waitress</span></span>`);
      cap.style.setProperty("--card-accent", "var(--bi-life)");
      cap.style.right = `${Math.round(root.clientWidth - (q.sx - CW * tama.s * q.k * 0.5 - 24))}px`;
      cap.style.top = `${Math.round(q.sy - 40)}px`;
      root.append(cap);
      note(root, 1, "Four brass marks land on the floor where the card will stand, and a pool of light opens under it: the eye goes there first.", 1500, 250);
      note(root, 2, "The card arrives from above, with a shadow growing on the floor, while its portrait develops.", 1500, 1000);
      note(root, 3, "The name caption: what the table calls them, one player-safe line. Beside the card, never over a face.", 60, 620);
    }
  });
};
