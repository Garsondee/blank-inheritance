/**
 * The Character Card's storage — the Foundry-touching half.
 *
 * Split across two homes on purpose, and the split is a security boundary
 * rather than a filing preference:
 *
 *   WHAT THE TABLE KNOWS lives on the NPC Actor as a flag — the current
 *   attitude, and the ids of facts that have been revealed. None of it is
 *   secret: attitude is perceptible in fiction, and a revealed fact is by
 *   definition already known.
 *
 *   WHAT THE GM AUTHORED lives in a GM-only JournalEntry
 *   (`ownership.default: NONE`), which keeps it out of every player's sidebar
 *   and UI. An Actor flag would be on every screen that draws the actor.
 *
 *   VERIFIED LIVE 2026-09-29 (design/theatre-of-the-mind-staging.md §12.1): ownership does NOT
 *   stop a document being sent. A Player-role client held every NONE-ownership Actor and
 *   JournalEntry in full, including this kind of vault and other players' private handouts.
 *   So this is a boundary against the UI and against casual inspection, not against a player
 *   who opens the browser's developer tools. Nothing here is cryptographic secrecy.
 *
 * The journal is used as a keyed container rather than as prose. That is
 * unusual and deliberate: it is the only document type Foundry lets us keep
 * out of every player-facing screen, and the alternative (a world setting) is
 * readable by every client by design.
 */

import { deriveFoundryId } from "../core/ids.mjs";
import { DEFAULT_ATTITUDE, isAttitude } from "../core/social-intel.mjs";

const MODULE_ID = "blank-inheritance";
const FLAG_KEY = "social";
const INTEL_SOURCE_ID = "social-intel-vault";
const INTEL_NAME = "Blank Inheritance — Social Intel (GM only)";

/* ---------------------------------------------------------------- */
/*  What the table knows: on the actor                               */
/* ---------------------------------------------------------------- */

export function readSocial(actor) {
  const stored = actor?.getFlag?.(MODULE_ID, FLAG_KEY) ?? {};
  return {
    attitude: isAttitude(stored.attitude) ? stored.attitude : DEFAULT_ATTITUDE,
    revealedIds: Array.isArray(stored.revealedFactIds) ? stored.revealedFactIds : []
  };
}

export async function setAttitude(actor, attitude) {
  if (!actor || !isAttitude(attitude)) return null;
  const current = readSocial(actor);
  await actor.setFlag(MODULE_ID, FLAG_KEY, { ...current, attitude, revealedFactIds: current.revealedIds });
  return attitude;
}

/**
 * Reveal a fact, permanently and party-wide.
 *
 * Permanent because that is the design: a fact learned in one scene is usable
 * in every later scene with that NPC. There is deliberately no un-reveal on
 * the normal path — un-learning something the table has already acted on is a
 * retcon, not an undo, and it should feel like one.
 */
export async function revealFact(actor, factId) {
  if (!actor || !factId) return null;
  const current = readSocial(actor);
  if (current.revealedIds.includes(factId)) return current.revealedIds;

  const revealedFactIds = [...current.revealedIds, factId];
  await actor.setFlag(MODULE_ID, FLAG_KEY, { attitude: current.attitude, revealedFactIds });
  return revealedFactIds;
}

/* ---------------------------------------------------------------- */
/*  What the GM authored: in a GM-only journal                       */
/* ---------------------------------------------------------------- */

/**
 * The vault, or null if it does not exist yet.
 *
 * Never created implicitly by a read: a player's client calling this must get
 * null rather than quietly trying (and failing) to create a document.
 */
export function findIntelVault() {
  return game.journal?.find((entry) => entry.getFlag?.(MODULE_ID, "sourceId") === INTEL_SOURCE_ID) ?? null;
}

/**
 * Create the vault if it is missing. GM only.
 *
 * ownership.default NONE is the entire point — see the header. If this is
 * ever loosened, unrevealed fact text starts being broadcast to every client
 * that can see the journal directory.
 */
export async function ensureIntelVault() {
  if (!game.user?.isGM) return null;

  const existing = findIntelVault();
  if (existing) return existing;

  const id = await deriveFoundryId(INTEL_SOURCE_ID);
  return JournalEntry.create(
    {
      _id: id,
      name: INTEL_NAME,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: { [MODULE_ID]: { sourceId: INTEL_SOURCE_ID, facts: {} } }
    },
    { keepId: true }
  );
}

/**
 * The authored social profile for one actor, or null.
 *
 * NOT null on a player's client. The vault is not in a player's sidebar, but
 * the document is still sent to them and `findIntelVault` finds it (verified
 * live 2026-09-29, design/theatre-of-the-mind-staging.md §12.1). What keeps a
 * player from seeing unrevealed Facts is core/social-intel.mjs#buildCard's
 * redaction, so never hand this function's result to a player-facing surface.
 */
export function authoredProfileFor(actorId) {
  const vault = findIntelVault();
  if (!vault || !actorId) return null;
  const facts = vault.getFlag(MODULE_ID, "facts") ?? {};
  return facts[actorId] ?? null;
}

/**
 * Store an authored profile for one actor. GM only.
 *
 * Takes the whole profile rather than merging field by field, because the
 * authored side is generated from `data/npcs/*.json` by the sync pipeline and
 * the repo is its source of truth — a partial merge here would let a stale
 * fact survive a deliberate deletion upstream.
 */
export async function writeAuthoredProfile(actorId, profile) {
  if (!game.user?.isGM || !actorId) return null;
  const vault = await ensureIntelVault();
  if (!vault) return null;

  const facts = { ...(vault.getFlag(MODULE_ID, "facts") ?? {}) };
  if (profile === null) delete facts[actorId];
  else facts[actorId] = profile;

  await vault.setFlag(MODULE_ID, "facts", facts);
  return profile;
}
