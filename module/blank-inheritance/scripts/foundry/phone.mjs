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
 * Two apps ship in this pass, deliberately not the other seven from
 * ideas/entries/phone-app-suite.json: Session Log (GM-only, real data —
 * reads foundry/session-log.mjs's own buffer, the same source
 * foundry/director-bar.mjs's log zone already writes to, just ALL of it
 * instead of a 3-line receipt) and Snake (both seats, zero content
 * dependency, proves the shell's app-switching mechanics against fully
 * tested pure logic that already existed in core/phone.mjs and had nowhere
 * to run). The other seven need systems that don't exist yet
 * (correspondence, the asset pipeline, Recall Knowledge automation) and
 * would mean feeding the panel more fixture data — exactly what this file
 * is trying not to do.
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
import { createSnake, formatLogEntriesForDisplay, spawnFood, stepSnake, turnSnake } from "../core/phone.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";

const SNAKE_WIDTH = 15;
const SNAKE_HEIGHT = 11;
const SNAKE_CELL_PX = 20;
const SNAKE_TICK_MS = 130;

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

const GM_APPS = [SESSION_LOG_APP, SNAKE_APP];
const PLAYER_APPS = [SNAKE_APP];

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
