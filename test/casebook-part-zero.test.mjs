// The Casebook's Part Zero (tools/casebook/detail.mjs), 2026-09-27. Ingram reads rebuilt scenes there, so it must
// show what canon holds: every scene waiting for her read (or approved) in full, and the plan's throughlines.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detailData, detailHtml, detailMarkdown } from "../tools/casebook/detail.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

test("Part Zero shows every scene waiting for Ingram's read, with every beat's words", () => {
  const d = detailData(ROOT);
  const html = detailHtml(d, esc);
  const shown = d.episodes.flatMap((e) => e.rows).filter((r) => r.state === "awaiting-read" || r.state === "approved");
  assert.ok(shown.length >= 1, "at least Scene 0");
  for (const r of shown) {
    assert.ok(html.includes(`id="scene-${r.scene}"`), r.scene);
    const x = d.scenes.find((s) => s.row.scene === r.scene);
    for (const b of x.scene.beats) {
      if (b.readAloud) assert.ok(html.includes(esc(b.readAloud.split("\n")[0])), `${r.scene} → ${b.id}`);
    }
  }
});

test("Part Zero shows the plan's throughlines, on the page and in the Markdown copy", () => {
  const d = detailData(ROOT);
  assert.match(d.throughlines, /old town is on the waterfront/);
  assert.ok(detailHtml(d, esc).includes("Throughlines to carry into the rebuilds"));
  assert.ok(detailMarkdown(d, (s) => s).includes("### Throughlines to carry into the rebuilds"));
});
