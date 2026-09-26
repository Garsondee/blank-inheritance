#!/usr/bin/env node
// Stale absence-claim detector. See design/node-registry.md §8's "third bug class."
//
// Scans design/**/*.md, ideas/story/**/*.md, and CLAUDE.md for prose claiming something
// doesn't exist yet ("not yet written", "doesn't exist", "unbuilt", ...), paired with a
// specific file/path reference nearby, and checks that claim against the real filesystem.
//
// Two confidence tiers, on purpose -- natural-language matching has real false positives,
// so this is a review tool, not a silent auto-fixer:
//   - HIGH confidence: a trigger phrase, within the same paragraph as a path-shaped token,
//     and that exact path resolves to a real file on disk right now. This is a PROVEN stale
//     claim -- the file exists, the sentence says it doesn't. These are what the test below
//     asserts zero of.
//   - LOW confidence: a trigger phrase with no resolvable path nearby, or a path that
//     doesn't resolve (genuinely still unwritten, or a vague/future reference). Reported for
//     human/AI review, never asserted on -- most of these are correct as written.
//
// Simple by design, matching this project's other lints (test/tier0-architecture.test.mjs,
// tools/node-registry/generate.mjs) -- pattern matching over prose, not a language model.
// Real false negatives are expected (a claim phrased in a way this doesn't recognise); real
// false positives are expected in the LOW tier (a phrase that isn't actually a completion
// claim). The HIGH tier is deliberately conservative to keep false positives near zero there.
//
// Usage: node tools/node-registry/detect-stale-claims.mjs

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");

function walk(dir, matches, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, matches, out);
    else if (matches(entry)) out.push(full);
  }
  return out;
}

function relPath(file) {
  return path.relative(repoRoot, file).replace(/\\/g, "/");
}

// ---------------------------------------------------------------- trigger phrases

// Ordered roughly by how confidently each one signals "this thing doesn't exist" rather than
// some other meaning ("TBD" alone is noisy -- e.g. a placeholder VALUE, not a missing file --
// so it's included but expected to contribute mostly LOW-tier noise, not HIGH-tier hits).
const TRIGGER_PHRASES = [
  "not yet written",
  "not yet built",
  "not yet authored",
  "not yet a brief",
  "not yet exist",
  "not yet created",
  "doesn't exist yet",
  "does not exist yet",
  "hasn't been written",
  "has not been written",
  "hasn't been built",
  "has not been built",
  "no file exists",
  "still unwritten",
  "still needs to be written",
  "unwritten as of",
  "outlined.{0,40}not yet",
];

const TRIGGER_RE = new RegExp(`(${TRIGGER_PHRASES.join("|")})`, "gi");

// Confirmed-false-positive shape this tool can't cleanly rule out with regex alone: a path
// cited as the grammatical SUBJECT of a sentence ("`design/map-generation.md` describes...")
// whose absence claim is actually about a different noun phrase entirely ("that renaming
// layer does not exist yet"). Explicit and documented, same pattern as tier2-data-corpus.
// test.mjs's own EXCLUDED_PATH_SEGMENTS -- a short, reasoned allowlist beats silently
// swallowing every future case of this shape. Re-verify each entry still applies before
// trusting it; don't add to this list without checking the claim by hand first.
const KNOWN_FALSE_POSITIVES = new Set([
  // design/japanese-narrative-conventions.md, checked 2026-09-19: the absence claim is about
  // "that renaming layer" (an unbuilt process), not about design/map-generation.md itself
  // (the design doc, which obviously exists -- it's what's cited as describing the process).
  "design/japanese-narrative-conventions.md::design/map-generation.md",
]);

// A path-shaped token: backtick-wrapped (most common in this project's own prose) or bare,
// starting with one of the repo's real top-level content dirs, ending in a known extension.
const PATH_RE = /(\(?)`?((?:data|design|ideas|module|tools|test|reference)\/[\w./-]+\.(?:json|mjs|md|py|hbs))`?(\)?)/g;

// This project's dominant citation idiom is a bare parenthetical right after the claim --
// "**Some decision** (`design/some-file.md`): ..." or "(see design/some-file.md)" -- where the
// path is evidence FOR a nearby statement, not the subject of it. Confirmed as the majority
// false-positive shape in this tool's first real run (2026-09-19): "the renaming layer does
// not exist yet" cited `design/map-generation.md` (which obviously exists, since it's what
// describes the layer); "epic #165, not yet built" cited `design/approvals-desk.md` and
// `test/gazetteer/test_server.py` the same way. A parenthesized path is downgraded to LOW
// confidence rather than excluded outright -- still worth a human glance, just not asserted on.
function isBareParentheticalCitation(match, window) {
  const [full, openParen, , closeParen] = match;
  if (openParen && closeParen) return true; // `(design/x.md)` -- both parens present, own token
  const before = window.slice(Math.max(0, match.index - 12), match.index);
  const after = window.slice(match.index + full.length, match.index + full.length + 6);
  // "see `path`" / "see path" is this project's other dominant bare-citation idiom, distinct
  // from the parenthetical one but just as common -- e.g. "... rather than writing anything —
  // see `test/gazetteer/test_server.py`'s retirement tests," where the actual absence claim a
  // sentence earlier is about a different, unrelated noun phrase entirely.
  return /\($/.test(before) || /^[):]/.test(after.trim()) || /\bsee\s+`?$/i.test(before);
}

// ---------------------------------------------------------------- proximity window
//
// Deliberately NOT "split on blank lines" -- a markdown bullet list (CLAUDE.md's directory
// structure section, for one) has no blank lines between items, so that approach treats a
// whole multi-thousand-character list as one "paragraph" and matches a trigger phrase against
// path tokens many bullets away with no real relationship. A trigger and its path have to
// share an actual SENTENCE, not just a loosely-bounded block.

const SENTENCE_BOUNDARY_RE = /[.!?](?:\s|$)/g;

/** The sentence (or sentence-ish clause) containing position `at` in `source`. */
function sentenceAround(source, at) {
  let start = 0;
  SENTENCE_BOUNDARY_RE.lastIndex = 0;
  let m;
  while ((m = SENTENCE_BOUNDARY_RE.exec(source))) {
    if (m.index >= at) break;
    start = m.index + m[0].length;
  }
  SENTENCE_BOUNDARY_RE.lastIndex = at;
  const next = SENTENCE_BOUNDARY_RE.exec(source);
  const end = next ? next.index + 1 : Math.min(source.length, at + 300);
  return source.slice(Math.max(start, at - 300), Math.min(end, at + 300));
}

// ---------------------------------------------------------------- scan

export function detectStaleClaims() {
  const files = [
    ...walk(path.join(repoRoot, "design"), (f) => f.endsWith(".md")),
    ...walk(path.join(repoRoot, "ideas", "story"), (f) => f.endsWith(".md")),
  ];
  const claudeMd = path.join(repoRoot, "CLAUDE.md");
  if (existsSync(claudeMd)) files.push(claudeMd);

  const high = [];
  const low = [];
  const seen = new Set(); // dedupe identical (file, trigger-position, path) hits

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    TRIGGER_RE.lastIndex = 0;
    let triggerMatch;
    while ((triggerMatch = TRIGGER_RE.exec(source))) {
      const window = sentenceAround(source, triggerMatch.index);
      PATH_RE.lastIndex = 0;
      const pathMatches = [...window.matchAll(PATH_RE)];
      const dedupeKey = `${file}:${triggerMatch.index}`;

      if (pathMatches.length === 0) {
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          low.push({
            file: relPath(file),
            trigger: triggerMatch[0],
            excerpt: window.trim().slice(0, 220),
            reason: "no resolvable path found in the same sentence",
          });
        }
        continue;
      }

      for (const pm of pathMatches) {
        const p = pm[2];
        const key = `${dedupeKey}:${p}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const target = path.join(repoRoot, p);
        const bareCitation = isBareParentheticalCitation(pm, window);
        const knownFalsePositive = KNOWN_FALSE_POSITIVES.has(`${relPath(file)}::${p}`);
        const entry = {
          file: relPath(file),
          trigger: triggerMatch[0],
          referencedPath: p,
          excerpt: window.trim().slice(0, 220),
        };
        if (existsSync(target) && knownFalsePositive) {
          low.push({ ...entry, reason: "on the documented known-false-positive allowlist -- re-verify by hand before trusting that, don't just skip it" });
        } else if (existsSync(target) && !bareCitation) {
          high.push({ ...entry, reason: "referenced path EXISTS despite the absence claim -- likely stale" });
        } else if (existsSync(target)) {
          low.push({ ...entry, reason: "path exists but looks like a bare parenthetical citation, not the claim's real subject -- worth a glance, not asserted on" });
        } else {
          low.push({ ...entry, reason: "referenced path does not exist -- claim is plausibly still true" });
        }
      }
    }
  }

  return { high, low, filesScanned: files.length };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const { high, low, filesScanned } = detectStaleClaims();
  console.log(`stale-claim scan: ${filesScanned} file(s), ${high.length} HIGH-confidence, ${low.length} LOW-confidence.`);
  if (high.length > 0) {
    console.log("\nHIGH confidence (referenced path exists -- review these first):");
    for (const h of high) {
      console.log(`  ${h.file} -- "${h.trigger}" re: ${h.referencedPath}\n    ${h.excerpt}`);
    }
  }
  if (low.length > 0) {
    console.log(`\n${low.length} LOW-confidence candidate(s) not printed by default -- most are correct as written.`);
  }
  if (high.length > 0) process.exitCode = 1;
}
