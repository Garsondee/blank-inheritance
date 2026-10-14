// Writes cards into a world file (tools/story/cards.mjs says what a card is).
//
//   node tools/story/cards-write.mjs <spec.json> [--root dir]
//
// The spec is { "<entity>": [ { "title": "The revenge list", "members": ["manako.revenge-list", ...] }, ... ] }.
// Only the "## Cards" section at the end of the entity's file is written. The retention proof is built in: the text of the file
// before and after, with that section taken out, must be identical, so no fact (words, meta line, position) can change.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, ROOT } from "./lib.mjs";
import { resolveAlias } from "./merges.mjs";
import { CARDS_HEADING, checkCards, slugOf } from "./cards.mjs";

/** The file's text with its "## Cards" section removed (to the next "## " heading or the end), and the section's own lines. */
export function splitCards(lines) {
  const at = lines.findIndex((l) => l.trimEnd() === `## ${CARDS_HEADING}`);
  if (at < 0) return { rest: lines.slice(), section: [] };
  let end = lines.findIndex((l, i) => i > at && /^## /.test(l));
  if (end < 0) end = lines.length;
  return { rest: [...lines.slice(0, at), ...lines.slice(end)], section: lines.slice(at, end) };
}

/** The text of one "## Cards" section for these cards. */
export function cardsSection(cards) {
  const out = [`## ${CARDS_HEADING}`, ""];
  for (const c of cards) out.push(`### ${c.title}`, ...c.members.map((m) => `- ${m}`), "");
  return out;
}

/** The new file text for an entity with these cards, or throws when a card is wrong. `text` may use LF or CRLF. */
export function withCards(text, entity, cards, facts, resolve = (id) => id) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const { rest } = splitCards(lines);
  const shaped = cards.map((c) => ({ id: `${entity}/${slugOf(c.title)}`, title: String(c.title).trim(), members: c.members.map(String) }));
  const bad = checkCards(entity, shaped, facts, resolve).filter((p) => p.level === "error");
  if (bad.length) throw new Error(`${entity}: ${bad.map((p) => p.message).join("; ")}`);
  const unplaced = shaped.flatMap((c) => c.members).filter((m) => facts.get(resolve(m))?.status !== "sketch");
  if (unplaced.length) throw new Error(`${entity}: a card holds pencil only; not pencil: ${unplaced.join(", ")}`);
  while (rest.length && !rest[rest.length - 1].trim()) rest.pop();
  const next = shaped.length ? [...rest, "", ...cardsSection(shaped)] : [...rest, ""];
  while (next.length > 1 && !next[next.length - 1].trim() && !next[next.length - 2].trim()) next.pop();
  const out = next.join("\n");
  // The proof: with the section taken out, nothing else moved.
  const strip = (s) => splitCards(s.replace(/\r\n/g, "\n").split("\n")).rest.join("\n").replace(/\n+$/, "");
  if (strip(out) !== strip(text)) throw new Error(`${entity}: writing the cards would have changed something outside them`);
  return eol === "\r\n" ? out.replace(/\n/g, "\r\n") : out;
}

export function writeCards(root, spec) {
  const model = loadModel(root);
  const done = [];
  for (const [entity, cards] of Object.entries(spec)) {
    const e = model.world.find((w) => w.id === entity);
    if (!e) throw new Error(`no world file for ${entity}`);
    const file = path.join(root, "canon", "world", `${entity}.md`);
    const text = fs.readFileSync(file, "utf8");
    const next = withCards(text, entity, cards, new Map(e.facts.map((f) => [f.id, f])), (id) => resolveAlias(model.aliases, id));
    if (next !== text) { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, next); fs.renameSync(tmp, file); }
    done.push({ entity, cards: cards.length, facts: cards.reduce((n, c) => n + c.members.length, 0), changed: next !== text });
  }
  return done;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const rootAt = args.indexOf("--root");
  const root = rootAt >= 0 ? path.resolve(args[rootAt + 1]) : ROOT;
  const specFile = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--root");
  if (!specFile) { console.log("Usage: node tools/story/cards-write.mjs <spec.json> [--root dir]"); process.exit(1); }
  for (const r of writeCards(root, JSON.parse(fs.readFileSync(specFile, "utf8")))) console.log(`${r.entity}: ${r.cards} cards, ${r.facts} facts${r.changed ? "" : " (unchanged)"}`);
}
