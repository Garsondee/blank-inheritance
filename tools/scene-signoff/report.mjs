#!/usr/bin/env node
/**
 * The Sign-Off report -- one HTML page per scene, rendered from
 * report-template.html plus the scene's own reviews/<id>.json, plus whatever
 * the mechanical checks currently say.
 *
 *   node tools/scene-signoff/report.mjs <scene>           render it
 *   node tools/scene-signoff/report.mjs <scene> --path     print where it lands
 *   node tools/scene-signoff/report.mjs <scene> --stdout    print the HTML
 *
 * Ingram asked for a document per review on 2026-09-22, and then for it to be
 * HTML rather than markdown: "reading huge amounts of basic text is what I
 * spend a lot of my time doing and it's exhausting. Clearly accessible and
 * strong visual language in a html template artefact would make it easier to
 * see what's good, bad, what needs work, what you need from me." Followed by:
 * "Prioritise reading comprehension above in universe style."
 *
 * So the page is fully GENERATED and the prose lives in the JSON. The earlier
 * markdown version kept prose and generated tables in one file behind comment
 * markers, which worked but meant a refresh could only ever touch part of the
 * page. With the content in data there is nothing to preserve and nothing to
 * clobber: re-render whenever, from anywhere.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCorpus, findScene, scenesInPlayOrder, repoRoot } from "./corpus.mjs";
import { runAutoChecks, horizonsOf } from "./checklist.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REVIEWS_DIR = path.join(repoRoot, "reviews");
const TEMPLATE = path.join(here, "report-template.html");

const PASS_NAMES = ["comprehension", "completeness", "place", "seam", "quality"];
const PASS_TITLES = {
  comprehension: "Comprehension",
  completeness: "Completeness",
  place: "Place",
  seam: "Seam",
  quality: "Quality"
};
const PASS_BLURB = {
  comprehension: "The scene as I would run it, start to finish, verbatim on everything said out loud.",
  completeness: "Is anything missing that the scene needs, or that would help it.",
  place: "Does this happen somewhere real on the world map, and is that the right somewhere.",
  seam: "Does this scene join cleanly to the one before it and the one after it.",
  quality: "Is it good, and where is the best available improvement."
};
const VERDICT_CLASS = { CLEAR: "clear", FIX: "fix", STOP: "stop", BLOCKED: "waiting" };
const STATE_LABEL = {
  pass: "ok", fail: "fail", waived: "waived", excepted: "excepted", exempt: "exempt",
  "n/a": "n/a", manual: "by hand", broken: "broken"
};

export const reportPath = (sceneId) => path.join(REVIEWS_DIR, `${sceneId}.html`);
export const reviewPath = (sceneId) => path.join(REVIEWS_DIR, `${sceneId}.json`);

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * A deliberately tiny markdown subset: paragraphs, ### headings, > quotes,
 * - lists, **bold**, *italic*, `code`. Enough to write a review in comfortably,
 * small enough not to be a dependency or a parser to maintain. Anything more
 * elaborate than this belongs in the template as a real component instead --
 * findings and diffs are structured data here for exactly that reason.
 */
export function md(source) {
  const text = String(source ?? "").trim();
  if (!text) return "";

  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  const out = [];
  let list = null;
  let quote = null;

  const closeList = () => { if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; } };
  const closeQuote = () => {
    if (quote) {
      const paras = quote.join("\n").split(/\n{2,}/).map((p) => `<p>${inline(p.replace(/\n/g, " ").trim())}</p>`);
      out.push(`<blockquote>${paras.join("")}</blockquote>`);
      quote = null;
    }
  };

  for (const block of text.split("\n")) {
    const line = block.trimEnd();
    if (/^>\s?/.test(line)) {
      closeList();
      (quote ??= []).push(line.replace(/^>\s?/, ""));
      continue;
    }
    if (/^###\s+/.test(line)) {
      closeList(); closeQuote();
      out.push(`<h3>${inline(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      closeQuote();
      (list ??= []).push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (!line.trim()) { closeList(); closeQuote(); continue; }
    closeList(); closeQuote();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList(); closeQuote();
  return out.join("\n");
}

function passCards(scene, review) {
  return PASS_NAMES.map((name, i) => {
    const recorded = scene.authoring?.review?.passes?.[name];
    const proposed = review?.passes?.[name]?.proposed;
    let verdict = recorded?.verdict ?? null;
    let cls = verdict ? VERDICT_CLASS[verdict] : "";
    let note = verdict ? `recorded ${recorded.date}` : proposed ? `proposed ${proposed}` : "not run";
    if (!verdict && proposed) { verdict = proposed; cls = "waiting"; }
    return `
      <a class="passcard is-${cls || "quiet"}" href="#pass-${name}">
        <span class="n">Pass ${i + 1}</span>
        <span class="nm">${PASS_TITLES[name]}</span>
        <span class="vd">${esc(verdict ?? "—")}</span>
        <span class="prop">${esc(note)}</span>
      </a>`;
  }).join("");
}

function asksBlock(review) {
  const asks = (review?.asks ?? []).filter((a) => a.status !== "answered");
  if (!asks.length) {
    return `<p class="nothing">Nothing — every question on this scene is answered. The only thing outstanding is your assent on the passes above.</p>`;
  }
  // Every ask carries the context needed to decide: what is true now, the real
  // options with their implications, and my recommendation. Ingram, 2026-09-22:
  // "you need to give me full context for decisions you want me to make, it's
  // still a bit confusing what question 1 is asking me to decide/confirm."
  const items = asks.map((a, i) => `
    <li id="ask-${esc(a.id ?? i)}">
      <p class="ask-meta">Question ${i + 1} of ${asks.length}${a.blocking ? ` · <span class="blocking">blocks the seal</span>` : " · not blocking"}</p>
      <p class="ask-q">${md(a.question).replace(/^<p>|<\/p>$/g, "")}</p>
      ${a.current ? `<div class="ask-current"><span class="lede">Where it stands</span>${md(a.current)}</div>` : ""}
      ${a.detail ? `<div class="ask-detail">${md(a.detail)}</div>` : ""}
      ${(a.options ?? []).length ? `<ol class="ask-options">${a.options.map((o) => `
        <li${o.recommended ? ' class="is-rec"' : ""}>
          <span class="opt">${esc(o.label)}${o.recommended ? ' <span class="rec-tag">my recommendation</span>' : ""}</span>
          <span class="imp">${md(o.implication).replace(/^<p>|<\/p>$/g, "")}</span>
        </li>`).join("")}</ol>` : ""}
      ${a.recommendation ? `<div class="ask-rec"><span class="lede">What I would do</span>${md(a.recommendation)}</div>` : ""}
    </li>`).join("");
  return `<ul class="asklist">${items}</ul>`;
}

function tally(results) {
  const counts = {};
  for (const r of results) counts[r.state] = (counts[r.state] ?? 0) + 1;
  const order = ["fail", "broken", "pass", "waived", "excepted", "exempt", "manual", "n/a"];
  return order
    .filter((s) => counts[s])
    .map((s) => {
      const cls = s === "fail" || s === "broken" ? "t-fail" : s === "pass" ? "t-ok" : "";
      return `<span class="${cls}">${counts[s]} ${esc(STATE_LABEL[s])}</span>`;
    })
    .join("");
}

function checkRows(results) {
  return results.map((r) => `
    <div class="checkrow ${r.state === "fail" ? "is-fail" : ""}">
      <div><span class="state s-${r.state.replace("/", "")}">${esc(STATE_LABEL[r.state] ?? r.state)}</span>
        <div class="id">${esc(r.id)} ${r.severity === "required" ? "req" : "rec"}</div></div>
      <div><div class="q">${esc(r.question)}</div>${r.detail ? `<div class="detail">${md(r.detail).replace(/^<p>|<\/p>$/g, "")}</div>` : ""}</div>
    </div>`).join("");
}

function checksBlock(results, passName) {
  const rows = results.filter((r) => r.pass === passName && r.state !== "n/a");
  if (!rows.length) return "";
  const failing = rows.filter((r) => r.state === "fail" || r.state === "broken");
  const open = failing.length > 0;
  return `
    <div class="tally">${tally(rows)}</div>
    <details class="checks"${open ? " open" : ""}>
      <summary>${open ? `${failing.length} check${failing.length === 1 ? "" : "s"} failing — the full list` : "All checks, in full"}</summary>
      <div class="checkgrid">${checkRows(rows)}</div>
    </details>`;
}

function diff(before, after) {
  if (!before && !after) return "";
  return `<div class="diff">${before ? `<div class="was">${esc(before)}</div>` : ""}${after ? `<div class="now">${esc(after)}</div>` : ""}</div>`;
}

function findingsBlock(quality) {
  const findings = quality?.findings ?? [];
  if (!findings.length) return "";
  const SEV = {
    applied: ["sev-applied", "v-clear", "applied"],
    noted: ["sev-noted", "v-fix", "noted, not changed"],
    ok: ["sev-ok", "v-quiet", "no change needed"],
    open: ["sev-open", "v-stop", "waiting on you"]
  };
  return `<div class="findings">${findings.map((f) => {
    const [cls, chip, label] = SEV[f.severity] ?? SEV.noted;
    return `
      <article class="finding ${cls}">
        <header>
          <h3>${esc(f.title)}</h3>
          ${f.check ? `<span class="verdict-chip v-quiet">${esc(f.check)}</span>` : ""}
          <span class="verdict-chip ${chip}">${esc(label)}</span>
        </header>
        <div class="body">
          <div class="prose">${md(f.body)}</div>
          ${diff(f.before, f.after)}
        </div>
      </article>`;
  }).join("")}</div>`;
}

function declinedBlock(pass) {
  const declined = pass?.declined ?? [];
  if (!declined.length) return "";
  return `
    <h3 class="prose" style="margin-top:8px">Recommended checks I am declining, and why</h3>
    <ul class="declined">${declined.map((d) => `
      <li>
        <span class="ck">${esc(d.check)}</span>
        <span class="what">${esc(d.what)}</span>
        <span class="why">${md(d.why).replace(/^<p>|<\/p>$/g, "")}</span>
      </li>`).join("")}</ul>`;
}

function fineBlock(quality) {
  const fine = quality?.judgedFine ?? [];
  if (!fine.length) return "";
  return `
    <h3 class="prose">What I considered and judged fine</h3>
    <p class="prose" style="color:var(--ink-soft);font-size:15px;margin-top:-6px">Named so that silence is not mistaken for inattention.</p>
    <ul class="fine">${fine.map((f) => `
      <li><span class="ck">${esc(f.check)}</span><div class="note">${md(f.note)}</div></li>`).join("")}</ul>`;
}

function sections(scene, review, results) {
  return PASS_NAMES.map((name, i) => {
    const pass = review?.passes?.[name];
    const recorded = scene.authoring?.review?.passes?.[name];
    const verdict = recorded?.verdict ?? pass?.proposed ?? null;
    const isProposed = !recorded && Boolean(pass?.proposed);
    const cls = verdict ? `v-${VERDICT_CLASS[verdict]}` : "v-quiet";
    return `
      <section class="pass" id="pass-${name}">
        <header>
          <h2><span class="num">${i + 1}</span>${PASS_TITLES[name]}</h2>
          <span class="verdict-chip ${cls}">${esc(verdict ?? "not run")}${isProposed ? " · proposed" : ""}</span>
        </header>
        <p class="prose" style="color:var(--ink-soft);font-size:15px;margin-top:-8px">${esc(PASS_BLURB[name])}</p>
        ${pass?.summary ? `<p class="summary-line">${md(pass.summary).replace(/^<p>|<\/p>$/g, "")}</p>` : ""}
        ${pass?.body ? `<div class="prose">${md(pass.body)}</div>` : ""}
        ${name === "quality" ? findingsBlock(pass) : ""}
        ${declinedBlock(pass)}
        ${name === "quality" ? fineBlock(pass) : ""}
        ${checksBlock(results, name)}
      </section>`;
  }).join("");
}

function appliedBlock(review) {
  const applied = review?.applied ?? [];
  if (!applied.length) return `<p class="nothing">Nothing applied yet.</p>`;
  return applied.map((a) => `
    <div class="applied-item">
      <h3>${md(a.title).replace(/^<p>|<\/p>$/g, "")}</h3>
      ${a.why ? `<p class="why">${md(a.why).replace(/^<p>|<\/p>$/g, "")}</p>` : ""}
      ${diff(a.before, a.after)}
    </div>`).join("");
}

function radarBlock(bundle) {
  const h = horizonsOf(bundle);
  const max = Math.max(h.short, h.medium, h.long.length, 1);
  const row = (cls, label, sub, n) => `
    <div class="hz ${cls} ${n === 0 ? "is-zero" : ""}">
      <div class="lbl">${label}<small>${sub}</small></div>
      <div class="bar"><i style="width:${Math.round((n / max) * 100)}%"></i></div>
      <div class="n">${n}</div>
    </div>`;
  return [
    row("h-short", "Short", "tonight · outro.writeDown", h.short),
    row("h-med", "Medium", "a few episodes · carryForward", h.medium),
    row("h-long", "Long", "campaign · facts the GM relies on", h.long.length)
  ].join("");
}

function radarNote(bundle) {
  const h = horizonsOf(bundle);
  const at = [h.short, h.medium, h.long.length].filter(Boolean).length;
  const nodes = h.long.length ? `<p>Long-horizon plants recorded on: ${h.long.map((n) => `<code>${esc(n)}</code>`).join(", ")}.</p>` : "";
  if (at > 1) return `<div class="note-block">${nodes}<p style="margin:0">Registers at ${at} horizons. Every consequence has one recorded home, chosen by horizon.</p></div>`;
  return `<div class="note-block">${nodes}<p style="margin:0"><strong>Registers at one horizon only.</strong> Whether that is a fault is a campaign judgment rather than a checklist one — which is why this reports it instead of failing on it.</p></div>`;
}

function naBlock(results) {
  const rows = results.filter((r) => r.state === "n/a");
  if (!rows.length) return `<p class="nothing">Every check applies to this scene.</p>`;
  return `<div class="checkgrid" style="border:1px solid var(--rule);border-radius:var(--radius);background:var(--paper-raised)">${
    rows.map((r) => `
      <div class="checkrow">
        <div><span class="state s-na">n/a</span><div class="id">${esc(r.id)}</div></div>
        <div><div class="q">${esc(r.question)}</div><div class="detail">${esc(r.detail)}</div></div>
      </div>`).join("")}</div>`;
}

export function renderReport(bundle, corpus, allScenes, review) {
  const template = readFileSync(TEMPLATE, "utf8");
  const results = runAutoChecks(bundle, corpus, { allScenes, includeManual: true });
  const index = allScenes.findIndex((s) => s.key === bundle.key);
  const asks = (review?.asks ?? []).filter((a) => a.status !== "answered");
  const blocking = asks.filter((a) => a.blocking).length;

  return template
    .replaceAll("{{TITLE}}", esc(bundle.scene.title ?? bundle.scene.id))
    .replaceAll("{{SCENE_ID}}", esc(bundle.briefRef ?? bundle.scene.id))
    .replaceAll("{{ORDER}}", String(index + 1))
    .replaceAll("{{TOTAL}}", String(allScenes.length))
    .replaceAll("{{EPISODE_TITLE}}", esc(bundle.episode.title ?? bundle.episode.id))
    .replaceAll("{{CHECKLIST_VERSION}}", String(corpus.checklist.version))
    .replaceAll("{{DATE}}", esc(review?.opened ?? new Date().toISOString().slice(0, 10)))
    .replaceAll("{{STATUS}}", esc(bundle.scene.authoring?.status ?? "(none)"))
    .replaceAll("{{PASS_CARDS}}", passCards(bundle.scene, review))
    .replaceAll("{{ASK_COUNT}}", asks.length ? `${asks.length} open${blocking ? `, ${blocking} blocking the seal` : ""}` : "all answered")
    .replaceAll("{{ASKS}}", asksBlock(review))
    .replaceAll("{{SECTIONS}}", sections(bundle.scene, review, results))
    .replaceAll("{{APPLIED_COUNT}}", `${(review?.applied ?? []).length} change${(review?.applied ?? []).length === 1 ? "" : "s"}`)
    .replaceAll("{{APPLIED}}", appliedBlock(review))
    .replaceAll("{{RADAR}}", radarBlock(bundle))
    .replaceAll("{{RADAR_NOTE}}", radarNote(bundle))
    .replaceAll("{{NA_COUNT}}", `${results.filter((r) => r.state === "n/a").length} checks`)
    .replaceAll("{{NOT_APPLICABLE}}", naBlock(results));
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const [needle, ...flags] = process.argv.slice(2);
  if (!needle) {
    console.error("usage: report.mjs <scene> [--path | --stdout]");
    process.exit(1);
  }
  const corpus = loadCorpus();
  const bundle = findScene(corpus, needle);
  if (!bundle) {
    console.error(`no scene matching "${needle}"`);
    process.exit(1);
  }
  const sceneId = bundle.briefRef ?? bundle.scene.id;
  const out = reportPath(sceneId);

  if (flags.includes("--path")) {
    console.log(out);
  } else {
    const jsonPath = reviewPath(sceneId);
    if (!existsSync(jsonPath)) {
      console.error(`no review content at ${path.relative(repoRoot, jsonPath)} -- write that first; this renders it`);
      process.exit(1);
    }
    const html = renderReport(bundle, corpus, scenesInPlayOrder(corpus), JSON.parse(readFileSync(jsonPath, "utf8")));
    if (flags.includes("--stdout")) {
      console.log(html);
    } else {
      mkdirSync(REVIEWS_DIR, { recursive: true });
      writeFileSync(out, html);
      console.log(path.relative(repoRoot, out));
    }
  }
}
