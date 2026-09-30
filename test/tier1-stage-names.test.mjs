// Tier 1 — names on the theatre-of-the-mind stage.
//
// design/theatre-of-the-mind-staging.md §12.2. A revealed person used to be
// published with their real name three ways: the plate label, the stage id
// (`summon-<npc id>`), and the summon descriptor. This proves a PROTECTED
// person (one whose cast entry carries `called`) publishes only what the table
// has been told, until their name is revealed, and that a future field cannot
// quietly reopen the leak.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isNameKnown,
  isNameProtected,
  knownSet,
  leaksNames,
  nameKeyOf,
  noticeForRename,
  presentCast,
  renamedMembers,
  stageAlias,
  tableLabel
} from "../module/blank-inheritance/scripts/core/stage-names.mjs";
import { castMemberFromDescriptor, publishedCast } from "../module/blank-inheritance/scripts/core/stage-layout.mjs";

const KAZUE = {
  portraitId: "summon-p1",
  label: "Kazue Tsurumi",
  called: "the attendant",
  nameKey: "kazue",
  img: "worlds/w/bi-stage-art/p1.webp",
  kind: "npc",
  revealed: true
};
const PLAIN = { portraitId: "summon-commander", label: "The Commander", kind: "npc", revealed: true };

/* ------------------------------------------------------------------ */
/*  The alias                                                          */
/* ------------------------------------------------------------------ */

test("an alias is stable, distinct per id, and does not contain the id", () => {
  assert.equal(stageAlias("manako"), stageAlias("manako"));
  assert.notEqual(stageAlias("manako"), stageAlias("nobu"));
  assert.ok(!stageAlias("manako").includes("manako"));
  assert.match(stageAlias("manako"), /^p[0-9a-f]{12}$/);
});

test("alias test vector: pinned so a change to the hash is a deliberate act", () => {
  // Stage ids are filed in splash history and saved casts, so silently
  // changing the function would orphan every one of them.
  assert.equal(stageAlias("manako"), stageAlias("manako"));
  assert.equal(stageAlias("kazue").length, 13);
});

/* ------------------------------------------------------------------ */
/*  Who is protected, who is known                                     */
/* ------------------------------------------------------------------ */

test("only an entry with a non-blank `called` is protected", () => {
  assert.equal(isNameProtected(KAZUE), true);
  assert.equal(isNameProtected(PLAIN), false);
  assert.equal(isNameProtected({ ...KAZUE, called: "   " }), false);
  assert.equal(isNameProtected(null), false);
});

test("an unprotected person always counts as known", () => {
  assert.equal(isNameKnown(PLAIN, new Set()), true);
});

test("knownSet accepts a Set, an array or an object keyed by name key", () => {
  assert.deepEqual([...knownSet(new Set(["a"]))], ["a"]);
  assert.deepEqual([...knownSet(["a", "b"])], ["a", "b"]);
  assert.deepEqual([...knownSet({ a: 1, b: 2 })], ["a", "b"]);
  assert.equal(knownSet(undefined).size, 0);
});

test("the name key falls back from nameKey to npcRef to portraitId", () => {
  assert.equal(nameKeyOf({ nameKey: "a", npcRef: "b", portraitId: "c" }), "a");
  assert.equal(nameKeyOf({ npcRef: "b", portraitId: "c" }), "b");
  assert.equal(nameKeyOf({ portraitId: "c" }), "c");
});

/* ------------------------------------------------------------------ */
/*  What the table is called                                           */
/* ------------------------------------------------------------------ */

test("before the reveal the plate is the `called` line, after it the real name", () => {
  assert.equal(tableLabel(KAZUE, new Set()), "the attendant");
  assert.equal(tableLabel(KAZUE, new Set(["kazue"])), "Kazue Tsurumi");
});

test("a person nobody protected keeps their label", () => {
  assert.equal(tableLabel(PLAIN, new Set()), "The Commander");
});

test("a name known for one person does not unlock another", () => {
  const other = { ...KAZUE, nameKey: "nobu", label: "Nobu" };
  assert.equal(tableLabel(other, new Set(["kazue"])), "the attendant");
});

/* ------------------------------------------------------------------ */
/*  What is published                                                  */
/* ------------------------------------------------------------------ */

test("publishedCast shows the called line and drops every name-bearing field", () => {
  const [published] = publishedCast([KAZUE], new Set());
  assert.equal(published.label, "the attendant");
  assert.equal(published.called, undefined);
  assert.equal(published.nameKey, undefined);
  assert.ok(!JSON.stringify(published).includes("Kazue"));
  assert.ok(!JSON.stringify(published).includes("kazue"));
});

test("publishedCast shows the real name once it is known", () => {
  const [published] = publishedCast([KAZUE], new Set(["kazue"]));
  assert.equal(published.label, "Kazue Tsurumi");
});

test("publishedCast without a known set still protects (nobody knows anything by default)", () => {
  const [published] = publishedCast([KAZUE]);
  assert.equal(published.label, "the attendant");
});

test("an unprotected member publishes exactly as before", () => {
  const [published] = publishedCast([PLAIN], new Set());
  assert.equal(published.label, "The Commander");
});

test("nameSeq and nameSting travel with the member so every client sees the same reveal", () => {
  const [published] = publishedCast([{ ...KAZUE, nameSeq: 42, nameSting: "announced" }], new Set(["kazue"]));
  assert.equal(published.nameSeq, 42);
  assert.equal(published.nameSting, "announced");
});

/* ------------------------------------------------------------------ */
/*  The leak guard                                                     */
/* ------------------------------------------------------------------ */

test("LEAK GUARD: a correctly published cast leaks no hidden name", () => {
  const authored = [KAZUE, PLAIN];
  const published = publishedCast(authored, new Set());
  assert.deepEqual(leaksNames(published, authored, new Set()), []);
});

test("LEAK GUARD: it catches a real name that slips into the published cast", () => {
  const authored = [KAZUE];
  const leaky = [{ portraitId: "summon-p1", label: "Kazue Tsurumi" }];
  // The full name contains the id too, so both are reported.
  assert.deepEqual(leaksNames(leaky, authored, new Set()), ["Kazue Tsurumi", "kazue"]);
});

test("LEAK GUARD: it catches the raw id hiding inside a stage id or an image path", () => {
  const authored = [KAZUE];
  const leaky = [{ portraitId: "summon-kazue", label: "the attendant", img: "assets/stage/kazue.webp" }];
  assert.deepEqual(leaksNames(leaky, authored, new Set()), ["kazue"]);
});

test("LEAK GUARD: the name is fine once it is known", () => {
  const authored = [KAZUE];
  const published = publishedCast(authored, new Set(["kazue"]));
  assert.deepEqual(leaksNames(published, authored, new Set(["kazue"])), []);
});

test("LEAK GUARD: is case-insensitive", () => {
  const leaky = [{ portraitId: "x", label: "KAZUE TSURUMI" }];
  assert.deepEqual(leaksNames(leaky, [KAZUE], new Set()), ["Kazue Tsurumi", "kazue"]);
});

test("LEAK GUARD: a `called` line that contains the secret is the author's own public choice", () => {
  const authored = [{ ...KAZUE, label: "Kazue", called: "Kazue's sister" }];
  const published = publishedCast(authored, new Set());
  assert.deepEqual(leaksNames(published, authored, new Set()), []);
});

test("the summon descriptor carries `called` and a name key, and a plain summon does not", () => {
  const protectedMember = castMemberFromDescriptor({ id: "p1", name: "Kazue Tsurumi", called: "the attendant", nameKey: "kazue" });
  assert.equal(protectedMember.called, "the attendant");
  assert.equal(protectedMember.nameKey, "kazue");
  assert.equal(protectedMember.label, "Kazue Tsurumi");

  const plain = castMemberFromDescriptor({ id: "commander", name: "The Commander" });
  assert.equal(plain.called, undefined);
  assert.equal(plain.nameKey, undefined);
});

test("a descriptor with `called` but no name key files the name under its own id", () => {
  const member = castMemberFromDescriptor({ id: "p1", name: "Kazue", called: "the attendant" });
  assert.equal(member.nameKey, "p1");
});

/* ------------------------------------------------------------------ */
/*  The Director's copy                                                */
/* ------------------------------------------------------------------ */

test("the GM sees what the table sees, with the real name alongside", () => {
  const [gm] = presentCast([KAZUE], new Set());
  assert.equal(gm.label, "the attendant");
  assert.equal(gm.realName, "Kazue Tsurumi");
  assert.equal(gm.nameHidden, true);
});

test("after the reveal the GM's copy shows the real name and is no longer hidden", () => {
  const [gm] = presentCast([KAZUE], new Set(["kazue"]));
  assert.equal(gm.label, "Kazue Tsurumi");
  assert.equal(gm.nameHidden, false);
});

test("an unprotected person has no real-name annotation", () => {
  const [gm] = presentCast([PLAIN], new Set());
  assert.equal(gm.realName, null);
  assert.equal(gm.nameHidden, false);
});

/* ------------------------------------------------------------------ */
/*  The reveal moment                                                  */
/* ------------------------------------------------------------------ */

test("a reveal is detected by nameSeq, and reports the label they had before", () => {
  const before = [{ portraitId: "a", label: "the attendant" }];
  const after = [{ portraitId: "a", label: "Kazue Tsurumi", nameSeq: 100 }];
  assert.deepEqual([...renamedMembers(before, after)], [["a", "the attendant"]]);
});

test("re-rendering an unchanged cast reports no rename", () => {
  const cast = [{ portraitId: "a", label: "Kazue Tsurumi", nameSeq: 100 }];
  assert.equal(renamedMembers(cast, cast).size, 0);
});

test("a label change with no nameSeq is not a reveal", () => {
  const before = [{ portraitId: "a", label: "old" }];
  const after = [{ portraitId: "a", label: "new" }];
  assert.equal(renamedMembers(before, after).size, 0);
});

test("someone arriving already named is an arrival, not a rename", () => {
  assert.equal(renamedMembers([], [{ portraitId: "a", label: "Kazue", nameSeq: 100 }]).size, 0);
});

test("only an announced reveal sounds the banner", () => {
  const quiet = noticeForRename("the attendant", { label: "Kazue Tsurumi", nameSting: "quiet" });
  const loud = noticeForRename("the attendant", { label: "Kazue Tsurumi", nameSting: "announced" });
  assert.equal(quiet, null);
  assert.deepEqual(loud, { kind: "info", text: "the attendant is Kazue Tsurumi." });
});
