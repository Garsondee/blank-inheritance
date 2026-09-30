// Tests tools/module-sync/preflight.mjs -- the checks that refuse to push a
// module Foundry could not load.
//
// Written 2026-09-27, the day a subset push left module.json naming
// styles/bi-agreement.css on the server without the stylesheet itself: the
// next world launch rejected the whole module, and every macro failed with
// "Cannot read properties of undefined (reading 'api')". The first test below
// is that exact situation.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkImports,
  checkLanguages,
  checkManifest,
  checkSceneArt,
  checkSyntax,
  checkTemplates,
  importSpecifiers,
  runPreflight
} from "../../tools/module-sync/preflight.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const realModuleDir = path.resolve(here, "..", "..", "module", "blank-inheritance");
const realSceneSet = JSON.parse(readFileSync(path.resolve(here, "..", "..", "data", "campaign", "scene-set.json"), "utf8"));

/** A minimal, loadable module tree under <tmp>/blank-inheritance, plus overrides. */
async function moduleTree(files = {}, { dirName = "blank-inheritance" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "bi-preflight-"));
  const moduleDir = path.join(root, dirName);
  const defaults = {
    "module.json": JSON.stringify({
      id: "blank-inheritance",
      esmodules: ["scripts/main.mjs"],
      styles: ["styles/a.css"],
      languages: [{ lang: "en", name: "English", path: "lang/en.json" }]
    }),
    "scripts/main.mjs": 'import { helper } from "./core/helper.mjs";\nexport const x = helper();\n',
    "scripts/core/helper.mjs": "export function helper() { return 1; }\n",
    "styles/a.css": "body {}\n",
    "lang/en.json": "{}\n"
  };
  for (const [relative, content] of Object.entries({ ...defaults, ...files })) {
    if (content === null) continue; // an override of null deletes a default
    const file = path.join(moduleDir, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return { root, moduleDir, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test("preflight: a manifest naming a stylesheet that is not there is an ERROR (the 2026-09-27 incident)", async () => {
  const tree = await moduleTree({
    "module.json": JSON.stringify({ id: "blank-inheritance", esmodules: ["scripts/main.mjs"], styles: ["styles/a.css", "styles/bi-agreement.css"] })
  });
  try {
    const { errors } = checkManifest(tree.moduleDir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /styles\/bi-agreement\.css/);
    assert.match(errors[0], /refuse to load/);
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a clean tree passes every check, syntax included", async () => {
  const tree = await moduleTree();
  try {
    const result = await runPreflight({ moduleDir: tree.moduleDir, syntax: true });
    assert.deepEqual(result, { errors: [], warnings: [] });
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a manifest id that does not match its directory is an error (Foundry rejects it outright)", async () => {
  const tree = await moduleTree({}, { dirName: "mythica-machina-blank-inheritance" });
  try {
    const { errors } = checkManifest(tree.moduleDir);
    assert.ok(errors.some((e) => /does not match its directory/.test(e)), errors.join("\n"));
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a manifest that does not parse is an error, not a crash", async () => {
  const tree = await moduleTree({ "module.json": "{ not json" });
  try {
    const { errors, manifest } = checkManifest(tree.moduleDir);
    assert.equal(manifest, null);
    assert.match(errors[0], /does not parse/);
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a relative import of a file that does not exist is an error", async () => {
  const tree = await moduleTree({ "scripts/main.mjs": 'import { gone } from "./core/deleted.mjs";\n' });
  try {
    const errors = checkImports(tree.moduleDir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /scripts\/main\.mjs imports "\.\/core\/deleted\.mjs"/);
  } finally {
    await tree.cleanup();
  }
});

test("preflight: dynamic imports and re-exports are checked too", async () => {
  const tree = await moduleTree({
    "scripts/main.mjs": 'export { helper } from "./core/helper.mjs";\nexport * from "./core/missing-a.mjs";\nconst later = () => import("./core/missing-b.mjs");\n'
  });
  try {
    const errors = checkImports(tree.moduleDir);
    assert.equal(errors.length, 2, errors.join("\n"));
    assert.ok(errors.some((e) => e.includes("missing-a.mjs")));
    assert.ok(errors.some((e) => e.includes("missing-b.mjs")));
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a bare specifier is an error -- the browser has no import map to resolve it", async () => {
  const tree = await moduleTree({ "scripts/main.mjs": 'import _ from "lodash";\n' });
  try {
    const errors = checkImports(tree.moduleDir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /bare specifier "lodash"/);
  } finally {
    await tree.cleanup();
  }
});

test("preflight: an import inside a comment is not reported, and a glob inside a string is not taken for a comment", async () => {
  const tree = await moduleTree({
    "scripts/main.mjs": [
      "// import { old } from \"./core/removed.mjs\";",
      "/* import { older } from \"./core/removed-too.mjs\"; */",
      'const glob = "data/**/*.json";',
      'import { helper } from "./core/helper.mjs";',
      "export const y = helper();",
      ""
    ].join("\n")
  });
  try {
    assert.deepEqual(checkImports(tree.moduleDir), []);
    assert.deepEqual(importSpecifiers(readFileSync(path.join(tree.moduleDir, "scripts/main.mjs"), "utf8")), ["./core/helper.mjs"]);
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a literal template path that does not exist is an error; one that exists is fine", async () => {
  const tree = await moduleTree({
    "scripts/main.mjs": 'const a = "modules/blank-inheritance/templates/panel.hbs";\nconst b = "modules/blank-inheritance/templates/gone.hbs";\n',
    "templates/panel.hbs": "<div></div>\n"
  });
  try {
    const errors = checkTemplates(tree.moduleDir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /templates\/gone\.hbs/);
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a language file that does not parse is an error", async () => {
  const tree = await moduleTree({ "lang/en.json": '{ "A": "b", }' });
  try {
    const { manifest } = checkManifest(tree.moduleDir);
    const errors = checkLanguages(tree.moduleDir, manifest);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /lang\/en\.json does not parse/);
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a script with a syntax error is an error", async () => {
  const tree = await moduleTree({ "scripts/core/helper.mjs": "export function helper( { return 1; }\n" });
  try {
    const errors = await checkSyntax(tree.moduleDir);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /scripts\/core\/helper\.mjs does not parse/);
  } finally {
    await tree.cleanup();
  }
});

test("preflight: a scene with no picture is a WARNING, not an error, and the adopted hub is exempt", async () => {
  const tree = await moduleTree({ "assets/scenes/has-art.webp": "x" });
  try {
    const sceneSet = {
      scenes: [
        { id: "fine", art: "has-art" },
        { id: "black", art: "no-art" },
        { id: "the-city", art: "campaign-map", adoptSceneNamed: "Campaign Map" }
      ]
    };
    assert.deepEqual(checkSceneArt(tree.moduleDir, sceneSet), [
      'scene "black" has no picture: assets/scenes/no-art.webp is missing, so it will build black'
    ]);
    const { errors, warnings } = await runPreflight({ moduleDir: tree.moduleDir, sceneSet, syntax: false });
    assert.deepEqual(errors, []);
    assert.equal(warnings.length, 1);
  } finally {
    await tree.cleanup();
  }
});

// The real module, every time the suite runs: a module.json entry added
// without its file, or an import of a file since deleted, fails here before it
// can ever reach the server.
test("preflight: the REAL module tree passes (manifest, imports, templates, languages)", () => {
  const { errors, manifest } = checkManifest(realModuleDir);
  assert.deepEqual(errors, []);
  assert.deepEqual(checkImports(realModuleDir), []);
  assert.deepEqual(checkTemplates(realModuleDir), []);
  assert.deepEqual(checkLanguages(realModuleDir, manifest), []);
});

test("preflight: every scene in the REAL scene set has its picture in the module", () => {
  assert.deepEqual(checkSceneArt(realModuleDir, realSceneSet), []);
});
