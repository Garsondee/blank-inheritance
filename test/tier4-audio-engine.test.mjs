// Tier 4 — the mix engine (foundry/audio-engine.mjs) against a mock Web Audio
// graph. Proves the SHAPE of the chain and what gets written into it, which is
// the part that cannot be seen by reading the code and is invisible in a
// screenshot: a sting that routes through the duck node would duck itself, and
// nobody would ever notice except as "the stings sound odd".

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";

import { installAudioMock } from "./support/mock-audio-foundry.mjs";

async function freshEngine() {
  return import(`../module/blank-inheritance/scripts/foundry/audio-engine.mjs?t=${Math.random()}`);
}

/** Follow `from`'s outputs until a node of `kind` is found; returns the path taken. */
function pathTo(from, predicate, seen = new Set()) {
  if (seen.has(from)) return null;
  seen.add(from);
  for (const next of from.outputs ?? []) {
    if (predicate(next)) return [next];
    const rest = pathTo(next, predicate, seen);
    if (rest) return [next, ...rest];
  }
  return null;
}

test("the chain is spliced into every context: master -> duck -> bus -> limiter -> speakers", async () => {
  const mock = installAudioMock();
  try {
    const engine = await freshEngine();
    engine.registerAudioSettings();
    await engine.installAudioEngine();
    assert.equal(engine.isEngineInstalled(), true);

    for (const name of ["music", "environment", "interface"]) {
      const ctx = mock.contexts[name];
      assert.ok(!ctx.gainNode.outputs.includes(ctx.destination), `${name}: Foundry's direct master->speakers wire must be replaced, not left alongside ours`);
      const route = pathTo(ctx.gainNode, (n) => n === ctx.destination);
      assert.ok(route, `${name}: nothing reaches the speakers`);
      assert.ok(route.length >= 3, `${name}: expected duck, bus and limiter between master and speakers, got ${route.length} nodes`);
      assert.ok(route.some((n) => n.kind === "compressor"), `${name}: no limiter in the chain`);
    }
  } finally {
    mock.restore();
  }
});

test("moving a fader writes the matching gain, and muting is exactly silent", async () => {
  const mock = installAudioMock();
  try {
    const engine = await freshEngine();
    engine.registerAudioSettings();
    await engine.installAudioEngine();

    await engine.setMix({ music: -6, ambience: 0, stings: -3 });
    engine.applyMix(engine.currentMix());
    const diag = engine.engineDiagnostics();
    assert.ok(Math.abs(diag.busGains.music.bed - 0.5012) < 0.001, `music bus at ${diag.busGains.music.bed}`);
    assert.equal(diag.busGains.environment.bed, 1);
    assert.ok(Math.abs(diag.busGains.music.sting - 0.7079) < 0.001, "the stings fader rides the sting path, not the bed path");

    await engine.setMix({ music: -6, ambience: 0, stings: -3, muted: { music: true } });
    engine.applyMix(engine.currentMix());
    assert.equal(engine.engineDiagnostics().busGains.music.bed, 0, "a muted bus is silent, not merely quiet");
  } finally {
    mock.restore();
  }
});

test("a sting bypasses the duck node — otherwise it ducks itself", async () => {
  const mock = installAudioMock();
  try {
    const engine = await freshEngine();
    engine.registerAudioSettings();
    await engine.installAudioEngine();

    await engine.playOneShot({ src: "blank-inheritance-audio/sting/horn.ogg", kind: "sting", levelDb: 0 });
    assert.equal(mock.played.length, 1);
    const destination = mock.played[0].destination;
    assert.ok(destination, "the sting was left on Foundry's default routing instead of ours");

    const ctx = mock.contexts.music;
    const duck = ctx.gainNode.outputs[0];
    const reachesSpeakers = pathTo(destination, (n) => n === ctx.destination);
    assert.ok(reachesSpeakers, "a sting that reaches nothing is a sting nobody hears");
    assert.ok(!reachesSpeakers.includes(duck), "the sting's path runs through the duck node, so it would duck itself");
  } finally {
    mock.restore();
  }
});

test("a diegetic effect plays on the environment channel, a musical hit on music, a console blip on interface", async () => {
  const mock = installAudioMock();
  try {
    const engine = await freshEngine();
    engine.registerAudioSettings();
    await engine.installAudioEngine();
    for (const [kind, context] of [["sfx", "environment"], ["sting", "music"], ["interface", "interface"], ["voice", "environment"]]) {
      mock.played.length = 0;
      await engine.playOneShot({ src: `x/${kind}.ogg`, kind });
      assert.equal(mock.played[0].destination.context.name, context, `${kind} should play in the ${context} context`);
    }
  } finally {
    mock.restore();
  }
});

test("ducking dips the beds and schedules their return; overlapping stings extend rather than bounce", async () => {
  const mock = installAudioMock();
  try {
    const engine = await freshEngine();
    engine.registerAudioSettings();
    await engine.installAudioEngine();

    engine.duckBeds({ depthDb: -8, holdMs: 1000 });
    const duck = mock.contexts.music.gainNode.outputs[0];
    const ramps = duck.gain.events.filter((e) => e.type === "ramp");
    assert.equal(ramps.length, 4, "down, hold, hold, back up");
    assert.ok(Math.abs(ramps[1].value - 0.3981) < 0.001, "-8 dB");
    assert.equal(ramps[3].value, 1, "and all the way back");
    assert.equal(engine.engineDiagnostics().ducks, 1);

    engine.duckBeds({ depthDb: -12, holdMs: 3000 });
    const after = duck.gain.events.filter((e) => e.type === "ramp").slice(-4);
    assert.ok(Math.abs(after[1].value - 0.2512) < 0.001, "the deeper of the two overlapping ducks wins");
    assert.equal(engine.engineDiagnostics().ducks, 2);

    // Ambience is ducked too; the interface channel deliberately is not — a
    // console blip should not dip because a sting fired.
    assert.ok(mock.contexts.environment.gainNode.outputs[0].gain.events.length > 0);
    assert.equal(mock.contexts.interface.gainNode.outputs[0].gain.events.length, 0);
  } finally {
    mock.restore();
  }
});

test("meters add back exactly the monitoring gain, so the desk reads the programme", async () => {
  // In the real graph the tap sits AFTER this client's own volume, so a GM
  // listening 12 dB down would watch their meters sit 12 dB low while the
  // table heard a full mix (seen live, 2026-09-17). The engine compensates by
  // the monitoring gain, and the two cancel.
  //
  // This mock injects samples straight into the analyser and does NOT simulate
  // signal flow, so what is checked here is the compensation arithmetic — that
  // it is applied, in the right direction, by the right amount. The
  // cancellation itself was verified against real audio in the running app.
  const mock = installAudioMock();
  try {
    const engine = await freshEngine();
    engine.registerAudioSettings();
    await engine.installAudioEngine();

    const sine = new Float32Array(2048);
    for (let i = 0; i < sine.length; i++) sine[i] = Math.sin((2 * Math.PI * i) / 64);
    const ctx = mock.contexts.music;
    const bus = ctx.gainNode.outputs[0].outputs[0];
    bus.outputs.find((n) => n.kind === "analyser").samples = sine;

    ctx.gainNode.gain.value = 1;
    const unity = engine.readMeters().music.rmsDb;
    assert.ok(Math.abs(unity - -3.01) < 0.1, `a full-scale sine reads about -3 dB RMS; read ${unity}`);

    ctx.gainNode.gain.value = 0.25; // this client turns its own volume down 12 dB
    const compensated = engine.readMeters().music.rmsDb;
    assert.ok(Math.abs(compensated - unity - 12.04) < 0.1, `expected +12.04 dB of compensation, got ${compensated - unity}`);

    ctx.gainNode.gain.value = 0; // muted: no compensation is possible, and none is invented
    assert.ok(Number.isFinite(engine.readMeters().music.rmsDb));
  } finally {
    mock.restore();
  }
});

test("the client kill switch leaves Foundry's own routing completely alone", async () => {
  const mock = installAudioMock({ settings: { "blank-inheritance.audioEngine": false } });
  try {
    const engine = await freshEngine();
    engine.registerAudioSettings();
    // registerAudioSettings would overwrite the stored default; force it off.
    await globalThis.game.settings.set("blank-inheritance", "audioEngine", false);
    await engine.installAudioEngine();
    assert.equal(engine.isEngineInstalled(), false);
    for (const name of ["music", "environment", "interface"]) {
      const ctx = mock.contexts[name];
      assert.deepEqual(ctx.gainNode.outputs, [ctx.destination], `${name}: the chain was spliced in anyway`);
    }
  } finally {
    mock.restore();
  }
});

test("a broadcast one-shot plays on this client too — the GM is at the table as well", async () => {
  const mock = installAudioMock();
  try {
    const engine = await freshEngine();
    engine.registerAudioSettings();
    await engine.installAudioEngine();
    engine.registerAudioSocket();
    engine.broadcastAudio({ type: "audio.oneshot", src: "x/horn.ogg", kind: "sting", levelDb: 0 });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(mock.emitted.length, 1, "the other clients were told");
    assert.equal(mock.emitted[0].channel, "module.blank-inheritance");
    assert.equal(mock.played.length, 1, "and this one played it locally, since Foundry's socket never echoes to the sender");
  } finally {
    mock.restore();
  }
});
