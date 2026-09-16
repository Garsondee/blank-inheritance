// Tier 4 — mocked-adapter tests for foundry/induction-relay.mjs, the GM
// relay a real player's Page 9 confirm needs because Foundry's default
// ACTOR_CREATE permission excludes plain Players (live-verified against this
// project's own local test world 2026-09-16 -- see that file's own header).
// Against test/support/mock-foundry.mjs, same as every other tier4 file —
// this proves OUR request/response control flow (id correlation, ownership
// merging, the GM-only guard, success/failure/timeout resolution) is
// correct, not Foundry's own network layer. See design/testing-strategy.md §3.

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";

import { installMockFoundry } from "./support/mock-foundry.mjs";
import {
  registerInductionSocket,
  requestActorCreation,
  requestActorDeletion
} from "../module/blank-inheritance/scripts/foundry/induction-relay.mjs";

const SOCKET = "module.blank-inheritance";

/**
 * Polls until `predicate()` is true, instead of guessing a fixed number of
 * ticks or a fixed macrotask delay. Needed here (and nowhere else in this
 * file) because resolveActorDeleteRequest's chain now runs
 * removeActorTokenFromLandingScene BEFORE the actor delete, which calls
 * deriveFoundryId -- a REAL crypto.subtle.digest call, not a synchronous
 * microtask chain. Found live 2026-09-16: a single `setTimeout(fn, 0)` flush
 * (correct for a plain microtask chain) still flaked roughly 1 run in 3,
 * because a real digest can take longer than one macrotask tick under load.
 */
async function waitFor(predicate, { timeoutMs = 2000, intervalMs = 5 } = {}) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor: condition never became true");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test("requestActorCreation: a GM creates directly, with no socket traffic at all", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    let emitted = false;
    world.game.socket.emit = () => { emitted = true; };

    const actor = await requestActorCreation({ name: "Test Kid", type: "character" });

    assert.equal(actor.name, "Test Kid");
    assert.ok(world.actors.has(actor.id));
    assert.equal(emitted, false, "a GM's own request must never touch the socket");
  } finally {
    uninstall();
  }
});

test("requestActorCreation: a player's request travels over the socket and resolves once the matching Actor is created (GM side simulated directly)", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    world.game.user.isGM = false;

    let requestPayload = null;
    world.game.socket.on(SOCKET, (payload) => {
      if (payload?.type === "induction-actor-create-request") requestPayload = payload;
    });

    const pending = requestActorCreation({ name: "Sachiko", type: "character" });
    assert.ok(requestPayload, "expected a request to have been emitted synchronously");
    assert.equal(requestPayload.type, "induction-actor-create-request");
    assert.equal(requestPayload.userId, world.game.user.id);
    assert.ok(requestPayload.requestId, "expected a pre-generated request/actor id");
    assert.equal(requestPayload.actorData._id, requestPayload.requestId, "the actor data sent must already carry the same id, so the GM's keepId create lands on it");

    // Simulate the GM's OWN client creating the actor and Foundry's document
    // sync delivering it back to this client -- exactly what
    // registerInductionSocket's own resolveActorCreateRequest does, done by
    // hand here so this test isolates requestActorCreation's OWN waiting logic.
    await globalThis.Actor.create(
      { ...requestPayload.actorData, ownership: { default: 0, [requestPayload.userId]: 3 } },
      { keepId: true }
    );

    const actor = await pending;
    assert.equal(actor.id, requestPayload.requestId);
    assert.equal(actor.name, "Sachiko");
    assert.deepEqual(actor.ownership, { default: 0, [requestPayload.userId]: 3 });
  } finally {
    uninstall();
  }
});

test("requestActorCreation: ignores an unrelated Actor creation (a different request's id) and keeps waiting for its own", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    world.game.user.isGM = false;
    const pending = requestActorCreation({ name: "Mine", type: "character" }, { timeoutMs: 300 });

    await globalThis.Actor.create({ name: "Someone else's actor entirely" });

    await assert.rejects(pending, /No GM appears to be online/, "an unrelated createActor must not resolve this request");
  } finally {
    uninstall();
  }
});

test("requestActorCreation: rejects with the GM's own reported reason when the GM side explicitly reports failure", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    world.game.user.isGM = false;

    let requestId = null;
    world.game.socket.on(SOCKET, (payload) => {
      if (payload?.type === "induction-actor-create-request") requestId = payload.requestId;
    });

    const pending = requestActorCreation({ name: "Doomed", type: "character" }, { timeoutMs: 5000 });
    assert.ok(requestId);

    world.game.socket.emit(SOCKET, {
      type: "induction-actor-create-failed",
      requestId,
      reason: "system.details.level.value does not exist on sf2e's real \"character\" Actor template."
    });

    await assert.rejects(pending, /does not exist on sf2e's real/);
  } finally {
    uninstall();
  }
});

test("requestActorCreation: a failure message for a DIFFERENT request id is ignored", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    world.game.user.isGM = false;
    const pending = requestActorCreation({ name: "Mine", type: "character" }, { timeoutMs: 300 });

    world.game.socket.emit(SOCKET, { type: "induction-actor-create-failed", requestId: "not-mine-at-all", reason: "irrelevant" });

    await assert.rejects(pending, /No GM appears to be online/, "a failure for someone else's request must not settle this one");
  } finally {
    uninstall();
  }
});

test("requestActorCreation: times out with a clear, honest message when nothing answers at all", async () => {
  const { uninstall } = installMockFoundry({});
  try {
    globalThis.game.user.isGM = false;
    await assert.rejects(
      requestActorCreation({ name: "Nobody's Home", type: "character" }, { timeoutMs: 50 }),
      /No GM appears to be online to approve this/
    );
  } finally {
    uninstall();
  }
});

test("registerInductionSocket: the active GM's client creates the Actor with ownership granted to the requesting player, honoring the requested id", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    registerInductionSocket();
    world.game.socket.emit(SOCKET, {
      type: "induction-actor-create-request",
      requestId: "req-abc123",
      userId: "player-1",
      actorData: { _id: "req-abc123", name: "Ren", type: "character" }
    });
    // The handler is async (awaits Actor.create); let its microtask settle.
    await Promise.resolve();
    await Promise.resolve();

    const actor = world.actors.get("req-abc123");
    assert.ok(actor, "expected the Actor to have been created with the requested id");
    assert.equal(actor.name, "Ren");
    assert.deepEqual(actor.ownership, { default: 0, "player-1": 3 }, "the requesting player must be granted OWNER (3), everyone else NONE (0)");
  } finally {
    uninstall();
  }
});

test("registerInductionSocket: a non-active-GM client never acts on a request, even if game.user.isGM happens to be true", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    world.game.users.activeGM = { isSelf: false }; // some OTHER connected GM is authoritative, not this client
    registerInductionSocket();
    world.game.socket.emit(SOCKET, {
      type: "induction-actor-create-request",
      requestId: "req-1",
      userId: "player-1",
      actorData: { _id: "req-1", name: "Should not exist", type: "character" }
    });
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(world.actors.size, 0, "only the one active GM client may act on a relay request");
  } finally {
    uninstall();
  }
});

test("registerInductionSocket: no GM at all connected means the request is simply never actioned by anyone (the requester's own timeout is what surfaces this)", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    world.game.users.activeGM = null;
    registerInductionSocket();
    world.game.socket.emit(SOCKET, {
      type: "induction-actor-create-request",
      requestId: "req-1",
      userId: "player-1",
      actorData: { _id: "req-1", name: "Nobody home", type: "character" }
    });
    await Promise.resolve();

    assert.equal(world.actors.size, 0);
  } finally {
    uninstall();
  }
});

test("registerInductionSocket: reports a create failure back over the socket, tagged with the original requestId, rather than leaving the requester hanging", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    registerInductionSocket();
    // Force the one real failure mode this handler exists to report:
    // Actor.create itself throwing (a real validation error, a disconnect
    // mid-write, etc.) -- isolated here as a direct throw rather than routed
    // through the sf2e-template validator, since that validator's own
    // contract is test/tier3-contract.test.mjs's job to cover, not this file's.
    const realCreate = globalThis.Actor.create;
    globalThis.Actor.create = async () => { throw new Error("simulated Actor.create failure"); };

    let failure = null;
    world.game.socket.on(SOCKET, (payload) => {
      if (payload?.type === "induction-actor-create-failed") failure = payload;
    });

    world.game.socket.emit(SOCKET, {
      type: "induction-actor-create-request",
      requestId: "req-bad",
      userId: "player-1",
      actorData: { _id: "req-bad", name: "Bad Data", type: "character" }
    });
    await Promise.resolve();
    await Promise.resolve();

    globalThis.Actor.create = realCreate;

    assert.ok(failure, "expected an explicit failure message, not silence");
    assert.equal(failure.requestId, "req-bad");
    assert.match(failure.reason, /simulated Actor\.create failure/);
    assert.equal(world.actors.size, 0, "a failed create must not leave a half-built Actor behind");
  } finally {
    uninstall();
  }
});

test("requestActorDeletion: a GM deletes directly, no socket traffic", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    const actor = await globalThis.Actor.create({ name: "To Delete", type: "character" });
    let emitted = false;
    world.game.socket.emit = () => { emitted = true; };

    await requestActorDeletion(actor.id);

    assert.equal(world.actors.has(actor.id), false);
    assert.equal(emitted, false);
  } finally {
    uninstall();
  }
});

// Split in two on purpose rather than one round-trip test: a single mock
// process has exactly one game.user, so it cannot represent "the player's
// isGM" and "the GM's own isGM" as two independently-true/false flags at
// once the way two real, separate clients would. Each half below tests
// what it can actually represent faithfully: the player's own emit shape,
// and the GM handler's own effect once a request arrives.
test("requestActorDeletion: a player's request (not a GM) emits a relay payload instead of deleting directly", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    world.game.user.isGM = false;
    let payload = null;
    world.game.socket.emit = (event, p) => { payload = { event, ...p }; };

    await requestActorDeletion("some-actor-id");

    assert.deepEqual(payload, { event: SOCKET, type: "induction-actor-delete-request", actorId: "some-actor-id" });
  } finally {
    uninstall();
  }
});

test("registerInductionSocket: relays a delete request to the active GM's client, which performs the actual delete (Actor delete needs Assistant/GM even for the Actor's own OWNER, per CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER's own doc comment)", async () => {
  const { world, uninstall } = installMockFoundry({});
  try {
    const actor = await globalThis.Actor.create({ name: "Abandoned Mid-Creation", type: "character" });
    registerInductionSocket();

    world.game.socket.emit(SOCKET, { type: "induction-actor-delete-request", actorId: actor.id });
    await waitFor(() => !world.actors.has(actor.id));

    assert.equal(world.actors.has(actor.id), false, "the GM-relayed delete must actually remove the orphaned Actor");
  } finally {
    uninstall();
  }
});

test("requestActorDeletion: never throws even if the relay/target is bad -- best-effort cleanup must never mask the real error that triggered it", async () => {
  const { uninstall } = installMockFoundry({});
  try {
    globalThis.game.user.isGM = true;
    await assert.doesNotReject(() => requestActorDeletion("no-such-actor-id"));
  } finally {
    uninstall();
  }
});
