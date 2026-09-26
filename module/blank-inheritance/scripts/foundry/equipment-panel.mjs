/**
 * The Equipment Locker — Kit Issue's real inventory UI (GitHub #139).
 *
 * A standalone window rather than a bar zone, same reasoning as
 * character-card.mjs: it's opened for a specific purpose (drawing kit) and
 * dismissed, not something that needs to sit on screen the whole session.
 * Opened from a GM macro (created by foundry/equipment-state.mjs) and from
 * a clickable link the GM's own Kit Issue journal page carries — see that
 * file's MACRO_SOURCE_ID comment for exactly how the link and the macro
 * agree on the same document without a live binding between them.
 *
 * Every player who opens it sees the same catalogue acting as themselves.
 * The GM's own copy gains two things a player's never shows: an "acting as"
 * switch (running the counter for someone not at the keyboard — the exact
 * scenario Ingram asked for) and the log of every grant so far, each
 * revocable. Both reuse core/equipment.mjs's own rules rather than a second,
 * looser GM-only path — a forced grant still checks stock, just not budget.
 */

import { equipmentContext, requestGrant, requestRevoke } from "./equipment-state.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";

export class EquipmentPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  #actingAsUserId = null;
  #force = false;
  #bonus = false;

  static DEFAULT_OPTIONS = {
    id: "bi-equipment-panel",
    tag: "section",
    classes: ["bi-equipment"],
    window: {
      title: "BLANKINHERITANCE.Equipment.Title",
      icon: "fa-solid fa-basket-shopping",
      resizable: true
    },
    position: { width: 460, height: "auto" },
    actions: {
      take: EquipmentPanel.#onTake,
      returnOne: EquipmentPanel.#onReturn,
      revoke: EquipmentPanel.#onRevoke,
      setActingAs: EquipmentPanel.#onSetActingAs,
      toggleForce: EquipmentPanel.#onToggleForce,
      toggleBonus: EquipmentPanel.#onToggleBonus
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/console/equipment-panel.hbs` }
  };

  /** @override */
  async _prepareContext() {
    const context = await equipmentContext({ actingAsUserId: this.#actingAsUserId });

    const actingAsOptions = context.isGM
      ? [
          { id: "", label: game.i18n.localize("BLANKINHERITANCE.Equipment.ActingAsGM"), current: !this.#actingAsUserId },
          ...context.connectedUsers.map((u) => ({ id: u.id, label: u.name, current: u.id === this.#actingAsUserId }))
        ]
      : [];

    return { ...context, force: this.#force, bonus: this.#bonus, actingAsOptions };
  }

  static async #onTake(event, target) {
    const result = await requestGrant({
      itemId: target.dataset.itemId,
      actingAsUserId: this.#actingAsUserId,
      force: this.#force,
      kind: this.#bonus ? "bonus" : "issue"
    });
    if (result && result.ok === false) {
      ui.notifications.warn(game.i18n.format("BLANKINHERITANCE.Equipment.TakeFailed", { reason: result.reason }));
    }
    this.render();
  }

  static async #onReturn(event, target) {
    const context = await equipmentContext({ actingAsUserId: this.#actingAsUserId });
    const grant = context.myGrants.find((g) => g.itemId === target.dataset.itemId);
    if (grant) await requestRevoke({ grantId: grant.id });
    this.render();
  }

  static async #onRevoke(event, target) {
    await requestRevoke({ grantId: target.dataset.grantId });
    this.render();
  }

  static #onSetActingAs(event, target) {
    this.#actingAsUserId = target.dataset.userId || null;
    this.render();
  }

  static #onToggleForce() {
    this.#force = !this.#force;
    this.render();
  }

  /** GM-only, mirrors #onToggleForce exactly -- see equipment-state.mjs's own "kind" comment for why this exists (#178: telling Nobu's free extra item apart from a normal budgeted pick, after the fact, without asking the GM to remember). */
  static #onToggleBonus() {
    this.#bonus = !this.#bonus;
    this.render();
  }
}

/** One instance reused, same reasoning as Character Card: a second macro click should focus the existing window, not stack a duplicate. */
let open = null;

export function openEquipmentPanel() {
  if (open?.rendered) {
    open.bringToFront();
    return open;
  }
  open = new EquipmentPanel();
  open.render({ force: true });
  return open;
}

/** Called from the settings onChange and the socket handler, so every open panel updates the instant any client's take/return/revoke lands — including ones that had nothing to do with causing it. */
export function refreshEquipmentPanel() {
  if (open?.rendered) open.render();
  return open;
}
