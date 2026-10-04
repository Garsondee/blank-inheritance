/**
 * The party, as the Scene Runner sees it -- pure, no Foundry.
 *
 * Built 2026-10-04 for Ingram's "the GM has the best possible experience"
 * pass on Episode One. Reading the Flood Tunnel's opening live, the GM had to
 * remember seven things about six characters across eleven earlier scenes:
 * who passed natural history, who critically succeeded there, whom Taka
 * warned, who passed the workshop, who qualified on the range, who has no
 * handlamp, who is Fatigued. Every one of those is already recorded
 * somewhere -- a roll in the chat log, a pick on a choice, a condition on a
 * sheet, an item in an inventory -- so the Runner looks them up instead.
 *
 * Three things live here:
 *
 *   - each character's OWN result on a beat (`runState.results`), beside the
 *     one result a beat keeps for its branches (`runState.ticked`);
 *   - a carry-in's `who`: whom an earlier outcome applies to, resolved
 *     against everything recorded so far;
 *   - the party strip: one line per character, with what is live for them in
 *     this scene.
 *
 * A carry-in's `who` names ONE source (data/schema/scene-brief.schema.json):
 *
 *   { briefRef, beatRef, degrees }   their own result on that beat
 *   { briefRef, topicKey, degrees }  their result on a person card's conversation check
 *   { briefRef, beatRef, options }   their own pick on that beat's choice
 *                                    (or the table's choice, if nobody was asked)
 *   { condition: "fatigued" }        a condition on their sheet now
 *   { hasItem: [words] }             something in their inventory by that name
 *   { lacksItem: [words] }           nothing in their inventory by that name
 *   { arrival: "ferry" }             how they came to Kurose (The Road In)
 *   { anyOf: [sources] }             any of these
 */

export const PASSING = Object.freeze(["success", "criticalSuccess"]);

const DEGREE_SET = new Set(["criticalSuccess", "success", "failure", "criticalFailure"]);

/* ---------------------------------------------------------------- */
/*  Each character's own result                                      */
/* ---------------------------------------------------------------- */

/**
 * The results bag with one character's result on one beat written, or
 * cleared (`entry` null). Never mutates its input.
 */
export function withResult(results = {}, beatId, actorId, entry) {
  if (!beatId || !actorId) return results ?? {};
  const forBeat = { ...(results?.[beatId] ?? {}) };
  if (entry && DEGREE_SET.has(entry.degree)) forBeat[actorId] = { ...entry };
  else delete forBeat[actorId];
  const next = { ...(results ?? {}) };
  if (Object.keys(forBeat).length) next[beatId] = forBeat;
  else delete next[beatId];
  return next;
}

/**
 * Every character's result on one beat, as a map of actor id to degree.
 *
 * Reads `results` first. A beat recorded before per-character results existed,
 * or recorded by the roll that recorded itself, still carries who rolled it on
 * its one `ticked` stamp, and that counts too.
 */
export function degreesOnBeat(runState, beatId) {
  const out = new Map();
  const tick = runState?.ticked?.[beatId];
  if (tick?.actorId && DEGREE_SET.has(tick.degree)) out.set(tick.actorId, tick.degree);
  for (const [actorId, entry] of Object.entries(runState?.results?.[beatId] ?? {})) {
    if (DEGREE_SET.has(entry?.degree)) out.set(actorId, entry.degree);
  }
  return out;
}

/* ---------------------------------------------------------------- */
/*  Whom an earlier outcome applies to                               */
/* ---------------------------------------------------------------- */

const lower = (value) => String(value ?? "").toLowerCase();

function hasItemNamed(member, words = []) {
  const names = (member?.itemNames ?? []).map(lower);
  return words.some((word) => names.some((name) => name.includes(lower(word))));
}

function hasCondition(member, slug) {
  return (member?.conditions ?? []).some((c) => lower(c?.slug ?? c) === lower(slug));
}

/**
 * Resolve one `who` against the record.
 *
 * Returns `{ known, actorIds, whole }`:
 *   known     the record can answer at all (a beat nobody has run yet cannot)
 *   actorIds  the characters it applies to, by actor id
 *   whole     for an outcome that belongs to the table rather than to anyone
 *             (a choice the GM recorded by hand, a degree recorded without a
 *             name): true when it happened, false when it did not, else null
 */
export function resolveWho(who, { runs = {}, members = [], arrivals = null } = {}) {
  const none = { known: false, actorIds: new Set(), whole: null };
  if (!who || typeof who !== "object") return none;

  if (Array.isArray(who.anyOf)) {
    const parts = who.anyOf.map((source) => resolveWho(source, { runs, members, arrivals }));
    const actorIds = new Set(parts.flatMap((p) => [...p.actorIds]));
    const wholes = parts.map((p) => p.whole).filter((w) => w !== null);
    return {
      known: parts.some((p) => p.known),
      actorIds,
      whole: wholes.length ? wholes.some(Boolean) : null
    };
  }

  if (who.condition) {
    if (!members.length) return none;
    return { known: true, actorIds: new Set(members.filter((m) => hasCondition(m, who.condition)).map((m) => m.actorId)), whole: null };
  }

  if (Array.isArray(who.hasItem) || Array.isArray(who.lacksItem)) {
    if (!members.length) return none;
    const words = who.hasItem ?? who.lacksItem;
    const wants = Array.isArray(who.hasItem);
    return { known: true, actorIds: new Set(members.filter((m) => hasItemNamed(m, words) === wants).map((m) => m.actorId)), whole: null };
  }

  if (who.arrival) {
    if (!arrivals || !Object.keys(arrivals).length) return none;
    const byUser = new Map(members.map((m) => [m.userId, m.actorId]));
    const actorIds = new Set(
      Object.entries(arrivals)
        .filter(([, destination]) => destination === who.arrival)
        .map(([userId]) => byUser.get(userId))
        .filter(Boolean)
    );
    return { known: true, actorIds, whole: null };
  }

  if (who.topicKey) {
    // A conversation check on a person's card (`<castId>:coercible:<n>`),
    // which keeps one result, with who rolled it when a roll recorded it.
    const tick = runs?.[who.briefRef]?.topics?.[who.topicKey] ?? null;
    if (!DEGREE_SET.has(tick?.degree)) return none;
    const degrees = Array.isArray(who.degrees) && who.degrees.length ? who.degrees : PASSING;
    if (tick.actorId) return { known: true, actorIds: new Set(degrees.includes(tick.degree) ? [tick.actorId] : []), whole: null };
    return { known: true, actorIds: new Set(), whole: degrees.includes(tick.degree) };
  }

  if (who.beatRef) {
    const runState = runs?.[who.briefRef] ?? null;
    if (!runState) return none;
    const tick = runState.ticked?.[who.beatRef] ?? null;

    if (Array.isArray(who.options)) {
      const picks = tick?.picks ?? null;
      if (picks && Object.keys(picks).length) {
        const byUser = new Map(members.map((m) => [m.userId, m.actorId]));
        const actorIds = new Set(
          Object.entries(picks)
            .filter(([, option]) => who.options.includes(option))
            .map(([userId]) => byUser.get(userId))
            .filter(Boolean)
        );
        return { known: true, actorIds, whole: who.options.includes(tick.choice) };
      }
      if (tick?.choice) return { known: true, actorIds: new Set(), whole: who.options.includes(tick.choice) };
      return none;
    }

    const degrees = Array.isArray(who.degrees) && who.degrees.length ? who.degrees : PASSING;
    const byActor = degreesOnBeat(runState, who.beatRef);
    if (byActor.size) {
      return { known: true, actorIds: new Set([...byActor].filter(([, d]) => degrees.includes(d)).map(([id]) => id)), whole: null };
    }
    // Recorded by hand, one degree for the beat and no name on it.
    if (tick?.degree) return { known: true, actorIds: new Set(), whole: degrees.includes(tick.degree) };
    return none;
  }

  return none;
}

/**
 * A scene's carry-ins, each with whom it applies to.
 *
 * `state` reads, for the template:
 *   "names"    it applies, to the characters named
 *   "applies"  it applies to the table (no one character to name)
 *   "nobody"   the record says it applies to nobody, so the line is dimmed
 *   "unknown"  nothing recorded can answer it; read it out as written
 */
export function carryInsWithNames(carriesIn = [], context = {}) {
  const nameOf = new Map((context.members ?? []).map((m) => [m.actorId, m.name]));
  return (carriesIn ?? []).map((carry) => {
    const resolved = carry?.who ? resolveWho(carry.who, context) : { known: false, actorIds: new Set(), whole: null };
    const names = [...resolved.actorIds].map((id) => nameOf.get(id)).filter(Boolean);
    let state = "unknown";
    if (names.length) state = "names";
    else if (resolved.whole === true) state = "applies";
    else if (resolved.known) state = "nobody";
    return {
      ...carry,
      tag: carry?.tag ?? null,
      names,
      namesText: names.join(", "),
      actorIds: [...resolved.actorIds],
      state,
      applies: state === "names" || state === "applies",
      isNobody: state === "nobody"
    };
  });
}

/* ---------------------------------------------------------------- */
/*  The party strip                                                  */
/* ---------------------------------------------------------------- */

/**
 * One line per character: who they are, their hit points and Hero Points,
 * the conditions on their sheet, and the short tag of every carry-in in THIS
 * scene that applies to them. Read straight off the sheets every render, so
 * nothing here can go stale.
 */
export function partyStrip(members = [], carryIns = []) {
  return members.map((member) => {
    const tags = carryIns.filter((c) => c.tag && c.actorIds?.includes(member.actorId)).map((c) => c.tag);
    const hp = member.hp ?? null;
    return {
      actorId: member.actorId,
      name: member.name,
      img: member.img ?? null,
      initial: String(member.name ?? "?").trim().charAt(0).toUpperCase() || "?",
      // A sheet with no hit points yet (a character still being made) shows
      // none, rather than "0/0" (found on the local test world, 2026-10-04).
      hp: hp && Number.isFinite(hp.max) && hp.max > 0 ? { value: hp.value ?? 0, max: hp.max, isLow: (hp.value ?? 0) <= hp.max / 2 } : null,
      heroPoints: Number.isFinite(member.heroPoints) ? member.heroPoints : null,
      conditions: (member.conditions ?? []).map((c) => c?.label ?? c?.slug ?? String(c)),
      tags
    };
  });
}

/**
 * The per-player degree row on a beat everyone rolls: one row per character,
 * with the degree they got, if any.
 */
export function perPlayerRows(members = [], runState = null, beatId = null) {
  const byActor = degreesOnBeat(runState, beatId);
  return members.map((member) => ({
    actorId: member.actorId,
    name: member.name,
    degree: byActor.get(member.actorId) ?? null
  }));
}
