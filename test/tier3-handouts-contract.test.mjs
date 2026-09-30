// Tier 3 — handouts against the things they must agree with: Foundry's own
// HTML sanitiser, the theme's layering rules, the module's shipped files, the
// scene runner's wiring, and the real letter in The Road In.
//
// The sanitiser check is the one that matters most. Foundry cleans every
// journal page's HTML on the server (dist/database/validators.mjs cleanHTML,
// allowlists in common/constants.mjs). A tag or attribute it does not allow is
// not an error there: it is silently dropped, and a dropped wrapper publishes
// its contents bare. So every handout body is rendered here exactly as it will
// be filed, and every tag and attribute in the result is checked against the
// real allowlist read out of the local Foundry source.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { planHandout, renderHandoutBody } from "../module/blank-inheritance/scripts/core/handouts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");

const PAPERS_CSS = "module/blank-inheritance/styles/bi-papers.css";
const COMPONENTS_CSS = "module/blank-inheritance/styles/bi-components.css";
const TOKENS_CSS = "module/blank-inheritance/styles/bi-tokens.css";
const FOUNDRY_CONSTANTS = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "common", "constants.mjs");

const briefsDir = path.join(repoRoot, "data", "scene-briefs");
const briefs = readdirSync(briefsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ file: f, brief: JSON.parse(readFileSync(path.join(briefsDir, f), "utf8")) }));
const handouts = briefs.flatMap(({ file, brief }) => (brief.handouts ?? []).map((h) => ({ file, handout: h })));

const SAMPLE_PLAYERS = [
  { id: "u1", name: "Pippa", characterName: "Hanae Kesse", active: true },
  { id: "u2", name: "Anne", characterName: null, active: true }
];

/** Every page a handout would really produce, as filed. */
function renderedPages(handout) {
  return planHandout(handout, { audience: "table", players: SAMPLE_PLAYERS }).pages.filter((p) => p.type === "text");
}

function startTags(html) {
  const tags = [];
  for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:\s*=\s*"[^"]*")?)*)\s*\/?>/g)) {
    const attrs = [...m[2].matchAll(/([^\s=]+)(?:\s*=\s*"([^"]*)")?/g)].map((a) => ({ name: a[1], value: a[2] ?? "" }));
    tags.push({ tag: m[1].toLowerCase(), attrs });
  }
  return tags;
}

/* ---------------------------------------------------------------- */
/*  Foundry's sanitiser                                              */
/* ---------------------------------------------------------------- */

function foundryAllowlists() {
  const source = readFileSync(FOUNDRY_CONSTANTS, "utf8");
  const tagsText = source.match(/export const ALLOWED_HTML_TAGS = Object\.freeze\((\[[\s\S]*?\])\);/);
  const attrsText = source.match(/export const ALLOWED_HTML_ATTRIBUTES = deepFreeze\((\{[\s\S]*?\n\})\);/);
  assert.ok(tagsText && attrsText, "could not find Foundry's HTML allowlists in common/constants.mjs; has the file moved?");
  // Plain literals of strings and arrays: safe to evaluate, and exact.
  const tags = new Set(Function(`"use strict"; return (${tagsText[1]});`)());
  const attrs = Function(`"use strict"; return (${attrsText[1]});`)();
  return { tags, attrs };
}

function attributeAllowed(attrs, tag, name) {
  const allowed = [...(attrs["*"] ?? []), ...(attrs[tag] ?? [])];
  return allowed.some((a) => (a.endsWith("*") ? name.startsWith(a.slice(0, -1)) : a === name));
}

test("every handout renders to tags and attributes Foundry's server sanitiser keeps", (t) => {
  if (!existsSync(FOUNDRY_CONSTANTS)) {
    t.skip("foundryvtt/ source tree absent (gitignored); cannot read the real allowlist. Skipping loudly.");
    return;
  }
  const { tags, attrs } = foundryAllowlists();
  assert.ok(handouts.length > 0, "no authored handouts found to check");
  for (const { file, handout } of handouts) {
    for (const page of renderedPages(handout)) {
      for (const { tag, attrs: present } of startTags(page.content)) {
        assert.ok(tags.has(tag), `${file} ${handout.id}: <${tag}> is not in Foundry's ALLOWED_HTML_TAGS; the server would drop it and publish its contents bare`);
        for (const { name } of present) {
          assert.ok(attributeAllowed(attrs, tag, name), `${file} ${handout.id}: <${tag} ${name}> would be stripped by Foundry's sanitiser`);
          assert.doesNotMatch(name, /^on/i, `${file} ${handout.id}: an event-handler attribute in a handout`);
        }
      }
    }
  }
});

test("no campaign tag survives rendering into any page", () => {
  for (const { file, handout } of handouts) {
    for (const page of renderedPages(handout)) {
      assert.doesNotMatch(page.content, /<\/?(typed|redact|trig)\b/i, `${file} ${handout.id} left a campaign tag in its filed page`);
    }
  }
});

/* ---------------------------------------------------------------- */
/*  The theme: its own stylesheet, the component layer's rules        */
/* ---------------------------------------------------------------- */

test("bi-papers.css ships, after the components and before the bridge", async () => {
  const { STYLESHEETS } = await import("../module/blank-inheritance/scripts/core/theme.mjs");
  const manifest = JSON.parse(read("module/blank-inheritance/module.json"));
  const at = (list) => list.indexOf("styles/bi-papers.css");
  for (const list of [manifest.styles, [...STYLESHEETS]]) {
    assert.ok(at(list) > list.indexOf("styles/bi-tokens.css"), "bi-papers.css loads before the tokens it reads");
    assert.ok(at(list) > list.indexOf("styles/bi-components.css"), "bi-papers.css must come after the shared components it reuses (.bi-form-row)");
    assert.ok(at(list) < list.indexOf("styles/bi-foundry-bridge.css"), "the bridge must load last");
  }
});

test("bi-papers.css is component layer: no Foundry selectors, every --bi- variable defined", () => {
  const css = read(PAPERS_CSS);
  for (const pattern of [/\.journal-entry-page\b/, /\.journal-page-content\b/, /body\.bi-theme\b/, /\.application\b/, /#sidebar\b/, /\.window-header\b/]) {
    assert.doesNotMatch(css, pattern, `bi-papers.css names a Foundry selector (${pattern}); that belongs in the bridge`);
  }
  const defined = new Set([...read(TOKENS_CSS).matchAll(/(--bi-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const local = new Set([...css.matchAll(/(--bi-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  for (const [, v] of css.matchAll(/var\((--bi-[a-z0-9-]+)/g)) {
    assert.ok(defined.has(v) || local.has(v), `bi-papers.css uses ${v}, which bi-tokens.css does not define`);
  }
});

test("no Japanese face in bi-papers.css is set below the readable floor", () => {
  const floor = Number(read(TOKENS_CSS).match(/--bi-jp-size-sm:\s*(\d+)px/)[1]);
  const jp = ["--bi-font-gothic", "--bi-font-mincho", "--bi-font-display-jp", "--bi-font-brush", "--bi-font-hand", "--bi-font-pixel-jp"];
  for (const block of read(PAPERS_CSS).match(/[^{}]*\{[^{}]*\}/g) ?? []) {
    if (!jp.some((token) => block.includes(token))) continue;
    for (const m of block.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      assert.ok(Number(m[1]) >= floor, `Japanese set at ${m[1]}px in "${block.split("{")[0].trim()}"; the floor is ${floor}px`);
    }
  }
});

test("every class a handout uses is actually styled, so a typo shows up here and not as a plain page", () => {
  const css = read(PAPERS_CSS) + read(COMPONENTS_CSS);
  for (const { file, handout } of handouts) {
    for (const page of renderedPages(handout)) {
      for (const [, list] of page.content.matchAll(/class="([^"]*)"/g)) {
        for (const cls of list.split(/\s+/).filter(Boolean)) {
          assert.match(css, new RegExp(`\\.${cls.replace(/[-_]/g, (c) => `\\${c}`)}(?![\\w-])`), `${file} ${handout.id} uses .${cls}, which no stylesheet defines`);
        }
      }
    }
  }
});

test("every module image a handout prints is actually in the module", () => {
  for (const { file, handout } of handouts) {
    const sources = [...(handout.body ?? "").matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
    if (handout.imagePath) sources.push(handout.imagePath);
    for (const src of sources.filter((s) => s.startsWith("modules/blank-inheritance/"))) {
      const onDisk = path.join(moduleRoot, src.replace("modules/blank-inheritance/", ""));
      assert.ok(existsSync(onDisk), `${file} ${handout.id} prints ${src}, which is not in the module`);
    }
  }
});

test("REGRESSION 2026-09-26: every SVG in the handout art is well-formed, so no browser refuses to draw it", () => {
  // Found live in the handout preview: a comment in the signature mentioned a
  // CSS token, and a double hyphen inside an XML comment is a fatal parse
  // error. The <img> simply drew nothing, with no error anywhere a GM looks.
  const dir = path.join(moduleRoot, "assets", "ui", "handouts");
  const svgs = readdirSync(dir).filter((f) => f.endsWith(".svg"));
  assert.ok(svgs.length > 0, "no SVGs found to check");
  for (const file of svgs) {
    const svg = readFileSync(path.join(dir, file), "utf8");
    assert.match(svg.trimStart(), /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${file} does not open with a namespaced <svg>`);
    for (const [, comment] of svg.matchAll(/<!--([\s\S]*?)-->/g)) {
      assert.ok(!comment.includes("--"), `${file} has "--" inside a comment, which makes the whole file invalid XML`);
    }
    assert.equal((svg.match(/<!--/g) ?? []).length, (svg.match(/-->/g) ?? []).length, `${file} has an unclosed comment`);
  }
});

test("the handout preview page renders through the real renderer and the real stylesheets, never a copy", () => {
  // design/ui/handout-preview.html is how a handout is looked at outside
  // Foundry. If it ever carried its own CSS or its own renderer, what it
  // showed would stop being what the table sees.
  const html = read("design/ui/handout-preview.html");
  for (const sheet of ["bi-fonts.css", "bi-tokens.css", "bi-components.css", "bi-papers.css", "bi-foundry-bridge.css"]) {
    assert.ok(html.includes(`../../module/blank-inheritance/styles/${sheet}`), `the preview page no longer links the real ${sheet}`);
  }
  assert.match(html, /import \{ renderHandoutBody \} from "\.\.\/\.\.\/module\/blank-inheritance\/scripts\/core\/handouts\.mjs"/);
  assert.match(html, /<body class="bi-theme">/, "without body.bi-theme the bridge's journal rules never apply in the preview");
});

/* ---------------------------------------------------------------- */
/*  The scene runner goes through the one filer                      */
/* ---------------------------------------------------------------- */

test("every reveal and every grant in the scene runner files through foundry/handouts.mjs", () => {
  const src = read("module/blank-inheritance/scripts/foundry/scene-runner.mjs");
  const reveal = src.match(/async function revealHandout\(handoutId, scene, users\) \{[\s\S]*?\n\}/);
  assert.ok(reveal, "revealHandout is missing");
  assert.match(reveal[0], /fileHandout\(handout, \{ audience: users\?\.length \? users : "table" \}\)/);
  const grant = src.match(/static async #onGrantArtefact\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(grant, "#onGrantArtefact is missing");
  assert.match(grant[0], /fileHandout\(artefact, \{ audience: "table", confirm: false \}\)/);
  // The old transient paths must not creep back: a flashed image or a page
  // made outside the filer is a handout the players cannot find again.
  assert.doesNotMatch(src, /ensureHandoutPage|Journal\.showImage/);
});

test("REGRESSION 2026-09-26: a one-player beat's button calls the one-player action, not the whole-table one", () => {
  const beat = read("module/blank-inheritance/templates/runner/beat.hbs");
  const block = beat.match(/\{\{#if handout\}\}\s*<div class="bi-runner__actions">[\s\S]*?<\/div>\s*\{\{\/if\}\}/);
  assert.ok(block, "the beat's handout block is missing");
  const solo = block[0].match(/\{\{#if isSolo\}\}([\s\S]*?)\{\{else\}\}/);
  assert.ok(solo, "a solo beat no longer has its own button");
  assert.match(solo[1], /data-action="revealHandoutSolo"/, "a 'Show one player' button that calls revealHandout hands the document to the whole table");
});

/* ---------------------------------------------------------------- */
/*  REAL DATA: the acceptance letter                                 */
/* ---------------------------------------------------------------- */

const roadIn = briefs.find((b) => b.file === "episode-c1e1--the-road-in.json").brief;
const letter = roadIn.handouts.find((h) => h.id === "acceptance-letter");

test("the acceptance letter is handed over from the letter beat, one private copy each", () => {
  assert.ok(letter, "The Road In has no acceptance-letter handout");
  assert.equal(letter.personal, true, "the letter must be a private copy per player: they have not met yet");
  const beat = roadIn.beats.find((b) => b.id === "the-letter");
  assert.equal(beat.kind, "reveal");
  assert.equal(beat.handoutRef, "acceptance-letter");
});

test("the paper says what the GM reads aloud: the typed letter with its pen correction applied", () => {
  const beat = roadIn.beats.find((b) => b.id === "the-letter");
  const html = renderHandoutBody(letter.body, { fields: { character: "Sample" } });
  // Read it the way the candidate does: the typed body, with the ruled-out
  // date replaced by what the clerk wrote in the margin.
  const correction = html.match(/<span class="bi-paper__note[^"]*">([^<]*)<\/span>/)?.[1];
  assert.equal(correction, "Monday next", "the margin note no longer carries the corrected date");
  const typed = html
    .replace(/<div class="bi-paper__margin">[\s\S]*?<\/span><\/span><\/div>/g, "")
    .replace(/<s class="bi-paper__struck">[\s\S]*?<\/s>/g, correction)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ");
  // Sentence by sentence: the read-aloud runs two of them into one paragraph
  // where the paper gives each its own, and that difference is only layout.
  const spoken = beat.readAloud
    .split("\n")
    .filter((line) => line.trim() && !/^Dear\b/.test(line.trim()))
    .join(" ")
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  assert.ok(spoken.length >= 4, `expected the letter's four sentences, found ${spoken.length}`);
  for (const sentence of spoken) assert.ok(typed.includes(sentence), `the paper and the read-aloud have drifted apart: "${sentence}" is not on the paper`);
});

test("the letter is typed first: its typed-in lines carry the admissions machine's broken e, and the date is corrected in pen", () => {
  const html = renderHandoutBody(letter.body, { fields: { character: "Sample" } });
  assert.match(html, /D<span class="bi-typed__fault bi-typed__fault--\d">e<\/span>ar/, "the typed-in salutation lost the machine's fault");
  assert.match(html, /<s class="bi-paper__struck">the first Monday of term<\/s>/, "the typed date is no longer ruled through");
  assert.match(html, /bi-paper__note[^>]*>Monday next</, "the correction is no longer handwritten");
  assert.match(html, /BROUGHT FORWARD/);
  assert.doesNotMatch(html, /Someone we should write to/, "Ingram cut the safe-arrival line from the return slip (2026-09-26)");
  assert.match(html, /bi-paper__box-label">Form No\.<\/span><span class="bi-typed[^"]*"[^>]*>1-A</, "the form number is no longer typed into its printed box");
});

test("RULE (Ingram, 2026-09-26): typing comes first; pen notes and stamps go around it, never inside a typed paragraph", () => {
  for (const { file, handout } of handouts) {
    for (const page of renderedPages(handout)) {
      for (const [block] of page.content.matchAll(/<(p|li)\b[^>]*>[\s\S]*?<\/\1>/g)) {
        assert.doesNotMatch(block, /(bi-stamp|bi-paper__note|bi-paper__seal)(?![\w-])/, `${file} ${handout.id} puts a stamp or a pen note inside typed text: ${block.slice(0, 120)}`);
      }
    }
  }
});

test("the letter's paper says nothing the players may not know yet, and names no real place or decade", () => {
  const html = renderHandoutBody(letter.body, { fields: { character: "Sample" } });
  const text = html.replace(/<[^>]+>/g, " ");
  const alt = [...letter.body.matchAll(/alt="([^"]*)"/g)].map((m) => m[1]).join(" ");
  for (const word of ["Nozomi", "Watcher", "pilot", "Frame", "cicada", "mitflit", "irregular", "marker", "Rand", "Rupiah", "Shucks", "Hyuck", "Anabala", "Manako", "founder", "Section Nine", "Japan"]) {
    assert.doesNotMatch(`${text} ${alt}`, new RegExp(`\\b${word}\\b`, "i"), `the acceptance letter names "${word}" to the table`);
  }
  assert.doesNotMatch(text, /\b1[89]\d\d\b/, "a real-world year on a player-facing document");
});
