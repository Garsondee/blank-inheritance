// Tier 1 — the Watcher's file (LEDGER #32, N10).
//
// The Watcher is the campaign's adversary and Claude plays it. Its file is the hard gate
// that keeps it fair: it may only exploit what it has actually observed, through channels
// that exist in the fiction. These tests pin the three rules the design depends on, plus
// the two guards that keep the surveillance secret off the Foundry server (the players are
// not told their messages are read, LEDGER #31 D14).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WATCHER_SOURCES,
  WATCHER_CATEGORIES,
  RECORDED_DEGREES,
  emptyWatcherFile,
  recordObservation,
  knows,
  believes,
  canExploit,
  summarise
} from "../module/blank-inheritance/scripts/core/watcher-file.mjs";
import { SYNCED_CAMPAIGN_DIRS } from "../tools/module-sync/stage-campaign-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const schema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "watcher-file.schema.json"), "utf8"));

test("an empty file names its subject and starts knowing nothing", () => {
  const f = emptyWatcherFile("kid-a");
  assert.equal(f.id, "watcher-file--kid-a");
  assert.equal(f.type, "watcher-file");
  assert.deepEqual(f.observations, []);
  assert.equal(canExploit(f, { category: "skill", key: "athletics" }), false);
  assert.throws(() => emptyWatcherFile(""), /needs the id/);
});

test("a successful Recall Knowledge is real knowledge, and opens the gate", () => {
  const f = recordObservation(emptyWatcherFile("kid-a"), {
    source: "recall-knowledge", degree: "success", category: "save", key: "will", value: "weak", observedIn: "c1e2-first-contact"
  });
  assert.equal(knows(f, { category: "save", key: "will" }), true);
  assert.equal(canExploit(f, { category: "save", key: "will" }), true);
  assert.equal(f.observations[0].degree, "success");
  assert.equal(f.observations[0].id, "obs-1");
});

test("a failed Recall Knowledge teaches it nothing, and nothing is recorded", () => {
  const start = emptyWatcherFile("kid-a");
  const f = recordObservation(start, { source: "recall-knowledge", degree: "failure", category: "skill", key: "stealth" });
  assert.equal(f, start, "a plain failure returns the file untouched");
  assert.equal(believes(f, { category: "skill", key: "stealth" }), null);
});

test("a critically failed check leaves a mistaken belief it will act on, but the gate stays shut", () => {
  const f = recordObservation(emptyWatcherFile("kid-a"), {
    source: "recall-knowledge", degree: "criticalFailure", category: "weakness", key: "afraid-of-water", value: true
  });
  assert.deepEqual(believes(f, { category: "weakness", key: "afraid-of-water" }), { value: true, mistaken: true, source: "recall-knowledge" });
  assert.equal(knows(f, { category: "weakness", key: "afraid-of-water" }), false);
  assert.equal(canExploit(f, { category: "weakness", key: "afraid-of-water" }), false, "a wrong belief must never count as knowledge");
  assert.equal(summarise(f).mistaken, 1);
});

test("the fiction only: out-of-character and unknown sources are refused", () => {
  const f = emptyWatcherFile("kid-a");
  assert.throws(() => recordObservation(f, { source: "in-character-message", category: "person", key: "a sister", outOfCharacter: true }), /only ever uses the fiction/);
  assert.throws(() => recordObservation(f, { source: "real-life", category: "person", key: "anything" }), /only ever uses the fiction/);
  assert.throws(() => recordObservation(f, { source: "phone", category: "not-a-category", key: "x" }), /Unknown observation category/);
  assert.throws(() => recordObservation(f, { source: "phone", category: "plan", key: "  " }), /needs a key/);
  assert.throws(() => recordObservation(f, { source: "combat-observation", category: "tactic", key: "x", degree: "success" }), /Only a recall-knowledge/);
  assert.throws(() => recordObservation(f, { source: "recall-knowledge", category: "skill", key: "x" }), /degree of success/);
});

test("in-fiction reading and watching count as knowledge, and the input file is never mutated", () => {
  const start = emptyWatcherFile("kid-b");
  const a = recordObservation(start, { source: "in-character-message", category: "person", key: "the-baker-on-canal-street", value: "a friend" });
  const b = recordObservation(a, { source: "combat-observation", category: "tactic", key: "covers-the-left-first" });
  assert.equal(start.observations.length, 0);
  assert.equal(a.observations.length, 1);
  assert.equal(b.observations.length, 2);
  assert.equal(canExploit(b, { category: "tactic", key: "covers-the-left-first" }), true);
  assert.deepEqual(summarise(b).byCategory.person, 1);
});

test("the schema and the code agree on every vocabulary", () => {
  const item = schema.properties.observations.items.properties;
  assert.deepEqual(item.source.enum, [...WATCHER_SOURCES]);
  assert.deepEqual(item.category.enum, [...WATCHER_CATEGORIES]);
  assert.deepEqual(item.degree.enum, [...RECORDED_DEGREES]);
  assert.equal(schema.properties.type.const, "watcher-file");
});

test("data/watcher is never synced to the Foundry server", () => {
  assert.ok(!SYNCED_CAMPAIGN_DIRS.includes("watcher"), "the Watcher's files must stay off the server, where a player's browser could fetch them");
});

// The players are not told their messages are read (LEDGER #31, D14). Everything under the
// synced data directories can be fetched by a curious player's browser, so none of it may say so.
test("nothing synced to the server tells the players that the Watcher reads what they write", () => {
  // Targeted on purpose: the Directorate reading trainee messages is a discoverable in-fiction plant and may appear;
  // what may not appear is who plays the Watcher, or that the Watcher reads the players' own writing.
  const giveaways = /Claude plays|played by Claude|plays the Watcher|the Watcher reads|reads what the players|not told (that )?(their|the) messages are read/i;
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".json") && giveaways.test(readFileSync(full, "utf8"))) offenders.push(path.relative(repoRoot, full));
    }
  };
  for (const d of SYNCED_CAMPAIGN_DIRS) {
    const full = path.join(repoRoot, "data", d);
    if (existsSync(full)) walk(full);
  }
  assert.deepEqual(offenders, [], "keep the surveillance secret in ideas/ (never synced), not in data/ that reaches the server");
});
