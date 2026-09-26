/**
 * The Watcher's file: what the campaign's adversary has actually observed about one
 * player character, and the gate that stops it using anything else.
 *
 * The Watcher is played by Claude (ideas/story/dossier-observer.md §2, LEDGER #31/#32).
 * The design goal is that it frightens the table by being FAIR: it knows only what it
 * has seen, through channels that exist in the fiction. A sharp party can learn that,
 * exploit it, and feed it false signals. So:
 *
 * - Every observation names an in-fiction source. There is no source for anything real
 *   about a player, and anything flagged out-of-character is refused outright.
 * - A rolled Recall Knowledge that fails teaches it nothing. A critical failure is
 *   recorded as a MISTAKEN belief: it will act on it, and the party can exploit that.
 * - `canExploit` is the hard gate: only true, recorded knowledge counts.
 *
 * Pure logic, no Foundry globals (design/testing-strategy.md). Files live in
 * data/watcher/, which is deliberately not in the campaign-data sync allow-list.
 * Shape: data/schema/watcher-file.schema.json (the test keeps the enums in step).
 */

export const WATCHER_SOURCES = Object.freeze([
  "recall-knowledge",
  "combat-observation",
  "in-character-message",
  "correspondence",
  "phone",
  "journal"
]);

export const WATCHER_CATEGORIES = Object.freeze([
  "skill",
  "save",
  "defence",
  "tactic",
  "habit",
  "person",
  "place",
  "plan",
  "weakness"
]);

/** Recall Knowledge degrees that leave something in the file. A plain failure leaves nothing. */
export const RECORDED_DEGREES = Object.freeze(["criticalSuccess", "success", "criticalFailure"]);

const ALL_DEGREES = Object.freeze(["criticalSuccess", "success", "failure", "criticalFailure"]);

export function emptyWatcherFile(subjectRef) {
  if (typeof subjectRef !== "string" || subjectRef.trim() === "") {
    throw new Error("A Watcher's file needs the id of the character it is about.");
  }
  return {
    $schema: "../schema/watcher-file.schema.json",
    id: `watcher-file--${subjectRef}`,
    type: "watcher-file",
    subjectRef,
    observations: []
  };
}

/**
 * Add one observation, returning a NEW file (the input is never mutated).
 * Throws on anything outside the fiction or outside the schema's vocabulary.
 */
export function recordObservation(file, observation) {
  if (!file || file.type !== "watcher-file") throw new Error("recordObservation needs a Watcher's file.");
  const obs = observation ?? {};
  if (obs.outOfCharacter === true) {
    throw new Error("The Watcher only ever uses the fiction: an out-of-character observation cannot be recorded.");
  }
  if (!WATCHER_SOURCES.includes(obs.source)) {
    throw new Error(`The Watcher only ever uses the fiction: "${obs.source}" is not an in-fiction source (${WATCHER_SOURCES.join(", ")}).`);
  }
  if (!WATCHER_CATEGORIES.includes(obs.category)) {
    throw new Error(`Unknown observation category "${obs.category}" (${WATCHER_CATEGORIES.join(", ")}).`);
  }
  if (typeof obs.key !== "string" || obs.key.trim() === "") {
    throw new Error("An observation needs a key: what exactly was observed.");
  }

  let mistaken = false;
  if (obs.source === "recall-knowledge") {
    if (!ALL_DEGREES.includes(obs.degree)) {
      throw new Error("A Recall Knowledge observation needs its degree of success.");
    }
    if (obs.degree === "failure") return file; // a plain failure teaches it nothing
    mistaken = obs.degree === "criticalFailure";
  } else if (obs.degree !== undefined) {
    throw new Error("Only a recall-knowledge observation carries a degree of success.");
  }

  const record = {
    id: `obs-${file.observations.length + 1}`,
    source: obs.source,
    category: obs.category,
    key: obs.key.trim()
  };
  if (obs.value !== undefined) record.value = obs.value;
  if (obs.source === "recall-knowledge") record.degree = obs.degree;
  if (mistaken) record.mistaken = true;
  if (typeof obs.observedIn === "string" && obs.observedIn) record.observedIn = obs.observedIn;
  if (typeof obs.note === "string" && obs.note) record.note = obs.note;

  return { ...file, observations: [...file.observations, record] };
}

const matches = (o, { category, key }) => o.category === category && o.key === key;

/** True when the Watcher really knows this (at least one observation that isn't mistaken). */
export function knows(file, query) {
  return file.observations.some((o) => matches(o, query) && !o.mistaken);
}

/**
 * What the Watcher believes about this, true or not: the latest recorded observation.
 * Returns null when it has never observed it.
 */
export function believes(file, query) {
  const found = file.observations.filter((o) => matches(o, query));
  if (!found.length) return null;
  const latest = found[found.length - 1];
  return { value: latest.value ?? null, mistaken: Boolean(latest.mistaken), source: latest.source };
}

/**
 * The hard gate. The Watcher may plan against this only if it truly knows it.
 * A mistaken belief never opens the gate, even though it may still act on it.
 */
export function canExploit(file, query) {
  return knows(file, query);
}

/** A GM-facing summary: how much it knows, by category, and how much of it is wrong. */
export function summarise(file) {
  const byCategory = Object.fromEntries(WATCHER_CATEGORIES.map((c) => [c, 0]));
  let mistaken = 0;
  for (const o of file.observations) {
    byCategory[o.category] += 1;
    if (o.mistaken) mistaken += 1;
  }
  return { subjectRef: file.subjectRef, total: file.observations.length, byCategory, mistaken };
}
