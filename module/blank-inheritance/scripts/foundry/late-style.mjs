/**
 * Putting one of this module's stylesheets on the page when the manifest has not (yet) loaded it.
 *
 * Foundry reads module.json's `styles` only when a world launches: a stylesheet added to the manifest by a deploy is on the server but not on the page until the
 * world is relaunched (core/world-sync.mjs says so in a banner), and the Location Editor's new tabs would look unstyled until then. The editor is a GM-only window
 * the GM opens on purpose, so it asks for its own stylesheet when it opens. The manifest still lists the file (test/tier3-theme-contract.test.mjs holds that), so
 * after a relaunch it loads the normal way and this finds it already there and does nothing.
 */

/** Add `<link rel="stylesheet">` for a file of this module (a path such as "styles/bi-journeys.css") unless the page already has it. Returns whether it added one. */
export function ensureStylesheet(path, { doc = globalThis.document, route = globalThis.foundry?.utils?.getRoute } = {}) {
  if (!doc?.head) return false;
  const loaded = [...doc.querySelectorAll('link[rel="stylesheet"]')].some((link) => (link.getAttribute("href") ?? "").includes(path));
  if (loaded) return false;
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  const href = `modules/blank-inheritance/${path}`;
  link.href = typeof route === "function" ? route(href) : `/${href}`;
  doc.head.append(link);
  return true;
}
