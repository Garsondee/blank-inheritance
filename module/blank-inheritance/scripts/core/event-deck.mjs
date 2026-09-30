/**
 * A scene's event deck: things that could happen, drawn at random, each
 * unique, and put back if nobody saw them (canon/decisions/D050.md, points
 * 5 and 6).
 *
 * Ingram, 2026-09-29: "we define the things that could happen and then pick
 * randomly and I roll with it as long as each option is unique. The other
 * thing is that we don't have to remove an event if no one has witnessed it,
 * so if a school lesson doesn't get picked it can be shuffled back into the
 * deck and it has a chance to appear later."
 *
 * So an event has three states for a deck: in the deck, drawn (on the table
 * now), and witnessed (played; it never comes up again). The GM decides
 * which: a drawn event the table never saw goes back. A deck is named by
 * the brief that authors it, or by `deckRef` when several scenes share one
 * (every night at the bathhouse draws from the same regulars), so what was
 * witnessed in one visit is gone from the next.
 *
 * No Foundry here. The Scene Runner keeps each deck's state in a world
 * setting and calls these.
 */

export const emptyDeckState = () => ({ drawn: [], witnessed: [] });

/**
 * What sort of event it is (D051). Most are rolls, buffs, role-play prompts,
 * dilemmas or informants. A plot event is more than it seems, and a danger
 * event can turn violent without warning to the players: the Runner alerts
 * the GM to both while one is on the table.
 */
export const EVENT_KINDS = Object.freeze(["roll", "buff", "roleplay", "dilemma", "informant", "plot", "danger"]);
const DEGREE_KEYS = Object.freeze(["criticalSuccess", "success", "failure", "criticalFailure"]);

/** A brief's events, made safe: an id and some text each, no duplicates. */
export function normalizeEvents(events = []) {
  const seen = new Set();
  const out = [];
  for (const [i, raw] of (Array.isArray(events) ? events : []).entries()) {
    if (!raw || typeof raw !== "object") continue;
    const id = typeof raw.id === "string" && raw.id ? raw.id : `event-${i + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: typeof raw.title === "string" && raw.title ? raw.title : id,
      text: typeof raw.text === "string" ? raw.text : "",
      check: typeof raw.check === "string" ? raw.check : null,
      note: typeof raw.note === "string" ? raw.note : null,
      kind: EVENT_KINDS.includes(raw.kind) ? raw.kind : "roleplay",
      prompt: typeof raw.prompt === "string" && raw.prompt ? raw.prompt : null,
      outcomes: DEGREE_KEYS.filter((k) => typeof raw.outcomes?.[k] === "string" && raw.outcomes[k]).map((k) => ({ degree: k, text: raw.outcomes[k] })),
      episodes: Array.isArray(raw.episodes) ? raw.episodes.filter((e) => typeof e === "string") : [],
      // A danger event's theatre-of-the-mind shape (D052): press the attack or
      // retreat, and some foes surrender rather than die. Descriptive only --
      // the GM narrates it, nothing here is rolled automatically.
      fight: raw.fight && typeof raw.fight === "object"
        ? {
            foe: typeof raw.fight.foe === "string" ? raw.fight.foe : null,
            press: typeof raw.fight.press === "string" ? raw.fight.press : null,
            retreat: typeof raw.fight.retreat === "string" ? raw.fight.retreat : null,
            surrender: typeof raw.fight.surrender === "string" ? raw.fight.surrender : null
          }
        : null
    });
  }
  return out;
}

/** Which deck a brief draws from: its own, or a shared one. */
export function deckIdFor(brief) {
  if (typeof brief?.deckRef === "string" && brief.deckRef) return brief.deckRef;
  return brief?.id ?? null;
}

export function normalizeDeckState(raw) {
  const ids = (list) => (Array.isArray(list) ? [...new Set(list.filter((x) => typeof x === "string"))] : []);
  return { drawn: ids(raw?.drawn), witnessed: ids(raw?.witnessed) };
}

/** Whether an event can come up in this episode: one naming no episodes can come up in any. */
export const inEpisode = (event, episodeId) => !episodeId || !event.episodes?.length || event.episodes.includes(episodeId);

/** Events still in the deck: neither on the table nor already played, and allowed in this episode. */
export function remaining(events, state, { episodeId = null } = {}) {
  const s = normalizeDeckState(state);
  return normalizeEvents(events).filter((e) => !s.drawn.includes(e.id) && !s.witnessed.includes(e.id) && inEpisode(e, episodeId));
}

/**
 * Draw one event. Returns the event and the deck's next state, or a null
 * event when the deck is empty (everything played or on the table).
 * `random` is injectable so tests are exact.
 */
export function drawEvent(events, state, { random = Math.random, episodeId = null } = {}) {
  const s = normalizeDeckState(state);
  const pool = remaining(events, s, { episodeId });
  if (!pool.length) return { event: null, state: s };
  const event = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  return { event, state: { ...s, drawn: [...s.drawn, event.id] } };
}

/** The table saw it: it never comes up again. */
export function witness(state, eventId) {
  const s = normalizeDeckState(state);
  return { drawn: s.drawn.filter((id) => id !== eventId), witnessed: [...new Set([...s.witnessed, eventId])] };
}

/** Nobody saw it: back into the deck, to come up another time. */
export function putBack(state, eventId) {
  const s = normalizeDeckState(state);
  return { ...s, drawn: s.drawn.filter((id) => id !== eventId) };
}

/** What the Runner shows: the events on the table now, and how many are left. */
export function deckView(events, state, { episodeId = null } = {}) {
  const all = normalizeEvents(events);
  const s = normalizeDeckState(state);
  const byId = new Map(all.map((e) => [e.id, e]));
  const drawn = s.drawn.map((id) => byId.get(id)).filter(Boolean);
  return {
    total: all.filter((e) => inEpisode(e, episodeId)).length,
    drawn,
    remaining: remaining(all, s, { episodeId }).length,
    witnessed: s.witnessed.filter((id) => byId.has(id)).length,
    alert: alertFor(drawn)
  };
}

/**
 * The header's alert while an event on the table is more than it seems: danger
 * outranks plot, since the GM needs it first. Null when neither is drawn.
 */
export function alertFor(drawn = []) {
  if (drawn.some((e) => e.kind === "danger")) return "danger";
  if (drawn.some((e) => e.kind === "plot")) return "plot";
  return null;
}
