/**
 * Check, in a real, running, local Foundry (http://localhost:30000), that every NPC card gets a token standing for an actor with the
 * NPC Generator's stat block (tools/npc-generator, data/campaign/npc-roster.json): Episode One's people and some haunt regulars as
 * their real synced actors (whose numbers are the roster's), a foe who had no file as the one the generator made, and the six giant
 * centipedes as unlinked copies of the sf2e compendium's own actor (nothing generated). Run `npm run build:stagecraft` first, and have the
 * local module's data folder refreshed (the content sync at a GM's login brings the actors up to date).
 *
 *   node tools/stagecraft/foundry-npc-check.mjs [--keep]
 *
 * It makes a scene of its own (never touching the world's real scenes, their cast or the notebook) and removes it, and the figures only
 * it caused, afterwards.
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DESCRIPTION } from "./check-stage.mjs";
import { load, generate } from "../npc-generator/apply.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const args = new Set(process.argv.slice(2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => { results.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const { tables, archetypes, roster } = load();
const EP1 = roster.people.filter((p) => p.appearsIn.some((s) => s.startsWith("episode-c1e1--")));
const EXTRA = ["tomoe", "kaede", "tug-hand", "kaito"].map((id) => roster.people.find((p) => p.npcId === id));
const PEOPLE = [...EP1, ...EXTRA];
const expected = (p) => { const s = generate(p, { tables, archetypes }); return { level: s.level, hp: s.hitPoints.max, ac: s.ac, perception: s.perception.proficiency.modifier, will: s.savingThrows.will.modifier }; };
const CENTIPEDES = [1, 2, 3, 4, 5, 6].map((n) => `giant-centipede-${n}`);

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", protocolTimeout: 900000, args: ["--hide-scrollbars", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist"], defaultViewport: { width: 1920, height: 1080 } });
const gm = await browser.newPage();
await gm.evaluateOnNewDocument(() => { globalThis.__stagecraftSpeed = { settle: 3600000 }; });
const logs = [];
gm.on("console", (m) => { if (m.type() === "error") logs.push(m.text().slice(0, 300)); });
gm.on("pageerror", (e) => logs.push(`pageerror ${e.message}`));
const made = { scene: null };
const before = { actors: [], folders: [], journals: [], active: null, synced: false };

try {
  await gm.goto("http://localhost:30000/join", { waitUntil: "domcontentloaded" });
  await gm.waitForSelector('input[name="username"]', { timeout: 30000 });
  await gm.type('input[name="username"]', "Gamemaster");
  await Promise.all([gm.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), gm.$eval('button[name="join"]', (b) => b.click())]);
  await gm.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(2000);
  await gm.evaluate(() => { for (const app of foundry.applications.instances.values()) app.close?.(); });

  const snap = await gm.evaluate(() => ({ actors: game.actors.map((a) => a.id), folders: game.folders.map((f) => f.id), journals: game.journal.map((j) => j.id), active: game.scenes.active?.id ?? null }));
  Object.assign(before, snap);

  // the content sync at login brings the real actors up to the generated numbers: wait for one of them
  const nobu = PEOPLE.find((p) => p.npcId === "nobu");
  const nobuHp = () => gm.evaluate(async () => {
    const b = new TextEncoder().encode("blank-inheritance:nobu");
    const d = await crypto.subtle.digest("SHA-256", b);
    const id = [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 16);
    return game.actors.get(id)?.system?.attributes?.hp?.max ?? null;
  });
  let ready = (await nobuHp()) === expected(nobu).hp;
  if (!ready) {
    // a world that has never had the adventure's content sync (this local test world) has no real NPC actors: bring them in, as a GM's login
    // does on the live server, and take them out again afterwards (the actors and journals it makes are found positively below)
    await gm.evaluate(async () => { const { runRealContentSync } = await import("/modules/blank-inheritance/scripts/foundry/sync.mjs"); await runRealContentSync({ quiet: true }); });
    before.synced = true;
    ready = (await nobuHp()) === expected(nobu).hp;
  }
  check("the world's real actors carry the generated numbers (the content sync has run)", ready, ready ? "" : "run the sync (Blank Inheritance: Update the World) and refresh the module's data folder");

  const cards = [
    ...PEOPLE.map((p, i) => ({ id: `summon-${p.npcId}`, name: p.stub?.name ?? p.npcId, ...(EP1.includes(p) ? { portrait: `modules/blank-inheritance/assets/stage/${p.npcId}.webp` } : {}), at: [0.06 + (i % 12) * 0.075, 0.6 + Math.floor(i / 12) * 0.1] })),
    ...CENTIPEDES.map((id, i) => ({ id: `summon-${id}`, name: "Giant Centipede", at: [0.1 + i * 0.12, 0.9] }))
  ];
  const setup = await gm.evaluate(async (description, cards) => {
    const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); };
    await idle();
    for (const old of game.scenes.filter((s) => s.name === "Stagecraft npc test")) { await old.delete(); await idle(); }
    const scene = await Scene.create({ name: "Stagecraft npc test", flags: { stagecraft: { stage: description, published: { cards, rev: 1 } } } });
    await idle();
    await scene.activate();
    return scene.id;
  }, DESCRIPTION, cards);
  made.scene = setup;
  await gm.waitForFunction((id) => canvas.scene?.id === id && game.modules.get("stagecraft").api.stage()?.backend?.ready === true, { timeout: 90000, polling: 250 }, setup);
  await gm.waitForFunction((n, id) => game.scenes.get(id).tokens.size >= n, { timeout: 60000, polling: 250 }, cards.length, setup).catch(() => {});
  await sleep(3000);

  const tokens = await gm.evaluate((sceneId) => game.scenes.get(sceneId).tokens.contents.map((t) => {
    const a = t.actor;
    return { card: t.getFlag("stagecraft", "card"), name: t.name, link: t.actorLink, actorId: t.actorId, type: a?.type ?? null, real: !!a?.getFlag("blank-inheritance", "sourceId"), basic: a?.getFlag("blank-inheritance", "stagecraftBasic") === true, existing: a?.getFlag("blank-inheritance", "stagecraftExisting") ?? null, level: a?.system?.details?.level?.value ?? null, hp: a?.system?.attributes?.hp?.max ?? null, ac: a?.system?.attributes?.ac?.value ?? null, perception: a?.system?.perception?.mod ?? null, will: a?.system?.saves?.will?.value ?? null };
  }), setup);
  check("every card has a token", tokens.length === cards.length, `${tokens.length} tokens for ${cards.length} cards`);

  // the people with a data file: their real synced actor, with the roster's numbers
  const wrong = [];
  for (const p of PEOPLE.filter((p) => !p.stub)) {
    const t = tokens.find((x) => x.card === `summon-${p.npcId}`);
    const e = expected(p);
    const ok = t && t.type === "npc" && t.real && t.link === true && t.level === e.level && t.hp === e.hp && t.ac === e.ac && t.perception === e.perception && t.will === e.will;
    if (!ok) wrong.push(`${p.npcId}: ${JSON.stringify(t)} wanted ${JSON.stringify(e)}`);
  }
  check(`each of ${PEOPLE.filter((p) => !p.stub).length} people's token stands for their real actor, with the generated level, HP, AC, Perception and Will`, wrong.length === 0, wrong.slice(0, 2).join(" | "));
  check("a token is called what its card is, not what its actor is", tokens.find((t) => t.card === "summon-tomoe")?.name === "tomoe");

  // a foe who had no file: the one the generator made
  const foe = tokens.find((t) => t.card === "summon-tug-hand");
  const eFoe = expected(roster.people.find((p) => p.npcId === "tug-hand"));
  check("a foe the scene only named in prose has the actor the generator made for them", foe?.real && foe.level === eFoe.level && foe.hp === eFoe.hp, JSON.stringify(foe));

  // the centipedes: the compendium's own, each token its own copy
  const bugs = tokens.filter((t) => CENTIPEDES.some((id) => t.card === `summon-${id}`));
  check("six giant centipedes, all one imported compendium actor, each token unlinked (its own hit points)", bugs.length === 6 && new Set(bugs.map((b) => b.actorId)).size === 1 && bugs.every((b) => b.link === false && b.existing === "giant-centipede" && b.level === -1), JSON.stringify(bugs[0]));
  const real = await gm.evaluate((id) => { const t = game.scenes.get(id).tokens.contents.filter((x) => x.getFlag("stagecraft", "card")?.startsWith("summon-giant-centipede")); return t.map((x) => x.actor?.system?.attributes?.hp?.max); }, setup);
  check("and each has the compendium's hit points (nothing generated)", real.length === 6 && real.every((h) => h === 8), JSON.stringify(real));
  await gm.evaluate(async (id) => { const t = game.scenes.get(id).tokens.contents.find((x) => x.getFlag("stagecraft", "card") === "summon-giant-centipede-1"); await t.actor.update({ "system.attributes.hp.value": 3 }); }, setup);
  await sleep(500);
  const hps = await gm.evaluate((id) => game.scenes.get(id).tokens.contents.filter((x) => x.getFlag("stagecraft", "card")?.startsWith("summon-giant-centipede")).map((x) => x.actor.system.attributes.hp.value), setup);
  check("hurting one centipede leaves the other five whole", hps.filter((h) => h === 3).length === 1 && hps.filter((h) => h === 8).length === 5, JSON.stringify(hps));

  // a real click on a card controls the token, and the adventure's deck can read the actor's numbers
  const at = await gm.evaluate(() => {
    const h = game.modules.get("stagecraft").api.stage();
    const c = h.stage.cards.get("summon-nobu");
    for (let y = 320; y >= 40; y -= 12) {
      const pt = h.backend.project({ X: c.puppet.x, Y: y, Z: c.Z });
      if (document.elementFromPoint(pt.x, pt.y)?.tagName === "CANVAS" && h.backend.pick(pt.x, pt.y)?.id === "summon-nobu") return pt;
    }
    return null;
  });
  if (at) {
    await gm.mouse.click(at.x, at.y);
    await sleep(600);
    const controlled = await gm.evaluate(() => canvas.tokens.controlled.map((t) => ({ name: t.name, hp: t.actor?.system?.attributes?.hp?.max })));
    check("a real click on Nobu's card controls a token whose actor has his generated hit points", controlled.length === 1 && controlled[0].hp === expected(nobu).hp, JSON.stringify(controlled));
  } else check("Nobu's card can be reached by a click", false);

  const errors = logs.filter((l) => !/favicon|404|Failed to load resource|Failed to load audio|WebGL/.test(l));
  check("no errors in the console", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (err) {
  check("the run finished without an exception", false, err.stack ?? err.message);
} finally {
  if (!args.has("--keep") && made.scene) {
    try {
      await gm.evaluate(async ({ made, before }) => {
        const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); };
        if (before.active) await game.scenes.get(before.active)?.activate(); else await game.scenes.active?.update({ active: false });
        await idle();
        await game.scenes.get(made.scene)?.delete();
        await idle();
        // figures only this run caused: flagged, and not in the world before it (positively selected)
        for (const a of game.actors.filter((a) => a.getFlag("blank-inheritance", "stagecraftBasic") === true && !before.actors.includes(a.id))) await a.delete();
        if (before.synced) {
          // what the content sync made in this run: carries the sync's own flags, and was not in the world before it
          for (const a of game.actors.filter((a) => a.getFlag("blank-inheritance", "sourceId") && !before.actors.includes(a.id))) await a.delete();
          for (const j of game.journal.filter((j) => j.getFlag("blank-inheritance", "sourceId") && !before.journals.includes(j.id))) await j.delete();
        }
        for (const f of game.folders.filter((f) => f.getFlag("blank-inheritance", "stageFigures") === true && !before.folders.includes(f.id))) if (!f.contents.length) await f.delete();
      }, { made, before });
    } catch (err) { console.log("could not tidy up:", err.message); }
  }
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
