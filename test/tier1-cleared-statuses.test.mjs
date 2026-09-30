// Tier 1 — one definition of "cleared for the table" (core/promote.mjs's
// CLEARED_STATUSES), and every reader of it agreeing. Milliseconds, no Foundry.
//
// The bug this guards (2026-09-26): the Sign-Off added a rung, `live`, and
// only some of the places that ask "is this cleared?" learned it. The cue gate
// and the episode journal kept checking the Desk's grades alone, so The Road
// In, sealed live, asked "still drafted?" every time the GM cued it and had
// its journal page withheld, while the opening titles' confirm window had the
// right list written out by hand. This walks every status the authoring schema
// allows through every reader, so the next new rung is classified here once
// and cannot reach one reader while another misses it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CLEARED_STATUSES,
  GUARDED_STATUSES,
  PROMOTABLE_STATUSES,
  SEALABLE_STATUSES
} from "../module/blank-inheritance/scripts/core/promote.mjs";
import { cueGateDecision } from "../module/blank-inheritance/scripts/core/director-panel.mjs";
import { unclearedStatus } from "../module/blank-inheritance/scripts/core/episode-start.mjs";
import { episodeToJournalSource } from "../module/blank-inheritance/scripts/core/generators/journal.mjs";
import { cutItem } from "../module/blank-inheritance/scripts/core/bounce.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const authoringSchema = JSON.parse(
  readFileSync(path.resolve(here, "..", "data", "schema", "common", "authoring.schema.json"), "utf8")
);
const SCHEMA_STATUSES = authoringSchema.$defs.authoring.properties.status.enum;

// Written out rather than derived from CLEARED_STATUSES: a derived expectation
// agrees with whatever the list says, including a wrong list.
const CLEARED = new Set(["sound", "final", "live"]);
const NOT_CLEARED = new Set(["needs-lore", "drafted", "cut"]);

test("every status the authoring schema allows is classified here as cleared or not, so a new rung is decided once", () => {
  for (const status of SCHEMA_STATUSES) {
    assert.ok(
      CLEARED.has(status) || NOT_CLEARED.has(status),
      `authoring.status "${status}" is new: decide whether it clears content for the table, put it in CLEARED or ` +
      `NOT_CLEARED here, and add it to CLEARED_STATUSES in core/promote.mjs if it clears`
    );
  }
  const unknown = [...CLEARED, ...NOT_CLEARED].filter((status) => !SCHEMA_STATUSES.includes(status));
  assert.deepEqual(unknown, [], "classifies a status the schema no longer allows");
});

test("CLEARED_STATUSES is the Desk's grades plus the Sign-Off's seal, and the same list the writer guard protects", () => {
  assert.deepEqual(new Set(CLEARED_STATUSES), CLEARED);
  assert.deepEqual([...CLEARED_STATUSES], [...PROMOTABLE_STATUSES, ...SEALABLE_STATUSES]);
  assert.ok(Object.isFrozen(CLEARED_STATUSES));
  assert.strictEqual(
    GUARDED_STATUSES,
    CLEARED_STATUSES,
    "a status only promote()/seal() may write is guarded because it clears content: one list, not two that can drift"
  );
});

test("every reader gives the same answer for every status: the cue gate, the opening titles' confirm window, the episode journal and cutItem", () => {
  for (const status of SCHEMA_STATUSES) {
    const cleared = CLEARED.has(status);

    // The Director's panel and the Scene Runner (both cue through checkCueGate).
    assert.deepEqual(cueGateDecision({ status }), { allowed: cleared, status, gated: !cleared }, `cue gate, "${status}"`);

    // The confirm window before the opening titles names only an uncleared status.
    assert.equal(unclearedStatus({ status }), cleared ? null : status, `opening titles' confirm window, "${status}"`);

    // The episode journal withholds a scene's prose until it is cleared. The
    // episode itself is held cleared, so only the scene's own status varies.
    const journal = episodeToJournalSource({
      id: "ep",
      title: "Ep",
      authoring: { status: "sound" },
      scenes: [{ order: 1, id: "scene", title: "Scene", description: "The scene's own prose.", authoring: { status } }]
    });
    const scenePage = journal.pages.find((page) => page.id === "scene");
    assert.equal(/The scene's own prose/.test(scenePage.content), cleared, `journal shows the scene's prose, "${status}"`);
    assert.equal(/still drafted and has not yet been reviewed/.test(scenePage.content), !cleared, `journal placeholder, "${status}"`);

    // The Desk's cut is a demotion on anything already cleared.
    const cut = () => cutItem({ id: "x", authoring: { status } }, { gradedBy: "Ingram" });
    if (cleared) assert.throws(cut, /demoting reviewed content/, `cutItem refuses, "${status}"`);
    else assert.doesNotThrow(cut, `cutItem allows, "${status}"`);
  }
});
