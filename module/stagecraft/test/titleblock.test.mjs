// The words on a card's title block (core/titleblock.mjs): a name and a line of text under it, from "Tama" to a paragraph, in
// Latin or Japanese, with the author's own line breaks or none, laid out to fit a plate without running off it.
// (Characters that are invisible or end a line are written \u{...} here: a plain \uXXXX is turned into the character itself
// by some editors' tools.)

import { test } from "node:test";
import assert from "node:assert/strict";
import { clean, textOf, atomsOf, wrap, ellipsize, fitText, fitBlock, stepSizes, graphemes, TITLE } from "../scripts/core/titleblock.mjs";

const CJK = /[\u{2e80}-\u{9fff}\u{ac00}-\u{d7af}\u{ff00}-\u{ffef}]/u;
/** A measuring function for a size: a letter is 0.55 of it wide, a space 0.3, a Japanese or Korean character 1. */
const measureAt = (size) => (s) => graphemes(s).reduce((w, g) => w + size * (CJK.test(g) ? 1 : g === " " ? 0.3 : 0.55), 0);

const NO_START = [..."、。，．・：；！？）］｝〕〉》」』】ゝゞー々ぁぃぅぇぉっゃゅょゎ"];
const NO_END = [..."（［｛〔〈《「『【"];

/* ------------------------------------------------------------------ what was typed */

test("clean: breaks are breaks however they were typed, and the rest is tidied", () => {
  assert.equal(clean("Kiku\r\nEnomoto"), "Kiku\nEnomoto");
  assert.equal(clean("Kiku\rEnomoto"), "Kiku\nEnomoto");
  assert.equal(clean("Kiku<br>Enomoto<br/>the clerk<BR />x"), "Kiku\nEnomoto\nthe clerk\nx");
  assert.equal(clean("Kiku\\nEnomoto"), "Kiku\nEnomoto", "a typed backslash and n, which is what a text box gives for a break");
  assert.equal(clean("Kiku\u{2028}Enomoto\u{2029}the clerk"), "Kiku\nEnomoto\nthe clerk");
  assert.equal(clean("  Kiku   \t Enomoto \n\n\n  the   clerk  "), "Kiku Enomoto\nthe clerk", "runs of spaces are one, blank lines go, lines are trimmed");
  assert.equal(clean("a\u{a0}b\u{3000}c\u{2009}d"), "a b c d", "odd spaces are plain ones");
  assert.equal(clean("a\u{0}b\u{7}c\u{200b}d\u{feff}e"), "abcde", "control characters and zero-width ones go");
  assert.equal(clean("e\u{301}"), "\u{e9}", "an accent typed apart is put together");
  assert.equal(clean(null), "");
  assert.equal(clean(undefined), "");
  assert.equal(clean(42), "42");
  assert.equal(clean("x".repeat(20), 10), "xxxxxxxxx…", "cut to its limit, ending in an ellipsis");
  assert.equal(clean("short", 10), "short");
});

test("textOf: a name, and a line of text under it: from a title of its own, or from a line break in the name", () => {
  assert.deepEqual(textOf({ name: "Tama" }), { name: "Tama", text: "" });
  assert.deepEqual(textOf({ name: "Tama", title: "the cook" }), { name: "Tama", text: "the cook" });
  assert.deepEqual(textOf({ name: "Tama\nthe cook" }), { name: "Tama", text: "the cook" }, "a break in the name is the name and its line of text");
  assert.deepEqual(textOf({ name: "Tama\nthe cook\nfrom the east wing" }), { name: "Tama", text: "the cook\nfrom the east wing" }, "and all the rest is the text, in the author's own lines");
  assert.deepEqual(textOf({ name: "Captain\nKobayashi", title: "of the Third Fleet" }), { name: "Captain\nKobayashi", text: "of the Third Fleet" }, "with a title of its own the name keeps its breaks");
  assert.deepEqual(textOf({ id: "summon-tama" }), { name: "summon-tama", text: "" }, "no name: the id, as the stage has always shown");
  assert.deepEqual(textOf({}), { name: "", text: "" });
  assert.deepEqual(textOf(null), { name: "", text: "" });
  assert.deepEqual(textOf({ name: "Tama", title: "   " }), { name: "Tama", text: "" }, "a title of nothing is none");
  assert.deepEqual(textOf({ name: "Tama<br>the cook" }), { name: "Tama", text: "the cook" });
  assert.ok(textOf({ name: "x".repeat(500) }).name.length <= TITLE.nameChars, "nobody reads five hundred letters on a card");
  assert.ok(textOf({ name: "a", title: "y".repeat(900) }).text.length <= TITLE.textChars);
});

test("tipFor: a card that says it all on its plate has no tooltip, one with more to say has", async () => {
  const { tipFor, titleKey } = await import("../scripts/core/titleblock.mjs");
  assert.equal(tipFor({ name: "Tama" }), null, "a short name is all there on the card");
  assert.equal(tipFor({ name: "Captain Isamu Kob" }), null, "under the length at which a name is made small");
  assert.deepEqual(tipFor({ name: "Captain Isamu Kobayashi-Takahashi" }), { name: "Captain Isamu Kobayashi-Takahashi", text: "" }, "a long name may have been made small or cut");
  assert.deepEqual(tipFor({ name: "Tama", title: "the cook\nfrom the east wing" }), { name: "Tama", text: "the cook\nfrom the east wing" }, "any line of text may have been cut");
  assert.deepEqual(tipFor({ name: "Tama\nthe cook" }), { name: "Tama", text: "the cook" }, "and a line break in the name is a line of text");
  assert.equal(tipFor({}), null);
  assert.equal(tipFor(null), null);
  assert.equal(tipFor({ name: "x".repeat(30) }, { long: 40 }), null, "the length is the caller's to set");
  assert.notEqual(titleKey({ name: "a" }), titleKey({ name: "b" }));
  assert.notEqual(titleKey({ name: "a" }), titleKey({ name: "a", title: "t" }));
  assert.equal(titleKey({ name: "a", title: "t", portrait: "x" }), titleKey({ name: "a", title: "t", portrait: "y" }), "only the words make a card look different");
});

/* ------------------------------------------------------------------ where lines may end */

test("atomsOf: words, spaces, a break after a hyphen, and a Japanese character each", () => {
  const kinds = (s) => atomsOf(s).map((a) => `${a.kind}:${a.text}`);
  assert.deepEqual(kinds("Kiku Enomoto"), ["word:Kiku", "space: ", "word:Enomoto"]);
  assert.deepEqual(kinds("Kobayashi-Takahashi"), ["word:Kobayashi-", "word:Takahashi"], "a line may end after a hyphen");
  assert.deepEqual(kinds("-x"), ["word:-x"], "a hyphen at the start of a word is not a place to break");
  assert.deepEqual(kinds("so- "), ["word:so-", "space: "], "nor one with nothing after it");
  assert.deepEqual(kinds("A/B"), ["word:A/", "word:B"]);
  const mr = atomsOf("Mr. 田中");
  assert.deepEqual(mr.slice(0, 2).map((a) => `${a.kind}:${a.text}`), ["word:Mr.", "space: "]);
  assert.ok(mr.slice(2).every((a) => a.kind === "cjk") && mr.slice(2).map((a) => a.text).join("") === "田中", "Japanese: a word where the browser knows the words, else a character each");
  assert.deepEqual(kinds("a    b"), ["word:a", "space: ", "word:b"], "a run of spaces is one");
  assert.deepEqual(kinds("e\u{301}"), ["word:e\u{301}"], "an accent stays with its letter");
  assert.deepEqual(kinds("👩‍🚀🚀"), ["word:👩‍🚀🚀"], "an emoji with its joiners is one character, and two emoji are not a place to break");
  assert.equal(atomsOf("。").at(0).noBefore, true);
  assert.equal(atomsOf("「").at(0).noAfter, true);
  assert.deepEqual(atomsOf(""), []);
});

/* ------------------------------------------------------------------ laying lines */

test("wrap: a text that fits is one line, and a long one is broken between words", () => {
  assert.deepEqual(wrap("Tama", measureAt(40), 400).map((l) => l.text), ["Tama"]);
  const lines = wrap("Captain Isamu Kobayashi of the Third Fleet", measureAt(40), 600);
  assert.ok(lines.length >= 2);
  assert.equal(lines.map((l) => l.text).join(" "), "Captain Isamu Kobayashi of the Third Fleet", "nothing is lost, and the words are whole");
  for (const l of lines) assert.ok(l.width <= 600 + 0.5, `"${l.text}" is ${l.width} wide`);
});

test("wrap: the lines are made even, so a short word is not left on a line of its own", () => {
  const text = "The quartermaster of the north gate";
  const width = 640;
  const lines = wrap(text, measureAt(40), width);
  assert.equal(lines.length, 2);
  // greedy would fill the first line to the brim and leave "gate" or "north gate" alone: these two are near one length
  const [a, b] = lines.map((l) => l.width);
  assert.ok(Math.abs(a - b) < width * 0.25, `${a} against ${b}`);
  assert.ok(lines.every((l) => l.text.split(" ").length >= 2), "no line is a single word here");
});

test("wrap: the author's own breaks are kept, and each part is wrapped by itself", () => {
  const lines = wrap("Kiku\nEnomoto", measureAt(40), 2000).map((l) => l.text);
  assert.deepEqual(lines, ["Kiku", "Enomoto"], "though both would fit on one line");
  const long = wrap("one two three four five six seven eight nine ten\nshort", measureAt(40), 500).map((l) => l.text);
  assert.equal(long.at(-1), "short");
  assert.ok(long.length >= 3);
});

test("wrap: a hyphen is a place to break, and a word wider than the plate is broken where it must be", () => {
  const hy = wrap("Kobayashi-Takahashi", measureAt(40), 330).map((l) => l.text);
  assert.deepEqual(hy, ["Kobayashi-", "Takahashi"]);
  const word = wrap("Pneumonoultramicroscopicsilicovolcanoconiosis", measureAt(40), 300);
  assert.ok(word.length >= 2);
  for (const l of word) assert.ok(l.width <= 300 + 0.5);
  assert.equal(word.map((l) => l.text).join(""), "Pneumonoultramicroscopicsilicovolcanoconiosis", "all of it, in order");
});

test("wrap: Japanese is broken between characters, never leaving a closing mark at the start of a line or an opening one at the end", () => {
  const text = "これは長い日本語の名前です。「テスト」を、ここに書きます。ありがとうー！（笑）";
  for (let chars = 3; chars <= 16; chars++) {
    const lines = wrap(text, measureAt(40), chars * 40);
    assert.equal(lines.map((l) => l.text).join(""), text, `${chars} to a line: nothing lost`);
    for (const l of lines) {
      const g = graphemes(l.text);
      assert.ok(!NO_START.includes(g[0]) || lines[0] === l, `${chars} to a line: a line begins with ${g[0]}: ${l.text}`);
      assert.ok(!NO_END.includes(g.at(-1)), `${chars} to a line: a line ends with ${g.at(-1)}: ${l.text}`);
      assert.ok(l.width <= chars * 40 + 1 || g.length === 1, `${chars} to a line: "${l.text}" is wider than the plate`);
    }
  }
});

test("wrap: Japanese is kept in whole words where the browser knows the words: a line does not end inside one", () => {
  const seg = new Intl.Segmenter("ja", { granularity: "word" });
  const known = Array.from(seg.segment("放課後")).length === 1;
  const atoms = atomsOf("放課後は図書室にいる。");
  assert.equal(atoms.map((a) => a.text).join(""), "放課後は図書室にいる。", "whatever the pieces, nothing is lost");
  if (!known) return;                                    // an engine without a dictionary breaks between characters, which is allowed
  assert.ok(atoms.some((a) => graphemes(a.text).length > 1), "some pieces are words");
  // at 11 to a line a character-by-character break would end the first line half way through 放課後
  const lines = wrap("二年B組の学級委員。放課後はいつも", measureAt(40), 11 * 40).map((l) => l.text);
  assert.equal(lines.join(""), "二年B組の学級委員。放課後はいつも");
  assert.ok(!/放課?$/.test(lines[0]), `the first line ends inside a word: ${lines[0]}`);
});

test("wrap: a Japanese word wider than the plate is broken where it must be", () => {
  const lines = wrap("放課後放課後放課後放課後", measureAt(40), 3 * 40);
  assert.equal(lines.map((l) => l.text).join(""), "放課後放課後放課後放課後");
  for (const l of lines) assert.ok(l.width <= 3 * 40 + 0.5, `${l.text} is ${l.width}`);
});

test("wrap: mixed Latin and Japanese, spaces and none", () => {
  const lines = wrap("Mr. 田中 of the 第三艦隊 unit", measureAt(40), 700).map((l) => l.text);
  assert.equal(lines.join(" ").replace(/ /g, ""), "Mr.田中ofthe第三艦隊unit");
});

test("wrap: nothing to lay is no lines", () => {
  assert.deepEqual(wrap("", measureAt(40), 500), []);
  assert.deepEqual(wrap("  \n \n", measureAt(40), 500), []);
});

/* ------------------------------------------------------------------ cutting */

test("ellipsize: what fits is left alone, and what does not ends in an ellipsis within the width, at a word where it can", () => {
  const m = measureAt(40);
  assert.equal(ellipsize("short", m, 400), "short");
  const cut = ellipsize("the quartermaster of the north gate", m, 500);
  assert.ok(cut.endsWith("…"));
  assert.ok(m(cut) <= 500 + 0.5, `${m(cut)}`);
  assert.ok(!/\s…$/.test(cut), "no space before the ellipsis");
  assert.match(cut, /^the (quartermaster|quarter)/);
  assert.equal(ellipsize("Kobayashi-Takahashi-Nakamura", m, 300).includes("-…"), false, "a hyphen is not left hanging before it");
  const jp = ellipsize("これは長い日本語の名前です", m, 240);
  assert.ok(jp.endsWith("…") && m(jp) <= 240 + 0.5);
});

/* ------------------------------------------------------------------ fitting */

const SIZES = stepSizes(60, 32);

test("stepSizes: from the largest down, each a little smaller, whole numbers, the smallest last", () => {
  const s = stepSizes(60, 32);
  assert.equal(s[0], 60);
  assert.equal(s.at(-1), 32);
  for (let i = 1; i < s.length; i++) assert.ok(s[i] < s[i - 1]);
  assert.ok(s.every(Number.isInteger));
  assert.deepEqual(stepSizes(20, 20), [20]);
  assert.deepEqual(stepSizes(10, 20), [20], "a maximum under the minimum is the minimum");
  assert.ok(stepSizes(60, 32).length >= 8 && stepSizes(60, 32).length <= 20);
});

test("fitText: the largest size that holds it, and the same text at a size too big is one that does not", () => {
  const spec = { measureAt, width: 480, sizes: SIZES, maxLines: 2, lineHeight: 1.1 };
  const short = fitText("Tama", spec);
  assert.equal(short.size, 60, "a short name is as large as it may be");
  assert.equal(short.lines.length, 1);
  assert.equal(short.truncated, false);
  assert.equal(fitText("Kiku Enomoto Takahashi", spec).size, 60, "two even lines of it still fit at the full size");
  const mid = fitText("Kiku Enomoto-Takahashi of the Third Fleet", spec);
  assert.ok(mid.size < 60 && mid.size >= 32, `${mid.size}`);
  assert.ok(mid.lines.length <= 2 && mid.lines.every((l) => l.width <= 480 + 0.5));
  assert.equal(mid.truncated, false);
  assert.ok(Math.abs(mid.height - mid.lines.length * mid.size * 1.1) < 1e-9);
});

test("fitText: what cannot be made to fit ends in an ellipsis, in the lines it may have, at the smallest size", () => {
  const long = "Captain Isamu Kobayashi-Takahashi the Third of the Seventh Fleet of the Outer Reach and its Dependencies";
  const r = fitText(long, { measureAt, width: 480, sizes: SIZES, maxLines: 2, lineHeight: 1.1 });
  assert.equal(r.truncated, true);
  assert.equal(r.size, 32);
  assert.equal(r.lines.length, 2);
  assert.ok(r.lines.at(-1).text.endsWith("…"));
  assert.ok(r.lines.every((l) => l.width <= 480 + 0.5));
  assert.ok(long.startsWith(r.lines[0].text), "it is the beginning that is kept");
});

test("fitText: more lines of the author's own than may be shown say so on the last one", () => {
  const r = fitText("one\ntwo\nthree\nfour", { measureAt, width: 480, sizes: stepSizes(30, 20), maxLines: 2, lineHeight: 1.1 });
  assert.equal(r.truncated, true);
  assert.deepEqual(r.lines.map((l) => l.text), ["one", "two…"]);
});

test("fitText: empty is no lines and no height", () => {
  const r = fitText("", { measureAt, width: 480, sizes: SIZES, maxLines: 2 });
  assert.deepEqual(r.lines, []);
  assert.equal(r.height, 0);
  assert.equal(r.truncated, false);
});

const BLOCK = { width: 460, maxHeight: 240, gap: 12, name: { max: 60, min: 32, maxLines: 2, lineHeight: 1.08 }, text: { max: 34, min: 24, maxLines: 3, lineHeight: 1.2 }, measureName: measureAt, measureText: measureAt };

test("fitBlock: a name alone is as large as it can be", () => {
  const b = fitBlock({ name: "Tama", text: "" }, BLOCK);
  assert.equal(b.name.size, 60);
  assert.equal(b.text, null);
  assert.equal(b.gap, 0);
  assert.equal(b.height, b.name.height);
  assert.deepEqual(b.truncated, { name: false, text: false });
});

test("fitBlock: a name and a line of text under it, both whole", () => {
  const b = fitBlock({ name: "Kiku Enomoto", text: "Class representative, 2B" }, BLOCK);
  assert.ok(b.name.size > b.text.size, "the name is the larger");
  assert.ok(b.text.lines.length >= 1);
  assert.equal(b.truncated.name, false);
  assert.equal(b.truncated.text, false);
  assert.ok(b.height <= BLOCK.maxHeight + 0.01);
  assert.equal(b.height, b.name.height + b.gap + b.text.height);
  assert.deepEqual(b.full, { name: "Kiku Enomoto", text: "Class representative, 2B" });
});

test("fitBlock: a long text gives way before the name does: the text is made smaller and shorter and the name stays large", () => {
  const long = "She has worked the intake desk since before the Guild had a name for it, and keeps a ledger of everyone who has come through, in her own cipher, which nobody has asked her about. ".repeat(2);
  const b = fitBlock({ name: "Kiku", text: long }, BLOCK);
  assert.equal(b.name.size, 60, "the name did not shrink for it");
  assert.equal(b.truncated.text, true);
  assert.ok(b.text.lines.at(-1).text.endsWith("…"));
  assert.ok(b.height <= BLOCK.maxHeight + 0.01);
  assert.equal(b.full.text.length > b.text.lines.map((l) => l.text).join(" ").length, true, "the full words are still there to be read");
});

test("fitBlock: a long name is made smaller, and only then cut", () => {
  const b = fitBlock({ name: "Kobayashi-Takahashi Isamu of the Third Fleet", text: "" }, BLOCK);
  assert.ok(b.name.size < 60 && b.name.size >= 32);
  assert.ok(b.name.lines.length <= 2);
  const absurd = fitBlock({ name: "Captain Isamu Kobayashi-Takahashi the Third of the Seventh Fleet of the Outer Reach and its Many Dependencies", text: "x" }, BLOCK);
  assert.equal(absurd.truncated.name, true);
  assert.equal(absurd.name.size, 32);
  assert.ok(absurd.height <= BLOCK.maxHeight + 0.01 || absurd.text === null);
});

test("fitBlock: a name in Japanese, and a line of text in Japanese under it", () => {
  const b = fitBlock({ name: "木村 悦子", text: "二年B組の学級委員。放課後はいつも図書室にいる。" }, BLOCK);
  assert.ok(b.name.lines.length >= 1 && b.text.lines.length >= 1);
  for (const l of [...b.name.lines, ...b.text.lines]) assert.ok(l.width <= BLOCK.width + 0.5, l.text);
  assert.ok(b.height <= BLOCK.maxHeight + 0.01);
});

test("fitBlock: a name is kept on one line while it can still be large, and not stacked at the largest size (found on the first look at the cards)", () => {
  const b = fitBlock({ name: "Kiku Enomoto-Taka", text: "" }, { ...BLOCK, name: { ...BLOCK.name, maxLines: 3 } });
  assert.equal(b.name.lines.length, 1, "one line, a little smaller, not two lines at the full size");
  assert.ok(b.name.size < 60 && b.name.size >= 42, `${b.name.size}`);
  const two = fitBlock({ name: "Kobayashi Takahashi Isamu", text: "" }, { ...BLOCK, name: { ...BLOCK.name, maxLines: 3 } });
  assert.equal(two.name.lines.length, 2, "but one line would be under 0.7 of the largest size, and two are larger");
  assert.ok(two.name.size > 33);
  const three = fitBlock({ name: "Captain Isamu Kobayashi-Takahashi the Third of the Seventh Fleet", text: "" }, { ...BLOCK, name: { ...BLOCK.name, maxLines: 3 } });
  assert.ok(three.name.lines.length === 3 && !three.truncated.name, "a third line shows a long name whole where two would cut it");
  const set = fitBlock({ name: "Kobayashi Takahashi Isamu", text: "" }, { ...BLOCK, name: { ...BLOCK.name, maxLines: 3, comfort: 0.5 } });
  assert.equal(set.name.lines.length, 1, "the share is the skin's to set");
});

test("fitBlock: a long name and a modest line of text: the text is shown whole and the name made a little smaller to leave it room", () => {
  const spec = { ...BLOCK, name: { ...BLOCK.name, maxLines: 3 } };
  const text = "Commander of the Seventh Fleet of the Outer Reach";
  const b = fitBlock({ name: "Captain Isamu Kobayashi-Takahashi Third", text }, spec);
  assert.equal(b.truncated.text, false, "the text is whole");
  assert.equal(b.truncated.name, false);
  assert.ok(b.name.size < 60 && b.name.size >= 60 * 0.62, `the name gave way a little: ${b.name.size}`);
  assert.equal(b.name.lines.length, 3);
  assert.ok(b.height <= spec.maxHeight + 0.01);
  // but never under its floor for the sake of a text that cannot be whole at any size: a paragraph is cut, and the name stays
  const paragraph = fitBlock({ name: "Captain Isamu Kobayashi-Takahashi Third", text: text.repeat(6) }, spec);
  assert.equal(paragraph.truncated.text, true);
  assert.ok(paragraph.name.size >= 60 * 0.62, `${paragraph.name.size}`);
  const tight = fitBlock({ name: "Captain Isamu Kobayashi-Takahashi Third", text }, { ...spec, maxHeight: 200 });
  assert.equal(tight.truncated.text, false, "in a plate with less room the name is made smaller still, down to its floor");
  assert.ok(tight.name.size >= 60 * 0.62 - 1);
});

test("fitBlock: a name with a break of the author's own keeps it", () => {
  const b = fitBlock({ name: "Captain\nKobayashi", text: "" }, BLOCK);
  assert.deepEqual(b.name.lines.map((l) => l.text), ["Captain", "Kobayashi"]);
});

test("fitBlock: nothing at all is nothing to draw", () => {
  const b = fitBlock({ name: "", text: "" }, BLOCK);
  assert.deepEqual(b.name.lines, []);
  assert.equal(b.height, 0);
});

/* ------------------------------------------------------------------ whatever it is given */

/** A small deterministic generator, so a failure can be read and run again. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

const PIECES = ["Kiku", "Enomoto", "the", "quartermaster", "of", "Kobayashi-Takahashi", "Pneumonoultramicroscopicsilicovolcanoconiosis", "A", "I", "x", "2B", "—", "/", "…", "(the", "clerk)", "O'Brien", "Ængus", "naïve", "ß", "👩‍🚀", "🙂🙂🙂🙂🙂🙂🙂🙂", "田中", "第三艦隊", "これは長い日本語の名前です。", "「テスト」", "ありがとうー！", "한국어이름입니다", "\n", "  ", "\\n", "<br>"];

test("whatever it is given: no line wider than the plate, no more lines than allowed, nothing invented, nothing out of order", () => {
  const rand = rng(20261004);
  const widths = [180, 320, 460, 560];
  // a seeded sweep that takes a minute at full size: `npm test` runs its first 60 cases, `npm run test:all` (BI_SLOW=1) all 400
  const cases = process.env.BI_SLOW === "1" ? 400 : 60;
  for (let n = 0; n < cases; n++) {
    const parts = Array.from({ length: 1 + Math.floor(rand() * 14) }, () => PIECES[Math.floor(rand() * PIECES.length)]);
    const raw = parts.join(rand() < 0.2 ? "" : " ");
    const width = widths[n % widths.length];
    const spec = { ...BLOCK, width, maxHeight: 60 * 2 * 1.08 + 12 + 24 * 3 * 1.2 + 10 };
    const person = rand() < 0.5 ? { name: raw } : { name: parts[0] ?? "", title: parts.slice(1).join(" ") };
    const { name, text } = textOf(person);
    const b = fitBlock({ name, text }, spec);
    const where = `#${n} width ${width}: ${JSON.stringify(raw)}`;
    for (const part of [b.name, b.text]) {
      if (!part) continue;
      assert.ok(part.lines.length <= (part === b.name ? spec.name.maxLines : spec.text.maxLines), `${where}: too many lines`);
      for (const l of part.lines) {
        assert.ok(l.width <= width + 0.5, `${where}: "${l.text}" is ${l.width} wide`);
        assert.ok(l.text.length > 0 && l.text === l.text.trim(), `${where}: an empty or untrimmed line "${l.text}"`);
      }
    }
    assert.ok(b.height <= spec.maxHeight + 0.01, `${where}: ${b.height} high`);
    // nothing invented: the letters shown, with the ellipsis and the spaces taken out, are the start of the full words
    for (const [part, full] of [[b.name, b.full.name], [b.text, b.full.text]]) {
      if (!part || !part.lines.length) continue;
      const shown = part.lines.map((l) => l.text).join("").replace(/…/g, "").replace(/\s+/g, "");
      const whole = full.replace(/…/g, "").replace(/\s+/g, "");
      assert.ok(whole.startsWith(shown.replace(/[,;:\-\u{2010}\u{2013}\u{2014}/\u{3001}\u{ff0c}]+$/u, "")) || whole.startsWith(shown), `${where}: "${shown}" is not the start of "${whole}"`);
    }
  }
});
