/**
 * Choice prompts -- the Foundry half (core/choice-prompt.mjs owns the rules
 * and says why: one GM button, every player picks, and "Something else" is
 * always the last option).
 *
 * WHERE THINGS LIVE
 *   - One world setting, `choicePrompt`: the open question and every player's
 *     pick on it. Only the active GM writes it; every client repaints when it
 *     changes, the way the City's record and the campaign clock already work.
 *     Picks are public (players see each other's picks arrive), so there is
 *     nothing in it that needs hiding from a client.
 *   - A player's pick goes to the active GM through Foundry's own query system
 *     (CONFIG.queries / User#query), the same road the City's departures use,
 *     and is applied one at a time on the GM's side. The answer comes back, so
 *     the window can say "the table is not being asked" instead of guessing.
 *
 * WHAT A PLAYER SEES
 *   A small window on every non-GM client: the question, a big button per
 *   option saying what it leads to and who has picked it, and "Something else".
 *   Pressing your own pick again takes it back. Closing the window leaves the
 *   question open; the GM still sees you as undecided. A reload brings it back.
 *
 * THE GM'S SIDE is in foundry/scene-runner.mjs: one button on the beat opens
 * the question, the beat shows the live picks, and one more press closes it
 * and records who went where.
 */

import { applyPromptPick, emptyPromptState, openPrompt, promptTally } from "../core/choice-prompt.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const SETTING = "choicePrompt";
const QUERY_PICK = `${MODULE_ID}.choicePick`;
const TEMPLATE = `modules/${MODULE_ID}/templates/choice-prompt/window.hbs`;

export { emptyPromptState };

export function registerChoicePromptSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING, { scope: "world", config: false, type: Object, default: emptyPromptState(), onChange });
}

/** The open question, or null. */
export function currentChoicePrompt() {
  try {
    const stored = game.settings.get(MODULE_ID, SETTING);
    return stored && typeof stored === "object" ? stored.prompt ?? null : null;
  } catch {
    return null;
  }
}

async function writePrompt(prompt) {
  if (!game.user?.isGM) return null;
  await game.settings.set(MODULE_ID, SETTING, { ...emptyPromptState(), prompt });
  return prompt;
}

/** Everyone a question waits on: players with a character, and anyone else who is actually here. */
export function choiceRoster() {
  return game.users
    .filter((u) => !u.isGM && (u.character || u.active))
    .map((u) => ({
      userId: u.id,
      name: u.name,
      characterName: u.character?.name ?? null,
      color: u.color?.css ?? (typeof u.color === "string" ? u.color : null),
      img: u.character?.img || u.avatar || null,
      active: u.active
    }));
}

/** The open question as the Runner draws it: head-count, who is waiting, what each option has. Null when none is open for this beat. */
export function choiceTallyFor(briefId, beatId) {
  const prompt = currentChoicePrompt();
  if (!prompt || prompt.briefId !== briefId || prompt.beatId !== beatId) return null;
  return { prompt, ...promptTally(prompt, choiceRoster()) };
}

/* ------------------------------------------------------------------ */
/*  The conversation                                                   */
/* ------------------------------------------------------------------ */

let queue = Promise.resolve();
/** Picks are applied one at a time on the GM's client, so two at once cannot overwrite each other. */
const serially = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

/** Every client, at ready: the GM answers picks, a player picks up a question that was already open. */
export function registerChoicePromptConversation() {
  CONFIG.queries ??= {};
  CONFIG.queries[QUERY_PICK] = async (data, { user } = {}) => gmChoicePick(user?.id, data?.optionId ?? null);
  syncChoicePromptWindow();
}

/** A player's pick, sent to the active GM and answered. `optionId` null takes it back. Resolves to `{ ok, reason? }`. */
export async function requestChoicePick(optionId) {
  if (game.user?.isGM) return { ok: false, reason: "gm-records-it" };
  const gm = game.users.activeGM;
  if (!gm) return { ok: false, reason: "no-gm" };
  try {
    return (await gm.query(QUERY_PICK, { optionId }, { timeout: 10000 })) ?? { ok: false, reason: "no-answer" };
  } catch {
    return { ok: false, reason: "no-answer" };
  }
}

function gmChoicePick(userId, optionId) {
  return serially(async () => {
    if (!game.user?.isGM || !userId) return { ok: false, reason: "not-gm" };
    const result = applyPromptPick(currentChoicePrompt(), { userId, optionId });
    if (!result.ok) return { ok: false, reason: result.reason };
    await writePrompt(result.prompt);
    return { ok: true, optionId };
  });
}

/* ------------------------------------------------------------------ */
/*  The GM's controls                                                  */
/* ------------------------------------------------------------------ */

/** Open a question for the table. Replaces any question already open: there is only ever one. */
export async function openChoicePrompt({ briefId, beatId, choicePoint }) {
  if (!game.user?.isGM) return null;
  const prompt = openPrompt({
    id: foundry.utils.randomID(),
    briefId,
    beatId,
    choicePoint,
    openedAt: Date.now(),
    elseLabel: game.i18n.localize("BLANKINHERITANCE.ChoicePrompt.ElseLabel"),
    elseBlurb: game.i18n.localize("BLANKINHERITANCE.ChoicePrompt.ElseBlurb")
  });
  return writePrompt(prompt);
}

/** Close the question and hand back what it held (null if none was open). */
export async function closeChoicePrompt() {
  if (!game.user?.isGM) return null;
  const prompt = currentChoicePrompt();
  if (!prompt) return null;
  await writePrompt(null);
  return prompt;
}

/* ------------------------------------------------------------------ */
/*  The player's window                                                */
/* ------------------------------------------------------------------ */

let windowApp = null;
let dismissedId = null;

/**
 * Called on every client whenever the record changes (and once at ready):
 * a player's window opens, follows, or goes away with the question. The GM
 * never gets one; the Runner is the GM's view of it.
 */
export function syncChoicePromptWindow() {
  if (game.user?.isGM) return;
  const prompt = currentChoicePrompt();
  if (!prompt) {
    dismissedId = null;
    windowApp?.closeFromSync();
    return;
  }
  if (windowApp) {
    if (windowApp.promptId === prompt.id) {
      windowApp.render({});
      return;
    }
    windowApp.closeFromSync();
  }
  if (dismissedId === prompt.id) return;
  const app = new ChoicePromptWindow(prompt.id);
  windowApp = app;
  app.render({ force: true }).catch((err) => {
    console.error("Blank Inheritance | Could not open the choice window:", err);
    if (windowApp === app) windowApp = null;
  });
}

class ChoicePromptWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    // Unique per window ({id} is Foundry's own placeholder): a second question
    // opened as the first closes must not collide with it while it animates shut.
    id: "bi-choice-prompt-{id}",
    tag: "section",
    classes: ["bi-choice-window"],
    window: { title: "BLANKINHERITANCE.ChoicePrompt.Title", icon: "fa-solid fa-signs-post", resizable: false, minimizable: false },
    position: { width: 460, height: "auto" },
    actions: { pick: ChoicePromptWindow.#onPick }
  };

  static PARTS = { body: { template: TEMPLATE } };

  #promptId;
  #closedBySync = false;

  constructor(promptId, options = {}) {
    super(options);
    this.#promptId = promptId;
  }

  get promptId() {
    return this.#promptId;
  }

  closeFromSync() {
    this.#closedBySync = true;
    if (windowApp === this) windowApp = null;
    this.close().catch(() => {});
  }

  /** @override */
  async _prepareContext() {
    const prompt = currentChoicePrompt();
    if (!prompt || prompt.id !== this.#promptId) return { question: null, options: [], waiting: "" };
    const tally = promptTally(prompt, choiceRoster());
    const mine = prompt.picks?.[game.user.id] ?? null;
    return {
      question: prompt.question,
      intro: game.i18n.localize("BLANKINHERITANCE.ChoicePrompt.Intro"),
      options: prompt.options.map((option) => {
        const row = tally.byOption.find((o) => o.id === option.id);
        return {
          ...option,
          takers: (row?.takers ?? []).join(", "),
          isMine: option.id === mine
        };
      }),
      hint: game.i18n.localize("BLANKINHERITANCE.ChoicePrompt.Hint"),
      progress: game.i18n.format("BLANKINHERITANCE.ChoicePrompt.Progress", { done: tally.done, total: tally.total })
    };
  }

  static async #onPick(event, target) {
    const optionId = target.dataset.optionId;
    const mine = currentChoicePrompt()?.picks?.[game.user.id] ?? null;
    const result = await requestChoicePick(mine === optionId ? null : optionId);
    if (!result.ok) {
      ui.notifications.warn(
        game.i18n.localize(result.reason === "no-gm" ? "BLANKINHERITANCE.ChoicePrompt.NoGM" : "BLANKINHERITANCE.ChoicePrompt.NotTaken")
      );
    }
    this.render({});
  }

  /** @override A window the player closed stays closed for this question; one the question closed is simply gone. */
  _onClose(options) {
    super._onClose?.(options);
    if (!this.#closedBySync) dismissedId = this.#promptId;
    if (windowApp === this) windowApp = null;
  }
}
