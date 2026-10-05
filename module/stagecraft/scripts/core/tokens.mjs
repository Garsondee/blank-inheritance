/**
 * Cards and Foundry's tokens, pure (module.md §39).
 *
 * A stage draws people as cards, but Foundry's own systems still think in tokens: the one you control is the one your rolls
 * and your sheet speak for, and the ones you target are the ones an attack is aimed at. So each card has a real token on the
 * scene, never drawn (the stage is the picture), and a click on a card controls its token while T aims at another's. This
 * file is the arithmetic of that: which tokens a stage's cards need, what a click or a T does to who is targeted, and what
 * T means where the pointer is. Nothing here touches Foundry.
 */

/** The flag a token carries (under `flags.stagecraft`) to say which card it is for. */
export const TOKEN_FLAG = "card";

/** What a card is called on its token: the first line of its name (a name may be broken over lines for the card's plate). */
export function tokenName(card) {
  const first = String(card?.name ?? card?.id ?? "").split(/\n|<br\s*\/?>|\\n/i)[0].trim();
  return first || String(card?.id ?? "");
}

/**
 * Where a card's token is first put, in scene pixels: where the card stands on the painting, as a fraction of the scene's
 * rectangle, with the token's own middle there. Only a starting place (nothing follows a card about), but a scene given
 * back to Foundry's canvas then shows people about where they were.
 */
export function tokenPlace(card, rect, size) {
  const at = Array.isArray(card?.at) && Number.isFinite(card.at[0]) && Number.isFinite(card.at[1]) ? card.at : [0.5, 0.5];
  const clamp = (n) => Math.min(1, Math.max(0, n));
  const x = Math.round(rect.x + clamp(at[0]) * rect.width - size / 2);
  const y = Math.round(rect.y + clamp(at[1]) * rect.height - size / 2);
  return { x, y };
}

/**
 * What to do so that each card has exactly one token and nobody else's is left over.
 *
 *   cards     the published cards: { id, name, portrait?, at? }
 *   tokens    the tokens already on the scene that carry our flag: { id, card, name?, img?, actorId? }
 *   actors    cardId -> the actor id its token stands for, or { id, link } (link false: the token is its own copy of the actor, with
 *             its own hit points, as each of a pack of the same creature is); a card with none gets an actorless token
 *   rect, size   the scene's rectangle and a grid square, for where a new token goes
 *
 * Returns { create: [token data], update: [{ _id, ... }], remove: [token ids] }. A token of ours for a card that is gone is
 * removed; a second token for one card is removed; a token whose name, picture or actor has changed is updated (a name
 * learned at the table). Tokens that do not carry our flag are never looked at.
 */
export function planTokens({ cards = [], tokens = [], actors = new Map(), rect, size }) {
  const create = [];
  const update = [];
  const remove = [];
  const wanted = new Map(cards.filter((c) => c && typeof c.id === "string").map((c) => [c.id, c]));
  const have = new Map();
  for (const t of tokens) {
    if (!wanted.has(t.card) || have.has(t.card)) remove.push(t.id);
    else have.set(t.card, t);
  }
  for (const [id, card] of wanted) {
    const answer = actors.get(id) ?? null;
    const actorId = typeof answer === "string" ? answer : answer?.id ?? null;
    const link = typeof answer === "object" && answer !== null && answer.link === false ? false : true;
    const name = tokenName(card);
    const img = card.portrait ?? null;
    const token = have.get(id);
    if (!token) {
      create.push({
        name,
        ...(actorId ? { actorId, actorLink: link } : { actorLink: false }),
        ...(img ? { texture: { src: img } } : {}),
        ...tokenPlace(card, rect, size),
        width: 1, height: 1, hidden: false,
        flags: { stagecraft: { [TOKEN_FLAG]: id } }
      });
      continue;
    }
    const change = {};
    if (token.name !== undefined && token.name !== name) change.name = name;
    if (img && token.img !== undefined && token.img !== img) change["texture.src"] = img;
    if (actorId && token.actorId !== actorId) { change.actorId = actorId; change.actorLink = link; }
    if (Object.keys(change).length) update.push({ _id: token.id, ...change });
  }
  return { create, update, remove };
}

/**
 * What a click (in targeting) or a T on a card does to the set of targeted cards, as Foundry's own does (`Token#setTarget`):
 * a card that is not targeted becomes the only target, or one more with Shift held; one that is targeted is let go.
 * Returns the mode Foundry's `TokenLayer#setTargets` takes and the ids that are targeted after.
 */
export function retarget(current, id, { shift = false } = {}) {
  const now = new Set(current ?? []);
  if (now.has(id)) { now.delete(id); return { mode: "release", ids: [...now] }; }
  if (shift) { now.add(id); return { mode: "acquire", ids: [...now] }; }
  return { mode: "replace", ids: [id] };
}

/**
 * What T does. While aiming is on it ends it (a click does the aiming, so the key that began it is the key that stops it, wherever the
 * pointer is). Otherwise, on a card that is not the one in hand, it aims at that card (Foundry's own T: the token the pointer rests
 * on). Anywhere else (empty stage, no card, or the card already chosen, which is where the pointer sits after clicking it) it starts
 * aiming: a click on a card then aims at it.
 */
export function tKey({ hover = null, controlled = new Set(), targeting = false } = {}) {
  if (targeting) return { do: "mode", on: false };
  if (hover && !controlled.has(hover)) return { do: "target", id: hover };
  return { do: "mode", on: true };
}

/** A user's colour as a CSS string, from whatever the user carries (a Color object, a string, nothing). */
export function userColour(user, fallback = "#e8493c") {
  const c = user?.color;
  const text = typeof c === "string" ? c : c?.css ?? (typeof c?.toString === "function" ? c.toString() : null);
  return typeof text === "string" && /^#[0-9a-f]{3,8}$/i.test(text) ? text : fallback;
}
