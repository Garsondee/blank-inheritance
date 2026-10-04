// The canon tree's reader and checks (design/story-data-refactor.md).
//
// canon/ holds only material that has been through the re-read and is waiting for, or has passed, Ingram's
// full read. Everything outside canon/ is old until it is rebuilt here. This module reads the tree into one
// model (loadModel) and checks it (checkModel). checkModel is pure: the tests hand it small synthetic models.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { QUARTER_IDS } from "../../module/blank-inheritance/scripts/core/day-ring.mjs";

import { checkObjectives } from "./objectives.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const STATUSES = ["decided", "accepted", "proposal", "open", "provisional", "cut"];
// Two separate questions (D048): who in the world knows a fact, and when the table is told it. Something can be common
// knowledge in Kurose and still be held back from the players until a later scene.
export const KNOWN = ["everyone", "some", "few", "nobody"];
export const TOLD = /^(start|later|in:[a-z0-9-]+)$/;
export const TRUTH = ["yes", "no", "partly"];
export const TIMES = ["early morning", "morning", "late morning", "midday", "afternoon", "evening", "night", "flexible", "unknown"];
// The plan's rough time of day, down to the campaign's own four-quarter day ring (design/ux-doctrine.md §3/§7a,
// module/blank-inheritance/scripts/core/day-ring.mjs — imported, not copied, so the two can never drift). A scene
// with no fixed time (flexible, unknown) gets no quarter: the ring is never forced to move for one.
export const TIME_TO_QUARTER = Object.freeze({
  "early morning": "morning",
  morning: "morning",
  "late morning": "morning",
  midday: "afternoon",
  afternoon: "afternoon",
  evening: "evening",
  night: "night",
  flexible: null,
  unknown: null,
});
export function quarterForTime(time) {
  if (!(time in TIME_TO_QUARTER)) throw new Error(`quarterForTime: "${time}" is not one of TIMES`);
  return TIME_TO_QUARTER[time];
}
export const SCENE_STATES = ["approved", "awaiting-read", "old-draft", "unwritten"];
export const VERBS = ["add", "change", "cut", "accept", "open", "resolve", "approve"];

// Paths that point into old material. Canon may not rely on them; decision records are history and exempt.
export const OLD_PATHS = [
  /\bideas\//,
  /\bdesign\/(?!story-data-refactor\.md|gm-facing-prose-style\.md)[\w-]+\.md/,
  /\bdata\/(?:scene-briefs|challenges|npcs|locations|episodes|characters|antagonists|factions|encounters|subsystems)\//,
  /\bLEDGER\b/,
  /\bdossier-[a-z-]+\.md/,
  /\bbible\//,
];

const lf = (s) => s.replace(/\r\n/g, "\n");
const csv = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const bars = (v) => (v ? v.split("|").map((s) => s.trim().replace(/^"(.*)"$/, "$1")).filter(Boolean) : []);

// "status: decided · source: D024, D025 · known: everyone"
export function parseMeta(line) {
  const meta = {};
  for (const part of line.split(" · ")) {
    const i = part.indexOf(":");
    if (i < 0) throw new Error(`a meta entry has no colon: "${part}"`);
    meta[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return meta;
}

// A world file. Line 1 is "# Title", then "kind: x". Each fact is a "## entity.slug" section: its text, then
// one meta line starting "status:". A section without a dot in its name ("## Notes") is free text.
export function parseWorld(text, id) {
  text = lf(text);
  const title = (text.match(/^# (.+)$/m) || [])[1];
  if (!title) throw new Error(`${id}: the first line must be "# Title"`);
  const kind = ((text.match(/^kind: (.+)$/m) || [])[1] || "").trim();
  const facts = [];
  const notes = {};
  for (const sec of text.split(/^## /m).slice(1)) {
    const [head, ...rest] = sec.split("\n");
    const name = head.trim();
    if (!name.includes(".")) { notes[name] = rest.join("\n").trim(); continue; }
    const body = rest.join("\n").trim().split("\n");
    const metaLine = body.pop() || "";
    if (!metaLine.startsWith("status:")) throw new Error(`${id}: fact ${name} must end with its "status: ..." line`);
    const meta = parseMeta(metaLine);
    facts.push({
      id: name,
      entity: id,
      text: body.join(" ").replace(/\s+/g, " ").trim(),
      status: meta.status,
      source: csv(meta.source),
      known: meta.known || null,
      told: meta.told || null,
      heldBy: meta["held-by"] || null,
      isTrue: meta.true || null,
      truth: meta.truth || null,
      when: meta.when || null,
      retire: bars(meta.retire),
      candidates: bars(meta.candidates),
      decideBy: meta["decide-by"] || null,
      meta,
    });
  }
  return { id, title, kind, facts, notes };
}

// A decision record: "# D047 · date · title". A record split from the old log says so on its "source:" line and
// keeps its own layout. A new record has "## Ingram" (her words, quoted) and "## Changes" (one verb per line).
export function parseDecision(text, file) {
  text = lf(text);
  const head = text.split("\n")[0].match(/^# (D\d{3}) · ([^·]+?) · (.+)$/);
  if (!head) throw new Error(`${file}: the first line must be "# Dnnn · date · title"`);
  const split = /^source: split word for word from LEDGER #\d+$/m.test(text);
  const ingram = (text.split(/^## Ingram$/m)[1] || "").split(/^## /m)[0];
  const changes = [];
  const changeBlock = (text.split(/^## Changes$/m)[1] || "").split(/^## /m)[0];
  for (const m of changeBlock.matchAll(/^- (\w+) `?([a-z0-9-]+(?:\.[a-z0-9-]+)?)`?(.*)$/gm)) {
    changes.push({ verb: m[1], target: m[2], rest: m[3].trim() });
  }
  return { id: head[1], date: head[2].trim(), title: head[3].trim(), file, split, quotes: (ingram.match(/^> /gm) || []).length, changes, text };
}

// The chapter plan: a Markdown table per episode.
// | # | Scene | Id | Day | Time | State |
export function parsePlan(text, file) {
  text = lf(text);
  const rows = [];
  let episode = null;
  for (const line of text.split("\n")) {
    const h = line.match(/^## (.+)$/);
    if (h) { episode = h[1].trim(); continue; }
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`?([a-z0-9-]+)`?\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!m) continue;
    const day = m[4] === "—" ? null : Number(m[4]);
    rows.push({ file, episode, order: Number(m[1]), title: m[2], scene: m[3], day, dayRaw: m[4], time: m[5], state: m[6] });
  }
  return rows;
}

const listFiles = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort() : []);

export function loadModel(root = ROOT) {
  const c = (p) => path.join(root, "canon", p);
  const model = { root, decisions: [], sources: [], world: [], plan: [], scenes: [], challenges: [], objectives: [], encounters: [], subsystems: [], built: {}, problems: [] };
  // Source records: material Ingram gave as a whole document (S001...), kept beside the decisions.
  for (const f of listFiles(c("sources"), ".md")) {
    const head = lf(fs.readFileSync(c("sources/" + f), "utf8")).split("\n")[0].match(/^# (S\d{3}) · ([^·]+?) · (.+)$/);
    if (!head) { model.problems.push({ level: "error", where: "sources/" + f, message: 'the first line must be "# Snnn · date · title"' }); continue; }
    model.sources.push({ id: head[1], file: f, title: head[3].trim() });
  }
  for (const f of listFiles(c("decisions"), ".md")) {
    try { model.decisions.push(parseDecision(fs.readFileSync(c("decisions/" + f), "utf8"), f)); }
    catch (e) { model.problems.push({ level: "error", where: "decisions/" + f, message: e.message }); }
  }
  for (const f of listFiles(c("world"), ".md")) {
    try { model.world.push({ ...parseWorld(fs.readFileSync(c("world/" + f), "utf8"), f.replace(/\.md$/, "")), raw: lf(fs.readFileSync(c("world/" + f), "utf8")) }); }
    catch (e) { model.problems.push({ level: "error", where: "world/" + f, message: e.message }); }
  }
  for (const f of listFiles(c("plan"), ".md")) {
    const raw = fs.readFileSync(c("plan/" + f), "utf8");
    model.plan.push(...parsePlan(raw, f));
    (model.planRaw ||= {})[f] = lf(raw);
  }
  // A scene's fight (encounters) and its running hazard or clock (subsystems) are rebuilt in canon like its checks,
  // so the numbers a scene runs on go through the same read as its words.
  for (const [kind, dir, dataDir] of [
    ["scenes", "scenes", "data/scene-briefs"],
    ["challenges", "challenges", "data/challenges"],
    ["objectives", "objectives", "data/objectives"],
    ["encounters", "encounters", "data/encounters"],
    ["subsystems", "subsystems", "data/subsystems"],
  ]) {
    for (const f of listFiles(c(dir), ".json")) {
      const raw = fs.readFileSync(c(dir + "/" + f), "utf8");
      let json = null;
      try { json = JSON.parse(raw); } catch (e) { model.problems.push({ level: "error", where: `${dir}/${f}`, message: "not valid JSON: " + e.message }); continue; }
      model[kind].push({ file: f, id: f.replace(/\.json$/, ""), raw, json });
      const built = path.join(root, dataDir, f);
      model.built[`${dataDir}/${f}`] = { source: raw, copy: fs.existsSync(built) ? fs.readFileSync(built, "utf8") : null };
    }
  }
  // The words of every fact a canon scene says out loud, for the Scene Runner's
  // "the table knows" drawer (module core/table-knows.mjs). Generated here so it
  // can never drift from canon/world/; `check` fails when it is out of date.
  {
    const where = "data/campaign/told-facts.json";
    const built = path.join(root, where);
    model.built[where] = { source: toldFactsFile(model), copy: fs.existsSync(built) ? fs.readFileSync(built, "utf8") : null };
  }
  // Live play data outside canon, scanned only for retired wording.
  model.liveText = {};
  for (const dir of ["data/scene-briefs", "data/challenges"]) {
    for (const f of listFiles(path.join(root, dir), ".json")) model.liveText[`${dir}/${f}`] = fs.readFileSync(path.join(root, dir, f), "utf8");
  }
  model.oldScenes = new Set(listFiles(path.join(root, "data/scene-briefs"), ".json").map((f) => f.replace(/\.json$/, "")));
  return model;
}

/**
 * data/campaign/told-facts.json: every fact some canon scene's beat says out
 * loud (its `facts`, never its `gmFacts`), with its words and what it is about.
 * The Scene Runner lists the ones the table has heard so far.
 */
export function toldFactsFile(model) {
  const told = new Set();
  for (const s of model.scenes) for (const b of s.json?.beats || []) for (const id of b.facts || []) told.add(id);
  const byId = new Map();
  for (const e of model.world) for (const f of e.facts) byId.set(f.id, { fact: f, entity: e });
  const facts = {};
  for (const id of [...told].sort()) {
    const hit = byId.get(id);
    if (hit) facts[id] = { text: hit.fact.text, about: hit.entity.title };
  }
  const doc = {
    $schema: "../schema/told-facts.schema.json",
    $comment: "GENERATED by `node tools/story/story.mjs build` from canon/world/*.md: the words of every fact a canon scene's beat says out loud. Never edit by hand; the Scene Runner's 'the table knows' drawer reads it.",
    facts
  };
  return JSON.stringify(doc, null, 2) + "\n";
}

// A scene's approval covers the scene and every canon challenge, encounter and subsystem its beats use.
export function sceneHash(model, sceneId) {
  const scene = model.scenes.find((s) => s.id === sceneId);
  if (!scene) return null;
  const h = crypto.createHash("sha256").update(lf(scene.raw));
  for (const [key, kind] of [["challengeRef", "challenges"], ["encounterRef", "encounters"], ["subsystemRef", "subsystems"]]) {
    const refs = [...new Set((scene.json.beats || []).map((b) => b[key]).filter(Boolean))].sort();
    for (const r of refs) { const doc = (model[kind] || []).find((c) => c.id === r); if (doc) h.update("\n--" + r + "--\n" + lf(doc.raw)); }
  }
  return h.digest("hex").slice(0, 16);
}

export function factIndex(model) {
  const byId = new Map();
  for (const e of model.world) for (const f of e.facts) byId.set(f.id, f);
  return byId;
}

// Every place a fact is relied on: scene beats (facts or gmFacts), belief links, decision changes.
export function citations(model) {
  const out = new Map();
  const add = (id, where) => { if (!out.has(id)) out.set(id, []); out.get(id).push(where); };
  for (const s of model.scenes) for (const b of s.json.beats || []) {
    for (const f of b.facts || []) add(f, { file: `canon/scenes/${s.file}`, at: b.id, as: "facts" });
    for (const f of b.gmFacts || []) add(f, { file: `canon/scenes/${s.file}`, at: b.id, as: "gmFacts" });
  }
  for (const e of model.world) for (const f of e.facts) if (f.truth) add(f.truth, { file: `canon/world/${e.id}.md`, at: f.id, as: "truth" });
  for (const d of model.decisions) for (const ch of d.changes) if (ch.target.includes(".")) add(ch.target, { file: `canon/decisions/${d.file}`, at: ch.verb, as: "change" });
  return out;
}

export function checkModel(model) {
  const problems = [...(model.problems || [])];
  const err = (where, message) => problems.push({ level: "error", where, message });
  const warn = (where, message) => problems.push({ level: "warn", where, message });
  const decisions = new Map(model.decisions.map((d) => [d.id, d]));
  const sources = new Map((model.sources || []).map((s) => [s.id, s]));
  const scenes = new Map(model.scenes.map((s) => [s.id, s]));
  const facts = new Map();
  const planned = new Set(model.plan.map((r) => r.scene));

  // Decisions
  for (const d of model.decisions) {
    if (d.file !== d.id + ".md") err(`decisions/${d.file}`, `file name must be ${d.id}.md`);
    if (!d.split) {
      if (d.quotes === 0) err(`decisions/${d.file}`, `a new decision needs Ingram's words, quoted under "## Ingram"`);
      for (const ch of d.changes) if (!VERBS.includes(ch.verb)) err(`decisions/${d.file}`, `unknown change "${ch.verb}"`);
    }
  }

  // World facts
  for (const e of model.world) {
    for (const f of e.facts) {
      const at = `world/${e.id}.md → ${f.id}`;
      if (facts.has(f.id)) err(at, "this fact id is used twice");
      facts.set(f.id, f);
      if (f.id.split(".")[0] !== e.id) err(at, `a fact's id must start with its file's id ("${e.id}.")`);
      if (!/^[a-z0-9-]+\.[a-z0-9-]+$/.test(f.id)) err(at, "a fact id is entity.slug, lower case with hyphens");
      if (!STATUSES.includes(f.status)) err(at, `unknown status "${f.status}"`);
      if (!f.text) err(at, "a fact needs its text");
      if (!KNOWN.includes(f.known)) err(at, `unknown "known" value "${f.known}" (who in the world knows it: ${KNOWN.join(", ")})`);
      if (!TOLD.test(f.told || "")) err(at, `"told" must be start, later, or in:<scene id> (when the table hears it); found "${f.told}"`);
      else if (f.told.startsWith("in:") && !planned.has(f.told.slice(3))) err(at, `told in ${f.told.slice(3)}, which isn't in the plan`);
      if (f.source.length === 0) err(at, "every fact needs a source: a decision, a source record, or the scene it comes from");
      for (const s of f.source) {
        if (/^D\d{3}$/.test(s)) { if (!decisions.has(s)) err(at, `source ${s} is not a decision record`); }
        else if (/^S\d{3}$/.test(s)) { if (!sources.has(s)) err(at, `source ${s} is not a source record`); }
        else if (!scenes.has(s)) err(at, `source ${s} is not a decision, a source record, or a scene in canon`);
      }
      const hasDecision = f.source.some((s) => /^[DS]\d{3}$/.test(s));
      if (["decided", "accepted", "cut"].includes(f.status) && !hasDecision) err(at, `a ${f.status} fact must cite the decision or source record that made it so`);
      if (f.status === "provisional" && !f.source.some((s) => scenes.has(s))) err(at, "a provisional fact must cite the scene it comes from");
      if (f.status === "open" && f.candidates.length === 0 && !f.decideBy) warn(at, "an open fact should list the candidate answers or say when it must be decided");
      if (f.heldBy) {
        if (!TRUTH.includes(f.isTrue)) err(at, `a belief needs "true: yes | no | partly"`);
        if (f.isTrue !== "yes" && !f.truth) err(at, "a belief that isn't simply true must link to the truth");
      }
      if (f.status === "cut" && f.retire.length === 0) warn(at, "a cut fact should list the wording that must not come back (retire)");
    }
  }
  for (const f of facts.values()) if (f.truth && !facts.has(f.truth)) err(`world/${f.entity}.md → ${f.id}`, `truth ${f.truth} does not exist`);

  // The plan
  const order = new Map();
  let seq = 0;
  for (const r of model.plan) {
    const at = `plan/${r.file} → ${r.scene}`;
    if (!TIMES.includes(r.time)) err(at, `unknown time "${r.time}" (use: ${TIMES.join(", ")})`);
    if (!SCENE_STATES.includes(r.state)) err(at, `unknown state "${r.state}"`);
    if (r.dayRaw !== "—" && !Number.isInteger(r.day)) err(at, `day must be a whole number or "—"`);
    if (["approved", "awaiting-read"].includes(r.state) && !scenes.has(r.scene)) err(at, `a scene marked ${r.state} must be in canon/scenes`);
    if (r.state === "old-draft" && model.oldScenes && !model.oldScenes.has(r.scene)) err(at, "no such scene brief");
    order.set(r.scene, seq++);
  }
  for (const s of model.scenes) if (!order.has(s.id)) err(`scenes/${s.file}`, "every canon scene must appear in the plan");

  // Scenes: citations, early reveals, dependencies
  for (const s of model.scenes) {
    const here = order.has(s.id) ? order.get(s.id) : Infinity;
    for (const b of s.json.beats || []) {
      const at = `scenes/${s.file} → ${b.id}`;
      for (const key of ["facts", "gmFacts"]) {
        for (const id of b[key] || []) {
          const f = facts.get(id);
          if (!f) { err(at, `cites ${id}, which is not a canon fact`); continue; }
          if (f.status === "cut") err(at, `cites ${id}, which is cut`);
          if (key === "facts") {
            const reveal = (f.told || "").match(/^in:(.+)$/);
            const ok = f.told === "start" || (reveal && order.has(reveal[1]) && order.get(reveal[1]) <= here);
            if (!ok) err(at, `tells the table ${id}, which the players aren't told by this scene (told: ${f.told})`);
          }
        }
      }
      for (const [k, v] of [["challengeRef", b.challengeRef], ["npcRef", b.npcRef], ["encounterRef", b.encounterRef], ["subsystemRef", b.subsystemRef], ["handoutRef", b.handoutRef]]) {
        if (!v) continue;
        if (k === "challengeRef") {
          const ch = model.challenges.find((c) => c.id === v);
          if (!ch) warn(at, `${k} ${v} is not in canon yet`);
          else if (b.checkRef && !(ch.json.checks || []).some((x) => x.id === b.checkRef)) err(at, `checkRef ${b.checkRef} is not a check in ${v}`);
        } else if (k === "encounterRef" || k === "subsystemRef") {
          const kind = k === "encounterRef" ? "encounters" : "subsystems";
          if (!(model[kind] || []).some((d) => d.id === v)) warn(at, `${k} ${v} is not in canon yet`);
        } else warn(at, `${k} ${v} is not in canon yet`);
      }
    }
    for (const c of s.json.cast || []) if (c.npcRef) warn(`scenes/${s.file}`, `cast npcRef ${c.npcRef} is not in canon yet`);
    if (s.json.intro?.position?.locationRef) warn(`scenes/${s.file}`, `locationRef ${s.json.intro.position.locationRef} is not in canon yet`);
  }

  problems.push(...checkObjectives(model, { scenes, facts, order }));

  // A fact scheduled for a scene that's in canon should actually be told there.
  for (const f of facts.values()) {
    const m = (f.told || "").match(/^in:(.+)$/);
    if (!m || !scenes.has(m[1])) continue;
    if (!(scenes.get(m[1]).json.beats || []).some((b) => (b.facts || []).includes(f.id))) warn(`world/${f.entity}.md → ${f.id}`, `scheduled to be told in ${m[1]}, which doesn't tell it yet`);
  }

  // Canon relies on nothing old
  const scanOld = (where, text) => {
    for (const re of OLD_PATHS) { const m = text.match(re); if (m) err(where, `points at old material ("${m[0]}"); rebuild what it needs in canon instead`); }
  };
  for (const e of model.world) scanOld(`world/${e.id}.md`, e.raw || "");
  for (const [f, raw] of Object.entries(model.planRaw || {})) scanOld(`plan/${f}`, raw);
  for (const s of model.scenes) scanOld(`scenes/${s.file}`, s.raw);
  for (const c of model.challenges) scanOld(`challenges/${c.file}`, c.raw);
  for (const o of model.objectives || []) scanOld(`objectives/${o.file}`, o.raw);
  for (const e of model.encounters || []) scanOld(`encounters/${e.file}`, e.raw);
  for (const s of model.subsystems || []) scanOld(`subsystems/${s.file}`, s.raw);

  // Cut wording never comes back
  const retired = [];
  for (const f of facts.values()) if (f.status === "cut") for (const p of f.retire) retired.push({ fact: f.id, phrase: p });
  const texts = [
    ...model.scenes.map((s) => [`canon/scenes/${s.file}`, s.raw]),
    ...model.challenges.map((c) => [`canon/challenges/${c.file}`, c.raw]),
    ...Object.entries(model.planRaw || {}).map(([f, raw]) => [`canon/plan/${f}`, raw]),
    ...model.world.map((e) => [`canon/world/${e.id}.md`, (e.raw || "").split(/^## /m).filter((sec) => !retired.some((r) => sec.startsWith(r.fact))).join("## ")]),
    ...Object.entries(model.liveText || {}),
  ];
  for (const { fact, phrase } of retired) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    for (const [where, text] of texts) if (re.test(text)) err(where, `uses "${phrase}", retired with ${fact}`);
  }

  // Built copies: data/ holds exact copies of canon scenes and challenges
  for (const [where, { source, copy }] of Object.entries(model.built || {})) {
    if (copy === null) err(where, "missing: run `node tools/story/story.mjs build`");
    else if (lf(copy) !== lf(source)) err(where, "differs from its canon source: run `node tools/story/story.mjs build`, and edit the canon copy, never this one");
  }

  // Decisions agree with the facts they change, and approvals still match the scene
  for (const d of model.decisions) {
    for (const ch of d.changes) {
      const at = `decisions/${d.file} → ${ch.verb} ${ch.target}`;
      if (ch.verb === "approve") {
        const hash = (ch.rest.match(/hash ([0-9a-f]{16})/) || [])[1];
        if (!scenes.has(ch.target)) { err(at, "no such canon scene"); continue; }
        if (!hash) { err(at, `an approval records the scene's hash ("hash <16 hex>")`); continue; }
        const now = sceneHash(model, ch.target);
        if (now !== hash) err(at, `the scene has changed since this approval (approved ${hash}, now ${now}): it needs Ingram's read again`);
        continue;
      }
      const f = facts.get(ch.target);
      if (!f) { err(at, "no such fact"); continue; }
      if (!f.source.includes(d.id)) err(at, `the fact should cite ${d.id} as a source`);
      const want = { add: null, change: null, cut: "cut", accept: "accepted", open: "open", resolve: null }[ch.verb];
      if (want && f.status !== want) err(at, `expected status ${want}, found ${f.status}`);
    }
  }
  // A scene marked approved has an approval on record
  for (const r of model.plan) {
    if (r.state !== "approved") continue;
    const ok = model.decisions.some((d) => d.changes.some((ch) => ch.verb === "approve" && ch.target === r.scene));
    if (!ok) err(`plan/${r.file} → ${r.scene}`, "marked approved, but no decision approves it");
  }
  return problems;
}

// Relative time words in a scene's text, with the plan's day and time beside them. A report for the re-read.
export const TIME_WORDS = /\b(yesterday|last night|this morning|this afternoon|this evening|tonight|tomorrow|(?:a|one|two|three|four|five|six|several) (?:days?|nights?|weeks?) ago|a fortnight ago|weeks ago|days ago)\b/gi;
export function timeReport(model, root = ROOT) {
  const out = [];
  for (const r of model.plan) {
    const canonScene = model.scenes.find((s) => s.id === r.scene);
    const p = path.join(root, "data/scene-briefs", r.scene + ".json");
    const raw = canonScene ? canonScene.raw : fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
    const hits = [...new Set((raw.match(TIME_WORDS) || []).map((w) => w.toLowerCase()))];
    out.push({ scene: r.scene, day: r.dayRaw, time: r.time, words: hits });
  }
  return out;
}

/**
 * Write the plan's day and quarter onto every episode's own scene entries (`data/episodes/*.json`), the file the
 * Scene Runner already reads to find "the next scene" (`foundry/scene-runner.mjs#advanceAfterClose`). Idempotent,
 * like `build`: a scene whose plan row hasn't changed is left untouched, byte for byte.
 *
 * A scene with no day in the plan (Scene 0 — narration before anyone is anywhere) gets neither field: nothing ever
 * closes INTO it, so it is never a target `setMoment` needs a real day for.
 */
export function syncQuarters(model, root = ROOT) {
  const byBrief = new Map(model.plan.map((r) => [r.scene, r]));
  const changed = [];
  const episodesDir = path.join(root, "data", "episodes");
  for (const file of fs.existsSync(episodesDir) ? fs.readdirSync(episodesDir).filter((f) => f.endsWith(".json")) : []) {
    const p = path.join(episodesDir, file);
    const raw = fs.readFileSync(p, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const doc = JSON.parse(raw);
    let touched = false;
    for (const entry of doc.scenes || []) {
      const row = entry.briefRef ? byBrief.get(entry.briefRef) : null;
      if (!row || row.day === null) continue;
      const quarter = quarterForTime(row.time);
      if (entry.day !== row.day || entry.quarter !== quarter) {
        entry.day = row.day;
        entry.quarter = quarter;
        touched = true;
      }
    }
    if (!touched) continue;
    const text = `${JSON.stringify(doc, null, 2)}\n`;
    fs.writeFileSync(p, eol === "\r\n" ? text.replace(/\n/g, "\r\n") : text);
    changed.push(`data/episodes/${file}`);
  }
  return changed;
}

export function build(model, root = ROOT) {
  const changed = [];
  for (const [where, { source, copy }] of Object.entries(model.built)) {
    if (copy !== null && lf(copy) === lf(source)) continue;
    fs.mkdirSync(path.dirname(path.join(root, where)), { recursive: true });
    fs.writeFileSync(path.join(root, where), source);
    changed.push(where);
  }
  return changed;
}
