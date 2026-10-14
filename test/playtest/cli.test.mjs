/**
 * The `pt` command line as an agent and the operator meet it (tools/playtest/pt.mjs, client.mjs, commands/*): what it says when there is no
 * hub, when a seat names nobody, when a verb is not a verb, and the local commands that need no hub at all. Run as real child processes,
 * with the hub port pointed at nothing, so a hub that happens to be running on this machine can never answer for the test.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pt = (...args) => {
  const r = spawnSync(process.execPath, [path.join(root, "tools", "playtest", "pt.mjs"), ...args], { encoding: "utf8", env: { ...process.env, PT_HUB_PORT: "39999", PT_AS: "" }, timeout: 60000 });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};

test("with no hub running a seat is told so in words, and the exit code says it failed", () => {
  const r = pt("--as", "P1:abcd", "look");
  assert.equal(r.code, 1);
  assert.match(r.out, /playtest hub is not answering/);
});

test("a verb needs a seat, an unknown word is refused, and a seat cannot reach the operator's verbs", () => {
  let r = pt("look");
  assert.equal(r.code, 2);
  assert.match(r.out, /needs `--as <seat>:<token>`/);
  r = pt("flibbertigibbet");
  assert.equal(r.code, 2);
  assert.match(r.out, /Unknown command/);
  r = pt("--as", "P1:abcd", "findings");
  assert.equal(r.code, 2);
  assert.match(r.out, /not one of your verbs/);
  r = pt("--as=P1:abcd", "dice", "arm");
  assert.equal(r.code, 2, "the equals form names a seat too, and dice is not a seat's verb");
});

test("help lists the seat verbs and the operator's commands", () => {
  const r = pt("help");
  assert.equal(r.code, 0);
  for (const word of ["look", "click", "say", "note", "improv", "build", "world", "preflight", "dice"]) assert.ok(r.out.includes(word), word);
});

test("the rosters can be previewed without a hub, with what each costs", () => {
  const main = pt("run", "roster", "main");
  assert.equal(main.code, 0);
  assert.match(main.out, /3 agent seat\(s\), 4 bot seat\(s\)/);
  assert.match(pt("run", "roster", "walk").out, /0 agent seat\(s\), 6 bot seat\(s\), 0 idle, a scripted GM \(the walker\)/);
  const parsed = JSON.parse(main.out.slice(main.out.indexOf("{"), main.out.lastIndexOf("}") + 1));
  assert.equal(parsed.seats.length, 7);
  assert.match(pt("run", "roster", "full").out, /7 agent seat\(s\), 0 bot seat\(s\)/);
  assert.equal(pt("run", "roster", "everyone").code, 1);
});

test("the seeded defects can be listed, and the hub check says plainly when there is no hub", () => {
  const seeds = pt("seed", "list");
  assert.equal(seeds.code, 0);
  assert.match(seeds.out, /plant-swallower/);
  const hub = pt("hub");
  assert.equal(hub.code, 1);
  assert.match(hub.out, /NOT answering/);
});
