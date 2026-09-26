// Tier 3 — Foundry's own NoteData.iconSize floor, against the local
// (gitignored) foundryvtt/ source tree.
//
// Found live 2026-09-23, mid-fix for the map-pin position/size bug: a push
// that authored PIN_ICON_SIZE = 24 landed on the real remote server, ran a
// real sync, and every Note came back reporting iconSize 32 anyway -- no
// error, nothing in any log, just a silently different number than the one
// this codebase wrote. The cause is common/documents/note.mjs's own field
// definition, `new fields.NumberField({..., min: 32, ...})` -- a hard
// server-side floor a NumberField enforces on clean(), not a default or a
// suggestion. core/generators/scene-set.mjs's own PIN_ICON_SIZE doc comment
// tells this story in full; this file is the regression guard so a future
// change to that constant (or a future Foundry version moving the floor)
// fails a fast local test instead of being rediscovered live, a second time,
// against a production world.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PIN_ICON_SIZE } from "../module/blank-inheritance/scripts/core/generators/scene-set.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const notePath = path.join(
  repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "common", "documents", "note.mjs"
);

test("Foundry's real NoteData.iconSize field floors at 32 -- the exact number our own sync silently came back with", (t) => {
  if (!existsSync(notePath)) {
    t.skip("foundryvtt/ not present locally (gitignored) — contract test needs it, skipping loudly rather than failing or silently passing.");
    return;
  }
  const src = readFileSync(notePath, "utf8");
  const match = src.match(/iconSize:\s*new fields\.NumberField\(\{[^}]*\bmin:\s*(\d+)/);
  assert.ok(match, "could not find NoteData's iconSize field definition in common/documents/note.mjs — has its shape changed?");
  assert.equal(
    Number(match[1]),
    32,
    "Foundry's own iconSize floor has moved — re-check whether PIN_ICON_SIZE (core/generators/scene-set.mjs) should move with it"
  );
});

test("PIN_ICON_SIZE never authors a value Foundry will silently override — the exact live bug this file exists to catch", (t) => {
  if (!existsSync(notePath)) {
    t.skip("foundryvtt/ not present locally (gitignored) — contract test needs it, skipping loudly rather than failing or silently passing.");
    return;
  }
  const src = readFileSync(notePath, "utf8");
  const match = src.match(/iconSize:\s*new fields\.NumberField\(\{[^}]*\bmin:\s*(\d+)/);
  const realFloor = Number(match[1]);
  assert.ok(
    PIN_ICON_SIZE >= realFloor,
    `PIN_ICON_SIZE is ${PIN_ICON_SIZE}, below Foundry's own real floor of ${realFloor} — every live Note will silently come back at ${realFloor} instead, exactly the 2026-09-23 bug`
  );
});
