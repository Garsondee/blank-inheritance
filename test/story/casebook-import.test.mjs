// The Casebook's outline in canon (D071, design/plot-timeline.md §7): every item of the hand-written outline has a
// home in canon or a written reason, nothing it brought in is ink, and the import record lists exactly what it added.
//
// The outline itself was retired to quarantine/casebook/content/ when the Casebook became generated from canon
// (D080). The proof still reads it there: it is the evidence that nothing the outline held was lost.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { coverage, importChanges, coverageLines, casebookKeys, CONTENT_URL } from "../../tools/story/import/casebook-coverage.mjs";
import { loadModel, itemIndex } from "../../tools/story/lib.mjs";
import { resolveAlias } from "../../tools/story/merges.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("the proof reads the retired outline in quarantine, and the live Casebook no longer has one", () => {
  const where = fileURLToPath(CONTENT_URL);
  assert.ok(fs.existsSync(where), "quarantine/casebook/content/content.mjs is there to be read");
  assert.equal(path.relative(ROOT, where).split(path.sep).join("/"), "quarantine/casebook/content/content.mjs");
  assert.ok(!fs.existsSync(path.join(ROOT, "tools/casebook/content")), "tools/casebook/content is retired: the Casebook is generated from canon");
});

test("REAL DATA: the quarantined outline still has every item the import counted", async () => {
  const keys = await casebookKeys();
  assert.ok(keys.length > 700, `the outline has ${keys.length} items`);
  assert.equal(new Set(keys).size, keys.length, "every key is unique");
});

test("REAL DATA: every Casebook item has a home in canon, or a reason in D071 why not", async () => {
  const { keys, missing, unknownFroms } = await coverage();
  assert.ok(keys.length > 700, `the Casebook has ${keys.length} items`);
  assert.deepEqual(missing, [], "uncovered Casebook items: give each a from: on the item that holds it, or a Coverage line in D071");
  assert.deepEqual(unknownFroms, [], "from: keys that aren't Casebook items");
});

test("REAL DATA: D071 lists every item it brought in, and nothing else (run casebook-coverage --write-changes)", async () => {
  const model = loadModel();
  const d071 = model.decisions.find((d) => d.id === "D071");
  assert.equal(d071.kind, "import");
  // A merge (D081 on) can fold several of D071's items into one, so D071 still names the old ids: each resolves to the
  // item that holds its words now, and an undone merge brings the old id back without D071 changing.
  const listed = [...new Set(d071.changes.map((c) => `- ${c.verb} \`${resolveAlias(model.aliases, c.target)}\``))].sort();
  assert.deepEqual(listed, [...(await importChanges())].sort());
});

test("REAL DATA: nothing the import brought in is ink", () => {
  const model = loadModel();
  for (const [id, hit] of itemIndex(model)) {
    if (!(hit.item.source || []).includes("D071")) continue;
    assert.ok(["sketch", "open"].includes(hit.item.status) || (hit.kind === "chapter" && hit.item.status === "sketch"), `${id} is ${hit.item.status}`);
    if (hit.item.status === "sketch") assert.equal(hit.item.by, "claude", `${id}: the Casebook is Claude's wording`);
  }
});

test("REAL DATA: every Coverage line in D071 gives a reason", () => {
  const lines = coverageLines();
  assert.ok(lines.length > 0);
  for (const l of lines) assert.match(l.reason, /^(already canon|history|design|not story)\b/, `${l.key}: "${l.reason}"`);
});
