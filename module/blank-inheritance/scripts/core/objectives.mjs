/**
 * Objectives — the pure half.
 *
 * design/objectives.md, D057. Something a person in the world wants done, given to the party in a scene, shown in the
 * giver's own words, with every part marked required or optional. The tracker (top right, three sizes) and the Journal
 * both read the same thing: one Foundry JournalEntry, "Objectives", with a page per objective whose module flag holds
 * the state this file defines.
 *
 * NOTHING SECRET IS EVER IN A STATE. An authored objective's `want`, `notes` and any part still hidden stay in its
 * data file; `fromAuthored` copies only what the table has been told, and a hidden part is added by `applyAct` at
 * the moment it is revealed. Ownership hides a page from the interface, not from a player's browser (GitHub #212), so
 * that is the only honest way to keep a part back.
 *
 * This file owns: the shape of a state, the five acts the Scene Runner performs on it, who may see and change it,
 * progress and deadlines, the tracker's and the Journal's models, the rule a player's own objective must pass, and the
 * export the harvest pulls. The Foundry half (foundry/objectives-store.mjs and the two windows) only reads and writes.
 *
 * No Foundry, no DOM, no clock: `nowIso` and the world `moment` are always passed in.
 */

export const MODULE_ID = "blank-inheritance";
export const OBJECTIVES_SOURCE_ID = "party-objectives";
export const OBJECTIVES_NAME = "Objectives";
/** The key a page's state is filed under in its module flags. */
export const OBJECTIVE_FLAG = "objective";

/** CONST.DOCUMENT_OWNERSHIP_LEVELS, mirrored so this file needs no Foundry globals. */
export const LEVELS = Object.freeze({ NONE: 0, OBSERVER: 2, OWNER: 3 });

export const KINDS = Object.freeze({
  order: Object.freeze({ mark: "命", labelKey: "BLANKINHERITANCE.Objectives.Kind.order" }),
  request: Object.freeze({ mark: "頼", labelKey: "BLANKINHERITANCE.Objectives.Kind.request" }),
  own: Object.freeze({ mark: "志", labelKey: "BLANKINHERITANCE.Objectives.Kind.own" })
});
export const KIND_IDS = Object.freeze(Object.keys(KINDS));
export const DIRECT_LABEL_KEY = "BLANKINHERITANCE.Objectives.Kind.direct";
/** The ribbon's word for each kind of change. Literal keys, so the architecture test can check every one exists. */
export const RIBBON_LABEL_KEYS = Object.freeze({
  new: "BLANKINHERITANCE.Objectives.Ribbon.new",
  updated: "BLANKINHERITANCE.Objectives.Ribbon.updated",
  done: "BLANKINHERITANCE.Objectives.Ribbon.done"
});
const kindLabelKey = (state) => (state.direct ? DIRECT_LABEL_KEY : KINDS[state.kind]?.labelKey ?? KINDS.request.labelKey);

/** The tracker's three sizes, smallest first. */
export const SIZES = Object.freeze(["folded", "lines", "explained"]);
export const STATUS = Object.freeze({ ACTIVE: "active", DONE: "done", FAILED: "failed", WITHDRAWN: "withdrawn" });
export const PART = Object.freeze({ OPEN: "open", DONE: "done", STRUCK: "struck" });
export const ACTS = Object.freeze(["give", "tick", "untick", "reveal", "strike", "close", "fail", "reopen", "withdraw", "log"]);
export const QUARTER_IDS = Object.freeze(["morning", "afternoon", "evening", "night"]);
/** What a character's own objective, written by a player, may say before it must stop. */
export const TEXT_MAX = 140;

const clean = (value, max = TEXT_MAX * 4) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const isoAfter = (a, b) => Boolean(a) && (!b || String(a) > String(b));

/* ------------------------------------------------------------------ */
/*  The journal entry and its pages                                    */
/* ------------------------------------------------------------------ */

/**
 * The one entry every objective lives in. Default OWNER so a player may add a page (Foundry asks for OWNER on the
 * parent to create one, as the notebook found); each page then sets its own level, so a given objective is read-only.
 */
export function objectivesEntryData({ id } = {}) {
  const data = {
    name: OBJECTIVES_NAME,
    ownership: { default: LEVELS.OWNER },
    flags: { [MODULE_ID]: { sourceId: OBJECTIVES_SOURCE_ID, objectives: true } }
  };
  if (id) data._id = id;
  return data;
}

/** The repair that puts a drifted entry back to "every player may add a page", or null when it is right. Raises, never deletes (Foundry refuses `-=` on ownership). */
export function entryOwnershipRepair(ownership) {
  const current = ownership ?? {};
  const update = {};
  if (Number(current.default) !== LEVELS.OWNER) update.default = LEVELS.OWNER;
  for (const [key, level] of Object.entries(current)) {
    if (key !== "default" && Number(level) < LEVELS.OWNER) update[key] = LEVELS.OWNER;
  }
  return Object.keys(update).length ? update : null;
}

/** The seed a given objective's page id is derived from, so a second Give finds the first page instead of making two. */
export const pageSeed = (objectiveId) => `objective:${objectiveId}`;

/**
 * Who may do what to one page, in Foundry's own terms (design/objectives.md §6). The GM can always do everything.
 *   given by the story or the GM ............ every player reads
 *   Section Nine's own, written by a player .. every player writes
 *   a character's own ........................ its player writes, the others read
 *   a character's own, "only me" ............. its player writes, nobody else is shown it
 */
export function pageOwnership(state) {
  const author = state?.writer ?? null;
  if (state?.source !== "player") return { default: LEVELS.OBSERVER };
  if (state.scope === "group") return { default: LEVELS.OWNER };
  const own = author ? { [author]: LEVELS.OWNER } : {};
  return { default: state.visibility === "owner" ? LEVELS.NONE : LEVELS.OBSERVER, ...own };
}

/* ------------------------------------------------------------------ */
/*  A state                                                            */
/* ------------------------------------------------------------------ */

function partState(part, { nowIso = null, revealed = false } = {}) {
  const out = {
    id: part.id,
    need: part.need === "optional" ? "optional" : "required",
    text: clean(part.text),
    detail: part.detail ? clean(part.detail) : null,
    by: part.by ? clean(part.by) : null,
    earned: Boolean(part.earned),
    state: PART.OPEN,
    strikeNote: null,
    at: revealed ? nowIso : null
  };
  return out;
}

/** Whether any authored part is still held back, for the "there may be more to this" line (only if the author asked). */
function moreFor(authored, parts) {
  if (!authored?.moreHint) return false;
  const shown = new Set(parts.map((p) => p.id));
  return (authored.parts ?? []).some((p) => p.hidden && !shown.has(p.id));
}

/**
 * The state for an authored objective at the moment it is given: only what the table has been told. `owner` names
 * the character it went to, for a character objective; the authored file cannot know who that will be.
 */
export function fromAuthored(doc, { nowIso, scene = null, owner = null } = {}) {
  const parts = (doc.parts ?? []).filter((p) => !p.hidden).map((p) => partState(p));
  return {
    id: doc.id,
    source: "story",
    kind: KIND_IDS.includes(doc.kind) ? doc.kind : "request",
    direct: Boolean(doc.direct) && doc.kind === "order",
    scope: doc.scope === "character" ? "character" : "group",
    owner: doc.scope === "character" && owner ? { userId: owner.userId ?? null, name: owner.name ?? null } : null,
    visibility: "all",
    writer: null,
    giver: {
      name: clean(doc.giver?.name),
      via: doc.giver?.via ? clean(doc.giver.via) : null,
      faction: ["directorate", "neutral", "party"].includes(doc.giver?.faction) ? doc.giver.faction : "neutral",
      npcRef: doc.giver?.npcRef ?? null
    },
    said: clean(doc.said),
    why: null,
    title: clean(doc.title),
    brief: doc.brief ? clean(doc.brief) : null,
    deadline: doc.deadline
      ? { label: clean(doc.deadline.label, 12), day: Number(doc.deadline.day) || 1, quarter: QUARTER_IDS.includes(doc.deadline.quarter) ? doc.deadline.quarter : "morning", cost: doc.deadline.cost ? clean(doc.deadline.cost) : null }
      : null,
    parts,
    more: moreFor(doc, parts),
    status: STATUS.ACTIVE,
    givenAt: { iso: nowIso ?? null, scene },
    closedAt: null,
    changedAt: nowIso ?? null,
    log: [],
    record: null
  };
}

/**
 * One act on a state, from the Scene Runner (give is `fromAuthored`), the GM's console, or a player on their own
 * objective. Returns `{ state, changed }` and never mutates its input. `authored` is the objective's data file, needed
 * to reveal a hidden part and to know whether more is still hidden. An act that would change nothing reports so, so a
 * second press of the same chip writes nothing.
 */
export function applyAct(state, act, { partId = null, authored = null, nowIso = null, scene = null, text = null, record = null } = {}) {
  if (!state || !ACTS.includes(act)) return { state, changed: false };
  const next = { ...state, parts: state.parts.map((p) => ({ ...p })), log: [...(state.log ?? [])] };
  const part = partId ? next.parts.find((p) => p.id === partId) : null;
  let changed = false;
  switch (act) {
    case "tick":
      if (part && part.state !== PART.DONE) { part.state = PART.DONE; part.at = nowIso; changed = true; }
      break;
    case "untick":
      if (part && part.state !== PART.OPEN) { part.state = PART.OPEN; part.strikeNote = null; part.at = nowIso; changed = true; }
      break;
    case "strike":
      if (part && part.state !== PART.STRUCK) {
        const note = authored?.parts?.find((p) => p.id === partId)?.strikeNote ?? text;
        part.state = PART.STRUCK;
        part.strikeNote = note ? clean(note) : null;
        part.at = nowIso;
        changed = true;
      }
      break;
    case "reveal": {
      if (part) break;
      const source = authored?.parts?.find((p) => p.id === partId);
      if (!source) break;
      next.parts.push(partState(source, { nowIso, revealed: true }));
      const order = (authored.parts ?? []).map((p) => p.id);
      next.parts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      changed = true;
      break;
    }
    case "close":
    case "fail":
    case "withdraw": {
      const status = act === "close" ? STATUS.DONE : act === "fail" ? STATUS.FAILED : STATUS.WITHDRAWN;
      if (next.status !== status) { next.status = status; next.closedAt = { iso: nowIso, scene }; changed = true; }
      if (record != null && clean(record, 4000) !== (next.record ?? "")) { next.record = clean(record, 4000) || null; changed = true; }
      break;
    }
    case "reopen":
      if (next.status !== STATUS.ACTIVE) { next.status = STATUS.ACTIVE; next.closedAt = null; changed = true; }
      break;
    case "log":
      if (clean(text)) { next.log.push({ text: clean(text), scene, iso: nowIso }); changed = true; }
      break;
    default:
      break;
  }
  if (!changed) return { state, changed: false };
  next.more = authored ? moreFor(authored, next.parts) : Boolean(state.more) && next.parts.length === state.parts.length;
  next.changedAt = nowIso;
  return { state: next, changed: true };
}

export const isOpen = (state) => state?.status === STATUS.ACTIVE;

/** The parts that count: required, and not struck out. Optional parts never block (D057 §1). */
export function progress(state) {
  const counted = (state?.parts ?? []).filter((p) => p.need === "required" && p.state !== PART.STRUCK);
  return { done: counted.filter((p) => p.state === PART.DONE).length, total: counted.length };
}

/** May this user be shown it at all? (The interface's rule; see the header on what it does not protect.) */
export function canSee(state, { userId = null, isGM = false } = {}) {
  if (isGM) return true;
  if (state?.visibility !== "owner") return true;
  return state.writer === userId || state.owner?.userId === userId;
}

/** Is it the section's, or this user's own character's? Those are the ones the tracker shows. */
export function isMine(state, { userId = null } = {}) {
  if (state?.scope === "group") return true;
  return state?.owner?.userId === userId || (state?.source === "player" && state?.writer === userId);
}

/** May this user change it? Only the GM changes a given objective (D057 §8); players change their own. */
export function canEdit(state, { userId = null, isGM = false } = {}) {
  if (isGM) return true;
  if (state?.source !== "player") return false;
  return state.scope === "group" || state.writer === userId;
}

/* ------------------------------------------------------------------ */
/*  Deadlines against the world's clock                                */
/* ------------------------------------------------------------------ */

const absQuarter = (day, quarter) => (Math.max(1, Number(day) || 1) - 1) * 4 + Math.max(0, QUARTER_IDS.indexOf(quarter));

/**
 * Where a deadline stands against the world's moment (the orb's Day N · quarter). The clock runs in quarters, so a
 * deadline is "due" for its whole quarter and "past" only after it. Doctrine Law 19: the chip warms before it bites.
 */
export function deadlineState(deadline, moment) {
  if (!deadline) return "none";
  if (!moment) return "ahead";
  const now = absQuarter(moment.day, moment.quarter);
  const due = absQuarter(deadline.day, deadline.quarter);
  if (now < due) return "ahead";
  return now === due ? "due" : "past";
}

/* ------------------------------------------------------------------ */
/*  The tracker                                                        */
/* ------------------------------------------------------------------ */

export function nextSize(size) {
  const i = SIZES.indexOf(size);
  return SIZES[(i + 1) % SIZES.length];
}

/** The size actually shown: a fight folds it to the tab, and it comes back after (D057 §2). */
export const shownSize = (size, { inCombat = false } = {}) => (inCombat ? "folded" : SIZES.includes(size) ? size : "lines");

/**
 * The objective the tracker leads with when the player has not chosen one: the section's soonest deadline, then
 * their own soonest, then the newest given.
 */
export function defaultTracked(states = []) {
  const due = (s) => (s.deadline ? absQuarter(s.deadline.day, s.deadline.quarter) : Infinity);
  const newest = (a, b) => String(b.givenAt?.iso ?? "").localeCompare(String(a.givenAt?.iso ?? ""));
  const byDue = (list) => list.filter((s) => s.deadline).sort((a, b) => due(a) - due(b) || newest(a, b))[0];
  return byDue(states.filter((s) => s.scope === "group")) ?? byDue(states) ?? [...states].sort(newest)[0] ?? null;
}

/** What has happened since this player last looked: lights the lamp and writes up to two ribbons. */
export function changesSince(states = [], lastSeenIso = null) {
  const out = [];
  for (const s of states) {
    if (s.status !== STATUS.ACTIVE && isoAfter(s.closedAt?.iso, lastSeenIso)) out.push({ kind: "done", state: s, at: s.closedAt.iso });
    else if (isOpen(s) && isoAfter(s.givenAt?.iso, lastSeenIso)) out.push({ kind: "new", state: s, at: s.givenAt.iso });
    else if (isOpen(s) && isoAfter(s.changedAt, lastSeenIso)) out.push({ kind: "updated", state: s, at: s.changedAt });
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function itemView(state, { trackedId, moment, lastSeenIso, userId }) {
  const { done, total } = progress(state);
  const dueState = deadlineState(state.deadline, moment);
  const fresh = (p) => isoAfter(p.at, lastSeenIso) && p.state === PART.OPEN;
  return {
    ...state,
    kindMark: KINDS[state.kind]?.mark ?? "頼",
    kindLabelKey: kindLabelKey(state),
    isTracked: state.id === trackedId,
    hand: state.source === "player",
    progress: { done, total },
    pips: (state.parts ?? []).filter((p) => p.need === "required" && p.state !== PART.STRUCK).map((p) => ({ done: p.state === PART.DONE })),
    dueState,
    dueUrgent: dueState === "due" || dueState === "past",
    isNew: isoAfter(state.givenAt?.iso, lastSeenIso),
    isUpdated: !isoAfter(state.givenAt?.iso, lastSeenIso) && isoAfter(state.changedAt, lastSeenIso),
    ownerName: state.scope === "character" ? state.owner?.name ?? null : null,
    // whose it is, when that is not already the giver's own name (a character's own objective)
    ownerLabel: state.scope === "character" && state.owner?.name && state.owner.name !== state.giver?.name ? state.owner.name : null,
    isOthers: state.scope === "character" && !isMine(state, { userId }),
    parts: (state.parts ?? []).map((p) => ({
      ...p,
      isRequired: p.need === "required",
      isDone: p.state === PART.DONE,
      isStruck: p.state === PART.STRUCK,
      isNew: fresh(p)
    }))
  };
}

/**
 * Everything the tracker draws, for one player. `trackedId` is their own choice, or null for the default.
 * `size` is what they last chose; a fight shows the tab whatever it is.
 */
export function trackerModel(states = [], { userId = null, isGM = false, trackedId = null, size = "lines", moment = null, lastSeenIso = null, inCombat = false } = {}) {
  const open = states.filter((s) => isOpen(s) && canSee(s, { userId, isGM }) && (isGM || isMine(s, { userId })));
  const chosen = open.find((s) => s.id === trackedId) ?? defaultTracked(open);
  const tracked = chosen?.id ?? null;
  const items = open
    .map((s) => itemView(s, { trackedId: tracked, moment, lastSeenIso, userId }))
    .sort((a, b) => Number(b.isTracked) - Number(a.isTracked) || Number(Boolean(a.ownerName)) - Number(Boolean(b.ownerName)) || String(b.givenAt?.iso ?? "").localeCompare(String(a.givenAt?.iso ?? "")));
  const visible = states.filter((s) => canSee(s, { userId, isGM }) && (isGM || isMine(s, { userId })));
  const ribbons = changesSince(visible, lastSeenIso).slice(0, 2).map((c) => ({
    kind: c.kind,
    labelKey: RIBBON_LABEL_KEYS[c.kind],
    title: c.state.title,
    giver: c.state.giver?.name ?? ""
  }));
  const shown = shownSize(size, { inCombat });
  return {
    size: shown,
    folded: shown === "folded",
    lines: shown === "lines",
    explained: shown === "explained",
    sizeIndex: SIZES.indexOf(shown),
    count: items.length,
    empty: items.length === 0,
    tracked: items.find((i) => i.isTracked) ?? null,
    items,
    ribbons,
    lit: ribbons.length > 0
  };
}

/* ------------------------------------------------------------------ */
/*  The Journal                                                        */
/* ------------------------------------------------------------------ */

/** The Objectives tab: open ones in three groups (the section's, mine, the others'), and which is selected. */
export function journalModel(states = [], { userId = null, isGM = false, selectedId = null, trackedId = null, moment = null, lastSeenIso = null } = {}) {
  const seen = states.filter((s) => canSee(s, { userId, isGM }));
  const open = seen.filter(isOpen);
  const mineOpen = open.filter((s) => isMine(s, { userId }));
  const tracked = (open.find((s) => s.id === trackedId) ?? defaultTracked(mineOpen) ?? defaultTracked(open))?.id ?? null;
  const view = (s) => itemView(s, { trackedId: tracked, moment, lastSeenIso, userId });
  const groups = [
    { key: "section", labelKey: "BLANKINHERITANCE.Objectives.Group.section", items: open.filter((s) => s.scope === "group").map(view) },
    { key: "mine", labelKey: "BLANKINHERITANCE.Objectives.Group.mine", items: open.filter((s) => s.scope === "character" && isMine(s, { userId })).map(view) },
    { key: "others", labelKey: "BLANKINHERITANCE.Objectives.Group.others", items: open.filter((s) => s.scope === "character" && !isMine(s, { userId })).map(view) }
  ].filter((g) => g.items.length);
  const all = groups.flatMap((g) => g.items);
  const selected = all.find((i) => i.id === selectedId) ?? all.find((i) => i.id === tracked) ?? all[0] ?? null;
  for (const item of all) item.isSelected = item.id === selected?.id;
  return { groups, selected, empty: all.length === 0, closedCount: seen.filter((s) => !isOpen(s)).length };
}

/** The Record tab: every closed objective as its paragraph, oldest first, and the optional parts left open. */
export function recordModel(states = [], { userId = null, isGM = false } = {}) {
  const closed = states
    .filter((s) => !isOpen(s) && canSee(s, { userId, isGM }))
    .sort((a, b) => String(a.closedAt?.iso ?? "").localeCompare(String(b.closedAt?.iso ?? "")));
  const entries = closed.map((s) => ({ ...s, kindMark: KINDS[s.kind]?.mark ?? "頼", kindLabelKey: kindLabelKey(s), hand: s.source === "player", failed: s.status === STATUS.FAILED, withdrawn: s.status === STATUS.WITHDRAWN }));
  const looseEnds = closed.flatMap((s) =>
    s.status === STATUS.DONE ? s.parts.filter((p) => p.need === "optional" && p.state === PART.OPEN).map((p) => ({ text: p.text, by: p.by ?? s.giver?.name ?? "", from: s.title })) : []
  );
  return { entries, looseEnds, empty: entries.length === 0 };
}

/* ------------------------------------------------------------------ */
/*  A player's own objective                                           */
/* ------------------------------------------------------------------ */

/**
 * The rule a player's objective must pass before it is filed (D057 §4): who wants it, why in their eyes, and one
 * thing that must be done. The form asks in that order so even a note to self reads as somebody's want.
 */
export function validateDraft(draft = {}) {
  const errors = [];
  if (!clean(draft.giverName)) errors.push("giver");
  if (!clean(draft.why)) errors.push("why");
  if (!(draft.required ?? []).some((r) => clean(r))) errors.push("required");
  return errors;
}

/**
 * A filed draft as a state. A character's own giver makes it Own; anyone else makes it a request, or an order when the
 * player says it was one. `self` is the writer's own character's name, so "me" is never a separate kind of giver.
 */
export function draftToState(draft = {}, { userId = null, ownerName = null, nowIso = null, scene = null, id = null } = {}) {
  const giverName = clean(draft.giverName, TEXT_MAX);
  const isSelf = draft.giverIsSelf === true || (ownerName && giverName === ownerName);
  const kind = isSelf ? "own" : draft.wasOrder ? "order" : "request";
  const scope = draft.scope === "group" ? "group" : "character";
  const parts = [
    ...(draft.required ?? []).map((t) => ({ need: "required", text: t })),
    ...(draft.optional ?? []).map((t) => ({ need: "optional", text: t }))
  ]
    .filter((p) => clean(p.text))
    .map((p, i) => partState({ id: `p${i + 1}`, need: p.need, text: clean(p.text, TEXT_MAX) }));
  const required = parts.filter((p) => p.need === "required");
  return {
    id: id ?? `own-${String(nowIso ?? "").replace(/[^0-9]/g, "").slice(0, 14)}-${String(userId ?? "x").slice(0, 6)}`,
    source: "player",
    kind,
    direct: false,
    scope,
    owner: scope === "character" ? { userId, name: ownerName } : null,
    visibility: scope === "character" && draft.visibility === "owner" ? "owner" : "all",
    writer: userId,
    giver: { name: giverName, via: null, faction: isSelf || draft.giverIsParty ? "party" : "neutral", npcRef: null },
    said: clean(draft.said, TEXT_MAX * 2).replace(/^["“]|["”]$/g, ""),
    why: clean(draft.why, TEXT_MAX * 2),
    title: clean(draft.title, TEXT_MAX) || required[0]?.text || "",
    brief: null,
    deadline: clean(draft.by, 12) ? { label: clean(draft.by, 12).toUpperCase(), day: null, quarter: null, cost: null } : null,
    parts,
    more: false,
    status: STATUS.ACTIVE,
    givenAt: { iso: nowIso, scene },
    closedAt: null,
    changedAt: nowIso,
    log: [],
    record: null
  };
}

/* ------------------------------------------------------------------ */
/*  Pages and the harvest                                              */
/* ------------------------------------------------------------------ */

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** A readable copy for Foundry's own journal view, kept beside the state. Plain tags only: Foundry's cleaner keeps these. */
export function pageHtml(state) {
  const mark = (p) => (p.state === PART.DONE ? "✓" : p.state === PART.STRUCK ? "✕" : p.need === "required" ? "◆" : "◇");
  const parts = (state.parts ?? [])
    .map((p) => `<li>${mark(p)} ${p.state === PART.STRUCK ? `<s>${esc(p.text)}</s>` : esc(p.text)}${p.need === "optional" ? " <em>(optional)</em>" : ""}${p.strikeNote ? ` — ${esc(p.strikeNote)}` : ""}</li>`)
    .join("");
  return [
    `<p><strong>${esc(state.giver?.name)}</strong>${state.giver?.via ? `, ${esc(state.giver.via)}` : ""}</p>`,
    state.said ? `<blockquote><p>${esc(state.said)}</p></blockquote>` : "",
    state.why ? `<p>Why: ${esc(state.why)}</p>` : "",
    parts ? `<ul>${parts}</ul>` : "",
    state.deadline?.label ? `<p>By ${esc(state.deadline.label)}${state.deadline.cost ? `. ${esc(state.deadline.cost)}` : ""}</p>` : "",
    state.record ? `<p><em>${esc(state.record)}</em></p>` : ""
  ].join("");
}

/** The data to create a page for a state. */
export function pageCreateData(state, { id = null } = {}) {
  const data = {
    name: state.title || OBJECTIVES_NAME,
    type: "text",
    text: { content: pageHtml(state), format: 1 },
    ownership: pageOwnership(state),
    flags: { [MODULE_ID]: { [OBJECTIVE_FLAG]: state } }
  };
  if (id) data._id = id;
  return data;
}

/** The update that writes a changed state back to its page. */
export function pageUpdateData(state) {
  return { name: state.title || OBJECTIVES_NAME, text: { content: pageHtml(state) }, flags: { [MODULE_ID]: { [OBJECTIVE_FLAG]: state } } };
}

/**
 * Every objective as one document for the harvest (storage/objectives.json). The closing paragraphs and what the
 * players wrote come home for writing the next episode (D057 §3).
 */
export function exportPayload(states = [], { users = [], now = 0 } = {}) {
  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? id ?? null;
  return {
    kind: "bi-objectives",
    version: 1,
    exportedAt: new Date(Number(now) || 0).toISOString(),
    objectives: [...states]
      .sort((a, b) => String(a.givenAt?.iso ?? "").localeCompare(String(b.givenAt?.iso ?? "")))
      .map((s) => ({
        id: s.id,
        source: s.source,
        kind: s.kind,
        scope: s.scope,
        owner: s.owner?.name ?? null,
        writer: s.source === "player" ? nameOf(s.writer) : null,
        visibility: s.visibility,
        giver: s.giver?.name ?? null,
        said: s.said,
        why: s.why,
        title: s.title,
        status: s.status,
        parts: s.parts.map((p) => ({ id: p.id, need: p.need, text: p.text, state: p.state })),
        givenAt: s.givenAt,
        closedAt: s.closedAt,
        log: s.log,
        record: s.record
      }))
  };
}
