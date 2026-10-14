// Builds the Casebook: the HTML page (published as an artifact), its repo copy (Markdown), and a standalone page per
// canon scene (preview.mjs) so a single scene can be read without the whole Casebook.
//
// Everything is generated from canon/ (D080: "The Casebook is generated from canon"). Part Zero, every Episode One scene
// in full, comes from detail.mjs; every other section is derived by derive.mjs (the world by entity, the questions and
// their roads, the plan by Book and chapter, the threads, her words, what is still hers, the ideas) and drawn by
// render.mjs. The hand-written outline that used to sit in content/ is retired to quarantine/casebook/content/, which
// nothing here reads: its coverage proof (tools/story/import/casebook-coverage.mjs) is the only thing that does.
//
//   node tools/casebook/build.mjs          writes tools/casebook/out/index.html, casebook.md and the scene previews
//   node tools/casebook/build.mjs --repo   also writes the repo copy (MD_PATH), keeping its line endings
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel } from "../story/lib.mjs";
import { snapshot } from "../story/snapshot.mjs";
import { detailData, detailHtml, detailMarkdown, DETAIL_CSS } from "./detail.mjs";
import { writePreviews } from "./preview.mjs";
import { deriveCasebook } from "./derive.mjs";
import { renderHtml, renderMarkdown, makeInline } from "./render.mjs";
import { GENERATED_CSS } from "./style.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url)) + "/";
const REPO = path.resolve(DIR, "..", "..") + "/";
const OUT = DIR + "out/";
export const MD_PATH = "data/generated/casebook.md";
export const PUBLISHED_URL = "https://claude.ai/artifact/SdqFGrbUWc6czj3UES8kb8";

/**
 * The whole Casebook, in memory: nothing is written. `root` is the repo (or a scratch copy of canon's shape), and
 * `model` canon already read from it, so that one build sees one reading of canon.
 */
export function buildCasebook({ root = REPO, model = loadModel(root) } = {}) {
  const snap = snapshot(model, { root });
  const doc = deriveCasebook(model, snap);
  const detail = detailData(root, model);
  // On the whole page, Part Zero's scene cards point each fact they cite to its one record in the generated parts. The
  // standalone scene pages (made from `detail` itself) have no such record to point to, so they show the id plain.
  const pageDetail = { ...detail, linkFact: (id) => (doc.placed.has(id) ? doc.anchors.get(id) || null : null) };
  const h = makeInline(doc.anchors);
  const body = renderHtml(doc, { detailHtml: detailHtml(pageDetail, h), markdownPath: MD_PATH, publishedUrl: PUBLISHED_URL });
  let head = fs.readFileSync(DIR + "head.html", "utf8");
  head = head.replace("</style>", GENERATED_CSS + DETAIL_CSS + "</style>");
  // The publisher wraps the page in its own doctype/head/body skeleton, so the file starts at the title.
  const page = `${head}\n${body}\n`;
  const md = renderMarkdown(doc, { detailMarkdown: detailMarkdown(detail, (s) => String(s)), markdownPath: MD_PATH, publishedUrl: PUBLISHED_URL });
  return { page, md, doc, detail, model };
}

function main(argv) {
  const { page, md, doc, detail } = buildCasebook();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(OUT + "index.html", page);
  for (const f of writePreviews(REPO, OUT, undefined, detail)) console.log("wrote", path.relative(REPO, f));
  fs.writeFileSync(OUT + "casebook.md", md);
  if (argv.includes("--repo")) {
    const target = REPO + MD_PATH;
    const eol = fs.existsSync(target) && fs.readFileSync(target, "utf8").includes("\r\n") ? "\r\n" : "\n";
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, eol === "\r\n" ? md.replace(/\r?\n/g, "\r\n") : md);
    console.log("wrote", target);
  }
  for (const p of doc.problems) console.warn("warning:", p);
  console.log(`page ${page.length} chars; markdown ${md.length} chars; ${doc.glance.facts.total} facts${doc.problems.length ? `, ${doc.problems.length} problem(s) above` : ", each once"}; canon ${doc.meta.canonHash}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
