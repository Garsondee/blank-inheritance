/**
 * One seat: a real browser context logged in as one Foundry user, driven by REAL input events (the mouse moves to the control and
 * presses; keys are typed). Never by calling a handler: the repo learned that the hard way (the Location Editor, the Scene Runner's
 * invisible box), and design/playtest-process.md makes it a rule. What an agent can do here is what a person at this screen can do.
 *
 * The verbs return { ok, text, data } and never throw; the hub files each as an action with its timing. The seat also owns what only
 * it can see for itself: its console, its failed requests, its dialogs, and the page's own event log (browser/page-hooks.js), all
 * reported through `ctx.emit(seatId, event)`.
 *
 * Privileged calls (peek, detect, dice, leak scan, evidence) are for the hub and the bots. They are never reachable from a verb an
 * agent can send.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { diceGovernorSource, call, detectorsSource, lookSource, pageHooksSource, probeCall } from "./scripts.mjs";
import { findControls, formatLook } from "./format-look.mjs";
import { joinFoundry, sleep, waitReady } from "./chrome.mjs";

const KEY_ALIASES = { ctrl: "Control", control: "Control", cmd: "Meta", meta: "Meta", alt: "Alt", shift: "Shift", esc: "Escape", escape: "Escape", return: "Enter", enter: "Enter", del: "Delete", delete: "Delete", backspace: "Backspace", space: "Space", spacebar: "Space", tab: "Tab", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", pgup: "PageUp", pgdn: "PageDown", pageup: "PageUp", pagedown: "PageDown", home: "Home", end: "End" };
const MODIFIERS = new Set(["Control", "Meta", "Alt", "Shift"]);

/** "Ctrl+Shift+k" -> ["Control", "Shift", "KeyK"-style key]. Single letters stay as typed. */
export function parseKeyCombo(text) {
  const parts = String(text).split("+").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) throw new Error("no key given");
  const keys = parts.map((p) => KEY_ALIASES[p.toLowerCase()] ?? (p.length === 1 ? p : p[0].toUpperCase() + p.slice(1)));
  return { modifiers: keys.filter((k, i) => i < keys.length - 1 && MODIFIERS.has(k)), key: keys[keys.length - 1] };
}

const ok = (text, data) => ({ ok: true, text, ...(data === undefined ? {} : { data }) });
const fail = (text, data) => ({ ok: false, text, ...(data === undefined ? {} : { data }) });

export class Seat {
  constructor({ spec, ctx }) {
    this.spec = spec;
    this.id = spec.seat;
    this.user = spec.user;
    this.role = spec.role;
    this.profile = spec.profile;
    this.ctx = ctx;
    this.page = null;
    this.context = null;
    this.state = "new";
    this.startedAt = null;
    this.lastLook = null;
    this.counts = { console: 0, requests: 0 };
    this.evidenceDir = path.join(ctx.runDir, "seats", this.id, "evidence");
    mkdirSync(this.evidenceDir, { recursive: true });
  }

  get keyboardOnly() {
    return Boolean(this.profile.keyboardOnly);
  }

  emit(event) {
    this.ctx.emit(this.id, { t: Date.now(), seat: this.id, ...event });
  }

  // --- lifecycle ------------------------------------------------------------------------------------------------------------

  async start() {
    this.state = "starting";
    const { browser, foundryUrl } = this.ctx;
    this.context = await browser.createBrowserContext();
    const page = (this.page = await this.context.newPage());
    const [width, height] = this.profile.viewport;
    await page.setViewport({ width, height, deviceScaleFactor: this.profile.scale ?? 1 });
    if (this.profile.reducedMotion) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    if (this.profile.network) {
      try {
        const n = this.profile.network;
        await page.emulateNetworkConditions({ download: (n.downKbps * 1024) / 8, upload: (n.upKbps * 1024) / 8, latency: n.latencyMs });
      } catch (error) {
        this.emit({ type: "rig-error", message: `could not throttle the network: ${error.message}` });
      }
    }
    await page.evaluateOnNewDocument(pageHooksSource());
    await page.evaluateOnNewDocument(diceGovernorSource());
    this.attach(page);
    await joinFoundry(page, this.user, { url: foundryUrl });
    await this.applyPerf();
    await this.configureDice();
    this.state = "ready";
    this.startedAt = Date.now();
    this.emit({ type: "seat", state: "ready", user: this.user, viewport: this.profile.viewport });
    return this;
  }

  attach(page) {
    page.on("console", (msg) => {
      const level = msg.type();
      this.counts.console++;
      if (level !== "error" && level !== "warning") return;
      const loc = msg.location();
      this.emit({ type: "console", level, text: msg.text().slice(0, 700), url: loc?.url ?? null, line: loc?.lineNumber ?? null });
    });
    page.on("pageerror", (error) => this.emit({ type: "pageerror", message: String(error.message ?? error).slice(0, 500), stack: String(error.stack ?? "").slice(0, 1200) }));
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? "failed";
      if (/ERR_ABORTED/.test(failure)) return;
      this.emit({ type: "requestfailed", url: request.url().slice(0, 300), method: request.method(), failure, resourceType: request.resourceType() });
    });
    page.on("response", (response) => {
      this.counts.requests++;
      if (response.status() >= 400) this.emit({ type: "response", url: response.url().slice(0, 300), status: response.status(), resourceType: response.request().resourceType() });
    });
    page.on("dialog", async (dialog) => {
      this.emit({ type: "dialog", kind: dialog.type(), message: dialog.message().slice(0, 300) });
      try {
        await dialog.accept();
      } catch {
        /* already handled */
      }
    });
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) this.emit({ type: "nav", url: frame.url().slice(0, 200) });
    });
    page.on("close", () => {
      this.state = "down";
      this.emit({ type: "seat", state: "closed" });
    });
  }

  /** A lean seat turns its own graphics down, as a player on a weak machine would: ten frames a second and the lowest canvas mode. */
  async applyPerf() {
    if (this.profile.perf !== "lean") return;
    try {
      await this.page.evaluate(async () => {
        await game.settings.set("core", "maxFPS", 10);
        await game.settings.set("core", "performanceMode", CONST.CANVAS_PERFORMANCE_MODES.LOW);
      });
    } catch (error) {
      this.emit({ type: "rig-error", message: `could not lower the frame rate: ${error.message}` });
    }
  }

  async configureDice() {
    try {
      await this.page.evaluate(`window.__ptDice && window.__ptDice.configure(${JSON.stringify({ seat: this.id, seed: this.ctx.seed ?? null })})`);
    } catch (error) {
      this.emit({ type: "rig-error", message: `could not configure the dice: ${error.message}` });
    }
  }

  async stop() {
    this.state = "down";
    try {
      await this.context?.close();
    } catch {
      /* closing a closed context */
    }
  }

  /** Reload the page (a person pressing F5) and wait for the game. */
  async reload() {
    try {
      await this.page.reload({ waitUntil: "domcontentloaded" });
      await waitReady(this.page);
      await this.configureDice();
      return ok("Reloaded. The game is ready again.");
    } catch (error) {
      return fail(`Reload did not finish: ${error.message}`);
    }
  }

  // --- reading the screen ---------------------------------------------------------------------------------------------------

  async lookRaw(opts = {}) {
    return this.page.evaluate(call(lookSource(), opts));
  }

  async look(opts = {}) {
    try {
      const result = await this.lookRaw({ maxText: opts.maxText ?? 1400, hudMax: opts.maxText ?? 320, chatMax: opts.maxText ?? 240, all: Boolean(opts.all), find: opts.find ?? null, windowOnly: opts.window ?? null });
      this.lastLook = result;
      return ok(formatLook(result, { seat: this.id, persona: this.spec.persona, user: this.user }), { refs: result.groups.reduce((n, g) => n + g.controls.length, 0), scene: result.meta.scene, character: result.meta.user ? result.meta.user.character : null });
    } catch (error) {
      return fail(`Could not read the screen: ${error.message}`);
    }
  }

  async shot({ scale = 0.6, region = null, format = "jpeg", label = "look" } = {}) {
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = path.join(this.evidenceDir, `${stamp}-${label}.${format === "png" ? "png" : "jpg"}`);
      const [vw, vh] = this.profile.viewport;
      // captureBeyondViewport:false matters: by default a clipped shot makes the page resize itself for a moment, and Foundry answers a resize with an
      // error notice ("requires usable window dimensions of 1024px by 768px") that the seat's own player then sees (found by the first agent run, F-0066).
      const clip = region ? { x: region[0], y: region[1], width: region[2], height: region[3], scale } : { x: 0, y: 0, width: vw, height: vh, scale };
      await this.page.screenshot({ path: file, type: format === "png" ? "png" : "jpeg", ...(format === "png" ? {} : { quality: 72 }), clip, captureBeyondViewport: false });
      return ok(`Screenshot saved: ${file} (${Math.round(clip.width * scale)}x${Math.round(clip.height * scale)}). View it with the Read tool.`, { path: file });
    } catch (error) {
      return fail(`Screenshot failed: ${error.message}`);
    }
  }

  /** A full-quality evidence shot for a finding. Returns the path or null. */
  async evidenceShot(label) {
    const result = await this.shot({ scale: 1, format: "png", label });
    return result.ok ? result.data.path : null;
  }

  // --- resolving what to press ----------------------------------------------------------------------------------------------

  /** A ref (r12), a point (x,y) or the words on a control. */
  async resolve(target) {
    const text = String(target).trim();
    if (/^r\d+$/.test(text) || /^ref_?\d+$/i.test(text)) {
      const ref = text.replace(/^ref_?/i, "r");
      const handle = await this.page.$(`[data-pt-ref="${ref}"]`);
      if (!handle) return { error: `${ref} is not on the screen any more. Run look again.` };
      return { handle, ref };
    }
    const point = /^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/.exec(text);
    if (point) return { point: [Number(point[1]), Number(point[2])] };
    const result = await this.lookRaw({ all: true });
    const hits = findControls(result, text);
    if (!hits.length) return { error: `No control reads "${text}". Run look (or look --find "${text}") to see what is on the screen.` };
    if (hits.length > 1) {
      const front = hits.filter((h) => h.group === hits[0].group);
      if (front.length === 1) return this.resolve(front[0].ref);
      return { error: `More than one control reads "${text}": ${hits.slice(0, 6).map((h) => `[${h.ref}] ${h.role} "${h.label}" in ${h.group}`).join("; ")}. Use a ref.` };
    }
    return this.resolve(hits[0].ref);
  }

  async signals() {
    try {
      return await this.page.evaluate(() => ({ mutations: (window.__pt && window.__pt.mutations) || 0, requests: (window.__pt && window.__pt.requests) || 0, url: location.href, active: document.activeElement ? document.activeElement.tagName + (document.activeElement.id || "") : "" }));
    } catch {
      return { navigating: true };
    }
  }

  /** Did anything happen after an action? Waits a moment for it. */
  async settled(before, maxMs = 650) {
    const started = Date.now();
    while (Date.now() - started < maxMs) {
      const now = await this.signals();
      if (now.navigating || now.mutations !== before.mutations || now.requests !== before.requests || now.url !== before.url || now.active !== before.active) return true;
      await sleep(70);
    }
    return false;
  }

  // --- acting ----------------------------------------------------------------------------------------------------------------

  async click(target, { button = "left", double = false } = {}) {
    if (this.keyboardOnly) return fail("This seat is keyboard-only: use key (Tab, Shift+Tab, Enter, Space, Escape, the arrows), not click.");
    try {
      const found = await this.resolve(target);
      if (found.error) return fail(found.error);
      let x;
      let y;
      let label = "";
      let tag = "";
      if (found.handle) {
        await found.handle.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
        await sleep(60);
        const box = await found.handle.boundingBox();
        if (!box) return fail(`${found.ref} has no size on the screen right now (hidden). Run look again.`);
        x = box.x + box.width / 2;
        y = box.y + box.height / 2;
        const info = await found.handle.evaluate((el) => ({ tag: el.tagName, label: (el.getAttribute("aria-label") || el.innerText || el.value || el.title || "").replace(/\s+/g, " ").trim().slice(0, 60), disabled: !!el.disabled || el.getAttribute("aria-disabled") === "true" }));
        label = info.label;
        tag = info.tag;
        if (info.disabled) {
          this.emit({ type: "action-note", note: "pressed a disabled control", target: found.ref, label });
        }
      } else {
        [x, y] = found.point;
      }
      const cover = await this.page.evaluate(({ x, y, ref }) => {
        const top = document.elementFromPoint(x, y);
        if (!top) return { covered: false, tag: null };
        const el = ref ? document.querySelector(`[data-pt-ref="${ref}"]`) : null;
        const describe = (e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}${typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
        const same = !el || top === el || el.contains(top) || top.contains(el);
        return { covered: !same, by: same ? null : describe(top), tag: top.tagName };
      }, { x, y, ref: found.ref ?? null });
      const before = await this.signals();
      await this.page.mouse.move(x, y, { steps: 4 });
      await this.page.mouse.click(x, y, { button, clickCount: double ? 2 : 1 });
      const changed = await this.settled(before);
      const notes = [];
      if (cover.covered) {
        notes.push(`The click landed on ${cover.by}, which covers the control (it was not the thing you meant to press).`);
        this.emit({ type: "detector", name: "click-obstructed", severity: "S1", text: `click on ${found.ref ?? `${x},${y}`} "${label}" landed on ${cover.by}`, target: found.ref ?? null, label, coveredBy: cover.by });
      }
      const interactive = /^(BUTTON|A|SUMMARY|INPUT)$/.test(tag) && cover.tag !== "CANVAS" && cover.tag !== "VIDEO";
      if (!changed && interactive && !cover.covered) {
        notes.push("Nothing on the screen changed after the press.");
        this.emit({ type: "dead-click", target: found.ref ?? null, label, text: `pressing ${found.ref ?? `${Math.round(x)},${Math.round(y)}`} "${label}" changed nothing` });
      }
      return ok(`${double ? "Double-clicked" : button === "right" ? "Right-clicked" : "Clicked"} ${found.ref ? `${found.ref} ` : ""}${label ? `"${label}" ` : ""}at ${Math.round(x)},${Math.round(y)}.${notes.length ? " " + notes.join(" ") : changed ? "" : " (No visible change.)"}`, { covered: cover.covered, changed });
    } catch (error) {
      return fail(`Click failed: ${error.message}`);
    }
  }

  async type(text, { into = null, clear = false, enter = false } = {}) {
    try {
      if (into) {
        if (this.keyboardOnly) return fail("This seat is keyboard-only: move focus to the field with Tab, then type.");
        const found = await this.resolve(into);
        if (found.error) return fail(found.error);
        if (found.handle) {
          await found.handle.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
          const box = await found.handle.boundingBox();
          if (!box) return fail(`${found.ref} cannot be seen right now. Run look again.`);
          await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        } else {
          await this.page.mouse.click(found.point[0], found.point[1]);
        }
        await sleep(80);
      }
      if (clear) {
        await this.page.keyboard.down("Control");
        await this.page.keyboard.press("KeyA");
        await this.page.keyboard.up("Control");
        await this.page.keyboard.press("Backspace");
      }
      const before = await this.signals();
      await this.page.keyboard.type(String(text), { delay: 6 });
      if (enter) await this.page.keyboard.press("Enter");
      const changed = await this.settled(before, 400);
      return ok(`Typed ${String(text).length} character(s)${into ? ` into ${into}` : ""}${enter ? " and pressed Enter" : ""}.${changed ? "" : " (No visible change: is a field focused?)"}`);
    } catch (error) {
      return fail(`Typing failed: ${error.message}`);
    }
  }

  async key(spec, { repeat = 1 } = {}) {
    try {
      const sequence = String(spec).trim().split(/\s+/).filter(Boolean);
      const before = await this.signals();
      for (let i = 0; i < Math.max(1, Math.min(100, repeat)); i++) {
        for (const combo of sequence) {
          const { modifiers, key } = parseKeyCombo(combo);
          for (const m of modifiers) await this.page.keyboard.down(m);
          await this.page.keyboard.press(key);
          for (const m of modifiers.slice().reverse()) await this.page.keyboard.up(m);
          await sleep(30);
        }
      }
      const changed = await this.settled(before, 350);
      const focus = await this.page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return "nothing";
        const label = (a.getAttribute("aria-label") || a.innerText || a.value || a.title || "").replace(/\s+/g, " ").trim().slice(0, 50);
        return `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}${label ? ` "${label}"` : ""}`;
      });
      return ok(`Pressed ${sequence.join(" ")}${repeat > 1 ? ` x${repeat}` : ""}. Focus is on ${focus}.${changed ? "" : " (Nothing visibly changed.)"}`, { focus });
    } catch (error) {
      return fail(`Key press failed: ${error.message}`);
    }
  }

  async scroll(target, direction = "down", amount = 3) {
    try {
      let x = this.profile.viewport[0] / 2;
      let y = this.profile.viewport[1] / 2;
      if (target) {
        const found = await this.resolve(target);
        if (found.error) return fail(found.error);
        if (found.handle) {
          const box = await found.handle.boundingBox();
          if (box) [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
        } else [x, y] = found.point;
      }
      const n = Math.max(1, Math.min(20, Number(amount) || 3)) * 100;
      const delta = { down: [0, n], up: [0, -n], right: [n, 0], left: [-n, 0] }[direction] ?? [0, n];
      const before = await this.signals();
      await this.page.mouse.move(x, y);
      await this.page.mouse.wheel({ deltaX: delta[0], deltaY: delta[1] });
      await sleep(150);
      return ok(`Scrolled ${direction} by ${amount} at ${Math.round(x)},${Math.round(y)}.${(await this.settled(before, 200)) ? "" : " (Nothing moved: the end, or nothing scrolls here.)"}`);
    } catch (error) {
      return fail(`Scroll failed: ${error.message}`);
    }
  }

  async drag(from, to) {
    if (this.keyboardOnly) return fail("This seat is keyboard-only: dragging needs a pointer.");
    try {
      const a = await this.resolve(from);
      const b = await this.resolve(to);
      if (a.error || b.error) return fail(a.error ?? b.error);
      const centre = async (r) => {
        if (r.point) return r.point;
        await r.handle.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
        const box = await r.handle.boundingBox();
        return [box.x + box.width / 2, box.y + box.height / 2];
      };
      const [x1, y1] = await centre(a);
      const [x2, y2] = await centre(b);
      const before = await this.signals();
      await this.page.mouse.move(x1, y1);
      await this.page.mouse.down();
      await this.page.mouse.move(x2, y2, { steps: 14 });
      await this.page.mouse.up();
      const changed = await this.settled(before, 400);
      return ok(`Dragged from ${Math.round(x1)},${Math.round(y1)} to ${Math.round(x2)},${Math.round(y2)}.${changed ? "" : " (No visible change.)"}`);
    } catch (error) {
      return fail(`Drag failed: ${error.message}`);
    }
  }

  async upload(target, filePath) {
    try {
      const found = await this.resolve(target);
      if (found.error) return fail(found.error);
      if (!found.handle) return fail("Give the ref of a file input (look lists it as 'file input').");
      await found.handle.uploadFile(filePath);
      await sleep(400);
      return ok(`Chose the file ${path.basename(filePath)} for ${found.ref}.`);
    } catch (error) {
      return fail(`Upload failed: ${error.message}`);
    }
  }

  /** wait for some milliseconds, or until text appears / disappears. */
  async wait({ ms = 0, text = null, gone = null, timeout = 15000 } = {}) {
    try {
      if (!text && !gone) {
        await sleep(Math.max(0, Math.min(60000, ms)));
        return ok(`Waited ${ms} ms.`);
      }
      const started = Date.now();
      const needle = String(text ?? gone).toLowerCase();
      while (Date.now() - started < Math.min(60000, timeout)) {
        const present = await this.page.evaluate((n) => document.body.innerText.toLowerCase().includes(n), needle);
        if (text && present) return ok(`"${text}" is on the screen (after ${Date.now() - started} ms).`);
        if (gone && !present) return ok(`"${gone}" has gone from the screen (after ${Date.now() - started} ms).`);
        await sleep(250);
      }
      return fail(text ? `"${text}" did not appear within ${timeout} ms.` : `"${gone}" was still on the screen after ${timeout} ms.`);
    } catch (error) {
      return fail(`Wait failed: ${error.message}`);
    }
  }

  // --- privileged: the hub and the bots, never an agent ------------------------------------------------------------------------

  async probe(name, ...args) {
    return this.page.evaluate(probeCall(name, ...args));
  }

  async detect(names = null) {
    return this.page.evaluate(call(detectorsSource(), names));
  }

  async drainPageEvents() {
    try {
      return await this.page.evaluate(() => (window.__pt && window.__pt.drain ? window.__pt.drain() : []));
    } catch {
      return [];
    }
  }

  async armDice(spec) {
    return this.page.evaluate(`window.__ptDice.arm(${JSON.stringify(spec)})`);
  }

  async diceStatus() {
    return this.page.evaluate("window.__ptDice.status()");
  }

  async clearDice() {
    return this.page.evaluate("window.__ptDice.clear()");
  }

  /** The Foundry-side state this seat reports, for the status board. */
  async brief() {
    try {
      const peek = await this.probe("peek");
      return { state: this.state, user: this.user, ...peek };
    } catch (error) {
      return { state: this.state, user: this.user, error: error.message };
    }
  }

  // --- helpers the bots use (real input, by selector) ------------------------------------------------------------------------

  /** A bot's own press, put on the same audit trail an agent's verbs are on. */
  noteAction(verb, args) {
    this.ctx.action?.(this.id, { verb, args: String(args).slice(0, 200), ok: true, ms: 0, text: "" });
  }

  async clickSelector(selector, { timeout = 15000, text = null } = {}) {
    const started = Date.now();
    for (;;) {
      const handle = text ? await this.findByText(selector, text) : await this.page.$(selector);
      if (handle) {
        try {
          await handle.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
          const box = await handle.boundingBox();
          if (box && box.width > 0 && box.height > 0) {
            const disabled = await handle.evaluate((el) => !!el.disabled || el.getAttribute("aria-disabled") === "true");
            if (!disabled) {
              const x = box.x + box.width / 2;
              const y = box.y + box.height / 2;
              // A person clicks what they see and gets what is on top; so does this. But it is said when something else was on top.
              const cover = await handle.evaluate((el, px, py) => {
                const top = document.elementFromPoint(px, py);
                if (!top || top === el || el.contains(top) || top.contains(el)) return null;
                return `${top.tagName.toLowerCase()}${top.id ? "#" + top.id : ""}${typeof top.className === "string" && top.className.trim() ? "." + top.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
              }, x, y);
              this.noteAction("bot-click", selector);
              if (cover) this.emit({ type: "detector", name: "click-obstructed", severity: "S1", text: `a press on ${selector} landed on ${cover}, which covers it`, coveredBy: cover });
              await this.page.mouse.move(x, y, { steps: 3 });
              await this.page.mouse.click(x, y);
              await sleep(120);
              return true;
            }
          }
        } catch {
          /* the element re-rendered under us: look again */
        }
      }
      if (Date.now() - started > timeout) return false;
      await sleep(150);
    }
  }

  /** Close the first window whose title contains these words, by pressing its own close button. Returns the title closed, or null. */
  async closeWindow(titleContains) {
    const handle = await this.page.evaluateHandle((needle) => [...document.querySelectorAll(".application, .window-app")].find((a) => (a.querySelector(".window-title")?.textContent ?? "").toLowerCase().includes(needle)) ?? null, String(titleContains).toLowerCase());
    const win = handle.asElement();
    if (!win) return null;
    const title = await win.evaluate((a) => (a.querySelector(".window-title")?.textContent ?? "").trim());
    const button = await win.$('button[data-action="close"]');
    const box = button ? await button.boundingBox() : null;
    if (!box) return null;
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(250);
    return title;
  }

  async findByText(selector, text) {
    const handles = await this.page.$$(selector);
    const needle = String(text).toLowerCase();
    for (const h of handles) {
      const t = await h.evaluate((el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase());
      if (t.includes(needle)) return h;
    }
    return null;
  }

  async typeIntoSelector(selector, text, { clear = true } = {}) {
    const handle = await this.page.$(selector);
    if (!handle) return false;
    this.noteAction("bot-type", selector);
    await handle.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const box = await handle.boundingBox();
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (clear) {
      await this.page.keyboard.down("Control");
      await this.page.keyboard.press("KeyA");
      await this.page.keyboard.up("Control");
      await this.page.keyboard.press("Backspace");
    }
    await this.page.keyboard.type(String(text), { delay: 4 });
    return true;
  }

  async visible(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
    }, selector);
  }

  save(name, data) {
    const file = path.join(this.evidenceDir, name);
    writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data, null, 2));
    return file;
  }
}
