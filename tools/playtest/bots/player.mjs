/**
 * The player bot: a scripted person at a seat. It does what a table member does without needing to think, through real clicks:
 *
 *   - no character yet: do the induction (bots/induction.mjs), from this seat's chargen spec
 *   - the opening is offered: choose the full one, or the reduced one for a reduced-motion seat
 *   - a check is put to the table: roll once, with the first way offered
 *   - the GM asks the group to choose: take the first real option (never "something else")
 *
 * and otherwise waits. It has no judgement and no voice: it cannot be confused, so it finds nothing a person would find confusing.
 * That is its use (a full table at no cost, and a whole-table load and sync test); the seats whose confusion matters get agents.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { sleep } from "../browser/chrome.mjs";
import { PT_DIR } from "../paths.mjs";
import { runInduction } from "./induction.mjs";

const specs = () => JSON.parse(readFileSync(path.join(PT_DIR, "bots", "chargen-specs.json"), "utf8"));

export function chargenFor(seatId) {
  const all = specs();
  return all[seatId] ?? all.default;
}

/**
 * @param {{seat: import("../browser/seat.mjs").Seat, spec: object, signal: AbortSignal, log: (s:string)=>void}} p
 */
/**
 * How long a scripted player waits after a window opens before it presses the button in it. A person reads a check before rolling it, and so
 * does a game master who has just put one to the table, so a bot that rolled the instant the window appeared made the game master's first
 * look at the check window come after four players had already rolled at a number they might have changed (the first agent run, F-0085).
 * Seats are staggered so six bots do not all roll in the same second. PT_BOT_ROLL_DELAY_MS overrides the base; 0 is "at once".
 */
export function rollDelayMs(seatId, env = process.env) {
  const base = env.PT_BOT_ROLL_DELAY_MS === undefined ? 30000 : Number(env.PT_BOT_ROLL_DELAY_MS);
  if (!(base > 0)) return 0;
  const n = Number(String(seatId).replace(/\D/g, "")) || 0;
  return base + n * 4000;
}

export async function runPlayerBot({ seat, spec, signal, hub = null, log = () => {} }) {
  const chargen = chargenFor(seat.id);
  const rolled = new Set();
  const firstSeen = new Map();
  const choseOpening = new Set();
  const chose = new Set();
  let inducted = false;
  while (!signal.aborted) {
    try {
      // Foundry itself opens "User Configuration" for any player with no character yet (game.mjs: "prompt for selection"), over whatever
      // else is on screen, and a person closes it to get on. So does this, after saying what it did: the real six will meet it too.
      const closed = await seat.closeWindow("User Configuration");
      if (closed) {
        log(`closed Foundry's own window "${closed}", which was covering the screen`);
        hub?.store?.detectorFinding({
          seat: "table",
          key: "first-login-user-configuration",
          name: "first-login-window",
          severity: "S2",
          summary: `Foundry's own "User Configuration" window opens over the screen at a new player's first login (core opens it for any player with no character), covering part of the induction terminal`,
          detail: { window: closed, seat: seat.id, viewport: seat.profile.viewport, source: "foundry client/game.mjs: 'If the player is not a GM and does not have an impersonated character, prompt for selection'" }
        });
      }
      if (!inducted && (await seat.visible("#bi-induction-terminal"))) {
        log(`doing the induction as ${chargen.name}`);
        const result = await runInduction(seat, chargen, {
          log,
          signal,
          onPrompt: (prompt) =>
            hub?.store?.detectorFinding({
              seat: seat.id,
              key: `confirm-prompt:${prompt.background}`,
              name: "confirm-prompt",
              severity: "S2",
              summary: `Confirming the character raises an unexplained question from the system ("${prompt.title}": ${prompt.text.slice(0, 60)}) in a small window over the review page, which meanwhile says only "Creating your character..."`,
              detail: prompt
            })
        });
        inducted = Boolean(result.ok);
        log(inducted ? `induction finished: ${result.name}` : "induction was interrupted");
      } else if (await seat.visible('[id^="bi-opening-choice-"] button[data-action="choose"]')) {
        const want = seat.profile.reducedMotion ? "reduced" : "full";
        const id = await seat.page.$eval('[id^="bi-opening-choice-"]', (e) => e.id).catch(() => "");
        if (!choseOpening.has(id)) {
          choseOpening.add(id);
          log(`choosing the ${want} opening`);
          await seat.clickSelector(`[id^="bi-opening-choice-"] button[data-action="choose"][data-version="${want}"]`, { timeout: 4000 });
        }
      } else if (await seat.visible('[id^="bi-check-player-"] button[data-action="roll"]:not([disabled])')) {
        const id = await seat.page.$eval('[id^="bi-check-player-"]', (e) => e.id).catch(() => "");
        if (!firstSeen.has(id)) firstSeen.set(id, Date.now());
        if (!rolled.has(id) && Date.now() - firstSeen.get(id) >= rollDelayMs(seat.id)) {
          rolled.add(id);
          log(`rolling for ${id}`);
          await seat.clickSelector('[id^="bi-check-player-"] button[data-action="roll"]:not([disabled])', { timeout: 4000 });
        }
      } else if (await seat.visible('[id^="bi-choice-prompt-"] button[data-action="pick"]')) {
        const id = await seat.page.$eval('[id^="bi-choice-prompt-"]', (e) => e.id).catch(() => "");
        if (!chose.has(id)) {
          chose.add(id);
          log(`choosing in ${id}`);
          await seat.clickSelector('[id^="bi-choice-prompt-"] button[data-action="pick"]:not(.bi-choice__option--else):not([aria-pressed="true"])', { timeout: 4000 });
        }
      }
    } catch (error) {
      log(`bot hiccup: ${error.message}`);
      if (/stuck on|did not finish|could not|never became|not in the list|not available/i.test(error.message)) throw error;
      await sleep(2500);
    }
    await sleep(1500);
  }
}
