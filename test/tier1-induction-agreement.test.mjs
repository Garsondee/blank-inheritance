// FORM 1-B, the Service Agreement on the induction terminal's page 2 (design/induction-agreement.md).
// Pure tests: the codec, the layout, the build, and the rules the text must keep (every hook buried and
// placed, the joke note last, nothing that leaks what players shouldn't know, nothing shipped in plain text).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import { scramble, bytesToBase64, base64ToBytes, pack, unpack, encodeUtf8, decodeUtf8, FORMAT } from "../module/blank-inheritance/scripts/core/agreement-codec.mjs";
import { wrap, layout, visibleRange, readingTime, wordCount } from "../module/blank-inheritance/scripts/core/agreement-layout.mjs";
import { buildDocument, packDocument, renderGmCopy, ASSET_PATH, GM_PATH } from "../tools/induction-agreement/build.mjs";
import { HOOKS, OOC_NOTE } from "../tools/induction-agreement/source.mjs";
import { SYNCED_CAMPAIGN_DIRS } from "../tools/module-sync/stage-campaign-data.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doc = buildDocument();

test("codec: scramble is its own inverse, base64 and pack round-trip", () => {
  for (const n of [0, 1, 2, 3, 4, 5, 97, 1000]) {
    const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 0xff);
    assert.deepEqual(scramble(scramble(bytes)), bytes);
    assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes);
    assert.deepEqual(unpack(pack(bytes)), bytes);
  }
  assert.equal(decodeUtf8(encodeUtf8("Kurose — 黒瀬")), "Kurose — 黒瀬");
  assert.ok(pack(new Uint8Array([1, 2, 3])).startsWith(`${FORMAT}\n`));
  assert.throws(() => unpack("something else\nAAAA"), /Not a bi-agreement/);
});

test("layout: wraps to width, never justifies a last line, and finds the visible lines", () => {
  const measure = (s) => s.length; // one pixel per character
  assert.deepEqual(wrap("aa bb cc dd", 5, measure), ["aa bb", "cc dd"]);
  assert.deepEqual(wrap("", 5, measure), [""]);
  const { lines, height } = layout([{ t: "clause", num: "1.1", text: "one two three four five six seven" }, { t: "p", text: "tail" }], { width: 60, em: 10, measure });
  assert.ok(lines.length >= 2);
  assert.equal(lines[0].num.text, "1.1");
  assert.equal(lines.filter((l) => l.num).length, 1, "the number hangs on the first line only");
  const clauseLines = lines.filter((l) => l.style === "clause");
  assert.equal(clauseLines.at(-1).justify, false);
  assert.ok(height > lines.at(-1).y);
  const [a, b] = visibleRange(lines, lines[1].y, 1, 0);
  assert.ok(a <= 1 && b >= 2);
  assert.equal(readingTime(12000), "1 hour");
  assert.equal(readingTime(57000), "4 hours 45 minutes");
  assert.equal(wordCount([{ text: "a b c" }, { text: "d" }]), 4);
});

test("build: deterministic, absurdly long, every hook placed and buried", () => {
  assert.deepEqual(buildDocument(), doc, "same source, same document");
  assert.ok(doc.words >= 40000, `only ${doc.words} words; the brief is 'absurdly long'`);
  for (const id of Object.keys(HOOKS)) {
    const ref = doc.hookRefs[id];
    assert.ok(ref, `hook ${id} was never placed`);
    const [article, clause] = ref.split(".").map(Number);
    assert.ok(clause >= 3, `hook ${id} at ${ref} is too near the top of its Article to be buried`);
    assert.ok(article >= 5, `hook ${id} at ${ref} is too early in the document`);
  }
});

test("build: the out-of-character joke note is the very last thing, and says plainly it isn't a real contract", () => {
  const last = doc.blocks.at(-1);
  assert.equal(last.t, "ooc");
  assert.match(last.text, /OUT OF CHARACTER/);
  assert.match(last.text, /a joke/);
  assert.match(last.text, /not a real contract/);
  assert.match(last.text, /binds your character, not you/);
  assert.equal(doc.blocks.filter((b) => b.t === "ooc").length, 1);
  assert.equal(last.text, `${OOC_NOTE[0]}. ${OOC_NOTE[1]}`);
});

test("build: nothing in the player text leaks what the table shouldn't know yet", () => {
  // Text only: the generated numbering legitimately runs (A)…(Z), (AA)…(AI)… and isn't prose.
  const text = doc.blocks.map((b) => b.text).join("\n");
  const forbidden = [
    /\bWatcher\b/i, /\bObserver\b/i, /\bResonance\b/i, /\bBleed\b/i, /ground roles?/i, /\bAnchors?\b/, /\bSuppression\b/i,
    /\blevel[- ]12\b/i, /\bGap\b/, /\bstarship\b/i, /\bspaceship\b/i, /\bships?\b/i, /\b19[0-9]{2}s?\b/, /\bSap\b/, /mitflit/i,
    /\bDNA\b/, /\bClaude\b/, /\bLLM\b/, /\bAI\b/, /Baldwin/, /Abraxas/, /\bcharter\b/i, /\bKortos\b/, /\bEnvoy\b/, /\bCicada\b/,
    /\bManako\b/, /conscript/i, /\bdraft(ed)?\b/i,
  ];
  for (const re of forbidden) assert.doesNotMatch(text, re, `player-facing agreement mentions ${re}`);
});

test("the shipped asset is current, opaque, and decodes to exactly the built document", () => {
  const shipped = fs.readFileSync(ASSET_PATH, "utf8");
  assert.equal(shipped, packDocument(doc), "run: node tools/induction-agreement/build.mjs");
  for (const h of Object.values(HOOKS)) assert.ok(!shipped.includes(h.text.slice(0, 24)), "plain text leaked into the asset");
  assert.ok(!/Recruit|Directorate|biscuit/i.test(shipped));
  const json = JSON.parse(decodeUtf8(zlib.inflateRawSync(unpack(shipped))));
  assert.deepEqual(json.blocks, doc.blocks);
  assert.equal(json.words, doc.words);
});

test("the GM copy is current, carries the hook index, and never ships", () => {
  assert.equal(fs.readFileSync(GM_PATH, "utf8"), renderGmCopy(doc), "run: node tools/induction-agreement/build.mjs");
  const gm = fs.readFileSync(GM_PATH, "utf8");
  for (const [id, ref] of Object.entries(doc.hookRefs)) assert.ok(gm.includes(`| ${ref} | ${id} |`), `hook index lacks ${id}`);
  const rel = path.relative(path.join(ROOT, "data"), GM_PATH).split(path.sep)[0];
  assert.ok(!SYNCED_CAMPAIGN_DIRS.includes(rel), `${rel}/ would sync the GM copy to the live server`);
  assert.ok(!path.relative(ROOT, GM_PATH).startsWith("module"), "the GM copy must not live in the module");
});

test("the page template carries no agreement text; the viewer blocks copying", () => {
  const hbs = fs.readFileSync(path.join(ROOT, "module/blank-inheritance/templates/induction/page1b-agreement.hbs"), "utf8");
  for (const h of Object.values(HOOKS)) assert.ok(!hbs.includes(h.text.slice(0, 24)));
  assert.match(hbs, /data-agreement-canvas/);
  assert.match(hbs, /data-action="signAgreement"/);
  assert.doesNotMatch(hbs, /data-action="(decline|refuse)/, "no way on without signing");
  const view = fs.readFileSync(path.join(ROOT, "module/blank-inheritance/scripts/foundry/induction-agreement-view.mjs"), "utf8");
  for (const ev of ["copy", "cut", "contextmenu", "selectstart", "dragstart"]) assert.ok(view.includes(`"${ev}"`), `viewer doesn't block ${ev}`);
  const css = fs.readFileSync(path.join(ROOT, "module/blank-inheritance/styles/bi-agreement.css"), "utf8");
  assert.match(css, /user-select: none/);
});
