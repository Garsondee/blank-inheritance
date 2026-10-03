/**
 * The chalk probe: how the live check (foundry-check.mjs) sees and handles the box of chalk since chalk was painted
 * (2026-10-03, interface 0.5.0; chalk.md §11). It reads what the bench's chalk check reads (bench/chalk-check.mjs): the
 * wall's own pixels, the kit, the box, and here also the chalk journal and the GM's strip.
 *
 * `probe` is put into every page before Foundry's own scripts run (`installProbe`, page.evaluateOnNewDocument). It keeps
 * the stage's host, which the documented `stagecraft.stageReady` hook hands out (Foundry draws a scene before "ready", so a
 * hook set any later would miss it), and every `stagecraft.chalk` hook, which a painter's screen calls once a stroke is
 * kept in the world. The rest is the hand: real strokes, and real clicks on the box and the kit, each made only after
 * checking that nothing covers what it clicks.
 *
 * bench/live-chalk-check.mjs proves it, with the checks that use it (chalk-checks.mjs), against the module's real host on
 * the bench, without a licensed Foundry.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The page's half. It must stand alone: it is sent to the page as source text. */
export function probe() {
  const P = (globalThis.__chalkProbe = { host: null, kept: [], built: 0 });
  const listen = (tries) => {
    const hooks = globalThis.Hooks;
    if (typeof hooks?.on === "function") {
      hooks.on("stagecraft.stageReady", (host) => { P.host = host; P.built++; });
      hooks.on("stagecraft.chalk", (event) => { P.kept.push(event); });
      return;
    }
    if (tries > 0) setTimeout(() => listen(tries - 1), 5);
  };
  listen(24000);

  /** The host of the stage on screen now (the api's `stage()` says which), or null. */
  P.current = () => {
    const shown = globalThis.game?.modules?.get?.("stagecraft")?.api?.stage?.();
    return shown && P.host && P.host.stage === shown.stage ? P.host : null;
  };

  /**
   * The wall, as the next frame shows it. Since the evening of 2026-10-03 the wall lays new paint together once a frame
   * (`flush`), and a page in the background has no frames, so it is laid together here before it is read.
   */
  const laidWall = () => {
    const w = P.current()?.chalk?.wall ?? null;
    w?.flush?.();
    return w;
  };

  /** A short name for an element, to say what covers something. */
  P.describe = (el) => {
    if (!el) return "nothing";
    const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls}`;
  };

  /** The middle of an element, and whether a click there would reach it (or something inside it). */
  P.reach = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const top = box.width > 0 && box.height > 0 ? document.elementFromPoint(x, y) : null;
    return { x, y, reachable: !!top && (top === el || el.contains(top)), disabled: el.disabled === true, over: P.describe(top) };
  };

  /** Where a point of the painting (fractions) is in the window. */
  P.viewport = (fx, fy) => {
    const b = P.current()?.backend;
    if (!b?.rig || !b.view) return null;
    return { x: (b.rig.map.x(fx) - b.view.ox) * b.view.s, y: (b.rig.map.y(fy) - b.view.oy) * b.view.s };
  };

  /**
   * Where a real click lands on something in the box of chalk (a stick by its colour's name, "magic" or "eraser"): a point
   * where the stage picks that very thing and no other element covers the stage. `ok: false` says what covers it instead.
   */
  P.boxPoint = (item) => {
    const b = P.current()?.backend;
    if (!b?.ready) return null;
    const want = (hit) => (item === "magic" ? hit?.kind === "magic" : item === "eraser" ? hit?.kind === "eraser" : hit?.kind === "chalk" && hit.colour === item);
    let centre = null;
    if (b.name === "flat") {
      const layout = (b.order ?? []).find((d) => d.kind === "box")?.layout;
      const r = !layout ? null : item === "magic" ? layout.magic.hit : item === "eraser" ? layout.eraser.hit : layout.sticks.find((s) => s.colour === item)?.hit;
      if (r) centre = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
    } else {
      const target = (b.chalkBox?.sticks ?? []).find((s) => (item === "magic" ? s.userData.magic : item === "eraser" ? s.userData.eraser : s.userData.chalk === item));
      if (target) { const v = target.getWorldPosition(target.position.clone()); centre = b.project({ X: v.x, Y: v.y, Z: v.z }); }
    }
    if (!centre) return { ok: false, over: "no such thing in the box" };
    for (const [dx, dy] of [[0, 0], [0, -10], [0, 10], [-6, 0], [6, 0], [0, -20], [0, 20], [-10, -14], [10, -14], [0, -30], [0, 30]]) {
      const x = centre.x + dx;
      const y = centre.y + dy;
      if (want(b.pick(x, y)) && document.elementFromPoint(x, y) === b.canvas) return { ok: true, x, y };
    }
    const hit = b.pick(centre.x, centre.y);
    return { ok: false, x: centre.x, y: centre.y, over: P.describe(document.elementFromPoint(centre.x, centre.y)), picks: hit ? hit.kind + (hit.id ? ` ${hit.id}` : "") : "nothing" };
  };

  /**
   * The paint on the wall inside a box of painting fractions [x0, y0, x1, y1], read from the wall's own pixels: how many
   * pixels carry paint (alpha over 40) and their mean colour.
   */
  P.ink = (bx) => {
    const w = laidWall();
    if (!w) return null;
    const g = w.grid;
    const [x0, y0, x1, y1] = [bx[0] * g.w, bx[1] * g.h, bx[2] * g.w, bx[3] * g.h].map(Math.round);
    let n = 0;
    let r = 0;
    let gg = 0;
    let b = 0;
    for (const [key, tile] of w.composite) {
      const m = /^c(\d+)r(\d+)$/.exec(key);
      const tx = Number(m[1]) * g.tile;
      const ty = Number(m[2]) * g.tile;
      const ax = Math.max(x0, tx);
      const ay = Math.max(y0, ty);
      const bx2 = Math.min(x1, tx + tile.width);
      const by = Math.min(y1, ty + tile.height);
      if (bx2 <= ax || by <= ay) continue;
      const d = tile.getContext("2d").getImageData(ax - tx, ay - ty, bx2 - ax, by - ay).data;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { n++; r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    }
    return { inked: n, mean: n ? [Math.round(r / n), Math.round(gg / n), Math.round(b / n)] : null };
  };

  /** The tiles of the wall that carry any paint, by key (a tile a stroke touched and left empty does not count). */
  P.painted = () => {
    const w = laidWall();
    if (!w) return [];
    const some = (c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 3) return true; return false; };
    return [...w.composite].filter(([, c]) => some(c)).map(([key]) => key).sort();
  };

  /** The chalk journal's layers of a scene, as Foundry keeps them: [{ id, by, v, since, tiles: { key: picture }, steps: [{ id, at, who, keys }] }]. */
  P.pages = (sceneId) => {
    const entry = globalThis.game?.journal?.find((e) => e.getFlag("stagecraft", "chalk") === true);
    return Array.from(entry?.pages ?? []).map((pg) => ({ id: pg.id, d: pg.getFlag("stagecraft", "chalk") })).filter((x) => x.d?.scene === sceneId)
      .map(({ id, d }) => ({
        id, by: d.by, v: d.v, since: d.since, tiles: { ...(d.tiles ?? {}) },
        steps: Object.entries(d.history ?? {}).map(([sid, s]) => ({ id: sid, at: s?.at, who: s?.who, keys: Object.keys(s?.tiles ?? {}) })).sort((a, c) => (a.at ?? 0) - (c.at ?? 0))
      }));
  };

  /**
   * What the wall shows that the world does not keep, or the world keeps that the wall does not show: each painter's
   * tiles, as pictures. Empty when the two agree.
   */
  P.mismatch = (sceneId) => {
    const wall = P.current()?.chalk?.wall;
    if (!wall) return ["no stage"];
    const pages = P.pages(sceneId);
    const out = [];
    for (const pg of pages) {
      const layer = wall.layers.get(pg.by);
      for (const [key, picture] of Object.entries(pg.tiles)) if ((layer?.sources.get(key) ?? null) !== picture) out.push(`${pg.by} ${key}: kept, not shown`);
      for (const [key, picture] of layer?.sources ?? []) if (picture && pg.tiles[key] !== picture) out.push(`${pg.by} ${key}: shown, not kept`);
    }
    for (const [by, layer] of wall.layers) if (!pages.some((pg) => pg.by === by) && [...layer.sources.values()].some(Boolean)) out.push(`${by}: shown, never kept`);
    return out;
  };

  /** Is everything that has been kept on the wall, and nobody's stroke still being shown as it is painted? */
  P.settled = (sceneId) => {
    const c = P.current()?.chalk;
    return !!c && c.loading.size === 0 && c.remote.size === 0 && P.mismatch(sceneId).length === 0;
  };

  /**
   * Is the ring round the pointer drawn at a window point? It was a canvas the size of the screen, drawn again at every
   * move (its pixels within `r` are counted); since the evening of 2026-10-03 it is a small element moved to the pointer
   * (where it stands is read). Either way: { drawn, kind, ... }.
   */
  P.ring = (x, y, r = 30) => {
    const root = P.current()?.root;
    const cursor = root?.querySelector(".stagecraft-chalk-cursor");
    if (cursor) {
      const m = /translate3d\(\s*([-\d.]+)px,\s*([-\d.]+)px/.exec(cursor.style.transform ?? "");
      const at = m ? [Number(m[1]), Number(m[2])] : null;
      return { kind: "cursor", drawn: !cursor.hidden && !!at && Math.hypot(at[0] - x, at[1] - y) <= 3, at, blocked: cursor.classList.contains("blocked") };
    }
    const ring = root?.querySelector(".stagecraft-chalk-ring");
    if (!ring?.width) return { kind: "none", drawn: false };
    const ratio = ring.width / Math.max(1, ring.getBoundingClientRect().width);
    const x0 = Math.max(0, Math.round((x - r) * ratio));
    const y0 = Math.max(0, Math.round((y - r) * ratio));
    const w = Math.min(ring.width - x0, Math.round(2 * r * ratio));
    const h = Math.min(ring.height - y0, Math.round(2 * r * ratio));
    if (w <= 0 || h <= 0) return { kind: "canvas", drawn: false, pixels: 0 };
    const d = ring.getContext("2d").getImageData(x0, y0, w, h).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 30) n++;
    return { kind: "canvas", drawn: n > 20, pixels: n };
  };

  /** The plain picture's own pixels round a window point (a square `r` each way), as [r, g, b] each. */
  P.picture = (x, y, r = 1) => {
    const b = P.current()?.backend;
    if (b?.name !== "flat") return null;
    const ratio = b.canvas.width / Math.max(1, b.canvas.getBoundingClientRect().width);
    const d = b.canvas.getContext("2d").getImageData(Math.round((x - r) * ratio), Math.round((y - r) * ratio), 2 * r + 1, 2 * r + 1).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]);
    return out;
  };

  /** Everything else about the chalk that can be seen from outside the module. */
  P.state = () => {
    const h = P.current();
    if (!h) return null;
    laidWall();
    const c = h.chalk;
    const b = h.backend;
    const root = h.root;
    const shown = (el) => !!el && !el.closest("[hidden]") && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
    const kit = root?.querySelector(".stagecraft-kit");
    const hint = root?.querySelector(".stagecraft-chalk-hint");
    const bar = root?.querySelector(".stagecraft-bar:not(.stagecraft-blocking)");
    const key = root?.querySelector(".stagecraft-gm-toggle");
    const entry = globalThis.game?.journal?.find((e) => e.getFlag("stagecraft", "chalk") === true);
    return {
      backend: b?.name ?? null,
      tool: c?.inHand ?? null, colour: c?.colour ?? null, blocked: c?.blocked === true, drawing: !!c?.drawing,
      inHand: root?.classList.contains("stagecraft-chalk") === true,
      kit: shown(kit), magic: shown(kit?.querySelector(".kit-magic")), picker: shown(kit?.querySelector(".kit-pop-colour")),
      hint: shown(hint) ? hint.textContent : null,
      box: b?.name === "flat" ? b.boxShown === true : b?.chalkBox?.group?.visible === true,
      hidden: b?.name === "flat" ? b.hidden === true : b?.chalkTiles?.group?.visible === false,
      tiles3d: b?.chalkTiles ? [...b.chalkTiles.tiles.keys()].sort() : null,
      composite: c ? [...c.wall.composite.keys()].sort() : [],
      live: c ? c.wall.liveStrokes().map((s) => s.by) : [],
      policy: c?.policy() ?? null, override: h.scene?.flags?.stagecraft?.live?.chalk?.mode ?? null,
      strip: { buttons: bar ? [...bar.querySelectorAll("button")].map((x) => x.textContent) : [], shown: shown(bar), key: !!key, keyShown: shown(key) },
      journal: !!entry, ownership: entry?.ownership?.default ?? null,
      menu: globalThis.ui?.menu?.rendered === true
    };
  };
}

/** Put the probe into a page, from its next load on. */
export const installProbe = (page) => page.evaluateOnNewDocument(probe);

/** Wait for the stage on screen to be built and known to the probe. A stage built before the probe listened is built again. */
export async function stageHost(page, timeout = 60000) {
  const known = () => page.waitForFunction(() => globalThis.__chalkProbe?.current()?.backend?.ready === true && !!globalThis.__chalkProbe.current().chalk, { timeout, polling: 250 });
  try {
    await known();
  } catch {
    await page.evaluate(() => globalThis.canvas?.draw?.());
    await known();
  }
}

export const viewportOf = (page, fx, fy) => page.evaluate((x, y) => globalThis.__chalkProbe.viewport(x, y), fx, fy);
export const boxPoint = (page, item) => page.evaluate((i) => globalThis.__chalkProbe.boxPoint(i), item);
export const ink = (page, box) => page.evaluate((b) => globalThis.__chalkProbe.ink(b), box);
export const painted = (page) => page.evaluate(() => globalThis.__chalkProbe.painted());
export const pages = (page, sceneId) => page.evaluate((id) => globalThis.__chalkProbe.pages(id), sceneId);
export const mismatch = (page, sceneId) => page.evaluate((id) => globalThis.__chalkProbe.mismatch(id), sceneId);
export const chalkState = (page) => page.evaluate(() => globalThis.__chalkProbe.state());
export const keptCount = (page) => page.evaluate(() => globalThis.__chalkProbe.kept.length);
export const ringNear = (page, at) => page.evaluate((x, y) => globalThis.__chalkProbe.ring(x, y), at.x, at.y);

/** Wait until the wall shows exactly what the world keeps, with nothing loading and nobody's live stroke left. */
export async function settle(page, sceneId, timeout = 15000) {
  try {
    await page.waitForFunction((id) => globalThis.__chalkProbe.settled(id), { timeout, polling: 200 }, sceneId);
    return true;
  } catch {
    return false;
  }
}

/** Wait until this page has kept `n` strokes in the world in all (the `stagecraft.chalk` hook, called once each is kept). */
export async function waitKept(page, n, timeout = 15000) {
  try {
    await page.waitForFunction((k) => globalThis.__chalkProbe.kept.length >= k, { timeout, polling: 100 }, n);
    return true;
  } catch {
    return false;
  }
}

/** Wait for something in the page to come true; false if it never does. */
export async function until(page, fn, args = [], timeout = 15000) {
  try {
    await page.waitForFunction(fn, { timeout, polling: 200 }, ...args);
    return true;
  } catch {
    return false;
  }
}

/**
 * A real stroke with the mouse through painting points (fractions), in small steps. `keepDown` leaves the button down;
 * `midway` is called half way along, with the button still down (for a photograph of a stroke being painted).
 */
export async function stroke(page, points, { steps = 18, keepDown = false, midway = null } = {}) {
  const at = [];
  for (const [fx, fy] of points) at.push(await viewportOf(page, fx, fy));
  await page.mouse.move(at[0].x, at[0].y);
  await page.mouse.down();
  for (let k = 1; k < at.length; k++) {
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(at[k - 1].x + ((at[k].x - at[k - 1].x) * i) / steps, at[k - 1].y + ((at[k].y - at[k - 1].y) * i) / steps);
      await sleep(12);
    }
    if (midway && k === Math.ceil((at.length - 1) / 2)) await midway();
  }
  if (keepDown) return;
  await page.mouse.up();
  await sleep(400);
}

/** Take something from the box with a real click on it: a stick by its colour's name, "magic" or "eraser". */
export async function takeFromBox(page, item) {
  const at = await boxPoint(page, item);
  if (!at?.ok) return at ?? { ok: false, over: "no stage" };
  await page.mouse.move(at.x, at.y);
  await sleep(60);
  await page.mouse.down();
  await page.mouse.up();
  await sleep(250);
  return at;
}

/**
 * A real click on an element (the kit, the GM's strip, its key), once nothing covers it: a notification passing over it is
 * waited out (Foundry's stay about five seconds). `count: 3` is a triple click. Returns where it clicked, or why it could not.
 */
export async function clickOn(page, selector, { count = 1, wait = 6000 } = {}) {
  const t0 = Date.now();
  let r = null;
  for (;;) {
    r = await page.evaluate((s) => globalThis.__chalkProbe.reach(s), selector);
    if (r?.reachable || Date.now() - t0 > wait) break;
    await sleep(200);
  }
  if (!r?.reachable || r.disabled) return r ?? { reachable: false, over: `no ${selector}` };
  await page.mouse.move(r.x, r.y);
  await sleep(50);
  await page.mouse.click(r.x, r.y, { count });
  await sleep(300);
  return r;
}

/** A key pressed with others held: chord(page, "KeyZ", ["Control", "Shift"]). */
export async function chord(page, key, held = []) {
  for (const k of held) await page.keyboard.down(k);
  await page.keyboard.press(key);
  for (const k of [...held].reverse()) await page.keyboard.up(k);
}

/** Keys reach the stage, not a text box that last had the focus (Foundry's chat, say). */
export const focusStage = (page) => page.evaluate(() => { const a = document.activeElement; if (a?.closest?.("input, textarea, [contenteditable]")) a.blur(); });

/** Is a mean colour within `tolerance` of a "#rrggbb"? */
export function colourNear(mean, hex, tolerance = 40) {
  if (!mean) return false;
  const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.hypot(...want.map((v, i) => v - mean[i])) <= tolerance;
}

/** Do two lists hold the same things? */
export const sameSet = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
