/**
 * The box of chalk, at a table (chalk.md). It joins four things: the rules (core/chalk.mjs: where chalk may be used),
 * the memory (chalk-store.mjs: strokes kept in the world), the picture (the backend's wall, box and cursor) and the
 * pointer. A player takes a stick from the box, draws on the painting, and puts it back; the GM can open, close, lock
 * and wipe the wall.
 *
 * A stroke shows the moment it is drawn and is saved a moment later. Until the save lands it is `pending`, and a
 * rubbed stroke is `rubbed` until its removal lands, so another person's chalk arriving in between never makes your
 * own line flicker out and back.
 */

import { NS } from "./scene-data.mjs";
import { LIMITS, effectivePolicy, allowedAt, boxVisible, clipPath, makeStroke, eraseAlong, strokeBounds, trimToCaps } from "../core/chalk.mjs";
import { pointInPolygon } from "../core/zones.mjs";

const SIZE = "medium";
const MIN_GAP = 0.0018;              // fractions of the painting between recorded points while drawing
const RUB_RADIUS = 0.018;

const newId = () => `${game.user.id.slice(0, 6)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export class ChalkController {
  constructor({ host, store }) {
    this.host = host;
    this.store = store;
    this.sceneId = host.scene.id;
    this.known = new Map();          // stroke id -> stroke, what the wall is showing
    this.pending = new Map();        // drawn here, not yet saved
    this.rubbed = new Set();         // rubbed out here, not yet removed from the store
    this.inHand = null;              // a colour name, or "rub"
    this.drawing = null;             // { points }
    this.unsubscribe = store.onChange((sceneId) => {
      if (sceneId === null) { this.refresh(); this.sync(); }       // the journal itself arrived or changed
      else if (sceneId === this.sceneId) this.sync();
    });
  }

  stop() {
    this.unsubscribe?.();
    this.putAway();
  }

  /** The backend was rebuilt and its wall is empty: forget what it was showing so that sync() draws it all again. */
  reset() {
    this.known = new Map();
    this.putAway();
  }

  /* ---------------------------------------------------------------- the rules */

  /** The scene's authored policy with the GM's live override laid over it. */
  policy() {
    const live = this.host.scene.flags?.[NS]?.live?.chalk ?? null;
    return effectivePolicy(this.host.description.chalk, live);
  }

  /** Show or hide the box and the wall to match the rules; put the chalk away if it may no longer be used. */
  refresh() {
    const policy = this.policy();
    const usable = this.store.ready && boxVisible(policy, this.host.description.zones);
    this.host.backend.setChalkBox(usable);
    if (!usable || policy.locked) this.putAway();
    this.host.backend.setChalkHidden(this.host.scene.flags?.[NS]?.live?.chalkHidden === true);
    return policy;
  }

  /* ---------------------------------------------------------------- the wall */

  /** Make the wall show what the store holds: add what is new, take away what is gone. */
  sync() {
    const now = new Map();
    for (const s of this.store.strokes(this.sceneId)) if (!this.rubbed.has(s.id)) now.set(s.id, s);
    for (const [id, s] of this.pending) now.set(id, s);
    const gone = [...this.known.keys()].filter((id) => !now.has(id));
    if (gone.length) this.host.backend.removeChalkStrokes(gone);
    for (const [id, s] of now) if (!this.known.has(id)) this.host.backend.addChalkStroke(s);
    this.known = now;
  }

  /* ---------------------------------------------------------------- the hand */

  get usable() {
    return this.store.ready && boxVisible(this.policy(), this.host.description.zones);
  }

  take(tool) {
    if (!this.usable) return;
    if (this.inHand === tool) { this.putAway(); return; }
    this.inHand = tool;
    this.host.root.classList.add("stagecraft-chalk");
  }

  putAway() {
    this.inHand = null;
    this.drawing = null;
    this.cursorZone = null;
    this.blocked = false;
    this.host?.root?.classList.remove("stagecraft-chalk");
    this.host?.backend?.setChalkCursor(null);
    this.host?.backend?.setChalkPreview(null);
    this.#hint(null);
  }

  /** The pointer moved with chalk in hand (viewport px). */
  hover(p) {
    if (!this.inHand) return;
    if (!p) { this.host.backend.setChalkCursor(null); this.#hint(null); return; }
    const at = this.host.backend.paintingAt(p.x, p.y);
    // where the chalk would take: the stick shows it, and in a "zones only" scene the zone under it lights up
    this.cursorZone = at ? (this.chalkZones().find((z) => pointInPolygon(z.shape, at.x, at.y))?.id ?? null) : null;
    this.blocked = this.inHand !== "rub" && !(at && allowedAt(this.policy(), this.host.description.zones, at.x, at.y));
    this.host.backend.setChalkCursor(p, this.inHand, !!this.drawing, this.blocked);
    this.#hint(this.blocked ? p : null);
    if (this.drawing) this.#extend(p);
  }

  /** The chalk zones of the scene, when the rules say chalk goes only on them (else none: it goes anywhere, or nowhere). */
  chalkZones() {
    return this.policy().mode === "zones" ? this.host.description.zones.filter((z) => z.kind === "chalk") : [];
  }

  /** A small line by the pointer, while the chalk would leave no mark there: where it does go. */
  #hint(p) {
    const root = this.host?.root;
    if (typeof root?.querySelector !== "function" || typeof document === "undefined") return;
    let el = root.querySelector(".stagecraft-chalk-hint");
    if (!p) { if (el) el.hidden = true; return; }
    if (!el) { el = document.createElement("div"); el.className = "stagecraft-chalk-hint"; root.append(el); }
    const names = this.chalkZones().map((z) => z.name).filter(Boolean);
    el.textContent = names.length
      ? game.i18n.format("STAGECRAFT.Chalk.OnlyOn", { where: names.join(", ") })
      : game.i18n.localize("STAGECRAFT.Chalk.NotHere");
    el.style.left = `${Math.round(p.x + 22)}px`;
    el.style.top = `${Math.round(p.y + 18)}px`;
    el.hidden = false;
  }

  begin(p) {
    if (!this.inHand) return false;
    const at = this.host.backend.paintingAt(p.x, p.y);
    if (!at) return false;
    this.drawing = { points: [[at.x, at.y]] };
    this.#preview();
    return true;
  }

  #extend(p) {
    const at = this.host.backend.paintingAt(p.x, p.y);
    if (!at) return;
    const last = this.drawing.points[this.drawing.points.length - 1];
    if (Math.hypot(at.x - last[0], at.y - last[1]) < MIN_GAP) return;
    this.drawing.points.push([at.x, at.y]);
    this.#preview();
  }

  #preview() {
    if (this.inHand === "rub") return;
    const runs = clipPath(this.drawing.points, this.policy(), this.host.description.zones);
    this.host.backend.setChalkPreview(runs.flat(), this.inHand, SIZE);
  }

  /** The pointer came up: the line becomes strokes (or the rubbing takes effect). */
  async end() {
    const drawing = this.drawing;
    this.drawing = null;
    this.host.backend.setChalkPreview(null);
    if (!drawing || !this.store.ready) return;
    if (this.inHand === "rub") return this.#rub(drawing.points);
    const made = [];
    for (const run of clipPath(drawing.points, this.policy(), this.host.description.zones)) {
      const r = makeStroke({ id: newId(), scene: this.sceneId, by: game.user.id, at: Date.now(), colour: this.inHand, size: SIZE, points: run });
      if (r.ok) made.push(r.stroke);
    }
    for (const stroke of made) {
      this.pending.set(stroke.id, stroke);
      this.known.set(stroke.id, stroke);
      this.host.backend.addChalkStroke(stroke);          // seen at once; the store catches up
      Hooks.callAll("stagecraft.chalk", { type: "chalk", stroke, bounds: strokeBounds(stroke), by: game.user.id });
    }
    for (const stroke of made) {
      try { await this.store.append(this.sceneId, stroke); }
      catch (err) { console.warn(`${NS} | could not keep a chalk stroke`, err); }
      finally { this.pending.delete(stroke.id); }
    }
    this.sync();
    await this.#trim();
  }

  async #rub(path) {
    const mine = (s) => game.user.isGM || s.by === game.user.id;
    const { removed, added } = eraseAlong([...this.known.values()], path, RUB_RADIUS, mine);
    if (!removed.length) return;
    for (const id of removed) { this.rubbed.add(id); this.pending.delete(id); this.known.delete(id); }
    this.host.backend.removeChalkStrokes(removed);
    for (const s of added) { this.pending.set(s.id, s); this.known.set(s.id, s); this.host.backend.addChalkStroke(s); }
    try {
      await this.store.remove(this.sceneId, removed);
      for (const s of added) await this.store.append(this.sceneId, s);
    } catch (err) {
      console.warn(`${NS} | could not rub out chalk`, err);
    } finally {
      for (const id of removed) this.rubbed.delete(id);
      for (const s of added) this.pending.delete(s.id);
      this.sync();
    }
  }

  /** A full wall forgets its oldest strokes (chalk.md §4.3), so a long campaign never grows it without bound. */
  async #trim() {
    const { overflow } = trimToCaps([...this.known.values()], LIMITS.strokesPerScene);
    if (!overflow.length) return;
    const ids = overflow.map((s) => s.id);
    for (const id of ids) this.rubbed.add(id);
    try { await this.store.remove(this.sceneId, ids); }
    catch (err) { console.warn(`${NS} | could not trim the chalk wall`, err); }
    finally { for (const id of ids) this.rubbed.delete(id); this.sync(); }
  }

  /** May chalk be used at this point? (for the cursor to show a stop sign, later) */
  allowedAt(at) {
    return allowedAt(this.policy(), this.host.description.zones, at.x, at.y);
  }
}
