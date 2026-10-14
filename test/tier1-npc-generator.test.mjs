// The NPC Generator (module/blank-inheritance/scripts/core/npc-generator/statblock.mjs): GM Core's creature-building curves read off
// tools/reference-extract/output/creature-building-math.json (tools/reference-extract/creature-building.mjs), an archetype and a level in, a
// combatStatblock out. What is proved here: the extracted tables are what the SRD mirror says; a band at a level gives the book's
// number; the generator is pure and deterministic; a non-combat NPC has no strike and no feature; and the numbers a scene has already
// told the GM (Vetch's Perception 19, the Deputy Director's Will 29, Shucks' Deception 37...) are what the roster generates.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, OUTPUT } from "../tools/reference-extract/creature-building.mjs";
import { BANDS, ABILITIES, SKILLS, buildStatblock, cellValue, dcOf, parseDamage, statAt } from "../module/blank-inheritance/scripts/core/npc-generator/statblock.mjs";
import { generate, load, stubFor } from "../tools/npc-generator/apply.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// the SRD mirror (reference/srd, gitignored) is where the tables are extracted from; the extracted file is tracked, so everything but the two checks that re-read the mirror runs without it
const NO_SRD = existsSync(path.join(repo, "reference", "srd", "gm-core", "1004-armor-class.json")) ? false : "the local SRD mirror (reference/srd) is not here";
const { tables, archetypes, roster } = load();
const A = archetypes.archetypes;
const person = (id) => roster.people.find((p) => p.npcId === id);
const gen = (id) => generate(person(id), { tables, archetypes });

/* ---------------------------------------------------------------- the tables */

test("the extracted tables are exactly what the SRD mirror says (rerun tools/reference-extract/creature-building.mjs if this fails)", { skip: NO_SRD }, () => {
  assert.equal(readFileSync(path.join(repo, OUTPUT), "utf8"), `${JSON.stringify(build(), null, 2)}\n`);
});

test("every table has every level from -1 to 24 and every band the book gives", () => {
  const found = Object.entries(tables).filter(([, v]) => v?.byLevel);
  assert.equal(found.length, 9, "the nine tables");
  for (const [name, table] of found) {
    assert.deepEqual(Object.keys(table.byLevel).map(Number).sort((a, b) => a - b), Array.from({ length: 26 }, (_, i) => i - 1), `${name}: levels`);
    for (const level of Object.keys(table.byLevel)) for (const band of table.bands) assert.ok(band in table.byLevel[level], `${name} level ${level} has no ${band}`);
  }
});

test("known rows of the book come out as printed", () => {
  const at = (table, level, band) => tables[table].byLevel[String(level)][band];
  assert.deepEqual(["extreme", "high", "moderate", "low"].map((b) => at("armorClass", 1, b)), [19, 16, 15, 13]);
  assert.deepEqual(at("hitPoints", 15, "moderate"), { min: 271, max: 279 });
  assert.deepEqual(at("hitPoints", -1, "high"), 9);
  assert.deepEqual(at("savingThrows", -1, "terrible"), 0);
  assert.deepEqual(at("skills", -1, "low"), { min: 1, max: 2 });
  assert.equal(at("attributeModifier", 0, "extreme"), null, "no extreme attribute modifier below level 1");
  assert.equal(at("attributeModifier", 1, "extreme"), 5);
  assert.deepEqual(at("strikeDamage", 0, "extreme"), { dice: "1d6+3", average: 6 });
  assert.deepEqual(at("spellDcAndAttack", 24, "moderate"), { dc: 45, attack: 37 });
  assert.equal(at("strikeAttackBonus", 24, "extreme"), 46);
});

/* ---------------------------------------------------------------- the rules the generator applies */

test("a range takes the lower end of a short one and the middle of a long one; an extreme attribute below level 1 is high", () => {
  assert.equal(cellValue(14), 14);
  assert.equal(cellValue({ min: 1, max: 2 }), 1);
  assert.equal(cellValue({ min: 19, max: 21 }), 20);
  assert.equal(cellValue({ min: 271, max: 279 }), 275);
  assert.equal(statAt(tables, "attributeModifier", 0, "extreme"), 3);
  assert.equal(statAt(tables, "attributeModifier", 1, "extreme"), 5);
  assert.throws(() => statAt(tables, "armorClass", 40, "high"), /no level 40/);
  assert.throws(() => statAt(tables, "armorClass", 1, "terrible"), /no "terrible" band/);
  assert.throws(() => statAt(tables, "nope", 1, "high"), /no table/);
});

test("damage expressions split into dice and a flat bonus", () => {
  assert.deepEqual(parseDamage("1d6+3"), { dice: "1d6", bonus: 3 });
  assert.deepEqual(parseDamage("1d4"), { dice: "1d4" });
  assert.deepEqual(parseDamage("2d6-1"), { dice: "2d6", bonus: -1 });
  assert.throws(() => parseDamage("a lot"), /cannot read/);
});

test("every archetype names only bands the tables have, and a complete set of attributes and saves", () => {
  for (const [id, a] of Object.entries(A)) {
    for (const band of [a.ac, a.hp, a.perception, ...Object.values(a.saves), ...Object.values(a.attributes), a.strike?.attack, a.strike?.damage].filter(Boolean)) assert.ok(BANDS.includes(band), `${id}: ${band}`);
    assert.deepEqual(Object.keys(a.attributes).sort(), [...ABILITIES].sort(), id);
    assert.deepEqual(Object.keys(a.saves).sort(), ["fortitude", "reflex", "will"], id);
    for (let level = -1; level <= 24; level++) assert.doesNotThrow(() => buildStatblock({ archetype: id, level }, { tables, archetypes: A }), `${id} at level ${level}`);
  }
});

test("the same inputs make the same statblock, and nothing is shared with the inputs", () => {
  const spec = { archetype: "veteran-officer", level: 3, skills: [{ skill: "deception", band: "moderate" }] };
  const a = buildStatblock(spec, { tables, archetypes: A });
  const b = buildStatblock(JSON.parse(JSON.stringify(spec)), { tables, archetypes: A });
  assert.deepEqual(a, b);
  a.skills.deception.modifier = 99;
  assert.notEqual(buildStatblock(spec, { tables, archetypes: A }).skills.deception.modifier, 99);
});

test("a statblock is complete and in the shape the Actor generator reads: level, six attributes, Perception, skills, AC, three saves, HP, Speed", () => {
  const s = buildStatblock({ archetype: "tough-worker", level: 2, skills: [{ skill: "crafting", band: "high" }] }, { tables, archetypes: A });
  assert.equal(s.level, 2);
  assert.deepEqual(Object.keys(s.abilityModifiers), ABILITIES);
  assert.deepEqual(Object.keys(s.savingThrows), ["fortitude", "reflex", "will"]);
  assert.equal(typeof s.ac, "number");
  assert.equal(s.hitPoints.max, s.hitPoints.current);
  assert.equal(typeof s.perception.proficiency.modifier, "number");
  assert.equal(s.skills.crafting.modifier, statAt(tables, "skills", 2, "high"));
  assert.ok(["trained", "expert", "master", "legendary"].includes(s.skills.crafting.rank));
  assert.equal(s.speed.land, 25);
  assert.equal(s.adjustment, "none");
});

test("a non-combat NPC has no strike, no abilities and no spells; one built to fight has a plain strike on the tables", () => {
  const clerk = buildStatblock({ archetype: "skilled-professional", level: 0 }, { tables, archetypes: A });
  for (const k of ["strikes", "abilities", "spellcasting", "resistances", "weaknesses", "immunities"]) assert.equal(k in clerk, false, k);
  const thug = buildStatblock({ archetype: "brawler", level: 2 }, { tables, archetypes: A });
  assert.equal(thug.strikes.length, 1);
  assert.equal(thug.strikes[0].attackBonus, statAt(tables, "strikeAttackBonus", 2, "high"));
  assert.deepEqual(thug.strikes[0].damage[0].dice, parseDamage(tables.strikeDamage.byLevel["2"].moderate.dice).dice);
  assert.equal(buildStatblock({ archetype: "brawler", level: 2, strike: false }, { tables, archetypes: A }).strikes, undefined, "a roster can take the strike off");
  assert.equal(buildStatblock({ archetype: "brawler", level: 2, strike: { name: "Pistol", strikeType: "ranged", attack: "moderate", damage: "moderate", damageType: "piercing" } }, { tables, archetypes: A }).strikes[0].name, "Pistol");
});

test("bands in the roster override the archetype's; a skill at the non-combat level uses that level's numbers", () => {
  const s = buildStatblock({ archetype: "noncombat-adult", level: -1, nonCombatLevel: 4, bands: { perception: "high", will: "low" }, skills: [{ skill: "society", band: "high", at: "nonCombat" }, { skill: "athletics", band: "low" }] }, { tables, archetypes: A });
  assert.equal(s.nonCombatLevel, 4);
  assert.equal(s.perception.proficiency.modifier, statAt(tables, "perception", -1, "high"));
  assert.equal(s.savingThrows.will.modifier, statAt(tables, "savingThrows", -1, "low"));
  assert.equal(s.skills.society.modifier, statAt(tables, "skills", 4, "high"));
  assert.equal(s.skills.athletics.modifier, statAt(tables, "skills", -1, "low"));
});

test("mistakes are refused, not guessed at", () => {
  const dep = { tables, archetypes: A };
  assert.throws(() => buildStatblock({ archetype: "nobody", level: 1 }, dep), /no archetype/);
  assert.throws(() => buildStatblock({ archetype: "brawler", level: 1.5 }, dep), /whole number/);
  assert.throws(() => buildStatblock({ archetype: "brawler", level: 1, skills: [{ skill: "cooking", band: "high" }] }, dep), /not one of the 18 skills/);
  assert.throws(() => buildStatblock({ archetype: "brawler", level: 1, skills: [{ skill: "athletics", band: "terrible" }] }, dep), /extreme, high, moderate or low/);
  assert.throws(() => buildStatblock({ archetype: "brawler", level: 1, skills: [{ skill: "athletics", band: "high", at: "nonCombat" }] }, dep), /non-combat level/);
  assert.ok(SKILLS.length === 18);
});

/* ---------------------------------------------------------------- the numbers the scenes already told the GM */

test("the DCs the scene briefs already give for Vetch, the Deputy Director, Shucks, Taka and Nobu are what the roster generates", () => {
  const dcs = (id) => {
    const s = gen(id);
    return { perception: dcOf(s.perception.proficiency.modifier), will: dcOf(s.savingThrows.will.modifier), deception: dcOf(s.skills.deception.modifier) };
  };
  assert.deepEqual(dcs("section-officer"), { perception: 19, will: 19, deception: 19 });
  assert.deepEqual(dcs("deputy-director"), { perception: 26, will: 29, deception: 26 });
  assert.deepEqual(dcs("shucks-mordant"), { perception: 39, will: 36, deception: 37 });
  assert.deepEqual(dcs("taka"), { perception: 18, will: 18, deception: 17 });
  assert.deepEqual(dcs("nobu"), { perception: 18, will: 18, deception: 17 });
});

test("a stub file for a foe the scenes only name has no retired `description`: where it comes from goes into the designNotes, and its canon link is null (D080)", () => {
  const stubbed = roster.people.find((p) => p.stub);
  assert.ok(stubbed, "the roster has at least one foe with a stub");
  const file = stubFor(stubbed, gen(stubbed.npcId));
  assert.equal("description" in file, false, "the old story-prose field is not written any more");
  assert.equal(file.canon, null);
  assert.ok(file.designNotes.includes(stubbed.stub.description), "the roster's sentence about where the person comes from is kept, in the design notes");
  assert.equal(file.name, stubbed.stub.name);
  assert.equal(file.role, stubbed.stub.role);
  assert.equal(file.authoring.status, "drafted");
});

test("the founder is level 15 and well above a first-level party (D047 item 5), and nobody is above a founder", () => {
  const levels = roster.people.map((p) => p.level);
  assert.equal(person("shucks-mordant").level, 15);
  assert.equal(Math.max(...levels), 15);
  const shucks = gen("shucks-mordant");
  assert.ok(shucks.ac >= 37 && shucks.hitPoints.max > 300);
});
