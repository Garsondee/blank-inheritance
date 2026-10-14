/**
 * What an NPC's Actor sheet says about the person -- the pure half (D080).
 *
 * Until 2026-10-07 an NPC file's `description` (up to 15 KB of old story prose) was written into the Actor's blurb and
 * public notes. That prose was imported into canon item by item (D073 to D076), so it was a stale second home of the story.
 * Ingram's ruling (D080): "what an Actor sheet shows is the person's ink facts, with their open decisions flagged, built from
 * canon; the old prose is stripped."
 *
 * Where each part comes from:
 *   - the BLURB is one line built from the NPC file's own `role` and `affiliation` (npcBlurb): a job title, never story.
 *   - the PUBLIC notes are that blurb and nothing else. A player may be able to see them, so no fact ever goes there.
 *   - the PRIVATE notes (GM only) are the generated entry for the person (data/campaign/actor-notes.json, made by
 *     `node tools/story/story.mjs build` from canon/world/): the facts canon has settled, split into what the table is told and
 *     what is held back, then the person's open decisions flagged "not decided yet", then a count of the pencil facts left out.
 *     Pencil (sketch) facts are never written out: play material never cites pencil until Ingram inks it, and an Actor sheet is play
 *     material.
 *
 * Pure: no Foundry globals, no I/O (design/testing-strategy.md §1). The entry is built by tools/story/actor-notes.mjs; the Actor
 * generator (generators/npc.mjs) calls sheetNotes; foundry/sync.mjs fetches the file and passes each person's entry through.
 *
 * Only tags Foundry's server keeps are written (p, ul, li, strong, em, h3): it cleans every HTML field and silently drops the
 * rest, and test/tier3-actor-notes-contract.test.mjs checks the rendered notes against the allowlist in Foundry's own source.
 */

/** The canon statuses whose facts an Actor sheet shows: Ingram's decisions and the Episode One material her scenes already say. */
export const SETTLED_STATUSES = Object.freeze(["decided", "accepted", "provisional", "proposal"]);

const KNOWN_WORDS = Object.freeze({ everyone: "Known by everyone", some: "Known by some", few: "Known by few", nobody: "Known by nobody" });
const STATUS_TAGS = Object.freeze({ provisional: "provisional", proposal: "proposed" });

/** Said once at the top of the private notes, because the sync rewrites them whenever canon changes. */
export const GENERATED_NOTE = "Generated from canon when the world syncs. Change the story on the plot timeline, not here: this text is rewritten when canon changes.";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** A role that has left its job title for the story: from "GM-ONLY" on, from a second sentence on, from a second assertion (", and ...") on. */
const GM_ONLY_TAIL = /\s*(?:--|—|–|[;,:(])?\s*GM[- ]?ONLY\b[\s\S]*$/i;
const FIRST_SENTENCE = /^(.+?(?<!\b(?:Mr|Mrs|Ms|Dr|St|No|Mt))[.!?])(?=\s+[A-Z"'(]|$)/;
const SECOND_ASSERTION = /,\s+and\s[\s\S]*$/i;

/**
 * The public part of a `role`: its first sentence, its first clause when a second assertion follows (", and ..."), and nothing
 * from a "GM-ONLY" marker on. A role is a job title, but a few were written with the story after it ("Clerk. The secret author
 * of ...", "Clerk -- GM-ONLY: ...", "Clerk, and sends the party on to ..."), and the blurb is shown on the sheet's public side.
 * Cutting is deliberately lossy: a shorter title is still a title, a leaked plot point is not.
 */
export function publicRole(role) {
  let text = String(role ?? "").replace(/\s+/g, " ").trim();
  text = text.replace(GM_ONLY_TAIL, "");
  const sentence = text.match(FIRST_SENTENCE);
  if (sentence) text = sentence[1];
  text = text.replace(SECOND_ASSERTION, "");
  return text.replace(/[\s.,;:-]+$/, "").trim();
}

/** A faction id as a label: "directorate" -> "Directorate". */
export function affiliationLabel(id) {
  return String(id ?? "")
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The one line under an Actor's name: the public part of the role, with the faction after it unless the role says it already.
 * Empty when the source has no role (a basic figure made for a stage card). Built from the NPC file's own fields, so it can be
 * made without canon and holds no story.
 */
export function npcBlurb(source) {
  const role = publicRole(source?.role);
  if (!role) return "";
  const affiliation = affiliationLabel(source?.affiliation);
  if (!affiliation || role.toLowerCase().includes(affiliation.toLowerCase())) return role;
  return `${role} (${affiliation})`;
}

function told(fact) {
  if (fact.told === "start") return "told from the start";
  if (!fact.told || fact.told === "later") return "told later";
  return `told in ${fact.toldAt || String(fact.told).replace(/^in:/, "")}`;
}

function settledLine(fact) {
  const bits = [];
  if (fact.heldBy) bits.push(`Belief of ${fact.heldBy}${fact.true ? `, true: ${fact.true}` : ""}`);
  bits.push(KNOWN_WORDS[fact.known] || (fact.known ? `Known: ${fact.known}` : "Known by nobody"));
  bits.push(told(fact));
  if (STATUS_TAGS[fact.status]) bits.push(STATUS_TAGS[fact.status]);
  return `<li>${escapeHtml(fact.text)} <em>${escapeHtml(bits.join(" · "))}</em></li>`;
}

function openLine(fact) {
  const bits = [];
  const candidates = Array.isArray(fact.candidates) ? fact.candidates.filter(Boolean) : [];
  if (candidates.length) bits.push(`Candidates: ${candidates.join(" | ")}.`);
  if (fact.decideBy) bits.push(`Decide by: ${fact.decideBy}.`);
  return `<li>${escapeHtml(fact.text)}${bits.length ? ` <em>${escapeHtml(bits.join(" "))}</em>` : ""}</li>`;
}

const list = (lines) => `<ul>\n${lines.join("\n")}\n</ul>`;

/**
 * The GM-only notes for a person: what the table is told, what is held back, what is not decided yet, and how much pencil is left
 * out. "" when canon has nothing to say about them (no entity, or an entity with no settled fact, no open decision and no pencil).
 *
 * @param {{settled?: object[], open?: object[], sketched?: number}|null} entry  one person's entry in actor-notes.json
 */
export function renderPrivateNotes(entry) {
  if (!entry) return "";
  const settled = Array.isArray(entry.settled) ? entry.settled : [];
  const open = Array.isArray(entry.open) ? entry.open : [];
  const sketched = Number.isInteger(entry.sketched) && entry.sketched > 0 ? entry.sketched : 0;
  if (!settled.length && !open.length && !sketched) return "";

  const parts = [`<p><em>${escapeHtml(GENERATED_NOTE)}</em></p>`];
  const tableTold = settled.filter((fact) => !fact.heldBack);
  const heldBack = settled.filter((fact) => fact.heldBack);
  if (tableTold.length) parts.push("<h3>What the table is told</h3>", list(tableTold.map(settledLine)));
  if (heldBack.length) parts.push("<h3>Held back (GM only)</h3>", list(heldBack.map(settledLine)));
  if (open.length) parts.push("<h3>Not decided yet</h3>", list(open.map(openLine)));
  if (sketched) {
    const many = sketched !== 1;
    parts.push(`<p><em>${sketched} more ${many ? "facts are" : "fact is"} sketched in pencil on the plot timeline and ${many ? "are" : "is"} not shown here until ${many ? "they are" : "it is"} inked.</em></p>`);
  }
  return parts.join("\n");
}

/** The public notes: the blurb as a paragraph, and never a fact. "" without a blurb. */
export function renderPublicNotes(blurb) {
  const text = String(blurb ?? "").trim();
  return text ? `<p>${escapeHtml(text)}</p>` : "";
}

/**
 * The three sheet fields for one NPC. `entry` is the person's entry from actor-notes.json, or null when the file is missing or
 * does not list them: the Actor then carries its blurb only, built here from the source, which is the same line the entry holds.
 *
 * @returns {{blurb: string, publicNotes: string, privateNotes: string}}
 */
export function sheetNotes(source, entry = null) {
  const own = typeof entry?.blurb === "string" ? entry.blurb.replace(/\s+/g, " ").trim() : "";
  const blurb = own || npcBlurb(source);
  return { blurb, publicNotes: renderPublicNotes(blurb), privateNotes: renderPrivateNotes(entry) };
}
