/**
 * Telemetry classification and the roster (tools/playtest/core/telemetry.mjs, roster.mjs, and the persona file they read).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NOISE, classify, noiseOf, normalizeMessage, stampEvents, summarizeEvents } from "../../tools/playtest/core/telemetry.mjs";
import { MIN_VIEWPORT, brainCounts, buildRoster, profileFor, validateRoster } from "../../tools/playtest/core/roster.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const personas = JSON.parse(readFileSync(path.join(here, "..", "..", "tools", "playtest", "personas", "personas.json"), "utf8"));

test("telemetry events mean what the process says they mean", () => {
  assert.deepEqual({ ...classify({ type: "pageerror", message: "x is not a function" }) }, { category: "page-error", severity: "S1", noise: null });
  assert.equal(classify({ type: "rejection", message: "boom" }).severity, "S1");
  assert.equal(classify({ type: "console", level: "error", text: "TypeError: nope" }).category, "console-error");
  assert.equal(classify({ type: "console", level: "warning", text: "Deprecation warning: foo" }).category, "deprecation");
  assert.equal(classify({ type: "console", level: "log", text: "hello" }).severity, null);
  assert.equal(classify({ type: "response", status: 404, url: "http://x/modules/a/b.png", resourceType: "image" }).category, "missing-asset");
  assert.equal(classify({ type: "response", status: 404, url: "http://x/api/thing", resourceType: "fetch" }).category, "network-error");
  assert.equal(classify({ type: "response", status: 503, url: "http://x/", resourceType: "document" }).severity, "S1");
  assert.equal(classify({ type: "response", status: 200, url: "http://x/" }).severity, null);
  assert.equal(classify({ type: "requestfailed", resourceType: "script", url: "http://x/a.js" }).severity, "S1");
  assert.equal(classify({ type: "notification", level: "error", text: "no" }).category, "notification-error");
  assert.equal(classify({ type: "notification", level: "info", text: "ok" }).severity, null);
  assert.equal(classify({ type: "socket", state: "closed" }).category, "socket-closed");
  assert.equal(classify({ type: "longtask", durationMs: 1500 }).severity, "S2");
  assert.equal(classify({ type: "longtask", durationMs: 300 }).severity, "S3");
  assert.equal(classify({ type: "longtask", durationMs: 100 }).severity, null);
  assert.equal(classify({ type: "dead-click" }).severity, "S2");
  assert.equal(classify({ type: "detector", name: "clickthrough", severity: "S1" }).category, "detector:clickthrough");
});

test("Chrome's console echo of a failed request is not a second finding, and a missing media file is never noise", () => {
  assert.equal(classify({ type: "console", level: "error", text: "Failed to load resource: the server responded with a status of 404 (Not Found)" }).severity, null);
  assert.equal(classify({ type: "response", status: 404, url: "http://x/audio/a.ogg", resourceType: "media" }).severity, "S2", "the playtest copy is a full deploy: a 404 is the deploy missing something");
  assert.ok(NOISE.every((n) => n.why && n.why.length > 20), "every noise entry carries its reason");
});

test("known noise is recognised, kept apart and never becomes a finding", () => {
  assert.equal(noiseOf("GET /favicon.ico 404"), "favicon");
  const c = classify({ type: "console", level: "error", text: "The AudioContext was not allowed to start. It must be resumed" });
  assert.equal(c.noise, "autoplay-policy");
  assert.equal(c.severity, null);
  const s = summarizeEvents([{ type: "console", level: "error", text: "The AudioContext was not allowed to start", seat: "P1" }, { type: "pageerror", message: "Boom 123", seat: "P1" }, { type: "pageerror", message: "Boom 456", seat: "P2" }]);
  assert.equal(s.noisy["autoplay-policy"], 1);
  assert.equal(s.bySeverity.S1, 2);
  assert.equal(s.top.length, 1, "the same complaint with different numbers counts as one");
  assert.deepEqual(s.top[0].seats, ["P1", "P2"]);
  assert.equal(normalizeMessage("failed at http://x/y?z=1 after 123 ms"), "failed at <url> after # ms");
});

test("an event is tied to the action it followed, within three seconds, on the same seat", () => {
  const actions = [{ id: "a1", t: 1000, seat: "P1", verb: "click" }, { id: "a2", t: 5000, seat: "P2", verb: "key" }];
  const events = [{ t: 1120, seat: "P1" }, { t: 4500, seat: "P1" }, { t: 5100, seat: "P1" }, { t: 5200, seat: "P2" }];
  const [a, b, c, d] = stampEvents(events, actions);
  assert.deepEqual(a.after, { action: "a1", verb: "click", ms: 120 });
  assert.equal(b.after, undefined, "3.5 seconds later is too late to blame");
  assert.equal(c.after, undefined, "P2's action is not P1's");
  assert.equal(d.after.action, "a2");
});

test("the persona file is whole: every persona has a seat, a user, a role, and the GM exists once", () => {
  const ids = Object.keys(personas).filter((k) => !k.startsWith("_"));
  assert.deepEqual(ids.sort(), ["brute", "caster", "chaos-agent", "gm", "lateral-thinker", "quiet-one", "rules-lawyer"]);
  const seats = ids.map((id) => personas[id].seat);
  assert.equal(new Set(seats).size, seats.length, "seats are unique");
  assert.equal(new Set(ids.map((id) => personas[id].user)).size, ids.length, "users are unique");
  assert.equal(ids.filter((id) => personas[id].role === "gm").length, 1);
  for (const id of ids) assert.ok(personas[id].behaviour && personas[id].mustExercise?.length, `${id} says how it behaves and what it must exercise`);
  // Ingram, 2026-10-06: keyboard-only play is out of scope (Foundry needs a mouse), so no seat is keyboard-only any more.
  assert.ok(ids.every((id) => !personas[id].profile?.keyboardOnly), "no seat is keyboard-only");
  assert.ok(personas["quiet-one"].profile.reducedMotion && personas["quiet-one"].profile.network, "the quiet one is the slow, reduced-motion player");
});

test("the persona users are the players the provisioning step makes", async () => {
  const { PLAYER_NAMES } = await import("../../tools/playtest/foundry/provision.mjs");
  const playerUsers = Object.entries(personas).filter(([k]) => !k.startsWith("_") && k !== "gm").map(([, p]) => p.user);
  assert.deepEqual(playerUsers.sort(), [...PLAYER_NAMES].sort());
});

test("a roster is valid for every kind, and says what it costs", () => {
  for (const kind of ["shakedown", "main", "full", "bots", "walk"]) {
    const roster = buildRoster(kind, personas, { run: `t-${kind}` });
    const checked = validateRoster(roster, { personas });
    assert.equal(checked.ok, true, `${kind}: ${checked.errors.join("; ")}`);
    assert.equal(roster.seats.length, 7);
  }
  assert.deepEqual(brainCounts(buildRoster("main", personas, { run: "m" })), { agent: 3, bot: 4, idle: 0, walker: 0 });
  assert.deepEqual(brainCounts(buildRoster("full", personas, { run: "f" })), { agent: 7, bot: 0, idle: 0, walker: 0 });
  assert.deepEqual(brainCounts(buildRoster("shakedown", personas, { run: "s" })), { agent: 3, bot: 4, idle: 0, walker: 0 });
  assert.deepEqual(brainCounts(buildRoster("walk", personas, { run: "w" })), { agent: 0, bot: 6, idle: 0, walker: 1 }, "the walk: a scripted GM and six player bots");
  assert.equal(buildRoster("walk", personas, { run: "w" }).seats.find((s) => s.role === "gm").brain, "walker");
  assert.equal(brainCounts(buildRoster("bots", personas, { run: "b" })).agent, 0);
  assert.throws(() => buildRoster("everyone", personas, { run: "x" }), /unknown roster kind/);
});

test("only the GM seat may be a walker", () => {
  const roster = buildRoster("walk", personas, { run: "w2" });
  roster.seats.find((s) => s.seat === "P1").brain = "walker";
  assert.match(validateRoster(roster, { personas }).errors.join(), /only the GM seat can be a walker/);
});

test("a bad roster is refused with every reason at once", () => {
  const roster = buildRoster("main", personas, { run: "bad" });
  roster.seats.push({ ...roster.seats[1] });
  roster.seats[2].user = roster.seats[3].user;
  roster.seats[4].brain = "robot";
  roster.seats[5].profile = { viewport: [800, 600] };
  roster.seats[6].persona = "nobody";
  const checked = validateRoster(roster, { personas });
  assert.equal(checked.ok, false);
  const all = checked.errors.join(" | ");
  assert.match(all, /duplicate seat/);
  assert.match(all, /a second login would bump/);
  assert.match(all, /brain must be/);
  assert.match(all, /unknown persona/);
  assert.ok(checked.warnings.some((w) => w.includes("below Foundry")));
  assert.equal(validateRoster({ run: "x", seats: [] }, { personas }).ok, false);
  assert.equal(validateRoster(null).ok, false);
  assert.deepEqual(MIN_VIEWPORT, [1024, 768]);
  assert.equal(profileFor({ viewport: [1366, 768] }, { scale: 1.25 }).scale, 1.25);
});

test("the GM seat is exactly one, and the Admin key's own window size is the GM's screen", () => {
  assert.deepEqual(personas.gm.profile.viewport, [2560, 1271]);
  const roster = buildRoster("main", personas, { run: "g" });
  assert.equal(roster.seats.filter((s) => s.role === "gm").length, 1);
  roster.seats.find((s) => s.role === "gm").role = "player";
  assert.match(validateRoster(roster, { personas }).errors.join(), /exactly one GM/);
  assert.ok(existsSync(path.join(here, "..", "..", "tools", "playtest", "personas", "personas.json")));
});

test("a scripted player reads a check before it rolls it: a delay that grows by seat, off only when asked", async () => {
  const { rollDelayMs } = await import("../../tools/playtest/bots/player.mjs");
  assert.equal(rollDelayMs("P1", {}), 34000);
  assert.equal(rollDelayMs("P6", {}), 54000, "seats are staggered so six bots do not roll in the same second");
  assert.equal(rollDelayMs("GM", {}), 30000, "a seat with no number gets the base");
  assert.equal(rollDelayMs("P3", { PT_BOT_ROLL_DELAY_MS: "0" }), 0, "0 means at once");
  assert.equal(rollDelayMs("P3", { PT_BOT_ROLL_DELAY_MS: "5000" }), 17000);
  assert.equal(rollDelayMs("P3", { PT_BOT_ROLL_DELAY_MS: "nonsense" }), 0, "an unreadable setting never makes a bot wait for ever");
});
