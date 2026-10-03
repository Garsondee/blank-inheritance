// The boundary between Stagecraft and the adventure (design/stagecraft/module.md §3).
//
// Stagecraft is a module of its own that happens to work 100% with Blank Inheritance. For that to stay true it must
// never learn the adventure's name, and the adventure must reach it from one place. These checks hold the rules:
//   rule 1  nothing Stagecraft owns names the campaign
//   rule 2  the pure core touches no Foundry global, no DOM, no three.js, and imports nothing outside itself
//   rule 3  the adventure reaches Stagecraft only through one bridge file
//   rule 4  the lab (the sketchbook) holds no second copy of a core file: only one-line shims
//   rule 5  the module folder carries its public contract

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lab = path.join(root, "design", "stagecraft", "lab");
const moduleDir = path.join(root, "module", "stagecraft");
const coreDir = path.join(moduleDir, "scripts", "core");
const adventureDir = path.join(root, "module", "blank-inheritance");

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);
const walk = (dir, accept) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, accept));
    else if (accept(full)) out.push(full);
  }
  return out;
};

/** Words that belong to the campaign. A module meant for strangers may not contain them, comments included. */
// (The author's name belongs in the manifest's `authors`, so it is not on this list.)
const CAMPAIGN = [/blank[- ]inheritance/i, /\bDirectorate\b/, /\bKuuhaku\b/, /\bWatcher\b/, /\bMitflit/i, /\bClaimant/i, /--bi-/, /\bbi-[a-z]/];

/** What the pure core may not touch: Foundry, the page, the network, the clock, three.js. */
const IMPURE = [
  [/\bgame\./, "Foundry's game"], [/\bcanvas\./, "Foundry's canvas"], [/\bui\./, "Foundry's ui"], [/\bHooks\b/, "Foundry's Hooks"],
  [/\bfoundry\./, "the foundry namespace"], [/\bdocument\./, "the DOM"], [/\bwindow\./, "the window"], [/\bnavigator\b/, "the navigator"],
  [/\blocalStorage\b/, "browser storage"], [/\bTHREE\b/, "three.js"], [/from\s+["']three/, "three.js"], [/\brequestAnimationFrame\b/, "the display clock"],
  [/\bfetch\(/, "the network"], [/\bnew (Image|Audio)\b/, "the DOM"]
];

const files = (list) => list.map((f) => ({ file: f, text: readFileSync(f, "utf8") }));
const rel = (f) => path.relative(root, f).replaceAll("\\", "/");

const core = existsSync(coreDir) ? files(walk(coreDir, (f) => f.endsWith(".mjs"))) : [];
const moduleText = existsSync(moduleDir) ? files(walk(moduleDir, (f) => /\.(mjs|js|json|hbs|css|md)$/.test(f) && !f.endsWith("package-lock.json"))) : [];

/** The six files that began in the lab and now live in the module's core. */
const MOVED = ["puppets", "diorama", "blocking", "flourish", "blueprint", "emotes"];

test("the module's core exists and holds what moved out of the lab", () => {
  for (const name of MOVED) assert.ok(existsSync(path.join(coreDir, `${name}.mjs`)), `core/${name}.mjs is missing`);
});

test("rule 1: nothing Stagecraft owns names the campaign", () => {
  const problems = [];
  for (const { file, text } of moduleText) {
    text.split("\n").forEach((line, i) => {
      for (const re of CAMPAIGN) if (re.test(line)) problems.push(`${rel(file)}:${i + 1}: ${re} in "${line.trim().slice(0, 80)}"`);
    });
  }
  assert.deepEqual(problems, []);
});

test("rule 2: the pure core touches no Foundry global, no DOM and no three.js", () => {
  const problems = [];
  for (const { file, text } of core) {
    // Strip comments: a comment may say "the DOM" in the course of explaining why the file does not touch it.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, "$1");
    code.split("\n").forEach((line, i) => {
      for (const [re, what] of IMPURE) if (re.test(line)) problems.push(`${rel(file)}:${i + 1}: touches ${what}: "${line.trim().slice(0, 80)}"`);
    });
  }
  assert.deepEqual(problems, []);
});

test("rule 2: the pure core imports only its own siblings", () => {
  const problems = [];
  for (const { file, text } of core) {
    for (const m of text.matchAll(/^\s*(?:import|export)\b[^;]*?from\s+["']([^"']+)["']/gm)) {
      if (!/^\.\/[\w.-]+\.mjs$/.test(m[1])) problems.push(`${rel(file)}: imports ${m[1]}`);
    }
  }
  assert.deepEqual(problems, []);
});

test("rule 3: the adventure reaches Stagecraft only through the bridge", () => {
  const bridge = path.join("scripts", "foundry", "stagecraft-bridge.mjs").replaceAll("\\", "/");
  const offenders = [];
  for (const file of walk(adventureDir, (f) => /\.(mjs|js)$/.test(f) && !f.includes(`${path.sep}assets${path.sep}`))) {
    const text = readFileSync(file, "utf8");
    const mentions = /module\/stagecraft|modules\/stagecraft|game\.modules\.get\(\s*["']stagecraft["']\s*\)|["']stagecraft["']/.test(text);
    // the bridge is one file in two halves (a pure one in core/, the one that touches Foundry), with its small gate and its skin:
    // every file of it is named stagecraft-*.mjs, and nothing else in the adventure may mention the module
    if (mentions && !path.basename(file).startsWith("stagecraft-")) offenders.push(rel(file));
  }
  assert.ok(existsSync(path.join(adventureDir, bridge)), "the bridge file exists");
  assert.deepEqual(offenders, [], "only the bridge (stagecraft-*.mjs) may mention the Stagecraft module");
});

test("rule 4: the lab holds no second copy of a core file, only one-line shims", () => {
  for (const name of MOVED) {
    const text = readFileSync(path.join(lab, `${name}.mjs`), "utf8");
    const code = text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("//"));
    assert.deepEqual(code, [`export * from "../../../module/stagecraft/scripts/core/${name}.mjs";`], `lab/${name}.mjs must only re-export the module's core`);
  }
});

test("rule 5: the module folder carries the public contract", () => {
  for (const f of ["module.json", "package.json", "API.md", "api.schema.json", "LICENSE", "README.md"]) {
    assert.ok(existsSync(path.join(moduleDir, f)), `module/stagecraft/${f} is missing`);
  }
  const manifest = JSON.parse(readFileSync(path.join(moduleDir, "module.json"), "utf8"));
  assert.equal(manifest.id, "stagecraft", "the manifest id must equal the directory name (Foundry rejects a module otherwise)");
  assert.equal(path.basename(moduleDir), manifest.id);
  assert.ok(manifest.esmodules?.length, "the manifest must name an esmodule");
  for (const p of [...manifest.esmodules, ...(manifest.styles ?? [])]) assert.ok(existsSync(path.join(moduleDir, p)), `the manifest names ${p}, which does not exist (Foundry would reject the whole module)`);
});
