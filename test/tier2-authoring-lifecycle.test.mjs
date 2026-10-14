// Tier 2 — Approvals Desk #166: the shared authoring-lifecycle vocabulary.
// Every entity schema this epic names references ONE shared $def
// (data/schema/common/authoring.schema.json) instead of inventing its own
// enum, every one of those schemas requires it (not merely allows it), and
// every real data file of an affected type actually carries the block.
// See design/approvals-desk.md §2/§6, design/data-ownership.md §3-4.
//
// Markdown lore (quarantine/ideas/story/bible/, design/) has no JSON envelope to hang a
// status on and is explicitly OUT OF SCOPE for this item (issue #166's own
// note) -- handled at file granularity later, or not at all. Not tested here
// on purpose, not an oversight.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const schemaDir = path.join(repoRoot, "data", "schema");
const dataRoot = path.join(repoRoot, "data");

function readJson(absPath) {
  return JSON.parse(readFileSync(absPath, "utf8"));
}

function listJsonFiles(...relParts) {
  const dir = path.join(dataRoot, ...relParts);
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

const authoringSchema = readJson(path.join(schemaDir, "common", "authoring.schema.json"));

test("common/authoring.schema.json defines the six-state ladder from design/approvals-desk.md §2/§6 plus design/scene-signoff.md §3, owned per design/data-ownership.md §4", () => {
  const def = authoringSchema.$defs?.authoring;
  assert.ok(def, "expected a top-level $defs.authoring");
  assert.deepEqual(
    def.properties.status.enum,
    ["needs-lore", "drafted", "sound", "final", "live", "cut"],
    "the ladder must be exactly these six -- 'approved' is retired (design/approvals-desk.md §2: zero files ever carried it); " +
    "'cut' is the bounce loop's terminal decision (§6, issue #171); 'live' is the Sign-Off's own rung, scene briefs only " +
    "(design/scene-signoff.md §3, added 2026-09-22), and it is the ONE value the Desk does not own"
  );
  assert.ok(def.$comment?.startsWith("OWNER:"), "must declare its owner per data-ownership.md §4's $comment convention, not just in prose");
  assert.equal(def.additionalProperties, false, "an unlisted key on a lifecycle field must fail loudly rather than pass through silently (design/data-ownership.md §5)");
});

// Where each named schema's own "authoring" property and "required" array
// live. kid/frame/creature wrap their object shape in allOf's second branch
// (the first branch is the shared pcStatblock/combatStatblock $ref); every
// other schema keeps both at its own top level. episode is listed twice:
// once for the episode itself, once for its nested scenes[].items.
const ENTITY_SCHEMAS = [
  { file: "location.schema.json", authoringAt: (s) => s.properties.authoring, requiredAt: (s) => s.required },
  { file: "npc.schema.json", authoringAt: (s) => s.properties.authoring, requiredAt: (s) => s.required },
  { file: "creature.schema.json", authoringAt: (s) => s.allOf[1].properties.authoring, requiredAt: (s) => s.allOf[1].required },
  { file: "antagonist.schema.json", authoringAt: (s) => s.properties.authoring, requiredAt: (s) => s.required },
  { file: "episode.schema.json", label: "episode.schema.json (episode itself)", authoringAt: (s) => s.properties.authoring, requiredAt: (s) => s.required },
  { file: "episode.schema.json", label: "episode.schema.json (per-scene)", authoringAt: (s) => s.properties.scenes.items.properties.authoring, requiredAt: (s) => s.properties.scenes.items.required },
  { file: "encounter.schema.json", authoringAt: (s) => s.properties.authoring, requiredAt: (s) => s.required },
  { file: "challenge.schema.json", authoringAt: (s) => s.properties.authoring, requiredAt: (s) => s.required },
  { file: "subsystem.schema.json", authoringAt: (s) => s.properties.authoring, requiredAt: (s) => s.required },
  { file: "kid.schema.json", authoringAt: (s) => s.allOf[1].properties.authoring, requiredAt: (s) => s.allOf[1].required },
  { file: "frame.schema.json", authoringAt: (s) => s.allOf[1].properties.authoring, requiredAt: (s) => s.allOf[1].required },
  { file: "faction.schema.json", authoringAt: (s) => s.properties.authoring, requiredAt: (s) => s.required }
];

test("every entity schema issue #166 names $refs the shared $def and requires it, on every entity type", () => {
  for (const entry of ENTITY_SCHEMAS) {
    const schema = readJson(path.join(schemaDir, entry.file));
    const label = entry.label ?? entry.file;
    const authoringProp = entry.authoringAt(schema);
    assert.ok(authoringProp, `${label}: expected an "authoring" property to exist at all`);
    const ref = authoringProp.$ref ?? authoringProp.allOf?.find((branch) => branch.$ref)?.$ref;
    assert.equal(
      ref,
      "common/authoring.schema.json#/$defs/authoring",
      `${label}: "authoring" must $ref the shared $def, not a locally re-invented shape`
    );
    assert.ok(
      entry.requiredAt(schema).includes("authoring"),
      `${label}: "authoring" must be required -- issue #166 backfills every real file, so a missing block should fail validation, not silently pass`
    );
  }
});

test("location.schema.json's authoring migration additionally still requires 'note', since every location is promoted from a gazetteer session note", () => {
  const schema = readJson(path.join(schemaDir, "location.schema.json"));
  const authoringProp = schema.properties.authoring;
  const extraRequired = authoringProp.allOf.find((branch) => Array.isArray(branch.required));
  assert.ok(extraRequired?.required.includes("note"), "location's authoring must still require 'note' on top of the shared $def");
});

// "live" is the Sign-Off's own rung, scene briefs only (design/scene-signoff.md §3),
// added 2026-09-22 and sealed for real on The Road In the same day.
const VALID_STATUSES = new Set(["needs-lore", "drafted", "sound", "final", "live", "cut"]);

// type -> the data/ subpath holding its real files, as one non-recursive
// readdir (never data/antagonists/claimants/, which holds a DIFFERENT schema
// type -- claimant-guidelines -- not antagonist instances).
const TYPE_TO_DIR_PARTS = {
  npc: ["npcs"],
  antagonist: ["antagonists"],
  faction: ["factions"],
  challenge: ["challenges"],
  subsystem: ["subsystems"],
  encounter: ["encounters"],
  kid: ["characters", "kids"],
  frame: ["characters", "frames"]
};

test("every real data file of an authoring-bearing type carries a non-empty, valid authoring.status", () => {
  let checked = 0;
  for (const [expectedType, dirParts] of Object.entries(TYPE_TO_DIR_PARTS)) {
    for (const file of listJsonFiles(...dirParts)) {
      const content = readJson(file);
      if (content.type !== expectedType) continue;
      const rel = path.relative(repoRoot, file);
      assert.ok(content.authoring, `${rel}: missing "authoring" entirely -- issue #166's backfill should have added it`);
      assert.ok(
        VALID_STATUSES.has(content.authoring.status),
        `${rel}: authoring.status "${content.authoring.status}" is not one of ${[...VALID_STATUSES].join("/")}`
      );
      checked += 1;
    }
  }
  assert.ok(
    checked >= 50,
    `expected at least 50 backfilled files across npcs/antagonists/factions/challenges/subsystems/encounters/kids -- only checked ${checked}; a directory glob above may be wrong`
  );
});

test("both real episodes, and every one of their scenes, carry a valid authoring block", () => {
  const files = listJsonFiles("episodes");
  assert.ok(files.length >= 2, "expected at least the two real episodes (Episode One, Episode Two's stub)");
  for (const file of files) {
    const episode = readJson(file);
    const rel = path.relative(repoRoot, file);
    assert.ok(episode.authoring, `${rel}: the episode itself has no authoring block`);
    assert.ok(VALID_STATUSES.has(episode.authoring.status), `${rel}: episode authoring.status is invalid`);
    for (const scene of episode.scenes ?? []) {
      const sceneLabel = `${rel}#${scene.id ?? scene.order}`;
      assert.ok(scene.authoring, `${sceneLabel}: scene has no authoring block`);
      assert.ok(VALID_STATUSES.has(scene.authoring.status), `${sceneLabel}: scene authoring.status is invalid`);
    }
  }
});

test("location.schema.json's authoring migration preserved every real value -- no file ended up with an invalid or 'approved' status", () => {
  const files = listJsonFiles("locations");
  assert.ok(files.length > 100, "expected the real ~230-file location corpus, not a fixture subset");
  let drafted = 0;
  let needsLore = 0;
  const invalid = [];
  for (const file of files) {
    const status = readJson(file).authoring?.status;
    if (status === "drafted") drafted += 1;
    else if (status === "needs-lore") needsLore += 1;
    else invalid.push({ file: path.relative(repoRoot, file), status });
  }
  assert.deepEqual(invalid, [], "every location's authoring.status must still be 'drafted' or 'needs-lore' after the migration -- design/approvals-desk.md §2 recorded zero 'approved' files, and the migration must not have invented any other value");
  assert.ok(drafted > 0 && needsLore > 0, "expected both drafted and needs-lore locations to survive the migration untouched");
});

// Issue #168: promote() refuses when a dependsOn id's status can't be
// confirmed sound/final. That guard is only as good as dependsOn actually
// pointing at real things -- nothing populates it yet (design/approvals-desk.md
// §3's cascade is brand new), so this is a forward guard, not a current
// regression fix. "Known ids" spans every authoring-bearing type plus
// locations (which had the field first) plus episode scenes, since a
// dependency is just as likely to be a specific scene as a whole entity.
function collectKnownIds() {
  const ids = new Set();
  for (const file of listJsonFiles("locations")) ids.add(readJson(file).id);
  for (const [, dirParts] of Object.entries(TYPE_TO_DIR_PARTS)) {
    for (const file of listJsonFiles(...dirParts)) ids.add(readJson(file).id);
  }
  for (const file of listJsonFiles("episodes")) {
    const episode = readJson(file);
    ids.add(episode.id);
    for (const scene of episode.scenes ?? []) if (scene.id) ids.add(scene.id);
  }
  return ids;
}

test("every populated authoring.dependsOn id resolves to something real in the corpus -- a forward guard, since nothing uses it yet", () => {
  const knownIds = collectKnownIds();
  assert.ok(knownIds.size > 50, "sanity: the known-id set must actually be populated for this check to mean anything");

  const allAuthoringBearingFiles = [
    ...listJsonFiles("locations"),
    ...Object.values(TYPE_TO_DIR_PARTS).flatMap((dirParts) => listJsonFiles(...dirParts)),
    ...listJsonFiles("episodes")
  ];

  const badRefs = [];
  for (const file of allAuthoringBearingFiles) {
    const content = readJson(file);
    const rel = path.relative(repoRoot, file);
    const blocksToCheck = content.type === "episode" || content.type === "interlude"
      ? [{ label: rel, authoring: content.authoring }, ...(content.scenes ?? []).map((s) => ({ label: `${rel}#${s.id ?? s.order}`, authoring: s.authoring }))]
      : [{ label: rel, authoring: content.authoring }];
    for (const { label, authoring } of blocksToCheck) {
      for (const depId of authoring?.dependsOn ?? []) {
        if (!knownIds.has(depId)) badRefs.push(`${label} -> dependsOn "${depId}"`);
      }
    }
  }
  assert.deepEqual(badRefs, [], `dependsOn entries pointing at unknown ids:\n${badRefs.join("\n")}`);
});

let ajvAvailable = true;
let Ajv2020;
try {
  ({ default: Ajv2020 } = await import("ajv/dist/2020.js"));
} catch {
  ajvAvailable = false;
}

test("the shared $def actually rejects 'approved' and an unknown key, behaviourally -- not just by declaration", async (t) => {
  if (!ajvAvailable) {
    t.skip("ajv is not installed (npm install) — behavioural check skipped, not silently passed");
    return;
  }
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(authoringSchema);
  const validate = ajv.compile({ $ref: "common/authoring.schema.json#/$defs/authoring" });

  assert.equal(validate({ status: "drafted" }), true, "a minimal valid block must pass");
  assert.equal(validate({ status: "approved" }), false, "'approved' must be REJECTED -- it is retired, not merely undocumented");
  assert.equal(validate({ status: "drafted", notARealField: true }), false, "an unknown key must be REJECTED, per additionalProperties: false");
  assert.equal(validate({}), false, "status must be REQUIRED -- an empty block must fail");
});
