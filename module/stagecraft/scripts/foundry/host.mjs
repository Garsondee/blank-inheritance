/**
 * The host: one running stage for one scene on one client. It owns the engine (core/stage.mjs), the backend that draws
 * it, the loop that drives both, the pointer that moves the cards and the chalk, and (for a GM) the stage bar. The
 * scene manager makes one when a stage scene is drawn and stops it when the scene is torn down; nothing here is global.
 */

import { Stage } from "../core/stage.mjs";
import { FrameGuard } from "../core/frame-guard.mjs";
import { StageSync, commitPlace } from "../core/sync.mjs";
import { ThreeBackend } from "../render/three/backend.mjs";
import { FlatBackend } from "../render/flat/backend.mjs";
import { ImageCache } from "../render/images.mjs";
import { chooseBackend, hasWebGL, hasSoftwareWebGL } from "../render/choose.mjs";
import { NS, readStage, readCast, canHold, handsOff, actingGM } from "./scene-data.mjs";
import { openChannel } from "./socket.mjs";
import { chosenTier, tierSetting, isCalm, zoneSetting } from "./settings.mjs";
import { ChalkController } from "./chalk.mjs";
import { StageBar } from "./bar.mjs";
import { BlockingBar } from "./blocking-bar.mjs";
import { sharedNow, serially, lifeOn, boardOn, speakerOf, setSpeaker } from "./blocking.mjs";

export class StageHost {
  constructor({ scene, skins, anchor, services = {}, onFatal = null }) {
    this.scene = scene;
    this.onFatal = onFatal;                // called when the stage cannot draw at all, so Foundry's canvas can be given back
    this.guard = new FrameGuard({
      limit: 600,                          // frames in a row, about ten seconds
      report: (err, n) => console.error(`${NS} | a frame failed (${n} in a row)`, err),
      onFatal: (err) => this.#giveUp(err)
    });
    this.threeFailed = false;              // the 3D picture could not start or keeps failing here, so the plain one draws
    this.losses = 0;                       // graphics contexts lost; the second means a card that cannot be trusted
    this.rebuilding = false;
    this.saving = Promise.resolve();       // where cards were put down are written to the scene one after another
    this.skins = skins;
    this.anchor = anchor;                  // the element our root goes after (Foundry's board canvas)
    this.services = services;              // shared across stages: { chalkStore }
    this.userId = game.user.id;
    this.dragging = null;
    this.selected = new Set();             // the GM's selection (shift-click): what a formation moves
    this.running = false;
    this.frames = 0;
    this.listeners = [];
    this.hooks = [];
  }

  /** Build and start. Returns false (and says why) when this scene cannot be drawn by us, so Foundry's canvas stays. */
  async start() {
    const { usable, scene: description, problems } = readStage(this.scene);
    if (!usable) {
      console.warn(`${NS} | "${this.scene.name}" has a stage description that cannot be drawn:`, problems);
      ui.notifications?.warn(game.i18n.format("STAGECRAFT.Notify.Unusable", { scene: this.scene.name }));
      return false;
    }
    if (problems.length) console.warn(`${NS} | "${this.scene.name}" has notes:`, problems);
    this.description = description;
    this.people = readCast(this.scene);
    // walks, routines and entrances run on the time every screen shares, so they agree everywhere
    this.stage = new Stage(description, this.people, { card: this.skins.get(description.skin).size, clock: sharedNow });
    this.stage.setLife(lifeOn(this.scene));
    this.stage.setBoard(boardOn(this.scene));
    this.stage.setSpeaker(speakerOf(this.scene));
    // a move already published was made before this screen was here: the card stands where it went, nothing to walk
    for (const p of this.people) { const c = this.stage.cards.get(p.id); if (c) c.appliedMove = p.move?.t0 ?? null; }
    for (const p of this.stage.problems) console.warn(`${NS} | ${p}`);

    this.sync = new StageSync({
      stage: this.stage, scene: this.scene.id, me: this.userId,
      now: () => game.time.serverTime, clock: () => performance.now(),      // the server's clock is the one every screen shares
      send: (message) => this.channel?.send(message),
      mayHold: (id, by) => this.#mayHold(id, by),
      onLost: (id) => this.#grabLost(id),
      onDrop: (result) => this.#dropped(result)
    });
    this.channel = openChannel((message, sender) => this.sync.receive(message, sender));

    this.root = document.createElement("div");
    this.root.id = "stagecraft-stage";
    this.root.dataset.scene = this.scene.id;
    this.anchor.after(this.root);

    await this.#buildBackend();
    this.chalk = this.services.chalkStore ? new ChalkController({ host: this, store: this.services.chalkStore }) : null;
    this.chalk?.sync();
    this.chalk?.refresh();
    if (game.user.isGM) { this.bar = new StageBar(this); this.blocking = new BlockingBar(this); }
    this.#boardKey();

    this.#watchSize();
    this.#watchPointer();
    this.#watchSettings();
    this.#watchScene();
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.#frame);
    Hooks.callAll("stagecraft.stageReady", this);
    return true;
  }

  /**
   * Make the picture that draws this stage: three.js where the machine can run it, the plain 2D one where the player asked
   * for it, the browser has no WebGL, or three.js has failed here. A 3D picture that will not start falls through to the
   * plain one, so the table still sees the stage.
   */
  async #buildBackend() {
    const images = new ImageCache();
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    const skin = this.skins.get(this.description.skin);
    // left on Automatic, a browser whose WebGL is software (no graphics card) gets the flat stage: the lit one would crawl there
    const software = tierSetting() === "auto" && hasSoftwareWebGL();
    const kind = chooseBackend({ tier: chosenTier(), webgl: hasWebGL(), failed: this.threeFailed, software });
    if (kind === "flat" && software && !this.toldFlat) { this.toldFlat = true; ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.FlatSoftware")); }
    if (kind === "three") {
      const three = new ThreeBackend({ images, onContextLost: () => this.#lost() });
      try {
        three.mount(this.root, { quality: chosenTier(), pixelRatio: window.devicePixelRatio, width: w, height: h });
        three.setCalm(isCalm());
        three.setZoneSetting(zoneSetting());
        await three.load(this.description, skin, this.people);
        this.backend = three;
        return;
      } catch (err) {
        console.warn(`${NS} | the 3D picture could not start here; drawing the plain one`, err);
        three.dispose();
        this.threeFailed = true;
      }
      if (!this.toldFlat) { this.toldFlat = true; ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.Flat")); }
    }
    const flat = new FlatBackend({ images });
    flat.mount(this.root, { pixelRatio: window.devicePixelRatio, width: w, height: h });
    flat.setCalm(isCalm());
    flat.setZoneSetting(zoneSetting());
    await flat.load(this.description, skin, this.people);
    this.backend = flat;
  }

  /**
   * The stage cannot draw and has failed for ten seconds running. If it was the 3D picture, the plain one is tried before
   * Foundry's own canvas is given back; if it was the plain one (or the plain one is already what is showing), there is
   * nothing left to try.
   */
  #giveUp(err) {
    if (this.backend?.name !== "flat" && !this.threeFailed && this.running) {
      console.warn(`${NS} | the 3D picture keeps failing; trying the plain one`, err);
      this.threeFailed = true;
      this.guard.failures = 0;
      this.rebuild()
        .then(() => { if (this.running) { this.last = performance.now(); this.raf = requestAnimationFrame(this.#frame); } })
        .catch((error) => { this.running = false; this.onFatal?.(error); });
      return;
    }
    this.running = false;
    this.onFatal?.(err);
  }

  /** Stop and free everything. Safe to call twice. */
  async stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    for (const [target, type, fn, opts] of this.listeners) target.removeEventListener(type, fn, opts);
    this.listeners = [];
    for (const [name, id] of this.hooks) Hooks.off(name, id);
    this.hooks = [];
    this.resizeObserver?.disconnect();
    this.sync?.close();                    // anything this screen holds is put down, and the others told
    this.channel?.close();
    this.channel = null;
    this.chalk?.stop();
    this.bar?.dispose();
    this.blocking?.dispose();
    this.backend?.dispose();
    this.root?.remove();
    this.chalk = this.bar = this.blocking = this.backend = this.root = null;
  }

  /* ---------------------------------------------------------------- the loop */

  /**
   * One frame. A frame that throws is reported and skipped; the next one is tried, because one bad frame (a half-built
   * card during a rebuild, say) must not end the show. A stage that has failed for ten seconds running is given up on
   * and Foundry's own canvas is handed back.
   */
  #frame = (now) => {
    if (!this.running) return;
    const alive = this.guard.run(() => {
      const dt = (now - this.last) / 1000;
      this.last = now;
      this.sync.tick();
      this.stage.advance(dt);
      this.backend.draw(this.stage.snapshot({ viewer: this.userId, selected: this.selected }));
      this.frames++;
      for (const e of this.stage.drain()) Hooks.callAll(`stagecraft.${e.type}`, e, this);
    });
    if (alive) this.raf = requestAnimationFrame(this.#frame);
  };

  /* ---------------------------------------------------------------- pointer */

  #on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.listeners.push([target, type, fn, opts]);
  }

  #local(e) {
    const r = this.root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  #watchPointer() {
    const canvas = this.backend.canvas;
    this.#on(canvas, "pointerdown", (e) => {
      if (e.button === 2 && this.chalk?.inHand) { this.chalk.putAway(); return; }
      if (e.button === 2 && this.blocking?.disarm()) return;
      if (e.button !== 0) return;
      const p = this.#local(e);
      const hit = this.backend.pick(p.x, p.y);
      // the GM's blocking: a formation waiting for where to go, or shift-click to choose who it moves
      if (this.blocking && !this.chalk?.inHand) {
        if (this.blocking.armed) {
          const at = hit?.kind === "card" ? null : this.#paintingPoint(p);
          if (hit?.kind === "card" || at) {
            this.blocking.placeArmed({ card: hit?.kind === "card" ? hit.id : null, at }).catch((err) => console.warn(`${NS} | the formation could not be made`, err));
            e.preventDefault();
            return;
          }
        }
        if (e.shiftKey && hit?.kind === "card") {
          if (this.selected.has(hit.id)) this.selected.delete(hit.id); else this.selected.add(hit.id);
          this.blocking.selectionChanged();
          e.preventDefault();
          return;
        }
        // Alt-click gives someone the floor (or takes it back): they are lit and everyone turns to look at them
        if (e.altKey && hit?.kind === "card") {
          setSpeaker(this.scene, this.stage.speaker === hit.id ? null : hit.id).catch((err) => console.warn(`${NS} | could not give the floor`, err));
          e.preventDefault();
          return;
        }
      }
      // the box of chalk: take a stick, or put it back
      if (hit?.kind === "chalk" || hit?.kind === "eraser") { this.chalk?.take(hit.kind === "eraser" ? "rub" : hit.colour); this.chalk?.hover(p); e.preventDefault(); return; }
      // chalk in hand: draw, wherever the pointer is
      if (this.chalk?.inHand) {
        if (this.chalk.begin(p)) { canvas.setPointerCapture(e.pointerId); this.chalk.hover(p); e.preventDefault(); }
        return;
      }
      if (hit?.kind !== "card") return;
      if (!this.sync.grab(hit.id)) return;          // not yours to hold, or someone has it already
      // The hand is wherever the pointer's ray meets the plane through the point that was grabbed, so the card does not jump.
      const at = this.backend.floorAt(p.x, p.y, hit.point.y);
      const card = this.stage.cards.get(hit.id);
      this.dragging = { id: hit.id, height: hit.point.y, offX: (at?.x ?? card.puppet.x) - card.puppet.x, offZ: (at?.z ?? card.Z) - card.Z };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      e.preventDefault();
    });
    this.#on(canvas, "pointermove", (e) => {
      const p = this.#local(e);
      if (this.chalk?.inHand) { this.chalk.hover(p); canvas.style.cursor = "none"; return; }
      if (!this.dragging) { const h = this.backend.pick(p.x, p.y); canvas.style.cursor = h ? "grab" : "default"; return; }
      const at = this.backend.floorAt(p.x, p.y, this.dragging.height);
      if (at) this.sync.move(this.dragging.id, at.x - this.dragging.offX, at.z - this.dragging.offZ);
    });
    const release = (e) => {
      if (this.chalk?.drawing) {
        this.chalk.end().catch((err) => console.warn(`${NS} | chalk stroke failed`, err));
        this.chalk.hover(this.#local(e));
        return;
      }
      if (!this.dragging) return;
      this.sync.release(this.dragging.id);
      this.dragging = null;
      canvas.style.cursor = "default";
    };
    this.#on(canvas, "pointerup", release);
    this.#on(canvas, "pointercancel", release);
    // Escape puts the chalk back in the box. It is taken before Foundry sees it (capture phase), or the same press would
    // also open Foundry's game menu over the stage.
    this.#on(window, "keydown", (e) => {
      if (e.code !== "Escape") return;
      if (this.chalk?.inHand) this.chalk.putAway();
      else if (this.blocking?.disarm()) { /* the waiting formation is put away */ }
      else if (this.selected.size) { this.selected.clear(); this.blocking?.selectionChanged(); }
      else return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  /** The point of the painting under a viewport point, through the floor (fractions), or null above the horizon. */
  #paintingPoint(p) {
    const at = this.backend.floorAt(p.x, p.y, 0);
    if (!at) return null;
    const f = this.stage.rig.fractionOf(at.x, at.z);
    return Number.isFinite(f[0]) && Number.isFinite(f[1]) ? [Math.round(f[0] * 10000) / 10000, Math.round(f[1] * 10000) / 10000] : null;
  }

  /** A hop, a bow and so on, for the card in this hand. Called from Foundry's keybindings. */
  perform(verb) {
    if (this.dragging) this.sync.verb(this.dragging.id, verb);
  }

  /* ---------------------------------------------------------------- hands, shared */

  #mayHold(id, by) {
    const person = this.stage.cards.get(id)?.person;
    const user = game.users.get(by);
    return !!person && !!user && canHold(person, user, { handsOff: handsOff(this.scene) });
  }

  /** The local user's grab lost to an earlier one: the card is no longer theirs to carry. */
  #grabLost(id) {
    if (this.dragging?.id !== id) return;
    this.dragging = null;
    if (this.backend?.canvas) this.backend.canvas.style.cursor = "default";
  }

  /** A card was put down, by anyone. A GM's screen writes where it landed into the scene, so a reload sees it there. */
  #dropped(result) {
    if (!actingGM()) return;
    const place = this.stage.placeOf(result.card);
    if (!place) return;
    // one after another, and after any formation being written, so neither overwrites the other
    this.saving = serially(() => this.#savePlace(place)).catch((err) => console.warn(`${NS} | could not save where a card was put down`, err));
  }

  async #savePlace(place) {
    const cards = this.scene.flags?.[NS]?.published?.cards;
    if (!Array.isArray(cards) || !cards.some((card) => card.id === place.id)) return;
    await this.scene.update({ [`flags.${NS}.published.cards`]: commitPlace(cards, place) });
  }

  /**
   * The cast changed (someone was revealed, someone left, the GM made a formation): add the new cards, take away the gone,
   * and walk anyone the GM has moved. A place written only to remember where a hand put a card down is never acted on
   * (every screen already put it there); only a move, stamped with when it starts, sends a card walking.
   */
  #syncCast() {
    const people = readCast(this.scene);
    const want = new Set(people.map((p) => p.id));
    this.stage.setLife(lifeOn(this.scene));
    this.stage.setBoard(boardOn(this.scene));
    this.#boardKey();
    for (const p of people) {
      const c = this.stage.cards.get(p.id);
      if (c) { this.#follow(c, p); continue; }
      const added = this.stage.addCard(p);
      if (added) added.appliedMove = p.move?.t0 ?? null;
      this.people.push(p);
      this.backend.addCard(p).catch((err) => console.warn(`${NS} | could not draw ${p.id}`, err));
    }
    for (const id of [...this.stage.cards.keys()]) {
      if (want.has(id)) continue;
      this.sync.forget(id);
      if (this.dragging?.id === id) this.#grabLost(id);
      this.stage.removeCard(id);
      this.backend.removeCard(id);
      this.people = this.people.filter((p) => p.id !== id);
    }
    // after the cards: someone who has just arrived may be the one given the floor
    this.stage.setSpeaker(speakerOf(this.scene));
  }

  /**
   * The fight board's key, for everyone at the table while the board is up (stage.md §8.6): what the lines between the
   * positions mean, in SF2E's own terms. Only shown on a scene that has positions to draw.
   */
  #boardKey() {
    if (!this.root) return;
    const show = this.stage.board && this.stage.zones.some((z) => z.kind === "area");
    if (!show) { this.keyEl?.remove(); this.keyEl = null; return; }
    if (this.keyEl) return;
    const t = (k) => game.i18n.localize(`STAGECRAFT.Board.${k}`);
    this.keyEl = document.createElement("div");
    this.keyEl.className = "stagecraft-board-key";
    this.keyEl.innerHTML = `<b>${t("Title")}</b><span><i class="engaged"></i>${t("Engaged")}</span><span><i class="near"></i>${t("Near")}</span><span><i class="far"></i>${t("Far")}</span>`;
    this.root.append(this.keyEl);
  }

  /** One card already on the stage, as the scene now says: a new move to walk, its routine set aside or taken up again. */
  #follow(c, p) {
    c.person = { ...c.person, ...p, portrait: c.person.portrait };   // who may hold it, its name; the picture stays as built
    const move = p.move;
    if (move && Number.isFinite(move.t0) && move.t0 !== c.appliedMove) {
      c.appliedMove = move.t0;
      this.stage.walkTo(p.id, p.mark ? { mark: p.mark } : { at: p.at }, {
        t0: move.t0, gait: move.gait ?? "walk", yaw: Number.isFinite(p.yaw) ? p.yaw : null, lean: p.lean ?? 0, pitch: p.pitch ?? 0,
        still: p.still === true, packed: p.packed === true
      });
      return;
    }
    if (c.holder === null) { c.still = p.still === true; c.packed = p.packed === true; }
  }

  /* ---------------------------------------------------------------- the page and the scene */

  #watchSize() {
    const fit = () => {
      if (!this.backend || !this.root) return;
      this.backend.resize(this.root.clientWidth, this.root.clientHeight, window.devicePixelRatio);
    };
    this.resizeObserver = new ResizeObserver(fit);
    this.resizeObserver.observe(this.root);
    fit();
  }

  #watchSettings() {
    this.hooks.push(["stagecraft.settingsChanged", Hooks.on("stagecraft.settingsChanged", (which) => {
      if (which === "calm") this.backend?.setCalm(isCalm());
      if (which === "zones") this.backend?.setZoneSetting(zoneSetting());
      if (which === "tier") ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.TierNextScene"));
    })]);
  }

  /** The GM changes the chalk rules or the wall's visibility live, in the scene's own flags; every screen follows. */
  #watchScene() {
    // a user who leaves lets go of their cards on every other screen without waiting for the silence to run out
    this.hooks.push(["userConnected", Hooks.on("userConnected", (user, connected) => { if (!connected) this.sync?.userGone(user.id); })]);
    this.hooks.push(["updateScene", Hooks.on("updateScene", (scene) => {
      if (scene.id !== this.scene.id) return;
      this.chalk?.refresh();
      this.bar?.refresh();
      this.blocking?.refresh();
      this.#syncCast();
      // hands off: a player who is carrying a card puts it down now
      if (handsOff(this.scene) && !game.user.isGM && this.dragging) {
        this.sync.release(this.dragging.id);
        this.dragging = null;
      }
    })]);
  }

  #lost() {
    console.warn(`${NS} | the graphics context was lost; the stage will be rebuilt`);
    if (++this.losses >= 2) this.threeFailed = true;           // twice is a graphics card that cannot be trusted: the plain stage draws from now on
    this.rebuild().catch((err) => { console.error(`${NS} | the stage could not be rebuilt`, err); this.onFatal?.(err); });
  }

  /** Throw the backend away and build it again from the data, which is all the state a picture has. */
  async rebuild() {
    if (!this.running || this.rebuilding) return;
    this.rebuilding = true;
    try { await this.#rebuild(); } finally { this.rebuilding = false; }
  }

  async #rebuild() {
    for (const [target, type, fn, opts] of this.listeners) target.removeEventListener(type, fn, opts);
    this.listeners = [];
    this.backend.dispose();
    await this.#buildBackend();
    if (!this.running || !this.backend) return;          // the scene was torn down while the new picture was loading
    this.chalk?.reset();                    // the new wall is empty; draw it all again from the store
    this.chalk?.sync();
    this.chalk?.refresh();
    this.#watchPointer();
  }
}
