/**
 * The City, as everyone sees it during a departure -- markers, cards, the
 * departure board, the arrival dialogue and the dashed pick lines
 * (design/world-map-destinations.md §5-§7).
 *
 * Ingram, 2026-09-28: "Make the map choices nice and attractive, a thumbnail
 * preview of the scene image (with an option to blur and desaturate scene
 * images which are unknown and meant to be a mystery or a surprise. Players
 * will come to recognise options as much by their thumbnail images as by
 * their wording ... ideally so that the players can also see the readiness
 * and choices of other players too. Perhaps once a choice is picked we draw a
 * dashed line from their token's current location to their destination, so
 * that the players can see the map starting to fill up with these dashed
 * lines."
 *
 * HOW IT IS DRAWN
 *   - Markers are HTML inside Foundry's own HUD container (#hud), which
 *     Foundry keeps aligned to the canvas as it pans and zooms. Each marker is
 *     counter-scaled so it stays the same size on screen at any zoom. HTML,
 *     not Notes: a Note is a shared document, so it cannot show one player
 *     something the others do not see, and a player can only double-click one.
 *   - The dashed lines are PIXI graphics on canvas.controls, the layer
 *     foundry/travel-trail.mjs already draws on, marching toward the
 *     destination. They are redrawn at a constant on-screen width.
 *   - The board, the card and the arrival dialogue are fixed to the screen.
 *   - Everything is per client, from core/departures.mjs#projectForViewer, so
 *     a private pick is never drawn for anybody it is not for.
 */

import {
  ARRIVAL_MODES,
  departureFromThen,
  isChoosing,
  markerState,
  projectForViewer,
  readiness,
  thumbnailFor,
  dashSegments,
  declutter
} from "../core/departures.mjs";
import { escapeHtml } from "../core/inline-triggers.mjs";
import { fetchModuleJson } from "./io.mjs";
import { scenePointFor } from "./travel.mjs";
import { isHubScene, pawnFor, pawnSize } from "./city-pawns.mjs";
import {
  cancelCityDeparture,
  cityActivity,
  cityRoster,
  cityState,
  everyoneTo,
  gmPick,
  goCityDeparture,
  holdCityDeparture,
  noteCityActivity,
  privatePicksForViewer,
  refreshMyPrivatePick,
  requestCityPick
} from "./city-state.mjs";

const MODULE_ID = "blank-inheritance";
const SCENE_SET_PATH = "data/campaign/campaign/scene-set.json";
const MODE_ICON = {
  train: "fa-train",
  ferry: "fa-ferry",
  bus: "fa-bus",
  road: "fa-truck",
  tram: "fa-train-tram",
  bicycle: "fa-bicycle",
  foot: "fa-person-walking",
  teleport: "fa-bolt"
};
const LINE_PX = 3;
const DASH_PX = 16;
const GAP_PX = 11;
const MARCH_PX_PER_SEC = 34;

// Text and attribute values alike: escapeHtml leaves quotes alone, and every value here may land in an attribute.
const h = (value) => escapeHtml(value).replace(/"/g, "&quot;");
// Every key is written out in full, so test/tier0-architecture.test.mjs can
// check each one exists; the two that vary are looked up in tables below.
const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const KIND_KEY = {
  sent: "BLANKINHERITANCE.City.Kind.sent",
  together: "BLANKINHERITANCE.City.Kind.together",
  free: "BLANKINHERITANCE.City.Kind.free",
  muster: "BLANKINHERITANCE.City.Kind.muster",
  arrive: "BLANKINHERITANCE.City.Kind.arrive"
};
const REFUSED_KEY = {
  full: "BLANKINHERITANCE.City.Refused.full",
  "gm-uses-send": "BLANKINHERITANCE.City.Refused.gmUsesSend",
  gone: "BLANKINHERITANCE.City.Refused.gone",
  held: "BLANKINHERITANCE.City.Refused.held",
  "no-answer": "BLANKINHERITANCE.City.Refused.noAnswer",
  "no-gm": "BLANKINHERITANCE.City.Refused.noGm",
  "no-user": "BLANKINHERITANCE.City.Refused.noUser",
  "not-eligible": "BLANKINHERITANCE.City.Refused.notEligible",
  "not-gm": "BLANKINHERITANCE.City.Refused.notGm",
  "nothing-to-pick": "BLANKINHERITANCE.City.Refused.nothingToPick",
  "unknown-destination": "BLANKINHERITANCE.City.Refused.unknownDestination"
};

let sceneSet = null;
async function loadSceneSet() {
  if (sceneSet) return sceneSet;
  try {
    sceneSet = await fetchModuleJson(SCENE_SET_PATH);
  } catch {
    sceneSet = { scenes: [], artRoot: "" };
  }
  return sceneSet;
}

/* ------------------------------------------------------------------ */
/*  Mounting                                                           */
/* ------------------------------------------------------------------ */

const els = { spreadAt: null, markers: null, board: null, card: null, arrival: null, lines: null, openCardId: null, arrivalDismissed: null, ticker: null, clock: null };

const onHub = () => isHubScene(canvas?.scene);

function removeAll() {
  for (const key of ["markers", "board", "card", "arrival"]) {
    els[key]?.remove();
    els[key] = null;
  }
  if (els.lines && !els.lines.destroyed) els.lines.destroy();
  els.lines = null;
  stopTicker();
  if (els.clock) clearInterval(els.clock);
  els.clock = null;
}

/** canvasReady: build the layer on The City, tear it down anywhere else. */
export async function mountCityLayer() {
  removeAll();
  if (!onHub()) return;
  if (!game.user.isGM) await refreshMyPrivatePick();
  await renderCity();
}

/** Called whenever the city record, a pick or somebody's browsing changes. */
export async function refreshCityLayer() {
  if (!onHub()) {
    removeAll();
    return;
  }
  await renderCity();
}

/** canvasPan: keep markers the same size on screen, and the lines the same width. */
export function onCityPan() {
  if (!els.markers) return;
  const zoom = canvas.stage.scale.x || 1;
  els.markers.style.setProperty("--bi-city-inv", String(1 / zoom));
  if (zoom !== els.spreadAt) spreadMarkers();
  drawLines();
}

/* ------------------------------------------------------------------ */
/*  What this viewer sees                                              */
/* ------------------------------------------------------------------ */

async function viewModel() {
  const state = cityState();
  const live = state.departure;
  if (!live || live.status === "gone") return null;
  const isGM = game.user.isGM;
  const priv = privatePicksForViewer();
  const view = projectForViewer(live, { userId: game.user.id, isGM, lastAssignment: state.lastAssignment, privatePicks: priv });
  const set = await loadSceneSet();
  const roster = cityRoster();
  const ready = readiness(live, { roster, activity: cityActivity(), viewerId: game.user.id, isGM, privatePicks: priv });
  const then = departureFromThen(live.then);
  const destinations = [];
  for (const d of view.destinations) {
    const point = await scenePointFor(d.placeRef);
    const marker = markerState(d, { live, viewerId: game.user.id, isGM, lastAssignment: state.lastAssignment, privatePicks: priv });
    destinations.push({ ...d, point, marker, thumb: thumbnailFor(d, { scenes: set.scenes ?? [], artRoot: set.artRoot ?? "" }) });
  }
  const thenPoint = then?.destinations?.[0]?.placeRef ? await scenePointFor(then.destinations[0].placeRef) : null;
  return { state, live: view, rawLive: live, roster, ready, destinations, then, thenPoint, isGM, choosing: isChoosing(live) };
}

async function renderCity() {
  const vm = await viewModel();
  if (!vm) {
    removeAll();
    return;
  }
  renderMarkers(vm);
  renderBoard(vm);
  renderCard(vm);
  renderArrival(vm);
  ensureLines(vm);
  if (!els.clock) els.clock = setInterval(() => refreshBoardOnly(), 15000);
}

async function refreshBoardOnly() {
  const vm = await viewModel();
  if (!vm) return;
  renderBoard(vm);
  renderArrival(vm);
}

/* ------------------------------------------------------------------ */
/*  Markers                                                            */
/* ------------------------------------------------------------------ */

const rosterById = (vm) => new Map(vm.roster.map((m) => [m.userId, m]));

function pickerFaces(vm, userIds, { max = 6 } = {}) {
  const byId = rosterById(vm);
  return userIds
    .slice(0, max)
    .map((uid) => {
      const m = byId.get(uid);
      if (!m) return "";
      const face = m.img ? `<img src="${h(m.img)}" alt="">` : `<span>${h((m.characterName || m.name || "?").slice(0, 1))}</span>`;
      return `<li class="bi-city-face" style="--bi-city-c:${h(m.color || "#ddd3ba")}" data-tooltip="${h(m.characterName || m.name)}">${face}</li>`;
    })
    .join("");
}

function emblem(d) {
  if (d.mode) return `<i class="fa-solid ${MODE_ICON[d.mode] ?? "fa-location-dot"}"></i>`;
  if (d.thumb) return `<img src="${h(d.thumb)}" alt="">`;
  return `<i class="fa-solid fa-location-dot"></i>`;
}

function markerClasses(d) {
  return [
    "bi-city-marker",
    d.marker.mine ? "is-mine" : "",
    d.marker.must ? "is-must" : "",
    d.marker.full ? "is-full" : "",
    d.marker.closed ? "is-closed" : "",
    d.mystery ? "is-mystery" : "",
    d.mode ? "is-arrival" : "",
    els.openCardId === d.id ? "is-open" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function renderMarkers(vm) {
  const hud = canvas.hud?.element ?? document.getElementById("hud");
  if (!hud) return;
  if (!els.markers || !els.markers.isConnected) {
    els.markers = document.createElement("div");
    els.markers.className = "bi-city-markers bi-scope";
    els.markers.addEventListener("click", onMarkerClick);
    hud.appendChild(els.markers);
  }
  els.markers.style.setProperty("--bi-city-inv", String(1 / (canvas.stage.scale.x || 1)));
  const items = vm.destinations
    .filter((d) => d.point)
    .map((d) => {
      const reason = d.marker.reason === "full" ? t("BLANKINHERITANCE.City.Full") : d.marker.reason === "not-for-you" ? t("BLANKINHERITANCE.City.NotForYou") : "";
      return `<div class="${markerClasses(d)}" style="left:${d.point.x}px;top:${d.point.y}px" data-destination-id="${h(d.id)}">
  <button type="button" class="bi-city-marker__pin" data-action="card" aria-label="${h(d.label)}">
    <span class="bi-city-marker__medal">${emblem(d)}${d.mystery ? '<b class="bi-city-marker__mystery">?</b>' : ""}</span>
    <span class="bi-city-marker__plate">${h(d.label)}</span>
    ${d.marker.must ? `<span class="bi-city-marker__tag bi-city-marker__tag--must">${h(t("BLANKINHERITANCE.City.Must"))}</span>` : ""}
    ${reason ? `<span class="bi-city-marker__tag">${h(reason)}</span>` : ""}
  </button>
  <ul class="bi-city-marker__faces">${pickerFaces(vm, d.marker.pickers)}</ul>
  <span class="bi-city-marker__stem"></span>
  <span class="bi-city-marker__dot"></span>
</div>`;
    });
  // The muster the arrivals walk to: shown, never picked.
  if (vm.live.kind === "arrive" && vm.thenPoint) {
    const label = vm.then?.destinations?.[0]?.label ?? t("BLANKINHERITANCE.City.Muster");
    items.push(`<div class="bi-city-marker is-must is-goal" style="left:${vm.thenPoint.x}px;top:${vm.thenPoint.y}px">
  <span class="bi-city-marker__pin"><span class="bi-city-marker__medal"><i class="fa-solid fa-flag"></i></span><span class="bi-city-marker__plate">${h(label)}</span></span>
  <span class="bi-city-marker__stem"></span><span class="bi-city-marker__dot"></span></div>`);
  }
  els.markers.innerHTML = items.join("");
  spreadMarkers();
}

/**
 * Two places close together at this zoom would draw one marker over the
 * other: lift the upper one up its own stem until they clear (core
 * declutter). Screen pixels throughout -- markers are one size on screen.
 */
function spreadMarkers() {
  if (!els.markers) return;
  const zoom = canvas.stage.scale.x || 1;
  els.spreadAt = zoom;
  const nodes = [...els.markers.querySelectorAll(".bi-city-marker")];
  const items = nodes.map((node, i) => {
    const pin = node.querySelector(".bi-city-marker__pin");
    const faces = node.querySelector(".bi-city-marker__faces");
    return {
      id: String(i),
      x: parseFloat(node.style.left) * zoom,
      y: parseFloat(node.style.top) * zoom,
      w: pin?.offsetWidth ?? 120,
      h: (pin?.offsetHeight ?? 90) + Math.max(0, (faces?.offsetHeight ?? 0) - 8)
    };
  });
  const lifts = declutter(items);
  nodes.forEach((node, i) => node.style.setProperty("--bi-city-lift", `${lifts[String(i)] ?? 0}px`));
}

function onMarkerClick(event) {
  const pin = event.target.closest("[data-action='card']");
  if (!pin) return;
  const id = pin.closest("[data-destination-id]")?.dataset.destinationId;
  if (!id) return;
  els.openCardId = els.openCardId === id ? null : id;
  noteCityActivity();
  renderCity();
}

/* ------------------------------------------------------------------ */
/*  The card                                                           */
/* ------------------------------------------------------------------ */

function renderCard(vm) {
  const d = vm.destinations.find((x) => x.id === els.openCardId);
  if (!d) {
    els.card?.remove();
    els.card = null;
    return;
  }
  if (!els.card || !els.card.isConnected) {
    els.card = document.createElement("aside");
    els.card.className = "bi-city-card bi-scope";
    els.card.addEventListener("click", onCardClick);
    document.body.appendChild(els.card);
  }
  const facts = [];
  if (d.marker.must) facts.push(`<li class="is-must"><i class="fa-solid fa-triangle-exclamation"></i> ${h(t("BLANKINHERITANCE.City.MustGo"))}</li>`);
  if (d.costsSlice) facts.push(`<li><i class="fa-solid fa-hourglass-half"></i> ${h(t("BLANKINHERITANCE.City.CostsSlice"))}</li>`);
  if (d.roomFor) facts.push(`<li><i class="fa-solid fa-users"></i> ${h(t("BLANKINHERITANCE.City.RoomFor", { count: d.roomFor }))}</li>`);
  if (d.needs) facts.push(`<li><i class="fa-solid fa-key"></i> ${h(t("BLANKINHERITANCE.City.Needs", { what: d.needs }))}</li>`);
  const going = d.marker.pickers.map((uid) => rosterById(vm).get(uid)).filter(Boolean);
  let actions;
  if (vm.isGM) {
    const sendRow = vm.roster
      .map((m) => {
        const here = vm.live.picks?.[m.userId] === d.id;
        return `<button type="button" class="bi-city-send${here ? " is-here" : ""}" data-action="send" data-user-id="${h(m.userId)}" style="--bi-city-c:${h(m.color || "#ddd3ba")}">${h(m.characterName || m.name)}</button>`;
      })
      .join("");
    actions = `<div class="bi-city-card__send">${sendRow}</div>
      <button type="button" class="bi-city-card__go" data-action="everyone">${h(t("BLANKINHERITANCE.City.EveryoneHere"))}</button>`;
  } else if (!vm.choosing) {
    actions = "";
  } else if (d.marker.mine) {
    actions = `<p class="bi-city-card__mine"><i class="fa-solid fa-check"></i> ${h(t("BLANKINHERITANCE.City.YoureGoing"))}</p>
      <button type="button" class="bi-city-card__undo" data-action="unpick">${h(t("BLANKINHERITANCE.City.ChangeMind"))}</button>`;
  } else {
    const blocked = d.marker.full || d.marker.closed || vm.live.status === "held";
    const why = vm.live.status === "held" ? t("BLANKINHERITANCE.City.Held") : d.marker.full ? t("BLANKINHERITANCE.City.Full") : d.marker.closed ? t("BLANKINHERITANCE.City.NotForYou") : "";
    actions = `<button type="button" class="bi-city-card__go" data-action="pick"${blocked ? " disabled" : ""}>${h(t("BLANKINHERITANCE.City.ImGoing"))}</button>${why ? `<p class="bi-city-card__why">${h(why)}</p>` : ""}`;
  }
  els.card.dataset.destinationId = d.id;
  els.card.classList.toggle("is-mystery", d.mystery);
  els.card.classList.toggle("is-must", d.marker.must);
  els.card.innerHTML = `
  <button type="button" class="bi-city-card__close" data-action="close" aria-label="${h(t("BLANKINHERITANCE.City.Close"))}"><i class="fa-solid fa-xmark"></i></button>
  <figure class="bi-city-card__art">${d.thumb && !d.mode ? `<img src="${h(d.thumb)}" alt="">` : `<span class="bi-city-card__emblem">${emblem(d)}</span>`}${d.mystery ? '<b class="bi-city-card__mystery">?</b>' : ""}</figure>
  <div class="bi-city-card__body">
    <h3 class="bi-city-card__title">${h(d.label)}</h3>
    ${d.blurb ? `<p class="bi-city-card__blurb">${h(d.blurb)}</p>` : ""}
    ${facts.length ? `<ul class="bi-city-card__facts">${facts.join("")}</ul>` : ""}
    <div class="bi-city-card__going"><span class="bi-city-card__going-label">${h(going.length ? t("BLANKINHERITANCE.City.Going") : t("BLANKINHERITANCE.City.NobodyYet"))}</span><ul>${pickerFaces(vm, d.marker.pickers)}</ul></div>
    <div class="bi-city-card__actions">${actions}</div>
  </div>`;
  placeCard(d.id);
}

function placeCard(destinationId) {
  const anchor = els.markers?.querySelector(`[data-destination-id="${CSS.escape(destinationId)}"] .bi-city-marker__medal`);
  if (!anchor || !els.card) return;
  const r = anchor.getBoundingClientRect();
  const w = els.card.offsetWidth || 360;
  const hgt = els.card.offsetHeight || 420;
  let left = r.right + 18;
  if (left + w > window.innerWidth - 16) left = Math.max(16, r.left - w - 18);
  // Never under the console deck, nor its orb where the card's column crosses it.
  let floor = window.innerHeight - 16;
  const deck = document.getElementById("bi-command-bar");
  for (const part of deck ? [deck, ...deck.querySelectorAll(".bi-orb")] : []) {
    const box = part.getBoundingClientRect();
    if (box.width && box.left < left + w && box.right > left) floor = Math.min(floor, box.top - 16);
  }
  const top = Math.max(16, Math.min(r.top + r.height / 2 - hgt / 2, floor - hgt));
  els.card.style.left = `${Math.round(left)}px`;
  els.card.style.top = `${Math.round(top)}px`;
}

async function onCardClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const destinationId = els.card?.dataset.destinationId;
  switch (button.dataset.action) {
    case "close":
      els.openCardId = null;
      return renderCity();
    case "pick":
      return pick(destinationId, button);
    case "unpick":
      return pick(null, button);
    case "send":
      return gmPick(button.dataset.userId, button.classList.contains("is-here") ? null : destinationId);
    case "everyone":
      return everyoneTo(destinationId);
  }
}

async function pick(destinationId, button) {
  noteCityActivity();
  if (button) button.disabled = true;
  const result = await requestCityPick(destinationId);
  if (!result?.ok) ui?.notifications?.warn?.(t(REFUSED_KEY[result?.reason] ?? REFUSED_KEY["no-answer"]));
  await renderCity();
}

/* ------------------------------------------------------------------ */
/*  The departure board                                                */
/* ------------------------------------------------------------------ */

function minutes(ms) {
  const m = Math.floor(ms / 60000);
  return m < 1 ? t("BLANKINHERITANCE.City.JustNow") : t("BLANKINHERITANCE.City.Minutes", { count: m });
}

/** A player choosing how they arrive has the dialog; the board would only repeat its question. */
const arrivalOpen = (vm) => vm.live.kind === "arrive" && !vm.isGM && els.arrivalDismissed !== vm.live.id;

function renderBoard(vm) {
  if (arrivalOpen(vm)) {
    els.board?.remove();
    els.board = null;
    return;
  }
  if (!els.board || !els.board.isConnected) {
    els.board = document.createElement("section");
    els.board.className = "bi-city-board bi-scope";
    els.board.addEventListener("click", onBoardClick);
    document.body.appendChild(els.board);
  }
  const label = new Map(vm.rawLive.destinations.map((d) => [d.id, d.label]));
  const rows = vm.choosing
    ? vm.ready.rows
        .map((r) => {
          const status =
            r.status === "picked"
              ? label.get(r.destinationId) ?? ""
              : r.status === "ready"
                ? t("BLANKINHERITANCE.City.Status.ready")
                : r.status === "away"
                  ? t("BLANKINHERITANCE.City.Status.away")
                  : r.status === "browsing"
                    ? t("BLANKINHERITANCE.City.Status.browsing", { time: minutes(r.waitingMs) })
                    : t("BLANKINHERITANCE.City.Status.waiting", { time: minutes(r.waitingMs) });
          const face = r.img ? `<img src="${h(r.img)}" alt="">` : `<span>${h((r.characterName || r.name || "?").slice(0, 1))}</span>`;
          return `<li class="bi-city-board__player is-${h(r.status)}" style="--bi-city-c:${h(r.color || "#ddd3ba")}">
    <span class="bi-city-board__face">${face}${r.done ? '<i class="fa-solid fa-check"></i>' : ""}</span>
    <span class="bi-city-board__who">${h(r.characterName || r.name)}</span>
    <span class="bi-city-board__status">${h(status)}</span></li>`;
        })
        .join("")
    : "";
  const kind = t(KIND_KEY[vm.live.kind] ?? KIND_KEY.sent);
  const held = vm.live.status === "held";
  const pct = vm.ready.total ? Math.round((vm.ready.done / vm.ready.total) * 100) : 0;
  const gmControls = vm.isGM
    ? `<div class="bi-city-board__controls">
        <button type="button" class="bi-city-board__go${!vm.choosing || vm.ready.complete ? " is-ready" : ""}" data-action="go"><i class="fa-solid fa-person-walking-arrow-right"></i> ${h(vm.choosing && !vm.ready.complete ? t("BLANKINHERITANCE.City.GoWaiting", { count: vm.ready.total - vm.ready.done }) : t("BLANKINHERITANCE.City.Go"))}</button>
        ${vm.choosing ? `<button type="button" data-action="hold">${h(held ? t("BLANKINHERITANCE.City.Reopen") : t("BLANKINHERITANCE.City.Hold"))}</button>` : ""}
        <button type="button" class="bi-city-board__quiet" data-action="cancel">${h(t("BLANKINHERITANCE.City.Cancel"))}</button>
      </div>`
    : vm.live.kind === "arrive"
      ? `<div class="bi-city-board__controls"><button type="button" data-action="arrival">${h(t("BLANKINHERITANCE.City.ShowOptions"))}</button></div>`
      : "";
  els.board.classList.toggle("is-held", held);
  els.board.classList.toggle("is-complete", vm.ready.complete);
  els.board.innerHTML = `
  <div class="bi-city-board__head">
    <p class="bi-city-board__kicker">${h(kind)}${held ? ` · ${h(t("BLANKINHERITANCE.City.HeldShort"))}` : ""}</p>
    <h2 class="bi-city-board__question">${h(vm.live.question || t("BLANKINHERITANCE.City.WhereNext"))}</h2>
  </div>
  ${vm.choosing ? `<div class="bi-city-board__progress" style="--bi-city-pct:${pct}"><span>${vm.ready.done}/${vm.ready.total}</span><small>${h(t("BLANKINHERITANCE.City.Decided"))}</small></div>` : ""}
  ${rows ? `<ol class="bi-city-board__roster">${rows}</ol>` : ""}
  ${gmControls}`;
}

async function onBoardClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  switch (button.dataset.action) {
    case "go":
      button.disabled = true;
      els.openCardId = null;
      return goCityDeparture();
    case "hold":
      return holdCityDeparture(cityState().departure?.status !== "held");
    case "cancel":
      els.openCardId = null;
      return cancelCityDeparture();
    case "arrival":
      els.arrivalDismissed = null;
      noteCityActivity();
      return renderCity();
  }
}

/* ------------------------------------------------------------------ */
/*  The arrival dialogue                                               */
/* ------------------------------------------------------------------ */

function renderArrival(vm) {
  const show = arrivalOpen(vm);
  if (!show) {
    els.arrival?.remove();
    els.arrival = null;
    return;
  }
  if (!els.arrival || !els.arrival.isConnected) {
    els.arrival = document.createElement("section");
    els.arrival.className = "bi-city-arrival bi-scope";
    els.arrival.addEventListener("click", onArrivalClick);
    document.body.appendChild(els.arrival);
    noteCityActivity();
  }
  const options = vm.destinations
    .map((d) => {
      const mine = d.marker.mine;
      return `<button type="button" class="bi-city-option${mine ? " is-mine" : ""}" data-action="${mine ? "unpick" : "pick"}" data-destination-id="${h(d.id)}">
    <span class="bi-city-option__emblem">${emblem(d)}</span>
    <span class="bi-city-option__label">${h(d.label)}</span>
    ${d.blurb ? `<span class="bi-city-option__blurb">${h(d.blurb)}</span>` : ""}
    <ul class="bi-city-option__faces">${pickerFaces(vm, d.marker.pickers)}</ul>
    ${mine ? `<span class="bi-city-option__mine"><i class="fa-solid fa-check"></i> ${h(t("BLANKINHERITANCE.City.YourPick"))}</span>` : ""}
  </button>`;
    })
    .join("");
  const waiting = vm.ready.rows.filter((r) => !r.done).map((r) => r.characterName || r.name);
  els.arrival.innerHTML = `
  <header class="bi-city-arrival__head">
    <p class="bi-city-arrival__kicker">${h(t("BLANKINHERITANCE.City.Kind.arrive"))}</p>
    <h2 class="bi-city-arrival__question">${h(vm.live.question || t("BLANKINHERITANCE.City.HowArrive"))}</h2>
  </header>
  <div class="bi-city-arrival__grid">${options}</div>
  <footer class="bi-city-arrival__foot">
    <span>${waiting.length ? h(t("BLANKINHERITANCE.City.StillChoosing", { names: waiting.join(", ") })) : h(t("BLANKINHERITANCE.City.EveryoneChosen"))}</span>
    <button type="button" data-action="dismiss">${h(t("BLANKINHERITANCE.City.SeeMap"))}</button>
  </footer>`;
}

async function onArrivalClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "dismiss") {
    els.arrivalDismissed = cityState().departure?.id ?? null;
    return renderCity();
  }
  if (button.dataset.action === "pick") return pick(button.dataset.destinationId, button);
  if (button.dataset.action === "unpick") return pick(null, button);
}

/* ------------------------------------------------------------------ */
/*  Dashed lines                                                       */
/* ------------------------------------------------------------------ */

let lineModel = [];
let marchOffset = 0;

function colorOf(css) {
  try {
    return Number(foundry.utils.Color.from(css || "#ddd3ba"));
  } catch {
    return 0xddd3ba;
  }
}

function ensureLines(vm) {
  const hub = canvas.scene;
  const byDest = new Map(vm.destinations.map((d) => [d.id, d]));
  lineModel = [];
  // A gathering has nothing to pick: everyone's line runs to the one place.
  const gatherAt = vm.choosing ? null : vm.destinations[0]?.id ?? null;
  for (const m of vm.roster) {
    const destId = vm.live.picks?.[m.userId] ?? gatherAt;
    const dest = byDest.get(destId);
    if (!dest?.point) continue;
    let from = null;
    let to = dest.point;
    if (vm.live.kind === "arrive") {
      // An arrival's line is the journey still to come: from where they come in to the muster.
      from = dest.point;
      to = vm.thenPoint;
    } else {
      const pawn = pawnFor(hub, m.userId);
      if (pawn) {
        const half = pawnSize(hub) / 2;
        from = { x: pawn.x + half, y: pawn.y + half };
      }
    }
    if (from && to) lineModel.push({ from, to, color: colorOf(m.color) });
  }
  if (lineModel.length === 0) {
    stopTicker();
    if (els.lines && !els.lines.destroyed) els.lines.clear();
    return;
  }
  if (!els.lines || els.lines.destroyed) els.lines = canvas.controls.addChild(new PIXI.Graphics());
  drawLines();
  startTicker();
}

function drawLines() {
  if (!els.lines || els.lines.destroyed) return;
  const zoom = canvas.stage.scale.x || 1;
  const g = els.lines;
  g.clear();
  for (const line of lineModel) {
    const segments = dashSegments(line.from, line.to, { dash: DASH_PX / zoom, gap: GAP_PX / zoom, offset: marchOffset / zoom });
    g.lineStyle((LINE_PX + 3) / zoom, 0x070908, 0.55);
    for (const s of segments) {
      g.moveTo(s.x1, s.y1);
      g.lineTo(s.x2, s.y2);
    }
    g.lineStyle(LINE_PX / zoom, line.color, 0.95);
    for (const s of segments) {
      g.moveTo(s.x1, s.y1);
      g.lineTo(s.x2, s.y2);
    }
    g.lineStyle(0);
    g.beginFill(line.color, 0.95);
    g.drawCircle(line.from.x, line.from.y, 5 / zoom);
    g.endFill();
  }
}

function tick() {
  const seconds = (canvas.app?.ticker?.deltaMS ?? 16) / 1000;
  marchOffset -= MARCH_PX_PER_SEC * seconds;
  drawLines();
}

function startTicker() {
  if (els.ticker || !canvas.app?.ticker) return;
  els.ticker = tick;
  canvas.app.ticker.add(els.ticker);
}

function stopTicker() {
  if (els.ticker && canvas.app?.ticker) canvas.app.ticker.remove(els.ticker);
  els.ticker = null;
}

/** A pawn moved on the hub: its line has to start from where it now stands. */
export function onCityTokenMoved(tokenDoc) {
  if (!onHub() || !tokenDoc.getFlag(MODULE_ID, "pawn")) return;
  if (lineModel.length) refreshCityLayer();
}

export const cityModeIcons = Object.freeze({ ...MODE_ICON, modes: ARRIVAL_MODES });
