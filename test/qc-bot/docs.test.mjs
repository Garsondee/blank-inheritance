// The documents the bot and Ingram work from must agree with the tool (tools/qc-bot/PROTOCOL.md, CREATOR-PROMPT.md,
// design/qc-bot.md, .claude/commands/qc-merge.md): a protocol that names a command that does not exist fails the first run.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ROOT, WRITE_RULES, fullPath } from "../../tools/qc-bot/lib.mjs";
import { MAX_CAPPED, MAX_TOTAL, PROPOSAL_KINDS } from "../../tools/qc-bot/proposals.mjs";
import { OP_KINDS } from "../../tools/qc-bot/patch.mjs";

const read = (rel) => fs.readFileSync(fullPath(ROOT, rel), "utf8").replace(/\r\n/g, "\n"); // a checkout may have converted line endings
const protocol = read("tools/qc-bot/PROTOCOL.md");
const creator = read("tools/qc-bot/CREATOR-PROMPT.md");
const design = read("design/qc-bot.md");
const merge = read(".claude/commands/qc-merge.md");
const cli = read("tools/qc-bot/qc.mjs");

/** The commands the usage comment of qc.mjs lists. */
const commands = [...cli.matchAll(/^ \*   node tools\/qc-bot\/qc\.mjs (\w+)/gm)].map((m) => m[1]);

test("the command line lists every command, and the design names every one of them", () => {
  assert.deepEqual([...new Set(commands)].sort(), ["apply", "decide", "decisions", "guard", "lint", "npcs", "page", "queue", "render", "status"].sort());
  for (const c of new Set(commands)) assert.ok(new RegExp(`\\b${c}\\b`).test(design), `design/qc-bot.md does not mention qc ${c}`);
  for (const c of new Set(commands)) assert.ok(new RegExp(`case "${c}"`).test(cli), `qc ${c} is documented but not handled`);
});

test("the protocol uses only commands that exist, and every one the bot needs", () => {
  const used = [...protocol.matchAll(/node tools\/qc-bot\/qc\.mjs (\w+)/g)].map((m) => m[1]);
  assert.ok(used.length > 0);
  for (const u of used) assert.ok(commands.includes(u), `PROTOCOL.md uses qc ${u}, which does not exist`);
  for (const must of ["queue", "npcs", "lint", "apply", "render", "guard"]) assert.ok(used.includes(must), `PROTOCOL.md never says to run qc ${must}`);
  for (const f of ["tools/story/story.mjs"]) assert.ok(fs.existsSync(fullPath(ROOT, f)));
  assert.match(protocol, /story\.mjs context/);
  assert.match(protocol, /story\.mjs digest/);
});

test("the protocol states the limits the lint enforces, and every proposal kind", () => {
  assert.ok(protocol.includes("**At most five**"), "the cap of five is stated");
  assert.equal(MAX_CAPPED, 5);
  assert.match(protocol, /eight in all/);
  assert.equal(MAX_TOTAL, 8);
  for (const k of PROPOSAL_KINDS) assert.ok(protocol.includes(`\`${k}\``), `PROTOCOL.md never explains the ${k} kind`);
  for (const o of OP_KINDS) assert.ok(protocol.includes(o), `PROTOCOL.md never mentions the ${o} operation`);
  assert.match(protocol, /qc\/<YYYY-MM-DD>-<scene>/);
});

test("the protocol's write surface is the one the guard enforces", () => {
  for (const must of ["reviews/qc/reports/", "canon/scenes/", "canon/challenges/", "data/npcs/", "npc-roster"]) assert.ok(protocol.includes(must), `PROTOCOL.md does not mention ${must}`);
  assert.ok(WRITE_RULES.some((r) => r.pattern.test("data/campaign/npc-roster.json")));
  assert.ok(!WRITE_RULES.some((r) => r.pattern.test("canon/world/nobu.md")), "canon facts are outside the write surface");
});

test("everything the protocol tells the bot to read exists", () => {
  const paths = ["canon/reread.md", "design/gm-facing-prose-style.md", "data/campaign/signoff-checklist.json", "data/campaign/scene-edits.json", "canon/plan/chapter-01.md", "data/campaign/npc-roster.json", "data/campaign/npc-archetypes.json", "reviews/qc/reports/episode-c1e1--intake-medicals/2026-10-14-1.json", "reviews/README.md", "design/scene-signoff.md"];
  for (const p of paths) {
    assert.ok(protocol.includes(p), `PROTOCOL.md no longer mentions ${p}`);
    assert.ok(fs.existsSync(fullPath(ROOT, p)), `PROTOCOL.md names ${p}, which does not exist`);
  }
});

test("the protocol keeps her words and the rules that protect them", () => {
  for (const phrase of ["Never touch her words", "Never invent story", "Never move the scene's direction", "Nothing has been played", "fun organic ways the scene might mutate", "Contacts are plotted before the alert that reports them"]) {
    assert.ok(protocol.includes(phrase), `PROTOCOL.md lost: ${phrase}`);
  }
});

test("the creator prompt points at the protocol, is short enough to be an agent prompt, and sets the settings the test drive relies on", () => {
  assert.match(creator, /tools\/qc-bot\/PROTOCOL\.md/);
  const prompt = creator.split("```")[1];
  assert.ok(prompt.length > 800 && prompt.length < 4500, `the prompt is ${prompt.length} characters`);
  assert.match(prompt, /never push to master/i);
  assert.match(prompt, /qc\/<date>-<scene>/);
  assert.match(creator, /web_search/);
  assert.match(creator, /"amount": "800"/);
  assert.match(creator, /claude-opus-5-5/);
  assert.match(creator, /fine-grained token/);
  assert.match(creator, /\/qc-merge|merge the QC reports/);
});

test("the merge routine never checks a bot branch out, and names the tools it uses", () => {
  assert.match(merge, /never check one out/);
  assert.match(merge, /git checkout origin\/qc\/<branch> -- reviews\/qc\/reports\//);
  assert.match(merge, /npm run edits/);
  for (const c of ["status", "guard", "lint", "page", "decisions import", "decide", "apply"]) assert.ok(merge.includes(`qc.mjs ${c}`), `/qc-merge never runs qc ${c}`);
});

test("the design records her words about the focus, the played label and Scene Close", () => {
  const quoted = design.replace(/\n> /g, " "); // her quotes wrap over several lines
  for (const phrase of ["rather than worrying about much later scenes", "T- one week", "Scene Close as just a testing process", "work through merging intelligently together", "accept, decline or discuss"]) {
    assert.ok(quoted.includes(phrase), `design/qc-bot.md lost her words: ${phrase}`);
  }
});
