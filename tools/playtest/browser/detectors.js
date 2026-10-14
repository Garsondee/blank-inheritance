/*
 * The detectors: everything about a screen a script can MEASURE, so no agent has to be trusted to notice it (design/playtest-process.md,
 * principle 1). A function expression evaluated in the page: (names) => { [name]: hits[] }. Each hit is plain data the hub files as a
 * finding. Heuristics are marked as such in their `note`: a detector that is sometimes wrong says so, rather than crying wolf quietly.
 *
 * What they look for, and why each one is here:
 *   clickthrough  an empty, invisible box that wins the hit test over the canvas or a window (the bug found live 2026-10-01: the Scene
 *                 Runner's closed host swallowed every click in the top left of every scene)
 *   occlusion     a visible control whose centre is covered by something that is not part of its own window
 *   offscreen     a fixed or absolute control lying wholly outside the viewport (a window dragged off, a panel placed past the edge)
 *   tiny          controls smaller than 24 x 24 CSS pixels (WCAG 2.2, 2.5.8); aggregated per window so one cramped bar is one hit
 *   overflow-x    the page scrolls sideways
 *   clipped-text  text cut off inside its own box
 *   unlabelled    a control with no accessible name (a player, and a screen reader, cannot tell what it is)
 */
(names) => {
  const wanted = new Set(names && names.length ? names : ["clickthrough", "occlusion", "offscreen", "tiny", "overflow-x", "clipped-text", "unlabelled"]);
  const INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=checkbox],[role=switch],[role=menuitem],[tabindex]:not([tabindex="-1"]),[data-action]';
  const collapse = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    try {
      if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    } catch {
      /* fall through */
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const describe = (el) => {
    if (!el) return "(nothing)";
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 120);
  };
  const nameOf = (el) => collapse(el.getAttribute("aria-label") || (el.labels && el.labels[0] && el.labels[0].textContent) || el.innerText || el.getAttribute("title") || el.getAttribute("data-tooltip") || el.value || el.getAttribute("alt") || "").slice(0, 60);
  const windowOf = (el) => {
    const w = el.closest(".application, .window-app");
    if (w) return w.id || "window";
    const hud = el.closest('[id^="bi-"]');
    return hud ? hud.id : "page";
  };
  /**
   * Whether a point on a control lies outside what a scrolling ancestor shows: the control is below (or above) the fold of its own list, so the
   * thing under that spot on the screen is not covering it, it is simply what is there where the list is not. (The first agent runs filed these
   * as "covered by the scene canvas": a "What does this actually change?" fold at the foot of a page's scroll area.)
   */
  const clippedAway = (el, x, y) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const r = p.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return true;
    }
    return false;
  };
  const controls = () => [...document.querySelectorAll(INTERACTIVE)].filter(visible);
  const out = {};
  const add = (name, hit) => (out[name] || (out[name] = [])).push(hit);

  // An empty, transparent element that takes clicks: the kind of box that swallows a click meant for what is under it.
  const emptyTransparent = (el) => {
    if (!el || el === document.body || el === document.documentElement || el.tagName === "CANVAS" || el.tagName === "VIDEO") return false;
    if (el.isContentEditable || el.closest("[contenteditable]")) return false; // an editor is a control, not a cover
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|LABEL|A)$/.test(el.tagName) || el.matches(INTERACTIVE)) return false; // a field or a key is a control too: an empty text box is not a box over something
    const root = el.closest('[id^="bi-"]');
    if (root && root !== el) return false; // a part of the adventure's own HUD (the deck's dial) is meant to take clicks; the HUD's own empty ROOT is the bug (the Scene Runner's host)
    const cs = getComputedStyle(el);
    const noImage = !cs.backgroundImage || cs.backgroundImage === "none";
    const bg = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    const alpha = bg ? (bg[1].split(",").length === 4 ? parseFloat(bg[1].split(",")[3]) : 1) : 0;
    const empty = collapse(el.innerText) === "" && !el.querySelector("img,canvas,video,input,button,a,[data-action],svg");
    return empty && noImage && alpha === 0;
  };
  const swallowers = new Map();
  const swallower = (el) => swallowers.get(el) || swallowers.set(el, { points: 0, covers: [] }).get(el);

  if (wanted.has("clickthrough")) {
    // A grid of points across the screen: a swallower that wins the hit test at two or more of them is a real box, not a speck.
    const fractions = Array.from({ length: 9 }, (_, i) => 0.05 + i * 0.1125);
    for (const fy of fractions) for (const fx of fractions) {
      const el = document.elementFromPoint(innerWidth * fx, innerHeight * fy);
      if (emptyTransparent(el)) swallower(el).points++;
    }
  }

  if (wanted.has("occlusion") || wanted.has("offscreen") || wanted.has("tiny") || wanted.has("unlabelled")) {
    const tinyByWindow = new Map();
    for (const el of controls()) {
      const r = el.getBoundingClientRect();
      const win = windowOf(el);
      if (wanted.has("tiny") && (r.width < 24 || r.height < 24) && !(el.tagName === "A" && el.closest("p,li,.window-content p"))) {
        const entry = tinyByWindow.get(win) || { window: win, count: 0, examples: [] };
        entry.count++;
        if (entry.examples.length < 4) entry.examples.push(`${nameOf(el) || describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        tinyByWindow.set(win, entry);
      }
      if (wanted.has("unlabelled") && !nameOf(el) && !/range|file/.test(el.type || "")) add("unlabelled", { element: describe(el), window: win, rect: r.toJSON(), note: "no accessible name" });
      const inView = r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
      if (wanted.has("offscreen") && !inView) {
        let fixed = false;
        for (let p = el; p && p !== document.body; p = p.parentElement) {
          const pos = getComputedStyle(p).position;
          if (pos === "fixed") fixed = true;
        }
        let scrollable = false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) scrollable = true;
        }
        if (fixed && !scrollable) add("offscreen", { element: describe(el), name: nameOf(el), window: win, rect: r.toJSON(), note: "a fixed control lying wholly outside the viewport cannot be reached" });
      }
      if (wanted.has("occlusion") && inView) {
        const cx = Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2));
        const cy = Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2));
        const top = document.elementFromPoint(cx, cy);
        if (top && !clippedAway(el, cx, cy) && top !== el && !el.contains(top) && !top.contains(el) && !(el.labels && [...el.labels].some((l) => l.contains(top)))) {
          // A modal dialog (Foundry's own main menu, opened by Escape, is one) covers everything under it on purpose.
          if (top.closest("dialog[open]")) continue;
          // A full-screen overlay (the induction terminal) deliberately covers everything under it: that is a modal, not a fault.
          const overlay = top.closest(".application, .window-app, [id^=\"bi-\"]");
          if (overlay) {
            const o = overlay.getBoundingClientRect();
            if (o.width * o.height >= 0.85 * innerWidth * innerHeight) continue;
          }
          // An invisible, empty cover over a control is a swallower, whatever its size: a small one the grid cannot see is found here.
          if (wanted.has("clickthrough") && emptyTransparent(top)) {
            swallower(top).covers.push(nameOf(el) || describe(el));
            continue;
          }
          // Another window being on top of this one is ordinary stacking; the rest is not.
          const topWindow = top.closest(".application, .window-app");
          const ownWindow = el.closest(".application, .window-app");
          if (topWindow && topWindow !== ownWindow) continue;
          const kind = top.tagName === "CANVAS" ? "the scene canvas" : top.closest('[id^="bi-"]') ? "the adventure's own HUD (" + (top.closest('[id^="bi-"]').id) + ")" : "another element";
          add("occlusion", { element: describe(el), name: nameOf(el), window: win, coveredBy: describe(top), coveredByKind: kind, point: [Math.round(cx), Math.round(cy)], note: "the centre of this control is covered, so a click lands on the cover instead" });
        }
      }
    }
    for (const entry of tinyByWindow.values()) add("tiny", { ...entry, note: "controls under 24x24 CSS px are hard to hit (WCAG 2.2 target size)" });
  }

  for (const [el, s] of swallowers) {
    if (s.points >= 2 || s.covers.length) add("clickthrough", { element: describe(el), screenPoints: s.points, covers: s.covers.slice(0, 8), rect: el.getBoundingClientRect().toJSON(), note: "an empty transparent element wins the hit test: it swallows clicks meant for what is under it" });
  }

  if (wanted.has("overflow-x") && document.documentElement.scrollWidth > innerWidth + 2) add("overflow-x", { scrollWidth: document.documentElement.scrollWidth, innerWidth, note: "the page scrolls sideways" });

  if (wanted.has("clipped-text")) {
    let n = 0;
    for (const el of document.querySelectorAll(".application *, .window-app *, [id^='bi-'] *")) {
      if (n >= 30) break;
      if (!el.firstChild || el.children.length > 2 || !visible(el)) continue;
      const own = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim()).map((c) => c.textContent).join(" ");
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 2 && (cs.overflowX === "hidden" || cs.textOverflow === "ellipsis" || cs.overflowX === "clip")) {
        add("clipped-text", { element: describe(el), text: collapse(own).slice(0, 80), window: windowOf(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, note: "text is wider than its box and is cut off (heuristic: some clipping is deliberate ellipsis)" });
        n++;
      }
    }
  }
  return out;
}
