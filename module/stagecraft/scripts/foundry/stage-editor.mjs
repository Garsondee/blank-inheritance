/**
 * Staging by hand, on the stage itself (stage.md, module.md §35). With "Edit stage" pressed, the GM sees every mark, every
 * corner of every zone and the middle of each zone as a handle drawn over the painting, and drags them:
 *
 *   a mark (a ring)         moves where people stand at it
 *   a corner (a square)     reshapes the zone; double-click a corner to take it away
 *   a zone's middle (a dot) moves the whole zone; double-click an edge's middle (a small diamond) to add a corner
 *
 * The handles are plain elements over the stage, so they work the same over the 3D picture and the plain one, and nobody but
 * a GM ever has them. While a handle is dragged the zone's outline is drawn live in the overlay; on letting go the change is
 * written once (`editStage`), which every screen then sees. Real pointer events only: the handle takes the pointer, so the
 * stage underneath never sees the drag.
 */

import { handlesOf, centroid } from "../core/staging.mjs";
import { describeScene } from "../core/scene.mjs";
import { editStage } from "./blocking.mjs";
import { NS } from "./scene-data.mjs";

const SVG = "http://www.w3.org/2000/svg";
const t = (key) => game.i18n.localize(`STAGECRAFT.Editor.${key}`);

/**
 * Whether the handles are on, kept across the stage being drawn again: every drop is written into the scene's description, and
 * a changed description draws the stage afresh (host.mjs), which must not switch the GM's editing off under their hand.
 */
export const editorMemory = { on: false };

export class StageEditor {
  constructor(host) {
    this.host = host;
    this.on = false;
    this.el = null;
    this.drag = null;
    this.frame = 0;
  }

  /** Switch the handles on or off. Returns whether they are on. */
  toggle(on = !this.on) {
    this.on = !!on && !!this.host.backend?.rig;
    editorMemory.on = this.on;
    if (this.on) this.#build(); else this.#teardown();
    return this.on;
  }

  /** The scene changed (a drop was written, or someone else edited): draw the handles where things now are. */
  refresh() { if (this.on && !this.drag) this.#draw(); }

  dispose() { this.#teardown(); }

  /* ---------------------------------------------------------------- the overlay */

  #build() {
    if (this.el) return;
    this.el = document.createElement("div");
    this.el.className = "stagecraft-editor";
    this.el.innerHTML = `<svg class="outlines" aria-hidden="true"></svg><div class="handles"></div><div class="note" role="status"></div>`;
    this.el.querySelector(".note").textContent = t("Note");
    this.host.root.append(this.el);
    this.el.addEventListener("pointerdown", this.#down);
    this.el.addEventListener("dblclick", this.#double);
    this.#draw();
    const follow = () => { if (!this.on) return; this.#place(); this.frame = requestAnimationFrame(follow); };
    this.frame = requestAnimationFrame(follow);
  }

  #teardown() {
    cancelAnimationFrame(this.frame);
    this.el?.removeEventListener("pointerdown", this.#down);
    this.el?.removeEventListener("dblclick", this.#double);
    this.el?.remove();
    this.el = null;
    this.drag = null;
    this.on = false;
  }

  /** Where a point of the painting (fractions) is in the stage's own pixels. */
  #pageOf([fx, fy]) {
    const b = this.host.backend;
    return { x: (b.rig.map.x(fx) - b.view.ox) * b.view.s, y: (b.rig.map.y(fy) - b.view.oy) * b.view.s };
  }

  /** What is described now: marks and zones, with a live shape for the zone being dragged. */
  #items() {
    // read from the scene itself, not the host's copy of its description: after a drop the stage is drawn afresh a moment later
    const d = describeScene(this.host.scene.flags?.[NS]?.stage ?? {}).scene;
    return { marks: d.marks ?? [], zones: (d.zones ?? []).map((z) => (this.drag?.live?.id === z.id ? { ...z, shape: this.drag.live.shape } : z)) };
  }

  /** Make the handles for what is on the stage, then put them where they belong. */
  #draw() {
    if (!this.el) return;
    const handles = this.el.querySelector(".handles");
    handles.replaceChildren();
    const { marks, zones } = this.#items();
    for (const h of handlesOf({ marks, zones })) {
      const el = document.createElement("div");
      el.className = `handle ${h.kind}`;
      el.dataset.kind = h.kind;
      el.dataset.id = h.id;
      if (h.index !== undefined) el.dataset.index = String(h.index);
      el.title = h.kind === "mark" ? `${t("Mark")}: ${h.label}` : h.kind === "vertex" ? `${t("Corner")}: ${h.label}` : `${t("Zone")}: ${h.label}`;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", el.title);
      handles.append(el);
    }
    // the middle of each edge is where a corner can be added
    for (const z of zones) {
      (z.shape ?? []).forEach((p, i) => {
        const el = document.createElement("div");
        el.className = "handle edge";
        el.dataset.kind = "edge";
        el.dataset.id = z.id;
        el.dataset.index = String(i);
        el.title = t("EdgeTip");
        handles.append(el);
      });
    }
    this.#place();
  }

  /** Put every handle and outline where its point of the painting is now (the view may have moved). */
  #place() {
    if (!this.el || !this.host.backend?.rig) return;
    const { marks, zones } = this.#items();
    const byKey = new Map();
    for (const m of marks) byKey.set(`mark:${m.id}`, m.at);
    for (const z of zones) {
      z.shape.forEach((p, i) => byKey.set(`vertex:${z.id}:${i}`, p));
      byKey.set(`zone:${z.id}`, centroid(z.shape));
      z.shape.forEach((p, i) => { const q = z.shape[(i + 1) % z.shape.length]; byKey.set(`edge:${z.id}:${i}`, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); });
    }
    for (const el of this.el.querySelectorAll(".handle")) {
      const key = el.dataset.kind === "mark" || el.dataset.kind === "zone" ? `${el.dataset.kind}:${el.dataset.id}` : `${el.dataset.kind}:${el.dataset.id}:${el.dataset.index}`;
      const at = byKey.get(key);
      if (!at) { el.hidden = true; continue; }
      el.hidden = false;
      const p = this.#pageOf(at);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
    }
    const svg = this.el.querySelector(".outlines");
    svg.replaceChildren(...zones.map((z) => {
      const poly = document.createElementNS(SVG, "polygon");
      poly.setAttribute("points", z.shape.map((p) => { const q = this.#pageOf(p); return `${q.x},${q.y}`; }).join(" "));
      poly.setAttribute("class", `outline ${z.kind ?? ""}`);
      return poly;
    }));
  }

  /* ---------------------------------------------------------------- the hands */

  #down = (event) => {
    const el = event.target.closest?.(".handle");
    if (!el || event.button !== 0 || !this.host.backend) return;
    event.preventDefault();
    event.stopPropagation();
    const kind = el.dataset.kind;
    if (kind === "edge") return;                         // an edge is added by double-click, not dragged
    const id = el.dataset.id;
    const index = el.dataset.index === undefined ? null : Number(el.dataset.index);
    const raw = this.host.scene.flags?.[NS]?.stage ?? {};
    const zone = this.#items().zones.find((z) => z.id === id);
    this.drag = { kind, id, index, el, start: this.#fraction(event), shape: zone ? zone.shape.map((p) => [...p]) : null, floor: null, live: null, moved: false, raw };
    el.setPointerCapture?.(event.pointerId);
    el.classList.add("held");
    el.addEventListener("pointermove", this.#move);
    el.addEventListener("pointerup", this.#up);
    el.addEventListener("pointercancel", this.#cancel);
  };

  #fraction(event) {
    const r = this.host.root.getBoundingClientRect();
    const at = this.host.backend.paintingAt?.(event.clientX - r.left, event.clientY - r.top);
    return at ? [at.x, at.y] : null;
  }

  #move = (event) => {
    const d = this.drag;
    if (!d) return;
    const at = this.#fraction(event);
    if (!at) return;
    d.moved = true;
    d.at = at;
    if (d.kind === "mark") {
      d.el.style.left = `${this.#pageOf(at).x}px`;
      d.el.style.top = `${this.#pageOf(at).y}px`;
    } else if (d.kind === "vertex") {
      d.live = { id: d.id, shape: d.shape.map((p, i) => (i === d.index ? at : p)) };
      this.#place();
    } else if (d.kind === "zone" && d.start) {
      const dx = at[0] - d.start[0];
      const dy = at[1] - d.start[1];
      d.live = { id: d.id, shape: d.shape.map((p) => [Math.max(0, Math.min(1, p[0] + dx)), Math.max(0, Math.min(1, p[1] + dy))]) };
      d.delta = [dx, dy];
      this.#place();
    }
  };

  #up = (event) => {
    const d = this.drag;
    if (!d) return;
    this.#release(event);
    if (!d.moved || !d.at) return;                       // a click that went nowhere leaves the handles alone: a double-click needs them still there
    const edit = d.kind === "mark" ? { mark: { id: d.id, at: d.at } }
      : d.kind === "vertex" ? { vertex: { id: d.id, index: d.index, at: d.at } }
      : { zone: { id: d.id, dx: d.delta?.[0] ?? 0, dy: d.delta?.[1] ?? 0 } };
    editStage(this.host.scene, edit).catch((err) => console.warn(`${NS} | could not move that`, err)).finally(() => this.#draw());
  };

  #cancel = (event) => {
    this.#release(event);
    this.#draw();
  };

  #release(event) {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    d.el.classList.remove("held");
    d.el.releasePointerCapture?.(event.pointerId);
    d.el.removeEventListener("pointermove", this.#move);
    d.el.removeEventListener("pointerup", this.#up);
    d.el.removeEventListener("pointercancel", this.#cancel);
  }

  /** Double-click a corner to take it away, an edge's middle to add a corner there. */
  #double = (event) => {
    const el = event.target.closest?.(".handle");
    if (!el) return;
    const id = el.dataset.id;
    const index = Number(el.dataset.index);
    event.preventDefault();
    event.stopPropagation();
    const edit = el.dataset.kind === "vertex" ? { removeVertex: { id, index } } : el.dataset.kind === "edge" ? { addVertex: { id, after: index } } : null;
    if (edit) editStage(this.host.scene, edit).catch((err) => console.warn(`${NS} | could not change that zone`, err)).finally(() => this.#draw());
  };
}
