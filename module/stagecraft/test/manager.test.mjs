// The takeover, tested the way the Location Editor taught us to: replay the sequence Foundry really calls
// (draw -> ready -> tear down, in that order, a failure in the middle, a tear down twice) against stand-ins for
// Foundry's canvas, and assert what the player would feel: Foundry's own canvas hidden while a stage is up, and
// handed back exactly as it was, every time, even when we fail. The live proof is tools/stagecraft/foundry-check.mjs.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// stand-ins for what Foundry provides, installed before the module's files are imported
class SceneManager {
  constructor(scene) { this._scene = scene; }
  get scene() { return this._scene; }
  async _onDraw() {}
  async _onTearDown() {}
}
const make = () => {
  const board = { style: { display: "block" } };
  const app = { view: board, stopped: 0, started: 0, stop() { this.stopped++; }, start() { this.started++; } };
  return { board, app };
};
let world;
beforeEach(() => {
  world = make();
  globalThis.foundry = { canvas: { SceneManager } };
  globalThis.CONFIG = { Canvas: { managedScenes: {} } };
  globalThis.canvas = { app: world.app };
  globalThis.game = {
    scenes: new Map([["stage", { id: "stage", name: "A stage", flags: { stagecraft: { stage: { painting: {} } } } }], ["plain", { id: "plain", name: "Plain", flags: {} }]]),
    i18n: { format: (k) => k, localize: (k) => k }
  };
  globalThis.ui = { notifications: { warn() {}, error() {}, info() {} } };
});

const { installManager, current } = await import("../scripts/foundry/manager.mjs");

function fakeHost({ startResult = true, startThrows = false } = {}) {
  const host = { started: 0, stopped: 0, async start() { this.started++; if (startThrows) throw new Error("no graphics card"); return startResult; }, async stop() { this.stopped++; } };
  return host;
}

test("Foundry is told to use our manager for a stage scene, and for no other", () => {
  installManager({}, { makeHost: () => fakeHost() });
  const Manager = CONFIG.Canvas.managedScenes.stage;
  assert.equal(typeof Manager, "function");
  assert.ok(Manager.prototype instanceof SceneManager);
  assert.equal(CONFIG.Canvas.managedScenes.plain, undefined);
  assert.equal(CONFIG.Canvas.managedScenes.unknown, undefined);
});

test("someone else's manager for a scene wins over ours", () => {
  class Theirs extends SceneManager {}
  CONFIG.Canvas.managedScenes.stage = Theirs;
  installManager({}, { makeHost: () => fakeHost() });
  assert.equal(CONFIG.Canvas.managedScenes.stage, Theirs);
});

test("a scene flagged after the module started is picked up with nothing to refresh", () => {
  installManager({}, { makeHost: () => fakeHost() });
  assert.equal(CONFIG.Canvas.managedScenes.plain, undefined);
  game.scenes.get("plain").flags = { stagecraft: { stage: { painting: {} } } };
  assert.equal(typeof CONFIG.Canvas.managedScenes.plain, "function");
});

test("drawing a stage scene hides and idles Foundry's canvas; tearing down gives it back exactly", async () => {
  const host = fakeHost();
  installManager({}, { makeHost: () => host });
  const manager = new CONFIG.Canvas.managedScenes.stage(game.scenes.get("stage"));
  await manager._onDraw();
  assert.equal(world.board.style.display, "none");
  assert.equal(world.app.stopped, 1);
  assert.equal(host.started, 1);
  assert.equal(current.host, host, "the api can reach the running stage");
  await manager._onTearDown();
  assert.equal(world.board.style.display, "block");
  assert.equal(world.app.started, 1);
  assert.equal(host.stopped, 1);
  assert.equal(current.host, null);
});

test("Foundry's canvas comes back to whatever display value it had", async () => {
  world.board.style.display = "";
  installManager({}, { makeHost: () => fakeHost() });
  const manager = new CONFIG.Canvas.managedScenes.stage(game.scenes.get("stage"));
  await manager._onDraw();
  await manager._onTearDown();
  assert.equal(world.board.style.display, "block", "an empty value is not left as 'none'");
});

test("if the stage cannot be drawn, Foundry's canvas is never left hidden", async () => {
  for (const host of [fakeHost({ startResult: false }), fakeHost({ startThrows: true })]) {
    world = make();
    globalThis.canvas = { app: world.app };
    installManager({}, { makeHost: () => host });
    const manager = new CONFIG.Canvas.managedScenes.stage(game.scenes.get("stage"));
    await manager._onDraw();
    assert.equal(world.board.style.display, "block", "the player still sees a scene");
    assert.equal(world.app.started, 1, "and it is running");
    assert.equal(current.host, null);
    assert.equal(host.stopped, 1, "and whatever was half built is taken down");
    await manager._onTearDown();
    assert.equal(world.app.started, 1, "nothing is given back twice");
    assert.equal(host.stopped, 1, "nor stopped twice");
    CONFIG.Canvas.managedScenes = {};
  }
});

test("tearing down twice, or without ever drawing, is harmless", async () => {
  installManager({}, { makeHost: () => fakeHost() });
  const manager = new CONFIG.Canvas.managedScenes.stage(game.scenes.get("stage"));
  await manager._onTearDown();
  assert.equal(world.app.started, 0, "nothing was taken, so nothing is given back");
  await manager._onDraw();
  await manager._onTearDown();
  await manager._onTearDown();
  assert.equal(world.app.started, 1);
  assert.equal(world.board.style.display, "block");
});

test("twenty scenes in a row: every one leaves Foundry's canvas as it found it", async () => {
  const hosts = [];
  installManager({}, { makeHost: () => { const h = fakeHost(); hosts.push(h); return h; } });
  for (let i = 0; i < 20; i++) {
    const manager = new CONFIG.Canvas.managedScenes.stage(game.scenes.get("stage"));
    await manager._onDraw();
    assert.equal(world.board.style.display, "none");
    await manager._onTearDown();
    assert.equal(world.board.style.display, "block");
  }
  assert.equal(world.app.stopped, 20);
  assert.equal(world.app.started, 20);
  assert.ok(hosts.every((h) => h.started === 1 && h.stopped === 1));
});

test("a stage that gives up while running hands Foundry's canvas back, once, and a later tear down does nothing more", async () => {
  let giveUp;
  const host = fakeHost();
  installManager({}, { makeHost: (options) => { giveUp = options.onFatal; return host; } });
  const manager = new CONFIG.Canvas.managedScenes.stage(game.scenes.get("stage"));
  await manager._onDraw();
  assert.equal(world.board.style.display, "none");
  assert.equal(current.host, host);
  await giveUp();
  assert.equal(world.board.style.display, "block", "the player sees a scene again");
  assert.equal(world.app.started, 1);
  assert.equal(host.stopped, 1);
  assert.equal(current.host, null);
  await giveUp();
  await manager._onTearDown();
  assert.equal(world.app.started, 1, "given back once only");
  assert.equal(host.stopped, 1, "stopped once only");
});
