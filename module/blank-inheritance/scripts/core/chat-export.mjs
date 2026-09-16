/**
 * Turning one raw Foundry ChatMessage into a normalized, harvestable record
 * — the pure half. design/harvest-inference.md's three signals all come
 * from this shape: rolls[] + the sf2e check-outcome flags is Tier 1
 * material, contentLinks[] is Tier 3 material, and plain text is what a
 * human (Ingram, or later re-reading) actually reads.
 *
 * Pure, no Foundry globals: this file receives already-serialized message
 * data (foundry/chat-export.mjs reads the live ChatMessage documents and
 * hands their plain data over), never a Document instance.
 */

/**
 * Strips HTML down to plain text. A small regex pass, not a real parser —
 * this project's own house style for this exact tradeoff (see
 * core/generators/journal.mjs's escapeHtml, the same direction reversed):
 * chat content is almost always simple inline markup (a @Check enricher's
 * rendered link, a <p>, a <strong>), never a document needing real DOM
 * semantics to read correctly as text.
 */
export function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    // Every common block-level closing tag implies a line break when read
    // as plain text -- found live: foundry/induction-terminal.mjs's own
    // intake-answers message uses <h3>...</h3><pre>...</pre> with no <p>
    // between them, and only handling </p> ran the heading straight into
    // the first line of the block that followed it with no separator at all.
    .replace(/<\/(p|h[1-6]|div|li|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/**
 * Tier 3 material: every @UUID[...]/@Actor[...]/@Item[...] enricher
 * reference in a message's raw (unenriched OR already-enriched -- both
 * forms are matched) content/flavor. "Real evidence something was on
 * someone's mind, and genuinely ambiguous about what they did with it" --
 * harvest-inference.md's own words -- so this only EXTRACTS the reference,
 * never guesses a verb for it.
 */
// Built from a plain string list rather than named as a regex alternation
// literal on purpose: tier-0's core-purity lint (test/tier0-architecture.test.mjs)
// scans for the bare word "Actor" to catch an accidental Foundry global
// reference, and a regex literal is the one place its comment/string
// stripping cannot see into. A quoted string in an array is not that risk,
// and reads the same either way.
const ENRICHER_TYPES = ["UUID", "Actor", "Item", "Scene", "JournalEntry", "Macro"];

export function extractContentLinks(html) {
  if (!html) return [];
  const links = [];
  // Unenriched source form: @Type[id-or-uuid]{label} or @UUID[Type.id]{label}
  const sourcePattern = new RegExp(`@(${ENRICHER_TYPES.join("|")})\\[([^\\]]+)\\](?:\\{([^}]*)\\})?`, "g");
  for (const m of html.matchAll(sourcePattern)) {
    links.push({ type: m[1], ref: m[2], label: m[3] ?? null });
  }
  // Already-enriched form: <a class="content-link" data-uuid="Type.id">label</a>
  const enrichedPattern = /<a[^>]*class="[^"]*content-link[^"]*"[^>]*data-uuid="([^"]+)"[^>]*>([^<]*)<\/a>/g;
  for (const m of html.matchAll(enrichedPattern)) {
    const [type, ...idParts] = m[1].split(".");
    links.push({ type, ref: idParts.join("."), label: stripHtml(m[2]) || null });
  }
  return links;
}

/** A roll's essentials, from Foundry's own serialized Roll JSON -- never the whole term tree, just what a human needs to read. */
export function summarizeRolls(rolls = []) {
  return rolls
    .map((raw) => {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return { formula: parsed.formula ?? null, total: parsed.total ?? null };
      } catch {
        return null; // a genuinely malformed roll entry is dropped, not allowed to crash the whole export
      }
    })
    .filter(Boolean);
}

/**
 * The sf2e check-outcome context, when a message carries one -- confirmed
 * LIVE against a running local Foundry/sf2e instance (2026-09-16), not
 * read off source alone, and it's a good thing that was checked: the flag
 * namespace on a real document is `flags.sf2e`, NOT `flags.pf2e` (the
 * game.pf2e GLOBAL API object's own name is a red herring for this --
 * confirmed different things). There is also no `context.slug` field at
 * all on a real check message; the skill/statistic identifier lives at
 * `context.domains[0]` instead (verified against both a Perception check,
 * domains ["perception", "wis-based", ...], and a real skill check,
 * domains ["acrobatics", "dex-based", "skill-check", ...] -- the
 * statistic's own slug is consistently first). A roll made with no DC set
 * has `context.outcome: null` (no DC means no degree of success to
 * compute), which is correctly treated as "not a resolved check" here
 * rather than fabricating an outcome.
 *
 * Reading a message's OWN flags is not "reaching into the sf2e namespace"
 * in the sense tier-0's game.pf2e lint means (that lint is about calling
 * INTO game.pf2e's live API) -- this is just reading data the system
 * already wrote onto a document we're allowed to read, same as any other flag.
 */
export function extractCheckContext(flags) {
  const context = flags?.sf2e?.context;
  if (!context || !context.outcome) return null;
  return {
    type: context.type ?? null,
    slug: context.domains?.[0] ?? null,
    outcome: context.outcome,
    dc: context.dc?.value ?? null
  };
}

/**
 * A caller can flag a message it posts as always-worth-reading (e.g.
 * foundry/induction-terminal.mjs's intake-answers summary) via
 * `flags["blank-inheritance"].harvestKind`, a plain string. This is
 * deliberately generic rather than a one-off "is this intake answers" check
 * -- any future message an adapter authors and KNOWS is real content (not
 * ordinary chatter to run inference over) can use the same mechanism.
 * "blank-inheritance" is a literal string, not the Foundry MODULE_ID
 * constant most adapter files use -- this file is core/, which the tier-0
 * architecture lint forbids from importing anything Foundry-adjacent, and a
 * plain string here is not that.
 */
function extractHarvestKind(flags) {
  return flags?.["blank-inheritance"]?.harvestKind ?? null;
}

/**
 * One raw ChatMessage's plain data (already extracted from the live
 * Document by the adapter — see foundry/chat-export.mjs) -> the normalized
 * record that gets persisted and, later, classified.
 */
export function normalizeMessage(raw) {
  return {
    id: raw.id ?? null,
    at: raw.timestamp ? new Date(raw.timestamp).toISOString() : null,
    author: raw.authorName ?? null,
    speaker: raw.speakerName ?? null,
    text: stripHtml(raw.flavor) || stripHtml(raw.content),
    rolls: summarizeRolls(raw.rolls),
    check: extractCheckContext(raw.flags),
    links: [...extractContentLinks(raw.flavor ?? ""), ...extractContentLinks(raw.content ?? "")],
    // Named harvestKind, not kind, deliberately: core/harvest-inference.mjs's
    // own classifyMessage() output already uses `kind` for a DIFFERENT thing
    // (which candidate shape it produced -- "check"/"link"/"gm-note").
    // Reusing the name for this input field would be a real, confusing
    // collision between two unrelated concepts that happen to share a file
    // family.
    harvestKind: extractHarvestKind(raw.flags)
  };
}
