/**
 * The induction bot: fills in the induction terminal through the REAL controls, with real clicks and real typing, the way a person would.
 * (design/induction-terminal.md has the pages; this follows their templates in module/blank-inheritance/templates/induction/.)
 *
 * It is not a unit test of the form (the form has those) and not a person: it is the cheap, repeatable way to put a character through
 * the whole flow, Service Agreement included, so a table of seats can be filled without an agent at each, and so every change to the
 * terminal can be proved against the live chain end to end. It reads the page to find where it is (which action's button is showing),
 * does what that page needs, and presses Continue; it never calls a handler and never skips a page.
 *
 * If it cannot get on, it says exactly where it stopped and what the page said about why (the terminal's own "what is missing" hint),
 * and the hub files that as a finding: a flow a scripted player cannot finish is a flow worth a look.
 */

import path from "node:path";

import { sleep } from "../browser/chrome.mjs";
import { PT_DIR } from "../paths.mjs";

const ROOT = "#bi-induction-terminal";
const STAGES = [
  ["finishInduction", "done"],
  ["confirmCharacter", "review"],
  ["continueFromPlayer", "player"],
  ["continueFromQuestions", "questions"],
  ["continueFromFinishing", "finishing"],
  ["continueFromPortrait", "portrait"],
  ["continueFromAttributes", "attributes"],
  ["continueFromClass", "class"],
  ["continueFromBackground", "background"],
  ["continueFromAncestry", "ancestry"],
  ["signAgreement", "agreement"],
  ["begin", "begin"]
];

const CONTINUE = { ancestry: "continueFromAncestry", background: "continueFromBackground", class: "continueFromClass", attributes: "continueFromAttributes", portrait: "continueFromPortrait", finishing: "continueFromFinishing", questions: "continueFromQuestions", player: "continueFromPlayer" };

async function currentStage(page) {
  return page.evaluate(({ root, stages }) => {
    const r = document.querySelector(root);
    if (!r) return "absent";
    for (const [action, name] of stages) if (r.querySelector(`button[data-action="${action}"]`)) return name;
    return "unknown";
  }, { root: ROOT, stages: STAGES });
}

/** Press the option in each unpicked slot of one picker, preferring the given abilities. */
async function fillSlots(seat, action, prefer = []) {
  for (let guard = 0; guard < 14; guard++) {
    const buttons = await seat.page.$$eval(`${ROOT} button[data-action="${action}"]`, (list) => list.map((b) => ({ slot: b.dataset.slotIndex, ability: b.dataset.ability, pressed: b.getAttribute("aria-pressed") === "true", disabled: b.disabled })));
    if (!buttons.length) return;
    const bySlot = new Map();
    for (const b of buttons) bySlot.set(b.slot, [...(bySlot.get(b.slot) ?? []), b]);
    const open = [...bySlot.entries()].find(([, opts]) => !opts.some((o) => o.pressed));
    if (!open) return;
    const [slot, options] = open;
    const usable = options.filter((o) => !o.disabled);
    if (!usable.length) throw new Error(`every option of ${action} slot ${slot} is unavailable`);
    const choice = prefer.map((a) => usable.find((o) => o.ability === a)).find(Boolean) ?? usable[0];
    if (!(await seat.clickSelector(`${ROOT} button[data-action="${action}"][data-slot-index="${slot}"][data-ability="${choice.ability}"]`, { timeout: 6000 }))) throw new Error(`could not press ${action} ${choice.ability} in slot ${slot}`);
    await sleep(220);
  }
}

/**
 * Answer each question the chosen background or class asks (Starship Dweller: Crafting or Piloting; Envoy: Deception, Diplomacy or
 * Intimidation): the option the spec prefers, else the first. Like fillSlots, it presses real buttons and stops when none is left open.
 */
async function fillChoices(seat, action, prefer) {
  for (let guard = 0; guard < 6; guard++) {
    const buttons = await seat.page.$$eval(`${ROOT} button[data-action="${action}"]`, (list) => list.map((b) => ({ flag: b.dataset.flag, key: b.dataset.key, pressed: b.getAttribute("aria-pressed") === "true" })));
    if (!buttons.length) return;
    const byFlag = new Map();
    for (const b of buttons) byFlag.set(b.flag, [...(byFlag.get(b.flag) ?? []), b]);
    const open = [...byFlag.entries()].find(([, options]) => !options.some((o) => o.pressed));
    if (!open) return;
    const [flag, options] = open;
    const choice = options.find((o) => o.key === prefer) ?? options[0];
    if (!(await seat.clickSelector(`${ROOT} button[data-action="${action}"][data-flag="${flag}"][data-key="${choice.key}"]`, { timeout: 6000 }))) throw new Error(`could not press ${action} ${choice.key}`);
    await sleep(220);
  }
}

async function pressContinue(seat, stage) {
  const action = CONTINUE[stage];
  if (!(await seat.clickSelector(`${ROOT} button[data-action="${action}"]`, { timeout: 8000 }))) throw new Error(`the Continue button of the ${stage} page could not be pressed`);
  await sleep(450);
}

async function hint(page) {
  return page.evaluate((root) => {
    const e = document.querySelector(`${root} [data-induction-blocker], ${root} .bi-induction__hint, ${root} [role="status"]`);
    return e ? e.textContent.replace(/\s+/g, " ").trim() : "";
  }, ROOT).catch(() => "");
}

async function fillOptionalAnswers(seat, text) {
  const areas = await seat.page.$$(`${ROOT} textarea[data-prompt-field]`);
  let n = 0;
  for (const area of areas.slice(0, 2)) {
    await area.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const box = await area.boundingBox();
    if (!box) continue;
    await seat.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await seat.page.keyboard.type(text, { delay: 2 });
    n++;
  }
  return n;
}

/**
 * Run the whole induction for one seat. Resolves with { ok, stage, pages, name } or throws saying where it stopped.
 * @param {import("../browser/seat.mjs").Seat} seat
 * @param {object} spec  one entry of chargen-specs.json
 */
export async function runInduction(seat, spec, { log = () => {}, signal = null, maxMs = 6 * 60 * 1000, onPrompt = null } = {}) {
  const page = seat.page;
  const started = Date.now();
  const visited = [];
  let lastStage = null;
  let repeats = 0;
  while (Date.now() - started < maxMs) {
    if (signal?.aborted) return { ok: false, stage: lastStage, pages: visited, aborted: true };
    const stage = await currentStage(page);
    if (stage === "absent") {
      if (visited.includes("done")) return { ok: true, stage: "done", pages: visited, name: spec.name };
      await sleep(800);
      continue;
    }
    if (stage === lastStage) repeats++;
    else {
      repeats = 0;
      visited.push(stage);
      log(`induction: ${stage}`);
    }
    lastStage = stage;
    if (repeats > 7) throw new Error(`stuck on the ${stage} page; the page says: "${await hint(page)}"`);

    switch (stage) {
      case "begin":
        await seat.clickSelector(`${ROOT} button[data-action="begin"]`, { timeout: 8000 });
        await sleep(500);
        break;
      case "agreement": {
        // The agreement is drawn on a canvas, so there is nothing to read; a person turns the wheel a little and signs.
        const box = await page.$(`${ROOT} canvas`).then((c) => c?.boundingBox());
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          for (let i = 0; i < 3; i++) await page.mouse.wheel({ deltaY: 400 });
        }
        if (!(await seat.clickSelector(`${ROOT} button[data-action="signAgreement"]:not([disabled])`, { timeout: 30000 }))) throw new Error("the Sign button of the Service Agreement never became available");
        await sleep(600);
        break;
      }
      case "ancestry": {
        const picked = await page.$(`${ROOT} button[data-action="pickAncestry"][aria-pressed="true"]`);
        if (!picked && !(await seat.clickSelector(`${ROOT} button[data-action="pickAncestry"][data-ancestry-id="${spec.ancestry}"]`, { timeout: 8000 }))) throw new Error(`ancestry "${spec.ancestry}" is not in the list`);
        await sleep(300);
        await fillSlots(seat, "pickBoost", spec.free);
        await fillSlots(seat, "pickFlaw", []);
        await pressContinue(seat, "ancestry");
        break;
      }
      case "background": {
        const picked = await page.$(`${ROOT} button[data-action="pickBackground"][aria-pressed="true"]`);
        if (!picked && !(await seat.clickSelector(`${ROOT} button[data-action="pickBackground"][data-background-id="${spec.background}"]`, { timeout: 8000 }))) throw new Error(`background "${spec.background}" is not in the list`);
        await sleep(300);
        await fillSlots(seat, "pickBackgroundBoost", spec.free);
        await fillChoices(seat, "pickBackgroundChoice", spec.backgroundChoice);
        await pressContinue(seat, "background");
        break;
      }
      case "class": {
        const picked = await page.$(`${ROOT} button[data-action="pickClass"][aria-pressed="true"]`);
        if (!picked && !(await seat.clickSelector(`${ROOT} button[data-action="pickClass"][data-class-id="${spec.class}"]`, { timeout: 8000 }))) throw new Error(`class "${spec.class}" is not in the list`);
        await sleep(300);
        await fillSlots(seat, "pickClassKeyAbility", spec.keyAbility ? [spec.keyAbility] : []);
        await fillChoices(seat, "pickClassChoice", spec.classChoice);
        await pressContinue(seat, "class");
        break;
      }
      case "attributes": {
        for (const ability of spec.free ?? ["str", "dex", "con", "wis"]) {
          const state = await page.$eval(`${ROOT} button[data-action="toggleFreeBoost"][data-ability="${ability}"]`, (b) => ({ pressed: b.getAttribute("aria-pressed") === "true", disabled: b.disabled })).catch(() => null);
          if (!state || state.pressed || state.disabled) continue;
          await seat.clickSelector(`${ROOT} button[data-action="toggleFreeBoost"][data-ability="${ability}"]`, { timeout: 5000 });
          await sleep(180);
        }
        await pressContinue(seat, "attributes");
        break;
      }
      case "portrait": {
        if (spec.portrait && !spec.uploaded) {
          const input = await page.$(`${ROOT} input[data-portrait-file-input]`);
          if (input) {
            await input.uploadFile(path.join(PT_DIR, "assets", spec.portrait));
            spec = { ...spec, uploaded: true };
            await sleep(900);
            if (!(await seat.clickSelector(`${ROOT} button[data-action="confirmPortraitCrop"]:not([disabled])`, { timeout: 15000 }))) throw new Error("the portrait crop could not be confirmed");
            await page.waitForFunction((root) => !document.querySelector(`${root} button[data-action="confirmPortraitCrop"]`) || document.querySelector(`${root} button[data-action="removePortrait"]`), { timeout: 30000 }, ROOT).catch(() => {});
            await sleep(700);
          }
        }
        await pressContinue(seat, "portrait");
        break;
      }
      case "finishing": {
        const field = `${ROOT} input[data-prompt-field="finishing.name"]`;
        await seat.typeIntoSelector(field, spec.name);
        await sleep(150);
        await pressContinue(seat, "finishing");
        break;
      }
      case "questions":
        if (spec.fill && !spec.blank && !spec.filledQuestions) {
          await fillOptionalAnswers(seat, "A test answer, written by the playtest bot.");
          spec = { ...spec, filledQuestions: true };
        }
        await pressContinue(seat, "questions");
        break;
      case "player":
        await pressContinue(seat, "player");
        break;
      case "review": {
        const ready = await page.waitForSelector(`${ROOT} button[data-action="confirmCharacter"]:not([disabled])`, { timeout: 20000 }).catch(() => null);
        if (!ready) throw new Error(`Confirm is not available on the review page; the page says: "${await hint(page)}"`);
        await seat.clickSelector(`${ROOT} button[data-action="confirmCharacter"]`, { timeout: 5000 });
        // The character is made by the GM's client (a relay with a 20 second limit): wait for the Finish button, or a refusal. Some
        // backgrounds make sf2e ask a question of its own while the item is added (Starship Dweller: "Select a skill", Crafting or
        // Piloting) in a small window over the review page while the page itself says only "Creating your character": a person
        // answers it, so the bot does too, after saying it happened.
        const deadline = Date.now() + 60000;
        let prompted = false;
        while (Date.now() < deadline) {
          if (await page.$(`${ROOT} button[data-action="finishInduction"]`)) break;
          const promptTitle = await page.$eval(".application.pf2e:has(.choice-buttons) .window-title", (e) => e.textContent.trim()).catch(() => null);
          if (promptTitle) {
            if (!prompted) {
              prompted = true;
              log(`Confirm raised a question from the system ("${promptTitle}"); answering it`);
              onPrompt?.({ title: promptTitle, background: spec.background, text: await page.$eval(".application.pf2e:has(.choice-buttons) .window-content", (e) => e.innerText.replace(/\s+/g, " ").trim()).catch(() => "") });
            }
            await seat.clickSelector(".application.pf2e:has(.choice-buttons) .choice-buttons button", { timeout: 3000 });
          }
          await sleep(500);
        }
        if (!(await page.$(`${ROOT} button[data-action="finishInduction"]`))) throw new Error(`Confirm was pressed but the character did not appear within 60 seconds; the page says: "${await hint(page)}"`);
        break;
      }
      case "done":
        await seat.clickSelector(`${ROOT} button[data-action="finishInduction"]`, { timeout: 8000 });
        await sleep(800);
        return { ok: true, stage: "done", pages: [...visited, "finished"], name: spec.name };
      default:
        await sleep(700);
    }
  }
  throw new Error(`the induction did not finish within ${Math.round(maxMs / 1000)} seconds (last page: ${lastStage})`);
}
