// Tier 3 — the contract between the portrait relay (foundry/induction-relay.mjs, core/induction-portrait-relay.mjs)
// and Foundry itself.
//
// The relay rests on things inside Foundry that are not ours: that a plain Player is NOT given FILES_UPLOAD by default
// (so the relay is needed at all), that the server refuses an upload without it, that `User#can("FILES_UPLOAD")` is how
// a client asks, that `uploadPersistent` goes through that same refused route (so a package cannot escape the check),
// and that the module socket can carry a picture's worth of base64 in one message. A Foundry upgrade that moves any of
// them fails here, loudly, instead of at a real player's portrait step.
//
// Skips loudly when the gitignored foundryvtt/ tree is absent (design/testing-strategy.md §3).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MAX_PORTRAIT_BYTES } from "../module/blank-inheritance/scripts/core/induction-portrait-relay.mjs";
import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from "../module/blank-inheritance/scripts/core/induction-portrait.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const app = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");

function read(t, ...parts) {
  const file = path.join(app, ...parts);
  if (!existsSync(file)) {
    t.skip("foundryvtt/ not present locally (gitignored): the portrait-upload contract needs its source, skipping loudly rather than failing or silently passing.");
    return null;
  }
  return readFileSync(file, "utf8");
}

test("a plain Player does not have FILES_UPLOAD by default, and only a GM always does", (t) => {
  const constants = read(t, "common", "constants.mjs");
  if (!constants) return;
  const block = /FILES_UPLOAD: \{[^}]*\}/.exec(constants)?.[0];
  assert.ok(block, "FILES_UPLOAD is no longer a user permission");
  assert.match(block, /defaultRole: USER_ROLES\.ASSISTANT/, "FILES_UPLOAD's default role changed: if Players now have it by default the relay is no longer needed, if it is stricter the relay's direct path for Assistants needs re-reading");
  assert.match(block, /requiredRoles: \[USER_ROLES\.GAMEMASTER\]/);
});

test("the server refuses an upload from a user without FILES_UPLOAD, and the client reports a refusal as a false return", (t) => {
  const server = read(t, "dist", "server", "views", "upload.mjs");
  const picker = read(t, "client", "applications", "apps", "file-picker.mjs");
  if (!server || !picker) return;
  assert.match(server, /hasPermission\("FILES_UPLOAD"\)\)\)return \w+\.json\(\{error:`User \[\$\{[^`]*does not have permission to upload files\./, "the server's upload route no longer refuses on FILES_UPLOAD in the way the portrait step's failure message assumes");
  assert.match(picker, /if \( response\.error \) \{\s*ui\.notifications\.error\(response\.error\);\s*return false;/, "FilePicker.upload no longer returns false on a server error: io.mjs#writeStorageFile's `!result` check is what turns that into a thrown error");
});

test("uploadPersistent goes through the same upload route, so a package cannot upload past the permission", (t) => {
  const picker = read(t, "client", "applications", "apps", "file-picker.mjs");
  if (!picker) return;
  assert.match(picker, /static async uploadPersistent\(packageId, path, file, body=\{\}, \{notify=true\}=\{\}\) \{[\s\S]*?return this\.upload\(source, target, file, body, \{notify\}\);/);
});

test("User#can asks the permission by name", (t) => {
  const user = read(t, "common", "documents", "user.mjs");
  if (!user) return;
  assert.match(user, /can\(action\) \{[\s\S]*?if \( action in CONST\.USER_PERMISSIONS \) return this\.hasPermission\(action\);/);
});

test("the module socket carries a whole portrait: the server's socket limit is far above the largest picture the relay allows", (t) => {
  const express = read(t, "dist", "server", "express.mjs");
  if (!express) return;
  const limit = /maxHttpBufferSize:(\d+(?:e\d+)?)/.exec(express)?.[1];
  assert.ok(limit, "the server no longer sets maxHttpBufferSize explicitly (socket.io's own default is 1 MB)");
  const bytes = Number(limit);
  const base64 = Math.ceil((MAX_PORTRAIT_BYTES * 4) / 3);
  assert.ok(bytes >= base64 * 4, `socket limit ${bytes} is too close to the biggest allowed portrait (${base64} bytes of base64)`);
});

test("a cropped portrait is far below what the relay allows, even as a PNG", () => {
  const rawRgba = OUTPUT_WIDTH * OUTPUT_HEIGHT * 4;
  assert.ok(rawRgba < MAX_PORTRAIT_BYTES, `an uncompressed ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT} picture (${rawRgba} bytes) would not fit: the limit is lower than the worst case`);
});
