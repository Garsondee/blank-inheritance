/**
 * A run's memory: everything the hub knows, in memory for speed and on disk for the record (design/playtest-process.md, section 6).
 *
 *   table.jsonl        what was said at the table (core/table.mjs decides who may read what)
 *   findings.jsonl     every finding, rewritten whole when one changes (the file is small, and the report reads it)
 *   actions.jsonl      every seat verb: when, who, what, how long, whether it worked. The audit trail behind every finding
 *   improv.jsonl       each time the GM invented what the material lacked
 *   dice.jsonl         every d20 any seat rolled, with whether it was forced
 *   seats/<id>/        telemetry.jsonl, memory.md, evidence/
 *
 * Events from the seats arrive here classified and stamped (core/telemetry.mjs). The ones that mean something become findings, once
 * per distinct cause with an occurrence count, so a console error repeating a thousand times is one finding, not a thousand.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { classify, normalizeMessage } from "../core/telemetry.mjs";
import { makeEntry } from "../core/table.mjs";
import { makeFinding, nextId, tally } from "../core/findings.mjs";

const iso = () => new Date().toISOString();
const readJsonl = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);

/** What an auto-finding is called, by what the event was. */
const AUTO = {
  "page-error": { kind: "bug", say: "A script error on the page" },
  "unhandled-rejection": { kind: "bug", say: "An unhandled promise rejection" },
  "console-error": { kind: "bug", say: "A console error" },
  "missing-asset": { kind: "bug", say: "A file the page asked for is missing" },
  "network-error": { kind: "bug", say: "A request failed" },
  "server-error": { kind: "bug", say: "The server answered with an error" },
  "notification-error": { kind: "bug", say: "The game showed an error notice" },
  "dead-click": { kind: "ux-friction", say: "A press changed nothing" },
  "socket-closed": { kind: "sync", say: "The connection to the server dropped" },
  "long-task": { kind: "perf", say: "The page froze for a moment" },
  "browser-dialog": { kind: "ux-friction", say: "A browser dialog interrupted" }
};

export class RunStore {
  constructor({ dir, run, seed = null }) {
    this.dir = dir;
    this.run = run;
    this.seed = seed;
    mkdirSync(path.join(dir, "seats"), { recursive: true });
    this.file = (name) => path.join(dir, name);
    this.table = readJsonl(this.file("table.jsonl"));
    this.findings = readJsonl(this.file("findings.jsonl"));
    this.actions = readJsonl(this.file("actions.jsonl"));
    this.improv = readJsonl(this.file("improv.jsonl"));
    this.dice = readJsonl(this.file("dice.jsonl"));
    this.ring = [];
    this.listeners = new Set();
    this.counters = { events: {}, bySeat: {} };
    this.lastAction = new Map();
    this.lastRead = {};
    this.characters = {};
    this.autoIndex = new Map();
    this.paused = null;
    this.currentBrief = null;
    this.actionSeq = this.actions.length;
  }

  // --- fan-out to the control room ------------------------------------------------------------------------------------------
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify(kind, payload = {}) {
    for (const l of this.listeners) {
      try {
        l({ kind, ...payload });
      } catch {
        /* a dead listener never stops the run */
      }
    }
  }
  append(name, obj) {
    appendFileSync(this.file(name), `${JSON.stringify(obj)}\n`);
  }

  // --- the table ---------------------------------------------------------------------------------------------------------------
  say({ seat, kind, text, to = null, meta = null }) {
    const result = makeEntry({ seat, kind, text, to, who: this.characters[seat] ?? seat, meta }, { n: this.table.length + 1, now: iso() });
    if (!result.ok) return result;
    this.table.push(result.entry);
    this.append("table.jsonl", result.entry);
    this.notify("table", { entry: result.entry });
    return result;
  }

  // --- actions -----------------------------------------------------------------------------------------------------------------
  recordAction({ seat, verb, args, ok, ms, text }) {
    const action = { id: `a${++this.actionSeq}`, t: Date.now(), at: iso(), seat, verb, args: String(args ?? "").slice(0, 400), ok, ms, result: String(text ?? "").slice(0, 300) };
    this.actions.push(action);
    this.append("actions.jsonl", action);
    this.lastAction.set(seat, action);
    this.counters.bySeat[seat] = (this.counters.bySeat[seat] ?? 0) + 1;
    return action;
  }
  trail(seat, n = 8) {
    return this.actions.filter((a) => a.seat === seat).slice(-n);
  }

  // --- findings ----------------------------------------------------------------------------------------------------------------
  addFinding(input, ctx) {
    const result = makeFinding(input, { id: nextId(this.findings), run: this.run, now: iso(), ...ctx });
    if (!result.ok) return result;
    this.findings.push(result.finding);
    this.append("findings.jsonl", result.finding);
    this.notify("finding", { finding: result.finding });
    return result;
  }
  /** Rewrite the findings file whole (used when an occurrence count or a lock changes). */
  flushFindings() {
    writeFileSync(this.file("findings.jsonl"), this.findings.map((f) => JSON.stringify(f)).join("\n") + (this.findings.length ? "\n" : ""));
  }
  tally() {
    return tally(this.findings);
  }

  addImprov(entry) {
    const full = { t: iso(), ...entry };
    this.improv.push(full);
    this.append("improv.jsonl", full);
    this.notify("improv", { entry: full });
    return full;
  }

  recordDice(entry) {
    this.dice.push(entry);
    this.append("dice.jsonl", entry);
    this.notify("dice", { entry });
  }

  // --- telemetry -----------------------------------------------------------------------------------------------------------------
  /**
   * An event from a seat. Classified, stamped with the action it followed, kept, counted, and (when it means something) filed as a
   * finding once per distinct cause. Returns the classification.
   */
  event(seat, raw) {
    const c = classify(raw);
    const action = this.lastAction.get(seat);
    const after = action && raw.t >= action.t && raw.t - action.t <= 3000 ? { action: action.id, verb: action.verb, ms: raw.t - action.t } : null;
    const ev = { ...raw, seat, category: c.category, severity: c.severity, noise: c.noise, ...(after ? { after } : {}) };
    const seatDir = path.join(this.dir, "seats", seat);
    mkdirSync(seatDir, { recursive: true });
    appendFileSync(path.join(seatDir, "telemetry.jsonl"), `${JSON.stringify(ev)}\n`);
    this.counters.events[c.category] = (this.counters.events[c.category] ?? 0) + 1;
    this.ring.push(ev);
    if (this.ring.length > 400) this.ring.splice(0, 100);
    this.notify("event", { event: ev });
    if (c.severity && !c.noise && AUTO[c.category] && ["S0", "S1", "S2"].includes(c.severity)) this.autoFile(seat, ev, c, AUTO[c.category]);
    return c;
  }

  autoFile(seat, ev, c, auto) {
    const text = String(ev.text ?? ev.message ?? ev.url ?? ev.label ?? "").trim();
    const signature = `${c.category}|${normalizeMessage(text)}`;
    const known = this.autoIndex.get(signature);
    if (known) {
      known.finding.occurrences = (known.finding.occurrences ?? 1) + 1;
      known.seats.add(seat);
      known.finding.seats = [...known.seats].sort();
      this.dirty = true;
      return;
    }
    const after = ev.after ? ` (${ev.after.ms} ms after ${seat} ${ev.after.verb})` : "";
    const result = this.addFinding(
      {
        kind: auto.kind,
        severity: c.severity,
        summary: `${auto.say}: ${text.slice(0, 200)}${after}`,
        actual: text.slice(0, 600),
        evidence: [`seats/${seat}/telemetry.jsonl`, ...(ev.url ? [ev.url] : [])],
        repro: ev.after ? [`${seat} ran: ${this.actions.find((a) => a.id === ev.after.action)?.args || ev.after.verb}`] : []
      },
      { channel: "instrument", seat, scene: this.currentBrief }
    );
    if (result.ok) {
      result.finding.occurrences = 1;
      result.finding.seats = [seat];
      this.autoIndex.set(signature, { finding: result.finding, seats: new Set([seat]) });
    }
  }

  /** File an instrument finding from a detector hit, once per distinct hit. */
  detectorFinding({ seat, name, severity, summary, detail, scene = null, key = null }) {
    const signature = key ?? `detector:${name}|${seat}|${normalizeMessage(summary)}`;
    if (this.autoIndex.has(signature)) {
      const known = this.autoIndex.get(signature);
      known.finding.occurrences = (known.finding.occurrences ?? 1) + 1;
      known.seats.add(seat);
      known.finding.seats = [...known.seats].sort();
      this.dirty = true;
      return null;
    }
    const result = this.addFinding({ kind: name === "leak" ? "leak" : name === "convergence" ? "sync" : "bug", severity, summary, actual: JSON.stringify(detail).slice(0, 700), evidence: [`seats/${seat}/evidence`, `detector:${name}`] }, { channel: "instrument", seat, scene: scene ?? this.currentBrief });
    if (result.ok) {
      result.finding.occurrences = 1;
      result.finding.seats = [seat];
      this.autoIndex.set(signature, { finding: result.finding, seats: new Set([seat]) });
      return result.finding;
    }
    return null;
  }

  flushIfDirty() {
    if (this.dirty) {
      this.flushFindings();
      this.dirty = false;
    }
  }
}
