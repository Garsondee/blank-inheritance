// Tier 0 — Evangelion research shelf structural lint. Instant, no fixtures, no Foundry.
//
// The shelf is 12 thematic documents and 21 character files behind one index
// (design/research/evangelion/README.md). The common checks are shared with
// the Giant Robo shelf via test/support/research-shelf.mjs; this file is the
// manifest, plus the one invariant that is specific to this shelf.
//
// That invariant is the important part. This campaign's tone is locked to
// Giant Robo and explicitly NOT to this series (feedback_tone_giant_robo_not_eva:
// warm, funny, uplifting; dark allowed, depressing a fault). The shelf exists
// only because Evangelion fills structural gaps Giant Robo cannot — school
// life, an institution whose treatment of its children is the subject, enemies
// built as puzzles, relationships that degrade. Every file therefore declares
// that it is mined for structure and not for register, and points at the
// guardrail. If that line ever falls out of a file, the file has quietly
// become an argument for a tone we decided against.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerCommonShelfTests, shelfPaths } from "./support/research-shelf.mjs";

const slug = "evangelion";

// The thematic documents, exactly as design/research/evangelion/README.md §3 lists them.
const thematic = [
  "tone-guardrail.md",
  "what-makes-it-tick.md",
  "school-life-and-the-ordinary-day.md",
  "the-enemy-as-puzzle.md",
  "operational-texture-and-the-sortie.md",
  "the-institution-that-uses-children.md",
  "relationships-that-degrade.md",
  "the-machine-and-the-pilot.md",
  "warship-names-and-the-naming-method.md",
  "borrowed-symbolism.md",
  "withheld-information-and-the-ending-problem.md",
  "npc-archetype-catalogue.md",
];

// One file per character, as §4's tables list them.
const characters = [
  // The pilots and their classmates
  "shinji-ikari.md",
  "rei-ayanami.md",
  "asuka-langley-soryu.md",
  "toji-suzuhara.md",
  "kensuke-aida.md",
  "hikari-horaki.md",
  "kaworu-nagisa.md",
  "mari-makinami.md",
  // The adults
  "misato-katsuragi.md",
  "gendo-ikari.md",
  "ritsuko-akagi.md",
  "ryoji-kaji.md",
  "kozo-fuyutsuki.md",
  "the-bridge-crew.md",
  "yui-ikari.md",
  "naoko-akagi.md",
  "kyoko-zeppelin-soryu.md",
  // Outside, above, and otherwise
  "keel-lorenz-and-seele.md",
  "the-angels.md",
  "evangelion-unit-01.md",
  "pen-pen.md",
];

registerCommonShelfTests({
  slug,
  thematic,
  characters,
  routerTasks: [
    "school scene",
    "enemy that is a puzzle",
    "organisation the PCs work for",
    "sortie",
    "friendship or alliance",
    "pilot's relationship with their machine",
    "name for a person",
    "conspiracy",
  ],
});

test("evangelion: every document carries the tone guardrail", () => {
  // The shelf's governing discipline. Structure yes, register no.
  const { documents } = shelfPaths({ slug, thematic, characters });
  for (const { label, file } of documents) {
    const body = readFileSync(file, "utf8");
    const declaresIt = /mined for structure, not for register/i.test(body);
    // The guardrail document itself and the index state the rule at length
    // rather than in the standard one-liner.
    const isGuardrailItself = /tone-guardrail\.md$|research\/evangelion\/README\.md$/.test(
      label.replace(/\\/g, "/"),
    );
    assert.ok(
      declaresIt || isGuardrailItself,
      `${label} does not declare that it is mined for structure, not for register`,
    );
  }
});

test("evangelion: every document points at the guardrail document", () => {
  // A reader entering at any file must be one click from the quarantine list.
  const { documents } = shelfPaths({ slug, thematic, characters });
  for (const { label, file } of documents) {
    if (label.replace(/\\/g, "/").endsWith("tone-guardrail.md")) continue;
    assert.ok(
      readFileSync(file, "utf8").includes("tone-guardrail.md"),
      `${label} never links to the tone guardrail`,
    );
  }
});

test("evangelion: the catalogue tells the reader which shelf to use for what", () => {
  // Both shelves now exist and disagree productively. The cross-shelf table is
  // the payoff of having done the second sweep, and the rows most likely to be
  // got wrong are tone (always Giant Robo) and recurring villains (not here).
  const { shelfRoot } = shelfPaths({ slug, thematic, characters });
  const catalogue = readFileSync(`${shelfRoot}/npc-archetype-catalogue.md`, "utf8");
  assert.ok(
    catalogue.includes("giant-robo/npc-archetype-catalogue.md"),
    "the catalogue does not link to the Giant Robo catalogue",
  );
  for (const row of ["Tone and register", "Recurring villains", "School"]) {
    assert.ok(catalogue.includes(row), `the cross-shelf table has no row for: ${row}`);
  }
});
