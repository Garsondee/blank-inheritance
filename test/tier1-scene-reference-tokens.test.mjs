// Tier 1 — pure logic for foundry/scene-build.mjs's hidden GM-reference
// tokens (Ingram, 2026-09-29: every npc should have a real Actor and a
// token she can click into during Theatre of Mind play, hidden so players
// never see it — see design/theatre-of-the-mind-staging.md §4 for why
// Token#hidden is the right mechanism).
//
// Only castNpcRefs and planReferenceTokens are tested here: both are pure
// (no Foundry globals), deliberately extracted out of syncCastReferenceTokens
// so the actual DECIDING has real test coverage even though the Scene
// document calls around it don't — see tier3-scene-build-contract.test.mjs's
// own header for why this file's mock Foundry doesn't model Scene's embedded
// Token collection, and planReferenceTokens's own doc comment for why that
// split exists.

import { test } from "node:test";
import assert from "node:assert/strict";

import { castNpcRefs, planReferenceTokens } from "../module/blank-inheritance/scripts/foundry/scene-build.mjs";

test("castNpcRefs: collects every distinct npcRef a cast names, in order, dropping walk-ons with none", () => {
  const brief = {
    cast: [
      { id: "manako", npcRef: "manako" },
      { id: "storekeeper", npcRef: "the-storekeeper" },
      { id: "some-walk-on", label: "A stranger" }, // no npcRef -- no npc file exists for them
      { id: "manako-again", npcRef: "manako" } // same npcRef cast twice in one brief -- must not duplicate
    ]
  };
  assert.deepEqual(castNpcRefs(brief), ["manako", "the-storekeeper"]);
});

test("castNpcRefs: a brief with no cast at all, or a missing brief, yields an empty list rather than throwing", () => {
  assert.deepEqual(castNpcRefs({}), []);
  assert.deepEqual(castNpcRefs(null), []);
  assert.deepEqual(castNpcRefs({ cast: [] }), []);
});

test("planReferenceTokens: an npc with no existing token yet is created, hidden, actor-linked, flagged with its own npcRef", () => {
  const wanted = new Map([["manako", "actorid-manako"]]);
  const { toCreate, toUpdate, toDelete } = planReferenceTokens(wanted, []);

  assert.deepEqual(toUpdate, []);
  assert.deepEqual(toDelete, []);
  assert.equal(toCreate.length, 1);
  const [token] = toCreate;
  assert.equal(token.actorId, "actorid-manako");
  assert.equal(token.hidden, true, "a reference token must always be created hidden -- this is the whole point");
  assert.equal(token.actorLink, true, "linked, so it always reflects the Actor's current sheet");
  assert.equal(token.flags["blank-inheritance"].referenceToken, true);
  assert.equal(token.flags["blank-inheritance"].npcRef, "manako");
});

test("planReferenceTokens: an npc no longer in the cast has its old token deleted", () => {
  const wanted = new Map(); // nobody wanted this scene any more
  const existing = [{ id: "token-1", actorId: "actorid-manako", hidden: true, npcRef: "manako" }];
  const { toCreate, toUpdate, toDelete } = planReferenceTokens(wanted, existing);

  assert.deepEqual(toCreate, []);
  assert.deepEqual(toUpdate, []);
  assert.deepEqual(toDelete, ["token-1"]);
});

test("planReferenceTokens: an unchanged, already-hidden token pointing at the right actor is left alone entirely -- idempotent re-run", () => {
  const wanted = new Map([["manako", "actorid-manako"]]);
  const existing = [{ id: "token-1", actorId: "actorid-manako", hidden: true, npcRef: "manako" }];
  const { toCreate, toUpdate, toDelete } = planReferenceTokens(wanted, existing);

  assert.deepEqual(toCreate, []);
  assert.deepEqual(toUpdate, []);
  assert.deepEqual(toDelete, []);
});

test("planReferenceTokens: a token whose actor changed (e.g. an npc id was renamed/re-derived) is updated in place, not deleted and recreated", () => {
  const wanted = new Map([["manako", "actorid-manako-NEW"]]);
  const existing = [{ id: "token-1", actorId: "actorid-manako-OLD", hidden: true, npcRef: "manako" }];
  const { toCreate, toUpdate, toDelete } = planReferenceTokens(wanted, existing);

  assert.deepEqual(toCreate, []);
  assert.deepEqual(toDelete, []);
  assert.deepEqual(toUpdate, [{ _id: "token-1", actorId: "actorid-manako-NEW", hidden: true }]);
});

test("planReferenceTokens: a token somehow un-hidden by hand is forced back to hidden on the next sync -- a player must never end up able to see one", () => {
  const wanted = new Map([["manako", "actorid-manako"]]);
  const existing = [{ id: "token-1", actorId: "actorid-manako", hidden: false, npcRef: "manako" }];
  const { toUpdate } = planReferenceTokens(wanted, existing);

  assert.deepEqual(toUpdate, [{ _id: "token-1", actorId: "actorid-manako", hidden: true }]);
});

test("planReferenceTokens: multiple npcs in one scene get distinct, non-overlapping positions", () => {
  const wanted = new Map([
    ["manako", "actorid-manako"],
    ["the-storekeeper", "actorid-storekeeper"]
  ]);
  const { toCreate } = planReferenceTokens(wanted, []);
  assert.equal(toCreate.length, 2);
  const positions = toCreate.map((t) => `${t.x},${t.y}`);
  assert.equal(new Set(positions).size, 2, "two tokens must not land on the exact same point");
});

test("planReferenceTokens: create/update/delete for a mixed cast all happen together in one plan", () => {
  const wanted = new Map([
    ["manako", "actorid-manako"], // unchanged
    ["nobu", "actorid-nobu"] // brand new to this scene
  ]);
  const existing = [
    { id: "token-manako", actorId: "actorid-manako", hidden: true, npcRef: "manako" },
    { id: "token-taka", actorId: "actorid-taka", hidden: true, npcRef: "taka" } // no longer cast here
  ];
  const { toCreate, toUpdate, toDelete } = planReferenceTokens(wanted, existing);

  assert.deepEqual(toDelete, ["token-taka"]);
  assert.deepEqual(toUpdate, []);
  assert.equal(toCreate.length, 1);
  assert.equal(toCreate[0].actorId, "actorid-nobu");
});

test("planReferenceTokens: a newly-created token's name falls back to the npcRef itself when no actor-name lookup is given", () => {
  const wanted = new Map([["manako", "actorid-manako"]]);
  const { toCreate } = planReferenceTokens(wanted, []);
  assert.equal(toCreate[0].name, "manako");
});

test("planReferenceTokens: a newly-created token's name uses the real Actor name when a lookup is supplied", () => {
  const wanted = new Map([["manako", "actorid-manako"]]);
  const { toCreate } = planReferenceTokens(wanted, [], (actorId) => (actorId === "actorid-manako" ? "Manako" : undefined));
  assert.equal(toCreate[0].name, "Manako");
});

// A hidden Token is still part of the Scene document, and a Scene reaches
// every client. Its name and picture are as public as the stage's.

test("planReferenceTokens: a person whose name is held back is created under their called line with an anonymous picture", () => {
  const wanted = new Map([["p1", "actorid-kazue"]]);
  const publicFor = (key) => (key === "p1" ? { name: "the attendant", img: "icons/svg/mystery-man.svg" } : null);
  const { toCreate } = planReferenceTokens(wanted, [], () => "Kazue Tsurumi", publicFor);
  assert.equal(toCreate[0].name, "the attendant");
  assert.equal(toCreate[0].texture.src, "icons/svg/mystery-man.svg");
  assert.ok(!JSON.stringify(toCreate[0]).includes("Kazue"), "the real name leaked into the token data");
});

test("planReferenceTokens: the token flag carries whatever key it was given, so an anonymous alias never becomes the npc id", () => {
  const wanted = new Map([["p1a2b3c", "actorid-kazue"]]);
  const { toCreate } = planReferenceTokens(wanted, []);
  assert.equal(toCreate[0].flags["blank-inheritance"].npcRef, "p1a2b3c");
});

test("planReferenceTokens: an existing token still showing the real name is renamed and re-pictured once the name is held back", () => {
  const wanted = new Map([["p1", "actorid-kazue"]]);
  const existing = [{ id: "t1", actorId: "actorid-kazue", hidden: true, name: "Kazue Tsurumi", img: "modules/x/tokens/kazue.webp", npcRef: "p1" }];
  const publicFor = () => ({ name: "the attendant", img: "icons/svg/mystery-man.svg" });
  const { toUpdate } = planReferenceTokens(wanted, existing, () => "Kazue Tsurumi", publicFor);
  assert.deepEqual(toUpdate, [{ _id: "t1", name: "the attendant", "texture.src": "icons/svg/mystery-man.svg" }]);
});

test("planReferenceTokens: once nothing is held back the token is renamed to the real name", () => {
  const wanted = new Map([["p1", "actorid-kazue"]]);
  const existing = [{ id: "t1", actorId: "actorid-kazue", hidden: true, name: "the attendant", img: "icons/svg/mystery-man.svg", npcRef: "p1" }];
  const { toUpdate } = planReferenceTokens(wanted, existing, () => "Kazue Tsurumi", () => null);
  assert.deepEqual(toUpdate, [{ _id: "t1", name: "Kazue Tsurumi" }]);
});

test("planReferenceTokens: an already-anonymous token is left alone on a re-run", () => {
  const wanted = new Map([["p1", "actorid-kazue"]]);
  const existing = [{ id: "t1", actorId: "actorid-kazue", hidden: true, name: "the attendant", img: "icons/svg/mystery-man.svg", npcRef: "p1" }];
  const publicFor = () => ({ name: "the attendant", img: "icons/svg/mystery-man.svg" });
  const { toCreate, toUpdate, toDelete } = planReferenceTokens(wanted, existing, () => "Kazue Tsurumi", publicFor);
  assert.deepEqual([toCreate, toUpdate, toDelete], [[], [], []]);
});
