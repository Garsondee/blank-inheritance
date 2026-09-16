/**
 * The equipment locker — the Foundry-touching half.
 *
 * Same shape as foundry/campaign-state.mjs and for the same reasons:
 *
 *   EVERY GRANT is a world setting. It isn't secret (the whole party can see
 *   who took what, same as the downtime board), `game.settings.get` is a
 *   synchronous read every client needs the same answer to, and `onChange`
 *   fires everywhere — which is how a grant made on the GM's client reaches
 *   every player's screen without a second broadcast mechanism.
 *
 *   A PLAYER'S CLICK cannot write a world setting directly — that is a
 *   Foundry permission fact, not a design choice — so it travels to the GM's
 *   client over the module socket, which re-checks legality with the exact
 *   same core/equipment.mjs#canGrant the request itself used, and is the
 *   only client that actually calls game.settings.set. Two players taking
 *   the last unique item at once resolves on the GM's side, one at a time,
 *   the same way core/commitments.mjs's slice-taking already does.
 *
 * Every decision about what any of this MEANS (stock, budget, legality)
 * lives in core/equipment.mjs. This file only reads, writes, and routes —
 * plus the one thing that has no pure-logic equivalent: actually creating
 * the embedded Item on a player's Actor.
 */

import { deriveFoundryId } from "../core/ids.mjs";
import { canGrant, catalogueItemToSf2eItemData, findItem, grantsFor, logEntries, projectCatalogue } from "../core/equipment.mjs";
import { fetchModuleJson } from "./io.mjs";

const MODULE_ID = "blank-inheritance";
const SETTING_GRANTS = "equipmentGrants";
const SOCKET = `module.${MODULE_ID}`;

/**
 * data/campaign/equipment-catalogue.json lands under the module at this
 * doubled path — same staging quirk documented in campaign-state.mjs's own
 * CONFIG_PATH: tools/module-sync/stage-campaign-data.mjs stages repo
 * data/campaign/ into the module's data/campaign/campaign/.
 */
const CATALOGUE_PATH = "data/campaign/campaign/equipment-catalogue.json";

const MACRO_SOURCE_ID = "blank-inheritance-equipment-panel-macro";
// The id deriveFoundryId(MACRO_SOURCE_ID) actually produces is hand-copied as
// literal @UUID[Macro.865e0ce3b7d302e5] text into
// data/episodes/episode-c1s1-mothers-maiden-name.json's Kit Issue scene
// description, so the GM can open the locker with one click straight from
// that scene's journal page — confirmed real Foundry behavior, not assumed:
// clicking a Macro content link calls Macro#_onClickDocumentLink, which
// calls execute() (foundryvtt/.../client/documents/macro.mjs). If
// MACRO_SOURCE_ID's literal string ever changes, that derived id changes
// with it, and the journal text must be updated to match by hand — there is
// no live binding between the two.

/* ---------------------------------------------------------------- */
/*  Settings + catalogue                                             */
/* ---------------------------------------------------------------- */

export function registerEquipmentSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_GRANTS, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange
  });
}

let catalogueCache = null;

/** Empty-but-valid catalogue on failure (fresh test world, data not pushed yet) — same honesty rule as campaign-state.mjs#loadOffers. */
export async function loadCatalogue() {
  if (catalogueCache) return catalogueCache;
  try {
    catalogueCache = await fetchModuleJson(CATALOGUE_PATH);
  } catch (err) {
    console.warn(`Blank Inheritance | No equipment catalogue at ${CATALOGUE_PATH}; the locker will show nothing to take.`, err);
    catalogueCache = { id: "equipment-catalogue", budget: { credits: 0 }, items: [] };
  }
  return catalogueCache;
}

export function resetCatalogueCache() {
  catalogueCache = null;
}

function currentGrants() {
  const stored = game.settings.get(MODULE_ID, SETTING_GRANTS);
  return Array.isArray(stored) ? stored : [];
}

/* ---------------------------------------------------------------- */
/*  Putting the actual Item on the actual sheet                      */
/* ---------------------------------------------------------------- */

/** The character a user plays, via Foundry's own assignment — same lookup foundry/rolls.mjs uses for "my own character". */
function actorForUser(userId) {
  return game.users.get(userId)?.character ?? null;
}

/**
 * Repeat takes of the SAME catalogue item fold into one embedded Item's
 * quantity rather than stacking duplicate rows — matched by a flag on the
 * Item (which catalogue entry it came from), not by name, since two
 * genuinely different items could share a display name.
 *
 * Returns the embedded Item's id (so a later revoke can find it again), or
 * null if the user has no assigned character — the grant still gets
 * recorded in the log/budget either way; a GM can fix the sheet side by
 * hand later, which is a smaller problem than silently losing the record.
 */
async function grantItemToActor({ userId, item, quantity }) {
  const actor = actorForUser(userId);
  if (!actor) return null;

  const existing = actor.items.find((i) => i.getFlag(MODULE_ID, "catalogueItemId") === item.id);
  if (existing) {
    await existing.update({ "system.quantity": (existing.system.quantity ?? 1) + quantity });
    return existing.id;
  }

  const itemData = catalogueItemToSf2eItemData(item);
  itemData.system.quantity = quantity;
  itemData.flags = { [MODULE_ID]: { catalogueItemId: item.id } };
  const [created] = await actor.createEmbeddedDocuments("Item", [itemData]);
  return created?.id ?? null;
}

/** The inverse of grantItemToActor for one grant's worth — shrinks the stack, or deletes it once empty. */
async function removeItemFromActor({ userId, itemDocId, quantity }) {
  if (!itemDocId) return;
  const actor = actorForUser(userId);
  const item = actor?.items.get(itemDocId);
  if (!item) return;
  const remaining = (item.system.quantity ?? 1) - quantity;
  if (remaining > 0) await item.update({ "system.quantity": remaining });
  else await item.delete();
}

/* ---------------------------------------------------------------- */
/*  The authoritative writes (GM client only)                        */
/* ---------------------------------------------------------------- */

/**
 * GM only. Re-validates from scratch against the CURRENT stored grants —
 * never trusts the request's own claim that a take is legal, which is what
 * makes two simultaneous requests for the last unique item resolve safely:
 * whichever one is processed first (always in order, always on one client)
 * changes the stock the second one is checked against.
 */
async function resolveGrantRequest({ userId, userName, itemId, quantity = 1, force = false }) {
  if (!game.user.isGM) return null;
  const catalogue = await loadCatalogue();
  const item = findItem(catalogue, itemId);
  const grants = currentGrants();
  const check = canGrant({ item, userId, catalogue, grants, quantity, force });
  if (!check.ok) return { ok: false, reason: check.reason };

  const itemDocId = await grantItemToActor({ userId, item, quantity });
  const grant = {
    id: foundry.utils.randomID(),
    userId,
    userName: userName ?? null,
    itemId,
    quantity,
    unitPrice: item.price ?? 0,
    kind: "issue",
    timestamp: Date.now(),
    itemDocId,
    revoked: false
  };
  await game.settings.set(MODULE_ID, SETTING_GRANTS, [...grants, grant]);
  return { ok: true, grant };
}

/** GM only. A player may revoke only their own grant; the GM may revoke anyone's. */
async function resolveRevokeRequest({ grantId, requestedBy, isGM }) {
  if (!game.user.isGM) return null;
  const grants = currentGrants();
  const grant = grants.find((g) => g.id === grantId && !g.revoked);
  if (!grant) return { ok: false, reason: "no-such-grant" };
  if (!isGM && grant.userId !== requestedBy) return { ok: false, reason: "not-yours" };

  await removeItemFromActor({ userId: grant.userId, itemDocId: grant.itemDocId, quantity: grant.quantity });
  const next = grants.map((g) => (g.id === grantId ? { ...g, revoked: true } : g));
  await game.settings.set(MODULE_ID, SETTING_GRANTS, next);
  return { ok: true };
}

/* ---------------------------------------------------------------- */
/*  The socket: a player's click asks, the GM's client acts          */
/* ---------------------------------------------------------------- */

/**
 * `actingAsUserId` is the GM's "acting as" control in the panel — running
 * Kit Issue for a player who isn't at the keyboard. Only the GM may set it;
 * a player's own request always names themselves regardless of what a
 * tampered client might send, because resolveGrantRequest only ever trusts
 * the userId a GM's own client resolves against, and a non-GM request here
 * is never resolved locally in the first place.
 */
export function requestGrant({ itemId, quantity = 1, force = false, actingAsUserId = null }) {
  const onBehalfOf = game.user.isGM && actingAsUserId ? actingAsUserId : game.user.id;
  const payload = {
    type: "equipment-grant-request",
    userId: onBehalfOf,
    userName: game.users.get(onBehalfOf)?.name ?? null,
    itemId,
    quantity,
    force: game.user.isGM && Boolean(force)
  };
  if (game.user.isGM) return resolveGrantRequest(payload);
  game.socket.emit(SOCKET, payload);
  return Promise.resolve(null);
}

export function requestRevoke({ grantId }) {
  const payload = { type: "equipment-revoke-request", grantId, requestedBy: game.user.id, isGM: game.user.isGM };
  if (game.user.isGM) return resolveRevokeRequest(payload);
  game.socket.emit(SOCKET, payload);
  return Promise.resolve(null);
}

/** Both request types land here; only the one active GM client ever acts on either (`activeGM?.isSelf` — core's own idiom, see campaign-state.mjs's identical guard). */
export function registerEquipmentSocket() {
  game.socket.on(SOCKET, (payload) => {
    if (!game.users.activeGM?.isSelf) return;
    if (payload?.type === "equipment-grant-request") {
      resolveGrantRequest(payload).catch((err) => console.error("Blank Inheritance | Could not record an equipment grant:", err));
    } else if (payload?.type === "equipment-revoke-request") {
      resolveRevokeRequest(payload).catch((err) => console.error("Blank Inheritance | Could not revoke an equipment grant:", err));
    }
  });
}

/* ---------------------------------------------------------------- */
/*  What the panel renders                                           */
/* ---------------------------------------------------------------- */

/**
 * Everything one open panel needs, for whichever user it's currently acting
 * as (yourself, always, unless you're the GM with someone else selected).
 */
export async function equipmentContext({ actingAsUserId = null } = {}) {
  const isGM = game.user.isGM;
  const viewingUserId = isGM && actingAsUserId ? actingAsUserId : game.user.id;
  const catalogue = await loadCatalogue();
  const grants = currentGrants();
  const projection = projectCatalogue({ catalogue, grants, userId: viewingUserId });

  return {
    catalogue,
    isGM,
    viewingUserId,
    viewingUserName: game.users.get(viewingUserId)?.name ?? game.user.name,
    items: projection.items,
    budget: projection.budget,
    // Newest-first, own grants only -- the "return" control on a catalogue
    // row revokes the most recently taken copy of that item (LIFO: the one
    // still-open grant a player picking "return" almost certainly means).
    myGrants: [...grantsFor(viewingUserId, grants)].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    log: isGM ? logEntries(catalogue, grants) : [],
    connectedUsers: isGM ? game.users.filter((u) => u.active && !u.isGM).map((u) => ({ id: u.id, name: u.name })) : []
  };
}

/* ---------------------------------------------------------------- */
/*  Opening the panel from outside                                   */
/* ---------------------------------------------------------------- */

export async function createEquipmentPanelMacroIfMissing() {
  const macroId = await deriveFoundryId(MACRO_SOURCE_ID);
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.Equipment.MacroName"),
      type: "script",
      img: "icons/svg/basket.svg",
      command: `await game.modules.get("${MODULE_ID}").api.openEquipmentPanel();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the equipment locker macro.");
}
