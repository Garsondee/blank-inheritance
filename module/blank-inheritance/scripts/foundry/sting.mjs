/**
 * The arrival sting — the Foundry-touching half.
 *
 * Owns the three things core/sting.mjs and core/notices.mjs deliberately do
 * not: the timers, the DOM plate, and the per-scene memory of who was already
 * on stage. See design/theatre-of-the-mind-staging.md §5.
 *
 * THE TIMING RULE, MADE CONCRETE: §5 says both halves of a sting (the frame
 * engaging, the banner dropping) must be "triggered by the same client-side
 * event... not scheduled independently, so each client stays internally
 * coherent". That event is the Scene document's `updateScene` hook — already
 * wired in blank-inheritance.mjs to repaint the stage; this file hangs off
 * the SAME hook to decide whether to also sound the banner, rather than
 * listening for its own signal. One event, two consumers, always in step.
 *
 * WHY A CACHE, AND WHY IT IS RESET ON canvasReady rather than persisted:
 * diffing needs a "before" to compare the new cast against, and the only
 * "before" worth having is "what this client already saw" — a client that
 * just opened a scene has seen nothing, so priming (not diffing) on arrival
 * is what keeps a scene load from announcing everyone already standing in
 * it. A GM's later reveal is a real diff against that primed baseline.
 *
 * The banner markup itself (`.bi-banner`) is V1's, unmodified — verified
 * portable when the checks pod work reused `.bi-marker__card`'s vocabulary
 * the same way. Only the lane that hosts it is new.
 */

import { STING_TIERS, diffCast, noticeForArrival } from "../core/sting.mjs";
import { NOTICE_CAP, NOTICE_DWELL, NoticeQueue } from "../core/notices.mjs";

const MODULE_ID = "blank-inheritance";
const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/stage/banner.hbs`;
const LANE_ID = "bi-banner-lane";

const queue = new NoticeQueue();
/** sceneId -> the published cast this client last saw for that scene. */
const castCache = new Map();

let laneEl = null;
let plateEl = null;
let dwellTimer = null;
let dwellEndsAt = 0;

/** Insert the (empty) lane into #interface, same replace-by-id idiom as CommandBar/StageOverlay. */
function ensureLane() {
  const existing = document.getElementById(LANE_ID);
  if (existing) {
    laneEl = existing;
    return laneEl;
  }
  laneEl = document.createElement("div");
  laneEl.id = LANE_ID;
  laneEl.className = "bi-banner-lane";
  (document.getElementById("interface") ?? document.body).append(laneEl);
  return laneEl;
}

function clockStamp() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

async function buildPlate(notice) {
  const html = await foundry.applications.handlebars.renderTemplate(TEMPLATE_PATH, {
    // Four booleans rather than a bare `kind` string -- see banner.hbs's own
    // comment on why the class has to be spelled out in the template, not
    // assembled from an interpolated suffix.
    isInfo: notice.kind === "info",
    isCaution: notice.kind === "caution",
    isAlert: notice.kind === "alert",
    isResonance: notice.kind === "resonance",
    capWord: NOTICE_CAP[notice.kind],
    text: notice.text,
    count: notice.count,
    showCount: notice.count > 1,
    time: clockStamp(),
    role: notice.kind === "alert" ? "alert" : "status"
  });
  const wrap = document.createElement("div");
  wrap.className = "bi-banner__wrap";
  wrap.innerHTML = html;
  return wrap;
}

function startDwell(ms) {
  clearTimeout(dwellTimer);
  dwellEndsAt = Date.now() + ms;
  dwellTimer = setTimeout(endDwell, ms);
}

async function showPlate(notice) {
  ensureLane();
  plateEl = await buildPlate(notice);
  laneEl.replaceChildren(plateEl);
  const plate = plateEl.querySelector(".bi-banner");
  // Hover holds the timer -- the marquee's own rule, carried over from V1:
  // a strip you cannot stop is a strip you cannot finish reading.
  plate.addEventListener("mouseenter", () => clearTimeout(dwellTimer));
  plate.addEventListener("mouseleave", () => startDwell(Math.max(1500, dwellEndsAt - Date.now())));
  plate.addEventListener("click", () => endDwell());
  startDwell(NOTICE_DWELL[notice.kind]);
}

function retirePlate(done) {
  clearTimeout(dwellTimer);
  const plate = plateEl?.querySelector(".bi-banner");
  if (!plate) {
    done();
    return;
  }
  plate.classList.add("bi-banner--out");
  const el = plateEl;
  plateEl = null;
  setTimeout(() => {
    el.remove();
    done();
  }, 320);
}

function endDwell() {
  retirePlate(() => {
    const next = queue.dismiss();
    if (next) setTimeout(() => showPlate(next), 600);
  });
}

/**
 * Raise a notice. Mirrors design/ui/console.js's proven queue-driving logic
 * (the DOM plumbing is new; the show/merge/preempt/queue handling is not
 * reinvented, because it was already right).
 */
function notify(kind, text) {
  const result = queue.push({ kind, text }, Date.now());
  switch (result.action) {
    case "show":
      showPlate(result.notice);
      break;
    case "merge": {
      const countEl = plateEl?.querySelector(".bi-banner__count");
      if (countEl) {
        countEl.textContent = `×${result.notice.count}`;
        countEl.hidden = false;
      }
      startDwell(NOTICE_DWELL[result.notice.kind]);
      break;
    }
    case "preempt":
      retirePlate(() => setTimeout(() => showPlate(result.notice), 450));
      break;
    default:
      break; // queued behind the current plate; endDwell will reach it
  }
}

/**
 * Raise a notice from outside this file — the audio director's `banner` cue
 * step, which lands on every client at its own musical beat (see
 * foundry/audio-director.mjs). Exported rather than copied so there stays
 * exactly one banner queue on screen, per the doctrine's "reuse .bi-banner,
 * don't invent a second banner system" rule.
 */
export function showNotice(kind, text) {
  notify(kind, text);
}

/* ---------------------------------------------------------------- */
/*  The scene-facing API                                             */
/* ---------------------------------------------------------------- */

/**
 * Seed this client's memory of a scene's cast WITHOUT announcing anything.
 * Call on every scene activation, before any diff is possible.
 */
export function primeStingCache(scene) {
  const cast = scene?.getFlag?.(MODULE_ID, "stage")?.cast ?? [];
  castCache.set(scene?.id, cast);
}

/**
 * The scene's published cast changed. Diff against what this client
 * remembers, sound the banner for anything that qualifies, then remember
 * the new state.
 *
 * Departures are diffed too (for symmetry and for future use — see
 * core/sting.mjs#noticeForDeparture) but produce nothing today, by design.
 */
export function announceCastChange(scene) {
  if (!scene) return;
  const next = scene.getFlag(MODULE_ID, "stage")?.cast ?? [];
  const previous = castCache.get(scene.id) ?? [];
  castCache.set(scene.id, next);

  const { arrived } = diffCast(previous, next);
  for (const member of arrived) {
    const notice = noticeForArrival(member);
    if (notice) notify(notice.kind, notice.text);
  }
}

export { STING_TIERS };
