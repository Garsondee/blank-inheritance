/**
 * A card's menu: a right-click on a card. What it offers is core/card-menu.mjs; this draws it over the stage and does what
 * is picked.
 *
 *   - **Emotes**, for anyone who may put one on the card (a GM any card; a player one of theirs, hands off or not, since an
 *     emote moves nothing). Picked, one is shown once; with **Keep it up** on, it comes round every few seconds until it is
 *     cleared. **Clear** takes off a kept one, a scene's authored habit included.
 *   - **For the GM**: give the card the floor or take it back, knock it down or stand it up, choose it for a formation (as
 *     a Shift-click does), and its sheet, for a card that names an actor its viewer may see.
 *   - **Another module's own**, for the GM (`api.blocking.setCardActions`): what it offers for this card, after the stage's
 *     (the adventure's "Send off" and "Tell their name"), each run when it is picked.
 *
 * An emote is written on the card in the published cast (blocking.mjs `setEmote`), so every screen shows it together and a
 * reload finds a kept one. Only a GM may write the scene, so a player's pick goes over the module's socket to the acting GM's
 * screen, which checks the card is the player's and writes it. With no GM on, a player is told so.
 *
 * It is drawn over everything on the page (Ingram, 2026-10-04: it opened behind the adventure's interface). The stage sits at
 * the bottom of the page, under every window and panel, so the menu is not put in it: it goes on the page itself, in the
 * browser's top layer (a popover, which nothing on the page can cover), with a z-index above Foundry's own notifications
 * for a browser without popovers.
 *
 * It closes on a pick, on Escape, on a press anywhere else, and when the stage goes.
 */

import { EMOTES } from "../core/emotes.mjs";
import { cardMenu, menuPlace, EMOTE_GROUPS } from "../core/card-menu.mjs";
import { NS, canHold, actingGM } from "./scene-data.mjs";
import { setEmote, setSpeaker, setDown } from "./blocking.mjs";

const KEEP_KEY = "stagecraft.emoteKeep";
const say = (key) => game.i18n.localize(`STAGECRAFT.Menu.${key}`);

const actionProviders = new Set();

/**
 * Another module's own things for the GM to do to a card: provider(scene, cardId, card) -> [{ id, label, run() }], asked
 * each time a GM opens a card's menu (so it must answer at once). Returns a function that takes it away.
 */
export function registerCardActions(provider) {
  if (typeof provider !== "function") throw new TypeError("a card actions provider must be a function of the scene and the card");
  actionProviders.add(provider);
  return () => actionProviders.delete(provider);
}

/** What every provider offers for this card now: [{ id, label, run }]; one that throws offers nothing. */
export function cardActionsFor(scene, id, card) {
  const out = [];
  for (const provider of actionProviders) {
    try {
      for (const a of provider(scene, id, card) ?? []) if (a && typeof a.id === "string" && typeof a.run === "function" && !out.some((o) => o.id === a.id)) out.push(a);
    } catch (err) {
      console.warn(`${NS} | a card actions provider failed`, err);
    }
  }
  return out;
}

/** May this user put an emote on this card? A GM any card; a player one they may hold, whether or not hands are off. */
export const mayEmote = (person, user) => !!person && !!user && canHold(person, user, { handsOff: false });

/** The actor a card names (`actor`, an Actor's id), if this user may look at its sheet. */
function sheetOf(person, user) {
  const actor = person?.actor ? globalThis.game?.actors?.get?.(person.actor) : null;
  if (!actor?.sheet) return null;
  if (user?.isGM) return actor;
  return actor.testUserPermission?.(user, "OBSERVER") ? actor : null;
}

const pictures = new Map();
const pictureOf = (id) => {
  if (!pictures.has(id)) pictures.set(id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(EMOTES[id].svg)}`);
  return pictures.get(id);
};

export class CardMenu {
  constructor(host) {
    this.host = host;
    this.el = null;
    this.card = null;
    this.keep = false;
    try { this.keep = globalThis.localStorage?.getItem(KEEP_KEY) === "1"; } catch { /* a private window: off */ }
    this.onDown = (e) => { if (this.el && !this.el.contains(e.target)) this.close(); };
    this.onKey = (e) => { if (this.el && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(); } };
  }

  get isOpen() { return !!this.el; }

  /** Open the menu for card `id` at a press at (x, y) in the window. Returns whether there was anything to offer. */
  open(id, x, y) {
    this.close();
    const host = this.host;
    const c = host.stage?.cards.get(id);
    if (!c || host.dragging || host.chalk?.inHand) return false;
    const user = game.user;
    // another module's own, for the GM: asked now, kept with the menu so a pick runs what was offered
    this.extra = user?.isGM ? cardActionsFor(host.scene, id, c.person) : [];
    const menu = cardMenu({
      isGM: !!user?.isGM,
      mayEmote: mayEmote(c.person, user),
      person: c.person,
      speaker: host.stage.speaker === id,
      down: !!c.downTo,
      chosen: !!host.selected?.has(id),
      sheet: !!sheetOf(c.person, user),
      extra: this.extra.map((a) => ({ id: a.id, label: a.label }))
    });
    if (!menu) return false;
    this.card = id;
    this.el = this.#build(c.person, menu);
    document.body.append(this.el);
    try { this.el.showPopover?.(); } catch { /* already shown, or no popovers here: the z-index holds it on top */ }
    const box = menuPlace(x, y, this.el.offsetWidth, this.el.offsetHeight, window.innerWidth, window.innerHeight);
    this.el.style.left = `${box.left}px`;
    this.el.style.top = `${box.top}px`;
    document.addEventListener("pointerdown", this.onDown, true);
    window.addEventListener("keydown", this.onKey, true);       // before Foundry's own keys: Escape here closes the menu and nothing else
    this.el.focus({ preventScroll: true });          // the keys reach it (Tab into it, Escape out), with no ring on a first emote
    return true;
  }

  close() {
    document.removeEventListener("pointerdown", this.onDown, true);
    window.removeEventListener("keydown", this.onKey, true);
    this.el?.remove();
    this.el = null;
    this.card = null;
  }

  dispose() { this.close(); }

  /** Put emote `id` on the card (null clears it): the GM writes it; a player asks the acting GM to. */
  async emote(card, id, keep = this.keep) {
    const host = this.host;
    if (game.user?.isGM) return setEmote(host.scene, card, id, { keep });
    if (!game.users?.activeGM) { globalThis.ui?.notifications?.warn(say("NoGM")); return false; }
    host.channel?.send({ type: "emote", scene: host.scene.id, card, emote: id, keep: !!keep });
    return true;
  }

  /** A player's pick has arrived: the acting GM's screen writes it, if the card is theirs. */
  receive(message, sender) {
    const host = this.host;
    if (!actingGM() || message?.scene !== host.scene?.id || typeof message.card !== "string") return;
    const person = host.stage?.cards.get(message.card)?.person;
    if (!mayEmote(person, game.users.get(sender))) return;
    setEmote(host.scene, message.card, typeof message.emote === "string" ? message.emote : null, { keep: !!message.keep })
      .catch((err) => console.warn(`${NS} | could not put an emote on ${message.card}`, err));
  }

  /* ---------------------------------------------------------------- the menu itself */

  #build(person, menu) {
    const el = document.createElement("div");
    el.id = "stagecraft-card-menu";
    el.className = "stagecraft-card-menu";
    el.setAttribute("popover", "manual");
    el.setAttribute("role", "menu");
    el.tabIndex = -1;
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    const name = document.createElement("div");
    name.className = "menu-name";
    name.textContent = String(person.name ?? person.id).split(/\n|<br\s*\/?>|\\n/i)[0];
    el.append(name);
    if (menu.emotes) {
      for (const group of EMOTE_GROUPS) {
        const label = document.createElement("div");
        label.className = "menu-label";
        label.textContent = say(group.kind === "face" ? "Faces" : group.kind === "balloon" ? "Balloons" : "Marks");
        const grid = document.createElement("div");
        grid.className = "menu-emotes";
        for (const id of group.ids) {
          const b = this.#button("menu-emote", () => this.#pick(id));
          b.dataset.emote = id;
          b.title = EMOTES[id].label;
          b.setAttribute("aria-label", EMOTES[id].label);
          if (menu.kept === id) b.classList.add("on");
          const img = document.createElement("img");
          img.src = pictureOf(id);
          img.alt = "";
          img.draggable = false;
          b.append(img);
          grid.append(b);
        }
        el.append(label, grid);
      }
      const row = document.createElement("div");
      row.className = "menu-row";
      const keep = this.#button("menu-keep", () => {
        this.keep = !this.keep;
        keep.classList.toggle("on", this.keep);
        keep.setAttribute("aria-checked", String(this.keep));
        try { globalThis.localStorage?.setItem(KEEP_KEY, this.keep ? "1" : "0"); } catch { /* not kept */ }
      });
      keep.setAttribute("role", "menuitemcheckbox");
      keep.setAttribute("aria-checked", String(this.keep));
      keep.classList.toggle("on", this.keep);
      keep.textContent = say("Keep");
      keep.title = say("KeepTip");
      row.append(keep);
      if (menu.kept) {
        const clear = this.#button("menu-clear", () => this.#pick(null));
        clear.dataset.emote = "";
        clear.textContent = say("Clear");
        row.append(clear);
      }
      el.append(row);
    }
    if (menu.actions.length) {
      const list = document.createElement("div");
      list.className = "menu-actions";
      for (const a of menu.actions) {
        const b = this.#button("menu-action", () => this.#act(a.id));
        b.dataset.action = a.id;
        b.textContent = a.label ?? say(this.#words(a));
        list.append(b);
      }
      el.append(list);
    }
    return el;
  }

  #words({ id, on }) {
    if (id === "floor") return on ? "FloorTake" : "FloorGive";
    if (id === "down") return on ? "DownStand" : "DownKnock";
    if (id === "choose") return on ? "Unchoose" : "Choose";
    return "Sheet";
  }

  #button(className, run) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.setAttribute("role", "menuitem");
    b.addEventListener("click", (e) => { e.preventDefault(); run(); });
    return b;
  }

  #pick(emoteId) {
    const card = this.card;
    this.close();
    if (!card || !this.host.stage?.cards.has(card)) return;
    this.emote(card, emoteId).catch((err) => console.warn(`${NS} | could not put an emote on ${card}`, err));
  }

  #act(action) {
    const host = this.host;
    const id = this.card;
    this.close();
    const c = id ? host.stage?.cards.get(id) : null;
    if (!c) return;
    const failed = (err) => console.warn(`${NS} | ${action} on ${id} failed`, err);
    if (action.startsWith("extra:")) {
      const own = this.extra?.find((a) => `extra:${a.id}` === action);
      if (own) Promise.resolve().then(() => own.run()).catch(failed);
      return;
    }
    if (action === "floor") setSpeaker(host.scene, host.stage.speaker === id ? null : id).catch(failed);
    else if (action === "down") setDown(host.scene, id, !c.downTo).catch(failed);
    else if (action === "choose") {
      if (host.selected.has(id)) host.selected.delete(id); else host.selected.add(id);
      host.blocking?.selectionChanged();
    } else if (action === "sheet") sheetOf(c.person, game.user)?.sheet.render(true);
  }
}
