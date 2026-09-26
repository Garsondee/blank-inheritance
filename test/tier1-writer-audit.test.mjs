// Tier 1 — Approvals Desk #167/#168: "audit and guard the existing writers."
// design/approvals-desk.md §3 names five write paths to check:
// tools/gazetteer/server.py (guarded directly -- see
// test/gazetteer/test_server.py's sound/final tests), sync.mjs, the
// generators in scripts/core/generators/, tools/city-map/citymap/ops/, and
// any harvest merge path (tools/module-sync/).
//
// This is a canary, not a full static analyzer: it scans each file's source
// text for the shape real authoring-status code would take (`.authoring`
// property access -- with or without `?.` -- an `authoring:`/`"authoring":`
// object key, or bracket access) and fails loudly the moment a file NOT
// already accounted for below starts touching the field, forcing a human
// back to this audit rather than letting a new writer slip in unguarded the
// way the gazetteer's own approve-endpoint once did (design/data-ownership.md
// §1). `sync.mjs` and `journal.mjs` legitimately touch it now (issue #168's
// withhold gate); each has its own dedicated read-only confirmation below
// instead of being asserted clean, and both are excluded from their
// directory's blanket check so this canary keeps watching every OTHER file.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

// Matches `.authoring` / `?.authoring` (property access, plain or optional-
// chained), `authoring:` / `"authoring":` (an object-literal or JSON key),
// and `["authoring"]` (bracket access) -- not a prose mention like "an
// authoring id" or "the authoring process", which have no punctuation
// immediately after the word.
const TOUCHES_AUTHORING = /authoring\??\s*[.:]|["'`]authoring["'`]\s*[,\]:]/;

// A real assignment to the field -- `x.authoring = ...` or
// `x.authoring.status = ...` -- deliberately excluding `==`/`===`/`!=` by
// requiring the `=` NOT be followed by another `=`.
const WRITES_AUTHORING = /authoring(?:\.status)?\s*=(?!=)/;

function jsonFilesIn(absDir, extension) {
  try {
    return readdirSync(absDir)
      .filter((f) => f.endsWith(extension))
      .map((f) => path.join(absDir, f));
  } catch {
    return [];
  }
}

function assertClean(absFiles) {
  for (const file of absFiles) {
    const text = readFileSync(file, "utf8");
    assert.equal(
      TOUCHES_AUTHORING.test(text),
      false,
      `${path.relative(repoRoot, file)} now references "authoring" -- re-audit it against design/approvals-desk.md §3 ` +
      `(every writer must either never touch the field, or call assertNotPromotedStatus()/promote() from ` +
      `module/blank-inheritance/scripts/core/promote.mjs) and update this test's allowlist once it's confirmed safe`
    );
  }
}

/** For a file the audit above has already confirmed legitimately touches `authoring`: proves it only ever READS the field, never assigns to it. */
function assertReadOnly(file) {
  const text = readFileSync(file, "utf8");
  assert.ok(TOUCHES_AUTHORING.test(text), `${path.relative(repoRoot, file)} was expected to touch "authoring" -- if it no longer does, move it back into the blanket clean check instead`);
  assert.equal(
    WRITES_AUTHORING.test(text),
    false,
    `${path.relative(repoRoot, file)} now WRITES to authoring, not just reads it -- re-audit against design/approvals-desk.md §3; ` +
    `only promote() may ever raise a status, and this file was previously confirmed read-only`
  );
}

test("scripts/core/generators/*.mjs never touch authoring, except journal.mjs (which reads, not writes -- see the dedicated test below)", () => {
  const dir = path.join(repoRoot, "module", "blank-inheritance", "scripts", "core", "generators");
  const files = jsonFilesIn(dir, ".mjs").filter((f) => !f.endsWith("journal.mjs"));
  assert.ok(files.length > 0, "expected to actually find generator files -- an empty list would make this test vacuous");
  assertClean(files);
});

test("journal.mjs reads authoring.status to decide per-page withholding (issue #168) but never writes it", () => {
  assertReadOnly(path.join(repoRoot, "module", "blank-inheritance", "scripts", "core", "generators", "journal.mjs"));
});

test("scene-build.mjs never touches authoring -- push is repo-to-Foundry only, never the other direction", () => {
  const dir = path.join(repoRoot, "module", "blank-inheritance", "scripts", "foundry");
  assertClean([path.join(dir, "scene-build.mjs")]);
});

test("sync.mjs reads authoring.status to decide whether to withhold real content (issue #168) but never writes it", () => {
  assertReadOnly(path.join(repoRoot, "module", "blank-inheritance", "scripts", "foundry", "sync.mjs"));
});

test("tools/module-sync/*.mjs never touch authoring -- harvest today pulls storage/ wholesale and never auto-merges into canonical data/ files", () => {
  const dir = path.join(repoRoot, "tools", "module-sync");
  const files = jsonFilesIn(dir, ".mjs");
  assert.ok(files.length > 0, "expected to actually find module-sync scripts");
  assertClean(files);
});

test("tools/city-map/citymap/ops/*.py never touch authoring -- construct/demolish/router/replay operate on geometry and the op log, not review status", () => {
  const dir = path.join(repoRoot, "tools", "city-map", "citymap", "ops");
  const files = jsonFilesIn(dir, ".py");
  assert.ok(files.length > 0, "expected to actually find city-map ops files");
  assertClean(files);
});

test("the audit regex itself: matches real property/key access, not prose mentioning \"authoring\"", () => {
  assert.equal(TOUCHES_AUTHORING.test("an authoring id"), false);
  assert.equal(TOUCHES_AUTHORING.test("the authoring process"), false);
  assert.equal(TOUCHES_AUTHORING.test("entity.authoring.status = status"), true);
  assert.equal(TOUCHES_AUTHORING.test("source.authoring?.status"), true, "optional chaining must not be a blind spot");
  assert.equal(TOUCHES_AUTHORING.test('doc.setdefault("authoring", {})["status"] = body["status"]'), true);
  assert.equal(TOUCHES_AUTHORING.test("authoring: { status: 'drafted' }"), true);
  assert.equal(TOUCHES_AUTHORING.test('"authoring": {"status": "drafted"}'), true);
});

test("the write-detection regex: distinguishes a real assignment from a read, a comparison, or a fenced-off equals sign", () => {
  assert.equal(WRITES_AUTHORING.test("entity.authoring.status = status"), true);
  assert.equal(WRITES_AUTHORING.test("nextAuthoring.authoring = value"), true);
  assert.equal(WRITES_AUTHORING.test("source.authoring?.status ?? fallback"), false);
  assert.equal(WRITES_AUTHORING.test("if (authoring.status === status)"), false);
  assert.equal(WRITES_AUTHORING.test("authoring.status !== 'drafted'"), false);
});

// ---------------------------------------------------------------------------
// The Sign-Off's writer (design/scene-signoff.md §3, added 2026-09-22).
//
// `live` is the one authoring.status value the Approvals Desk does NOT own, so
// it needs the same audit the Desk's own values get: exactly one file may write
// it, and every neighbouring file must be provably read-only. Without this, the
// second-writer failure that design/data-ownership.md was written for would be
// reintroduced by the very mechanism that cites it.
// ---------------------------------------------------------------------------

test("tools/scene-signoff/: only seal.mjs writes authoring -- every other file is read-only or clean", () => {
  const dir = path.join(repoRoot, "tools", "scene-signoff");
  const files = jsonFilesIn(dir, ".mjs");
  assert.ok(files.length >= 4, "expected to actually find the scene-signoff tool files");

  for (const file of files) {
    const name = path.basename(file);
    const text = readFileSync(file, "utf8");
    if (name === "seal.mjs") continue; // the declared writer, asserted below
    assert.equal(
      WRITES_AUTHORING.test(text),
      false,
      `tools/scene-signoff/${name} now writes authoring -- only seal.mjs may, per ` +
      `data/schema/common/authoring.schema.json's owner declaration. If this is deliberate, the ownership ` +
      `declaration and design/scene-signoff.md §3 both have to change first.`
    );
  }
});

test("seal.mjs is the declared writer, and delegates the decision to core/promote.mjs's seal()", () => {
  const text = readFileSync(path.join(repoRoot, "tools", "scene-signoff", "seal.mjs"), "utf8");
  assert.equal(WRITES_AUTHORING.test(text), true, "seal.mjs is supposed to be the one file that writes this field");
  assert.match(
    text,
    /from "\.\.\/\.\.\/module\/blank-inheritance\/scripts\/core\/promote\.mjs"/,
    "seal.mjs must import the guarded path rather than setting status itself"
  );
  assert.equal(
    /status:\s*["']live["']/.test(text),
    false,
    'seal.mjs must never assign "live" directly -- seal() decides, because seal() is what refuses an incomplete review'
  );
});

test("the authoring schema declares the split ownership, so the rule is discoverable where new fields are added", () => {
  const schema = JSON.parse(
    readFileSync(path.join(repoRoot, "data", "schema", "common", "authoring.schema.json"), "utf8")
  );
  const comment = schema.$defs.authoring.$comment;
  assert.match(comment, /scene-signoff/, "the Sign-Off must be named as an owner");
  assert.match(comment, /foundry-approvals-desk/, "the Desk must still be named as the owner of everything else");
  assert.ok(
    schema.$defs.authoring.properties.status.enum.includes("live"),
    "the status enum must carry the rung the Sign-Off writes"
  );
});
