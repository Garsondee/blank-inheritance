// Tier 1 — the part of the portrait relay that has no Foundry in it (core/induction-portrait-relay.mjs): how the
// picture travels, and what the GM's side is willing to write for a message it was sent.
//
// Found by the playtest rig, 2026-10-06 (design/playtest-process.md §12.5, F-0003 to F-0007): a plain Player may not
// upload (FILES_UPLOAD), so Page 6's portrait step failed for every real player. The GM's client saves it instead,
// and the GM's client writes whatever a connected client sends it, so the check below is the whole of what it trusts.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_PORTRAIT_BYTES,
  NO_GM_FOR_PORTRAIT,
  PORTRAIT_FILENAME,
  PORTRAIT_UPLOAD_REQUEST,
  base64ToBytes,
  buildPortraitUploadRequest,
  bytesToBase64,
  checkPortraitUploadRequest
} from "../module/blank-inheritance/scripts/core/induction-portrait-relay.mjs";

/** The first bytes of a real PNG (the signature and an IHDR chunk header), padded: enough to begin like one. */
const png = (size = 64) => {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  return bytes;
};
/** A RIFF container holding WEBP, padded. */
const webp = (size = 64) => {
  const bytes = new Uint8Array(size);
  bytes.set([...Buffer.from("RIFF"), size - 8, 0, 0, 0, ...Buffer.from("WEBPVP8 ")]);
  return bytes;
};

const request = (over = {}) => ({
  type: PORTRAIT_UPLOAD_REQUEST,
  requestId: "Abc123xyz456QRST",
  userId: "someUser",
  filename: "portrait-Qw3rTy5uIo7pAsDf.webp",
  mimeType: "image/webp",
  data: bytesToBase64(webp()),
  ...over
});

test("bytes survive the trip through base64, including a picture too big to spread into one call", () => {
  const small = Uint8Array.from([0, 1, 2, 250, 255, 128, 7]);
  assert.deepEqual([...base64ToBytes(bytesToBase64(small))], [...small]);
  const big = new Uint8Array(600_000);
  for (let i = 0; i < big.length; i++) big[i] = (i * 31) % 256;
  const back = base64ToBytes(bytesToBase64(big));
  assert.equal(back.length, big.length);
  assert.ok(back.every((b, i) => b === big[i]));
  assert.equal(bytesToBase64(new Uint8Array(0)), "");
});

test("a real WebP and a real PNG are accepted, and what comes back is the bytes that were sent", () => {
  const sent = webp(200);
  const ok = checkPortraitUploadRequest(request({ data: bytesToBase64(sent) }));
  assert.equal(ok.ok, true);
  assert.deepEqual([...ok.bytes], [...sent]);
  assert.equal(ok.filename, "portrait-Qw3rTy5uIo7pAsDf.webp");
  assert.equal(ok.mimeType, "image/webp");
  assert.equal(ok.requestId, "Abc123xyz456QRST");

  const pngOk = checkPortraitUploadRequest(request({ mimeType: "image/png", filename: "portrait-Qw3rTy5uIo7pAsDf.png", data: bytesToBase64(png()) }));
  assert.equal(pngOk.ok, true);
});

test("the name must be one the terminal itself makes, never a path", () => {
  for (const name of ["../portrait-Qw3rTy5uIo7pAsDf.webp", "portrait-Qw3rTy5uIo7pAsDf.webp/../x.webp", "storage/portrait-Qw3rTy5uIo7pAsDf.webp", "portrait-abc.webp", "portrait-Qw3rTy5uIo7pAsDf.exe", "portrait-Qw3rTy5uIo7pAsDf.webp.js", "evil.webp", "", "portrait-.webp", "portrait-Qw3rTy5uIo7pAs Df.webp", "portrait-Qw3rTy5uIo7pAsDf.WEBP"]) {
    const r = checkPortraitUploadRequest(request({ filename: name }));
    assert.equal(r.ok, false, `a portrait must not be saved as "${name}"`);
    assert.match(r.reason, /not a name a portrait may be saved under/);
  }
  assert.equal(PORTRAIT_FILENAME.test(`portrait-${"a1B2c3D4e5F6g7H8"}.webp`), true, "a real foundry.utils.randomID() name passes");
  assert.equal(checkPortraitUploadRequest(request({ filename: "portrait-Qw3rTy5uIo7pAsDf.png" })).ok, false, "the extension has to agree with the picture's type");
  assert.equal(checkPortraitUploadRequest(request({ mimeType: "image/png" })).ok, false, "and the type with the extension, whichever way round");
});

test("only WebP and PNG, only bytes that really begin like one, only up to a size", () => {
  assert.match(checkPortraitUploadRequest(request({ mimeType: "image/jpeg" })).reason, /WebP or a PNG/);
  assert.match(checkPortraitUploadRequest(request({ mimeType: "image/svg+xml" })).reason, /WebP or a PNG/);
  assert.match(checkPortraitUploadRequest(request({ mimeType: undefined })).reason, /WebP or a PNG/);
  assert.match(checkPortraitUploadRequest(request({ data: bytesToBase64(png()) })).reason, /not really a WEBP/, "PNG bytes under a WebP label");
  assert.match(checkPortraitUploadRequest(request({ mimeType: "image/png", filename: "portrait-Qw3rTy5uIo7pAsDf.png", data: bytesToBase64(webp()) })).reason, /not really a PNG/);
  assert.match(checkPortraitUploadRequest(request({ data: bytesToBase64(new TextEncoder().encode("<script>alert(1)</script>")) })).reason, /not really a WEBP/);
  assert.match(checkPortraitUploadRequest(request({ data: bytesToBase64(webp(MAX_PORTRAIT_BYTES + 1)) })).reason, /too big/);
  assert.equal(checkPortraitUploadRequest(request({ data: bytesToBase64(webp(MAX_PORTRAIT_BYTES)) })).ok, true, "exactly the limit is allowed");
  assert.match(checkPortraitUploadRequest(request({ data: "A".repeat(MAX_PORTRAIT_BYTES * 2) })).reason, /too big/, "an enormous string is refused before it is decoded");
  assert.match(checkPortraitUploadRequest(request({ data: bytesToBase64(new Uint8Array([0x52, 0x49, 0x46, 0x46])) })).reason, /not really a WEBP/, "a header cut short");
});

test("whatever it is given, the check answers and never throws", () => {
  for (const junk of [null, undefined, 7, "text", [], {}, { requestId: 1 }, request({ requestId: "has spaces" }), request({ requestId: "" }), request({ requestId: "x".repeat(65) }), request({ data: "" }), request({ data: 42 }), request({ data: "not base64 !!!" }), request({ data: "AAAA=AAA" }), request({ filename: 7 })]) {
    const r = checkPortraitUploadRequest(junk);
    assert.equal(r.ok, false, JSON.stringify(junk)?.slice(0, 60));
    assert.equal(typeof r.reason, "string");
    assert.ok(r.reason.length > 0);
  }
});

test("a player's client builds the request by the GM's own rules, and is told at once what would be refused", () => {
  const payload = buildPortraitUploadRequest({ requestId: "Abc123xyz456QRST", userId: "u1", filename: "portrait-Qw3rTy5uIo7pAsDf.webp", mimeType: "image/webp", bytes: webp(300) });
  assert.equal(payload.type, PORTRAIT_UPLOAD_REQUEST);
  assert.equal(payload.userId, "u1");
  assert.equal(checkPortraitUploadRequest(payload).ok, true, "what is built is what the GM's side accepts");
  assert.throws(() => buildPortraitUploadRequest({ requestId: "Abc123xyz456QRST", userId: "u1", filename: "portrait-Qw3rTy5uIo7pAsDf.webp", mimeType: "image/webp", bytes: new Uint8Array(MAX_PORTRAIT_BYTES + 5).fill(1) }), /not really|too big/);
  assert.throws(() => buildPortraitUploadRequest({ requestId: "Abc123xyz456QRST", userId: "u1", filename: "../../etc.webp", mimeType: "image/webp", bytes: webp() }), /not a name a portrait may be saved under/);
  assert.match(NO_GM_FOR_PORTRAIT, /GM/, "the message for no GM online names the person who can fix it");
});
