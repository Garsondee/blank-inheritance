/**
 * The live check's chalk checks (foundry-check.mjs), since chalk was painted (2026-10-03, interface 0.5.0; chalk.md §11).
 * In a real Foundry they are the proof that chalk works there: the world's journal keeps the paint, a second player in
 * another browser paints with the GM, a reload brings it all back, and the GM's strip is clicked like a person would.
 * The bench runs the same checks on the same stage (bench/live-chalk-check.mjs), with the module's real host, kit and
 * painted wall and a stand-in for the journal, so they can be proved, and kept up with the module, without a licensed
 * Foundry. What only Foundry can do or has (a reload, a deleted scene, the journal's ownership, the Journal list) stays in
 * foundry-check.mjs; `afterReload` here checks what a reload brought back.
 *
 * Every step is given `t`: { check(name, pass, detail), shot(name, page), trace(label, page), gm, player, scene, gmId,
 * playerId, answerWipe(page) -> was the GM asked first }. Paint is read from the wall's own pixels (chalk-probe.mjs), as
 * bench/chalk-check.mjs reads it. Every place below is inside or outside the stage's chalk zone, "The back wall"
 * (check-stage.mjs): x 0.52 to 0.88 and y 0.2 to 0.6 of the painting.
 */

import { PALETTE, COLOURS, wallGrid } from "../../module/stagecraft/scripts/core/chalk.mjs";
import { DESCRIPTION } from "./check-stage.mjs";
import {
  stroke, takeFromBox, boxPoint, clickOn, chord, focusStage, viewportOf, ink, painted, pages, mismatch, chalkState,
  keptCount, waitKept, settle, until, ringNear, colourNear, sameSet
} from "./chalk-probe.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GRID = wallGrid(DESCRIPTION.painting);
const ZONE = DESCRIPTION.zones.find((z) => z.kind === "chalk");
const across = (n) => n / GRID.w;                                       // so many wall pixels across, as a share of the painting
const along = (x, y0, y1, half = 7) => [x - across(half), y0, x + across(half), y1];   // a narrow band down an eraser's path
const wave = (x0, y0, n = 14, step = 0.024, amp = 0.05) => Array.from({ length: n }, (_, i) => [x0 + i * step, y0 + amp * Math.sin(i * 0.9)]);

/** Where everything is painted, and where its paint is read (boxes of the painting: [x0, y0, x1, y1]). */
export const PLACES = Object.freeze({
  off: [0.3, 0.75],                                                                         // on the painting, outside the back wall
  wave: { stroke: wave(0.56, 0.35, 14, 0.022, 0.04), box: [0.55, 0.29, 0.86, 0.41] },
  edge: { stroke: [[0.7, 0.45], [0.7, 0.6], [0.7, 0.75]], inside: [0.69, 0.47, 0.71, 0.6], past: [0.66, 0.6, 0.74, 0.8] },
  outside: { stroke: [[0.55, 0.72], [0.65, 0.72], [0.75, 0.72]], box: [0.53, 0.66, 0.77, 0.78] },
  rub: { stroke: [[0.62, 0.25], [0.62, 0.45]], band: along(0.62, 0.3, 0.42) },             // down through the wave
  pink: { stroke: [[0.56, 0.5], [0.68, 0.5]], box: [0.555, 0.485, 0.685, 0.515] },
  blue: { stroke: [[0.56, 0.54], [0.68, 0.54]], box: [0.555, 0.525, 0.685, 0.555] },
  magic: { stroke: [[0.56, 0.455], [0.68, 0.455]], box: [0.555, 0.43, 0.685, 0.48] },       // its glow included
  green: { stroke: [[0.73, 0.47], [0.85, 0.47]], box: [0.725, 0.455, 0.855, 0.485] },       // the player's
  orange: { stroke: [[0.73, 0.56], [0.85, 0.56]], box: [0.725, 0.545, 0.855, 0.575] },      // the GM's, beside it
  theirRubOfOrange: { stroke: [[0.76, 0.53], [0.76, 0.59]] },
  theirRubOfGreen: { stroke: [[0.79, 0.44], [0.79, 0.5]], band: along(0.79, 0.455, 0.485) },
  gmRubOfGreen: { stroke: [[0.82, 0.44], [0.82, 0.5]], band: along(0.82, 0.455, 0.485) },
  flat: { stroke: [[0.56, 0.35], [0.8, 0.35]], at: [0.68, 0.35] }
});

const STRIP = "#stagecraft-stage .stagecraft-bar:not(.stagecraft-blocking)";
const brief = (s) => JSON.stringify(s);
const tilesOf = (layers) => JSON.stringify(Object.fromEntries(layers.map((l) => [l.by, l.tiles])));
const inZone = (b) => !!b && b.x0 >= 0.515 && b.x1 <= 0.885 && b.y0 >= 0.195 && b.y1 <= 0.605;
const close = (a, b) => Math.abs(a.inked - b.inked) <= Math.max(3, b.inked * 0.01);

/** The GM's strips, unfolded with a real click on their key if they are folded. */
export async function openStrips(page) {
  const s = await chalkState(page);
  if (s?.strip.shown) return { reachable: true, already: true };
  return clickOn(page, "#stagecraft-stage .stagecraft-gm-toggle");
}

/** A real click on one of the GM's strip buttons (the strip steps aside while chalk is in hand, so the chalk is put down first). */
export async function clickBar(page, act) {
  if ((await chalkState(page))?.tool) { await page.keyboard.press("Escape"); await sleep(200); }
  await openStrips(page);
  return clickOn(page, `${STRIP} button[data-act="${act}"]`);
}

/** Can every stick, the magic stick and the eraser be clicked? The ones that cannot, and what covers them. */
async function unreachable(page) {
  const out = [];
  for (const item of [...COLOURS, "magic", "eraser"]) {
    const at = await boxPoint(page, item);
    if (!at?.ok) out.push(`${item}: ${at?.over ?? "?"}${at?.picks ? ` (picks ${at.picks})` : ""}`);
  }
  return out;
}

/** A stroke, and whether it was kept in the world (the painter's `stagecraft.chalk` hook) within the time. */
async function kept(page, points, options) {
  const n = await keptCount(page);
  await stroke(page, points, options);
  return waitKept(page, n + 1);
}

/* ------------------------------------------------------------------ the GM alone */

/** The box of chalk on the GM's screen: the strip's key, the box, the kit, painting, the zone's edge, the eraser, undo, colours. */
export async function gmChalk(t) {
  const { check, gm } = t;
  let s = await chalkState(gm);
  check("the GM's strips start folded behind one small key", s.strip.key && s.strip.keyShown && !s.strip.shown, brief(s.strip));
  const key = await openStrips(gm);
  s = await chalkState(gm);
  check("a real click on the key unfolds the GM's strip: six buttons", !!key?.reachable && s.strip.shown && s.strip.buttons.length === 6, brief({ key, buttons: s.strip.buttons }));
  check("the box of chalk is out on the stage (this scene lets players chalk its back wall)", s.box === true);
  const blocked = await unreachable(gm);
  check("every stick in the box, the magic stick and the eraser can be reached by a real click", blocked.length === 0, blocked.join("; "));
  await t.shot("9-chalk-box", gm);

  const took = await takeFromBox(gm, "yellow");
  s = await chalkState(gm);
  check("a real click on a stick of chalk puts it in hand, and the kit of tools comes out", !!took?.ok && s.tool === "chalk" && s.colour === PALETTE.yellow && s.kit && s.inHand, brief({ took, tool: s.tool, colour: s.colour, kit: s.kit }));
  check("the GM's strips and their key step aside while chalk is in hand", !s.strip.shown && !s.strip.keyShown);

  const off = await viewportOf(gm, ...PLACES.off);
  await gm.mouse.move(off.x, off.y, { steps: 6 });
  await sleep(300);
  s = await chalkState(gm);
  check("outside the chalk zone the chalk says it will leave no mark, and names where it goes", s.blocked && new RegExp(ZONE.name).test(s.hint ?? ""), s.hint ?? "(no line by the pointer)");
  const ring = await ringNear(gm, off);
  check("a ring round the pointer shows where the paint would go", ring.drawn, brief(ring));

  // on the back wall
  const keptWave = await kept(gm, PLACES.wave.stroke, { steps: 6 });
  const wave1 = await ink(gm, PLACES.wave.box);
  check("a stroke with the real mouse leaves paint on the back wall, in the stick's colour", wave1.inked > 400 && colourNear(wave1.mean, PALETTE.yellow), brief(wave1));
  const hook = await gm.evaluate(() => globalThis.__chalkProbe.kept.at(-1) ?? null);
  check("it is kept, and the stagecraft.chalk hook says who painted it, with what, in which colour and where", keptWave && hook?.type === "chalk" && hook.scene === t.scene && hook.by === t.gmId && hook.tool === "chalk" && hook.colour === PALETTE.yellow && inZone(hook.bounds), brief(hook));
  await settle(gm, t.scene);
  const mine = (await pages(gm, t.scene)).find((l) => l.by === t.gmId);
  check("in the world it is the painter's own page: the tiles the stroke touched, and the step that takes it back", mine?.v === 2 && Object.keys(mine.tiles).length > 0 && mine.steps.length === 1 && mine.steps[0].who === t.gmId, brief(mine ? { v: mine.v, tiles: Object.keys(mine.tiles), steps: mine.steps } : null));
  s = await chalkState(gm);
  const shown = await painted(gm);
  check("the 3D picture shows every tile that has paint on it", shown.length > 0 && shown.every((k) => s.tiles3d?.includes(k)), `${shown.length} painted, ${s.tiles3d?.length ?? "no"} shown`);
  const odd = await mismatch(gm, t.scene);
  check("the wall shows exactly what the world keeps", odd.length === 0, odd.slice(0, 4).join("; "));

  // the zone's edge, and wholly outside it
  await kept(gm, PLACES.edge.stroke, { midway: () => t.shot("10-chalk-painting", gm) });
  const inside = await ink(gm, PLACES.edge.inside);
  const past = await ink(gm, PLACES.edge.past);
  check("a stroke that runs out of the chalk zone stops exactly at its edge", inside.inked > 100 && past.inked === 0, `${inside.inked} pixels on the wall, ${past.inked} past its edge`);
  const n = await keptCount(gm);
  const before = (await pages(gm, t.scene)).find((l) => l.by === t.gmId);
  await stroke(gm, PLACES.outside.stroke);
  await sleep(1500);
  const outside = await ink(gm, PLACES.outside.box);
  const after = (await pages(gm, t.scene)).find((l) => l.by === t.gmId);
  check("a stroke wholly outside the zone leaves nothing, and keeps nothing (no page, no step)", outside.inked === 0 && (await keptCount(gm)) === n && brief(after?.steps) === brief(before?.steps), brief({ outside, steps: after?.steps.length }));

  // the eraser, and taking it back
  const rub = await takeFromBox(gm, "eraser");
  s = await chalkState(gm);
  check("the felt eraser can be taken from the box instead", !!rub?.ok && s.tool === "eraser", brief(rub));
  const under = await ink(gm, PLACES.rub.band);
  const whole = await ink(gm, PLACES.wave.box);
  const keptRub = await kept(gm, PLACES.rub.stroke);
  const rubbed = await ink(gm, PLACES.rub.band);
  const rest = await ink(gm, PLACES.wave.box);
  check("the eraser takes the paint away where it passes", keptRub && under.inked > 40 && rubbed.inked < under.inked * 0.05, `${under.inked} then ${rubbed.inked}`);
  check("and leaves the rest", rest.inked > whole.inked * 0.8, `${rest.inked} of ${whole.inked}`);
  await settle(gm, t.scene);
  await focusStage(gm);
  await chord(gm, "KeyZ", ["Control"]);
  const back = await until(gm, (b, k) => globalThis.__chalkProbe.ink(b).inked >= k, [PLACES.rub.band, Math.floor(under.inked * 0.99)]);
  check("Ctrl+Z takes the stroke back, out of the world: what it rubbed out is back", back, brief(await ink(gm, PLACES.rub.band)));
  await chord(gm, "KeyZ", ["Control", "Shift"]);
  const again = await until(gm, (b, k) => globalThis.__chalkProbe.ink(b).inked <= k, [PLACES.rub.band, Math.ceil(under.inked * 0.05)]);
  check("and Ctrl+Shift+Z puts the stroke back again", again, brief(await ink(gm, PLACES.rub.band)));
  await settle(gm, t.scene);
  await gm.keyboard.press("Escape");
  await sleep(250);
  s = await chalkState(gm);
  check("Escape puts the chalk back in the box, and opens nothing else", !s.tool && !s.kit && !s.inHand && !s.menu, brief({ tool: s.tool, kit: s.kit, menu: s.menu }));

  // a box of chalk, not one stick
  for (const colour of ["pink", "blue"]) {
    await takeFromBox(gm, colour);
    await kept(gm, PLACES[colour].stroke);
    await t.trace(`painted ${colour}`, gm);
  }
  const pink = await ink(gm, PLACES.pink.box);
  const blue = await ink(gm, PLACES.blue.box);
  check("every stick paints its own colour", pink.inked > 300 && blue.inked > 300 && colourNear(pink.mean, PALETTE.pink) && colourNear(blue.mean, PALETTE.blue), brief({ pink, blue }));

  // magic chalk, in a colour typed into the kit
  const magic = await takeFromBox(gm, "magic");
  s = await chalkState(gm);
  check("the magic stick gives magic chalk, and its tricks show in the kit", !!magic?.ok && s.tool === "magic" && s.magic, brief({ magic, tool: s.tool }));
  const well = await clickOn(gm, "#stagecraft-stage .stagecraft-kit .kit-well");
  s = await chalkState(gm);
  check("a real click reaches the kit's colour well, which opens the picker", !!well?.reachable && s.picker, brief(well));
  const field = await clickOn(gm, "#stagecraft-stage .stagecraft-kit .kit-hex", { count: 3 });
  await gm.keyboard.type("#ff3366");
  await gm.keyboard.press("Enter");
  await sleep(200);
  s = await chalkState(gm);
  check("a colour typed into the kit is the colour in hand", !!field?.reachable && s.colour === "#ff3366", brief({ field, colour: s.colour }));
  await clickOn(gm, "#stagecraft-stage .stagecraft-kit .kit-well");                // the picker folds away again
  const keptMagic = await kept(gm, PLACES.magic.stroke);
  const m = await ink(gm, PLACES.magic.box);
  check("magic chalk paints in the colour typed, and is kept", keptMagic && m.inked > 400 && m.mean[0] > m.mean[1] + 60 && m.mean[0] > m.mean[2] + 30, brief(m));
  await gm.keyboard.press("Escape");
  await settle(gm, t.scene);
  await t.shot("11-chalk-wall", gm);
}

/** What the GM's wall shows now, to be found again later: the painted tiles, and how much paint is where. */
export async function wallNow(page) {
  return {
    painted: await painted(page),
    wave: await ink(page, PLACES.wave.box),
    magic: await ink(page, PLACES.magic.box),
    pink: await ink(page, PLACES.pink.box)
  };
}

/** After the 3D picture was rebuilt (a lost graphics context): its paint and its box came back with it. */
export async function afterRebuild(t, before) {
  await settle(t.gm, t.scene);
  const s = await chalkState(t.gm);
  const shown = await painted(t.gm);
  t.check("and its paint comes back with it: the new picture shows every painted tile, and the box", sameSet(shown, before.painted) && shown.every((k) => s.tiles3d?.includes(k)) && s.box, `${shown.length} painted tiles (was ${before.painted.length}), ${s.tiles3d?.length ?? "no"} shown, box ${s.box}`);
}

/** After a reload: the same paint, read back out of the world. */
export async function afterReload(t, before) {
  const ok = await settle(t.gm, t.scene, 30000);
  const now = await wallNow(t.gm);
  t.check("after a reload the same paint is on the wall, read back out of the world", ok && sameSet(now.painted, before.painted) && close(now.wave, before.wave) && close(now.magic, before.magic) && close(now.pink, before.pink), brief({ settled: ok, tiles: `${now.painted.length} of ${before.painted.length}`, wave: [now.wave.inked, before.wave.inked], magic: [now.magic.inked, before.magic.inked] }));
}

/* ------------------------------------------------------------------ two people at the table */

/** A player has just arrived on the stage: they see the GM's paint, have the box, and no GM's strip. */
export async function playerArrives(t, before) {
  const { check, player: pl } = t;
  const ok = await settle(pl, t.scene, 30000);
  const now = await wallNow(pl);
  check("a player arriving on the stage sees the GM's paint", ok && sameSet(now.painted, before.painted) && close(now.wave, before.wave), brief({ settled: ok, tiles: `${now.painted.length} of ${before.painted.length}`, wave: [now.wave.inked, before.wave.inked] }));
  const s = await chalkState(pl);
  check("a player has no GM's strip, nor its key", s.strip.buttons.length === 0 && !s.strip.key);
  check("a player has the box of chalk", s.box === true);
}

/**
 * The GM and a player paint together: live strokes, kept pages, each other's paint, erasers, Ctrl+Z, and the GM's strip
 * (chalk off, anywhere, back to the scene, freeze, hide, undo, wipe), every press a real click.
 */
export async function twoScreens(t) {
  const { check, gm, player: pl } = t;

  // the player paints, and the GM sees it while it is being painted
  await pl.bringToFront();
  const took = await takeFromBox(pl, "green");
  let ps = await chalkState(pl);
  check("a player takes a stick with a real click, and the kit comes out for them too", !!took?.ok && ps.tool === "chalk" && ps.colour === PALETTE.green && ps.kit, brief(took));
  const n = await keptCount(pl);
  await stroke(pl, PLACES.green.stroke, { keepDown: true });
  const live = await until(gm, (who, b) => globalThis.__chalkProbe.current()?.chalk?.wall.liveStrokes().some((x) => x.by === who) && globalThis.__chalkProbe.ink(b).inked > 100, [t.playerId, PLACES.green.box], 5000);
  check("a player's stroke shows on the GM's screen while it is being painted", live, brief((await chalkState(gm)).live));
  await t.shot("13-chalk-live", gm);
  await pl.mouse.up();
  await sleep(400);
  const keptGreen = await waitKept(pl, n + 1);
  const settled = await settle(gm, t.scene);
  const g = await ink(gm, PLACES.green.box);
  check("and gives way to the kept paint when the stroke ends", keptGreen && settled && (await chalkState(gm)).live.length === 0 && g.inked > 400 && colourNear(g.mean, PALETTE.green), brief({ kept: keptGreen, settled, ink: g }));
  let layers = await pages(gm, t.scene);
  const theirs = layers.find((l) => l.by === t.playerId);
  check("it is kept under the player's name, on a page of their own beside the GM's", theirs?.steps.length === 1 && theirs.steps[0].who === t.playerId && layers.some((l) => l.by === t.gmId) && new Set(layers.map((l) => l.by)).size === layers.length, brief(layers.map((l) => ({ by: l.by === t.playerId ? "player" : l.by === t.gmId ? "GM" : l.by, tiles: Object.keys(l.tiles).length, steps: l.steps.length }))));

  // the GM paints, and the player sees it without a reload
  await gm.bringToFront();
  await takeFromBox(gm, "orange");
  const keptOrange = await kept(gm, PLACES.orange.stroke);
  await gm.keyboard.press("Escape");
  const seen = await until(pl, (b) => globalThis.__chalkProbe.ink(b).inked > 400, [PLACES.orange.box]);
  check("the GM's new paint appears on the player's screen without a reload", keptOrange && seen, brief(await ink(pl, PLACES.orange.box)));
  await settle(pl, t.scene);

  // a player's eraser: other people's paint is not theirs to rub out; their own is
  const gmBefore = (await pages(gm, t.scene)).find((l) => l.by === t.gmId);
  const orange0 = await ink(gm, PLACES.orange.box);
  const green0 = await ink(gm, PLACES.theirRubOfGreen.band);
  await pl.bringToFront();
  await takeFromBox(pl, "eraser");
  const m = await keptCount(pl);
  await stroke(pl, PLACES.theirRubOfOrange.stroke);
  await sleep(1200);
  const nothing = (await keptCount(pl)) === m;
  const keptRub = await kept(pl, PLACES.theirRubOfGreen.stroke);
  await settle(gm, t.scene);
  const gmAfter = (await pages(gm, t.scene)).find((l) => l.by === t.gmId);
  const orange1 = await ink(gm, PLACES.orange.box);
  check("a player's eraser leaves other people's paint alone", nothing && brief(gmAfter?.tiles) === brief(gmBefore?.tiles) && brief(gmAfter?.steps) === brief(gmBefore?.steps) && orange1.inked >= orange0.inked * 0.99, brief({ keptNothing: nothing, orange: [orange0.inked, orange1.inked] }));
  const green1 = await ink(gm, PLACES.theirRubOfGreen.band);
  check("but rubs out their own, on every screen", keptRub && green0.inked > 40 && green1.inked < green0.inked * 0.05, `${green0.inked} then ${green1.inked} on the GM's screen`);
  await focusStage(pl);
  await chord(pl, "KeyZ", ["Control"]);
  const undone = await until(gm, (b, k) => globalThis.__chalkProbe.ink(b).inked >= k, [PLACES.theirRubOfGreen.band, Math.floor(green0.inked * 0.99)]);
  check("the player's Ctrl+Z takes back their own last stroke, on the GM's screen too", undone, brief(await ink(gm, PLACES.theirRubOfGreen.band)));
  await pl.keyboard.press("Escape");
  await settle(pl, t.scene);
  await t.shot("13-chalk-player", pl);

  // the GM closes chalk: the player's box goes, the wall stays
  await gm.bringToFront();
  const wall0 = await painted(pl);
  const off = await clickBar(gm, "mode");                                    // as the scene says -> off
  const gone = await until(pl, () => globalThis.__chalkProbe.state()?.box === false, [], 5000);
  let s = await chalkState(gm);
  check("closing chalk from the GM's strip (a real click) takes the box away from the player at once, and the wall stays", !!off?.reachable && gone && sameSet(await painted(pl), wall0), brief({ off, gone }));
  check("and the strip says so", s.strip.buttons[1] === "Chalk: off", s.strip.buttons[1]);
  await clickBar(gm, "mode");                                                // zones only
  await clickBar(gm, "mode");                                                // anywhere
  const back = await until(pl, () => globalThis.__chalkProbe.state()?.box === true, [], 5000);
  check("opening it to anywhere brings the box back", back);
  await pl.bringToFront();
  await takeFromBox(pl, "white");
  const keptWhite = await kept(pl, PLACES.outside.stroke);                  // outside the back wall: only because the GM opened it
  await pl.keyboard.press("Escape");
  const white = await until(gm, (b) => globalThis.__chalkProbe.ink(b).inked > 400, [PLACES.outside.box]);
  check("with chalk open anywhere a player can paint outside the zone, and the GM sees it", keptWhite && white, brief(await ink(gm, PLACES.outside.box)));
  await gm.bringToFront();
  await clickBar(gm, "mode");                                                // back to as the scene says
  await until(gm, () => globalThis.__chalkProbe.state()?.strip.buttons[1] === "Chalk: zones only (scene)", [], 5000);
  s = await chalkState(gm);
  check("one more press hands the decision back to the scene", s.override === null && s.strip.buttons[1] === "Chalk: zones only (scene)", brief({ override: s.override, label: s.strip.buttons[1] }));

  // freeze: the wall is kept and the chalk is taken out of every hand
  await pl.bringToFront();
  await takeFromBox(pl, "yellow");
  const holding = (await chalkState(pl)).tool === "chalk";
  const wall1 = await painted(pl);
  await gm.bringToFront();
  await clickBar(gm, "freeze");
  const frozen = await until(pl, () => { const x = globalThis.__chalkProbe.state(); return x?.box === false && x.tool === null; }, [], 5000);
  check("freezing keeps the wall and takes the chalk away from everyone, out of a player's hand too", holding && frozen && sameSet(await painted(pl), wall1), brief({ holding, frozen }));
  await clickBar(gm, "freeze");
  await until(pl, () => globalThis.__chalkProbe.state()?.box === true, [], 5000);

  // hide: out of sight for everyone, and nothing lost
  layers = await pages(gm, t.scene);
  await clickBar(gm, "hide");
  const hidden = await until(pl, () => globalThis.__chalkProbe.state()?.hidden === true, [], 5000);
  await t.shot("14-chalk-hidden", pl);
  check("hiding the wall puts it out of sight for everyone without losing it", hidden && tilesOf(await pages(gm, t.scene)) === tilesOf(layers), brief({ hidden }));
  await clickBar(gm, "hide");
  await until(pl, () => globalThis.__chalkProbe.state()?.hidden === false, [], 5000);

  // the strip's Undo: the newest stroke on the whole wall, whoever painted it (the player's, outside the zone)
  const white0 = await ink(pl, PLACES.outside.box);
  await clickBar(gm, "undo");
  const unpainted = (await until(pl, (b) => globalThis.__chalkProbe.ink(b).inked === 0, [PLACES.outside.box])) && (await until(gm, (b) => globalThis.__chalkProbe.ink(b).inked === 0, [PLACES.outside.box]));
  check("the strip's Undo takes the newest stroke off the wall for everyone, whoever painted it", white0.inked > 400 && unpainted, `${white0.inked} pixels of the player's stroke, then ${(await ink(pl, PLACES.outside.box)).inked}`);

  // a GM's eraser takes anyone's paint, and the strip's Undo puts it back
  await takeFromBox(gm, "eraser");
  const theirs0 = await ink(pl, PLACES.gmRubOfGreen.band);
  const keptGmRub = await kept(gm, PLACES.gmRubOfGreen.stroke);
  await gm.keyboard.press("Escape");
  const rubbedThere = await until(pl, (b, k) => globalThis.__chalkProbe.ink(b).inked <= k, [PLACES.gmRubOfGreen.band, Math.ceil(theirs0.inked * 0.05)]);
  const steps = (await pages(gm, t.scene)).find((l) => l.by === t.playerId)?.steps ?? [];
  check("a GM's eraser rubs out a player's paint too, on the player's screen, kept on the player's page as the GM's step", keptGmRub && theirs0.inked > 40 && rubbedThere && steps.at(-1)?.who === t.gmId, brief({ before: theirs0.inked, after: (await ink(pl, PLACES.gmRubOfGreen.band)).inked, newest: steps.at(-1)?.who === t.gmId ? "the GM's" : steps.at(-1)?.who }));
  await clickBar(gm, "undo");
  const restored = await until(pl, (b, k) => globalThis.__chalkProbe.ink(b).inked >= k, [PLACES.gmRubOfGreen.band, Math.floor(theirs0.inked * 0.99)]);
  check("and the strip's Undo puts it back", restored, brief(await ink(pl, PLACES.gmRubOfGreen.band)));

  // wipe
  await clickBar(gm, "wipe");
  const asked = await t.answerWipe(gm);
  const cleared = await until(gm, (id) => globalThis.__chalkProbe.pages(id).every((l) => !Object.keys(l.tiles).length && !l.steps.length), [t.scene]);
  const emptyHere = await until(gm, () => globalThis.__chalkProbe.painted().length === 0);
  const emptyThere = await until(pl, () => globalThis.__chalkProbe.painted().length === 0);
  check("wipe asks first, and then clears every layer, and its history, for everyone", asked && cleared && emptyHere && emptyThere, brief({ asked, cleared, gm: emptyHere, player: emptyThere }));
}

/* ------------------------------------------------------------------ the plain picture */

/** Chalk on the plain 2D picture: the box can be clicked, and paint shows in the picture and is kept. */
export async function flatChalk(t, page = t.gm) {
  const { check } = t;
  const s = await chalkState(page);
  const blocked = await unreachable(page);
  check("the box of chalk is on the flat stage, and every stick in it can be reached by a real click", s.backend === "flat" && s.box && blocked.length === 0, blocked.join("; ") || brief({ backend: s.backend, box: s.box }));
  const took = await takeFromBox(page, "pink");
  const held = await chalkState(page);
  check("a click on a stick there puts it in hand, with the kit", !!took?.ok && held.tool === "chalk" && held.colour === PALETTE.pink && held.kit, brief(took));
  const spot = await viewportOf(page, ...PLACES.flat.at);
  const picture = () => page.evaluate((x, y) => globalThis.__chalkProbe.picture(x, y), spot.x, spot.y);
  const was = await picture();
  const keptFlat = await kept(page, PLACES.flat.stroke);
  await sleep(300);
  const now = await picture();
  const moved = Math.max(...now.map((p, i) => Math.hypot(p[0] - was[i][0], p[1] - was[i][1], p[2] - was[i][2])));
  check("chalk painted on the flat stage shows in its picture, and is kept in the world", keptFlat && moved > 60, `the picture moved ${Math.round(moved)} in colour where it was painted`);
  await t.shot("18-flat-chalk", page);
  await page.keyboard.press("Escape");
  await sleep(200);
}
