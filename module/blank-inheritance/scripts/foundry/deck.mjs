/**
 * The deck — the Foundry-touching half (design/visual-identity.md, "The deck").
 *
 * Three jobs, all thin:
 *   1. BUILD each module's face from live Foundry data, handing everything
 *      that is arithmetic or layout to core/ (deck-layout.mjs, vu-meter.mjs,
 *      orb-readout.mjs, day-ring.mjs).
 *   2. FIT the panel to the window: measure the sidebar (the one piece of
 *      Foundry furniture that runs the full height of the screen), run
 *      core/deck-layout.mjs#deckFit, and write the answer to CSS custom
 *      properties on <body> (bi-foundry-bridge.css reads them).
 *   3. KEEP THE CENTRAL INSTRUMENT ALIVE between renders: the hover preview,
 *      the last roll's readout, and the needle's sweep are all imperative, so
 *      a hand moving across thirty keys never costs thirty Handlebars renders.
 */

import { arcPath, dialPoint, deckFit, lampRow, loreDisplayName, pageOf, selectorState, splitChecks, variantShort } from "../core/deck-layout.mjs";
import { valueToDeg, vuFace } from "../core/vu-meter.mjs";
import { ORB_ROLL_HOLD_MS, orbMode, rollFromMessage, rollSummary } from "../core/orb-readout.mjs";
import { ACTION_GLYPHS, DETENT_RADIUS, ORB_BEZEL, ORB_ENGRAVING, ORB_FACE, ORB_FACE_TYPE, QUARTER_GLYPHS } from "../core/orb-geometry.mjs";
import { quarterAt, quarterIndex, ringSlices, ringState } from "../core/day-ring.mjs";
import { sessionProgress, sessionWindow } from "../core/session-clock.mjs";
import { formatLogEntriesForDisplay } from "../core/phone.mjs";
import { sheetOverview, sheetSkillGroups, sheetStrikes } from "./sheet-data.mjs";
import { tableSeesResults } from "./rolls.mjs";
import { currentMoment, segmentContext } from "./campaign-state.mjs";
import { castForScene } from "./cast.mjs";
import { currentEntries } from "./session-log.mjs";

/* ---------------------------------------------------------------------- */
/*  Module faces                                                           */
/* ---------------------------------------------------------------------- */

/** Both key banks, the defences and the lores, cut once per render. */
export function deckChecksFor(actor) {
  return splitChecks(actor ? sheetSkillGroups(actor) : []);
}

export function deckIdentFor(actor) {
  if (!actor) return null;
  const overview = sheetOverview(actor);
  const { identity, defenses, resources, conditions } = overview;
  const hero = resources.find((r) => r.id === "hero-points");
  const level = identity.level != null ? game.i18n.format("BLANKINHERITANCE.Deck.LevelN", { level: identity.level }) : null;
  const kind = [identity.ancestryName, identity.className].filter(Boolean).join(" ");
  const otherSpeeds = defenses.speed.otherSpeeds.map((s) => `${s.label} ${s.value}`).join(" · ");
  return {
    name: identity.name,
    img: identity.img,
    line: [kind, level].filter(Boolean).join(" · "),
    ac: defenses.ac.value,
    acBreakdown: defenses.ac.breakdown,
    speed: defenses.speed.value,
    speedSub: otherSpeeds || game.i18n.localize("BLANKINHERITANCE.Deck.LandSpeed"),
    hero: hero ? lampRow(hero.value, hero.max) : [],
    heroLabel: hero ? `${hero.value}/${hero.max}` : "—",
    conditions: conditions.slice(0, 3),
    moreConditions: Math.max(0, conditions.length - 3)
  };
}

/**
 * The previous needle angle per subject, so a re-render starts the needle
 * where it last rested and sweeps to the new reading instead of teleporting.
 */
const needleMemory = new Map();

/** Client-side action pips, per combat and creature. Reset when that creature's turn starts. */
const actionPips = new Map();
const actionKey = (actor) => `${game.combat?.id ?? "none"}:${actor?.id ?? "none"}`;

export function actionPipsFor(actor) {
  return actionPips.get(actionKey(actor)) ?? [false, false, false, false];
}

export function toggleActionPip(actor, index) {
  if (!actor || !(index >= 0 && index < 4)) return;
  const next = [...actionPipsFor(actor)];
  next[index] = !next[index];
  actionPips.set(actionKey(actor), next);
}

/** Every pip back to available — called when a combatant's turn begins. */
export function resetActionPips(actor) {
  if (actor) actionPips.delete(actionKey(actor));
}

function glyphPoint(midDeg) {
  // Bezel arcs are cut at size 98 and drawn offset by 1, so their centre is
  // the 100-unit viewBox centre; glyphs are placed about that same centre.
  const p = dialPoint(midDeg, ORB_BEZEL.glyphRadius, 100);
  return { labelX: p.x, labelY: p.y };
}

function bezelFor(actor, { mode, canAdvance }) {
  const geometry = { size: ORB_BEZEL.size, thickness: ORB_BEZEL.thickness, gapDeg: ORB_BEZEL.gapDeg };
  const common = { offset: ORB_BEZEL.offset, glyphSize: ORB_BEZEL.glyphSize };

  if (mode !== "theatre") {
    const spent = actionPipsFor(actor);
    const slices = ringSlices(geometry).map((slice, i) => ({
      d: slice.d,
      index: i,
      state: spent[i] ? "past" : "current",
      glyph: ACTION_GLYPHS[i],
      ...glyphPoint(slice.midDeg)
    }));
    return {
      ...common,
      kind: "actions",
      slices,
      // Only a creature the deck is actually showing has actions to mark.
      hits: actor
        ? slices.map((slice) => {
            const label = slice.index === 3
              ? game.i18n.localize("BLANKINHERITANCE.Deck.Reaction")
              : game.i18n.format("BLANKINHERITANCE.Deck.ActionN", { n: slice.index + 1 });
            const status = game.i18n.localize(spent[slice.index] ? "BLANKINHERITANCE.Deck.Spent" : "BLANKINHERITANCE.Deck.Ready");
            return {
              index: slice.index,
              action: "toggleActionPip",
              pressable: true,
              pressed: spent[slice.index],
              ariaLabel: label,
              previewTitle: label,
              previewValue: status,
              previewSub: game.i18n.localize("BLANKINHERITANCE.Deck.TapToMark")
            };
          })
        : [],
      caption: game.i18n.format("BLANKINHERITANCE.Deck.RoundN", { round: game.combat?.round ?? 0 })
    };
  }

  const ring = ringState(currentMoment(), geometry);
  const nextIndex = (quarterIndex(ring.quarter) + 1) % 4;
  const next = quarterAt(nextIndex);
  const nextTitle = game.i18n.localize("BLANKINHERITANCE.Deck.NextQuarter");
  return {
    ...common,
    kind: "day",
    slices: ring.slices.map((slice) => ({
      d: slice.d,
      index: slice.index,
      state: slice.state,
      glyph: QUARTER_GLYPHS[slice.id] ?? "",
      ...glyphPoint(slice.midDeg)
    })),
    // The Director winds the day by pressing the next quarter's own arc.
    hits: canAdvance
      ? [{
          index: nextIndex,
          action: "advanceSegment",
          pressable: false,
          pressed: false,
          ariaLabel: nextTitle,
          previewTitle: nextTitle,
          previewValue: QUARTER_GLYPHS[next.id] ?? "",
          previewSub: game.i18n.localize(next.labelKey)
        }]
      : [],
    caption: `${game.i18n.format("BLANKINHERITANCE.Console.Ring.Day", { day: ring.day })} · ${game.i18n.localize(ring.quarterLabelKey)}`
  };
}

/**
 * The central instrument's whole face for one subject.
 *
 * The needle reads hit points on a scale printed from 0 to that creature's
 * own maximum, with the bottom quarter printed red — the numbers are the real
 * ones (ux-doctrine Law 1). The idle readout is the subject; hover and roll
 * readouts are painted client-side over it (see paintOrbWindow).
 */
export function deckOrbFor(actor, { mode, canAdvance = false, checks }) {
  const overview = actor ? sheetOverview(actor) : null;
  const hp = overview?.hp ?? { value: 0, max: 1, temp: 0, tier: "down" };
  const max = Math.max(1, hp.max);
  const face = vuFace({ ...ORB_FACE, min: 0, max, danger: { from: 0, to: max * 0.25 } });
  const rest = -ORB_FACE.sweep / 2;
  const to = overview ? valueToDeg(hp.value, { min: 0, max, sweep: ORB_FACE.sweep }) : rest;
  const key = actor?.id ?? "none";
  const from = needleMemory.has(key) ? needleMemory.get(key) : rest;
  needleMemory.set(key, to);

  const idle = overview
    ? {
        title: overview.identity.name,
        value: `${hp.value}/${hp.max}${hp.temp ? ` +${hp.temp}` : ""}`,
        sub: [
          `${game.i18n.localize("BLANKINHERITANCE.Deck.AC")} ${overview.defenses.ac.value}`,
          overview.identity.className,
          overview.identity.level != null ? game.i18n.format("BLANKINHERITANCE.Deck.LevelN", { level: overview.identity.level }) : null
        ].filter(Boolean).join(" · "),
        tone: hp.tier === "critical" || hp.tier === "down" ? "bad" : "neutral"
      }
    : {
        title: game.i18n.localize(canAdvance ? "BLANKINHERITANCE.Deck.NoSubject" : "BLANKINHERITANCE.Deck.NoCharacter"),
        value: "—",
        sub: "",
        tone: "neutral"
      };
  readout.idle = idle;

  return {
    subject: overview ? { id: actor.id, name: overview.identity.name } : null,
    hp,
    face,
    type: ORB_FACE_TYPE,
    gaugeLabel: game.i18n.localize("BLANKINHERITANCE.Deck.HP"),
    needle: { from, to },
    readout: idle,
    flanks: { left: checks.left.defences, right: checks.right.defences },
    bezel: bezelFor(actor, { mode, canAdvance }),
    engraving: {
      arc: arcPath(ORB_ENGRAVING.radius, ORB_ENGRAVING.fromDeg, ORB_ENGRAVING.toDeg),
      size: ORB_ENGRAVING.size
    }
  };
}

function detentPoints(state, extra = () => ({})) {
  return state.positions.map((p) => ({ ...p, ...dialPoint(p.deg, DETENT_RADIUS, 100), ...extra(p) }));
}

/**
 * The player's selectors: lore always, then downtime offers in theatre of the
 * mind or strikes in a fight.
 *
 * `indices` is the bar's own memory of where each knob was left. It is
 * written back clamped, so a knob pushed past its end stop does not have to
 * be turned back through positions that do not exist.
 */
export async function deckSelectorsFor(actor, { mode, indices, checks }) {
  const loreState = selectorState(checks.lores, indices.lore ?? 0);
  indices.lore = loreState.index;
  const selectedLore = loreState.selected;
  const lore = {
    count: loreState.count,
    frame: loreState.frame,
    positions: detentPoints(loreState),
    name: selectedLore?.label ?? game.i18n.localize("BLANKINHERITANCE.Deck.NoLore"),
    display: selectedLore ? loreDisplayName(selectedLore.label) : game.i18n.localize("BLANKINHERITANCE.Deck.NoLore"),
    value: selectedLore?.modLabel ?? "",
    slug: selectedLore?.slug ?? null,
    title: selectedLore?.label ?? game.i18n.localize("BLANKINHERITANCE.Deck.Lore"),
    sub: selectedLore?.rankLabel ?? ""
  };

  if (mode !== "theatre") {
    const strikeState = selectorState(actor ? sheetStrikes(actor) : [], indices.strike ?? 0);
    indices.strike = strikeState.index;
    const selected = strikeState.selected;
    const variants = (selected?.variants ?? []).slice(0, 3).map((v) => ({ ...v, short: variantShort(v.label) }));
    return {
      variant: "strikes",
      lore,
      strike: {
        count: strikeState.count,
        frame: strikeState.frame,
        positions: detentPoints(strikeState),
        name: selected?.label ?? game.i18n.localize("BLANKINHERITANCE.Deck.NoStrikes"),
        value: variants[0]?.short ?? "",
        sub: (selected?.traits ?? []).join(", "),
        actionIndex: selected?.actionIndex ?? 0,
        variants
      }
    };
  }

  const segment = await segmentContext();
  const offers = segment.offers ?? [];
  const offerState = selectorState(offers, indices.downtime ?? 0);
  indices.downtime = offerState.index;
  const offer = offerState.selected;
  return {
    variant: "downtime",
    lore,
    downtime: {
      count: offerState.count,
      frame: offerState.frame,
      positions: detentPoints(offerState, (p) => ({ taken: !!offers[p.n]?.takenByMe })),
      id: offer?.id ?? null,
      name: offer?.name ?? game.i18n.localize("BLANKINHERITANCE.Console.Segment.NoOffers"),
      effect: offer?.effect ?? "",
      cost: offer?.cost ?? "",
      takenByMe: !!offer?.takenByMe,
      // One lamp per slice this quarter, lit while it is still unspent.
      budgetLamps: lampRow(segment.budget?.remaining ?? 0, segment.budget?.total ?? 0)
    }
  };
}

export const CAST_ROWS_PER_PAGE = 5;

/** Full keys, not a template string, so the localisation lint can see all four. */
const DISPOSITION_KEYS = Object.freeze({
  secret: "BLANKINHERITANCE.Deck.Disposition.secret",
  hostile: "BLANKINHERITANCE.Deck.Disposition.hostile",
  neutral: "BLANKINHERITANCE.Deck.Disposition.neutral",
  friendly: "BLANKINHERITANCE.Deck.Disposition.friendly"
});

export function deckCastFor(page = 0) {
  const { rows, summary } = castForScene();
  const paged = pageOf(rows, page, CAST_ROWS_PER_PAGE);
  return {
    ...paged,
    summaryText: game.i18n.format("BLANKINHERITANCE.Console.Cast.Summary", { players: summary.players, others: summary.others }),
    slots: paged.slots.map((row) => row && {
      ...row,
      dispositionLabel: game.i18n.localize(DISPOSITION_KEYS[row.disposition] ?? DISPOSITION_KEYS.neutral)
    })
  };
}

export function deckDirectorFor() {
  const now = new Date();
  const progress = sessionProgress(now, sessionWindow());
  const pct = (n) => Math.round(n * 1000) / 10;
  return {
    entries: formatLogEntriesForDisplay(currentEntries()).slice(0, 2),
    session: {
      phase: progress.phase,
      label: progress.label,
      clock: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      startPct: pct(progress.sessionStartFrac),
      spanPct: pct(progress.sessionEndFrac - progress.sessionStartFrac),
      nowPct: pct(progress.windowFrac)
    }
  };
}

/* ---------------------------------------------------------------------- */
/*  The live readout                                                       */
/* ---------------------------------------------------------------------- */

const readout = { hover: null, lastRoll: null, idle: null, subjectId: null, isGM: false, timer: null };

function previewFrom(el) {
  return {
    title: el.dataset.previewTitle ?? "",
    value: el.dataset.previewValue ?? "",
    sub: el.dataset.previewSub ?? "",
    tone: "neutral"
  };
}

function rollLines(roll) {
  const summary = rollSummary(roll, { isGM: readout.isGM, showResults: tableSeesResults() });
  if (!summary) return null;
  const parts = [];
  if (summary.natural !== null) parts.push(game.i18n.format("BLANKINHERITANCE.Deck.Natural", { n: summary.natural }));
  if (summary.dc !== null) parts.push(`${game.i18n.localize("BLANKINHERITANCE.Deck.DC")} ${summary.dc} (${summary.marginLabel})`);
  if (summary.outcomeKey) parts.push(game.i18n.localize(summary.outcomeKey));
  return { title: summary.title, value: String(summary.total), sub: parts.join(" · "), tone: summary.tone };
}

/** Repaint the central instrument's window from whatever currently wins. */
export function paintOrbWindow(root = document.getElementById("bi-command-bar")) {
  const win = root?.querySelector("[data-orb-window]");
  if (!win) return;
  const mode = orbMode({ now: Date.now(), hover: readout.hover, lastRoll: readout.lastRoll });
  const lines = mode === "hover" ? readout.hover : mode === "roll" ? rollLines(readout.lastRoll) : readout.idle;
  if (!lines) return;
  win.dataset.mode = mode;
  win.dataset.tone = lines.tone ?? "neutral";
  const set = (selector, text) => {
    const el = win.querySelector(selector);
    if (el && el.textContent !== (text ?? "")) el.textContent = text ?? "";
  };
  set("[data-orb-title]", lines.title);
  set("[data-orb-value]", lines.value);
  set("[data-orb-sub]", lines.sub);
}

/**
 * A chat message landed. If it is a check rolled for the deck's current
 * subject, it becomes the readout for a while — then the window gives way to
 * idle again on its own. Content the viewer cannot see is never read out.
 */
export function noteRoll(message) {
  if (!message?.rolls?.length || !readout.subjectId) return;
  if (message.isContentVisible === false) return;
  if (message.speaker?.actor !== readout.subjectId) return;
  const roll = rollFromMessage({
    flags: message.flags,
    rolls: message.rolls.map((r) => ({
      total: r.total,
      dice: (r.dice ?? []).map((die) => ({ faces: die.faces, results: die.results }))
    })),
    speakerActorId: message.speaker.actor,
    at: Date.now()
  });
  if (!roll) return;
  readout.lastRoll = roll;
  paintOrbWindow();
  clearTimeout(readout.timer);
  readout.timer = setTimeout(() => paintOrbWindow(), ORB_ROLL_HOLD_MS + 50);
}

const STEP_KEYS = Object.freeze({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 });

/**
 * After every deck render: rewire the delegated listeners once, refresh any
 * hover the render invalidated, repaint the instrument's window, start the
 * needle's sweep, and refit the panel.
 */
export function afterDeckRender(app, { isGM, subjectId, onStep }) {
  const root = app.element;
  if (!root) return;

  if (subjectId !== readout.subjectId) {
    readout.lastRoll = null;
    readout.subjectId = subjectId;
  }
  readout.isGM = isGM;

  if (!root.dataset.biDeckWired) {
    root.dataset.biDeckWired = "1";
    root.addEventListener("pointerover", (event) => {
      const el = event.target?.closest?.("[data-preview-title]");
      if (!el || !root.contains(el)) return;
      readout.hover = previewFrom(el);
      paintOrbWindow(root);
    });
    root.addEventListener("pointerout", (event) => {
      const el = event.target?.closest?.("[data-preview-title]");
      if (!el || el.contains(event.relatedTarget)) return;
      const next = event.relatedTarget?.closest?.("[data-preview-title]");
      readout.hover = next && root.contains(next) ? previewFrom(next) : null;
      paintOrbWindow(root);
    });
    root.addEventListener("focusin", (event) => {
      const el = event.target?.closest?.("[data-preview-title]");
      if (!el || !event.target.matches(":focus-visible")) return;
      readout.hover = previewFrom(el);
      paintOrbWindow(root);
    });
    root.addEventListener("focusout", (event) => {
      if (root.contains(event.relatedTarget)) return;
      if (!root.matches(":hover")) readout.hover = null;
      paintOrbWindow(root);
    });
    // A knob steps on the wheel, like a real detented encoder. passive: false
    // because stepping a knob must not also zoom the canvas underneath it.
    root.addEventListener("wheel", (event) => {
      const knob = event.target?.closest?.("[data-bi-wheel]");
      if (!knob || knob.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      onStep?.(knob.dataset.biWheel, event.deltaY > 0 ? 1 : -1);
    }, { passive: false });
    root.addEventListener("keydown", (event) => {
      const knob = event.target?.closest?.("[data-bi-wheel]");
      const delta = STEP_KEYS[event.key];
      if (!knob || knob.disabled || !delta) return;
      event.preventDefault();
      event.stopPropagation();
      onStep?.(knob.dataset.biWheel, delta);
    });
  }

  // A re-render replaced the element under the pointer, so no pointer event
  // fired for the new one. Re-read the preview from whatever is under the hand
  // now — a knob just stepped must read out its NEW position, not the old.
  if (readout.hover) {
    const under = [...root.querySelectorAll("[data-preview-title]:hover")].pop();
    const focused = root.querySelector("[data-preview-title]:focus-visible");
    const source = under ?? focused;
    readout.hover = source ? previewFrom(source) : null;
  }
  paintOrbWindow(root);

  const needle = root.querySelector(".bi-orb__needle[data-needle-to]");
  if (needle) {
    const target = `${needle.dataset.needleTo}deg`;
    let done = false;
    const swing = () => {
      if (done) return;
      done = true;
      needle.style.setProperty("--needle", target);
    };
    // Two frames so the starting angle is painted first; the timeout because
    // requestAnimationFrame is suspended entirely on a hidden tab
    // (reference_raf_suspended_hidden_tab) and the needle must still land.
    requestAnimationFrame(() => requestAnimationFrame(swing));
    setTimeout(swing, 80);
  }

  fitDeck();
}

/* ---------------------------------------------------------------------- */
/*  Fitting the panel to the window                                        */
/* ---------------------------------------------------------------------- */

/**
 * The largest the deck is drawn. Past this, keys stop reading as hardware and
 * start reading as a poster — and a 1440p screen would otherwise hand the
 * panel a third of its height.
 */
const DECK_MAX_SCALE = 1.25;

/**
 * Measure what Foundry has claimed along the bottom edge and fit the deck
 * beside it. Only the sidebar is reserved: it is the one piece of Foundry's
 * furniture that runs the full height of the screen. Everything else at the
 * bottom corners (the roster, the chat input, the hotbar, the scene runner)
 * is lifted above the deck by bi-foundry-bridge.css instead, so the deck can
 * use the full width.
 *
 * With no deck mounted, the overrides are removed, so the stylesheet defaults
 * apply again rather than a stale deck's footprint.
 */
export function fitDeck() {
  const style = document.body.style;
  const root = document.getElementById("bi-command-bar");
  if (!root?.classList.contains("bi-deck")) {
    for (const prop of ["--bi-deck-scale", "--bi-deck-left", "--bi-bar-height", "--bi-orb-center"]) style.removeProperty(prop);
    return null;
  }
  escapeHotbarFromUiMiddle();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  if (!(viewportWidth > 0 && viewportHeight > 0)) return null;
  // The sidebar's left edge, collapsed or expanded. #sidebar is the whole
  // right-hand panel (tabs plus content), and it slides rather than resizes,
  // so its rect is where it actually is right now.
  const sidebar = document.getElementById("sidebar")?.getBoundingClientRect();
  const rightReserve = sidebar && sidebar.width > 0 ? Math.max(0, viewportWidth - sidebar.left) : 0;
  // The scene runner's drawer host never changes size (only its inner
  // .bi-runner-shell slides via transform, so a closed drawer's box would
  // still measure full width) — read whether it is actually OPEN first,
  // and only then trust the host's own rect.
  const runnerHost = document.getElementById("bi-scene-runner");
  const runnerOpen = !!runnerHost?.querySelector(".bi-runner-shell--open");
  const leftReserve = runnerOpen ? Math.max(0, runnerHost.getBoundingClientRect().right) : 0;
  const fit = deckFit({ viewportWidth, viewportHeight, leftReserve, rightReserve, maxScale: DECK_MAX_SCALE });
  style.setProperty("--bi-deck-scale", String(fit.scale));
  style.setProperty("--bi-deck-left", `${fit.left}px`);
  style.setProperty("--bi-bar-height", `${fit.crownHeight}px`);
  // The orb sits centred in the deck's own spine track, i.e. the panel's own
  // centreline — foundry/deck.mjs's one other consumer of the panel's real
  // on-screen geometry (the hotbar rampart, bi-foundry-bridge.css).
  style.setProperty("--bi-orb-center", `${fit.left + fit.width / 2}px`);
  return fit;
}

/**
 * Move Foundry's own hotbar out from under #ui-middle and into #interface
 * directly — the same escape every one of this module's own chassis pieces
 * already needs (#bi-command-bar, #bi-stage, #bi-scene-runner; see
 * bi-foundry-bridge.css's own note on why). #ui-middle carries
 * `transform: scale(var(--ui-scale))`, and a `transform` on an ancestor
 * makes IT the containing block for a `position: fixed` descendant instead
 * of the viewport — found live 2026-09-17 wiring the hotbar rampart: the
 * maths for centring #hotbar on --bi-orb-center (a viewport pixel value)
 * were correct and the element still rendered ~390px off, because `left`
 * was being resolved against #ui-middle's own scaled box, not the screen.
 *
 * A plain DOM move, not a CSS trick — #hotbar keeps its id, its own
 * ApplicationV2 instance never needs to know it changed parents (nothing in
 * this module or Foundry's own Hotbar class looks up its ancestry), and the
 * move is idempotent (checked before running) so calling this every fit is
 * free after the first call.
 */
function escapeHotbarFromUiMiddle() {
  const hotbar = document.getElementById("hotbar");
  const iface = document.getElementById("interface");
  if (!hotbar || !iface || hotbar.parentElement === iface) return;
  iface.appendChild(hotbar);
}

let fittingInstalled = false;

/**
 * Keep the deck fitted as the window, the sidebar, the roster and the scene
 * runner come and go. Installed once per client; every observer only ever
 * calls fitDeck, which is cheap and idempotent.
 */
export function installDeckFitting() {
  if (fittingInstalled) return;
  fittingInstalled = true;
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      fitDeck();
    }, 30);
  };
  window.addEventListener("resize", schedule);
  const resize = new ResizeObserver(schedule);
  for (const id of ["sidebar", "players"]) {
    const el = document.getElementById(id);
    if (el) resize.observe(el);
  }
  const iface = document.getElementById("interface");
  if (iface) new MutationObserver(schedule).observe(iface, { childList: true });
  // The sidebar slides on a 250ms margin transition; catch where it lands.
  Hooks.on("collapseSidebar", () => setTimeout(fitDeck, 300));
  fitDeck();
}
