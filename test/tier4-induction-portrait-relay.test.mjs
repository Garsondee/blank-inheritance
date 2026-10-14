// Tier 4 — mocked-adapter tests for the portrait half of foundry/induction-relay.mjs: a plain Player cannot upload
// (the world permission FILES_UPLOAD), so the GM's client saves the cropped portrait for them over the module socket.
// Against test/support/mock-foundry.mjs, like the Actor half beside it (tier4-induction-relay.test.mjs): this proves
// OUR request and answer control flow (who writes directly, who relays, id correlation, the GM-only guard, success,
// refusal and timeout), not Foundry's own network layer. The reason for all of it is in the relay's file header.
//
// Found by the playtest rig, 2026-10-06 (design/playtest-process.md §12.5).

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";

import { installMockFoundry } from "./support/mock-foundry.mjs";
import { registerInductionSocket, requestPortraitUpload } from "../module/blank-inheritance/scripts/foundry/induction-relay.mjs";
import { PORTRAIT_UPLOAD_REQUEST, PORTRAIT_UPLOAD_RESULT, NO_GM_FOR_PORTRAIT, bytesToBase64 } from "../module/blank-inheritance/scripts/core/induction-portrait-relay.mjs";

const SOCKET = "module.blank-inheritance";
const FILENAME = "portrait-Qw3rTy5uIo7pAsDf.webp";

const webpBytes = (size = 200) => {
  const bytes = new Uint8Array(size);
  bytes.set([...Buffer.from("RIFF"), size - 8, 0, 0, 0, ...Buffer.from("WEBPVP8 ")]);
  return bytes;
};
const picture = () => new Blob([webpBytes()], { type: "image/webp" });

function setup() {
  const mock = installMockFoundry({ moduleManifest: { id: "blank-inheritance", persistentStorage: true } });
  mock.world.directories.add("modules/blank-inheritance/storage/");
  return mock;
}

async function waitFor(predicate, { timeoutMs = 2000, intervalMs = 5 } = {}) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor: condition never became true");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test("a GM saves the portrait directly, with no socket traffic at all", async () => {
  const { world, uninstall } = setup();
  try {
    let emitted = false;
    world.game.socket.emit = () => { emitted = true; };
    const saved = await requestPortraitUpload({ filename: FILENAME, blob: picture(), mimeType: "image/webp" });
    assert.match(saved, new RegExp(FILENAME));
    assert.equal(world.uploadedFiles.size, 1, "the picture was written");
    assert.equal(emitted, false, "a GM's own upload must never touch the socket");
  } finally {
    uninstall();
  }
});

test("a player the world has granted FILES_UPLOAD saves it directly too, and needs no GM online", async () => {
  const { world, uninstall } = setup();
  try {
    world.game.user.isGM = false;
    world.game.user.can = (action) => action === "FILES_UPLOAD";
    let emitted = false;
    world.game.socket.emit = () => { emitted = true; };
    await requestPortraitUpload({ filename: FILENAME, blob: picture(), mimeType: "image/webp" });
    assert.equal(world.uploadedFiles.size, 1);
    assert.equal(emitted, false);
  } finally {
    uninstall();
  }
});

test("a plain player sends the picture to the GM's client and resolves with the path the GM answers with", async () => {
  const { world, uninstall } = setup();
  try {
    world.game.user.isGM = false;
    world.game.user.id = "player-1";
    let sent = null;
    world.game.socket.on(SOCKET, (payload) => {
      if (payload?.type === PORTRAIT_UPLOAD_REQUEST) sent = payload;
    });

    const pending = requestPortraitUpload({ filename: FILENAME, blob: picture(), mimeType: "image/webp" }, { timeoutMs: 5000 });
    await waitFor(() => sent);
    assert.equal(sent.userId, "player-1");
    assert.equal(sent.filename, FILENAME);
    assert.equal(sent.mimeType, "image/webp");
    assert.ok(sent.requestId);
    assert.equal(world.uploadedFiles.size, 0, "the player's own client wrote nothing");

    world.game.socket.emit(SOCKET, { type: PORTRAIT_UPLOAD_RESULT, requestId: sent.requestId, ok: true, path: `modules/blank-inheritance/storage/${FILENAME}` });
    assert.equal(await pending, `modules/blank-inheritance/storage/${FILENAME}`);
  } finally {
    uninstall();
  }
});

test("an answer for somebody else's request is ignored, and the wait ends with the no-GM message", async () => {
  const { world, uninstall } = setup();
  try {
    world.game.user.isGM = false;
    const pending = requestPortraitUpload({ filename: FILENAME, blob: picture(), mimeType: "image/webp" }, { timeoutMs: 200 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    world.game.socket.emit(SOCKET, { type: PORTRAIT_UPLOAD_RESULT, requestId: "not-mine-at-all", ok: true, path: "modules/elsewhere.webp" });
    await assert.rejects(pending, (err) => err.message === NO_GM_FOR_PORTRAIT);
  } finally {
    uninstall();
  }
});

test("the GM's own reason for failing is what the player is shown", async () => {
  const { world, uninstall } = setup();
  try {
    world.game.user.isGM = false;
    let requestId = null;
    world.game.socket.on(SOCKET, (payload) => {
      if (payload?.type === PORTRAIT_UPLOAD_REQUEST) requestId = payload.requestId;
    });
    const pending = requestPortraitUpload({ filename: FILENAME, blob: picture(), mimeType: "image/webp" }, { timeoutMs: 5000 });
    await waitFor(() => requestId);
    world.game.socket.emit(SOCKET, { type: PORTRAIT_UPLOAD_RESULT, requestId, ok: false, reason: "The disk is full." });
    await assert.rejects(pending, /The disk is full\./);
  } finally {
    uninstall();
  }
});

test("a picture the GM's side would refuse is refused on the player's own screen at once, with nothing sent", async () => {
  const { world, uninstall } = setup();
  try {
    world.game.user.isGM = false;
    let emitted = false;
    world.game.socket.emit = () => { emitted = true; };
    await assert.rejects(requestPortraitUpload({ filename: FILENAME, blob: new Blob(["<script>alert(1)</script>"], { type: "image/webp" }), mimeType: "image/webp" }), /not really a WEBP/);
    await assert.rejects(requestPortraitUpload({ filename: "../evil.webp", blob: picture(), mimeType: "image/webp" }), /not a name a portrait may be saved under/);
    assert.equal(emitted, false);
  } finally {
    uninstall();
  }
});

test("the GM's side saves a valid request and answers with the path, and answers a refusal with its reason", async () => {
  const { world, uninstall } = setup();
  try {
    registerInductionSocket();
    const results = [];
    world.game.socket.on(SOCKET, (payload) => {
      if (payload?.type === PORTRAIT_UPLOAD_RESULT) results.push(payload);
    });

    world.game.socket.emit(SOCKET, { type: PORTRAIT_UPLOAD_REQUEST, requestId: "req-good-0001", userId: "p", filename: FILENAME, mimeType: "image/webp", data: bytesToBase64(webpBytes()) });
    await waitFor(() => results.length === 1);
    assert.equal(results[0].requestId, "req-good-0001");
    assert.equal(results[0].ok, true);
    assert.match(results[0].path, new RegExp(FILENAME));
    assert.equal(world.uploadedFiles.size, 1, "the GM's client wrote the picture");

    world.game.socket.emit(SOCKET, { type: PORTRAIT_UPLOAD_REQUEST, requestId: "req-bad-0002", userId: "p", filename: "../../x.webp", mimeType: "image/webp", data: bytesToBase64(webpBytes()) });
    await waitFor(() => results.length === 2);
    assert.equal(results[1].requestId, "req-bad-0002");
    assert.equal(results[1].ok, false);
    assert.match(results[1].reason, /not a name a portrait may be saved under/);
    assert.equal(world.uploadedFiles.size, 1, "a refused request wrote nothing");
  } finally {
    uninstall();
  }
});

test("only the active GM's client acts on a request, and a request with no usable id is dropped without an answer", async () => {
  const { world, uninstall } = setup();
  try {
    registerInductionSocket();
    const results = [];
    world.game.socket.on(SOCKET, (payload) => {
      if (payload?.type === PORTRAIT_UPLOAD_RESULT) results.push(payload);
    });

    world.game.users.activeGM = { isSelf: false };
    world.game.socket.emit(SOCKET, { type: PORTRAIT_UPLOAD_REQUEST, requestId: "req-other-gm-01", userId: "p", filename: FILENAME, mimeType: "image/webp", data: bytesToBase64(webpBytes()) });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(results.length, 0, "a client that is not the active GM does not write");
    assert.equal(world.uploadedFiles.size, 0);

    world.game.users.activeGM = { isSelf: true };
    world.game.socket.emit(SOCKET, { type: PORTRAIT_UPLOAD_REQUEST, userId: "p", filename: FILENAME, mimeType: "image/webp", data: bytesToBase64(webpBytes()) });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(results.length, 0, "no id means nobody to answer, so nothing is sent");
    assert.equal(world.uploadedFiles.size, 0);
  } finally {
    uninstall();
  }
});

test("a failed write on the GM's side is reported to the player instead of being lost", async () => {
  const { world, uninstall } = setup();
  try {
    registerInductionSocket();
    world.directories.delete("modules/blank-inheritance/storage/"); // the mock's upload then answers `false`, as the real one does
    const results = [];
    world.game.socket.on(SOCKET, (payload) => {
      if (payload?.type === PORTRAIT_UPLOAD_RESULT) results.push(payload);
    });
    const warn = console.error;
    console.error = () => {};
    try {
      world.game.socket.emit(SOCKET, { type: PORTRAIT_UPLOAD_REQUEST, requestId: "req-fail-0003", userId: "p", filename: FILENAME, mimeType: "image/webp", data: bytesToBase64(webpBytes()) });
      await waitFor(() => results.length === 1);
    } finally {
      console.error = warn;
    }
    assert.equal(results[0].ok, false);
    assert.match(results[0].reason, /uploadPersistent did not return a success result/);
  } finally {
    uninstall();
  }
});
