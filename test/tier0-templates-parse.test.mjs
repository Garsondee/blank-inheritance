// Tier 0 — every module template parses with the real Handlebars that Foundry ships.
//
// Found live 2026-09-29: a rumour line written `{{this.true}}` is a syntax error in Handlebars
// ("true" is a literal, not a property name), and a template that fails to parse takes the whole
// window with it: the Scene Runner rendered nothing, on every scene. Every other test passed,
// because nothing here had ever compiled a template. This parses each one with Foundry's own copy,
// so a template that cannot render fails here instead of on the server.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const handlebarsPath = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "node_modules", "handlebars");
const templatesRoot = path.join(repoRoot, "module", "blank-inheritance", "templates");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (name.endsWith(".hbs")) yield full;
  }
}

test("every template parses with Foundry's own Handlebars", (t) => {
  if (!existsSync(handlebarsPath)) {
    t.skip("the local Foundry tree (gitignored) is not here");
    return;
  }
  const Handlebars = createRequire(import.meta.url)(handlebarsPath);
  let count = 0;
  for (const file of walk(templatesRoot)) {
    const source = readFileSync(file, "utf8");
    try {
      Handlebars.parse(source);
    } catch (err) {
      assert.fail(`${path.relative(repoRoot, file)} does not parse: ${err.message}`);
    }
    count++;
  }
  assert.ok(count > 20, `expected the module's templates, found ${count}`);
});

test("the parser really rejects the bug that prompted this test", (t) => {
  if (!existsSync(handlebarsPath)) {
    t.skip("the local Foundry tree (gitignored) is not here");
    return;
  }
  const Handlebars = createRequire(import.meta.url)(handlebarsPath);
  assert.throws(() => Handlebars.parse('<li data-true="{{this.true}}"></li>'));
});
