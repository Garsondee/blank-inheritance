/**
 * The GM walker: a scripted game master that runs an episode end to end through the Scene Runner's own buttons, with real clicks
 * (design/playtest-process.md section 13). It has no judgement: it ticks every beat, presses every check pill and closes the console
 * once the players' rolls are in, asks every group choice and settles it, shows every handout, presses every trigger chip, and sets
 * up the fight. The player bots at the other seats roll and pick in their own windows, so the player half of every one of those
 * paths is exercised too.
 *
 * What it reports is what a script can see (core/walk-plan.mjs#judgeScene): a beat the Runner never shows, a missing pill, a check
 * nobody could roll, a choice that would not settle, a handout with no button, a fight that will not set up, and every error the page
 * threw while it was in a scene (the hub's own monitors file those too). It never fixes anything and never stops for a finding.
 *
 * Moving between scenes uses the admin panel's own jump (foundry/admin-actions.mjs#jumpToScene) rather than whatever cut the story
 * authors, so one broken transition does not end the walk; whether the Runner OFFERS the next scene is checked separately and filed.
 */

import { sleep } from "../browser/chrome.mjs";
import { emptyBeatObservation, emptyObservation, judgeScene, summarizeWalk } from "../core/walk-plan.mjs";

const MODULE = "/modules/blank-inheritance/scripts/foundry";

/** In the GM's page: import one of the module's own files (the same URL Foundry loaded, so the same module instance). */
async function inPage(seat, fn, ...args) {
  return seat.page.evaluate(fn, MODULE, ...args);
}

async function waitFor(check, { timeout = 15000, every = 300, signal } = {}) {
  const started = Date.now();
  for (;;) {
    if (signal?.aborted) return false;
    if (await check().catch(() => false)) return true;
    if (Date.now() - started > timeout) return false;
    await sleep(every);
  }
}

/**
 * @param {{ seat: import("../browser/seat.mjs").Seat, plan: ReturnType<import("../core/walk-plan.mjs").buildWalkPlan>,
 *   signal: AbortSignal, file: (f: object) => void, log: (s: string) => void, rollWaitMs?: number, choiceWaitMs?: number }} p
 * @returns {Promise<{ observations: Record<string, object>, findings: object[], summary: string }>}
 */
export async function runGmWalker({ seat, plan, signal, file = () => {}, log = () => {}, rollWaitMs = 45000, choiceWaitMs = 20000 }) {
  const observations = {};
  const findings = [];
  const errorsSince = async () => seat.page.evaluate(() => (globalThis.__ptWalkErrors ?? []).splice(0));

  // Errors the page throws while a scene is walked are charged to that scene.
  await seat.page.evaluate(() => {
    if (globalThis.__ptWalkHooked) return;
    globalThis.__ptWalkHooked = true;
    globalThis.__ptWalkErrors = [];
    const push = (text) => globalThis.__ptWalkErrors.push(String(text).slice(0, 300));
    globalThis.addEventListener("error", (e) => push(e.message));
    globalThis.addEventListener("unhandledrejection", (e) => push(e.reason?.message ?? e.reason));
    const original = console.error.bind(console);
    console.error = (...args) => {
      push(args.map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : "")).join(" ").trim());
      original(...args);
    };
  });

  // The table gets characters without anyone doing the induction, and the Runner is opened.
  const lent = await inPage(seat, async (mod) => {
    const admin = await import(`${mod}/admin-actions.mjs`);
    const plan = await admin.lendTestParty();
    game.modules.get("blank-inheritance")?.api?.openSceneRunner?.();
    return plan.length;
  });
  log(`lent ${lent} test characters; walking ${plan.scenes.length} scenes of ${plan.episodeId}`);
  // A world with no spare characters has the player bots do the induction first; the walk waits for every player at the table to have one.
  const allCast = () => seat.page.evaluate(() => game.users.filter((u) => !u.isGM && u.active).every((u) => u.character));
  if (!(await allCast())) {
    log("waiting for every player at the table to have a character (the player bots are doing the induction)");
    if (!(await waitFor(allCast, { timeout: 10 * 60000, every: 3000, signal }))) log("some players still have no character after ten minutes; walking anyway");
  }

  for (let i = 0; i < plan.scenes.length && !signal?.aborted; i++) {
    const scene = plan.scenes[i];
    const seen = emptyObservation();
    observations[scene.briefId] = seen;
    const started = Date.now();
    try {
      await walkScene({ seat, scene, seen, signal, log, rollWaitMs, choiceWaitMs, next: plan.scenes[i + 1] ?? null, episodeId: plan.episodeId });
    } catch (error) {
      seen.error = seen.error ?? error.message;
      log(`${scene.briefId}: ${error.message}`);
    }
    seen.errors.push(...(await errorsSince().catch(() => [])));
    seen.ms = Date.now() - started;
    for (const f of judgeScene(scene, seen)) {
      findings.push(f);
      file(f);
    }
    log(`${seen.reached ? "walked" : "MISSED"} ${scene.title} in ${Math.round(seen.ms / 1000)}s`);
  }
  return { observations, findings, summary: summarizeWalk(plan, observations) };
}

async function walkScene({ seat, scene, seen, signal, log, rollWaitMs, choiceWaitMs, next, episodeId }) {
  const jumped = await inPage(seat, async (mod, ep, brief) => {
    const admin = await import(`${mod}/admin-actions.mjs`);
    return admin.jumpToScene(ep, brief);
  }, episodeId, scene.briefId);
  const runnerOn = () => seat.page.evaluate((brief) => game.settings.get("blank-inheritance", "runnerBrief") === brief && Boolean(document.querySelector("#bi-scene-runner .bi-runner__beat")), scene.briefId);
  // The Runner may be closed (a toggle): open it if the brief is set and nothing is drawn.
  if (!(await waitFor(runnerOn, { timeout: 8000, signal }))) {
    await seat.clickSelector('#bi-scene-runner [data-action="toggle"]', { timeout: 2000 });
    if (!(await waitFor(runnerOn, { timeout: 8000, signal }))) {
      seen.error = jumped ? "the Runner never showed its beats" : "the jump found no Foundry scene for this brief";
      return;
    }
  }
  seen.reached = true;
  if (!jumped) seen.errors.push("jumpToScene found no Foundry scene for this brief: the backdrop was not cued");
  await sleep(600);

  // Every beat the Runner draws, in its order.
  const drawn = await seat.page.$$eval("#bi-scene-runner li.bi-runner__beat[data-beat-id]", (els) => els.map((e) => e.dataset.beatId));
  seen.beatsShown = drawn;

  // Scene-level handouts (the panel's own list).
  seen.handoutsShown = await seat.page.$$eval('#bi-scene-runner [data-action="revealHandout"][data-handout-id]', (els) => [...new Set(els.map((e) => e.dataset.handoutId))]);

  for (const beat of scene.beats) {
    if (signal?.aborted) return;
    if (!drawn.includes(beat.id)) continue;
    const b = emptyBeatObservation();
    seen.beats[beat.id] = b;
    const li = `#bi-scene-runner li.bi-runner__beat[data-beat-id="${beat.id}"]`;
    try {
      // Open the beat so its detail (choice, fight, handout buttons) is drawn.
      const open = await seat.page.$eval(`${li} [data-action="toggleBeatDetail"]`, (e) => e.getAttribute("aria-expanded") === "true").catch(() => false);
      if (!open) await seat.clickSelector(`${li} [data-action="toggleBeatDetail"]`, { timeout: 3000 });
      await sleep(250);

      b.triggersShown = await seat.page.$$eval(`${li} [data-action="fireTrigger"]`, (els) => els.map((e) => e.dataset.triggerId)).catch(() => []);

      if (beat.check) {
        b.pills = await seat.page.$$eval(`${li} [data-action="openCheck"]`, (els) => els.length).catch(() => 0);
        if (b.pills) await runCheck({ seat, li, b, signal, rollWaitMs });
      }
      if (beat.choice) await runChoice({ seat, li, beatId: beat.id, b, signal, choiceWaitMs });
      if (beat.handout) await revealHandout(seat, `${li} [data-handout-id="${beat.handout}"]`, beat.handout, seen);
      if (beat.fight) {
        const before = await seat.page.evaluate(() => game.combats.size + canvas.tokens.placeables.length);
        const pressed = await seat.clickSelector(`${li} [data-action="setUpFight"]`, { timeout: 4000 });
        b.fightSetUp = pressed && (await waitFor(() => seat.page.evaluate((n) => game.combats.size + canvas.tokens.placeables.length > n, before), { timeout: 12000, signal }));
      }

      // Tick it (which also fires its objective chips, core/beat-autofire.mjs), then press any chip that has not fired.
      if (!(await seat.page.$eval(li, (e) => e.classList.contains("bi-runner__beat--done")).catch(() => false))) {
        await seat.clickSelector(`${li} [data-action="toggleBeat"]`, { timeout: 4000 });
      }
      b.ticked = await waitFor(() => seat.page.$eval(li, (e) => e.classList.contains("bi-runner__beat--done")), { timeout: 5000, signal });
      for (const t of b.triggersShown) {
        const chip = `${li} [data-action="fireTrigger"][data-trigger-id="${t}"]`;
        const fired = await seat.page.$eval(chip, (e) => e.classList.contains("bi-trig--fired")).catch(() => false);
        if (!fired) {
          await seat.clickSelector(chip, { timeout: 3000 });
          await sleep(400);
        }
      }
      // A beat folds when ticked; open it again to read its chips.
      await seat.clickSelector(`${li} [data-action="toggleBeatDetail"]`, { timeout: 2000 }).catch(() => {});
      await sleep(250);
      b.triggersFired = await seat.page.$$eval(`${li} [data-action="fireTrigger"].bi-trig--fired`, (els) => els.map((e) => e.dataset.triggerId)).catch(() => []);
    } catch (error) {
      b.errors.push(error.message);
    }
  }

  // Scene-level handouts not already shown by a beat.
  for (const id of seen.handoutsShown) {
    if (!seen.handoutsRevealed.includes(id)) await revealHandout(seat, `#bi-scene-runner [data-action="revealHandout"][data-handout-id="${id}"]`, id, seen);
  }

  // Does the Runner offer the next scene? (The walk itself jumps, so a missing offer is reported, not fatal.)
  if (next) {
    const offered = await seat.page.$(`#bi-scene-runner [data-brief-id="${next.briefId}"]`).then(Boolean).catch(() => false);
    if (!offered) seen.errors.push(`the Runner does not list the next scene, "${next.title}", to cut to`);
  }
  log(`${scene.briefId}: ${drawn.length} beats`);
}

async function runCheck({ seat, li, b, signal, rollWaitMs }) {
  const pressed = await seat.clickSelector(`${li} [data-action="openCheck"]`, { timeout: 4000 });
  if (!pressed) return;
  if (!(await waitFor(() => seat.visible("#bi-check-console"), { timeout: 8000, signal }))) return;
  b.checksOpened = 1;
  const lights = () =>
    seat.page.evaluate(() => {
      const slots = [...document.querySelectorAll("#bi-check-console .bi-leds__slot[data-user-id]:not(.is-unasked)")];
      const state = (s) => s.querySelector(".bi-led")?.dataset.state ?? "off";
      return { asked: slots.length, rolled: slots.filter((s) => !["off", "waiting", "asked", "pending"].includes(state(s))).length };
    });
  // The players' windows roll (the player bots); the walk waits as a table would, then reads the lights.
  await waitFor(async () => {
    const l = await lights();
    return l.asked > 0 && l.rolled >= l.asked;
  }, { timeout: rollWaitMs, every: 1000, signal });
  const l = await lights().catch(() => ({ asked: 0, rolled: 0 }));
  b.asked = l.asked;
  b.rolled = l.rolled;
  // Close and record.
  await seat.clickSelector('#bi-check-console [data-action="closeCheck"]', { timeout: 4000 });
  b.checksClosed = (await waitFor(async () => !(await seat.visible("#bi-check-console")), { timeout: 8000, signal })) ? 1 : 0;
}

async function runChoice({ seat, li, beatId, b, signal, choiceWaitMs }) {
  b.choiceAsked = await seat.clickSelector(`${li} [data-action="askPlayers"]`, { timeout: 4000 });
  if (!b.choiceAsked) return;
  // The player bots pick the first real option; give them the time a table would.
  await waitFor(() => seat.visible(`${li} [data-action="closePrompt"]`), { timeout: 5000, signal });
  await sleep(Math.min(choiceWaitMs, 12000));
  await seat.clickSelector(`${li} [data-action="closePrompt"]`, { timeout: 4000 });
  b.choiceSettled = await waitFor(() => seat.page.$eval(li, (e) => e.classList.contains("bi-runner__beat--done")), { timeout: 6000, signal });
  b.picks = b.choiceSettled ? 1 : 0;
  void beatId;
}

async function revealHandout(seat, selector, id, seen) {
  const pressed = await seat.clickSelector(selector, { timeout: 4000 });
  if (!pressed) return;
  const filed = await waitFor(() => seat.page.evaluate((hid) => game.journal.contents.some((j) => j.getFlag("blank-inheritance", "handout")?.id === hid || j.pages?.contents?.some((p) => p.getFlag("blank-inheritance", "handout")?.id === hid)), id), { timeout: 8000 });
  if (filed && !seen.handoutsRevealed.includes(id)) seen.handoutsRevealed.push(id);
  if (!seen.handoutsShown.includes(id)) seen.handoutsShown.push(id);
}
