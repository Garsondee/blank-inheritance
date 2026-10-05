/**
 * Cards and Foundry's tokens (module.md §39). A stage draws people as cards, and Foundry's own systems still think in
 * tokens: the one you control is the one your rolls and your sheet speak for, the ones you target are what an attack is
 * aimed at. So every card on a stage has a real token on its scene, never drawn (the stage is the picture), and this is
 * the bridge between the two:
 *
 *   - **Tokens are made and kept by the acting GM's screen**: one per card, flagged `flags.stagecraft.card`, made when the
 *     card is (so no secret is early: a card carries only what the table may see), named and pictured as the card is,
 *     taken away when the card goes. A card's actor is its own `actor` (the party's characters), else whatever the
 *     adventure's provider answers (`api.tokens.setActorProvider`: the adventure makes a basic actor for each person), else
 *     the token stands for no actor. Tokens that do not carry our flag are never touched.
 *   - **A click on a card controls its token** and a **T aims at one**, through Foundry's own `Token#control` and
 *     `Token#setTarget`, so `canvas.tokens.controlled` and `game.user.targets` (what the system and every other module
 *     read) are exactly what they are on Foundry's own canvas. A card whose token cannot be reached (no GM has opened the
 *     scene yet, or the canvas is not drawn) is chosen and aimed at on this screen alone, so the stage still answers.
 *   - What is controlled and targeted is **read back from Foundry** at every frame (and from every user's targets: a
 *     card another player aims at wears their colour too), so a choice made anywhere else (the sidebar, another module, a
 *     key) shows on the stage.
 */

import { TOKEN_FLAG, planTokens, retarget, userColour } from "../core/tokens.mjs";
import { NS, publishedCards, actingGM, canHold } from "./scene-data.mjs";

const providers = new Set();

/**
 * Say who a card's token stands for: provider(scene, card) -> an Actor, an actor id, `{ id, link: false }` (each token its own copy of the
 * actor, with its own hit points), or null (or a promise of any), asked of
 * the acting GM's screen when a card needs a token and again when its name changes. The first provider that answers wins.
 * Returns a function that takes it away.
 */
export function registerTokenActors(provider) {
  if (typeof provider !== "function") throw new TypeError("a token actors provider must be a function of the scene and the card");
  providers.add(provider);
  // a stage drawn before this (Foundry draws the first scene before the adventure is ready) made its tokens with nobody to ask: they are asked again now
  globalThis.Hooks?.callAll?.(PROVIDER_HOOK);
  return () => providers.delete(provider);
}

/** Said when a provider is registered, so a stage already drawn asks it about the cards it has already made tokens for. */
export const PROVIDER_HOOK = "stagecraft.tokenActorsChanged";

/**
 * How long, after a stage is drawn, a first look that finds NO cards (and tokens of ours already on the scene) waits before it takes those tokens
 * away: a scene read while it is still being brought up must never be taken for a scene with nobody on it. Tests make it short.
 */
export const LOAD_GRACE_MS = { value: 4000 };

const log = (message, err) => console.warn(`${NS} | ${message}`, err);

export class CardTokens {
  constructor(host) {
    this.host = host;
    this.localControl = new Set();         // cards chosen on this screen alone (their token cannot be reached)
    this.localTargets = new Set();         // cards aimed at on this screen alone
    this.map = null;                       // cardId -> TokenDocument, rebuilt when the scene's tokens change
    this.actors = new Map();               // cardId -> { name, id }: what the provider last answered for a card
    this.signature = null;                 // the cards the tokens were last made to match
    this.settled = false;                  // has one look at the cards been trusted yet (see LOAD_GRACE_MS)
    this.work = Promise.resolve();
    this.hooks = [];
    const mine = (doc) => doc?.parent?.id === this.host.scene.id;
    const changed = (doc) => { if (mine(doc)) this.map = null; };
    const poke = () => this.host.pace?.poke(performance.now());
    for (const name of ["createToken", "updateToken"]) this.hooks.push([name, Hooks.on(name, changed)]);
    // a token of ours taken away by hand is made again (a pass already under way makes it as part of itself: they run one at a time)
    this.hooks.push(["deleteToken", Hooks.on("deleteToken", (doc) => {
      if (!mine(doc)) return;
      this.map = null;
      if (!doc.getFlag?.(NS, TOKEN_FLAG)) return;
      this.signature = null;
      this.ensure();
    })]);
    // what is controlled has a hook; what is targeted has none in Foundry 14, so it is read at every frame (and pokes the pace when this user changes it)
    this.hooks.push(["controlToken", Hooks.on("controlToken", poke)]);
    // an adventure's provider arrived after this stage was drawn: nobody was asked who a card's token stands for, so ask now
    this.hooks.push([PROVIDER_HOOK, Hooks.on(PROVIDER_HOOK, () => { this.actors.clear(); this.signature = null; this.ensure(); })]);
  }

  dispose() {
    clearTimeout(this.graceTimer);
    for (const [name, id] of this.hooks) Hooks.off(name, id);
    this.hooks = [];
    this.localControl.clear();
    this.localTargets.clear();
  }

  /* ---------------------------------------------------------------- finding a card's token */

  /** Every token of this scene that is a card's, by card id. */
  #docs() {
    if (this.map) return this.map;
    const map = new Map();
    for (const doc of this.host.scene.tokens ?? []) {
      const card = doc.flags?.[NS]?.[TOKEN_FLAG];
      if (typeof card === "string" && !map.has(card)) map.set(card, doc);
    }
    return (this.map = map);
  }

  /** The token a card stands for on the scene, as a document, or null. */
  document(cardId) {
    return this.#docs().get(cardId) ?? null;
  }

  /** Foundry's drawn token, when this scene is the one on its canvas and the token has been drawn. */
  #placeable(cardId) {
    const doc = this.#docs().get(cardId);
    if (!doc || globalThis.canvas?.scene?.id !== this.host.scene.id) return null;
    return globalThis.canvas.tokens?.get?.(doc.id) ?? null;
  }

  #mine = () => userColour(game.user);

  /* ---------------------------------------------------------------- what is chosen and aimed at */

  /** Who is controlled and who is targeted now: { controlled: Set of card ids, targets: Map of card id -> user colours, own first }. */
  state() {
    const controlled = new Set(this.localControl);
    const targets = new Map();
    for (const id of this.localTargets) targets.set(id, [this.#mine()]);
    const layer = globalThis.canvas?.scene?.id === this.host.scene.id ? globalThis.canvas.tokens : null;
    if (layer?.get) {
      for (const [cardId, doc] of this.#docs()) {
        const token = layer.get(doc.id);
        if (!token) continue;
        if (token.controlled) controlled.add(cardId);
        if (token.targeted?.size) {
          const users = [...token.targeted];
          users.sort((a, b) => (b === game.user) - (a === game.user));
          targets.set(cardId, users.map((u) => userColour(u)));
        }
      }
    }
    return { controlled, targets };
  }

  isControlled(cardId) {
    return this.state().controlled.has(cardId);
  }

  isTargeted(cardId) {
    const t = this.#placeable(cardId);
    return t ? t.isTargeted === true : this.localTargets.has(cardId);
  }

  /* ---------------------------------------------------------------- doing */

  /**
   * Control a card's token (Foundry's own click on a token): it replaces whoever was controlled, or is added to them with
   * `add`. Only a token the user owns can be controlled, as on Foundry's canvas. Returns whether the card is now controlled.
   */
  select(cardId, { add = false } = {}) {
    const token = this.#placeable(cardId);
    if (!token) {
      // no token to reach: chosen on this screen alone, and only by someone who could take hold of the card (a token's owner, on Foundry's canvas)
      const person = this.host.stage?.cards?.get?.(cardId)?.person;
      if (person && !canHold(person, game.user)) return false;
      if (!add) this.localControl.clear();
      this.localControl.add(cardId);
      this.host.pace?.poke(performance.now());
      return true;
    }
    if (!token.document.isOwner) return false;
    const layer = globalThis.canvas.tokens;
    if (!layer.active) layer.activate();                  // Foundry only lets the active layer's tokens be controlled
    try { return token.control({ releaseOthers: !add }) === true; } catch (err) { log(`could not control ${cardId}'s token`, err); return false; }
  }

  /** Let go of every card chosen (a click on the bare stage). */
  release() {
    this.localControl.clear();
    try { globalThis.canvas?.scene?.id === this.host.scene.id && globalThis.canvas.tokens?.releaseAll?.(); } catch (err) { log("could not release the controlled tokens", err); }
    this.host.pace?.poke(performance.now());
  }

  /** Aim at a card, or stop (Foundry's own `Token#setTarget`: the only one, or one more with `add`). Returns whether it is aimed at now. */
  target(cardId, { add = false } = {}) {
    const token = this.#placeable(cardId);
    this.host.pace?.poke(performance.now());
    if (!token) {
      const { ids } = retarget(this.localTargets, cardId, { shift: add });
      this.localTargets = new Set(ids);
      return this.localTargets.has(cardId);
    }
    try { token.setTarget(!token.isTargeted, { releaseOthers: !add }); } catch (err) { log(`could not aim at ${cardId}'s token`, err); }
    return token.isTargeted === true;
  }

  /** Stop aiming at anyone. */
  clearTargets() {
    this.localTargets.clear();
    const layer = globalThis.canvas?.scene?.id === this.host.scene.id ? globalThis.canvas.tokens : null;
    try {
      if (layer?.setTargets) layer.setTargets([], { mode: "replace" });
      else for (const t of [...(game.user?.targets ?? [])]) t.setTarget(false, { releaseOthers: false });
    } catch (err) { log("could not clear the targets", err); }
    this.host.pace?.poke(performance.now());
  }

  hasTargets() {
    return this.localTargets.size > 0 || (game.user?.targets?.size ?? 0) > 0;
  }

  hasControlled() {
    return this.state().controlled.size > 0;
  }

  /* ---------------------------------------------------------------- making and keeping them */

  /**
   * Make the scene's tokens agree with its cards, on the acting GM's screen (nobody else may write the scene). Safe to call
   * as often as the scene changes: it does nothing while the cards are what they were, and one pass at a time runs.
   */
  ensure({ force = false } = {}) {
    if (!actingGM() || !this.host.scene?.tokens) return this.work;
    this.work = this.work.then(() => this.#reconcile(force)).catch((err) => log("could not keep the tokens", err));
    return this.work;
  }

  /** Who a card's token stands for: its own actor, else a provider's answer: an actor id, or { id, link } (see core/tokens.mjs). */
  async #actorOf(card) {
    if (card.actor && game.actors?.get?.(card.actor)) return card.actor;
    if (!providers.size) return null;                      // nobody to ask yet (see PROVIDER_HOOK): not remembered as "no one"
    const known = this.actors.get(card.id);
    const name = card.name ?? "";
    if (known && known.name === name) return known.answer;
    let answer = null;
    for (const provider of providers) {
      try {
        const given = await provider(this.host.scene, card);
        const id = typeof given === "string" ? given : given?.id;
        if (id && game.actors?.get?.(id)) { answer = given?.link === false ? { id, link: false } : id; break; }
      } catch (err) {
        log("a token actors provider failed", err);
      }
    }
    this.actors.set(card.id, { name, answer });
    return answer;
  }

  async #reconcile(force) {
    const scene = this.host.scene;
    if (game.scenes?.get && !game.scenes.get(scene.id)) return;            // the scene itself is going (its tokens go first): nothing to keep
    const cards = publishedCards(scene).filter((c) => c && typeof c.id === "string");
    const signature = JSON.stringify(cards.map((c) => [c.id, c.name ?? null, c.portrait ?? null, c.actor ?? null]));
    if (!force && signature === this.signature) return;
    const actors = new Map();
    for (const card of cards) { const answer = await this.#actorOf(card); if (answer) actors.set(card.id, answer); }
    const dims = scene.dimensions ?? {};
    const rect = dims.sceneRect ?? { x: 0, y: 0, width: dims.sceneWidth ?? scene.width ?? 4000, height: dims.sceneHeight ?? scene.height ?? 3000 };
    const size = scene.grid?.size ?? dims.size ?? 100;
    this.map = null;
    const tokens = [...(scene.tokens ?? [])]
      .filter((doc) => typeof doc.flags?.[NS]?.[TOKEN_FLAG] === "string")
      .map((doc) => ({ id: doc.id, card: doc.flags[NS][TOKEN_FLAG], name: doc.name, img: doc.texture?.src, actorId: doc.actorId ?? null }));
    const plan = planTokens({ cards, tokens, actors, rect, size });
    if (!this.settled && !force) {
      if (!cards.length && tokens.length) {
        // tokens of ours and no cards at all, on the first look after the stage was drawn: more likely a scene still being read than
        // an empty stage. Nothing is taken away yet; one more look is taken once things have settled.
        console.warn(`${NS} | ${tokens.length} token(s) of the stage's cards and no cards yet: looking again before taking any away`);
        this.graceTimer = setTimeout(() => { this.settled = true; this.signature = null; this.ensure(); }, LOAD_GRACE_MS.value);
        return;
      }
      this.settled = true;
    }
    if (plan.remove.length) {
      console.warn(`${NS} | taking away ${plan.remove.length} token(s) whose cards are gone (${tokens.filter((t) => plan.remove.includes(t.id)).map((t) => t.card).join(", ")})`);
      await scene.deleteEmbeddedDocuments("Token", plan.remove);
    }
    if (plan.update.length) await scene.updateEmbeddedDocuments("Token", plan.update);
    if (plan.create.length) await scene.createEmbeddedDocuments("Token", plan.create);
    this.map = null;
    this.signature = signature;
    if (plan.create.length || plan.update.length || plan.remove.length) this.host.pace?.poke(performance.now());
  }
}
