// Tier 1 — the session-start line on objectives (tools/objectives/pull.mjs, design/objectives.md).
//
// What these protect: the line is built from the same export the GM's client files (core exportPayload), so a field the
// export drops cannot quietly vanish from the line; open objectives come first with their giver, progress and deadline,
// then the players' own (with who wrote them, and "only me" said out loud), the loose ends, and what closed last; and the
// pull writes the harvest only when something changed.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { applyAct, draftToState, exportPayload, fromAuthored } from "../module/blank-inheritance/scripts/core/objectives.mjs";
import { pull, summarise } from "../tools/objectives/pull.mjs";

const read = (id) => JSON.parse(fs.readFileSync(new URL(`../data/objectives/${id}.json`, import.meta.url), "utf8"));
const T = (h) => `2026-10-04T${String(h).padStart(2, "0")}:00:00.000Z`;

function world() {
  const docketDoc = read("c1e1-the-docket");
  let enrol = fromAuthored(read("c1e1-report-for-enrolment"), { nowIso: T(9) });
  enrol = applyAct(enrol, "close", { nowIso: T(12), record: "They reported, were examined, and drew their kit." }).state;
  let docket = fromAuthored(docketDoc, { nowIso: T(13) });
  docket = applyAct(docket, "tick", { partId: "second-period", nowIso: T(14) }).state;
  docket = applyAct(docket, "reveal", { partId: "tell-manako", authored: docketDoc, nowIso: T(15) }).state;
  const own = draftToState({ giverName: "Ren", why: "Trouble", required: ["Find out who Rand is"], visibility: "owner", by: "Friday" }, { userId: "u1", ownerName: "Ren", nowIso: T(20) });
  return { enrol, docket, own };
}

test("the line: open ones with giver, progress and deadline; the players' own; what closed last", () => {
  const { enrol, docket, own } = world();
  const s = summarise(exportPayload([enrol, docket, own], { users: [{ id: "u1", name: "Kim" }] }));
  assert.equal(s.open, 2);
  assert.equal(s.lines[0], "open: Collect the levelling bubble (Section Officer Vetch, 1/3, by 19:00)");
  assert.equal(s.lines[1], "players' own: Find out who Rand is (Ren's own, by Kim, 0/1, by FRIDAY, only me)");
  assert.match(s.lines[2], /^last closed: Report for enrolment \("They reported/);
});

test("loose ends: optional parts left open when an objective closed", () => {
  const { docket } = world();
  const closed = applyAct(docket, "close", { nowIso: T(19) }).state;
  const s = summarise(exportPayload([closed]));
  assert.ok(s.lines.includes("loose ends: Go back and tell Manako how it went (Collect the levelling bubble)"));
});

test("an empty or missing export says nothing is open", () => {
  assert.deepEqual(summarise({}), { open: 0, lines: [] });
});

test("the pull writes the harvest only when something changed", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bi-objectives-"));
  const harvest = path.join(dir, "objectives.json");
  const text = JSON.stringify(exportPayload(Object.values(world())));
  const readServer = async () => new Map([["objectives.json", text]]);
  const first = await pull({ read: readServer, harvest });
  assert.equal(first.found, true);
  assert.equal(first.changed, true);
  assert.ok(fs.existsSync(harvest));
  const second = await pull({ read: readServer, harvest });
  assert.equal(second.changed, false);
  const none = await pull({ read: async () => new Map(), harvest });
  assert.equal(none.found, false);
  fs.rmSync(dir, { recursive: true, force: true });
});
