// The test runner (test/support/run-tests.mjs, `npm test`): which files it picks, and when the battle simulator's slow fights are in.
// The rule worth holding: the simulator is skipped by default and comes in the moment one of its own files has changed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { selectTests, parseArgs, findTests, BATTLE_SIM_TRIGGERS } from "./support/run-tests.mjs";

const TREE = {
  test: ["test/tier1-a.test.mjs", "test/stagecraft-b.test.mjs", "test/battle-simulator/x.test.mjs", "test/battle-simulator/deep/y.test.mjs", "test/character-builder/z.test.mjs"],
  "module/stagecraft/test": ["module/stagecraft/test/m.test.mjs"]
};
const find = (d) => TREE[d] ?? TREE.test.filter((f) => f.startsWith(`${d}/`));
const pick = (o) => selectTests({ find, exists: () => true, ...o });

test("by default the battle simulator is left out, and everything else (the module's own suite too) is in", () => {
  const r = pick({ changed: ["data/npcs/nobu.json", "module/stagecraft/scripts/api.mjs"] });
  assert.equal(r.simulator, "skipped");
  assert.deepEqual(r.files, ["test/tier1-a.test.mjs", "test/stagecraft-b.test.mjs", "test/character-builder/z.test.mjs", "module/stagecraft/test/m.test.mjs"]);
});

test("a change to the simulator's own code or its tests brings its tests in, and says why", () => {
  for (const changed of [["tools/battle-simulator/personnel-engine/decide.mjs"], ["test/battle-simulator/x.test.mjs"]]) {
    const r = pick({ changed });
    assert.equal(r.simulator, "included");
    assert.equal(r.files.length, 6);
    assert.match(r.why, new RegExp(changed[0].replace(/[.*+?^${}()|[\]\/]/g, "\$&")));
  }
  assert.ok(BATTLE_SIM_TRIGGERS.every((t) => t.endsWith("/")), "prefixes, so tools/battle-simulator-notes would not count");
});

test("--all runs everything, --fast never runs the simulator, --battle-sim runs only it", () => {
  const sim = ["tools/battle-simulator/a.mjs"];
  assert.equal(pick({ mode: "all" }).files.length, 6);
  assert.equal(pick({ mode: "fast", changed: sim }).simulator, "skipped");
  assert.equal(pick({ mode: "fast", changed: sim }).files.some((f) => f.includes("battle-simulator")), false);
  const only = pick({ mode: "battle-sim" });
  assert.equal(only.simulator, "only");
  assert.deepEqual(only.files, ["test/battle-simulator/x.test.mjs", "test/battle-simulator/deep/y.test.mjs"]);
});

test("files and directories named on the command line are the whole selection", () => {
  const r = pick({ paths: ["test/character-builder", "test/tier1-a.test.mjs", "test/tier1-a.test.mjs"] });
  assert.deepEqual(r.files, ["test/character-builder/z.test.mjs", "test/tier1-a.test.mjs"]);
});

test("arguments: flags for the runner, the rest for node --test, and paths with either slash", () => {
  assert.deepEqual(parseArgs(["--all", "--list"]), { mode: "all", list: true, paths: [], passthrough: [] });
  assert.deepEqual(parseArgs(["--test-name-pattern=nobu", "test\\character-builder\\", "--fast"]), { mode: "fast", list: false, paths: ["test/character-builder"], passthrough: ["--test-name-pattern=nobu"] });
});

test("the real tree is found: this very file, the simulator's, and the module's, sorted and relative", () => {
  const tests = findTests("test");
  assert.ok(tests.includes("test/tier1-run-tests.test.mjs"));
  assert.ok(tests.some((f) => f.startsWith("test/battle-simulator/")));
  assert.deepEqual(tests, [...tests].sort());
  assert.ok(findTests("module/stagecraft/test").length > 20);
  assert.ok(tests.every((f) => !f.includes("node_modules") && !f.includes("\\")));
});
