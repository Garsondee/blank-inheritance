/**
 * The city board — the Foundry-touching half.
 *
 * See ideas/entries/city-map-location-board.json for the honest scope of
 * this: core/marker-layout.mjs's placement engine and .bi-marker's CSS were
 * both already built (the latter re-grimed alongside the deck) and used only
 * by design/ui/console.js's standalone prototype. This is a first real
 * Foundry-facing home for them — GM-only, and DEMO DATA, because there is no
 * real campaign location list yet (no coordinates, no authored risk levels)
 * and inventing one would be exactly the kind of content this project's own
 * discipline says is not mine to invent. The demo below is the same kind of
 * placeholder `data/campaign/stage-demo.json` already is for the character
 * stage — proving the mechanism, not proposing canon.
 *
 * Same toggle chassis as Phone (button + panel, one root, so a re-render can
 * never leave them disagreeing about open/closed) — see that file's header.
 */

import { cityBoardLayout } from "../core/city-board.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/city-board`;

/** The board's own authored size — .bi-marker's percentages resolve against this. */
const BOARD_WIDTH = 1200;
const BOARD_HEIGHT = 680;

/**
 * DEMO locations only — see this file's header. Coordinates are fractions of
 * the board (0..1); `risk` is 0-5, read by core/city-board.mjs#riskTone the
 * same way the deck's own key pips read a proficiency rank.
 */
const DEMO_LOCATIONS = Object.freeze([
  { id: "harbour", name: "Harbour Gate", code: "LX-01", x: 0.18, y: 0.62, status: "Open", risk: 1,
    detail: "Standing patrol, nothing unusual" },
  { id: "market", name: "Old Market Street", code: "LX-02", x: 0.42, y: 0.3, status: "Crowded", risk: 2,
    detail: "Good cover, bad line of sight" },
  { id: "depot", name: "Freight Depot", code: "LX-03", x: 0.68, y: 0.58, status: "Watched", risk: 3,
    detail: "A parked car has not moved in two days" },
  { id: "tower", name: "Signal Tower", code: "LX-04", x: 0.82, y: 0.22, status: "Restricted", risk: 4,
    detail: "Directorate checkpoint, papers required" },
  { id: "yard", name: "Rail Yard", code: "LX-05", x: 0.3, y: 0.82, status: "Sealed", risk: 5,
    detail: "Do not approach without a real reason" }
]);

export class CityBoard extends HandlebarsApplicationMixin(ApplicationV2) {
  #open = false;

  static DEFAULT_OPTIONS = {
    id: "bi-city-board",
    tag: "div",
    classes: ["bi-city-board-standalone"],
    window: { frame: false, positioned: false },
    actions: {
      toggle: CityBoard.#onToggle,
      selectMarker: CityBoard.#onSelectMarker
    }
  };

  static PARTS = {
    body: { template: `${TEMPLATE_ROOT}/panel.hbs` }
  };

  /** Which marker is expanded, so its card floats above its neighbours' — matches V1's own :hover/--selected treatment. */
  #selectedId = null;

  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** @override */
  async _prepareContext() {
    const placed = cityBoardLayout(DEMO_LOCATIONS, { width: BOARD_WIDTH, height: BOARD_HEIGHT });
    return {
      open: this.#open,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      // Booleans, not a concatenated `bi-marker--{{tone}}` class: the tier-0
      // class lint only sees a literal class name sitting OUTSIDE a {{ }}
      // expression (see banner.hbs's own comment on this exact convention),
      // and a concatenated one disappears into the text it strips first.
      markers: placed.map((m) => ({
        ...m,
        isOk: m.tone === "ok",
        isWarn: m.tone === "warn",
        isDanger: m.tone === "danger",
        isSelected: m.id === this.#selectedId,
        dx: (m.card?.x ?? m.dot.x) - m.dot.x,
        dy: (m.card?.y ?? m.dot.y) - m.dot.y
      }))
    };
  }

  get open() {
    return this.#open;
  }

  toggle() {
    CityBoard.#onToggle.call(this);
  }

  static #onToggle() {
    this.#open = !this.#open;
    this.render({});
  }

  static #onSelectMarker(event, target) {
    const id = target.closest("[data-marker]")?.dataset.marker;
    this.#selectedId = this.#selectedId === id ? null : id;
    this.render({});
  }
}

let active = null;

export function mountCityBoard() {
  if (!game.user?.isGM) return null;
  if (!active) active = new CityBoard();
  active.render({ force: true });
  return active;
}

export function toggleCityBoard() {
  if (!game.user?.isGM) return null;
  (active ?? mountCityBoard()).toggle();
  return active;
}
