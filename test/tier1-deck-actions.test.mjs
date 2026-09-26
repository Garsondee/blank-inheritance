// Tier 1 — the deck's Action selector (scripts/core/deck-actions.mjs): which
// of sf2e's own actions sit on the knob, in what order, and what each key
// prints. Added 2026-09-23 with the deck's widening.

import { test } from "node:test";
import assert from "node:assert/strict";

import { actionId, actionListFor, actionRows, costGlyph } from "../module/blank-inheritance/scripts/core/deck-actions.mjs";

/**
 * Every slug sf2e 1.4.1's game.pf2e.actions registry actually carried, read
 * live 2026-09-23. The lists must never name an action outside it — a typo'd
 * slug would silently drop a detent from the knob.
 */
const LIVE_REGISTRY = [
  "administer-first-aid", "affix-a-talisman", "aid", "arrest-a-fall", "avert-gaze", "avoid-notice", "balance", "burrow",
  "climb", "coerce", "command-an-animal", "conceal-an-object", "crawl", "create-a-diversion", "create-forgery",
  "decipher-writing", "delay", "demoralize", "disable-device", "disarm", "dismiss", "drop-prone", "escape", "feint", "fly",
  "force-open", "gather-information", "grab-an-edge", "grapple", "hide", "high-jump", "identify-alchemy", "identify-magic",
  "impersonate", "interact", "leap", "learn-a-spell", "lie", "long-jump", "make-an-impression", "maneuver-in-flight",
  "mount", "palm-an-object", "perform", "pick-a-lock", "point-out", "ready", "recall-knowledge", "release", "reposition",
  "request", "seek", "sense-direction", "sense-motive", "shove", "sneak", "squeeze", "stand", "steal", "step", "stride",
  "subsist", "sustain", "swim", "take-cover", "track", "treat-disease", "treat-poison", "trip", "tumble-through",
  "access-infosphere", "drive", "hack", "navigate", "operate-device", "plot-course", "run-over", "stop", "stunt", "take-control"
];

/** The variants sf2e refuses a bare use() on, with the slugs it actually has (read live). */
const LIVE_VARIANTS = {
  "administer-first-aid": ["stabilize", "stop-bleeding"],
  "create-a-diversion": ["distracting-words", "gesture", "trick"]
};

test("both lists name only actions sf2e actually registers, and every multi-variant action names a real variant", () => {
  for (const mode of ["theatre", "personnel"]) {
    for (const entry of actionListFor(mode)) {
      assert.ok(LIVE_REGISTRY.includes(entry.slug), `${mode} lists "${entry.slug}", which sf2e does not register`);
      if (LIVE_VARIANTS[entry.slug]) {
        assert.ok(LIVE_VARIANTS[entry.slug].includes(entry.variant), `${entry.slug} needs one of its real variants, got ${entry.variant}`);
      } else {
        assert.equal(entry.variant ?? null, null, `${entry.slug} has no variants and must not name one`);
      }
    }
  }
});

test("a fight's knob leads with movement, a scene's with finding things out; frame scale reads the fight list", () => {
  assert.deepEqual(actionListFor("personnel").slice(0, 3).map((a) => a.slug), ["stride", "step", "take-cover"]);
  assert.equal(actionListFor("theatre")[0].slug, "seek");
  assert.equal(actionListFor("frame"), actionListFor("personnel"), "a Frame is a PC-grade sheet; its actions are the same");
});

test("every detent on a knob has its own id, so a variant is never mistaken for its sibling", () => {
  for (const mode of ["theatre", "personnel"]) {
    const ids = actionListFor(mode).map(actionId);
    assert.equal(new Set(ids).size, ids.length, `${mode} repeats a detent`);
  }
  assert.equal(actionId({ slug: "administer-first-aid", variant: "stabilize" }), "administer-first-aid:stabilize");
  assert.equal(actionId({ slug: "seek" }), "seek");
});

test("costGlyph prints sf2e's own cost vocabulary and nothing for an activity with no action cost", () => {
  assert.equal(costGlyph(1), "◆");
  assert.equal(costGlyph(2), "◆◆");
  assert.equal(costGlyph("3"), "◆◆◆");
  assert.equal(costGlyph("free"), "◇");
  assert.equal(costGlyph("reaction"), "⟲");
  assert.equal(costGlyph(null), "");
});

test("actionRows prints the best modifier an action can roll, drops what the registry lacks, and names variants", () => {
  const registry = {
    seek: { name: "Seek", cost: 1, preview: [{ label: "Perception", modifier: 9, slug: "perception" }] },
    "recall-knowledge": {
      name: "Recall Knowledge",
      cost: 1,
      preview: [{ label: "Arcana", modifier: 1 }, { label: "Religion", modifier: 9 }, { label: "Nature", modifier: 9 }]
    },
    "administer-first-aid": { name: "Administer First Aid", cost: 2, variants: { stabilize: "Stabilize" }, preview: [{ label: "Medicine", modifier: -2 }] },
    "take-cover": { name: "Take Cover", cost: 1, preview: [] }
  };
  const rows = actionRows("personnel", registry);
  assert.deepEqual(rows.map((r) => r.id), ["take-cover", "seek", "recall-knowledge", "administer-first-aid:stabilize"],
    "rows keep the list's own order, drop any slug the registry does not carry, and drop a variant (stop-bleeding) the live action lacks");
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(byId.seek.modLabel, "+9");
  assert.equal(byId.seek.rolls, true);
  assert.equal(byId["recall-knowledge"].modLabel, "+9", "the best of several statistics, which is the one a player reaches for");
  assert.equal(byId["recall-knowledge"].stat, "Religion", "ties keep the first best");
  assert.equal(byId["administer-first-aid:stabilize"].label, "Administer First Aid: Stabilize");
  assert.equal(byId["administer-first-aid:stabilize"].short, "Stabilize");
  assert.equal(byId["administer-first-aid:stabilize"].modLabel, "-2");
  assert.equal(byId["take-cover"].rolls, false, "a simple action rolls nothing and prints no number");
  assert.equal(byId["take-cover"].modLabel, "");
  assert.equal(byId["take-cover"].glyph, "◆");
});

test("actionRows with no registry at all is an empty knob, not an error", () => {
  assert.deepEqual(actionRows("theatre", {}), []);
  assert.deepEqual(actionRows("theatre"), []);
});
