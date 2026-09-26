// Tier 2 — the GM-facing prose style lint (design/gm-facing-prose-style.md §8).
//
// WHY THIS IS A TEST AND NOT A CONVENTION. The defect this guards against is
// invisible to the person committing it: every author of a scene brief is a
// designer, and designers can stop and think. A GM mid-session cannot. Over
// successive revision passes the designer-reader quietly won across this whole
// corpus -- 76 date stamps, 12 STALE/CORRECTED/REVISED labels, 18 "this used
// to say X" constructions and a verbal tic at 69 uses, none of which any
// individual commit would have looked wrong in. A standing document alone did
// not exist and would have drifted anyway; this is the enforcement.
//
// Scope: scene briefs and episode files -- the two things read while a session
// is actually running. Design docs, ideas/ and the bible are prep-time reading
// and are deliberately NOT linted; provenance genuinely belongs in those.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function loadAll() {
  const files = [];
  // Challenges are play-facing: a GM reads `outcomes.criticalSuccess` out at the
  // table the moment the dice land. They were outside this lint's scope until
  // a hand-scan turned up a date stamp and a cut-feature note sitting in one.
  for (const [dir, label] of [["scene-briefs", "scene-brief"], ["episodes", "episode"], ["challenges", "challenge"]]) {
    const abs = path.join(repoRoot, "data", dir);
    for (const name of readdirSync(abs).filter((f) => f.endsWith(".json"))) {
      files.push({ name, label, doc: JSON.parse(readFileSync(path.join(abs, name), "utf8")) });
    }
  }
  return files;
}

/** Every string leaf, with its JSON path. */
function strings(node, prefix = "", out = []) {
  if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${prefix}[${i}]`, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) strings(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (typeof node === "string") out.push({ p: prefix, s: node });
  return out;
}

const ALL = loadAll();

// `$schema` is a path by definition; ids are kebab-case machine values.
const NOT_PROSE = /(^|\.)(\$schema|id|type|.*Ref|.*Refs\[\d+\])$/;
// `authoring` (design/data-ownership.md, design/scene-signoff.md) is Sign-Off
// and Approvals Desk lifecycle bookkeeping bolted onto the entity -- who
// reviewed it, on what date, and what they said -- not content a GM reads at
// the table. Its `date`/`gradedAt` fields are schema-typed dates by design
// (common/authoring.schema.json), and its `note` fields are a reviewer's own
// record of a pass, not scene prose. Same reasoning as excluding `id`/`$ref`
// above: structural metadata, not prose, even though it is a string.
const NOT_TABLE_FACING = /(^|\.)authoring(\.|$)/;
const proseOf = (doc) => strings(doc).filter(({ p }) => !NOT_PROSE.test(p) && !NOT_TABLE_FACING.test(p));

function violations(rule) {
  const found = [];
  for (const { name, doc } of ALL) {
    for (const { p, s } of proseOf(doc)) {
      const hit = rule(s, p);
      if (hit) found.push(`${name} :: ${p} :: ${typeof hit === "string" ? hit : s.slice(0, 90).replace(/\n/g, " ")}`);
    }
  }
  return found;
}

test("no date stamps in play-facing text -- provenance belongs in git, not in a file read at the table", () => {
  const v = violations((s) => {
    const m = s.match(/\b20\d\d-\d\d-\d\d\b/);
    return m ? `...${s.slice(Math.max(0, m.index - 50), m.index + 30).replace(/\n/g, " ")}...` : null;
  });
  assert.deepEqual(v, [], `date stamps found:\n  ${v.join("\n  ")}`);
});

test("no STALE/CORRECTED/REVISED/NEW status labels -- the file states what is true, not its own edit history", () => {
  const v = violations((s) => /\b(STALE|CORRECTED|REVISED|SUPERSEDED)\b/.test(s) || /\bNEW\b(?= \d|,| --)/.test(s));
  assert.deepEqual(v, [], `status labels found:\n  ${v.join("\n  ")}`);
});

test("no correction archaeology -- negation makes a GM build the discarded version first", () => {
  // The subject has to be the TEXT. "He used to be something" is a line of
  // dialogue about an old man in a tea house, not a file discussing its own
  // history, and an earlier version of this rule flagged it.
  const TEXTISH = "(?:this|it|which|the (?:text|line|field|note|scene|file|version|draft|entry|passage|wording|brief|check|beat))";
  const v = violations((s) =>
    new RegExp(`\\b${TEXTISH} (?:used to|previously) (?:say|said|be|been|claim|claimed|read)\\b`, "i").test(s) ||
    // The same defect written without any of the words above -- found by hand
    // scan after the first version of this rule passed a corpus that had it.
    /\ban earlier (?:version|design|draft|wording)\b/i.test(s) ||
    /\bwas (?:cut|removed|replaced|dropped) (?:entirely|from this|for )/i.test(s) ||
    /\bused to (?:say|read|be called|be named)\b/i.test(s)
  );
  assert.deepEqual(v, [], `correction archaeology found:\n  ${v.join("\n  ")}`);
});

test("punctuation is Scene-Runner-safe: straight quotes and -- only", () => {
  const v = violations((s) => {
    const m = s.match(/[‘’“”—]/);
    return m ? `${JSON.stringify(m[0])} in "...${s.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, " ")}..."` : null;
  });
  assert.deepEqual(v, [], `curly quotes or em-dashes found:\n  ${v.join("\n  ")}`);
});

test("no prose field is a byte-identical twin of another in the same file (field-path clobber guard)", () => {
  const found = [];
  for (const { name, doc } of ALL) {
    const byValue = new Map();
    for (const { p, s } of proseOf(doc)) {
      if (s.length < 60) continue;
      if (!byValue.has(s)) byValue.set(s, []);
      byValue.get(s).push(p);
    }
    for (const [s, paths] of byValue) {
      if (paths.length > 1) found.push(`${name} :: ${paths.join(" == ")} :: ${s.slice(0, 70).replace(/\n/g, " ")}...`);
    }
  }
  assert.deepEqual(found, [], `duplicated prose (right value, possibly wrong path):\n  ${found.join("\n  ")}`);
});

test("the \"X's own Y\" style attractor stays rare and contrastive", () => {
  let count = 0;
  const examples = [];
  for (const { name, doc } of ALL) {
    for (const { p, s } of proseOf(doc)) {
      for (const m of s.matchAll(/\b\w+'s own \w+/g)) {
        count++;
        if (examples.length < 12) examples.push(`${name} :: ${p} :: ${m[0]}`);
      }
    }
  }
  // Measured: 69 across the corpus before the sweep, 13 after, all contrastive.
  // The ceiling is a ratchet -- it should fall over time, never climb.
  assert.ok(count <= 20, `"X's own Y" used ${count} times (ceiling 20). It is an editing artefact, not a voice:\n  ${examples.join("\n  ")}`);
});

test("the \"not X so much as Y\" construction stays rare -- caught at two uses", () => {
  // Found by reading two adjacent scenes aloud rather than by any check: The
  // Night Off had "not guarded so much as observed" and The Exercise, the very
  // next scene, had "not appear to have been waiting so much as simply already
  // present". Two is where a construction stops being a choice and starts being
  // a habit, so the ratchet goes on at two rather than at sixty-nine, which is
  // where the last one was caught.
  let count = 0;
  const examples = [];
  for (const { name, doc } of ALL) {
    for (const { p, s } of proseOf(doc)) {
      for (const m of s.matchAll(/not [^."]{2,40}? so much as [^."]{2,50}/g)) {
        count++;
        if (examples.length < 8) examples.push(`${name} :: ${p} :: ${m[0]}`);
      }
    }
  }
  assert.ok(
    count <= 1,
    `"not X so much as Y" used ${count} times (ceiling 1). It is a good sentence once and a tic twice:\n  ${examples.join("\n  ")}`
  );
});

test("every note over 600 characters is broken into labelled sections a GM can skim", () => {
  const v = [];
  for (const { name, doc } of ALL) {
    for (const { p, s } of proseOf(doc)) {
      if (!/(^|\.)note$/.test(p) || s.length <= 600) continue;
      // A labelled section is an ALL-CAPS lead-in of two or more words, or a
      // numbered/blank-line-separated structure.
      const labelled = /(^|\n)[A-Z][A-Z ,'/-]{6,}[.:,]/.test(s) || s.split("\n\n").length >= 3;
      if (!labelled) v.push(`${name} :: ${p} :: ${s.length} chars, no labelled sections`);
    }
  }
  assert.deepEqual(v, [], `long unstructured notes:\n  ${v.join("\n  ")}`);
});

test("no detail is stated in more than one of firstThing / readAloud / landmark", () => {
  const v = [];
  const sig = (s) =>
    new Set(
      String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 4)
    );
  for (const { name, doc } of ALL) {
    const intro = doc.intro;
    if (!intro) continue;
    const pairs = [
      ["firstThing", "landmark"],
      ["readAloud", "landmark"],
    ];
    for (const [a, b] of pairs) {
      const A = sig(intro[a]), B = sig(intro[b]);
      if (!A.size || !B.size) continue;
      const shared = [...B].filter((w) => A.has(w));
      // A landmark naturally shares a noun or two; near-total overlap means it
      // is restating rather than orienting.
      if (shared.length >= 5 && shared.length / B.size > 0.6) {
        v.push(`${name} :: intro.${b} restates intro.${a} (${shared.length}/${B.size} content words shared: ${shared.slice(0, 8).join(", ")})`);
      }
    }
  }
  assert.deepEqual(v, [], `triple-stated detail:\n  ${v.join("\n  ")}`);
});

test("no beat readAloud duplicates its own scene's intro readAloud (the table would hear it twice)", () => {
  const v = [];
  for (const { name, doc } of ALL) {
    const intro = String(doc.intro?.readAloud ?? "").trim();
    if (intro.length < 80) continue;
    for (const beat of doc.beats ?? []) {
      const ra = String(beat.readAloud ?? "").trim();
      if (ra.length < 80) continue;
      if (ra === intro) v.push(`${name} :: beat ${beat.id} readAloud is identical to intro.readAloud`);
    }
  }
  assert.deepEqual(v, [], `duplicated read-aloud:\n  ${v.join("\n  ")}`);
});

// ---------------------------------------------------------------------------
// Structural craft rules. The rules above police how a sentence is written;
// these police whether the scene is built. Same reasoning for why they are
// tests: each one guards a defect that looks fine in the commit that adds it
// and only reads as a pattern across the whole corpus.
// ---------------------------------------------------------------------------

test("no line predicts what the players will feel, conclude or do", () => {
  // The hardest standing rule on the project: build the environment, never
  // assert the reaction. A GM reading "the party will find this funny" has been
  // handed an expectation their actual table is about to fail to meet.
  // The first version of this rule missed three real violations that an
  // external review found by hand. Two gaps: the subject list required a bare
  // "the player" and so skipped "a sharp player" and "neither"; and the verb
  // list covered interiority but not cognition -- remember, notice, see, work
  // out, clock, spot. Both are widened here, and the rule is re-checked against
  // known-bad and known-good strings below before it is trusted again.
  // "everyone" and "nobody" are deliberately NOT here. In this corpus they
  // almost always mean people in the world ("nobody enjoys the new reporting
  // forms" is a rumour about Directorate staff), and a rule that blocks correct
  // writing gets switched off.
  const SUBJECT = "(?:the |a |an |one |each )?(?:\\w+ )?(?:players?|table|party|group|neither|they)";

  // The defect wears the second person too, but only in its FUTURE-COGNITION
  // form. "You feel", "you hear", "louder than you would expect" is how a
  // read-aloud is supposed to be written and must never be flagged. "Which you
  // will learn is not the same thing" tells the players what they are going to
  // work out, and is the same defect as "the party will realise".
  const secondPerson = /\byou (?:will|are going to|would) (?:learn|realis|realiz|understand|work out|notice|discover|come to|find out|remember|conclude)/i;
  const MIND =
    "(?:feels?|will feel|realis|realiz|understand|conclude|decide|assume|expect|want to|love|enjoy|" +
    "find(?:s)? (?:it|this|that|them)|panic|forget|remember|notice|see (?:it|this|that|the)|know(?:s)? what|" +
    "work(?:s)? out|clock(?:s)? |spot(?:s)? |catch(?:es)? (?:it|this|that|on)|care about|twig|pick up on)";
  const ADVERB = "(?:all|each|then|now|immediately|probably|certainly)\\s+";
  const MODAL = "(?:will|will probably|are going to|is going to|would)\\s+";
  // Two shapes, both DECLARATIVE. A permissive construction is the correct way
  // to write this and must never be flagged: "let the table decide how they
  // want to tackle it" hands the choice to the players, where "the table will
  // decide to go in" takes it away. The difference is grammatical, so the rule
  // can see it.
  const future = new RegExp(`\\b${SUBJECT}\\s+(?:${ADVERB})?${MODAL}${MIND}`, "i");
  const present = new RegExp(`\\b${SUBJECT}\\s+(?:${ADVERB})?(?:feels?|realises|realizes|knows what|finds it|finds this|enjoys|understands)\\b`, "i");
  const PERMISSIVE = /\b(?:let|ask|if|whether|however|how|what|who|when|unless|because|so that|in case)\b[^.?!]{0,40}$/i;
  const v = violations((s) => {
    // In-fiction dialogue is a character speaking, not the file predicting.
    const outsideQuotes = s.replace(/"[^"]*"/g, " ");
    const m = outsideQuotes.match(future) ?? outsideQuotes.match(present) ?? outsideQuotes.match(secondPerson);
    if (!m) return null;
    if (PERMISSIVE.test(outsideQuotes.slice(0, m.index))) return null;
    return `...${outsideQuotes.slice(Math.max(0, m.index - 60), m.index + 90).replace(/\n/g, " ")}...`;
  });
  assert.deepEqual(v, [], `player-response predictions found:\n  ${v.join("\n  ")}`);
});

test("every cast member has a want that is not a restatement of their role", () => {
  // "Depth is free, wants are not" -- design/quests-objectives-and-threads.md.
  // A cast member without a legible want is scenery that talks. Length is NOT
  // the signal: "To get back to her floor" is four seconds of characterisation
  // and does more work than a paragraph would. The defect is a `wants` that
  // paraphrases the `role`, which leaves a GM with nothing to play against.
  const words = (s) =>
    new Set(String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3));
  const v = [];
  for (const { name, doc } of ALL) {
    for (const member of doc.cast ?? []) {
      const wants = String(member.brief?.wants ?? "").trim();
      const label = member.label ?? member.id ?? "?";
      if (wants.length < 12) {
        v.push(`${name} :: cast ${label} :: ${wants ? `wants is only "${wants}"` : "no wants"}`);
        continue;
      }
      const W = words(wants), R = words(member.role);
      if (!W.size || !R.size) continue;
      const shared = [...W].filter((w) => R.has(w));
      if (shared.length >= 3 && shared.length / W.size > 0.7) {
        v.push(`${name} :: cast ${label} :: wants restates role (${shared.join(", ")})`);
      }
    }
  }
  assert.deepEqual(v, [], `cast members without a real want:\n  ${v.join("\n  ")}`);
});

test("every optional beat says who it is for", () => {
  const v = [];
  for (const { name, doc } of ALL) {
    for (const beat of doc.beats ?? []) {
      if (beat.mandatory !== false) continue;
      const cond = String(beat.when?.condition ?? "").trim();
      if (!cond) v.push(`${name} :: beat ${beat.id} is optional but has no when.condition`);
    }
  }
  assert.deepEqual(v, [], `optional beats with no stated trigger:\n  ${v.join("\n  ")}`);
});

test("no two files share a near-identical note or direction", () => {
  // The field-path clobber guard catches byte-identical twins inside one file.
  // This catches the slower failure: a good sentence written once and then
  // pasted into the next scene until it is a corpus-wide tic.
  const seen = new Map();
  const v = [];
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  for (const { name, doc } of ALL) {
    for (const { p, s } of proseOf(doc)) {
      if (!/(^|\.)(note|direction)$/.test(p) || s.length < 120) continue;
      const key = norm(s);
      const prev = seen.get(key);
      if (prev && prev.name !== name) v.push(`${prev.name} :: ${prev.p}\n    and ${name} :: ${p}\n    both say: "${s.slice(0, 110).replace(/\n/g, " ")}..."`);
      else if (!prev) seen.set(key, { name, p });
    }
  }
  assert.deepEqual(v, [], `duplicated guidance across files:\n  ${v.join("\n  ")}`);
});

test("an intro readAloud over three sentences is built as droppable units", () => {
  // design/gm-facing-prose-style.md §5: three sentences is the ceiling, and it
  // may only be exceeded when the passage is separable units a GM can cut live.
  // A single seven-sentence block is not that -- it is a paragraph the GM has to
  // either read whole or improvise their way out of mid-breath.
  const sentences = (s) =>
    String(s ?? "")
      .split(/(?<=[.!?"])\s+/)
      .filter((x) => x.trim().length > 3).length;
  const v = [];
  for (const { name, doc } of ALL) {
    const ra = doc.intro?.readAloud;
    if (!ra) continue;
    const count = sentences(ra);
    const units = String(ra).split("\n\n").filter((u) => u.trim()).length;
    if (count > 3 && units < 3) {
      v.push(`${name} :: intro.readAloud is ${count} sentences in ${units} unit(s)`);
    }
  }
  assert.deepEqual(v, [], `read-alouds over the ceiling and not built to be cut:\n  ${v.join("\n  ")}`);
});

test("every speaking cast member has a hard line they will not cross", () => {
  // design/gm-facing-prose-style.md §6: a brief is a generator. Without a
  // willNotDiscuss entry a GM improvising an unanticipated question has nothing
  // to refuse with, and the character answers everything -- which is how an NPC
  // stops being a person and becomes a lookup table.
  //
  // walkOn cast are deliberately exempt: a silent figure visible in a line with
  // their rank legible has no lines to refuse with, and inventing some for them
  // would be the actual defect. See episode-c1e1--assembly.json's own notes.
  const v = [];
  for (const { name, doc } of ALL) {
    for (const member of doc.cast ?? []) {
      if (member.walkOn === true) continue;
      if (!(member.brief?.willNotDiscuss ?? []).length) {
        v.push(`${name} :: cast ${member.label ?? member.id} has no willNotDiscuss`);
      }
    }
  }
  assert.deepEqual(v, [], `speaking cast with nothing they refuse:\n  ${v.join("\n  ")}`);
});
