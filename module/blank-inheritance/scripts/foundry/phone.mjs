/**
 * The personal comm device — the Foundry-touching half of the shell.
 *
 * Structure and visual language are the SAME `.bi-terminal`/`.bi-phone-btn`
 * chrome the 2026-09 V1 prototype (design/ui/phone.js) built and had
 * reviewed twice; that CSS already shipped into bi-components.css. What
 * didn't exist yet was a Foundry mount reading real data instead of V1's
 * fixture arrays — see design/foundry-module-design.md and the project's own
 * hard-won lesson (project_v2_console) that a prototype's worst failure mode
 * is pretending an array of fixtures is data.
 *
 * Four apps ship in this pass: Session Log (GM-only, real data — reads
 * foundry/session-log.mjs's own buffer, the same source
 * foundry/director-bar.mjs's log zone already writes to, just ALL of it
 * instead of a 3-line receipt), Snake (both seats, zero content dependency,
 * proves the shell's app-switching mechanics against fully tested pure logic
 * that already existed in core/phone.mjs and had nowhere to run), and — per
 * Ingram's 2026-09-17 direction to build width and depth first and worry
 * about real backing systems later — Pet and Fortune, both reusing pure logic
 * that was ALREADY written and tested in core/phone.mjs (`petMood`,
 * `feedPet`/`playWithPet`/`decayForElapsed`, `drawFortune`) with nowhere to
 * render, and Pet's own CSS (`.bi-pet*`, bi-components.css) already built and
 * likewise unused. Genuinely still not built: the other five
 * (correspondence, the field guide, the bulletin board, the Resonance
 * ticker, Bleed-as-corruption) — each needs either a system that does not
 * exist yet (correspondence, Recall Knowledge automation) or a mechanic this
 * project has flagged NEEDS REWORK (Resonance, Bleed), and building UI for
 * either would misrepresent something as settled that is not.
 *
 * Pet's state is a CLIENT setting, deliberately — "purely textural, zero
 * mechanical weight" per the idea entry, so it is genuinely each player's own
 * (and the GM's own), never a world setting the whole table would see change,
 * and never worth the complexity of a socket round-trip. Fortune's pool is
 * generic flavour text, not campaign lore — the idea entry's "sometimes a
 * real hint" half needs a real mechanical source for what counts as a hint,
 * which does not exist yet, so every entry here is honestly `real: false`.
 *
 * Snake runs its own imperative paint loop rather than going through
 * ApplicationV2's render cycle — re-running _prepareContext/Handlebars on
 * every ~120ms tick would be real, pointless overhead, and ApplicationV2 has
 * no notion of "leave this one DOM subtree alone between renders." The app
 * mount point is built once per app-switch and torn down (clearInterval,
 * key listener removed) the moment another app opens or the panel closes —
 * a game left running behind a closed panel is a silent battery/CPU leak
 * for no player-visible benefit.
 */

import { currentEntries } from "./session-log.mjs";
import {
  createSnake, decayForElapsed, drawFortune, feedPet, formatLogEntriesForDisplay,
  petMood, playWithPet, spawnFood, stepSnake, turnSnake
} from "../core/phone.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";

const SNAKE_WIDTH = 15;
const SNAKE_HEIGHT = 11;
const SNAKE_CELL_PX = 20;
const SNAKE_TICK_MS = 130;

/* ------------------------------------------------------------------ */
/*  Pet app — real state (a client setting), reused pure logic          */
/* ------------------------------------------------------------------ */

const SETTING_PET = "petState";
const PET_DEFAULT = Object.freeze({ fed: 70, played: 70, lastSeen: null });
const PET_DECAY_PER_HOUR = 0.5;

/** Registered from blank-inheritance.mjs's init hook, alongside every other setting. */
export function registerPetSettings() {
  game.settings.register(MODULE_ID, SETTING_PET, {
    scope: "client", config: false, type: Object, default: PET_DEFAULT
  });
}

/** The pet's state, decayed for whatever real time has passed since it was last read. */
function currentPetState() {
  const stored = game.settings.get(MODULE_ID, SETTING_PET) ?? PET_DEFAULT;
  if (!stored.lastSeen) return { ...stored, lastSeen: Date.now() };
  const elapsed = Date.now() - stored.lastSeen;
  return { ...decayForElapsed(stored, elapsed, PET_DECAY_PER_HOUR), lastSeen: stored.lastSeen };
}

async function savePetState(state) {
  await game.settings.set(MODULE_ID, SETTING_PET, { ...state, lastSeen: Date.now() });
}

/**
 * One hand-drawn line-art body, four interchangeable eye/mouth pairs picked
 * by mood — the SAME "phosphor line, not a pixel sprite" idiom the main
 * instrument's own SVG faces use (core/vu-meter.mjs, core/day-ring.mjs). Kept
 * as a plain lookup table here rather than in core/: it is fixed content, not
 * arithmetic, the same category as core/splash.mjs's FACTION_ACCENTS.
 */
const PET_BODY = "M 20 55 Q 20 20 50 20 Q 80 20 80 55 L 80 75 Q 74 68 68 75 Q 62 82 56 75 Q 50 82 44 75 Q 38 82 32 75 Q 26 68 20 75 Z";
/** Full literal keys, not a template string — the localisation lint reads
 *  keys out of source text and a `${mood}` interpolation would hide these
 *  four from it (the same fix applied to core/orb-readout.mjs's outcomes). */
const PET_MOOD_KEYS = Object.freeze({
  delighted: "BLANKINHERITANCE.Phone.Pet.Mood.delighted",
  content: "BLANKINHERITANCE.Phone.Pet.Mood.content",
  restless: "BLANKINHERITANCE.Phone.Pet.Mood.restless",
  sulking: "BLANKINHERITANCE.Phone.Pet.Mood.sulking"
});
const PET_FACES = Object.freeze({
  delighted: { eyeL: "M 32 47 Q 38 40 44 47", eyeR: "M 56 47 Q 62 40 68 47", mouth: "M 39 61 Q 50 73 61 61" },
  content: { eyeL: "M 35 47 A 3 3 0 1 0 41 47 A 3 3 0 1 0 35 47", eyeR: "M 59 47 A 3 3 0 1 0 65 47 A 3 3 0 1 0 59 47", mouth: "M 42 62 Q 50 67 58 62" },
  restless: { eyeL: "M 35 48 A 3 3 0 1 0 41 48 A 3 3 0 1 0 35 48 M 33 40 L 43 40", eyeR: "M 59 48 A 3 3 0 1 0 65 48 A 3 3 0 1 0 59 48 M 57 40 L 67 40", mouth: "M 40 63 Q 45 59 50 63 Q 55 67 60 63" },
  sulking: { eyeL: "M 32 44 Q 38 50 44 44", eyeR: "M 56 44 Q 62 50 68 44", mouth: "M 40 67 Q 50 59 60 67" }
});

function renderPet(mount) {
  let state = currentPetState();

  mount.innerHTML = `
    <div class="bi-pet">
      <div class="bi-pet__stage">
        <svg class="bi-pet__svg" viewBox="0 0 100 100" data-pet-svg fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="${PET_BODY}"></path>
          <path data-pet-eye-l></path>
          <path data-pet-eye-r></path>
          <path data-pet-mouth></path>
        </svg>
      </div>
      <span class="bi-pet__mood" data-pet-mood></span>
      <div class="bi-pet__meters">
        <div class="bi-pet__meter-col">
          <span class="bi-pet__meter-label">${game.i18n.localize("BLANKINHERITANCE.Phone.Pet.Fed")}</span>
          <div class="bi-pet__meter-track"><div class="bi-pet__meter-fill" data-pet-fed></div></div>
        </div>
        <div class="bi-pet__meter-col">
          <span class="bi-pet__meter-label">${game.i18n.localize("BLANKINHERITANCE.Phone.Pet.Played")}</span>
          <div class="bi-pet__meter-track"><div class="bi-pet__meter-fill" data-pet-played></div></div>
        </div>
      </div>
      <div class="bi-terminal__keyrow">
        <button type="button" class="bi-term-key" data-pet-feed>${game.i18n.localize("BLANKINHERITANCE.Phone.Pet.Feed")}</button>
        <button type="button" class="bi-term-key" data-pet-play>${game.i18n.localize("BLANKINHERITANCE.Phone.Pet.Play")}</button>
      </div>
    </div>`;

  const svg = mount.querySelector("[data-pet-svg]");
  const moodEl = mount.querySelector("[data-pet-mood]");
  const fedFill = mount.querySelector("[data-pet-fed]");
  const playedFill = mount.querySelector("[data-pet-played]");

  function paint() {
    const mood = petMood(state);
    const face = PET_FACES[mood];
    svg.dataset.mood = mood;
    svg.querySelector("[data-pet-eye-l]").setAttribute("d", face.eyeL);
    svg.querySelector("[data-pet-eye-r]").setAttribute("d", face.eyeR);
    svg.querySelector("[data-pet-mouth]").setAttribute("d", face.mouth);
    moodEl.textContent = game.i18n.localize(PET_MOOD_KEYS[mood]);
    fedFill.style.width = `${state.fed}%`;
    playedFill.style.width = `${state.played}%`;
  }
  paint();

  mount.querySelector("[data-pet-feed]").addEventListener("click", async () => {
    state = feedPet(state);
    await savePetState(state);
    paint();
  });
  mount.querySelector("[data-pet-play]").addEventListener("click", async () => {
    state = playWithPet(state);
    await savePetState(state);
    paint();
  });

  // The visit itself resets the decay clock, whether or not anything was
  // fed or played — opening the app is "checking in on it".
  savePetState(state).catch((err) => console.error("Blank Inheritance | Could not save pet state:", err));
  return null;
}

/* ------------------------------------------------------------------ */
/*  Fortune app — generic flavour text, zero campaign content           */
/* ------------------------------------------------------------------ */

/**
 * Campy and generic on purpose — see this file's header. `real` is always
 * false: no mechanical hint system exists yet for any of these to feed.
 */
const FORTUNE_POOL = Object.freeze([
  { text: "A door you already tried will open on the second knock.", weight: 1 },
  { text: "Today rewards the person who checks twice.", weight: 1 },
  { text: "Someone nearby remembers you fondly. Say hello first.", weight: 1 },
  { text: "The quiet option is the correct one, for once.", weight: 1 },
  { text: "A debt gets called in sideways, not the way you expect.", weight: 1 },
  { text: "Patience pays out later today, in a currency you didn't ask for.", weight: 1 },
  { text: "Something you dismissed as junk still has one use left in it.", weight: 1 },
  { text: "The loud plan works. The quiet plan works better.", weight: 1 },
  { text: "A stranger's advice is worth exactly what you paid for it. Take it anyway.", weight: 1 },
  { text: "Tomorrow forgives what today cannot.", weight: 1 }
]);

function renderFortune(mount) {
  mount.innerHTML = `
    <div class="bi-fortune">
      <p class="bi-fortune__text" data-fortune-text>${game.i18n.localize("BLANKINHERITANCE.Phone.Fortune.Prompt")}</p>
      <button type="button" class="bi-term-key" data-fortune-draw>${game.i18n.localize("BLANKINHERITANCE.Phone.Fortune.Draw")}</button>
    </div>`;
  mount.querySelector("[data-fortune-draw]").addEventListener("click", () => {
    mount.querySelector("[data-fortune-text]").textContent = drawFortune(FORTUNE_POOL).text;
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  Session Log app — real data, GM only                              */
/* ------------------------------------------------------------------ */

function renderSessionLog(mount) {
  const rows = formatLogEntriesForDisplay(currentEntries());
  mount.innerHTML = `
    <ul class="bi-log__recent bi-phone__log-list">
      ${
        rows.length
          ? rows
              .map(
                (row) => `
        <li class="bi-log__entry">
          <span class="bi-phone__log-time">${row.time}</span>
          ${row.tag ? `<span class="bi-log__tag">${row.tag}</span>` : ""}
          <span class="bi-log__text">${row.text}</span>
        </li>`
              )
              .join("")
          : `<li class="bi-log__entry bi-log__entry--empty">${game.i18n.localize("BLANKINHERITANCE.Phone.SessionLog.Empty")}</li>`
      }
    </ul>`;
  return null; // nothing to tear down -- a static list, no timers/listeners
}

/* ------------------------------------------------------------------ */
/*  Snake app — zero content, proves the shell                        */
/* ------------------------------------------------------------------ */

function renderSnake(mount) {
  mount.innerHTML = `
    <div class="bi-snake">
      <div class="bi-snake__hud">
        <span class="bi-legend">${game.i18n.localize("BLANKINHERITANCE.Phone.Snake.Score")}</span>
        <span class="bi-readout bi-readout--lg" data-snake-score>0</span>
      </div>
      <div class="bi-snake__board-wrap">
        <div class="bi-snake__board" data-snake-board
             style="grid-template-columns:repeat(${SNAKE_WIDTH}, ${SNAKE_CELL_PX}px);grid-template-rows:repeat(${SNAKE_HEIGHT}, ${SNAKE_CELL_PX}px)"></div>
        <div class="bi-snake__overlay" data-snake-overlay hidden>
          <div>${game.i18n.localize("BLANKINHERITANCE.Phone.Snake.GameOver")}</div>
          <button type="button" class="bi-term-key" data-snake-restart>${game.i18n.localize("BLANKINHERITANCE.Phone.Snake.Restart")}</button>
        </div>
      </div>
    </div>`;

  const board = mount.querySelector("[data-snake-board]");
  const scoreEl = mount.querySelector("[data-snake-score]");
  const overlay = mount.querySelector("[data-snake-overlay]");
  const cells = [];
  for (let i = 0; i < SNAKE_WIDTH * SNAKE_HEIGHT; i++) {
    const cell = document.createElement("div");
    cell.className = "bi-snake__cell";
    board.appendChild(cell);
    cells.push(cell);
  }

  let state = createSnake(SNAKE_WIDTH, SNAKE_HEIGHT);

  function paint() {
    for (const cell of cells) cell.className = "bi-snake__cell";
    state.snake.forEach((point, index) => {
      const cell = cells[point.y * SNAKE_WIDTH + point.x];
      if (cell) cell.className = `bi-snake__cell ${index === 0 ? "bi-snake__cell--head" : "bi-snake__cell--snake"}`;
    });
    if (state.food) {
      const foodCell = cells[state.food.y * SNAKE_WIDTH + state.food.x];
      if (foodCell) foodCell.classList.add("bi-snake__cell--food");
    }
    scoreEl.textContent = String(state.score);
    overlay.hidden = state.alive;
  }

  let timer = setInterval(() => {
    if (!state.alive) return;
    state = stepSnake(state);
    paint();
  }, SNAKE_TICK_MS);

  function restart() {
    state = createSnake(SNAKE_WIDTH, SNAKE_HEIGHT);
    overlay.hidden = true;
    paint();
  }
  mount.querySelector("[data-snake-restart]").addEventListener("click", restart);

  const KEY_DIRS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }
  };
  function onKeyDown(event) {
    const dir = KEY_DIRS[event.key];
    if (!dir) return;
    event.preventDefault();
    state = turnSnake(state, dir);
  }
  document.addEventListener("keydown", onKeyDown);

  paint();

  return () => {
    clearInterval(timer);
    timer = null;
    document.removeEventListener("keydown", onKeyDown);
  };
}

/* ------------------------------------------------------------------ */
/*  The app registry                                                  */
/* ------------------------------------------------------------------ */

const SESSION_LOG_APP = {
  id: "session-log",
  labelKey: "BLANKINHERITANCE.Phone.SessionLog.Title",
  faIcon: "fa-solid fa-clipboard-list",
  render: renderSessionLog
};
const SNAKE_APP = { id: "snake", labelKey: "BLANKINHERITANCE.Phone.Snake.Title", faIcon: "fa-solid fa-gamepad", render: renderSnake };
const PET_APP = { id: "pet", labelKey: "BLANKINHERITANCE.Phone.Pet.Title", faIcon: "fa-solid fa-paw", render: renderPet };
const FORTUNE_APP = { id: "fortune", labelKey: "BLANKINHERITANCE.Phone.Fortune.Title", faIcon: "fa-solid fa-star", render: renderFortune };

const GM_APPS = [SESSION_LOG_APP, SNAKE_APP, PET_APP, FORTUNE_APP];
const PLAYER_APPS = [SNAKE_APP, PET_APP, FORTUNE_APP];

/* ------------------------------------------------------------------ */
/*  The shell                                                         */
/* ------------------------------------------------------------------ */

export class Phone extends HandlebarsApplicationMixin(ApplicationV2) {
  #open = false;
  #currentAppId = null;
  #cleanupApp = null;

  static DEFAULT_OPTIONS = {
    id: "bi-phone",
    tag: "div",
    classes: ["bi-phone-standalone"],
    window: { frame: false, positioned: false },
    actions: {
      toggle: Phone.#onToggle,
      switchApp: Phone.#onSwitchApp
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/console/phone.hbs` }
  };

  constructor(options = {}) {
    super(options);
    this.#currentAppId = this.apps[0]?.id ?? null;
  }

  get apps() {
    return game.user.isGM ? GM_APPS : PLAYER_APPS;
  }

  /** Same idiom as command-bar.mjs -- persistent chrome mounts into #interface, not document.body. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    const apps = this.apps;
    return {
      open: this.#open,
      apps: apps.map((app) => ({ id: app.id, labelKey: app.labelKey, faIcon: app.faIcon, current: app.id === this.#currentAppId })),
      currentApp: apps.find((app) => app.id === this.#currentAppId) ?? null
    };
  }

  /**
   * @override
   * Mounts (or re-mounts) the current app's own imperative content — see
   * this file's header for why that content is NOT part of the Handlebars
   * template. Guarded on the mount point's own dataset so switching between
   * closed<->open without changing app never tears down a running game.
   */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const mount = this.element.querySelector("[data-app-mount]");
    if (!mount || mount.dataset.mountedApp === this.#currentAppId) return;

    this.#cleanupApp?.();
    this.#cleanupApp = null;
    mount.innerHTML = "";

    const app = this.apps.find((a) => a.id === this.#currentAppId);
    if (app) this.#cleanupApp = app.render(mount) ?? null;
    mount.dataset.mountedApp = this.#currentAppId ?? "";
  }

  /** @override */
  async close(options) {
    this.#cleanupApp?.();
    this.#cleanupApp = null;
    return super.close(options);
  }

  /** Open or close the device from outside its own button — the deck's Comms pill. */
  toggle() {
    Phone.#onToggle.call(this);
  }

  static #onToggle() {
    this.#open = !this.#open;
    // A closed phone running Snake's interval in the background is a silent
    // leak for zero player-visible benefit -- tear the current app down and
    // let the next open re-mount it fresh, same as switching apps does.
    if (!this.#open) {
      this.#cleanupApp?.();
      this.#cleanupApp = null;
      const mount = this.element.querySelector("[data-app-mount]");
      if (mount) mount.dataset.mountedApp = "";
    }
    this.render();
  }

  static #onSwitchApp(event, target) {
    this.#currentAppId = target.dataset.appId;
    this.render();
  }
}

let active = null;

/** Mount the phone, or re-assert an already-mounted one -- same lifecycle as the command bar. */
export function mountPhone() {
  if (!active) active = new Phone();
  active.render({ force: true });
  return active;
}

/** Open or close the mounted phone; mounts it first if nothing has yet. */
export function togglePhone() {
  (active ?? mountPhone()).toggle();
}
