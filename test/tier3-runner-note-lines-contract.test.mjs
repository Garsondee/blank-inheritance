// Tier 3 — the Scene Runner shows a labelled note as a list and keeps every note's line breaks (D056).
//
// Found in Ingram's screenshot of The Road In: a note written in sections arrived as one block, because
// directions and notes were rendered into a <p> with no white-space rule, set in the condensed label face at
// 13px in the dimmest colour. This holds the three parts together: the view builds `noteLines`, the beat
// template lays them out with the Secret marked, and the stylesheet keeps line breaks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mod = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "module", "blank-inheritance");
const runner = readFileSync(path.join(mod, "scripts/foundry/scene-runner.mjs"), "utf8");
const beat = readFileSync(path.join(mod, "templates/runner/beat.hbs"), "utf8");
const css = readFileSync(path.join(mod, "styles/bi-components.css"), "utf8");

const rule = (selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `no rule for ${selector}`);
  return css.slice(at, css.indexOf("}", at));
};

test("the beat view builds noteLines from the note, escaped and with emphasis", () => {
  assert.match(runner, /import \{ parseNoteLines \} from "\.\.\/core\/note-lines\.mjs";/);
  assert.match(runner, /noteLines: \(parseNoteLines\(beat\.note\) \?\? \[\]\)\.map/);
  assert.match(runner, /html: renderProse\(line\.text, escapeHtml\)/, "each line goes through the same escape-then-emphasis path as the note");
  assert.match(runner, /isSecret: line\.kind === "secret"/);
});

test("the beat template lays out labelled lines, marks a Secret, and falls back to the paragraph", () => {
  assert.match(beat, /\{\{#if noteLines\.length\}\}/);
  assert.match(beat, /bi-runner__line\{\{#if isSecret\}\} bi-runner__line--secret\{\{\/if\}\}/);
  assert.match(beat, /<dt class="bi-runner__line-label">/);
  assert.match(beat, /<dd class="bi-runner__line-text">\{\{\{html\}\}\}<\/dd>/);
  assert.match(beat, /\{\{else\}\}\s*\{\{#if note\}\}<p class="bi-runner__note">\{\{\{decoratedNote\}\}\}<\/p>\{\{\/if\}\}/);
});

test("notes and directions keep their line breaks and are set in the readable face", () => {
  for (const selector of [".bi-runner__note", ".bi-runner__direction"]) {
    const r = rule(selector);
    assert.match(r, /white-space: pre-line;/, `${selector} must keep the author's line breaks`);
    assert.doesNotMatch(r, /--bi-font-condensed/, `${selector} is a paragraph, not a label`);
  }
  assert.doesNotMatch(rule(".bi-runner__note"), /--sr-text-dim/, "a note is read mid-scene: full-strength text");
});

test("every class the labelled-lines layout uses is styled", () => {
  for (const cls of ["bi-runner__lines", "bi-runner__line", "bi-runner__line-label", "bi-runner__line-text", "bi-runner__line--secret"]) {
    assert.ok(css.includes(`.${cls}`), `.${cls} has no style`);
  }
});
