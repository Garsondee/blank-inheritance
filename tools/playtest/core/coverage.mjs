/**
 * The coverage ledger: what the authored material OFFERS against what a run actually DID. Pure.
 * (design/playtest-process.md, section 6, Phase 3: "a scene is not done until each of its checks has been seen at a success and a
 * failure, each choice point taken both ways, and the refusal case run once".)
 *
 * Authored items come from the scene briefs and the challenge files: every beat (mandatory or not), every check (its four degrees),
 * every option of every choice point, every handout. The run's events come from the world: the Runner's own record of what was ticked
 * and recorded (the `runnerRuns` world setting, one run state per brief), the dice tape, and what the hub saw granted.
 *
 * Tolerant on purpose. The run state's shape has grown over several sessions (`ticked`, `results`, `topics`, `granted`...), and a ledger
 * that throws on a field it has not met would fail exactly when a run produced something new. An unknown shape reads as "not seen" and
 * is reported under `unread`, so a gap in the ledger is visible, never silent.
 */

export const DEGREES = ["criticalFailure", "failure", "success", "criticalSuccess"];

/**
 * Every item a set of briefs offers.
 * @param {object[]} briefs      scene brief documents, in play order
 * @param {Record<string, object>} challenges  challenge documents by id
 */
export function authoredItems(briefs, challenges = {}) {
  const items = [];
  for (const brief of briefs) {
    const scene = brief.id;
    items.push({ id: scene, type: "scene", scene });
    for (const beat of brief.beats ?? []) {
      items.push({ id: `${scene}#beat:${beat.id}`, type: "beat", scene, beat: beat.id, mandatory: Boolean(beat.mandatory), kind: beat.kind ?? null });
      if (beat.challengeRef) {
        const challenge = challenges[beat.challengeRef];
        const check = (challenge?.checks ?? []).find((c) => c.id === (beat.checkRef ?? challenge?.checks?.[0]?.id));
        for (const degree of DEGREES) items.push({ id: `${scene}#check:${beat.id}:${degree}`, type: "degree", scene, beat: beat.id, check: check?.id ?? beat.checkRef ?? null, degree, dc: check?.dc?.value ?? null });
      }
      if (beat.choicePoint) {
        for (const option of beat.choicePoint.options ?? []) items.push({ id: `${scene}#choice:${beat.id}:${option.id}`, type: "choice", scene, beat: beat.id, option: option.id });
        if (beat.choicePoint.allowsInventedOption) items.push({ id: `${scene}#choice:${beat.id}:something-else`, type: "choice", scene, beat: beat.id, option: "something-else" });
      }
    }
    for (const handout of brief.handouts ?? []) items.push({ id: `${scene}#handout:${handout.id}`, type: "handout", scene, handout: handout.id });
  }
  return items;
}

const degreeName = (value) => {
  if (typeof value === "number") return DEGREES[value] ?? null;
  if (typeof value !== "string") return null;
  const v = value.replace(/[^a-z]/gi, "").toLowerCase();
  return DEGREES.find((d) => d.toLowerCase() === v) ?? null;
};

/**
 * Events from the Runner's stored run states (the `runnerRuns` setting: { [briefId]: runState }).
 * Reads what it recognises: beats ticked, a degree on a tick or in `results`, a choice recorded on a tick, handouts granted.
 * @returns {{events:object[], unread:string[]}}
 */
export function eventsFromRuns(runs) {
  const events = [];
  const unread = [];
  for (const [scene, run] of Object.entries(runs ?? {})) {
    if (!run || typeof run !== "object") {
      unread.push(`${scene}: run state is not an object`);
      continue;
    }
    for (const [beat, tick] of Object.entries(run.ticked ?? {})) {
      events.push({ kind: "beat", scene, beat });
      const t = tick && typeof tick === "object" ? tick : {};
      const degree = degreeName(t.degree ?? t.outcome ?? t.result);
      if (degree) events.push({ kind: "degree", scene, beat, degree });
      const choice = t.choice ?? t.option ?? t.optionId ?? null;
      if (typeof choice === "string") events.push({ kind: "choice", scene, beat, option: choice });
    }
    for (const [beat, byActor] of Object.entries(run.results ?? {})) {
      for (const value of Object.values(byActor && typeof byActor === "object" ? byActor : {})) {
        const degree = degreeName(value?.degree ?? value?.outcome ?? value);
        if (degree) events.push({ kind: "degree", scene, beat, degree });
      }
    }
    for (const g of run.granted ?? []) events.push({ kind: "handout", scene, handout: typeof g === "string" ? g : g?.id ?? null });
    for (const key of Object.keys(run)) if (!["ticked", "spent", "opened", "granted", "topics", "adjust", "results", "closedAt", "closeReview", "closed"].includes(key)) unread.push(`${scene}: unread field "${key}"`);
  }
  return { events, unread: [...new Set(unread)] };
}

/** Events from the dice tape: a roll with a known check and degree counts toward that check. `briefOf(entry)` says which brief it was in. */
export function eventsFromTape(tape, { briefOf = () => null } = {}) {
  const events = [];
  for (const roll of tape) {
    const degree = degreeName(roll.degree);
    const beat = typeof roll.check === "string" && roll.check.startsWith("beat:") ? roll.check.slice(5) : null;
    const scene = briefOf(roll);
    if (degree && beat && scene) events.push({ kind: "degree", scene, beat, degree, forced: Boolean(roll.forced) });
  }
  return events;
}

/** Mark each item seen (with a count) by the events that match it. Returns new items; the input is untouched. */
export function applyEvents(items, events) {
  const seen = new Map();
  const bump = (id, extra = {}) => {
    const cur = seen.get(id) ?? { count: 0, forced: 0 };
    cur.count++;
    if (extra.forced) cur.forced++;
    seen.set(id, cur);
  };
  for (const e of events) {
    if (e.kind === "beat") bump(`${e.scene}#beat:${e.beat}`);
    else if (e.kind === "degree") bump(`${e.scene}#check:${e.beat}:${e.degree}`, e);
    else if (e.kind === "choice") bump(`${e.scene}#choice:${e.beat}:${e.option}`);
    else if (e.kind === "handout" && e.handout) bump(`${e.scene}#handout:${e.handout}`);
  }
  const sceneBeats = new Set(events.filter((e) => e.kind === "beat").map((e) => e.scene));
  return items.map((item) => {
    const hit = item.type === "scene" ? (sceneBeats.has(item.scene) ? { count: 1, forced: 0 } : null) : seen.get(item.id);
    return { ...item, seen: hit?.count ?? 0, forced: hit?.forced ?? 0 };
  });
}

/** The summary the control room and the report use. */
export function summarize(items) {
  const group = (type) => {
    const list = items.filter((i) => i.type === type);
    return { total: list.length, seen: list.filter((i) => i.seen > 0).length };
  };
  const beats = items.filter((i) => i.type === "beat");
  const mandatory = beats.filter((b) => b.mandatory);
  const checks = new Map();
  for (const d of items.filter((i) => i.type === "degree")) {
    const key = `${d.scene}#${d.beat}`;
    const entry = checks.get(key) ?? { scene: d.scene, beat: d.beat, check: d.check, degrees: {} };
    entry.degrees[d.degree] = d.seen;
    checks.set(key, entry);
  }
  const checkRows = [...checks.values()].map((c) => ({ ...c, both: (c.degrees.success > 0 || c.degrees.criticalSuccess > 0) && (c.degrees.failure > 0 || c.degrees.criticalFailure > 0) }));
  return {
    scenes: group("scene"),
    beats: group("beat"),
    mandatoryBeats: { total: mandatory.length, seen: mandatory.filter((b) => b.seen > 0).length },
    degrees: group("degree"),
    checks: { total: checkRows.length, seenBothWays: checkRows.filter((c) => c.both).length, rows: checkRows },
    choices: group("choice"),
    handouts: group("handout"),
    gaps: {
      mandatoryBeats: mandatory.filter((b) => b.seen === 0).map((b) => b.id),
      checksNotSeenBothWays: checkRows.filter((c) => !c.both).map((c) => `${c.scene}#${c.beat}`),
      choicesNotTaken: items.filter((i) => i.type === "choice" && i.seen === 0).map((i) => i.id)
    }
  };
}
