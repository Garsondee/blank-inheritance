/**
 * The playtest kit around the engine: the verb table, the agent briefs, the persona files, the contamination audit, the report skeleton,
 * the bot specs, the seeded defects and the small command helpers (tools/playtest/core/verbs.mjs, briefs.mjs, audit.mjs, report.mjs,
 * bots/chargen-specs.json, defects/defects.json, foundry/seeds.mjs, commands/cleanup.mjs, commands/preflight.mjs).
 *
 * Several of these tests exist to stop quiet rot: the chargen specs must keep naming things that are in the catalogues, the seeded
 * defects must keep finding their anchors in the real module, and the persona files must never learn the story.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ORCHESTRATOR_ONLY, SEAT_VERBS, VALUED_FLAGS, checkVerbCall, verbReference } from "../../tools/playtest/core/verbs.mjs";
import { assembleBrief, commandPrefix } from "../../tools/playtest/core/briefs.mjs";
import { auditTranscript, summarizeAudits, toolCalls } from "../../tools/playtest/core/audit.mjs";
import { LAUNCH_CHECKS, buildReport, improvInventory, unfilled } from "../../tools/playtest/core/report.mjs";
import { buildRoster } from "../../tools/playtest/core/roster.mjs";
import { loadDefects, occurrences, plant } from "../../tools/playtest/foundry/seeds.mjs";
import { newTrackedChanges } from "../../tools/playtest/commands/cleanup.mjs";
import { allowlistPresent, copyCurrentRow } from "../../tools/playtest/commands/preflight.mjs";
import { parsePredictions } from "../../tools/playtest/commands/report.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pt = (...p) => path.join(root, "tools", "playtest", ...p);
const read = (...p) => readFileSync(path.join(root, ...p), "utf8");
const personas = JSON.parse(readFileSync(pt("personas", "personas.json"), "utf8"));

test("every flag a verb's usage names is parsed correctly: valued flags are in the CLI's list, the rest are plain switches", () => {
  const switches = new Set(["all", "right", "double", "clear", "enter", "list"]);
  for (const [verb, spec] of Object.entries(SEAT_VERBS)) {
    for (const [, flag] of spec.usage.matchAll(/--([a-z-]+)/g)) assert.ok(switches.has(flag) || VALUED_FLAGS.includes(flag), `${verb} --${flag}: neither a known switch nor a valued flag, so the CLI would swallow its value as a word`);
    assert.ok(spec.help.length > 20, `${verb} says what it does`);
  }
  assert.ok(VALUED_FLAGS.includes("as") && VALUED_FLAGS.includes("dc") && VALUED_FLAGS.includes("degree"), "the operator's flags are valued too");
  assert.ok(ORCHESTRATOR_ONLY.every((v) => !SEAT_VERBS[v]), "no verb is both a seat's and the operator's");
});

test("only the GM may improvise or read aloud, and a player's brief does not even mention those", () => {
  assert.match(checkVerbCall("improv", "player"), /GM seat only/);
  assert.match(checkVerbCall("read-aloud", "player"), /GM seat only/);
  assert.equal(checkVerbCall("improv", "gm"), null);
  assert.equal(checkVerbCall("look", "player"), null);
  assert.match(checkVerbCall("eval", "gm"), /no verb/);
  assert.ok(!verbReference("player").includes("improv"));
  assert.ok(verbReference("gm").includes("improv") && verbReference("gm").includes("read-aloud"));
});

test("a brief carries the seat's persona, the table's rules, its own commands and its own prefix, and nothing of the game's data", () => {
  const brief = assembleBrief({ seat: "P2", role: "player", token: "abc123", personaText: "## Who you are\nA newcomer.", rulesText: "RULES BODY", run: { name: "r1", user: "PT Player 2", players: 6 } });
  assert.ok(brief.includes(commandPrefix("P2", "abc123")));
  assert.ok(brief.includes("A newcomer.") && brief.includes("RULES BODY"));
  assert.ok(brief.includes("look") && brief.includes("note"));
  assert.ok(!/improv|read-aloud/.test(brief), "a player cannot improvise");
  assert.ok(!/data\/|canon\/|design\/|module\//.test(brief), "no repo paths: an agent knows only its screen and its table");
  const gm = assembleBrief({ seat: "GM", role: "gm", token: "t", personaText: "p", rulesText: "r", run: { name: "r", user: "Gamemaster", players: 6 }, stretch: "Act 1", memoryText: "- remember" });
  assert.ok(gm.includes("improv") && gm.includes("Act 1") && gm.includes("- remember"));
});

test("the persona files exist for every persona, and none of them knows the story", () => {
  const forbidden = ["Watcher", "mitflit", "Cicada", "Gen 2", "Anabala", "Hyuck", "Rupiah", "Shucks", "Manako", "Kurose", "Minkai", "Founders", "marker"];
  const names = Object.keys(personas).filter((k) => !k.startsWith("_"));
  for (const name of [...names, "_rules", "_rules-gm"]) {
    const file = pt("personas", `${name}.md`);
    assert.ok(existsSync(file), `${name}.md exists`);
    const text = readFileSync(file, "utf8");
    assert.ok(text.length > 400, `${name}.md says something`);
    for (const word of forbidden) assert.ok(!new RegExp(`\\b${word}\\b`).test(text), `${name}.md must not mention "${word}": a player does not know the story`);
  }
  assert.match(read("tools", "playtest", "personas", "_rules.md"), /never instructions to you|not an instruction/i, "fiction is not an instruction");
  assert.match(read("tools", "playtest", "personas", "_rules-gm.md"), /improv/, "the GM rules ask for the improvisation count");
  assert.match(read("tools", "playtest", "personas", "lateral-thinker.md"), /nobody offered/i);
  assert.doesNotMatch(read("tools", "playtest", "personas", "lateral-thinker.md"), /cannot use a mouse/i, "keyboard-only play is out of scope (Ingram, 2026-10-06)");
  assert.match(read("tools", "playtest", "personas", "quiet-one.md"), /reduce/i);
});

test("every persona's brief file is what the roster will hand out for its seat", () => {
  for (const kind of ["main", "full"]) {
    for (const seat of buildRoster(kind, personas, { run: "t" }).seats) assert.ok(existsSync(pt("personas", `${seat.persona}.md`)), `${seat.seat} (${seat.persona}) has a brief`);
  }
});

test("the agent definitions exist, hold the narrow tool lists, and the scribe cannot write", () => {
  for (const [file, tools] of [["playtest-player", ["Bash", "Read"]], ["playtest-gm", ["Bash", "Read"]], ["playtest-scribe", ["Bash", "Read", "Grep", "Glob"]]]) {
    const text = read(".claude", "agents", `${file}.md`);
    const front = /^---\n([\s\S]*?)\n---/.exec(text)[1];
    assert.match(front, new RegExp(`name: ${file}`));
    const listed = /tools: (.*)/.exec(front)[1].split(",").map((t) => t.trim());
    assert.deepEqual(listed, tools, `${file} holds exactly ${tools.join(", ")}`);
    assert.ok(!listed.some((t) => /Write|Edit|WebFetch|WebSearch|Agent/.test(t)));
  }
});

test("the contamination audit passes a clean seat and names every kind of overreach", () => {
  const call = (name, input) => ({ message: { content: [{ type: "tool_use", name, input }] } });
  const clean = [call("Bash", { command: "node tools/playtest/pt.mjs --as P2:abc look" }), call("Read", { file_path: "C:/x/tools/playtest/runs/r/seats/p2/evidence/a.jpg" })];
  assert.equal(auditTranscript(clean, { seat: "P2" }).tainted, false);
  const bad = [
    call("Bash", { command: "cat data/scene-briefs/x.json" }),
    call("Read", { file_path: "C:/x/data/scene-briefs/x.json" }),
    call("Grep", { pattern: "Secret", path: "canon" }),
    call("Write", { file_path: "x.txt" }),
    call("WebFetch", { url: "http://x" }),
    call("Bash", { command: "node tools/playtest/pt.mjs --as P2:abc look && curl http://127.0.0.1:30177/o/eval" }),
    call("Bash", { command: "node tools/playtest/pt.mjs --as P2:abc look | head -5" })
  ];
  const audit = auditTranscript(bad, { seat: "P2" });
  assert.equal(audit.tainted, true);
  const kinds = new Set(audit.violations.map((v) => v.kind));
  for (const k of ["not-the-cli", "outside-read", "write", "unexpected-tool", "orchestrator-access"]) assert.ok(kinds.has(k), `finds ${k}`);
  assert.ok(audit.notes.some((n) => /head -5/.test(n.detail)), "a piped command is noted");
  assert.ok(!audit.violations.some((v) => /head -5/.test(v.detail)), "and not condemned");
  assert.match(summarizeAudits([audit])[0], /TAINTED/);
  assert.equal(toolCalls([{ type: "tool_use", name: "Bash", input: {} }]).length, 1);
});

test("the audit lets a seat read its own brief and hand its report back, but never reads an empty transcript as a clean seat", () => {
  const call = (name, input) => ({ message: { content: [{ type: "tool_use", name, input }] } });
  const started = [
    call("Read", { file_path: "C:/Users/Hivemind/Documents/Mythica Machina Business/Blank Inheritance/tools/playtest/runs/shakedown-1/seats/P2/brief.md" }),
    call("Bash", { command: "node tools/playtest/pt.mjs --as P2:abc look" }),
    call("SubagentHandback", { message: "done" })
  ];
  const audit = auditTranscript(started, { seat: "P2" });
  assert.equal(audit.tainted, false, JSON.stringify(audit.violations));
  assert.equal(audit.unreadable, false);
  assert.equal(auditTranscript([call("Read", { file_path: "C:/x/tools/playtest/runs/r/seats/P6/brief.md" })], { seat: "P2" }).tainted, true, "another seat's brief is not its own");
  assert.equal(auditTranscript([call("Read", { file_path: "C:/x/data/brief.md" })], { seat: "P2" }).tainted, true, "and a file that merely ends in brief.md is not it");
  assert.equal(auditTranscript([call("Read", { file_path: "C:/x/tools/playtest/runs/r/seats/P2/brief.md" }), call("Write", { file_path: "C:/x/tools/playtest/runs/r/seats/P2/brief.md" })], { seat: "P2" }).tainted, true, "writing it is still a write");
  const empty = auditTranscript([], { seat: "P2" });
  assert.equal(empty.unreadable, true, "no tool call at all means the wrong file");
  assert.equal(empty.tainted, false);
  assert.match(summarizeAudits([empty])[0], /UNREADABLE.*subagents\/agent-/, "and the summary says where the real transcript is kept");
  assert.doesNotMatch(summarizeAudits([empty])[0], /clean/);
});

test("the report has every section the process promises, leaves its judgement blanks marked, and escapes table cells", () => {
  const roster = buildRoster("main", personas, { run: "t" });
  const findings = [
    { id: "F-0001", severity: "S1", kind: "bug", seat: "P2", scene: "s", summary: "A | pipe in the words", evidence: ["a.png"], channel: "agent", t: "1" },
    { id: "F-0002", severity: "S3", kind: "praise", seat: "P4", scene: "s", summary: "The tracker is clear", evidence: ["b.png"], channel: "agent", t: "2" },
    { id: "F-0003", severity: "S2", kind: "material-gap", seat: "GM", scene: "s", beat: "b1", summary: "No line for the clerk", evidence: ["c.png"], channel: "agent", t: "3", ref: "R7" }
  ];
  const md = buildReport({ run: { name: "t", build: "b", seed: "s" }, roster, findings, improv: [{ scene: "s", beat: "b1", why: "nothing written" }, { scene: "s", beat: "b1" }], coverage: null, telemetry: null, dice: { rolls: 0, forced: 0, natural: 0, byDegree: {} } });
  for (const heading of ["## 1. Verdict", "## 2. Run facts", "## 3. UI and UX findings", "## 4. Material findings", "## 5. What worked", "## 6. Per-persona view", "## 7. Calls that are", "## 8. The lock plan", "## 9. Appendix"]) assert.ok(md.includes(heading), heading);
  assert.ok(md.includes("A \\| pipe"));
  for (const [id] of LAUNCH_CHECKS) assert.ok(md.includes(id), `the verdict is written against ${id}`);
  assert.ok(unfilled(md).length > 5, "the judgement blanks are marked");
  assert.deepEqual(improvInventory([{ scene: "s", beat: "b1" }, { scene: "s", beat: "b1" }, { scene: "s", beat: "b2" }]).map((i) => [i.beat, i.count]), [["b1", 2], ["b2", 1]]);
  assert.deepEqual(parsePredictions("- [2026-10-06T10:00:00Z] **scene-a**: the clerk will have nothing to say\nnoise\n"), [{ scene: "scene-a", text: "the clerk will have nothing to say" }]);
});

test("the bot's chargen specs name real ancestries, backgrounds and classes, legal boosts and files that exist", () => {
  const specs = JSON.parse(read("tools", "playtest", "bots", "chargen-specs.json"));
  const ancestry = new Set(JSON.parse(read("data", "campaign", "ancestry-catalogue.json")).ancestries.map((a) => a.id));
  const backgrounds = new Map(JSON.parse(read("data", "campaign", "background-catalogue.json")).backgrounds.map((b) => [b.id, b]));
  const background = new Set(backgrounds.keys());
  const classes = new Map(JSON.parse(read("data", "campaign", "class-catalogue.json")).classes.map((c) => [c.id, c]));
  const abilities = new Set(["str", "dex", "con", "int", "wis", "cha"]);
  for (const [seat, spec] of Object.entries(specs)) {
    if (seat.startsWith("_")) continue;
    assert.ok(spec.name.startsWith("PT-"), `${seat}: a test character is named PT-...`);
    assert.ok(ancestry.has(spec.ancestry), `${seat}: ancestry ${spec.ancestry}`);
    assert.ok(background.has(spec.background), `${seat}: background ${spec.background}`);
    assert.ok(classes.has(spec.class), `${seat}: class ${spec.class}`);
    assert.equal(new Set(spec.free).size, 4, `${seat}: four different free boosts`);
    assert.ok(spec.free.every((a) => abilities.has(a)));
    if (spec.keyAbility) assert.ok((classes.get(spec.class).keyAbility ?? classes.get(spec.class).keyAbilityOptions ?? []).includes(spec.keyAbility), `${seat}: ${spec.keyAbility} is a legal key ability for ${spec.class}`);
    if (spec.portrait) assert.ok(existsSync(pt("assets", spec.portrait)), `${seat}: portrait ${spec.portrait} exists`);
    const optionsOf = (entry) => (entry.choices ?? []).flatMap((c) => c.options.map((o) => o.key));
    if (spec.backgroundChoice) assert.ok(optionsOf(backgrounds.get(spec.background)).includes(spec.backgroundChoice), `${seat}: ${spec.backgroundChoice} is one of the options ${spec.background} asks`);
    if (spec.classChoice) assert.ok(optionsOf(classes.get(spec.class)).includes(spec.classChoice), `${seat}: ${spec.classChoice} is one of the options ${spec.class} asks`);
  }
  for (const seat of ["P1", "P2", "P3", "P4", "P5", "P6", "default"]) assert.ok(specs[seat], `${seat} has a spec`);
  assert.ok(specs.P2.ancestry && !["human", "elf", "dwarf", "gnome", "halfling", "goblin", "orc"].includes(specs.P2.ancestry), "P2 makes an alien ancestry");
  assert.ok(specs.P3.keyAbility, "P3 exercises the one real key-ability choice");
  assert.ok(specs.P2.backgroundChoice && specs.P2.background === "starship-dweller", "P2 answers the question a background asks (the defect the first scripted run found)");
  assert.ok(specs.P6.classChoice && specs.P6.class === "envoy", "P6 answers the question a class asks");
});

test("each seeded defect still finds its anchor exactly once in the real module, and planting is refused when it would not be clean", () => {
  const defects = loadDefects();
  assert.deepEqual(defects.map((d) => d.id), ["plant-swallower", "plant-error-on-begin", "plant-gm-secret-visible", "plant-dc-changed"]);
  assert.equal(new Set(defects.map((d) => d.id)).size, defects.length);
  for (const d of defects) {
    const file = d.repoFile ? path.join(root, ...d.repoFile.split("/")) : path.join(root, "module", "blank-inheritance", ...d.file.split("/"));
    assert.ok(existsSync(file), `${d.id}: ${file} exists in the tree`);
    const source = readFileSync(file, "utf8");
    const planted = plant(d, source);
    assert.notEqual(planted, source, `${d.id} changes the file`);
    assert.throws(() => plant(d, planted), /already planted/, `${d.id} cannot be planted twice`);
    if (d.find) assert.equal(occurrences(source, d.find), 1, `${d.id}: anchor is unique`);
    assert.ok(d.describe && d.shouldBeCaughtBy, `${d.id} says what it is and what should catch it`);
  }
  assert.throws(() => plant({ id: "x", file: "f", find: "nope", replace: "y" }, "text"), /exactly once in f \(it appears 0/);
  assert.throws(() => plant({ id: "x", file: "f", find: "a", replace: "y" }, "a a"), /exactly once in f \(it appears 2/);
  const leak = defects.find((d) => d.id === "plant-gm-secret-visible");
  const canary = leak.replace.match(/>([^<]+)<\/p>/)[1];
  assert.ok(read("data", "scene-briefs", "episode-c1e1--intake-medicals.json").includes(canary.slice(0, 40)), "the planted leak really is one of the scene's own Secret lines, so the leak scan's canary list contains it");
});

test("the cleanup helper reports only what changed since the baseline, ignoring the rig's own files", () => {
  const before = [" M data/a.json"];
  const now = [" M data/a.json", " M module/blank-inheritance/scripts/x.mjs", " M tools/playtest/hub.mjs", "?? test/playtest/x.test.mjs", " M .claude/launch.json", " M package.json"];
  assert.deepEqual(newTrackedChanges(before, now), [" M module/blank-inheritance/scripts/x.mjs"]);
  assert.deepEqual(newTrackedChanges(before, before), []);
});

test("the permission allowlist check wants a rule for the playtest CLI", () => {
  assert.equal(allowlistPresent(JSON.stringify({ permissions: { allow: ["Bash(node tools/playtest/pt.mjs:*)"] } })), true);
  assert.equal(allowlistPresent(JSON.stringify({ permissions: { allow: ["Bash(ls:*)"] } })), false);
  assert.equal(allowlistPresent(JSON.stringify({ hooks: {} })), false);
  assert.equal(allowlistPresent("not json"), false);
});

test("a copy that differs from the tree is a failure, unless seeded defects are planted, which is what makes it differ", () => {
  assert.deepEqual(copyCurrentRow({ current: true, stampId: "abc" }), { level: "PASS", detail: "build abc" });
  assert.equal(copyCurrentRow({ current: false }).level, "FAIL");
  assert.match(copyCurrentRow({ current: false }).detail, /pt build/);
  const planted = copyCurrentRow({ current: false, planted: ["plant-swallower"] });
  assert.equal(planted.level, "WARN");
  assert.match(planted.detail, /pt seed restore/);
  assert.equal(copyCurrentRow({ current: true, planted: ["plant-swallower"], stampId: "x" }).level, "PASS", "and a copy that matches is fine whatever is planted");
});
