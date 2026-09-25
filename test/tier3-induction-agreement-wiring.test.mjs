// FORM 1-B wiring in the live module (design/induction-agreement.md): the terminal shows the agreement
// second, once, only when the world setting is on (default off while the text is drafted), the only way
// on is I Agree, the signature is recorded on the Actor, and every string and stylesheet it needs exists.
// Source-level checks, same approach as the other tier3 contract tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOD = path.join(ROOT, "module/blank-inheritance");
// Normalised to LF: some module files are CRLF on this machine, and the regexes below read lines.
const read = (rel) => fs.readFileSync(path.join(MOD, rel), "utf8").replace(/\r\n/g, "\n");
const terminal = read("scripts/foundry/induction-terminal.mjs");
const template = read("templates/induction/page1b-agreement.hbs");

test("the agreement is a named page, slotted in second without renumbering the nine", () => {
  assert.match(terminal, /pageagreement:\s*{\s*template:\s*`\$\{TEMPLATE_ROOT\}\/page1b-agreement\.hbs`/);
  for (let n = 1; n <= 9; n++) assert.match(terminal, new RegExp(`page${n}:\\s*{`), `page${n} is still declared`);
  const flow = read("scripts/core/induction-flow.mjs");
  assert.match(flow, /\[1, "Orientation"\], \["agreement", "Agreement"\], \[2, "Ancestry"\]/);
  assert.match(terminal, /stepOrder\(\{ agreement: agreementPageEnabled\(\) \}\)/, "the agreement step shows only when the setting is on");
});

test("Begin goes to the agreement only when it's switched on and not yet signed; signing is the way on", () => {
  assert.match(terminal, /static async #onBegin[\s\S]{0,300}this\.state\.page = agreementPageEnabled\(\) && !this\.state\.agreement\.signed \? "agreement" : 2;/);
  const sign = terminal.match(/static async #onSignAgreement[\s\S]*?\n  }\n/)?.[0] ?? "";
  assert.match(sign, /signed: true/);
  assert.match(sign, /this\.state\.page = 2;/);
  assert.match(terminal, /signAgreement: InductionTerminal\.#onSignAgreement/);
  assert.match(terminal, /backFromAgreement: InductionTerminal\.#onBackFromAgreement/);
  assert.doesNotMatch(template, /data-action="(decline|refuse|skip)/i, "no way on without signing");
});

test("the default state carries the agreement, and the class field and the reset both use it", () => {
  // One definition since the 2026-09-25 UI pass (freshInductionState); it used to be two hand-synced copies.
  const literals = terminal.match(/agreement: \{ signed: false, signedAt: null, secondsOnPage: null, furthestRead: null \}/g) ?? [];
  assert.equal(literals.length, 1);
  assert.match(terminal, /\n  state = freshInductionState\(\);/);
  assert.match(terminal, /active\.state = freshInductionState\(\);/);
});

test("the setting is world-scoped, visible to the GM, and OFF by default", () => {
  const reg = terminal.match(/export function registerInductionSettings\(\)[\s\S]*?\n}\n/)?.[0] ?? "";
  assert.match(reg, /scope: "world"/);
  assert.match(reg, /config: true/);
  assert.match(reg, /type: Boolean/);
  assert.match(reg, /default: false/);
  assert.match(read("scripts/blank-inheritance.mjs"), /\n\s*registerInductionSettings\(\);/);
});

test("the signature lands on the new Actor", () => {
  assert.match(terminal, /if \(this\.state\.agreement\.signed\) await actor\.setFlag\(MODULE_ID, "agreement"/);
});

test("the stylesheet is registered and every string the page uses exists", () => {
  const manifest = JSON.parse(read("module.json"));
  assert.ok(manifest.styles.includes("styles/bi-agreement.css"));
  assert.ok(fs.existsSync(path.join(MOD, "styles/bi-agreement.css")));
  const lang = JSON.parse(read("lang/en.json"));
  const keys = new Set([...template.matchAll(/BLANKINHERITANCE\.Induction\.Agreement\.(\w+)/g), ...terminal.matchAll(/BLANKINHERITANCE\.Induction\.Agreement\.(\w+)/g)].map((m) => m[1]));
  assert.ok(keys.size >= 8);
  for (const k of keys) assert.equal(typeof lang.BLANKINHERITANCE.Induction.Agreement[k], "string", `missing lang key Agreement.${k}`);
  assert.match(lang.BLANKINHERITANCE.Induction.Agreement.ReadingTime, /\{time\}/);
});

test("the shipped asset exists where the viewer fetches it", () => {
  const view = read("scripts/foundry/induction-agreement-view.mjs");
  const rel = view.match(/AGREEMENT_ASSET = "([^"]+)"/)?.[1];
  assert.ok(rel && fs.existsSync(path.join(MOD, rel)), `missing ${rel}`);
});
