// Builds the Casebook (the HTML page, published as an artifact) and its repo copy (Markdown), plus a standalone
// page per canon scene (preview.mjs) so a single scene can be read without the whole Casebook.
// Part Zero comes from canon/ (scenes written in detail, and the chapter plan); the rest is the version 8 outline in
// content/, which is old material until each part of it is rebuilt in canon/ (design/story-data-refactor.md).
//   node tools/casebook/build.mjs          writes tools/casebook/out/index.html, casebook.md and the scene previews
//   node tools/casebook/build.mjs --repo   also writes the repo copy (MD_PATH)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as C from "./content/content.mjs";
import { detailData, detailHtml, detailMarkdown, DETAIL_CSS } from "./detail.mjs";
import { writePreviews } from "./preview.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url)) + "/";
const REPO = path.resolve(DIR, "..", "..") + "/";
const OUT = DIR + "out/";
fs.mkdirSync(OUT, { recursive: true });
const D = detailData(REPO);
const MD_PATH = "ideas/story/blank-inheritance-twenty-chapters.md";
const URL = "https://claude.ai/artifact/SdqFGrbUWc6czj3UES8kb8";

// ------------------------------------------------------------------ inline markup
const TAGS = { C: ["canon", "Canon"], P: ["new", "Proposal"], G: ["gm", "GM-only"], F: ["flag", "Flag"] };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function h(s) {
  let t = esc(String(s));
  t = t.replace(/\[(C|P|G|F)\]\s*/g, (_, k) => `<span class="tag ${TAGS[k][0]}">${TAGS[k][1]}</span>`);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return t;
}
const m = (s) => String(s).replace(/\[(C|P|G|F)\]\s*/g, (_, k) => `*(${TAGS[k][1]})* `).trim();
const mcell = (s) => m(s).replace(/\|/g, "\\|");
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// ------------------------------------------------------------------ HTML pieces
const pt = (id, label, inner) => `<div class="pt" id="${id}"><a class="pid" href="#${id}">${label}</a><div>${inner}</div></div>`;
const table = (cls, head, rows) =>
  `<div class="tbl${cls ? " " + cls : ""}"><table><thead><tr>${head.map((x) => `<th>${h(x)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const tr = (cells, cls) => `<tr${cls ? ` class="${cls}"` : ""}>${cells.join("")}</tr>`;
const td = (s, cls) => `<td${cls ? ` class="${cls}"` : ""}>${h(s)}</td>`;

function chapterCard(ch) {
  const cls = ["chap", ch.built ? "built" : "", ch.loose ? "loose" : ""].filter(Boolean).join(" ");
  const parts = [];
  if (ch.table?.length) {
    parts.push(`<h5>At the table</h5><ol class="play">${ch.table.map((s) => `<li>${h(s)}</li>`).join("")}</ol>`);
  }
  if (ch.choices?.length) {
    parts.push(`<h5>Choices</h5><dl class="choices">${ch.choices.map(([q, a]) => `<dt>${h(q)}</dt><dd>${h(a)}</dd>`).join("")}</dl>`);
  }
  if (list(ch.find).length) {
    parts.push(`<h5>What they can find out</h5><ul class="find">${list(ch.find).map((s) => `<li>${h(s)}</li>`).join("")}</ul>`);
  }
  if (list(ch.gm).length) {
    parts.push(`<div class="gmbox"><h5><span class="tag gm">GM-only</span>GM notes</h5><ul>${list(ch.gm).map((s) => `<li>${h(s)}</li>`).join("")}</ul></div>`);
  }
  if (ch.watcher) parts.push(`<p class="wline"><span class="lbl">The Watcher</span>${h(ch.watcher)}</p>`);
  if (ch.leaves) parts.push(`<p class="after"><span class="lbl">Where it leaves them</span>${h(ch.leaves)}</p>`);
  return `<article class="${cls}" id="c${ch.n}">
<header><span class="no">${ch.n}</span><span class="ttl">${h(ch.title)}</span><span class="rank">${h(ch.rank)}</span></header>
<p class="line">${h(ch.line)}</p>
<div class="cbody">${parts.join("\n")}</div>
</article>`;
}

function bookSection(book, idx) {
  const sid = C.BOOK_SECTION_START + idx;
  const chs = C.CHAPTERS.filter((c) => c.book === book.n);
  const rows = book.rows.map(([k, v]) => `<dt>${h(k)}</dt><dd>${h(v)}</dd>`).join("");
  return `<section class="sec" id="s${sid}">
<h3><span class="sid">§${sid}</span><span>Book ${book.n}: ${h(book.name)}</span></h3>
<div class="book"><span class="bk">Book ${book.n} · ${h(book.name)}</span><span class="ch">${h(book.chapters.toUpperCase())}</span><span class="role">${h(book.role)}</span></div>
<dl class="bookrows">${rows}</dl>
${chs.map(chapterCard).join("\n")}
</section>`;
}

const S = C.SECTIONS; // section numbers, kept in one place so the page, the TOC and the Markdown agree

// ------------------------------------------------------------------ the page body
const body = `<div class="wrap">
<header class="mast">
  <div class="file"><span>特別対策本部 · Special Countermeasures HQ</span><span>File: <b>GM-ONLY</b></span><span>${h(C.META.version)}</span></div>
  <h1>Blank Inheritance <span>Casebook</span></h1>
  <p class="lede">${h(C.META.lede)}</p>
  <div class="legend">
    <span><span class="tag canon">Canon</span>settled in a decision (canon/decisions), a dossier or a built scene</span>
    <span><span class="tag new">Proposal</span>my draft, free to throw away</span>
    <span><span class="tag gm">GM-only</span>a secret the table mustn't get early</span>
    <span><span class="tag flag">Flag</span>open, or yours to decide</span>
  </div>
  <div class="changes" id="V8">
    <h2>What's new in version 8</h2>
    <ul>${C.META.changes.map((c) => `<li>${h(c)}</li>`).join("")}</ul>
  </div>
</header>

<nav class="toc" aria-label="Contents">
  <div class="cols">
  <h2>Written in detail</h2>
  <ol>
    <li><a href="#detail"><span>§0</span><span>Chapter 1, scene by scene</span></a></li>
  </ol>
  <h2>Before you read</h2>
  <ol>
    <li><a href="#s${S.truth}"><span>§${S.truth}</span><span>What's really going on</span></a></li>
    <li><a href="#s${S.words}"><span>§${S.words}</span><span>Words this Casebook uses</span></a></li>
    <li><a href="#s${S.cast}"><span>§${S.cast}</span><span>Who's who</span></a></li>
  </ol>
  <h2>How it works</h2>
  <ol>
    <li><a href="#s${S.mystery}"><span>§${S.mystery}</span><span>How the mystery works</span></a></li>
    <li><a href="#s${S.ladders}"><span>§${S.ladders}</span><span>How the party grows</span></a></li>
  </ol>
  <h2>The campaign</h2>
  <ol>
    <li><a href="#s${S.overview}"><span>§${S.overview}</span><span>Chapters 1–20 on one page</span></a></li>
    ${C.BOOKS.map((b, i) => `<li><a href="#s${C.BOOK_SECTION_START + i}"><span>§${C.BOOK_SECTION_START + i}</span><span>Book ${b.n}: ${h(b.name)}</span></a></li>`).join("\n    ")}
  </ol>
  <h2>Threads and choices</h2>
  <ol>
    <li><a href="#s${S.weave}"><span>§${S.weave}</span><span>Who's moving, Book by Book</span></a></li>
    <li><a href="#s${S.forks}"><span>§${S.forks}</span><span>The forks</span></a></li>
    <li><a href="#s${S.calls}"><span>§${S.calls}</span><span>Calls I made in this version</span></a></li>
    <li><a href="#s${S.added}"><span>§${S.added}</span><span>Gaps I filled</span></a></li>
    <li><a href="#s${S.yours}"><span>§${S.yours}</span><span>Still yours</span></a></li>
  </ol>
  <h2>Appendices</h2>
  <ol>
    <li><a href="#aA"><span>A</span><span>Three roads to every conclusion</span></a></li>
    <li><a href="#aB"><span>B</span><span>Chapter 1's clues, paid off</span></a></li>
    <li><a href="#aC"><span>C</span><span>The Watcher's children, generation by generation</span></a></li>
    <li><a href="#aD"><span>D</span><span>"How did it know?"</span></a></li>
    <li><a href="#aE"><span>E</span><span>Flashbacks</span></a></li>
  </ol>
  </div>
</nav>

<main>
${detailHtml(D, h)}
<div class="part" id="part1">
<header><div class="kicker">Part One</div><h2>Before you read</h2><p>The hidden truth, the words this Casebook uses, and the people in it. Read these three and the chapters make sense on their own.</p></header>

<section class="sec" id="s${S.truth}">
<h3><span class="sid">§${S.truth}</span><span>What's really going on</span></h3>
<div class="intro"><span class="tag gm">GM-only</span>${h(C.TRUTH_INTRO)}</div>
${C.TRUTH.map(([k, v], i) => pt(`T${i + 1}`, `T${i + 1}`, `<p><strong>${h(k)}</strong> ${h(v)}</p>`)).join("\n")}
<div class="watcherfile" id="voice">
<p class="hdr">The Watcher, in its own words · standing orders · no author · no addressee</p>
${C.VOICE.map((p) => `<p>${h(p)}</p>`).join("\n")}
</div>
</section>

<section class="sec" id="s${S.words}">
<h3><span class="sid">§${S.words}</span><span>Words this Casebook uses</span></h3>
<div class="intro">${h(C.WORDS_INTRO)}</div>
<dl class="gloss">${C.WORDS.map(([k, v]) => `<dt id="w-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${h(k)}</dt><dd>${h(v)}</dd>`).join("")}</dl>
</section>

<section class="sec" id="s${S.cast}">
<h3><span class="sid">§${S.cast}</span><span>Who's who</span></h3>
<div class="intro">${h(C.CAST_INTRO)}</div>
${C.CAST.map((g) => `<h4 class="sub">${h(g.group)}</h4>
${table("cast", ["Who", "What the players see", "The truth"], g.people.map((r) => tr([td(r[0], "id"), td(r[1]), td(r[2])])))}`).join("\n")}
</section>
</div>

<div class="part" id="part2">
<header><div class="kicker">Part Two</div><h2>How it works</h2><p>The mystery's shape, and how the party and their enemy grow together.</p></header>

<section class="sec" id="s${S.mystery}">
<h3><span class="sid">§${S.mystery}</span><span>How the mystery works</span></h3>
<div class="intro">${h(C.MYSTERY_INTRO)}</div>
<h4 class="sub">${S.mystery}.1 · One question per Book</h4>
${table("", ["Book", "The question", "The first answer on offer", "What's true", "Who holds the answer"],
  C.QUESTIONS.map((r) => tr([td(r[0], "id"), td(r[1]), td(r[2]), td(r[3]), td(r[4])])))}
<h4 class="sub">${S.mystery}.2 · Ten rules for this mystery</h4>
${C.RULES.map(([k, v], i) => pt(`R${i + 1}`, `R${i + 1}`, `<p><strong>${h(k)}</strong> ${h(v)}</p>`)).join("\n")}
<h4 class="sub">${S.mystery}.3 · Seeing it: the horror in three steps</h4>
${C.HORROR.map(([k, v], i) => pt(`H${i + 1}`, `H${i + 1}`, `<p><strong>${h(k)}</strong> ${h(v)}</p>`)).join("\n")}
<div class="callout"><p>${h(C.HORROR_LOGIC)}</p></div>
<h4 class="sub">${S.mystery}.4 · The dilemma</h4>
<div class="callout warn"><p>${h(C.DILEMMA)}</p></div>
<h4 class="sub">${S.mystery}.5 · The two faces of the problem</h4>
${C.FACES.map(([k, v], i) => pt(i === 0 ? "face-manako" : "face-watcher", i === 0 ? "M" : "W", `<p><strong>${h(k)}</strong> ${h(v)}</p>`)).join("\n")}
</section>

<section class="sec" id="s${S.ladders}">
<h3><span class="sid">§${S.ladders}</span><span>How the party grows</span></h3>
<div class="intro">${h(C.LADDERS_INTRO)}</div>
${table("", ["Book", "Chapters", "The party's rank", "How their jobs come", "What the Watcher has learned", "Manako's mood"],
  C.LADDERS.map((r) => tr([td(r[0], "id"), td(r[1], "lv"), td(r[2]), td(r[3]), td(r[4]), td(r[5])])))}
<div class="callout"><p>${h(C.LADDER_NOTE)}</p></div>
<h4 class="sub">${S.ladders}.1 · What runs under every chapter</h4>
${C.UNDERNEATH.map(([k, v], i) => pt(`U${i + 1}`, `U${i + 1}`, `<p><strong>${h(k)}</strong> ${h(v)}</p>`)).join("\n")}
</section>
</div>

<div class="part" id="part3">
<header><div class="kicker">Part Three</div><h2>The campaign, chapter by chapter</h2><p>${h(C.PART3_INTRO)}</p></header>
<section class="sec" id="s${S.overview}">
<h3><span class="sid">§${S.overview}</span><span>Chapters 1–20 on one page</span></h3>
<div class="callout"><p><strong>The story in one paragraph.</strong> ${h(C.SYNOPSIS)}</p></div>
${table("overview", ["Ch", "Title", "What the players do", "What they learn", "The Watcher"],
  C.BOOKS.flatMap((b) => [
    `<tr class="bookrow"><td colspan="5">Book ${b.n} · ${h(b.name)} · ${h(b.chapters)}</td></tr>`,
    ...C.CHAPTERS.filter((c) => c.book === b.n).map((c) =>
      tr([`<td class="ch"><a href="#c${c.n}">${c.n}</a></td>`, td(c.title), td(c.line), td(c.learn), td(c.watcherShort)])),
  ]))}
</section>
${C.BOOKS.map(bookSection).join("\n")}
</div>

<div class="part" id="part4">
<header><div class="kicker">Part Four</div><h2>Threads and choices</h2><p>Who is moving when, where the story genuinely forks, the calls I made in this version, the gaps I filled, and what's still yours.</p></header>

<section class="sec" id="s${S.weave}">
<h3><span class="sid">§${S.weave}</span><span>Who's moving, Book by Book</span></h3>
<div class="intro">Every force in play, Book by Book. Chapter numbers in brackets.</div>
${table("", ["", ...C.WEAVE_COLS], C.WEAVE.map((r) => tr([`<td class="id">${h(r[0])}</td>`, ...r.slice(1).map((x) => td(x))])))}
</section>

<section class="sec" id="s${S.forks}">
<h3><span class="sid">§${S.forks}</span><span>The forks</span></h3>
<div class="intro">${h(C.FORKS_NOTE)}</div>
${table("", ["The choice", "Ch", "What follows either way"], C.FORKS.map((r) => tr([td(r[0]), td(r[1], "lv"), td(r[2])])))}
</section>

<section class="sec" id="s${S.calls}">
<h3><span class="sid">§${S.calls}</span><span>Calls I made in this version</span></h3>
<div class="intro"><span class="tag new">Proposal</span>${h(C.CALLS_INTRO)}</div>
${C.CALLS.map(([k, v], i) => pt(`K${i + 1}`, `K${i + 1}`, `<p><strong>${h(k)}</strong> ${h(v)}</p>`)).join("\n")}
</section>

<section class="sec" id="s${S.added}">
<h3><span class="sid">§${S.added}</span><span>Gaps I filled</span></h3>
<div class="intro"><span class="tag new">Proposal</span>${h(C.GAPS_INTRO)}</div>
${C.GAPS.map(([k, v], i) => pt(`F${i + 1}`, `F${i + 1}`, `<p><strong>${h(k)}</strong> ${h(v)}</p>`)).join("\n")}
<div class="callout warn"><p>${h(C.NOT_FILLED)}</p></div>
</section>

<section class="sec" id="s${S.yours}">
<h3><span class="sid">§${S.yours}</span><span>Still yours</span></h3>
${C.STILL_YOURS.map(([k, v], i) => pt(`Y${i + 1}`, `Y${i + 1}`, `<p><span class="tag flag">Flag</span><strong>${h(k)}</strong> ${h(v)}</p>`)).join("\n")}
</section>
</div>

<div class="part" id="part5">
<header><div class="kicker">Appendices</div><h2>For the table</h2><p>The working parts: the clues, the plants, the enemy's pace, the "how did it know?" moments and the flashbacks.</p></header>

<section class="sec" id="aA">
<h3><span class="sid">A</span><span>Three roads to every conclusion</span></h3>
<div class="intro">${h(C.ROADS_NOTE)}</div>
${table("", ["What they can conclude", "Road 1", "Road 2", "Road 3", "Earliest"], C.ROADS.map((r) => tr([td(r[0]), td(r[1]), td(r[2]), td(r[3]), td(r[4], "lv")])))}
</section>

<section class="sec" id="aB">
<h3><span class="sid">B</span><span>Chapter 1's clues, paid off</span></h3>
<div class="intro"><span class="tag new">Proposal</span>${h(C.PLANTS_NOTE)}</div>
${table("", ["#", "What Chapter 1 shows them", "Pays off in", "What it turns out to be"], C.PLANTS.map((r) => tr([td(r[0], "id"), td(r[1]), td(r[2], "lv"), td(r[3])])))}
</section>

<section class="sec" id="aC">
<h3><span class="sid">C</span><span>The Watcher's children, generation by generation</span></h3>
<div class="intro">${h(C.GENERATIONS_NOTE)}</div>
${table("", ["", "Ch", "Name", "What it has learned", "What the party meets"], C.GENERATIONS.map((r) => tr([td(r[0], "id"), td(r[1], "lv"), td(r[2]), td(r[3]), td(r[4])])))}
</section>

<section class="sec" id="aD">
<h3><span class="sid">D</span><span>"How did it know?"</span></h3>
<div class="intro">${h(C.HOW_NOTE)}</div>
${table("", ["Ch", "What happens at the table"], C.HOW.map((r) => tr([td(r[0], "lv"), td(r[1])])))}
</section>

<section class="sec" id="aE">
<h3><span class="sid">E</span><span>Flashbacks</span></h3>
<div class="intro"><span class="tag new">Proposal</span>${h(C.FLASHBACK_NOTE)}</div>
${C.FLASHBACKS.map(([k, v], i) => pt(`E${i + 1}`, `E${i + 1}`, `<p><strong>${h(k)}.</strong> ${h(v)}</p>`)).join("\n")}
</section>
</div>

<footer class="foot">
  <p><strong>Where this lives:</strong> the same text is in the repo as <code>${MD_PATH}</code>, so later sessions can read it without this page. Your decisions are in <code>canon/decisions/</code>, one file each (D001 to D046 were split word for word from the old LEDGER).</p>
</footer>
</main>
</div>`;

// ------------------------------------------------------------------ extra CSS for v7
const EXTRA_CSS = `
/* ---------- v7: chapter cards told as play, the glossary, the cast ---------- */
.chap{margin:18px 0 18px 64px;border:1px solid var(--rule);background:var(--sheet);box-shadow:var(--shadow);max-width:820px;scroll-margin-top:16px}
.chap > header{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;padding:10px 14px 8px;border-bottom:1px solid var(--rule)}
.chap .no{font:400 34px/1 var(--display);color:var(--red);min-width:1.3em}
.chap .ttl{font:600 20px/1.25 var(--body);flex:1 1 12em}
.chap .rank{font:700 11px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.chap .line{margin:8px 14px 0;color:var(--ink-2);font-style:italic;max-width:68ch}
.chap .cbody{padding:4px 14px 12px}
.chap h5{margin:12px 0 4px;font:700 11px/1.6 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.chap ol.play{margin:0;padding-left:1.6em;max-width:70ch}
.chap ol.play li{margin:0 0 7px;padding-left:2px}
.chap ol.play li::marker{font:700 13px var(--mono);color:var(--red)}
.chap ul.find{margin:0;padding-left:1.2em;max-width:70ch}
.chap ul.find li{margin:0 0 5px}
.chap dl.choices{margin:0;display:grid;grid-template-columns:minmax(0,15em) minmax(0,1fr);gap:6px 14px;max-width:72ch}
.chap dl.choices dt{font-weight:600}
.chap dl.choices dd{margin:0}
.chap .gmbox{margin:12px 0 4px;padding:6px 12px 8px;border-left:3px solid var(--gm);background:var(--gm-bg)}
.chap .gmbox h5{margin-top:4px;color:var(--gm)}
.chap .gmbox ul{margin:0;padding-left:1.2em;max-width:70ch}
.chap .gmbox li{margin:0 0 5px}
.chap .wline,.chap .after{margin:10px 0 0;padding-top:8px;border-top:1px dotted var(--rule);max-width:72ch}
.chap .lbl{display:block;font:700 11px/1.6 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.chap.built{border-left:4px solid var(--canon)}
.chap.loose{border-style:dashed}
@media (max-width:620px){.chap{margin-left:0}.chap dl.choices{grid-template-columns:minmax(0,1fr);gap:0}.chap dl.choices dd{margin-bottom:8px}}
.bookrows{margin:8px 0 6px 64px;display:grid;grid-template-columns:136px minmax(0,1fr);gap:5px 14px;max-width:780px}
.bookrows dt{font:700 11px/1.75 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.bookrows dd{margin:0}
@media (max-width:620px){.bookrows{margin-left:0;grid-template-columns:minmax(0,1fr);gap:0}.bookrows dt{margin-top:8px}}
dl.gloss{margin:10px 0 0 64px;display:grid;grid-template-columns:minmax(0,12em) minmax(0,1fr);gap:8px 16px;max-width:820px}
dl.gloss dt{font-weight:700;scroll-margin-top:16px}
dl.gloss dd{margin:0;max-width:66ch}
@media (max-width:620px){dl.gloss{margin-left:0;grid-template-columns:minmax(0,1fr);gap:0}dl.gloss dd{margin-bottom:10px}}
.tbl.cast table{min-width:680px}
tr.bookrow td{background:var(--ground);font:700 12px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--red)}
td.ch{font:400 22px/1 var(--display);white-space:nowrap}
td.ch a{color:var(--red);text-decoration:none}
.tbl.overview table{min-width:760px}
code{font:14px/1 var(--mono)}
`;

// ------------------------------------------------------------------ write the page
let head = fs.readFileSync(DIR + "head.html", "utf8");
head = head.replace("</style>", EXTRA_CSS + DETAIL_CSS + "</style>");
// The publisher wraps the page in its own doctype/head/body skeleton, so the file starts at the title.
const PAGE = `${head}
${body}
`;
fs.writeFileSync(OUT + "index.html", PAGE);
for (const f of writePreviews(REPO, OUT)) console.log("wrote", path.relative(REPO, f));

// ------------------------------------------------------------------ the repo copy (Markdown)
const L = [];
const P = (s = "") => L.push(s);
P("# Blank Inheritance: the twenty chapters (draft)");
P();
P(`*${m(C.META.mdHeader)} The published page carries the same text: ${URL}. Edit this file and the page together, or the two will drift.*`);
P();
P("**What's new in version 8:**");
P();
C.META.changes.forEach((c) => P(`- ${m(c)}`));
P();
P(detailMarkdown(D, m));
P();
P(`## §${S.truth} What's really going on *(GM-only)*`);
P();
P(m(C.TRUTH_INTRO));
P();
C.TRUTH.forEach(([k, v], i) => P(`${i + 1}. **${k}** ${m(v)}`));
P();
P("**The Watcher, in its own words** (standing orders; no author; no addressee):");
P();
C.VOICE.forEach((p) => { P(`> ${p}`); P(">"); });
L.pop();
P();
P(`## §${S.words} Words this Casebook uses`);
P();
P(m(C.WORDS_INTRO));
P();
C.WORDS.forEach(([k, v]) => P(`- **${k}.** ${m(v)}`));
P();
P(`## §${S.cast} Who's who`);
P();
P(m(C.CAST_INTRO));
P();
C.CAST.forEach((g) => {
  P(`### ${g.group}`);
  P();
  P("| Who | What the players see | The truth |");
  P("|---|---|---|");
  g.people.forEach((r) => P(`| **${mcell(r[0])}** | ${mcell(r[1])} | ${mcell(r[2])} |`));
  P();
});
P(`## §${S.mystery} How the mystery works`);
P();
P(m(C.MYSTERY_INTRO));
P();
P(`### ${S.mystery}.1 One question per Book`);
P();
P("| Book | The question | The first answer on offer | What's true | Who holds the answer |");
P("|---|---|---|---|---|");
C.QUESTIONS.forEach((r) => P(`| ${r.map(mcell).join(" | ")} |`));
P();
P(`### ${S.mystery}.2 Ten rules for this mystery`);
P();
C.RULES.forEach(([k, v], i) => P(`${i + 1}. **${k}** ${m(v)}`));
P();
P(`### ${S.mystery}.3 Seeing it: the horror in three steps`);
P();
C.HORROR.forEach(([k, v]) => P(`- **${k}** ${m(v)}`));
P();
P(m(C.HORROR_LOGIC));
P();
P(`### ${S.mystery}.4 The dilemma`);
P();
P(m(C.DILEMMA));
P();
P(`### ${S.mystery}.5 The two faces of the problem`);
P();
C.FACES.forEach(([k, v]) => { P(`**${k}** ${m(v)}`); P(); });
P(`## §${S.ladders} How the party grows`);
P();
P(m(C.LADDERS_INTRO));
P();
P("| Book | Chapters | The party's rank | How their jobs come | What the Watcher has learned | Manako's mood |");
P("|---|---|---|---|---|---|");
C.LADDERS.forEach((r) => P(`| ${r.map(mcell).join(" | ")} |`));
P();
P(m(C.LADDER_NOTE));
P();
P(`### ${S.ladders}.1 What runs under every chapter`);
P();
C.UNDERNEATH.forEach(([k, v]) => P(`- **${k}** ${m(v)}`));
P();
P(`## §${S.overview} Chapters 1–20 on one page`);
P();
P("**The story in one paragraph.** " + m(C.SYNOPSIS));
P();
P("| Ch | Title | What the players do | What they learn | The Watcher |");
P("|---|---|---|---|---|");
C.BOOKS.forEach((b) => {
  P(`| | **Book ${b.n}: ${b.name}** (${b.chapters}) | | | |`);
  C.CHAPTERS.filter((c) => c.book === b.n).forEach((c) => P(`| ${c.n} | ${mcell(c.title)} | ${mcell(c.line)} | ${mcell(c.learn)} | ${mcell(c.watcherShort)} |`));
});
P();
P(m(C.PART3_INTRO));
P();
C.BOOKS.forEach((b, i) => {
  P(`## §${C.BOOK_SECTION_START + i} Book ${b.n}: ${b.name} (${b.chapters})`);
  P();
  P(`*${b.role}*`);
  P();
  b.rows.forEach(([k, v]) => P(`- **${k}:** ${m(v)}`));
  P();
  C.CHAPTERS.filter((c) => c.book === b.n).forEach((c) => {
    P(`### Chapter ${c.n}: ${c.title}`);
    P();
    P(`*${c.rank}.* ${m(c.line)}`);
    P();
    if (c.table?.length) { P("**At the table**"); P(); c.table.forEach((s, j) => P(`${j + 1}. ${m(s)}`)); P(); }
    if (c.choices?.length) { P("**Choices**"); P(); c.choices.forEach(([q, a]) => P(`- **${m(q)}** ${m(a)}`)); P(); }
    if (list(c.find).length) { P("**What they can find out**"); P(); list(c.find).forEach((s) => P(`- ${m(s)}`)); P(); }
    if (list(c.gm).length) { P("**GM notes** *(GM-only)*"); P(); list(c.gm).forEach((s) => P(`- ${m(s)}`)); P(); }
    if (c.watcher) { P(`**The Watcher:** ${m(c.watcher)}`); P(); }
    if (c.leaves) { P(`**Where it leaves them:** ${m(c.leaves)}`); P(); }
  });
});
P(`## §${S.weave} Who's moving, Book by Book`);
P();
P(`| | ${C.WEAVE_COLS.join(" | ")} |`);
P(`|---|${C.WEAVE_COLS.map(() => "---").join("|")}|`);
C.WEAVE.forEach((r) => P(`| **${mcell(r[0])}** | ${r.slice(1).map(mcell).join(" | ")} |`));
P();
P(`## §${S.forks} The forks`);
P();
P(m(C.FORKS_NOTE));
P();
P("| The choice | Ch | What follows either way |");
P("|---|---|---|");
C.FORKS.forEach((r) => P(`| ${r.map(mcell).join(" | ")} |`));
P();
P(`## §${S.calls} Calls I made in this version *(Proposals, except where your answer is noted)*`);
P();
P(m(C.CALLS_INTRO));
P();
C.CALLS.forEach(([k, v]) => P(`- **${k}** ${m(v)}`));
P();
P(`## §${S.added} Gaps I filled *(Proposals, except where marked accepted)*`);
P();
P(m(C.GAPS_INTRO));
P();
C.GAPS.forEach(([k, v]) => P(`- **${k}** ${m(v)}`));
P();
P(m(C.NOT_FILLED));
P();
P(`## §${S.yours} Still yours`);
P();
C.STILL_YOURS.forEach(([k, v]) => P(`- **${k}** ${m(v)}`));
P();
P("## Appendix A: three roads to every conclusion");
P();
P(m(C.ROADS_NOTE));
P();
P("| What they can conclude | Road 1 | Road 2 | Road 3 | Earliest |");
P("|---|---|---|---|---|");
C.ROADS.forEach((r) => P(`| ${r.map(mcell).join(" | ")} |`));
P();
P("## Appendix B: Chapter 1's clues, paid off *(Proposal)*");
P();
P(m(C.PLANTS_NOTE));
P();
P("| # | What Chapter 1 shows them | Pays off in | What it turns out to be |");
P("|---|---|---|---|");
C.PLANTS.forEach((r) => P(`| ${r.map(mcell).join(" | ")} |`));
P();
P("## Appendix C: the Watcher's children, generation by generation");
P();
P(m(C.GENERATIONS_NOTE));
P();
P("| | Ch | Name | What it has learned | What the party meets |");
P("|---|---|---|---|---|");
C.GENERATIONS.forEach((r) => P(`| ${r.map(mcell).join(" | ")} |`));
P();
P("## Appendix D: \"How did it know?\"");
P();
P(m(C.HOW_NOTE));
P();
P("| Ch | What happens at the table |");
P("|---|---|");
C.HOW.forEach((r) => P(`| ${r.map(mcell).join(" | ")} |`));
P();
P("## Appendix E: flashbacks *(Proposal)*");
P();
P(m(C.FLASHBACK_NOTE));
P();
C.FLASHBACKS.forEach(([k, v]) => P(`- **${k}.** ${m(v)}`));
P();

const md = L.join("\n");
fs.writeFileSync(OUT + "casebook.md", md);
if (process.argv.includes("--repo")) {
  const target = REPO + MD_PATH;
  const eol = fs.readFileSync(target, "utf8").includes("\r\n") ? "\r\n" : "\n";
  fs.writeFileSync(target, eol === "\r\n" ? md.replace(/\n/g, "\r\n") : md);
  console.log("wrote", target);
}
console.log("page", PAGE.length, "chars; markdown", md.length, "chars");
