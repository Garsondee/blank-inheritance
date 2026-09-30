/**
 * The campaign clock and the downtime board — the Foundry-touching half.
 *
 * Four problems, four homes, and the homes are chosen for what each one
 * GUARANTEES rather than for tidiness:
 *
 *   THE MOMENT (day + quarter) is a world setting. Every client needs the same
 *   answer at the same instant, `game.settings.get` is a synchronous read, and
 *   `onChange` fires on every client — which is exactly the shape a segment
 *   transition ceremony needs. It is not secret and never was.
 *
 *   PUBLIC COMMITMENTS are a world setting for the same reasons. Watching a
 *   teammate take the last technician-day is the point of a shared board.
 *
 *   PRIVATE COMMITMENTS are a GM-only JournalEntry (`ownership.default: NONE`),
 *   because ANY client can read ANY world setting. Putting a private mission in
 *   a setting and not rendering it would be a CSS lie: the string would sit in
 *   the one place every player-facing screen already reads. A GM-only journal
 *   is read by none of them. Doctrine Law 11 is removal, not hiding. Same
 *   boundary, same reasoning as foundry/social-store.mjs, and the same limit
 *   (see the note on the container below): the document is still sent.
 *
 *   A PLAYER'S OWN private commitments reach them over the module socket, sent
 *   individually rather than broadcast, so no other client is handed that
 *   message.
 *
 * Every decision about what any of it MEANS lives in core/commitments.mjs and
 * core/day-ring.mjs. This file only reads, writes, and routes.
 */

import { advance, isNewDay, momentKey, normalizeMoment } from "../core/day-ring.mjs";
import { VISIBILITY, normalizeOffers, segmentState } from "../core/commitments.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { fetchModuleJson } from "./io.mjs";

const MODULE_ID = "blank-inheritance";
const SETTING_MOMENT = "campaignMoment";
const SETTING_COMMITMENTS = "commitments";
const SOCKET = `module.${MODULE_ID}`;
const VAULT_SOURCE_ID = "downtime-private-vault";
const VAULT_NAME = "Blank Inheritance — Private Downtime (GM only)";

/**
 * Repo `data/campaign/config.json` lands under the module at this path.
 *
 * tools/module-sync/stage-campaign-data.mjs stages each allow-listed
 * subdirectory of repo-root `data/` and pushes the lot into the module's
 * `data/campaign/`, so repo `data/campaign/…` becomes module
 * `data/campaign/campaign/…`. The doubled segment looks like a typo and is
 * not — the same shape is already relied on by sync.mjs's REAL_EPISODE_PATHS.
 */
const CONFIG_PATH = "data/campaign/campaign/config.json";

/* ---------------------------------------------------------------- */
/*  Settings                                                         */
/* ---------------------------------------------------------------- */

/**
 * @param {(change: object) => void} onChange fired on EVERY client when the
 *   world setting changes — this is the transition ceremony's trigger, and the
 *   reason the moment is not stored on a scene flag or in a journal.
 */
export function registerCampaignSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_MOMENT, {
    scope: "world",
    config: false,
    type: Object,
    default: { day: 1, quarter: "morning" },
    onChange
  });

  game.settings.register(MODULE_ID, SETTING_COMMITMENTS, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange
  });
}

export function currentMoment() {
  return normalizeMoment(game.settings.get(MODULE_ID, SETTING_MOMENT));
}

/** GM only. Returns what actually changed, so a caller can stage the ceremony. */
export async function setMoment(moment) {
  if (!game.user.isGM) return null;
  const before = currentMoment();
  const after = normalizeMoment(moment);
  await game.settings.set(MODULE_ID, SETTING_MOMENT, after);
  return { before, after, newDay: isNewDay(before, after) };
}

/** GM only. The Director's "next quarter" control. */
export async function advanceSegment(steps = 1) {
  return setMoment(advance(currentMoment(), steps));
}

/* ---------------------------------------------------------------- */
/*  Commitments: the public half                                     */
/* ---------------------------------------------------------------- */

function publicCommitments() {
  const stored = game.settings.get(MODULE_ID, SETTING_COMMITMENTS);
  return Array.isArray(stored) ? stored : [];
}

/**
 * Take (or release) a slice.
 *
 * A public commitment goes straight into the world setting. A private one
 * never touches it — see writePrivateCommitment. Passing `activityId: null`
 * releases whatever the user had booked for that quarter, which is how a
 * player changes their mind without needing a second control.
 *
 * Writing a world setting requires GM permission, so a player's click has to
 * travel to the GM's client first (`requestCommitment` below). That is a
 * Foundry constraint, not a design choice, and it is why this function is not
 * simply called from the player's button handler.
 */
export async function writePublicCommitment({ userId, userName, activityId, moment = currentMoment() }) {
  if (!game.user.isGM) return null;
  const here = momentKey(moment);
  const kept = publicCommitments().filter((c) => !(c.userId === userId && c.momentKey === here));
  const next = activityId
    ? [...kept, { userId, userName: userName ?? null, momentKey: here, activityId, visibility: VISIBILITY.PUBLIC }]
    : kept;
  await game.settings.set(MODULE_ID, SETTING_COMMITMENTS, next);
  return next;
}

/* ---------------------------------------------------------------- */
/*  Commitments: the private half                                    */
/* ---------------------------------------------------------------- */

/**
 * The GM-only container. `ownership.default: NONE` keeps it out of every
 * player's sidebar and UI; everything else here depends on that one field
 * being right.
 *
 * VERIFIED LIVE 2026-09-29 (design/theatre-of-the-mind-staging.md §12.1): ownership does NOT
 * stop a document being sent. A Player-role client held every NONE-ownership Actor and
 * JournalEntry in full, including this kind of vault and other players' private handouts.
 * So this is a boundary against the UI and against casual inspection, not against a player
 * who opens the browser's developer tools. Nothing here is cryptographic secrecy.
 */
export async function ensureDowntimeVault() {
  if (!game.user.isGM) return null;
  const id = await deriveFoundryId(VAULT_SOURCE_ID);
  const existing = game.journal.get(id);
  if (existing) return existing;
  return JournalEntry.create(
    {
      _id: id,
      name: VAULT_NAME,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: { [MODULE_ID]: { sourceId: VAULT_SOURCE_ID, private: [] } }
    },
    { keepId: true }
  );
}

/** GM only. Every private commitment, for every user. */
export async function readPrivateCommitments() {
  if (!game.user.isGM) return [];
  const vault = await ensureDowntimeVault();
  const stored = vault?.getFlag(MODULE_ID, "private");
  return Array.isArray(stored) ? stored : [];
}

/**
 * GM only. Records a private commitment and pushes it to its owner alone.
 *
 * `note` is the authored secret — "meeting the Advocate, alone" — and is the
 * reason none of this can live in a world setting.
 */
export async function writePrivateCommitment({ userId, userName, activityId, note = null, moment = currentMoment() }) {
  if (!game.user.isGM) return null;
  const vault = await ensureDowntimeVault();
  if (!vault) return null;
  const here = momentKey(moment);
  const kept = (await readPrivateCommitments()).filter((c) => !(c.userId === userId && c.momentKey === here));
  const next = activityId
    ? [...kept, { userId, userName: userName ?? null, momentKey: here, activityId, note, visibility: VISIBILITY.PRIVATE }]
    : kept;
  await vault.setFlag(MODULE_ID, "private", next);

  // No marker in the shared store: a private commitment leaves no trace for
  // anyone else (Ingram, 2026-09-28). Clearing any marker an older version
  // wrote keeps a world that already has one from leaking it.
  await clearOccupancyMarker({ userId, moment });
  pushPrivateTo(userId, next.filter((c) => c.userId === userId));
  return next;
}

/**
 * Remove the "this quarter is taken" marker older versions wrote into the
 * shared store for a private commitment. A private commitment now leaves no
 * trace there at all (core/commitments.mjs, VISIBILITY).
 */
async function clearOccupancyMarker({ userId, moment }) {
  const here = momentKey(moment);
  const current = publicCommitments();
  const next = current.filter((c) => !(c.userId === userId && c.momentKey === here && c.visibility === VISIBILITY.PRIVATE));
  if (next.length !== current.length) await game.settings.set(MODULE_ID, SETTING_COMMITMENTS, next);
  return next;
}

/* ---------------------------------------------------------------- */
/*  The socket: a secret goes to exactly one client                  */
/* ---------------------------------------------------------------- */

/** Each client's own private commitments, as delivered. Never anyone else's. */
let myPrivate = [];

function pushPrivateTo(userId, commitments) {
  game.socket.emit(SOCKET, { type: "downtime-private", userId, commitments });
  if (game.user.id === userId) myPrivate = commitments;
}

/**
 * A player asks for a slice; the GM's client is the one that can actually
 * write it.
 *
 * World settings are GM-writable only, so a player's click cannot land the
 * change itself. That is a Foundry permission fact, not a design choice — and
 * routing it through the GM is the honest version anyway, since the GM is the
 * one who knows whether an offer is still real.
 *
 * Toggling is resolved on the GM's side rather than sent as "take" or "drop",
 * so two players clicking at once cannot race a stale view into a wrong write.
 */
export function requestOffer(activityId) {
  const payload = {
    type: "downtime-request",
    userId: game.user.id,
    userName: game.user.name,
    activityId
  };
  if (game.user.isGM) return resolveOfferRequest(payload);
  game.socket.emit(SOCKET, payload);
  return Promise.resolve(null);
}

async function resolveOfferRequest({ userId, userName, activityId }) {
  if (!game.user.isGM) return null;
  const here = momentKey(currentMoment());
  const held = publicCommitments().find((c) => c.userId === userId && c.momentKey === here);
  const next = held?.activityId === activityId ? null : activityId;
  return writePublicCommitment({ userId, userName, activityId: next });
}

/**
 * The `userId` filter on the private push is a courtesy, not the security
 * boundary — a socket emit reaches every client and a determined player could
 * read the payload off the wire. The boundary is that the GM only ever emits
 * ONE user's rows at a time, and never puts anyone's authored note into a
 * broadcast. Anything that must not be readable by the wrong client must not
 * be emitted at all.
 */
export function registerCampaignSocket(onUpdate = () => {}) {
  game.socket.on(SOCKET, (payload) => {
    if (payload?.type === "downtime-private") {
      if (payload.userId !== game.user.id) return;
      myPrivate = Array.isArray(payload.commitments) ? payload.commitments : [];
      onUpdate();
      return;
    }

    // Only the GM acts on a request, and only ONE GM does. `activeGM?.isSelf`
    // is core's own idiom for "am I the authoritative client"
    // (client/helpers/active-effect-registry.mjs:146); without it, a world with
    // two GMs connected would have both write the same change.
    if (payload?.type === "downtime-request") {
      if (!game.users.activeGM?.isSelf) return;
      resolveOfferRequest(payload).catch((err) =>
        console.error("Blank Inheritance | Could not record a downtime commitment:", err)
      );
    }
  });
}

/* ---------------------------------------------------------------- */
/*  Offers                                                           */
/* ---------------------------------------------------------------- */

let offerCache = null;

/**
 * The offers, from the campaign config the sync tool pushes alongside the code.
 *
 * Returns an empty list rather than throwing when the campaign data has not
 * been pushed to this world — a console that refuses to draw because content
 * is missing is worse than one honestly showing nothing on offer, and a fresh
 * test world is exactly that case.
 */
export async function loadOffers() {
  if (offerCache) return offerCache;
  try {
    const config = await fetchModuleJson(CONFIG_PATH);
    offerCache = normalizeOffers(config?.timeEconomy?.options ?? []);
  } catch (err) {
    console.warn(`Blank Inheritance | No campaign config at ${CONFIG_PATH}; the day ring will show no offers.`, err);
    offerCache = [];
  }
  return offerCache;
}

/** Test seam and a way for a GM to pick up a re-pushed config without a reload. */
export function resetOfferCache() {
  offerCache = null;
}

/* ---------------------------------------------------------------- */
/*  What the console renders                                        */
/* ---------------------------------------------------------------- */

/**
 * The segment zone's content for THIS client.
 *
 * The GM assembles from both stores. A player assembles from the public store
 * plus only what was pushed to them — so the redaction is a consequence of
 * what their browser was ever sent, not of what the template chose to print.
 */
export async function segmentContext() {
  const isGM = game.user.isGM;
  const moment = currentMoment();
  const offers = await loadOffers();
  const priv = isGM ? await readPrivateCommitments() : myPrivate;

  // An older world's public store may still carry an opaque marker for a
  // private commitment, so a viewer's own private rows REPLACE any marker of
  // theirs rather than sit beside it, and core/commitments.mjs#projectForUser
  // drops everybody else's.
  const mine = new Set(priv.map((c) => `${c.userId}|${c.momentKey}`));
  const commitments = [
    ...publicCommitments().filter((c) => !mine.has(`${c.userId}|${c.momentKey}`)),
    ...priv
  ];

  return segmentState({ moment, offers, commitments, userId: game.user.id, isGM });
}

export { publicCommitments };
