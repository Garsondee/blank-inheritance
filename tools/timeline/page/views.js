// The plot timeline's other ways in (design/plot-timeline.md §4, D070, D079). The strip shows what happens when, but most
// of the story is not an event in time, so the page also reaches everything by who or what it is about ("People &
// places", one page per entity), by what is still hers to decide ("Decisions"), by what the strip couldn't place ("Not
// placed"), and by searching all of it. The read-only copy loads this file too; the editing hooks (answer a decision,
// place a fact by typing its `when`) appear only when the live page hands in `editing`.
import { entityGroups, entityPage, searchAll, unplacedGroups, decisionGroups, whenForCandidate, recentDecisions, recordPage, mergesPage, mergeFor, bucketOf, KIND_TITLE } from "./core/timeline-views.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const STATUS_VAR = { decided: "--s-decided", accepted: "--s-accepted", provisional: "--s-pending", proposal: "--s-pending", sketch: "--s-sketch", open: "--s-open", cut: "--s-cut" };
const STATUS_WORD = { decided: "ink", accepted: "ink ✓", provisional: "ink (awaiting her read)", proposal: "ink (proposal)", sketch: "pencil", open: "open", cut: "cut" };
const KIND_WORD = { fact: "fact", beat: "beat", idea: "idea", question: "question", thread: "thread", entity: "who or what", scene: "scene", chapter: "chapter" };

/** Wrap each search term in <mark>, on text that is already escaped. */
function marked(text, terms) {
  let out = esc(text);
  for (const t of terms) if (t.length > 1) out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>");
  return out;
}

const chip = (status, by) => `<span class="sdot" style="--sc:var(${STATUS_VAR[status] || "--s-sketch"})" title="${esc(STATUS_WORD[status] || status || "")}${by ? ` · by ${esc(by)}` : ""}"></span>`;

/**
 * @param {{ getSnap: () => object, getTimeline: () => object, select: (target: string) => void, reveal: (target: string) => void,
 *           showLane: (entityId: string) => void, threadColour: (threadId: string) => string, editing: () => object|null,
 *           setQuery: (q: string) => void, onView: (view: string) => void }} ctx
 */
export function createViews(ctx) {
  const state = { kinds: null, filter: "" };
  // What she has typed into a decision's answer, kept so that a redraw (a save elsewhere, Claude's edit arriving) never loses it.
  const drafts = new Map();
  // Which sections she has opened or closed, so a redraw (a save, Claude's edit arriving) leaves them as they were.
  const openState = new Map();
  const remember = (d, key, dflt) => { d.open = openState.has(key) ? openState.get(key) : dflt; d.addEventListener("toggle", () => openState.set(key, d.open)); };

  // ---- search: one box, the whole story
  function attachSearch(input, box) {
    let results = [];
    let active = 0;
    let timer = null;
    const close = () => { box.hidden = true; };
    const pick = (r) => {
      if (!r) return;
      close();
      ctx.select(r.target);
      ctx.reveal(r.target);
    };
    const draw = () => {
      const q = input.value.trim();
      if (!q || !results.length) {
        box.innerHTML = q ? '<div class="res-none">Nothing in the story says that.</div>' : "";
        box.hidden = !q;
        return;
      }
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      const r = input.getBoundingClientRect();
      const w = Math.min(620, window.innerWidth - 32);
      box.style.width = `${w}px`;
      box.style.left = `${Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) - r.left}px`;
      box.innerHTML = `${results.map((r, i) => `<button class="res${i === active ? " on" : ""}" data-i="${i}" role="option"><span class="rk">${esc(KIND_WORD[r.kind] || r.kind)}</span>${chip(r.status, r.by)}<span class="rt">${marked(r.title, terms)}</span><span class="rs">${marked(r.snippet, terms)}</span></button>`).join("")}${results.length >= 30 ? '<div class="res-none">The first 30. Add a word to narrow it.</div>' : ""}`;
      box.hidden = false;
      box.querySelector(".res.on")?.scrollIntoView({ block: "nearest" });
    };
    input.addEventListener("input", () => {
      const q = input.value.trim();
      results = q ? searchAll(ctx.getSnap(), q, { limit: 30 }) : [];
      active = 0;
      draw();
      clearTimeout(timer);
      timer = setTimeout(() => ctx.setQuery(q), 250);
    });
    input.addEventListener("focus", () => { if (input.value.trim()) draw(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (results.length) { active = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length; draw(); } }
      else if (e.key === "Enter") { e.preventDefault(); pick(results[active]); }
      else if (e.key === "Escape") { if (!box.hidden) { e.stopPropagation(); close(); } else if (input.value) { input.value = ""; ctx.setQuery(""); } }
    });
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", (e) => { const b = e.target.closest(".res"); if (b) pick(results[Number(b.dataset.i)]); });
    document.addEventListener("click", (e) => { if (!box.contains(e.target) && e.target !== input) close(); });
    return { refresh() { if (input.value.trim()) { results = searchAll(ctx.getSnap(), input.value.trim(), { limit: 30 }); active = Math.min(active, Math.max(0, results.length - 1)); if (!box.hidden) draw(); } } };
  }

  // ---- People & places: every entity as a card, by kind
  function renderEntities(root) {
    const snap = ctx.getSnap();
    root.innerHTML = "";
    const all = entityGroups(snap);
    const head = el("div", "lv-head");
    const kinds = el("div", "lv-kinds");
    const mk = (label, active, on) => { const b = el("button", `chipbtn${active ? " on" : ""}`, label); b.setAttribute("aria-pressed", String(active)); b.addEventListener("click", on); kinds.append(b); };
    mk(`Everything (${all.reduce((n, g) => n + g.entities.length, 0)})`, !state.kinds, () => { state.kinds = null; renderEntities(root); });
    for (const g of all) mk(`${g.title} (${g.entities.length})`, state.kinds?.includes(g.kind), () => { state.kinds = state.kinds?.includes(g.kind) ? null : [g.kind]; renderEntities(root); });
    const filter = el("input");
    filter.type = "search";
    filter.placeholder = "Filter these…";
    filter.value = state.filter;
    filter.setAttribute("aria-label", "Filter people and places");
    filter.addEventListener("input", () => { state.filter = filter.value; const pos = filter.selectionStart; renderEntities(root); const f = root.querySelector(".lv-head input"); f?.focus(); f?.setSelectionRange(pos, pos); });
    head.append(kinds, filter);
    root.append(head);
    const groups = entityGroups(snap, { query: state.filter, kinds: state.kinds });
    if (!groups.length) root.append(el("p", "muted", "Nothing matches."));
    for (const g of groups) {
      root.append(el("h2", "lv-h", `${g.title} · ${g.entities.length}`));
      const grid = el("div", "lv-grid");
      for (const e of g.entities) {
        const c = el("button", "ecard");
        c.dataset.entity = e.id;
        c.innerHTML = `<div class="ttl">${esc(e.title)}</div><div class="cnt">${e.counts.ink ? `<span class="c-ink">${e.counts.ink} ink</span>` : ""}${e.counts.pencil ? `<span class="c-pen">${e.counts.pencil} pencil${e.counts.cards ? ` in ${e.counts.cards} cards` : ""}</span>` : ""}${e.counts.open ? `<span class="c-opn">${e.counts.open} open</span>` : ""}</div><div class="snip">${esc(e.snippet)}</div><div class="thr">${e.threads.map((t) => `<span class="td" style="background:${ctx.threadColour(t.id)}" title="${esc(t.title)}"></span>`).join("")}</div>`;
        c.addEventListener("click", () => ctx.select(`entity:${e.id}`));
        grid.append(c);
      }
      root.append(grid);
    }
  }

  // ---- one entity's page (in the side panel)
  function renderEntityPage(box, id, { close }) {
    const snap = ctx.getSnap();
    const page = entityPage(snap, id);
    if (!page) { box.innerHTML = `<header><h2>Nothing here</h2><button class="x" aria-label="Close">×</button></header><div class="id">${esc(id)}</div>`; box.querySelector(".x").addEventListener("click", close); return; }
    const { entity } = page;
    const total = page.open.length + page.ink.length + page.pencil.length;
    box.innerHTML = `<header><h2>${esc(entity.title)}</h2><button class="x" aria-label="Close">×</button></header><div class="id">${esc(KIND_TITLE[entity.kind] || entity.kind)} · ${esc(entity.id)}</div>
      <div class="tags"><span class="tag">${page.ink.length} ink</span><span class="tag">${page.pencil.length} pencil</span>${page.open.length ? `<span class="tag open">${page.open.length} open</span>` : ""}${page.threads.map((t) => `<span class="tag th" style="--c:${ctx.threadColour(t.id)}"><a data-target="thread:${esc(t.id)}">${esc(t.title)}</a></span>`).join("")}</div>`;
    const actions = el("div", "ed-row");
    const lane = ctx.laneOf(entity.id) ? el("button", "btn", "On the timeline") : null;
    if (lane) { lane.title = "Find it on the strip"; lane.addEventListener("click", () => ctx.showLane(entity.id)); actions.append(lane); }
    box.append(actions);
    const filter = el("input");
    filter.type = "search";
    filter.placeholder = `Filter ${total} facts…`;
    filter.setAttribute("aria-label", "Filter this page");
    box.append(filter);
    const body = el("div", "ep-body");
    box.append(body);

    const fact = (f) => {
      const li = el("li", "frow");
      const meta = [f.known && f.known !== "nobody" ? `known: ${f.known}` : f.known === "nobody" ? "known to nobody" : null, f.when ? `when: ${f.when}` : null, f.told && f.told !== "later" ? `told: ${f.told === "start" ? "Scene 0" : f.told.replace(/^in:/, "")}` : null].filter(Boolean);
      const merge = mergeFor(snap, f.id);
      if (merge) meta.push(merge.accepted ? "merged · looks right" : `merged from ${merge.pieces.length}`);
      li.innerHTML = `${chip(f.status, f.by)}<a data-target="${esc(f.id)}">${esc(f.text)}</a>${meta.length ? `<span class="fmeta">${esc(meta.join(" · "))}</span>` : ""}`;
      li.dataset.text = `${f.text} ${f.id}`.toLowerCase();
      return li;
    };
    const section = (title, list, { open = true, note = null } = {}) => {
      if (!list.length) return;
      const d = el("details", "ep-sec");
      remember(d, `${id}:${title}`, open);
      d.innerHTML = `<summary>${esc(title)} <span class="n">${list.length}</span></summary>`;
      if (note) d.append(el("p", "muted", note));
      const ul = el("ul", "flist");
      for (const f of list) ul.append(fact(f));
      d.append(ul);
      body.append(d);
    };
    section("Hers to decide", page.open, { note: "Open: the decisions view is where these are answered." });
    section("Ink", page.ink);
    if (page.cards.length) {
      const d = el("details", "ep-sec");
      remember(d, `${id}:Pencil`, true);
      d.innerHTML = `<summary>Pencil <span class="n">${page.pencil.length} claims in ${page.cards.length + (page.loose.length ? 1 : 0)} groups</span></summary>`;
      d.append(el("p", "muted", "A card groups pencil about one thing. Every claim in it keeps its own words, author, who knows it and when the table hears it."));
      const group = (key, title, list) => {
        const cd = el("details", "ep-card");
        remember(cd, `${id}:card:${key}`, false);
        cd.innerHTML = `<summary>${esc(title)} <span class="n">${list.length}</span></summary>`;
        const ul = el("ul", "flist");
        for (const f of list) ul.append(fact(f));
        cd.append(ul);
        d.append(cd);
      };
      for (const c of page.cards) group(c.id, c.title, c.facts);
      if (page.loose.length) group("loose", "Not in a card yet", page.loose);
      body.append(d);
    } else section("Pencil", page.pencil, { open: page.ink.length + page.open.length < 6 || page.pencil.length <= 14 });
    if (page.cut.length) section("Cut", page.cut, { open: false });
    if (page.ideas.length) {
      const d = el("details", "ep-sec");
      remember(d, `${id}:ideas`, true);
      d.innerHTML = `<summary>Ideas that mention it <span class="n">${page.ideas.length}</span></summary>`;
      const ul = el("ul", "flist");
      for (const i of page.ideas.slice(0, 15)) { const li = el("li", "frow"); li.dataset.text = `${i.text} ${i.id}`.toLowerCase(); li.innerHTML = `${chip(i.status, i.by)}<a data-target="idea:${esc(i.id)}">${esc(i.text)}</a><span class="fmeta">${esc(i.state || "")}</span>`; ul.append(li); }
      d.append(ul);
      body.append(d);
    }
    for (const [title, text] of Object.entries(entity.notes || {})) {
      const d = el("details", "ep-sec");
      d.innerHTML = `<summary>${esc(title)}</summary><p class="text">${esc(text)}</p>`;
      body.append(d);
    }
    filter.addEventListener("input", () => {
      const q = filter.value.trim().toLowerCase();
      for (const li of body.querySelectorAll(".frow")) li.hidden = Boolean(q) && !li.dataset.text.includes(q);
      if (q) for (const d of body.querySelectorAll("details.ep-sec")) d.open = true;
    });
    box.querySelector(".x").addEventListener("click", close);
    wireTargets(box);
  }

  // ---- what the strip could not place: a list per lane, and a way to place each fact by typing its `when`
  function renderUnplaced(box, laneId, { close }) {
    const snap = ctx.getSnap();
    const tl = ctx.getTimeline();
    const groups = unplacedGroups(snap, tl, laneId);
    const lane = laneId === "all" ? null : tl.lanes.find((l) => l.id === laneId);
    const total = groups.reduce((n, g) => n + g.facts.length, 0);
    const editing = ctx.editing();
    box.innerHTML = `<header><h2>${lane ? esc(lane.title) : "Everything"}: not placed in time</h2><button class="x" aria-label="Close">×</button></header>
      <div class="id">${total} fact${total === 1 ? "" : "s"} with no date and no scene to tell them in</div>
      <p class="muted">Most are traits, secrets and open questions, which are not events: they live on their person's or place's page. ${editing ? "To put one on the strip, type when it happened (\"about 40 years ago\", \"chapter 6, late\", \"4721 AR\") and press Enter." : ""}</p>`;
    const wrap = editing ? editing.watch(el("div")) : el("div");
    for (const g of groups) {
      const d = el("details", "ep-sec");
      remember(d, `${laneId}:${g.entity}`, groups.length <= 3);
      d.innerHTML = `<summary><a data-target="entity:${esc(g.entity)}">${esc(g.title)}</a> <span class="n">${g.facts.length}</span></summary>`;
      const ul = el("ul", "flist");
      for (const f of g.facts) {
        const li = el("li", "frow place");
        li.innerHTML = `${chip(f.status, f.by)}<a data-target="${esc(f.ref)}">${esc(f.text)}</a>`;
        if (editing) {
          const input = el("input");
          input.placeholder = bucketOf(f.status) === "ink" ? "ink: unlock it to place" : "when…";
          input.disabled = bucketOf(f.status) === "ink";
          input.setAttribute("aria-label", `When did this happen: ${f.ref}`);
          input.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" || !input.value.trim()) return;
            e.preventDefault();
            editing.run(box, [{ op: "field", id: f.ref, field: "when", before: f.when || "", value: input.value }], `placed ${f.ref}`);
          });
          li.append(input);
        }
        ul.append(li);
      }
      d.append(ul);
      wrap.append(d);
    }
    if (!groups.length) wrap.append(el("p", "muted", "Everything here is on the strip."));
    box.append(wrap);
    box.querySelector(".x").addEventListener("click", close);
    wireTargets(box);
  }

  // ---- Decisions: every open question, soonest first, with a way to answer
  function renderDecisions(root) {
    const snap = ctx.getSnap();
    const editing = ctx.editing();
    root.innerHTML = "";
    const groups = decisionGroups(snap);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const head = el("div", "lv-head");
    head.innerHTML = `<h2 class="lv-title">${total} decision${total === 1 ? "" : "s"} still yours</h2><p class="muted">Each is a question only Ingram can settle. Ink and pencil never decide these; ${editing ? "pick a candidate or write your own answer, then press Decide: your words are filed in today's record." : "this copy is read-only; answer them on the page served from the repo."}</p>`;
    root.append(head);
    const wrap = el("div", "dv");
    for (const g of groups) {
      wrap.append(el("h2", "lv-h", `${g.title} · ${g.items.length}`));
      for (const d of g.items) wrap.append(decisionCard(d, editing, snap));
    }
    if (!groups.length) wrap.append(el("p", "muted", "Nothing is open. Every decision has an answer."));
    root.append(wrap);
    wireTargets(root);
  }

  function decisionCard(d, editing, snap) {
    const card = el("article", "dcard");
    card.dataset.id = d.id;
    const due = d.usedInside ? "play material relies on it" : d.decideBy ? d.decideBy : "no deadline written";
    card.innerHTML = `<header><a data-target="entity:${esc(d.entity)}">${esc(d.entityTitle)}</a><span class="dd">${esc(due)}</span></header><p class="dq"><a data-target="${esc(d.id)}">${esc(d.text)}</a></p>`;
    if (d.uses.length) card.append(Object.assign(el("div", "uses"), { textContent: `Relied on by: ${[...new Set(d.uses.map((w) => w.file.replace(/^canon\/(scenes|objectives)\//, "").replace(/\.json$/, "")))].join(", ")}` }));
    const answer = editing ? el("textarea", "ed-text") : null;
    const when = editing && d.when ? el("input") : null;
    if (d.candidates.length) {
      const row = el("div", "cands");
      d.candidates.forEach((c, i) => {
        const b = el(editing ? "button" : "span", editing ? "cand" : "cand ro", c);
        if (editing) b.addEventListener("click", () => { answer.value = c; if (when) when.value = whenForCandidate(d.when, d.candidates, i); answer.focus(); answer.dispatchEvent(new Event("input", { bubbles: true })); });
        row.append(b);
      });
      card.append(row);
    }
    if (editing) {
      answer.rows = 2;
      answer.placeholder = "Your answer, in your words…";
      answer.setAttribute("aria-label", `Answer: ${d.id}`);
      card.append(answer);
      if (when) { when.placeholder = "when it happens (optional)"; when.setAttribute("aria-label", `When: ${d.id}`); card.append(when); }
      const draft = drafts.get(d.id);
      if (draft) { answer.value = draft.text; if (when) when.value = draft.when; }
      const keep = () => { if (answer.value || (when && when.value)) drafts.set(d.id, { text: answer.value, when: when ? when.value : "" }); else drafts.delete(d.id); };
      answer.addEventListener("input", keep);
      when?.addEventListener("input", keep);
      const row = el("div", "ed-row");
      const decide = el("button", "btn primary", "Decide");
      decide.addEventListener("click", async () => {
        if (!answer.value.trim()) { answer.focus(); return; }
        const out = await editing.answer(card, d.id, { text: answer.value, when: when ? when.value : "" });
        if (out.ok) drafts.delete(d.id);
      });
      const note = el("button", "btn", "Note for Claude");
      note.addEventListener("click", () => ctx.select(d.id));
      row.append(decide, note);
      card.append(row);
    }
    return card;
  }

  // ---- Recent changes: every decision record, newest first, and what the imports disagreed with
  /** Words with `backticked ids` turned into links to the facts they name. */
  function linked(text, known) {
    return esc(text).replace(/`([^`]+)`/g, (_, id) => (known.has(id) ? `<a data-target="${esc(id)}">${esc(id)}</a>` : `<code>${esc(id)}</code>`));
  }

  function renderRecent(box, { close }) {
    const snap = ctx.getSnap();
    const list = recentDecisions(snap);
    const toConfirm = list.reduce((n, r) => n + r.conflicts, 0);
    box.innerHTML = `<header><h2>Recent changes</h2><button class="x" aria-label="Close">×</button></header><div class="id">Every decision record, newest first</div>
      <p class="muted">Your words, your edits on this page, and what Claude brought in. ${toConfirm ? `The imports kept out or softened <b>${toConfirm}</b> things that disagreed with something you said or with canon: open an import to see each, and say if one should go the other way.` : ""}</p>`;
    const ul = el("div", "reclist");
    for (const r of list) {
      const b = el("button", `rec ${r.kind}`);
      b.innerHTML = `<span class="ri">${esc(r.id)}</span><span class="rd">${esc(r.date)} · ${esc(r.kindWord)}</span><span class="rt">${esc(r.title)}</span><span class="rc">${r.changes ? `${r.changes} change${r.changes === 1 ? "" : "s"}` : ""}${r.conflicts ? ` · <b>${r.conflicts} to confirm</b>` : ""}</span>`;
      b.addEventListener("click", () => ctx.select(`record:${r.id}`));
      ul.append(b);
    }
    box.append(ul);
    box.querySelector(".x").addEventListener("click", close);
  }

  function renderRecord(box, id, { close }) {
    const snap = ctx.getSnap();
    const rec = recordPage(snap, id);
    if (!rec) { box.innerHTML = `<header><h2>No such record</h2><button class="x" aria-label="Close">×</button></header><div class="id">${esc(id)}</div>`; box.querySelector(".x").addEventListener("click", close); return; }
    const known = new Set([...(snap.facts || []).map((f) => f.id), ...(snap.ideas || []).map((i) => i.id), ...(snap.threads || []).map((t) => t.id), ...(snap.questions || []).map((q) => q.id)]);
    box.innerHTML = `<header><h2>${esc(rec.title)}</h2><button class="x" aria-label="Close">×</button></header><div class="id">${esc(rec.id)} · ${esc(rec.date)} · ${esc(rec.kindWord)}</div>
      <div class="ed-row"><button class="btn small" data-back>‹ Recent changes</button></div>`;
    if (rec.asked) box.append(Object.assign(el("p", "muted"), { textContent: rec.asked }));
    if (rec.quotes?.length) {
      const d = el("details", "ep-sec");
      d.open = rec.kind !== "decision" || rec.quotes.length <= 2;
      d.innerHTML = `<summary>Your words <span class="n">${rec.quotes.length}</span></summary>${rec.quotes.map((q) => `<blockquote>${esc(q.length > 1800 ? `${q.slice(0, 1800)}…` : q)}</blockquote>`).join("")}`;
      box.append(d);
    }
    if (rec.overlaps?.length) {
      const d = el("details", "ep-sec");
      d.innerHTML = `<summary>Possible overlaps across files <span class="n">${rec.overlaps.length}</span></summary><p class="muted">Items in two files that say the same thing. They were left where they are: say if one should go.</p><ul class="flist">${rec.overlaps.map((c) => `<li class="frow">${linked(c, known)}</li>`).join("")}</ul>`;
      box.append(d);
    }
    if (rec.left?.length) {
      const d = el("details", "ep-sec");
      d.innerHTML = `<summary>Left apart on purpose <span class="n">${rec.left.length}</span></summary><p class="muted">Pieces that look alike but were not merged, and why.</p><ul class="flist">${rec.left.map((c) => `<li class="frow">${linked(c, known)}</li>`).join("")}</ul>`;
      box.append(d);
    }
    if (rec.conflicts?.length) {
      const d = el("details", "ep-sec");
      d.open = true;
      d.innerHTML = `<summary>For you to confirm <span class="n">${rec.conflicts.length}</span></summary><p class="muted">Each was kept out or softened because it disagreed with something you said, or with canon. If one should go the other way, say so in a note.</p><ul class="flist">${rec.conflicts.map((c) => `<li class="frow conflict">${linked(c, known)}</li>`).join("")}</ul>`;
      box.append(d);
    }
    for (const g of rec.groups) {
      const d = el("details", "ep-sec");
      d.open = rec.groups.length === 1 && g.targets.length <= 40;
      const cap = g.targets.slice(0, 300);
      d.innerHTML = `<summary>${esc(g.verb)} <span class="n">${g.targets.length}</span></summary><ul class="flist">${cap.map((t) => `<li class="frow">${t.exists ? `<a data-target="${esc(t.id)}">${esc(t.id)}</a>` : `<span>${esc(t.id)}</span><span class="fmeta">not in canon any more</span>`}${t.rest ? `<span class="fmeta">${esc(t.rest)}</span>` : ""}</li>`).join("")}</ul>${g.targets.length > cap.length ? `<p class="muted">The first ${cap.length} of ${g.targets.length}.</p>` : ""}`;
      box.append(d);
    }
    if (!rec.groups.length && !rec.quotes?.length) box.append(el("p", "muted", "This record changes nothing: it is only her words."));
    box.querySelector(".x").addEventListener("click", close);
    box.querySelector("[data-back]").addEventListener("click", () => ctx.select("recent"));
    wireTargets(box);
  }

  // ---- Claude's merges: each one made of pieces, for her to accept, edit or undo
  function renderMerges(box, { close }) {
    const snap = ctx.getSnap();
    const page = mergesPage(snap);
    const editing = ctx.editing();
    box.innerHTML = `<header><h2>Claude's merges</h2><button class="x" aria-label="Close">×</button></header><div class="id">${page.live} merged items stand for ${page.pieces} pencil pieces</div>`;
    box.append(Object.assign(el("p", "muted"), { innerHTML: `Each merge made one item of pieces that were one thing, and kept every word. Open one to read the pieces it replaced, then say it <b>looks right</b>, <b>edit</b> it, or <b>undo</b> it. A merged item is still pencil. <b>${page.toCheck}</b> still to check${page.accepted ? `, ${page.accepted} you've passed` : ""}${page.undone ? `, ${page.undone} undone` : ""}.` }));
    if (!page.live) box.append(el("p", "muted", "No merges yet."));
    page.groups.forEach((g, gi) => {
      const todo = g.merges.filter((m) => !m.accepted).length;
      const d = el("details", "ep-sec");
      d.open = gi < 2;
      d.innerHTML = `<summary>${esc(g.title)} <span class="n">${todo ? `${todo} to check` : "all passed"}</span></summary><ul class="flist">${g.merges.map((m) => `<li class="frow${m.accepted ? " passed" : ""}"><a data-target="${esc(m.kept)}">${esc(m.text.length > 150 ? `${m.text.slice(0, 150)}…` : m.text)}</a><span class="fmeta">${m.pieces.length} pieces${m.accepted ? " · looks right" : ""}${m.edited ? " · edited since" : ""}</span></li>`).join("")}</ul>`;
      if (editing && todo) {
        // Everything in one file at once: one quoted line each in her day record, in saves of at most 150.
        const all = el("button", "btn small", `All ${todo} look right`);
        all.title = "Say every merge in this list reads as one thing; each stays pencil and can still be undone";
        all.addEventListener("click", async () => {
          const ops = g.merges.filter((m) => !m.accepted).map((m) => ({ op: "mergeok", id: m.kept, merge: m.ref }));
          for (let i = 0; i < ops.length; i += 150) {
            const out = await editing.run(box, ops.slice(i, i + 150), `passed ${Math.min(i + 150, ops.length)} merges in ${g.title}`);
            if (!out.ok) break;
          }
        });
        const row = el("div", "ed-row");
        row.append(all);
        d.querySelector("summary").after(row);
      }
      box.append(d);
    });
    box.querySelector(".x").addEventListener("click", close);
    wireTargets(box);
  }

  /** Links inside a panel: `data-target` is what select() opens. */
  function wireTargets(box) {
    for (const a of box.querySelectorAll("a[data-target]")) a.addEventListener("click", (e) => { e.preventDefault(); ctx.select(a.dataset.target); });
  }

  return { attachSearch, renderEntities, renderEntityPage, renderUnplaced, renderDecisions, renderRecent, renderRecord, renderMerges };
}
