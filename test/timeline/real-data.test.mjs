// The timeline's saves against the real canon, on a scratch copy of it (tools/timeline/serve.mjs makeSandbox): the page's
// two big moves must work on everything that is actually there, not only on small fixtures. (Found while building: all
// 103 open decisions answer cleanly and all 1,111 pencil items ink in six batches; these keep it so.)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { makeSandbox } from "../../tools/timeline/serve.mjs";
import { applyOps } from "../../tools/timeline/ops.mjs";
import { loadModel, checkModel, itemIndex } from "../../tools/story/lib.mjs";
import { answerOps } from "../../module/blank-inheritance/scripts/core/timeline-edits.mjs";
import { whenForCandidate } from "../../module/blank-inheritance/scripts/core/timeline-views.mjs";

const errorsOf = (root) => checkModel(loadModel(root)).filter((p) => p.level === "error");

test("REAL DATA: a scratch copy of canon starts with no errors, so any error a save reports is its own", () => {
  const root = makeSandbox();
  try { assert.deepEqual(errorsOf(root).map((p) => `${p.where}: ${p.message}`), []); } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("REAL DATA: every pencil item can be inked, in batches of 200 as the review page does, and canon still checks", () => {
  const root = makeSandbox();
  try {
    const pencil = [...itemIndex(loadModel(root)).values()].filter((e) => e.kind !== "idea" && e.item.status === "sketch").map((e) => ({ op: "ink", id: e.item.id, before: "sketch" }));
    assert.ok(pencil.length > 500, "there is real pencil to ink");
    for (let i = 0; i < pencil.length; i += 200) {
      const out = applyOps(root, pencil.slice(i, i + 200));
      assert.equal(out.ok, true, `batch ${i / 200 + 1}: ${out.error}`);
    }
    assert.deepEqual(errorsOf(root).map((p) => `${p.where}: ${p.message}`), []);
    const left = [...itemIndex(loadModel(root)).values()].filter((e) => e.kind !== "idea" && e.item.status === "sketch");
    assert.deepEqual(left.map((e) => e.item.id), [], "nothing is left in pencil but ideas, which are never inked");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("REAL DATA: open decisions can be answered, whatever their shape (candidates with dates, candidates, none)", () => {
  const root = makeSandbox();
  try {
    const all = [...itemIndex(loadModel(root)).values()].filter((e) => e.kind === "fact" && e.item.status === "open");
    const dated = all.filter((e) => String(e.item.meta?.when || "").includes("|"));
    const bare = all.filter((e) => !e.item.candidates?.length);
    const withCands = all.filter((e) => e.item.candidates?.length && !String(e.item.meta?.when || "").includes("|"));
    const sample = [...dated.slice(0, 2), ...bare.slice(0, 2), ...withCands.slice(0, 2)];
    assert.ok(dated.length >= 1 && bare.length >= 1 && withCands.length >= 1 && sample.length >= 4, "a varied sample: one of each shape at least");
    for (const e of sample) {
      const id = e.item.id;
      const entry = itemIndex(loadModel(root)).get(id);
      const cands = entry.item.candidates || [];
      const ops = answerOps(entry, { text: cands[0] || "Answered in the test.", when: cands.length ? whenForCandidate(entry.item.meta?.when, cands, 0) : "" });
      const out = applyOps(root, ops);
      assert.equal(out.ok, true, `${id}: ${out.error}`);
      assert.equal(itemIndex(loadModel(root)).get(id).item.status, "decided", id);
    }
    assert.deepEqual(errorsOf(root).map((p) => `${p.where}: ${p.message}`), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
