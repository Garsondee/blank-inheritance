// The timeline's inspector (design/plot-timeline.md §4): everything canon holds about what is selected, in the order
// to trust it: the words, the status and who set it, who in the world knows it and when the table hears it, the
// decisions behind it with Ingram's words, every place that uses it, and what must never come back.
import { health } from "./core/timeline-health.mjs";
import { mergeFor } from "./core/timeline-views.mjs";
import { parseSceneNote } from "./core/timeline-play.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const STATUS_VAR = { decided: "--s-decided", accepted: "--s-accepted", provisional: "--s-pending", proposal: "--s-pending", sketch: "--s-sketch", open: "--s-open", cut: "--s-cut" };
const STATUS_WORD = { decided: "ink · decided", accepted: "ink · accepted", provisional: "ink · awaiting her read", proposal: "ink · Claude's proposal", sketch: "pencil", open: "open", cut: "cut" };
const STOP = new Set(["the", "and", "that", "this", "with", "from", "they", "them", "their", "have", "about", "into", "what", "when", "which", "where", "there", "were", "will", "would", "been", "only", "than", "then", "also", "some", "more"]);

/** What a merged item was made from: the pieces as they were, and where it stands with her (Claude's merge, D080). */
export function mergedHtml(mg) {
  const state = mg.accepted ? "You said this looks right." : mg.edited ? "Edited since it was merged." : "Claude made this merge: read the pieces and say if it reads as one thing.";
  const why = String(mg.why || "Pieces of one thing").trim().replace(/^./, (c) => c.toUpperCase()).replace(/[.!?]*$/, ".");
  const piece = (p) => `<li><span class="pid">${esc(p.id)}</span> ${esc(p.text)}${p.known || p.told ? ` <span class="muted">(${[p.known ? `known: ${p.known}` : "", p.told ? `told: ${p.told}` : ""].filter(Boolean).join(" · ")})</span>` : ""}</li>`;
  return `<section class="merged"><h3>Merged from ${mg.pieces.length} pieces · ${esc(mg.ref)}</h3><div class="muted">${esc(why)} ${esc(state)}</div><ul class="pieces">${mg.pieces.map(piece).join("")}</ul></section>`;
}

/** Her words behind an item: each decision it cites, with the quoted passages that name it (shared with review mode). */
export function wordsHtml(index, sources, keys) {
  const lower = [...new Set(keys.flatMap((k) => String(k || "").toLowerCase().split(/[^a-z0-9']+/)))].filter((k) => k.length > 3 && !STOP.has(k));
  const out = [];
  for (const s of [...new Set(sources || [])].sort()) {
    const d = index.decisions.get(s);
    if (!d) continue;
    if (d.kind === "import" || d.kind === "merge") { out.push(`<div class="dec">${esc(d.id)} · ${esc(d.title)}: Claude's record of the ${d.kind === "merge" ? "merge" : "import"}, not her words.</div>`); continue; }
    const hits = d.quotes.filter((q) => lower.some((k) => q.toLowerCase().includes(k)));
    out.push(`<div class="dec"><b>${esc(d.id)}</b> · ${esc(d.date)} · ${esc(d.title)}</div>`);
    if (!d.quotes.length) out.push('<div class="muted">No quoted words in this record.</div>');
    else if (!hits.length) out.push(`<div class="muted">Her words here don't name it directly (${d.quotes.length} quoted passage${d.quotes.length === 1 ? "" : "s"} in the record).</div>`);
    for (const q of hits.slice(0, 3)) out.push(`<blockquote>${esc(q.length > 900 ? `${q.slice(0, 900)}…` : q)}</blockquote>`);
  }
  return out.length ? out.join("") : '<div class="muted">No decision behind it yet.</div>';
}

export function renderInspector(box, ctx, target) {
  const { snap, index, select, close } = ctx;
  const link = (id, text) => {
    if (!id) return "";
    const label = esc(text || id);
    return `<a data-go="${esc(id)}">${label}</a>`;
  };
  const go = (id) => {
    if (id.startsWith("entity:") || id.startsWith("book:")) return id;
    if (index.facts.has(id)) return id;
    if (index.scenes.has(id)) return `scene:${id}`;
    if (index.beats.has(id)) return `beat:${id}`;
    if (index.chapters.has(id)) return `chapter:${id}`;
    if (index.questions.has(id)) return `question:${id}`;
    if (index.ideas.has(id)) return `idea:${id}`;
    if (index.threads.has(id)) return `thread:${id}`;
    return null;
  };
  const place = (told) => {
    if (!told) return "—";
    if (told === "start") return "from Scene 0";
    if (told === "later") return "not scheduled yet";
    const id = told.slice(3);
    const s = index.scenes.get(id), b = index.beats.get(id), c = index.chapters.get(id);
    const name = s ? s.title : b ? `a beat in Chapter ${b.n}` : c ? `Chapter ${c.n} · ${c.title}` : id;
    return link(id, name);
  };
  const tags = (it) => {
    const out = [];
    if (it.status) out.push(`<span class="tag st" style="--sc:var(${STATUS_VAR[it.status] || "--s-sketch"})">${esc(STATUS_WORD[it.status] || it.status)}${it.by ? ` · by ${esc(it.by)}` : ""}</span>`);
    return out;
  };
  const words = (sources, keys) => wordsHtml(index, sources, keys);
  const uses = (id) => {
    const list = (snap.citations?.[id] || []).filter((w) => w.as !== "change");
    if (!list.length) return '<div class="muted">Nothing uses it yet.</div>';
    return `<ul>${list.map((w) => {
      const m = w.file.match(/canon\/(scenes|objectives)\/(.+)\.json$/);
      const where = m ? link(m[1] === "scenes" ? m[2] : null, m[2]) || esc(m[2]) : esc(w.file.replace(/^canon\//, ""));
      const at = go(w.at) ? link(w.at, w.at) : esc(w.at);
      return `<li>${where} · ${at} <span class="muted">(${esc(w.as)})</span></li>`;
    }).join("")}</ul>`;
  };
  const head = (title, id, kind) => `<header><h2>${esc(title)}</h2><button class="x" aria-label="Close">×</button></header><div class="id">${esc(kind)}${id ? ` · ${esc(id)}` : ""}</div>`;

  let html = "";
  let id = target;
  if (index.facts.has(target)) id = `fact:${target}`;
  const [kind, ...rest] = id.split(":");
  const ref = rest.join(":");

  if (kind === "event" || kind === "reveal" || kind === "fact") {
    const f = index.facts.get(ref);
    const e = index.entities.get(f.entity);
    const plantedBy = snap.facts.filter((x) => x.payoff === f.id);
    const revealBeat = [...index.beats.values()].find((b) => (b.reveals || []).includes(f.id));
    html += head(e ? e.title : f.entity, f.id, "fact");
    html += `<div class="id"><a data-go="entity:${esc(f.entity)}">Everything about ${esc(e ? e.title : f.entity)}</a></div>`;
    html += `<div class="tags">${tags(f).join("")}<span class="tag">known: ${esc(f.known)}</span>${f.when ? `<span class="tag">when: ${esc(f.when)}</span>` : ""}</div>`;
    html += `<p class="text">${esc(f.text)}</p>`;
    const merged = mergeFor(snap, f.id);
    if (merged) html += mergedHtml(merged);
    html += `<dl class="kv"><dt>The table hears it</dt><dd>${place(f.told)}${revealBeat && f.told === "later" ? `; planned in ${link(revealBeat.id, `a beat in Chapter ${revealBeat.n}`)}` : ""}</dd>`;
    if (f.heldBy) html += `<dt>A belief</dt><dd>held by ${esc(f.heldBy)}; true: ${esc(f.isTrue)}${f.truth ? `; the truth: ${link(f.truth)}` : ""}</dd>`;
    if (f.payoff) html += `<dt>Pays off</dt><dd>${link(f.payoff)}</dd>`;
    if (plantedBy.length) html += `<dt>Planted by</dt><dd>${plantedBy.map((p) => link(p.id)).join(", ")}</dd>`;
    if (f.threads?.length) html += `<dt>Threads</dt><dd>${f.threads.map((t) => link(t, index.threads.get(t)?.title || t)).join(", ")}</dd>`;
    if (f.origin) html += `<dt>From</dt><dd>${esc(f.origin)}</dd>`;
    html += "</dl>";
    if (f.status === "open") {
      html += "<h3>Hers to decide</h3>";
      html += f.candidates?.length ? `<ul>${f.candidates.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : '<div class="muted">No candidates listed.</div>';
      if (f.decideBy) html += `<div class="dec">Decide by: ${esc(f.decideBy)}</div>`;
    }
    html += `<h3>Her words</h3>${words(f.source, [f.text, e?.title, f.entity])}`;
    html += `<h3>Used by</h3>${uses(f.id)}`;
    if (f.retire?.length) html += `<h3>Never say</h3><ul>${f.retire.map((r) => `<li>"${esc(r)}"</li>`).join("")}</ul>`;
  } else if (kind === "book") {
    const b = (snap.books || []).find((x) => x.id === ref);
    html += head(`Book ${b.numeral} · ${b.title}`, b.id, "book");
    html += `<div class="tags">${tags(b).join("")}<span class="tag">chapters ${b.from} to ${b.to}</span></div>`;
    if (b.text) html += `<p class="text">${esc(b.text)}</p>`;
    if ((b.rows || []).length) html += `<dl class="kv">${b.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
    const chapters = (snap.chapters || []).filter((c) => c.n >= b.from && c.n <= b.to);
    if (chapters.length) html += `<h3>Chapters</h3><ul>${chapters.map((c) => `<li>${link(c.id, `${c.n} · ${c.title}`)}${c.learn ? ` <span class="muted">— ${esc(c.learn)}</span>` : ""}</li>`).join("")}</ul>`;
    const rises = (snap.threads || []).filter((t) => t.byBook && t.byBook[b.book]);
    if (rises.length) html += `<h3>What each thread does in this Book</h3><dl class="kv">${rises.map((t) => `<dt>${link(t.id, t.title)}</dt><dd>${esc(t.byBook[b.book])}</dd>`).join("")}</dl>`;
    html += `<h3>Her words</h3>${words(b.source, [b.text, b.title])}`;
  } else if (kind === "scene") {
    const s = index.scenes.get(ref);
    const note = parseSceneNote(s.note);
    const route = ctx.routing ? ctx.routing(s.id) : null;
    html += head(s.title, s.id, "scene");
    html += `<div class="tags"><span class="tag">${esc(s.episode || "")}</span><span class="tag">${s.chapter >= 2 ? `chapter ${s.chapter}` : `day ${s.day ?? "—"}, ${esc(s.time)}`}</span><span class="tag">${esc(s.state)}</span>${note.kind ? `<span class="tag">${esc(KIND_WORD[note.kind])}</span>` : ""}${note.fight ? '<span class="tag">⚔ a fight</span>' : ""}</div>`;
    // The plan's own words for the scene, one labelled paragraph each ("Arrive: ... // Do: ... // Next: ..."). Its routing is shown as links below.
    for (const part of note.parts) {
      const m = part.match(/^([A-Z][A-Za-z ]{1,24}): (.+)$/);
      html += m ? `<p class="text"><b>${esc(m[1])}:</b> ${esc(m[2])}</p>` : `<p class="text">${esc(part)}</p>`;
    }
    if (route && (route.after.length || route.next.length)) {
      const sceneLink = (x) => link(x.id, x.title);
      html += '<dl class="kv">';
      if (route.after.length) html += `<dt>Comes after</dt><dd>${route.after.map(sceneLink).join(", ")}</dd>`;
      if (route.branch) html += `<dt>How they get here</dt><dd>${esc(route.branch)}</dd>`;
      if (route.next.length) html += `<dt>Leads to</dt><dd>${route.next.map(sceneLink).join(", ")}</dd>`;
      html += "</dl>";
    }
    if (!s.inCanon) html += s.state === "unwritten" ? '<p class="muted">Planned, not written yet.</p>' : '<p class="muted">Not rebuilt in canon yet: the old draft still runs in Foundry.</p>';
    for (const b of s.beats || []) {
      if (!b.facts.length && !b.gmFacts.length) continue;
      html += `<h3>${esc(b.title || b.id)}</h3><ul>${b.facts.map((x) => `<li>tells ${link(x)}</li>`).join("")}${b.gmFacts.map((x) => `<li class="muted">relies on ${link(x)}</li>`).join("")}</ul>`;
    }
  } else if (kind === "chapter") {
    const c = index.chapters.get(ref);
    html += head(`Chapter ${c.n} · ${c.title}`, c.id, "chapter");
    html += `<div class="tags">${tags(c).join("")}${c.book ? `<span class="tag">Book ${esc(c.book)}</span>` : ""}${c.rank ? `<span class="tag">${esc(c.rank)}</span>` : ""}</div>`;
    if (c.text) html += `<p class="text">${esc(c.text)}</p>`;
    if (c.learn) html += `<dl class="kv"><dt>They learn</dt><dd>${esc(c.learn)}</dd></dl>`;
    if (c.beats?.length) html += `<h3>Beats</h3><ul>${c.beats.map((b) => `<li>${link(b.id, b.text.length > 110 ? `${b.text.slice(0, 110)}…` : b.text)} <span class="muted">(${esc(b.kind)}${b.fork === "yes" ? ", a fork" : ""})</span></li>`).join("")}</ul>`;
    const here = new Set([c.id, ...(c.beats || []).map((b) => b.id)]);
    const told = snap.facts.filter((f) => /^in:/.test(f.told || "") && here.has(f.told.slice(3)));
    if (told.length) html += `<h3>The table learns</h3><ul>${told.map((f) => `<li>${link(f.id, f.text.length > 100 ? `${f.text.slice(0, 100)}…` : f.text)}</li>`).join("")}</ul>`;
  } else if (kind === "beat") {
    const b = index.beats.get(ref);
    html += head(`A beat in Chapter ${b.n}`, b.id, "beat");
    html += `<div class="tags">${tags(b).join("")}<span class="tag">${esc(b.kind)}</span>${b.pace ? `<span class="tag">pace: ${esc(b.pace)}</span>` : ""}${b.fork === "yes" ? '<span class="tag">a fork</span>' : ""}${b.when ? `<span class="tag">when: ${esc(b.when)}</span>` : ""}</div>`;
    html += `<p class="text">${esc(b.text)}</p>`;
    html += `<dl class="kv"><dt>Chapter</dt><dd>${link(b.chapter, `Chapter ${b.n} · ${b.chapterTitle}`)}</dd>`;
    if (b.threads?.length) html += `<dt>Threads</dt><dd>${b.threads.map((t) => link(t, index.threads.get(t)?.title || t)).join(", ")}</dd>`;
    if (b.reveals?.length) html += `<dt>Reveals</dt><dd>${b.reveals.map((r) => link(r)).join(", ")}</dd>`;
    if (b.origin) html += `<dt>From</dt><dd>${esc(b.origin)}</dd>`;
    html += "</dl>";
    const told = snap.facts.filter((f) => f.told === `in:${b.id}`);
    if (told.length) html += `<h3>The table learns here</h3><ul>${told.map((f) => `<li>${link(f.id, f.text)}</li>`).join("")}</ul>`;
    html += `<h3>Her words</h3>${words(b.source, [b.text])}`;
    html += `<h3>Used by</h3>${uses(b.id)}`;
  } else if (kind === "question") {
    const q = index.questions.get(ref);
    html += head(q.title, q.id, "question");
    html += `<div class="tags">${tags(q).join("")}</div>`;
    if (q.text) html += `<p class="text">${esc(q.text)}</p>`;
    html += `<dl class="kv"><dt>The answer</dt><dd>${link(q.answer)}</dd>`;
    if (q.misdirect) html += `<dt>What misleads</dt><dd>${link(q.misdirect)}</dd>`;
    html += `<dt>First wondered</dt><dd>${place(q.raised)}</dd><dt>Can be known</dt><dd>${place(q.answered)}</dd></dl>`;
    html += `<h3>Roads to it (${q.roads.length})</h3><ul>${q.roads.map((r) => `<li>${r.core ? "<b>core</b> · " : ""}${esc(r.kind)} · ${link(r.fact)}${r.note ? ` <span class="muted">(${esc(r.note)})</span>` : ""}</li>`).join("")}</ul>`;
    if (q.roads.length < 3) html += '<p class="muted">Fewer than three roads: the Three Clue Rule asks for three, so no discovery hangs on one roll on one night.</p>';
  } else if (kind === "idea") {
    const i = index.ideas.get(ref);
    html += head("An idea", i.id, "idea");
    html += `<div class="tags">${tags(i).join("")}<span class="tag">${esc(i.state)}</span>${i.when ? `<span class="tag">when: ${esc(i.when)}</span>` : ""}</div>`;
    html += `<p class="text">${esc(i.text)}</p><p class="muted">An idea is never a fact: adopting it turns it into facts or beats.</p>`;
    const mergedIdea = mergeFor(snap, i.id);
    if (mergedIdea) html += mergedHtml(mergedIdea);
    if (i.became?.length) html += `<h3>It became</h3><ul>${i.became.map((x) => `<li>${link(x)}</li>`).join("")}</ul>`;
  } else if (kind === "thread") {
    const t = index.threads.get(ref);
    html += head(t.title, t.id, t.kind === "front" ? "front" : "thread");
    html += `<div class="tags">${tags(t).join("")}<span class="tag">${esc(t.lane || "")}</span></div>`;
    if (t.text) html += `<p class="text">${esc(t.text)}</p>`;
    if (t.impulse || t.doom) html += `<dl class="kv">${t.impulse ? `<dt>It wants</dt><dd>${esc(t.impulse)}</dd>` : ""}${t.doom ? `<dt>Where it ends if nobody stops it</dt><dd>${esc(t.doom)}</dd>` : ""}</dl>`;
    const books = Object.entries(t.byBook || {});
    if (books.length) html += `<h3>Book by Book</h3><dl class="kv">${books.map(([n, text]) => `<dt>Book ${["I", "II", "III", "IV", "V"][n - 1]}</dt><dd>${esc(text)}</dd>`).join("")}</dl>`;
    for (const c of t.clocks || []) html += `<h3>Clock · ${esc(c.name)}</h3><ol>${c.items.map((x) => `<li>${link(x, labelFor(index, x))}</li>`).join("")}</ol>`;
    if (t.entities?.length) html += `<h3>Who and what</h3><div>${t.entities.map((e) => esc(index.entities.get(e)?.title || e)).join(", ")}</div>`;
  } else if (kind === "strand") {
    // A strand: the few rows the rest of the story is read in (core/timeline-lanes.mjs).
    if (ref === "mysteries") {
      html += head("The mysteries", "", "strand");
      html += '<p class="muted">What the table is made to wonder, the clues that reach it, and where it can be answered.</p>';
      html += `<h3>Questions</h3><ul>${(snap.questions || []).map((q) => `<li>${link(q.id, q.title)}</li>`).join("")}</ul>`;
    } else {
      const lane = ctx.tl?.lanes.find((l) => l.key === ref);
      if (!lane) html += head("Nothing here", target, "");
      else {
        html += head(lane.title, ref, "strand");
        const threads = lane.threads || [];
        html += `<p class="muted">${threads.length} thread${threads.length === 1 ? "" : "s"} and ${lane.entities.length} people, places and things are read in this row.</p>`;
        if (threads.length) html += `<h3>Threads</h3><ul>${threads.map((t) => `<li>${link(t, index.threads.get(t)?.title || t)}</li>`).join("")}</ul>`;
        const who = lane.entities.map((e) => ({ id: e, title: index.entities.get(e)?.title || e })).sort((a, b) => a.title.localeCompare(b.title));
        if (who.length) html += `<h3>Who and what</h3><ul>${who.map((e) => `<li>${link(`entity:${e.id}`, e.title)}</li>`).join("")}</ul>`;
      }
    }
  } else if (kind === "cell") {
    // Every note a strand holds under one column of the Timeline (a crowded cell shows only the first few).
    const cut = ref.indexOf(":");
    const cell = ctx.playCell ? ctx.playCell(ref.slice(0, cut), ref.slice(cut + 1)) : null;
    if (!cell) html += head("Nothing here", target, "");
    else {
      html += head(cell.lane.title, "", `${cell.total} notes under ${cell.groups.map((g) => g.node.title).join(" / ")}`);
      for (const g of cell.groups) {
        const first = g.node.members ? g.node.members[0] : g.node.id;
        html += `<h3>${link(first, g.node.title)}</h3><ul>${g.notes.map((n) => `<li>${link(n.ref, clipText(n.text, 220))} <span class="muted">(${esc(n.status || "")}${n.by ? ` by ${esc(n.by)}` : ""})</span></li>`).join("")}</ul>`;
      }
    }
  } else if (kind === "scenes") {
    const ids = ref.split(",");
    const first = index.scenes.get(ids[0]);
    html += head(`${first?.episode || "Scenes"}: ${ids.length} choices`, "", `day ${first?.day ?? "—"}, ${first?.time || ""}`);
    html += '<p class="muted">Scenes at the same moment, each a choice the players make.</p>';
    html += `<ul>${ids.map((x) => `<li>${link(x, index.scenes.get(x)?.title || x)} <span class="muted">(${esc(index.scenes.get(x)?.state || "")})</span></li>`).join("")}</ul>`;
  } else if (kind === "cluster") {
    const ids = ref.split(",");
    html += head(`${ids.length} things the table learns here`, "", "where the table learns");
    html += `<ul>${ids.map((x) => { const f = index.facts.get(x); return `<li>${link(x, f ? f.text : x)} <span class="muted">(${esc(f?.status || "")})</span></li>`; }).join("")}</ul>`;
  } else if (kind === "health") {
    const h = health(snap, { publishedHash: snap.published?.canonHash || null });
    html += head("What needs attention", "", `up to the end of Chapter ${h.horizon}`);
    const groups = {};
    for (const f of h.findings) (groups[f.check] ||= []).push(f);
    const names = { "decision-due": "Decisions due", "weak-question": "Questions with too few roads", "unplanted-payoff": "Payoffs nothing plants", "clock-stuck": "Clocks with no next step", "thread-silent": "Threads gone quiet", "told-unused": "Secrets told and never used again", "down-run": "Runs of slow beats", "stale-copy": "The copy is behind" };
    for (const [check, list] of Object.entries(groups)) html += `<h3>${esc(names[check] || check)} (${list.length})</h3><ul>${list.map((f) => `<li>${go(f.id) ? link(f.id) : esc(f.id)}: ${esc(f.message)}</li>`).join("")}</ul>`;
    if (!h.findings.length) html += '<p class="muted">Nothing needs attention inside the horizon.</p>';
  } else {
    html += head("Nothing here", target, "");
  }
  box.innerHTML = html;
  box.querySelector(".x")?.addEventListener("click", close);
  for (const a of box.querySelectorAll("a[data-go]")) a.addEventListener("click", () => { const g = go(a.dataset.go); if (g) select(g); });
  box.scrollTop = 0;
}

const KIND_WORD = Object.freeze({ plot: "plot", downtime: "downtime", light: "lighter" });
const clipText = (text, n) => { const t = String(text ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };

function labelFor(index, id) {
  const f = index.facts.get(id); if (f) return f.text.length > 90 ? `${f.text.slice(0, 90)}…` : f.text;
  const b = index.beats.get(id); if (b) return b.text.length > 90 ? `${b.text.slice(0, 90)}…` : b.text;
  const s = index.scenes.get(id); if (s) return s.title;
  return id;
}
