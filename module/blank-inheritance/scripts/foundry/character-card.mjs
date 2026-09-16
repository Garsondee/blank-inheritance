/**
 * The Character Card — a theatre-of-the-mind popup for one person.
 *
 * A real framed window rather than a zone on the bar, because it is opened
 * about a specific NPC at a specific moment and then dismissed, and because
 * the chassis has a pinned height that a variable-length fact list would
 * fight. The bar is for what is always true; this is for who you are talking
 * to right now.
 *
 * Currently opened only from the Director's cast board, so it is GM-only by
 * construction. It is built to render a player's view correctly the moment
 * there is somewhere for a player to open one from — the removal happens in
 * core/social-intel.mjs's buildCard, not here.
 */

import { ATTITUDES, SOCIAL_ACTIONS, attitudeLabelKey, buildCard } from "../core/social-intel.mjs";
import { authoredProfileFor, readSocial, revealFact, setAttitude } from "./social-store.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";

export class CharacterCard extends HandlebarsApplicationMixin(ApplicationV2) {
  #actorId = null;

  static DEFAULT_OPTIONS = {
    id: "bi-character-card",
    tag: "section",
    classes: ["bi-card-window"],
    window: {
      title: "BLANKINHERITANCE.Console.Card.Title",
      icon: "fa-solid fa-id-card",
      resizable: false
    },
    position: { width: 380, height: "auto" },
    actions: {
      setAttitude: CharacterCard.#onSetAttitude,
      revealFact: CharacterCard.#onRevealFact
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/console/character-card.hbs` }
  };

  constructor(options = {}) {
    super(options);
    this.#actorId = options.actorId ?? null;
  }

  get actor() {
    return game.actors?.get(this.#actorId) ?? null;
  }

  /** @override */
  async _prepareContext() {
    const actor = this.actor;
    if (!actor) return { missing: true, attitudes: [], actions: [] };

    const { attitude, revealedIds } = readSocial(actor);

    // The authored side is only ever readable by a GM — authoredProfileFor
    // returns null on a player's client because the vault is not sent to them.
    const authored = authoredProfileFor(actor.id);
    const profile = { ...(authored ?? {}), attitude };

    const card = buildCard({
      name: actor.name,
      profile,
      revealedIds,
      isGM: game.user?.isGM ?? false
    });

    return {
      ...card,
      missing: false,
      attitudes: ATTITUDES.map((value) => ({
        value,
        labelKey: attitudeLabelKey(value),
        current: value === card.attitude
      })),
      // Shown so a GM can see what each action would actually do at the moment
      // it matters, rather than remembering three tables.
      actions: SOCIAL_ACTIONS.map((action) => ({
        ...action,
        best: action.steps.criticalSuccess,
        worst: action.steps.criticalFailure
      }))
    };
  }

  static async #onSetAttitude(event, target) {
    const actor = this.actor;
    if (!actor) return;
    await setAttitude(actor, target.dataset.attitude);
    this.render();
  }

  static async #onRevealFact(event, target) {
    const actor = this.actor;
    if (!actor) return;
    await revealFact(actor, target.dataset.factId);
    this.render();
  }
}

/**
 * Open the card for one actor.
 *
 * A single instance reused across actors rather than one window per NPC: a GM
 * moving down a cast list would otherwise end up with six overlapping cards,
 * and the card is about who you are talking to *now*.
 */
let open = null;

export function openCharacterCard(actorId) {
  if (!actorId) return null;
  if (open?.rendered) open.close();
  open = new CharacterCard({ actorId });
  open.render({ force: true });
  return open;
}
