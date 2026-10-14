// What Claude reads before writing anything about the story (design/plot-timeline.md §6, D070), instead of searching:
//
//   story context <entity | fact | thread | chapter | scene | question | idea>   everything canon holds about it, in order:
//       ink, open, pencil, her words, where it's used, what the table knows, and what must never be said
//   story brief <chapter | scene>   what is due there: what to plant, tell or hold back, the questions in play, the
//       decisions not to settle, and whether a relax beat is missing
//   story when      the whole timeline as text, era by era
//   story health    the health strip: what needs attention before the table gets there
//
// Every function takes the canon model (lib.mjs) or its snapshot and returns text, so the tests read what Claude reads.
import { citations, factIndex, itemIndex, playOrder } from "./lib.mjs";
import { mergedInto, resolveAlias } from "./merges.mjs";
import { snapshot, quotesOf } from "./snapshot.mjs";
import { buildTimeline, tableKnows } from "../../module/blank-inheritance/scripts/core/timeline-model.mjs";
import { health, chapterOfPlace } from "../../module/blank-inheritance/scripts/core/timeline-health.mjs";
import { ERAS } from "../../module/blank-inheritance/scripts/core/timeline-eras.mjs";
import { UNIT_DAYS, PRESENT_YEAR, wordsForDays } from "../../module/blank-inheritance/scripts/core/timeline-when.mjs";

const INK = ["decided", "accepted", "proposal", "provisional"];
const fmtFact = (f) => {
  const bits = [f.status + (f.by ? ` by ${f.by}` : ""), f.source.join(", "), `known: ${f.known}`, `told: ${f.told}`];
  if (f.when) bits.push(`when: ${f.when}`);
  if (f.payoff) bits.push(`payoff: ${f.payoff}`);
  if (f.heldBy) bits.push(`held by ${f.heldBy}, true: ${f.isTrue}${f.truth ? `, truth: ${f.truth}` : ""}`);
  let s = `- ${f.id}  [${bits.join(" · ")}]\n  ${f.text}`;
  if (f.candidates?.length) s += `\n  candidates: ${f.candidates.join(" | ")}`;
  if (f.decideBy) s += `\n  decide by: ${f.decideBy}`;
  return s;
};

/** The paragraphs of a decision's quoted words that mention any of `keys`; null when it quotes nobody. */
const STOP = new Set(["the", "and", "that", "this", "with", "from", "they", "them", "their", "have", "about", "into", "what", "when", "which", "where", "there"]);
function herWords(decision, keys) {
  const quotes = quotesOf(decision.text);
  if (!quotes.length) return null;
  const lower = [...new Set(keys.map((k) => String(k).toLowerCase()))].filter((k) => k.length > 3 && !STOP.has(k));
  return quotes.filter((q) => lower.some((k) => q.toLowerCase().includes(k)));
}

function wordsFor(model, sourceIds, keys) {
  const out = [];
  for (const id of [...new Set(sourceIds)].sort()) {
    const d = model.decisions.find((x) => x.id === id);
    if (!d) continue;
    const kind = d.kind && d.kind !== "decision" ? ` (${d.kind})` : "";
    out.push(`### ${d.id} · ${d.date} · ${d.title}${kind}`);
    const words = herWords(d, keys);
    if (words === null) out.push("(no quoted words: Claude's record)");
    else if (!words.length) out.push("(her words in this record don't name it directly: read the record)");
    for (const w of words || []) out.push(w.split("\n").map((l) => `> ${l}`).join("\n"));
    out.push("");
  }
  return out;
}

function retiredAbout(model, ids) {
  const out = [];
  const set = new Set(ids);
  for (const e of model.world) for (const f of e.facts) if (f.status === "cut" && (set.has(f.id) || set.has(f.entity))) for (const p of f.retire) out.push(`- "${p}" (cut with ${f.id})`);
  for (const i of model.ideas || []) if (i.state === "rejected" && i.retire.length) out.push(...i.retire.map((p) => `- "${p}" (rejected with ${i.id})`));
  return out;
}

function usedBy(cites, ids) {
  const out = [];
  for (const id of ids) for (const w of cites.get(id) || []) if (w.as !== "change") out.push(`- ${id}: ${w.file} · ${w.at} (${w.as})`);
  return out;
}

/** The context pack for one id. An id that was merged into another gives that one's pack, and says so. */
export function contextPack(model, id, { all = false } = {}) {
  const moved = mergedInto(model, id);
  if (moved) return `${id} was merged into ${moved.kept} (${moved.ref}); this is ${moved.kept}.\n\n${contextPack(model, moved.kept, { all })}`;
  const cites = citations(model);
  const facts = factIndex(model);
  const items = itemIndex(model);
  const snap = snapshot(model);
  const lines = [];
  let pool = []; // facts in the pack
  let keys = [id];
  let header = "";

  const entity = model.world.find((e) => e.id === id);
  if (entity) {
    header = `# ${entity.title} (${entity.kind || "entity"}) · canon/world/${entity.id}.md`;
    pool = entity.facts;
    keys = [entity.id, entity.title, ...entity.title.split(/\s+/)];
  } else if (facts.has(id)) {
    const f = facts.get(id);
    const e = model.world.find((x) => x.id === f.entity);
    header = `# ${id} · in ${e.title} (canon/world/${e.id}.md)`;
    const linked = new Set([id, f.truth, f.payoff, ...[...facts.values()].filter((x) => x.payoff === id || x.truth === id).map((x) => x.id)].filter(Boolean));
    pool = [...facts.values()].filter((x) => linked.has(x.id));
    keys = [id, e.title, ...f.text.split(/\W+/).filter((w) => w.length > 5).slice(0, 6)];
    lines.push(`Other facts about ${e.title}: ${e.facts.filter((x) => !linked.has(x.id)).map((x) => `${x.id} (${x.status})`).join(", ") || "none"}`, "");
  } else if (items.has(id)) {
    const { kind, item, file } = items.get(id);
    header = `# ${kind}: ${item.title || item.text || id} · ${file}`;
    if (kind === "thread") {
      lines.push(`kind: ${item.kind} · lane: ${item.lane} · entities: ${item.entities.join(", ") || "none"}`, `impulse: ${item.impulse || "—"}`, `doom: ${item.doom || "—"}`, `intensity: ${item.intensityRaw || "—"}`, `status: ${item.status}${item.by ? ` by ${item.by}` : ""} · ${item.source.join(", ")}`, "");
      for (const c of item.clocks) lines.push(`Clock · ${c.name}: ${c.items.join(" → ")}`);
      const beats = (model.chapters || []).flatMap((c) => c.beats.filter((b) => b.threads.includes(id)).map((b) => `- ${b.id} (chapter ${c.n}, ${b.kind}, ${b.status}): ${b.text}`));
      if (beats.length) lines.push("", "## Beats on this thread", ...beats);
      lines.push("");
      pool = [...facts.values()].filter((f) => item.entities.includes(f.entity) || (f.threads || []).includes(id));
      keys = [id, item.title, ...item.entities];
    } else if (kind === "chapter") {
      lines.push(`book: ${item.book || "—"} · rank: ${item.rank || "—"} · status: ${item.status || "built"}${item.by ? ` by ${item.by}` : ""}`, item.text || "", "");
      if (item.beats.length) { lines.push("## Beats"); for (const b of item.beats) lines.push(`- ${b.id} (${b.kind}${b.pace ? `, ${b.pace}` : ""}, ${b.status}${b.by ? ` by ${b.by}` : ""}): ${b.text}`); lines.push(""); }
      const here = new Set([id, ...item.beats.map((b) => b.id)]);
      pool = [...facts.values()].filter((f) => /^in:/.test(f.told || "") && here.has(f.told.slice(3)));
      keys = [id, item.title];
    } else if (kind === "beat") {
      lines.push(`${item.kind}${item.pace ? `, ${item.pace}` : ""} · ${item.status}${item.by ? ` by ${item.by}` : ""} · chapter ${item.n}`, item.text, "");
      pool = [...facts.values()].filter((f) => f.told === `in:${id}`);
      keys = [id, ...item.text.split(/\W+/).filter((w) => w.length > 5).slice(0, 6)];
    } else if (kind === "question") {
      lines.push(`answer: ${item.answer || "—"} · misdirect: ${item.misdirect || "—"} · raised: ${item.raised || "—"} · answered: ${item.answered || "—"}`, "");
      for (const r of item.roads) lines.push(`- road${r.core ? " (core)" : ""}: ${r.kind} · ${r.fact}`);
      lines.push("");
      pool = [...facts.values()].filter((f) => [item.answer, item.misdirect, ...item.roads.map((r) => r.fact)].includes(f.id));
      keys = [id, item.title];
    } else if (kind === "idea") {
      lines.push(`state: ${item.state} · ${item.status} by ${item.by} · ${item.source.join(", ")}${item.when ? ` · when: ${item.when}` : ""}`, item.text, "");
      if (item.became.length) lines.push(`became: ${item.became.join(", ")}`, "");
      pool = [...facts.values()].filter((f) => item.became.includes(f.id));
      keys = [id];
    } else {
      lines.push(item.text || "", "");
    }
  } else if (model.scenes.some((s) => s.id === id)) {
    const s = model.scenes.find((x) => x.id === id);
    header = `# Scene: ${s.json.title || id} · canon/scenes/${s.file}`;
    const ids = new Set((s.json.beats || []).flatMap((b) => [...(b.facts || []), ...(b.gmFacts || [])]));
    pool = [...facts.values()].filter((f) => ids.has(f.id));
    keys = [id, s.json.title || ""];
  } else {
    return `Nothing in canon has the id "${id}". Try an entity (${model.world.map((e) => e.id).join(", ")}), a fact id, a thread, chapter, beat, question, idea or scene.`;
  }

  if (!all) pool = pool.filter((f) => f.status !== "cut");
  const ink = pool.filter((f) => INK.includes(f.status));
  const open = pool.filter((f) => f.status === "open");
  const pencil = pool.filter((f) => f.status === "sketch");
  const out = [header, ""];
  out.push(...lines);
  out.push(`## Ink (${ink.length})`, ...(ink.length ? ink.map(fmtFact) : ["(none)"]), "");
  out.push(`## Open (${open.length}): hers to decide; never settle these in passing`, ...(open.length ? open.map(fmtFact) : ["(none)"]), "");
  // Pencil is shown by card (a titled group of facts about one thing) where the person has cards, then the rest.
  const cardTitle = new Map();
  for (const e of model.world) for (const c of e.cards || []) for (const m of c.members) cardTitle.set(resolveAlias(model.aliases, m), c.title);
  const grouped = new Map();
  const loose = [];
  for (const f of pencil) { const t = cardTitle.get(f.id); if (t) { if (!grouped.has(t)) grouped.set(t, []); grouped.get(t).push(f); } else loose.push(f); }
  out.push(`## Pencil (${pencil.length}): not yet gone through; never cite in play material`);
  if (!pencil.length) out.push("(none)");
  for (const [title, list] of grouped) out.push(`### ${title} (${list.length})`, ...list.map(fmtFact));
  if (grouped.size && loose.length) out.push(`### Not in a card (${loose.length})`);
  out.push(...loose.map(fmtFact), "");
  if (all) { const cut = pool.filter((f) => f.status === "cut"); if (cut.length) out.push(`## Cut (${cut.length})`, ...cut.map(fmtFact), ""); }
  const sources = pool.flatMap((f) => f.source).filter((s) => /^D\d{3}$/.test(s));
  const itemSource = items.get(id)?.item?.source || [];
  out.push("## Her words", ...wordsFor(model, [...sources, ...itemSource.filter((s) => /^D\d{3}$/.test(s))], keys));
  const uses = usedBy(cites, [id, ...pool.map((f) => f.id)]);
  out.push(`## Used by (${uses.length})`, ...(uses.length ? uses : ["(nothing yet)"]), "");
  // What the table knows of these by the end of Episode One (the last scene in Chapter 1's plan).
  const lastEpisodeOne = [...model.plan].filter((r) => /^Episode One/.test(r.episode || "")).pop();
  if (lastEpisodeOne && pool.length) {
    const known = tableKnows(snap, lastEpisodeOne.scene);
    const told = pool.filter((f) => known.has(f.id)).map((f) => f.id);
    const notYet = pool.filter((f) => !known.has(f.id) && f.status !== "cut").map((f) => f.id);
    out.push(`## The table knows by the end of Episode One`, `- told (${told.length}): ${told.join(", ") || "nothing"}`, `- not yet (${notYet.length}): ${notYet.join(", ") || "nothing"}`, "");
  }
  const never = retiredAbout(model, [id, ...pool.map((f) => f.id), ...pool.map((f) => f.entity)]);
  out.push(`## Never say`, ...(never.length ? never : ["(nothing retired)"]));
  return out.join("\n");
}

/** What a chapter or scene needs (design/plot-timeline.md §6). */
export function brief(model, id) {
  const snap = snapshot(model);
  const facts = factIndex(model);
  const { order } = playOrder(model);
  const chapter = (model.chapters || []).find((c) => c.id === id);
  const scene = model.scenes.find((s) => s.id === id);
  const row = model.plan.find((r) => r.scene === id);
  if (!chapter && !scene && !row) return `No chapter or scene "${id}".`;
  const out = [];
  const n = chapter ? chapter.n : (row ? Number((row.file.match(/chapter-(\d+)/) || [])[1]) || 1 : 1);
  const chapterFile = chapter ? `chapter-${String(chapter.n).padStart(2, "0")}.md` : null;
  const placeIds = chapter ? new Set([chapter.id, ...chapter.beats.map((b) => b.id), ...model.plan.filter((r) => r.file === chapterFile).map((r) => r.scene)]) : new Set([id]);
  out.push(chapter ? `# Brief: Chapter ${chapter.n} · ${chapter.title}` : `# Brief: ${row?.title || id} (${row ? `day ${row.dayRaw}, ${row.time}, ${row.state}` : "not in the plan"})`, "");
  const toTell = [...facts.values()].filter((f) => /^in:/.test(f.told || "") && placeIds.has(f.told.slice(3)));
  out.push(`## Tell here (${toTell.length})`, ...(toTell.length ? toTell.map((f) => `- ${f.id} [${f.status}${f.by ? ` by ${f.by}` : ""}]: ${f.text}`) : ["(nothing scheduled)"]), "");
  // The last moment of this chapter (or this scene): anything told after it is still a secret here. The secrets about
  // whoever and whatever is in it come first, every one of them; the rest are counted.
  const here = Math.max(...[...placeIds].map((p) => order.get(p) ?? -Infinity));
  const hold = [...facts.values()].filter((f) => f.status !== "cut" && (f.told === "later" || (/^in:/.test(f.told || "") && (order.get(f.told.slice(3)) ?? Infinity) > here)) && ["few", "nobody"].includes(f.known));
  const present = new Set([...facts.values()].filter((f) => /^in:/.test(f.told || "") && placeIds.has(f.told.slice(3))).map((f) => f.entity));
  for (const s of model.scenes.filter((x) => placeIds.has(x.id))) for (const b of s.json.beats || []) for (const id of [...(b.facts || []), ...(b.gmFacts || [])]) if (facts.get(id)) present.add(facts.get(id).entity);
  for (const b of chapter?.beats || []) for (const t of b.threads) for (const th of model.threads || []) if (th.id === t) th.entities.forEach((e) => present.add(e));
  const near = hold.filter((f) => present.has(f.entity));
  const far = hold.length - near.length;
  out.push(`## Hold back: secrets about who and what is here (${near.length})`, ...(near.length ? near.map((f) => `- ${f.id}: ${f.text}`) : ["(none)"]), ...(far ? [`- …and ${far} more secrets elsewhere (story context <entity> for each)`] : []), "");
  const plants = [...facts.values()].filter((f) => f.payoff && /^in:/.test(f.told || "") && placeIds.has(f.told.slice(3)));
  if (plants.length) out.push(`## Plant here`, ...plants.map((f) => `- ${f.id} pays off ${f.payoff}`), "");
  const questions = (model.questions || []).filter((q) => {
    const a = chapterOfPlace(snap, q.raised);
    const b = chapterOfPlace(snap, q.answered);
    return a <= n && n <= b;
  });
  out.push(`## Questions in play (${questions.length})`, ...(questions.length ? questions.map((q) => `- ${q.title} (raised ${q.raised || "—"}, answered ${q.answered || "—"}, ${q.roads.length} road(s))`) : ["(none)"]), "");
  const due = [...facts.values()].filter((f) => f.status === "open");
  out.push(`## Open decisions: never settle these in passing (${due.length})`, ...due.map((f) => `- ${f.id}: ${f.text}${f.decideBy ? ` (decide by: ${f.decideBy})` : ""}`), "");
  if (chapter) {
    const paces = chapter.beats.map((b) => b.pace).filter(Boolean);
    const relax = paces.includes("down");
    out.push(`## Pace`, `- beats: ${chapter.beats.length}; up ${paces.filter((p) => p === "up").length}, down ${paces.filter((p) => p === "down").length}, lateral ${paces.filter((p) => p === "lateral").length}`, relax ? "- has a relax beat" : "- NO relax beat: the sawtooth needs one (design/pacing-and-the-responsive-campaign.md)", "");
  }
  return out.join("\n");
}

const fmtDays = (d) => {
  if (d === null || d === undefined) return "";
  if (d <= -UNIT_DAYS.year) {
    const year = PRESENT_YEAR + Math.floor(d / UNIT_DAYS.year);
    return `${Math.round(-d / UNIT_DAYS.year)} years ago${year >= 1 ? ` (${year} AR)` : ""}`;
  }
  if (d < -1) return wordsForDays(d, { approx: false });
  return d === -1 ? "before day 0" : wordsForDays(d);
};

/** The whole timeline as text, era by era. */
export function whenReport(model) {
  const snap = snapshot(model);
  const tl = buildTimeline(snap);
  const out = [`# The timeline · canon ${snap.canonHash} · present year ${snap.presentYear} AR`, ""];
  const sortKey = (i) => (i.position.scale === "chapters" ? 1e9 + i.position.at : i.position.at);
  for (const era of ERAS) {
    const here = tl.items.filter((i) => i.era === era.id && i.kind !== "reveal").sort((a, b) => sortKey(a) - sortKey(b));
    if (!here.length) continue;
    out.push(`## ${era.label}`);
    for (const i of here) {
      const when = i.position.scale === "chapters" ? `chapter ${Math.floor(i.position.at)}` : fmtDays(i.position.at);
      const mark = i.style === "pencil" ? "[pencil]" : i.style === "open" ? "[open]" : i.style === "ink-pending" ? "[awaiting read]" : "";
      out.push(`- ${when.padEnd(26)} ${i.kind.padEnd(8)} ${i.ref}${mark ? " " + mark : ""}: ${String(i.title).slice(0, 110)}`);
    }
    out.push("");
  }
  const undated = snap.facts.filter((f) => !f.when && f.status !== "cut").length;
  out.push(`${undated} of ${snap.facts.length} facts have no date yet; they appear where the table learns them.`);
  if (tl.problems.length) out.push("", "Problems:", ...tl.problems.map((p) => `- ${p.id}: ${p.message}`));
  return out.join("\n");
}

/** The health strip as text. */
export function healthReport(model, opts = {}) {
  const snap = snapshot(model);
  const { horizon, findings } = health(snap, opts);
  const out = [`# Health, up to the end of chapter ${horizon} (the event horizon)`, ""];
  if (!findings.length) out.push("Nothing needs attention inside the horizon.");
  const groups = {};
  for (const f of findings) (groups[f.check] ||= []).push(f);
  for (const [check, list] of Object.entries(groups)) {
    out.push(`## ${check} (${list.length})`, ...list.map((f) => `- ${f.id}: ${f.message}`), "");
  }
  return out.join("\n");
}
