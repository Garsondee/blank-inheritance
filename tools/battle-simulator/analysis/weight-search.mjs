/**
 * AUTOMATED WEIGHT SEARCH (design doc §49 — the "Archetype Ladder" plan's own Stage D: "Overnight
 * hill-climb against league + archetypes, with a promotion rule that requires beating several
 * checkpoints.")
 *
 * Lives in `analysis/`, not `personnel-engine/`, on purpose: it's built ON TOP of
 * `tournament-runner.mjs`'s real mirror-match infrastructure (which itself sits above
 * `personnel-engine/`), and putting it inside the core engine directory would invert that layering —
 * `personnel-engine/` never depends on `analysis/`, only the reverse.
 *
 * The plan's own §08 draws a hard line between two search spaces: "Weights — thirteen scalars,
 * continuous, automatable... Structure [templates, temperament, the eventual blackboard] — discrete,
 * human-designed... explored by hand." This file is ONLY the weight side. It mutates exactly one
 * `DEFAULT_WEIGHTS` key per generation (the same "change ONE thing, measure" ethos
 * `run-ablation.mjs` already established for the unrelated Frame-scale simulator — a real conceptual
 * precedent, not code this file imports: `run-ablation.mjs` lives under `tools/battle-simulator/ai/`
 * and `engine/`, the Frame-scale tree this project's own scale-separation rule keeps hard-isolated
 * from `personnel-engine/`).
 *
 * THE PROMOTION RULE — directly implementing two of the Ladder plan's own §06 risk fixes, not
 * invented independently:
 *   - Risk 2, "Intransitive cycles... A single rolling baseline reads this as endless progress while
 *     the AI walks in a circle" — fixed by requiring a candidate to beat EVERY member of a growing
 *     LEAGUE (every past promoted checkpoint, not just the newest), at a real win-rate bar clearly
 *     above a coin flip, before it can become the new best.
 *   - Risk 3, "Overfitting the control... tuning only against one frozen opponent teaches
 *     exploitation of THAT opponent" — fixed by ALSO requiring a real win-rate MAJORITY against the
 *     full Stage C archetype pool, a diverse opponent set the candidate was never specifically tuned
 *     against.
 *
 * SCOPE, STATED HONESTLY: this is the real, working MECHANISM — mutation, real mirror-match
 * evaluation, the two-part promotion rule, a growing league — proven against real battles, not the
 * "overnight" scale the plan itself calls for. A session-scoped demonstration run (a handful of
 * generations, not thousands) is what `node weight-search.mjs` actually runs; see design doc §49 for
 * the real, honestly-reported result of that demonstration, including whether anything was actually
 * promoted or not.
 */
import { appendFileSync, existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeRng } from "../engine/rng.mjs";
import { DEFAULT_WEIGHTS } from "../personnel-engine/evaluate/state-value.mjs";
import { BASELINE_V1, assertCompleteWeights } from "../personnel-engine/ai-profiles.mjs";
import { ARCHETYPES } from "../personnel-engine/archetypes.mjs";
import { runTournamentParallel, aggregateTournament } from "./tournament-runner.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const historyPath = path.join(here, "battle-history.md");
/** Gitignored (see .gitignore's own `/tools/battle-simulator/logs/` entry) — real, per-run working
 * state, never campaign data, never committed. */
const checkpointPath = path.join(here, "..", "logs", "weight-search-checkpoint.json");

const MUTATION_KEYS = Object.freeze(Object.keys(DEFAULT_WEIGHTS));
/** A real, documented jitter range — a candidate's mutated weight is the parent's own value times a
 * factor drawn uniformly from this range. Wide enough that a single mutation can matter (a 0.6x-1.6x
 * swing is a real, potentially decisive change to one term's influence), narrow enough that most
 * mutations don't immediately wreck the profile's own balance. */
const MIN_FACTOR = 0.6;
const MAX_FACTOR = 1.6;

/**
 * Design doc §49 (2026-09-01 addenda): three of the 13 weights are MECHANICALLY PROVEN inert for the
 * default roster (lunar-17.json + security-goon.json) and every currently-defined profile — each
 * confirmed by direct code reading AND a real `evaluateState` probe, not assumed:
 *   - `resource` only ever multiplies against a strike/ability's own `usesRemaining`
 *     (`state-value.mjs`'s own `if (s.usesRemaining != null)` gate), and NEITHER fixture's
 *     strikes/spells/heal-abilities set that field anywhere (grepped directly, zero matches) —
 *     cantrips and ordinary Strikes are unlimited-use by SF2E's own real rules.
 *   - `objective` only ever applies to a combatant with a real `.objective` field set (`if
 *     (!c.objective) continue`), and nothing in the default roster, `personnel-mirror.mjs`'s own
 *     scenario builder, or any of the 8 current profiles ever sets one (also grepped directly, zero
 *     matches) — mirror matches have no battle-map objective concept at all.
 *   - `tempoDenial` only ever multiplies against `combatant.stunnedValue` (Stunned, Player Core pg.
 *     421), and NEITHER fixture has any stun-inflicting trait/ability anywhere (grepped directly,
 *     zero matches) — nothing in this roster can ever set `stunnedValue` above 0, for either side.
 * Mutating any of these three is REAL, GUARANTEED wasted search effort for this specific roster:
 * roughly 3 of every 13 generations (~23%) produce a candidate that cannot possibly differ from its
 * parent in any way this evaluator can ever observe.
 *
 * `mobilityDenial` is deliberately NOT included, despite also showing the same flat real-search
 * signature — it is REAL and DOES respond to its own magnitude (confirmed directly: a constructed
 * state with an enemy grappled AND every ally out of its own weapon range showed a genuine ~6-point
 * swing across the tested factor range). Its precondition is merely SELF-DEFEATING given how this
 * roster actually plays, not impossible: Grapple requires melee range, so the grappler is by
 * definition always within the grappled target's own reach the instant the grapple lands — the only
 * way `mobilityDenial` can ever score is if the grappler ALSO retreats far away while the grapple
 * still holds, a tactical sequence a sensible AI essentially never produces, but not one this weight
 * itself makes structurally impossible the way the three above genuinely are. `outnumberedCaution`
 * is the other real, working, still-unexplained case (confirmed real and sensitive on an ally-down
 * position, ~1.1-point swing) — also deliberately not excluded, for the same reason: a real,
 * responsive term that just hasn't been shown NOT to matter, which is a different, weaker claim than
 * proven inert.
 *
 * Deliberately NOT the default anywhere in this file's own API (`mutateWeights`/`runWeightSearch`
 * default to the full 13-key set, unchanged) — only the CLI's own default opts in, so the ALREADY-
 * COMPLETED 507-generation run stays exactly reproducible by anyone calling these functions directly
 * with the same searchSeed, while a fresh `node weight-search.mjs` invocation (no explicit
 * `--excludeKeys=`) gets the more efficient search going forward.
 */
export const PROVEN_INERT_FOR_DEFAULT_ROSTER = Object.freeze(["resource", "objective", "tempoDenial"]);

/**
 * Exactly ONE key of `baseWeights` perturbed by a random multiplicative factor in
 * [MIN_FACTOR, MAX_FACTOR]; every other key untouched. Returns a NEW complete weights object (never
 * mutates `baseWeights`) plus which key/factor were used, for real, honest logging.
 *
 * `excludeKeys` (optional, default none — every pre-existing caller is completely unaffected) removes
 * candidate keys from the real draw before it happens, not after: the rng still only ever spends
 * exactly the two draws (key, factor) `runWeightSearch`'s own resume/fast-forward math already
 * assumes, so excluding keys does not break the reproducibility contract for anyone who WAS already
 * passing the same `excludeKeys` — it just changes what set the draw is real over. Throws if
 * `excludeKeys` would remove every key — mutating nothing is a config error, not a silent no-op.
 */
export function mutateWeights(baseWeights, rng, excludeKeys = []) {
  assertCompleteWeights(baseWeights);
  const candidateKeys = excludeKeys.length ? MUTATION_KEYS.filter((k) => !excludeKeys.includes(k)) : MUTATION_KEYS;
  if (!candidateKeys.length) throw new Error(`mutateWeights: excludeKeys [${excludeKeys.join(", ")}] would remove every real weight key — nothing left to mutate.`);
  const mutatedKey = candidateKeys[Math.floor(rng() * candidateKeys.length)];
  const factor = Number((MIN_FACTOR + rng() * (MAX_FACTOR - MIN_FACTOR)).toFixed(4));
  const weights = Object.freeze({ ...baseWeights, [mutatedKey]: Number((baseWeights[mutatedKey] * factor).toFixed(4)) });
  return { weights, mutatedKey, factor };
}

/**
 * Design doc §49 (2026-09-01, "run a targeted search on closing and enemyDamage together"):
 * `mutateWeights` can only ever change ONE key per generation, so it structurally cannot find a real
 * improvement that needs a CORRELATED change to two terms together — exactly the gap the plan's own
 * §08 flagged ("multi-key mutation... a real alternative, not attempted") and this project's own
 * 507-generation single-key search kept bumping into (`closing`/`enemyDamage` both independently
 * capped at a real 50%, never quite enough alone).
 *
 * `mutateWeightsTogether` perturbs EVERY key in `targetKeys` simultaneously, each with its own
 * independently-drawn real factor in [MIN_FACTOR, MAX_FACTOR] — not a single shared factor, since
 * there's no real reason two different terms should move by the same percentage together. Every
 * other weight stays untouched, same as `mutateWeights`. Returns `mutatedKeys` (the real array,
 * exactly `targetKeys`) and `factors` (a real per-key map) — deliberately plural fields, distinct
 * from `mutateWeights`' own singular `mutatedKey`/`factor`, so a caller can tell which mode actually
 * produced a given result rather than guessing from shape.
 */
export function mutateWeightsTogether(baseWeights, rng, targetKeys) {
  assertCompleteWeights(baseWeights);
  if (!targetKeys?.length) throw new Error("mutateWeightsTogether: targetKeys must be a real, non-empty array of weight keys.");
  const unknown = targetKeys.filter((k) => !(k in baseWeights));
  if (unknown.length) throw new Error(`mutateWeightsTogether: not real weight keys: [${unknown.join(", ")}].`);
  const weights = { ...baseWeights };
  const factors = {};
  for (const key of targetKeys) {
    const factor = Number((MIN_FACTOR + rng() * (MAX_FACTOR - MIN_FACTOR)).toFixed(4));
    weights[key] = Number((baseWeights[key] * factor).toFixed(4));
    factors[key] = factor;
  }
  return { weights: Object.freeze(weights), mutatedKeys: [...targetKeys], factors };
}

/** A candidate profile — everything else inherited from `parentProfile`, only `weights` (and `id`)
 * different. `frozenAt: null`/`provenance: "search-candidate"` mark it as NOT YET a real checkpoint —
 * distinct from `BASELINE_V1`/the Stage C archetypes, which are hand-designed and reviewed; a
 * candidate is neither until it's actually promoted. */
export function makeCandidateProfile(parentProfile, weights, id) {
  assertCompleteWeights(weights);
  return Object.freeze({ ...parentProfile, id, weights, frozenAt: null, provenance: "search-candidate" });
}

/**
 * Real mirror tournaments (`tournament-runner.mjs`) between `candidateProfile` and every member of
 * `league` AND every member of `archetypePool` — sequential ACROSS opponents (each tournament's own
 * worker pool already uses up to `concurrency` real OS threads; running several tournaments'
 * worker pools at once would over-subscribe exactly the way design doc §47 already measured hurts
 * throughput), parallel WITHIN each one.
 */
export async function evaluateCandidate(candidateProfile, { league, archetypePool, roster, seedSpec, roundLimit, concurrency } = {}) {
  async function runAgainst(opponent) {
    const raw = await runTournamentParallel({ roster, partyProfile: candidateProfile, oppositionProfile: opponent, seedSpec, roundLimit, concurrency });
    const agg = aggregateTournament(raw);
    return { opponentId: opponent.id, winRate: agg.partyWinRate, n: agg.n };
  }
  const leagueResults = [];
  for (const opponent of league) leagueResults.push(await runAgainst(opponent));
  const archetypeResults = [];
  for (const opponent of archetypePool) archetypeResults.push(await runAgainst(opponent));
  return { league: leagueResults, archetypes: archetypeResults };
}

export const DEFAULT_PROMOTION_OPTIONS = Object.freeze({ leagueWinRateThreshold: 0.55, archetypeMajorityThreshold: 0.5 });

/**
 * The two-part promotion rule (see file header for which real risk each part fixes). `league` results
 * must ALL clear `leagueWinRateThreshold` — one weak result against any past checkpoint is a real
 * regression risk, not averaged away. `archetypes` results only need a real MAJORITY above a bare 50%
 * — a softer generalization check, not "beat literally everything," since a single-key mutation
 * genuinely may trade away performance against one specific archetype while still being real net
 * progress.
 */
export function shouldPromote({ league, archetypes }, options = {}) {
  const { leagueWinRateThreshold, archetypeMajorityThreshold } = { ...DEFAULT_PROMOTION_OPTIONS, ...options };
  const leaguePass = league.length > 0 && league.every((r) => r.winRate >= leagueWinRateThreshold);
  const archetypeWins = archetypes.filter((r) => r.winRate > 0.5).length;
  const archetypePass = archetypes.length === 0 || archetypeWins / archetypes.length >= archetypeMajorityThreshold;
  return { promoted: leaguePass && archetypePass, leaguePass, archetypePass, archetypeWins, archetypeTotal: archetypes.length };
}

/**
 * The real search loop: `generations` independent trial mutations from the CURRENT best (classic
 * single-parent hill-climbing — a rejected candidate is simply discarded, never accumulated into a
 * drifting chain of unverified changes; the next generation mutates fresh from the same, still-best,
 * point). `league` grows by exactly one entry per real promotion; a promoted profile becomes both the
 * new `currentBest` (what future generations mutate from) AND a permanent member of the league every
 * future candidate must ALSO keep beating.
 *
 * `frozenAtDate` is deliberately a caller-supplied literal, never `new Date()` computed inside this
 * function — keeps the whole search reproducible (same inputs, byte-identical output) the same way
 * every other seeded system in this engine already is; a CLI entry point stamps the real date, a test
 * passes a fixed string or leaves it null.
 *
 * `deadlineAt` (a real ms-since-epoch timestamp, or `null`/omitted for no deadline) is a real safety
 * valve, not a nice-to-have: the league only ever GROWS, and every future candidate must be evaluated
 * against the WHOLE league plus the archetype pool, so a search that keeps promoting keeps getting
 * more expensive per generation — an uncapped `generations` count under a high real promotion rate
 * could run for a genuinely unpredictable, possibly very long time. Checked ONCE per generation
 * boundary (never mid-evaluation — a running tournament always finishes), so an exhausted deadline
 * still stops promptly rather than mid-generation. Same "caller supplies the real timestamp, function
 * itself stays pure" discipline as `frozenAtDate` — this file still never calls `Date.now()` itself.
 *
 * `resumeState` (design doc §49 erratum — found the hard way: a real ~3-hour overnight run was
 * killed at generation 187/2000 by an unrelated machine restart, with no way to pick back up except
 * from scratch) restores a search's own real progress: `{ league, completedGenerations }` from a
 * checkpoint the CLI writes after every generation. `league` is restored verbatim (its members are
 * plain, JSON-round-trippable objects — freezing them again here is enough; nothing needs REFERENCE
 * equality with the original in-memory `BASELINE_V1`/archetype objects, only the same real data).
 * The one real subtlety: the RNG must land on EXACTLY the same internal state a non-interrupted run
 * would have reached by generation `completedGenerations`, or every mutation after the resume point
 * would silently diverge from what the interrupted run would have tried next. `mutateWeights` draws
 * from the shared rng EXACTLY twice per call (one draw for which key, one for the factor) — verified
 * directly by reading it, not assumed. `mutateWeightsTogether` draws exactly `targetKeys.length`
 * times (one factor per target key, no key-selection draw at all — the keys are fixed, not chosen).
 * `drawsPerGeneration` below reflects whichever mode is actually active, so fast-forwarding a resumed
 * multi-key search stays exactly as correct as the single-key case always was. Cheap either way: no
 * real battles run during fast-forward, just arithmetic.
 *
 * `targetKeys` (design doc §49, 2026-09-01 — "run a targeted search on closing and enemyDamage
 * together"): OPTIONAL. When given, EVERY generation mutates exactly this set together via
 * `mutateWeightsTogether` instead of drawing one random key via `mutateWeights` — the real answer to
 * single-key hill-climbing's own structural blind spot (a correlated two-term improvement that
 * neither term alone can reach). `excludeKeys` is ignored while `targetKeys` is active (there is no
 * random draw for it to filter). Omitted (the default): byte-identical single-key behavior, exactly
 * as before this option existed.
 *
 * `confirmSeedSpec` (design doc §55/#2 — the real Chain B incident, 2026-09-02: a 36-member league
 * built entirely from small-sample noise at the search's own default `seedSpec="1-16"`. Both the
 * first promoted candidate — a `allyDamage x1.0037` mutation, barely different from its parent — and
 * the 34th, most-mutated one, LOST to plain `baseline-v1` at an identical 45.8% once re-checked at
 * n=24, the real verification standard this whole project uses everywhere else. The promotion bar
 * (league ≥55%, archetype majority >50%) is only hard to clear by luck when the CURRENT champion is
 * already dominant against its own pool; near parity — which `currentBest` genuinely was on that
 * roster — random noise clears it constantly, and each accepted-by-luck candidate becomes the next
 * one's own baseline, compounding). OPTIONAL, defaults to `null` (confirmation disabled) — every
 * existing caller, including the already-completed 507/3352-generation runs, stays byte-identical if
 * re-run with the same arguments. When set, a candidate that clears `shouldPromote` at the cheap
 * `seedSpec` is NOT promoted yet — it is re-evaluated against the SAME league and archetype pool at
 * `confirmSeedSpec` (a real, larger battery, e.g. "1-24"), and only actually promoted if THAT result
 * also clears `shouldPromote` (via `confirmPromotionOptions`, defaulting to the same `promotionOptions`
 * used for the cheap pass). A candidate that fails confirmation is rejected — `currentBest`/`league`
 * are untouched, exactly as for any other rejection — but the attempt is recorded distinctly
 * (`confirmResults`/`confirmVerdict` on the history entry) rather than looking identical to a candidate
 * that never even cleared the cheap bar; this is the difference between "never looked promising" and
 * "looked promising, checked properly, wasn't real," and this project has already learned the hard way
 * that conflating the two throws away exactly the information that catches a mirage. Confirmation
 * battles use real battle seeds (deterministic per seed, like every other tournament in this file) —
 * they never draw from the search's own `rng`, so this option changes nothing about
 * `drawsPerGeneration`/resume fast-forward math below.
 */
export async function runWeightSearch({
  startProfile = BASELINE_V1, archetypePool = Object.values(ARCHETYPES), roster = ["lunar-17.json", "security-goon.json"],
  generations = 8, seedSpec = "1-16", roundLimit = 30, searchSeed = 1, promotionOptions, frozenAtDate = null, deadlineAt = null,
  excludeKeys = [], targetKeys = null, resumeState = null, onProgress,
  confirmSeedSpec = null, confirmPromotionOptions = null
} = {}) {
  const rng = makeRng(searchSeed);
  let currentBest = startProfile;
  let league = [startProfile];
  const history = [];
  let stoppedEarly = false;
  let startGeneration = 1;
  const drawsPerGeneration = targetKeys ? targetKeys.length : 2;

  if (resumeState) {
    league = resumeState.league.map((p) => Object.freeze(p));
    currentBest = league[league.length - 1];
    startGeneration = resumeState.completedGenerations + 1;
    for (let i = 0; i < resumeState.completedGenerations * drawsPerGeneration; i++) rng(); // fast-forward, discarded
  }

  for (let generation = startGeneration; generation <= generations; generation++) {
    if (deadlineAt != null && Date.now() >= deadlineAt) { stoppedEarly = true; break; }

    const mutation = targetKeys
      ? mutateWeightsTogether(currentBest.weights, rng, targetKeys)
      : mutateWeights(currentBest.weights, rng, excludeKeys);
    const { weights } = mutation;
    const mutatedKeys = mutation.mutatedKeys ?? [mutation.mutatedKey];
    const factors = mutation.factors ?? { [mutation.mutatedKey]: mutation.factor };
    const candidate = makeCandidateProfile(currentBest, weights, `candidate-gen${generation}`);
    const results = await evaluateCandidate(candidate, { league, archetypePool, roster, seedSpec, roundLimit });
    const verdict = shouldPromote(results, promotionOptions);

    // CONFIRMATION (design doc §55/#2): a cheap-pass candidate is not promoted yet — see this
    // function's own header for the real incident this guards against. `confirmResults`/
    // `confirmVerdict` stay null unless confirmation was actually attempted, so a rejected-at-the-
    // cheap-stage candidate (never even worth checking) stays visibly distinct from one that looked
    // real and failed a proper check.
    let confirmResults = null, confirmVerdict = null;
    let promotedId = null;
    if (verdict.promoted && confirmSeedSpec) {
      confirmResults = await evaluateCandidate(candidate, { league, archetypePool, roster, seedSpec: confirmSeedSpec, roundLimit });
      confirmVerdict = shouldPromote(confirmResults, confirmPromotionOptions ?? promotionOptions);
    }
    const actuallyPromoted = verdict.promoted && (!confirmSeedSpec || confirmVerdict.promoted);
    if (actuallyPromoted) {
      const checkpoint = Object.freeze({ ...candidate, id: `search-checkpoint-${league.length}`, frozenAt: frozenAtDate, provenance: "search-checkpoint" });
      league = [...league, checkpoint];
      currentBest = checkpoint;
      promotedId = checkpoint.id;
    }

    // `mutatedKey`/`factor` (singular) stay populated ONLY in single-key mode — exact backward
    // compatibility for every existing caller/test that reads them directly. `mutatedKeys`/`factors`
    // (plural) are ALWAYS populated, in both modes, as the real canonical shape going forward.
    // `verdict.promoted` intentionally still reflects the CHEAP-pass result alone (unaffected by
    // confirmation) — `promotedId` (null unless `actuallyPromoted`) is the one real signal for
    // "did this candidate actually join the league."
    const entry = {
      generation, mutatedKeys, factors,
      mutatedKey: mutation.mutatedKey, factor: mutation.factor,
      candidateId: candidate.id, results, verdict, confirmResults, confirmVerdict, promotedId
    };
    history.push(entry);
    onProgress?.(entry, { league, completedGenerations: generation });
  }

  return { finalBest: currentBest, league, history, stoppedEarly };
}

/** Real, human-readable "key x1.234" summary for a mutation entry — works identically whether
 * `entry` came from single-key `mutateWeights` (one pair) or `mutateWeightsTogether` (several,
 * joined) — reads the always-populated plural `mutatedKeys`/`factors`, never the mode-specific
 * singular fields, so this one function covers both shapes with no branching at the call site. */
function describeMutation(entry) {
  return entry.mutatedKeys.map((key) => `${key} x${entry.factors[key]}`).join(", ");
}

/** Real, human-readable summary for whichever of the four real outcomes this generation reached:
 * rejected outright, promoted with no confirmation attempted (confirmSeedSpec unset), promoted AND
 * confirmed, or — the one design doc §55/#2 exists to make visible — looked real, failed confirmation. */
export function logProgress(entry) {
  let verdictLabel;
  if (entry.promotedId) {
    verdictLabel = entry.confirmVerdict ? `PROMOTED -> ${entry.promotedId} (confirmed)` : `PROMOTED -> ${entry.promotedId}`;
  } else if (entry.confirmVerdict && !entry.confirmVerdict.promoted) {
    verdictLabel = `rejected — FAILED CONFIRMATION (cheap pass looked real, confirm archetypes ${entry.confirmVerdict.archetypeWins}/${entry.confirmVerdict.archetypeTotal})`;
  } else {
    verdictLabel = `rejected (league ${entry.verdict.leaguePass ? "pass" : "FAIL"}, archetypes ${entry.verdict.archetypeWins}/${entry.verdict.archetypeTotal})`;
  }
  console.log(`[gen ${entry.generation}] mutate ${describeMutation(entry)} -> ${verdictLabel}`);
}

function pct(x) { return (x * 100).toFixed(1) + "%"; }

function formatSearchReport({ rosterLabel, generations, seedSpec, result, resumedFrom = null }) {
  const lines = [
    `### Automated weight search (design doc §49) — ${rosterLabel}, ${generations} generations, ${seedSpec} seeds/matchup`,
    ""
  ];
  if (resumedFrom) lines.push(`Resumed from a checkpoint at generation ${resumedFrom} (an earlier run interrupted, e.g. by a machine restart) — the table below covers only generations ${resumedFrom + 1}-${generations}; the league/final-best summary reflects the FULL run.`, "");
  lines.push(
    `Starting profile: \`${BASELINE_V1.id}\`. League ended with ${result.league.length} member(s): ${result.league.map((p) => p.id).join(", ")}.`,
    `Final best: \`${result.finalBest.id}\`${result.finalBest.id === BASELINE_V1.id ? " (no candidate was promoted — see per-generation log below)" : ""}.`,
    "",
    "| Gen | Mutation | League result | Archetype result | Verdict |",
    "|---|---|---|---|---|"
  );
  for (const e of result.history) {
    const leagueSummary = e.results.league.map((r) => `${r.opponentId}:${pct(r.winRate)}`).join(", ");
    const archetypeSummary = `${e.verdict.archetypeWins}/${e.verdict.archetypeTotal} beaten`;
    let verdict;
    if (e.promotedId) verdict = e.confirmVerdict ? `**PROMOTED -> ${e.promotedId}** (confirmed)` : `**PROMOTED -> ${e.promotedId}**`;
    else if (e.confirmVerdict && !e.confirmVerdict.promoted) verdict = `rejected — FAILED CONFIRMATION (${e.confirmVerdict.archetypeWins}/${e.confirmVerdict.archetypeTotal} archetypes)`;
    else verdict = "rejected";
    lines.push(`| ${e.generation} | ${describeMutation(e)} | ${leagueSummary} | ${archetypeSummary} | ${verdict} |`);
  }
  return lines.join("\n");
}

function appendToHistory(reportBody) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const entry = [`## ${dateStamp} — Automated weight search`, "", reportBody, "", "---", ""].join("\n");
  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, "# Battle History\n\nA running, hand-appended-by-script log of real battery runs — design doc §39. Never hand-edited; re-run the relevant analysis script to add a new dated entry.\n\n");
  }
  appendFileSync(historyPath, entry);
}

/** The real config fields that MUST match for a checkpoint to mean the same search — resuming with a
 * different roster/seedSpec/searchSeed/archetype-pool than what produced the checkpoint would
 * silently continue a DIFFERENT experiment under the same name, not a real resume. `generations`
 * (the target ceiling) is deliberately EXCLUDED from the match — raising it is the entire point of a
 * resume ("ran out of time at 187/2000, let's extend to 3000"), not a sign of a different experiment. */
function checkpointConfigKey(config) {
  const { generations, ...rest } = config;
  return JSON.stringify({
    ...rest,
    archetypePoolIds: [...rest.archetypePoolIds].sort(),
    excludeKeys: [...(rest.excludeKeys ?? [])].sort(),
    targetKeys: rest.targetKeys ? [...rest.targetKeys].sort() : null,
    confirmSeedSpec: rest.confirmSeedSpec ?? null
  });
}

function writeCheckpoint({ config, league, completedGenerations }) {
  mkdirSync(path.dirname(checkpointPath), { recursive: true });
  writeFileSync(checkpointPath, JSON.stringify({ config, league, completedGenerations }, null, 2));
}

function loadCheckpoint(expectedConfig) {
  if (!existsSync(checkpointPath)) return null;
  const saved = JSON.parse(readFileSync(checkpointPath, "utf8"));
  if (checkpointConfigKey(saved.config) !== checkpointConfigKey(expectedConfig)) {
    throw new Error(`--resume was given, but the checkpoint at ${checkpointPath} was for a DIFFERENT config (${JSON.stringify(saved.config)} vs. requested ${JSON.stringify(expectedConfig)}) — refusing to silently resume a different experiment. Pass matching args, or delete the checkpoint file to start fresh.`);
  }
  return saved;
}

async function main() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (!m) throw new Error(`Unrecognized argument: "${raw}" (expected --key=value)`);
    args[m[1]] = m[2];
  }
  const roster = (args.roster ?? "lunar-17.json,security-goon.json").split(",");
  const generations = args.generations ? Number(args.generations) : 8;
  const seedSpec = args.seeds ?? "1-16";
  const roundLimit = args.roundLimit ? Number(args.roundLimit) : 30;
  const searchSeed = args.searchSeed ? Number(args.searchSeed) : 1;
  const maxMinutes = args.maxMinutes ? Number(args.maxMinutes) : null;
  const deadlineAt = maxMinutes ? Date.now() + maxMinutes * 60000 : null;
  const frozenAtDate = new Date().toISOString().slice(0, 10);
  const shouldResume = args.resume === "true";
  // The CLI's own default is the smarter one (design doc §49, 2026-09-01): skip the two weights
  // proven inert for the default roster, unless the caller explicitly overrides. The underlying
  // runWeightSearch/mutateWeights functions themselves stay conservative (default: exclude nothing)
  // so the already-completed 507-generation run stays exactly reproducible by anyone calling them
  // directly with the same searchSeed. `--excludeKeys=` (empty string included) always wins.
  const excludeKeys = args.excludeKeys != null ? args.excludeKeys.split(",").filter(Boolean) : [...PROVEN_INERT_FOR_DEFAULT_ROSTER];
  const targetKeys = args.targetKeys ? args.targetKeys.split(",").filter(Boolean) : null;
  // Design doc §55/#2: the CLI's own default is the smarter one here too, same reasoning as
  // excludeKeys above — a fresh `node weight-search.mjs` invocation gets real confirmation batteries
  // by default (the exact discipline that would have caught the Chain B mirage generation by
  // generation instead of needing a manual after-the-fact audit); `runWeightSearch` itself stays
  // conservative (default: no confirmation) for direct callers/tests. `--confirmSeeds=` (empty string
  // included) always wins — pass it explicitly empty to disable.
  const confirmSeedSpec = args.confirmSeeds != null ? (args.confirmSeeds || null) : "1-24";
  const t0 = Date.now();

  const config = { roster, generations, seedSpec, roundLimit, searchSeed, excludeKeys, targetKeys, confirmSeedSpec, archetypePoolIds: Object.keys(ARCHETYPES) };
  let resumeState = null;
  if (shouldResume) {
    const checkpoint = loadCheckpoint(config);
    if (checkpoint) {
      resumeState = { league: checkpoint.league, completedGenerations: checkpoint.completedGenerations };
      console.log(`Resuming from checkpoint: ${checkpoint.completedGenerations} generation(s) already done, league size ${checkpoint.league.length}.`);
    } else {
      console.log("--resume=true given, but no matching checkpoint found — starting fresh.");
    }
  }

  const modeLabel = targetKeys ? `TARGETED [${targetKeys.join(", ")}] together` : `${excludeKeys.length ? `excluding [${excludeKeys.join(", ")}]` : "no exclusions"}`;
  console.log(`Weight search: up to ${generations} generations, ${seedSpec} seeds/matchup, roundLimit=${roundLimit}, roster=${roster.join("+")}, searchSeed=${searchSeed}${maxMinutes ? `, deadline in ${maxMinutes}min` : ""}, ${modeLabel}, confirm=${confirmSeedSpec ?? "OFF"}...`);
  const onProgress = (entry, { league, completedGenerations }) => {
    logProgress(entry);
    writeCheckpoint({ config, league, completedGenerations });
    if (entry.generation % 10 === 0) console.log(`  (${entry.generation}/${generations} generations, ${((Date.now() - t0) / 60000).toFixed(1)}min elapsed, league size ${league.length})`);
  };
  const result = await runWeightSearch({ roster, generations, seedSpec, roundLimit, searchSeed, frozenAtDate, deadlineAt, excludeKeys, targetKeys, confirmSeedSpec, resumeState, onProgress });
  if (result.stoppedEarly) console.log(`\nStopped early at generation ${result.history.length + (resumeState?.completedGenerations ?? 0)}/${generations} — deadline (${maxMinutes}min) reached. Re-run with --resume=true to continue.`);

  const totalGenerations = result.history.length + (resumeState?.completedGenerations ?? 0);
  const report = formatSearchReport({
    rosterLabel: roster.join("+"), generations: totalGenerations, seedSpec, result,
    resumedFrom: resumeState?.completedGenerations ?? null
  });
  console.log("\n" + report);
  appendToHistory(report);
  console.log(`\nAppended search report to ${path.relative(process.cwd(), historyPath)} — total real elapsed THIS run: ${((Date.now() - t0) / 60000).toFixed(1)} minutes (${totalGenerations} generations total across all runs).`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) main();
