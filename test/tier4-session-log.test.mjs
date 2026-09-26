// Tier 4 — mocked-adapter tests for foundry/session-log.mjs.
//
// Regression coverage for a real data-loss bug found live 2026-09-17 against
// the local test world "BI Console Test": buffer/loadedFile are page-lifetime
// state, so a GM who reloads (or whose tab closes) while a persist() is still
// in flight loses that entry with zero indication -- confirmed by typing two
// log lines, seeing both render in the deck, then finding neither in
// storage/sessions/<date>.json after a reload. See session-log.mjs's own
// header for the fix (hasPendingWrite + a beforeunload guard) and its
// directoryEnsured comment for the connected ensureDirectory-per-entry fix.
//
// Against test/support/mock-foundry.mjs, same as every other tier4 file --
// this proves OUR write-tracking and directory-caching logic, not Foundry's
// own network layer or a real browser's unload behavior. See
// design/testing-strategy.md §3.

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installMockFoundry } from "./support/mock-foundry.mjs";
import {
  currentEntries,
  hasPendingWrite,
  loadSessionLog,
  recordLogEntry,
  resetSessionLog
} from "../module/blank-inheritance/scripts/foundry/session-log.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const moduleManifest = JSON.parse(readFileSync(path.join(moduleRoot, "module.json"), "utf8"));

function fakeEvent() {
  return {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    returnValue: undefined
  };
}

/**
 * mock-foundry.mjs's fetch and uploadPersistent are deliberately separate
 * fixture stores (see that file's own fetch implementation) -- a real
 * Foundry server serves back whatever was actually uploaded, but this mock
 * doesn't wire the two together. Bridging by hand here, once, makes a real
 * end-to-end "persist, then reload" round trip possible through the SAME
 * loadSessionLog production code path a real reload runs.
 */
function publishUploadedSessionLog(world, moduleFiles, filename) {
  const raw = world.uploadedFiles.get(`modules/blank-inheritance/storage/sessions/${filename}`);
  moduleFiles[`storage/sessions/${filename}`] = raw ? JSON.parse(raw) : undefined;
}

test("hasPendingWrite is true only while recordLogEntry is still working, and the beforeunload guard warns exactly then (regression: found live 2026-09-17, a reload mid-persist silently lost the entry)", async () => {
  const { world, uninstall } = installMockFoundry({ moduleManifest });
  try {
    resetSessionLog();
    assert.equal(hasPendingWrite(), false, "nothing has been submitted yet");

    const pending = recordLogEntry({ text: "afternoon of day 5.", nowIso: "2026-09-17T20:00:00.000Z" });

    // Exactly the window the bug lived in: the entry has been accepted but
    // has not yet reached disk.
    assert.equal(hasPendingWrite(), true, "a write is in flight");
    const duringWrite = fakeEvent();
    world.window.fire("beforeunload", duringWrite);
    assert.equal(duringWrite.defaultPrevented, true, "must warn/block navigation while a write is still in flight");

    await pending;

    assert.equal(hasPendingWrite(), false, "the write has settled");
    const afterWrite = fakeEvent();
    world.window.fire("beforeunload", afterWrite);
    assert.equal(afterWrite.defaultPrevented, false, "must not warn once every write has landed");
  } finally {
    uninstall();
  }
});

test("an entry survives a simulated reload once its persist has actually completed", async () => {
  const moduleFiles = {};
  const { world, uninstall } = installMockFoundry({ moduleManifest, moduleFiles });
  try {
    resetSessionLog();
    await recordLogEntry({ text: "afternoon of day 5.", nowIso: "2026-09-17T20:00:00.000Z" });
    publishUploadedSessionLog(world, moduleFiles, "2026-09-17.json");

    // Simulate a real page reload: module-level state (buffer, loadedFile,
    // the pending-write counter) is exactly what a fresh page load resets,
    // and loadSessionLog re-fetches from scratch -- the same call the ready
    // hook makes.
    resetSessionLog();
    const reloaded = await loadSessionLog("2026-09-17T20:05:00.000Z");

    assert.equal(reloaded.length, 1);
    assert.equal(reloaded[0].text, "afternoon of day 5.");
  } finally {
    uninstall();
  }
});

test("persist only walks/creates the storage directory once per page-load, not on every entry (io.mjs's own documented contract for repeat writers)", async () => {
  const { uninstall } = installMockFoundry({ moduleManifest });
  try {
    resetSessionLog();
    let createDirectoryCalls = 0;
    const real = globalThis.foundry.applications.apps.FilePicker.implementation.createDirectory;
    globalThis.foundry.applications.apps.FilePicker.implementation.createDirectory = async (...args) => {
      createDirectoryCalls += 1;
      return real(...args);
    };
    try {
      await recordLogEntry({ text: "first entry", nowIso: "2026-09-17T20:00:00.000Z" });
      const afterFirst = createDirectoryCalls;
      assert.ok(afterFirst > 0, "expected the first entry to walk-create the storage path");

      await recordLogEntry({ text: "second entry", nowIso: "2026-09-17T20:05:00.000Z" });
      assert.equal(createDirectoryCalls, afterFirst, "a second entry in the same page-load must not re-walk the directory path");
    } finally {
      globalThis.foundry.applications.apps.FilePicker.implementation.createDirectory = real;
    }

    assert.deepEqual(
      currentEntries().map((e) => e.text),
      ["first entry", "second entry"]
    );
  } finally {
    uninstall();
  }
});

// `review` replaces the `reactionScores` key of 2026-09-19, whose 0-10 rating
// grid was cut with the Close Scene rebuild of 2026-09-22 (see
// core/scene-close.mjs's header). The structured payload a flagged closure
// carries is now the scene's own authored prompts as an AGENDA for a later
// in-depth review -- questions to ask afterwards, not numbers tapped while
// flustered mid-session.
test("recordLogEntry: review (the Close Scene flag) rides as a sibling key when given, and is omitted entirely otherwise", async () => {
  const { uninstall } = installMockFoundry({ moduleManifest });
  try {
    resetSessionLog();

    const plain = await recordLogEntry({ text: "an ordinary line", nowIso: "2026-09-19T20:00:00.000Z" });
    assert.equal("review" in plain, false, "an entry with no review flag must not gain the key at all");

    const review = { verdict: "note", agenda: [{ id: "banter", text: "The storekeeper's banter" }] };
    const flagged = await recordLogEntry({
      text: "Scene closed -- flagged for review. Ended: Resolved.",
      nowIso: "2026-09-19T20:05:00.000Z",
      review
    });
    assert.deepEqual(flagged.review, review);
    // context keeps its own tested shape untouched -- review is a sibling of
    // context, not folded into it.
    assert.deepEqual(flagged.context, { scene: null, mode: null, subject: null, author: null });

    assert.deepEqual(currentEntries().map((e) => e.review ?? null), [null, review]);
  } finally {
    uninstall();
  }
});

test("a persist failure keeps the entry buffered, warns the GM, and does not cache the directory as ensured (so the next entry retries from scratch)", async () => {
  const { world, uninstall } = installMockFoundry({ moduleManifest });
  try {
    resetSessionLog();
    const realUpload = globalThis.foundry.applications.apps.FilePicker.implementation.uploadPersistent;
    globalThis.foundry.applications.apps.FilePicker.implementation.uploadPersistent = async () => false;

    await recordLogEntry({ text: "will fail to save", nowIso: "2026-09-17T20:00:00.000Z" });

    assert.equal(hasPendingWrite(), false, "the counter must clear even when persist() fails");
    assert.equal(world.notifications.some((n) => n.level === "warn"), true, "a failed save must surface a warning, not fail silently");
    assert.deepEqual(currentEntries().map((e) => e.text), ["will fail to save"], "the entry must stay buffered for the next retry");

    globalThis.foundry.applications.apps.FilePicker.implementation.uploadPersistent = realUpload;

    await recordLogEntry({ text: "second entry, should heal both", nowIso: "2026-09-17T20:05:00.000Z" });

    const raw = world.uploadedFiles.get("modules/blank-inheritance/storage/sessions/2026-09-17.json");
    const onDisk = JSON.parse(raw);
    assert.deepEqual(
      onDisk.entries.map((e) => e.text),
      ["will fail to save", "second entry, should heal both"],
      "the next successful persist must re-write the WHOLE buffer, healing the earlier failure"
    );
  } finally {
    uninstall();
  }
});
