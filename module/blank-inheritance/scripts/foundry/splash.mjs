/**
 * The Splash tier — the Foundry-touching half.
 *
 * A full-screen character introduction in FOUR beats: Take (fade in, the
 * diagonal slash wipe reveals the art) → Hold (name, affiliation, seal) →
 * Dip (a beat of full black) → Resolve (fades back in while collapsing down
 * onto the frame the character now occupies). See
 * design/theatre-of-the-mind-staging.md §5 and core/splash.mjs for the pure
 * logic this drives. Dip was added, and Take/Resolve both lengthened, after
 * Ingram's direct live-review feedback on the first pass ("fade in longer,
 * fade out longer... dip to black between").
 *
 * DELIBERATELY NOT foundry/sting.mjs's NoticeQueue. The banner exists to
 * auto-sequence — that is its whole job. Splash must never auto-sequence:
 * the user was explicit that multiple introductions in one scene need
 * GM-paced roleplay between them, not a queue firing them back-to-back. So
 * this file owns a single-slot GUARD instead of a queue — a second
 * candidate arriving while one is already playing is DROPPED, not queued.
 * If the GM wants a second character splashed, they click again once the
 * first has ended; that manual pacing is the whole mechanism.
 *
 * `setRevealed` (in ./stage.mjs) is what actually writes `sting: "splash"`
 * onto a cast member — this file never calls it, and never imports from
 * stage.mjs at all, so stage.mjs can import FROM here (for the frame's
 * splash action and the first-appearance nudge) without a circular import.
 * `stage.mjs`'s own `#onSplash` handler calls `setRevealed` and
 * `markSplashed` as two sibling steps.
 */

import { STING_TIERS } from "../core/sting.mjs";
import { splashArrivals, splashContentFor } from "../core/splash.mjs";

const MODULE_ID = "blank-inheritance";
const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/stage/splash.hbs`;
const SPLASH_ID = "bi-splash";
const SETTING_SPLASHED = "splashedPortraits";

// Hold and Dip are plain JS constants -- narrative PAUSES with nothing to
// keep in sync against a CSS transition, unlike Take/Resolve below. Hold is
// long enough to read a name and a one-line subtitle without feeling like a
// loading screen. Dip is short: a beat, not a pause of its own.
const HOLD_MS = 1600;
const DIP_MS = 420;

/* ---------------------------------------------------------------- */
/*  Settings: has this portrait ever been splashed, in this world    */
/* ---------------------------------------------------------------- */

export function registerSplashSettings() {
  // No onChange, unlike registerCampaignSettings's world settings: this only
  // ever affects the GM's own next render of the frame key's first-appearance
  // nudge, and the GM's own trigger already causes that render through the
  // ordinary updateScene -> refreshStage path. Nobody else needs to react.
  game.settings.register(MODULE_ID, SETTING_SPLASHED, {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
}

export function everSplashedPortraits() {
  const stored = game.settings.get(MODULE_ID, SETTING_SPLASHED);
  return Array.isArray(stored) ? stored : [];
}

/**
 * GM only. Written at TRIGGER time, not at Resolve-completion — "I clicked
 * it" is what counts as played. Marking at completion instead would leave
 * the setting inconsistent with reality the moment a tab closes mid-Resolve,
 * and would make a skipped-but-genuinely-played splash look like it never
 * happened.
 */
export async function markSplashed(portraitId) {
  if (!game.user.isGM || !portraitId) return;
  const current = everSplashedPortraits();
  if (current.includes(portraitId)) return;
  await game.settings.set(MODULE_ID, SETTING_SPLASHED, [...current, portraitId]);
}

/* ---------------------------------------------------------------- */
/*  The no-barrage guard                                             */
/* ---------------------------------------------------------------- */

/** { portraitId, phase } while one is showing on THIS client, else null. */
let activeSplash = null;
/** sceneId -> the published cast this client last saw, for diffing. Own cache, separate from foundry/sting.mjs's. */
const splashCache = new Map();

/** Seed this client's memory of a scene's cast WITHOUT playing anything. Call on every scene activation. */
export function primeSplashCache(scene) {
  const cast = scene?.getFlag?.(MODULE_ID, "stage")?.cast ?? [];
  splashCache.set(scene?.id, cast);
}

/**
 * The scene's published cast changed. Diff against what this client
 * remembers; if exactly one thing qualifies and nothing is already playing,
 * play it. Anything else this same tick is DROPPED, never queued — queuing
 * would BE the barrage the design explicitly rules out.
 */
export function checkForSplash(scene) {
  if (!scene) return;
  const next = scene.getFlag(MODULE_ID, "stage")?.cast ?? [];
  const previous = splashCache.get(scene.id) ?? [];
  splashCache.set(scene.id, next);

  if (activeSplash) return; // one at a time, this client
  const [first] = splashArrivals(previous, next);
  if (first) playSplash(first);
}

/** GM's scene switch or module reload safety net: never leave a splash hanging with no client left to end it. */
export function forceDismissSplash() {
  if (!activeSplash) return;
  endSplash();
}

/* ---------------------------------------------------------------- */
/*  The DOM lifecycle                                                */
/* ---------------------------------------------------------------- */

function ensureRoot() {
  const existing = document.getElementById(SPLASH_ID);
  if (existing) return existing;
  const root = document.createElement("div");
  root.id = SPLASH_ID;
  (document.getElementById("interface") ?? document.body).append(root);
  return root;
}

let skipListener = null;

function armSkip(onSkip) {
  skipListener = (event) => {
    // Any key, or a click anywhere on the splash -- both are already scoped
    // to only exist while the splash is showing, so neither needs to guess
    // at what else might be focused elsewhere on the page.
    event.preventDefault?.();
    onSkip();
  };
  document.addEventListener("keydown", skipListener);
  document.getElementById(SPLASH_ID)?.addEventListener("click", skipListener);
}

function disarmSkip() {
  if (!skipListener) return;
  document.removeEventListener("keydown", skipListener);
  document.getElementById(SPLASH_ID)?.removeEventListener("click", skipListener);
  skipListener = null;
}

/**
 * Two frames, not one — the standard, reliable way to force a "before" state
 * to actually paint before a class change that should transition FROM it.
 * One rAF is not always enough: a class added in the same callback that
 * inserted the element can still land in the same style-recalc batch as the
 * insert, and the browser renders straight to the end state with no visible
 * transition — which is exactly what happened the first time this was
 * written with a single, synchronous classList.add.
 *
 * A setTimeout fallback races the double-rAF, because rAF is fully
 * SUSPENDED — not merely throttled — on a hidden/backgrounded browser tab
 * (found live: a GM alt-tabbed away never got a single rAF callback in over
 * two seconds). Without this, triggering a splash from a tab that is not
 * currently focused would leave it stuck on its initial covering frame
 * forever — the state machine simply never advances, since every later
 * beat is scheduled relative to when this function's callback fires.
 * setTimeout keeps running (throttled, but not suspended) on a hidden tab,
 * so the fallback still fires; the CSS transition itself will not visibly
 * animate while hidden, but the state machine keeps moving, and whatever
 * the final state is has already been reached by the time the tab is
 * looked at again.
 */
function nextPaint(fn) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
  setTimeout(run, 120);
}

/**
 * --splash-take/--splash-resolve are declared ON .bi-splash (the template's
 * own root, a child of the #bi-splash wrapper this file creates) — custom
 * properties inherit DOWNWARD, so they must be read from that element or a
 * descendant of it, never from document.documentElement, which sits above
 * where they are declared and would only ever see the CSS-file default via
 * inheritance from nowhere (i.e. nothing — the property would come back
 * empty). Read once per beat rather than cached, so a live CSS edit during
 * a play-test (exactly what happened building this) takes effect on the
 * very next splash without a reload.
 */
function readSplashDuration(inner, name, fallbackMs) {
  const raw = getComputedStyle(inner).getPropertyValue(name);
  const ms = Number.parseFloat(raw);
  return Number.isFinite(ms) ? ms : fallbackMs;
}

async function playSplash(member) {
  const content = splashContentFor(member, everSplashedPortraits());
  if (!content) return;

  activeSplash = { portraitId: content.portraitId, phase: "take" };

  const root = ensureRoot();
  const html = await foundry.applications.handlebars.renderTemplate(TEMPLATE_PATH, content);
  root.innerHTML = html;
  const inner = root.querySelector(".bi-splash");
  // Not classed yet — see nextPaint's own comment. The wipe's covering
  // (0%) position, and the whole overlay's own opacity:0, have to actually
  // paint before --take asks either to animate away from it.

  let holdTimer = null;
  let dipTimer = null;
  let resolved = false;

  // PHASE CLASSES ACCUMULATE, never get removed. If --take were swapped out
  // for --hold, the wipe's transform rule (scoped to --take) would stop
  // applying and the wipe would SNAP back to its covering position instead
  // of staying retracted through Hold, Dip and Resolve. Every later phase
  // adds its own class alongside the ones already there.
  const beginHold = () => {
    if (!activeSplash) return;
    activeSplash.phase = "hold";
    root.classList.add("bi-splash--hold");
    holdTimer = setTimeout(beginDip, HOLD_MS);
  };

  const beginDip = () => {
    if (!activeSplash) return;
    activeSplash.phase = "dip";
    root.classList.add("bi-splash--dip");
    dipTimer = setTimeout(beginResolve, DIP_MS);
  };

  const beginResolve = () => {
    if (resolved || !activeSplash) return;
    resolved = true;
    clearTimeout(holdTimer);
    clearTimeout(dipTimer);
    disarmSkip();
    activeSplash.phase = "resolving";
    // Dip is added here too (not just via beginDip). Its CSS rule is
    // guarded with :not(--resolving) (see bi-components.css), so adding
    // both together on a SKIP deliberately does NOT trigger dip's own
    // fade-to-black-then-back -- a skip is the impatient path, and the art
    // stays visible throughout rather than detouring through black first.
    // Scrim/type/seal/hint still disappear immediately either way (their
    // --resolving rule alone already does that).
    root.classList.add("bi-splash--dip", "bi-splash--resolving");
    resolveOnto(content.portraitId, root, inner);
  };

  armSkip(beginResolve);

  nextPaint(() => {
    root.classList.add("bi-splash--take");
    // Take's fade-in and wipe are CSS transitions on the class just added;
    // Hold begins when they finish. --splash-take is their own shared
    // duration, read here rather than hardcoded a second time so the two
    // can never drift apart. Scheduled from THIS point (not function
    // entry) so whatever nextPaint cost does not leave Hold starting early
    // relative to what is actually still animating on screen.
    setTimeout(beginHold, readSplashDuration(inner, "--splash-take", 1150));
  });
}

/**
 * Resolve: shrink the art down onto the frame it now occupies, fade
 * everything else, then remove the overlay entirely.
 *
 * FLIP-lite, not a live-tracking morph: the target rect is measured ONCE,
 * here, at the moment Resolve begins. If the frame cannot be found on screen
 * at all (scrolled off, the stage relaid out mid-splash), fall back to a
 * plain centred fade -- this must never throw, and a stale landing point
 * from a mid-transition window resize is an accepted v1 limitation, not a
 * bug to chase.
 */
function resolveOnto(portraitId, root, inner) {
  // bi-splash--resolving is already on `root` by the time this runs
  // (beginResolve adds it before calling here) — not re-added, and
  // bi-splash--hold/--take are deliberately never removed; see playSplash's
  // own comment on why phase classes accumulate instead of swapping.
  const artEl = root.querySelector(".bi-splash__art");
  const targetEl = document.querySelector(`.bi-frame[data-portrait-id="${CSS.escape(portraitId)}"] .bi-frame__art`);
  const targetRect = targetEl?.getBoundingClientRect();

  if (artEl && targetRect && targetRect.width > 0 && targetRect.height > 0) {
    const fromRect = artEl.getBoundingClientRect();
    const dx = targetRect.left + targetRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = targetRect.top + targetRect.height / 2 - (fromRect.top + fromRect.height / 2);
    const sx = targetRect.width / fromRect.width;
    const sy = targetRect.height / fromRect.height;
    artEl.style.setProperty("--resolve-dx", `${dx}px`);
    artEl.style.setProperty("--resolve-dy", `${dy}px`);
    artEl.style.setProperty("--resolve-sx", String(sx));
    artEl.style.setProperty("--resolve-sy", String(sy));
    artEl.classList.add("bi-splash__art--land");
  } else {
    // Fallback: the frame isn't reachable. Fade from centre instead of morphing.
    root.classList.add("bi-splash--fallback");
  }

  setTimeout(endSplash, readSplashDuration(inner, "--splash-resolve", 950) + 40);
}

function endSplash() {
  disarmSkip();
  document.getElementById(SPLASH_ID)?.remove();
  activeSplash = null;
}

/** Test/inspection seam: is a splash currently on screen, on this client? */
export function isSplashActive() {
  return Boolean(activeSplash);
}
