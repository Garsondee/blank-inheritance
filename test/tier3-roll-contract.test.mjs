// Tier 3 — the contract between the console's roll buttons and sf2e itself.
//
// Stage 1's whole premise is that clicking a key on the bar takes the SAME
// code path as clicking the equivalent control on the character sheet. That
// premise rests on three things existing inside a bundled third-party system
// we do not control, and on one function whose four lines we copied because it
// is not exported.
//
// None of that can be import-tested — sf2e.mjs dereferences Foundry globals at
// module scope and cannot be loaded in plain Node. So this reads the shipped
// bundle as text and asserts the shapes are still there. A system upgrade that
// moves any of them should fail here loudly, not in a session.
//
// Skips loudly when the gitignored trees are absent (design/testing-strategy.md §3).

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FALLBACK_SKILL_SLUGS, SAVE_SLUGS } from "../module/blank-inheritance/scripts/core/skills.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const sf2eBundlePath = path.join(repoRoot, "gamesystems", "sf2e", "sf2e.mjs");

function readBundle(t) {
  if (!existsSync(sf2eBundlePath)) {
    t.skip(
      "gamesystems/sf2e/sf2e.mjs not present locally (gitignored) — the roll contract needs it, " +
        "skipping loudly rather than failing or silently passing."
    );
    return null;
  }
  return readFileSync(sf2eBundlePath, "utf8");
}

test("ActorPF2e still exposes getStatistic, which is what every key on the bar calls", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;

  assert.ok(bundle.includes("getStatistic("), "getStatistic is gone from the sf2e bundle entirely");

  // The base implementation routes ac/armor, saves, skills (lores included)
  // and synthetics. If this shape changes, checkGroupsFor's assumption that
  // everything in actor.skills is rollable by slug needs re-checking.
  assert.match(
    bundle,
    /getStatistic\(\w+\)\s*\{\s*return\s*\[`armor`,\s*`ac`\]/,
    "ActorPF2e#getStatistic no longer starts by resolving armor/ac — re-read it before trusting slug lookup"
  );

  // CreaturePF2e's override is what makes "perception" resolvable at all.
  assert.match(
    bundle,
    /case\s*`perception`:\s*return this\.perception/,
    "getStatistic no longer special-cases perception — the Defences bank's fourth key would silently stop working"
  );
});

test("the sheet still rolls through the same call the console does", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;

  // The sheet's own roll-check action. If this stops being
  // getStatistic(...).roll(eventToRollParams(...)), then the console and the
  // sheet have diverged and stage 1's premise is broken.
  assert.match(
    bundle,
    /eventToRollParams\(\w+,\s*\{\s*type:\s*`check`\s*\}\)/,
    "the sheet no longer builds check params via eventToRollParams"
  );
});

test("eventToRollParams still behaves the way core/roll-intent.mjs reimplements it", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;

  const start = bundle.indexOf("function eventToRollParams");
  assert.notEqual(start, -1, "eventToRollParams is gone — our copy of it is now unanchored");
  const source = bundle.slice(start, start + 420);

  // Each assertion below maps to one line of our reimplementation.
  assert.match(source, /showCheckDialogs/, "the setting it reads has been renamed");
  assert.match(source, /!game\.user\.settings\[\w+\]/, "the default is no longer the negation of the setting");
  assert.match(source, /shiftKey\s*\?\s*!\w+\s*:\s*\w+/, "shift no longer INVERTS the setting");
  assert.match(source, /ctrlKey\s*\|\|\s*\w+\.metaKey/, "ctrl/meta no longer both trigger a secret roll");
  assert.match(source, /game\.user\.isGM\s*\?\s*`gm`\s*:\s*`blind`/, "the secret-roll message modes have changed");
});

test("CONFIG.PF2E.skills still holds exactly the eighteen slugs we ship as a fallback", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;

  const start = bundle.indexOf("skills: Object.freeze({");
  assert.notEqual(start, -1, "the frozen skills config is gone");
  const block = bundle.slice(start, bundle.indexOf("})", start));

  const found = [...block.matchAll(/^\t\t(\w+):\s*\{/gm)].map((m) => m[1]).sort();
  assert.deepEqual(
    found,
    [...FALLBACK_SKILL_SLUGS].sort(),
    "sf2e's skill list no longer matches FALLBACK_SKILL_SLUGS in core/skills.mjs. The console reads " +
      "the live actor so it will still be correct at runtime, but the fallback and the doctrine's " +
      "count are now wrong and should be updated together."
  );
  assert.equal(found.includes("lore"), false, "Lore has become a fixed skill, which would change how the bar is built");
});

test("the three saves are still the three saves", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;
  for (const slug of SAVE_SLUGS) {
    assert.ok(bundle.includes(`\`${slug}\``), `${slug} no longer appears in the sf2e bundle`);
  }
});

test("the @Check enricher fallback path still exists", (t) => {
  const bundle = readBundle(t);
  if (!bundle) return;
  // core/roll-intent.mjs's enricherFor is the documented escape hatch if the
  // direct call ever breaks; it is only an escape hatch while this is real.
  assert.match(bundle, /@Check\[|`Check`/, "the @Check enricher appears to be gone");
});
