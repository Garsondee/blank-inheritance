// Tier 3 — ownership INHERIT and unlinked tokens (core/ownership.mjs and its wiring).
//
// Found live 2026-10-01: in the local test world, switching to "00. From Up
// Here" and back to "01. The City" threw "RangeError: Maximum call stack size
// exceeded" (TokenDocumentPF2e.getUserLevel <-> CharacterPF2e.getUserLevel),
// the Director's bar was missing from a fresh load of that scene, and sf2e
// logged "Failed data preparation" for five tokens' actors. The chain:
//
//   admin panel "give back the test party" wrote ownership[user] = INHERIT (-1)
//   into a world Actor  ->  the hub's fixture tokens were UNLINKED, so each
//   token's actor is a synthetic copy whose parent is the token  ->  anything
//   asking that copy about a non-GM user (Foundry's hasPlayerOwner, sf2e's
//   alliance/initiative in prepareData, our cast board) loops forever.
//
// Part 1 pins what Foundry and sf2e actually do, against their real source, so
// an upgrade that changes it fails loudly. Part 2 reads our own source for the
// fix. Part 3 runs the one adapter with no heavy imports against a stub game.
// The pure rules and a model of the loop are tier1-ownership.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const appRoot = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
const sf2ePath = path.join(repoRoot, "gamesystems", "sf2e", "sf2e.mjs");
const scriptsRoot = path.join(repoRoot, "module", "blank-inheritance", "scripts");

const SKIP_FOUNDRY = "foundryvtt/ not present locally (gitignored) — skipping loudly rather than failing or silently passing.";
const SKIP_SF2E = "gamesystems/sf2e/ not present locally (gitignored) — skipping loudly rather than failing or silently passing.";

const readApp = (rel) => readFileSync(path.join(appRoot, ...rel.split("/")), "utf8");
const readScript = (rel) => readFileSync(path.join(scriptsRoot, ...rel.split("/")), "utf8");

/** Comments out, so prose about INHERIT or hasPlayerOwner is not mistaken for code. */
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/* ------------------------------------------------------------------ */
/*  Part 1 -- what Foundry and sf2e really do                          */
/* ------------------------------------------------------------------ */

test("Foundry: INHERIT is -1 and NONE is 0, the values core/ownership.mjs hard-codes", async (t) => {
  if (!existsSync(appRoot)) return t.skip(SKIP_FOUNDRY);
  const constants = readApp("common/constants.mjs");
  assert.match(constants, /INHERIT:\s*-1/, "DOCUMENT_OWNERSHIP_LEVELS.INHERIT is no longer -1");
  assert.match(constants, /NONE:\s*0/, "DOCUMENT_OWNERSHIP_LEVELS.NONE is no longer 0");
  const { INHERIT, NONE } = await import("../module/blank-inheritance/scripts/core/ownership.mjs");
  assert.equal(INHERIT, -1);
  assert.equal(NONE, 0);
});

test("Foundry: the loop exists -- Document#getUserLevel defers INHERIT to the parent, TokenDocument#getUserLevel defers to its actor", (t) => {
  if (!existsSync(appRoot)) return t.skip(SKIP_FOUNDRY);
  const document = readApp("common/abstract/document.mjs");
  const getUserLevel = document.match(/\n  getUserLevel\(user\) \{[\s\S]*?\n  \}/);
  assert.ok(getUserLevel, "Document#getUserLevel moved");
  assert.match(getUserLevel[0], /if \( level !== DOCUMENT_OWNERSHIP_LEVELS\.INHERIT \) return level;/, "INHERIT is no longer the 'defer' level");
  assert.match(getUserLevel[0], /if \( this\.parent \) return this\.parent\.getUserLevel\(user\);/, "INHERIT no longer defers to the parent");

  const token = readApp("common/documents/token.mjs");
  const tokenLevel = token.match(/\n  getUserLevel\(user\) \{[\s\S]*?\n  \}/);
  assert.ok(tokenLevel, "TokenDocument#getUserLevel moved");
  assert.match(tokenLevel[0], /if \( this\.actor \) return this\.actor\.getUserLevel\(user\);/, "a token no longer asks its actor");
});

test("Foundry: an unlinked token's actor is a synthetic one parented to the token, and the world actor is baseActor", (t) => {
  if (!existsSync(appRoot)) return t.skip(SKIP_FOUNDRY);
  const token = readApp("client/documents/token.mjs");
  assert.match(token, /get actor\(\) \{\s*if \( this\.isLinked \) return this\.baseActor;/, "a linked token's actor is no longer the base actor");
  assert.match(token, /return this\.delta\?\.syntheticActor \?\? null;/, "an unlinked token's actor is no longer the delta's synthetic actor");
  assert.match(token, /get baseActor\(\) \{\s*return game\.actors\.get\(this\.actorId\) \?\? null;/, "baseActor is no longer the world Actor");

  const actor = readApp("client/documents/actor.mjs");
  assert.match(actor, /get isToken\(\) \{\s*if \( !this\.parent \) return false;\s*return this\.parent instanceof foundry\.documents\.TokenDocument;/, "Actor#isToken changed -- core/ownership.mjs#isPlayerOwned reads it");
  assert.match(actor, /get token\(\) \{\s*return this\.parent instanceof foundry\.documents\.TokenDocument \? this\.parent : null;/, "Actor#token changed -- core/ownership.mjs#isPlayerOwned reads it");
});

test("Foundry: hasPlayerOwner asks every non-GM user, which is what reaches the loop", (t) => {
  if (!existsSync(appRoot)) return t.skip(SKIP_FOUNDRY);
  const doc = readApp("client/documents/abstract/client-document.mjs");
  assert.match(doc, /get hasPlayerOwner\(\) \{\s*return game\.users\.some\(u => !u\.isGM && this\.testUserPermission\(u, "OWNER"\)\);/);
  const base = readApp("common/abstract/document.mjs");
  assert.match(base, /if \( user\.isGM \) level = perms\.OWNER;/, "a GM short-circuits: the loop is only ever reached for players");
});

test("Foundry: its own ownership dialog never stores INHERIT -- 'Default' is a UI-only meta level and the map is saved whole with _replace", (t) => {
  if (!existsSync(appRoot)) return t.skip(SKIP_FOUNDRY);
  const constants = readApp("common/constants.mjs");
  assert.match(constants, /Meta ownership levels that are used in the UI but never stored\./);
  assert.match(constants, /DOCUMENT_META_OWNERSHIP_LEVELS = Object\.freeze\(\{\s*DEFAULT:\s*-20,/);
  const dialog = readApp("client/applications/apps/document-ownership.mjs");
  assert.match(dialog, /if \( level === omit \) \{\s*delete levels\[userId\];/, "the dialog no longer drops 'Default' from the map");
  assert.match(dialog, /const ownership = _replace\(ownershipLevels\);\s*await document\.update\(\{ownership\}/, "the dialog no longer saves the map with _replace");
});

test("Foundry: _replace IS ForcedReplacement.create, reachable as foundry.data.operators.ForcedReplacement", (t) => {
  if (!existsSync(appRoot)) return t.skip(SKIP_FOUNDRY);
  assert.match(readApp("client/client.mjs"), /_replace: foundry\.data\.operators\.ForcedReplacement\.create,/);
  const operators = readApp("common/data/operators.mjs");
  assert.match(operators, /export class ForcedReplacement extends DataFieldOperator/);
  assert.match(operators, /static create\(value\)/);
});

test("Foundry: a '-=user' deletion cannot remove an ownership key (it is not a valid user id), so the map must be replaced whole", (t) => {
  if (!existsSync(appRoot)) return t.skip(SKIP_FOUNDRY);
  const fields = readApp("common/data/fields.mjs");
  const ownershipField = fields.match(/class DocumentOwnershipField extends ObjectField \{[\s\S]*?\n\}/);
  assert.ok(ownershipField, "DocumentOwnershipField moved");
  assert.match(ownershipField[0], /if \( \(k !== "default"\) && !isValidId\(k\) \) return false;/, "ownership keys are no longer validated as ids");
});

test("sf2e: its own actor data preparation asks hasPlayerOwner, so guarding only OUR readers could never be enough", (t) => {
  if (!existsSync(sf2ePath)) return t.skip(SKIP_SF2E);
  const sf2e = readFileSync(sf2ePath, "utf8");
  assert.match(sf2e, /this\.hasPlayerOwner \? `party` : `opposition`/, "sf2e no longer derives alliance from hasPlayerOwner in prepareData");
  assert.match(sf2e, /tiebreakPriority = this\.hasPlayerOwner \? 2 : 1/, "sf2e no longer derives the initiative tiebreak from hasPlayerOwner");
});

test("sf2e: only the Party actor is forced to a linked token, so a character's token being linked is OUR job", (t) => {
  if (!existsSync(sf2ePath)) return t.skip(SKIP_SF2E);
  const sf2e = readFileSync(sf2ePath, "utf8");
  assert.match(sf2e, /get allowSynthetics\(\) \{\s*return this\.type !== `party`;/, "sf2e now forces more actor types to be linked -- the explicit actorLink: true below may be redundant");
  assert.match(sf2e, /r\?\.allowSynthetics === !1 && e\.actorLink === !1 && \(this\._source\.actorLink = !0\)/);
});

/* ------------------------------------------------------------------ */
/*  Part 2 -- our source                                               */
/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

test("nothing in the module writes INHERIT -- the only executable mentions are the ownership rules and the handouts' journal pages", () => {
  // handouts.mjs works on JournalEntry ownership, where INHERIT is a page's own default and
  // is legitimate; an Actor is the only document whose INHERIT can reach a token's loop.
  // ownership-repair.mjs only NAMES it, in the line it logs when it removes one.
  const allowed = new Set(["core/ownership.mjs", "core/handouts.mjs", "foundry/ownership-repair.mjs"]);
  const offenders = [];
  for (const file of walk(scriptsRoot)) {
    const rel = path.relative(scriptsRoot, file).split(path.sep).join("/");
    if (allowed.has(rel)) continue;
    if (/\bINHERIT\b/.test(code(readFileSync(file, "utf8")))) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], "these files mention INHERIT in code. Writing it into an Actor's ownership makes its unlinked tokens loop forever (core/ownership.mjs). If it really is not an Actor, add the file to this test's allowlist with the reason.");
});

test("returnTestParty restores through restoredOwnership and replaces the map whole -- it no longer writes `ownership.<id>` at all", () => {
  const actions = readScript("foundry/admin-actions.mjs");
  const fn = actions.match(/export async function returnTestParty\(\) \{[\s\S]*?\n\}/);
  assert.ok(fn, "returnTestParty is missing from admin-actions.mjs");
  assert.match(fn[0], /restoredOwnership\(actor\.toObject\(\)\.ownership, userId, previousLevel\)/, "no longer computes the restored map through core/ownership.mjs");
  assert.match(fn[0], /ownership: foundry\.data\.operators\.ForcedReplacement\.create\(ownership\)/, "no longer replaces the whole map -- a key cannot otherwise leave it");
  assert.doesNotMatch(code(fn[0]), /INHERIT|`ownership\.\$\{userId\}`/, "writes a single ownership key again");
  assert.match(actions, /import \{ restoredOwnership \} from "\.\.\/core\/ownership\.mjs";/);
});

test("lendTestParty still records the previous level, which is what the restore needs", () => {
  const actions = readScript("foundry/admin-actions.mjs");
  const fn = actions.match(/export async function lendTestParty\(\) \{[\s\S]*?\n\}/);
  assert.ok(fn);
  assert.match(fn[0], /const previousLevel = actor\.toObject\(\)\.ownership\?\.\[userId\] \?\? null;/);
  assert.match(fn[0], /record\[userId\] = \{ actorId, previousLevel \};/);
});

test("a GM's ready hook repairs actor ownership, in its own try so it can never block ready", () => {
  const entry = readScript("blank-inheritance.mjs");
  assert.match(entry, /import \{ repairActorOwnership \} from "\.\/foundry\/ownership-repair\.mjs";/);
  assert.match(entry, /try \{\s*await repairActorOwnership\(\);\s*\} catch \(err\) \{\s*console\.error\("Blank Inheritance \| Could not repair actor ownership:", err\);/);
  const ready = entry.match(/Hooks\.once\("ready", async \(\) => \{[\s\S]*?\n\}\);/);
  assert.ok(ready, "the ready hook moved");
  const gmBlock = ready[0].match(/if \(game\.user\.isGM\) \{[\s\S]*?\n  \}\n/);
  assert.ok(gmBlock, "the GM-only block in ready moved");
  assert.match(gmBlock[0], /repairActorOwnership\(\)/, "the repair is no longer in the GM-only block");
});

test("repairActorOwnership is GM-only and replaces the map whole", () => {
  const repair = readScript("foundry/ownership-repair.mjs");
  const fn = repair.match(/export async function repairActorOwnership\(\) \{[\s\S]*?\n\}/);
  assert.ok(fn);
  assert.match(fn[0], /if \(!game\.user\?\.isGM\) return \[\];/);
  assert.match(fn[0], /foundry\.data\.operators\.ForcedReplacement\.create\(fix\.ownership\)/);
  assert.match(repair, /from "\.\.\/core\/ownership\.mjs"/);
});

test("our readers ask the world actor: the cast board and the deck never call hasPlayerOwner on a token's or combatant's actor", () => {
  for (const rel of ["foundry/cast.mjs", "foundry/deck.mjs"]) {
    const source = readScript(rel);
    assert.match(source, /import \{ isPlayerOwned \} from "\.\.\/core\/ownership\.mjs";/, `${rel} no longer imports isPlayerOwned`);
    assert.doesNotMatch(code(source), /\bactor\?\.hasPlayerOwner\b/, `${rel} reads hasPlayerOwner off a token/combatant actor again -- that loops on an unlinked token with an INHERIT entry`);
  }
  assert.match(readScript("foundry/cast.mjs"), /isPC: isPlayerOwned\(token\.actor\),/);
  const deck = readScript("foundry/deck.mjs");
  assert.match(deck, /isPC: isPlayerOwned\(c\.actor\),/);
  assert.match(deck, /hasPlayerOwner: isPlayerOwned\(current\?\.actor\)/);
});

test("every token the module places for a character is linked (create AND heal), so its actor is the world actor", () => {
  const sites = {
    "foundry/city-pawns.mjs": { atLeast: 2, why: "a pawn is created linked and an existing one is healed" },
    "foundry/demo-runner.mjs": { atLeast: 3, why: "the demo actors' prototype token, the created token, and the heal of an existing one" },
    "foundry/travel-test-fixtures.mjs": { atLeast: 3, why: "the fixture actors' prototype token, the created token, and the heal of an existing one" }
  };
  for (const [rel, { atLeast, why }] of Object.entries(sites)) {
    const count = (code(readScript(rel)).match(/actorLink: true/g) ?? []).length;
    assert.ok(count >= atLeast, `${rel} has ${count} 'actorLink: true' (need ${atLeast}: ${why})`);
  }
  // A pawn is built from the actor's own prototype token (`...base`), whose link may be false (the
  // demo "Candidate" actors are). The override has to come AFTER the spread or it overrides nothing.
  assert.match(code(readScript("foundry/city-pawns.mjs")), /\.\.\.base,[\s\S]{0,400}?actorLink: true,/, "a pawn's actorLink: true no longer comes after ...base, so an unlinked prototype token would win");
});

test("no new place creates tokens for actors without saying how they link: every Token create site is accounted for", () => {
  // Files that create tokens and why each is fine. A new file here fails the test until someone
  // decides: link it, or add it below with the reason it cannot loop.
  const accounted = {
    "foundry/city-pawns.mjs": "pawns -- built from the actor then forced actorLink: true",
    "foundry/demo-runner.mjs": "demo party -- actorLink: true",
    "foundry/travel-test-fixtures.mjs": "diagnostic fixtures -- actorLink: true",
    "foundry/scene-build.mjs": "scene tokens are built with their own actorLink (true) in the token payload",
    "foundry/landing-scene.mjs": "a freshly created character's token, from actor.getTokenDocument(): a real character is made by Actor.create, which sf2e links by default",
    "foundry/admin-actions.mjs": "the reset's undo re-creates pawns from their own recorded token data, which already says how they were linked",
    "foundry/travel.mjs": "the shared party marker -- it has no actorId, so there is no actor behind it to loop"
  };
  const creators = [];
  for (const file of walk(scriptsRoot)) {
    const rel = path.relative(scriptsRoot, file).split(path.sep).join("/");
    if (/createEmbeddedDocuments\(\s*"Token"/.test(code(readFileSync(file, "utf8")))) creators.push(rel);
  }
  assert.deepEqual(creators.sort(), Object.keys(accounted).sort(), "the set of files that create Tokens changed -- decide how the new one links its actor, then list it here");
  assert.match(code(readScript("foundry/scene-build.mjs")), /actorLink: true/);
});

test("the command bar's render promises are caught and reported, not left to surface as 'Uncaught (in promise)'", () => {
  const bar = readScript("foundry/command-bar.mjs");
  assert.match(bar, /function reportFailedRender\(rendered\) \{\s*Promise\.resolve\(rendered\)\.catch\(/);
  const mount = bar.match(/export function mountCommandBar\(BarClass\) \{[\s\S]*?\n\}/);
  assert.ok(mount);
  assert.equal((mount[0].match(/reportFailedRender\(active\.render\(\{ force: true \}\)\)/g) ?? []).length, 2, "mountCommandBar has an unguarded render()");
  const refresh = bar.match(/export function refreshCommandBar\(parts = null\) \{[\s\S]*?\n\}/);
  assert.ok(refresh);
  assert.match(refresh[0], /reportFailedRender\(active\.render\(/);
});

/* ------------------------------------------------------------------ */
/*  Part 3 -- the repair, run against a stub game                      */
/* ------------------------------------------------------------------ */

function stubGame({ isGM = true, actors = [] } = {}) {
  const updates = [];
  const docs = actors.map((a) => ({
    id: a.id,
    name: a.name,
    toObject: () => ({ ownership: structuredClone(a.ownership) }),
    update: async (data, options) => { updates.push({ id: a.id, data, options }); }
  }));
  const byId = new Map(docs.map((d) => [d.id, d]));
  globalThis.game = { user: { isGM }, actors: { contents: docs, get: (id) => byId.get(id) } };
  globalThis.foundry = { data: { operators: { ForcedReplacement: { create: (value) => ({ __forced: true, value }) } } } };
  return updates;
}

test("repairActorOwnership rewrites only the actors that need it, with the whole clean map, and never touches a clean one", async () => {
  const { repairActorOwnership } = await import("../module/blank-inheritance/scripts/foundry/ownership-repair.mjs");
  const updates = stubGame({
    actors: [
      { id: "clean", name: "Clean", ownership: { default: 0, GM: 3 } },
      { id: "pc1", name: "PC 1", ownership: { default: 1, GM: 3, liam: -1, craig: -1 } }
    ]
  });
  const origWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    const plan = await repairActorOwnership();
    assert.deepEqual(plan.map((p) => p.id), ["pc1"]);
    assert.equal(updates.length, 1, "exactly one actor was updated");
    assert.equal(updates[0].id, "pc1");
    assert.deepEqual(updates[0].data.ownership, { __forced: true, value: { default: 1, GM: 3 } }, "the whole clean map, wrapped as a forced replacement");
    assert.equal(updates[0].options.render, false);
    assert.equal(warnings.length, 1, "one line, naming the actor");
    assert.match(warnings[0], /PC 1 \(2\)/);
  } finally {
    console.warn = origWarn;
    delete globalThis.game;
    delete globalThis.foundry;
  }
});

test("repairActorOwnership is silent and writes nothing when the world is clean, and does nothing at all for a player", async () => {
  const { repairActorOwnership } = await import("../module/blank-inheritance/scripts/foundry/ownership-repair.mjs");
  const origWarn = console.warn;
  let warned = 0;
  console.warn = () => { warned++; };
  try {
    let updates = stubGame({ actors: [{ id: "a", name: "A", ownership: { default: 0, GM: 3, liam: 3 } }] });
    assert.deepEqual(await repairActorOwnership(), []);
    assert.equal(updates.length, 0);
    assert.equal(warned, 0, "silent when there is nothing to do");

    updates = stubGame({ isGM: false, actors: [{ id: "b", name: "B", ownership: { default: 1, liam: -1 } }] });
    assert.deepEqual(await repairActorOwnership(), [], "a player's client never rewrites ownership");
    assert.equal(updates.length, 0);
  } finally {
    console.warn = origWarn;
    delete globalThis.game;
    delete globalThis.foundry;
  }
});
