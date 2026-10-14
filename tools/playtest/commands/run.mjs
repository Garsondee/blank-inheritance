/**
 * pt run <start|stop|status|roster> [kind] [--name N] [--seed S]
 *
 *   start <kind>   seat a table: kind is shakedown | main | full | bots | walk (core/roster.mjs). Needs the hub (the app's playtest-hub preview)
 *                  and the playtest Foundry running with its provisioned world.
 *   stop           close every seat and the browser, and write the run's summary
 *   status         the board: seats, brains, characters, findings, latest events
 *   roster <kind>  print the roster a kind would seat, and run nothing
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { parseArgs } from "../core/args.mjs";
import { VALUED_FLAGS } from "../core/verbs.mjs";
import { buildRoster, brainCounts, validateRoster } from "../core/roster.mjs";
import { callOrch } from "../client.mjs";
import { PT_DIR } from "../paths.mjs";

export async function run(argv) {
  const { flags, positionals } = parseArgs(argv, { valued: VALUED_FLAGS });
  const [sub = "status", kind] = positionals;
  if (sub === "roster") {
    const personas = JSON.parse(readFileSync(path.join(PT_DIR, "personas", "personas.json"), "utf8"));
    const roster = buildRoster(kind ?? "main", personas, { run: "preview" });
    const checked = validateRoster(roster, { personas });
    console.log(JSON.stringify(roster, null, 2));
    const counts = brainCounts(roster);
    console.error(`${counts.agent} agent seat(s), ${counts.bot} bot seat(s), ${counts.idle} idle${counts.walker ? `, a scripted GM (the walker)` : ""}.${checked.ok ? "" : ` NOT VALID: ${checked.errors.join("; ")}`}${checked.warnings.length ? ` Warnings: ${checked.warnings.join("; ")}` : ""}`);
    return checked.ok ? 0 : 1;
  }
  const op = { start: "run/start", stop: "run/stop", status: "status" }[sub];
  if (!op) {
    console.log("usage: pt run <start <kind>|stop|status|roster <kind>> [--name N] [--seed S]");
    return 2;
  }
  const result = await callOrch(op, { positionals: sub === "start" ? [kind ?? "main"] : [], flags });
  console.log(result.text);
  return result.ok ? 0 : 1;
}
