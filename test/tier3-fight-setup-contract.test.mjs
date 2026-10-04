// Tier 3 — "Set up the fight" against the real shipped sf2e packs and Foundry
// (2026-10-04, D059).
//
// The fight card prints each creature's stat line from the encounter file,
// and the Set up the fight key brings the creature in by its compendium UUID.
// Both are only right if they still match what sf2e ships, so this reads the
// pack itself: the UUID must resolve to a creature of that name, and every
// number on the stat line must be that creature's. A system update that
// changes the centipede fails here, not at the table.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readPackDocuments } from "../tools/pack-extractor/read-pack.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKS = path.join(ROOT, "gamesystems", "sf2e", "packs");
const haveSf2e = existsSync(PACKS);
const FOUNDRY = path.join(ROOT, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
const haveFoundry = existsSync(FOUNDRY);

const encounters = readdirSync(path.join(ROOT, "data", "encounters"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(ROOT, "data", "encounters", f), "utf8")));
const withCompendium = encounters.flatMap((e) => (e.creatures ?? []).filter((c) => c.compendium).map((c) => ({ encounter: e.id, creature: c })));

const packCache = new Map();
function packActor(uuid) {
  const m = /^Compendium\.sf2e\.([a-z0-9-]+)\.Actor\.([A-Za-z0-9]{16})$/.exec(uuid);
  assert.ok(m, `${uuid} is not a Compendium.sf2e.<pack>.Actor.<id> UUID`);
  const [, pack, id] = m;
  if (!packCache.has(pack)) packCache.set(pack, readPackDocuments(path.join(PACKS, pack)).documents);
  const docs = packCache.get(pack);
  const actor = docs.find((d) => !d.embedded && d.doc._id === id)?.doc ?? null;
  const items = docs.filter((d) => d.embedded && d.idPart.startsWith(`${id}.`)).map((d) => d.doc);
  return { actor, items };
}

const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

test("Episode One's fight names its creature by a compendium entry, with a stat line", () => {
  const flood = encounters.find((e) => e.id === "c1e1-flood-tunnel");
  assert.ok(flood, "the Flood Tunnel encounter is missing");
  for (const c of flood.creatures) {
    assert.match(c.compendium ?? "", /^Compendium\.sf2e\./, `${c.name} cannot be set up without a compendium entry`);
    assert.match(c.statline ?? "", /\bAC \d+/, `${c.name} has no stat line for the fight card`);
  }
});

test("every compendium entry resolves in the shipped pack, to a creature of that name", { skip: !haveSf2e && "gamesystems/sf2e not on disk (gitignored)" }, () => {
  assert.ok(withCompendium.length > 0);
  for (const { encounter, creature } of withCompendium) {
    const { actor } = packActor(creature.compendium);
    assert.ok(actor, `${encounter}: ${creature.compendium} is not in the shipped pack`);
    assert.equal(actor.name, creature.name, `${encounter}: the compendium entry is ${actor.name}, not ${creature.name}`);
    assert.equal(actor.type, "npc");
    assert.equal(actor.system?.details?.level?.value, creature.level, `${encounter}: ${creature.name}'s level`);
  }
});

test("every number on a stat line is the shipped creature's own", { skip: !haveSf2e && "gamesystems/sf2e not on disk (gitignored)" }, () => {
  for (const { encounter, creature } of withCompendium) {
    if (!creature.statline) continue;
    const { actor, items } = packActor(creature.compendium);
    const sys = actor.system;
    const line = creature.statline;
    const has = (what, text) => assert.ok(line.includes(text), `${encounter}: ${creature.name}'s stat line should say "${text}" (${what}); it says: ${line}`);
    has("AC", `AC ${sys.attributes.ac.value}`);
    has("HP", `HP ${sys.attributes.hp.max}`);
    has("Fortitude", `Fort ${signed(sys.saves.fortitude.value)}`);
    has("Reflex", `Ref ${signed(sys.saves.reflex.value)}`);
    has("Will", `Will ${signed(sys.saves.will.value)}`);
    has("Perception", `Perception ${signed(sys.perception.mod)}`);
    has("Speed", `Speed ${sys.attributes?.speed?.value ?? sys.movement?.speeds?.land?.value ?? sys.attributes?.speed?.value}`);
    for (const strike of items.filter((i) => i.type === "melee")) {
      has(`${strike.name} attack`, `${strike.name} ${signed(strike.system.bonus.value)}`);
      for (const roll of Object.values(strike.system.damageRolls ?? {})) has(`${strike.name} damage`, `${roll.damage} ${roll.damageType}`);
    }
  }
});

test("Foundry v14 lets a combatant stand in a fight with no token, which a Stagecraft scene needs", { skip: !haveFoundry && "Foundry source tree not on disk" }, () => {
  const schema = readFileSync(path.join(FOUNDRY, "common", "documents", "combatant.mjs"), "utf8");
  assert.match(schema, /actorId: new fields\.ForeignDocumentField\(BaseActor, \{idOnly: true\}\)/);
  assert.match(schema, /tokenId: new fields\.ForeignDocumentField\(BaseToken, \{idOnly: true\}\)/, "a required tokenId would break a token-free fight");
  const client = readFileSync(path.join(FOUNDRY, "client", "documents", "combatant.mjs"), "utf8");
  assert.match(client, /return game\.actors\.get\(this\.actorId\) \|\| null;/, "a token-free combatant reads its actor by id");
  const combat = readFileSync(path.join(FOUNDRY, "client", "documents", "combat.mjs"), "utf8");
  assert.match(combat, /const updateOptions = \{direction: 1, worldTime: \{delta: advanceTime\}\};/, "nextRound still tells the update which way the round went");
  assert.match(combat, /const updateOptions = \{direction: -1, worldTime: \{delta: advanceTime\}\};/, "previousRound still says it went back");
});

test("Set up the fight never rolls for a player, rolls the creatures where only the GM sees, and asks nothing", () => {
  const src = readFileSync(path.join(ROOT, "module", "blank-inheritance", "scripts", "foundry", "fight-setup.mjs"), "utf8");
  assert.match(src, /const toRoll = combat\.combatants\.filter\(\(c\) => creatureIds\.has\(c\.actorId\) && c\.initiative === null\)/, "only the creatures, and only once");
  assert.match(src, /combat\.rollInitiative\(toRoll, \{ skipDialog: true, messageMode: "gm", updateTurn: false \}\)/);
  assert.match(src, /rows\.push\(token \? \{ tokenId: token\.id, sceneId: scene\.id, actorId: actor\.id \} : \{ actorId: actor\.id \}\)/, "a party member with no token on this scene still joins the fight");
  assert.match(src, /flags: \{ \[MODULE_ID\]: \{ fight: \{ encounterId: encounter\.id, briefId, beatId, clockAuto \} \} \}/, "the combat must say which scene's clock it moves");
  assert.match(src, /"system\.attributes\.hp\.value": max/, "a fight set up again starts its creatures at full health");
});
