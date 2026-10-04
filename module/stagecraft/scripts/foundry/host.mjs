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
import { chosenTier, tierSetting, isCalm, zoneSetting, powerSave, foundryCap } from "./settings.mjs";
import { ChalkController } from "./chalk.mjs";
import { ChalkKit } from "./chalk-kit.mjs";
import { HealthMeter, HealthBoard } from "./health.mjs";
import { SpeedTest } from "./speed.mjs";
import { Pace, poseOf, moved } from "../core/pace.mjs";
import { titleKey } from "../core/titleblock.mjs";
import { HoverTip } from "./hover-tip.mjs";
import { StageEditor, editorMemory } from "./stage-editor.mjs";
import { StageBar } from "./bar.mjs";
import { BlockingBar } from "./blocking-bar.mjs";
import { sharedNow, serially, lifeOn, boardOn, speakerOf, setSpeaker, turnOf, setDown, coverShapes, coverOnPage } from "./blocking.mjs";
import { boxSpot, boxClear, DEFAULT_BOX } from "../core/chalk.mjs";

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
    this.speed = null;                     // the start-up speed test (speed.mjs)
    this.health = null;                    // how this screen is coping, and tells the GM (health.mjs)
    this.healthBoard = null;               // the GM's board of everyone's
    this.tip = null;                       // a card's full words, on hover (hover-tip.mjs)
    this.pace = new Pace({ cap: foundryCap(), easing: powerSave() });   // how often to draw (core/pace.mjs)
    this.pose = null;                      // every card's pose at the last frame drawn, to see whether anything moved
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
    this.described = JSON.stringify(this.scene.flags?.[NS]?.stage ?? null);
    this.people = readCast(this.scene);
    // walks, routines and entrances run on the time every screen shares, so they agree everywhere
    // what the screen's own furniture covers (another module's deck along the bottom), so formations keep faces clear of it
    const cover = () => (this.root && this.backend?.view ? coverOnPage(coverShapes(), this.root.getBoundingClientRect(), this.backend.view) : []);
    this.stage = new Stage(description, this.people, { card: this.skins.get(description.skin).size, clock: sharedNow, cover });
    this.stage.setLife(lifeOn(this.scene));
    this.stage.setBoard(boardOn(this.scene));
    this.stage.setSpeaker(speakerOf(this.scene));
    this.stage.setTurn(turnOf(this.scene));
    this.stage.setCalm(isCalm());
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
    // one channel for all three: cards in hand (core/sync.mjs), strokes of chalk being painted (chalk.mjs) and how each
    // screen is coping (health.mjs)
    this.channel = openChannel((message, sender) => {
      if (message?.type === "chalk") this.chalk?.receive(message, sender);
      else if (message?.type === "health") { this.health?.receive(message); this.healthBoard?.receive(message, sender); }
      else this.sync.receive(message, sender);
    });

    this.root = document.createElement("div");
    this.root.id = "stagecraft-stage";
    this.root.dataset.scene = this.scene.id;
    this.anchor.after(this.root);

    // built before the picture, so it can see how fast the display refreshes while nothing of ours is drawing yet
    this.speed = new SpeedTest(this);
    await this.#buildBackend();
    if (this.services.chalkStore) {
      this.chalk = new ChalkController({ host: this, store: this.services.chalkStore, send: (message) => this.channel?.send(message) });
      this.kit = new ChalkKit(this, this.chalk);
      this.chalk.sync();
      this.chalk.refresh();
      this.#placeBox();
    }
    if (game.user.isGM) { this.bar = new StageBar(this); this.blocking = new BlockingBar(this); this.healthBoard = new HealthBoard(this); this.editor = new StageEditor(this); if (editorMemory.on) this.editor.toggle(true); this.#gmToggle(); }
    this.#boardKey();
    this.health = new HealthMeter(this);        // how this screen is coping, told to the GM's board
    this.tip = new HoverTip(this);              // a card's full words, when the pointer rests on one that has more than its plate shows

    this.#watchSize();
    this.#watchPointer();
    this.#watchSettings();
    this.#watchScene();
    this.running = true;
    this.last = performance.now();
    this.pace.poke(this.last);              // a stage is at full rate for its first moments: it is new
    this.raf = requestAnimationFrame(this.#frame);
    this.speed.start();
    // whatever the scene was given while the picture was being built is taken up now; it would otherwise wait for the
    // scene's next change (found live 2026-10-03: a deploy's new layout, written as the GM's page loaded, landed while the
    // painting was loading, and the stage went on showing everyone where they had been). Once this draw has finished.
    setTimeout(() => { if (this.running) this.#sceneChanged(); }, 0);
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
    this.kit?.dispose();
    this.chalk?.wall?.clear();
    this.speed?.stop();
    this.health?.stop();
    this.healthBoard?.dispose();
    this.editor?.dispose();
    this.tip?.dispose();
    this.bar?.dispose();
    this.blocking?.dispose();
    this.backend?.dispose();
    this.root?.remove();
    this.chalk = this.kit = this.speed = this.health = this.healthBoard = this.tip = this.bar = this.blocking = this.editor = this.backend = this.root = null;
  }

  /* ---------------------------------------------------------------- the loop */

  /**
   * One frame. A frame that throws is reported and skipped; the next one is tried, because one bad frame (a half-built
   * card during a rebuild, say) must not end the show. A stage that has failed for ten seconds running is given up on
   * and Foundry's own canvas is handed back.
   */
  #frame = (now) => {
    if (!this.running) return;
    // the pace (core/pace.mjs): Foundry's own frame-rate cap, and half that while nothing moves; a frame the browser offers
    // before one is due is let go, and the engine simply takes a longer step at the next
    if (!this.pace.due(now)) { this.raf = requestAnimationFrame(this.#frame); return; }
    const alive = this.guard.run(() => {
      const dt = (now - this.last) / 1000;
      this.last = now;
      this.sync.tick();
      this.stage.advance(dt);
      const snap = this.stage.snapshot({ viewer: this.userId, selected: this.selected });
      this.#notice(snap, now);
      // chalk in hand in a "zones only" scene: the zones it may go on are lit and named, the one under the stick brightest
      if (this.chalk?.inHand) for (const z of this.chalk.chalkZones()) snap.zones[z.id] = this.chalk.cursorZone === z.id ? "target" : "near";
      // paint made since the last frame is laid together once, now, so it is on the screen in this frame
      this.chalk?.wall?.flush?.();
      this.health?.frame(now, this.pace.scale(now));
      this.backend.draw(snap);
      this.speed?.feed(now);                 // the start-up speed test times the pictures that are delivered (only a running test listens)
      this.frames++;
      // what covers the stage can change without the window changing (the deck folded away): the box keeps clear of it
      if (this.frames % 60 === 0) this.#placeBox();
      for (const e of this.stage.drain()) {
        if (e.type === "visit") this.#visitCaption(e);
        Hooks.callAll(`stagecraft.${e.type}`, e, this);
      }
    });
    this.pace.drew(now);
    if (alive) this.raf = requestAnimationFrame(this.#frame);
  };

  /**
   * Is anything moving or being touched? Then the stage is at full rate for a moment (core/pace.mjs): a card walking, held,
   * leaning or arriving, a bang, someone painting (here or seen live), a formation waiting for its place, the speed test.
   */
  #notice(snap, now) {
    const pose = poseOf(snap.cards);
    if (moved(this.pose, pose)) this.pace.poke(now);
    this.pose = pose;
    if (snap.bonks?.length || this.dragging || this.chalk?.drawing || this.chalk?.wall?.strokes?.size || this.speed?.probe || this.blocking?.armed) this.pace.poke(now);
  }

  /**
   * A card put down at a door or at something to look at: for a few seconds a line over the place says who went where
   * and what it is for ("Etsuko · The grill / Look closer"), on every screen, so moving a card there is a way to act.
   */
  #visitCaption(e) {
    const zone = this.description.zones.find((z) => z.id === e.zone);
    const c = this.stage.cards.get(e.card);
    if (!zone || !c || !this.root || !this.backend?.project) return;
    const area = zone.floor ?? zone.shape;
    const fx = area.reduce((s, p) => s + p[0], 0) / area.length;
    const fy = Math.max(...area.map((p) => p[1]));
    const at = this.stage.rig.standing([fx, fy]) ?? { X: c.puppet.restX, Z: c.restZ };
    const p = this.backend.project({ X: at.X, Y: c.h * c.grow * 1.12, Z: at.Z });
    if (!p || !Number.isFinite(p.x)) return;
    const el = document.createElement("div");
    el.className = "stagecraft-visit";
    const who = document.createElement("b");
    who.textContent = game.i18n.format("STAGECRAFT.Visit.At", { name: c.person.name ?? c.id, zone: zone.name || zone.id });
    el.append(who);
    if (zone.hint) { const hint = document.createElement("span"); hint.textContent = zone.hint; el.append(hint); }
    el.style.left = `${Math.round(p.x)}px`;
    el.style.top = `${Math.round(p.y)}px`;
    this.root.append(el);
    setTimeout(() => el.remove(), 4200);
  }

  /* ---------------------------------------------------------------- pointer */

  #on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.listeners.push([target, type, fn, opts]);
  }

  #local(e) {
    const r = this.root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /**
   * A pointer event as chalk wants it: where (stage px), how hard (a pen's pressure), what kind of pointer, when, the keys
   * held, and whether a pen is being used by its eraser end (`flip`).
   */
  #sample(e, r = this.root.getBoundingClientRect()) {
    const flip = e.pointerType === "pen" && (e.button === 5 || (e.buttons & 32) !== 0);
    return { x: e.clientX - r.left, y: e.clientY - r.top, pressure: e.pressure, pointerType: e.pointerType, t: e.timeStamp, shift: e.shiftKey, alt: e.altKey, flip };
  }

  #watchPointer() {
    const canvas = this.backend.canvas;
    this.#on(canvas, "pointerdown", (e) => {
      this.pace.poke(performance.now());
      this.tip?.hide();
      if (e.button === 2 && this.chalk?.inHand) { this.chalk.putAway(); return; }
      if (e.button === 2 && this.blocking?.disarm()) return;
      // a pen's eraser end (button 5) rubs out while chalk is in hand
      if (e.button !== 0 && !(e.button === 5 && e.pointerType === "pen" && this.chalk?.inHand)) return;
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
        // Ctrl-click knocks someone down (or stands them back up): a defeated foe, a character at 0 HP
        if ((e.ctrlKey || e.metaKey) && hit?.kind === "card") {
          const c = this.stage.cards.get(hit.id);
          setDown(this.scene, hit.id, !c?.downTo).catch((err) => console.warn(`${NS} | could not knock down ${hit.id}`, err));
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
      // the box of chalk: take a stick, the magic stick or the eraser, or put it back
      if (hit?.kind === "chalk" || hit?.kind === "magic" || hit?.kind === "eraser") {
        this.chalk?.take(hit.kind === "eraser" ? "rub" : hit.kind === "magic" ? "magic" : hit.colour);
        this.chalk?.hover(p);
        e.preventDefault();
        return;
      }
      // chalk in hand: paint, wherever the pointer is (or, with the kit's dropper or Alt, take a colour)
      if (this.chalk?.inHand) {
        e.preventDefault();
        const sample = this.#sample(e);
        if (this.kit?.takesPick()) { this.chalk.pickColour(sample); return; }
        if (this.chalk.begin(sample)) { canvas.setPointerCapture(e.pointerId); this.chalk.hover(p); }
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
      if (this.dragging || this.chalk?.inHand || e.buttons) this.pace.poke(performance.now());        // hovering alone needs no more than the easy rate
      if (this.chalk?.drawing) {
        // every sample the browser gathered since the last event, for the smoothest line a hand can make
        const r = this.root.getBoundingClientRect();
        const all = e.getCoalescedEvents?.() ?? [];
        for (const ev of all.length ? all : [e]) this.chalk.extend(this.#sample(ev, r));
      }
      if (this.chalk?.inHand) { this.tip?.hide(); this.chalk.hover(p); canvas.style.cursor = "none"; return; }
      if (!this.dragging) {
        const h = this.backend.pick(p.x, p.y);
        canvas.style.cursor = h ? "grab" : "default";
        if (h?.kind === "card" || !this.chalk) this.tip?.hover(h?.kind === "card" ? h.id : null, e.clientX, e.clientY);
        else this.tip?.hoverWall(p, e.clientX, e.clientY);          // the GM over chalk: who painted it
        return;
      }
      this.tip?.hide();
      const at = this.backend.floorAt(p.x, p.y, this.dragging.height);
      if (at) this.sync.move(this.dragging.id, at.x - this.dragging.offX, at.z - this.dragging.offZ);
    });
    const release = (e) => {
      this.pace.poke(performance.now());
      if (this.chalk?.drawing) {
        if (e.type === "pointercancel") this.chalk.cancel();
        else this.chalk.end().catch((err) => console.warn(`${NS} | chalk stroke failed`, err));
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
    // the ring round the pointer goes when the pointer leaves the stage
    this.#on(canvas, "pointerleave", () => { this.tip?.hide(); if (this.chalk?.inHand && !this.chalk.drawing) this.chalk.hover(null); });
    // Escape throws away a stroke being painted, or puts the chalk back in the box. It is taken before Foundry sees it
    // (capture phase), or the same press would also open Foundry's game menu over the stage.
    this.#on(window, "keydown", (e) => {
      if (e.code !== "Escape") return;
      if (this.chalk?.drawing) this.chalk.cancel();
      else if (this.chalk?.inHand) this.chalk.putAway();
      else if (this.healthBoard?.close()) { /* the table's list is put away */ }
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
    this.pace.poke(performance.now());
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
    this.stage.setTurn(turnOf(this.scene));
  }

  /**
   * The GM's strips fold away behind one small key at the top of the stage, folded by default, so they never sit over a
   * wall someone wants to draw on or a face (found 2026-10-03: Kit Issue's back wall lay under them, and a stroke there
   * never reached the stage). They also step aside entirely while chalk is in hand (styles/stagecraft.css). The choice is
   * remembered on this machine.
   */
  #gmToggle() {
    const KEY = "stagecraft.gmOpen";
    let open = false;
    try { open = globalThis.localStorage?.getItem(KEY) === "1"; } catch { /* a private window: start folded */ }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stagecraft-gm-toggle";
    const show = () => {
      this.root?.classList.toggle("stagecraft-gm-open", open);
      button.textContent = game.i18n.localize(open ? "STAGECRAFT.Gm.Hide" : "STAGECRAFT.Gm.Show");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    };
    button.addEventListener("click", () => {
      open = !open;
      try { globalThis.localStorage?.setItem(KEY, open ? "1" : "0"); } catch { /* not kept: fine */ }
      show();
    });
    this.root.append(button);
    show();
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
    // a routine that changed (a deploy, or someone it talks to was revealed) is taken up afresh; a card given a new home
    // (the scene laid out again) goes about its business round the new one
    const rehomed = JSON.stringify(p.home ?? null) !== JSON.stringify(c.person.home ?? null);
    if (rehomed || JSON.stringify(p.life ?? null) !== JSON.stringify(c.person.life ?? null)) this.stage.setRoutine(p.id, p.life, rehomed && Array.isArray(p.home) ? p.home : null);
    this.stage.setDown(p.id, p.down === true);
    const reworded = titleKey(p) !== titleKey(c.person);
    c.person = { ...c.person, ...p, portrait: c.person.portrait };   // who may hold it, its name; the portrait stays as built
    // its words changed (a name was learned, a line of text edited): the face is drawn again, as it would be at the first
    if (reworded) this.backend?.refreshCard?.({ ...c.person })?.catch((err) => console.warn(`${NS} | could not redraw ${p.id}`, err));
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

  /**
   * Stand the box of chalk where the scene put it, or, if the screen's furniture covers it there (the adventure's deck,
   * Foundry's macro bar), at the nearest place on the floor where nothing does and, if it can, in front of nobody's card
   * (core/chalk.mjs `boxSpot`). It moves only when it must, so it never hops about as people walk, and goes home as soon as
   * its own place is clear again.
   */
  #placeBox() {
    const backend = this.backend;
    if (!this.chalk || !this.root || !backend?.setChalkBoxAt || !backend.view || !this.stage?.rig) return;
    const rig = this.stage.rig;
    const rect = this.root.getBoundingClientRect();
    const view = backend.view;
    const cover = coverOnPage([...coverShapes(), ...this.#foundryBars()], rect, view);
    const screen = { x0: view.ox, y0: view.oy, x1: view.ox + view.visW, y1: view.oy + view.visH };
    const home = this.description.chalk?.box ?? DEFAULT_BOX;
    let spot;
    if (boxClear(rig, home, cover, screen)) spot = [home[0], home[1]];
    else if (this.boxAt && boxClear(rig, this.boxAt, cover, screen)) spot = this.boxAt;
    else spot = boxSpot(rig, home, cover, screen, this.stage.cardShapes());
    if (this.boxAt && spot[0] === this.boxAt[0] && spot[1] === this.boxAt[1]) return;
    this.boxAt = spot;
    backend.setChalkBoxAt(spot);
  }

  /** Foundry's own bars that float over the bottom of the stage: the box of chalk keeps clear of them. */
  #foundryBars() {
    const out = [];
    for (const id of ["hotbar"]) {
      const el = document.getElementById(id);
      const r = el?.getBoundingClientRect?.();
      if (r && r.width > 0 && r.height > 0) out.push({ rect: [r.left, r.top, r.right, r.bottom] });
    }
    return out;
  }

  #watchSize() {
    const fit = () => {
      if (!this.backend || !this.root) return;
      this.backend.resize(this.root.clientWidth, this.root.clientHeight, window.devicePixelRatio);
      this.#placeBox();
    };
    this.resizeObserver = new ResizeObserver(fit);
    this.resizeObserver.observe(this.root);
    fit();
  }

  #watchSettings() {
    this.hooks.push(["stagecraft.settingsChanged", Hooks.on("stagecraft.settingsChanged", (which) => {
      if (which === "calm") { this.backend?.setCalm(isCalm()); this.stage?.setCalm(isCalm()); }
      if (which === "power") this.pace.easing = powerSave();
      if (which === "zones") this.backend?.setZoneSetting(zoneSetting());
      if (which === "tier") ui.notifications?.info(game.i18n.localize("STAGECRAFT.Notify.TierNextScene"));
    })]);
  }

  /** The GM changes the chalk rules or the wall's visibility live, in the scene's own flags; every screen follows. */
  #watchScene() {
    // a user who leaves lets go of their cards on every other screen without waiting for the silence to run out
    this.hooks.push(["userConnected", Hooks.on("userConnected", (user, connected) => { if (!connected) this.sync?.userGone(user.id); })]);
    this.hooks.push(["updateScene", Hooks.on("updateScene", (scene) => {
      if (scene.id === this.scene.id) this.#sceneChanged();
    })]);
  }

  /** The scene as it is now: its description, its cast, its live switches. */
  #sceneChanged() {
    if (!this.running && !this.root) return;
    this.pace.poke(performance.now());                // the scene changed under the stage: something is about to move
    // the scene's description itself changed (a deploy: bigger cards, a new zone): the stage is drawn again from it
    const described = JSON.stringify(this.scene.flags?.[NS]?.stage ?? null);
    if (described !== this.described) {
      this.described = described;
      if (globalThis.canvas?.scene?.id === this.scene.id) globalThis.canvas.draw();
      return;
    }
    this.chalk?.refresh();
    this.bar?.refresh();
    this.blocking?.refresh();
    this.editor?.refresh();
    this.#syncCast();
    // hands off: a player who is carrying a card puts it down now
    if (handsOff(this.scene) && !game.user.isGM && this.dragging) {
      this.sync.release(this.dragging.id);
      this.dragging = null;
    }
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
    this.boxAt = null;                      // the new picture's box stands where the scene put it until it is placed again
    this.#placeBox();
    this.#watchPointer();
    this.pace.poke(performance.now());
    this.health?.changed();                 // the new picture (a lighter one, a recovered one) is news for the GM's board
    this.speed?.start();                    // and, if this computer is still to be tested, the test begins again
  }
}
