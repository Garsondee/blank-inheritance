#!/usr/bin/env node
// The canon tree's command line (design/story-data-refactor.md §4.6).
//
//   node tools/story/story.mjs show <entity>     every fact about it: status, who knows it, source, where it's used
//   node tools/story/story.mjs where <fact>      every line that relies on one fact
//   node tools/story/story.mjs check             every rule; exits 1 on an error
//   node tools/story/story.mjs apply <Dnnn>      a decision's changes, checked, with every line they touch
//   node tools/story/story.mjs build             copy canon scenes, challenges, objectives, encounters and subsystems to data/
//   node tools/story/story.mjs time              relative time words per scene, beside the plan's day and time
//   node tools/story/story.mjs quarters          write the plan's day/quarter onto every episode's own scene list
//   node tools/story/story.mjs digest <scene>    what a scene says and relies on, compactly
//   node tools/story/story.mjs context <id> [--all]   everything canon holds about one thing (read before writing about it)
//   node tools/story/story.mjs brief <chapter|scene>  what is due there
//   node tools/story/story.mjs when              the whole timeline as text
//   node tools/story/story.mjs health            what needs attention before the table gets there
//   node tools/story/story.mjs edit <id> <field> <value...>      change one detail (or `text`); never the status
//   node tools/story/story.mjs ink <id> <Dnnn> decide|accept     pencil to ink, by a decision in Ingram's words
//   node tools/story/story.mjs pencil <id> <Dnnn> ingram|claude  ink to pencil, by a decision
//   node tools/story/story.mjs note [Nn --reply "..." | --done]  Ingram's notes from the timeline, and answering them
//   node tools/story/story.mjs restore           put back what she set on the timeline wherever older words came back
import path from "node:path";

import { loadModel, checkModel, citations, factIndex, itemIndex, build, syncQuarters, timeReport, sceneHash } from "./lib.mjs";
import { contextPack, brief, whenReport, healthReport } from "./context.mjs";
import { mergedInto } from "./merges.mjs";
import { applyToFile, setField, setText, ink, pencil } from "./edit.mjs";
import { notesOf, readNotesState, setNoteState, findTimelineReversions } from "./daybook.mjs";
import { readPublished } from "../timeline/export.mjs";

const [cmd, arg, ...rest] = process.argv.slice(2);
const model = loadModel();
const cites = citations(model);
const facts = factIndex(model);
const fmtWhere = (w) => `${w.file} · ${w.at} (${w.as})`;

function printProblems(problems) {
  const errors = problems.filter((p) => p.level === "error");
  const warns = problems.filter((p) => p.level === "warn");
  for (const p of errors) console.log(`ERROR  ${p.where}: ${p.message}`);
  for (const p of warns) console.log(`note   ${p.where}: ${p.message}`);
  console.log(`\n${errors.length} error(s), ${warns.length} note(s).`);
  return errors.length;
}

switch (cmd) {
  case "show": {
    const e = model.world.find((w) => w.id === arg);
    if (!e) { console.log(`No canon/world/${arg}.md. Entities: ${model.world.map((w) => w.id).join(", ")}`); process.exit(1); }
    console.log(`# ${e.title}${e.kind ? ` (${e.kind})` : ""}\n`);
    for (const f of e.facts) {
      console.log(`${f.id}  [${f.status} · known: ${f.known} · told: ${f.told} · ${f.source.join(", ")}]`);
      console.log(`  ${f.text}`);
      if (f.heldBy) console.log(`  held by ${f.heldBy}; true: ${f.isTrue}${f.truth ? `; truth: ${f.truth}` : ""}`);
      if (f.candidates.length) console.log(`  candidates: ${f.candidates.join(" | ")}`);
      if (f.decideBy) console.log(`  decide by: ${f.decideBy}`);
      for (const w of cites.get(f.id) || []) console.log(`  used: ${fmtWhere(w)}`);
    }
    break;
  }
  case "where": {
    const moved = mergedInto(model, arg);
    if (moved) console.log(`${arg} was merged into ${moved.kept} (${moved.ref}).\n`);
    const f = facts.get(moved ? moved.kept : arg);
    if (!f) { console.log(`No fact ${arg}.`); process.exit(1); }
    console.log(`${f.id}: ${f.text}\n`);
    const list = cites.get(f.id) || [];
    for (const w of list) console.log(fmtWhere(w));
    if (!list.length) console.log("Not used anywhere yet.");
    break;
  }
  case "check":
    process.exit(printProblems(checkModel(model)) ? 1 : 0);
  case "apply": {
    const d = model.decisions.find((x) => x.id === arg);
    if (!d) { console.log(`No decision ${arg}.`); process.exit(1); }
    console.log(`${d.id} · ${d.title}\n`);
    if (!d.changes.length) console.log("No changes listed.");
    for (const ch of d.changes) {
      console.log(`${ch.verb} ${ch.target}${ch.rest ? " " + ch.rest : ""}`);
      if (ch.verb === "approve") { console.log(`  scene hash now: ${sceneHash(model, ch.target)}`); continue; }
      for (const w of cites.get(ch.target) || []) console.log(`  check: ${fmtWhere(w)}`);
    }
    const mine = checkModel(model).filter((p) => p.where.startsWith(`decisions/${d.file}`));
    console.log("");
    process.exit(printProblems(mine) ? 1 : 0);
  }
  case "build": {
    const changed = build(model);
    console.log(changed.length ? changed.map((c) => "wrote " + c).join("\n") : "Everything in data/ already matches canon.");
    break;
  }
  case "time":
    for (const r of timeReport(model)) console.log(`${r.scene.padEnd(40)} day ${String(r.day).padEnd(2)} ${r.time.padEnd(14)} ${r.words.join(", ")}`);
    break;
  case "quarters": {
    const changed = syncQuarters(model);
    console.log(changed.length ? changed.map((c) => "wrote " + c).join("\n") : "Every episode's scene list already matches the plan's day and quarter.");
    break;
  }
  case "digest": {
    const s = model.scenes.find((x) => x.id === arg);
    if (!s) { console.log(`No canon scene ${arg}.`); process.exit(1); }
    const row = model.plan.find((r) => r.scene === arg);
    console.log(`${s.json.title} · ${row ? `day ${row.dayRaw}, ${row.time}, ${row.state}` : "not in the plan"} · hash ${sceneHash(model, arg)}\n`);
    for (const b of s.json.beats || []) {
      console.log(`${b.id}${b.mandatory ? "" : " (optional)"}`);
      for (const id of b.facts || []) console.log(`  says     ${id}: ${facts.get(id)?.text ?? "MISSING"}`);
      for (const id of b.gmFacts || []) console.log(`  relies   ${id}: ${facts.get(id)?.text ?? "MISSING"}`);
    }
    break;
  }
  case "context":
    if (!arg) { console.log("Usage: story.mjs context <entity | fact | thread | chapter | beat | question | idea | scene> [--all]"); process.exit(1); }
    console.log(contextPack(model, arg, { all: rest.includes("--all") }));
    break;
  case "brief":
    console.log(brief(model, arg));
    break;
  case "when":
    console.log(whenReport(model));
    break;
  case "health":
    console.log(healthReport(model, { publishedHash: readPublished()?.canonHash || null }));
    break;
  case "edit":
  case "ink":
  case "pencil": {
    // The one way to change canon's items from the command line: through edit.mjs, line by line.
    const hit = itemIndex(model).get(arg);
    if (!hit) { console.log(`No item ${arg}.`); process.exit(1); }
    const rel = path.relative(model.root, path.join(model.root, hit.file));
    const world = hit.kind === "fact";
    const kind = hit.kind;
    let op;
    if (cmd === "edit") {
      const [field, ...words] = rest;
      if (!field || !words.length) { console.log("Usage: story.mjs edit <id> <field> <value...>   (field `text` sets its words)"); process.exit(1); }
      const value = words.join(" ");
      op = field === "text" ? (raw) => setText(raw, arg, value, { kind }) : (raw) => setField(raw, arg, field, value === "-" ? null : value, { kind });
    } else if (cmd === "ink") {
      const [decision, verb] = rest;
      op = (raw) => ink(raw, arg, { decision, verb, world, kind });
    } else {
      const [decision, by] = rest;
      op = (raw) => pencil(raw, arg, { decision, by, world, kind });
    }
    const { changed } = applyToFile(rel, [op], { root: model.root });
    console.log(changed ? `wrote ${rel}` : "nothing changed");
    if (cmd !== "edit") console.log(`Also list it in ${rest[0]}'s Changes: - ${cmd === "ink" ? rest[1] : "pencil"} \`${arg}\``);
    process.exit(printProblems(checkModel(loadModel()).filter((p) => p.level === "error")) ? 1 : 0);
  }
  case "note": {
    // Her notes come from her day records; only this command writes what happened to them (harvest/timeline/notes.json).
    if (arg) {
      const reply = rest.includes("--reply") ? rest[rest.indexOf("--reply") + 1] : null;
      const done = rest.includes("--done");
      if (!reply && !done) { console.log('Usage: story.mjs note <Nn> --reply "..." [--done]   |   story.mjs note <Nn> --done'); process.exit(1); }
      if (!notesOf(model).some((n) => n.id === arg)) { console.log(`No note ${arg}.`); process.exit(1); }
      const s = setNoteState(model.root, arg, { reply, done });
      console.log(`${arg}: ${s.state}${s.reply ? ` · "${s.reply}"` : ""}`);
      break;
    }
    const notes = notesOf(model, readNotesState(model.root));
    if (!notes.length) { console.log("No notes from Ingram yet."); break; }
    for (const n of [...notes].sort((a, b) => (a.state === "open" ? 0 : 1) - (b.state === "open" ? 0 : 1))) {
      console.log(`${n.id} · ${n.state} · on ${n.on} · ${n.record} (${n.date})\n  "${n.text.replace(/\n/g, "\n   ")}"${n.reply ? `\n  reply: ${n.reply}` : ""}`);
    }
    break;
  }
  case "restore": {
    const items = itemIndex(model);
    const list = findTimelineReversions(model, items);
    if (!list.length) { console.log("Nothing to restore: canon holds what Ingram set on the timeline."); break; }
    for (const r of list) {
      const hit = items.get(r.id);
      const op = r.field === "text" ? (raw) => setText(raw, r.id, r.expected, { kind: hit.kind }) : (raw) => setField(raw, r.id, r.field, r.expected, { kind: hit.kind });
      applyToFile(hit.file, [op], { root: model.root });
      console.log(`restored ${r.id} · ${r.field}: "${r.expected}" (she set it in ${r.record}; it had gone back to "${r.found}")`);
    }
    process.exit(printProblems(checkModel(loadModel()).filter((p) => p.level === "error")) ? 1 : 0);
  }
  default:
    console.log("Usage: story.mjs show <entity> | where <fact> | check | apply <Dnnn> | build | time | quarters | digest <scene> | context <id> | brief <chapter|scene> | when | health | edit <id> <field> <value> | ink <id> <Dnnn> decide|accept | pencil <id> <Dnnn> ingram|claude | note [Nn --reply \"...\" | --done] | restore");
    process.exit(cmd ? 1 : 0);
}
