// Tier 3 -- a stylesheet the manifest has not loaded yet (foundry/late-style.mjs), and the Location Editor asking for its own.
//
// Foundry reads module.json's `styles` only when a world launches. A deploy that adds a stylesheet to the manifest therefore puts the file on the server but not on
// the GM's page until the world is relaunched; the editor's new tabs would be unstyled until then. The editor asks for its own stylesheet when it renders.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureStylesheet } from "../module/blank-inheritance/scripts/foundry/late-style.mjs";

const moduleRoot = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "module", "blank-inheritance");

/** The little of a document the helper touches. */
function fakeDoc(hrefs = []) {
  const links = hrefs.map((href) => ({ getAttribute: () => href }));
  const added = [];
  return {
    added,
    head: { append: (el) => { added.push(el); links.push({ getAttribute: (n) => (n === "href" ? el.href : null) }); } },
    querySelectorAll: (selector) => (selector === 'link[rel="stylesheet"]' ? links : []),
    createElement: (tag) => ({ tag })
  };
}

test("a stylesheet that is not on the page is added, once, with the module's route", () => {
  const doc = fakeDoc(["/modules/blank-inheritance/styles/bi-components.css"]);
  assert.equal(ensureStylesheet("styles/bi-journeys.css", { doc, route: (p) => `/prefix/${p}` }), true);
  assert.equal(doc.added.length, 1);
  assert.deepEqual([doc.added[0].tag, doc.added[0].rel, doc.added[0].href], ["link", "stylesheet", "/prefix/modules/blank-inheritance/styles/bi-journeys.css"]);
  assert.equal(ensureStylesheet("styles/bi-journeys.css", { doc, route: (p) => `/prefix/${p}` }), false, "the second time it is already there");
  assert.equal(doc.added.length, 1);
});

test("a stylesheet the manifest already loaded is left alone, however the page spells its address", () => {
  for (const href of ["/modules/blank-inheritance/styles/bi-journeys.css", "https://example.test/foundry/modules/blank-inheritance/styles/bi-journeys.css?v=3"]) {
    const doc = fakeDoc([href]);
    assert.equal(ensureStylesheet("styles/bi-journeys.css", { doc }), false, href);
    assert.equal(doc.added.length, 0);
  }
});

test("without a route helper it falls back to the site root; with no document it does nothing", () => {
  const doc = fakeDoc();
  assert.equal(ensureStylesheet("styles/bi-journeys.css", { doc, route: undefined }), true);
  assert.equal(doc.added[0].href, "/modules/blank-inheritance/styles/bi-journeys.css");
  assert.equal(ensureStylesheet("styles/bi-journeys.css", { doc: null }), false);
  assert.equal(ensureStylesheet("styles/bi-journeys.css", { doc: {} }), false);
});

test("the Location Editor asks for the stylesheet the manifest lists, every time it renders", () => {
  const panel = readFileSync(path.join(moduleRoot, "scripts", "foundry", "location-editor.mjs"), "utf8");
  assert.match(panel, /import \{ ensureStylesheet \} from "\.\/late-style\.mjs";/);
  const render = panel.slice(panel.indexOf("  _onRender(context, options) {"));
  assert.match(render.slice(0, 600), /ensureStylesheet\("styles\/bi-journeys\.css"\)/);
  const manifest = JSON.parse(readFileSync(path.join(moduleRoot, "module.json"), "utf8"));
  assert.ok(manifest.styles.includes("styles/bi-journeys.css"), "the file it asks for is the one the manifest lists, so after a relaunch it is found already loaded");
});
