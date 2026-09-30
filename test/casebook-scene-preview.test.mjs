// A standalone single-scene page (tools/casebook/preview.mjs), 2026-09-27. Built once by hand for Ingram to read
// Scene 0 without the whole Casebook, then lost when a later Casebook rebuild didn't know it existed. Wired into
// build.mjs so it regenerates every time, and tested here so it can't go stale or vanish again.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detailData } from "../tools/casebook/detail.mjs";
import { scenePageHtml, previewablesFromData, writePreviews } from "../tools/casebook/preview.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("a scene's standalone page is a real HTML document carrying that scene's current words", () => {
  const d = detailData(ROOT);
  const byId = previewablesFromData(d);
  const x = byId.get("episode-c1e1--from-up-here");
  assert.ok(x, "Scene 0 is in canon");
  const page = scenePageHtml(x, d);
  assert.match(page, /^<!doctype html>/i);
  assert.ok(page.includes("<title>From Up Here"));
  assert.ok(page.includes("From Up Here"));
  assert.ok(page.includes("Minkai"), "carries the scene's current words, not a stale draft");
  // Held back for later in play (D048): naming a founder in what the GM actually reads aloud would mean the preview
  // went stale again. GM-only fact details and the re-read commentary may still name them.
  const readAloud = [...page.matchAll(/<blockquote class="ra">([\s\S]*?)<\/blockquote>/g)].map((m) => m[1]).join("\n");
  assert.ok(readAloud.length > 0, "the page includes the speech itself");
  assert.doesNotMatch(readAloud, /Hyuck|Rupiah|Anabala|Shucks|Mordant/);
});

test("writePreviews with no scene ids covers every canon scene, and scene-preview.html is the next scene awaiting Ingram's read, in play order", () => {
  const scratch = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "casebook-preview-"));
  try {
    const written = writePreviews(ROOT, scratch);
    const d = detailData(ROOT);
    for (const x of d.scenes) assert.ok(fs.existsSync(path.join(scratch, "scenes", `${x.row.scene}.html`)), x.row.scene);
    const awaiting = d.scenes.filter((x) => x.row.state === "awaiting-read");
    assert.ok(awaiting.length >= 1, "at least one scene is awaiting her read right now");
    const order = d.scenes.map((x) => x.row.scene);
    assert.ok(awaiting.every((x) => order.indexOf(x.row.scene) >= order.indexOf(awaiting[0].row.scene)), "the preview is the first in play order");
    const preview = fs.readFileSync(path.join(scratch, "scene-preview.html"), "utf8");
    const direct = fs.readFileSync(path.join(scratch, "scenes", `${awaiting[0].row.scene}.html`), "utf8");
    assert.equal(preview, direct);
    assert.ok(written.some((f) => f.endsWith("scene-preview.html")));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test("naming a scene id writes only that scene, and makes it the preview", () => {
  const scratch = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "casebook-preview-"));
  try {
    const written = writePreviews(ROOT, scratch, ["episode-c1e1--from-up-here"]);
    assert.equal(written.length, 2); // scenes/<id>.html and scene-preview.html
    assert.ok(fs.readFileSync(path.join(scratch, "scene-preview.html"), "utf8").includes("From Up Here"));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
