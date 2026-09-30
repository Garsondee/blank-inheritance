// Tier 1 — who at the table can browse the server's files.
//
// Name protection cannot reach Foundry's file browser, so the module tells the
// GM when someone can open it. This proves the check names the right people.

import { test } from "node:test";
import assert from "node:assert/strict";

import { ROLES, playersWhoCanBrowseFiles } from "../module/blank-inheritance/scripts/core/file-exposure.mjs";

const USERS = [
  { name: "Ingram", role: ROLES.GAMEMASTER },
  { name: "Liam", role: ROLES.PLAYER },
  { name: "Pippa", role: ROLES.TRUSTED },
  { name: "Craig", role: ROLES.TRUSTED }
];

test("Foundry's default (Trusted may browse) names every Trusted player and nobody else", () => {
  assert.deepEqual(playersWhoCanBrowseFiles(USERS, [ROLES.TRUSTED, ROLES.ASSISTANT, ROLES.GAMEMASTER]), ["Pippa", "Craig"]);
});

test("with browsing limited to assistants and GMs no player is named", () => {
  assert.deepEqual(playersWhoCanBrowseFiles(USERS, [ROLES.ASSISTANT, ROLES.GAMEMASTER]), []);
});

test("the GM is never named, even though their role can browse", () => {
  assert.ok(!playersWhoCanBrowseFiles(USERS, [ROLES.GAMEMASTER]).includes("Ingram"));
});

test("if plain players may browse, they are named too", () => {
  assert.deepEqual(playersWhoCanBrowseFiles(USERS, [ROLES.PLAYER, ROLES.TRUSTED]), ["Liam", "Pippa", "Craig"]);
});

test("no users or no permission list gives an empty answer rather than throwing", () => {
  assert.deepEqual(playersWhoCanBrowseFiles(), []);
  assert.deepEqual(playersWhoCanBrowseFiles(USERS), []);
});
