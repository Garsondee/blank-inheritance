/**
 * A card's menu: what a right-click on a card offers, worked out from who is asking and what is true of the card now. Pure:
 * the page (foundry/card-menu.mjs) draws it and does what is picked.
 *
 * Anyone who may put an emote on the card (a GM any card, a player one that is theirs) gets the emotes: picked, one is shown
 * once, as a reaction; with "keep it up" on it comes round again every few seconds until it is cleared, as a regular's habit
 * does. The GM also gets a few things to change about the card: the floor, a knock-down, choosing it for a formation. Its
 * sheet is offered to whoever may open it.
 */

import { EMOTES, EMOTE_ORDER } from "./emotes.mjs";

/** The emotes as the menu lays them out: the faces, then the balloons, then the marks. */
export const EMOTE_GROUPS = Object.freeze(["face", "balloon", "mark"].map((kind) => Object.freeze({
  kind, ids: Object.freeze(EMOTE_ORDER.filter((id) => EMOTES[id].kind === kind))
})));

/** What the GM's part of the menu can do, in the order it is offered. */
export const CARD_ACTIONS = Object.freeze(["floor", "down", "choose", "sheet"]);

/**
 * @param o.isGM      the one asking is a game master
 * @param o.mayEmote  they may put an emote on this card
 * @param o.person    the card as published (its `emote`, if it has one)
 * @param o.speaker   the card has the floor
 * @param o.down      the card is down
 * @param o.chosen    the card is chosen for a formation
 * @param o.sheet     the card has a sheet this viewer may open
 * @returns null when there is nothing to offer this viewer, else
 *          { emotes: boolean, kept: emote id or null, actions: [{ id, on }] }
 *          where `kept` is an emote the card keeps showing (chosen and kept, or an authored habit): the one "Clear" takes off.
 */
export function cardMenu({ isGM = false, mayEmote = false, person = null, speaker = false, down = false, chosen = false, sheet = false } = {}) {
  const actions = [];
  if (isGM) {
    actions.push({ id: "floor", on: !!speaker });
    actions.push({ id: "down", on: !!down });
    actions.push({ id: "choose", on: !!chosen });
  }
  if (sheet) actions.push({ id: "sheet", on: false });
  if (!mayEmote && !actions.length) return null;
  const e = person?.emote;
  return { emotes: !!mayEmote, kept: e?.id && !e.once && EMOTES[e.id] ? e.id : null, actions };
}

/**
 * Where a menu `w` x `h` opens for a press at (x, y) in a window `W` x `H`: beside the pointer, and turned back inside the
 * window, with `pad` to spare, where it would run off it.
 */
export function menuPlace(x, y, w, h, W, H, pad = 8) {
  let left = x + 6;
  let top = y + 6;
  if (left + w > W - pad) left = Math.max(pad, x - 6 - w);
  if (top + h > H - pad) top = Math.max(pad, H - pad - h);
  return { left: Math.round(left), top: Math.round(top) };
}
