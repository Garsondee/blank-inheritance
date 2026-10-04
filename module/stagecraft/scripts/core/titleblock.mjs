/**
 * The words on a card's title block, laid out. Pure: it is given a way to measure text, and some numbers, and hands back
 * lines. It knows nothing about canvases, fonts or Foundry (render/titleblock.mjs measures and draws).
 *
 * A card's title block holds a NAME and, under it, a line of TEXT (a role, a description: "the attendant"). It has to take
 * whatever it is given, from "Tama" to a paragraph, in Latin or in Japanese, with line breaks of the author's own or none,
 * and show it in a plate of a fixed width without running off it:
 *
 *   - **Words, not strings.** A name that is a person's own line break ("Kiku\nEnomoto") is kept, a long one is broken
 *     between words, after a hyphen, and (in Japanese and Korean, which have no spaces) between characters, never putting
 *     a closing bracket or a full stop at the start of a line (kinsoku) or an opening one at the end.
 *   - **Balanced.** Lines are made as even as they can be, so a name does not leave one short word hanging on a line of
 *     its own.
 *   - **Fitted.** The name is drawn as large as it can be in the lines it may have; the text under it is made smaller, and
 *     then shorter, before the name is made smaller; what cannot be made to fit ends in an ellipsis, and the full words are
 *     still there to be read (`full`).
 *   - **A line break is a name and its line of text.** With no text of its own, a name with a break in it is the name
 *     (the first line) and the text (the rest): the way the stage has always been fed a second line.
 *
 * Sizes are in whatever unit the caller measures in (the pixels of the face's canvas).
 *
 * (Every character that is not plain ASCII and not printable is written \u{...} in this file: a plain \uXXXX is turned
 * into the character itself by some editors' tools, and U+2028 is a line end in a regular expression.)
 */

import { cleanBadges } from "./badges.mjs";

export const TITLE = Object.freeze({
  nameChars: 160,       // a name longer than this is cut: nobody reads more than this on a card
  textChars: 360,
  ellipsis: "\u{2026}",
  step: 0.06            // each size tried is this share smaller than the last
});

const EPS = 0.01;

/* ------------------------------------------------------------------ the words */

const segmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/** A string as its characters as a reader sees them (an accented letter, an emoji with its joiners, are one). */
export const graphemes = (s) => (segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s));

/** At most `max` characters, the last an ellipsis when it was cut. */
function limit(s, max) {
  const g = graphemes(s);
  return g.length > max ? `${g.slice(0, Math.max(0, max - 1)).join("").trimEnd()}${TITLE.ellipsis}` : s;
}

/**
 * What a person typed, made fit to lay out: one string, line breaks as "\n" (a typed `\n` and a `<br>` are breaks too),
 * no control characters, odd spaces plain, runs of spaces one, blank lines gone.
 */
export function clean(value, max = Infinity) {
  let s = String(value ?? "");
  try { s = s.normalize("NFC"); } catch { /* keep it as it is */ }
  s = s.replace(/<br\s*\/?>/gi, "\n").replace(/\\n/g, "\n");
  s = s.replace(/\r\n?|[\u{b}\u{c}\u{85}\u{2028}\u{2029}]/gu, "\n");
  s = s.replace(/[\u{0}-\u{8}\u{e}-\u{1f}\u{7f}-\u{9f}\u{200b}\u{feff}\u{2060}]/gu, "");
  s = s.replace(/[\t\u{a0}\u{1680}\u{2000}-\u{200a}\u{202f}\u{205f}\u{3000}]/gu, " ");
  s = s.split("\n").map((line) => line.replace(/ {2,}/g, " ").trim()).filter(Boolean).join("\n");
  return limit(s, max);
}

/**
 * The name and the text of a card, from a person: `{ name, text }`. A `title` of its own is the text, and the name keeps any
 * line breaks it has; without one, a name with a line break in it is the name and then the text.
 */
export function textOf(person) {
  const name = clean(person?.name ?? person?.id ?? "");
  const text = clean(person?.title ?? "", TITLE.textChars);
  if (text) return { name: limit(name, TITLE.nameChars), text };
  const [first = "", ...rest] = name.split("\n");
  return { name: limit(first, TITLE.nameChars), text: limit(rest.join("\n"), TITLE.textChars) };
}

/**
 * What a card's tooltip says, `{ name, text }`, or null when the card already says it all: a card with a line of text under
 * its name, or a name long enough to have been made small or cut, has more to read than its plate may show.
 */
export function tipFor(person, { long = 18 } = {}) {
  const { name, text } = textOf(person);
  if (!name && !text) return null;
  if (!text && graphemes(name).length <= long) return null;
  return { name, text };
}

/** What would make a card's face look different if it changed: its words and its badges. (A card's face is drawn once, and again when this does.) */
export const titleKey = (person) => JSON.stringify([person?.name ?? null, person?.title ?? null, cleanBadges(person?.badges)]);

/* ------------------------------------------------------------------ where a line may end */

/** Chinese, Japanese and Korean characters: no spaces between them, so a line may end after any one (but see kinsoku). */
const CJK = /[\u{1100}-\u{11ff}\u{2e80}-\u{303e}\u{3041}-\u{33ff}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{a960}-\u{a97f}\u{ac00}-\u{d7af}\u{f900}-\u{faff}\u{fe30}-\u{fe4f}\u{ff00}-\u{ffef}\u{20000}-\u{3134f}]/u;
/** Must not begin a line (kinsoku): closing brackets, full stops and commas, the long vowel mark, small kana. */
const NO_START = new Set([..."\u{3001}\u{3002}\u{ff0c}\u{ff0e}\u{30fb}\u{ff1a}\u{ff1b}\u{ff01}\u{ff1f}\u{ff09}\u{ff3d}\u{ff5d}\u{3015}\u{3009}\u{300b}\u{300d}\u{300f}\u{3011}\u{3019}\u{3017}\u{301f}\u{2019}\u{201d}\u{203c}\u{2047}\u{2048}\u{2049}\u{309d}\u{309e}\u{30fd}\u{30fe}\u{3005}\u{30fc}\u{301c}\u{ff5e}\u{2026}\u{2025}\u{3041}\u{3043}\u{3045}\u{3047}\u{3049}\u{3063}\u{3083}\u{3085}\u{3087}\u{308e}\u{3095}\u{3096}\u{30a1}\u{30a3}\u{30a5}\u{30a7}\u{30a9}\u{30c3}\u{30e3}\u{30e5}\u{30e7}\u{30ee}\u{30f5}\u{30f6}"]);
/** Must not end a line: opening brackets. */
const NO_END = new Set([..."\u{ff08}\u{ff3b}\u{ff5b}\u{3014}\u{3008}\u{300a}\u{300c}\u{300e}\u{3010}\u{3018}\u{3016}\u{301d}\u{2018}\u{201c}"]);
/** After one of these, inside a word, a line may end ("Kobayashi-" / "Takahashi"): hyphens, dashes, the slash. */
const HYPHENS = new Set(["-", "\u{2010}", "\u{2011}", "\u{2013}", "\u{2014}", "/"]);

/** Where a Japanese or Chinese text has its words (there are no spaces): a dictionary of the browser's own. Without one, every character is a place to break. */
const wordSegmenter = (() => {
  try { return typeof Intl !== "undefined" && typeof Intl.Segmenter === "function" ? new Intl.Segmenter("ja", { granularity: "word" }) : null; } catch { return null; }
})();

/** One piece of a run of Japanese, Chinese or Korean: a word where the browser knows the words, else a character. */
const cjkAtom = (text) => {
  const g = graphemes(text);
  return { text, kind: "cjk", noBefore: NO_START.has(g[0]), noAfter: NO_END.has(g.at(-1)) };
};

/** A run of those characters as pieces a line may end between: whole words (a line does not end inside 放課後) where it can. */
function cjkRun(run) {
  if (!wordSegmenter) return graphemes(run).map(cjkAtom);
  return Array.from(wordSegmenter.segment(run), (s) => cjkAtom(s.segment));
}

/** The pieces of a paragraph a line is made of: words, spaces, and Japanese or Korean words or characters. */
export function atomsOf(paragraph) {
  const gs = graphemes(paragraph);
  const atoms = [];
  let word = "";
  let run = "";
  const flush = (hyphen = false) => {
    if (word) { atoms.push({ text: word, kind: "word", hyphen }); word = ""; }
    if (run) { atoms.push(...cjkRun(run)); run = ""; }
  };
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i];
    if (/^\s+$/u.test(g)) {
      flush();
      if (atoms.at(-1)?.kind !== "space") atoms.push({ text: " ", kind: "space" });
    } else if (CJK.test(g)) {
      if (word) flush();
      run += g;
    } else {
      if (run) flush();
      word += g;
      const next = gs[i + 1];
      if (HYPHENS.has(g) && word.length > 1 && next !== undefined && /[\p{L}\p{N}]/u.test(next)) flush(true);
    }
  }
  flush();
  return atoms;
}

/** May a line end between these two neighbours? */
function canBreak(a, b) {
  if (a.kind === "space" || b.kind === "space") return true;
  if (a.noAfter || b.noBefore) return false;
  return a.kind === "cjk" || b.kind === "cjk" || a.hyphen === true;
}

/* ------------------------------------------------------------------ laying lines */

/**
 * A word wider than the whole line is broken wherever it must be: it becomes one piece per character. So is a unit that no
 * line may end inside (an opening bracket and the word it opens, a word and the mark that closes it) when the unit is wider
 * than the line: otherwise the bracket would be left at the end of one line and its word begin the next.
 */
function splitLong(atoms, measure, width) {
  const out = [];
  let i = 0;
  while (i < atoms.length) {
    let j = i;
    while (j + 1 < atoms.length && !canBreak(atoms[j], atoms[j + 1])) j++;
    const unit = atoms.slice(i, j + 1);
    const wide = unit.reduce((w, a) => w + (a.kind === "space" ? 0 : measure(a.text)), 0) > width + EPS;
    for (const a of unit) {
      const g = a.kind === "space" ? [] : graphemes(a.text);
      if (wide && g.length > 1) for (const ch of g) out.push(a.kind === "word" ? { text: ch, kind: "cjk" } : cjkAtom(ch));
      else out.push(a);
    }
    i = j + 1;
  }
  return out;
}

/** Fill lines greedily to `width`: [[from, to)] over the atoms, with leading spaces dropped. */
function greedy(atoms, widths, width) {
  const lines = [];
  const n = atoms.length;
  let i = 0;
  while (i < n) {
    while (i < n && atoms[i].kind === "space") i++;
    if (i >= n) break;
    const start = i;
    let w = 0;
    let cut = -1;                                   // where the line would end if it had to end now
    let j = i;
    for (; j < n; j++) {
      if (atoms[j].kind !== "space" && j > start && w + widths[j] > width + EPS) break;
      w += widths[j];
      if (j + 1 < n && canBreak(atoms[j], atoms[j + 1])) cut = j + 1;
    }
    const next = j >= n ? n : cut > start ? cut : j;
    lines.push([start, next]);
    i = next;
  }
  return lines;
}

const lineWidth = (atoms, widths, [from, to]) => {
  let end = to;
  while (end > from && atoms[end - 1].kind === "space") end--;
  let w = 0;
  for (let k = from; k < end; k++) w += widths[k];
  return w;
};

/**
 * Even lines: the narrowest width that still needs no more lines than the full width does (as CSS `text-wrap: balance`
 * does), so the lines are as near one length as the words allow.
 */
function balanced(atoms, widths, width) {
  const base = greedy(atoms, widths, width);
  if (base.length < 2) return base;
  // never narrower than the widest unit no line may end inside, or a line would be made to end inside it (leaving a closing mark at the start of the next)
  let lo = 0;
  for (let i = 0; i < atoms.length;) {
    let j = i;
    let w = atoms[i].kind === "space" ? 0 : widths[i];
    while (j + 1 < atoms.length && !canBreak(atoms[j], atoms[j + 1])) { j++; w += widths[j]; }
    lo = Math.max(lo, w);
    i = j + 1;
  }
  let hi = width;
  let best = base;
  for (let k = 0; k < 14 && hi - lo > 0.5; k++) {
    const mid = (lo + hi) / 2;
    const trial = greedy(atoms, widths, mid);
    if (trial.length <= base.length && trial.every((range) => lineWidth(atoms, widths, range) <= mid + EPS)) { best = trial; hi = mid; } else lo = mid;
  }
  return best;
}

/**
 * The lines of a text at one size: `[{ text, width, atoms, from, paragraph }]`. The author's own breaks are kept; each
 * paragraph is balanced on its own. `measure(s)` is the width of `s` at that size.
 */
export function wrap(text, measure, width) {
  const out = [];
  clean(text).split("\n").filter(Boolean).forEach((paragraph, p) => {
    const atoms = splitLong(atomsOf(paragraph), measure, width);
    if (!atoms.length) return;
    const widths = atoms.map((a) => measure(a.text));
    for (const [from, to] of balanced(atoms, widths, width)) {
      let end = to;
      while (end > from && atoms[end - 1].kind === "space") end--;
      const line = atoms.slice(from, end).map((a) => a.text).join("");
      out.push({ text: line, width: measure(line), atoms, from, paragraph: p });
    }
  });
  return out;
}

/** `text` cut to end in an ellipsis within `width`: at a word where it can be, else wherever. */
export function ellipsize(text, measure, width) {
  if (measure(text) <= width + EPS) return text;
  const gs = graphemes(text);
  let n = gs.length;
  while (n > 0 && measure(gs.slice(0, n).join("").trimEnd() + TITLE.ellipsis) > width + EPS) n--;
  let s = gs.slice(0, n).join("");
  const space = s.lastIndexOf(" ");
  if (space > s.length * 0.45 && /\S$/.test(s) && gs[n] !== undefined && gs[n] !== " ") s = s.slice(0, space);     // not half way through a word
  return s.trimEnd().replace(/[,;:\-\u{2010}\u{2013}\u{2014}/\u{3001}\u{ff0c}]+$/u, "") + TITLE.ellipsis;
}

/**
 * Lay a text at the largest of `sizes` (largest first) that holds it in at most `maxLines`, none wider than `width`:
 * `{ size, lines: [{ text, width }], height, truncated }`. When even the smallest cannot, it is the smallest, cut to
 * `maxLines`, the last ending in an ellipsis (`truncated`). `measureAt(size)` gives the measuring function for a size.
 */
export function fitText(text, { measureAt, width, sizes, maxLines, lineHeight = 1.15 }) {
  const made = (size, lines, truncated) => ({ size, lineHeight, lines: lines.map(({ text: t, width: w }) => ({ text: t, width: w })), height: lines.length * size * lineHeight, truncated });
  if (!clean(text)) return made(sizes.at(-1), [], false);
  for (const size of sizes) {
    const laid = wrap(text, measureAt(size), width);
    if (laid.length <= maxLines && laid.every((l) => l.width <= width + 0.5)) return made(size, laid, false);
  }
  // none fits whole: the smallest size, cut to `maxLines`
  const size = sizes.at(-1);
  const measure = measureAt(size);
  const laid = wrap(text, measure, width);
  const kept = laid.slice(0, maxLines);
  const last = kept.at(-1);
  // the last line kept carries the rest of its paragraph, cut to fit; if whole paragraphs after it are dropped, it says so too
  const rest = last.atoms.slice(last.from).map((a) => a.text).join("").trim();
  const more = laid.length > maxLines;
  const cut = more && measure(rest + TITLE.ellipsis) <= width + EPS ? rest + TITLE.ellipsis : ellipsize(rest, measure, width);
  kept[kept.length - 1] = { text: cut, width: measure(cut) };
  return made(size, kept, more || cut !== rest);
}

/** Sizes from `max` down to `min`, each a little smaller than the last, whole numbers, `min` always last. */
export function stepSizes(max, min, step = TITLE.step) {
  const out = [];
  for (let s = max; s > min; s = Math.min(s - 1, Math.round(s * (1 - step)))) out.push(s);
  out.push(min);
  return [...new Set(out)];
}

/**
 * The whole title block: the name as large as it can be, and the text under it as large as the room left allows, shorter
 * before the name is made smaller. `spec`:
 *
 *   width, maxHeight        the room the words may take (a plate's inside)
 *   name, text              { max, min, maxLines, lineHeight }: the sizes tried, and the most lines each may have
 *   name.comfort            a name stays on fewer lines while it can still be this share of its largest size (0.7)
 *   gap                     between the name and the text
 *   measureName(size), measureText(size)   the measuring functions
 *
 * Returns `{ name, text, gap, height, truncated: { name, text }, full: { name, text } }` where name and text are
 * `{ size, lines, height, truncated }` (text null when there is none).
 */
export function fitBlock({ name, text }, spec) {
  const { width, maxHeight, gap = 12 } = spec;
  const full = { name: clean(name), text: clean(text) };
  const nameSizes = stepSizes(spec.name.max, spec.name.min);
  const textSizes = stepSizes(spec.text.max, spec.text.min);
  const comfort = spec.name.comfort ?? 0.7;
  const fitName = (sizes, maxLines = spec.name.maxLines) => fitText(full.name, { measureAt: spec.measureName, width, sizes, maxLines, lineHeight: spec.name.lineHeight });
  const fitUnder = (room) => {
    // on as few lines as it can be, then as large as that allows: its sizes lie close together, so the lines are what make a
    // plate look compact or heavy (two lines at 34 are tidier than three at 36)
    for (let lines = 1; lines <= spec.text.maxLines; lines++) {
      for (const size of textSizes) {
        const t = fitText(full.text, { measureAt: spec.measureText, width, sizes: [size], maxLines: lines, lineHeight: spec.text.lineHeight });
        if (!t.truncated && t.height <= room + EPS) return t;
      }
    }
    // the smallest size, as many lines as the room has, the last ending in an ellipsis
    const small = textSizes.at(-1);
    const lines = Math.min(spec.text.maxLines, Math.floor((room + EPS) / (small * spec.text.lineHeight)));
    if (lines < 1) return null;
    return fitText(full.text, { measureAt: spec.measureText, width, sizes: [small], maxLines: lines, lineHeight: spec.text.lineHeight });
  };
  const done = (n, t) => ({
    name: n, text: t, gap: t ? gap : 0,
    height: n.height + (t ? gap + t.height : 0),
    truncated: { name: n.truncated, text: t?.truncated ?? false },
    full
  });
  // The name on as few lines as it can be and still be large (one line at 0.7 of the largest size is better than two at the
  // largest: "Kiku Enomoto" is not stacked), then on more lines, as large as they allow. The text under it is shown whole if
  // the name can be made a little smaller to leave it room (never under `floor` of its largest size); a text that could not
  // be shown whole however small the name (a paragraph) is cut, and the name is not made smaller for it.
  const floor = spec.name.max * (spec.name.floor ?? 0.62);
  let cut = null;
  search:
  for (let lines = 1; lines <= spec.name.maxLines; lines++) {
    const sizes = lines < spec.name.maxLines ? nameSizes.filter((s) => s >= spec.name.max * comfort) : nameSizes;
    for (const size of sizes) {
      if (cut && size < floor) break search;
      const n = fitName([size], lines);
      if (n.truncated || n.height > maxHeight + EPS) continue;
      if (!full.text) return done(n, null);
      const t = fitUnder(maxHeight - n.height - gap);
      if (!t) continue;
      if (!t.truncated) return done(n, t);
      cut ??= done(n, t);
    }
  }
  if (cut) return cut;
  // nothing fits whole: the name at its smallest, cut to its lines; the text in what room is left, or not at all
  const n = fitName([spec.name.min]);
  const t = full.text ? fitUnder(maxHeight - n.height - gap) : null;
  return done(n, t);
}
