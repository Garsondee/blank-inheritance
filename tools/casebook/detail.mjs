// Casebook, Part Zero: the chapter plan, and every scene in canon/ shown in full, exactly as the GM would run it,
// with the record of its re-read. Read straight from canon/ through tools/story/lib.mjs, so what Ingram reads is
// what is there (design/story-data-refactor.md).
import fs from "node:fs";
import path from "node:path";
import { loadModel, factIndex, sceneHash } from "../story/lib.mjs";

export const STATE_LABEL = {
  "awaiting-read": "Written in detail · waiting for your read",
  approved: "Approved",
  "old-draft": "Old draft · not yet rebuilt",
  unwritten: "Unwritten",
};

const skillName = (s) => s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const DEGREES = [["criticalSuccess", "Critical success"], ["success", "Success"], ["failure", "Failure"], ["criticalFailure", "Critical failure"]];

// `model` is the canon model when the caller already has one (build.mjs reads canon once and hands it to every part).
export function detailData(root, model = loadModel(root)) {
  const facts = factIndex(model);
  const episodes = [];
  for (const r of model.plan) {
    let ep = episodes.find((e) => e.name === r.episode);
    if (!ep) episodes.push((ep = { name: r.episode, rows: [] }));
    ep.rows.push(r);
  }
  const scenes = model.plan
    .filter((r) => (r.state === "awaiting-read" || r.state === "approved") && model.scenes.some((s) => s.id === r.scene))
    .map((row) => {
      const scene = model.scenes.find((s) => s.id === row.scene);
      const rereadPath = path.join(root, "canon/scenes", row.scene + ".reread.md");
      return {
        row,
        scene: scene.json,
        challenges: model.challenges,
        reread: fs.existsSync(rereadPath) ? fs.readFileSync(rereadPath, "utf8").replace(/\r\n/g, "\n") : "",
        hash: sceneHash(model, row.scene),
      };
    });
  // The plan's throughlines: what the rebuilds of later scenes must carry, shown under the plan.
  const throughlines = Object.values(model.planRaw || {})
    .map((raw) => (raw.split(/^## Throughlines[^\n]*\n/m)[1] || "").split(/^## /m)[0].trim())
    .filter(Boolean)
    .join("\n");
  return { episodes, scenes, facts, throughlines };
}

// A small Markdown reader for the re-read records: headings, numbered and bulleted lists (with wrapped lines), paragraphs.
export function mdToHtml(md, h) {
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${h(para.join(" "))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.type}>${list.items.map((i) => `<li>${h(i)}</li>`).join("")}</${list.type}>`); list = null; } };
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    let mm;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((mm = line.match(/^#{1,4} (.+)$/))) { flushPara(); flushList(); out.push(`<h5>${h(mm[1])}</h5>`); continue; }
    if ((mm = line.match(/^\d+\. (.+)$/))) { flushPara(); if (list?.type !== "ol") { flushList(); list = { type: "ol", items: [] }; } list.items.push(mm[1]); continue; }
    if ((mm = line.match(/^- (.+)$/))) { flushPara(); if (list?.type !== "ul") { flushList(); list = { type: "ul", items: [] }; } list.items.push(mm[1]); continue; }
    if (list && /^\s+\S/.test(raw)) { list.items[list.items.length - 1] += " " + line.trim(); continue; }
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join("\n");
}

// The re-read record splits at its "## " headings; the questions go behind a disclosure.
function splitReread(md) {
  const parts = md.split(/^## /m);
  const head = parts.shift() || "";
  const sections = parts.map((p) => { const [title, ...rest] = p.split("\n"); return { title: title.trim(), body: rest.join("\n") }; });
  return { head, sections };
}

const paras = (text, h) => String(text || "").split(/\n\n+/).map((p) => `<p>${h(p.replace(/\n/g, " "))}</p>`).join("");

function checkHtml(beat, challenges, h) {
  if (!beat.challengeRef) return "";
  const ch = challenges.find((c) => c.id === beat.challengeRef);
  const check = ch?.json.checks?.find((c) => c.id === beat.checkRef);
  if (!check) return `<p class="dir"><span class="lbl">Check</span>${h(beat.challengeRef)} / ${h(beat.checkRef || "")}</p>`;
  const skills = (check.skillOptions || []).map(skillName).join(" or ") || "any skill";
  const rows = DEGREES.filter(([k]) => check.outcomes?.[k]).map(([k, label]) => `<dt>${label}</dt><dd>${h(check.outcomes[k])}</dd>`).join("");
  return `<div class="checkbox"><p><span class="lbl">Roll</span><strong>${h(check.name || check.id)}</strong>: ${h(skills)}, DC ${check.dc?.value}${check.insight ? ". Costs nothing on any result." : "."}</p><dl>${rows}</dl></div>`;
}

// `link` (optional) says where a fact's one record lives on the whole Casebook page, so a scene's list can point to it.
// A standalone scene page has no such place, and shows the id plain.
function factsHtml(beat, facts, h, link) {
  const told = beat.facts || [];
  const gm = beat.gmFacts || [];
  if (!told.length && !gm.length) return "";
  const li = (id) => {
    const f = facts.get(id);
    const href = link ? link(id) : null;
    const code = `<code>${h(id)}</code>`;
    return `<li>${href ? `<a class="ref" href="${href}">${code}</a>` : code} <span class="fst">${h(f ? f.status : "missing")}</span> ${h(f ? f.text : "")}</li>`;
  };
  return `<details class="facts"><summary>Facts: ${told.length} told to the table, ${gm.length} for the GM only</summary>${told.length ? `<p class="lbl">Told to the table</p><ul>${told.map(li).join("")}</ul>` : ""}${gm.length ? `<p class="lbl">GM only</p><ul>${gm.map(li).join("")}</ul>` : ""}</details>`;
}

export function sceneHtml(x, d, h) {
  const s = x.scene;
  const r = x.row;
  const rr = splitReread(x.reread);
  const visible = rr.sections.filter((sec) => !/^The questions/i.test(sec.title));
  const questions = rr.sections.find((sec) => /^The questions/i.test(sec.title));
  const beats = (s.beats || []).map((b, i) => `<section class="beat${b.mandatory ? "" : " opt"}">
<h5><span class="bn">${i + 1}</span>${h(b.text || b.id)}${b.mandatory ? "" : ' <span class="optl">optional</span>'}</h5>
${b.when?.condition ? `<p class="when">${h(b.when.condition[0].toUpperCase() + b.when.condition.slice(1))}.</p>` : ""}
${b.readAloud ? `<blockquote class="ra">${paras(b.readAloud, h)}</blockquote>` : ""}
${b.direction ? `<div class="dir"><span class="lbl">Direction</span>${paras(b.direction, h)}</div>` : ""}
${b.note ? `<div class="gmnote"><span class="lbl">GM</span>${paras(b.note, h)}</div>` : ""}
${checkHtml(b, x.challenges, h)}
${factsHtml(b, d.facts, h, d.linkFact)}
</section>`).join("\n");
  const o = s.outro || {};
  return `<article class="scene" id="scene-${s.id}">
<header><span class="no">${r.order}</span><span class="ttl">${h(s.title)}</span><span class="rank">${h(STATE_LABEL[r.state] || r.state)} · day ${h(r.dayRaw)}, ${h(r.time)}</span></header>
<div class="sbody">
<div class="reread">${visible.map((sec) => `<h5>${h(sec.title)}</h5>${mdToHtml(sec.body, h)}`).join("\n")}
${questions ? `<details><summary>The re-read, question by question</summary>${mdToHtml(questions.body, h)}</details>` : ""}</div>
<h4 class="run">The scene, as the GM runs it</h4>
<p><span class="lbl">What it's for</span>${h(s.goal || "")}</p>
<p><span class="lbl">How to play it</span>${h(s.howToPlay || "")} <em>Runs about ${h(s.runsAbout || "?")}.</em></p>
<dl class="open"><dt>Where</dt><dd>${h(s.intro?.where || "")}</dd><dt>First thing</dt><dd>${h(s.intro?.firstThing || "")}</dd>${s.intro?.holdInReserve ? `<dt>If a question isn't covered</dt><dd>${h(s.intro.holdInReserve)}</dd>` : ""}</dl>
${beats}
<div class="close"><p><span class="lbl">Ends when</span>${h(o.endsWhen || "")}</p>
${o.transition?.line ? `<p><span class="lbl">Into the next scene</span>${h(o.transition.line)} ${h(o.onwards || "")}</p>` : ""}
${(o.writeDown || []).length ? `<p class="lbl">Write down</p><ul>${o.writeDown.map((w) => `<li>${h(w)}</li>`).join("")}</ul>` : ""}
${(s.carryForward || []).length ? `<p class="lbl">Carries forward</p><ul>${s.carryForward.map((w) => `<li>${h(w)}</li>`).join("")}</ul>` : ""}</div>
${s.notes ? `<details><summary>Scene notes</summary>${paras(s.notes, h)}</details>` : ""}
<p class="hash">Scene hash ${h(x.hash)}: an approval records it, and any later change to the scene shows up as needing your read again.</p>
</div>
</article>`;
}

export function detailHtml(d, h) {
  // A row links to its scene card only when there is one (a scene that is not in canon has none).
  const written = new Set(d.scenes.map((x) => x.row.scene));
  const plan = d.episodes.map((ep) => `<h4 class="ep">${h(ep.name)}</h4>
<div class="tbl plan"><table><thead><tr><th>#</th><th>Scene</th><th>Day</th><th>Time</th><th>State</th></tr></thead><tbody>
${ep.rows.map((r) => `<tr class="st-${r.state}"><td>${r.order}</td><td>${written.has(r.scene) ? `<a href="#scene-${r.scene}">${h(r.title)}</a>` : h(r.title)}</td><td>${h(r.dayRaw)}</td><td>${h(r.time)}</td><td>${h(STATE_LABEL[r.state] || r.state)}</td></tr>`).join("\n")}
</tbody></table></div>`).join("\n");
  return `<div class="part" id="part0">
<header><div class="kicker">Part Zero</div><h2>Written in detail</h2><p>Scenes rebuilt one at a time in the new canon tree, in play order. Each is shown in full, as the GM would run it, with the record of its re-read. A scene is approved when you've read all of it and said so.</p></header>
<section class="sec" id="detail">
<h3><span class="sid">§0</span><span>Chapter 1, scene by scene</span></h3>
<div class="intro">Every scene in play order, with a rough day and time of day. Day 0 is the days before intake; Day 1 is the first day of intake (Episode One); Days 2 and 3 are Episode Two.</div>
${plan}
${d.throughlines ? `<h4 class="ep">Throughlines to carry into the rebuilds</h4>\n<div class="reread">${mdToHtml(d.throughlines, h)}</div>` : ""}
${d.scenes.map((x) => sceneHtml(x, d, h)).join("\n")}
</section>
</div>`;
}

// The Markdown copy: the same content, plainly.
export function detailMarkdown(d, m) {
  const L = [];
  const P = (s = "") => L.push(s);
  P("## §0 Written in detail");
  P();
  P("Scenes rebuilt one at a time in the new canon tree (`canon/`), in play order. Each is shown in full, as the GM would run it, with the record of its re-read. A scene is approved when Ingram has read all of it and said so.");
  P();
  for (const ep of d.episodes) {
    P(`### ${ep.name}`);
    P();
    P("| # | Scene | Day | Time | State |");
    P("|---|---|---|---|---|");
    for (const r of ep.rows) P(`| ${r.order} | ${r.title} | ${r.dayRaw} | ${r.time} | ${STATE_LABEL[r.state] || r.state} |`);
    P();
  }
  if (d.throughlines) {
    P("### Throughlines to carry into the rebuilds");
    P();
    P(d.throughlines);
    P();
  }
  for (const x of d.scenes) {
    const s = x.scene;
    P(`### Scene ${x.row.order}: ${s.title} *(${STATE_LABEL[x.row.state]})*`);
    P();
    P(x.reread.replace(/^# .*\n/, "").replace(/^## /gm, "#### ").trim());
    P();
    P("#### The scene, as the GM runs it");
    P();
    P(`**What it's for.** ${s.goal}`);
    P();
    P(`**How to play it.** ${s.howToPlay} *Runs about ${s.runsAbout}.*`);
    P();
    // A scene that has no "first thing" (the field is optional) leaves the line out, rather than printing "undefined".
    if (s.intro?.where) P(`**Where.** ${s.intro.where}  `);
    if (s.intro?.firstThing) P(`**First thing.** ${s.intro.firstThing}  `);
    if (s.intro?.holdInReserve) P(`**If a question isn't covered.** ${s.intro.holdInReserve}`);
    P();
    (s.beats || []).forEach((b, i) => {
      P(`**${i + 1}. ${b.text || b.id}**${b.mandatory ? "" : " *(optional)*"}`);
      P();
      if (b.when?.condition) { P(`*${b.when.condition[0].toUpperCase() + b.when.condition.slice(1)}.*`); P(); }
      if (b.readAloud) { P(b.readAloud.split("\n").map((l) => "> " + l).join("\n")); P(); }
      if (b.direction) { P(`*Direction:* ${b.direction.replace(/\n\n+/g, " ")}`); P(); }
      if (b.note) { P(`*GM:* ${b.note.replace(/\n\n+/g, " ")}`); P(); }
      if (b.challengeRef) {
        const ch = x.challenges.find((c) => c.id === b.challengeRef);
        const check = ch?.json.checks?.find((c) => c.id === b.checkRef);
        if (check) {
          P(`*Roll:* ${check.name || check.id}: ${(check.skillOptions || []).map(skillName).join(" or ")}, DC ${check.dc?.value}${check.insight ? ". Costs nothing on any result." : "."}`);
          for (const [k, label] of DEGREES) if (check.outcomes?.[k]) P(`- ${label}: ${check.outcomes[k]}`);
          P();
        }
      }
      if ((b.facts || []).length || (b.gmFacts || []).length) {
        P(`*Facts:* tells the table ${(b.facts || []).map((f) => "`" + f + "`").join(", ") || "none"}; GM only ${(b.gmFacts || []).map((f) => "`" + f + "`").join(", ") || "none"}.`);
        P();
      }
    });
    const o = s.outro || {};
    P(`**Ends when.** ${o.endsWhen}`);
    if (o.transition?.line) P(`**Into the next scene.** ${o.transition.line} ${o.onwards || ""}`);
    P();
    if ((o.writeDown || []).length) { P("**Write down:**"); P(); o.writeDown.forEach((w) => P(`- ${w}`)); P(); }
    if ((s.carryForward || []).length) { P("**Carries forward:**"); P(); s.carryForward.forEach((w) => P(`- ${w}`)); P(); }
    P(`*Scene hash ${x.hash}.*`);
    P();
  }
  return L.join("\n");
}

export const DETAIL_CSS = `
/* ---------- Part Zero: scenes written in detail ---------- */
.tbl.plan table{min-width:560px}
.tbl.plan tr.st-awaiting-read td{background:var(--gm-bg)}
.tbl.plan tr.st-approved td{background:var(--ground)}
h4.ep{margin:18px 0 6px 64px;font:700 12px/1.4 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--red)}
.scene{margin:22px 0 22px 64px;border:1px solid var(--rule);border-left:4px solid var(--gm);background:var(--sheet);box-shadow:var(--shadow);max-width:840px;scroll-margin-top:16px}
.scene > header{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;padding:10px 14px 8px;border-bottom:1px solid var(--rule)}
.scene .no{font:400 34px/1 var(--display);color:var(--red);min-width:1.3em}
.scene .ttl{font:600 21px/1.25 var(--body);flex:1 1 12em}
.scene .rank{font:700 11px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.scene .sbody{padding:6px 14px 14px;max-width:74ch}
.scene .reread{margin:6px 0 14px;padding:6px 12px 8px;border-left:3px solid var(--gm);background:var(--gm-bg)}
.scene .reread h5,.scene .beat h5{margin:12px 0 4px;font:700 12px/1.5 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.scene h4.run{margin:18px 0 6px;font:600 16px/1.3 var(--body);color:var(--red)}
.scene .lbl{display:inline-block;margin-right:8px;font:700 11px/1.6 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.scene p.lbl{display:block;margin:10px 0 2px}
.scene dl.open{display:grid;grid-template-columns:minmax(0,11em) minmax(0,1fr);gap:4px 12px}
.scene dl.open dt{font-weight:600}
.scene dl.open dd{margin:0}
.scene .beat{margin:14px 0 0;padding-top:8px;border-top:1px dotted var(--rule)}
.scene .beat .bn{display:inline-block;min-width:1.6em;color:var(--red)}
.scene .beat.opt{opacity:.96}
.scene .optl{font:700 10px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--gm);border:1px solid var(--gm);padding:1px 5px;margin-left:6px}
.scene .when{margin:2px 0 6px;font-style:italic;color:var(--ink-2)}
.scene blockquote.ra{margin:8px 0;padding:6px 14px;border-left:3px solid var(--canon);background:var(--ground);font-size:1.02em}
.scene blockquote.ra p{margin:0 0 8px}
.scene .dir p,.scene .gmnote p{margin:2px 0 6px}
.scene .gmnote{margin:6px 0;padding:4px 10px;border-left:3px solid var(--gm);background:var(--gm-bg)}
.scene .checkbox{margin:8px 0;padding:6px 10px;border:1px solid var(--rule);background:var(--ground)}
.scene .checkbox dl{display:grid;grid-template-columns:minmax(0,9em) minmax(0,1fr);gap:3px 10px;margin:6px 0 0}
.scene .checkbox dt{font-weight:600}
.scene .checkbox dd{margin:0}
.scene details{margin:8px 0}
.scene details summary{cursor:pointer;font:700 11px/1.8 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.scene .facts ul{margin:2px 0 6px;padding-left:1.2em}
.scene .facts li{margin:0 0 4px}
.scene .fst{font:700 10px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--gm);margin:0 4px}
.scene .close{margin-top:14px;padding-top:8px;border-top:1px solid var(--rule)}
.scene .hash{margin-top:12px;font:12px/1.5 var(--mono);color:var(--ink-2)}
@media (max-width:620px){h4.ep,.scene{margin-left:0}.scene dl.open,.scene .checkbox dl{grid-template-columns:minmax(0,1fr)}}
`;
