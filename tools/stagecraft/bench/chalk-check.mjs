/**
 * The chalk check: the module's real host, chalk controller, kit, painted wall and both pictures (tools/stagecraft/bench/
 * host.html, with an in-memory store in place of the world journal, shared between the page's tabs as Foundry shares a
 * journal), driven in headless Chrome with a real graphics card, real mouse strokes, real clicks on the kit and real keys.
 * It reads the wall's own pixels to prove what each tool did. Since 2026-10-03 chalk is painted, not drawn as lines
 * (chalk.md §11); this proves:
 *
 *   - a "zones only" scene (Kit Issue: the back wall): a stick is taken from the box with a real click and the kit comes
 *     out; outside the zone the chalk says it would leave no mark and a stroke there leaves nothing; on the wall a stroke
 *     leaves paint of the stick's colour, which is kept and shown by the 3D picture;
 *   - an "anywhere" scene (the Paper Lantern): magic chalk in a colour typed into the kit; the pencil is finer than the
 *     chalk; spray, brush; the eraser takes paint away; Ctrl+Z puts it back and Ctrl+Shift+Z takes it away again; a closed
 *     shape is filled with one click; a smudge drags paint; Alt-click takes a colour off the wall; ] makes the tip bigger;
 *   - two screens: a player's stroke shows on the GM's screen while it is being painted, and gives way to the kept paint;
 *     the player's Ctrl+Z takes it off the GM's screen too; a player's eraser cannot touch the GM's paint;
 *   - the plain 2D picture shows paint too.
 *
 *   node tools/stagecraft/bench/chalk-check.mjs        (starts its own little web server on port 4194)
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const PORT = 4194;
const SHOTS = path.join(repo, "design", "stagecraft", "lab", "shots", "bench");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => { results.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const server = spawn("py", [path.join(repo, "tools", "induction-terminal", "serve.py"), String(PORT)], { stdio: "ignore" });
const up = async () => { try { return (await fetch(`http://127.0.0.1:${PORT}/`)).ok; } catch { return false; } };
for (let i = 0; i < 50 && !(await up()); i++) await sleep(200);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--window-size=1920,1080"],
  defaultViewport: { width: 1920, height: 1080 }
});

/** Open a stage and wait for it. */
async function open(stage, { seat = "gm", tier = null } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=${stage}${seat === "player" ? "&seat=player" : ""}${tier ? `&tier=${tier}` : ""}`);
  await page.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* fine */ } });
  await sleep(1200);
  return { page, errors };
}

/** Where a point of the painting (fractions) is in the viewport. */
const viewportOf = (page, fx, fy) => page.evaluate(([x, y]) => {
  const b = window.bench.host.backend;
  return { x: (b.rig.map.x(x) - b.view.ox) * b.view.s, y: (b.rig.map.y(y) - b.view.oy) * b.view.s };
}, [fx, fy]);

/** A real stroke with the mouse through painting points (fractions), in small steps. `keepDown` leaves the button down. */
async function stroke(page, points, { steps = 18, keepDown = false } = {}) {
  const at = [];
  for (const p of points) at.push(await viewportOf(page, ...p));
  await page.mouse.move(at[0].x, at[0].y);
  await page.mouse.down();
  for (let k = 1; k < at.length; k++) {
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(at[k - 1].x + ((at[k].x - at[k - 1].x) * i) / steps, at[k - 1].y + ((at[k].y - at[k - 1].y) * i) / steps);
      await sleep(12);
    }
  }
  if (keepDown) return;
  await page.mouse.up();
  await sleep(400);
}

/** A real click at a painting point, with keys held. */
async function clickAt(page, fx, fy, keys = []) {
  const p = await viewportOf(page, fx, fy);
  for (const k of keys) await page.keyboard.down(k);
  await page.mouse.click(p.x, p.y);
  for (const k of keys) await page.keyboard.up(k);
  await sleep(400);
}

/**
 * The paint on the wall inside a box of painting fractions, read from the wall's own pixels: how many pixels carry paint
 * (alpha over 40) and their mean colour.
 */
const ink = (page, box) => page.evaluate((bx) => {
  const w = window.bench.host.chalk.wall;
  w.flush();                 // laid together once a frame, and a page in the background has no frames: as it would show
  const g = w.grid;
  const [x0, y0, x1, y1] = [bx[0] * g.w, bx[1] * g.h, bx[2] * g.w, bx[3] * g.h].map(Math.round);
  let n = 0;
  let r = 0;
  let gg = 0;
  let b = 0;
  let mass = 0;
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
    for (let i = 0; i < d.length; i += 4) { mass += d[i + 3]; if (d[i + 3] > 40) { n++; r += d[i]; gg += d[i + 1]; b += d[i + 2]; } }
  }
  // `mass` is all the paint there is (every pixel's alpha), which lossy storage barely moves; `inked` counts pixels past a threshold
  return { inked: n, mass: Math.round(mass / 255), mean: n ? [Math.round(r / n), Math.round(gg / n), Math.round(b / n)] : null };
}, box);

/** Take something from the box with a real click on it: a stick by its index, "magic" or "eraser". */
async function takeFromBox(page, which = 0) {
  const at = await page.evaluate((w) => {
    const b = window.bench.host.backend;
    if (b.name === "flat") {
      const layout = b.order.find((d) => d.kind === "box")?.layout;
      const r = w === "magic" ? layout.magic.hit : w === "eraser" ? layout.eraser.hit : layout.sticks[w].hit;
      return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
    }
    const all = b.chalkBox.sticks;
    const target = w === "magic" ? all.find((s) => s.userData.magic) : w === "eraser" ? all.find((s) => s.userData.eraser) : all.filter((s) => s.userData.chalk)[w];
    const v = target.getWorldPosition(target.position.clone());
    const p = b.project({ X: v.x, Y: v.y, Z: v.z });
    return { x: p.x, y: p.y };
  }, which);
  await page.mouse.click(at.x, at.y);
  await sleep(250);
  return page.evaluate(() => window.bench.host.chalk.inHand);
}

const hand = (page) => page.evaluate(() => { const c = window.bench.host.chalk; return { tool: c.inHand, colour: c.colour, size: c.sizes[c.inHand] }; });
const kitShown = (page) => page.evaluate(() => { const k = document.querySelector(".stagecraft-kit"); return !!k && !k.hidden && k.getBoundingClientRect().width > 40; });
const kept = (page, by = null) => page.evaluate((who) => window.bench.host.chalk.store.layers(window.bench.scene.id).filter((l) => !who || l.by === who).reduce((n, l) => n + Object.keys(l.tiles).length, 0), by);

try {
  /* ------------------------------------------------ a "zones only" scene */
  const kit = await open("e1-kit-issue");
  check("Kit Issue keeps chalk to its back wall (zones only)", await kit.page.evaluate(() => window.bench.host.chalk.policy().mode === "zones"));
  check("the chalk zone is not drawn while nobody holds chalk", await kit.page.evaluate(() => /back-wall:rest:0\.00/.test(window.bench.host.backend.zones.key)));
  const taken = await takeFromBox(kit.page, 0);
  check("a real click on the box puts a stick of chalk in hand", taken === "chalk", String(taken));
  check("and the kit of tools comes out with it", await kitShown(kit.page));
  const floor = await viewportOf(kit.page, 0.3, 0.9);
  await kit.page.mouse.move(floor.x, floor.y);
  await sleep(250);
  const outside = await kit.page.evaluate(() => {
    const h = window.bench.host;
    const hint = h.root.querySelector(".stagecraft-chalk-hint");
    return { blocked: h.chalk.blocked, hint: hint && !hint.hidden ? hint.textContent : null, zones: h.backend.zones.key };
  });
  check("outside the chalk zone the chalk says it will leave no mark", outside.blocked === true);
  check("and a line by the pointer names where chalk goes", /The wall over the bench/.test(outside.hint ?? ""), outside.hint ?? "(none)");
  check("while chalk is in hand the chalk zone is lit and named", /back-wall:(near|target)/.test(outside.zones), outside.zones);
  await stroke(kit.page, [[0.25, 0.88], [0.4, 0.92]]);
  const none = await ink(kit.page, [0.2, 0.8, 0.45, 1]);
  check("a stroke outside the chalk zone leaves nothing", none.inked === 0 && (await kept(kit.page)) === 0, JSON.stringify(none));
  await stroke(kit.page, [[0.45, 0.205], [0.66, 0.245]]);
  const mark = await ink(kit.page, [0.43, 0.18, 0.68, 0.27]);
  check("a stroke on the wall over the bench leaves paint, in the stick's colour", mark.inked > 400 && mark.mean.every((c) => c > 190), JSON.stringify(mark));
  // kept a moment later: its pictures are made by a worker, which the first stroke of a page has to start
  await kit.page.waitForFunction(() => window.bench.host.chalk.store.layers(window.bench.scene.id).some((l) => Object.keys(l.tiles).length), { timeout: 5000 }).catch(() => {});
  check("it is kept, and the 3D picture shows it", (await kept(kit.page)) > 0 && (await kit.page.evaluate(() => window.bench.host.backend.chalkTiles.tiles.size)) > 0);
  // the GM's moderation: who painted what is at a place on the wall, and who has painted here at all
  const who = await kit.page.evaluate(() => {
    const h = window.bench.host;
    const g = h.chalk.grid;
    return { on: h.chalk.wall.whoAt(0.55 * g.w, 0.225 * g.h), off: h.chalk.wall.whoAt(0.05 * g.w, 0.95 * g.h), painters: h.chalk.painters().map((p) => [p.by, p.name, p.tiles > 0]) };
  });
  check("the wall says who painted what is at a place on it, and nobody where there is nothing", who.on === who.painters[0]?.[0] && who.off === null, JSON.stringify(who));
  check("and the GM can list who has painted here, by name", who.painters.length === 1 && who.painters[0][2] === true && typeof who.painters[0][1] === "string");
  // with the chalk put away, the pointer resting on the paint says who painted it; away from it, nothing
  await kit.page.evaluate(() => window.bench.host.chalk.putAway());
  const paintSpot = await viewportOf(kit.page, 0.55, 0.225);
  await kit.page.mouse.move(paintSpot.x - 3, paintSpot.y - 2);
  await kit.page.mouse.move(paintSpot.x, paintSpot.y);
  await sleep(900);
  const said = await kit.page.evaluate(() => document.querySelector(".stagecraft-tip.shown")?.textContent ?? null);
  check("the pointer resting on the paint says who painted it", /Painted by \S/.test(said ?? ""), String(said));
  await kit.page.mouse.move(paintSpot.x, paintSpot.y + 260);
  await sleep(300);
  check("and the tip goes when the pointer moves off the paint", (await kit.page.evaluate(() => document.querySelector(".stagecraft-tip.shown"))) === null);
  check("no page threw (Kit Issue)", kit.errors.length === 0, kit.errors.slice(0, 2).join(" | "));
  await kit.page.screenshot({ path: path.join(SHOTS, "chalk-kit-issue.jpg"), type: "jpeg", quality: 88 });
  await kit.page.close();

  /* ------------------------------------------------ an "anywhere" scene: every tool */
  const lantern = await open("haunt-the-paper-lantern");
  const L = lantern.page;
  check("the Paper Lantern lets chalk go anywhere", await L.evaluate(() => window.bench.host.chalk.policy().mode === "anywhere"));
  check("the magic stick in the box gives magic chalk", (await takeFromBox(L, "magic")) === "magic");
  check("and its tricks show in the kit", await L.evaluate(() => !document.querySelector(".stagecraft-kit .kit-magic").hidden));
  await L.click(".stagecraft-kit .kit-well");
  await sleep(150);
  check("the colour well opens the picker", await L.evaluate(() => !document.querySelector(".stagecraft-kit .kit-pop-colour").hidden));
  await L.click(".stagecraft-kit .kit-hex", { clickCount: 3 });
  await L.keyboard.type("#ff3366");
  await L.keyboard.press("Enter");
  await sleep(150);
  check("a colour typed into the kit is the colour in hand", (await hand(L)).colour === "#ff3366", JSON.stringify(await hand(L)));
  await L.click(".stagecraft-kit .kit-well");                                   // close the picker
  const A = [0.12, 0.26, 0.32, 0.36];
  await stroke(L, [[0.14, 0.31], [0.3, 0.31]]);
  const a = await ink(L, A);
  check("magic chalk paints in its colour", a.inked > 600 && a.mean[0] > a.mean[1] + 60 && a.mean[0] > a.mean[2] + 30, JSON.stringify(a));

  await L.click('.stagecraft-kit [data-tool="pencil"]');
  await sleep(100);
  check("the kit changes the tool", (await hand(L)).tool === "pencil");
  const B = [0.12, 0.4, 0.32, 0.48];
  await stroke(L, [[0.14, 0.44], [0.3, 0.44]]);
  const bInk = await ink(L, B);
  check("the pencil draws a fine line, much finer than the chalk", bInk.inked > 80 && bInk.inked < a.inked * 0.45, `${bInk.inked} against ${a.inked}`);

  // Ingram, 2026-10-03: "Chalk is really good but very laggy". The worst of it was the end of every stroke, when its tiles
  // were read back from the graphics card and encoded on the main thread. They are snapshotted and handed to a worker now:
  // a stroke, painted and kept, makes the main thread read no canvas back and encode none.
  await L.evaluate(() => {
    const counts = (window.__mainThread = { getImageData: 0, toBlob: 0, toDataURL: 0 });
    const count = (proto, name) => { const f = proto[name]; proto[name] = function (...a) { counts[name]++; return f.apply(this, a); }; };
    count(CanvasRenderingContext2D.prototype, "getImageData");
    count(HTMLCanvasElement.prototype, "toBlob");
    count(HTMLCanvasElement.prototype, "toDataURL");
  });
  const keptBefore = await L.evaluate(() => Object.values(window.bench.host.chalk.store.layers(window.bench.scene.id)[0]?.history ?? {}).length);
  await stroke(L, [[0.42, 0.52], [0.56, 0.55]]);
  await sleep(800);
  const thread = await L.evaluate(() => window.__mainThread);
  const keptAfter = await L.evaluate(() => Object.values(window.bench.host.chalk.store.layers(window.bench.scene.id)[0]?.history ?? {}).length);
  check("a stroke is painted and kept without the main thread reading a canvas back or encoding one", thread.getImageData + thread.toBlob + thread.toDataURL === 0 && keptAfter > keptBefore, `${JSON.stringify(thread)}, steps ${keptBefore} -> ${keptAfter}`);

  await L.click('.stagecraft-kit [data-tool="spray"]');
  await stroke(L, [[0.42, 0.3], [0.56, 0.32]]);
  const sprayed = await ink(L, [0.38, 0.22, 0.6, 0.4]);
  check("the spray leaves a cloud of specks", sprayed.inked > 300, JSON.stringify(sprayed));

  await L.click('.stagecraft-kit [data-tool="brush"]');
  await stroke(L, [[0.42, 0.46], [0.56, 0.48]]);
  const brushed = await ink(L, [0.38, 0.4, 0.6, 0.55]);
  check("the brush lays soft, broad paint", brushed.inked > 1500, JSON.stringify(brushed));

  // what is kept in the world is light (chalk.md §11.2): WebP, its alpha rounded to 64 steps, a few KB a tile
  const pictures = await L.evaluate(async () => {
    const layer = window.bench.host.chalk.store.layers(window.bench.scene.id).find((l) => l.by === game.user.id);
    const urls = Object.values(layer?.tiles ?? {});
    const alphas = new Set();
    for (const url of urls.slice(0, 6)) {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) alphas.add(d[i]);
    }
    return { n: urls.length, webp: urls.every((u) => u.startsWith("data:image/webp")), alphaLevels: alphas.size, kbPerTile: Math.round(urls.reduce((n, u) => n + u.length, 0) / Math.max(1, urls.length) / 1024) };
  });
  check("kept pictures are WebP with their alpha rounded to 64 steps, a few KB a tile", pictures.n > 0 && pictures.webp && pictures.alphaLevels > 8 && pictures.alphaLevels <= 66 && pictures.kbPerTile < 16, JSON.stringify(pictures));

  // the eraser (28 pixels across) swipes down through the stroke; along its path (20 pixels wide) the paint is gone
  const swipe = [0.2165, 0.26, 0.2235, 0.36];
  const under = await ink(L, swipe);
  await L.click('.stagecraft-kit [data-tool="eraser"]');
  await stroke(L, [[0.22, 0.24], [0.22, 0.38]]);
  const rubbed = await ink(L, swipe);
  check("the eraser takes the paint away where it passes", under.inked > 100 && rubbed.inked < under.inked * 0.05, `${under.inked} then ${rubbed.inked}`);
  check("and leaves the rest", (await ink(L, A)).inked > a.inked * 0.8);
  await L.keyboard.down("Control");
  await L.keyboard.press("KeyZ");
  await L.keyboard.up("Control");
  await sleep(500);
  const back = await ink(L, swipe);
  // what is put back is the kept picture, which is lossy WebP: the paint is back to within a pixel here and there at its edge
  check("Ctrl+Z puts it back", Math.abs(back.mass - under.mass) <= Math.max(3, under.mass * 0.03), `${back.mass} of ${under.mass} (${back.inked} of ${under.inked} pixels)`);
  await L.keyboard.down("Control");
  await L.keyboard.down("Shift");
  await L.keyboard.press("KeyZ");
  await L.keyboard.up("Shift");
  await L.keyboard.up("Control");
  await sleep(500);
  check("and Ctrl+Shift+Z takes it away again", (await ink(L, swipe)).inked < under.inked * 0.05);

  // a closed shape, then the fill
  await L.click('.stagecraft-kit [data-tool="chalk"]');
  await stroke(L, [[0.62, 0.6], [0.76, 0.6], [0.76, 0.74], [0.62, 0.74], [0.62, 0.6]], { steps: 14 });
  const inner = [0.645, 0.63, 0.735, 0.71];
  const empty = await ink(L, inner);
  await L.click('.stagecraft-kit [data-tool="fill"]');
  await clickAt(L, 0.69, 0.67);
  const filled = await ink(L, inner);
  const area = await L.evaluate((bx) => { const g = window.bench.host.chalk.wall.grid; return Math.round((bx[2] - bx[0]) * g.w) * Math.round((bx[3] - bx[1]) * g.h); }, inner);
  check("one click of the fill fills a closed shape", empty.inked < area * 0.05 && filled.inked > area * 0.9, `${empty.inked} then ${filled.inked} of ${area}`);
  await clickAt(L, 0.9, 0.12);
  check("and a fill where no shape closes round the point does nothing", (await ink(L, [0.85, 0.05, 0.95, 0.2])).inked === 0);

  await L.click('.stagecraft-kit [data-tool="smudge"]');
  const beyond = [0.77, 0.64, 0.84, 0.7];
  const before = await ink(L, beyond);
  await stroke(L, [[0.7, 0.67], [0.83, 0.67]]);
  const after = await ink(L, beyond);
  check("a smudge drags the paint along", after.inked > before.inked + 200, `${before.inked} then ${after.inked}`);

  await L.click('.stagecraft-kit [data-tool="chalk"]');
  await clickAt(L, 0.69, 0.67, ["Alt"]);
  const picked = (await hand(L)).colour;
  const dist = Math.hypot(...[1, 3, 5].map((i, k) => parseInt(picked.slice(i, i + 2), 16) - [0xff, 0x33, 0x66][k]));
  check("Alt-click takes the colour off the wall", dist < 60, `${picked}`);
  const s0 = (await hand(L)).size;
  for (let i = 0; i < 3; i++) await L.keyboard.press("]");
  check("] makes the tip bigger", (await hand(L)).size > s0, `${s0} -> ${(await hand(L)).size}`);
  check("no page threw (the Paper Lantern)", lantern.errors.length === 0, lantern.errors.slice(0, 2).join(" | "));
  const p = await viewportOf(L, 0.5, 0.5);
  await L.mouse.move(p.x, p.y);
  await sleep(200);
  await L.screenshot({ path: path.join(SHOTS, "chalk-lantern.jpg"), type: "jpeg", quality: 88 });
  await L.close();

  /* ------------------------------------------------ two screens */
  const gm = await open("haunt-the-paper-lantern");
  const pl = await open("haunt-the-paper-lantern", { seat: "player" });
  await takeFromBox(pl.page, 3);
  await pl.page.bringToFront();
  await stroke(pl.page, [[0.2, 0.3], [0.34, 0.33]], { keepDown: true });
  await sleep(300);
  const live = await gm.page.evaluate(() => [...window.bench.host.chalk.wall.strokes.values()].filter((s) => s.live && s.by === "p1").length);
  check("a player's stroke shows on the GM's screen while it is being painted", live === 1, `${live} live`);
  await pl.page.mouse.up();
  await sleep(900);
  const settled = await gm.page.evaluate(() => ({ live: window.bench.host.chalk.wall.strokes.size, tiles: window.bench.host.chalk.wall.layers.get("p1")?.tiles.size ?? 0 }));
  const seen = await ink(gm.page, [0.18, 0.26, 0.36, 0.37]);
  check("and gives way to the kept paint when the stroke ends", settled.live === 0 && settled.tiles > 0 && seen.inked > 400, `${JSON.stringify(settled)} ${seen.inked}`);
  await pl.page.keyboard.down("Control");
  await pl.page.keyboard.press("KeyZ");
  await pl.page.keyboard.up("Control");
  await sleep(800);
  check("the player's Ctrl+Z takes it off the GM's screen too", (await ink(gm.page, [0.18, 0.26, 0.36, 0.37])).inked === 0);
  await gm.page.bringToFront();
  await takeFromBox(gm.page, 0);
  await stroke(gm.page, [[0.5, 0.5], [0.64, 0.52]]);
  const gmInk = await ink(pl.page, [0.48, 0.46, 0.66, 0.56]);
  await pl.page.bringToFront();
  await takeFromBox(pl.page, "eraser");
  await stroke(pl.page, [[0.57, 0.44], [0.57, 0.58]]);
  await sleep(600);
  const still = await ink(gm.page, [0.48, 0.46, 0.66, 0.56]);
  check("a player's eraser cannot touch the GM's paint", gmInk.inked > 400 && still.inked >= gmInk.inked * 0.99, `${gmInk.inked} then ${still.inked}`);
  check("no page threw (two screens)", gm.errors.length === 0 && pl.errors.length === 0, [...gm.errors, ...pl.errors].slice(0, 2).join(" | "));
  await gm.page.close();
  await pl.page.close();

  /* ------------------------------------------------ the box keeps clear of what covers the stage */
  // found live 2026-10-03: on the GM's screen the adventure's deck and Foundry's macro bar lay over the box, and the magic
  // stick and the eraser could not be clicked. A deck along the bottom fifth of the screen is laid over the bench's stage.
  const covered = await open("haunt-the-paper-lantern");
  const C = covered.page;
  const magicWas = await C.evaluate(() => { const b = window.bench.host.backend; const t = b.chalkBox.sticks.find((s) => s.userData.magic); const v = t.getWorldPosition(t.position.clone()); return b.project({ X: v.x, Y: v.y, Z: v.z }).y; });
  await C.evaluate(async () => {
    const { registerCover } = await import("/module/stagecraft/scripts/foundry/blocking.mjs");
    const deck = document.createElement("div");
    deck.id = "bench-deck";
    deck.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${Math.round(innerHeight * 0.2)}px;background:rgba(20,16,12,0.92);z-index:40`;
    document.body.append(deck);
    registerCover(() => { const r = deck.getBoundingClientRect(); return [{ rect: [r.left, r.top, r.right, r.bottom] }]; });
  });
  await sleep(1500);                                                            // the box is placed again within a second
  const placed = await C.evaluate(() => {
    const b = window.bench.host.backend;
    const top = document.getElementById("bench-deck").getBoundingClientRect().top;
    return b.chalkBox.sticks.map((t) => { const v = t.getWorldPosition(t.position.clone()); const p = b.project({ X: v.x, Y: v.y, Z: v.z }); return { y: p.y, clear: p.y < top && document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS" }; });
  });
  check("a deck laid over the box sends it back up the stage, clear of the deck", placed.every((s) => s.clear), `magic stick ${Math.round(magicWas)} -> ${Math.round(placed.find((_, i) => i === 6)?.y ?? 0)}`);
  check("and the magic stick and the eraser can still be taken from it", (await takeFromBox(C, "magic")) === "magic" && (await takeFromBox(C, "eraser")) === "eraser");
  check("no page threw (the covered box)", covered.errors.length === 0, covered.errors.slice(0, 2).join(" | "));
  await C.screenshot({ path: path.join(SHOTS, "chalk-box-clear.jpg"), type: "jpeg", quality: 88 });
  await C.close();

  /* ------------------------------------------------ the plain 2D picture */
  const flat = await open("haunt-the-paper-lantern", { tier: "flat" });
  check("the plain picture is the one drawing", await flat.page.evaluate(() => window.bench.host.backend.name === "flat"));
  await takeFromBox(flat.page, 2);
  const spot = await viewportOf(flat.page, 0.27, 0.32);
  const pixel = () => flat.page.evaluate(({ x, y }) => [...window.bench.host.backend.canvas.getContext("2d").getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3), spot);
  const was = await pixel();
  await stroke(flat.page, [[0.2, 0.32], [0.34, 0.32]]);
  await sleep(300);
  const now = await pixel();
  check("the plain picture shows paint where it was painted", Math.hypot(now[0] - was[0], now[1] - was[1], now[2] - was[2]) > 60, `${was} -> ${now}`);
  check("no page threw (the plain picture)", flat.errors.length === 0, flat.errors.slice(0, 2).join(" | "));
  await flat.page.screenshot({ path: path.join(SHOTS, "chalk-flat.jpg"), type: "jpeg", quality: 88 });
  await flat.page.close();
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
