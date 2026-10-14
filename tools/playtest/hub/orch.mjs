/**
 * The orchestrator's door onto the hub: every operation only the person running the run may do (design/playtest-process.md, section 5).
 * A seat can never reach it: it needs the orchestrator token the hub writes to .state/orch-token, and the CLI sends it only for these
 * verbs. Each op takes { positionals, flags, json } and returns { ok, text, data? }.
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { REPO, PT_DIR } from "../paths.mjs";
import { buildRoster } from "../core/roster.mjs";
import { assembleBrief } from "../core/briefs.mjs";
import { parseDegree } from "../core/dice.mjs";
import { reclassify as reclassifyFinding } from "../core/findings.mjs";
import { formatFinding, formatFindings, formatStatus } from "./format.mjs";

const ok = (text, data) => ({ ok: true, text, ...(data === undefined ? {} : { data }) });
const fail = (text) => ({ ok: false, text });
const list = (v) => (v === undefined || v === true ? [] : Array.isArray(v) ? v : String(v).split(",").map((s) => s.trim()).filter(Boolean));
const num = (v, d) => (v === undefined || v === true || Number.isNaN(Number(v)) ? d : Number(v));

export function formatCoverage(c) {
  const row = (name, g) => `  ${name.padEnd(18)} ${g.seen}/${g.total}`;
  const lines = ["COVERAGE (what the material offers, against what this run did)", row("scenes entered", c.scenes), row("beats ticked", c.beats), row("mandatory beats", c.mandatoryBeats), row("check degrees", c.degrees), `  checks seen both ways ${c.checks.seenBothWays}/${c.checks.total}`, row("choice options", c.choices), row("handouts", c.handouts)];
  if (c.gaps.mandatoryBeats.length) lines.push(`  mandatory beats not ticked: ${c.gaps.mandatoryBeats.slice(0, 12).join(", ")}${c.gaps.mandatoryBeats.length > 12 ? ` (+${c.gaps.mandatoryBeats.length - 12})` : ""}`);
  if (c.unread?.length) lines.push(`  (run-state fields the ledger could not read: ${c.unread.slice(0, 4).join("; ")})`);
  return lines.join("\n");
}

const personaFile = (id) => path.join(PT_DIR, "personas", `${id}.md`);
const readText = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");

export async function orch(hub, op, { positionals = [], flags = {}, json = {} } = {}) {
  switch (op) {
    case "run/start": {
      const kind = json.kind ?? positionals[0] ?? flags.roster ?? "main";
      const run = json.name ?? (typeof flags.name === "string" ? flags.name : `${kind}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`);
      const seed = json.seed ?? (typeof flags.seed === "string" ? flags.seed : run);
      const roster = json.roster ?? buildRoster(kind, hub.personas, { run, seed });
      const r = await hub.startRun({ roster, name: run, seed });
      const lines = [`RUN ${r.name} started (build ${r.build ?? "unstamped"}).`, ...r.seats.map((s) => `  ${s.seat}: ${s.ok ? "in" : `FAILED ${s.error}`}`), "", "Control room: http://127.0.0.1:30177/", "Seat tokens are in the run folder (tokens.json); `pt brief <seat>` writes an agent's brief with its command prefix."];
      return ok(lines.join("\n"), { name: r.name });
    }
    case "run/stop": {
      const r = await hub.stopRun();
      return ok(r.stopped ? `Run stopped. ${JSON.stringify(r.summary.findings)}` : "No run was in progress.");
    }
    case "status": {
      const status = await hub.status();
      return ok(formatStatus(status), status);
    }
    case "pause":
      return ok(hub.pause(positionals.join(" ") || (typeof flags.reason === "string" ? flags.reason : undefined)));
    case "resume":
      return ok(hub.resume());
    case "table": {
      const kind = ["say", "gm", "ruling", "system", "whisper", "do", "ooc"].includes(positionals[0]) ? positionals[0] : "system";
      const text = ["say", "gm", "ruling", "system", "whisper", "do", "ooc"].includes(positionals[0]) ? positionals.slice(1).join(" ") : positionals.join(" ");
      return ok(hub.speak({ kind, text, to: list(flags.to).length ? list(flags.to) : null }));
    }
    case "dice": {
      const [sub = "status", ...rest] = positionals;
      if (sub === "arm") {
        const spec = { degree: flags.degree, natural: flags.natural, dc: flags.dc, count: num(flags.count, 1), scene: flags.scene ?? null, check: flags.check ?? null, prefer: flags.prefer ?? "plain", note: flags.note ?? "" };
        if (spec.degree !== undefined && parseDegree(spec.degree) === null) return fail(`Unknown degree "${spec.degree}" (crit-fail, fail, success, crit-success).`);
        return ok(await hub.diceArm({ seats: flags["all-players"] ? [] : rest, spec }));
      }
      if (sub === "clear") return ok(await hub.diceClear(rest[0] ?? null));
      if (sub === "seed") return ok(await hub.diceSeed(rest[0] === "off" ? null : rest[0]));
      if (sub === "summary") return ok(JSON.stringify(hub.diceSummary(), null, 2));
      if (sub === "tape") {
        const tape = hub.requireRun().dice.filter((e) => !rest[0] || e.seat === rest[0]).slice(-num(flags.limit, 25));
        return ok(tape.length ? tape.map((e) => `${e.seat} d20=${e.natural} ${e.modifier >= 0 ? "+" : ""}${e.modifier ?? "?"} = ${e.total ?? "?"} vs DC ${e.dc ?? "?"} -> ${e.degree === null || e.degree === undefined ? "?" : ["crit fail", "fail", "success", "crit success"][e.degree]}${e.forced ? "  [FORCED]" : ""}${e.check ? `  ${e.check}` : ""}`).join("\n") : "The tape is empty.");
      }
      return ok(await hub.diceStatus());
    }
    case "detect":
      return ok(await hub.detect({ seat: positionals[0] ?? null, names: flags.names ? list(flags.names) : null, strict: Boolean(flags.strict) }));
    case "probe": {
      const [sub = "convergence", id] = positionals;
      if (sub === "convergence") return ok(await hub.convergence());
      if (sub === "reload") return ok(await hub.reloadInvariance(id));
      if (sub === "leak") return ok(await hub.leak({ extra: list(flags.extra) }));
      if (sub === "characters") return ok(await hub.charactersCheck({ landing: typeof flags.landing === "string" ? flags.landing : null }));
      const seat = hub.seats.get(id);
      if (!seat) return fail(`probe ${sub} needs a seat (pt probe ${sub} P2).`);
      return ok(JSON.stringify(await seat.probe(sub), null, 1).slice(0, 18000));
    }
    case "coverage":
      return ok(formatCoverage(await hub.coverage()), await hub.coverage());
    case "findings": {
      const store = hub.requireRun();
      const [sub = "list"] = positionals;
      if (sub === "add") {
        const summary = positionals.slice(1).join(" ");
        return ok(hub.addFinding({ kind: flags.kind, severity: flags.severity, summary, expected: flags.expected, actual: flags.actual, repro: flags.repro, evidence: list(flags.evidence), ref: flags.ref, scene: flags.scene, beat: flags.beat, channel: flags.channel === "human" ? "human" : "orchestrator" }, { seat: typeof flags.seat === "string" ? flags.seat : null }));
      }
      if (sub === "lock") {
        const f = store.findings.find((x) => x.id === positionals[1]);
        if (!f) return fail(`No finding ${positionals[1]}.`);
        f.lock = positionals.slice(2).join(" ");
        store.flushFindings();
        return ok(`Lock set on ${f.id}.`);
      }
      if (sub === "reclassify") {
        const i = store.findings.findIndex((x) => x.id === positionals[1]);
        if (i < 0) return fail(`No finding ${positionals[1]}.`);
        const result = reclassifyFinding(store.findings[i], { kind: flags.kind, severity: flags.severity, reason: typeof flags.reason === "string" ? flags.reason : positionals.slice(2).join(" ") }, { now: new Date().toISOString() });
        if (!result.ok) return fail(`pt findings reclassify <id> --kind rig [--severity S3] --reason "why": ${result.errors.join("; ")}`);
        store.findings[i] = result.finding;
        store.flushFindings();
        store.notify("finding", { finding: result.finding });
        return ok(`${result.finding.id} is now ${result.finding.kind} ${result.finding.severity} (was ${result.finding.reclassified.at(-1).from.kind} ${result.finding.reclassified.at(-1).from.severity}): ${result.finding.reclassified.at(-1).reason}`);
      }
      let found = store.findings;
      for (const key of ["severity", "kind", "seat", "scene"]) if (typeof flags[key] === "string") found = found.filter((f) => String(f[key]) === flags[key]);
      if (sub === "show") {
        const f = store.findings.find((x) => x.id === positionals[1]);
        return f ? ok(JSON.stringify(f, null, 2)) : fail(`No finding ${positionals[1]}.`);
      }
      return ok(formatFindings(found, { limit: num(flags.limit, 60) }), found.map((f) => formatFinding(f)));
    }
    case "eval":
      return ok(await hub.evalIn(positionals[0], positionals.slice(1).join(" ") || String(flags.code ?? "")));
    case "shots":
      return ok(await hub.shots(typeof flags.label === "string" ? flags.label : "checkpoint"));
    case "bots":
      return ok(await hub.startBots());
    case "walk": {
      if (positionals[0] === "status") return ok(hub.walkStatus());
      const episode = typeof flags.episode === "string" ? flags.episode : undefined;
      return ok(await hub.startWalker({ ...(episode ? { episode } : {}), scenes: list(flags.scenes), rollDelayMs: num(flags["roll-delay"], 1500) }));
    }
    case "predict": {
      const store = hub.requireRun();
      const [scene, ...text] = positionals;
      if (!scene || !text.length) return fail('pt predict <scene> "what I expect to go wrong" (written BEFORE the scene is played)');
      appendFileSync(path.join(hub.runDir, "predictions.md"), `- [${new Date().toISOString()}] **${scene}**: ${text.join(" ")}\n`);
      store.say({ seat: "ORCH", kind: "private", text: `PREDICTION for ${scene}: ${text.join(" ")}` });
      return ok("Recorded before the scene.");
    }
    case "brief-seat": {
      hub.requireRun();
      const id = positionals[0];
      const spec = hub.roster.seats.find((s) => s.seat === id);
      if (!spec) return fail(`No seat ${id} in this run.`);
      const personaId = spec.persona ?? "gm";
      const memoryFile = path.join(hub.runDir, "seats", id, "memory.md");
      const text = assembleBrief({
        seat: id,
        role: spec.role,
        token: hub.tokens[id],
        personaText: readText(personaFile(personaId)) || `You are ${spec.user}.`,
        rulesText: readText(path.join(PT_DIR, "personas", spec.role === "gm" ? "_rules-gm.md" : "_rules.md")),
        run: { name: hub.store.run, user: spec.user, players: hub.roster.seats.filter((s) => s.role === "player").length },
        memoryText: existsSync(memoryFile) ? readFileSync(memoryFile, "utf8") : "",
        stretch: typeof flags.stretch === "string" ? flags.stretch : ""
      });
      return ok(text);
    }
    default:
      return fail(`There is no orchestrator op "${op}".`);
  }
}

export { REPO };
