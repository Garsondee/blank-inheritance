// The thin Foundry side of held cards: who may hold what (and the GM's "hands off"), and the module's socket.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canHold, handsOff } from "../scripts/foundry/scene-data.mjs";
import { openChannel, CHANNEL } from "../scripts/foundry/socket.mjs";

const gm = { id: "gm", isGM: true };
const ana = { id: "ana", isGM: false };
const bo = { id: "bo", isGM: false };

test("a game master can hold any card; a player the cards that name them, or that name no one", () => {
  assert.equal(canHold({ owners: ["ana"] }, gm), true);
  assert.equal(canHold({ owners: ["ana"] }, ana), true);
  assert.equal(canHold({ owners: ["ana"] }, bo), false, "someone else's card");
  assert.equal(canHold({}, bo), true, "a card that names no one is anyone's");
  assert.equal(canHold({ owners: [] }, bo), true);
  assert.equal(canHold(null, bo), true, "no card data at all is no restriction (the caller has checked the card exists)");
});

test("with hands off, only a game master can hold anything, including a player's own card", () => {
  assert.equal(canHold({ owners: ["ana"] }, ana, { handsOff: true }), false);
  assert.equal(canHold({}, bo, { handsOff: true }), false);
  assert.equal(canHold({ owners: ["ana"] }, gm, { handsOff: true }), true);
});

test("hands off is the scene's own live flag, off unless a GM switched it on", () => {
  assert.equal(handsOff({ flags: {} }), false);
  assert.equal(handsOff({ flags: { stagecraft: { live: {} } } }), false);
  assert.equal(handsOff({ flags: { stagecraft: { live: { handsOff: true } } } }), true);
  assert.equal(handsOff({ flags: { stagecraft: { live: { handsOff: "yes" } } } }), false, "only a real true");
  assert.equal(handsOff(null), false);
});

test("the module's socket: messages go out on its own channel, arrive with the sender the server vouches for, and stop when closed", () => {
  const listeners = new Map();
  const emitted = [];
  globalThis.game = {
    socket: {
      on: (name, fn) => listeners.set(name, fn),
      off: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
      emit: (name, message) => emitted.push([name, message])
    }
  };
  assert.equal(CHANNEL, "module.stagecraft");
  const heard = [];
  const channel = openChannel((message, sender) => heard.push([message, sender]));
  assert.ok(listeners.has("module.stagecraft"));
  listeners.get("module.stagecraft")({ type: "grab", id: "ana" }, "someone");
  assert.deepEqual(heard, [[{ type: "grab", id: "ana" }, "someone"]]);
  channel.send({ type: "move" });
  assert.deepEqual(emitted, [["module.stagecraft", { type: "move" }]]);
  channel.close();
  assert.equal(listeners.has("module.stagecraft"), false, "nothing is left listening");
});

test("with two GMs connected only the lowest-id active one does the housekeeping", async () => {
  const { actingGM } = await import("../scripts/foundry/scene-data.mjs");
  globalThis.game = { user: { id: "b", isGM: true }, users: { activeGM: { id: "a" } } };
  assert.equal(actingGM(), false, "another GM is the acting one");
  globalThis.game = { user: { id: "a", isGM: true }, users: { activeGM: { id: "a" } } };
  assert.equal(actingGM(), true);
  globalThis.game = { user: { id: "p", isGM: false }, users: { activeGM: { id: "a" } } };
  assert.equal(actingGM(), false, "a player never");
  globalThis.game = { user: { id: "a", isGM: true } };
  assert.equal(actingGM(), true, "with nothing said about who is active, a GM acts");
  globalThis.game = { user: { id: "a", isGM: true }, users: { activeGM: null } };
  assert.equal(actingGM(), true);
});

test("a held card gets its keys before the game does, and with nothing held every key is passed on", async () => {
  const { registerKeys } = await import("../scripts/foundry/keys.mjs");
  const registered = new Map();
  globalThis.game = { keybindings: { register: (ns, action, def) => registered.set(action, { ns, ...def }) } };
  globalThis.CONST = { KEYBINDING_PRECEDENCE: { PRIORITY: 0, NORMAL: 1, DEFERRED: 2 } };
  const performed = [];
  let host = { dragging: null, perform: (verb) => performed.push(verb) };
  registerKeys(() => host);
  assert.deepEqual([...registered.keys()], ["hop", "nod", "bow", "shake", "turn"]);
  for (const def of registered.values()) {
    assert.equal(def.ns, "stagecraft");
    assert.equal(def.precedence, 0, "asked before the game's own keys: N is the notes key, T is target, Space pauses");
    assert.equal(def.restricted, false, "players may hold cards, so players may use the keys");
  }
  assert.deepEqual(registered.get("nod").editable, [{ key: "KeyN" }]);
  for (const def of registered.values()) assert.equal(def.onDown(), false, "nothing in the hand: the key is the game's");
  assert.deepEqual(performed, []);
  host = { dragging: { id: "ana" }, perform: (verb) => performed.push(verb) };
  for (const def of registered.values()) assert.equal(def.onDown(), true, "a card in the hand: the key is taken");
  assert.deepEqual(performed, ["hop", "nod", "bow", "shake", "turn"]);
  host = null;
  assert.equal(registered.get("hop").onDown(), false, "no stage at all: the key is the game's");
  delete globalThis.CONST;
});
