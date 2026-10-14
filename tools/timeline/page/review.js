// Going through the pencil (design/plot-timeline.md §4, D070: "Treat everything else as 'Pencil' until I have a chance
// to go through it"). One item at a time, in groups (by thread, entity, chapter, author or where it came from), with
// what it says, where it came from, what uses it and the ink beside it; and five answers, each filed in her day record
// by the save: Ink it, Edit then ink, Park, Cut, Skip. Her own earlier words can be inked a group at a time. Only the
// live page loads this file.
import { reviewQueue, inkVerb, REVIEW_GROUPS, isInk } from "./core/timeline-edits.mjs";
import { wordsHtml } from "./inspector.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const local = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(`plot-timeline:${k}`)); localStorage.setItem(`plot-timeline:${k}`, JSON.stringify(v)); } catch { return null; } return null; };
const session = (k, v) => { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(`plot-timeline:${k}`)); sessionStorage.setItem(`plot-timeline:${k}`, JSON.stringify(v)); } catch { return null; } return null; };
const GROUP_WORDS = { thread: "thread", entity: "who or what", chapter: "chapter", author: "whose words", source: "where it came from" };
const KIND_WORDS = { fact: "a fact", beat: "a beat", chapter: "a chapter", thread: "a thread", question: "a question", idea: "an idea", book: "a Book" };
const MAX_BATCH = 200;

/**
 * @param {{ getSnap, index: () => object, editing: object, select, close, reveal: (id: string) => void, selected: () => string|null }} ctx
 */
export function createReview(ctx) {
  const st = { by: local("review-by") || "thread", includeParked: false, group: null, skipped: session("review-skipped") || [], done: session("review-done") || 0 };
  let current = null;
  let box = null;

  const targetOf = (entry) => (entry.kind === "fact" ? entry.item.id : `${entry.kind}:${entry.item.id}`);

  // Counted before the save lands, so the panel the save re-draws already shows it; taken back if it fails.
  async function act(ops, label, panel) {
    st.done += 1;
    const out = await ctx.editing.run(panel, ops, label);
    if (!out.ok) st.done -= 1;
    session("review-done", st.done);
    return out;
  }

  function skip() {
    if (!current) return;
    st.skipped.push(current.item.id);
    session("review-skipped", st.skipped);
    render(box);
  }

  function render(target) {
    box = target;
    ctx.editing.forget();
    const snap = ctx.getSnap();
    const parked = snap.timeline?.parked || [];
    const groups = reviewQueue(snap, { by: st.by, parked, skipped: st.skipped, includeParked: st.includeParked });
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    let gi = Math.max(0, groups.findIndex((g) => g.key === st.group));
    if (!groups[gi]) gi = 0;
    const group = groups[gi] || null;
    st.group = group?.key || null;
    current = group?.items[0] || null;

    box.innerHTML = `<header><h2>Going through the pencil</h2><button class="x" aria-label="Close">×</button></header>
      <div class="id">${total} left${st.done ? ` · ${st.done} done in this sitting` : ""}${parked.length ? ` · ${parked.length} parked` : ""}${st.skipped.length ? ` · ${st.skipped.length} skipped` : ""}</div>`;
    box.querySelector(".x").addEventListener("click", () => ctx.close());

    const controls = el("div", "rv-controls");
    const by = el("select");
    by.setAttribute("aria-label", "Group by");
    by.innerHTML = REVIEW_GROUPS.map((g) => `<option value="${g}"${g === st.by ? " selected" : ""}>by ${GROUP_WORDS[g]}</option>`).join("");
    by.addEventListener("change", () => { st.by = by.value; st.group = null; local("review-by", st.by); render(box); });
    const parkedToggle = el("label", "rv-check");
    parkedToggle.innerHTML = `<input type="checkbox"${st.includeParked ? " checked" : ""}> include parked`;
    parkedToggle.querySelector("input").addEventListener("change", (e) => { st.includeParked = e.target.checked; render(box); });
    controls.append(by, parkedToggle);
    if (st.skipped.length) {
      const unskip = el("button", "btn small", "Bring the skipped back");
      unskip.addEventListener("click", () => { st.skipped = []; session("review-skipped", st.skipped); render(box); });
      controls.append(unskip);
    }
    box.append(controls);

    if (!group) {
      box.append(el("p", "muted", total === 0 && !st.skipped.length ? "Nothing left in pencil. Everything is ink, parked, open or cut." : "Nothing left here."));
      return;
    }

    // Group navigation
    const nav = el("div", "rv-nav");
    const prev = el("button", "btn small", "‹");
    const next = el("button", "btn small", "›");
    prev.title = "The group before";
    next.title = "The next group";
    prev.disabled = gi === 0;
    next.disabled = gi >= groups.length - 1;
    prev.addEventListener("click", () => { st.group = groups[gi - 1].key; render(box); });
    next.addEventListener("click", () => { st.group = groups[gi + 1].key; render(box); });
    const pick = el("select");
    pick.setAttribute("aria-label", "Group");
    pick.innerHTML = groups.map((g, i) => `<option value="${esc(g.key)}"${i === gi ? " selected" : ""}>${esc(g.title)} (${g.items.length})</option>`).join("");
    pick.addEventListener("change", () => { st.group = pick.value; render(box); });
    nav.append(prev, pick, next);
    box.append(nav);

    // Her own words, a group at a time
    const hers = group.items.filter((e) => e.item.by === "ingram" && e.kind !== "idea");
    if (hers.length > 1) {
      const batch = el("div", "rv-batch");
      const ask = el("button", "btn", `Ink all ${hers.length} of your own words in this group`);
      ask.addEventListener("click", () => {
        batch.innerHTML = "";
        batch.append(el("p", "", `Ink ${hers.length} items as decided, in your words? Each one is listed in today's record.`));
        const yes = el("button", "btn primary", `Yes, ink ${hers.length}`);
        const no = el("button", "btn", "No");
        yes.addEventListener("click", async () => {
          for (let i = 0; i < hers.length; i += MAX_BATCH) {
            const chunk = hers.slice(i, i + MAX_BATCH);
            const out = await act(chunk.map((e) => ({ op: "ink", id: e.item.id, before: e.item.status })), `inked ${chunk.length} of your own words`, box);
            if (!out.ok) return;
          }
        });
        no.addEventListener("click", () => render(box));
        const row = el("div", "ed-row");
        row.append(yes, no);
        batch.append(row);
      });
      batch.append(ask);
      box.append(batch);
    }

    // The card
    const e = current;
    const it = e.item;
    const index = ctx.index();
    const card = el("article", "rv-card");
    const who = it.by === "ingram" ? "your own words" : "Claude's";
    card.innerHTML = `<div class="rv-kind">${esc(KIND_WORDS[e.kind] || e.kind)} · <span class="mono">${esc(it.id)}</span> · ${esc(who)}${e.kind === "idea" ? ` · ${esc(it.state)}` : ""}</div>
      <p class="rv-text">${esc(it.title && e.kind !== "fact" && e.kind !== "beat" ? `${it.title}${it.text ? ": " : ""}` : "")}${esc(it.text || "")}</p>`;
    const facts = [];
    if (it.when) facts.push(["When", it.when]);
    if (e.kind === "fact") facts.push(["Known by", it.known], ["The table hears it", it.told]);
    if (e.kind === "beat") facts.push(["Chapter", `Chapter ${it.n}`], ["Kind", `${it.kind}${it.pace ? `, pace ${it.pace}` : ""}${it.fork === "yes" ? ", a fork" : ""}`]);
    if (it.threads?.length) facts.push(["Threads", it.threads.join(", ")]);
    if (facts.length) card.insertAdjacentHTML("beforeend", `<dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`);
    // Where it came from
    card.insertAdjacentHTML("beforeend", `<h3>Where it came from</h3>${it.origin ? `<div class="muted">${esc(it.origin)}</div>` : ""}${wordsHtml(index, it.source, [it.text, it.title, it.entity])}`);
    // What uses it
    const uses = (snap.citations?.[it.id] || []).filter((w) => w.as !== "change");
    const plants = (snap.facts || []).filter((f) => f.payoff === it.id).map((f) => f.id);
    const roads = (snap.questions || []).filter((q) => q.answer === it.id || (q.roads || []).some((r) => r.fact === it.id)).map((q) => q.title);
    const touch = [...uses.map((w) => `${w.file.replace(/^canon\//, "")} · ${w.at} (${w.as})`), ...plants.map((p) => `planted by ${p}`), ...roads.map((q) => `a road in “${q}”`), ...(it.payoff ? [`pays off ${it.payoff}`] : [])];
    card.insertAdjacentHTML("beforeend", `<h3>What uses it</h3>${touch.length ? `<ul>${touch.slice(0, 10).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : '<div class="muted">Nothing uses it yet.</div>'}`);
    // The ink beside it
    if (e.kind === "fact") {
      const ink = (snap.facts || []).filter((f) => f.entity === it.entity && isInk(f.status));
      if (ink.length) card.insertAdjacentHTML("beforeend", `<details class="rv-ink"><summary>Ink about the same (${ink.length})</summary><ul>${ink.map((f) => `<li>${esc(f.text)}</li>`).join("")}</ul></details>`);
    }
    box.append(card);

    // The five answers
    const panel = el("div", "rv-actions");
    const btn = (text, key, cls, fn, title) => { const b = el("button", `btn ${cls || ""}`); b.innerHTML = `${esc(text)} <kbd>${key}</kbd>`; if (title) b.title = title; b.addEventListener("click", fn); panel.append(b); return b; };
    const editArea = ctx.editing.watch(el("div", "ed-form"));
    editArea.hidden = true;
    const cutArea = ctx.editing.watch(el("div", "ed-cut"));
    cutArea.hidden = true;
    if (e.kind === "idea") {
      btn("Park", "P", "", () => act([{ op: "park", id: it.id }], `parked ${it.id}`, box), "Leave it for later");
      btn("Reject", "C", "", () => { cutArea.hidden = !cutArea.hidden; editArea.hidden = true; cutArea.querySelector("input")?.focus(); });
      btn("Skip", "S", "", skip);
      panel.append(el("div", "muted rv-hint", "To adopt an idea, leave Claude a note on it: adopting turns it into facts or beats."));
    } else {
      const verb = inkVerb(e);
      btn("Ink it", "I", "primary", () => act([{ op: "ink", id: it.id, before: it.status }], `inked ${it.id}`, box), verb === "decide" ? "Decided: your words" : "Accepted: Claude's, approved by you");
      btn("Edit, then ink", "E", "", () => { editArea.hidden = !editArea.hidden; cutArea.hidden = true; editArea.querySelector("textarea")?.focus(); });
      btn("Park", "P", "", () => act([{ op: "park", id: it.id }], `parked ${it.id}`, box), "Seen: leave it in pencil for now");
      btn("Cut", "C", "", () => { cutArea.hidden = !cutArea.hidden; editArea.hidden = true; cutArea.querySelector("input")?.focus(); });
      btn("Skip", "S", "", skip, "Not now: it comes back next sitting");
    }
    // Edit, then ink
    const ta = el("textarea", "ed-text");
    ta.value = it.text || "";
    ta.rows = Math.min(10, Math.max(3, Math.ceil((it.text || "").length / 55)));
    const when = el("input");
    when.value = it.meta?.when ?? "";
    when.placeholder = "when (optional): about 40 years ago · chapter 6, late";
    const editRow = el("div", "ed-row");
    const saveInk = el("button", "btn primary", "Save and ink it");
    saveInk.addEventListener("click", () => {
      const ops = [];
      if (ta.value.trim() && ta.value.replace(/\s+/g, " ").trim() !== it.text) ops.push({ op: "text", id: it.id, before: it.text, value: ta.value });
      if (when.value.trim() !== String(it.meta?.when ?? "").trim()) ops.push({ op: "field", id: it.id, field: "when", before: it.meta?.when ?? "", value: when.value });
      ops.push({ op: "ink", id: it.id, before: it.status });
      act(ops, `edited and inked ${it.id}`, box);
    });
    const cancel = el("button", "btn", "Cancel");
    cancel.addEventListener("click", () => { editArea.hidden = true; });
    editRow.append(saveInk, cancel);
    editArea.append(ta, when, editRow);
    // Cut, or reject
    const retire = el("input");
    retire.placeholder = "wording that must never come back (optional; separate with |)";
    const cutRow = el("div", "ed-row");
    const doCut = el("button", "btn danger", e.kind === "idea" ? "Reject it" : "Cut it");
    doCut.addEventListener("click", () => act([{ op: "cut", id: it.id, before: e.kind === "idea" ? it.state : it.status, retire: retire.value }], `${e.kind === "idea" ? "rejected" : "cut"} ${it.id}`, box));
    cutRow.append(doCut);
    cutArea.append(retire, cutRow);
    box.append(panel, editArea, cutArea);
    ctx.reveal(targetOf(e));
  }

  document.addEventListener("keydown", (ev) => {
    if (ctx.selected() !== "review" || !current || ev.target.matches("input, select, textarea") || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const key = ev.key.toLowerCase();
    const press = (label) => [...(box?.querySelectorAll(".rv-actions button") || [])].find((b) => b.querySelector("kbd")?.textContent.toLowerCase() === label)?.click();
    if (["i", "e", "p", "c", "s"].includes(key)) { ev.preventDefault(); press(key); }
  });

  return { render };
}
