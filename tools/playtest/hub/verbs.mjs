/**
 * The seat verbs, carried out. One function per verb, each taking the seat that called it and returning { ok, text, data }. The hub
 * wraps every call (who may call it, whether play is paused, the audit trail), so nothing here checks identity.
 *
 * What an agent gets back is always TEXT written for a reader without eyes on the screen, and always says what happened, including
 * "nothing changed". The verbs that touch the page are the Seat's (browser/seat.mjs); the ones that touch the table, the notes and the
 * findings are the store's. No verb reads the game's data, runs code in the page, or reads a file the rig did not make for the seat.
 */

import { existsSync, readdirSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { readFor, renderMany, KINDS } from "../core/table.mjs";
import { KINDS as FINDING_KINDS } from "../core/findings.mjs";
import { PT_DIR } from "../paths.mjs";

export const ASSETS_DIR = path.join(PT_DIR, "assets");

const list = (value) => (value === undefined || value === true ? [] : Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim()).filter(Boolean));
const words = (positionals) => positionals.join(" ").trim();
const num = (v, fallback) => (v === undefined || v === true || Number.isNaN(Number(v)) ? fallback : Number(v));
const ok = (text, data) => ({ ok: true, text, ...(data === undefined ? {} : { data }) });
const fail = (text) => ({ ok: false, text });

export function listAssets() {
  return existsSync(ASSETS_DIR) ? readdirSync(ASSETS_DIR).filter((n) => /\.(png|jpe?g|webp|gif|txt|svg)$/i.test(n)).sort() : [];
}

/** Read the open beat's read-aloud text out of the Runner, in the page. */
const READ_ALOUD = `(() => {
  const visible = (el) => el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
  const all = [...document.querySelectorAll(".bi-runner__read")].filter(visible);
  if (!all.length) return null;
  const now = all.find((el) => el.closest('[aria-current="step"]')) || all[0];
  const li = now.closest("[data-beat-id]");
  return { text: now.innerText.replace(/\\s+\\n/g, "\\n").trim(), beat: li ? li.dataset.beatId : null };
})()`;

export async function runSeatVerb(hub, seat, verb, { positionals = [], flags = {} } = {}) {
  const store = hub.store;
  switch (verb) {
    case "look": {
      const result = await seat.look({ all: Boolean(flags.all), find: typeof flags.find === "string" ? flags.find : null, window: typeof flags.window === "string" ? flags.window : null, maxText: flags.chars ? num(flags.chars, 1400) : undefined });
      if (result.ok && result.data?.character) store.characters[seat.id] = result.data.character;
      if (result.ok && result.text.length > 14000) result.text = `${result.text.slice(0, 14000)}\n(… the view was cut at 14000 characters; use look --find "<words>" or look --window "<title>" to narrow it)`;
      return result;
    }
    case "shot":
      return seat.shot({ scale: Math.min(1, Math.max(0.2, num(flags.scale, 0.6))), region: typeof flags.region === "string" ? flags.region.split(",").map(Number) : null, label: "look" });
    case "click":
      return seat.click(words(positionals), { button: flags.right ? "right" : "left", double: Boolean(flags.double) });
    case "type":
      return seat.type(words(positionals), { into: typeof flags.into === "string" ? flags.into : null, clear: Boolean(flags.clear), enter: Boolean(flags.enter) });
    case "key":
      return seat.key(words(positionals), { repeat: num(flags.repeat, 1) });
    case "scroll": {
      const dirs = ["up", "down", "left", "right"];
      const at = positionals.findIndex((p) => dirs.includes(String(p).toLowerCase()));
      const direction = at >= 0 ? String(positionals[at]).toLowerCase() : "down";
      const target = at > 0 ? positionals.slice(0, at).join(" ") : null;
      const amount = at >= 0 && positionals[at + 1] !== undefined ? num(positionals[at + 1], 3) : 3;
      return seat.scroll(target, direction, amount);
    }
    case "drag":
      return positionals.length >= 2 ? seat.drag(positionals[0], positionals[1]) : fail("drag needs two places: drag <from> <to>");
    case "upload": {
      if (flags.list) return ok(`Test files you may choose: ${listAssets().join(", ") || "(none yet)"}`);
      const [target, name] = positionals;
      if (!target || !name) return fail("upload needs a file input and a test file: upload <ref> <file>. `upload --list` shows the files.");
      if (!/^[a-z0-9._-]+$/i.test(name) || !listAssets().includes(name)) return fail(`"${name}" is not one of the rig's test files. Choose from: ${listAssets().join(", ") || "(none)"}`);
      return seat.upload(target, path.join(ASSETS_DIR, name));
    }
    case "wait":
      return seat.wait({ ms: num(flags.ms, 0), text: typeof flags.text === "string" ? flags.text : null, gone: typeof flags.gone === "string" ? flags.gone : null, timeout: num(flags.timeout, 15000) });
    case "reload":
      return seat.reload();
    case "say":
    case "do": {
      const text = words(positionals);
      const to = list(flags.to);
      const result = store.say({ seat: seat.id, kind: verb === "do" ? "do" : to.length ? "whisper" : "say", text, to: to.length ? to : null });
      return result.ok ? ok(`Said at the table (entry ${result.entry.n}).`) : fail(result.error);
    }
    case "read": {
      const since = flags.since !== undefined ? num(flags.since, 0) : flags.all ? 0 : store.lastRead[seat.id] ?? 0;
      const { entries, skipped, last } = readFor(store.table, seat.id, { since, limit: num(flags.limit, flags.all ? 25 : 60) });
      store.lastRead[seat.id] = Math.max(store.lastRead[seat.id] ?? 0, last);
      if (!entries.length) return ok(`Nothing new has been said at the table (last entry ${last}).`);
      return ok(`${skipped ? `(${skipped} older entries not shown)\n` : ""}${renderMany(entries)}\n(last entry ${last})`);
    }
    case "note": {
      const summary = words(positionals);
      if (typeof flags.kind !== "string" || typeof flags.severity !== "string") return fail(`A note needs --kind (${FINDING_KINDS.join(", ")}) and --severity (S0 stops play, S1 wrong or missing information or a workaround, S2 friction or confusion, S3 polish).`);
      const shot = await seat.evidenceShot("note");
      const trail = seat.save(`${Date.now()}-trail.json`, store.trail(seat.id, 8));
      const rel = (p) => (p ? path.relative(hub.runDir, p).split(path.sep).join("/") : null);
      const result = store.addFinding(
        { kind: flags.kind, severity: flags.severity, summary, expected: flags.expected, actual: flags.actual, repro: flags.repro, evidence: list(flags.evidence), ref: typeof flags.ref === "string" ? flags.ref : null },
        { channel: "agent", seat: seat.id, scene: store.currentBrief ?? seat.lastLook?.meta?.scene?.name ?? null, autoEvidence: [rel(shot), rel(trail)].filter(Boolean) }
      );
      return result.ok ? ok(`Filed ${result.finding.id} (${result.finding.severity} ${result.finding.kind}). A screenshot and your last actions are attached. Carry on with the game.`) : fail(result.errors.join(" "));
    }
    case "memory": {
      const file = path.join(hub.runDir, "seats", seat.id, "memory.md");
      mkdirSync(path.dirname(file), { recursive: true });
      if (typeof flags.add === "string" && flags.add.trim()) {
        appendFileSync(file, `- ${flags.add.trim()}\n`);
        return ok("Noted.");
      }
      return ok(existsSync(file) ? readFileSync(file, "utf8") || "(nothing yet)" : "(nothing yet)");
    }
    case "who":
      return ok(`You are seat ${seat.id}, logged in as "${seat.user}" (${seat.role === "gm" ? "the GM" : "a player"}${store.characters[seat.id] ? `, playing ${store.characters[seat.id]}` : ""}). Play is ${store.paused ? `PAUSED: ${store.paused}` : "running"}. The table has ${store.table.length} entries.`);
    case "improv": {
      const what = words(positionals);
      if (!what) return fail('Say what you had to invent: improv "what I made up" --why "what the scene lacked".');
      const entry = store.addImprov({ seat: seat.id, scene: store.currentBrief, beat: typeof flags.beat === "string" ? flags.beat : null, what, why: typeof flags.why === "string" ? flags.why : "" });
      store.say({ seat: seat.id, kind: "private", text: `IMPROV${entry.beat ? ` on ${entry.beat}` : ""}: ${what}${entry.why ? ` (the scene lacked: ${entry.why})` : ""}` });
      return ok("Logged. (The players do not see this.)");
    }
    case "read-aloud": {
      const found = await seat.page.evaluate(READ_ALOUD).catch(() => null);
      if (!found?.text) return fail("No read-aloud is open on the Runner. Open the beat (press its line) so its read-aloud shows, then try again.");
      const result = store.say({ seat: seat.id, kind: "gm", text: found.text, meta: { beat: found.beat, verbatim: true } });
      return result.ok ? ok(`Posted to the table, verbatim${found.beat ? ` (beat ${found.beat})` : ""}:\n${found.text}`) : fail(result.error);
    }
    default:
      return fail(`There is no verb "${verb}".`);
  }
}

export { KINDS };
