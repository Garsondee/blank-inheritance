/**
 * The rig's file and server halves, in temporary folders and on an ephemeral port, with no browser and no Foundry:
 * the local stand-in for the live server that lets the real deploy run against a folder (foundry/local-remote.mjs, build.mjs), the
 * run's memory (hub/store.mjs) and the hub's HTTP door with stub seats (hub/server.mjs, hub/orch.mjs, hub/verbs.mjs).
 *
 * The server tests are the ones that matter most: they hold the separation of minds at the door, where an agent's call arrives (a
 * seat cannot use another seat's token, a player cannot call a GM verb or the operator's door, a paused table pauses).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertSafeRelative, createLocalRemote } from "../../tools/playtest/foundry/local-remote.mjs";
import { localDeployConfig, syncChannel } from "../../tools/playtest/foundry/build.mjs";
import { FOUNDRY_ROOT, MODULE_DIR, STAGECRAFT_DIR } from "../../tools/playtest/paths.mjs";
import { RunStore } from "../../tools/playtest/hub/store.mjs";
import { Hub } from "../../tools/playtest/hub/ops.mjs";
import { createServer } from "../../tools/playtest/hub/server.mjs";
import { buildRoster } from "../../tools/playtest/core/roster.mjs";
import { formatFindings, formatStatus } from "../../tools/playtest/hub/format.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const personas = JSON.parse(readFileSync(path.join(here, "..", "..", "tools", "playtest", "personas", "personas.json"), "utf8"));
const tmp = () => mkdtempSync(path.join(os.tmpdir(), "pt-test-"));
const put = (dir, rel, text) => {
  const file = path.join(dir, ...rel.split("/"));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
};

test("the local stand-in for the server sends, hashes, lists, reads and deletes, and refuses a path that escapes", async () => {
  const src = tmp();
  const dest = tmp();
  put(src, "a.txt", "alpha");
  put(src, "deep/b.txt", "beta");
  const remote = createLocalRemote();
  assert.equal(await remote.remoteDirectoryExists({ remoteDir: dest }), true);
  assert.equal(await remote.remoteDirectoryExists({ remoteDir: path.join(dest, "nope") }), false);
  assert.equal((await remote.remoteChecksums({ remoteDir: path.join(dest, "nope") })).size, 0, "a missing folder is empty, not an error");
  await remote.uploadFiles({ remoteDir: dest, files: new Map([["a.txt", path.join(src, "a.txt")], ["deep/b.txt", path.join(src, "deep", "b.txt")]]) });
  const sums = await remote.remoteChecksums({ remoteDir: dest });
  assert.deepEqual([...sums.keys()].sort(), ["a.txt", "deep/b.txt"]);
  assert.equal(await remote.readRemoteText({ remotePath: path.join(dest, "a.txt") }), "alpha");
  assert.equal(await remote.readRemoteText({ remotePath: path.join(dest, "missing.txt") }), null);
  await remote.deleteRemoteFiles({ remoteDir: dest, paths: ["deep/b.txt"] });
  assert.equal(existsSync(path.join(dest, "deep")), false, "the folder that emptied is removed too");
  assert.equal(existsSync(path.join(dest, "a.txt")), true);
  for (const bad of ["../escape.txt", "/abs.txt", "C:/x.txt", "a\\b.txt", "a//b.txt", ""]) assert.throws(() => assertSafeRelative(bad), /unsafe/, JSON.stringify(bad));
  await assert.rejects(() => remote.uploadFiles({ remoteDir: dest, files: new Map([["../x", path.join(src, "a.txt")]]) }), /unsafe/);
  rmSync(src, { recursive: true, force: true });
  rmSync(dest, { recursive: true, force: true });
});

test("a channel is brought to match its source: new and changed files sent, extra files pruned, both sides verified", async () => {
  const src = tmp();
  const dest = tmp();
  put(src, "one.txt", "1");
  put(src, "sub/two.txt", "2");
  put(src, "node_modules/junk.txt", "never copied");
  put(dest, "stale.txt", "only in the copy");
  const quiet = { log: () => {} };
  const dry = await syncChannel({ name: "t", sourceDir: src, destDir: dest, dryRun: true, ...quiet });
  assert.equal(dry.sent, 2);
  assert.equal(existsSync(path.join(dest, "one.txt")), false, "a dry run sends nothing");
  const first = await syncChannel({ name: "t", sourceDir: src, destDir: dest, ...quiet });
  assert.deepEqual({ sent: first.sent, pruned: first.pruned, verified: first.verified }, { sent: 2, pruned: 1, verified: true });
  assert.equal(existsSync(path.join(dest, "stale.txt")), false);
  assert.equal(existsSync(path.join(dest, "node_modules")), false, "junk folders are skipped");
  put(src, "one.txt", "1 changed");
  const second = await syncChannel({ name: "t", sourceDir: src, destDir: dest, ...quiet });
  assert.deepEqual({ sent: second.sent, pruned: second.pruned, verified: second.verified }, { sent: 1, pruned: 0, verified: true });
  assert.equal(readFileSync(path.join(dest, "one.txt"), "utf8"), "1 changed");
  assert.equal((await syncChannel({ name: "t", sourceDir: src, destDir: dest, ...quiet })).sent, 0, "nothing to send the third time");
  const kept = await syncChannel({ name: "t", sourceDir: src, destDir: dest, prune: false, ...quiet });
  assert.equal(kept.verified, true);
  assert.equal((await syncChannel({ name: "t", sourceDir: path.join(src, "missing"), destDir: dest, ...quiet })).missing, true, "a source that is not there is skipped, loudly, not an error");
  rmSync(src, { recursive: true, force: true });
  rmSync(dest, { recursive: true, force: true });
});

test("the deploy is aimed at the playtest data root, never at the live server, and never records itself as a live push", () => {
  const config = localDeployConfig({ art: false });
  assert.ok(config.moduleRemoteDir.startsWith(FOUNDRY_ROOT) && config.moduleRemoteDir === MODULE_DIR);
  assert.ok(config.stagecraftRemoteDir === STAGECRAFT_DIR);
  assert.ok(config.videoRemoteDir.startsWith(FOUNDRY_ROOT));
  assert.equal(config.sceneEdits, false, "her live edits are not pulled for a local copy");
  assert.equal(config.art, false);
  assert.ok(!/home\/ubuntu/.test(JSON.stringify({ a: config.moduleRemoteDir, b: config.stagecraftRemoteDir, c: config.videoRemoteDir })), "no path on the live server");
});

test("a run's memory: findings are filed once per cause with counts, tied to the action before them, and survive a restart", () => {
  const dir = tmp();
  const store = new RunStore({ dir, run: "t", seed: "s" });
  store.recordAction({ seat: "P1", verb: "click", args: "r5", ok: true, ms: 10, text: "clicked" });
  const t = Date.now();
  store.event("P1", { type: "pageerror", message: "x is undefined at 123", t: t + 100 });
  store.event("P2", { type: "pageerror", message: "x is undefined at 999", t: t + 120 });
  store.event("P1", { type: "longtask", durationMs: 100, t });
  store.event("P1", { type: "console", level: "error", text: "The AudioContext was not allowed to start", t });
  assert.equal(store.findings.length, 1, "two pages reporting the same error file one finding");
  assert.equal(store.findings[0].occurrences, 2);
  assert.deepEqual(store.findings[0].seats, ["P1", "P2"]);
  assert.match(store.findings[0].summary, /100 ms after P1 click|ms after P1 click/);
  assert.equal(store.findings[0].channel, "instrument");
  assert.equal(store.findings[0].severity, "S1");
  const f = store.detectorFinding({ seat: "P3", name: "occlusion", severity: "S2", summary: "A control is covered", detail: {} });
  assert.ok(f);
  assert.equal(store.detectorFinding({ seat: "P3", name: "occlusion", severity: "S2", summary: "A control is covered", detail: {} }), null, "the same hit is not filed twice");
  store.detectorFinding({ seat: "P4", name: "x", severity: "S2", summary: "one", detail: {}, key: "shared" });
  assert.equal(store.detectorFinding({ seat: "P5", name: "x", severity: "S2", summary: "two", detail: {}, key: "shared" }), null, "a key makes one finding across seats");
  store.flushIfDirty();
  const again = new RunStore({ dir, run: "t", seed: "s" });
  assert.equal(again.findings.length, store.findings.length, "findings are on disk");
  assert.equal(again.findings[0].occurrences, 2, "and so is the count");
  const say = store.say({ seat: "P1", kind: "say", text: "hello" });
  assert.equal(say.entry.n, 1);
  assert.equal(new RunStore({ dir, run: "t" }).table.length, 1, "the table is on disk");
  rmSync(dir, { recursive: true, force: true });
});

// --- the door ---------------------------------------------------------------------------------------------------------------------

const fakeSeat = (id, role, calls) => ({
  id,
  user: `User ${id}`,
  role,
  state: "ready",
  spec: { seat: id, brain: "agent", persona: id === "GM" ? "gm" : "brute" },
  profile: { viewport: [1920, 1080], scale: 1 },
  lastLook: null,
  look: async () => ({ ok: true, text: `the screen of ${id}`, data: { character: id === "P1" ? "PT-Ada" : null } }),
  click: async (target) => (calls.push(`${id} click ${target}`), { ok: true, text: `clicked ${target}` }),
  evidenceShot: async () => null,
  save: (name) => path.join(os.tmpdir(), name),
  page: { evaluate: async () => null }
});

async function withHub(fn) {
  const dir = tmp();
  const hub = new Hub({ persistToken: false, log: () => {} });
  hub.runDir = dir;
  hub.store = new RunStore({ dir, run: "t", seed: "s" });
  hub.roster = buildRoster("bots", personas, { run: "t" });
  hub.tokens = { GM: "tg", P1: "t1", P2: "t2" };
  const calls = [];
  for (const [id, role] of [["GM", "gm"], ["P1", "player"], ["P2", "player"]]) hub.seats.set(id, fakeSeat(id, role, calls));
  const server = createServer(hub);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (route, body, headers = {}) => (await fetch(`${base}${route}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) })).json();
  const verb = (seat, token, name, positionals = [], flags = {}) => post(`/v/${name}`, { seat, token, positionals, flags });
  const orch = (op, body = {}) => post(`/o/${op}`, body, { "x-pt-orch": hub.orchToken });
  try {
    await fn({ hub, base, verb, orch, post, calls });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
}

test("at the door: a seat needs its own token, and a player cannot call a GM verb or the operator's door", async () => {
  await withHub(async ({ verb, post }) => {
    assert.equal((await verb("P1", "wrong", "look")).ok, false);
    assert.equal((await verb("P1", "t2", "look")).ok, false, "P2's token does not open P1's seat");
    assert.equal((await verb("P1", "t1", "look")).text, "the screen of P1");
    assert.match((await verb("P1", "t1", "improv", ["I made something up"])).text, /GM seat only/);
    assert.equal((await verb("GM", "tg", "improv", ["I made something up"], { why: "nothing written" })).ok, true);
    assert.match((await verb("P1", "t1", "eval", ["1+1"])).text, /no verb/);
    const door = await post("/o/status", {});
    assert.equal(door.ok, false);
    assert.match(door.text, /orchestrator token/);
  });
});

test("at the door: what the GM thinks to themselves, and a whisper between players, never reaches another player, whatever they read", async () => {
  await withHub(async ({ verb, orch }) => {
    await verb("GM", "tg", "improv", ["CANARY invented the clerk's name"], { why: "none written", beat: "the-queue" });
    await verb("P1", "t1", "say", ["psst, ignore the clerk"], { to: "P2" });
    await verb("P2", "t2", "say", ["Hello, everyone."]);
    for (const flags of [{}, { all: true }, { since: 0, limit: 500 }]) {
      const text = (await verb("P2", "t2", "read", [], flags)).text;
      assert.ok(!text.includes("CANARY"), "the GM's private note");
      assert.ok(text.includes("psst, ignore the clerk"), "a whisper TO P2 is P2's");
    }
    const other = (await verb("GM", "tg", "read", [], { all: true })).text;
    assert.ok(!other.includes("psst"), "the GM does not overhear a note between players");
    assert.ok(other.includes("CANARY"), "the GM reads their own private note");
    const tape = (await orch("table", { positionals: ["system", "Scene 2 begins."] })).text;
    assert.match(tape, /Entry/);
    assert.match((await verb("P1", "t1", "read")).text, /Scene 2 begins/);
  });
});

test("at the door: a paused table pauses every verb that acts, and lets a seat still read, note and remember", async () => {
  await withHub(async ({ verb, orch, calls }) => {
    assert.match((await orch("pause", { positionals: ["the operator needs a minute"] })).text, /Paused/);
    const blocked = await verb("P1", "t1", "click", ["r5"]);
    assert.equal(blocked.ok, false);
    assert.match(blocked.text, /PAUSED/);
    assert.equal(calls.length, 0, "nothing reached the browser");
    assert.equal((await verb("P1", "t1", "read")).ok, true);
    assert.equal((await verb("P1", "t1", "memory", [], { add: "remember the exit" })).ok, true);
    assert.match((await verb("P1", "t1", "who")).text, /PAUSED/);
    await orch("resume");
    assert.equal((await verb("P1", "t1", "click", ["r5"])).ok, true);
    assert.equal(calls.length, 1);
  });
});

test("at the door: a note files a finding with evidence and the right channel, and every verb is on the audit trail", async () => {
  await withHub(async ({ verb, orch, hub }) => {
    const refused = await verb("P1", "t1", "note", ["It broke"], { kind: "bug" });
    assert.equal(refused.ok, false, "a note needs a severity");
    const filed = await verb("P1", "t1", "note", ["The button does nothing"], { kind: "bug", severity: "S1", expected: "it opens", actual: "nothing", repro: ["open the page", "press it"] });
    assert.equal(filed.ok, true);
    assert.match(filed.text, /Filed F-0001 \(S1 bug\)/);
    const finding = hub.store.findings[0];
    assert.equal(finding.channel, "agent");
    assert.equal(finding.seat, "P1");
    assert.deepEqual(finding.repro, ["open the page", "press it"]);
    assert.ok(finding.evidence.length >= 1, "the trail is attached even when no screenshot could be taken");
    const listed = await orch("findings");
    assert.match(listed.text, /F-0001 S1 bug .*The button does nothing/);
    assert.ok(hub.store.actions.length >= 2 && hub.store.actions.every((a) => a.seat && a.verb && a.at), "every verb is recorded with who, what and when");
    const added = await orch("findings", { positionals: ["add", "The Runner covers the map"], flags: { kind: "ux-friction", severity: "S2", channel: "human", evidence: "control-room" } });
    assert.match(added.text, /Filed F-0002/);
    assert.equal(hub.store.findings[1].channel, "human");
    assert.match((await orch("findings", { positionals: ["lock", "F-0001", "a check in the click-through contract test"] })).text, /Lock set/);
    assert.equal(hub.store.findings[0].lock, "a check in the click-through contract test");
    const refusedFix = await orch("findings", { positionals: ["reclassify", "F-0001"], flags: { kind: "rig" } });
    assert.equal(refusedFix.ok, false, "a correction needs its reason");
    assert.match(refusedFix.text, /reason is required/);
    const fix = await orch("findings", { positionals: ["reclassify", "F-0001"], flags: { kind: "rig", severity: "S3", reason: "the detector cried wolf" } });
    assert.match(fix.text, /F-0001 is now rig S3 \(was bug S1\): the detector cried wolf/);
    assert.equal(hub.store.findings[0].kind, "rig");
    assert.equal(hub.store.findings[0].lock, "a check in the click-through contract test", "the rest of the finding is kept");
    assert.equal(hub.store.tally().rig, 1, "the board counts it apart from the game's");
    assert.match((await orch("status")).text, /\(\+1 rig\)/);
    assert.match(readFileSync(path.join(hub.runDir, "findings.jsonl"), "utf8"), /"reclassified":\[\{"at":/, "and the correction is on disk");
    assert.equal((await orch("findings", { positionals: ["reclassify", "F-0099"], flags: { kind: "rig", reason: "x" } })).ok, false);
  });
});

test("the monitors a poller runs file a leak once per line whichever seats show it, and a click-swallower, without anyone asking", async () => {
  await withHub(async ({ hub }) => {
    const secret = hub.loadAuthored().canaries[0];
    assert.ok(secret, "the real scenes have a Secret: line to be planted");
    for (const id of ["P1", "P2"]) {
      const seat = hub.seats.get(id);
      seat.probe = async (name) => (name === "leakUi" ? { ui: [{ canary: secret.slice(0, 80), where: "visible page text" }] } : {});
      seat.detect = async () => (id === "P1" ? { clickthrough: [{ element: "div#pt-plant-swallower", screenPoints: 4, covers: ["Sheet", "Spells"], rect: {}, note: "" }] } : {});
    }
    const gm = hub.seats.get("GM");
    gm.probe = async () => {
      throw new Error("a GM seat is never scanned for what a player must not see");
    };
    gm.detect = async () => ({});

    await hub.autoLeak();
    await hub.autoLeak();
    await hub.autoDetect();
    const leaks = hub.store.findings.filter((f) => f.kind === "leak");
    assert.equal(leaks.length, 1, "the same line on two seats, scanned twice, is one finding");
    assert.equal(leaks[0].severity, "S0");
    assert.deepEqual(leaks[0].seats, ["P1", "P2"]);
    assert.equal(leaks[0].occurrences, 4);
    assert.match(leaks[0].summary, /GM-only text is visible on a player's screen: "/);
    const box = hub.store.findings.filter((f) => /swallows clicks/.test(f.summary));
    assert.equal(box.length, 1);
    assert.match(box[0].summary, /div#pt-plant-swallower covers Sheet, Spells/);
    assert.equal(box[0].severity, "S1");

    const quiet = { ...hub, store: null };
    await Hub.prototype.autoLeak.call(quiet);
    await Hub.prototype.autoDetect.call(quiet);
  });
});

test("a seat whose page is navigating is skipped by the monitors rather than stopping them", async () => {
  await withHub(async ({ hub }) => {
    hub.seats.get("P1").probe = async () => {
      throw new Error("Execution context was destroyed");
    };
    hub.seats.get("P1").detect = async () => {
      throw new Error("Execution context was destroyed");
    };
    const secret = hub.loadAuthored().canaries[0];
    hub.seats.get("P2").probe = async () => ({ ui: [{ canary: secret.slice(0, 80), where: "visible page text" }] });
    hub.seats.get("P2").detect = async () => ({});
    hub.seats.get("GM").detect = async () => ({});
    await hub.autoLeak();
    await hub.autoDetect();
    assert.deepEqual(hub.store.findings.filter((f) => f.kind === "leak").map((f) => f.seats), [["P2"]], "the seat that could be read was read");
  });
});

test("the control room is served with the operator's token in it, and the status board reads as text", async () => {
  await withHub(async ({ base, hub, orch }) => {
    const page = await (await fetch(`${base}/`)).text();
    assert.ok(page.includes(hub.orchToken), "the page can reach the operator's door");
    assert.ok(!page.includes("__PT_ORCH_TOKEN__"));
    assert.match(page, /Playtest control room/);
    const status = await (await fetch(`${base}/api/status`)).json();
    assert.equal(status.seats.length, 3);
    assert.equal(status.run.name, "t");
    const board = (await orch("status")).text;
    assert.match(board, /RUN t/);
    assert.match(board, /GM\s+User GM/);
    assert.equal((await fetch(`${base}/shot/P1.jpg`)).status, 404, "no picture until one is taken");
    assert.equal((await fetch(`${base}/nowhere`)).status, 404);
    assert.match(formatFindings([]), /No findings/);
    assert.match(formatStatus({ run: null, foundry: { up: false } }), /No run in progress/);
  });
});

test("the live stream opens, says it is connected and sends the board", async () => {
  await withHub(async ({ base, hub }) => {
    const controller = new AbortController();
    const response = await fetch(`${base}/api/stream`, { signal: controller.signal });
    assert.equal(response.headers.get("content-type"), "text/event-stream");
    const reader = response.body.getReader();
    let text = "";
    const started = Date.now();
    while (!text.includes("event: status") && Date.now() - started < 4000) text += new TextDecoder().decode((await reader.read()).value);
    assert.match(text, /: connected/);
    assert.match(text, /event: status/);
    assert.equal(hub.watchers, 1, "a watching browser is counted: pictures are only taken while someone looks");
    controller.abort();
  });
});

test("what is skipped is skipped on both sides: a folder Foundry owns in the copy is never pruned or compared, and packs are copied only when missing", async () => {
  const { ensurePacks } = await import("../../tools/playtest/foundry/build.mjs");
  const src = tmp();
  const dest = tmp();
  const quiet = { log: () => {} };
  put(src, "system.json", "{}");
  put(src, "packs/actions/000001.ldb", "source pack data");
  put(src, "packs/feats/000001.ldb", "source feats");
  put(dest, "packs/actions/000001.ldb", "Foundry has rewritten this");
  put(dest, "packs/actions/LOG", "the running server's log");
  const notPacks = (p) => p === "packs" || p.startsWith("packs/");
  const r = await syncChannel({ name: "sys", sourceDir: src, destDir: dest, skip: notPacks, ...quiet });
  assert.equal(r.verified, true);
  assert.equal(readFileSync(path.join(dest, "packs", "actions", "000001.ldb"), "utf8"), "Foundry has rewritten this", "a pack that is there is left exactly as Foundry has it");
  assert.equal(existsSync(path.join(dest, "packs", "actions", "LOG")), true, "and nothing in it is pruned");
  const packs = await ensurePacks({ sourceDir: path.join(src, "packs"), destDir: path.join(dest, "packs"), ...quiet });
  assert.deepEqual({ sent: packs.sent, verified: packs.verified }, { sent: 1, verified: true }, "only the missing compendium is copied");
  assert.equal(readFileSync(path.join(dest, "packs", "feats", "000001.ldb"), "utf8"), "source feats");
  assert.equal(readFileSync(path.join(dest, "packs", "actions", "000001.ldb"), "utf8"), "Foundry has rewritten this");
  assert.equal((await ensurePacks({ sourceDir: path.join(src, "packs"), destDir: path.join(dest, "packs"), dryRun: true, ...quiet })).verified, true);
  rmSync(src, { recursive: true, force: true });
  rmSync(dest, { recursive: true, force: true });
});
