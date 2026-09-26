// Tier 2 — provenance stays out of text the GM reads, 2026-09-21.
//
// WHERE THIS CAME FROM. Ingram had another model clean up twelve of these
// scene files and supplied both sides. The diff, keyed by id rather than by
// array index, is 120 changed fields, 0 added, 0 deleted -- it rewrote prose
// and touched nothing structural. **51 of those 120 changes, 43%, were
// removing provenance from GM-facing text and doing nothing else.**
//
// Date stamps were the countable symptom and are already covered by
// tier2-scene-prose-style's own check. This covers the rest of the family,
// which that diff makes visible and which nothing had named:
//
//   - the memory key or design doc that justified a decision, pasted into the
//     direction a GM reads at the table ("see feedback_design_before_
//     characters_exist in project memory")
//   - an SRD quotation proving a rule is real, in place of the instruction it
//     was defending -- one beat cited GM Core's surrender guidance verbatim
//     with its file path, where "Demoralize works exactly as normal" was the
//     whole of what the GM needed
//   - design discussion deferred into a beat note ("worth reconsidering once
//     the six real PCs exist")
//
// WHAT IS DELIBERATELY ALLOWED. A pointer to something the GM needs is not
// provenance: "Read ideas/story/dossier-cicada.md §3 and §4 before running
// this" is the most useful sentence in that beat. Provenance answers "why is
// this text the way it is"; a pointer answers "what do you need to go and
// read". Nine repo paths survive in the corpus and all nine are pointers.
// So this test bans the specific tells, not references in general.
//
// SCOPE. `direction`, `note`, `text` and `readAloud` on beats and checks --
// everything a GM reads while running. Scene-level `notes` and `designNotes`
// are explicitly NOT in scope: those are the right home for exactly this
// material, which is why the fix for a finding here is usually to move it
// rather than to delete it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const FIELDS = ["direction", "note", "text", "readAloud"];

const TELLS = [
  {
    name: "a memory key quoted into play text",
    re: /\b(?:feedback|project|reference)_[a-z0-9]+_[a-z0-9_]+/,
    fix: "Say the rule, not the key that stores it."
  },
  {
    name: "an SRD citation used to prove a rule rather than state it",
    re: /reference\/srd\/|\b(?:GM|Player) Core's own\b/i,
    fix: "Give the GM the ruling in one sentence. The citation belongs in the scene's own notes."
  },
  {
    name: "design discussion deferred into play text",
    re: /worth reconsidering|once (?:the |there are )?(?:six )?real (?:PCs|players|characters) exist|revisit (?:this )?(?:once|when)|still feel right once/i,
    fix: "An open question belongs in open-questions.json or the scene notes, not in a direction read at the table."
  },
  {
    name: "correction archaeology naming the discarded version",
    re: /\bthis used to be\b|\bused to say\b|\bwas previously\b|\bhas been (?:rebuilt|redesigned|revised)\b|\bno longer (?:says|reads|does)\b/i,
    fix: "Describe what to do now. Git holds what it was."
  }
];

function playTextFields() {
  const out = [];
  for (const dir of ["scene-briefs", "challenges"]) {
    const full = path.join(repoRoot, "data", dir);
    for (const name of readdirSync(full).filter((n) => /^(?:episode-)?c1e[12]/.test(n) && n.endsWith(".json"))) {
      const doc = JSON.parse(readFileSync(path.join(full, name), "utf8"));
      for (const listKey of ["beats", "checks"]) {
        for (const item of doc[listKey] ?? []) {
          for (const field of FIELDS) {
            const value = item[field];
            if (typeof value === "string" && value) {
              out.push({ where: `${name.replace(/\.json$/, "")}/${item.id}.${field}`, value });
            }
          }
        }
      }
    }
  }
  return out;
}

for (const tell of TELLS) {
  test(`no ${tell.name}`, () => {
    const hits = playTextFields()
      .filter((f) => tell.re.test(f.value))
      .map((f) => {
        const at = f.value.search(tell.re);
        return `${f.where}: "...${f.value.slice(Math.max(0, at - 40), at + 80).replace(/\s+/g, " ")}..."`;
      });
    assert.deepEqual(hits, [], `${tell.fix}\n  `);
  });
}

test("the corpus is actually being read", () => {
  const fields = playTextFields();
  assert.ok(fields.length > 200, `expected the authored corpus, found ${fields.length} play-text fields`);
});
