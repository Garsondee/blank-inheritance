// What each NPC's Actor sheet says, generated from canon (D080, design/plot-timeline.md, canon/README.md).
//
// data/campaign/actor-notes.json holds, for every file in data/npcs/:
//   - its BLURB: one line built from the file's own role and affiliation (core/actor-notes.mjs#npcBlurb), never story;
//   - and, when the file's `canon` field names a canon entity (or a person's own facts inside a group entity), that person's
//     SETTLED facts (decided, accepted, provisional or proposal: the ink, plus the Episode One material her scenes already say)
//     with each fact's known and told; their OPEN facts with candidates and deadline, to be flagged "not decided yet"; and a
//     COUNT of the pencil (sketch) facts, which are never written out because play material never cites pencil. A cut fact is
//     neither shown nor counted.
//
// Owned by `story build` exactly like data/campaign/told-facts.json and open-decisions.json (lib.mjs wires it as a built copy):
// `story check` fails when the copy on disk is out of date, and nothing edits it by hand. The module's Actor sync reads it
// (foundry/sync.mjs) and renders it with module core/actor-notes.mjs. This file is the pure builder: it takes the model and the
// NPC sources and returns text, so the tests hand it small synthetic canons.
import fs from "node:fs";
import path from "node:path";

import { npcBlurb, SETTLED_STATUSES } from "../../module/blank-inheritance/scripts/core/actor-notes.mjs";

/** The shape of an NPC file's `canon` field: an entity id, or `entity.slug` for one person inside a group entity. */
const CANON_REF = /^([a-z0-9-]+)(?:\.([a-z0-9-]+))?$/;

export function parseCanonRef(spec) {
  const match = typeof spec === "string" ? spec.match(CANON_REF) : null;
  return match ? { entity: match[1], stem: match[2] ?? null } : null;
}

/** Whether a fact belongs to the person `stem` inside the group entity `entity`: its slug is the stem, or starts "stem-". */
export function inStem(factId, entity, stem) {
  const slug = String(factId).slice(entity.length + 1);
  return slug === stem || slug.startsWith(`${stem}-`);
}

/**
 * The NPC sources the notes are built from: data/npcs/*.json, reduced to the fields that matter here. An unreadable file is a
 * problem (pushed on the model when one is given), never a throw: a story command must still run.
 */
export function loadNpcSources(root, model = null) {
  const dir = path.join(root, "data", "npcs");
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    try {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      out.push({ id: json.id || file.replace(/\.json$/, ""), role: json.role ?? null, affiliation: json.affiliation ?? null, canon: json.canon ?? null });
    } catch (err) {
      model?.problems?.push({ level: "error", where: `npcs/${file}`, message: `not valid JSON: ${err.message}` });
    }
  }
  return out;
}

/**
 * Where the table hears something and how it sorts: start first, then the plan's scenes in order, then chapters, then "later".
 * `heldBack` is the Actor sheet's own split (D080): the table is told what is told at the start or in a scene of the plan
 * (an Episode's scene, a night's rest); everything scheduled for a later chapter or not scheduled stays GM-only.
 */
function placer(model) {
  const rows = model.plan || [];
  const sceneAt = new Map(rows.map((row, i) => [row.scene, { index: i, title: row.title }]));
  const chapterOfBeat = new Map();
  for (const chapter of model.chapters || []) for (const beat of chapter.beats || []) chapterOfBeat.set(beat.id, chapter.n);
  const chapterOf = (id) => {
    const named = id.match(/^chapter-(\d+)$/);
    return named ? Number(named[1]) : chapterOfBeat.get(id);
  };
  return (told) => {
    if (told === "start") return { key: -1, label: "the start", heldBack: false };
    const id = typeof told === "string" && told.startsWith("in:") ? told.slice(3) : null;
    if (id && sceneAt.has(id)) return { key: sceneAt.get(id).index, label: sceneAt.get(id).title, heldBack: false };
    const chapter = id ? chapterOf(id) : undefined;
    if (Number.isInteger(chapter)) return { key: 10000 + chapter, label: `Chapter ${chapter}`, heldBack: true };
    return { key: 30000, label: "later", heldBack: true };
  };
}

/**
 * One NPC's entry: { blurb } alone for a person with no canon entity, else { blurb, canon, settled, open, sketched }.
 * Problems (a `canon` that names nothing) go on `problems`; the entry then falls back to the blurb alone.
 */
export function entryFor(npc, { entities, place, problems }) {
  const blurb = npcBlurb(npc);
  if (npc.canon === null || npc.canon === undefined) return { blurb };
  const where = `npcs/${npc.id}.json`;
  const ref = parseCanonRef(npc.canon);
  if (!ref) {
    problems.push({ level: "error", where, message: `canon must be a canon entity id (canon/world/<id>.md) or entity.slug for one person inside a group file; found ${JSON.stringify(npc.canon)}` });
    return { blurb };
  }
  const entity = entities.get(ref.entity);
  if (!entity) {
    problems.push({ level: "error", where, message: `canon names ${ref.entity}, which is not a canon entity (canon/world/${ref.entity}.md); set it to the entity this person is, or to null` });
    return { blurb };
  }
  const facts = entity.facts.filter((fact) => ref.stem === null || inStem(fact.id, entity.id, ref.stem));
  if (!facts.length) problems.push({ level: "warn", where, message: `canon ${npc.canon} matches no fact in canon/world/${entity.id}.md` });

  const settled = [];
  const open = [];
  let sketched = 0;
  for (const fact of facts) {
    if (SETTLED_STATUSES.includes(fact.status)) {
      const at = place(fact.told);
      const line = { id: fact.id, text: fact.text, status: fact.status, known: fact.known, told: fact.told, toldAt: at.label, heldBack: at.heldBack };
      if (fact.heldBy) {
        line.heldBy = fact.heldBy;
        if (fact.isTrue) line.true = fact.isTrue;
      }
      settled.push({ line, key: at.key });
    } else if (fact.status === "open") {
      open.push({ id: fact.id, text: fact.text, candidates: [...(fact.candidates || [])], decideBy: fact.decideBy || null });
    } else if (fact.status === "sketch") {
      sketched += 1;
    }
  }
  // In the order the table meets them; facts told at the same place keep canon's own order (a stable sort).
  settled.sort((a, b) => a.key - b.key);
  return { blurb, canon: npc.canon, settled: settled.map((s) => s.line), open, sketched };
}

/** Every entry, by NPC id, and the problems found building them. */
export function actorNotes(model, npcs) {
  const entities = new Map(model.world.map((entity) => [entity.id, entity]));
  const place = placer(model);
  const problems = [];
  const out = {};
  for (const npc of [...npcs].sort((a, b) => a.id.localeCompare(b.id))) out[npc.id] = entryFor(npc, { entities, place, problems });
  return { npcs: out, problems };
}

/**
 * data/campaign/actor-notes.json as text. `npcs` is a list of NPC sources, or the repo root to read data/npcs/ from. Problems
 * (a `canon` that names nothing) are pushed on `model.problems`, where `story check` reports them.
 */
export function actorNotesFile(model, npcs) {
  const list = typeof npcs === "string" ? loadNpcSources(npcs, model) : npcs;
  const built = actorNotes(model, list);
  if (Array.isArray(model.problems)) model.problems.push(...built.problems);
  const doc = {
    $schema: "../schema/actor-notes.schema.json",
    $comment: "GENERATED by `node tools/story/story.mjs build` from canon/world/*.md and data/npcs/*.json: what each NPC's Actor sheet shows (D080). Never edit by hand: change the story on the plot timeline, or the NPC's `canon` link in its own file. The module's Actor sync reads it.",
    npcs: built.npcs,
  };
  return JSON.stringify(doc, null, 2) + "\n";
}
