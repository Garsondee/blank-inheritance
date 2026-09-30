/**
 * The stage's GM-only vault and the record of which names the table knows.
 *
 * Split out of foundry/stage.mjs so anything that needs to ask "does the table
 * know this person's name?" (the hidden reference tokens in scene-build.mjs,
 * the Runner) can do so without importing the overlay class, which touches
 * Foundry's ApplicationV2 the moment it is loaded.
 *
 * WHY A VAULT: a JournalEntry with `ownership.default: NONE` stays out of every
 * player's sidebar, sheets and stage. Same pattern as foundry/social-store.mjs
 * and foundry/campaign-state.mjs.
 *
 * WHAT IT IS NOT: secrecy. Verified live 2026-09-29 (design/theatre-of-the-
 * mind-staging.md §12.1): Foundry still SENDS a NONE-ownership document to a
 * Player-role client, so anyone who opens the browser's developer tools can
 * read this vault. The stage's real protection is what it PUBLISHES (nothing
 * name-bearing), which stops every on-screen and casual leak.
 */

import { deriveFoundryId } from "../core/ids.mjs";
import { knownSet } from "../core/stage-names.mjs";

export const MODULE_ID = "blank-inheritance";
const VAULT_SOURCE_ID = "stage-cast-vault";
const VAULT_NAME = "Blank Inheritance — Staged Casts (GM only)";

export async function ensureStageVault() {
  if (!game.user.isGM) return null;
  const id = await deriveFoundryId(VAULT_SOURCE_ID);
  const existing = game.journal.get(id);
  if (existing) return existing;
  return JournalEntry.create(
    {
      _id: id,
      name: VAULT_NAME,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: { [MODULE_ID]: { sourceId: VAULT_SOURCE_ID, casts: {} } }
    },
    { keepId: true }
  );
}

/**
 * GM only. The name keys the table has been told, with when.
 *
 * Per person, not per scene, so a name learned once is known wherever that
 * person appears, the way the Character Card's Facts already work.
 */
export async function readKnownNames() {
  if (!game.user.isGM) return new Set();
  const vault = await ensureStageVault();
  return knownSet(vault?.getFlag(MODULE_ID, "names") ?? {});
}

/** GM only. File a name as known, without touching any scene. */
export async function markNameKnown(nameKey, at = Date.now()) {
  if (!game.user.isGM || !nameKey) return;
  const vault = await ensureStageVault();
  await vault?.setFlag(MODULE_ID, "names", { [nameKey]: at });
}
