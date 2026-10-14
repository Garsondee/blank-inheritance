/**
 * The Location Editor's Journeys: everything the panel does with the paths the tokens walk (design/location-editor.md section 16).
 *
 * The pure parts are core/journey.mjs (which journeys there are), core/journey-checks.mjs (can they be walked), core/journey-timeline.mjs (what playing one looks
 * like) and core/journey-whatif.mjs (what a placement would do); foundry/journey-data.mjs loads the street graph and the coast, and foundry/journey-overlay.mjs
 * draws on the map. This is the glue that holds the panel's state for them -- which episode is open, what is on the map, what is playing -- builds the contexts
 * its templates draw from, and answers its buttons. It never renders the panel while something is playing: the player bar is updated in place from the overlay's
 * progress, because a render of the whole window sixty times a second is exactly the thing that cannot be afforded.
 *
 * `host` is what the panel lends it (the panel's own members are private): `rerender()`, `element()`, `tab()`, `layer()`, `view()` (the Story with the GM's
 * waiting placements laid over it, or null), `inputs()` (`{ docs, locations }`), `openSlot(slotKey)` and `notify(level, text)`.
 */

import { CUT_LEAD_SECONDS, buildSteps, buildTimeline, mainRoadSteps, SPEEDS, stepOfLeg } from "../core/journey-timeline.mjs";
import { legById } from "../core/journey.mjs";
import { formatJourneyReport, mainRoadLine, summaryLine } from "../core/journey-report.mjs";
import { legBadge } from "../core/journey-checks.mjs";
import { legInfo } from "../core/story-lines.mjs";
import { whatIf } from "../core/journey-whatif.mjs";
import { analysisSignature, analyseStoryView, loadJourneyData } from "./journey-data.mjs";
import { pendingPlacePoints, storyOverrides } from "./location-story.mjs";

const NS = "BLANKINHERITANCE";
const K = `${NS}.LocationEditor.Journeys`;
const L = (key, data) => (data ? game.i18n.format(`${K}.${key}`, data) : game.i18n.localize(`${K}.${key}`));

const VERDICT_ICON = Object.freeze({ continuous: "fa-circle-check", attention: "fa-triangle-exclamation", broken: "fa-circle-xmark" });
const SEVERITY_ICON = Object.freeze({ error: "fa-circle-xmark", warn: "fa-triangle-exclamation", info: "fa-circle-info" });
const KIND_KEY = Object.freeze({ cut: "KindCut", option: "KindOption", then: "KindThen", arrival: "KindArrival" });

const pad = (n) => String(n).padStart(2, "0");
const clock = (ms) => `${Math.floor(ms / 60000)}:${pad(Math.floor((ms % 60000) / 1000))}`;

export class LocationJourneys {
  #host;
  #result = null;             // analyseStoryView's result, or null before the first
  #computing = false;
  #error = null;
  #failedFor = null;          // the signature a failed analysis was for: the same placements are not tried again on every render
  #group = null;              // the episode shown
  #legFilter = "all";         // "all" | "problems"
  #showNotes = false;
  #showAll = true;            // every route of the episode on the map while the tab is open
  #issueIndex = -1;
  #focused = new Set();       // journeys drawn bold on the map
  #playing = new Set();       // journeys in the playback that is running or paused
  #speed = 1;
  #follow = "frame";
  #timeline = null;
  #label = "";

  constructor(host) {
    this.#host = host;
  }

  get result() {
    return this.#result;
  }

  get focusedLegIds() {
    return this.#focused;
  }

  get playingLegIds() {
    return this.#playing;
  }

  get group() {
    return this.#group;
  }

  #overlay() {
    return this.#host.layer()?.journey ?? null;
  }

  /* ------------------------------------------------------------------ */
  /*  The data                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Work the journeys out for the Story as the editor has it now, if its placements have changed since the last time (the same placements give the same answer
   * and cost nothing). Safe to call on every render: it does its work at most once at a time and renders only when it has something new to show.
   */
  async ensure({ force = false } = {}) {
    if (this.#computing) return;
    const view = this.#host.view();
    const inputs = this.#host.inputs();
    if (!view || !inputs) return;
    const pendingPoints = pendingPlacePoints();
    const signature = analysisSignature(view, pendingPoints);
    if (!force && this.#result && this.#result.signature === signature && this.#result.locations === inputs.locations) return;
    if (!force && this.#error && this.#failedFor === signature) return;
    this.#computing = true;
    this.#error = null;
    this.#failedFor = null;
    try {
      this.#result = { ...(await analyseStoryView(view, { locations: inputs.locations, pendingPoints, force })), locations: inputs.locations };
      this.#afterAnalysis();
    } catch (err) {
      console.error("Blank Inheritance | Location Editor could not work out the journeys:", err);
      this.#error = err.message;
      this.#failedFor = signature;
    } finally {
      this.#computing = false;
      this.#host.rerender();
    }
  }

  #afterAnalysis() {
    const { model } = this.#result;
    if (!this.#group || !model.groups.some((g) => g.id === this.#group)) this.#group = model.groups[0]?.id ?? null;
    for (const id of [...this.#focused]) if (!this.#result.analysis.legs.has(id)) this.#focused.delete(id);
    this.#stopPlayback({ quiet: true });            // what was playing was made from journeys that have changed
    this.#issueIndex = -1;
    this.syncOverlay();
  }

  /** Wire the tab's controls that are not buttons (a select and the scrubber); called on every render of the panel, so it only ever adds listeners to fresh nodes. */
  bindDom(root) {
    const select = root.querySelector('[name="journeyGroup"]');
    select?.addEventListener("change", () => this.setGroup(select.value));
    const scrub = root.querySelector('[name="journeyScrub"]');
    scrub?.addEventListener("input", () => this.seekTo(Number(scrub.value)));
  }

  /** Re-check from scratch (the files on the server may have changed). */
  async recheck() {
    await this.ensure({ force: true });
  }

  /* ------------------------------------------------------------------ */
  /*  The map                                                             */
  /* ------------------------------------------------------------------ */

  #groupOf(id = this.#group) {
    return this.#result?.model.groups.find((g) => g.id === id) ?? null;
  }

  /**
   * The Story list shows every episode's journeys, but the overlay draws one episode at a time: a button there that names a journey of another episode opens that
   * episode first (what is bold, and what plays, is then on the map).
   */
  #openGroupOf(legId) {
    const leg = legById(this.#result?.model, legId);
    if (!leg || leg.groupId === this.#group) return;
    this.#group = leg.groupId;
    this.#focused.clear();
    this.#issueIndex = -1;
    this.syncOverlay();
  }

  /** Give the overlay the journeys of the open episode, and say which are bold and which are drawn at all. */
  syncOverlay() {
    const overlay = this.#overlay();
    if (!overlay) return;
    const group = this.#groupOf();
    if (!this.#result || !group) {
      overlay.setJourneys({ legs: [], stops: [] });
      return;
    }
    const { analysis, deps } = this.#result;
    const onTab = this.#host.tab() === "journeys";
    const legs = group.legs.map((leg) => {
      const result = analysis.legs.get(leg.id);
      return { id: leg.id, kind: leg.kind, label: leg.label, runs: result?.runs ?? [], worst: legBadge(result).worst, ends: [leg.from.slotKey, leg.to.slotKey] };
    });
    const stops = onTab && this.#showAll
      ? group.stops.map((stop, i) => ({ n: i + 1, point: deps.pointOf({ locationId: stop.slot.locationId, viaRecord: stop.slot.viaRecord }), title: stop.title, slotKey: stop.slotKey })).filter((s) => s.point)
      : [];
    overlay.setJourneys({ legs, stops });
    overlay.setHighlight([...this.#focused], { showAll: onTab && this.#showAll });
  }

  /** The panel is going to another tab: what is drawn follows. */
  tabChanged() {
    this.syncOverlay();
  }

  /* ------------------------------------------------------------------ */
  /*  What the templates draw                                             */
  /* ------------------------------------------------------------------ */

  /** The Journeys tab. */
  context() {
    const base = { loading: this.#computing, error: this.#error, ready: false, groups: [], group: null, missing: { graph: false, coast: false }, legs: [], issues: [], issueCount: 0, showAll: this.#showAll, showNotes: this.#showNotes, onlyProblems: this.#legFilter === "problems" };
    if (!this.#result) return base;
    const { model, analysis, data } = this.#result;
    const summary = analysis.groups.find((g) => g.id === this.#group);
    const group = this.#groupOf();
    base.ready = true;
    base.groups = model.groups.map((g) => ({ id: g.id, title: g.title, selected: g.id === this.#group }));
    base.missing = { graph: Boolean(data.graphMissing), coast: Boolean(data.landGridMissing) };
    if (!summary || !group) return base;

    const shown = this.#showNotes ? ["error", "warn", "info"] : ["error", "warn"];
    const issues = analysis.issues.filter((i) => i.groupId === this.#group && shown.includes(i.severity));
    base.issueCount = issues.filter((i) => i.severity !== "info").length;
    base.issues = issues.map((issue, index) => ({
      index, id: issue.id, severity: issue.severity, icon: SEVERITY_ICON[issue.severity], text: issue.text, hint: issue.hint, legId: issue.legId, slotKey: issue.slotKey,
      current: index === this.#issueIndex, hasLeg: Boolean(issue.legId)
    }));
    const legWatch = { shownLegIds: this.#focused, playingLegIds: this.#playing };
    base.legs = group.legs
      .map((leg, i) => {
        const info = legInfo(leg, analysis.legs.get(leg.id), legWatch);
        return { ...info, n: i + 1, kindLabel: L(KIND_KEY[leg.kind] ?? "KindCut"), summaryText: info.status === "routed" ? [info.distance, info.time, info.modes].filter(Boolean).join(" · ") : info.statusText };
      })
      .filter((leg) => this.#legFilter !== "problems" || leg.worst === "error" || leg.worst === "warn");
    const main = mainRoadLine(summary);
    base.group = {
      id: group.id, title: group.title, verdict: summary.verdict, verdictClass: `bi-journeys__verdict--${summary.verdict}`, icon: VERDICT_ICON[summary.verdict],
      verdictLabel: L(`Verdict.${summary.verdict}`), summary: summaryLine(summary), main: main ? L("MainRoad", { text: main }) : null, hasMain: summary.main.legs > 0,
      fades: summary.main.legs > 0 ? L("FadeNote", { seconds: summary.main.legs * CUT_LEAD_SECONDS }) : null, unplaced: summary.unplaced
    };
    return base;
  }

  /** The player bar, or `{ visible: false }` when nothing is playing. */
  playerContext() {
    const overlay = this.#overlay();
    const state = overlay?.state;
    if (!state?.active || !this.#timeline) {
      // the overlay was let go of under it (the scene changed): what was playing is over
      if (this.#timeline && !state?.active) { this.#timeline = null; this.#playing = new Set(); }
      return { visible: false };
    }
    const step = this.#timeline.steps[state.stepIndex];
    return {
      visible: true, playing: state.playing, pos: state.total ? Math.round((state.t / state.total) * 1000) : 0,
      time: `${clock(state.t)} / ${clock(state.total)}`, label: this.#label, title: step?.step.title ?? "", detail: step?.step.detail ?? "",
      count: L("StepOf", { n: state.stepIndex + 1, of: this.#timeline.steps.length }),
      real: step?.realMinutes ? L("RealTime", { minutes: Math.max(1, Math.round(step.realMinutes)) }) : "",
      speeds: SPEEDS.map((value) => ({ value, label: `${value}×`, active: value === state.speed })), frame: state.follow === "frame"
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Choosing what to look at                                            */
  /* ------------------------------------------------------------------ */

  setGroup(id) {
    if (!this.#groupOf(id)) return;
    this.#group = id;
    this.#focused.clear();
    this.#issueIndex = -1;
    this.#stopPlayback({ quiet: true });
    this.syncOverlay();
    this.#host.rerender();
    this.fitGroup();
  }

  toggleShowAll(on) {
    this.#showAll = Boolean(on);
    this.syncOverlay();
    this.#host.rerender();
  }

  toggleNotes(on) {
    this.#showNotes = Boolean(on);
    this.#issueIndex = -1;
    this.#host.rerender();
  }

  toggleOnlyProblems(on) {
    this.#legFilter = on ? "problems" : "all";
    this.#host.rerender();
  }

  /** Bring the camera to every route of the open episode. */
  fitGroup() {
    const group = this.#groupOf();
    const overlay = this.#overlay();
    if (!group || !overlay || !this.#host.layer()?.publishedSummary?.onHub) return false;
    return overlay.frameLegs(group.legs.map((l) => l.id));
  }

  /** "Show me this route": bold on the map with arrows, the camera on it. */
  async showLeg(legId) {
    if (!this.#result?.analysis.legs.has(legId)) return;
    if (!(await this.#host.ensureMap())) return;
    this.#stopPlayback({ quiet: true });
    this.#openGroupOf(legId);
    this.#focused = new Set([legId]);
    this.syncOverlay();
    const framed = this.#overlay()?.frameLegs([legId]);
    if (!framed) this.#host.notify("info", L("NothingToShow"));
    this.#host.rerender();
  }

  /** Nothing bold on the map (the routes of the episode stay if the tab shows them). */
  clearFocus() {
    this.#focused.clear();
    this.syncOverlay();
    this.#host.rerender();
  }

  /* ------------------------------------------------------------------ */
  /*  The problems                                                        */
  /* ------------------------------------------------------------------ */

  #issues() {
    if (!this.#result) return [];
    const shown = this.#showNotes ? ["error", "warn", "info"] : ["error", "warn"];
    return this.#result.analysis.issues.filter((i) => i.groupId === this.#group && shown.includes(i.severity));
  }

  /** Go to the problem `index` (or the next / previous one, with `dir` = 1 / -1): show its journey, or the place it is about. */
  async showIssue(index) {
    const issues = this.#issues();
    const issue = issues[index];
    if (!issue) return;
    if (!(await this.#host.ensureMap())) return;
    this.#issueIndex = index;
    if (issue.legId) {
      this.#focused = new Set([issue.legId]);
      this.#stopPlayback({ quiet: true });
      this.syncOverlay();
      this.#overlay()?.frameLegs([issue.legId]);
    } else {
      this.#focused.clear();
      this.syncOverlay();
      const place = this.#result.analysis.places.get(issue.slotKey);
      const locationId = place?.end.locationId;
      const layer = this.#host.layer();
      if (!(locationId && layer?.focusLocation(locationId, { label: place.end.title ?? "" })) && place?.point) this.#overlay()?.framePoint(place.point);
    }
    this.#host.rerender();
  }

  async nextIssue(dir) {
    const count = this.#issues().length;
    if (!count) return;
    const next = this.#issueIndex < 0 ? (dir < 0 ? count - 1 : 0) : (this.#issueIndex + dir + count) % count;
    await this.showIssue(next);
  }

  /* ------------------------------------------------------------------ */
  /*  Playing                                                             */
  /* ------------------------------------------------------------------ */

  /** Start a playlist of steps. Says why when there is nothing to watch. */
  async #start(steps, label) {
    if (!this.#result) return;
    if (!(await this.#host.ensureMap())) return;
    const timeline = buildTimeline(steps, this.#result.analysis);
    const overlay = this.#overlay();
    if (!timeline.steps.length || !overlay) {
      this.#host.notify("info", L("NothingToWatch"));
      return;
    }
    this.#timeline = timeline;
    this.#label = label;
    this.#playing = new Set(timeline.steps.flatMap((s) => s.legs.map((l) => l.legId)));
    this.#focused = new Set(this.#playing);
    this.syncOverlay();
    overlay.play(timeline, { speed: this.#speed, follow: this.#follow, onTick: (info) => this.#paint(info), onEnd: () => this.#host.rerender() });
    this.#host.rerender();
  }

  playLeg(legId) {
    const leg = legById(this.#result?.model, legId);
    if (!leg) return Promise.resolve();
    this.#openGroupOf(legId);
    const step = { id: `step:${legId}`, groupId: leg.groupId, kind: leg.kind, rowKey: leg.rowKey, legIds: [legId], title: leg.label, detail: "" };
    return this.#start([step], leg.label);
  }

  /** Play the leg together with the legs the game plays at the same moment (every option of one departure). */
  playStep(legId) {
    if (!this.#result) return Promise.resolve();
    this.#openGroupOf(legId);
    const steps = buildSteps(this.#result.model, this.#group);
    const step = stepOfLeg(steps, legId);
    return step ? this.#start([step], step.title) : this.playLeg(legId);
  }

  /** The whole episode: the main road (scene to scene) only, or every step including the players' choices. */
  playGroup(mainOnly) {
    if (!this.#result) return Promise.resolve();
    const all = buildSteps(this.#result.model, this.#group);
    const group = this.#groupOf();
    return this.#start(mainOnly ? mainRoadSteps(all) : all, `${group?.title ?? ""} · ${L(mainOnly ? "PlayMainLabel" : "PlayAllLabel")}`);
  }

  togglePlay() {
    const overlay = this.#overlay();
    if (!overlay?.state.active) return;
    overlay.toggle();
    this.#paint(null);
  }

  stopPlay() {
    this.#stopPlayback({});
    this.#host.rerender();
  }

  #stopPlayback({ quiet = false } = {}) {
    const overlay = this.#overlay();
    if (overlay?.state.active) overlay.stop();
    this.#timeline = null;
    this.#playing = new Set();
    if (!quiet) this.syncOverlay();
  }

  /** Jump to the start of the next (`dir` 1) or the previous (-1) step; the previous step's start only once this one is a second in. */
  skip(dir) {
    const overlay = this.#overlay();
    const timeline = this.#timeline;
    if (!overlay?.state.active || !timeline) return;
    const state = overlay.state;
    const here = timeline.steps[state.stepIndex];
    let target = state.stepIndex + dir;
    if (dir < 0 && state.t - here.startMs > 1000) target = state.stepIndex;
    target = Math.min(Math.max(0, target), timeline.steps.length - 1);
    overlay.seek(timeline.steps[target].startMs);
    this.#paint(null);
  }

  /** The scrubber: `pos` is 0..1000. */
  seekTo(pos) {
    const overlay = this.#overlay();
    const state = overlay?.state;
    if (!state?.active) return;
    overlay.seek((pos / 1000) * state.total);
    this.#paint(null);
  }

  setSpeed(value) {
    this.#speed = SPEEDS.includes(value) ? value : 1;
    this.#overlay()?.setSpeed(this.#speed);
    this.#paint(null);
  }

  toggleFollow() {
    this.#follow = this.#follow === "frame" ? "stay" : "frame";
    this.#overlay()?.setFollow(this.#follow);
    this.#paint(null);
  }

  /**
   * Update the player bar in place from what the overlay reports. The bar is re-rendered with the rest of the window only when something changes shape; while
   * playing this is all that moves, and it touches a handful of nodes.
   */
  #paint(info) {
    const root = this.#host.element();
    const bar = root?.querySelector?.(".bi-jbar");
    const overlay = this.#overlay();
    if (!bar || !overlay) return;
    const state = overlay.state;
    if (!state.active || !this.#timeline) return;
    bar.classList.toggle("is-playing", state.playing);
    const scrub = bar.querySelector(".bi-jbar__scrub");
    if (scrub && document.activeElement !== scrub) scrub.value = String(state.total ? Math.round((state.t / state.total) * 1000) : 0);
    const set = (selector, text) => { const el = bar.querySelector(selector); if (el && el.textContent !== text) el.textContent = text; };
    set(".bi-jbar__time", `${clock(state.t)} / ${clock(state.total)}`);
    const step = this.#timeline.steps[state.stepIndex];
    set(".bi-jbar__title", step?.step.title ?? "");
    set(".bi-jbar__detail", step?.step.detail ?? "");
    set(".bi-jbar__count", L("StepOf", { n: state.stepIndex + 1, of: this.#timeline.steps.length }));
    for (const button of bar.querySelectorAll("[data-speed]")) button.classList.toggle("is-active", Number(button.dataset.speed) === state.speed);
    bar.querySelector('[data-action="toggleFollow"]')?.classList.toggle("is-active", state.follow === "frame");
    // the legs of the list that are playing now
    if (info?.step) {
      const live = new Set(info.step.legs.map((l) => l.legId));
      for (const li of root.querySelectorAll("[data-leg-row]")) li.classList.toggle("is-playing", live.has(li.dataset.legRow));
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Reporting                                                           */
  /* ------------------------------------------------------------------ */

  /** The report for the chat: every error and warning of the open episode with its scene and slot, and every journey in order. */
  reportText() {
    const view = this.#host.view();
    if (!this.#result || !view) return null;
    return formatJourneyReport({ story: view.story, model: this.#result.model, analysis: this.#result.analysis }, { groupId: this.#group, notes: true, legs: true }).text;
  }

  async copyReport() {
    const text = this.reportText();
    if (!text) {
      this.#host.notify("warn", L("NoReport"));
      return;
    }
    try {
      if (game.clipboard?.copyPlainText) await game.clipboard.copyPlainText(text);
      else await navigator.clipboard.writeText(text);
      this.#host.notify("info", L("ReportCopied"));
    } catch (err) {
      console.warn("Blank Inheritance | Location Editor could not reach the clipboard; the report is in the console:", err);
      console.log(text);
      this.#host.notify("warn", L("ReportNoClipboard"));
    }
  }

  /* ------------------------------------------------------------------ */
  /*  The consequences of a placement not yet made                        */
  /* ------------------------------------------------------------------ */

  /**
   * Judge a placement before it is confirmed: `changes` is `[{ target, locationId | viaRecord | offMap }]`. Returns core/journey-whatif.mjs#whatIf's result,
   * or null while the journeys have not been worked out yet.
   */
  whatIfFor(changes, { extraNew = {} } = {}) {
    const inputs = this.#host.inputs();
    if (!this.#result || !inputs || !changes.length) return null;
    const { overrides, newLocations } = storyOverrides();
    // `extraNew` is a place that is only a point so far (a pin being placed): `{ [id]: { point (map-image px), name, tier } }`
    const deps = { ...this.#result.deps, pointOf: (end) => (end.viaRecord && extraNew[end.viaRecord]?.point) || this.#result.deps.pointOf(end) };
    const fresh = Object.fromEntries(Object.entries(extraNew).map(([id, v]) => [id, { name: v.name, tier: v.tier }]));
    return whatIf({ docs: inputs.docs, locations: inputs.locations, overrides, newLocations: { ...newLocations, ...fresh }, changes, deps });
  }

  /** Make sure the street graph and the coast are loading (the first thing the tab needs); resolves when they are. */
  preload() {
    return loadJourneyData();
  }
}
