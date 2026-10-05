/**
 * When do the shadow maps need drawing again? Pure.
 *
 * The lit stage draws a shadow map for every lamp that casts one, and three.js draws them again at every frame unless told
 * not to. A still stage (the lamps only flicker, the dust drifts) has nothing new to tell them, so they are drawn again only
 * when something that casts a shadow has moved enough to show. A `ShadowWatch` keeps every card's pose in coarse steps and says,
 * at each frame, whether any step changed.
 *
 * The steps: a pixel for where a card stands, a degree for how it leans and turns, a twentieth of a stick's growth, a fiftieth of
 * a fall, and a hundredth of a card's height for its breathing. What is smaller than a step is the card's ambient life (the
 * breathing and sway of a card at rest are a few pixels at most): a degree moves the tip of a card by under eight pixels, less
 * than the shadow's own softness, so a shadow that lags it by a step cannot be told from one that does not. A card in a hand, on
 * a walk, hopping or falling moves in far more than a step a frame, so then the shadows are drawn at every frame, as before.
 */

export const STEPS = Object.freeze({ place: 1, angle: 1, grip: 0.05, breath: 0.012, down: 0.02 });

const SIZE = 9;                                   // numbers kept for each card

export class ShadowWatch {
  constructor() {
    this.pose = null;                             // Float32Array: every card's steps, SIZE each
    this.ids = [];                                // who stood where in that array
    this.scratch = new Float64Array(SIZE);
  }

  /** Look at this frame's cards (the snapshot's). Returns true when the shadows are out of date. */
  update(cards) {
    let stale = false;
    if (!this.pose || this.pose.length !== cards.length * SIZE) {
      this.pose = new Float32Array(cards.length * SIZE);
      this.ids = [];
      stale = true;
    }
    const pose = this.pose;
    const v = this.scratch;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const o = i * SIZE;
      if (this.ids[i] !== c.id) { this.ids[i] = c.id; stale = true; }
      v[0] = c.x / STEPS.place; v[1] = c.z / STEPS.place; v[2] = c.lift / STEPS.place;
      v[3] = c.lean / STEPS.angle; v[4] = c.yaw / STEPS.angle; v[5] = c.pitch / STEPS.angle;
      v[6] = c.grip / STEPS.grip; v[7] = (c.breathe * c.squash) / STEPS.breath; v[8] = c.down / STEPS.down;
      for (let j = 0; j < SIZE; j++) {
        const q = Math.round(v[j]);
        if (pose[o + j] !== q) { pose[o + j] = q; stale = true; }
      }
    }
    return stale;
  }
}
