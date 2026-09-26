// Tier 1 — carrying an authored socialProfile into the intel vault.
//
// The gap this closes: `foundry/social-store.mjs` says the authored side "is
// generated from data/npcs/*.json by the sync pipeline", and that step did not
// exist. Nine NPCs carried real Facts no GM could ever see.
//
// The rule these tests exist to pin: a Fact's `revealed` flag is TABLE state.
// The repo owns the Facts; it must never own whether they are known.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authoredProfileFromNpc, authoredProfiles } from "../module/blank-inheritance/scripts/core/authored-profile.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const npc = (id) => JSON.parse(readFileSync(path.join(repoRoot, "data", "npcs", `${id}.json`), "utf8"));

test("an NPC with no socialProfile produces nothing to store", () => {
  assert.equal(authoredProfileFromNpc({ id: "x" }), null);
  assert.equal(authoredProfileFromNpc(null), null);
  assert.equal(authoredProfileFromNpc({ id: "x", socialProfile: { facts: [] } }), null);
});

test("REAL DATA: the Section Officer's authored card survives the trip intact", () => {
  const out = authoredProfileFromNpc(npc("section-officer"));
  assert.equal(out.attitude, "unfriendly");
  assert.equal(out.facts.length, 6);
  const correction = out.facts.find((f) => f.id === "cannot-let-a-correction-stand");
  assert.match(correction.text, /wrong statement stand/);
  assert.deepEqual(correction.revealTrigger, { skill: "perception", dc: 15 });
  assert.equal(correction.revealed, false, "a freshly synced Fact starts hidden");
});

test("every Fact arrives hidden, even one authored as revealed", () => {
  // The corpus test already forbids authoring `revealed: true`. If one slips
  // through, syncing it must not silently un-hide it at somebody's table.
  const out = authoredProfileFromNpc({
    id: "x",
    socialProfile: { attitude: "friendly", facts: [{ id: "a", text: "A fact long enough to be a lever.", revealed: true }] }
  });
  assert.equal(out.facts[0].revealed, false);
});

test("a re-sync preserves what the table has learned", () => {
  const source = npc("shop-boss");
  const firstPass = authoredProfileFromNpc(source);

  // The table learns one Fact and shifts her attitude.
  const afterPlay = {
    ...firstPass,
    attitude: "helpful",
    facts: firstPass.facts.map((f, i) => (i === 0 ? { ...f, revealed: true, revealedNote: "Asked her directly in the hangar." } : f))
  };

  const second = authoredProfileFromNpc(source, afterPlay);
  assert.equal(second.attitude, "helpful", "a re-sync must not reset an attitude the table moved");
  assert.equal(second.facts[0].revealed, true, "a re-sync must not re-hide a Fact the table learned");
  assert.equal(second.facts[0].revealedNote, "Asked her directly in the hangar.");
  assert.equal(second.facts[1].revealed, false, "and must not reveal one they did not");
});

test("edited authored text reaches the vault even on a Fact already revealed", () => {
  const before = authoredProfileFromNpc({
    id: "x",
    socialProfile: { attitude: "friendly", facts: [{ id: "a", text: "The original wording of this lever." }] }
  });
  const played = { ...before, facts: [{ ...before.facts[0], revealed: true }] };
  const after = authoredProfileFromNpc(
    { id: "x", socialProfile: { attitude: "friendly", facts: [{ id: "a", text: "Corrected wording of this lever." }] } },
    played
  );
  assert.equal(after.facts[0].text, "Corrected wording of this lever.", "the repo owns the text");
  assert.equal(after.facts[0].revealed, true, "the table owns whether it is known");
});

test("a malformed fact is dropped rather than stored half-built", () => {
  const out = authoredProfileFromNpc({
    id: "x",
    socialProfile: { attitude: "friendly", facts: [{ id: "a", text: "Good enough to be a lever." }, { text: "no id" }, { id: "c" }] }
  });
  assert.equal(out.facts.length, 1);
});

test("REAL DATA: every NPC with an authored card round-trips", () => {
  const ids = [
    "section-officer", "shop-boss", "shucks-mordant", "comms-officer",
    "deputy-director", "school-history-teacher", "range-safety-officer",
    "nobu", "transparency-advocate"
  ];
  const pairs = authoredProfiles(ids.map(npc));
  assert.equal(pairs.length, ids.length, "an authored card failed to produce a stored profile");
  for (const [id, profile] of pairs) {
    assert.ok(profile.facts.length >= 2, `${id}: fewer than two facts survived`);
    assert.ok(profile.attitude, `${id}: no attitude`);
    for (const f of profile.facts) {
      assert.ok(f.text.length >= 40, `${id}/${f.id}: text lost`);
      assert.ok(f.revealTrigger, `${id}/${f.id}: trigger lost`);
      assert.equal(f.revealed, false);
    }
  }
});
