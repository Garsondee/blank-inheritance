// Builds one self-contained HTML review page: every haunt scene's place art, and beside each of its
// regulars the chosen portrait, their description, their voice notes, and every wording change made
// to them (highlighted). Ingram approves or comments per item; choices persist in the browser and
// export as a JSON file. Images are embedded (resized), so the file works anywhere.
//
//   node tools/art-review/build.mjs            -> artwork/review/episode-1-review.html
//   node tools/art-review/build.mjs --no-images   (fast, for layout checks)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(root, "artwork/review/episode-1-review.html");
const noImages = process.argv.includes("--no-images");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

const registry = readJson("data/campaign/asset-registry.json").assets;
const ledger = fs.existsSync(path.join(root, "tools/art-review/ledger.json")) ? readJson("tools/art-review/ledger.json").changes : [];

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- images: resized JPEG data URIs via Pillow (already a dependency of the art tools) ----
const cache = new Map();
function dataUri(rel, maxEdge, quality = 80) {
  if (noImages || !rel) return "";
  const key = `${rel}|${maxEdge}`;
  if (cache.has(key)) return cache.get(key);
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return "";
  const py = `
import sys,base64,io
from PIL import Image
im=Image.open(sys.argv[1]).convert("RGB")
im.thumbnail((int(sys.argv[2]),int(sys.argv[2])))
b=io.BytesIO(); im.save(b,"JPEG",quality=int(sys.argv[3]),optimize=True)
sys.stdout.write("data:image/jpeg;base64,"+base64.b64encode(b.getvalue()).decode())
`;
  const uri = execFileSync("python", ["-c", py, abs, String(maxEdge), String(quality)], { maxBuffer: 1 << 28 }).toString();
  cache.set(key, uri);
  return uri;
}

const assetFor = (kind, ref) => registry.find((a) => a.assignedTo?.kind === kind && a.assignedTo?.ref === ref);

// ---- highlighting: wrap each ledger 'replace' text that appears in the current string ----
function highlight(text, changes) {
  let html = esc(text ?? "");
  for (const c of changes) {
    const needle = esc(c.replace);
    if (needle && html.includes(needle) && !html.includes(`<mark`)) {
      html = html.replace(needle, `<mark class="chg" data-why="${esc(c.why)}" title="${esc(`Was: ${c.find}\n${c.why}`)}">${needle}</mark>`);
    } else if (needle && html.includes(needle)) {
      const at = html.indexOf(needle);
      const before = html.slice(0, at);
      if (!(before.lastIndexOf("<mark") > before.lastIndexOf("</mark>"))) {
        html = before + `<mark class="chg" title="${esc(`Was: ${c.find}\n${c.why}`)}">${needle}</mark>` + html.slice(at + needle.length);
      }
    }
  }
  return html;
}

const changesFor = (scene, npc) => ledger.filter((c) => ((c.kind === "catchphrase" || c.kind === "round2") && c.scene === scene && c.npc === npc) || (c.kind === "npc-description" && c.npc === npc));
const round2 = fs.existsSync(path.join(root, "tools/art-review/round2-notes.json")) ? readJson("tools/art-review/round2-notes.json") : { items: {}, reset: [] };
const round1 = fs.existsSync(path.join(root, "tools/art-review/round1-choices.json")) ? readJson("tools/art-review/round1-choices.json").choices : {};

// ---- content ----
const sceneFiles = fs.readdirSync(path.join(root, "canon/scenes")).filter((f) => /^(rest--|discovery--)/.test(f)).sort();
const order = [
  "rest--general-hospital", "rest--early-night", "rest--bathhouse", "rest--shrine-gate", "rest--crew-mess",
  "rest--card-game", "rest--rumour-mill", "rest--the-roof", "rest--met-office", "rest--night-shift",
  "rest--the-paper-lantern", "discovery--the-magic-show",
];
const scenes = order.map((id) => readJson(`canon/scenes/${id}.json`));
// Episode 1 scenes that are not canon yet: only the cast entries named here are shown, read from data/scene-briefs.
const legacy = [{ id: "episode-c1e1--canteen", only: ["the-young-one", "technical-track-student"] }];
for (const l of legacy) {
  const b = readJson(`data/scene-briefs/${l.id}.json`);
  scenes.push({ ...b, cast: b.cast.filter((c) => l.only.includes(c.npcRef ?? c.id)), legacy: true });
}

function npcCard(scene, cast) {
  const id = cast.npcRef ?? cast.id;
  const npcPath = `data/npcs/${id}.json`;
  const npc = fs.existsSync(path.join(root, npcPath)) ? readJson(npcPath) : null;
  const asset = assetFor("npc", id);
  const changes = changesFor(scene.id, id);
  const b = cast.brief ?? {};
  const img = asset ? dataUri(asset.path, 520, 82) : "";
  const desc = npc ? highlight(npc.description, changes).split("\n\n").map((p) => `<p>${p}</p>`).join("") : "<p><em>No NPC file yet.</em></p>";
  const tics = (b.voice?.tics ?? []).map((t) => `<li>${highlight(t, changes)}</li>`).join("");
  const samples = (b.voice?.samples ?? []).map((t) => `<li>${highlight(t, changes)}</li>`).join("");
  const opens = b.opensWith ? `<p class="opens">${highlight(b.opensWith, changes)}</p>` : "";
  const topics = (b.willDiscuss ?? []).map((t) => `<li><b>${esc(t.topic)}</b> ${highlight(t.note, changes)}</li>`).join("");
  const qs = (b.questions ?? []).map((q) => `<li><b>${esc(q.q)}</b> ${highlight(q.a, changes)}</li>`).join("");
  const r2 = round2.items[scene.id + "/" + id];
  const r2box = r2 ? `<div class="r2"><p><b>You said:</b> ${esc(r2.said)}</p><p><b>What I did:</b> ${esc(r2.did)}</p></div>` : "";
  const byAtt = b.byAttitude ? Object.entries(b.byAttitude).map(([k, v]) => `<li><b>${esc(k)}</b> ${highlight(v, changes)}</li>`).join("") : "";
  const changeList = changes.length
    ? `<details class="changes" open><summary>${changes.length} wording change${changes.length === 1 ? "" : "s"}</summary><ul>${changes.map((c) => `<li>${c.find ? `<span class="was">${esc(c.find)}</span><span class="arrow"> becomes </span>` : `<span class="arrow">new: </span>`}<span class="now">${esc(c.replace)}</span><em>${esc(c.why)}</em></li>`).join("")}</ul></details>`
    : "";
  const key = `${scene.id}/${id}`;
  return `
  <article class="npc" data-key="${esc(key)}">
    <div class="portrait">${img ? `<img src="${img}" alt="${esc(cast.label ?? id)}">` : `<div class="noimg">no portrait</div>`}
      <div class="anc">${esc(npc?.ancestry ?? "")}</div></div>
    <div class="body">
      <h4>${esc(cast.label ?? id)} <small>${esc(cast.role ?? "")}</small></h4>
      ${desc}
      ${opens ? `<h5>Opens with</h5>${opens}` : ""}
      ${tics ? `<h5>Habits</h5><ul>${tics}</ul>` : ""}
      ${samples ? `<h5>Sample lines</h5><ul>${samples}</ul>` : ""}
      ${topics ? `<details><summary>What they will talk about</summary><ul>${topics}</ul></details>` : ""}
      ${qs ? `<details><summary>Likely questions and answers</summary><ul>${qs}</ul></details>` : ""}
      ${byAtt ? `<details><summary>How they treat the group at each attitude</summary><ul>${byAtt}</ul></details>` : ""}
      ${changeList}
      ${r2box}
      <div class="verdict" data-for="${esc(key)}">
        <button data-v="portrait-ok">Portrait OK</button>
        <button data-v="text-ok">Text OK</button>
        <button data-v="both-ok" class="primary">Approve both</button>
        <button data-v="redo-art">Redo art</button>
        <button data-v="fix-text">Fix text</button>
        <input type="text" placeholder="note (optional)" aria-label="note for ${esc(cast.label ?? id)}">
      </div>
    </div>
  </article>`;
}

function sceneSection(scene) {
  const locRef = scene.intro?.position?.locationRef;
  const asset = scene.legacy ? assetFor("scene", scene.id) : locRef ? registry.find((a) => a.assignedTo?.kind === "location" && a.assignedTo?.ref === locRef && a.path.startsWith("artwork/locations/") && a.id !== "directorate-headquarters--exterior") : null;
  const img = asset ? dataUri(asset.path, 1400, 80) : "";
  const key = `${scene.id}/place`;
  return `
  <section class="scene" id="${esc(scene.id)}">
    <h2>${esc(scene.title)} <small>${esc(scene.id)}</small></h2>
    <p class="sum">${esc(scene.summary)}</p>
    <figure class="place" data-key="${esc(key)}">
      ${img ? `<img src="${img}" alt="${esc(scene.title)}">` : `<div class="noimg wide">no place art</div>`}
      <div class="verdict" data-for="${esc(key)}">
        <button data-v="place-ok" class="primary">Place art OK</button>
        <button data-v="redo-art">Redo art</button>
        <input type="text" placeholder="note (optional)" aria-label="note for the place art">
      </div>
    </figure>
    ${(scene.cast ?? []).map((c) => npcCard(scene, c)).join("")}
  </section>`;
}

const toc = scenes.map((s) => `<a href="#${esc(s.id)}">${esc(s.title)}</a>`).join("");
const defaults = {};
for (const sc of scenes) {
  defaults[sc.id + "/place"] = { v: ["place-ok"], note: "" };
  for (const c of sc.cast ?? []) defaults[sc.id + "/" + (c.npcRef ?? c.id)] = { v: ["portrait-ok", "text-ok", "both-ok"], note: "" };
}
for (const k of round2.reset ?? []) delete defaults[k];
for (const [k, v] of Object.entries(round1)) if (!(round2.reset ?? []).includes(k)) defaults[k] = v;
const total = scenes.reduce((n, s) => n + (s.cast ?? []).length, 0);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Episode 1 review</title>
<style>
:root{--bg:#f4efe6;--ink:#23262b;--muted:#6b6f76;--card:#fffdf8;--line:#d9d1c1;--teal:#2f5b62;--orange:#d9772b;--ok:#2f7a4d;--bad:#a8402f;--mark:#fff1a8}
@media (prefers-color-scheme:dark){:root{--bg:#15191c;--ink:#e6e2d8;--muted:#9aa0a6;--card:#1d2226;--line:#333a40;--teal:#7fb4bc;--orange:#f0954a;--ok:#63c68a;--bad:#e2806f;--mark:#5a4a12}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,Segoe UI,sans-serif}
header{position:sticky;top:0;z-index:5;background:var(--teal);color:#fff;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
header h1{font-size:18px;margin:0}header .tally{margin-left:auto;font-size:14px}
header button{background:var(--orange);color:#111;border:0;border-radius:6px;padding:6px 12px;font-weight:600;cursor:pointer}
nav{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px}nav a{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:3px 10px;color:var(--ink);text-decoration:none;font-size:14px}
main{max-width:1100px;margin:0 auto;padding:0 16px 60px}
.scene{margin-top:36px}.scene>h2{border-bottom:3px solid var(--orange);padding-bottom:4px}h2 small,h4 small{color:var(--muted);font-weight:400;font-size:13px;margin-left:8px}
.sum{color:var(--muted)}
.place img{width:100%;border-radius:8px;border:1px solid var(--line);display:block}
figure{margin:12px 0}
.npc{display:grid;grid-template-columns:230px 1fr;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:14px 0}
@media(max-width:700px){.npc{grid-template-columns:1fr}}
.portrait img{width:100%;border-radius:8px;display:block}.anc{margin-top:4px;color:var(--teal);font-size:13px;font-weight:600;text-align:center}
.noimg{display:grid;place-items:center;height:160px;border:2px dashed var(--line);color:var(--muted);border-radius:8px}.noimg.wide{height:200px}
h4{margin:0 0 6px;font-size:19px}h5{margin:12px 0 2px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--teal)}
.opens{margin:0;font-style:italic}ul{margin:4px 0 4px 20px;padding:0}
mark.chg{background:var(--mark);color:inherit;border-radius:3px;padding:0 2px;border-bottom:2px solid var(--orange);cursor:help}
details{margin-top:8px}summary{cursor:pointer;color:var(--teal);font-weight:600}
.changes .was{text-decoration:line-through;color:var(--bad)}.changes .now{color:var(--ok)}.changes em{display:block;color:var(--muted);font-size:13px}
.verdict{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;align-items:center}
.verdict button{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:6px;padding:5px 10px;cursor:pointer;font-size:14px}
.verdict button.primary{border-color:var(--ok)}
.verdict button.on{background:var(--ok);color:#fff;border-color:var(--ok)}.verdict button[data-v^=redo].on,.verdict button[data-v^=fix].on{background:var(--bad);border-color:var(--bad)}
.verdict input{flex:1;min-width:160px;padding:5px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)}
#exportBox{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;display:grid;place-items:center;padding:16px}.xb{background:var(--card);color:var(--ink);border-radius:10px;padding:16px;width:min(760px,100%);max-height:90vh;display:flex;flex-direction:column;gap:8px}.xb h3{margin:0}.xb p{margin:0;color:var(--muted);font-size:14px}.xb textarea{width:100%;min-height:260px;flex:1;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:8px;font:12px/1.4 ui-monospace,Consolas,monospace}.xrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.xrow button,.xrow a{background:var(--orange);color:#111;border:0;border-radius:6px;padding:6px 12px;font-weight:600;cursor:pointer;text-decoration:none;font-size:14px}#xmsg{color:var(--ok);font-size:14px}.r2{background:var(--mark);border-left:4px solid var(--orange);border-radius:6px;padding:6px 12px;margin:10px 0}.r2 p{margin:4px 0;font-size:14px}.r2intro{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 14px}footer{max-width:1100px;margin:0 auto;padding:0 16px 40px;color:var(--muted);font-size:14px}
</style></head><body>
<header><h1>Episode 1: art and words to approve</h1><span class="tally" id="tally"></span>
<button id="export">Export my choices</button><button id="approveAll" title="Marks every item you haven't answered as approved">Approve everything unanswered</button></header>
<nav>${toc}</nav>
<main>
<p class="r2intro">Round 2: everything you approved in round 1 is still approved. ${(round2.reset ?? []).length} items are waiting for another look because I changed them (marked <b>Round 2</b> below, with what you said and what I did).</p>
<p>${scenes.length} places and ${total} characters. Highlighted words are ones I changed; hover for what they used to say. Your choices are kept in this browser and can be exported as a file to hand back to me.</p>
${scenes.map(sceneSection).join("\n")}
</main>
<footer>Built ${new Date().toISOString().slice(0, 16).replace("T", " ")} by tools/art-review/build.mjs. Nothing here has changed anything on the server.</footer>
<script>
(function(){
  var K="bi-episode1-review-v2", state={}, DEFAULTS=${JSON.stringify(defaults)};
  try{state=JSON.parse(localStorage.getItem(K)||"null")}catch(e){state=null}
  if(!state){ state=JSON.parse(JSON.stringify(DEFAULTS)); }
  function save(){try{localStorage.setItem(K,JSON.stringify(state))}catch(e){}}
  function paint(){
    document.querySelectorAll(".verdict").forEach(function(v){
      var key=v.getAttribute("data-for"), s=state[key]||{};
      v.querySelectorAll("button").forEach(function(b){b.classList.toggle("on",!!(s.v&&s.v.indexOf(b.getAttribute("data-v"))>-1))});
      var i=v.querySelector("input"); if(i&&document.activeElement!==i) i.value=s.note||"";
    });
    var all=document.querySelectorAll(".verdict"), done=0;
    all.forEach(function(v){var s=state[v.getAttribute("data-for")];if(s&&s.v&&s.v.length)done++});
    document.getElementById("tally").textContent=done+" of "+all.length+" answered";
  }
  document.addEventListener("click",function(e){
    var b=e.target.closest(".verdict button"); if(!b) return;
    var v=b.closest(".verdict"), key=v.getAttribute("data-for"), val=b.getAttribute("data-v");
    var s=state[key]=state[key]||{v:[],note:""}; s.v=s.v||[];
    if(val==="both-ok"){s.v=["portrait-ok","text-ok","both-ok"]}
    else{var i=s.v.indexOf(val); if(i>-1)s.v.splice(i,1); else{ s.v.push(val); if(val==="redo-art")s.v=s.v.filter(function(x){return x!=="portrait-ok"&&x!=="both-ok"&&x!=="place-ok"}); if(val==="fix-text")s.v=s.v.filter(function(x){return x!=="text-ok"&&x!=="both-ok"}); }}
    save(); paint();
  });
  document.addEventListener("input",function(e){
    var i=e.target.closest(".verdict input"); if(!i) return;
    var key=i.closest(".verdict").getAttribute("data-for"); var s=state[key]=state[key]||{v:[],note:""}; s.note=i.value; save();
  });
  document.getElementById("approveAll").addEventListener("click",function(){
    document.querySelectorAll(".verdict").forEach(function(v){
      var key=v.getAttribute("data-for"), s=state[key];
      if(!s||!s.v||!s.v.length){state[key]={v:v.querySelector('[data-v="both-ok"]')?["portrait-ok","text-ok","both-ok"]:["place-ok"],note:(s&&s.note)||""}}
    }); save(); paint();
  });
  function exportText(){
    var known=document.querySelectorAll('.verdict').length, answered=0, summary=[];
    document.querySelectorAll('.verdict').forEach(function(v){var k=v.getAttribute('data-for'),s=state[k];if(s&&s.v&&s.v.length){answered++}});
    return JSON.stringify({exported:new Date().toISOString(),answered:answered,of:known,choices:state},null,2);
  }
  function showExport(){
    var text; try{text=exportText()}catch(e){text='Could not build the export: '+e}
    var old=document.getElementById('exportBox'); if(old) old.remove();
    var box=document.createElement('div'); box.id='exportBox';
    box.innerHTML='<div class="xb"><h3>Your choices</h3><p>Copy this and paste it back to me, or use Download if your viewer allows it. Nothing has left this page.</p><textarea readonly></textarea><div class="xrow"><button id="xcopy">Copy</button><a id="xdl" role="button">Download file</a><button id="xclose">Close</button><span id="xmsg"></span></div></div>';
    document.body.appendChild(box);
    var ta=box.querySelector('textarea'); ta.value=text; ta.focus(); ta.select();
    box.querySelector('#xclose').onclick=function(){box.remove()};
    box.querySelector('#xcopy').onclick=function(){
      var m=box.querySelector('#xmsg'); ta.select();
      try{ if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){m.textContent='Copied.'},function(){document.execCommand('copy');m.textContent='Copied.'})} else {document.execCommand('copy');m.textContent='Copied.'} }catch(e){m.textContent='Select the text and press Ctrl+C.'}
    };
    box.querySelector('#xdl').onclick=function(ev){ ev.preventDefault(); var m=box.querySelector('#xmsg'); try{ var b=new Blob([text],{type:'application/json'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download='episode-1-review-choices.json'; a.target='_blank'; a.rel='noopener'; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(u)},4000); m.textContent='If nothing downloaded, use Copy instead.'; }catch(e){ m.textContent='Downloads are blocked here, use Copy instead.'; } };
  }
  document.getElementById('export').addEventListener('click',function(){ try{showExport()}catch(e){alert('Export failed: '+e)} });
  paint();
})();
</script></body></html>`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${(html.length / 1048576).toFixed(1)} MB), ${scenes.length} scenes, ${total} characters`);
