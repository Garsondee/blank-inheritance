/**
 * The admin key: a big red launch button on the GM's main screen that opens
 * the admin panel (Ingram, 2026-10-01). The panel itself lives in
 * admin-panel.mjs; this file is only the way in.
 *
 * It stands on the right, at the macro bar's own height, beside the sidebar.
 * core/admin-key.mjs decides the exact spot from the measured rectangles
 * (and keeps it off the macro bar and out of the chat toast column); this
 * file measures, writes two CSS properties on <body>, and handles the press.
 * Same pattern as the session rail's fitRail and the deck's fitDeck, and
 * fitDeck calls fitAdminKey at the end of every fit, so the key follows the
 * deck, the scene runner and the sidebar without watching any of them itself.
 *
 * GM-only, and not by hiding: a player's client never constructs this class.
 * Mounted as a direct child of #interface, never inside #ui-middle (whose
 * transform breaks position: fixed; see deck.mjs#escapeHotbarFromUiMiddle).
 *
 * No static import of admin-panel.mjs: that file pulls in most of the admin
 * tooling, and deck.mjs imports THIS file (for fitAdminKey), so the panel is
 * loaded on the first press instead.
 */

import { adminKeyPlacement } from "../core/admin-key.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const KEY_ID = "bi-admin-key";
/** The panel's own window id (AdminPanel.DEFAULT_OPTIONS.id). */
const PANEL_ID = "bi-admin";

const panelIsOpen = () => Boolean(foundry.applications.instances.get(PANEL_ID)?.rendered);

export class AdminKey extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: KEY_ID,
    tag: "aside",
    classes: ["bi-akey"],
    window: { frame: false, positioned: false },
    actions: { toggleAdmin: AdminKey.#onToggle }
  };

  static PARTS = {
    key: { template: `modules/${MODULE_ID}/templates/admin/key.hbs` }
  };

  /** Same mount as the rail and the deck: a direct child of #interface, replacing any same-id node. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    return { open: panelIsOpen() };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    fitAdminKey();
  }

  /** Press: open the panel, or put it away if it is already open. */
  static async #onToggle() {
    const panel = foundry.applications.instances.get(PANEL_ID);
    if (panel?.rendered) {
      await panel.close();
      return;
    }
    const { openAdminPanel } = await import("./admin-panel.mjs");
    openAdminPanel();
  }
}

const rectOf = (id) => {
  const r = document.getElementById(id)?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
};

/**
 * Measure the macro bar, the sidebar and the chat toast column and put the
 * key where core/admin-key.mjs says. Cheap and idempotent; with no key
 * mounted the two properties are removed, so the stylesheet defaults apply.
 */
export function fitAdminKey() {
  const style = document.body.style;
  if (!document.getElementById(KEY_ID)) {
    style.removeProperty("--bi-akey-right");
    style.removeProperty("--bi-akey-bottom");
    return null;
  }
  const placement = adminKeyPlacement({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    sidebarLeft: rectOf("sidebar")?.left,
    hotbar: rectOf("hotbar"),
    chat: rectOf("chat-notifications")
  });
  style.setProperty("--bi-akey-right", `${placement.right}px`);
  style.setProperty("--bi-akey-bottom", `${placement.bottom}px`);
  return placement;
}

/** Light or release the key as the panel opens and closes, without re-rendering it. */
function showOpen(open) {
  const button = document.querySelector(`#${KEY_ID} .bi-akey__button`);
  button?.classList.toggle("is-open", open);
  button?.setAttribute("aria-pressed", String(open));
}

let active = null;
let hooked = false;

/** Mount the key on a GM's client, or re-assert it. A player's client never gets one. */
export function mountAdminKey() {
  if (!game.user?.isGM) return null;
  if (!hooked) {
    hooked = true;
    Hooks.on("renderAdminPanel", () => showOpen(true));
    Hooks.on("closeAdminPanel", () => showOpen(false));
  }
  if (!active) active = new AdminKey();
  active.render({ force: true });
  return active;
}
