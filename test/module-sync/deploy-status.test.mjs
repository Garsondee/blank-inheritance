// Tests tools/module-sync/deploy-status.mjs -- the one line printed at every
// session start saying whether the live server is behind this working tree.
// Written 2026-09-27, after Scene 0 sat unpushed for three days with nothing
// to say so.

import { test } from "node:test";
import assert from "node:assert/strict";

import { compareToRecord, statusLine } from "../../tools/module-sync/deploy-status.mjs";

const RECORD = {
  id: "0123456789abcdef",
  deployedAt: "2026-09-27T15:00:00.000Z",
  module: { "scripts/a.mjs": "h1", "styles/a.css": "h2" },
  data: { "campaign/scene-set.json": "d1", "campaign/ground-roles.json": "d2" },
  video: { "opening-full.mp4": "100:1700000000000" }
};

function current(overrides = {}) {
  return {
    module: new Map([["scripts/a.mjs", "h1"], ["styles/a.css", "h2"]]),
    data: new Map([["campaign/scene-set.json", "d1"], ["campaign/ground-roles.json", "d2"]]),
    video: new Map([["opening-full.mp4", "100:1700000000000"]]),
    ...overrides
  };
}

test("compareToRecord: an identical tree has nothing to report", () => {
  assert.deepEqual(compareToRecord(RECORD, current()), { changed: [], added: [], removed: [] });
});

test("compareToRecord: changed, new and deleted files are each named with their channel", () => {
  const diff = compareToRecord(
    RECORD,
    current({
      module: new Map([["scripts/a.mjs", "h1-edited"], ["styles/a.css", "h2"], ["scripts/new.mjs", "h3"]]),
      data: new Map([["campaign/scene-set.json", "d1"]]),
      video: new Map([["opening-full.mp4", "200:1700000009999"]])
    })
  );
  assert.deepEqual(diff, {
    changed: ["module:scripts/a.mjs", "video:opening-full.mp4"],
    added: ["module:scripts/new.mjs"],
    removed: ["data:campaign/ground-roles.json"]
  });
});

test("compareToRecord: a channel the record never covered is skipped, not reported as all-new", () => {
  const diff = compareToRecord({ ...RECORD, video: null }, current({ video: new Map([["opening-full.mp4", "x"], ["b.mp4", "y"]]) }));
  assert.deepEqual(diff, { changed: [], added: [], removed: [] });
});

test("statusLine: no record yet says to deploy", () => {
  assert.match(statusLine(null, { changed: [], added: [], removed: [] }), /no deploy recorded.*npm run deploy/);
});

test("statusLine: up to date names the build and when it went up", () => {
  assert.equal(
    statusLine(RECORD, { changed: [], added: [], removed: [] }),
    "Foundry server: up to date with this working tree (build 0123456789abcdef, deployed 2026-09-27 15:00 UTC)."
  );
});

test("statusLine: behind says BEHIND, counts each kind, gives examples and the command", () => {
  const line = statusLine(RECORD, { changed: ["module:scripts/a.mjs"], added: ["data:scene-briefs/x.json", "data:scene-briefs/y.json"], removed: [] });
  assert.match(line, /^Foundry server is BEHIND this working tree: 1 changed, 2 new since the last deploy \(2026-09-27 15:00 UTC\)/);
  assert.match(line, /e\.g\. module:scripts\/a\.mjs, data:scene-briefs\/x\.json, data:scene-briefs\/y\.json/);
  assert.match(line, /npm run deploy/);
});
