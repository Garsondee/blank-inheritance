/**
 * The chalk kit (chalk.md §2): the tools in a painter's hand while chalk is out. A small rail at the side of the stage,
 * which can be dragged anywhere: the tools, the colour (the box's colours, the last ones used, and any colour at all from
 * a picker), the size, steady hand, magic chalk's tricks, picking a colour off the wall, undo, redo, and putting the
 * chalk away. It also draws where the paint will go: a ring the true size of the tip round the pointer, so a painter
 * can see exactly what they are about to touch.
 *
 * It is the same for players and the GM, and it keeps each painter's choices on their own machine.
 */

import { TOOLS, TOOL_NAMES, STEADY, hexToHsv, hsvToHex, cleanHex } from "../core/brush.mjs";
import { PALETTE } from "../core/chalk.mjs";

const PLACE = "stagecraft.chalk.kit";
const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

/** Small drawn icons, so the kit needs nothing from outside the module. 24 x 24, drawn in the button's own colour. */
const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const ICONS = Object.freeze({
  chalk: svg('<path d="M6.5 17.5 16 8" stroke-width="4.2"/><circle cx="4.2" cy="20.2" r=".8" fill="currentColor" stroke="none"/><circle cx="3.2" cy="17.6" r=".6" fill="currentColor" stroke="none"/><circle cx="6.4" cy="21.4" r=".6" fill="currentColor" stroke="none"/>'),
  magic: svg('<path d="M4.5 19.5 14 10" stroke-width="2.6"/><path d="M17.5 2.8l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" fill="currentColor" stroke="none"/><circle cx="20" cy="12.5" r=".9" fill="currentColor" stroke="none"/><circle cx="11.5" cy="4.5" r=".8" fill="currentColor" stroke="none"/>'),
  pencil: svg('<path d="M4 20l1.4-4.6L15.6 5.2a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L8.6 18.6z"/><path d="M13.8 7l3.2 3.2M4 20l3.1-.9"/>'),
  brush: svg('<path d="M20.5 3.5 11.8 12.2"/><path d="M11 13l-1.6-1.6"/><path d="M9.4 11.4c-2.6-.4-4.6 1.6-4.6 4 0 1.3-.9 2.6-2.3 2.9 3 1.6 8 .6 8.6-3.6.2-1.4-.4-2.6-1.7-3.3z" fill="currentColor" fill-opacity=".3"/>'),
  spray: svg('<rect x="5.5" y="9" width="8" height="12" rx="2"/><path d="M8 9V6.5h3V9M9.5 6.5V4.5"/><circle cx="16.5" cy="5" r=".8" fill="currentColor" stroke="none"/><circle cx="19" cy="7.5" r=".8" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="20" cy="4" r=".7" fill="currentColor" stroke="none"/>'),
  smudge: svg('<path d="M3 16c2.6-3.4 4.4 1.6 7-1.6s4.4 1.6 7-1.6" stroke-width="2.4" opacity=".55"/><path d="M14 13.5V6a1.6 1.6 0 0 1 3.2 0v5"/><path d="M17.2 9.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.4"/>'),
  fill: svg('<path d="M4.5 11.5 11 5l6.6 6.6-6.5 6.5a1.6 1.6 0 0 1-2.2 0l-4.4-4.4a1.6 1.6 0 0 1 0-2.2z"/><path d="M4.6 12.2h12.6"/><path d="M20 14.5c.9 1.4 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-3z" fill="currentColor"/>'),
  eraser: svg('<path d="M8 20h12"/><path d="M5.2 15.6 13.6 7.2a1.8 1.8 0 0 1 2.5 0l3.3 3.3a1.8 1.8 0 0 1 0 2.5L12.5 20H9.6z"/><path d="M9.2 11.6l5.6 5.6"/>'),
  pick: svg('<path d="M14.5 4.5l5 5-2.2 2.2-5-5z" fill="currentColor" fill-opacity=".35"/><path d="M13.4 8.6 5.5 16.5 4 20l3.5-1.5 7.9-7.9"/>'),
  undo: svg('<path d="M9 6 4.5 10.5 9 15"/><path d="M4.5 10.5H15a5 5 0 0 1 0 10h-2"/>'),
  redo: svg('<path d="M15 6l4.5 4.5L15 15"/><path d="M19.5 10.5H9a5 5 0 0 0 0 10h2"/>'),
  steady: svg('<circle cx="6" cy="18" r="2.2" fill="currentColor" stroke="none"/><path d="M8 16 14.8 9.2" stroke-dasharray="1.6 2.2"/><circle cx="17" cy="7" r="3"/>'),
  rainbow: svg('<path d="M3 17a9 9 0 0 1 18 0" stroke="#e86a6a"/><path d="M6 17a6 6 0 0 1 12 0" stroke="#e8c96a"/><path d="M9 17a3 3 0 0 1 6 0" stroke="#7ac0e0"/>'),
  glow: svg('<circle cx="12" cy="12" r="3.5" fill="currentColor"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'),
  sparkle: svg('<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" fill="currentColor" fill-opacity=".35"/><path d="M19 16l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" fill="currentColor" stroke="none"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  grip: svg('<circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none"/>')
});

/** A size slider runs on a curve, so small sizes (where precision matters) get most of its length. */
export const sizeToSlider = (size, def) => Math.round(100 * Math.log(size / def.size.min) / Math.log(def.size.max / def.size.min));
export const sliderToSize = (v, def) => Math.round(def.size.min * (def.size.max / def.size.min) ** (v / 100) * 10) / 10;

export class ChalkKit {
  constructor(host, chalk) {
    this.host = host;
    this.chalk = chalk;
    this.open = null;                // which pop-out is showing: "colour", "size" or null
    this.alt = false;
    this.#build();
    this.offHand = chalk.onHand(() => this.refresh());
    this.offPointer = chalk.onPointer((p) => this.#cursor(p));
    this.refresh();
  }

  dispose() {
    this.offHand?.();
    this.offPointer?.();
    window.removeEventListener("keydown", this.#key, true);
    window.removeEventListener("keyup", this.#keyUp, true);
    this.el?.remove();
    this.ring?.remove();
    this.el = this.ring = null;
  }

  /* ---------------------------------------------------------------- building */

  #build() {
    const el = document.createElement("div");
    el.className = "stagecraft-kit";
    el.setAttribute("role", "toolbar");
    el.setAttribute("aria-label", t("STAGECRAFT.Kit.Label"));
    const tool = (name) => `<button type="button" class="kit-tool" data-tool="${name}" title="${t(`STAGECRAFT.Kit.Tool.${name}`)}">${ICONS[name]}</button>`;
    el.innerHTML = `
      <div class="kit-grip" title="${t("STAGECRAFT.Kit.Move")}">${ICONS.grip}</div>
      <div class="kit-group">${TOOL_NAMES.map(tool).join("")}</div>
      <div class="kit-group">
        <button type="button" class="kit-well" data-act="colour" title="${t("STAGECRAFT.Kit.Colour")}"><span></span></button>
        <button type="button" class="kit-size" data-act="size" title="${t("STAGECRAFT.Kit.Size")}"><span></span></button>
        <button type="button" data-act="steady" title="">${ICONS.steady}<b></b></button>
        <button type="button" data-act="pick" title="${t("STAGECRAFT.Kit.Pick")}">${ICONS.pick}</button>
      </div>
      <div class="kit-group kit-magic">
        <button type="button" data-magic="rainbow" title="${t("STAGECRAFT.Kit.Rainbow")}">${ICONS.rainbow}</button>
        <button type="button" data-magic="glow" title="${t("STAGECRAFT.Kit.Glow")}">${ICONS.glow}</button>
        <button type="button" data-magic="sparkle" title="${t("STAGECRAFT.Kit.Sparkle")}">${ICONS.sparkle}</button>
      </div>
      <div class="kit-group">
        <button type="button" data-act="undo" title="${t("STAGECRAFT.Kit.Undo")}">${ICONS.undo}</button>
        <button type="button" data-act="redo" title="${t("STAGECRAFT.Kit.Redo")}">${ICONS.redo}</button>
        <button type="button" data-act="close" title="${t("STAGECRAFT.Kit.Close")}">${ICONS.close}</button>
      </div>
      <div class="kit-pop kit-pop-colour" hidden>
        <canvas class="kit-sv" width="176" height="120"></canvas>
        <canvas class="kit-hue" width="176" height="14"></canvas>
        <div class="kit-row"><input class="kit-hex" type="text" maxlength="7" spellcheck="false" aria-label="${t("STAGECRAFT.Kit.Hex")}"><span class="kit-now"></span></div>
        <div class="kit-swatches"></div>
        <div class="kit-recent"></div>
      </div>
      <div class="kit-pop kit-pop-size" hidden>
        <input class="kit-range" type="range" min="0" max="100" step="1" aria-label="${t("STAGECRAFT.Kit.Size")}">
        <span class="kit-size-n"></span>
      </div>`;
    this.host.root.append(el);
    this.el = el;
    el.addEventListener("click", this.#click);
    el.addEventListener("wheel", this.#wheel, { passive: false });
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.#grip();
    this.#picker();
    const range = el.querySelector(".kit-range");
    range.addEventListener("input", () => this.chalk.setSize(sliderToSize(Number(range.value), TOOLS[this.chalk.tool])));
    const swatches = el.querySelector(".kit-swatches");
    swatches.innerHTML = Object.entries(PALETTE).map(([name, hex]) => `<button type="button" class="kit-swatch" data-colour="${hex}" title="${t(`STAGECRAFT.Kit.Colours.${name}`)}" style="--c:${hex}"></button>`).join("")
      + ["#1c1a17", "#e2483c", "#3f7fe0", "#8a4fd8"].map((hex) => `<button type="button" class="kit-swatch" data-colour="${hex}" style="--c:${hex}" title="${hex}"></button>`).join("");
    // the ring that shows where the paint goes
    this.ring = document.createElement("div");
    this.ring.className = "stagecraft-chalk-cursor";
    this.ring.hidden = true;
    this.ring.innerHTML = '<i class="ring"></i><i class="tick across"></i><i class="tick down"></i><i class="cross"></i><i class="dot"></i><i class="strike"></i>';
    this.host.root.append(this.ring);
    window.addEventListener("keydown", this.#key, true);
    window.addEventListener("keyup", this.#keyUp, true);
    this.#place(this.#loadPlace());
  }

  #loadPlace() {
    try { return JSON.parse(globalThis.localStorage?.getItem(PLACE) ?? "null"); } catch { return null; }
  }

  /**
   * Put the rail where it was left (or high on the left, over the painting and clear of the party's cards along the
   * bottom), always wholly on the screen; what it opens comes out on the side with more room.
   */
  #place(at) {
    const r = this.host.root.getBoundingClientRect();
    const w = this.el.offsetWidth || 86;
    const h = this.el.offsetHeight || 440;
    const x = Math.max(4, Math.min(r.width - w - 4, at?.x ?? 96));
    const y = Math.max(4, Math.min(r.height - h - 4, at?.y ?? Math.min(96, (r.height - h) * 0.4)));
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.classList.toggle("kit-right", x + w / 2 > r.width / 2);
    this.at = { x, y, set: at?.x !== undefined };
  }

  #grip() {
    const grip = this.el.querySelector(".kit-grip");
    let from = null;
    grip.addEventListener("pointerdown", (e) => {
      from = { x: e.clientX, y: e.clientY, at: { ...this.at } };
      grip.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    grip.addEventListener("pointermove", (e) => {
      if (!from) return;
      this.#place({ x: from.at.x + e.clientX - from.x, y: from.at.y + e.clientY - from.y });
    });
    const done = () => {
      if (!from) return;
      from = null;
      try { globalThis.localStorage?.setItem(PLACE, JSON.stringify(this.at)); } catch { /* nothing kept */ }
    };
    grip.addEventListener("pointerup", done);
    grip.addEventListener("pointercancel", done);
  }

  /* ---------------------------------------------------------------- the colour picker */

  /** The picker: a square of shade and brightness for the hue, a bar of hues, and the colour written out. */
  #picker() {
    const sv = this.el.querySelector(".kit-sv");
    const hue = this.el.querySelector(".kit-hue");
    const hex = this.el.querySelector(".kit-hex");
    // while a picker is dragged the colour changes as it goes; only where it is let go is remembered among the recent ones
    const drag = (canvas, fn) => {
      let on = false;
      const at = (e) => { const b = canvas.getBoundingClientRect(); fn(Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), Math.max(0, Math.min(1, (e.clientY - b.top) / b.height))); };
      canvas.addEventListener("pointerdown", (e) => { on = true; canvas.setPointerCapture(e.pointerId); at(e); e.preventDefault(); });
      canvas.addEventListener("pointermove", (e) => { if (on) at(e); });
      const done = () => { if (!on) return; on = false; this.chalk.setColour(this.chalk.colour); };
      canvas.addEventListener("pointerup", done);
      canvas.addEventListener("pointercancel", done);
    };
    drag(sv, (u, v) => { const h = this.hsv ?? hexToHsv(this.chalk.colour); this.hsv = { h: h.h, s: u, v: 1 - v }; this.chalk.setColour(hsvToHex(this.hsv), { remember: false }); });
    drag(hue, (u) => { const h = this.hsv ?? hexToHsv(this.chalk.colour); this.hsv = { h: u * 359.9, s: Math.max(0.15, h.s), v: Math.max(0.2, h.v) }; this.chalk.setColour(hsvToHex(this.hsv), { remember: false }); });
    hex.addEventListener("change", () => { const c = cleanHex(hex.value); if (c) { this.hsv = hexToHsv(c); this.chalk.setColour(c); } });
    hex.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") hex.blur(); });
  }

  #drawPicker() {
    const sv = this.el.querySelector(".kit-sv");
    const hsv = this.hsv ?? hexToHsv(this.chalk.colour);
    const hue = this.el.querySelector(".kit-hue");
    const hx = hue.getContext("2d");
    const bar = hx.createLinearGradient(0, 0, hue.width, 0);
    for (let i = 0; i <= 6; i++) bar.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
    hx.fillStyle = bar;
    hx.fillRect(0, 0, hue.width, hue.height);
    hx.lineWidth = 2;
    hx.strokeStyle = "#111";
    hx.strokeRect((hsv.h / 360) * hue.width - 2, 1, 4, hue.height - 2);
    hx.strokeStyle = "#fff";
    hx.lineWidth = 1;
    hx.strokeRect((hsv.h / 360) * hue.width - 2, 1, 4, hue.height - 2);
    const ctx = sv.getContext("2d");
    const { width: w, height: h } = sv;
    ctx.fillStyle = hsvToHex({ h: hsv.h, s: 1, v: 1 });
    ctx.fillRect(0, 0, w, h);
    const white = ctx.createLinearGradient(0, 0, w, 0);
    white.addColorStop(0, "#fff");
    white.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, w, h);
    const black = ctx.createLinearGradient(0, 0, 0, h);
    black.addColorStop(0, "rgba(0,0,0,0)");
    black.addColorStop(1, "#000");
    ctx.fillStyle = black;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hsv.v > 0.55 ? "#111" : "#fff";
    ctx.beginPath();
    ctx.arc(hsv.s * w, (1 - hsv.v) * h, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* ---------------------------------------------------------------- showing the hand */

  refresh() {
    if (!this.el) return;
    const c = this.chalk;
    const tool = c.tool;
    const wasHidden = this.el.hidden;
    this.el.hidden = !tool;
    if (!tool) { this.open = null; this.picking = false; this.#cursor(null); }
    else if (wasHidden) this.#place(this.at?.set ? this.at : null);      // now it has a size, keep it wholly on the screen
    for (const b of this.el.querySelectorAll(".kit-tool")) b.classList.toggle("on", b.dataset.tool === tool);
    const def = TOOLS[tool] ?? null;
    const colourTool = def && !["erase", "smudge"].includes(def.kind);
    this.el.querySelector(".kit-well").style.setProperty("--c", c.colour);
    this.el.querySelector(".kit-well").disabled = !colourTool;
    const sized = def && def.kind !== "fill";
    const size = c.sizes[tool] ?? 0;
    const dot = this.el.querySelector(".kit-size span");
    dot.style.setProperty("--d", `${Math.max(3, Math.min(26, 3 + Math.sqrt(size) * 3.2))}px`);
    this.el.querySelector(".kit-size").disabled = !sized;
    const steady = this.el.querySelector('[data-act="steady"]');
    steady.title = t("STAGECRAFT.Kit.Steady", { level: t(`STAGECRAFT.Kit.SteadyLevel.${c.steady}`) });
    steady.querySelector("b").textContent = c.steady ? String(c.steady) : "";
    steady.classList.toggle("on", c.steady > 0);
    const magic = this.el.querySelector(".kit-magic");
    magic.hidden = tool !== "magic";
    for (const b of magic.querySelectorAll("[data-magic]")) b.classList.toggle("on", !!c.magic[b.dataset.magic]);
    this.el.querySelector('[data-act="pick"]').classList.toggle("on", this.picking === true);
    for (const pop of this.el.querySelectorAll(".kit-pop")) pop.hidden = true;
    // a pop-out comes out level with the button that opened it
    const beside = (pop, button) => { pop.hidden = false; pop.style.top = `${Math.max(0, button.offsetTop - 10)}px`; };
    if (this.open === "colour" && colourTool) {
      beside(this.el.querySelector(".kit-pop-colour"), this.el.querySelector(".kit-well"));
      const hex = this.el.querySelector(".kit-hex");
      if (document.activeElement !== hex) hex.value = c.colour;
      this.el.querySelector(".kit-now").style.setProperty("--c", c.colour);
      this.el.querySelector(".kit-recent").innerHTML = c.recent.map((r) => `<button type="button" class="kit-swatch" data-colour="${r}" style="--c:${r}" title="${r}"></button>`).join("");
      this.#drawPicker();
    } else if (this.open === "size" && sized) {
      beside(this.el.querySelector(".kit-pop-size"), this.el.querySelector(".kit-size"));
      this.el.querySelector(".kit-range").value = String(sizeToSlider(size, def));
      this.el.querySelector(".kit-size-n").textContent = t("STAGECRAFT.Kit.SizePx", { n: size });
    }
    if (c.pointer) this.#cursor(c.pointer);
  }

  #click = (event) => {
    const b = event.target.closest("button");
    if (!b || b.disabled) return;
    const c = this.chalk;
    if (b.dataset.tool) { this.picking = false; c.choose(b.dataset.tool); return; }
    if (b.dataset.colour) { this.hsv = hexToHsv(b.dataset.colour); c.setColour(b.dataset.colour); return; }
    if (b.dataset.magic) { c.setMagic({ [b.dataset.magic]: !c.magic[b.dataset.magic] }); return; }
    const act = b.dataset.act;
    if (act === "colour" || act === "size") { this.open = this.open === act ? null : act; this.hsv = hexToHsv(c.colour); this.refresh(); }
    else if (act === "steady") c.setSteady((c.steady + 1) % STEADY.length);
    else if (act === "pick") { this.picking = !this.picking; this.refresh(); }
    else if (act === "undo") c.undo().catch(() => {});
    else if (act === "redo") c.redo().catch(() => {});
    else if (act === "close") c.putAway();
  };

  #wheel = (event) => {
    if (!event.target.closest(".kit-size, .kit-pop-size")) return;
    event.preventDefault();
    this.chalk.nudgeSize(event.deltaY < 0 ? 1 : -1);
  };

  /** Keys while chalk is in hand: [ and ] change the size, Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y) take back and put back, Alt picks a colour. */
  #key = (e) => {
    const c = this.chalk;
    if (!c.tool || e.target?.closest?.("input, textarea, [contenteditable]")) return;
    if (e.key === "Alt") { this.alt = true; if (c.pointer) this.#cursor(c.pointer); return; }
    let done = true;
    if (e.key === "[") c.nudgeSize(-1);
    else if (e.key === "]") c.nudgeSize(1);
    else if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") (e.shiftKey ? c.redo() : c.undo()).catch(() => {});
    else if ((e.ctrlKey || e.metaKey) && e.code === "KeyY") c.redo().catch(() => {});
    else done = false;
    if (done) { e.preventDefault(); e.stopPropagation(); }
  };

  #keyUp = (e) => {
    if (e.key === "Alt") { this.alt = false; if (this.chalk.pointer) this.#cursor(this.chalk.pointer); }
  };

  /** Is the next click to pick a colour (the kit's dropper, or Alt held)? A pick takes it out of picking mode. */
  takesPick() {
    const pick = this.picking || this.alt;
    if (this.picking) { this.picking = false; this.refresh(); }
    return pick;
  }

  /* ---------------------------------------------------------------- the ring round the pointer */

  /**
   * The ring round the pointer: a few small elements that move with it (only their place changes as the pointer moves;
   * their look only when the tool, the size, the colour or whether chalk would mark here does). It was a canvas the size
   * of the screen, cleared and drawn again at every move of the pointer: chalk.md §11.
   */
  #cursor(p) {
    const el = this.ring;
    if (!el) return;
    const c = this.chalk;
    if (!p || !c.tool) { if (!el.hidden) el.hidden = true; return; }
    const def = TOOLS[c.tool];
    const exact = this.picking || this.alt || def.kind === "fill";    // a fine cross for the exact point
    const r = exact ? 0 : Math.round(Math.max(1.5, ((c.sizes[c.tool] ?? 8) / 2) * (c.scale(p) ?? 1)) * 2) / 2;
    const look = `${exact}|${r}|${def.kind}|${c.blocked === true}|${c.colour}`;
    if (look !== this.look) {
      this.look = look;
      const classes = ["stagecraft-chalk-cursor"];
      if (exact) classes.push("exact");
      if (def.kind === "erase") classes.push("erase");
      if (c.blocked) classes.push("blocked");
      if (!exact && ["erase", "smudge"].includes(def.kind)) classes.push("nodot");
      if (!exact && r < 6) classes.push("small");
      el.className = classes.join(" ");
      el.style.setProperty("--r", `${r}px`);
      el.style.setProperty("--c", c.colour);
    }
    if (el.hidden) el.hidden = false;
    el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  }
}
