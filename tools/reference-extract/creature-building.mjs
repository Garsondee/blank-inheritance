#!/usr/bin/env node
// Extract GM Core's creature-building tables (Building Creatures, chapter 2) from the local SRD mirror into plain numbers:
//
//   node tools/reference-extract/creature-building.mjs            writes tools/reference-extract/output/creature-building-math.json
//   node tools/reference-extract/creature-building.mjs --check    fails if that file is not what the SRD mirror says
//
// The tables are tab-separated prose inside reference/srd/gm-core/99x-100x articles. The book uses an en dash (U+2013) both as the
// minus of "-1" and between the two ends of a range ("20-17"), and an em dash (U+2014) for "no value", so a cell's meaning comes
// from where it stands. Only the DC and XP tables had been
// extracted before (reference/tables/dc-and-check-math.json); the NPC generator (module/blank-inheritance/scripts/core/
// npc-generator) needs the rest: attribute modifiers, Perception, skills, AC, saves, HP, strike attack bonus, strike damage,
// and spell DC / spell attack. Pure SF2E, nothing of this campaign.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");
export const OUTPUT = "tools/reference-extract/output/creature-building-math.json";
const DASH = "–";
const NONE = "—";

/** The tables, by the name the generator uses: the article they are in, the heading line above them, and what a cell is. */
export const TABLES = [
  { name: "attributeModifier", article: "996-attribute-modifiers", heading: "Attribute Modifier Scales", kind: "number" },
  { name: "perception", article: "997-perception", heading: "Perception", kind: "number" },
  { name: "skills", article: "1000-skills", heading: "Skills", kind: "number" },
  { name: "armorClass", article: "1004-armor-class", heading: "Armor Class", kind: "number" },
  { name: "savingThrows", article: "1005-saving-throws", heading: "Saving Throws", kind: "number" },
  { name: "hitPoints", article: "1006-hit-points", heading: "Hit Points", kind: "number" },
  { name: "strikeAttackBonus", article: "1011-strike-attack-bonus", heading: "Strike Attack Bonus", kind: "number" },
  { name: "strikeDamage", article: "1012-strike-damage", heading: "Strike Damage", kind: "damage" },
  { name: "spellDcAndAttack", article: "1014-spell-dc-and-spell-attack-modifier", heading: "Spell DC and Spell Attack Modifier", kind: "spell" }
];

const readArticle = (id, root = repoRoot) => JSON.parse(readFileSync(path.join(root, "reference", "srd", "gm-core", `${id}.json`), "utf8"));

/** A level cell: "-1" arrives as the glyph then 1. */
function level(cell) {
  const m = /^([–−-])?(\d+)$/.exec(cell.trim());
  if (!m) throw new Error(`not a level: ${JSON.stringify(cell)}`);
  return (m[1] ? -1 : 1) * Number(m[2]);
}

/** A number cell: "+8", "20-17" with an en dash (a range, high first), "+2 to +1", or an em dash alone (no value). */
function cell(raw) {
  const t = raw.trim();
  if (t === NONE || t === "-" || t === DASH || t === "") return null;
  let m = /^\+?(\d+)\s*(?:to|–)\s*\+?(\d+)$/.exec(t);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  m = /^\+?(\d+)$/.exec(t);
  if (m) return Number(m[1]);
  throw new Error(`cannot read the cell ${JSON.stringify(raw)}`);
}

/** "1d6+1 (4)" -> { dice: "1d6+1", average: 4 }. */
function damage(raw) {
  const m = /^(\S+)\s*\((\d+)\)$/.exec(raw.trim());
  if (!m) throw new Error(`cannot read the damage ${JSON.stringify(raw)}`);
  return { dice: m[1], average: Number(m[2]) };
}

/** The table that follows `heading` in an article's text: header cells, then one row per level to the last numeric row. */
function readTable(text, heading) {
  const lines = text.split("\n");
  const at = lines.findIndex((l, i) => l.trim() === heading && lines[i + 1]?.startsWith("Level\t"));
  if (at < 0) throw new Error(`no table headed "${heading}"`);
  const header = lines[at + 1].split("\t").map((s) => s.trim());
  const rows = [];
  for (let i = at + 2; i < lines.length; i++) {
    const parts = lines[i].split("\t");
    if (parts.length !== header.length || !/^[–-]?\d+$/.test(parts[0].trim())) break;
    rows.push(parts);
  }
  return { header, rows };
}

const band = (h) => h.toLowerCase().replace(/\s+/g, "");

/** Every table, from the articles as the mirror holds them. */
export function extractAll(root = repoRoot) {
  const out = {};
  const sources = [];
  for (const spec of TABLES) {
    const article = readArticle(spec.article, root);
    sources.push({ article: spec.article, page: article.pageCitation, url: article.sourceUrl });
    const { header, rows } = readTable(article.text, spec.heading);
    const byLevel = {};
    for (const parts of rows) {
      const lv = level(parts[0]);
      const entry = {};
      if (spec.kind === "spell") {
        // columns come in pairs: "Extreme DC", "Extreme Spell Attack Modifier", "High DC", ...
        for (let c = 1; c < header.length; c += 2) {
          const name = band(header[c].replace(/\s*DC$/i, ""));
          entry[name] = { dc: cell(parts[c]), attack: cell(parts[c + 1]) };
        }
      } else {
        for (let c = 1; c < header.length; c++) entry[band(header[c])] = spec.kind === "damage" ? damage(parts[c]) : cell(parts[c]);
      }
      byLevel[lv] = entry;
    }
    out[spec.name] = { source: spec.article, bands: spec.kind === "spell" ? header.slice(1).filter((_, i) => i % 2 === 0).map((h) => band(h.replace(/\s*DC$/i, ""))) : header.slice(1).map(band), byLevel };
  }
  return { tables: out, sources };
}

export function build(root = repoRoot) {
  const { tables, sources } = extractAll(root);
  return {
    id: "creature-building-math",
    type: "reference-table",
    description: "GM Core's creature-building statistics by level and band (Building Creatures, GM Core pp. 118-124): attribute modifier scales, Perception, skills, Armor Class, saving throws, Hit Points, strike attack bonus, strike damage, spell DC and spell attack modifier. Extracted by tools/reference-extract/creature-building.mjs from reference/srd/gm-core (never edited by hand: rerun it). A cell is a number, or { min, max } where the book gives a range (hit points, a low skill), or null where the book gives none (an extreme attribute modifier at levels -1 and 0). Pure SF2E; the NPC generator reads it.",
    sourceArticles: sources,
    levels: { min: -1, max: 24 },
    ...tables
  };
}

const text = (o) => `${JSON.stringify(o, null, 2)}\n`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(repoRoot, OUTPUT);
  const wanted = text(build());
  if (process.argv.includes("--check")) {
    let have = "";
    try { have = readFileSync(file, "utf8"); } catch { /* missing */ }
    if (have !== wanted) { console.error(`${OUTPUT} is not what reference/srd/gm-core says: rerun node tools/reference-extract/creature-building.mjs`); process.exit(1); }
    console.log(`${OUTPUT} is current`);
  } else {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, wanted);
    console.log(`wrote ${OUTPUT}`);
  }
}
