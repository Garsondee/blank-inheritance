// Tier 1 — the stage's wings, the adventure's half (core/stage-wings.mjs, 2026-10-04, D060): who in a scene's cast still
// waits and where each would stand, who is already there when a scene first opens, who else the GM can find, and what the
// GM's card menu adds. The stage's own half is Stagecraft's (module/stagecraft/test/wings.test.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { WAY_IDS, wayOf, waitingInWings, presentOnOpen, findInCasts, cardActionIds } from "../module/blank-inheritance/scripts/core/stage-wings.mjs";
import { rawStageId, stageIdFor } from "../module/blank-inheritance/scripts/core/stage-names.mjs";
import { displayName } from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

const idOf = (m) => `summon-${stageIdFor(m)}`;
const keyOf = rawStageId;
const nameOf = (m) => displayName(m) ?? rawStageId(m);

const nobu = { id: "nobu", npcRef: "nobu", label: "Nobu", role: "Quartermaster", arrival: "announced" };
const vetch = { id: "section-officer", npcRef: "section-officer", label: "Section Officer Vetch", arrival: "announced" };
const shucks = { id: "shucks-mordant", npcRef: "shucks-mordant", label: "Shucks Mordant", called: "Doctor Mordant", arrival: "quiet", present: true };
const clerk = { id: "clerk", npcRef: "intake-medicals-clerk", label: "The clerk", arrival: "quiet", present: true };

test("the ways someone can come on are the stage's own sting tiers; anything else is their own way", () => {
  assert.deepEqual(WAY_IDS, ["quiet", "announced", "splash"]);
  assert.equal(wayOf("splash"), "splash");
  assert.equal(wayOf("dramatic"), null);
  assert.equal(wayOf(null), null);
});

test("everyone the brief names waits until they are on the stage, at the place the stage entry gives them", () => {
  const def = { places: { nobu: [0.6, 0.64], "shucks-mordant": [0.64, 0.79] }, sizes: { nobu: 1.1 } };
  const published = [{ portraitId: "summon-section-officer" }, { portraitId: "pc-1", kind: "pc" }];
  const waiting = waitingInWings({ cast: [nobu, vetch, shucks, clerk, null], published, def, idOf, keyOf });
  assert.deepEqual(waiting.map((w) => w.id), ["summon-nobu", idOf(shucks), "summon-intake-medicals-clerk"], "Vetch is on the stage: he no longer waits");
  assert.deepEqual(waiting[0].at, [0.6, 0.64]);
  assert.equal(waiting[0].size, 1.1);
  assert.equal(waiting[2].at, null, "no place in this stage entry: in the tray only");
  assert.equal(waiting[2].size, 1);
});

test("a protected person waits under the alias the stage will file them by, and their place is found by their real id", () => {
  const waiting = waitingInWings({ cast: [shucks], published: [], def: { places: { "shucks-mordant": [0.4, 0.8] } }, idOf, keyOf });
  assert.notEqual(waiting[0].id, "summon-shucks-mordant", "the alias, never the real id, is what the stage knows them by");
  assert.equal(waiting[0].id, idOf(shucks));
  assert.equal(waiting[0].key, "shucks-mordant");
  assert.deepEqual(waiting[0].at, [0.4, 0.8]);
  assert.deepEqual(waitingInWings({ cast: [shucks], published: [{ portraitId: idOf(shucks) }], def: null, idOf, keyOf }), [], "once on the stage, by the alias, they no longer wait");
});

test("present people are placed only the first time a scene is opened, and never on a sub-scene", () => {
  const cast = [nobu, shucks, clerk];
  assert.deepEqual(presentOnOpen({ cast, kind: "beat", staged: false }).map((m) => m.id), ["shucks-mordant", "clerk"]);
  assert.deepEqual(presentOnOpen({ cast, kind: "beat", staged: true }), [], "the stage has been set already (the party is on it): nobody is put back");
  assert.deepEqual(presentOnOpen({ cast, kind: "sub", staged: false }), [], "a sub-scene is a room the GM moves the table into");
  assert.deepEqual(presentOnOpen({ cast: null }), []);
});

test("the finder finds anyone in any scene's cast, once each, then the world's Actors who are not one of them", () => {
  const briefs = [
    { id: "kit-issue", title: "Kit Issue", cast: [nobu, vetch] },
    { id: "canteen", title: "Canteen", cast: [{ id: "taka", npcRef: "taka", label: "Taka", role: "A candidate a year ahead" }, vetch] }
  ];
  const actors = [{ id: "a1", name: "Nobu" }, { id: "a2", name: "Takahashi the Fixer" }, { id: "a3", name: "Kasumi" }];
  const hits = findInCasts({ query: "ta", briefs, actors, idOf, keyOf, nameOf });
  assert.deepEqual(hits.map((h) => (h.kind === "cast" ? h.member.id : h.actor.id)), ["taka", "a2"], "a name that starts with it beats one that only holds it; a cast member beats an Actor");
  assert.equal(hits[0].briefTitle, "Canteen");
  assert.deepEqual(findInCasts({ query: "vetch", briefs, actors, idOf, keyOf, nameOf }).map((h) => h.briefId), ["kit-issue"], "Vetch is offered once, from the first scene that names him");
  assert.deepEqual(findInCasts({ query: "nobu", briefs, actors, idOf, keyOf, nameOf }).map((h) => h.kind), ["cast"], "the Actor named Nobu is Nobu: offered from his scene, not twice");
  assert.deepEqual(findInCasts({ query: "nobu", briefs, actors, idOf, keyOf, nameOf, exclude: new Set(["summon-nobu"]) }), [], "nobody already on the stage or in the wings");
  assert.deepEqual(findInCasts({ query: "   ", briefs, actors, idOf, keyOf, nameOf }), []);
});

test("the finder finds a protected person by what the table calls them too, and an Actor made for them is never offered", () => {
  const briefs = [{ id: "intake", title: "Intake", cast: [shucks] }];
  const hits = findInCasts({ query: "doctor", briefs, actors: [{ id: "x", name: "Doctor Who", npcRef: "shucks-mordant" }], idOf, keyOf, nameOf });
  assert.deepEqual(hits.map((h) => h.kind), ["cast"]);
  assert.equal(hits[0].stageId, idOf(shucks));
});

test("someone protected in one scene and named outright in another is offered once, protected (found live 2026-10-04)", () => {
  // Episode One holds Shucks Mordant's name back ("Doctor Mordant"); Episode Two's briefs name him outright. The finder listed
  // him twice, and the plain one would have put his real name on a card whatever the table knew.
  const plain = { id: "shucks-mordant", npcRef: "shucks-mordant", label: "Shucks Mordant" };
  const briefs = [{ id: "e2", title: "School: Period Two", cast: [plain] }, { id: "e1", title: "Intake Medicals", cast: [shucks] }];
  const hits = findInCasts({ query: "mord", briefs, idOf, keyOf, nameOf });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].briefId, "e1", "offered from the scene that holds the name back");
  assert.equal(hits[0].stageId, idOf(shucks));
  assert.deepEqual(findInCasts({ query: "mord", briefs, idOf, keyOf, nameOf, exclude: new Set(["summon-shucks-mordant"]) }), [], "on the stage under his own id: not offered either");
});

test("the finder offers at most eight, best first", () => {
  const cast = Array.from({ length: 12 }, (_, i) => ({ id: `kid-${i}`, npcRef: `kid-${i}`, label: `Kid ${i}` }));
  assert.equal(findInCasts({ query: "kid", briefs: [{ id: "b", cast }], idOf, keyOf, nameOf }).length, 8);
});

test("the GM's card menu: send off anyone the stage put there who is not the party's; tell a name only while it is held back", () => {
  const published = [{ portraitId: "summon-nobu" }, { portraitId: idOf(shucks) }, { portraitId: "pc-1", kind: "pc" }];
  const authored = [{ portraitId: idOf(shucks), called: "Doctor Mordant", nameKey: "shucks-mordant", label: "Shucks Mordant" }, { portraitId: "summon-nobu", label: "Nobu" }];
  assert.deepEqual(cardActionIds({ cardId: "summon-nobu", published, authored }), ["send-off"]);
  assert.deepEqual(cardActionIds({ cardId: idOf(shucks), published, authored }), ["send-off", "tell-name"]);
  assert.deepEqual(cardActionIds({ cardId: idOf(shucks), published, authored, known: new Set(["shucks-mordant"]) }), ["send-off"], "told already: nothing to tell");
  assert.deepEqual(cardActionIds({ cardId: "pc-1", published, authored, card: { pc: true } }), [], "the party's cards are their players'");
  assert.deepEqual(cardActionIds({ cardId: "someone-else", published, authored }), [], "a card the adventure did not put there is left alone");
});
