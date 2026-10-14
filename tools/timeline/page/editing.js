// The plot timeline's editing (design/plot-timeline.md §4 and §5, D070). Only the live page served from this PC loads
// this file; the read-only copy on claude.ai never carries it.
//
// What she can do: edit an item's words and fields in the inspector, Ink it (pencil to ink: decided for her words,
// accepted for Claude's), cut it, park it, leave Claude a note, drag pencil along time, and undo anything she did in
// this sitting. Ink is locked against a stray change until she unlocks it. Every save goes to the server as one list of
// operations carrying what the page showed (tools/timeline/ops.mjs): a change made meanwhile is a clash, shown with
// both versions, and hers wins on a click. All the rules are in the shared core (core/timeline-edits.mjs).
import { itemsById, fieldsFor, editOps, inkVerb, draggable, dragWhen, undoOf, isInk, isPencil, changedIds, answerOps } from "./core/timeline-edits.mjs";
import { mergeFor } from "./core/timeline-views.mjs";

const TOKEN = document.querySelector('meta[name="timeline-token"]')?.content || null;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const clock = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// Which list of suggestions each field gets.
const LISTS = { payoff: "facts", truth: "facts", answer: "facts", misdirect: "facts", reveals: "facts", became: "facts", told: "places", raised: "places", answered: "places", threads: "threads", entities: "entities", known: "known", kind: "beatkinds", pace: "paces", state: "states", true: "truth", fork: "fork" };

/**
 * @param {{ getSnap: () => object, getAxis: () => object, reload: () => Promise<void>, select: (id: string) => void,
 *           rerender: () => void, selected: () => string|null }} ctx
 */
export function createEditing(ctx) {
  if (!TOKEN) return null;
  const undoStack = [];
  const mine = new Map();
  let busy = false;
  let items = new Map();
  let unlocked = new Set();
  // Words she is typing and hasn't saved: a reload (Claude's edit arriving) must not re-draw them away.
  let dirty = null;
  const watch = (container) => {
    container.addEventListener("input", () => { dirty = container; });
    return container;
  };

  // ---- the bar: undo, notes, review, and what the last save did
  const slot = document.querySelector("#edit-controls");
  const tools = el("span", "ed-bar");
  const undoBtn = el("button", "chipbtn", "Undo");
  undoBtn.id = "undo";
  undoBtn.disabled = true;
  const notesBtn = el("button", "chipbtn", "Notes");
  notesBtn.id = "notes";
  const reviewBtn = el("button", "chipbtn primary", "Go through the pencil");
  reviewBtn.id = "review";
  const saved = el("span", "ed-status");
  saved.id = "save-status";
  saved.setAttribute("aria-live", "polite");
  tools.append(reviewBtn, notesBtn, undoBtn, saved);
  slot.append(tools);
  undoBtn.addEventListener("click", () => undo());
  notesBtn.addEventListener("click", () => ctx.select("notes"));
  reviewBtn.addEventListener("click", () => ctx.select("review"));
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select, textarea")) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
  });

  const say = (text, bad = false) => { saved.textContent = text; saved.classList.toggle("bad", bad); };
  const refreshUndo = () => {
    undoBtn.disabled = !undoStack.length || busy;
    undoBtn.title = undoStack.length ? `Undo: ${undoStack[undoStack.length - 1].label} (Ctrl+Z)` : "Nothing to undo in this sitting";
  };

  // ---- suggestions for the fields, made once per snapshot
  function datalists(snap) {
    let box = document.getElementById("ed-lists");
    if (!box) { box = el("div"); box.id = "ed-lists"; box.hidden = true; document.body.append(box); }
    const places = ["start", "later", ...(snap.scenes || []).map((s) => `in:${s.id}`), ...(snap.chapters || []).flatMap((c) => [`in:${c.id}`, ...(c.beats || []).map((b) => `in:${b.id}`)])];
    const lists = {
      facts: (snap.facts || []).map((f) => f.id), places, threads: (snap.threads || []).map((t) => t.id), entities: (snap.entities || []).map((e) => e.id),
      known: ["everyone", "some", "few", "nobody"], beatkinds: ["event", "reveal", "choice", "flashback", "end"], paces: ["up", "down", "lateral"],
      states: ["live", "parked", "adopted", "rejected"], truth: ["yes", "no", "partly"], fork: ["yes"],
    };
    box.innerHTML = Object.entries(lists).map(([k, v]) => `<datalist id="dl-${k}">${v.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>`).join("");
  }

  // ---- saving
  async function save(ops, { label = "a change", undoable = true } = {}) {
    if (busy) { say("Still saving the last change…", true); return { ok: false, error: "busy" }; }
    busy = true;
    refreshUndo();
    say("Saving…");
    let out;
    try {
      const res = await fetch("api/ops", { method: "POST", headers: { "content-type": "application/json", "x-timeline-token": TOKEN }, body: JSON.stringify({ ops }) });
      out = await res.json().catch(() => ({ ok: false, error: `the server answered ${res.status}` }));
    } catch (e) {
      out = { ok: false, error: `the server didn't answer (${e.message}): is \`npm run timeline\` still running?` };
    }
    busy = false;
    if (out.ok) {
      dirty = null;
      for (const r of out.results || []) if (r.result === "merged") mine.set(r.id, Date.now());
      if (out.record && undoable) {
        const u = undoOf(ops, out.results);
        if (u.ops.length) undoStack.push({ label, ops: u.ops, complete: u.complete });
      }
      say(out.record ? `Saved ${clock()} · in ${out.record}` : "Nothing to change: canon already says that");
      refreshUndo();
      await ctx.reload();
    } else {
      say(out.busy ? "Another save is running: try again" : "Not saved", true);
      refreshUndo();
    }
    return out;
  }

  async function undo() {
    const last = undoStack.pop();
    refreshUndo();
    if (!last) return;
    const out = await save(last.ops, { label: `undo ${last.label}`, undoable: false });
    if (!out.ok) say(`Couldn't undo ${last.label}: it has changed since (${out.error || "a clash"})`, true);
    else if (!last.complete) say(`Undone, except what can't be taken back (a note, a park): ${last.label}`);
    else say(`Undone: ${last.label}`);
  }

  // ---- what a failed save says: both versions on a clash, the checks it would break
  function failure(box, out, ops, retry) {
    const msg = box.querySelector(".ed-msg") || box.appendChild(el("div", "ed-msg"));
    msg.innerHTML = "";
    msg.hidden = false;
    const clashes = (out.results || []).filter((r) => r.result === "clash");
    const refused = (out.results || []).filter((r) => r.result === "refused");
    if (clashes.length) {
      msg.append(el("p", "", "Not saved: this changed while you were looking."));
      for (const r of clashes) {
        const op = ops[r.i];
        const row = el("div", "ed-clash");
        const what = op.op === "text" ? "its words" : op.op === "field" ? op.field : "its status";
        row.innerHTML = `<div><b>${esc(r.id)}</b> · ${esc(what)}</div><div class="now">Now: <q>${esc(r.current ?? "(empty)")}</q></div>${op.op === "text" || op.op === "field" ? `<div class="yours">Yours: <q>${esc(op.value ?? "(empty)")}</q></div>` : ""}`;
        msg.append(row);
      }
      const keepMine = el("button", "btn primary", "Keep mine");
      const keepTheirs = el("button", "btn", "Keep what it says now");
      keepMine.addEventListener("click", () => retry(ops.map((op, i) => { const c = clashes.find((r) => r.i === i); return c ? { ...op, before: c.current ?? "" } : op; })));
      keepTheirs.addEventListener("click", () => { msg.hidden = true; dirty = null; ctx.reload().then(() => ctx.select(ctx.selected())); });
      const row = el("div", "ed-row");
      row.append(keepMine, keepTheirs);
      msg.append(row);
      return;
    }
    if (out.problems?.length) {
      msg.append(el("p", "", "Not saved: it would break canon's checks."));
      const ul = el("ul");
      for (const p of out.problems.slice(0, 8)) ul.append(el("li", "", `${p.where}: ${p.message}`));
      msg.append(ul);
      return;
    }
    msg.append(el("p", "", refused.length ? `Not saved: ${refused.map((r) => r.message).join("; ")}` : out.error || "Not saved."));
  }

  async function run(box, ops, label) {
    const out = await save(ops, { label });
    if (!out.ok && out.error !== "busy") failure(box, out, ops, (again) => run(box, again, label));
    return out;
  }

  // ---- the inspector: the edit block under what is selected
  function entryFor(target) {
    if (!target) return null;
    const [kind, ...rest] = target.includes(":") ? target.split(":") : ["fact", target];
    const ref = rest.join(":");
    if (!["event", "reveal", "fact", "beat", "chapter", "question", "idea", "thread"].includes(kind)) return null;
    return items.get(ref) || null;
  }

  function decorate(box, target) {
    dirty = null;
    const entry = entryFor(target);
    if (!entry) return;
    const it = entry.item;
    const status = it.status;
    const locked = isInk(status) && !unlocked.has(it.id);
    const block = watch(el("section", "ed"));
    const actions = el("div", "ed-row ed-actions");
    const form = el("div", "ed-form");
    form.hidden = true;
    const noteBox = el("div", "ed-note");
    noteBox.hidden = true;
    const cutBox = el("div", "ed-cut");
    cutBox.hidden = true;
    const msg = el("div", "ed-msg");
    msg.hidden = true;

    const button = (text, cls, onClick, title) => { const b = el("button", `btn ${cls || ""}`, text); if (title) b.title = title; b.addEventListener("click", onClick); actions.append(b); return b; };
    const show = (part) => { for (const p of [form, noteBox, cutBox]) p.hidden = p !== part || !p.hidden; msg.hidden = true; if (!part.hidden) part.querySelector("textarea, input")?.focus(); };

    if (entry.kind === "idea") {
      if (it.state !== "parked") button("Park it", "", () => run(block, [{ op: "park", id: it.id }], `parked ${it.id}`), "Leave it for later; it stays an idea");
      button("Reject…", "", () => show(cutBox), "Reject it, and say what wording must never come back");
      button("Edit", "", () => show(form));
    } else if (isPencil(status)) {
      const verb = inkVerb(entry);
      button("Ink it", "primary", () => run(block, [{ op: "ink", id: it.id, before: status }], `inked ${it.id}`), verb === "decide" ? "Make it decided: these are your words" : "Make it accepted: Claude's, read and approved by you");
      button("Edit", "", () => show(form));
      button("Cut…", "", () => show(cutBox), "Strike it; its words stay in the file, struck");
    } else if (status === "open") {
      button("Edit", "", () => show(form));
      actions.append(el("span", "muted", "An open question: give your answer as a note, or edit its candidates."));
    } else if (status === "cut") {
      button("Back to pencil", "", () => run(block, [{ op: "pencil", id: it.id, before: "cut" }], `brought back ${it.id}`));
    } else if (locked) {
      const b = button("Edit (it's ink: unlock)", "", () => { unlocked.add(it.id); ctx.select(ctx.selected()); }, "Ink is locked against a stray change: unlock it to edit");
      b.classList.add("lock");
    } else {
      button("Edit", "", () => show(form));
      const more = el("details", "ed-more");
      more.innerHTML = "<summary>More</summary>";
      const back = el("button", "btn", "Back to pencil");
      back.addEventListener("click", () => run(block, [{ op: "pencil", id: it.id, before: status }], `pencilled ${it.id}`));
      const cutBtn = el("button", "btn", "Cut…");
      cutBtn.addEventListener("click", () => show(cutBox));
      more.append(back, cutBtn);
      actions.append(more);
    }
    // A merge of Claude's: say it looks right, or put the pieces back. (Editing it is the Edit button above.)
    const merged = mergeFor(ctx.getSnap(), it.id);
    if (merged) {
      if (!merged.accepted) button("Looks right", "", () => run(block, [{ op: "mergeok", id: it.id, merge: merged.ref }], `accepted the merge ${merged.ref}`), "Say this merge reads as one thing: it stays pencil until you ink it");
      const undoMerge = button("Undo this merge", "", async () => {
        const out = await run(block, [{ op: "unmerge", id: it.id, merge: merged.ref }], `undid the merge ${merged.ref}`);
        const back = out.ok && (out.results || []).find((r) => r.result === "merged")?.restored?.[0];
        if (back) ctx.select(back);
      }, "Put the pieces back exactly as they were");
      if (merged.edited) { undoMerge.disabled = true; undoMerge.title = "It has been edited since it was merged, so it can't be taken apart: its pieces are listed above"; }
    }
    button("Note for Claude", "", () => show(noteBox));

    // The edit form: her words, then the item's own fields.
    const ta = el("textarea", "ed-text");
    ta.value = it.text || "";
    ta.rows = Math.min(10, Math.max(3, Math.ceil((it.text || "").length / 55)));
    ta.setAttribute("aria-label", "Its words");
    const grid = el("div", "ed-fields");
    const inputs = {};
    for (const [field, label, hint] of fieldsFor(entry)) {
      const lab = el("label", "", label);
      const input = el("input");
      input.value = it.meta?.[field] ?? "";
      input.placeholder = hint || "";
      input.dataset.field = field;
      if (LISTS[field]) input.setAttribute("list", `dl-${LISTS[field]}`);
      lab.append(input);
      grid.append(lab);
      inputs[field] = input;
    }
    const formRow = el("div", "ed-row");
    const doSave = el("button", "btn primary", "Save");
    const doSaveInk = el("button", "btn", "Save and ink it");
    const cancel = el("button", "btn", "Cancel");
    const collect = () => editOps(entry, { text: entry.kind === "book" ? null : ta.value, fields: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.value])) });
    doSave.addEventListener("click", () => { const ops = collect(); if (!ops.length) { say("Nothing changed"); return; } run(block, ops, `edited ${it.id}`); });
    doSaveInk.addEventListener("click", () => run(block, [...collect(), { op: "ink", id: it.id, before: status }], `edited and inked ${it.id}`));
    cancel.addEventListener("click", () => { form.hidden = true; dirty = null; });
    formRow.append(doSave);
    if (isPencil(status) && entry.kind !== "idea") formRow.append(doSaveInk);
    formRow.append(cancel);
    form.append(ta, grid, formRow);
    for (const input of [ta, ...Object.values(inputs)]) input.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) doSave.click(); if (e.key === "Escape") { e.stopPropagation(); form.hidden = true; } });

    // A note for Claude
    const noteText = el("textarea", "ed-text");
    noteText.rows = 3;
    noteText.placeholder = "What should Claude look at, change, or find out?";
    const noteRow = el("div", "ed-row");
    const leave = el("button", "btn primary", "Leave the note");
    leave.addEventListener("click", async () => { if (!noteText.value.trim()) return; const out = await run(block, [{ op: "note", id: it.id, text: noteText.value }], `a note on ${it.id}`); if (out.ok) noteText.value = ""; });
    noteRow.append(leave);
    noteBox.append(noteText, noteRow);

    // Cut, or reject an idea
    const retire = el("input");
    retire.placeholder = "wording that must never come back (optional; separate with |)";
    const cutRow = el("div", "ed-row");
    const doCut = el("button", "btn danger", entry.kind === "idea" ? "Reject it" : "Cut it");
    doCut.addEventListener("click", () => run(block, [{ op: "cut", id: it.id, before: entry.kind === "idea" ? it.state : status, retire: retire.value }], `${entry.kind === "idea" ? "rejected" : "cut"} ${it.id}`));
    const cutCancel = el("button", "btn", "Cancel");
    cutCancel.addEventListener("click", () => { cutBox.hidden = true; });
    cutRow.append(doCut, cutCancel);
    cutBox.append(el("p", "muted", entry.kind === "idea" ? "Rejected ideas stay in the file, so nobody brings them back." : "Its words stay in the file, struck, so nobody brings them back."), retire, cutRow);

    block.append(actions, form, noteBox, cutBox, msg);
    // Her notes on this item, and Claude's replies
    const notes = (ctx.getSnap().timeline?.notes || []).filter((n) => n.on === it.id);
    if (notes.length) {
      const list = el("div", "ed-notes");
      list.append(el("h3", "", "Your notes to Claude"));
      for (const n of notes) {
        const d = el("div", `ed-notecard ${n.state}`);
        d.innerHTML = `<div class="meta">${esc(n.id)} · ${esc(n.date)} · ${esc(n.state)}</div><div>${esc(n.text)}</div>${n.reply ? `<div class="reply">Claude: ${esc(n.reply)}</div>` : ""}`;
        list.append(d);
      }
      block.append(list);
    }
    // Under the header and its tags, above the reading.
    const anchor = box.querySelector(".tags") || box.querySelector(".id");
    if (anchor) anchor.after(block); else box.prepend(block);
  }

  // ---- the notes view, opened from the bar
  function renderNotes(box) {
    const notes = ctx.getSnap().timeline?.notes || [];
    const open = notes.filter((n) => n.state === "open");
    box.innerHTML = `<header><h2>Your notes to Claude</h2><button class="x" aria-label="Close">×</button></header><div class="id">${open.length} waiting · ${notes.length - open.length} answered or done</div>`;
    if (!notes.length) box.append(el("p", "muted", "No notes yet. Select anything and press Note for Claude."));
    for (const n of [...notes].reverse()) {
      const d = el("div", `ed-notecard ${n.state}`);
      d.innerHTML = `<div class="meta">${esc(n.id)} · ${esc(n.date)} · ${esc(n.state)} · on <a data-go="${esc(n.on)}">${esc(n.on)}</a></div><div>${esc(n.text)}</div>${n.reply ? `<div class="reply">Claude: ${esc(n.reply)}</div>` : ""}`;
      box.append(d);
    }
    box.querySelector(".x")?.addEventListener("click", () => ctx.close());
    for (const a of box.querySelectorAll("a[data-go]")) a.addEventListener("click", () => ctx.select(a.dataset.go));
  }

  // ---- dragging pencil along time
  let tip = null;
  function chip(node, it, c) {
    const entry = items.get(it.ref);
    if (!entry || c.ghost || c.question || !draggable(entry)) return;
    node.classList.add("draggable");
    node.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      const startX = ev.clientX;
      const x0 = c.x;
      let moved = false;
      node.setPointerCapture(ev.pointerId);
      const at = (clientX) => ctx.getAxis().fromX(x0 + (clientX - startX));
      const move = (e) => {
        if (!moved && Math.abs(e.clientX - startX) < 5) return;
        moved = true;
        node.classList.add("dragging");
        node.style.left = `${x0 + (e.clientX - startX)}px`;
        const words = dragWhen(at(e.clientX));
        if (!tip) { tip = el("div", "ed-tip"); document.body.append(tip); }
        tip.textContent = words ? `when: ${words}` : "not a place in time";
        tip.style.left = `${e.clientX + 12}px`;
        tip.style.top = `${e.clientY + 14}px`;
      };
      const end = async (e, cancelled) => {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", up);
        node.removeEventListener("pointercancel", onCancel);
        if (tip) { tip.remove(); tip = null; }
        if (!moved) return;
        node.dataset.dragged = "1";
        const words = cancelled ? null : dragWhen(at(e.clientX));
        if (!words || norm(words) === norm(entry.item.when)) { ctx.rerender(); return; }
        const out = await save([{ op: "field", id: entry.item.id, field: "when", before: entry.item.meta?.when ?? entry.item.when ?? "", value: words }], { label: `moved ${entry.item.id} to ${words}` });
        if (!out.ok) { ctx.rerender(); ctx.select(`event:${entry.item.id}`); const box = document.querySelector("#insp"); if (box) failure(box, out, [{ op: "field", id: entry.item.id, field: "when", value: words }], (again) => save(again, { label: `moved ${entry.item.id}` })); }
      };
      const up = (e) => end(e, false);
      const onCancel = (e) => end(e, true);
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", onCancel);
    });
    // A drag is not a click: it must not also open the inspector.
    node.addEventListener("click", (e) => { if (node.dataset.dragged) { delete node.dataset.dragged; e.stopImmediatePropagation(); } }, true);
  }

  /** Answer an open decision: her words, the candidates gone, decided: one save, one undo. */
  async function answer(box, id, { text, when = "" }) {
    const entry = items.get(id);
    if (!entry) return { ok: false, error: "that decision is gone" };
    return run(box, answerOps(entry, { text, when }), `answered ${id}`);
  }

  return {
    save,
    run,
    answer,
    failure,
    decorate,
    renderNotes,
    chip,
    watch,
    /** Is she typing something unsaved? Then a reload leaves the side panel alone and says canon moved under it. */
    holding() {
      if (!dirty || !document.contains(dirty)) { dirty = null; return false; }
      let note = dirty.querySelector(".ed-stale");
      if (!note) { note = el("p", "ed-stale", "Canon changed while you were typing. Your words are kept: saving checks them against the new version, and shows both if they clash."); dirty.prepend(note); }
      return true;
    },
    forget() { dirty = null; },
    /** A new snapshot: refresh the suggestions, and say which items Claude changed (hers from the last few seconds aside). */
    loaded(previous, snap) {
      items = itemsById(snap);
      datalists(snap);
      if (snap.timeline?.sandbox && !tools.querySelector(".ed-sandbox")) {
        const flag = el("span", "ed-sandbox", "Sandbox: a scratch copy of canon, nothing here reaches the real one");
        tools.prepend(flag);
      }
      const open = (snap.timeline?.notes || []).filter((n) => n.state === "open").length;
      notesBtn.textContent = open ? `Notes · ${open} waiting` : "Notes";
      const now = Date.now();
      return changedIds(previous, snap).filter((id) => !(mine.has(id) && now - mine.get(id) < 15000));
    },
    items: () => items,
  };
}
