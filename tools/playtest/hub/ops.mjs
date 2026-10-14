/**
 * The hub core: owns the browser, the seats, the bots and the run's memory, and carries out everything the orchestrator asks of them
 * (design/playtest-process.md, sections 4 to 6). The HTTP layer (hub/server.mjs) is a thin door onto this; nothing here knows about HTTP.
 *
 * Two kinds of caller. A SEAT (an agent or a bot) may only use the seat verbs (hub/verbs.mjs). The ORCHESTRATOR may do the rest: start
 * and stop a run, pause the table, arm the dice, run the detectors and the probes, read the coverage ledger, evaluate code in a seat's page
 * (the one door to the game's internals), and file findings of its own. The split is the whole of "separate minds".
 */

import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FOUNDRY_URL, REPO, RUNS_DIR, STATE_DIR, MODULE_DIR } from "../paths.mjs";
import { launchChrome, sleep } from "../browser/chrome.mjs";
import { Seat } from "../browser/seat.mjs";
import { foundryStatus } from "../foundry/launch.mjs";
import { validateRoster } from "../core/roster.mjs";
import { authoredItems, applyEvents, eventsFromRuns, eventsFromTape, summarize } from "../core/coverage.mjs";
import { canaryStrings, judgeLeaks } from "../core/canaries.mjs";
import { judgeCharacters } from "../core/oracle.mjs";
import { summarizeTape } from "../core/dice.mjs";
import { summarizeEvents } from "../core/telemetry.mjs";
import { occlusionCause } from "../core/detector-keys.mjs";
import { RunStore } from "./store.mjs";
import { runSeatVerb } from "./verbs.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const iso = () => new Date().toISOString();

/** What each detector's hit is worth, and what to call it. S3 hits are reported but not filed unless asked (they would drown the log). */
const DETECTOR_POLICY = {
  clickthrough: { severity: "S1", say: "An empty invisible element swallows clicks" },
  occlusion: { severity: "S2", say: "A control is covered" },
  offscreen: { severity: "S2", say: "A control is off the screen" },
  tiny: { severity: "S3", say: "Controls smaller than 24x24" },
  "overflow-x": { severity: "S2", say: "The page scrolls sideways" },
  "clipped-text": { severity: "S3", say: "Text is cut off" },
  unlabelled: { severity: "S3", say: "A control has no name" }
};

export class Hub {
  constructor({ log = console.log, persistToken = true } = {}) {
    this.log = log;
    this.store = null;
    this.runDir = null;
    this.seats = new Map();
    this.bots = new Map();
    this.browser = null;
    this.roster = null;
    this.tokens = {};
    this.orchToken = randomBytes(8).toString("hex");
    // The orchestrator's CLI finds the token here, so it must exist from the moment the hub is up, not from the first run.
    if (persistToken) {
      mkdirSync(STATE_DIR, { recursive: true });
      writeFileSync(path.join(STATE_DIR, "orch-token"), this.orchToken);
    }
    this.personas = readJson(path.join(REPO, "tools", "playtest", "personas", "personas.json"));
    this.timers = [];
    this.thumbs = new Map();
    this.watchers = 0;
    this.peeks = new Map();
    this.authored = null;
    this.startedAt = null;
    this.foundryCache = { at: 0, value: null };
    this.abort = null;
    this.bus = new EventEmitter();
  }

  // --- identity -----------------------------------------------------------------------------------------------------------------
  seatFor(id, token) {
    const seat = this.seats.get(id);
    return seat && this.tokens[id] && this.tokens[id] === token ? seat : null;
  }
  isOrchestrator(token) {
    return token === this.orchToken;
  }

  // --- run lifecycle ---------------------------------------------------------------------------------------------------------------
  async startRun({ roster, name = null, seed = null }) {
    if (this.store) throw new Error(`A run is already in progress (${this.store.run}). Stop it first.`);
    const checked = validateRoster(roster, { personas: this.personas });
    if (!checked.ok) throw new Error(`The roster is not valid: ${checked.errors.join("; ")}`);
    const status = await foundryStatus();
    if (!status.up || !status.active) throw new Error("The playtest Foundry is not running with its world (pt foundry start, or the app's foundry-playtest preview).");

    const runName = name ?? roster.run;
    this.runDir = path.join(RUNS_DIR, runName);
    if (existsSync(path.join(this.runDir, "run.json"))) throw new Error(`The run folder ${runName} already exists. Use another name (--name).`);
    mkdirSync(this.runDir, { recursive: true });
    this.roster = roster;
    this.store = new RunStore({ dir: this.runDir, run: runName, seed: seed ?? roster.seed ?? runName });
    this.store.subscribe((e) => this.bus.emit("e", e));
    this.startedAt = iso();
    let build = null;
    try {
      build = readJson(path.join(MODULE_DIR, "data", "campaign", "build.json")).id;
    } catch {
      build = null;
    }
    this.tokens = Object.fromEntries(roster.seats.map((s) => [s.seat, randomBytes(5).toString("hex")]));
    writeFileSync(path.join(this.runDir, "run.json"), `${JSON.stringify({ name: runName, seed: this.store.seed, startedAt: this.startedAt, build, roster, foundry: status }, null, 2)}\n`);
    writeFileSync(path.join(this.runDir, "tokens.json"), `${JSON.stringify(this.tokens, null, 2)}\n`);
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(path.join(STATE_DIR, "orch-token"), this.orchToken);

    this.browser = await launchChrome();
    const ctx = { browser: this.browser, foundryUrl: FOUNDRY_URL, runDir: this.runDir, seed: this.store.seed, emit: (seatId, event) => this.onSeatEvent(seatId, event), action: (seatId, action) => this.store?.recordAction({ seat: seatId, ...action }) };
    const order = [...roster.seats].sort((a, b) => (a.role === "gm" ? -1 : 0) - (b.role === "gm" ? -1 : 0));
    const results = [];
    for (const spec of order) {
      const seat = new Seat({ spec, ctx });
      this.seats.set(spec.seat, seat);
      try {
        await seat.start();
        results.push({ seat: spec.seat, ok: true });
        this.log(`  seat ${spec.seat} (${spec.user}) is in`);
      } catch (error) {
        seat.state = "failed";
        results.push({ seat: spec.seat, ok: false, error: error.message });
        this.log(`  seat ${spec.seat} FAILED to start: ${error.message}`);
        this.store.addFinding({ kind: "rig", severity: "S1", summary: `Seat ${spec.seat} would not start: ${error.message.slice(0, 200)}`, evidence: ["run.json"] }, { channel: "orchestrator", seat: spec.seat });
      }
      await sleep(900);
    }
    this.startPollers();
    this.store.say({ seat: "ORCH", kind: "system", text: `The table is set: ${roster.seats.length} seats, build ${build ?? "unstamped"}.` });
    return { name: runName, build, seats: results, tokens: this.tokens };
  }

  startPollers() {
    const every = (ms, fn) => this.timers.push(setInterval(() => fn().catch((error) => this.log(`poller: ${error.message}`)), ms));
    every(1000, async () => {
      for (const seat of this.seats.values()) {
        if (seat.state !== "ready") continue;
        for (const event of await seat.drainPageEvents()) this.onSeatEvent(seat.id, event);
      }
    });
    every(5000, async () => {
      this.store?.flushIfDirty();
      for (const seat of this.seats.values()) {
        if (seat.state !== "ready") continue;
        try {
          const peek = await seat.probe("peek");
          this.peeks.set(seat.id, peek);
          if (seat.role === "gm" && peek?.runner?.brief) this.store.currentBrief = peek.runner.brief;
          const me = peek?.users?.find((u) => u.name === seat.user);
          if (me?.character) this.store.characters[seat.id] = me.character;
        } catch {
          /* the page is navigating */
        }
      }
    });
    // The instruments that must not depend on anyone remembering to run them: a GM-only line is on a player's screen only while its page is
    // open (the first run's leak scan came too late to see one printed on Page 1), and a box over the deck matters from the moment it is there.
    every(8000, () => this.autoLeak());
    every(40000, () => this.autoDetect());
    every(3500, async () => {
      if (!this.watchers) return;
      for (const seat of this.seats.values()) {
        if (seat.state !== "ready") continue;
        try {
          const [w, h] = seat.profile.viewport;
          const buffer = await seat.page.screenshot({ type: "jpeg", quality: 50, clip: { x: 0, y: 0, width: w, height: h, scale: 0.34 }, captureBeyondViewport: false });
          this.thumbs.set(seat.id, buffer);
        } catch {
          /* mid-navigation */
        }
      }
    });
  }

  onSeatEvent(seatId, event) {
    if (!this.store) return;
    if (event.type === "dice") this.store.recordDice(event);
    this.store.event(seatId, event);
  }

  async stopRun() {
    if (!this.store) return { stopped: false };
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    this.abort?.abort();
    for (const bot of this.bots.values()) await bot.done?.catch?.(() => {});
    await this.walk?.done?.catch?.(() => {});
    this.walk = null;
    this.bots.clear();
    const summary = { name: this.store.run, endedAt: iso(), findings: this.store.tally(), actions: this.store.counters.bySeat, events: this.store.counters.events };
    this.store.flushFindings();
    for (const seat of this.seats.values()) await seat.stop();
    this.seats.clear();
    try {
      await this.browser?.close();
    } catch {
      /* already gone */
    }
    this.browser = null;
    writeFileSync(path.join(this.runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    this.store = null;
    return { stopped: true, summary };
  }

  requireRun() {
    if (!this.store) throw new Error("No run is in progress (pt run start).");
    return this.store;
  }

  pause(reason = "paused by the operator") {
    this.requireRun().paused = reason;
    this.store.say({ seat: "ORCH", kind: "system", text: `PLAY IS PAUSED: ${reason}` });
    return `Paused: ${reason}`;
  }
  resume() {
    const store = this.requireRun();
    store.paused = null;
    store.say({ seat: "ORCH", kind: "system", text: "Play resumes." });
    return "Resumed.";
  }

  // --- verbs -------------------------------------------------------------------------------------------------------------------------
  async seatVerb(seat, verb, call) {
    const store = this.requireRun();
    if (store.paused && !["read", "note", "memory", "who"].includes(verb)) return { ok: false, text: `PLAY IS PAUSED (${store.paused}). Wait ten seconds, then try again.` };
    if (seat.state !== "ready") return { ok: false, text: `Your seat is ${seat.state}. Tell the table something is wrong with the connection (note --kind rig).` };
    const started = Date.now();
    let result;
    try {
      result = await runSeatVerb(this, seat, verb, call);
    } catch (error) {
      result = { ok: false, text: `That went wrong inside the rig: ${error.message}` };
      store.addFinding({ kind: "rig", severity: "S2", summary: `verb ${verb} threw for ${seat.id}: ${error.message.slice(0, 160)}`, evidence: ["actions.jsonl"] }, { channel: "orchestrator", seat: seat.id });
    }
    store.recordAction({ seat: seat.id, verb, args: [...(call.positionals ?? []), ...Object.entries(call.flags ?? {}).map(([k, v]) => `--${k}${v === true ? "" : `=${v}`}`)].join(" "), ok: result.ok, ms: Date.now() - started, text: result.text });
    return result;
  }

  // --- the table, as the orchestrator --------------------------------------------------------------------------------------------------
  speak({ kind = "system", text, to = null, seat = "ORCH" }) {
    const result = this.requireRun().say({ seat, kind, text, to });
    return result.ok ? `Entry ${result.entry.n}.` : `Not said: ${result.error}`;
  }

  // --- dice -----------------------------------------------------------------------------------------------------------------------------
  async diceArm({ seats, spec }) {
    const ids = seats.length ? seats : [...this.seats.keys()].filter((id) => this.seats.get(id).role === "player");
    const out = [];
    for (const id of ids) {
      const seat = this.seats.get(id);
      if (!seat) {
        out.push(`${id}: no such seat`);
        continue;
      }
      const r = await seat.armDice({ ...spec, seat: id });
      out.push(`${id}: ${r.ok ? `armed (${r.plan} in plan)` : `NOT armed: ${r.error}`}`);
    }
    return out.join("\n");
  }
  async diceClear(seatId = null) {
    const out = [];
    for (const [id, seat] of this.seats) if (!seatId || id === seatId) out.push(`${id}: cleared ${await seat.clearDice()}`);
    return out.join("\n");
  }
  async diceStatus() {
    const out = [];
    for (const [id, seat] of this.seats) {
      const s = await seat.diceStatus().catch(() => null);
      if (s) out.push(`${id}: seed ${s.seed ?? "(none: natural)"}, ${s.plan.length} armed${s.plan.length ? ` [${s.plan.map((e) => `${e.degree !== null ? ["critfail", "fail", "success", "critsuccess"][e.degree] : `nat ${e.natural}`} x${e.count}${e.dc !== null ? ` dc${e.dc}` : ""}`).join(", ")}]` : ""}, ${s.tape} unrecorded${s.lastError ? `, LAST ERROR ${s.lastError.slice(0, 120)}` : ""}`);
    }
    return out.join("\n");
  }
  async diceSeed(seed) {
    this.requireRun().seed = seed || null;
    for (const seat of this.seats.values()) await seat.page.evaluate(`window.__ptDice.configure(${JSON.stringify({ seat: seat.id, seed: seed || null })})`);
    return seed ? `Dice seeded with "${seed}" on every seat (each seat draws its own sequence from "${seed}:<seat>").` : "Dice are natural again.";
  }
  diceSummary() {
    return summarizeTape(this.requireRun().dice);
  }

  // --- detectors and probes -------------------------------------------------------------------------------------------------------------
  targetSeats(id) {
    return id ? [this.seats.get(id)].filter(Boolean) : [...this.seats.values()].filter((s) => s.state === "ready");
  }

  async detect({ seat: id = null, names = null, strict = false }) {
    const store = this.requireRun();
    const lines = [];
    for (const seat of this.targetSeats(id)) {
      const hits = await seat.detect(names);
      const total = Object.values(hits).reduce((n, h) => n + h.length, 0);
      lines.push(`${seat.id}: ${total ? Object.entries(hits).map(([k, v]) => `${k} ${v.length}`).join(", ") : "nothing found"}`);
      for (const [name, list] of Object.entries(hits)) {
        const policy = DETECTOR_POLICY[name] ?? { severity: "S2", say: name };
        const file = strict || policy.severity !== "S3";
        for (const hit of name === "tiny" || name === "unlabelled" ? [{ aggregate: true, list }] : list) {
          // Occlusion is filed once per cause (window + covering component), not once per covered control (core/detector-keys.mjs).
          const cause = name === "occlusion" && !hit.aggregate ? occlusionCause(hit) : null;
          const summary = cause ? cause.summary : name === "clickthrough" && hit.covers ? `${policy.say}: ${hit.element}${hit.covers.length ? ` covers ${hit.covers.slice(0, 3).join(", ")}` : ""}` : hit.aggregate ? `${policy.say}: ${list.length} case(s), e.g. ${list.slice(0, 2).map((h) => h.window ?? h.element).join(", ")}` : `${policy.say}: ${hit.element ?? hit.name ?? ""}${hit.coveredBy ? ` covered by ${hit.coveredBy}` : ""}${hit.window ? ` (in ${hit.window})` : ""}`;
          store.event(seat.id, { type: "detector", name, severity: policy.severity, text: summary, t: Date.now() });
          if (file) store.detectorFinding({ seat: seat.id, name, severity: hit.coveredByKind === "the scene canvas" ? "S1" : policy.severity, summary, detail: hit.aggregate ? list.slice(0, 6) : hit, key: cause ? cause.key : name === "clickthrough" && !hit.aggregate ? `detector:${name}|${hit.element}|${hit.coveredBy ?? ""}` : null });
          lines.push(`  ${policy.severity} ${summary}`);
        }
      }
    }
    return lines.join("\n");
  }

  /** The state a table is supposed to agree on, with the per-client parts removed. */
  static agreed(peek) {
    if (!peek?.ready) return null;
    return { moment: peek.moment, runner: peek.runner, check: peek.check, scene: peek.scene?.id ?? null, users: peek.users?.map((u) => `${u.name}|${u.character ?? ""}`).sort() };
  }

  async convergence() {
    const store = this.requireRun();
    const sample = async () => {
      const out = new Map();
      for (const seat of this.targetSeats(null)) out.set(seat.id, Hub.agreed(await seat.probe("peek").catch(() => null)));
      return out;
    };
    const differences = (map) => {
      const keys = new Set([...map.values()].flatMap((v) => (v ? Object.keys(v) : [])));
      const out = [];
      for (const key of keys) {
        const values = new Map();
        for (const [id, v] of map) if (v) values.set(id, JSON.stringify(v[key]));
        if (new Set(values.values()).size > 1) out.push({ key, values: Object.fromEntries(values) });
      }
      return out;
    };
    let diffs = differences(await sample());
    if (diffs.length) {
      await sleep(2500);
      diffs = differences(await sample());
    }
    if (!diffs.length) return "All seats agree on the shared state (clock, Runner, open check, scene, who is in).";
    for (const d of diffs) store.detectorFinding({ seat: "table", name: "convergence", severity: "S1", summary: `Seats disagree on "${d.key}" after a settling wait`, detail: d });
    return `DISAGREEMENT after a settling wait:\n${diffs.map((d) => `  ${d.key}: ${Object.entries(d.values).map(([id, v]) => `${id}=${String(v).slice(0, 80)}`).join("  ")}`).join("\n")}`;
  }

  async reloadInvariance(id) {
    const store = this.requireRun();
    const seat = this.seats.get(id);
    if (!seat) return `No seat ${id}.`;
    const before = { peek: Hub.agreed(await seat.probe("peek")), windows: await seat.probe("windows") };
    const r = await seat.reload();
    if (!r.ok) return `Reload failed: ${r.text}`;
    await sleep(2500);
    const after = { peek: Hub.agreed(await seat.probe("peek")), windows: await seat.probe("windows") };
    const lost = before.windows.applications.filter((a) => !after.windows.applications.includes(a));
    const changed = JSON.stringify(before.peek) !== JSON.stringify(after.peek);
    if (changed) store.detectorFinding({ seat: id, name: "reload-invariance", severity: "S1", summary: "The shared state differs after a reload", detail: { before: before.peek, after: after.peek } });
    return `${id} reloaded. Shared state ${changed ? "CHANGED" : "unchanged"}. Windows open before and gone after: ${lost.length ? lost.join(", ") : "none"}. HUD parts after: ${after.windows.hud.join(", ") || "none"}.`;
  }

  /** The chargen oracle over every character in the world (core/oracle.mjs): sf2e's sheet against derive.mjs, and who owns what. */
  async charactersCheck({ landing = null } = {}) {
    const store = this.requireRun();
    const gm = [...this.seats.values()].find((s) => s.role === "gm");
    if (!gm) return "There is no GM seat to read the world through.";
    const raws = await gm.probe("characters");
    const seatOf = (raw) => Object.entries(store.characters).find(([, name]) => name === raw.name)?.[0] ?? null;
    const verdict = judgeCharacters(raws, { ownerOf: (raw) => this.seats.get(seatOf(raw))?.user ?? null, landingScene: landing });
    for (const f of verdict.failures) store.detectorFinding({ seat: seatOf(raws.find((r) => r.name === f.name)) ?? "table", name: "chargen-oracle", severity: f.sheetProblems ? "S0" : "S1", summary: `Character "${f.name}" is not what its picks say: ${f.problems.slice(0, 3).join("; ")}`, detail: f });
    const tokens = raws.map((r) => `${r.name}: tokens on ${r.tokens.map((t) => t.scene).join(", ") || "no scene"}`);
    const summary = verdict.ok ? "ALL CHARACTERS MATCH THEIR PICKS." : `${verdict.failures.length} CHARACTER(S) DO NOT MATCH.`;
    return [`${raws.length} character(s) in the world.`, ...verdict.lines, ...tokens, summary].join("\n");
  }

  loadAuthored() {
    if (this.authored) return this.authored;
    const episode = readJson(path.join(REPO, "data", "episodes", "episode-c1e1-mothers-maiden-name.json"));
    const refs = [...(episode.scenes ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((s) => s.briefRef).filter(Boolean);
    const briefs = refs.map((id) => readJson(path.join(REPO, "data", "scene-briefs", `${id}.json`)));
    const challenges = {};
    for (const file of readdirSync(path.join(REPO, "data", "challenges"))) if (file.endsWith(".json")) challenges[file.replace(/\.json$/, "")] = readJson(path.join(REPO, "data", "challenges", file));
    this.authored = { briefs, challenges, items: authoredItems(briefs, challenges), canaries: canaryStrings(briefs) };
    return this.authored;
  }

  /** A GM-only line that is on a player's screen, one finding per line, whichever seats show it (the key is the line, not the seat). */
  fileLeak(seatId, hit) {
    return this.store.detectorFinding({ seat: seatId, name: "leak", severity: "S0", summary: `GM-only text is visible on a player's screen: "${String(hit.canary).slice(0, 70)}"`, detail: hit, key: `detector:leak|${hit.canary}` });
  }

  async leak({ extra = [] } = {}) {
    const store = this.requireRun();
    const { canaries } = this.loadAuthored();
    const all = [...canaries, ...extra];
    const lines = [`Searching ${all.length} GM-only string(s) in every player seat.`];
    for (const seat of this.targetSeats(null).filter((s) => s.role === "player")) {
      const verdict = judgeLeaks(await seat.probe("leak", all));
      lines.push(`${seat.id}: ${verdict.summary}`);
      for (const hit of verdict.ui) this.fileLeak(seat.id, hit);
      if (!verdict.ui.length && verdict.severity) store.detectorFinding({ seat: seat.id, name: "leak", severity: verdict.severity, summary: verdict.summary, detail: { documents: verdict.documents.slice(0, 5) } });
    }
    return lines.join("\n");
  }

  /** The visible-text half of the leak scan on every player seat, quietly: what a poller runs. A page that is navigating is skipped. */
  async autoLeak() {
    if (!this.store) return;
    const { canaries } = this.loadAuthored();
    for (const seat of this.targetSeats(null).filter((s) => s.role === "player")) {
      let result;
      try {
        result = await seat.probe("leakUi", canaries);
      } catch {
        continue;
      }
      for (const hit of result?.ui ?? []) this.fileLeak(seat.id, hit);
    }
  }

  /** The detectors that can find a defect no one reports (boxes over controls, covered controls, off-screen controls, sideways scroll), quietly, on every seat. */
  async autoDetect() {
    if (!this.store) return;
    for (const seat of this.targetSeats(null)) {
      try {
        await this.detect({ seat: seat.id, names: ["clickthrough", "occlusion", "offscreen", "overflow-x"] });
      } catch {
        /* the page is navigating */
      }
    }
  }

  async coverage() {
    const store = this.requireRun();
    const { items } = this.loadAuthored();
    const gm = [...this.seats.values()].find((s) => s.role === "gm");
    const runs = gm ? await gm.page.evaluate(() => JSON.parse(JSON.stringify(game.settings.get("blank-inheritance", "runnerRuns") ?? {}))).catch(() => ({})) : {};
    const fromRuns = eventsFromRuns(runs);
    const events = [...fromRuns.events, ...eventsFromTape(store.dice, { briefOf: () => store.currentBrief })];
    const summary = summarize(applyEvents(items, events));
    summary.unread = fromRuns.unread;
    writeFileSync(path.join(this.runDir, "coverage.json"), `${JSON.stringify(summary, null, 2)}\n`);
    return summary;
  }

  async evalIn(id, code) {
    const seat = this.seats.get(id);
    if (!seat) return `No seat ${id}.`;
    const value = await seat.page.evaluate(code);
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    this.store?.recordAction({ seat: "ORCH", verb: "eval", args: `${id}: ${String(code).slice(0, 160)}`, ok: true, ms: 0, text: String(text).slice(0, 200) });
    return String(text ?? "undefined").slice(0, 20000);
  }

  async shots(label = "checkpoint") {
    const out = [];
    for (const seat of this.targetSeats(null)) {
      const p = await seat.evidenceShot(label);
      out.push(`${seat.id}: ${p ?? "failed"}`);
    }
    return out.join("\n");
  }

  addFinding(input, { seat = null } = {}) {
    const result = this.requireRun().addFinding(input, { channel: input.channel ?? "orchestrator", seat, scene: input.scene ?? this.store.currentBrief });
    return result.ok ? `Filed ${result.finding.id} (${result.finding.severity} ${result.finding.kind}).` : `Not filed: ${result.errors.join(" ")}`;
  }

  // --- bots ---------------------------------------------------------------------------------------------------------------------------
  async startBots() {
    const store = this.requireRun();
    const { runPlayerBot } = await import("../bots/player.mjs");
    this.abort = new AbortController();
    const started = [];
    for (const spec of this.roster.seats.filter((s) => s.brain === "bot")) {
      const seat = this.seats.get(spec.seat);
      if (!seat || seat.state !== "ready") continue;
      const promise = runPlayerBot({ seat, spec, signal: this.abort.signal, hub: this, log: (line) => store.say({ seat: "ORCH", kind: "private", text: `[bot ${spec.seat}] ${line}` }) }).catch((error) => {
        store.addFinding({ kind: "rig", severity: "S1", summary: `The bot at ${spec.seat} stopped: ${error.message.slice(0, 200)}`, evidence: ["actions.jsonl"] }, { channel: "orchestrator", seat: spec.seat });
      });
      this.bots.set(spec.seat, { done: promise });
      started.push(spec.seat);
    }
    return started.length ? `Bots started at ${started.join(", ")}.` : "No bot seats.";
  }

  /**
   * The GM walker (bots/gm-walker.mjs): the whole episode, or the scenes named, run by script through the Scene Runner, with the player
   * bots rolling and choosing in their own windows. Its findings go on the board under the "walker" channel; its full record is walk.json.
   */
  async startWalker({ episode = "episode-c1e1-mothers-maiden-name", scenes = [], rollDelayMs = 1500 } = {}) {
    const store = this.requireRun();
    if (this.walk && !this.walk.result && !this.walk.error) return "A walk is already under way: `pt walk status`.";
    const spec = this.roster.seats.find((s) => s.brain === "walker");
    if (!spec) return "This run has no walker seat: start one with `pt run start walk`.";
    const seat = this.seats.get(spec.seat);
    if (!seat || seat.state !== "ready") return `The walker's seat ${spec.seat} is not ready.`;
    // A table at walking pace: the player bots read a check for a moment, not thirty seconds.
    process.env.PT_BOT_ROLL_DELAY_MS = String(rollDelayMs);
    if (!this.bots.size) await this.startBots();
    const { buildWalkPlan } = await import("../core/walk-plan.mjs");
    const { runGmWalker } = await import("../bots/gm-walker.mjs");
    const data = (...p) => JSON.parse(readFileSync(path.join(REPO, "data", ...p), "utf8"));
    const ep = data("episodes", `${episode}.json`);
    const briefs = {};
    for (const s of ep.scenes ?? []) if (existsSync(path.join(REPO, "data", "scene-briefs", `${s.briefRef}.json`))) briefs[s.briefRef] = data("scene-briefs", `${s.briefRef}.json`);
    const plan = buildWalkPlan(ep, briefs, { scenes });
    const filed = new Set();
    const file = (f) => {
      if (filed.has(f.key)) return;
      filed.add(f.key);
      store.addFinding({ kind: f.kind, severity: f.severity, summary: f.summary, beat: f.beat, actual: JSON.stringify(f.detail ?? {}).slice(0, 700), evidence: ["walk.json"] }, { channel: "walker", seat: spec.seat, scene: f.scene });
    };
    const log = (line) => store.say({ seat: "ORCH", kind: "private", text: `[walker] ${line}` });
    this.walk = { startedAt: Date.now(), plan, result: null, error: null, progress: [] };
    const walk = this.walk;
    walk.done = runGmWalker({ seat, plan, signal: this.abort.signal, file, log: (line) => (walk.progress.push(line), log(line)) })
      .then((result) => {
        walk.result = result;
        writeFileSync(path.join(this.runDir, "walk.json"), JSON.stringify({ episode, scenes, ms: Date.now() - walk.startedAt, ...result }, null, 2));
        log(`WALK DONE in ${Math.round((Date.now() - walk.startedAt) / 60000)} min\n${result.summary}`);
      })
      .catch((error) => {
        walk.error = error.message;
        store.addFinding({ kind: "rig", severity: "S1", summary: `The GM walker stopped: ${error.message.slice(0, 200)}`, evidence: ["actions.jsonl"] }, { channel: "orchestrator", seat: spec.seat });
      });
    return `Walking ${plan.scenes.length} scene(s) of ${episode}${plan.missing.length ? ` (no brief shipped for ${plan.missing.join(", ")})` : ""}. \`pt walk status\` shows progress.`;
  }

  walkStatus() {
    if (!this.walk) return "No walk has been started in this run.";
    const mins = Math.round((Date.now() - this.walk.startedAt) / 60000);
    if (this.walk.error) return `The walk stopped after ${mins} min: ${this.walk.error}`;
    if (this.walk.result) return `Done.\n${this.walk.result.summary}\n${this.walk.result.findings.length} finding(s) filed.`;
    return `Walking, ${mins} min in, ${this.walk.progress.filter((l) => /^(walked|MISSED) /.test(l)).length}/${this.walk.plan.scenes.length} scenes done.\n${this.walk.progress.slice(-4).join("\n")}`;
  }

  // --- status for the control room ----------------------------------------------------------------------------------------------------------
  async status() {
    const store = this.store;
    if (Date.now() - this.foundryCache.at > 5000) this.foundryCache = { at: Date.now(), value: await foundryStatus() };
    const seats = [...this.seats.values()].map((s) => {
      const peek = this.peeks.get(s.id);
      const spec = s.spec;
      return { id: s.id, user: s.user, role: s.role, persona: spec.persona ?? null, brain: spec.brain, bot: spec.bot ?? null, state: s.state, profile: s.profile, character: store?.characters?.[s.id] ?? null, scene: peek?.scene?.name ?? null, ready: Boolean(peek?.ready), actions: store?.counters.bySeat[s.id] ?? 0, errors: store ? store.ring.filter((e) => e.seat === s.id && e.severity && !e.noise).length : 0 };
    });
    return {
      now: iso(),
      run: store ? { name: store.run, seed: store.seed, startedAt: this.startedAt, paused: store.paused, brief: store.currentBrief } : null,
      foundry: this.foundryCache.value,
      seats,
      findings: store ? { tally: store.tally(), recent: store.findings.slice(-8).reverse() } : null,
      table: store ? store.table.slice(-14) : [],
      events: store ? store.ring.filter((e) => e.severity && !e.noise).slice(-14).reverse() : [],
      counters: store ? store.counters : null,
      dice: store ? summarizeTape(store.dice) : null
    };
  }
}
