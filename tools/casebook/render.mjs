// The Casebook's generated sections, drawn from derive.mjs's document as HTML (the page) and as Markdown (the repo
// copy). Nothing here is story: the only words are the page's own (labels, and a line on how to read each section).
//
// The tag vocabulary is the Casebook's own ([C] canon, [P] proposal, [G] GM-only, [F] flag), mapped onto ink and
// pencil the way the timeline page draws them (D070):
//   Ink            decided by Ingram, or accepted from Claude with her say-so            (was [C] Canon)
//   Awaiting read  told by a scene she has not approved yet; Claude's proposal she is reading
//   Pencil · hers  her own earlier words, filed as she said them, waiting for her second look
//   Pencil · Claude  Claude's draft (the imported outline, the ideas): free to throw away  (was [P] Proposal)
//   Open           a decision still hers                                                   (was [F] Flag)
//   GM-only        known by few or nobody in the world: a secret the table mustn't get early  (was [G])
import { clip } from "./derive.mjs";

export const TAGS = {
  ink: { cls: "canon", label: "Ink" },
  wait: { cls: "wait", label: "Awaiting read" },
  "pencil-hers": { cls: "hers", label: "Pencil · hers" },
  "pencil-claude": { cls: "new", label: "Pencil · Claude" },
  open: { cls: "flag", label: "Open" },
  cut: { cls: "cut", label: "Cut" },
};
const GM = { cls: "gm", label: "GM-only" };
/** The tag's words for a record (a proposal reads "Proposal", not "Awaiting read"). */
export const tagLabel = (v) => (!v.tag ? "" : v.tag === "wait" && v.status === "proposal" ? "Proposal" : TAGS[v.tag].label);
/** The class a record is drawn in, which is what makes pencil lighter than ink. */
const toneOf = (tag) => ({ ink: "ink", wait: "wait", "pencil-hers": "pencil hers", "pencil-claude": "pencil claude", open: "open", cut: "cut" })[tag] || "";
/** A class list with no stray spaces, and a ready-made ` class="..."` that is left out when there is nothing to say. */
const cls = (...parts) => parts.filter(Boolean).join(" ");
const classAttr = (...parts) => (cls(...parts) ? ` class="${cls(...parts)}"` : "");

export const PACE_GLYPH = { up: "▲", down: "▼", lateral: "▬" };
const PACE_WORD = { up: "lift", down: "let-down", lateral: "hold" };

// ------------------------------------------------------------------ text

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");

/** Inline formatting for canon's text: `code` (linked when it names something on the page), **bold** and *emphasis*. */
export function makeInline(anchors) {
  // A code span is set aside while the rest is read, so **bold** and *emphasis* may wrap one.
  const NUL = String.fromCharCode(0);
  const back = new RegExp(`${NUL}(\\d+)${NUL}`, "g");
  return function h(raw) {
    const codes = [];
    let t = String(raw ?? "").replace(/`([^`]+)`/g, (_, code) => { codes.push(code); return `${NUL}${codes.length - 1}${NUL}`; });
    t = esc(t);
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
    return t.replace(back, (_, i) => {
      const code = codes[Number(i)];
      const href = anchors?.get(code);
      return href ? `<a class="ref" href="${attr(href)}"><code>${esc(code)}</code></a>` : `<code>${esc(code)}</code>`;
    });
  };
}

/** Free text from a note: paragraphs, "> " quotes (a bare ">" starts a new paragraph) and "- " bullets. */
function textBlocks(text, h) {
  const out = [];
  let para = [];
  let quote = null; // the paragraphs of the quote being read
  let list = null;
  const flush = () => {
    if (para.length) { out.push(`<p>${h(para.join(" "))}</p>`); para = []; }
    if (quote) { out.push(`<blockquote>${quote.filter(Boolean).map((q) => `<p>${h(q)}</p>`).join("")}</blockquote>`); quote = null; }
    if (list) { out.push(`<ul>${list.map((i) => `<li>${h(i)}</li>`).join("")}</ul>`); list = null; }
  };
  for (const raw of String(text || "").replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    let m;
    if ((m = line.match(/^>\s?(.*)$/))) {
      if (!quote) { flush(); quote = [""]; }
      if (m[1].trim() === "") quote.push(""); else quote[quote.length - 1] = `${quote[quote.length - 1]} ${m[1]}`.trim();
      continue;
    }
    if ((m = line.match(/^[-*] (.+)$/))) { if (!list) { flush(); list = []; } list.push(m[1]); continue; }
    if (quote || list) flush();
    para.push(line.trim());
  }
  flush();
  return out.join("\n");
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sumPencil = (c) => c.pencilHers + c.pencilClaude;

/** "8 ink · 63 pencil · 7 open · 67 GM-only": what an entity holds, for its summary line. */
function countWords(c) {
  return [
    c.ink && `${c.ink} ink`,
    c.wait && `${c.wait} awaiting read`,
    sumPencil(c) && `${sumPencil(c)} pencil`,
    c.open && `${c.open} open`,
    c.secret && `${c.secret} GM-only`,
  ].filter(Boolean).join(" · ");
}

// ------------------------------------------------------------------ pieces

const tagSpan = (v) => (v.tag ? `<span class="tag ${TAGS[v.tag].cls}">${esc(tagLabel(v))}</span>` : "");
const gmSpan = `<span class="tag ${GM.cls}">${GM.label}</span>`;
const link = (href, inner, cls = "") => (href ? `<a${cls ? ` class="${cls}"` : ""} href="${attr(href)}">${inner}</a>` : inner);

function placeHtml(p) {
  if (!p) return "";
  return link(p.href, esc(p.label));
}
function sourcesHtml(list) {
  return list.map((s) => link(s.href, `<span class="src src-${s.kind}">${esc(s.id)}</span>`)).join(", ");
}
function chipsHtml(items, hrefPrefix) {
  // A chip links only to something canon has a file for.
  return items.map((t) => (t.known === false ? `<span class="chip">${esc(t.title)}</span>` : `<a class="chip" href="#${hrefPrefix}${attr(t.id)}">${esc(t.title)}</a>`)).join(" ");
}

/** One fact's record: the only place its words appear on the page. */
function factLi(v, h) {
  const meta = [
    `<code class="fid">${esc(v.id)}</code>`,
    `known: ${esc(v.known)}`,
    `told: ${placeHtml(v.toldAt)}`,
    v.when && `when: ${esc(v.when)}`,
    v.threads.length && `threads: ${v.threads.map((t) => esc(t)).join(", ")}`,
    v.source.length && `source: ${sourcesHtml(v.source)}`,
    v.payoff && `pays off ${link(v.payoff.href, `<code>${esc(v.payoff.id)}</code>`, "ref")}`,
    v.heldBy && `held by ${esc(v.heldBy)} · true: ${esc(v.isTrue || "?")}${v.truth ? ` → ${link(v.truth.href, `<code>${esc(v.truth.id)}</code>`, "ref")}` : ""}`,
  ].filter(Boolean);
  const cands = v.candidates.length
    ? `<div class="cands"><span class="lbl">Candidate answers</span>${v.candidates.map((c, i) => `<p class="cand"><span class="cn">${String.fromCharCode(65 + i)}</span>${h(c)}</p>`).join("")}</div>`
    : "";
  const decide = v.decideBy ? `<p class="decby"><span class="lbl">Decide by</span>${h(v.decideBy)}</p>` : "";
  return `<li class="${cls("fact", toneOf(v.tag), v.secret && "secret")}" id="f-${attr(v.id)}" data-fact="${attr(v.id)}" data-status="${attr(v.status)}">
<span class="ftags">${tagSpan(v)}${v.secret ? gmSpan : ""}</span><span class="ftext">${h(v.text)}</span>
${cands}${decide}<span class="fmeta">${meta.join(" · ")}</span></li>`;
}
const factsUl = (list, h, cls = "") => `<ul class="facts${cls ? " " + cls : ""}">${list.map((v) => factLi(v, h)).join("\n")}</ul>`;

/** A pointer to a record that lives elsewhere: its id and a clipped line, never the record itself. */
function refHtml(r, { why = "", max = 0 } = {}) {
  if (!r) return "";
  const idHtml = `<code>${esc(r.id)}</code>`;
  const head = r.href ? `<a class="ref" href="${attr(r.href)}">${idHtml}</a>` : idHtml;
  const badge = r.tag ? `<span class="tag ${TAGS[r.tag].cls}">${esc(TAGS[r.tag].label)}</span>` : "";
  const gm = r.secret ? gmSpan : "";
  const text = max ? clip(r.text, max) : r.text;
  return `<span class="${cls("pref", toneOf(r.tag))}">${badge}${gm}${head}${text ? ` <span class="ptext">${esc(text)}</span>` : ""}${why ? ` <span class="pwhy">${why}</span>` : ""}</span>`;
}

// ------------------------------------------------------------------ sections (HTML)

function worldHtml(s, ctx) {
  const { h } = ctx;
  const total = s.cards.length;
  const index = s.cards.map((c) => `<a href="#e-${attr(c.id)}">${esc(c.title)}</a>`).join(" · ");
  const cards = s.cards.map((c) => {
    const parts = [];
    if (c.threads.length) parts.push(`<p class="ethreads"><span class="lbl">Threads</span>${chipsHtml(c.threads, "t-")}</p>`);
    for (const n of c.notes) parts.push(`<div class="enote"><h5>${esc(n.heading)}</h5>${textBlocks(n.text, h)}</div>`);
    if (c.known.length) parts.push(`<h5>What people know</h5>${factsUl(c.known, h)}`);
    if (c.secrets.length) parts.push(`<div class="gmbox"><h5>${gmSpan}Secrets: only a few, or nobody, know</h5>${factsUl(c.secrets, h)}</div>`);
    const elsewhere = [];
    if (c.inPlan.length) elsewhere.push(`Told in the plan: ${c.inPlan.map((p) => `<a href="${attr(p.href)}">Chapter ${p.chapter}</a> (${p.ids.map((id) => `<a class="ref" href="#f-${attr(id)}"><code>${esc(id)}</code></a>`).join(", ")})`).join(" · ")}`);
    if (c.open.length) elsewhere.push(`Still hers: ${c.open.map((id) => `<a class="ref" href="#f-${attr(id)}"><code>${esc(id)}</code></a>`).join(", ")}`);
    if (c.cut.length) elsewhere.push(`Cut: ${c.cut.map((id) => `<a class="ref" href="#f-${attr(id)}"><code>${esc(id)}</code></a>`).join(", ")}`);
    if (elsewhere.length) parts.push(`<p class="elsewhere"><span class="lbl">Elsewhere on this page</span>${elsewhere.join("<br>")}</p>`);
    if (!parts.length) parts.push(`<p class="none">Nothing is filed under this name yet.</p>`);
    return `<details class="ent" id="e-${attr(c.id)}" data-fold>
<summary><span class="et">${esc(c.title)}</span><span class="ek">${esc(c.kind || "other")}</span><span class="ec">${esc(countWords(c.count) || "no facts yet")}</span></summary>
<div class="ebody">${parts.join("\n")}</div>
</details>`;
  });
  return `<div class="intro">${plural(total, "entry", "entries")}. Each card holds what people know and, in violet, the secrets only a few or nobody know; what the table is told in a chapter, what is still hers and what was cut sit under those headings, and the card points to them.</div>
<p class="index">${index}</p>
${cards.join("\n")}`;
}

function questionCardHtml(c, ctx) {
  const { h } = ctx;
  const rows = [
    c.answer && `<dt>The answer</dt><dd>${refHtml(c.answer)}</dd>`,
    c.misdirect && `<dt>The belief that misleads</dt><dd>${refHtml(c.misdirect)}</dd>`,
    c.raised && `<dt>First wondered</dt><dd>${placeHtml(c.raised)}</dd>`,
    c.answered && `<dt>Answerable by</dt><dd>${placeHtml(c.answered)}</dd>`,
  ].filter(Boolean);
  const roads = c.roads.map((r) => `<li class="road${r.core ? " core" : ""}"><span class="rk">${r.core ? "core · " : ""}${esc(r.kind)}</span>${refHtml(r.ref, { why: r.note ? esc(r.note) : "" })}${r.ref.toldAt ? ` <span class="rt">told: ${placeHtml(r.ref.toldAt)}</span>` : ""}</li>`).join("");
  const check = `<p class="qcheck"><span class="lbl">Roads</span>${plural(c.roads.length, "road")}${c.kinds.length ? ` · ${esc(c.kinds.join(", "))}` : ""}${c.flags.length ? ` · <span class="warnw">${esc(c.flags.join("; "))}</span>` : ""}</p>`;
  return `<details class="${cls("qcard", toneOf(c.tag))}" id="q-${attr(c.id)}" data-fold>
<summary><span class="qt">${esc(c.title)}</span><span class="qm">${c.answered ? `answerable by ${esc(c.answered.label)}` : "no answer date"} · ${plural(c.roads.length, "road")}</span>${tagSpan(c)}</summary>
<div class="qbody">${c.text ? `<p>${h(c.text)}</p>` : ""}<dl class="qrows">${rows.join("")}</dl>${c.roads.length ? `<ol class="roads">${roads}</ol>` : ""}${check}</div>
</details>`;
}

function questionsHtml(s, ctx) {
  const groups = s.groups.map((g) => `<h4 class="sub">${g.book ? `Book ${esc(g.book)}: ${esc(g.title)}` : esc(g.title)}</h4>\n${g.cards.map((c) => questionCardHtml(c, ctx)).join("\n")}`).join("\n");
  return `<div class="intro">What the table is trying to find out, grouped by the Book that answers it. Each answer is part of what is really going on, and stays GM-only until the table reaches it. Each road is one way to reach the answer: its kind of clue, the fact or beat that carries it, and where the table is told. The core road must reach the table and is never behind a roll.</div>
${groups || '<p class="none">No question is filed yet.</p>'}`;
}

function growthHtml(s, ctx) {
  const g = s.growth;
  const canon = s.intro ? `<div class="intro">${ctx.h(s.intro)}</div>` : "";
  if (!g) return canon;
  const head = ["", ...g.books.map((b) => `Book ${esc(b.numeral)}`)];
  const rows = g.rows.map((r) => `<tr><td class="id">${esc(r.label)}</td>${r.cells.map((c) => `<td>${ctx.h(c)}</td>`).join("")}</tr>`).join("");
  return `${canon}<div class="intro">What every Book says about itself, side by side: the rows each Book has in common.</div>
<div class="tbl"><table><thead><tr>${head.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function beatLi(b, ctx) {
  const { h } = ctx;
  const badges = [
    b.kind === "reveal" && `<span class="bk reveal">reveal</span>`,
    b.kind === "flashback" && `<span class="bk flash">flashback</span>`,
    b.fork && `<span class="bk fork">fork</span>`,
  ].filter(Boolean).join("");
  const meta = [
    b.when && `when: ${esc(b.when)}`,
    b.threads.length && chipsHtml(b.threads, "t-"),
    b.reveals.length && `would reveal ${b.reveals.map((r) => refHtml(r)).join(" ")}`,
  ].filter(Boolean);
  return `<li class="${cls("beat", toneOf(b.tag))}" id="b-${attr(b.id)}" data-beat="${attr(b.id)}">${b.pace ? `<span class="pace ${b.pace}" title="${PACE_WORD[b.pace]}" aria-label="${PACE_WORD[b.pace]}">${PACE_GLYPH[b.pace]}</span>` : ""}${badges}${h(b.text)}${meta.length ? `<span class="bmeta">${meta.join(" · ")}</span>` : ""}${b.tells.length ? `<div class="tells"><span class="lbl">The table is told</span>${factsUl(b.tells, h)}</div>` : ""}</li>`;
}

function chapterHtml(c, ctx) {
  const { h } = ctx;
  const parts = [];
  if (c.built) {
    parts.push(`<p class="line">The plan, scene by scene: ${c.episodes.map((e) => `${esc(e.name)} (${plural(e.scenes, "scene")}${e.awaiting ? `, ${e.awaiting} waiting for her read` : ""}${e.approved ? `, ${e.approved} approved` : ""}${e.oldDraft ? `, ${e.oldDraft} not yet rebuilt` : ""})`).join("; ")}. <a href="#detail">The ones written in detail are in Part Zero.</a></p>`);
  } else if (c.text) parts.push(`<p class="line">${h(c.text)}</p>`);
  if (c.learn) parts.push(`<p class="learn"><span class="lbl">What they learn</span>${h(c.learn)}</p>`);
  if (c.table.length) parts.push(`<h5>At the table</h5><ol class="play">${c.table.map((b) => beatLi(b, ctx)).join("\n")}</ol>`);
  if (c.choices.length) parts.push(`<h5>Choices</h5><ul class="choices">${c.choices.map((b) => beatLi(b, ctx)).join("\n")}</ul>`);
  if (c.finds.length) parts.push(`<h5>What they can find out</h5>${factsUl(c.finds, h)}`);
  if (c.notes) parts.push(`<div class="gmbox"><h5>${gmSpan}GM notes</h5>${textBlocks(c.notes, h)}</div>`);
  if (c.ends.length) parts.push(`<h5>Where it leaves them</h5><ul class="ends">${c.ends.map((b) => beatLi(b, ctx)).join("\n")}</ul>`);
  if (c.due.length) parts.push(`<div class="due"><h5>Hers to decide by this chapter</h5><ul>${c.due.map((r) => `<li>${refHtml(r, { max: 110 })}</li>`).join("")}</ul></div>`);
  if (c.threads.length) parts.push(`<p class="ethreads"><span class="lbl">Threads in this chapter</span>${chipsHtml(c.threads, "t-")}</p>`);
  return `<details class="${cls("chap", toneOf(c.tag), c.built && "built")}" id="c${c.n}" open data-fold>
<summary><span class="no">${c.n}</span><span class="ttl">${esc(c.title)}</span>${c.rank ? `<span class="rank">${esc(c.rank)}</span>` : ""}${tagSpan(c)}</summary>
<div class="cbody">${parts.join("\n")}</div>
</details>`;
}

function overviewHtml(s, ctx) {
  const { h } = ctx;
  const rows = [];
  const row = (c) => {
    const does = c.built ? `${plural(c.episodes.reduce((n, e) => n + e.scenes, 0), "scene")} in the plan; the written ones are in Part Zero.` : c.text;
    return `<tr${classAttr(toneOf(c.tag))}><td class="ch"><a href="#c${c.n}">${c.n}</a></td><td>${esc(c.title)}</td><td>${esc(c.rank || "")}</td><td>${h(does)}</td><td>${h(c.learn || "")}</td></tr>`;
  };
  for (const b of s.books) {
    rows.push(`<tr class="bookrow"><td colspan="5">Book ${esc(b.numeral)} · ${esc(b.title)} · chapters ${b.from} to ${b.to}</td></tr>`);
    for (const c of b.chapters) rows.push(row(c));
  }
  if (s.loose?.length) {
    rows.push(`<tr class="bookrow"><td colspan="5">Outside the Books</td></tr>`);
    for (const c of s.loose) rows.push(row(c));
  }
  return `<div class="intro">Every chapter in one table: its rank, what the players do, and what they learn. Each chapter's own card, with its beats and choices, is in its Book below. Lines in lighter type are pencil.</div>
<div class="tbl overview"><table><thead><tr><th>Ch</th><th>Title</th><th>Rank</th><th>What the players do</th><th>What they learn</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function bookHtml(s, ctx) {
  const { h } = ctx;
  const b = s.book;
  const rows = b.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${h(v)}</dd>`).join("");
  return `<div class="${cls("book", toneOf(b.tag))}"><span class="bk">Book ${esc(b.numeral)} · ${esc(b.title)}</span><span class="ch">CHAPTERS ${b.from} TO ${b.to}</span>${tagSpan(b)}<span class="role">${h(b.text)}</span></div>
<dl class="bookrows">${rows}</dl>
${b.chapters.map((c) => chapterHtml(c, ctx)).join("\n")}`;
}

function riseHtml(t) {
  const vals = t.rise.values;
  if (!vals.length) return "";
  const bars = vals.map((v, i) => `<i style="height:${v ? Math.max(3, Math.min(5, v) * 5) : 2}px" title="Chapter ${i + 1}: ${v ?? "not sketched"}"></i>`).join("");
  return `<span class="rf" role="img" aria-label="${attr(t.title)} rise and fall by chapter">${bars}</span>`;
}

function weaveHtml(s, ctx) {
  const { h } = ctx;
  const w = s.weave;
  const head = ["", ...w.books.map((b) => `Book ${esc(b.numeral)}`)];
  const rows = w.threads.map((t) => `<tr${classAttr(toneOf(t.tag))}><td class="id"><a href="#t-${attr(t.id)}">${esc(t.title)}</a></td>${t.byBook.map((b) => `<td>${b.text ? h(b.text) : "—"}</td>`).join("")}</tr>`).join("");
  const cards = w.threads.map((t) => {
    const clocks = t.clocks.map((cl) => `<div class="clock"><h5>Clock · ${esc(cl.name)}</h5><ol>${cl.steps.map((st) => `<li>${refHtml(st)}${st.toldAt ? ` <span class="rt">${placeHtml(st.toldAt)}</span>` : ""}</li>`).join("")}</ol></div>`).join("");
    const doc = [
      t.impulse && `<dt>It wants</dt><dd>${h(t.impulse)}</dd>`,
      t.doom && `<dt>Where it is heading</dt><dd>${h(t.doom)}</dd>`,
      t.entities.length && `<dt>Who and what</dt><dd>${t.entities.map((e) => (e.known ? `<a class="chip" href="#e-${attr(e.id)}">${esc(e.title)}</a>` : `<span class="chip">${esc(e.title)}</span>`)).join(" ")}</dd>`,
    ].filter(Boolean).join("");
    return `<details class="${cls("thr", toneOf(t.tag))}" id="t-${attr(t.id)}" data-fold>
<summary><span class="tt">${esc(t.title)}</span><span class="tk">${esc(t.kind || "")}${t.lane ? ` · ${esc(t.lane)}` : ""}</span>${riseHtml(t)}${tagSpan(t)}</summary>
<div class="tbody">${t.text ? `<p>${h(t.text)}</p>` : ""}<dl class="qrows">${doc}</dl>${clocks}</div>
</details>`;
  }).join("\n");
  return `<div class="intro">Every thread and front, Book by Book. Each thread's card below has its rise and fall, one bar per chapter, drawn from its beats (a reveal or a choice counts double) unless its file gives the values, and its clocks.</div>
<div class="tbl"><table><thead><tr>${head.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
<h4 class="sub">Each thread, with its clocks</h4>
${cards}`;
}

function forksHtml(s) {
  if (!s.rows.length) return `<div class="intro">No beat is marked as one of the campaign's real branches yet.</div>`;
  const rows = s.rows.map((r) => `<tr${classAttr(toneOf(r.beat.tag))}><td>${refHtml(r.beat)}</td><td class="lv"><a href="#c${r.chapter}">${r.chapter}</a></td><td>${chipsHtml(r.threads, "t-")}</td></tr>`).join("");
  return `<div class="intro">The beats marked as the campaign's real branches. Everywhere else the table's choices are acknowledged cheaply and often; real branching is spent here.</div>
<div class="tbl"><table><thead><tr><th>The choice</th><th>Ch</th><th>Threads</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function callsHtml(s, ctx) {
  const { h } = ctx;
  const sources = s.sources.length ? `<p class="docs"><span class="lbl">Documents she gave</span>${s.sources.map((d) => `<span id="d-${attr(d.id)}"><code>${esc(d.id)}</code> ${esc(d.title)}</span>`).join(" · ")}</p>` : "";
  const calls = s.calls.map((d) => {
    // Each quoted block is one blockquote; a blank line inside it is a new paragraph of the same speech.
    const quotes = d.quotes.length ? d.quotes.map((q) => `<blockquote class="her">${q.split(/\n\s*\n/).map((para) => `<p>${h(para).replace(/\n/g, "<br>")}</p>`).join("")}</blockquote>`).join("") : (d.excerpt ? `<p class="excerpt">${esc(d.excerpt)} <span class="note">(the old log's record: read it in full in its file)</span></p>` : "");
    const changes = d.changes.length ? `<div class="changes2">${d.changes.map((c) => `<p><span class="lbl">${esc(c.verb)}</span>${c.targets.map((t) => (t.href ? `<a class="ref" href="${attr(t.href)}"><code>${esc(t.id)}</code></a>` : `<code>${esc(t.id)}</code>`)).join(", ")}</p>`).join("")}</div>` : "";
    return `<details class="call" id="d-${attr(d.id)}" data-fold>
<summary><span class="dn">${esc(d.id)}</span><span class="dd">${esc(d.date)}</span><span class="dt">${esc(d.title)}</span>${d.kind === "timeline" ? `<span class="tag canon">her edits on the timeline</span>` : ""}</summary>
<div class="dbody">${d.asked ? `<p class="asked"><span class="lbl">Asked</span>${h(d.asked)}</p>` : ""}${quotes}${changes}</div>
</details>`;
  }).join("\n");
  return `<div class="intro">Her words, quoted, newest first: every record of hers (the decisions, and her day's edits on the timeline). Claude's import records are not here: they hold no words of hers and are never authority for ink.</div>
${sources}
${calls || '<p class="none">No decision is on record yet.</p>'}`;
}

function hersHtml(s, ctx) {
  const { h } = ctx;
  const groups = s.groups.map((g) => `<details class="grp" open data-fold>
<summary><span class="gt">${esc(g.title)}</span><span class="gc">${g.items.length}</span></summary>
<div class="gbody"><ul class="facts">${g.items.filter((it) => it.fact).map((it) => factLi(it.fact, h).replace("</li>", `${it.usedInside ? `<span class="relied">Play material relies on this.</span>` : ""}<span class="fabout">About <a href="#e-${attr(it.fact.entity)}">${esc(it.entityTitle)}</a></span></li>`)).join("\n")}</ul></div>
</details>`).join("\n");
  const dis = s.disagreements.length
    ? `<details class="grp" data-fold><summary><span class="gt">Where the imports and the merges found pencil that disagrees</span><span class="gc">${s.disagreements.reduce((n, d) => n + d.conflicts.length, 0)}</span></summary><div class="gbody">${s.disagreements.map((d) => `<h5>${esc(d.id)} · ${esc(d.title)}</h5><ul>${d.conflicts.map((c) => `<li>${h(c)}</li>`).join("")}</ul>`).join("")}</div></details>`
    : "";
  return `<div class="intro">Every decision still hers: each open question, with its candidate answers and its deadline. They are listed only here; a person's or a place's card points to its own. Answer them on the timeline's Decisions view.</div>
${groups || '<p class="none">Nothing is open.</p>'}
${dis}`;
}

function ideasHtml(s, ctx) {
  const { h } = ctx;
  const topics = s.topics.map((t) => {
    const items = t.ideas.map((i) => {
      const meta = [
        `state: ${esc(i.state || "?")}`,
        i.when && `when: ${esc(i.when)}`,
        i.threads.length && `threads: ${chipsHtml(i.threads, "t-")}`,
        i.became.length && `became ${i.became.map((r) => refHtml(r)).join(" ")}`,
        i.source.length && `source: ${sourcesHtml(i.source)}`,
        i.retire.length && `never say: ${i.retire.map((p) => `“${esc(p)}”`).join(", ")}`,
      ].filter(Boolean);
      return `<li class="${cls("idea", toneOf(i.tag), `st-${attr(i.state || "none")}`)}" id="i-${attr(i.id)}" data-idea="${attr(i.id)}"><span class="ftags">${tagSpan(i)}<span class="tag state">${esc(i.state || "?")}</span></span><span class="ftext">${h(i.text)}</span><span class="fmeta"><code class="fid">${esc(i.id)}</code> · ${meta.join(" · ")}</span></li>`;
    }).join("\n");
    const counts = Object.entries(t.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(" · ");
    return `<details class="topic" data-fold><summary><span class="et">${esc(t.title)}</span><span class="ec">${esc(counts)}</span></summary><div class="ebody">${t.text ? `<p>${h(t.text)}</p>` : ""}<ul class="facts">${items}</ul></div></details>`;
  }).join("\n");
  return `<div class="intro">Brainstorms and "what ifs", kept apart from the world so alternatives never pass as facts. Always pencil. Live ones are still on the table, parked ones are set aside, adopted ones became facts or beats, and rejected ones keep the wording that must not come back.</div>
${topics || '<p class="none">No idea is filed yet.</p>'}`;
}

function cutHtml(s, ctx) {
  const { h } = ctx;
  const phrases = s.retired.length ? `<h4 class="sub">The wording that must not come back</h4><ul class="retired">${s.retired.map((r) => `<li>“${esc(r.phrase)}” <span class="pwhy">cut with</span> ${refHtml(r.from)}</li>`).join("")}</ul>` : "";
  return `<div class="intro">What Ingram cut or rejected, kept only so its wording can't come back: nothing may use these words, in canon, in play material or anywhere else.</div>
${s.facts.length ? `<h4 class="sub">Cut facts</h4>${factsUl(s.facts, h)}` : '<p class="none">No fact is cut.</p>'}
${phrases}`;
}

function roadsHtml(s) {
  const rows = s.cards.map((c) => `<tr${classAttr(toneOf(c.tag))}><td><a href="#q-${attr(c.id)}">${esc(c.title)}</a></td><td class="lv">${c.answered ? placeHtml(c.answered) : "—"}</td><td>${c.roads.map((r) => `<span class="road${r.core ? " core" : ""}"><span class="rk">${r.core ? "core · " : ""}${esc(r.kind)}</span> ${refHtml(r.ref, { max: 70 })}</span>`).join("<br>") || "—"}</td><td class="lv">${c.earliest ? placeHtml(c.earliest) : "—"}${c.flags.length ? `<br><span class="warnw">${esc(c.flags.join("; "))}</span>` : ""}</td></tr>`).join("");
  return `<div class="intro">Every conclusion the story needs, with the roads that reach it, so no discovery hangs on one roll on one night. The last column is the earliest a road reaches the table.</div>
<div class="tbl roadsx"><table><thead><tr><th>What they can conclude</th><th>Answerable by</th><th>Roads</th><th>Earliest road</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function plantsHtml(s) {
  const rows = s.rows.map((r) => `<tr><td>${refHtml(r.plant)}</td><td>${refHtml(r.payoff)}</td></tr>`).join("");
  return `<div class="intro">Each fact that plants another: where the table first sees it, and what it pays off.</div>
<div class="tbl"><table><thead><tr><th>The plant</th><th>Pays off</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function flashbacksHtml(s) {
  const rows = s.rows.map((r) => `<tr${classAttr(toneOf(r.tag))}><td class="lv"><a href="#c${r.chapter}">${r.chapter}</a></td><td>${refHtml(r.beat)}</td><td>${esc(r.when || "")}</td></tr>`).join("");
  return `<div class="intro">The beats that show the past, with when in the story they happen.</div>
<div class="tbl"><table><thead><tr><th>Ch</th><th>The flashback</th><th>When</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ------------------------------------------------------------------ the page

const BODY = {
  world: worldHtml, questions: questionsHtml, growth: growthHtml, overview: overviewHtml, book: bookHtml,
  "chapters-loose": (s, ctx) => `<div class="intro">Chapters that no Book claims yet.</div>${s.chapters.map((c) => chapterHtml(c, ctx)).join("\n")}`,
  weave: weaveHtml, forks: forksHtml, calls: callsHtml, hers: hersHtml, ideas: ideasHtml, cut: cutHtml, roads: roadsHtml, plants: plantsHtml, flashbacks: flashbacksHtml,
};

function sectionHtml(s, ctx) {
  const body = BODY[s.key]?.(s, ctx);
  if (body === undefined) return "";
  const sign = /^[A-Z]$/.test(s.num) ? s.num : `§${s.num}`;
  return `<section class="sec" id="${attr(s.id)}" data-section="${attr(s.key)}">
<h3><span class="sid">${esc(sign)}</span><span>${esc(s.title)}</span></h3>
${body}
</section>`;
}

const KEY_ROWS = [
  ["canon", "Ink", "Decided by Ingram, or accepted from Claude with her say-so. Full strength, solid rule."],
  ["wait", "Awaiting read", "Told by a scene she has not approved yet, or Claude's proposal inside material she is reading. Ink, pending her read."],
  ["hers", "Pencil · hers", "Her own earlier words, filed as she said them, waiting for her second look. Lighter, dashed rule."],
  ["new", "Pencil · Claude", "Claude's drafts, ideas and imported outline: free to throw away. Lighter, dashed rule. Play material never cites pencil."],
  ["flag", "Open", "A decision still hers. It appears only under Still hers, with its candidate answers and deadline."],
  ["gm", "GM-only", "Known by few or nobody in the world: a secret the table mustn't get before the scene or chapter that tells it."],
  ["cut", "Cut", "Cut or rejected: kept only so its wording can't come back."],
];

export function renderHtml(doc, { detailHtml, markdownPath, publishedUrl } = {}) {
  const h = makeInline(doc.anchors);
  const ctx = { h, doc };
  const g = doc.glance;
  const f = g.facts;
  const toc = doc.toc.map((p) => `<h2>${esc(p.kicker)} · ${esc(p.title)}</h2>
  <ol>
${p.sections.map((s) => `    <li><a href="#${attr(s.id)}"><span>${/^[A-Z]$/.test(s.num) ? esc(s.num) : `§${esc(s.num)}`}</span><span>${esc(s.title)}${s.count !== undefined ? ` <small>${s.count}</small>` : ""}</span></a></li>`).join("\n")}
  </ol>`).join("\n  ");
  const glance = `<div class="glance"><h2>Canon at a glance</h2>
<table><tbody>
<tr><th scope="row">Facts</th><td>${f.total} in all: <b>${f.ink}</b> ink · <b>${f.wait}</b> awaiting read · <b>${f.pencilHers}</b> pencil of hers · <b>${f.pencilClaude}</b> pencil of Claude's · <a href="#hers"><b>${f.open}</b> open</a> · ${f.cut} cut. ${f.secret} are GM-only.</td></tr>
<tr><th scope="row">The plan</th><td>${plural(g.books, "Book")}, ${plural(g.chapters, "chapter")}, ${plural(g.beats, "beat")}, ${plural(g.threads, "thread")}, ${plural(g.questions, "question")}; ${plural(g.scenes, "scene")} in the plan, ${g.scenesInDetail} written in detail.</td></tr>
<tr><th scope="row">The world</th><td>${plural(g.entities, "person, place or thing", "people, places and things")}.</td></tr>
<tr><th scope="row">Ideas</th><td>${g.ideas}: ${Object.entries(g.ideaStates).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(" · ")}.</td></tr>
<tr><th scope="row">Her words</th><td><a href="#calls">${plural(g.calls, "record")}</a>, quoted.</td></tr>
</tbody></table></div>`;
  const key = `<div class="howto"><h2>How to read this page</h2>
<p>Everything here is made from <code>canon/</code> and nothing is written by hand. To change it, change canon (or answer on the timeline page) and rebuild. A line is drawn as the kind of thing it is:</p>
<ul class="legend">${KEY_ROWS.map(([tagClass, label, words]) => `<li><span class="tag ${tagClass}">${label}</span><span>${esc(words)}</span></li>`).join("")}</ul>
<p>Each fact says who knows it (<em>everyone</em>, <em>some</em>, <em>few</em> or <em>nobody</em>), when the table hears it (from the start, in a scene or chapter, or later) and where it came from. <strong>A fact appears once</strong>: under the chapter that tells the table, under Still hers if it is open, under Cut if it is cut, and otherwise on the card of the person, place or thing it is about. Everything else points to it by id. In chapters, ▲ lifts the pace, ▼ lets it down and ▬ holds it.</p>
<p class="fold-controls" hidden><button type="button" data-fold-all="open">Expand all</button> <button type="button" data-fold-all="close">Collapse all</button></p></div>`;
  const parts = doc.parts.map((p) => {
    if (p.id === "part0") return detailHtml ? detailHtml : "";
    const intro = PART_INTRO[p.id] ? `<p>${esc(PART_INTRO[p.id])}</p>` : "";
    return `<div class="part" id="${attr(p.id)}">
<header><div class="kicker">${esc(p.kicker)}</div><h2>${esc(p.title)}</h2>${intro}</header>
${p.sections.map((s) => sectionHtml(s, ctx)).join("\n")}
</div>`;
  }).join("\n\n");
  return `<div class="wrap">
<header class="mast">
  <div class="file"><span>Generated from canon</span><span>File: <b>GM-ONLY</b></span><span>Canon ${esc(doc.meta.canonHash)}</span></div>
  <h1>Blank Inheritance <span>Casebook</span></h1>
  <p class="lede">The whole campaign, made from canon: every scene written in detail, then the world, how the mystery works, the chapters and Books, the threads, her words and what is still hers. Change canon and rebuild, and this page changes with it.</p>
  ${key}
  ${glance}
</header>

<nav class="toc" aria-label="Contents">
  <div class="cols">
  ${toc}
  </div>
</nav>

<main>
${parts}
<footer class="foot">
  <p><strong>Where this lives:</strong> made by <code>node tools/casebook/build.mjs</code> from <code>canon/</code>${markdownPath ? `, and written to the repo as <code>${esc(markdownPath)}</code> so later sessions can read it without this page` : ""}. Never edit either by hand: the story lives in <code>canon/</code>, and her decisions are in <code>canon/decisions/</code>.${publishedUrl ? ` The published copy, ${esc(publishedUrl)}, is republished by hand and can lag canon: compare its canon hash with this one.` : ""}</p>
</footer>
</main>
</div>
${SCRIPT}`;
}

const PART_INTRO = {
  part1: "Everyone and everything in the story, by what it is. Each card holds what people know and, in violet, the secrets only a few or nobody know.",
  part2: "What the table is trying to find out, and how the Books climb.",
  part3: "The plan, Book by Book and chapter by chapter, with each chapter's beats, choices and what the table can find out. Chapters past the first are pencil until she goes through them.",
  part4: "Who is moving when, where the story genuinely forks, her words, and every decision still hers.",
  part5: "Brainstorms and alternatives, and the wording that was cut.",
  appendices: "The working parts: every question's roads, and what plants what.",
};

/** Progressive enhancement only: the page reads the same without it. Opens a card when a link points inside it, and expands or collapses all. */
const SCRIPT = `<script>
(function(){
  var d=document;
  function openFor(el){for(var n=el;n&&n!==d.body;n=n.parentElement){if(n.tagName==='DETAILS')n.open=true;}}
  function find(h){try{return d.getElementById(decodeURIComponent(h.slice(1)));}catch(e){return null;}}
  function go(){if(!location.hash)return;var el=find(location.hash);if(el){openFor(el);el.scrollIntoView();}}
  addEventListener('hashchange',go);
  d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;var el=find(a.getAttribute('href'));if(el)openFor(el);});
  var bar=d.querySelector('.fold-controls');
  if(bar){bar.hidden=false;bar.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var open=b.getAttribute('data-fold-all')==='open';d.querySelectorAll('details[data-fold]').forEach(function(x){x.open=open;});});}
  go();
})();
</script>`;

// ------------------------------------------------------------------ Markdown

const mdCell = (s) => String(s ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
const mdPlace = (p) => (p ? p.label : "");
const mdTags = (v) => [tagLabel(v), v.secret ? GM.label : ""].filter(Boolean).join(" · ");
const mdSources = (list) => list.map((s) => s.id).join(", ");

/** A fact's record in Markdown: a bullet that starts with its id in backticks (nowhere else does). */
function mdFact(v, indent = "") {
  const meta = [`known ${v.known}`, `told ${mdPlace(v.toldAt)}`, v.when && `when ${v.when}`, v.threads.length && `threads ${v.threads.join(", ")}`, v.source.length && `source ${mdSources(v.source)}`, v.payoff && `pays off \`${v.payoff.id}\``, v.heldBy && `held by ${v.heldBy}, true: ${v.isTrue || "?"}${v.truth ? `, truth \`${v.truth.id}\`` : ""}`].filter(Boolean);
  const lines = [`${indent}- \`${v.id}\` *(${mdTags(v)})* ${v.text} — ${meta.join(" · ")}`];
  v.candidates.forEach((c, i) => lines.push(`${indent}  - candidate ${String.fromCharCode(65 + i)}: ${c}`));
  if (v.decideBy) lines.push(`${indent}  - decide by: ${v.decideBy}`);
  return lines.join("\n");
}
const mdRef = (r) => `\`${r.id}\`${r.text ? ` ${r.text}` : ""}`;

export function renderMarkdown(doc, { detailMarkdown, markdownPath, publishedUrl } = {}) {
  const L = [];
  const P = (s = "") => L.push(s);
  const g = doc.glance;
  const f = g.facts;
  P("# Blank Inheritance: the Casebook");
  P();
  P(`*Generated from \`canon/\` by \`node tools/casebook/build.mjs\` (canon ${doc.meta.canonHash}). Never edit by hand: change canon, or answer on the timeline page, and rebuild.${publishedUrl ? ` The published page, ${publishedUrl}, is republished by hand and can lag canon: compare its canon hash with this one.` : ""}*`);
  P();
  P("## How to read this");
  P();
  P("Everything here is made from canon. A line carries the kind of thing it is:");
  P();
  for (const [, label, words] of KEY_ROWS) P(`- **${label}.** ${words}`);
  P();
  P("Each fact says who knows it (everyone, some, few or nobody), when the table hears it and where it came from. **A fact appears once**: under the chapter that tells the table, under Still hers if it is open, under Cut if it is cut, and otherwise under the person, place or thing it is about. Each fact's record is the bullet that starts with its id in backticks; everything else points to it. In chapters, ▲ lifts the pace, ▼ lets it down and ▬ holds it.");
  P();
  P("## Canon at a glance");
  P();
  P(`- **Facts:** ${f.total} in all: ${f.ink} ink · ${f.wait} awaiting read · ${f.pencilHers} pencil of hers · ${f.pencilClaude} pencil of Claude's · ${f.open} open · ${f.cut} cut. ${f.secret} are GM-only.`);
  P(`- **The plan:** ${plural(g.books, "Book")}, ${plural(g.chapters, "chapter")}, ${plural(g.beats, "beat")}, ${plural(g.threads, "thread")}, ${plural(g.questions, "question")}.`);
  P(`- **The world:** ${plural(g.entities, "person, place or thing", "people, places and things")}.`);
  P(`- **Ideas:** ${g.ideas}: ${Object.entries(g.ideaStates).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(" · ")}.`);
  P(`- **Her words:** ${plural(g.calls, "record")}, quoted.`);
  P();
  P("## Contents");
  P();
  for (const p of doc.toc) {
    P(`- **${p.kicker}: ${p.title}**`);
    for (const s of p.sections) P(`  - ${/^[A-Z]$/.test(s.num) ? s.num : `§${s.num}`} ${s.title}${s.count !== undefined ? ` (${s.count})` : ""}`);
  }
  P();
  for (const p of doc.parts) {
    if (p.id === "part0") { if (detailMarkdown) { P(detailMarkdown); P(); } continue; }
    for (const s of p.sections) {
      const sign = /^[A-Z]$/.test(s.num) ? `Appendix ${s.num}:` : `§${s.num}`;
      P(`## ${sign} ${s.title}`);
      P();
      MD[s.key]?.(s, P, doc);
    }
  }
  const md = L.join("\n");
  return md.endsWith("\n") ? md : `${md}\n`;
}


const MD = {
  world(s, P) {
    for (const c of s.cards) {
      P(`### ${c.title} *(${c.kind || "other"} · ${countWords(c.count) || "no facts yet"})*`);
      P();
      P(`\`${c.id}\`${c.threads.length ? ` · threads: ${c.threads.map((t) => t.title).join(", ")}` : ""}`);
      P();
      for (const n of c.notes) { P(`**${n.heading}.** ${n.text.replace(/\n{2,}/g, "\n\n")}`); P(); }
      if (c.known.length) { P("**What people know**"); P(); c.known.forEach((v) => P(mdFact(v))); P(); }
      if (c.secrets.length) { P("**Secrets: only a few, or nobody, know** *(GM-only)*"); P(); c.secrets.forEach((v) => P(mdFact(v))); P(); }
      if (c.inPlan.length) { P(`Told in the plan: ${c.inPlan.map((p) => `Chapter ${p.chapter} (${p.ids.map((id) => `\`${id}\``).join(", ")})`).join("; ")}.`); P(); }
      if (c.open.length) { P(`Still hers: ${c.open.map((id) => `\`${id}\``).join(", ")}.`); P(); }
      if (c.cut.length) { P(`Cut: ${c.cut.map((id) => `\`${id}\``).join(", ")}.`); P(); }
    }
  },
  questions(s, P) {
    for (const g of s.groups) {
      P(`### ${g.book ? `Book ${g.book}: ${g.title}` : g.title}`);
      P();
      for (const c of g.cards) {
        P(`#### ${c.title} *(${tagLabel(c)})*`);
        P();
        if (c.text) { P(c.text); P(); }
        if (c.answer) P(`- **The answer:** ${mdRef(c.answer)}`);
        if (c.misdirect) P(`- **The belief that misleads:** ${mdRef(c.misdirect)}`);
        if (c.raised) P(`- **First wondered:** ${mdPlace(c.raised)}`);
        if (c.answered) P(`- **Answerable by:** ${mdPlace(c.answered)}`);
        P();
        c.roads.forEach((r, i) => P(`${i + 1}. ${r.core ? "**core** · " : ""}${r.kind} · ${mdRef(r.ref)}${r.ref.toldAt ? ` (told ${mdPlace(r.ref.toldAt)})` : ""}${r.note ? ` — ${r.note}` : ""}`));
        if (c.roads.length) P();
        P(`${plural(c.roads.length, "road")}${c.kinds.length ? ` · ${c.kinds.join(", ")}` : ""}${c.flags.length ? ` · ${c.flags.join("; ")}` : ""}.`);
        P();
      }
    }
  },
  growth(s, P) {
    const g = s.growth;
    if (s.intro) { P(s.intro); P(); }
    if (!g) return;
    P(`| | ${g.books.map((b) => `Book ${b.numeral}`).join(" | ")} |`);
    P(`|---|${g.books.map(() => "---").join("|")}|`);
    for (const r of g.rows) P(`| **${mdCell(r.label)}** | ${r.cells.map(mdCell).join(" | ")} |`);
    P();
  },
  overview(s, P) {
    P("| Ch | Title | Rank | What the players do | What they learn |");
    P("|---|---|---|---|---|");
    for (const b of s.books) {
      P(`| | **Book ${b.numeral}: ${mdCell(b.title)}** (chapters ${b.from} to ${b.to}) | | | |`);
      for (const c of b.chapters) P(`| ${c.n} | ${mdCell(c.title)} | ${mdCell(c.rank || "")} | ${mdCell(c.built ? "The plan's scenes: the written ones are in Part Zero." : c.text)} | ${mdCell(c.learn || "")} |`);
    }
    if (s.loose?.length) {
      P("| | **Outside the Books** | | | |");
      for (const c of s.loose) P(`| ${c.n} | ${mdCell(c.title)} | ${mdCell(c.rank || "")} | ${mdCell(c.built ? "The plan's scenes: the written ones are in Part Zero." : c.text)} | ${mdCell(c.learn || "")} |`);
    }
    P();
  },
  book(s, P) {
    const b = s.book;
    P(`${b.text ? `*${b.text}* ` : ""}(${tagLabel(b) || "no status"})`);
    P();
    for (const [k, v] of b.rows) P(`- **${k}:** ${v}`);
    P();
    for (const c of b.chapters) mdChapter(c, P);
  },
  "chapters-loose"(s, P) { for (const c of s.chapters) mdChapter(c, P); },
  weave(s, P) {
    const w = s.weave;
    P(`| | ${w.books.map((b) => `Book ${b.numeral}`).join(" | ")} |`);
    P(`|---|${w.books.map(() => "---").join("|")}|`);
    for (const t of w.threads) P(`| **${mdCell(t.title)}** | ${t.byBook.map((b) => mdCell(b.text || "—")).join(" | ")} |`);
    P();
    for (const t of w.threads) {
      P(`### ${t.title} *(${t.kind || "thread"}${t.lane ? ` · ${t.lane}` : ""} · ${tagLabel(t)})*`);
      P();
      if (t.text) { P(t.text); P(); }
      if (t.impulse) P(`- **It wants:** ${t.impulse}`);
      if (t.doom) P(`- **Where it is heading:** ${t.doom}`);
      if (t.entities.length) P(`- **Who and what:** ${t.entities.map((e) => e.title).join(", ")}`);
      if (t.rise.values.length) P(`- **Rise and fall by chapter:** ${t.rise.values.map((v) => (v === null || v === undefined ? "." : v)).join(" ")}`);
      P();
      for (const cl of t.clocks) {
        P(`**Clock: ${cl.name}**`);
        P();
        cl.steps.forEach((st, i) => P(`${i + 1}. ${mdRef(st)}${st.toldAt ? ` (${mdPlace(st.toldAt)})` : ""}`));
        P();
      }
    }
  },
  forks(s, P) {
    if (!s.rows.length) { P("No beat is marked as one of the campaign's real branches yet."); P(); return; }
    P("| The choice | Ch | Threads |");
    P("|---|---|---|");
    for (const r of s.rows) P(`| ${mdCell(mdRef(r.beat))} | ${r.chapter} | ${mdCell(r.threads.map((t) => t.title).join(", "))} |`);
    P();
  },
  calls(s, P) {
    if (s.sources.length) { P(`Documents she gave: ${s.sources.map((d) => `\`${d.id}\` ${d.title}`).join("; ")}.`); P(); }
    for (const d of s.calls) {
      P(`### ${d.id} · ${d.date} · ${d.title}${d.kind === "timeline" ? " *(her edits on the timeline)*" : ""}`);
      P();
      if (d.asked) { P(`*Asked:* ${d.asked}`); P(); }
      if (d.quotes.length) { P(d.quotes.map((q) => q.split("\n").map((l) => (l === "" ? ">" : `> ${l}`)).join("\n")).join("\n\n")); P(); }
      else if (d.excerpt) { P(d.excerpt); P(); }
      for (const c of d.changes) P(`- ${c.verb}: ${c.targets.map((t) => `\`${t.id}\``).join(", ")}`);
      if (d.changes.length) P();
    }
  },
  hers(s, P) {
    for (const g of s.groups) {
      P(`### ${g.title} (${g.items.length})`);
      P();
      for (const it of g.items) {
        P(mdFact(it.fact));
        P(`  - about: ${it.entityTitle}${it.usedInside ? " · play material relies on this" : ""}`);
      }
      P();
    }
    if (s.disagreements.length) {
      P("### Where the imports and the merges found pencil that disagrees");
      P();
      for (const d of s.disagreements) { P(`**${d.id} · ${d.title}**`); P(); d.conflicts.forEach((c) => P(`- ${c}`)); P(); }
    }
  },
  ideas(s, P) {
    for (const t of s.topics) {
      P(`### ${t.title} *(${Object.entries(t.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(" · ")})*`);
      P();
      if (t.text) { P(t.text); P(); }
      for (const i of t.ideas) P(`- \`${i.id}\` *(${tagLabel(i)} · ${i.state})* ${i.text}${i.when ? ` — when ${i.when}` : ""}${i.became.length ? ` — became ${i.became.map((r) => `\`${r.id}\``).join(", ")}` : ""}${i.retire.length ? ` — never say ${i.retire.map((p) => `“${p}”`).join(", ")}` : ""}`);
      P();
    }
  },
  cut(s, P) {
    if (s.facts.length) { s.facts.forEach((v) => P(mdFact(v))); P(); }
    if (s.retired.length) { P("**The wording that must not come back**"); P(); s.retired.forEach((r) => P(`- “${r.phrase}” (cut with \`${r.from.id}\`)`)); P(); }
  },
  roads(s, P) {
    P("| What they can conclude | Answerable by | Roads | Earliest road |");
    P("|---|---|---|---|");
    for (const c of s.cards) P(`| ${mdCell(c.title)} | ${mdCell(c.answered ? mdPlace(c.answered) : "—")} | ${mdCell(c.roads.map((r) => `${r.core ? "core " : ""}${r.kind}: ${r.ref.id}`).join("; ") || "—")} | ${mdCell(c.earliest ? mdPlace(c.earliest) : "—")} |`);
    P();
  },
  plants(s, P) {
    P("| The plant | Pays off |");
    P("|---|---|");
    for (const r of s.rows) P(`| ${mdCell(mdRef(r.plant))} | ${mdCell(mdRef(r.payoff))} |`);
    P();
  },
  flashbacks(s, P) {
    P("| Ch | The flashback | When |");
    P("|---|---|---|");
    for (const r of s.rows) P(`| ${r.chapter} | ${mdCell(mdRef(r.beat))} | ${mdCell(r.when || "")} |`);
    P();
  },
};

function mdChapter(c, P) {
  P(`### Chapter ${c.n}: ${c.title}${c.tag ? ` *(${tagLabel(c)})*` : ""}`);
  P();
  P(`${c.rank ? `*${c.rank}.* ` : ""}${c.built ? `The plan, scene by scene: ${c.episodes.map((e) => `${e.name} (${plural(e.scenes, "scene")})`).join("; ")}. The ones written in detail are in Part Zero above.` : c.text}`);
  P();
  if (c.learn) { P(`**What they learn:** ${c.learn}`); P(); }
  const beat = (b, i) => {
    const mark = [b.pace ? PACE_GLYPH[b.pace] : "", b.kind === "reveal" ? "reveal" : b.kind === "flashback" ? "flashback" : "", b.fork ? "fork" : ""].filter(Boolean).join(" ");
    P(`${i + 1}. ${mark ? `*(${mark})* ` : ""}${b.text}${b.when ? ` — when ${b.when}` : ""}${b.reveals.length ? ` — would reveal ${b.reveals.map((r) => `\`${r.id}\``).join(", ")}` : ""} \`${b.id}\``);
    for (const v of b.tells) P(mdFact(v, "   "));
  };
  if (c.table.length) { P("**At the table**"); P(); c.table.forEach(beat); P(); }
  if (c.choices.length) { P("**Choices**"); P(); c.choices.forEach(beat); P(); }
  if (c.finds.length) { P("**What they can find out**"); P(); c.finds.forEach((v) => P(mdFact(v))); P(); }
  if (c.notes) { P("**GM notes** *(GM-only)*"); P(); P(c.notes); P(); }
  if (c.ends.length) { P("**Where it leaves them**"); P(); c.ends.forEach(beat); P(); }
  // A pointer, so it must not look like a fact's record (the bullet that starts with its id in backticks).
  if (c.due.length) { P("**Hers to decide by this chapter**"); P(); c.due.forEach((r) => P(`- open: ${mdRef(r)}`)); P(); }
}
