// Stagecraft gives every card a token (design/stagecraft/module.md section 39), and a card with no actor of its own (everyone but the
// party) gets a BASIC actor made for it, so its token has something to stand for. What the actor is made of comes from the card alone:
// a world's actors reach every player's browser whatever their ownership says, so a protected person is called what the table
// calls them and shows the picture the table sees, and nothing else.

import { test } from "node:test";
import assert from "node:assert/strict";
import { BASIC_FLAG, BASIC_FOLDER_FLAG, basicFace, basicName, basicSourceId, isBasicActor } from "../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs";
import { deriveFoundryId } from "../module/blank-inheritance/scripts/core/ids.mjs";

test("a basic actor is called by the first line of its card's name, whatever the plate's breaks", () => {
  assert.equal(basicName({ id: "summon-nobu", name: "Nobu\nQuartermaster" }), "Nobu");
  assert.equal(basicName({ id: "summon-nobu", name: "Nobu<br/>Quartermaster" }), "Nobu");
  assert.equal(basicName({ id: "summon-nobu", name: "Nobu\\nQuartermaster" }), "Nobu");
  assert.equal(basicName({ id: "summon-x", name: "   " }), "summon-x", "a card with no words is its id");
});

test("its face is the card's own: the name the table uses and the picture the table sees, or none", () => {
  assert.deepEqual(basicFace({ id: "a", name: "The man in grey", portrait: "modules/blank-inheritance/assets/stage/opaque-1.webp" }), { name: "The man in grey", img: "modules/blank-inheritance/assets/stage/opaque-1.webp" });
  assert.deepEqual(basicFace({ id: "a", name: "Vetch" }), { name: "Vetch", img: null });
  assert.deepEqual(basicFace({ id: "a", name: "Vetch", portrait: "" }), { name: "Vetch", img: null });
});

test("a basic actor is told apart by its flag, from an Actor or from its data", () => {
  assert.equal(isBasicActor({ flags: { "blank-inheritance": { [BASIC_FLAG]: true } } }), true);
  assert.equal(isBasicActor({ getFlag: (ns, key) => (ns === "blank-inheritance" && key === BASIC_FLAG ? true : undefined) }), true);
  assert.equal(isBasicActor({ flags: {} }), false);
  assert.equal(isBasicActor({ getFlag: () => undefined }), false);
  assert.equal(isBasicActor(null), false);
  assert.notEqual(BASIC_FLAG, BASIC_FOLDER_FLAG);
});

test("one actor per card id, the same in every scene, and never the id the content sync would make for the same name", async () => {
  assert.equal(basicSourceId("summon-nobu"), "stagecraft-basic-summon-nobu");
  const a = await deriveFoundryId(basicSourceId("summon-nobu"));
  assert.equal(a, await deriveFoundryId(basicSourceId("summon-nobu")));
  assert.notEqual(a, await deriveFoundryId("summon-nobu"));
  assert.notEqual(a, await deriveFoundryId("nobu"), "the real person's actor, if there is one, is a different document");
  assert.match(a, /^[0-9a-f]{16}$/);
});

/* ---------------------------------------------------------------- making one (the Foundry half, against a stand-in) */

function world({ gm = true } = {}) {
  const actors = new Map();
  const made = [];
  const folders = [];
  const user = { id: "gm", isGM: gm };
  globalThis.game = {
    user, users: { activeGM: gm ? user : { id: "other" } },
    actors: { get: (id) => actors.get(id), has: (id) => actors.has(id), contents: [...actors.values()] },
    folders: { find: (fn) => folders.find(fn) },
    modules: { get: () => null }
  };
  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } };
  globalThis.Folder = {
    async create(data) {
      const f = { id: `folder${folders.length + 1}`, ...data, getFlag: (ns, key) => data.flags?.[ns]?.[key] };
      folders.push(f);
      return f;
    }
  };
  globalThis.Actor = {
    async create(data, options) {
      // a basic figure is kept under its own derived id (so the same card finds it next time); an imported copy of a compendium creature is found by its flag
      if (!data.flags?.["blank-inheritance"]?.stagecraftExisting) assert.equal(options?.keepId, true, "kept under its own id, so the same card finds it next time");
      const actor = { ...structuredClone(data), id: data._id ?? `actor${actors.size + 1}`, updates: [], getFlag(ns, key) { return this.flags?.[ns]?.[key]; }, async update(change) { this.updates.push(change); Object.assign(this, { name: change.name ?? this.name, img: change.img ?? this.img }); } };
      actors.set(actor.id, actor);
      made.push(actor);
      return actor;
    }
  };
  return { actors, made, folders };
}

const bridge = () => import("../module/blank-inheritance/scripts/foundry/stage-figures.mjs");

test("the acting GM's screen makes a basic npc actor for a card, kept in a folder, flagged, and seen by no one else", async () => {
  const { made, folders } = world();
  const { basicActorFor } = await bridge();
  const actor = await basicActorFor({ id: "summon-nobu", name: "Nobu\nQuartermaster", portrait: "art/nobu.webp" });
  assert.equal(made.length, 1);
  assert.equal(actor.name, "Nobu");
  assert.equal(actor.type, "npc");
  assert.equal(actor.img, "art/nobu.webp");
  assert.equal(actor.id, await deriveFoundryId(basicSourceId("summon-nobu")));
  assert.equal(actor.flags["blank-inheritance"][BASIC_FLAG], true);
  assert.deepEqual(actor.ownership, { default: 0 }, "no player owns or observes it");
  assert.equal(actor.prototypeToken.name, "Nobu");
  assert.equal(actor.prototypeToken.actorLink, true);
  assert.ok(actor.prototypeToken.ring, "every actor the adventure makes carries a token ring");
  assert.equal(folders.length, 1);
  assert.equal(folders[0].type, "Actor");
  assert.equal(actor.folder, folders[0].id);
  assert.equal(actor.sourceId, undefined);
  assert.equal(actor.flags["blank-inheritance"].sourceId, undefined, "no sourceId or sourceHash: the world sync's retirement of old documents can never mistake it for its own");
  assert.equal(actor.flags["blank-inheritance"].sourceHash, undefined);
});

test("asked again it is the same actor, renamed when the card is (a name the table has learned), and made only once even when asked twice at once", async () => {
  const { made, folders } = world();
  const { basicActorFor } = await bridge();
  const card = { id: "summon-stranger", name: "The man in grey", portrait: "art/opaque.webp" };
  const [one, two] = await Promise.all([basicActorFor(card), basicActorFor(card)]);
  assert.equal(one, two);
  assert.equal(made.length, 1);
  assert.equal(await basicActorFor(card), one);
  assert.deepEqual(one.updates, [], "nothing written when nothing changed");
  const learned = await basicActorFor({ ...card, name: "Vetch" });
  assert.equal(learned, one);
  assert.deepEqual(one.updates, [{ name: "Vetch", "prototypeToken.name": "Vetch" }]);
  await basicActorFor({ id: "summon-other", name: "Other" });
  assert.equal(folders.length, 1, "one folder for all of them");
});

test("nobody but the acting GM makes one, and a card with no id gets none", async () => {
  const player = world({ gm: false });
  const { basicActorFor } = await bridge();
  assert.equal(await basicActorFor({ id: "summon-nobu", name: "Nobu" }), null);
  assert.equal(player.made.length, 0);
  world();
  assert.equal(await basicActorFor({ name: "No id" }), null);
});

/* ---------------------------------------------------------------- where they are kept out of the way */

test("the finder and the Director's palette do not offer a basic actor as a person to bring on or summon", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (p) => readFileSync(new URL(`../module/blank-inheritance/scripts/${p}`, import.meta.url), "utf8");
  assert.match(read("foundry/stagecraft-bridge.mjs"), /!castActors\.has\(a\.id\) && !isBasicActor\(a\)/, "the wings' finder");
  assert.match(read("foundry/director-palette.mjs"), /!isBasicActor\(a\)/, "the palette's summon list");
});

test("the adventure hands Stagecraft its provider when the module is ready, and the actors are made by the file that has few imports", async () => {
  const { readFileSync } = await import("node:fs");
  const bridge = readFileSync(new URL("../module/blank-inheritance/scripts/foundry/stagecraft-bridge.mjs", import.meta.url), "utf8");
  assert.match(bridge, /api\?\.tokens\?\.setActorProvider\?\.\(\(scene, card\) => actorForCard\(scene, card\)\)/);
  assert.match(bridge, /from "\.\/stage-figures\.mjs"/);
});

/* ---------------------------------------------------------------- who a card's token stands for */

import { existingFor, npcIdFor, stageIdOf, EXISTING_FLAG } from "../module/blank-inheritance/scripts/core/npc-generator/cards.mjs";

const ROSTER = { existing: [{ id: "giant-centipede", cards: "^giant-centipede(-\\d+)?$", compendium: "Compendium.sf2e.tales-from-the-vast-bestiary.Actor.abc", link: false }] };

test("a card's id gives the stage id, the person's real key when their name is held back, and a pack member its pack", () => {
  assert.equal(stageIdOf("summon-nobu"), "nobu");
  assert.equal(npcIdFor({ id: "summon-p0123456789ab" }, { portraitId: "summon-p0123456789ab", nameKey: "shucks-mordant" }), "shucks-mordant", "the real id, GM-side only");
  assert.equal(npcIdFor({ id: "summon-nobu" }, null), "nobu");
  assert.equal(existingFor("giant-centipede-4", ROSTER.existing)?.id, "giant-centipede");
  assert.equal(existingFor("giant-centipede", ROSTER.existing)?.id, "giant-centipede");
  assert.equal(existingFor("nobu", ROSTER.existing), null);
  assert.equal(existingFor("giant-centipede-4", [{ cards: "(" }]), null, "a bad pattern matches no one");
  assert.equal(existingFor("x", undefined), null);
});

function worldWithActors({ gm = true } = {}) {
  const w = world({ gm });
  const compendium = { id: "src", toObject: () => ({ name: "Giant Centipede", type: "npc", system: { details: { level: { value: -1 } } } }) };
  globalThis.fromUuid = async (uuid) => (uuid === ROSTER.existing[0].compendium ? compendium : null);
  game.actors.fromCompendium = (doc) => ({ ...doc.toObject() });
  game.actors.find = (fn) => [...w.actors.values()].find(fn);
  game.actors.get = (id) => w.actors.get(id);
  return w;
}

test("a creature that already has a statblock is imported from the compendium once and each token is its own copy", async () => {
  const w = worldWithActors();
  const { actorForCard } = await bridge();
  const deps = { loadRoster: async () => ROSTER, loadAuthored: async () => [] };
  const answers = await Promise.all([1, 2, 3].map((n) => actorForCard({ id: "s" }, { id: `summon-giant-centipede-${n}`, name: "Giant Centipede" }, deps)));
  assert.equal(w.made.length, 1, "imported once for all six");
  assert.ok(answers.every((a) => a.id === w.made[0].id && a.link === false), "unlinked: each token has its own hit points");
  assert.equal(w.made[0].flags["blank-inheritance"][EXISTING_FLAG], "giant-centipede");
  assert.equal(w.made[0].flags["blank-inheritance"].stagecraftBasic, true, "kept out of the finder and the palette like the other figures");
  assert.deepEqual(w.made[0].ownership, { default: 0 });
  assert.equal(w.made[0].system.details.level.value, -1, "exactly the compendium's actor: nothing generated");
  const again = await actorForCard({ id: "s" }, { id: "summon-giant-centipede-9", name: "Giant Centipede" }, deps);
  assert.equal(again.id, w.made[0].id);
  assert.equal(w.made.length, 1, "found by its flag the next time");
});

test("a person with a real synced actor stands for it, found by their real key even when their name is held back", async () => {
  const w = worldWithActors();
  const realId = await deriveFoundryId("shucks-mordant");
  w.actors.set(realId, { id: realId, type: "npc", name: "Shucks Mordant" });
  const { actorForCard } = await bridge();
  const deps = { loadRoster: async () => ROSTER, loadAuthored: async () => [{ portraitId: "summon-p0123456789ab", nameKey: "shucks-mordant" }] };
  const protectedAnswer = await actorForCard({ id: "s" }, { id: "summon-p0123456789ab", name: "Doctor Mordant" }, deps);
  assert.deepEqual(protectedAnswer, { id: realId, link: true });
  const nobuId = await deriveFoundryId("nobu");
  w.actors.set(nobuId, { id: nobuId, type: "npc" });
  assert.deepEqual(await actorForCard({ id: "s" }, { id: "summon-nobu", name: "Nobu" }, { ...deps, loadAuthored: async () => [] }), { id: nobuId, link: true });
  assert.equal(w.made.length, 0, "nothing was made: the real actors were used");
});

test("someone with no real actor and no statblock of their own is a basic figure, as before; a roster or authored cast that cannot be read changes nothing", async () => {
  const w = worldWithActors();
  const { actorForCard } = await bridge();
  const answer = await actorForCard({ id: "s" }, { id: "summon-a-stranger", name: "A stranger" }, { loadRoster: async () => { throw new Error("no roster"); }, loadAuthored: async () => { throw new Error("no vault"); } });
  assert.equal(answer.flags["blank-inheritance"].stagecraftBasic, true);
  assert.equal(answer.name, "A stranger");
  assert.equal(w.made.length, 1);
});

test("only the acting GM's screen resolves anyone", async () => {
  worldWithActors({ gm: false });
  const { actorForCard } = await bridge();
  assert.equal(await actorForCard({ id: "s" }, { id: "summon-nobu", name: "Nobu" }, { loadRoster: async () => ROSTER, loadAuthored: async () => [] }), null);
});
