/**
 * Line layout for the Service Agreement (induction terminal, page 2). Pure: the caller supplies a
 * `measure(text, style)` function (a canvas context in the browser, a character-count stub in tests),
 * so the wrapping, justification and virtual scrolling can be tested without a DOM.
 *
 * A document is a list of blocks: { t: <type>, text, num? }. Types and how they're set:
 *   title, subtitle, h1, h2    centred headings
 *   p                          a paragraph, justified
 *   clause                     a numbered clause: `num` hangs in the left margin, text justified
 *   item                       a lettered sub-clause, indented one step further
 *   row                        a schedule row: `num` left, text right, not justified
 *   sig                        signature lines, left-aligned with space above
 *   ooc                        the closing out-of-character note, set apart and never justified
 */

export const STYLES = {
  title: { size: 1.6, weight: "bold", align: "center", before: 0.4, after: 0.3, caps: true },
  subtitle: { size: 1.0, weight: "normal", align: "center", before: 0, after: 0.8, italic: true },
  h1: { size: 1.15, weight: "bold", align: "center", before: 1.4, after: 0.6, caps: true },
  h2: { size: 1.0, weight: "bold", align: "left", before: 0.9, after: 0.3 },
  p: { size: 1.0, weight: "normal", align: "justify", before: 0, after: 0.45 },
  clause: { size: 1.0, weight: "normal", align: "justify", before: 0, after: 0.35, hang: 3.6 },
  item: { size: 1.0, weight: "normal", align: "justify", before: 0, after: 0.2, indent: 3.6, hang: 2.2 },
  row: { size: 0.95, weight: "normal", align: "left", before: 0, after: 0.1, hang: 7.5 },
  sig: { size: 1.0, weight: "normal", align: "left", before: 1.2, after: 0.4 },
  ooc: { size: 1.1, weight: "normal", align: "left", before: 2.4, after: 0.4, box: true },
};

/**
 * Lays blocks out at a given width. `em` is the base font size in px; `leading` the line-height
 * multiple. Returns { lines, height } where each line is { y, x, text, style, num?, words?, justify }.
 * `measure(text, styleName)` must return a width in px for `text` set in that style at this `em`.
 */
export function layout(blocks, { width, em = 11, leading = 1.35, measure }) {
  const lines = [];
  let y = 0;
  for (const block of blocks) {
    const st = STYLES[block.t] ?? STYLES.p;
    const lh = em * st.size * leading;
    y += st.before * em;
    const text = st.caps ? String(block.text).toUpperCase() : String(block.text);
    const indent = (st.indent ?? 0) * em;
    // The hanging number's column is at least the style's width, and wider when the number itself is
    // ("Clause 112.5(a)(iii)" used to run into its own row text).
    const hang = Math.max((st.hang ?? 0) * em, block.num != null ? measure(String(block.num), block.t) + em * 0.8 : 0);
    const inset = st.box ? em : 0;
    const left = indent + (block.num != null ? hang : 0) + inset;
    const avail = Math.max(em * 4, width - left - inset);
    const wrapped = wrap(text, avail, (s) => measure(s, block.t));
    wrapped.forEach((ln, i) => {
      const last = i === wrapped.length - 1;
      lines.push({
        y, x: left, width: avail, text: ln, style: block.t,
        num: i === 0 && block.num != null ? { text: String(block.num), x: indent + inset } : null,
        align: st.align,
        justify: st.align === "justify" && !last && ln.includes(" "),
        box: st.box ? { first: i === 0, last } : null,
      });
      y += lh;
    });
    y += st.after * em;
  }
  return { lines, height: Math.ceil(y + em * 2) };
}

/** Greedy word wrap. Never splits a word unless the word alone is wider than the line. */
export function wrap(text, width, measure) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const out = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (!line || measure(candidate) <= width) { line = candidate; continue; }
    out.push(line);
    line = w;
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

/** Indices [first, last) of the lines that intersect the viewport, via binary search on y. */
export function visibleRange(lines, top, height, pad = 40) {
  const lo = top - pad, hi = top + height + pad;
  let a = 0, b = lines.length;
  while (a < b) { const m = (a + b) >> 1; if (lines[m].y < lo) a = m + 1; else b = m; }
  let end = a;
  while (end < lines.length && lines[end].y <= hi) end++;
  return [a, end];
}

/** Word count of a block list, for the "estimated reading time" line. */
export function wordCount(blocks) {
  let n = 0;
  for (const b of blocks) n += String(b.text).split(/\s+/).filter(Boolean).length;
  return n;
}

/** "4 hours 12 minutes" at a steady 200 words a minute. */
export function readingTime(words, wpm = 200) {
  const minutes = Math.max(1, Math.round(words / wpm));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  const hs = h ? `${h} hour${h === 1 ? "" : "s"}` : "";
  const ms = m ? `${m} minute${m === 1 ? "" : "s"}` : "";
  return [hs, ms].filter(Boolean).join(" ");
}
