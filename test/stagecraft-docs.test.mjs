// Stagecraft: Puppet Show is one design in several documents, all in design/stagecraft/. Ingram's worry
// (2026-10-01) was that ideas got lost between them, and then that the documents were scattered. These checks keep
// the set honest:
//   - ledger.md lists every idea once, nothing has been dropped, and every section and plate it names exists;
//   - the hub (README.md) lists every document, and every document's links point at files that exist;
//   - the documents use her words (cards, sticks), not the old one (frames) for a person on the stage;
//   - the Foundry source lines renderer.md cites are still the lines it says (so a Foundry upgrade fails loudly
//     here, instead of leaving a plan that points at nothing).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const design = path.join(root, "design");
const hub = path.join(design, "stagecraft");
const read = (name) => readFileSync(path.join(hub, name), "utf8");

const SYSTEM = ["README.md", "ledger.md", "stage.md", "diorama.md", "renderer.md", "feel.md", "chalk.md", "draft.md", "module.md", "scene-standard.md", "situation-scenes.md"];
const TEXTS = Object.fromEntries(SYSTEM.map((n) => [n, read(n)]));
const headings = (text) => new Set([...text.matchAll(/^#{2,3} (\d+(?:\.\d+)?)[. ]/gm)].map((m) => m[1]));
const HEADS = Object.fromEntries(SYSTEM.map((n) => [n, headings(TEXTS[n])]));

/* ledger.md -------------------------------------------------------------------------------------------------- */

const rows = TEXTS["ledger.md"].split("\n")
  .filter((l) => /^\| [A-J]\d+ \|/.test(l))
  .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

/** The ideas that existed when the ledger was gathered: none may ever disappear. */
const BASELINE = Object.entries({ A: 16, B: 19, C: 6, D: 9, E: 7, F: 4, G: 7, H: 28, I: 8, J: 4 }).flatMap(([g, n]) => Array.from({ length: n }, (_, i) => `${g}${i + 1}`));

test("the ledger lists every idea once, and none has been dropped", () => {
  const ids = rows.map((r) => r[0]);
  assert.equal(new Set(ids).size, ids.length, "duplicate ledger id");
  const missing = BASELINE.filter((id) => !ids.includes(id));
  assert.deepEqual(missing, [], "ideas have gone missing from ledger.md");
});

test("every document and section the ledger points at exists", () => {
  const problems = [];
  for (const r of rows) {
    const where = r[2];
    let current = null;
    for (const m of where.matchAll(/([a-z][a-z-]*\.md)|§(\d+(?:\.\d+)?)/g)) {
      if (m[1]) {
        current = m[1];
        if (!SYSTEM.includes(current)) problems.push(`${r[0]}: ${current} is not a Stagecraft document`);
      } else if (current === null) {
        problems.push(`${r[0]}: §${m[2]} has no document named before it ("${where}")`);
      } else if (!HEADS[current]?.has(m[2])) {
        problems.push(`${r[0]}: §${m[2]} not found in ${current}`);
      }
    }
    // The last column of the first three groups is the subsection of diorama.md §11 that says how the idea works on the floor.
    if (/^[ABC]/.test(r[0]) && r[4]) {
      for (const m of r[4].matchAll(/\b(\d+\.\d+)\b/g)) if (!HEADS["diorama.md"].has(m[1])) problems.push(`${r[0]}: diorama.md §${m[1]} not found`);
    }
  }
  assert.deepEqual(problems, []);
});

test("every plate number the ledger names exists", () => {
  const dioramaTable = TEXTS["diorama.md"].slice(TEXTS["diorama.md"].indexOf("## 15. The plates"));
  const dioramaPlates = new Set([...dioramaTable.matchAll(/^\| (\d+) /gm)].map((m) => Number(m[1])));
  const lab = readFileSync(path.join(hub, "lab", "README.md"), "utf8");
  const problems = [];
  for (const r of rows) {
    if (r[0].startsWith("G")) continue; // the last column of a decision is its date
    for (const m of (r[3] ?? "").matchAll(/(?<![\d-])(\d{2})(?![\d-])/g)) {
      const n = Number(m[1]);
      if (n >= 13 && n <= 37 && !dioramaPlates.has(n)) problems.push(`${r[0]}: plate ${n} is not in diorama.md §15`);
      if (n === 38 && !/\(38\)/.test(lab)) problems.push(`${r[0]}: plate 38 is not in lab/README.md`);
      if (n > 38) problems.push(`${r[0]}: plate ${n} does not exist`);
    }
  }
  assert.deepEqual(problems, []);
});

/* the hub and the links --------------------------------------------------------------------------------------- */

test("the hub lists every document of the system", () => {
  for (const name of SYSTEM.filter((n) => n !== "README.md")) assert.ok(TEXTS["README.md"].includes(`](${name})`), `README.md does not link ${name}`);
  assert.ok(TEXTS["README.md"].includes("](lab/README.md)"), "README.md does not link the lab");
  assert.ok(existsSync(path.join(hub, "lab", "README.md")));
});

test("the stage documents link only to files that exist", () => {
  const broken = [];
  const check = (dir, name, text) => {
    for (const m of text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
      if (/^(https?:|mailto:)/.test(m[1])) continue;
      if (!existsSync(path.join(dir, m[1]))) broken.push(`${name}: ${m[1]}`);
    }
  };
  for (const name of SYSTEM) check(hub, name, TEXTS[name]);
  check(design, "theatre-of-the-mind-staging.md", readFileSync(path.join(design, "theatre-of-the-mind-staging.md"), "utf8"));
  check(path.join(hub, "lab"), "lab/README.md", readFileSync(path.join(hub, "lab", "README.md"), "utf8"));
  assert.deepEqual(broken, []);
});

test("the old paths are gone, and nothing in the system points at them", () => {
  for (const old of ["stagecraft.md", "diorama.md", "scene-requirements.md", "situation-scenes.md"]) {
    assert.ok(!existsSync(path.join(design, old)), `design/${old} should have moved into design/stagecraft/`);
  }
  assert.ok(!existsSync(path.join(design, "mockups", "stagecraft")), "design/mockups/stagecraft/ should have moved to design/stagecraft/lab/");
  const stale = [];
  for (const name of SYSTEM) {
    for (const m of TEXTS[name].matchAll(/design\/(stagecraft\.md|diorama\.md|scene-requirements\.md|mockups\/stagecraft)/g)) stale.push(`${name}: ${m[0]}`);
  }
  assert.deepEqual(stale.filter((s) => !s.startsWith("README.md")), [], "README.md may name the old paths, in its table of where things used to be");
});

/* words ------------------------------------------------------------------------------------------------------ */

test("the documents say 'card' for a person on the stage, and 'frame' only for the code, the machines and drawing", () => {
  const allowed = [
    // the code and the machines
    "`bi-frame`", "`.bi-frame`", "`templates/stage/frame.hbs`", 'still says "frame"', "The code still says `frame`",
    '"Frame" is kept for the machines', '"Frame" for the machines', 'the old "frame"', 'old "character frame"',
    // the drawing sense
    "frame by frame", "keyframes", "60 frames a second", "compresses for a frame and recovers", "frame time", "frame rate",
    "ms a frame", "ms/frame", "per frame", "every frame", "each frame", "60-frame", "16-frame", "150 frames", "drawn frame",
    "white frame", "corner of a frame", "frame-guard", "frame budget", "frames per second", "(frame time, per frame)", '"Frame" is used here', '"Frame" appears only'
  ];
  const offenders = [];
  for (const name of SYSTEM) {
    TEXTS[name].split("\n").forEach((line, i) => {
      if (line.trimStart().startsWith(">")) return; // her own words are quoted exactly
      let rest = line;
      for (const a of allowed) rest = rest.split(a).join("");
      if (/\bframes?\b/i.test(rest)) offenders.push(`${name}:${i + 1}: ${line.slice(0, 110)}`);
    });
  }
  assert.deepEqual(offenders, []);
});

/* the Foundry source renderer.md cites ------------------------------------------------------------------------ */

const foundry = path.join(root, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
const FOUNDRY = existsSync(foundry);

test("the Foundry v14 source lines renderer.md cites are still those lines", { skip: FOUNDRY ? false : "the local Foundry tree is not present" }, () => {
  const client = path.join(foundry, "client");
  const claims = [
    ["canvas/board.mjs", 791, /new PIXI\.Application/],
    ["canvas/board.mjs", 759, /canvasConfig/],
    ["canvas/board.mjs", 660, /noCanvas/],
    ["canvas/board.mjs", 1158, /display = "block"/],
    ["canvas/board.mjs", 1168, /_onInit/],
    ["canvas/board.mjs", 1212, /_onDraw/],
    ["canvas/board.mjs", 1242, /_onReady/],
    ["canvas/board.mjs", 1345, /_onTearDown/],
    ["canvas/board.mjs", 1400, /getSceneManager/],
    ["canvas/board.mjs", 970, /performanceMode/],
    ["config.mjs", 1083, /managedScenes/],
    ["game.mjs", 740, /"setup"/],
    ["game.mjs", 763, /initializeCanvas/],
    ["game.mjs", 779, /"ready"/],
    ["game.mjs", 1209, /noCanvas/],
    ["documents/scene.mjs", 267, /noCanvas/]
  ];
  const wrong = [];
  const cache = {};
  for (const [file, line, re] of claims) {
    const lines = (cache[file] ??= readFileSync(path.join(client, file), "utf8").split("\n"));
    if (!re.test(lines[line - 1] ?? "")) wrong.push(`${file}:${line} no longer matches ${re} ("${(lines[line - 1] ?? "").trim().slice(0, 70)}")`);
    // and the document really cites it
  }
  // outside client/: the PIXI version and the layer the canvas sits on
  const pkg = readFileSync(path.join(foundry, "package.json"), "utf8").split("\n");
  if (!/"pixi\.js": "7\.4\.3"/.test(pkg[62] ?? "")) wrong.push(`package.json:63 is no longer pixi.js 7.4.3 ("${(pkg[62] ?? "").trim()}")`);
  const css = readFileSync(path.join(foundry, "public", "css", "foundry2.css"), "utf8").split("\n");
  if (!/z-index-canvas/.test(css[15412] ?? "")) wrong.push(`foundry2.css:15413 is no longer the canvas layer ("${(css[15412] ?? "").trim()}")`);
  assert.deepEqual(wrong, [], "Foundry changed: refresh the line numbers in renderer.md §3 and §7");
  const doc = TEXTS["renderer.md"];
  for (const needle of ["board.mjs:791", "config.mjs:1083", "board.mjs:1400", "game.mjs:1209", "package.json:63", "foundry2.css:15413"]) assert.ok(doc.includes(needle), `renderer.md no longer cites ${needle}`);
  // the SceneManager really has the calls the plan relies on
  const manager = readFileSync(path.join(client, "canvas", "scene-manager.mjs"), "utf8");
  for (const call of ["_onInit", "_loadTextures", "_onDraw", "_onReady", "_onTearDown", "_registerHooks"]) assert.ok(manager.includes(call), `SceneManager has no ${call}`);
});

test("the sf2e lines renderer.md cites are still those lines", { skip: existsSync(path.join(root, "gamesystems", "sf2e", "sf2e.mjs")) ? false : "the local sf2e tree is not present" }, () => {
  const lines = readFileSync(path.join(root, "gamesystems", "sf2e", "sf2e.mjs"), "utf8").split("\n");
  assert.match(lines[9890], /controlled\.length === 0/, "sf2e.mjs:9891");
  assert.match(lines[55114], /game\.user\.character/, "sf2e.mjs:55115");
  const all = lines.join("\n");
  assert.equal((all.match(/canvas\.tokens/g) ?? []).length >= 30, true, "the system still leans on canvas.tokens");
});
