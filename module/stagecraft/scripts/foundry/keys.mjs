/**
 * The keys a held card answers to, registered with Foundry's own keybinding system so that a player can change them
 * and so they do not collide with Foundry's (feel.md; renderer.md §6.1). They act on the card in this player's hand, and only
 * then: with nothing held a key is passed on untouched, so these keys cost nothing the rest of the time. They are asked first
 * (PRIORITY), because the game already uses some of them (N for notes, T to target, Space to pause) and a card in the hand
 * must get its key; found by the live check, which pressed the real keys.
 */

import { NS } from "./scene-data.mjs";

const VERBS = [
  { action: "hop", verb: "hop", key: "Space" },
  { action: "nod", verb: "nod", key: "KeyN" },
  { action: "bow", verb: "bow", key: "KeyB" },
  { action: "shake", verb: "shake", key: "KeyX" },
  { action: "turn", verb: "turn", key: "KeyT" }
];

export function registerKeys(getHost) {
  for (const { action, verb, key } of VERBS) {
    game.keybindings.register(NS, action, {
      name: `STAGECRAFT.Keys.${action}`,
      editable: [{ key }],
      onDown: () => {
        const host = getHost();
        if (!host?.dragging) return false;     // not holding a card: let the key do whatever Foundry says
        host.perform(verb);
        return true;
      },
      restricted: false,
      precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY      // asked first, so a held card gets its key before the game does (N is the notes key, T is target)
    });
  }
  // the view back home: the whole stage in sight (core/look.mjs). Only on a stage; anywhere else the key is passed on.
  game.keybindings.register(NS, "home", {
    name: "STAGECRAFT.Keys.home",
    editable: [{ key: "Home" }],
    onDown: () => getHost()?.home() === true,
    restricted: false
  });
}
