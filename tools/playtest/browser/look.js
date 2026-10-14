/*
 * `look`: the text view of a seat's screen that an agent reads instead of pixels. A function expression, evaluated in the page with
 * its options: (opts) => result. tools/playtest/browser/format-look.mjs turns the result into the text an agent sees.
 *
 * What it lists, in this order: the windows (Foundry's `.application`s and the older-style `.window-app`s sf2e's sheets still are, front first), then the adventure's own always-on parts
 * (every top-level element whose id starts with "bi-": the deck, the Runner, the tracker, the session rail), then Foundry's own UI
 * (sidebar, chat, scene controls, hotbar). Each with the words it shows and the controls a person could press, each control with a
 * short ref (r12) the agent clicks by. Refs are STABLE: an element keeps its ref while it lives, so a ref read a moment ago still
 * works unless the element is gone.
 *
 * It is deliberately what a sighted person can act on, not the page's internals: no data-action names, no class names. A control
 * with no accessible name is listed as unlabelled, because that is itself a finding (a player who cannot tell what it is).
 */
(opts) => {
  const o = Object.assign({ maxText: 1400, hudMax: 320, chatMax: 240, all: false, find: null, windowOnly: null, listCap: 24 }, opts || {});
  if (o.find) o.all = true; // searching a long list must search all of it, not the compressed view
  const pt = window.__pt || (window.__pt = { refs: new WeakMap(), nextRef: 1 });
  const INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=checkbox],[role=switch],[role=menuitem],[role=option],[role=slider],[contenteditable=""],[contenteditable="true"],[tabindex]:not([tabindex="-1"]),[data-action]';
  const collapse = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    try {
      if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    } catch {
      /* older engines: fall through to the rect test */
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const onScreen = (r) => r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  const refOf = (el) => {
    let id = pt.refs.get(el);
    if (!id) {
      id = "r" + pt.nextRef++;
      pt.refs.set(el, id);
    }
    if (el.getAttribute("data-pt-ref") !== id) el.setAttribute("data-pt-ref", id);
    return id;
  };
  const textOf = (el) => collapse(el.innerText || el.textContent || "");

  const labelOf = (el) => {
    const aria = el.getAttribute("aria-label");
    if (aria) return collapse(aria);
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const t = labelledby.split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean).map(textOf).join(" ");
      if (t) return collapse(t);
    }
    if (el.labels && el.labels.length) {
      const t = [...el.labels].map(textOf).join(" ");
      if (t) return t;
    }
    const tag = el.tagName;
    if (tag === "INPUT" && /^(button|submit|reset)$/.test(el.type)) return collapse(el.value);
    const own = textOf(el);
    if (own) return own;
    const title = el.getAttribute("title") || el.getAttribute("data-tooltip") || el.getAttribute("data-tooltip-text");
    if (title) return collapse(title);
    if (el.getAttribute("alt")) return collapse(el.getAttribute("alt"));
    if (el.getAttribute("placeholder")) return collapse(el.getAttribute("placeholder"));
    const img = el.querySelector && el.querySelector("img[alt]");
    if (img && img.alt) return collapse(img.alt);
    const icon = el.querySelector && el.querySelector("i[class*='fa-'],svg[aria-label]");
    if (icon) {
      const m = /fa-([a-z0-9-]+)/.exec(icon.getAttribute("class") || "");
      return m ? `(icon: ${m[1]})` : "";
    }
    return "";
  };

  const roleOf = (el) => {
    const r = el.getAttribute("role");
    if (r) return r;
    const tag = el.tagName.toLowerCase();
    if (tag === "a") return "link";
    if (tag === "input") return el.type === "checkbox" ? "checkbox" : el.type === "radio" ? "radio" : el.type === "range" ? "slider" : el.type === "file" ? "file input" : el.type === "number" ? "number field" : /^(button|submit|reset)$/.test(el.type) ? "button" : "text field";
    if (tag === "textarea") return "text box";
    if (tag === "select") return "menu";
    if (tag === "summary") return "disclosure";
    if (tag === "button") return "button";
    if (el.isContentEditable) return "editable text";
    return "control";
  };

  const stateOf = (el) => {
    const s = [];
    if (el.disabled || el.getAttribute("aria-disabled") === "true") s.push("disabled");
    if (el.checked === true) s.push("checked");
    if (el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-checked") === "true") s.push("on");
    const cls = typeof el.className === "string" ? el.className : "";
    if (/(^|\s|-|_)(selected|is-on|is-active|active|pressed)(\s|$)/.test(cls) && !s.includes("on")) s.push("on");
    if (el.getAttribute("aria-expanded")) s.push(el.getAttribute("aria-expanded") === "true" ? "open" : "closed");
    if (el.tagName === "DETAILS") s.push(el.open ? "open" : "closed");
    if (el.readOnly) s.push("read-only");
    if (el.matches && el.matches(":invalid")) s.push("invalid");
    const tag = el.tagName;
    if (tag === "INPUT" && /^(text|search|email|url|tel|password|number|)$/.test(el.type)) s.push(el.value ? `value "${clip(collapse(el.value), 60)}"` : "empty");
    else if (tag === "TEXTAREA") s.push(el.value ? `value "${clip(collapse(el.value), 60)}"` : "empty");
    else if (tag === "SELECT") s.push(`chosen "${clip(collapse(el.selectedOptions[0] ? el.selectedOptions[0].textContent : ""), 40)}"`);
    else if (tag === "INPUT" && el.type === "range") s.push(`at ${el.value}`);
    if (document.activeElement === el) s.push("focused");
    return s;
  };

  // The scrollable ancestor, so a control below the fold of its own window still counts as reachable.
  const scrollableAncestor = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
    }
    return null;
  };

  const controlsIn = (root, groupRect) => {
    const out = [];
    const seen = new Set();
    const push = (el, forcedRole) => {
      if (seen.has(el) || !visible(el)) return;
      // A control nested inside another control (an icon in a button) is the outer one's business.
      for (let p = el.parentElement; p && p !== root; p = p.parentElement) if (seen.has(p)) return;
      const r = el.getBoundingClientRect();
      let where = null;
      const scroller = scrollableAncestor(el);
      if (!onScreen(r)) {
        if (!scroller) return;
        where = "scroll";
      } else if (scroller) {
        const s = scroller.getBoundingClientRect();
        if (r.bottom > s.bottom + 2 || r.top < s.top - 2 || r.right > s.right + 2 || r.left < s.left - 2) where = "scroll";
      }
      seen.add(el);
      out.push({ ref: refOf(el), role: forcedRole || roleOf(el), label: clip(labelOf(el), 80), state: stateOf(el), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], where, _el: el });
    };
    root.querySelectorAll(INTERACTIVE).forEach((el) => push(el));
    // Pointer-cursor elements that are not natively interactive (the adventure's pills and keys are drawn this way).
    const maybe = root.querySelectorAll("span,div,li,label,img,svg,i");
    for (const el of maybe) {
      if (seen.has(el)) continue;
      let cs;
      try {
        cs = getComputedStyle(el);
      } catch {
        continue;
      }
      if (cs.cursor !== "pointer" || cs.pointerEvents === "none") continue;
      // Take the outermost pointer element only.
      const parent = el.parentElement;
      if (parent && parent !== root && getComputedStyle(parent).cursor === "pointer") continue;
      push(el, "pressable");
    }
    // Document order, so the pointer-cursor controls found last sit where they are on the page and are not the first dropped by a long list.
    out.sort((x, y) => (x._el.compareDocumentPosition(y._el) & 4 ? -1 : 1));
    // Many controls read alike (a tick on every beat, a Change on every section): say which row each belongs to.
    const counts = new Map();
    for (const c of out) counts.set(c.label, (counts.get(c.label) || 0) + 1);
    for (const c of out) {
      if (counts.get(c.label) > 1 || !c.label) {
        const row = c._el.closest('li,[data-beat-id],[role="listitem"],tr,fieldset,.bi-prompt-field,details,.form-group');
        if (row) {
          const t = collapse(row.innerText).replace(c.label, "").trim();
          if (t) c.context = clip(t, 48);
        }
      }
      delete c._el;
    }
    return out;
  };

  const compress = (controls) => {
    if (o.all || controls.length <= o.listCap) return { controls, hidden: 0 };
    const keep = controls.filter((c, i) => i < 8 || c.state.includes("on") || c.state.includes("checked") || c.state.includes("focused"));
    return { controls: keep, hidden: controls.length - keep.length };
  };

  const groups = [];
  const claimed = new Set();

  // Windows, front first.
  const apps = [...document.querySelectorAll(".application, .window-app")].filter(visible);
  apps.sort((a, b) => (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0));
  apps.forEach((app, index) => {
    claimed.add(app);
    const r = app.getBoundingClientRect();
    const title = collapse((app.querySelector(".window-title") || {}).textContent || app.getAttribute("aria-label") || app.id || "window");
    const content = app.querySelector(".window-content") || app;
    const { controls, hidden } = compress(controlsIn(app, content.getBoundingClientRect()));
    const body = textOf(content);
    groups.push({ kind: "window", id: app.id || "", title, front: index === 0, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: clip(body, o.maxText), textLength: body.length, controls, hiddenControls: hidden });
  });

  // The adventure's always-on parts. A part whose root has no size of its own but whose children are drawn (the Command Console's root is an empty
  // fixed box round a panel) is on screen all the same: its rectangle is that of what it draws.
  const drawnRect = (el) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of el.querySelectorAll("*")) {
      if (!visible(c)) continue;
      const b = c.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) continue;
      x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
    }
    return x0 === Infinity ? null : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  };
  const huds = [...document.querySelectorAll('[id^="bi-"]')].filter((el) => (visible(el) || drawnRect(el)) && !el.closest(".application, .window-app") && !(el.parentElement && el.parentElement.closest('[id^="bi-"]')));
  for (const el of huds) {
    claimed.add(el);
    const r = visible(el) ? el.getBoundingClientRect() : drawnRect(el);
    const { controls, hidden } = compress(controlsIn(el, null));
    const body = textOf(el);
    groups.push({ kind: "hud", id: el.id, title: el.id.replace(/^bi-/, "").replace(/-/g, " "), front: false, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: clip(body, o.hudMax), textLength: body.length, controls, hiddenControls: hidden });
  }

  // Foundry's own interface.
  const FOUNDRY_UI = ["#scene-controls", "#scene-navigation", "#players", "#hotbar", "#sidebar", "#chat-notifications", "#ui-top", "#ui-bottom"];
  for (const sel of FOUNDRY_UI) {
    const el = document.querySelector(sel);
    if (!el || !visible(el) || [...claimed].some((c) => c.contains(el))) continue;
    const r = el.getBoundingClientRect();
    const { controls, hidden } = compress(controlsIn(el, null));
    if (!controls.length) continue;
    groups.push({ kind: "ui", id: sel.replace("#", ""), title: sel.replace("#", "").replace(/-/g, " "), front: false, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], text: "", textLength: 0, controls, hiddenControls: hidden });
  }

  // Toasts and the last few chat lines: what the table has just been told.
  const toasts = [...document.querySelectorAll("#notifications .notification, .notification")].filter(visible).map((n) => clip(textOf(n), 200)).slice(0, 5);
  // The latest chat lines: three, each cut short, unless the caller asked for more (--all for twelve, --chars for longer ones). The game master reads the players' intake answers here.
  const chat = [...document.querySelectorAll("#chat .chat-message, #chat .message")].slice(o.all ? -12 : -3).map((m) => clip(textOf(m), o.chatMax));

  const g = window.game;
  const scene = g && g.canvas && g.canvas.scene ? g.canvas.scene : window.canvas && canvas.scene ? canvas.scene : null;
  const meta = {
    url: location.pathname + location.search,
    viewport: [innerWidth, innerHeight],
    zoom: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    ready: !!(g && g.ready),
    user: g && g.user ? { name: g.user.name, gm: !!g.user.isGM, character: g.user.character ? g.user.character.name : null } : null,
    scene: scene ? { id: scene.id, name: scene.name } : null,
    title: document.title
  };

  let result = groups;
  if (o.windowOnly) {
    const needle = String(o.windowOnly).toLowerCase();
    result = groups.filter((x) => x.title.toLowerCase().includes(needle) || x.id.toLowerCase().includes(needle));
  }
  if (o.find) {
    const needle = String(o.find).toLowerCase();
    result = result
      .map((x) => ({ ...x, controls: x.controls.filter((c) => c.label.toLowerCase().includes(needle) || c.role.includes(needle)), hiddenControls: 0, text: x.text.toLowerCase().includes(needle) ? x.text : "" }))
      .filter((x) => x.controls.length || x.text);
  }
  return { meta, groups: result, toasts, chat };
}
