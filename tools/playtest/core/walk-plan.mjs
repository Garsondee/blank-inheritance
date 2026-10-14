/**
 * The walk: what a scripted game master must press to run an episode end to end, and what to say when the game did not let it. Pure.
 *
 * The GM walker (bots/gm-walker.mjs) is the rig's cheap pass over a whole episode (design/playtest-process.md section 13, the episode
 * confidence run): no judgement, no voice, every scene in play order, every beat ticked, every check put to the table and closed, every
 * group choice asked and settled, every handout shown, the fight set up. What it can find is what a script can find: an authored beat
 * the Runner never shows, a check pill that is not there, a choice nobody could answer, a handout with no button, a fight that will not
 * set up, an error the page threw. Whether any of it is GOOD is for the readers and the agents at the table.
 *
 * This file is the two halves that need no browser: the plan, read from the episode and its scene briefs exactly as the module ships
 * them (data/), and the judgement, which compares the plan with what the walker saw and returns findings in the rig's own shape.
 */

/**
 * The plan for one episode.
 * @param {object} episode data/episodes/<id>.json
 * @param {Record<string, object>} briefsById data/scene-briefs/<id>.json by id
 * @param {{ scenes?: string[] }} [options] only these scenes (brief ids or short ids), in play order still
 * @returns {{ episodeId: string, scenes: Array<WalkScene>, missing: string[] }}
 */
export function buildWalkPlan(episode, briefsById, { scenes = [] } = {}) {
  const wanted = new Set(scenes);
  const entries = [...(episode?.scenes ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const out = [];
  const missing = [];
  for (const entry of entries) {
    if (wanted.size && !wanted.has(entry.briefRef) && !wanted.has(entry.id)) continue;
    const brief = briefsById[entry.briefRef];
    if (!brief) {
      missing.push(entry.briefRef);
      continue;
    }
    out.push({
      briefId: entry.briefRef,
      shortId: entry.id,
      title: entry.title ?? brief.title ?? entry.briefRef,
      order: entry.order ?? null,
      handouts: (brief.handouts ?? []).map((h) => h.id).filter(Boolean),
      beats: (brief.beats ?? []).map((b) => ({
        id: b.id,
        mandatory: Boolean(b.mandatory),
        conditional: Boolean(b.when),
        check: Boolean(b.checkRef),
        choice: b.choicePoint ? (b.choicePoint.options ?? []).map((o) => o.id) : null,
        handout: b.handoutRef ?? null,
        fight: Boolean(b.encounterRef),
        triggers: (b.triggers ?? []).map((t) => t.id).filter(Boolean)
      }))
    });
  }
  return { episodeId: episode?.id ?? null, scenes: out, missing };
}

/** An empty observation for one scene, which the walker fills as it goes. */
export function emptyObservation() {
  return { reached: false, error: null, beatsShown: [], beats: {}, handoutsShown: [], handoutsRevealed: [], errors: [], ms: 0 };
}

/** An empty observation for one beat. */
export function emptyBeatObservation() {
  return { ticked: false, pills: 0, checksOpened: 0, checksClosed: 0, rolled: 0, asked: 0, choiceAsked: false, choiceSettled: false, picks: 0, fightSetUp: null, triggersShown: [], triggersFired: [], errors: [] };
}

const finding = (scene, beat, severity, summary, detail = {}) => ({
  kind: "bug",
  severity,
  channel: "walker",
  scene: scene.briefId,
  beat,
  key: `walk:${scene.briefId}:${beat ?? "-"}:${summary.slice(0, 48)}`,
  summary,
  detail
});

/**
 * What the walk found in one scene: the plan against the observation. Returns findings in the rig's shape
 * (core/findings.mjs: kind, severity, summary, scene, beat), each keyed so a re-walk files it once.
 * A beat with a `when` may legitimately not be shown (it waits for its condition), so its absence is S3 and says so.
 * @param {WalkScene} scene
 * @param {ReturnType<typeof emptyObservation>} seen
 */
export function judgeScene(scene, seen) {
  const out = [];
  if (!seen.reached) {
    out.push(finding(scene, null, "S1", `The walk could not reach "${scene.title}": ${seen.error ?? "the Scene Runner never showed it"}.`));
    return out;
  }
  const shown = new Set(seen.beatsShown);
  for (const beat of scene.beats) {
    if (!shown.has(beat.id)) {
      if (beat.conditional) out.push(finding(scene, beat.id, "S3", `Beat "${beat.id}" waits on a condition and was never shown in the Runner during the walk.`));
      else out.push(finding(scene, beat.id, "S1", `Beat "${beat.id}" is authored but the Scene Runner never showed it.`));
      continue;
    }
    const b = seen.beats[beat.id] ?? emptyBeatObservation();
    if (beat.check) {
      if (!b.pills) out.push(finding(scene, beat.id, "S1", `Beat "${beat.id}" has a check, but no check pill was drawn in its line.`));
      else if (!b.checksOpened) out.push(finding(scene, beat.id, "S1", `Pressing the check pill on beat "${beat.id}" did not open the check console.`));
      else {
        if (!b.rolled) out.push(finding(scene, beat.id, "S1", `The check on beat "${beat.id}" was put to the table and nobody's roll arrived.`, { asked: b.asked }));
        else if (b.asked && b.rolled < b.asked) out.push(finding(scene, beat.id, "S2", `Only ${b.rolled} of ${b.asked} players asked to roll on beat "${beat.id}" got a roll in.`, { asked: b.asked, rolled: b.rolled }));
        if (!b.checksClosed) out.push(finding(scene, beat.id, "S2", `The check console for beat "${beat.id}" would not close and record.`));
      }
    }
    if (beat.choice) {
      if (!b.choiceAsked) out.push(finding(scene, beat.id, "S1", `Beat "${beat.id}" has a group choice, but "Ask the players" could not be pressed.`));
      else if (!b.choiceSettled) out.push(finding(scene, beat.id, "S1", `The group choice on beat "${beat.id}" was asked and never settled (${b.picks} picks arrived).`, { picks: b.picks }));
    }
    if (beat.fight && b.fightSetUp === false) out.push(finding(scene, beat.id, "S1", `The fight on beat "${beat.id}" could not be set up.`));
    const fired = new Set(b.triggersFired);
    for (const t of beat.triggers) {
      if (!b.triggersShown.includes(t)) out.push(finding(scene, beat.id, "S2", `Trigger "${t}" on beat "${beat.id}" has no chip in the Runner.`));
      else if (!fired.has(t)) out.push(finding(scene, beat.id, "S2", `Trigger "${t}" on beat "${beat.id}" never showed as fired, even after its chip was pressed.`));
    }
    if (!b.ticked) out.push(finding(scene, beat.id, "S2", `Beat "${beat.id}" could not be ticked done.`));
    for (const e of b.errors) out.push(finding(scene, beat.id, "S2", `Running beat "${beat.id}": ${String(e).slice(0, 220)}`));
  }
  const revealed = new Set(seen.handoutsRevealed);
  for (const h of scene.handouts) {
    if (!seen.handoutsShown.includes(h)) out.push(finding(scene, null, "S2", `Handout "${h}" is authored on this scene but the Runner offers no button to show it.`));
    else if (!revealed.has(h)) out.push(finding(scene, null, "S2", `Handout "${h}" has a button, and pressing it did not show the handout.`));
  }
  for (const e of seen.errors) out.push(finding(scene, null, "S2", `In "${scene.title}": ${String(e).slice(0, 220)}`));
  return out;
}

/** One line per scene for the walk's own summary. */
export function summarizeWalk(plan, observations) {
  const lines = [];
  let beats = 0;
  let shown = 0;
  for (const scene of plan.scenes) {
    const seen = observations[scene.briefId] ?? emptyObservation();
    const n = scene.beats.length;
    const s = scene.beats.filter((b) => seen.beatsShown.includes(b.id)).length;
    beats += n;
    shown += s;
    const checks = scene.beats.filter((b) => b.check).length;
    const closed = scene.beats.filter((b) => b.check && seen.beats[b.id]?.checksClosed).length;
    lines.push(`${seen.reached ? "walked " : "MISSED "} ${scene.title.padEnd(26)} beats ${s}/${n}  checks ${closed}/${checks}  ${Math.round((seen.ms ?? 0) / 1000)}s`);
  }
  lines.push(`total: ${shown}/${beats} beats shown across ${plan.scenes.length} scenes`);
  return lines.join("\n");
}

/**
 * @typedef {{ briefId: string, shortId: string, title: string, order: number|null, handouts: string[],
 *   beats: Array<{ id: string, mandatory: boolean, conditional: boolean, check: boolean, choice: string[]|null, handout: string|null, fight: boolean, triggers: string[] }> }} WalkScene
 */
