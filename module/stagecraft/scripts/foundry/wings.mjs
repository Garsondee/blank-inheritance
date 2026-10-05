/**
 * The wings, on the GM's screen (core/wings.mjs says who and how): the people a scene could still bring on.
 *
 *   - **The tray**, along the top of the stage just under the GM's strips, always there for a GM: a face for everyone still
 *     waiting. A click brings them on (their own way: the provider says what that is); a right-click asks how (the
 *     provider's ways); a drag onto the stage brings them on where they are dropped. A box beside the faces finds anyone
 *     else (`api.wings.setFinder`), with the same three hands on what it finds.
 *   - **A faded card** standing where each of them would stand, if the provider gave a place: the same three hands, so a
 *     scene's people can be brought on where they wait. Seen on this screen alone; the eye on the tray hides them
 *     (remembered on this machine), and they step aside while chalk is in hand, a formation is waiting for the floor or the
 *     stage is being edited.
 *
 * Nothing here is written to the scene or sent to anyone: bringing someone on raises `stagecraft.bring`, and whoever answers
 * it (the provider's own module) puts them on the stage. Their card then arrives the way every card does, and they leave
 * the wings because the provider no longer names them.
 */

import { NS } from "./scene-data.mjs";
import { marginsNow } from "./margins.mjs";
import { describeWings, describeFound, stillWaiting, ghostBox, isDrag, trayTop, bringEvent } from "../core/wings.mjs";
import { menuPlace } from "../core/card-menu.mjs";

const providers = new Set();
const finders = new Set();
/** A picture's address made routable, as the cards' own are (a Foundry install may live under a path). */
const route = (src) => (globalThis.foundry?.utils?.getRoute ? foundry.utils.getRoute(src) : src);
const GHOSTS_KEY = "stagecraft.ghosts";
const t = (key, data) => (data ? game.i18n.format(`STAGECRAFT.Wings.${key}`, data) : game.i18n.localize(`STAGECRAFT.Wings.${key}`));

/** provider(scene) -> { people: [{ id, name, title?, portrait?, at?, size?, way?, note? }], ways?: [{ id, label }] }, or a promise of it. */
export function registerWings(provider) {
  if (typeof provider !== "function") throw new TypeError("a wings provider must be a function of the scene");
  providers.add(provider);
  current?.refresh();
  return () => { providers.delete(provider); current?.refresh(); };
}

/** finder(scene, query) -> [{ id, name, portrait?, note? }], or a promise of it. */
export function registerFinder(finder) {
  if (typeof finder !== "function") throw new TypeError("a finder must be a function of the scene and what was typed");
  finders.add(finder);
  current?.refresh();
  return () => { finders.delete(finder); current?.refresh(); };
}

/** Everything the providers say about a scene now; one that throws or fails says nothing. */
export async function wingsFor(scene) {
  const answers = await Promise.all([...providers].map((p) => Promise.resolve().then(() => p(scene)).catch((err) => { console.warn(`${NS} | a wings provider failed`, err); return null; })));
  return describeWings(answers);
}

/** Everyone the finders find for `query`; one that throws or fails finds nobody. */
export async function foundFor(scene, query) {
  const lists = await Promise.all([...finders].map((f) => Promise.resolve().then(() => f(scene, query)).catch((err) => { console.warn(`${NS} | a finder failed`, err); return []; })));
  return describeFound(lists.flat());
}

/** The wings on screen now, so a provider registered later is asked at once. */
let current = null;

export class Wings {
  constructor(host) {
    this.host = host;
    this.people = [];                  // everyone the providers name, on the stage or not
    this.ways = [];
    this.found = [];
    this.coming = new Map();           // id -> when it was brought on: dimmed until the provider stops naming it
    this.press = null;                 // a press on a face or a faded card: { id, found, from, pointerId, el, carry }
    this.seq = 0;
    this.findSeq = 0;
    this.boxes = new Map();            // id -> the faded card's box as last placed, so an unchanged one is not touched
    this.showGhosts = true;
    try { this.showGhosts = globalThis.localStorage?.getItem(GHOSTS_KEY) !== "0"; } catch { /* a private window: shown */ }
    this.#build();
    current = this;
    this.refresh();
  }

  dispose() {
    if (current === this) current = null;
    this.#endPress();
    this.closeWays();
    clearTimeout(this.findTimer);
    this.tray?.remove();
    this.layer?.remove();
    this.tray = this.layer = null;
  }

  /* ---------------------------------------------------------------- building */

  #build() {
    const tray = document.createElement("div");
    tray.className = "stagecraft-wings";
    tray.setAttribute("role", "toolbar");
    tray.setAttribute("aria-label", t("Label"));
    tray.innerHTML = `
      <span class="wings-label"></span>
      <div class="wings-people"></div>
      <span class="wings-none"></span>
      <button type="button" class="wings-eye"></button>
      <span class="wings-finder">
        <input type="search" class="wings-find" autocomplete="off" spellcheck="false">
        <div class="wings-found" popover="manual" hidden></div>
      </span>`;
    tray.querySelector(".wings-label").textContent = t("Title");
    tray.querySelector(".wings-none").textContent = t("Nobody");
    const eye = tray.querySelector(".wings-eye");
    eye.textContent = t("Ghosts");
    eye.title = t("GhostsTip");
    eye.addEventListener("click", () => {
      this.showGhosts = !this.showGhosts;
      try { globalThis.localStorage?.setItem(GHOSTS_KEY, this.showGhosts ? "1" : "0"); } catch { /* not kept: fine */ }
      this.#paintEye();
      this.frame(true);
    });
    const find = tray.querySelector(".wings-find");
    find.placeholder = t("Find");
    find.setAttribute("aria-label", t("FindLabel"));
    find.addEventListener("input", () => {
      clearTimeout(this.findTimer);
      this.findTimer = setTimeout(() => this.#find(find.value), 140);
    });
    find.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.#clearFind(); find.blur(); }
      else if (e.key === "Enter") { e.preventDefault(); const first = this.found[0]; if (first) this.bring(first.id, { found: true }); }
    });
    for (const el of [tray.querySelector(".wings-people"), tray.querySelector(".wings-found")]) {
      el.addEventListener("pointerdown", (e) => {
        const item = e.target.closest("[data-id]");
        if (item) this.#pressDown(e, item, item.dataset.found === "1");
      });
      el.addEventListener("contextmenu", (e) => {
        const item = e.target.closest("[data-id]");
        if (!item) return;
        e.preventDefault();
        this.openWays(item.dataset.id, e.clientX, e.clientY, item.dataset.found === "1");
      });
      el.addEventListener("keydown", (e) => {
        const item = e.target.closest("[data-id]");
        if (!item || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        this.bring(item.dataset.id, { found: item.dataset.found === "1" });
      });
    }
    this.tray = tray;
    this.host.root.append(tray);

    // the faded cards: one layer over the picture, under the GM's strips and the tray
    const layer = document.createElement("div");
    layer.className = "stagecraft-ghosts";
    layer.addEventListener("pointerdown", (e) => {
      const ghost = e.target.closest(".stagecraft-ghost");
      if (ghost) this.#pressDown(e, ghost, false);
    });
    layer.addEventListener("contextmenu", (e) => {
      const ghost = e.target.closest(".stagecraft-ghost");
      if (!ghost) return;
      e.preventDefault();
      this.openWays(ghost.dataset.id, e.clientX, e.clientY, false);
    });
    layer.addEventListener("keydown", (e) => {
      const ghost = e.target.closest(".stagecraft-ghost");
      if (!ghost || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      this.bring(ghost.dataset.id);
    });
    // the wheel over a faded card still zooms the stage under it
    layer.addEventListener("wheel", (e) => {
      const canvas = this.host.backend?.canvas;
      if (!canvas) return;
      e.preventDefault();
      canvas.dispatchEvent(new WheelEvent("wheel", { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, clientX: e.clientX, clientY: e.clientY, bubbles: true, cancelable: true }));
    }, { passive: false });
    this.layer = layer;
    this.host.root.append(layer);
    this.#paintEye();
  }

  #paintEye() {
    const eye = this.tray?.querySelector(".wings-eye");
    if (!eye) return;
    eye.classList.toggle("on", this.showGhosts);
    eye.setAttribute("aria-pressed", this.showGhosts ? "true" : "false");
  }

  /* ---------------------------------------------------------------- who */

  /** Ask the providers again (the scene changed, or their own story did). */
  async refresh() {
    if (!this.tray) return;
    const seq = ++this.seq;
    const { people, ways } = await wingsFor(this.host.scene);
    if (seq !== this.seq || !this.tray) return;
    this.people = people;
    this.ways = ways;
    const named = new Set(people.map((p) => p.id));
    for (const id of [...this.coming.keys()]) if (!named.has(id) || Date.now() - this.coming.get(id) > 6000) this.coming.delete(id);
    this.#paintTray();
    this.place();
    this.frame(true);
  }

  /** Everyone named who has no card on the stage now. */
  waiting() {
    return stillWaiting(this.people, this.host.stage ? [...this.host.stage.cards.keys()] : []);
  }

  #paintTray() {
    const list = this.tray.querySelector(".wings-people");
    const waiting = this.waiting();
    const key = JSON.stringify(waiting.map((p) => [p.id, p.name, p.portrait, this.coming.has(p.id)]));
    this.tray.querySelector(".wings-none").hidden = waiting.length > 0;
    if (key === this.trayKey) return;
    this.trayKey = key;
    list.replaceChildren(...waiting.map((p) => this.#face(p, "wings-person", false)));
  }

  /** A face in the tray, or a row the finder found: a picture (or an initial) and a name. */
  #face(p, className, found) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.dataset.id = p.id;
    if (found) b.dataset.found = "1";
    if (this.coming.has(p.id)) b.classList.add("coming");
    b.title = [p.title || p.note, t("Hands")].filter(Boolean).join("\n");
    if (p.portrait) {
      const img = document.createElement("img");
      img.src = route(p.portrait);
      img.alt = "";
      img.draggable = false;
      b.append(img);
    } else {
      const i = document.createElement("span");
      i.className = "wings-initial";
      i.textContent = (p.name || "?").trim().charAt(0).toUpperCase();
      b.append(i);
    }
    const n = document.createElement("span");
    n.className = "wings-name";
    n.textContent = p.name;
    b.append(n);
    if (found && p.note) {
      const note = document.createElement("span");
      note.className = "wings-note";
      note.textContent = p.note;
      b.append(note);
    }
    return b;
  }

  /* ---------------------------------------------------------------- where */

  /** Stand the tray under whichever of the GM's strips are showing, in the middle of the part of the window that is free. */
  place() {
    const root = this.host.root;
    if (!root || !this.tray) return;
    const r = root.getBoundingClientRect();
    const bottoms = [];
    for (const el of root.querySelectorAll(".stagecraft-bar, .stagecraft-gm-toggle")) {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) bottoms.push(b.bottom - r.top);
    }
    const m = marginsNow();
    const mid = m.left + Math.max(0, r.width - m.left - m.right) / 2;
    this.tray.style.top = `${trayTop(bottoms)}px`;
    this.tray.style.left = `${Math.round(mid)}px`;
    this.tray.style.maxWidth = `${Math.max(240, Math.round(r.width - m.left - m.right - 40))}px`;
  }

  /**
   * Each frame the stage draws: stand every faded card where its person would stand, as the picture projects it now (the
   * view may have moved). Only a box that changed is written to the page.
   */
  frame(force = false) {
    const layer = this.layer;
    const host = this.host;
    if (!layer || !host.stage || !host.backend?.project) return;
    const hidden = !this.showGhosts || !!host.chalk?.inHand || !!host.blocking?.armed || !!host.editor?.on;
    if (layer.hidden !== hidden) layer.hidden = hidden;
    if (hidden) return;
    // where a faded card stands changes only when the view moves, the cast changes or the providers say something new: the
    // picture hands a new view object over at every pan, zoom and resize, so an unchanged one means nothing to work out
    const stage = host.stage;
    const view = host.backend.view ?? null;
    const done = this.framed;
    if (!force && done && done.view === view && done.people === this.people && done.cast === stage.cards.size) return;
    this.framed = { view, people: this.people, cast: stage.cards.size };
    this.ghostEls ??= new Map();
    const seen = new Set();
    for (const p of this.waiting()) {
      if (!p.at) continue;
      const box = this.#boxOf(stage, p);
      if (!box) continue;
      seen.add(p.id);
      let el = this.ghostEls.get(p.id);
      if (!el) { el = this.#ghost(p); layer.append(el); this.ghostEls.set(p.id, el); }
      el.classList.toggle("coming", this.coming.has(p.id));
      const k = `${box.x},${box.y},${box.w},${box.h}`;
      if (this.boxes.get(p.id) === k) continue;
      this.boxes.set(p.id, k);
      Object.assign(el.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
    }
    for (const [id, el] of this.ghostEls) {
      if (seen.has(id)) continue;
      this.boxes.delete(id);
      this.ghostEls.delete(id);
      el.remove();
    }
  }

  /** Where a waiting person's card would stand on the screen: the stage's own sizes, depth and riser for that place. */
  #boxOf(stage, p) {
    const placed = stage.rig?.place?.(p.at);
    if (!placed) return null;
    const s = (stage.scene?.cardScale ?? 1) * (p.size ?? 1);
    const w = (stage.opts?.card?.w ?? 280) * s;
    const h = (stage.opts?.card?.h ?? 468) * s;
    const g = stage.grow?.(placed.Z) ?? 1;
    const lift = stage.riserFor?.(placed.X, placed.Z, w * g, h * g) ?? 0;
    const project = (X, Y) => this.host.backend.project({ X, Y, Z: placed.Z });
    return ghostBox({ foot: project(placed.X, lift), head: project(placed.X, lift + h * g), left: project(placed.X - (w * g) / 2, lift), right: project(placed.X + (w * g) / 2, lift) });
  }

  #ghost(p) {
    const el = document.createElement("div");
    el.className = "stagecraft-ghost";
    el.dataset.id = p.id;
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", t("BringOn", { name: p.name }));
    el.title = `${p.name}${p.title ? ` · ${p.title}` : ""}\n${t("Hands")}`;
    if (p.portrait) {
      const img = document.createElement("img");
      img.src = route(p.portrait);
      img.alt = "";
      img.draggable = false;
      el.append(img);
    }
    const n = document.createElement("span");
    n.className = "ghost-name";
    n.textContent = p.name;
    el.append(n);
    return el;
  }

  /* ---------------------------------------------------------------- the hands */

  #pressDown(e, el, found) {
    if (e.button !== 0) return;
    e.preventDefault();
    this.closeWays();
    this.#endPress();
    const press = { id: el.dataset.id, found, from: { x: e.clientX, y: e.clientY }, pointerId: e.pointerId, el, carry: null };
    try { el.setPointerCapture(e.pointerId); } catch { /* a pen that has gone: the press still ends */ }
    const move = (ev) => {
      if (ev.pointerId !== press.pointerId) return;
      if (!press.carry && isDrag(press.from, { x: ev.clientX, y: ev.clientY })) press.carry = this.#carry(el);
      if (press.carry) Object.assign(press.carry.style, { left: `${ev.clientX}px`, top: `${ev.clientY}px` });
    };
    const up = (ev) => {
      if (ev.pointerId !== press.pointerId) return;
      const carried = !!press.carry;
      this.#endPress();
      if (ev.type === "pointercancel") return;
      if (!carried) { this.bring(press.id, { found: press.found }); return; }
      // dropped: on the stage, they come on there; anywhere else (the tray, a window), nothing happens
      const at = this.#dropPoint(ev.clientX, ev.clientY);
      if (at) this.bring(press.id, { found: press.found, at });
    };
    const key = (ev) => { if (ev.key === "Escape" && press.carry) { ev.preventDefault(); ev.stopPropagation(); this.#endPress(); } };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key, true);
    press.off = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key, true);
    };
    this.press = press;
  }

  #endPress() {
    const press = this.press;
    if (!press) return;
    this.press = null;
    press.off?.();
    try { press.el.releasePointerCapture?.(press.pointerId); } catch { /* already let go */ }
    press.carry?.remove();
    press.el.classList.remove("carried");
  }

  /** What follows the pointer while someone is carried onto the stage: their face, small. */
  #carry(el) {
    el.classList.add("carried");
    const c = document.createElement("div");
    c.className = "stagecraft-carry";
    const img = el.querySelector("img");
    if (img) { const i = document.createElement("img"); i.src = img.src; i.alt = ""; c.append(i); }
    const n = document.createElement("span");
    n.textContent = el.querySelector(".wings-name, .ghost-name")?.textContent ?? "";
    c.append(n);
    document.body.append(c);
    return c;
  }

  /** The point of the painting under a drop, or null when it did not land on the stage (or landed above its floor). */
  #dropPoint(x, y) {
    const under = document.elementFromPoint(x, y);
    const canvas = this.host.backend?.canvas;
    if (!under || !canvas || (under !== canvas && !this.layer?.contains(under))) return null;
    return this.host.paintingPointAt?.(x, y) ?? null;
  }

  /** Bring someone on: the provider's module answers `stagecraft.bring` and puts them on the stage. */
  bring(id, { way = null, at = null, found = false } = {}) {
    if (!id || !game.user?.isGM) return false;
    this.closeWays();
    if (!found) this.coming.set(id, Date.now());
    else this.#clearFind();
    this.trayKey = null;
    this.#paintTray();
    this.frame(true);
    Hooks.callAll("stagecraft.bring", bringEvent({ scene: this.host.scene, id, way, at, found }), this.host);
    // a provider that never answers leaves nobody dimmed for long
    setTimeout(() => { if (this.coming.has(id)) this.refresh(); }, 6500);
    return true;
  }

  /* ---------------------------------------------------------------- how: the ways */

  /** A right-click on someone waiting: the ways they can come on, the provider's, their own first. */
  openWays(id, x, y, found = false) {
    this.closeWays();
    const p = found ? this.found.find((f) => f.id === id) : this.people.find((q) => q.id === id);
    if (!p) return false;
    const el = document.createElement("div");
    el.id = "stagecraft-ways-menu";
    el.className = "stagecraft-ways";
    el.setAttribute("popover", "manual");
    el.setAttribute("role", "menu");
    el.tabIndex = -1;
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    const name = document.createElement("div");
    name.className = "menu-name";
    name.textContent = p.name;
    el.append(name);
    const list = document.createElement("div");
    list.className = "menu-actions";
    const add = (label, way) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "menu-action";
      b.setAttribute("role", "menuitem");
      b.dataset.way = way ?? "";
      b.textContent = label;
      b.addEventListener("click", (e) => { e.preventDefault(); this.bring(id, { way, found }); });
      list.append(b);
    };
    const own = this.ways.find((w) => w.id === p.way);
    add(own ? t("TheirWay", { way: own.label }) : t("BringOnPlain"), null);
    for (const w of this.ways) if (w.id !== p.way) add(w.label, w.id);
    el.append(list);
    document.body.append(el);
    try { el.showPopover?.(); } catch { /* no popovers here: the z-index holds it on top */ }
    const box = menuPlace(x, y, el.offsetWidth, el.offsetHeight, window.innerWidth, window.innerHeight);
    el.style.left = `${box.left}px`;
    el.style.top = `${box.top}px`;
    this.waysEl = el;
    this.onWaysDown = (e) => { if (this.waysEl && !this.waysEl.contains(e.target)) this.closeWays(); };
    this.onWaysKey = (e) => { if (this.waysEl && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.closeWays(); } };
    document.addEventListener("pointerdown", this.onWaysDown, true);
    window.addEventListener("keydown", this.onWaysKey, true);
    el.focus({ preventScroll: true });
    return true;
  }

  closeWays() {
    if (this.onWaysDown) document.removeEventListener("pointerdown", this.onWaysDown, true);
    if (this.onWaysKey) window.removeEventListener("keydown", this.onWaysKey, true);
    this.onWaysDown = this.onWaysKey = null;
    this.waysEl?.remove();
    this.waysEl = null;
  }

  /* ---------------------------------------------------------------- anyone else: the finder */

  async #find(query) {
    const box = this.tray?.querySelector(".wings-found");
    if (!box) return;
    const q = String(query ?? "").trim();
    const seq = ++this.findSeq;
    if (!q || !finders.size) { this.found = []; this.#hideFound(box); box.replaceChildren(); return; }
    const found = await foundFor(this.host.scene, q);
    if (seq !== this.findSeq || !this.tray) return;
    this.found = found;
    box.replaceChildren(...(found.length ? found.map((p) => this.#face(p, "wings-hit", true)) : [Object.assign(document.createElement("span"), { className: "wings-nohit", textContent: t("NoneFound") })]));
    this.#showFound(box);
  }

  /**
   * The list of what was found opens in the browser's top layer, under the box, so nothing another module has over the
   * stage (a tracker in the corner, a window) can cover it; where popovers are missing, the z-index holds it up.
   */
  #showFound(box) {
    const input = this.tray?.querySelector(".wings-find");
    box.hidden = false;
    try { if (!box.matches(":popover-open")) box.showPopover?.(); } catch { /* no popovers here */ }
    const r = input?.getBoundingClientRect();
    if (!r) return;
    box.style.top = `${Math.round(r.bottom + 6)}px`;
    box.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - box.offsetWidth - 8, r.right - box.offsetWidth)))}px`;
  }

  #hideFound(box) {
    try { if (box.matches(":popover-open")) box.hidePopover?.(); } catch { /* no popovers here */ }
    box.hidden = true;
  }

  #clearFind() {
    const input = this.tray?.querySelector(".wings-find");
    if (input) input.value = "";
    this.findSeq++;
    this.found = [];
    const box = this.tray?.querySelector(".wings-found");
    if (box) { this.#hideFound(box); box.replaceChildren(); }
  }
}
