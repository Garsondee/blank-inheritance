#!/usr/bin/env node
// The NPC Generator's writer: data/campaign/npc-roster.json (who, which archetype, which level) + data/campaign/npc-archetypes.json
// (what an archetype is) + tools/reference-extract/output/creature-building-math.json (GM Core's curves) -> the `statblock` in every data/npcs file.
//
//   node tools/npc-generator/apply.mjs              write every statblock (and the files foes need), print the table
//   node tools/npc-generator/apply.mjs --check      write nothing; exit 1 if any file differs from what the roster generates
//   node tools/npc-generator/apply.mjs --quiet      no table
//
// It writes ONLY `statblock` (and a new, unnamed-or-named, drafted file for a foe that had none): names, ancestry, descriptions,
// social profiles and `authoring` are never touched, and nothing is ever written above `drafted` (core/promote.mjs
// assertNotPromotedStatus). Deterministic: running it twice changes nothing. The roster is the file a person edits; the statblocks
// are derived from it and are never edited by hand (a hand edit is overwritten, and `--check` says so).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStatblock, dcOf } from "../../module/blank-inheritance/scripts/core/npc-generator/statblock.mjs";
import { assertNotPromotedStatus } from "../../module/blank-inheritance/scripts/core/promote.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");
const readJson = (rel) => JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));
const text = (o) => `${JSON.stringify(o, null, 2)}\n`;

export const PATHS = {
  tables: "tools/reference-extract/output/creature-building-math.json",
  archetypes: "data/campaign/npc-archetypes.json",
  roster: "data/campaign/npc-roster.json",
  npcs: "data/npcs"
};

/** What one roster row generates: the statblock for a person. */
export function generate(person, { tables, archetypes }) {
  return buildStatblock({
    archetype: person.archetype,
    level: person.level,
    nonCombatLevel: person.nonCombatLevel,
    skills: person.skills,
    bands: person.bands,
    strike: person.strike
  }, { tables, archetypes: archetypes.archetypes });
}

/** `file` with `statblock` set: in its place if it has one, else just before `socialProfile`, else at the end. Everything else is untouched. */
export function withStatblock(file, statblock) {
  if ("statblock" in file) return { ...file, statblock };
  const out = {};
  let placed = false;
  for (const [k, v] of Object.entries(file)) {
    if (k === "socialProfile" && !placed) { out.statblock = statblock; placed = true; }
    out[k] = v;
  }
  if (!placed) out.statblock = statblock;
  return out;
}

/** A new, drafted file for a foe a scene names in prose. It restates what the scene says and nothing else. */
export function stubFor(person, statblock) {
  const status = "drafted";
  assertNotPromotedStatus(status, { source: "tools/npc-generator" });
  return {
    $schema: "../schema/npc.schema.json",
    id: person.npcId,
    type: "npc",
    authoring: { status },
    name: person.stub.name,
    role: person.stub.role,
    pole: null,
    affiliation: null,
    description: person.stub.description,
    designNotes: "Made by tools/npc-generator from data/campaign/npc-roster.json: a person a scene's events name in prose, so that there is a statblock for them and something to put on a token. Nothing about them is established beyond what the scene says; the statblock is derived and is changed in the roster, not here.",
    namingPlaceholderRef: null,
    openQuestionRefs: [],
    statblock
  };
}

/** Every change the roster asks for: [{ npcId, file, before, after, created }]. */
export function plan({ tables, archetypes, roster }, root = repoRoot) {
  const out = [];
  for (const person of roster.people) {
    const statblock = generate(person, { tables, archetypes });
    const file = path.join(root, PATHS.npcs, `${person.npcId}.json`);
    if (existsSync(file)) {
      const before = JSON.parse(readFileSync(file, "utf8"));
      assertNotPromotedStatus(before.authoring?.status, { source: "tools/npc-generator" });
      out.push({ npcId: person.npcId, file, before, after: withStatblock(before, statblock), statblock, created: false });
    } else {
      if (!person.stub) throw new Error(`${person.npcId} has no data/npcs file and the roster gives no \`stub\` to make one from`);
      out.push({ npcId: person.npcId, file, before: null, after: stubFor(person, statblock), statblock, created: true });
    }
  }
  return out;
}

/** One line per person for a human to read and correct. */
export function table(changes, roster) {
  const byId = new Map(roster.people.map((p) => [p.npcId, p]));
  const rows = changes.map(({ npcId, statblock: s }) => {
    const p = byId.get(npcId);
    const skills = Object.entries(s.skills).map(([k, v]) => `${k} ${v.modifier >= 0 ? "+" : ""}${v.modifier}`).join(", ");
    const strike = s.strikes?.[0] ? `${s.strikes[0].name} +${s.strikes[0].attackBonus} ${s.strikes[0].damage[0].dice}${s.strikes[0].damage[0].bonus ? (s.strikes[0].damage[0].bonus > 0 ? "+" : "") + s.strikes[0].damage[0].bonus : ""}` : "-";
    return `${npcId.padEnd(30)} L${String(s.level).padEnd(3)} ${p.archetype.padEnd(21)} AC ${String(s.ac).padEnd(3)} HP ${String(s.hitPoints.max).padEnd(4)} F${s.savingThrows.fortitude.modifier >= 0 ? "+" : ""}${s.savingThrows.fortitude.modifier} R${s.savingThrows.reflex.modifier >= 0 ? "+" : ""}${s.savingThrows.reflex.modifier} W${s.savingThrows.will.modifier >= 0 ? "+" : ""}${s.savingThrows.will.modifier}  Perc DC ${dcOf(s.perception.proficiency.modifier)}  ${skills || "no skills"}  ${strike}`;
  });
  return rows.join("\n");
}

export function load(root = repoRoot) {
  const read = (rel) => JSON.parse(readFileSync(path.join(root, rel), "utf8"));
  return { tables: read(PATHS.tables), archetypes: read(PATHS.archetypes), roster: read(PATHS.roster) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = load();
  const changes = plan(data);
  const differing = changes.filter((c) => !c.before || text(c.before) !== text(c.after));
  if (process.argv.includes("--check")) {
    if (differing.length) {
      console.error(`${differing.length} npc file(s) differ from what data/campaign/npc-roster.json generates (run: npm run npcs):\n  ${differing.map((c) => c.npcId).join("\n  ")}`);
      process.exit(1);
    }
    console.log(`all ${changes.length} statblocks are what the roster generates`);
  } else {
    for (const c of differing) writeFileSync(c.file, text(c.after));
    if (!process.argv.includes("--quiet")) console.log(table(changes, data.roster));
    console.log(`\n${changes.length} people; ${differing.length} file(s) written (${differing.filter((c) => c.created).length} new)`);
  }
}
