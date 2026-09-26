// Tier 3 — a portrait-less cast member's frame still reads as a PERSON.
//
// Found live 2026-09-19 (Ingram): "Put them on stage does nothing." Reproduced
// against the real world: the write to the scene's stage flag succeeded, the
// StageOverlay genuinely mounted, and Nobu's own <figure class="bi-frame">
// rendered at a real, substantial size (208x355px, fully visible, opacity 1).
// The actual defect was `.bi-frame__art` rendering completely empty whenever
// `img` is falsy — most of this campaign's NPCs have no Actor and no shipped
// stage portrait yet (staging is not chargen, foundry/stage.mjs's own
// header), so this was never a one-NPC problem. A flat --bi-steel-900
// rectangle with nothing in it is visually indistinguishable from the button
// having failed outright, which is exactly what got reported as a bug.
//
// frame.hbs is a plain Handlebars template (no ApplicationV2 to mount), so
// this reads it directly rather than needing the source-regex workaround
// the *.mjs adapter files need.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const frameHbs = readFileSync(path.join(moduleRoot, "templates", "stage", "frame.hbs"), "utf8");
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");

test("a cast member with no img renders a real fallback glyph, not an empty span", () => {
  const artSpan = frameHbs.match(/<span class="bi-frame__art">[\s\S]*?<\/span>/);
  assert.ok(artSpan, "the art span is missing from frame.hbs");
  assert.match(artSpan[0], /\{\{#if img\}\}<img src="\{\{img\}\}" alt="">\{\{else\}\}/, "no longer branches on img being present");
  assert.match(artSpan[0], /class="[^"]*bi-frame__art-fallback[^"]*"/, "no longer renders a fallback element for a portrait-less arrival");
});

test("bi-frame__art-fallback is a real, styled class, not a bare unstyled icon", () => {
  assert.match(css, /\.bi-frame__art-fallback\s*\{/, "bi-frame__art-fallback has no rule in bi-components.css — tier0-architecture would also catch this, but pin it here with the reason");
});

test("REAL DATA: Nobu (Kit Issue's own cast, the reported case) genuinely has no img authored, so this fallback is what actually renders for him today", () => {
  const brief = JSON.parse(
    readFileSync(path.join(repoRoot, "data", "scene-briefs", "episode-c1e1--kit-issue.json"), "utf8")
  );
  const nobu = brief.cast.find((m) => m.id === "nobu");
  assert.ok(nobu, "Nobu is not in Kit Issue's own cast — this test's premise is stale");
  assert.equal(nobu.img, undefined, "Nobu now has an img authored — this regression case no longer applies and the fallback path should be tested against a different real cast member instead");
});
