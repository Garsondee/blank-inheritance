// The public interface is a contract (module.md §3, rule 4): what scripts/api.mjs returns, and the hooks the module
// raises, must be exactly what api.schema.json and API.md say. Adding, renaming or removing anything is a deliberate act.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApi, API_VERSION } from "../scripts/api.mjs";
import { SkinRegistry } from "../scripts/skins/registry.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(path.join(root, "api.schema.json"), "utf8"));
const docs = readFileSync(path.join(root, "API.md"), "utf8");
const api = createApi({ skins: new SkinRegistry(), current: { host: null } });

const sources = [];
const walk = (dir) => { for (const n of readdirSync(dir)) { const f = path.join(dir, n); if (statSync(f).isDirectory()) walk(f); else if (f.endsWith(".mjs")) sources.push([f, readFileSync(f, "utf8")]); } };
walk(path.join(root, "scripts"));

test("the api has exactly the members the schema lists", () => {
  assert.deepEqual(Object.keys(api).sort(), Object.keys(schema.api).sort());
  for (const [key, shape] of Object.entries(schema.api)) {
    if (Array.isArray(shape)) assert.deepEqual(Object.keys(api[key]).sort(), [...shape].sort(), `api.${key}`);
    else if (shape === "function") assert.equal(typeof api[key], "function", key);
    else if (shape === "array") assert.ok(Array.isArray(api[key]), key);
    else assert.equal(typeof api[key], shape, key);
  }
});

test("the version in the code, the schema and the manifest agree", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "module.json"), "utf8"));
  assert.equal(api.version, API_VERSION);
  assert.equal(schema.version, API_VERSION);
  assert.equal(manifest.version.split(".")[0], API_VERSION.split(".")[0], "the manifest and the interface share a major version");
});

test("the hooks the code raises are exactly the hooks the schema lists", () => {
  const raised = new Set();
  for (const [, text] of sources) {
    for (const m of text.matchAll(/Hooks\.callAll\(\s*["'](stagecraft\.[A-Za-z]+)["']/g)) raised.add(m[1]);
  }
  // the host raises one hook per engine event: `stagecraft.${e.type}`
  const stage = sources.find(([f]) => f.endsWith(path.join("core", "stage.mjs")))[1];
  for (const m of stage.matchAll(/events\.push\(\{\s*type:\s*"([a-z]+)"/g)) raised.add(`stagecraft.${m[1]}`);
  for (const m of stage.matchAll(/const result = \{ type: "([a-z]+)"/g)) raised.add(`stagecraft.${m[1]}`);
  const zones = sources.find(([f]) => f.endsWith(path.join("core", "zones.mjs")))[1];
  for (const m of zones.matchAll(/type:\s*"([a-z]+)"/g)) raised.add(`stagecraft.${m[1]}`);
  const bonk = stage.match(/const bonk = \{ type: "([a-z]+)"/);
  if (bonk) raised.add(`stagecraft.${bonk[1]}`);
  assert.deepEqual([...raised].sort(), [...schema.hooks].sort());
});

test("API.md documents every member and every hook", () => {
  for (const key of Object.keys(schema.api)) assert.ok(docs.includes(`api.${key}`), `API.md does not mention api.${key}`);
  for (const [group, members] of Object.entries(schema.api)) if (Array.isArray(members)) for (const m of members) assert.ok(docs.includes(`api.${group}.${m}`), `API.md does not mention api.${group}.${m}`);
  for (const hook of schema.hooks) assert.ok(docs.includes(`\`${hook}\``), `API.md does not mention ${hook}`);
});

test("a skin registered through the api is the skin that can be chosen", () => {
  const skins = new SkinRegistry();
  const a = createApi({ skins, current: { host: null } });
  assert.deepEqual(a.skins.list(), ["paper"]);
  a.skins.register({ id: "mine", size: { w: 100, h: 160 }, face: async () => null, back: async () => null });
  assert.deepEqual(a.skins.list().sort(), ["mine", "paper"]);
  a.skins.use("mine");
  assert.equal(skins.get().id, "mine");
  assert.equal(skins.get("nonexistent").id, "mine", "an unknown skin falls back to the table's choice");
  assert.throws(() => a.skins.use("nope"), /no skin/);
  assert.throws(() => a.skins.register({ id: "bad" }), /needs/);
  assert.throws(() => a.skins.register({ id: "bad", size: { w: 0, h: 0 }, face() {}, back() {} }), /size/);
});

test("api.stage() is null when no stage is on screen", () => {
  assert.equal(api.stage(), null);
});

test("the scene helpers work on plain objects", () => {
  assert.equal(api.scenes.isStage({ flags: { stagecraft: { stage: { painting: {} } } } }), true);
  assert.equal(api.scenes.isStage({ flags: {} }), false);
  assert.equal(api.scenes.validate({}).usable, false);
});
