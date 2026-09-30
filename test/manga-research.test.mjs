// Tier 0 — manga research shelf structural lint. Instant, no fixtures, no Foundry.
//
// design/research/manga/ is the research behind design/propaganda-manga.md, the
// Directorate's recruitment comic: six documents behind one index. It is not a
// close reading of one work like the Giant Robo and Evangelion shelves, so it
// has no characters/ folder and does not use their [S]/[R]/[U] tags; its
// discipline is a linked source for every factual claim and "(unverified)" for
// anything that could not be confirmed. What it shares with them, and what
// this file holds, is the part that rots silently when nothing executes it: a
// document renamed or never written, a file nobody indexed, a broken link, a
// dropped "Best sources" list, and above all the sentence saying it is
// research and not a decision. Losing that sentence is how a reference file
// starts getting quoted as canon.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const shelfRoot = path.join(repoRoot, "design", "research", "manga");
const plan = path.join(repoRoot, "design", "propaganda-manga.md");

// Exactly as design/research/manga/README.md §3 lists them.
const documents = [
  "page-craft-and-print.md",
  "lettering-and-sound-effects.md",
  "propaganda-and-unreliable-documents.md",
  "midjourney-and-the-print-look.md",
  "tooling-landscape.md",
  "period-look-and-language.md",
];

const read = (file) => readFileSync(file, "utf8");
const shelfFile = (name) => path.join(shelfRoot, name);

test("manga shelf: the index and every listed document exist", () => {
  assert.ok(existsSync(shelfFile("README.md")), "missing: design/research/manga/README.md");
  for (const doc of documents) {
    assert.ok(existsSync(shelfFile(doc)), `missing: design/research/manga/${doc}`);
  }
});

test("manga shelf: the shelf holds nothing the index does not list", () => {
  for (const file of readdirSync(shelfRoot).filter((f) => f.endsWith(".md"))) {
    assert.ok(
      file === "README.md" || documents.includes(file),
      `design/research/manga/${file} exists but is not a listed document`,
    );
  }
});

test("manga shelf: the index names every document", () => {
  const index = read(shelfFile("README.md"));
  for (const doc of documents) {
    assert.ok(index.includes(doc), `the manga shelf index never mentions ${doc}`);
  }
});

test("manga shelf: every document says it is research, not lore and not a decision", () => {
  for (const doc of ["README.md", ...documents]) {
    assert.match(
      read(shelfFile(doc)),
      /research, not lore/i,
      `design/research/manga/${doc} has lost its research-not-lore statement`,
    );
  }
});

test("manga shelf: every document has a title and keeps its Best sources list", () => {
  for (const doc of documents) {
    const body = read(shelfFile(doc));
    assert.match(body, /^# .+/m, `${doc} has no H1 title`);
    assert.match(body, /^## Best sources/m, `${doc} is missing its "Best sources" section`);
  }
});

test("manga shelf: no relative markdown link on the shelf or in the plan is broken", () => {
  // Resolved against each file's own directory, since shelf documents reach
  // back out to the plan with ../../ and the plan reaches in with research/manga/.
  for (const file of [plan, shelfFile("README.md"), ...documents.map(shelfFile)]) {
    const dir = path.dirname(file);
    for (const [, target] of read(file).matchAll(/\]\(([^)\s#]+\.md)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(target)) continue;
      assert.ok(
        existsSync(path.resolve(dir, target)),
        `${path.relative(repoRoot, file)} links to missing ${target}`,
      );
    }
  }
});

test("manga shelf: the plan and the shelf point at each other", () => {
  const planBody = read(plan);
  assert.ok(planBody.includes("design/research/manga/"), "the plan never points at its research shelf");
  for (const doc of documents) {
    assert.ok(planBody.includes(doc), `the plan never cites ${doc}`);
  }
  assert.ok(read(shelfFile("README.md")).includes("propaganda-manga.md"), "the shelf index never points at the plan");
});
