#!/usr/bin/env node
// The canon tree's command line (design/story-data-refactor.md §4.6).
//
//   node tools/story/story.mjs show <entity>     every fact about it: status, who knows it, source, where it's used
//   node tools/story/story.mjs where <fact>      every line that relies on one fact
//   node tools/story/story.mjs check             every rule; exits 1 on an error
//   node tools/story/story.mjs apply <Dnnn>      a decision's changes, checked, with every line they touch
//   node tools/story/story.mjs build             copy canon scenes and challenges to data/, where Foundry reads them
//   node tools/story/story.mjs time              relative time words per scene, beside the plan's day and time
//   node tools/story/story.mjs quarters          write the plan's day/quarter onto every episode's own scene list
//   node tools/story/story.mjs digest <scene>    what a scene says and relies on, compactly
import { loadModel, checkModel, citations, factIndex, build, syncQuarters, timeReport, sceneHash } from "./lib.mjs";

const [cmd, arg] = process.argv.slice(2);
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
    const f = facts.get(arg);
    if (!f) { console.log(`No fact ${arg}.`); process.exit(1); }
    console.log(`${f.id}: ${f.text}\n`);
    const list = cites.get(arg) || [];
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
  default:
    console.log("Usage: story.mjs show <entity> | where <fact> | check | apply <Dnnn> | build | time | quarters | digest <scene>");
    process.exit(cmd ? 1 : 0);
}
