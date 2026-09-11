/**
 * Does this location match what it claims to be? — browser half.
 *
 * The twin of core/depth.py, held to it by test/fixtures/gazetteer-depth-cases.json
 * which both suites assert against. The specification is design/location-depth.md.
 *
 * Why a twin at all, rather than asking the server: this runs on every
 * keystroke in the inspector, to say live what a location still owes at its
 * declared depth. A round trip per keystroke would be the wrong shape, and
 * the moment the two implementations are allowed to drift, the tool starts
 * telling you a location is finished when the promotion path disagrees.
 *
 * Pure arithmetic and string work, no imports, no browser globals — same
 * rule the grid pair lives under, and for the same reason: the shared
 * fixture only covers it while it stays runnable in plain Node.
 */

/** In order. Each depth requires everything the ones below it require. */
export const DEPTHS = ["named", "sketch", "scene", "standing"];

const PROSE_FIELDS = ["summary", "playerFacing", "gmOnly", "history", "consequences"];

/** Everything a depth obliges. Mirrors SPEC in depth.py exactly. */
export const SPEC = {
  // 70, not the 40 first guessed: measured against the 36 hand-written
  // entries of the first real session (median 42, p90 62, max 88), where 40
  // flagged 19 of them. Those are the entries that DEFINE the depth-0
  // standard here, so the ceiling was wrong, not the entries.
  named: {
    text: ["summary"],
    lists: {},
    summaryWords: 70,
    totalWords: 70,
  },
  sketch: {
    text: ["summary", "playerFacing"],
    lists: { hooks: 1 },
    summaryWords: 90,
    totalWords: 250,
  },
  scene: {
    text: ["summary", "playerFacing", "gmOnly"],
    lists: { hooks: 1, activities: 2, npcRefs: 1, assetRefs: 1, playlistRefs: 1 },
    summaryWords: 150,
    totalWords: 900,
  },
  standing: {
    text: ["summary", "playerFacing", "gmOnly", "history", "consequences"],
    lists: { hooks: 1, activities: 3, npcRefs: 2, assetRefs: 1, playlistRefs: 1 },
    summaryWords: 150,
    totalWords: null,   // a place visited all campaign is allowed to accumulate
  },
};

const ORPHAN_CANDIDATES = ["playerFacing", "gmOnly", "history", "consequences",
  "activities", "npcRefs", "assetRefs", "playlistRefs"];

export const LABELS = {
  summary: "a one-line summary",
  playerFacing: "player-facing description",
  gmOnly: "GM-only notes",
  history: "a history section",
  consequences: "a consequences section",
  hooks: "hooks",
  activities: "activities",
  npcRefs: "NPCs",
  assetRefs: "artwork",
  playlistRefs: "a playlist",
};

/** One shape from either a promoted location or a gazetteer session item. A
 *  session item's flat `note` IS its summary while drafting, which is what
 *  lets this same check run before anything has been promoted. */
export function normalise(doc) {
  const lore = doc.lore || {};
  const scene = doc.scene || {};
  const s = (v) => (v || "").trim();
  return {
    name: s(doc.name),
    kind: s(doc.kind),
    summary: s(lore.summary || doc.note),
    playerFacing: s(lore.playerFacing),
    gmOnly: s(lore.gmOnly),
    history: s(scene.history),
    consequences: s(scene.consequences),
    hooks: [...(scene.hooks || [])],
    activities: [...(scene.activities || [])],
    npcRefs: [...(doc.npcRefs || [])],
    assetRefs: [...(doc.assetRefs || [])],
    playlistRefs: [...(doc.playlistRefs || [])],
  };
}

export function wordCount(text) {
  const trimmed = (text || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Every word that counts toward the budget, list entries included — a lean
 *  description carrying twenty listed activities has still outgrown its
 *  depth, and a budget ignoring them would be trivially sidestepped. */
export function proseWords(fields) {
  let total = 0;
  for (const name of PROSE_FIELDS) total += wordCount(fields[name]);
  for (const name of ["hooks", "activities"]) {
    for (const entry of fields[name] || []) total += wordCount(entry);
  }
  return total;
}

/** The whole contract, as three lists plus the arithmetic behind them.
 *  `depth` overrides the document's own declaration, which is what answers
 *  "what would this owe if I promoted it?". */
export function check(doc, depth) {
  const declared = depth || doc.depth || "named";
  if (!Object.prototype.hasOwnProperty.call(SPEC, declared)) {
    return {
      depth: declared,
      known: false,
      missing: [`depth "${declared}" is not one of ${DEPTHS.join(", ")}`],
      overweight: [],
      orphaned: [],
      ok: false,
      words: 0,
      summaryWords: 0,
    };
  }

  const spec = SPEC[declared];
  const fields = normalise(doc);
  const missing = [];
  const overweight = [];
  const orphaned = [];

  if (!fields.name) missing.push("a name");
  if (!fields.kind) missing.push("a kind");

  for (const name of spec.text) {
    if (!fields[name]) missing.push(LABELS[name]);
  }
  for (const [name, least] of Object.entries(spec.lists)) {
    const have = fields[name].length;
    if (have < least) missing.push(`${LABELS[name]} (${have} of ${least})`);
  }

  const summaryWords = wordCount(fields.summary);
  const words = proseWords(fields);
  const summaryOver = summaryWords > spec.summaryWords;
  if (summaryOver) {
    overweight.push(`summary is ${summaryWords} words, over the ${spec.summaryWords}-word ceiling for ${declared}`);
  }
  // At depth `named` the summary IS the whole prose, so reporting both
  // ceilings says the same thing twice and makes the advice read as
  // mechanical rather than considered.
  const totalIsJustTheSummary = words === summaryWords;
  if (spec.totalWords !== null && words > spec.totalWords
      && !(summaryOver && totalIsJustTheSummary)) {
    overweight.push(`${words} words in total, over the ${spec.totalWords}-word ceiling for ${declared}`);
  }

  const required = new Set([...spec.text, ...Object.keys(spec.lists)]);
  for (const name of ORPHAN_CANDIDATES) {
    if (required.has(name)) continue;
    const value = fields[name];
    if (value && value.length) orphaned.push(LABELS[name]);
  }

  return { depth: declared, known: true, missing, overweight, orphaned,
           ok: missing.length === 0, words, summaryWords };
}

/** The DEEPEST depth this content would already satisfy, or null.
 *  Requirements only grow with depth, so the deepest passing rung is the
 *  interesting one: it is the one saying "promote this and it checks out". */
export function suggestDepth(doc) {
  let best = null;
  for (const name of DEPTHS) {
    if (check(doc, name).ok) best = name;
  }
  return best;
}
