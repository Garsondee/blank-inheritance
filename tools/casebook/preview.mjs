// A standalone page for one scene, to read on its own instead of the whole Casebook.
//   node tools/casebook/preview.mjs                 every scene in canon -> out/scenes/<scene-id>.html, plus
//                                                    out/scene-preview.html for the next scene awaiting Ingram's read
//   node tools/casebook/preview.mjs <scene-id> ...   only those scenes -> out/scenes/<scene-id>.html, and
//                                                    out/scene-preview.html is overwritten with the first one
// Called by build.mjs on every Casebook build with no arguments, so this page can never go stale the way the first
// one did: built once by hand, then silently outlived by a later canon change nobody regenerated it against.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detailData, sceneHtml, DETAIL_CSS } from "./detail.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url)) + "/";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function h(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return t;
}

const PAGE_CSS = `
body{max-width:900px;margin:0 auto;padding-inline:16px;padding-block:36px 80px}
.scene{margin-left:0;max-width:none}
`;

// One standalone .html document for one scene: head.html's fonts and tokens (so it matches the Casebook's own look
// even opened straight from disk, with no publisher to wrap it), plus the same scene markup the Casebook embeds.
export function scenePageHtml(x, d) {
  let head = fs.readFileSync(DIR + "head.html", "utf8");
  head = head.replace("<title>Blank Inheritance Casebook</title>", `<title>${esc(x.scene.title)} — scene preview</title>`);
  head = head.replace("</style>", DETAIL_CSS + PAGE_CSS + "</style>");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
</head>
<body>
${sceneHtml(x, d, h)}
</body>
</html>
`;
}

// Every scene currently written in detail (awaiting Ingram's read, or approved), keyed by its id.
export function previewablesFromData(d) {
  const out = new Map();
  for (const x of d.scenes) out.set(x.row.scene, x);
  return out;
}

// Writes out/scenes/<id>.html for `ids` (default: every scene in canon), plus out/scene-preview.html: for the given
// `ids`'s first entry if any were named, otherwise for the first scene in play order still awaiting her read (the
// next one to read, now that the night's rests put eleven in the queue at once).
export function writePreviews(root, outDir, ids) {
  const d = detailData(root);
  const byId = previewablesFromData(d);
  fs.mkdirSync(path.join(outDir, "scenes"), { recursive: true });
  const written = [];
  const targets = ids ?? [...byId.keys()];
  for (const id of targets) {
    const x = byId.get(id);
    if (!x) { console.error(`no such scene in canon: ${id}`); continue; }
    const file = path.join(outDir, "scenes", `${id}.html`);
    fs.writeFileSync(file, scenePageHtml(x, d));
    written.push(file);
  }
  const previewOf = ids?.length
    ? byId.get(ids[0])
    : [...byId.values()].find((x) => x.row.state === "awaiting-read") ?? null;
  if (previewOf) {
    const file = path.join(outDir, "scene-preview.html");
    fs.writeFileSync(file, scenePageHtml(previewOf, d));
    written.push(file);
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const REPO = path.resolve(DIR, "..", "..");
  const OUT = DIR + "out/";
  const args = process.argv.slice(2);
  const written = writePreviews(REPO, OUT, args.length ? args : undefined);
  for (const f of written) console.log("wrote", path.relative(REPO, f));
}
