/**
 * The host check: the module's real host and the GM's real blocking strip (tools/stagecraft/bench/host.html), driven in
 * headless Chrome with a real graphics card and real mouse clicks, as a GM and as a player in two pages that share scene
 * updates. It proves, without a licensed Foundry, that the strip is the GM's alone, that a formation pressed and placed with
 * the mouse is published and walked out on both screens to the identical place, that a moment does the same, and that the
 * Board and Life switches reach the player. The live checks against the real Foundry (foundry-check.mjs) remain the proof
 * that it works in Foundry itself.
 *
 *   node tools/stagecraft/bench/host-check.mjs           (starts its own little web server on port 4193)
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const PORT = 4193;
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

try {
  const url = (seat) => `http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern&seat=${seat}&titles=1`;
  const gm = await browser.newPage();
  const player = await browser.newPage();
  const errors = [];
  const logs = [];
  for (const [name, p] of [["gm", gm], ["player", player]]) {
    p.on("pageerror", (e) => errors.push(`${name}: ${e}`));
    p.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") logs.push(`${name} [${m.type()}] ${m.text().slice(0, 200)}`); });
  }
  await gm.goto(url("gm"));
  await player.goto(url("player"));
  for (const [name, p] of [["gm", gm], ["player", player]]) {
    try {
      await p.bringToFront();
      await p.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
    } catch (err) {
      console.log(`${name} did not get ready:`, await p.evaluate(() => ({ bench: !!window.bench, ready: window.bench?.ready, seat: document.getElementById("seat")?.textContent })));
      console.log([...errors, ...logs].slice(0, 12).join("\n"));
      throw err;
    }
  }
  await sleep(1500);

  /* the strips fold away behind one key, folded at first, so they never cover a wall or a face */
  check("the GM's strips start folded away behind one small key", await gm.evaluate(() => {
    const strip = document.querySelector(".stagecraft-blocking");
    return !!document.querySelector(".stagecraft-gm-toggle") && getComputedStyle(strip).display === "none";
  }));
  // a page behind another gets no frames, and puppeteer's own click() waits for one, so the GM's page comes to the front
  await gm.bringToFront();
  const key = await (await gm.$(".stagecraft-gm-toggle")).boundingBox();
  await gm.mouse.click(key.x + key.width / 2, key.y + key.height / 2);
  await sleep(150);
  check("one press on the key unfolds them", await gm.evaluate(() => getComputedStyle(document.querySelector(".stagecraft-blocking")).display !== "none"));

  /* the strip is the GM's */
  const strip = await gm.$$eval(".stagecraft-blocking [data-act=form]", (b) => b.length);
  const moments = await gm.$$eval(".stagecraft-blocking [data-act=moment]", (b) => b.map((x) => x.textContent));
  check("the GM has the blocking strip, with every formation", strip === 11, `${strip} formations`);
  check("the strip offers the scene's moments", moments.length === 3, moments.join(" / "));
  check("a player has no strip at all", (await player.$(".stagecraft-blocking")) === null && (await player.$(".stagecraft-gm-toggle")) === null);

  /* a formation pressed and placed with the mouse */
  const huddle = await gm.$('.stagecraft-blocking [data-kind="huddle"]');
  const box = await huddle.boundingBox();
  await gm.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(150);
  check("pressing a formation arms it and says what it is waiting for", await gm.$eval(".stagecraft-blocking .hint", (h) => !h.hidden && /click the floor/.test(h.textContent)));
  await gm.mouse.click(1920 * 0.56, 1080 * 0.8);
  await sleep(4500);
  // Only the page in front gets animation frames, so each page is stepped on to the present before it is read: the walks run
  // on the shared clock, so a page that has stood still catches up to where it would have been.
  const settle = (p) => p.evaluate(() => { const s = window.bench.host.stage; for (let i = 0; i < 240; i++) s.step(); });
  const where = async (p) => { await settle(p); return p.evaluate(() => Object.fromEntries([...window.bench.host.stage.cards.values()].filter((c) => !c.person.pc).map((c) => [c.id, [c.puppet.x, c.Z, c.yaw]]))); };
  const a = await where(gm);
  const b = await where(player);
  const ids = Object.keys(a);
  const same = ids.every((id) => Math.abs(a[id][0] - b[id][0]) < 1 && Math.abs(a[id][1] - b[id][1]) < 1);
  check("the huddle walked out to the identical place on both screens", same, ids.map((id) => `${id.replace("summon-", "")} ${Math.round(a[id][0])}/${Math.round(b[id][0])}`).join(", "));
  // a huddle is shoulder to shoulder: neighbours less than one card width apart, measured at the depth they stand
  const spread = Math.max(...ids.map((id) => a[id][0])) - Math.min(...ids.map((id) => a[id][0]));
  const cardW = await gm.evaluate((list) => Math.max(...list.map((id) => { const c = window.bench.host.stage.cards.get(id); return c.w * c.grow; })), ids);
  check("and it is a huddle: shoulder to shoulder", spread < (ids.length - 1) * cardW && spread > (ids.length - 1) * cardW * 0.6, `${Math.round(spread)} across, cards ${Math.round(cardW)} wide`);
  const packed = await player.evaluate(() => window.bench.scene.flags.stagecraft.published.cards.filter((c) => c.packed && c.still && c.move).length);
  check("the player's copy of the scene carries the moves, set aside and packed", packed === 3, `${packed}`);

  /* a moment */
  await gm.$eval('.stagecraft-blocking [data-act=moment][data-i="1"]', (bt) => bt.click());
  await sleep(4000);
  for (const p of [gm, player]) await settle(p);
  const sanzo = await Promise.all([gm, player].map((p) => p.evaluate(() => { const c = window.bench.host.stage.cards.get("summon-sanzo"); return [c.puppet.x, c.Z, c.walk === null]; })));
  check("a moment walks its person out on both screens alike", Math.abs(sanzo[0][0] - sanzo[1][0]) < 1 && sanzo[0][2] && sanzo[1][2], `${Math.round(sanzo[0][0])} / ${Math.round(sanzo[1][0])}`);

  /* giving someone the floor: a real Alt-click on their card */
  await gm.bringToFront();
  await settle(gm);
  const at = await gm.evaluate(() => { const h = window.bench.host; const c = h.stage.cards.get("summon-kiku"); const p = h.backend.project({ X: c.puppet.x, Y: c.h * 0.5 + c.lift, Z: c.Z }); return { x: p.x, y: p.y }; });
  await gm.keyboard.down("Alt");
  await gm.mouse.click(at.x, at.y);
  await gm.keyboard.up("Alt");
  await sleep(600);
  for (const p of [gm, player]) await settle(p);
  const floor = await Promise.all([gm, player].map((p) => p.evaluate(() => { const s = window.bench.host.stage; return { speaker: s.speaker, look: s.cards.get("pc-1").look, speaking: s.snapshot().cards.find((c) => c.id === "summon-kiku").speaking }; })));
  check("an Alt-click gives someone the floor on both screens", floor.every((f) => f.speaker === "summon-kiku" && f.speaking), floor.map((f) => f.speaker).join(" / "));
  check("and the others turn their heads to them", floor.every((f) => Math.abs(f.look) > 3), floor.map((f) => f.look.toFixed(1)).join(" / "));

  /* knocking someone down: a real Ctrl-click on their card */
  await gm.bringToFront();
  await settle(gm);
  const tama = await gm.evaluate(() => { const h = window.bench.host; const c = h.stage.cards.get("summon-tama"); const p = h.backend.project({ X: c.puppet.x, Y: c.h * 0.5 + c.lift, Z: c.Z }); return { x: p.x, y: p.y }; });
  await gm.keyboard.down("Control");
  await gm.mouse.click(tama.x, tama.y);
  await gm.keyboard.up("Control");
  await sleep(700);
  for (const p of [gm, player]) await settle(p);
  const fallen = await Promise.all([gm, player].map((p) => p.evaluate(() => { const c = window.bench.host.stage.snapshot().cards.find((x) => x.id === "summon-tama"); return { down: c.down, pitch: c.pitch }; })));
  check("a Ctrl-click knocks someone down on both screens", fallen.every((f) => f.down > 0.95 && f.pitch < -70), fallen.map((f) => f.pitch.toFixed(0)).join(" / "));
  check("and the scene remembers it", await player.evaluate(() => window.bench.scene.flags.stagecraft.published.cards.find((c) => c.id === "summon-tama").down === true));

  /* the switches */
  await gm.$eval('.stagecraft-blocking [data-act="board"]', (bt) => bt.click());
  await sleep(400);
  check("the Board switch reaches the player", await player.evaluate(() => window.bench.host.stage.board === true));
  await gm.$eval('.stagecraft-blocking [data-act="life"]', (bt) => bt.click());
  await sleep(400);
  check("the Life switch reaches the player", await player.evaluate(() => window.bench.host.stage.lifeOn === false));

  /* a card's words change on the scene (a name learned, a line of text edited): its face is drawn again, on the same texture */
  const renamed = await gm.evaluate(async () => {
    const { host, scene } = window.bench;
    const list = scene.flags.stagecraft.published.cards;
    const card = list.find((c) => !c.pc);
    const view = host.backend.views.get(card.id);
    const before = view.faceTex.image;
    const beforeUrl = before.toDataURL();
    const texture = view.faceTex;
    card.name = "Renamed Person\nwho was renamed on the scene, and has a good deal to say about it";
    Hooks.callAll("updateScene", scene, { flags: { stagecraft: { published: { cards: list } } } });
    await new Promise((r) => setTimeout(r, 1500));
    const after = view.faceTex.image;
    return { newCanvas: after !== before, differs: after.toDataURL() !== beforeUrl, sameTexture: view.faceTex === texture, name: host.stage.cards.get(card.id).person.name };
  });
  check("a card renamed on the scene is drawn again: its face texture gets a new picture, on the same texture", renamed.newCanvas && renamed.differs && renamed.sameTexture && /Renamed Person/.test(renamed.name), JSON.stringify(renamed));

  /* conditions as badges, and the turn lit: written on the scene, drawn on the face on every screen */
  const badged = await gm.evaluate(async () => {
    const { host, scene } = window.bench;
    const list = scene.flags.stagecraft.published.cards;
    const card = list.find((c) => !c.pc && c.id !== host.stage.speaker);   // the bench scene already has a speaker, who is lit anyway
    const view = host.backend.views.get(card.id);
    const beforeUrl = view.faceTex.image.toDataURL();
    card.badges = ["Frightened 2", "Prone"];
    scene.flags.stagecraft.live = { ...(scene.flags.stagecraft.live ?? {}), turn: card.id };
    Hooks.callAll("updateScene", scene, { flags: { stagecraft: { published: { cards: list }, live: { turn: card.id } } } });
    await new Promise((r) => setTimeout(r, 1500));
    const lit = host.stage.snapshot().cards.find((c) => c.id === card.id).speaking;
    const url = view.faceTex.image.toDataURL();
    card.badges = [];
    scene.flags.stagecraft.live.turn = null;
    Hooks.callAll("updateScene", scene, { flags: { stagecraft: { published: { cards: list }, live: { turn: null } } } });
    await new Promise((r) => setTimeout(r, 1500));
    return { drawn: url !== beforeUrl, lit, unlit: host.stage.snapshot().cards.find((c) => c.id === card.id).speaking === false, gone: view.faceTex.image.toDataURL() === beforeUrl };
  });
  check("badges are drawn on a card's face, the turn lights it, and both go again", badged.drawn && badged.lit && badged.unlit && badged.gone, JSON.stringify(badged));
  /* a card with a line of text speaks when the pointer has rested on it: the whole of what its plate may have cut */
  await gm.bringToFront();
  const spot = await gm.evaluate(() => {
    const { host, titled } = window.bench;
    const c = host.stage.cards.get(titled);
    for (let y = 260; y >= 40; y -= 12) {
      const p = host.backend.project({ X: c.puppet.x, Y: y, Z: c.Z });
      if (document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS" && host.backend.pick(p.x, p.y)?.id === titled) return { x: p.x, y: p.y };
    }
    return null;
  });
  check("a point on the titled card can be reached by the pointer", !!spot, JSON.stringify(spot));
  const shown = () => gm.evaluate(() => { const el = document.querySelector(".stagecraft-tip.shown"); if (!el) return null; const r = el.getBoundingClientRect(); return { text: el.textContent, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, events: getComputedStyle(el).pointerEvents }; });
  await gm.mouse.move(spot.x - 4, spot.y - 4);
  await gm.mouse.move(spot.x, spot.y);
  await sleep(200);
  const early = await shown();
  await sleep(600);
  const tip = await shown();
  check("it says nothing at first, and its full words once the pointer has rested", early === null && tip && /read in full on hover/.test(tip.text), JSON.stringify({ early, tip }));
  check("the tip stays inside the window and never takes a click", tip?.inside === true && tip?.events === "none", JSON.stringify(tip));
  await gm.mouse.move(5, 5);
  await sleep(300);
  check("it goes when the pointer moves off the card", (await shown()) === null);
  await gm.mouse.move(spot.x, spot.y);
  await sleep(800);
  check("it comes back when the pointer returns and rests", (await shown()) !== null);
  await gm.mouse.down();
  await sleep(250);
  check("and goes at once when the card is taken hold of", (await shown()) === null);
  await gm.mouse.up();
  await sleep(300);

  /* a change that lands while the stage is still being built */
  const late = await browser.newPage();
  late.on("pageerror", (e) => errors.push(`late: ${e}`));
  await late.goto(`${url("gm")}&midbuild=1`);
  await late.bringToFront();
  await late.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
  await sleep(2500);
  await settle(late);
  const caught = await late.evaluate(() => {
    const { id, at } = window.midbuild;
    const s = window.bench.host.stage;
    const c = s.cards.get(id);
    const f = s.rig.fractionOf(c.walk ? c.walk.to.X : c.puppet.restX, c.walk ? c.walk.to.Z : c.restZ);
    return { id, want: at, got: f.map((n) => +n.toFixed(3)) };
  });
  check("a change made while the stage was still being built is taken up once it is ready", Math.abs(caught.got[0] - caught.want[0]) < 0.01 && Math.abs(caught.got[1] - caught.want[1]) < 0.01, `${caught.id} ${caught.got} (wanted ${caught.want})`);
  check("no page threw", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
