// Tier 2 -- `npm run journeys` (tools/location-sync/journeys.mjs): the terminal's answer to "can the party walk every episode?".

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { DEFAULT_REPO } from "../tools/location-sync/journey-world.mjs";

const cli = path.join(DEFAULT_REPO, "tools", "location-sync", "journeys.mjs");
const have = existsSync(path.join(DEFAULT_REPO, "data", "map", "travel-graph.json")) && existsSync(path.join(DEFAULT_REPO, "data", "map", "land-grid.json"));
const skip = !have && "the travel graph or the land grid is not here";
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", timeout: 120000 });

test("it prints a report for every episode and exits 0 when the party can walk them", { skip }, () => {
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /^# Journeys: /m);
  assert.match(result.stdout, /Verdict: /);
  assert.ok((result.stdout.match(/^# Journeys: /gm) ?? []).length >= 2, "an episode each");
});

test("one episode can be asked for, with its notes and every journey in order", { skip }, () => {
  const all = run("--legs");
  const id = /^# Journeys: (.+)$/m.exec(all.stdout)[1];
  assert.match(all.stdout, /## Every journey, in play order/);
  assert.match(all.stdout, /\[cut\]/);
  const notes = run("--notes");
  assert.match(notes.stdout, /## Notes \(\d+\)/);
  assert.ok(id.length > 0);
});

test("an episode that does not exist is refused with the ones that do, and exit code 2", { skip }, () => {
  const result = run("--episode", "no-such-episode");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /No episode "no-such-episode"\. The episodes are: episode-c1e1/);
});

test("--help says how to use it and runs nothing", () => {
  const result = run("--help");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /usage: node tools\/location-sync\/journeys\.mjs/);
});
