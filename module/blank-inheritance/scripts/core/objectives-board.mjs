/**
 * The GM's objectives board — the pure half (design/objectives.md §10; the 9 September design's three columns).
 *
 * Ingram asked for "what's just happened, what's up next, and where things might go". A board, not a sheet (doctrine
 * §4): one row per thing, every character's objectives at once, read at a glance between beats.
 *
 *   Just happened   every change, newest first: given, a part ticked, revealed or struck, a line learned, closed
 *   Up next         each open objective's open required parts, with the scene whose chip ticks each one; and the
 *                   objectives still to be given, with the scene that gives them
 *   Might go        what nothing scheduled will move: a required part no later scene ticks, a deadline passed while
 *                   still open, the players' own (theirs to drive), and loose ends left open on a closed one
 *
 * "Later" is play order from the Runner's current scene. The chips come from the episode's scene briefs; the GM's
 * board may read the authored files whole, hidden parts included, because the GM's screen is the one place a hidden
 * part belongs.
 *
 * No Foundry, no DOM, no clock: everything is passed in.
 */

import { PART, STATUS, deadlineState, isOpen } from "./objectives.mjs";

export const JUST_HAPPENED_MAX = 14;
/** The flag on each Might go row. Literal keys, so the architecture test can check every one exists. */
export const MIGHT_LABEL_KEYS = Object.freeze({
  overdue: "BLANKINHERITANCE.Objectives.Board.Flag.overdue",
  stalled: "BLANKINHERITANCE.Objectives.Board.Flag.stalled",
  players: "BLANKINHERITANCE.Objectives.Board.Flag.players",
  loose: "BLANKINHERITANCE.Objectives.Board.Flag.loose",
  skipped: "BLANKINHERITANCE.Objectives.Board.Flag.skipped"
});

const at = (iso) => String(iso ?? "");

/**
 * Every objective chip in an episode's briefs, in play order. `briefs` is a list of `{ id, title, order, brief }`;
 * beats, the intro and the outro all count. Returns `{ sceneRef, sceneTitle, order, beatId, act, objectiveRef, partRef }`.
 */
export function chipIndex(briefs = []) {
  const out = [];
  for (const { id, title, order, brief } of [...briefs].sort((a, b) => a.order - b.order)) {
    const hosts = [["intro", brief?.intro], ...(brief?.beats ?? []).map((b) => [b.id, b]), ["outro", brief?.outro]];
    for (const [beatId, host] of hosts) {
      for (const t of host?.triggers ?? []) {
        if (t.kind !== "objective") continue;
        out.push({ sceneRef: id, sceneTitle: title ?? brief?.title ?? id, order, beatId, act: t.act, objectiveRef: t.objectiveRef, partRef: t.partRef ?? null });
      }
    }
  }
  return out;
}

/** Every change to the objectives, newest first. */
export function justHappened(states = [], { max = JUST_HAPPENED_MAX } = {}) {
  const events = [];
  for (const s of states) {
    const base = { objectiveId: s.id, objective: s.title, hand: s.source === "player" };
    if (s.givenAt?.iso) events.push({ ...base, kind: s.source === "player" ? "written" : "given", glyph: s.source === "player" ? "✎" : "◆", text: s.title, scene: s.givenAt.scene, at: s.givenAt.iso });
    for (const p of s.parts ?? []) {
      if (!p.at) continue;
      if (p.state === PART.DONE) events.push({ ...base, kind: "tick", glyph: "✓", text: p.text, scene: null, at: p.at });
      else if (p.state === PART.STRUCK) events.push({ ...base, kind: "strike", glyph: "✕", text: p.text, scene: null, at: p.at });
      else events.push({ ...base, kind: "reveal", glyph: "+", text: p.text, scene: null, at: p.at });
    }
    for (const l of s.log ?? []) events.push({ ...base, kind: "learned", glyph: "•", text: l.text, scene: l.scene, at: l.iso });
    if (s.closedAt?.iso) events.push({ ...base, kind: s.status === STATUS.FAILED ? "failed" : s.status === STATUS.WITHDRAWN ? "withdrawn" : "closed", glyph: "■", text: s.title, scene: s.closedAt.scene, at: s.closedAt.iso });
  }
  return events.filter((e) => e.at).sort((a, b) => at(b.at).localeCompare(at(a.at))).slice(0, max);
}

/**
 * The whole board. `states` are the given objectives (every character's); `authored` maps id to data file; `chips`
 * is `chipIndex`'s list; `currentSceneRef` is the Runner's scene; `moment` the world clock.
 */
export function boardModel({ states = [], authored = {}, chips = [], currentSceneRef = null, moment = null } = {}) {
  const orderOf = new Map(chips.map((c) => [c.sceneRef, c.order]));
  const here = currentSceneRef && orderOf.has(currentSceneRef) ? orderOf.get(currentSceneRef) : -Infinity;
  const upcoming = chips.filter((c) => c.order >= here);
  const given = new Set(states.map((s) => s.id));

  const nextChipFor = (objectiveRef, partRef, acts) => upcoming.find((c) => c.objectiveRef === objectiveRef && c.partRef === partRef && acts.includes(c.act)) ?? null;

  const upNext = [];
  const mightGo = [];
  for (const s of states.filter(isOpen)) {
    const dueState = deadlineState(s.deadline?.day ? s.deadline : null, moment);
    const row = {
      objectiveId: s.id,
      title: s.title,
      giver: s.giver?.name ?? "",
      owner: s.scope === "character" ? s.owner?.name ?? null : null,
      hand: s.source === "player",
      deadline: s.deadline?.label ?? null,
      dueState,
      parts: []
    };
    const shown = new Set(s.parts.map((p) => p.id));
    for (const p of s.parts) {
      if (p.need !== "required" || p.state !== PART.OPEN) continue;
      const chip = s.source === "story" ? nextChipFor(s.id, p.id, ["tick", "strike"]) : null;
      row.parts.push({ id: p.id, text: p.text, scene: chip?.sceneTitle ?? null, stalled: s.source === "story" && !chip });
      if (s.source === "story" && !chip) mightGo.push({ kind: "stalled", objectiveId: s.id, title: s.title, text: p.text });
    }
    // Hidden parts still to come, for the GM's eyes only: where each will be revealed.
    for (const p of authored[s.id]?.parts ?? []) {
      if (!p.hidden || shown.has(p.id)) continue;
      const chip = nextChipFor(s.id, p.id, ["reveal"]);
      row.parts.push({ id: p.id, text: p.text, scene: chip?.sceneTitle ?? null, hidden: true, optional: p.need === "optional", stalled: !chip });
    }
    upNext.push(row);
    if (dueState === "past") mightGo.push({ kind: "overdue", objectiveId: s.id, title: s.title, text: s.deadline?.cost ?? s.deadline?.label ?? "" });
    if (s.source === "player") mightGo.push({ kind: "players", objectiveId: s.id, title: s.title, text: s.owner?.name ?? s.giver?.name ?? "", hand: true });
  }
  // Still to be given, in play order.
  const toGive = [];
  for (const c of upcoming) {
    if (c.act !== "give" || given.has(c.objectiveRef) || toGive.some((t) => t.objectiveId === c.objectiveRef)) continue;
    toGive.push({ objectiveId: c.objectiveRef, title: authored[c.objectiveRef]?.title ?? c.objectiveRef, giver: authored[c.objectiveRef]?.giver?.name ?? "", scene: c.sceneTitle });
  }
  // Skipped: its giving scene has gone by and it was never given (the GM may have run that beat another way).
  for (const c of chips) {
    if (c.act !== "give" || c.order >= here || given.has(c.objectiveRef) || mightGo.some((m) => m.kind === "skipped" && m.objectiveId === c.objectiveRef)) continue;
    mightGo.push({ kind: "skipped", objectiveId: c.objectiveRef, title: authored[c.objectiveRef]?.title ?? c.objectiveRef, text: c.sceneTitle });
  }
  // Loose ends: optional parts still open on an objective that closed done.
  for (const s of states) {
    if (s.status !== STATUS.DONE) continue;
    for (const p of s.parts ?? []) if (p.need === "optional" && p.state === PART.OPEN) mightGo.push({ kind: "loose", objectiveId: s.id, title: s.title, text: p.text });
  }
  const order = { overdue: 0, skipped: 1, stalled: 2, players: 3, loose: 4 };
  mightGo.sort((a, b) => order[a.kind] - order[b.kind]);
  for (const m of mightGo) m.labelKey = MIGHT_LABEL_KEYS[m.kind];
  return {
    justHappened: justHappened(states),
    upNext: upNext.sort((a, b) => Number(b.dueState === "due" || b.dueState === "past") - Number(a.dueState === "due" || a.dueState === "past")),
    toGive,
    mightGo,
    counts: { open: upNext.length, toGive: toGive.length, mightGo: mightGo.length }
  };
}
