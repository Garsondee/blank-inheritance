// Cards and Foundry's tokens (core/tokens.mjs, foundry/tokens.mjs, module.md section 39): which tokens a stage's cards need, what a
// click or a T does to who is controlled and who is aimed at, and what T means where the pointer is. The bridge is run against a
// stand-in for the parts of Foundry it touches (a scene's tokens, the token layer, a drawn token) that follows Foundry 14's own
// rules for `Token#control` and `Token#setTarget` (client/canvas/placeables/*.mjs). The same thing with real pointer presses is
// tools/stagecraft/bench/target-check.mjs (the stage on a bench) and section 7e of tools/stagecraft/foundry-check.mjs (real Foundry).

import { test } from "node:test";
import assert from "node:assert/strict";
import { TOKEN_FLAG, planTokens, retarget, tKey, tokenName, tokenPlace, userColour } from "../scripts/core/tokens.mjs";
import { CardTokens, registerTokenActors } from "../scripts/foundry/tokens.mjs";
import { installFoundry } from "./fake-foundry.mjs";

const rect = { x: 100, y: 200, width: 4000, height: 3000 };
const cards = [
  { id: "ana", name: "Ana", portrait: "art/ana.webp", pc: true, actor: "actorAna", at: [0.25, 0.5] },
  { id: "nobu", name: "Nobu\nQuartermaster", portrait: "art/nobu.webp", at: [0.5, 0.8] }
];

/* ---------------------------------------------------------------- the arithmetic */

test("a token is called by the first line of its card's name, and put where its card stands", () => {
  assert.equal(tokenName({ id: "x", name: "Nobu\nQuartermaster" }), "Nobu");
  assert.equal(tokenName({ id: "x", name: "Nobu<br>Quartermaster" }), "Nobu");
  assert.equal(tokenName({ id: "x", name: "  " }), "x", "a card with no words is its id");
  assert.deepEqual(tokenPlace({ at: [0.5, 0.5] }, rect, 100), { x: 2050, y: 1650 }, "the middle of the rectangle, the token's own middle there");
  assert.deepEqual(tokenPlace({ at: [-3, 9] }, rect, 100), { x: 50, y: 3150 }, "kept inside the rectangle");
  assert.deepEqual(tokenPlace({}, rect, 100), { x: 2050, y: 1650 }, "a card with no place is in the middle");
});

test("each card gets one token, flagged with its id, and takes its actor if it has one", () => {
  const plan = planTokens({ cards, tokens: [], actors: new Map([["ana", "actorAna"]]), rect, size: 100 });
  assert.equal(plan.create.length, 2);
  assert.deepEqual(plan.update, []);
  assert.deepEqual(plan.remove, []);
  const [ana, nobu] = plan.create;
  assert.equal(ana.actorId, "actorAna");
  assert.equal(ana.actorLink, true, "a person is one actor: what happens to one token happens to the actor");
  assert.equal(ana.flags.stagecraft[TOKEN_FLAG], "ana");
  assert.equal(ana.name, "Ana");
  assert.deepEqual(ana.texture, { src: "art/ana.webp" });
  assert.equal(ana.hidden, false, "never hidden: the stage is the picture, and a scene given back to Foundry shows its people");
  assert.equal(nobu.actorId, undefined, "a card with no actor gets a token that stands for none");
  assert.equal(nobu.actorLink, false);
  assert.equal(nobu.name, "Nobu");
});

test("tokens are kept in step with the cards: a gone card's token goes, a second token for one card goes, a changed name or picture follows", () => {
  const have = [
    { id: "t1", card: "ana", name: "Ana", img: "art/ana.webp", actorId: "actorAna" },
    { id: "t2", card: "ana", name: "Ana", img: "art/ana.webp", actorId: "actorAna" },
    { id: "t3", card: "gone", name: "Gone" },
    { id: "t4", card: "nobu", name: "Nobu", img: "art/old.webp", actorId: null }
  ];
  const plan = planTokens({ cards: [cards[0], { ...cards[1], name: "Nobu Hayashi" }], tokens: have, actors: new Map([["ana", "actorAna"], ["nobu", "actorNobu"]]), rect, size: 100 });
  assert.deepEqual(plan.remove.sort(), ["t2", "t3"]);
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.update, [{ _id: "t4", name: "Nobu Hayashi", "texture.src": "art/nobu.webp", actorId: "actorNobu", actorLink: true }]);
  assert.deepEqual(planTokens({ cards: [cards[0]], tokens: [have[0]], actors: new Map([["ana", "actorAna"]]), rect, size: 100 }), { create: [], update: [], remove: [] }, "nothing changed: nothing to do");
});

test("a provider can say a token is its own copy of the actor (each of a pack has its own hit points)", () => {
  const pack = [{ id: "c1", name: "Giant Centipede", at: [0.2, 0.5] }, { id: "c2", name: "Giant Centipede", at: [0.3, 0.5] }, { id: "ana", name: "Ana", at: [0.5, 0.5] }];
  const actors = new Map([["c1", { id: "centipede", link: false }], ["c2", { id: "centipede", link: false }], ["ana", { id: "actorAna", link: true }]]);
  const plan = planTokens({ cards: pack, tokens: [], actors, rect, size: 100 });
  assert.deepEqual(plan.create.map((t) => [t.actorId, t.actorLink]), [["centipede", false], ["centipede", false], ["actorAna", true]]);
  const again = planTokens({ cards: pack.slice(0, 1), tokens: [{ id: "t", card: "c1", name: "Giant Centipede", actorId: null }], actors, rect, size: 100 });
  assert.deepEqual(again.update, [{ _id: "t", actorId: "centipede", actorLink: false }]);
});

test("a click or a T aims as Foundry's own does: the only target, one more with Shift, or let go", () => {
  assert.deepEqual(retarget([], "a"), { mode: "replace", ids: ["a"] });
  assert.deepEqual(retarget(["b"], "a"), { mode: "replace", ids: ["a"] }, "without Shift, whoever was aimed at is let go");
  assert.deepEqual(retarget(["b"], "a", { shift: true }), { mode: "acquire", ids: ["b", "a"] });
  assert.deepEqual(retarget(["a", "b"], "a"), { mode: "release", ids: ["b"] }, "aiming at one already aimed at lets it go");
  assert.deepEqual(retarget(["a", "b"], "a", { shift: true }), { mode: "release", ids: ["b"] });
});

test("T aims at the card under the pointer if it is not the one in hand, otherwise starts aiming, and stops it once it is on", () => {
  assert.deepEqual(tKey({ hover: "nobu", controlled: new Set(["ana"]) }), { do: "target", id: "nobu" });
  assert.deepEqual(tKey({ hover: "nobu" }), { do: "target", id: "nobu" }, "nobody controlled: still Foundry's T on what the pointer rests on");
  assert.deepEqual(tKey({ hover: "ana", controlled: new Set(["ana"]) }), { do: "mode", on: true }, "the pointer is still on the card just clicked: start aiming");
  assert.deepEqual(tKey({ controlled: new Set(["ana"]) }), { do: "mode", on: true });
  assert.deepEqual(tKey({ controlled: new Set(["ana"]), targeting: true }), { do: "mode", on: false }, "and the next T stops");
  assert.deepEqual(tKey({ hover: "nobu", controlled: new Set(["ana"]), targeting: true }), { do: "mode", on: false }, "wherever the pointer is: a click does the aiming while it is on, so T is only the way out");
});

test("a user's colour is a CSS colour, whatever they carry", () => {
  assert.equal(userColour({ color: "#33aaff" }), "#33aaff");
  assert.equal(userColour({ color: { css: "#112233" } }), "#112233");
  assert.equal(userColour({ color: { toString: () => "#445566" } }), "#445566");
  assert.equal(userColour({ color: "red" }), "#e8493c", "a word is not a colour a canvas can be sure of: the fallback");
  assert.equal(userColour(null), "#e8493c");
});

/* ---------------------------------------------------------------- the bridge, against a stand-in */

/** A drawn token, with Foundry 14's rules for control (the layer must be active; only an owner) and aim (set on both sides). */
class FakeToken {
  constructor(doc, layer) { this.document = doc; this.layer = layer; this.id = doc.id; this.controlled = false; this.targeted = new Set(); }
  get isTargeted() { return this.targeted.has(game.user); }
  control({ releaseOthers = true } = {}) {
    if (!this.layer.active) return false;
    if (releaseOthers) for (const t of this.layer.tokens.values()) if (t !== this) t.controlled = false;      // released first, as Foundry does
    if (!this.document.isOwner) return false;
    this.controlled = true;
    return true;
  }
  setTarget(on, { releaseOthers = true } = {}) { this.layer.setTargets([this.id], { mode: on ? (releaseOthers ? "replace" : "acquire") : "release" }); }
}

class FakeLayer {
  constructor() { this.tokens = new Map(); this.active = true; this.activated = 0; }
  get(id) { return this.tokens.get(id); }
  activate() { this.active = true; this.activated++; }
  releaseAll() { for (const t of this.tokens.values()) t.controlled = false; }
  setTargets(ids, { mode = "replace" } = {}) {
    const now = new Set(mode === "replace" ? [] : [...game.user.targets].map((t) => t.id));
    for (const id of ids) { if (mode === "release") now.delete(id); else if (this.tokens.has(id)) now.add(id); }
    for (const t of this.tokens.values()) {
      if (now.has(t.id)) { t.targeted.add(game.user); game.user.targets.add(t); } else { t.targeted.delete(game.user); game.user.targets.delete(t); }
    }
  }
}

/** A scene with a collection of tokens that can be made, changed and taken away, drawn on a layer when it is the one on the canvas. */
function stand({ gm = true, owner = true, canvasOn = true } = {}) {
  const world = installFoundry({ user: { id: "u1", name: "Me", isGM: gm, color: "#33aaff" } });
  world.user.targets = new Set();
  game.users.activeGM = gm ? world.user : { id: "someone-else" };
  game.actors = { get: (id) => (["actorAna", "actorBasic"].includes(id) ? { id } : undefined) };
  const layer = new FakeLayer();
  const writes = { create: 0, update: 0, delete: 0 };
  let n = 0;
  const scene = {
    id: "scene1",
    flags: { stagecraft: { published: { cards: structuredClone(cards) } } },
    dimensions: { sceneRect: rect }, grid: { size: 100 },
    tokens: [],
    async createEmbeddedDocuments(type, list) {
      assert.equal(type, "Token");
      writes.create++;
      return list.map((data) => {
        const doc = { id: `tok${++n}`, ...structuredClone(data), parent: scene, isOwner: owner, texture: data.texture ?? {}, getFlag: (ns, key) => doc.flags?.[ns]?.[key] };
        scene.tokens.push(doc);
        if (canvasOn) layer.tokens.set(doc.id, new FakeToken(doc, layer));
        Hooks.callAll("createToken", doc);
        return doc;
      });
    },
    async updateEmbeddedDocuments(type, list) {
      writes.update++;
      for (const change of list) {
        const doc = scene.tokens.find((t) => t.id === change._id);
        for (const [k, v] of Object.entries(change)) { if (k === "_id") continue; if (k === "texture.src") doc.texture = { ...doc.texture, src: v }; else doc[k] = v; }
        Hooks.callAll("updateToken", doc, change);
      }
    },
    async deleteEmbeddedDocuments(type, ids) {
      writes.delete++;
      for (const id of ids) {
        const at = scene.tokens.findIndex((t) => t.id === id);
        const [doc] = scene.tokens.splice(at, 1);
        layer.tokens.delete(id);
        Hooks.callAll("deleteToken", doc);
      }
    }
  };
  globalThis.canvas = canvasOn ? { scene: { id: "scene1" }, tokens: layer } : { scene: { id: "other" }, tokens: layer };
  const pokes = [];
  const host = { scene, pace: { poke: (t) => pokes.push(t) } };
  const tokens = new CardTokens(host);
  return { world, scene, layer, writes, host, tokens, pokes };
}

const flagged = (scene) => scene.tokens.map((t) => t.flags.stagecraft[TOKEN_FLAG]);

test("the acting GM makes one token per card, and does nothing more while the cards are as they were", async () => {
  const { scene, tokens, writes } = stand();
  await tokens.ensure();
  assert.deepEqual(flagged(scene), ["ana", "nobu"]);
  assert.equal(scene.tokens[0].actorId, "actorAna", "the party's own character: its own actor");
  assert.equal(writes.create, 1);
  await tokens.ensure();
  await tokens.ensure();
  assert.deepEqual(writes, { create: 1, update: 0, delete: 0 }, "nothing written when nothing changed");
});

test("a player's screen makes no tokens, and neither does a GM's while another GM is the acting one", async () => {
  const player = stand({ gm: false });
  await player.tokens.ensure();
  assert.deepEqual(player.scene.tokens, []);
  const second = stand();
  game.users.activeGM = { id: "someone-else" };
  await second.tokens.ensure();
  assert.deepEqual(second.scene.tokens, []);
});

test("a card that arrives gets a token, one renamed renames its token, one that leaves loses it, and a token taken away by hand comes back", async () => {
  const { scene, tokens, writes } = stand();
  await tokens.ensure();
  scene.flags.stagecraft.published.cards.push({ id: "vetch", name: "Vetch", at: [0.7, 0.7] });
  await tokens.ensure();
  assert.deepEqual(flagged(scene), ["ana", "nobu", "vetch"]);
  scene.flags.stagecraft.published.cards.find((c) => c.id === "vetch").name = "Inspector Vetch";
  await tokens.ensure();
  assert.equal(scene.tokens.find((t) => t.flags.stagecraft.card === "vetch").name, "Inspector Vetch");
  assert.equal(writes.update, 1);
  scene.flags.stagecraft.published.cards = scene.flags.stagecraft.published.cards.filter((c) => c.id !== "nobu");
  await tokens.ensure();
  assert.deepEqual(flagged(scene), ["ana", "vetch"]);
  await scene.deleteEmbeddedDocuments("Token", [scene.tokens[0].id]);          // someone deletes Ana's token from Foundry's own tools
  await tokens.work;                                                            // no scene change, no call: the deletion itself brings it back
  assert.deepEqual(flagged(scene).sort(), ["ana", "vetch"], "made again at once");
});

test("the scene itself being deleted (its tokens go first) does not make anything again", async () => {
  const { scene, tokens, world, writes } = stand();
  await tokens.ensure();
  game.scenes = { get: () => undefined };
  await scene.deleteEmbeddedDocuments("Token", [scene.tokens[0].id]);
  await tokens.work;
  assert.equal(writes.create, 1, "nothing was made again for a scene that is gone");
  void world;
});

test("a token that is not ours is never touched", async () => {
  const { scene, tokens } = stand();
  await scene.createEmbeddedDocuments("Token", [{ name: "Reference", flags: { "another-module": { reference: true } } }]);
  scene.flags.stagecraft.published.cards = [];
  await tokens.ensure();
  assert.equal(scene.tokens.length, 1);
  assert.equal(scene.tokens[0].name, "Reference");
});

test("the adventure's provider says who a card without an actor stands for, and is asked again only when the name changes", async () => {
  const { scene, tokens } = stand();
  const asked = [];
  const off = registerTokenActors(async (s, card) => { asked.push(card.id); return card.id === "nobu" ? { id: "actorBasic" } : "nobody-has-this-id"; });
  try {
    await tokens.ensure();
    assert.equal(scene.tokens.find((t) => t.flags.stagecraft.card === "nobu").actorId, "actorBasic");
    assert.equal(scene.tokens.find((t) => t.flags.stagecraft.card === "ana").actorId, "actorAna", "a card's own actor first: the provider is not asked");
    assert.deepEqual(asked, ["nobu"]);
    scene.flags.stagecraft.published.cards.push({ id: "extra", name: "Extra", at: [0.1, 0.1] });
    await tokens.ensure();
    assert.deepEqual(asked, ["nobu", "extra"], "nobody already answered for is asked again");
    assert.equal(scene.tokens.find((t) => t.flags.stagecraft.card === "extra").actorId, undefined, "an answer that is not an actor of the world is no answer");
  } finally { off(); }
  assert.throws(() => registerTokenActors("not a function"), /function/);
});

test("an unlinked answer from the provider reaches the token, and the card's own actor is never overridden by it", async () => {
  const { scene, tokens } = stand();
  const off = registerTokenActors(async () => ({ id: "actorBasic", link: false }));
  try {
    await tokens.ensure();
    const nobu = scene.tokens.find((t) => t.flags.stagecraft.card === "nobu");
    assert.equal(nobu.actorId, "actorBasic");
    assert.equal(nobu.actorLink, false);
    assert.equal(scene.tokens.find((t) => t.flags.stagecraft.card === "ana").actorLink, true, "the party's own character stays linked");
  } finally { off(); }
});

test("a provider that fails leaves the card with a token that stands for no actor, and the others are made", async () => {
  const { scene, tokens } = stand();
  const off = registerTokenActors(() => { throw new Error("broken"); });
  const warn = console.warn; console.warn = () => {};
  try { await tokens.ensure(); } finally { console.warn = warn; off(); }
  assert.deepEqual(flagged(scene), ["ana", "nobu"]);
  assert.equal(scene.tokens.find((t) => t.flags.stagecraft.card === "nobu").actorId, undefined);
});

test("a click controls a card's own token through Foundry, one at a time, and a click on nothing lets go", async () => {
  const { scene, layer, tokens } = stand();
  await tokens.ensure();
  assert.equal(tokens.select("ana"), true);
  assert.deepEqual([...tokens.state().controlled], ["ana"]);
  assert.equal(layer.get(scene.tokens[0].id).controlled, true, "Foundry's own controlled token, so the system and every module read it");
  assert.equal(tokens.select("nobu"), true);
  assert.deepEqual([...tokens.state().controlled], ["nobu"], "controlling another lets go of the first");
  assert.equal(tokens.select("ana", { add: true }), true);
  assert.deepEqual([...tokens.state().controlled].sort(), ["ana", "nobu"], "Shift adds");
  tokens.release();
  assert.equal(tokens.state().controlled.size, 0);
});

test("Foundry's layer is made active so a control is allowed, and only an owner can control a token", async () => {
  const mine = stand();
  await mine.tokens.ensure();
  mine.layer.active = false;
  assert.equal(mine.tokens.select("ana"), true);
  assert.equal(mine.layer.activated, 1);
  const theirs = stand({ gm: false, owner: false });
  await theirs.scene.createEmbeddedDocuments("Token", [{ name: "Nobu", flags: { stagecraft: { card: "nobu" } } }]);
  theirs.tokens.map = null;
  assert.equal(theirs.tokens.select("nobu"), false, "a player cannot control a token that is not theirs");
  assert.equal(theirs.tokens.state().controlled.size, 0);
});

test("T aims through Foundry: the only target, one more with Shift, let go when aimed at again, and cleared", async () => {
  const { tokens, world } = stand();
  await tokens.ensure();
  assert.equal(tokens.target("nobu"), true);
  assert.deepEqual([...world.user.targets].map((t) => t.document.flags.stagecraft.card), ["nobu"], "game.user.targets, which the system reads for an attack");
  assert.equal(tokens.target("ana", { add: true }), true);
  assert.equal(world.user.targets.size, 2);
  assert.equal(tokens.target("ana"), false, "aiming at a card that is aimed at lets it go");
  assert.deepEqual([...world.user.targets].map((t) => t.document.flags.stagecraft.card), ["nobu"], "and only it: the other stays aimed at, as in Foundry");
  assert.equal(tokens.target("ana"), true, "an unaimed card without Shift becomes the only target");
  assert.deepEqual([...world.user.targets].map((t) => t.document.flags.stagecraft.card), ["ana"]);
  assert.equal(tokens.target("nobu", { add: true }), true);
  assert.equal(tokens.hasTargets(), true);
  tokens.clearTargets();
  assert.equal(world.user.targets.size, 0);
  assert.equal(tokens.hasTargets(), false);
});

test("every user's aim is read back as that user's colour, with this user's own first", async () => {
  const { layer, tokens, world, scene } = stand();
  await tokens.ensure();
  const other = { id: "u2", color: { css: "#00cc88" } };
  const nobu = layer.get(scene.tokens.find((t) => t.flags.stagecraft.card === "nobu").id);
  nobu.targeted.add(other);
  assert.deepEqual(tokens.state().targets.get("nobu"), ["#00cc88"]);
  nobu.targeted.add(world.user);
  assert.deepEqual(tokens.state().targets.get("nobu"), ["#33aaff", "#00cc88"], "mine first");
  assert.equal(tokens.state().targets.has("ana"), false);
});

test("with no token to reach (the scene is not the one on the canvas, or no GM has made them) the stage still answers, on this screen alone", async () => {
  const { tokens, world } = stand({ canvasOn: false });
  assert.equal(tokens.select("ana"), true, "chosen locally");
  assert.deepEqual([...tokens.state().controlled], ["ana"]);
  assert.equal(tokens.select("nobu"), true);
  assert.deepEqual([...tokens.state().controlled], ["nobu"]);
  assert.equal(tokens.target("ana"), true);
  assert.deepEqual(tokens.state().targets.get("ana"), ["#33aaff"]);
  assert.equal(tokens.target("nobu", { add: true }), true);
  assert.equal(tokens.localTargets.size, 2);
  assert.equal(tokens.target("nobu"), false, "aimed at again: let go");
  assert.deepEqual([...tokens.localTargets], ["ana"], "and only it");
  tokens.release();
  tokens.clearTargets();
  assert.equal(tokens.state().controlled.size, 0);
  assert.equal(tokens.localTargets.size, 0);
  assert.equal(world.user.targets.size, 0);
});

test("a card chosen on this screen alone follows the rule for taking hold of a card: only whoever may hold it", async () => {
  const { tokens, host } = stand({ gm: false, canvasOn: false });
  host.stage = { cards: new Map([["nobu", { person: { id: "nobu", owners: ["gm"] } }], ["ana", { person: { id: "ana", owners: ["u1"] } }]]) };
  assert.equal(tokens.select("nobu"), false, "someone else's card");
  assert.equal(tokens.select("ana"), true, "their own");
  assert.deepEqual([...tokens.state().controlled], ["ana"]);
});

test("the bridge lets go of its hooks when it goes", async () => {
  const { tokens, world } = stand();
  const count = () => ["createToken", "updateToken", "deleteToken", "controlToken"].reduce((n, h) => n + world.hooks.count(h), 0);
  assert.equal(count(), 4);
  tokens.dispose();
  assert.equal(count(), 0);
});
