// Tier 3 — the generated Actor notes against the things they must agree with: Foundry's own HTML sanitiser, and the sf2e system's
// real NPC sheet (D080, 2026-10-07).
//
// Foundry cleans every HTML field on the server (common/constants.mjs ALLOWED_HTML_TAGS / ALLOWED_HTML_ATTRIBUTES) and silently
// drops a tag or attribute it does not allow, so a dropped wrapper would publish its contents bare. Every note a real NPC would
// carry is rendered here exactly as the sync writes it, and every tag and attribute in the result is checked against the real
// allowlist read out of the local Foundry source. The sf2e checks pin which fields the sheet treats as HTML and where it shows them:
// public notes to anyone who can open the sheet, private notes to the GM.
import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sheetNotes } from "../module/blank-inheritance/scripts/core/actor-notes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const FOUNDRY_CONSTANTS = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "common", "constants.mjs");
const SF2E_TEMPLATE = path.join(repoRoot, "gamesystems", "sf2e", "template.json");
const SF2E_NOTES_TAB = path.join(repoRoot, "gamesystems", "sf2e", "templates", "actors", "npc", "tabs", "notes.hbs");
const SF2E_LIMITED_SHEET = path.join(repoRoot, "gamesystems", "sf2e", "templates", "actors", "limited", "npc-sheet.hbs");

const generated = JSON.parse(readFileSync(path.join(repoRoot, "data", "campaign", "actor-notes.json"), "utf8")).npcs;
const npcs = Object.keys(generated).map((id) => JSON.parse(readFileSync(path.join(repoRoot, "data", "npcs", `${id}.json`), "utf8")));

/** Every start tag in some HTML, with its attributes. */
function startTags(html) {
  const tags = [];
  for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:\s*=\s*"[^"]*")?)*)\s*\/?>/g)) {
    const attrs = [...m[2].matchAll(/([^\s=]+)(?:\s*=\s*"([^"]*)")?/g)].map((a) => a[1]);
    tags.push({ tag: m[1].toLowerCase(), attrs });
  }
  return tags;
}

function foundryAllowlists() {
  const source = readFileSync(FOUNDRY_CONSTANTS, "utf8");
  const tagsText = source.match(/export const ALLOWED_HTML_TAGS = Object\.freeze\((\[[\s\S]*?\])\);/);
  const attrsText = source.match(/export const ALLOWED_HTML_ATTRIBUTES = deepFreeze\((\{[\s\S]*?\n\})\);/);
  assert.ok(tagsText && attrsText, "could not find Foundry's HTML allowlists in common/constants.mjs; has the file moved?");
  return { tags: new Set(Function(`"use strict"; return (${tagsText[1]});`)()), attrs: Function(`"use strict"; return (${attrsText[1]});`)() };
}

test("every note a real NPC would carry uses only tags and attributes Foundry's server sanitiser keeps", (t) => {
  if (!existsSync(FOUNDRY_CONSTANTS)) {
    t.skip("foundryvtt/ source tree absent (gitignored); cannot read the real allowlist. Skipping loudly.");
    return;
  }
  const { tags } = foundryAllowlists();
  let checked = 0;
  for (const npc of npcs) {
    const { publicNotes, privateNotes } = sheetNotes(npc, generated[npc.id]);
    for (const [field, html] of [["publicNotes", publicNotes], ["privateNotes", privateNotes]]) {
      for (const { tag, attrs } of startTags(html)) {
        assert.ok(tags.has(tag), `${npc.id} ${field}: <${tag}> is not in Foundry's ALLOWED_HTML_TAGS; the server would drop it and publish its contents bare`);
        assert.deepEqual(attrs, [], `${npc.id} ${field}: <${tag}> carries attributes the notes never need`);
      }
      checked += 1;
    }
  }
  assert.ok(checked >= npcs.length * 2);
});

test("the blurb is plain text (a single-line input on the sheet), and the notes are balanced HTML", () => {
  for (const npc of npcs) {
    const { blurb, publicNotes, privateNotes } = sheetNotes(npc, generated[npc.id]);
    assert.doesNotMatch(blurb, /[<>\n]/, `${npc.id}: the blurb is one line of plain text`);
    for (const html of [publicNotes, privateNotes]) {
      for (const tag of ["p", "ul", "li", "h3", "em", "strong"]) {
        const opened = (html.match(new RegExp(`<${tag}>`, "g")) ?? []).length;
        const closed = (html.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
        assert.equal(opened, closed, `${npc.id}: unbalanced <${tag}>`);
      }
    }
  }
});

test("sf2e's npc template has the three fields the sheet is written into, two of them HTML, and its sheets show them as the notes say", (t) => {
  if (!existsSync(SF2E_TEMPLATE) || !existsSync(SF2E_NOTES_TAB) || !existsSync(SF2E_LIMITED_SHEET)) {
    t.skip("gamesystems/sf2e/ not present locally (gitignored); skipping loudly rather than failing or silently passing.");
    return;
  }
  const template = JSON.parse(readFileSync(SF2E_TEMPLATE, "utf8"));
  const details = template.Actor.npc.details;
  for (const field of ["blurb", "publicNotes", "privateNotes"]) assert.ok(field in details, `sf2e's npc template no longer has details.${field}`);
  assert.ok(template.Actor.htmlFields.includes("details.publicNotes") && template.Actor.htmlFields.includes("details.privateNotes"), "both notes fields are HTML fields");
  assert.ok(!template.Actor.htmlFields.includes("details.blurb"), "the blurb is not an HTML field: it must stay plain text");
  const notesTab = readFileSync(SF2E_NOTES_TAB, "utf8");
  assert.match(notesTab, /enrichedContent\.publicNotes/, "the Notes tab shows the public notes");
  assert.match(notesTab, /enrichedContent\.privateNotes/, "the Notes tab shows the private notes");
  const limited = readFileSync(SF2E_LIMITED_SHEET, "utf8");
  assert.match(limited, /enrichedContent\.publicNotes/, "the sheet a player with limited access gets shows the public notes");
  // ...and not the private ones. The full sheet (Observer and above) shows both tabs and filters nothing, so the GM notes are only
  // as private as the Actor's ownership: the sync never shares an NPC Actor with the players, and nothing here changes that.
  assert.doesNotMatch(limited, /privateNotes/, "the limited sheet never shows the private notes");
});
