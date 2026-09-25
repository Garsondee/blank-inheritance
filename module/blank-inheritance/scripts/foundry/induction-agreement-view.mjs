/**
 * The induction terminal's page 2: FORM 1-B, the Service Agreement, drawn onto a canvas.
 *
 * Why a canvas: the brief (Ingram, 2026-09-25) is an agreement "designed to be hard to read" that players
 * click past, with things buried in it for later, and "we also do our best to make it so that the text
 * can't be copied and pasted". So the text never exists in the DOM: there is nothing to select, copy,
 * or read out of the page with dev tools' element panel. The file it comes from is packed too (see
 * core/agreement-codec.mjs). This is a best effort, not a guarantee -- a screenshot and OCR still work.
 *
 * Only the lines in view are drawn (a virtual scroller: a sticky canvas over a tall spacer), so a
 * 57,000-word document scrolls smoothly. Zoom is always available (buttons and Ctrl+wheel), because
 * "hard to read" is the joke's density and length, never a barrier for a player who needs larger type.
 */

import { unpack, decodeUtf8 } from "../core/agreement-codec.mjs";
import { layout, visibleRange, STYLES } from "../core/agreement-layout.mjs";

export const AGREEMENT_ASSET = "assets/induction/agreement.dat";
const BASE_EM = 11;
const ZOOMS = [0.9, 1, 1.15, 1.35, 1.6, 1.9];

let cached = null;

/**
 * The product of every ancestor's CSS zoom (currentCSSZoom where the browser has it). The terminal
 * scales itself with CSS zoom on big screens, so anything that turns screen pixels into its own CSS
 * pixels -- this viewer's canvas resolution, the portrait cropper's drag -- divides by this.
 */
export function effectiveZoom(el) {
  if (typeof el.currentCSSZoom === "number") return el.currentCSSZoom || 1;
  let z = 1;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) z *= parseFloat(getComputedStyle(n).zoom) || 1;
  return z;
}

/** Fetches, unpacks and inflates the agreement once per client. `fetchText` is io.mjs's fetchModuleText. */
export function loadAgreement(fetchText) {
  cached ??= (async () => {
    const packed = unpack(await fetchText(AGREEMENT_ASSET));
    if (typeof DecompressionStream !== "function") throw new Error("This browser can't open the Agreement (no DecompressionStream).");
    const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    const doc = JSON.parse(decodeUtf8(bytes));
    if (!Array.isArray(doc?.blocks)) throw new Error("The Agreement file is malformed.");
    return doc;
  })();
  cached.catch(() => { cached = null; });
  return cached;
}

/**
 * Mounts the viewer inside `root` (the page element). Expects [data-agreement-viewport] containing
 * [data-agreement-canvas] and [data-agreement-spacer], plus optional [data-agreement-zoom="in|out"]
 * buttons. Returns { stats(), destroy() }.
 */
export function mountAgreementView(root, doc) {
  const viewport = root.querySelector("[data-agreement-viewport]");
  const canvas = root.querySelector("[data-agreement-canvas]");
  const spacer = root.querySelector("[data-agreement-spacer]");
  if (!viewport || !canvas || !spacer) throw new Error("Agreement view: missing viewport/canvas/spacer");
  const ctx = canvas.getContext("2d");
  const css = getComputedStyle(root);
  const fontFamily = css.getPropertyValue("--bi-font-document").trim() || "Georgia, serif";
  const ink = css.getPropertyValue("--bi-paper-ink").trim() || "#2a2319";
  const ink2 = css.getPropertyValue("--bi-paper-ink-2").trim() || "#5b4f3c";
  const rule = css.getPropertyValue("--bi-paper-rule").trim() || "#8d7c56";
  const started = performance.now();
  let zoomIndex = 1;
  let laid = { lines: [], height: 0 };
  let furthest = 0;
  let frame = 0;

  const fontFor = (styleName) => {
    const st = STYLES[styleName] ?? STYLES.p;
    const px = BASE_EM * ZOOMS[zoomIndex] * st.size;
    return `${st.italic ? "italic " : ""}${st.weight === "bold" ? "700 " : "400 "}${px.toFixed(2)}px ${fontFamily}`;
  };
  const measure = (text, styleName) => { ctx.font = fontFor(styleName); return ctx.measureText(text).width; };

  function relayout() {
    const fraction = viewport.scrollHeight > viewport.clientHeight ? viewport.scrollTop / (viewport.scrollHeight - viewport.clientHeight) : 0;
    // The terminal scales itself with CSS zoom on large screens; the backing store has to follow or the
    // text is drawn at 1x and stretched (blurry) to the zoomed size.
    const dpr = (window.devicePixelRatio || 1) * effectiveZoom(viewport);
    const w = viewport.clientWidth, h = viewport.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = 28 * ZOOMS[zoomIndex];
    laid = layout(doc.blocks, { width: w - pad * 2, em: BASE_EM * ZOOMS[zoomIndex], measure });
    laid.pad = pad;
    spacer.style.height = `${Math.max(0, laid.height + pad * 2 - h)}px`;
    viewport.scrollTop = fraction * Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    draw();
  }

  function draw() {
    frame = 0;
    const w = viewport.clientWidth, h = viewport.clientHeight, top = viewport.scrollTop, pad = laid.pad ?? 0;
    ctx.clearRect(0, 0, w, h);
    const [a, b] = visibleRange(laid.lines, top - pad, h);
    const em = BASE_EM * ZOOMS[zoomIndex];
    for (let i = a; i < b; i++) {
      const ln = laid.lines[i];
      const st = STYLES[ln.style] ?? STYLES.p;
      const lh = em * st.size * 1.35;
      const y = ln.y - top + pad;
      const baseline = y + lh * 0.78;
      if (ln.box) {
        const x0 = pad + ln.x - em * 0.8, x1 = pad + ln.x + ln.width + em * 0.8;
        ctx.fillStyle = "rgba(255, 250, 235, 0.55)";
        ctx.fillRect(x0, y - (ln.box.first ? em * 0.6 : 0), x1 - x0, lh + (ln.box.first ? em * 0.6 : 0) + (ln.box.last ? em * 0.6 : 0));
        ctx.strokeStyle = rule;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ln.box.first) { ctx.moveTo(x0, y - em * 0.6); ctx.lineTo(x1, y - em * 0.6); }
        ctx.moveTo(x0, y - (ln.box.first ? em * 0.6 : 0)); ctx.lineTo(x0, y + lh + (ln.box.last ? em * 0.6 : 0));
        ctx.moveTo(x1, y - (ln.box.first ? em * 0.6 : 0)); ctx.lineTo(x1, y + lh + (ln.box.last ? em * 0.6 : 0));
        if (ln.box.last) { ctx.moveTo(x0, y + lh + em * 0.6); ctx.lineTo(x1, y + lh + em * 0.6); }
        ctx.stroke();
      }
      ctx.font = fontFor(ln.style);
      ctx.fillStyle = ln.style === "row" || ln.style === "subtitle" ? ink2 : ink;
      if (ln.num) ctx.fillText(ln.num.text, pad + ln.num.x, baseline);
      const x = pad + ln.x;
      if (ln.align === "center") {
        ctx.fillText(ln.text, x + (ln.width - ctx.measureText(ln.text).width) / 2, baseline);
      } else if (ln.justify) {
        const words = ln.text.split(" ");
        const natural = words.reduce((s, wd) => s + ctx.measureText(wd).width, 0);
        const gap = (ln.width - natural) / (words.length - 1);
        let cx = x;
        for (const wd of words) { ctx.fillText(wd, cx, baseline); cx += ctx.measureText(wd).width + gap; }
      } else ctx.fillText(ln.text, x, baseline);
    }
    const seen = (top + h) / Math.max(1, viewport.scrollHeight);
    if (seen > furthest) furthest = Math.min(1, seen);
  }

  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const zoom = (delta) => {
    const next = Math.min(ZOOMS.length - 1, Math.max(0, zoomIndex + delta));
    if (next !== zoomIndex) { zoomIndex = next; relayout(); }
  };

  // Nothing here can be selected, copied, dragged or right-clicked. The keyboard shortcuts are
  // swallowed only while focus is inside the page, so the rest of Foundry is unaffected.
  const block = (event) => { event.preventDefault(); event.stopPropagation(); };
  const onKey = (event) => {
    if ((event.ctrlKey || event.metaKey) && ["c", "x", "a", "s", "p"].includes(event.key.toLowerCase())) block(event);
    else if (event.key === "+" || event.key === "=") { if (event.ctrlKey || event.metaKey) { block(event); zoom(1); } }
    else if (event.key === "-") { if (event.ctrlKey || event.metaKey) { block(event); zoom(-1); } }
  };
  const onWheel = (event) => { if (event.ctrlKey) { block(event); zoom(event.deltaY < 0 ? 1 : -1); } };
  const onZoomButton = (event) => { const dir = event.currentTarget.dataset.agreementZoom; zoom(dir === "in" ? 1 : -1); };
  const blocked = ["copy", "cut", "contextmenu", "selectstart", "dragstart"];
  for (const type of blocked) root.addEventListener(type, block);
  root.addEventListener("keydown", onKey);
  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("scroll", schedule, { passive: true });
  const zoomButtons = [...root.querySelectorAll("[data-agreement-zoom]")];
  for (const btn of zoomButtons) btn.addEventListener("click", onZoomButton);
  const resize = new ResizeObserver(() => relayout());
  resize.observe(viewport);

  (document.fonts?.ready ?? Promise.resolve()).then(() => relayout());
  relayout();

  return {
    stats: () => ({ secondsOnPage: Math.round((performance.now() - started) / 1000), furthestRead: Math.round(furthest * 1000) / 1000 }),
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      for (const type of blocked) root.removeEventListener(type, block);
      root.removeEventListener("keydown", onKey);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("scroll", schedule);
      for (const btn of zoomButtons) btn.removeEventListener("click", onZoomButton);
    },
  };
}
