// Every piece of words the module shows comes from lang/en.json, and Foundry reads that file in a particular way: it
// EXPANDS dotted keys into nested objects and looks a string up with getProperty. A key that is both a string and the
// start of another key (say "Freeze" and "Freeze.Tip") silently loses one of them and the player sees the raw key.
// These tests find that kind of mistake before a player does.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lang = JSON.parse(readFileSync(join(root, "lang", "en.json"), "utf8"));

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : path.endsWith(".mjs") ? [path] : [];
});
const sources = walk(join(root, "scripts")).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const bar = readFileSync(join(root, "scripts", "foundry", "bar.mjs"), "utf8");

const lookup = (key) => key.split(".").reduce((at, part) => (at && typeof at === "object" ? at[part] : undefined), lang);
const leaves = (object, prefix = "") => Object.entries(object).flatMap(([k, v]) => (typeof v === "object" ? leaves(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

// the three ways the code names a word
const WRITTEN = /["'](STAGECRAFT\.[A-Za-z0-9_.]+)["']/g;                 // "STAGECRAFT.Notify.Failed"
const BUILT = /`(STAGECRAFT\.[A-Za-z0-9_.]*?)\.?\$\{/g;                  // `STAGECRAFT.Keys.${action}`
const BAR_WRITTEN = /\bt\("([A-Za-z0-9_.]+)"/g;                          // t("Freeze.Label"), the bar's own helper
const BAR_BUILT = /\bt\(`([A-Za-z0-9_.]*?)\.?\$\{/g;                     // t(`Mode.${mode}`)

test("no key in the language file contains a dot, and every value is a string or a group", () => {
  const bad = [];
  const check = (object, path) => {
    for (const [k, v] of Object.entries(object)) {
      if (k.includes(".")) bad.push(`${path}${k}`);
      if (typeof v === "object" && v !== null) check(v, `${path}${k}.`);
      else if (typeof v !== "string") bad.push(`${path}${k} is not a string`);
    }
  };
  check(lang, "");
  assert.deepEqual(bad, []);
});

test("every STAGECRAFT key written out in the code is a string in the language file", () => {
  const missing = [];
  for (const { path, text } of sources) {
    for (const m of text.matchAll(WRITTEN)) {
      if (typeof lookup(m[1]) !== "string") missing.push(`${path.slice(root.length)}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("keys built from a name (STAGECRAFT.Keys.${action}) lead to a group of nothing but words", () => {
  const bad = [];
  for (const { path, text } of sources) {
    if (path.endsWith("bar.mjs")) continue;       // the bar's helper builds from any path; its own test covers it
    for (const m of text.matchAll(BUILT)) {
      const group = lookup(m[1]);
      if (!group || typeof group !== "object") bad.push(`${path.slice(root.length)}: ${m[1]} is not a group`);
      else if (!Object.values(group).every((v) => typeof v === "string")) bad.push(`${path.slice(root.length)}: ${m[1]} holds more than strings`);
    }
  }
  assert.deepEqual(bad, []);
});

test("every word the stage bar asks for exists", () => {
  const asked = [...bar.matchAll(BAR_WRITTEN)].map((m) => m[1]);
  assert.ok(asked.length >= 10, "the bar asks for its words through t()");
  assert.deepEqual(asked.filter((k) => typeof lookup(`STAGECRAFT.Bar.${k}`) !== "string"), []);
  // and the ones built from the chalk mode: off, zones, anywhere
  for (const mode of ["off", "zones", "anywhere"]) assert.equal(typeof lookup(`STAGECRAFT.Bar.Mode.${mode}`), "string");
});

test("no words are left unused in the language file", () => {
  const used = new Set();
  const groups = new Set();                       // a group reached through a built key counts all of its words as used
  for (const { text } of sources) {
    for (const m of text.matchAll(WRITTEN)) used.add(m[1]);
    for (const m of text.matchAll(BUILT)) groups.add(m[1]);
  }
  for (const m of bar.matchAll(BAR_WRITTEN)) used.add(`STAGECRAFT.Bar.${m[1]}`);
  for (const m of bar.matchAll(BAR_BUILT)) groups.add(`STAGECRAFT.Bar.${m[1]}`);
  const unused = leaves(lang.STAGECRAFT, "STAGECRAFT.").filter((key) => !used.has(key) && ![...groups].some((g) => key.startsWith(`${g}.`)));
  assert.deepEqual(unused, []);
});
