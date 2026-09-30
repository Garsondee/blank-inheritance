// Tier 3 — the admin panel's Foundry half (foundry/admin-actions.mjs,
// admin-autopilot.mjs, admin-panel.mjs) and where the module hands work to it.
//
// Pinned by reading the source, like tier3-city-departures-contract.test.mjs:
// Foundry's settings, documents and dialogs are not modelled by
// mock-foundry.mjs. The rules themselves are tested in tier1-admin.test.mjs.
//
// The first test is the one that matters most as the module grows: a system
// added next month that keeps its state in a world setting must say whether a
// reset puts that setting back or leaves it, or this fails.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { KEPT_SETTINGS, RESET_SETTINGS, resetPlan } from "../module/blank-inheritance/scripts/core/admin.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (rel) => readFileSync(path.join(moduleRoot, rel), "utf8");

const actions = read("scripts/foundry/admin-actions.mjs");
const autopilot = read("scripts/foundry/admin-autopilot.mjs");
const panel = read("scripts/foundry/admin-panel.mjs");
const template = read("templates/admin/panel.hbs");
const entry = read("scripts/blank-inheritance.mjs");
// The code alone: comments may (and do) say what the code must never touch.
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (name.endsWith(".mjs")) yield full;
  }
}

/** Every world-scoped setting key registered by the module, with constants resolved within their own file. */
function worldSettings() {
  const found = new Map();
  for (const file of walk(path.join(moduleRoot, "scripts"))) {
    const src = readFileSync(file, "utf8");
    const consts = new Map([...src.matchAll(/(?:export\s+)?const\s+([A-Z_]+)\s*=\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
    for (const m of src.matchAll(/game\.settings\.register\(\s*MODULE_ID\s*,\s*([A-Za-z_]+|"[^"]+"|setting\.key)\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
      if (!/scope:\s*"world"/.test(m[2])) continue;
      const raw = m[1];
      const key = raw.startsWith('"') ? raw.slice(1, -1) : consts.get(raw) ?? raw;
      found.set(key, path.relative(repoRoot, file));
    }
  }
  return found;
}

test("every world setting the module registers is either reset or deliberately kept -- never neither", () => {
  const settings = worldSettings();
  assert.ok(settings.size >= 15, `expected to find the module's world settings, found ${settings.size}`);
  for (const [key, file] of settings) {
    if (key === "setting.key") continue; // theme.mjs registers its own client-and-world list by loop; none are play state
    assert.ok(
      RESET_SETTINGS.includes(key) || key in KEPT_SETTINGS,
      `${file} registers world setting "${key}", which core/admin.mjs neither resets (RESET_SETTINGS) nor keeps (KEPT_SETTINGS). Decide which, so a reset cannot silently skip it.`
    );
  }
  for (const key of [...RESET_SETTINGS, ...Object.keys(KEPT_SETTINGS)]) {
    assert.ok(settings.has(key), `core/admin.mjs names "${key}", but no world setting of that name is registered any more`);
  }
});

test("a reset saves its snapshot before changing anything, and stops if it cannot", () => {
  const body = actions.slice(actions.indexOf("export async function resetToStart("));
  const snap = body.indexOf("file = await saveSnapshot(await takeSnapshot(options));");
  const loop = body.indexOf("for (const step of plan.slice(1))");
  assert.ok(snap > 0 && loop > snap, "the snapshot is no longer taken before the reset steps run");
  assert.match(body, /catch \(err\) \{[\s\S]*?return \{ ok: false, reason: "no-snapshot"/, "a failed snapshot no longer stops the reset");
  assert.equal(resetPlan()[0].id, "snapshot");
});

test("a reset never touches Ingram's scene edits, authored content, or a handout's words", () => {
  assert.doesNotMatch(code(actions), /scene-edit|sceneEdit/i, "the admin actions reach into scene edits");
  assert.doesNotMatch(code(actions), /JournalEntry[^;\n]*delete|journal[^;\n]*\.delete\(/i, "the reset deletes journal entries; handouts are taken back, never deleted");
  // Handouts: only their ownership changes.
  assert.match(actions, /async papers\(\) \{\s*for \(const entry of handoutEntries\(\)\) \{\s*const ownership = entry\.toObject\(\)\.ownership \?\? \{\};\s*await entry\.update\(\{ ownership: revoked\(ownership\) \}\);/);
  // Only campaign scenes lose their stage; demo and hand-made scenes keep theirs.
  assert.match(actions, /const campaignScenes = \(\) => game\.scenes\.filter\(\(s\) => typeof flag\(s, "kind"\) === "string"\);/);
  // The snapshot file can never be mistaken for a scene-edit record.
  assert.match(read("scripts/core/admin.mjs"), /export const SNAPSHOT_PREFIX = "admin-snapshot-";/);
});

test("every admin action checks for a GM itself, never trusting the button", () => {
  const exported = [...actions.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
  const exempt = new Set(["loadEpisode", "loadEpisodes", "startOfAdventure", "readLastSnapshot", "authoredDepartures"]);
  for (const name of exported.filter((n) => !exempt.has(n))) {
    const body = actions.slice(actions.indexOf(`export async function ${name}(`));
    const head = body.slice(0, body.indexOf("\n}\n"));
    assert.match(head, /if \(!isGM\(\)/, `${name} does not check for a GM`);
  }
  assert.match(panel, /export function openAdminPanel\(\) \{\s*if \(!game\.user\?\.isGM\) return null;/);
});

test("the stand-ins act only on the active GM's client, by the rules a real player meets", () => {
  assert.match(autopilot, /const isActiveGM = \(\) => Boolean\(game\.user\?\.isGM && game\.users\.activeGM\?\.isSelf\);/);
  assert.match(autopilot, /await gmPick\(userId, choice, \{ isGM: false \}\)/, "a stand-in's pick skips the room and eligibility rules");
  // A roll carries the Runner's own tag, so the Runner records it as it records a click.
  assert.match(autopilot, /extraRollOptions: check\.options,/);
  // A result is never mistaken for a request, and only the GM's own posts are answered.
  assert.match(autopilot, /if \(message\.rolls\?\.length \|\| message\.author\?\.id !== game\.user\.id\) return;/);
  // The switches are the GM's own: client scope.
  assert.match(autopilot, /game\.settings\.register\(MODULE_ID, SETTING_AUTOPILOT, \{\s*scope: "client",/);
});

test("every button in the panel has a handler, and every handler a button", () => {
  const buttons = new Set([...template.matchAll(/data-action="(\w+)"/g)].map((m) => m[1]));
  const block = panel.slice(panel.indexOf("actions: {"), panel.indexOf("}", panel.indexOf("actions: {")));
  const handlers = new Set([...block.matchAll(/(\w+): AdminPanel\.#on\w+/g)].map((m) => m[1]));
  for (const b of buttons) assert.ok(handlers.has(b), `the template has a "${b}" button with no handler`);
  for (const h of handlers) assert.ok(buttons.has(h), `the handler "${h}" has no button`);
});

test("the reset confirmation can name every step the plan can contain", () => {
  const every = resetPlan({ clearChat: true, endCombats: true, cutToStart: true, deleteInductionCharacters: true });
  for (const step of every) {
    assert.match(panel, new RegExp(`${step.id}: "BLANKINHERITANCE\\.Admin\\.Step\\.${step.id}"`), `no label for reset step "${step.id}"`);
    if (step.id !== "snapshot") assert.match(actions, new RegExp(`async ${step.id}\\(`), `no reset step "${step.id}" in admin-actions.mjs`);
  }
});

test("the panel is reachable: API, macro, the Director's Palette and the Console hub", () => {
  assert.match(entry, /^\s*openAdminPanel,\s*$/m, "openAdminPanel is not on mod.api");
  assert.match(entry, /registerAdminSettings\(\(\) => refreshAdminPanel\(\)\);/);
  assert.match(entry, /registerAutopilotSettings\(\(\) => refreshAdminPanel\(\)\);/);
  assert.match(entry, /registerAutopilotHooks\(\);/);
  assert.match(entry, /await createAdminMacroIfMissing\(\);/);
  assert.match(read("scripts/foundry/director-palette.mjs"), /id: "panel\.admin"[^\n]*run: \(\) => openAdminPanel\(\)/);
  assert.match(read("scripts/foundry/console-window.mjs"), /id: "admin", labelKey: "BLANKINHERITANCE\.Console\.Window\.Hub\.Admin"[^\n]*open: \(\) => openAdminPanel\(\)/);
});
