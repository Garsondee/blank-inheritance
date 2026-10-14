/**
 * pt brief <seat> [--stretch "Induction"] [--out file]
 *
 * The brief an agent is handed for its seat: its persona, the rules of the table, the commands it has, and its own command prefix with
 * the seat's token. Needs a run in progress (the tokens are made when the run starts). The brief is what the orchestrator passes as the
 * agent's prompt; it contains nothing about the campaign.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseArgs } from "../core/args.mjs";
import { VALUED_FLAGS } from "../core/verbs.mjs";
import { callOrch } from "../client.mjs";

export async function run(argv) {
  const { flags, positionals } = parseArgs(argv, { valued: [...VALUED_FLAGS, "out"] });
  const seat = positionals[0];
  if (!seat) {
    console.log("usage: pt brief <seat> [--stretch \"...\"] [--out file]");
    return 2;
  }
  const result = await callOrch("brief-seat", { positionals: [seat], flags });
  if (!result.ok) {
    console.log(result.text);
    return 1;
  }
  if (typeof flags.out === "string") {
    mkdirSync(path.dirname(flags.out), { recursive: true });
    writeFileSync(flags.out, result.text);
    console.log(`Brief for ${seat} written to ${flags.out}`);
  } else {
    console.log(result.text);
  }
  return 0;
}
