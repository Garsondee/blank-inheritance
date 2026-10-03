/**
 * Held cards on every screen (stage.md §6.5). Pure: no Foundry, no DOM, no clock of its own, no socket of its own.
 *
 * Only the hand travels. While a card is held, its holder's screen sends where the hand is (at most thirty times a
 * second, and a heartbeat once a second if it holds still); every other screen plays that path back about 100 ms late,
 * between the two samples either side, and works out the lean, the wobble and the bumps itself from the same path with
 * the same physics, so they agree without being sent. A verb is one message. A drop is one message carrying the place
 * the holder's screen chose, which every other screen then adopts, so a card ends up in the same place everywhere.
 *
 * Who wins a clash: if two people take hold of the same card at once, the earlier grab (by the server's clock) wins,
 * then the lower user id, decided the same way on every screen from the two messages alone.
 *
 * The caller supplies the world: `send(message)` puts a message on the wire, `receive(message, from)` is called with each
 * one that arrives (`from` is the sender as the server vouches for it), `mayHold(card, user)` is the rule of who may
 * take hold of what, and `now()` is a clock every screen shares (Foundry's synchronised server time, in milliseconds).
 */

import { GripBuffer, shouldSend, arbitrate } from "./puppets.mjs";

export const SYNC = Object.freeze({
  every: 33,            // ms between samples of a moving hand: about thirty a second at most
  heartbeat: 1000,      // ms between samples of a hand that is holding still, so nobody thinks it has gone
  delay: 100,           // ms a remote hand is drawn behind the real one
  silent: 2000          // ms without a word from a holder before their card is let go
});

const ms = (t) => Math.round(t);
const px = (v) => Math.round(v * 10) / 10;                     // a tenth of a pixel is far finer than any screen shows

export class StageSync {
  /**
   * @param o.stage    the Stage engine
   * @param o.scene    the scene's id; messages for another scene are ignored
   * @param o.me       the local user's id
   * @param o.now      () => ms on the shared clock (stamps grabs and samples, plays remote hands back)
   * @param o.clock    () => ms on a local monotonic clock (only for noticing silence); defaults to `now`
   * @param o.send     (message) => void
   * @param o.mayHold  (cardId, userId) => boolean
   * @param o.onLost   (cardId) => void   the local user lost a grab to an earlier one
   * @param o.onDrop   (result) => void   any card was put down, by anyone (the GM's screen saves where it landed)
   */
  constructor({ stage, scene, me, now, clock = now, send, mayHold = () => true, onLost = () => {}, onDrop = () => {} }) {
    Object.assign(this, { stage, scene, me, now, clock, mayHold, onLost, onDrop });
    this.wire = send;
    this.mine = new Map();        // card id -> { stamp, last }       cards the local user holds
    this.remote = new Map();      // card id -> { by, stamp, buffer, heard }   cards someone else holds
    this.sent = 0;
  }

  send(message) {
    this.sent++;
    this.wire({ scene: this.scene, ...message });
  }

  holderOf(id) {
    if (this.mine.has(id)) return this.me;
    return this.remote.get(id)?.by ?? null;
  }

  /* ---------------------------------------------------------------- the local hand */

  /** The local user takes hold of a card. Returns false if they may not, or someone else has it. */
  grab(id) {
    const c = this.stage.cards.get(id);
    if (!c || !this.mayHold(id, this.me)) return false;
    if (!this.stage.hold(id, this.me)) return false;
    const t = this.now();
    this.mine.set(id, { stamp: { t: ms(t), user: this.me }, last: { t, x: c.hand.x, y: c.hand.z } });
    this.send({ type: "grab", id, t: ms(t), x: px(c.hand.x), z: px(c.hand.z) });
    return true;
  }

  /** The local hand moved. */
  move(id, x, z) {
    const m = this.mine.get(id);
    if (!m) return;
    this.stage.setHand(id, { x, z });
    const hand = this.stage.cards.get(id).hand;
    this.#sample(id, m, hand, this.now());
  }

  /** Send the hand if it has moved since the last sample and enough time has passed. Returns whether it did. */
  #sample(id, m, hand, t) {
    if (!shouldSend(m.last, hand.x, hand.z, t, SYNC.every)) return false;
    m.last = { t, x: hand.x, y: hand.z };
    m.moving = true;
    this.send({ type: "move", id, t: ms(t), x: px(hand.x), z: px(hand.z) });
    return true;
  }

  /** The local card hops, bows and so on. */
  verb(id, verb) {
    if (!this.mine.has(id)) return;
    this.stage.perform(id, verb);
    this.send({ type: "verb", id, verb });
  }

  /** The local hand lets go. Returns what the stage did with the card. */
  release(id) {
    if (!this.mine.has(id)) return null;
    this.mine.delete(id);
    const where = this.stage.landingFor(id);
    if (!where) return null;
    // The place is rounded BEFORE it is used, here and on the wire, so every screen puts the card in the identical place.
    const landing = { X: px(where.X), Z: px(where.Z), mark: where.mark };
    const result = this.stage.release(id, landing);
    if (result) {
      this.send({ type: "release", id, t: ms(this.now()), X: landing.X, Z: landing.Z, mark: landing.mark });
      this.onDrop(result);
    }
    return result;
  }

  /* ---------------------------------------------------------------- other people's hands */

  /** A message arrived from `from`. */
  receive(message, from) {
    if (!message || message.scene !== this.scene || from === this.me) return;
    if (!this.stage.cards.has(message.id)) return;
    if (message.type === "grab") this.#remoteGrab(message, from);
    else if (message.type === "move") this.#remoteMove(message, from);
    else if (message.type === "verb") { if (this.remote.get(message.id)?.by === from) this.stage.perform(message.id, message.verb); }
    else if (message.type === "release") this.#remoteRelease(message, from);
  }

  #remoteGrab(message, from) {
    if (!this.mayHold(message.id, from)) return;
    const stamp = { t: message.t, user: from };
    const mine = this.mine.get(message.id);
    const theirs = this.remote.get(message.id);
    const incumbent = mine?.stamp ?? theirs?.stamp ?? null;
    if (incumbent && theirs?.by !== from && arbitrate(incumbent, stamp) === incumbent) return;     // the earlier grab keeps the card
    if (mine) { this.mine.delete(message.id); this.onLost(message.id); }
    this.#take(message, from, stamp);
  }

  #remoteMove(message, from) {
    const r = this.remote.get(message.id);
    if (!r) {
      if (this.mine.has(message.id) || !this.mayHold(message.id, from)) return;
      this.#take(message, from, { t: message.t, user: from });          // joined late, or the grab was missed: this is a grab
      return;
    }
    if (r.by !== from) return;
    r.buffer.push({ t: message.t, x: message.x, y: message.z });
    r.heard = this.clock();
  }

  #take(message, from, stamp) {
    if (!this.stage.hold(message.id, from)) this.stage.handOver(message.id, from);
    const buffer = new GripBuffer({ delay: SYNC.delay });
    buffer.push({ t: message.t, x: message.x, y: message.z });
    this.remote.set(message.id, { by: from, stamp, buffer, heard: this.clock() });
  }

  #remoteRelease(message, from) {
    const r = this.remote.get(message.id);
    if (!r || r.by !== from) return;
    this.remote.delete(message.id);
    const result = this.stage.release(message.id, { X: message.X, Z: message.Z, mark: message.mark ?? null });
    if (result) this.onDrop(result);
  }

  /** A card has left the stage: nobody holds it any more. */
  forget(id) {
    this.mine.delete(id);
    this.remote.delete(id);
  }

  /** Someone left (or lost their connection): their cards are let go where they are. */
  userGone(user) {
    for (const [id, r] of [...this.remote]) if (r.by === user) this.#letGo(id);
  }

  #letGo(id) {
    this.remote.delete(id);
    const result = this.stage.release(id);
    if (result) this.onDrop(result);
  }

  /* ---------------------------------------------------------------- time */

  /** Once a frame, before the stage advances: play other hands back, send a heartbeat, notice the silent. */
  tick() {
    const t = this.now();
    const local = this.clock();
    for (const [id, r] of [...this.remote]) {
      if (local - r.heard > SYNC.silent) { this.#letGo(id); continue; }
      const p = r.buffer.at(t);
      if (p) this.stage.setHand(id, { x: p.x, z: p.y });
    }
    for (const [id, m] of this.mine) {
      const hand = this.stage.cards.get(id)?.hand;
      if (!hand) continue;
      // the trailing edge: a hand that has just stopped still owes the last place it reached; and a hand that has not
      // moved at all still says so once a second
      if (this.#sample(id, m, hand, t)) continue;
      // A hand that has stopped says so with one more sample at the same place: otherwise the other screens, which guess
      // a little beyond the last sample they have, would carry on past where the hand stopped until the next heartbeat.
      const quiet = t - m.last.t;
      if ((m.moving && quiet >= SYNC.every) || quiet >= SYNC.heartbeat) {
        m.moving = false;
        m.last = { t, x: hand.x, y: hand.z };
        this.send({ type: "move", id, t: ms(t), x: px(hand.x), z: px(hand.z) });
      }
    }
  }

  /** The stage is going away: let go of everything the local user holds, so no one waits for the silence to run out. */
  close() {
    for (const id of [...this.mine.keys()]) this.release(id);
    this.remote.clear();
  }
}

/**
 * Moves the GM has made (a formation, a tableau, "back to places"), written into a scene's published cast so that every
 * screen walks the cards there together and a reload finds them there. Returns a new list; the old one is untouched.
 *
 * A move is `{ id, at | mark, yaw?, lean?, pitch?, gait?, still?, packed? }` (`at` in fractions of the painting). Each moved
 * card is stamped `move: { t0, gait }`: `t0` is when it sets off on the shared clock (seconds), a little in the future so
 * every screen hears in time; a screen that has already started that move (the same t0) leaves it alone.
 */
export function commitMoves(cards, moves, t0) {
  const byId = new Map(moves.filter((m) => m && typeof m.id === "string").map((m) => [m.id, m]));
  const t = Math.round(t0 * 1000) / 1000;
  return cards.map((card) => {
    const m = byId.get(card.id);
    if (!m) return card;
    const next = { ...card };
    delete next.X;
    delete next.Z;
    delete next.enter;
    if (m.mark) { next.mark = m.mark; delete next.at; }
    else if (Array.isArray(m.at)) { next.at = [m.at[0], m.at[1]]; delete next.mark; }
    else return card;
    for (const k of ["yaw", "lean", "pitch"]) {
      if (Number.isFinite(m[k])) next[k] = Math.round(m[k] * 10) / 10;
      else if (k !== "yaw") delete next[k];
    }
    if (typeof m.still === "boolean") next.still = m.still;
    if (typeof m.packed === "boolean") next.packed = m.packed;
    next.move = { t0: t, gait: m.gait ?? "walk" };
    return next;
  });
}

/**
 * "Back to places": every card with an authored home (`home`, fractions of the painting) that has been moved goes back
 * to it, and back to its routine. Returns the moves (cards without a home, or already there, are left alone).
 */
export function homeMoves(cards, { gait = "walk" } = {}) {
  const moves = [];
  for (const card of cards) {
    if (!Array.isArray(card.home)) continue;
    const there = Array.isArray(card.at) && Math.abs(card.at[0] - card.home[0]) < 1e-4 && Math.abs(card.at[1] - card.home[1]) < 1e-4 && !card.mark;
    if (there && !card.still && !card.packed) continue;
    moves.push({ id: card.id, at: [card.home[0], card.home[1]], yaw: card.homeYaw ?? 0, lean: 0, pitch: 0, gait, still: false, packed: false });
  }
  return moves;
}

/**
 * Where a card was put down, written into a scene's published cast. Returns a new list; the old one is untouched.
 * A card put on a mark is remembered by that mark; one put anywhere else by its place on the painting alone.
 */
export function commitPlace(cards, place) {
  return cards.map((card) => {
    if (card.id !== place.id) return card;
    const next = { ...card, at: place.at, yaw: place.yaw };
    delete next.X;
    delete next.Z;
    delete next.enter;
    delete next.packed;            // put down by hand, it is no longer part of a huddle
    if (next.life) next.still = true;   // someone took charge of it: its routine waits until the GM sends it back
    if (place.mark) next.mark = place.mark;
    else delete next.mark;
    return next;
  });
}
