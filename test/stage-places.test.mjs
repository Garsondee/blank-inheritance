// The kept places come home (tools/stage-places/pull.mjs): filed from the server, folded into the overlay the bridge lays over
// the stages file, and read back by it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pull, FILE } from "../tools/stage-places/pull.mjs";

const filed = { kind: "bi-stage-places", version: 1, scenes: { "e1-kit-issue": { places: { nobu: [0.612, 0.645] }, yaws: { nobu: -15 }, keptAt: "T" } } };

test("pull files the server's record, folds it into the kept-places overlay, and is quiet the second time", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "stage-places-"));
  const harvest = path.join(dir, "harvest", FILE);
  const kept = path.join(dir, "kept-places.json");
  const read = async () => new Map([[FILE, JSON.stringify(filed)]]);
  const first = await pull({ read, harvest, kept });
  assert.equal(first.found, true);
  assert.equal(first.changed, true);
  assert.match(first.lines[0], /e1-kit-issue: nobu stands at/);
  assert.deepEqual(JSON.parse(readFileSync(kept, "utf8")).scenes["e1-kit-issue"].places.nobu, [0.612, 0.645]);
  assert.deepEqual(JSON.parse(readFileSync(harvest, "utf8")), filed, "the record itself is kept, tracked");
  const second = await pull({ read, harvest, kept });
  assert.equal(second.changed, false);
  assert.deepEqual(second.lines, []);
});

test("nothing on the server: nothing is written", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "stage-places-"));
  const kept = path.join(dir, "kept-places.json");
  const r = await pull({ read: async () => new Map(), harvest: path.join(dir, "h.json"), kept });
  assert.equal(r.found, false);
  assert.equal(existsSync(kept), false);
});