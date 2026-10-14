/**
 * The CLI's side of the hub: send a seat verb or an orchestrator op, print what comes back. Deliberately light (fetch and the argument
 * parser, nothing else), because an agent starts this process for every single action.
 *
 * A seat is named by `--as P2:token` before the verb (or PT_AS in the environment). The orchestrator needs no `--as`: it reads the token
 * the hub wrote to .state/orch-token, and only the orchestrator-only verbs use it.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { parseArgs } from "./core/args.mjs";
import { ORCHESTRATOR_ONLY, SEAT_VERBS, VALUED_FLAGS } from "./core/verbs.mjs";
import { HUB_URL, STATE_DIR } from "./paths.mjs";

export function helpText(localNames) {
  return [
    "pt - the playtest rig",
    "",
    "A seat (an agent at the table) uses only these verbs, always as `node tools/playtest/pt.mjs --as <seat>:<token> <verb> ...`:",
    ...Object.values(SEAT_VERBS).map((v) => `  ${v.usage}`),
    "",
    `The operator's commands: ${localNames.join(", ")}, ${ORCHESTRATOR_ONLY.join(", ")}.`
  ].join("\n");
}

export const parseAs = (text) => {
  const i = String(text ?? "").indexOf(":");
  return i > 0 ? { seat: text.slice(0, i), token: text.slice(i + 1) } : null;
};

export const orchToken = () => {
  const file = path.join(STATE_DIR, "orch-token");
  return existsSync(file) ? readFileSync(file, "utf8").trim() : "";
};

async function post(route, body, headers = {}) {
  let response;
  try {
    response = await fetch(`${HUB_URL}${route}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
  } catch (error) {
    throw new Error(`The playtest hub is not answering at ${HUB_URL} (${error.cause?.code ?? error.message}). It is not running, or the run has not been started.`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, text: `The hub sent something that is not JSON (${response.status}): ${text.slice(0, 200)}` };
  }
}

/** The orchestrator's call, for the local commands that need the hub (run, brief). */
export async function callOrch(op, { positionals = [], flags = {}, json = {} } = {}) {
  return post(`/o/${op}`, { positionals, flags, json }, { "x-pt-orch": orchToken() });
}

/** A seat verb or an orchestrator-only verb, from the command line. Returns the exit code. */
export async function runVerb(command, argv) {
  const { flags, positionals } = parseArgs(argv, { valued: VALUED_FLAGS });
  const as = parseAs(process.env.PT_AS);
  let result;
  if (as && SEAT_VERBS[command]) {
    result = await post(`/v/${command}`, { seat: as.seat, token: as.token, positionals, flags });
  } else if (!as && ORCHESTRATOR_ONLY.includes(command)) {
    result = await callOrch(command, { positionals, flags });
  } else if (as) {
    console.log(`"${command}" is not one of your verbs. Your verbs: ${Object.keys(SEAT_VERBS).join(", ")}.`);
    return 2;
  } else if (SEAT_VERBS[command]) {
    console.log(`"${command}" is a seat verb: it needs \`--as <seat>:<token>\` before it (see the brief).`);
    return 2;
  } else {
    console.log(`Unknown command "${command}". Run \`pt help\`.`);
    return 2;
  }
  console.log(result.text ?? JSON.stringify(result));
  return result.ok ? 0 : 1;
}
