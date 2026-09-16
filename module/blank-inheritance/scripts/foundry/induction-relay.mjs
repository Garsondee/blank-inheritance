/**
 * Induction terminal — the one real-world write in the whole terminal a
 * plain Player cannot perform directly: creating the character Actor itself.
 *
 * common/constants.mjs's own USER_PERMISSIONS.ACTOR_CREATE defaults to
 * Assistant/GM only, and this project's own local test world still has that
 * stock default (confirmed LIVE 2026-09-16 by reading game.permissions
 * directly, not assumed from the constants file alone) -- so Page 9's
 * Actor.create() would throw a permission error for any real player.
 * Deleting an Actor needs the same Assistant/GM role too (Actor's own
 * metadata never overrides common/abstract/document.mjs's base
 * `delete: "ASSISTANT"`, confirmed by reading that base metadata directly --
 * OWNER is not enough), which matters because #createCharacterActor deletes
 * the Actor it just made on any later failure.
 *
 * Everything else in character creation is fine for a plain Player once they
 * own the Actor: creating an embedded Item checks the PARENT Actor's
 * ownership, not a separate world-level ITEM_CREATE permission (confirmed in
 * common/documents/item.mjs's own #canCreate: "Embedded Items depend on
 * Actor ownership"), and a User may update their OWN character field freely
 * (common/documents/user.mjs's #canUpdate: only permissions/passwordSalt/
 * name/role are restricted, and only name/role for non-Assistants; `character`
 * is none of those). So only Actor.create and Actor.delete need to travel to
 * the GM -- same shape as foundry/equipment-state.mjs's existing grant relay.
 *
 * Unlike an equipment grant, the calling client genuinely needs to know
 * whether ITS OWN create request succeeded before it can go on to build the
 * rest of the character. But Foundry's module socket is fire-and-forget only
 * -- confirmed LIVE 2026-09-16 by opening a second connection and calling
 * game.socket.emitWithAck across it: the message arrived, but the ack never
 * came back, because the server rebroadcasts a module socket event to every
 * client with no path for an ack to travel back to the original sender. So
 * this waits on the ordinary Actor-creation sync instead: the calling client
 * pre-generates the new Actor's _id, asks the GM to create it with that
 * exact id (and ownership granted), then waits for its OWN createActor hook
 * to fire for that id -- Foundry's regular document-sync layer, not a
 * custom protocol, and the one thing here actually guaranteed to fire once
 * the create really happens. A bounded timeout covers no GM being connected
 * at all; an explicit (still fire-and-forget) failure message from the GM's
 * side covers a GM being connected but the create itself failing, so a real
 * validation error doesn't read as "no GM online."
 *
 * Placing the new Actor's token on the landing scene rides along with the
 * same GM-side create step, for the same permission reason: TOKEN_CREATE is
 * Assistant/GM-only too, with no parent-Scene-ownership exception the way
 * embedded Items have (see foundry/landing-scene.mjs's own header). It has
 * its own inner try/catch, separate from the Actor-create one -- a token
 * failing to place must never be reported back as character-creation
 * failing, since the actor itself is already real at that point.
 */

import { placeActorOnLandingScene, removeActorTokenFromLandingScene } from "./landing-scene.mjs";

const MODULE_ID = "blank-inheritance";
const SOCKET = `module.${MODULE_ID}`;
const CREATE_TIMEOUT_MS = 20000;

/**
 * GM only. The payload IS the same data the player's own
 * #createCharacterActor already built (name/img/system) -- this performs the
 * exact same call from a client that actually has ACTOR_CREATE, adding the
 * one thing only the GM's side can grant: ownership for the requesting user.
 * Never trusts anything beyond that: a bad request just fails Actor.create's
 * own validation same as it would for a GM typing the same data by hand.
 */
async function resolveActorCreateRequest({ requestId, userId, actorData }) {
  if (!game.user.isGM) return;
  try {
    const actor = await Actor.create(
      { ...actorData, ownership: { default: 0, [userId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } },
      { keepId: true, render: false }
    );
    await placeActorOnLandingScene(actor).catch((err) => {
      console.error("Blank Inheritance | Could not place a token for a newly created character:", err);
    });
  } catch (err) {
    console.error("Blank Inheritance | Could not create a character Actor on a player's behalf:", err);
    game.socket.emit(SOCKET, {
      type: "induction-actor-create-failed",
      requestId,
      reason: err?.message ?? String(err)
    });
  }
}

/**
 * GM only. Best-effort cleanup relay for #createCharacterActor's own
 * rollback-on-failure path -- fire-and-forget on purpose, same as the direct
 * `actor.delete().catch(() => {})` this replaces: a cleanup failure must
 * never mask the real error that triggered it, so nothing here is awaited by
 * the caller's own error path.
 */
async function resolveActorDeleteRequest({ actorId }) {
  if (!game.user.isGM) return;
  // Before the actor itself, in case ITS OWN delete throws -- an orphaned
  // token pointing at a still-real actor is nothing, one pointing at a
  // just-deleted actor is a permanent stray (see removeActorTokenFromLandingScene's own header).
  await removeActorTokenFromLandingScene(actorId).catch((err) => {
    console.error("Blank Inheritance | Could not remove an abandoned induction Actor's token:", err);
  });
  await game.actors.get(actorId)?.delete().catch((err) => {
    console.error("Blank Inheritance | Could not clean up an abandoned induction Actor:", err);
  });
}

/**
 * Both request types land here; only the one active GM client ever acts on
 * either -- same `activeGM?.isSelf` idiom as campaign-state.mjs's and
 * equipment-state.mjs's own socket registrations.
 */
export function registerInductionSocket() {
  game.socket.on(SOCKET, (payload) => {
    if (!game.users.activeGM?.isSelf) return;
    if (payload?.type === "induction-actor-create-request") resolveActorCreateRequest(payload);
    else if (payload?.type === "induction-actor-delete-request") resolveActorDeleteRequest(payload);
  });
}

/**
 * The GM (including a GM previewing the terminal) creates directly -- same
 * call #createCharacterActor always made. A real player's request travels to
 * the GM's client instead and this waits on the resulting document sync,
 * since nothing here can await a direct reply (see file header).
 *
 * `timeoutMs` is only ever overridden by tests -- production always uses
 * CREATE_TIMEOUT_MS.
 */
export async function requestActorCreation(actorData, { timeoutMs = CREATE_TIMEOUT_MS } = {}) {
  if (game.user.isGM) {
    const actor = await Actor.create(actorData, { keepId: true, render: false });
    await placeActorOnLandingScene(actor).catch((err) => {
      console.error("Blank Inheritance | Could not place a token for a newly created character:", err);
    });
    return actor;
  }

  const requestId = actorData._id ?? foundry.utils.randomID();

  return new Promise((resolve, reject) => {
    let settled = false;

    function settle(run) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      Hooks.off("createActor", onCreate);
      game.socket.off(SOCKET, onFailure);
      run();
    }

    const onCreate = (actor) => {
      if (actor.id === requestId) settle(() => resolve(actor));
    };
    const onFailure = (payload) => {
      if (payload?.type === "induction-actor-create-failed" && payload.requestId === requestId) {
        settle(() => reject(new Error(payload.reason ?? "Character creation failed on the GM's side.")));
      }
    };
    const timeout = setTimeout(() => {
      settle(() => reject(new Error("No GM appears to be online to approve this. Ask your GM to log in, then press Confirm again.")));
    }, timeoutMs);

    Hooks.on("createActor", onCreate);
    game.socket.on(SOCKET, onFailure);
    game.socket.emit(SOCKET, {
      type: "induction-actor-create-request",
      requestId,
      userId: game.user.id,
      actorData: { ...actorData, _id: requestId }
    });
  });
}

/** Fire-and-forget, matching the `.catch(() => {})` already wrapped around every caller of this -- see resolveActorDeleteRequest's own comment. */
export async function requestActorDeletion(actorId) {
  if (game.user.isGM) {
    await removeActorTokenFromLandingScene(actorId);
    return game.actors.get(actorId)?.delete() ?? Promise.resolve();
  }
  game.socket.emit(SOCKET, { type: "induction-actor-delete-request", actorId });
  return Promise.resolve();
}
