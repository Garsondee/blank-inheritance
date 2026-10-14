/**
 * The brief an agent is handed for its seat. Pure: the files it assembles from are read by the caller (commands/brief.mjs).
 *
 * A brief is in four parts, always in this order: who you are and what you are doing (the persona), the rules of this table (the same
 * for every seat: what you may touch, how to speak, how to report), the commands you have (generated from the verb table so it cannot
 * drift), and what is specific to this run (your seat, your command prefix with its token, your own notes from earlier play).
 * Nothing else about the campaign is in it: an agent knows only what its person would, and a player does not know the story.
 */

import { verbReference } from "./verbs.mjs";

/** The command prefix an agent types, for its seat: `node tools/playtest/pt.mjs --as P2:abcd1234`. */
export const commandPrefix = (seat, token) => `node tools/playtest/pt.mjs --as ${seat}:${token}`;

/**
 * @param {object} p
 * @param {string} p.seat           "P2"
 * @param {string} p.role           "gm" | "player"
 * @param {string} p.token
 * @param {string} p.personaText    the persona's own brief (personas/<id>.md)
 * @param {string} p.rulesText      the rules every seat shares (personas/_rules.md)
 * @param {object} p.run            { name, build, seat user, table: { players: n } }
 * @param {string} [p.memoryText]   this seat's own notes so far
 * @param {string} [p.stretch]      what this stretch of play is ("Induction", "Act 1: scenes 0 to 4")
 */
export function assembleBrief({ seat, role, token, personaText, rulesText, run, memoryText = "", stretch = "" }) {
  const prefix = commandPrefix(seat, token);
  const parts = [];
  parts.push(`# You are at seat ${seat} of a playtest table${stretch ? `: ${stretch}` : ""}`);
  parts.push(personaText.trim());
  parts.push("## The rules of this table\n" + rulesText.trim());
  parts.push(
    `## Your commands\nEvery command is run with the Bash tool, and ALWAYS starts with this exact prefix (it is how the table knows it is you):\n\n    ${prefix} <verb> ...\n\nFor example: \`${prefix} look\`, then \`${prefix} click r12\`.\n\n${verbReference(role)}`
  );
  const facts = [`- Your seat: ${seat} (${role === "gm" ? "the GM" : "a player"}), logged in as "${run.user}".`, `- The table: the GM and ${run.players} players.`, `- Run: ${run.name}.`];
  parts.push(`## This run\n${facts.join("\n")}`);
  if (memoryText.trim()) parts.push(`## Your notes so far\n${memoryText.trim()}`);
  return parts.join("\n\n") + "\n";
}
