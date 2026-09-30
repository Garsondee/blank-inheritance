// Round 2 of Ingram's review (her export of 2026-09-30). Every edit is an exact-match replacement that
// must hit exactly one string in its file; each is recorded in ledger.json (kind "round2") so the
// review page can highlight it. Re-runnable: an edit whose `replace` text is already present is skipped.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLedger, writeLedger } from "./apply-edits.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const rj = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const wj = (p, v) => fs.writeFileSync(path.join(root, p), JSON.stringify(v, null, 2) + "\n");

function countIn(v, find) {
  if (typeof v === "string") return v.split(find).length - 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + countIn(x, find), 0);
  if (v && typeof v === "object") return Object.values(v).reduce((n, x) => n + countIn(x, find), 0);
  return 0;
}
function replaceIn(v, find, rep) {
  if (typeof v === "string") return v.includes(find) ? v.replace(find, rep) : v;
  if (Array.isArray(v)) return v.map((x) => replaceIn(x, find, rep));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replaceIn(x, find, rep)]));
  return v;
}

const ledger = readLedger();
const log = (e) => ledger.changes.push({ kind: "round2", ...e });

function edit(file, e) {
  const doc = rj(file);
  if (countIn(doc, e.replace) > 0 && countIn(doc, e.find) === 0) return "already";
  const n = countIn(doc, e.find);
  if (n !== 1) throw new Error(`${file}: expected exactly 1 match for "${e.find.slice(0, 60)}", found ${n}`);
  wj(file, replaceIn(doc, e.find, e.replace));
  log({ scene: e.scene, npc: e.npc, find: e.find, replace: e.replace, why: e.why });
  return "applied";
}

const S = (id) => `canon/scenes/${id}.json`;
const results = [];

// ---- Lucan: Ingram's own line ----
results.push(edit(S("rest--card-game"), { scene: "rest--card-game", npc: "lucan",
  find: "and then I'll explain the real rules.", replace: "and then someone else will explain the real rules.",
  why: "Ingram's own wording." }));

// ---- Mrs Ueda owns "two knocks"; Grenna's habit becomes a rap of the knuckles ----
results.push(edit(S("rest--rumour-mill"), { scene: "rest--rumour-mill", npc: "mrs-ueda",
  find: "Knocks twice on everything, even tables.", replace: "Knocks twice on the door before she comes in, and never on anything else.",
  why: "Ingram spotted the same 'knocks twice' on two characters. Two knocks is Mrs Ueda's (it is her opening line and her own event), so it now belongs to her alone." }));
results.push(edit(S("rest--early-night"), { scene: "rest--early-night", npc: "grenna",
  find: "Knocks twice on any piece of wood before she trusts it.", replace: "Raps her knuckles on any piece of wood before she trusts it.",
  why: "So Mrs Ueda is the only one who knocks twice." }));
results.push(edit(S("rest--early-night"), { scene: "rest--early-night", npc: "grenna",
  find: "knocks twice on the frame, and approves", replace: "raps her knuckles on the frame, and approves",
  why: "Same: Grenna raps, Mrs Ueda knocks twice." }));

// ---- Nadi: one pencil, in her hand (the art dropped the pair) ----
results.push(edit(S("rest--met-office"), { scene: "rest--met-office", npc: "nadi",
  find: "Keeps a pencil behind her ear and a second one in her hair.", replace: "Always has a pencil in her hand, and chalk dust to the wrists.",
  why: "Ingram: drop the pair of pencils. Midjourney can't draw them; the habit is now one pencil in her hand." }));

// ---- Sigrun: 'lukewarm' catchphrase in four more places, and the hot pool becomes a very hard test ----
results.push(edit(S("rest--bathhouse"), { scene: "rest--bathhouse", npc: "sigrun",
  find: "Sigrun says they were always lukewarm; everyone else goes home cold.", replace: "Sigrun says she hadn't noticed; everyone else goes home cold.",
  why: "The 'lukewarm' catchphrase was still in the setback." }));
results.push(edit(S("rest--bathhouse"), { scene: "rest--bathhouse", npc: "sigrun",
  find: "She says it's lukewarm.", replace: "She says it's barely warm.",
  why: "Softens the repeated 'lukewarm'." }));
results.push(edit(S("rest--bathhouse"), { scene: "rest--bathhouse", npc: "sigrun",
  find: "\"Lukewarm. Get in and see.\"", replace: "\"Get in and see.\"",
  why: "Drops the catchphrase." }));

const hot = {
  scene: "rest--bathhouse", npc: "sigrun",
  text: ["Sigrun sits in it up to her chin and challenges a character to get in and stay in longer than she does.",
         "Sigrun sits in it up to her chin and challenges a character to get in and stay in longer than she does. Nobody else has lasted in it all year."],
  check: ["A Fortitude save at the level-based DC (15 at level 1).",
          "A very hard Fortitude save: the level-based DC +5 (20 at level 1). This one is meant to be hard, and there is no shame in getting out early."],
  success: ["They get out together, both the colour of boiled crabs, and Sigrun shakes their hand. \"Not bad. Not bad at all.\"",
            "They get out together, both the colour of boiled crabs, and Sigrun shakes their hand. \"Not bad. Not bad at all.\" The heat stays in them: a +1 status bonus to saves against heat and fire until their next rest."],
  failure: ["They're out first, and Sigrun doesn't gloat much. \"Lukewarm, and still you run. Next time.\"",
            "They're out first, and Sigrun doesn't gloat much. \"Out already? That's the hard part done. Next time.\" They are pink and pleased with themselves."],
  crit: ["The room goes white at the edges and they come to on the tiles, with Sigrun fanning them with a washbowl. Kazue bans them from the hot pool for a week, and goes down a step.",
         "The room goes white at the edges and they come to on the tiles, with Sigrun fanning them with a washbowl. They are Sickened 1 until they have eaten breakfast. Kazue bans them from the hot pool for a week, and goes down a step."]
};
{
  const file = S("rest--bathhouse"); const doc = rj(file);
  const ev = doc.events.find((e) => e.id === "the-hot-pool");
  if (ev.check === hot.check[1]) results.push("already");
  else {
    const pairs = [["text", hot.text], ["check", hot.check], ["outcomes.success", hot.success], ["outcomes.failure", hot.failure], ["outcomes.criticalFailure", hot.crit]];
    for (const [key, [from, to]] of pairs) {
      const parent = key.includes(".") ? ev.outcomes : ev; const k = key.split(".").pop();
      if (!String(parent[k]).includes(from)) throw new Error(`the-hot-pool ${key} is not what I expected`);
      parent[k] = String(parent[k]).replace(from, to);
      log({ scene: "rest--bathhouse", npc: "sigrun", find: from, replace: to, why: "Ingram: a very hard Fortitude test for the hottest pool, so the players can brave it. Level DC +5 is SF2E's 'very hard'." });
    }
    wj(file, doc); results.push("applied");
  }
}

// ---- Haru: a real home, and why an android could be from a silk village ----
{
  const file = S("rest--early-night"); const doc = rj(file);
  const haru = doc.cast.find((c) => c.id === "haru");
  const b = haru.brief;
  const marker = "Kinuoka";
  if (JSON.stringify(b).includes(marker)) results.push("already");
  else {
    const topics = [
      { topic: "Kinuoka, his village", note: "Terraced mulberry hills above a slow brown river, a day and a half by train and cart. In early summer the whole village stays up feeding the worms leaf by leaf, and the sound of them eating is like light rain on a roof. The reeling shed steams every dawn, the bridge has a bell nobody rings any more, and in winter the terraces go white and quiet for months." },
      { topic: "Being what he is at home", note: "Everybody in Kinuoka has always known he is an android and nobody has ever made anything of it: he was just Haru, who could thread a loom in the dark. Here he is the first thing people notice. He would like to be the second." }
    ];
    const qs = [
      { q: "What's it like where you're from?", a: "\"Loud in the summer, if you can believe it. Two hundred thousand worms, all eating. You can't hear yourself think, and it's the best sound there is.\"" },
      { q: "What is a silkworm farm actually like?", a: "\"Mostly leaves. Somebody has to carry leaves all night for a month. Then one morning they all stop, and it goes so quiet you think something has died. That's when they're spinning.\"" },
      { q: "Do people stare at you here?", a: "\"A bit.\" He looks at his hands. \"At home nobody did. That's all.\"" }
    ];
    const oldAnswer = "\"Up in the hills. You won't have heard of it. There's a river, and a lot of silkworms, and my grandmother.\"";
    const newAnswer = "\"Up in the hills, a place called Kinuoka. You won't have heard of it. There's a river, and a lot of silkworms, and my grandmother.\"";
    const q0 = b.questions.find((q) => q.a === oldAnswer); if (!q0) throw new Error("Haru's 'Where are you from' answer changed");
    q0.a = newAnswer; log({ scene: "rest--early-night", npc: "haru", find: oldAnswer, replace: newAnswer, why: "Names his village." });
    b.willDiscuss.push(...topics); b.questions.push(...qs);
    for (const t of topics) log({ scene: "rest--early-night", npc: "haru", find: "", replace: t.note, why: `New topic he will discuss: ${t.topic}. Ingram: if he talks about home he needs details about it.` });
    for (const q of qs) log({ scene: "rest--early-night", npc: "haru", find: "", replace: q.a, why: `New likely question: ${q.q}` });
    wj(file, doc); results.push("applied");
  }
}

// ---- The NPC files' physical descriptions follow the redone art ----
const specPath = "tools/art-review/npc-specs.mjs";
let spec = fs.readFileSync(path.join(root, specPath), "utf8");
const specEdits = [
  ["a neat bob, a stub of chalk behind one ear and the slate-grey tunic", "a neat bob, a stub of chalk between two fingers and the slate-grey tunic", "michiru", "rest--card-game", "The chalk is in her fingers, not behind her ear (Ingram: it read as chalk stored in her ear)."],
  ["with a pencil behind one ear and another stuck in her hair, chalk dust on her fingers,", "with a pencil always in her hand, chalk dust on her fingers,", "nadi", "rest--met-office", "One pencil, in her hand, to match the redone portrait."],
  ["and she knocks twice on everything, tables included.", "and she knocks twice on the door before she comes in, and never on anything else.", "mrs-ueda", "rest--rumour-mill", "Two knocks is hers alone."],
  ["She knocks twice on any piece of wood before she trusts it,", "She raps her knuckles on any piece of wood before she trusts it,", "grenna", "rest--early-night", "So Mrs Ueda is the only one who knocks twice."],
  ["with a pencil-stub", "with a pencil-stub", null]
].filter((x) => x[2]);
for (const [from, to, npc, scene, why] of specEdits) {
  if (spec.includes(to)) continue;
  if (!spec.includes(from)) { results.push(`spec-miss:${npc}`); continue; }
  spec = spec.replace(from, to);
  log({ scene, npc, find: from, replace: to, why });
  results.push("applied");
}
fs.writeFileSync(path.join(root, specPath), spec);

writeLedger(ledger);
console.log(results.join(", "));
