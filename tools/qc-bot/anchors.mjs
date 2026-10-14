/**
 * The direction lock (design/qc-bot.md, "Options, not direction").
 *
 * Ingram's brief for the QC bot: improve the quality of a scene's options "without trying to change the direction of
 * it". A script cannot tell whether a rewritten sentence means the same thing, but it can tell whether the scene's
 * SHAPE moved: what it is for, who is there, which beats exist and in what order, which are mandatory, what each cites,
 * what the players are told, how it ends and where it leads. Those are the anchors. A patch that changes one is not an
 * improvement of options; it is a different scene, and only Ingram makes that call, so the bot may raise it as a
 * question and never as a change.
 *
 * What stays free for the bot to propose (always with the before and after shown to Ingram): read-aloud and GM-facing
 * wording, a check's routes and its per-skill lines, per-degree results, twists, reaction prompts, a cast member's
 * brief, handout wording, and the scene's notes. Results and read-aloud carry meaning, which no script can verify, so a
 * proposal touching them says so in its own words (`touchesMeaning`) and Ingram decides.
 *
 * Pure: pass two parsed documents, get the differences.
 */
import { stable } from "./lib.mjs";

const pick = (o, keys) => {
  const out = {};
  for (const k of keys) if (o && o[k] !== undefined) out[k] = o[k];
  return out;
};

const BEAT_ANCHORS = ["id", "kind", "mandatory", "delivery", "npcRef", "challengeRef", "checkRef", "encounterRef", "subsystemRef", "handoutRef", "facts", "gmFacts", "triggers"];
const CAST_ANCHORS = ["id", "npcRef", "role", "arrival"];

/** The parts of a scene a QC patch must leave exactly as they are. */
export function sceneAnchors(s) {
  const out = {
    id: s.id,
    episodeRef: s.episodeRef,
    sceneRef: s.sceneRef,
    title: s.title,
    goal: s.goal,
    howToPlay: s.howToPlay,
    runsAbout: s.runsAbout,
    mode: s.mode,
    intro: pick(s.intro, ["position", "carriesIn"]),
    cast: (s.cast ?? []).map((c) => pick(c, CAST_ANCHORS)),
    beats: (s.beats ?? []).map((b) => pick(b, BEAT_ANCHORS)),
    handouts: (s.handouts ?? []).map((h) => ({ id: h.id })),
    artefacts: s.artefacts,
    outro: pick(s.outro, ["endsWhen", "transition", "onwards", "writeDown", "position", "tracks", "artefactRefs"]),
    carryForward: s.carryForward,
  };
  // A haunt is a menu of events rather than a run of beats: its events, their kinds and what they shift are its shape.
  if (s.events !== undefined || s.haunt !== undefined) {
    out.events = (s.events ?? []).map((e) => pick(e, ["id", "kind", "shifts", "regular"]));
    out.haunt = s.haunt;
    out.rest = s.rest;
    out.spectrum = s.spectrum;
  }
  return out;
}

/** The parts of a check file a QC patch must leave exactly as they are. Routes and per-skill lines are NOT among them. */
export function challengeAnchors(c) {
  return {
    id: c.id,
    levelContext: c.levelContext,
    resolutionMode: c.resolutionMode,
    participants: c.participants,
    relatedRefs: c.relatedRefs,
    checks: (c.checks ?? []).map((k) => pick(k, ["id", "dc", "insight", "secret", "repeatable", "anySkill"])),
  };
}

const idOf = (item, i) => (item && typeof item === "object" && item.id ? item.id : `#${i + 1}`);

/** Every leaf where two projections differ, with a readable path. A list that changes length is reported whole. */
function diffValues(a, b, at = "") {
  if (stable(a) === stable(b)) return [];
  const bothObjects = a && b && typeof a === "object" && typeof b === "object";
  if (!bothObjects || Array.isArray(a) !== Array.isArray(b)) return [{ path: at || "(file)", before: a, after: b }];
  if (Array.isArray(a)) {
    if (a.length !== b.length) return [{ path: at || "(file)", before: a, after: b }];
    return a.flatMap((item, i) => diffValues(item, b[i], `${at}[${idOf(item, i)}]`));
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].flatMap((k) => diffValues(a[k], b[k], at ? `${at}.${k}` : k));
}

/**
 * What a patch changed that it may not have changed. Empty means the direction is intact.
 * Routes may only be added to, never taken away from: a check's `skillOptions` and the keys of its `bySkill` must still
 * hold everything they held before.
 */
export function anchorViolations(kind, before, after) {
  if (kind === "scene") return diffValues(sceneAnchors(before), sceneAnchors(after));
  if (kind !== "challenge") return [];
  const out = diffValues(challengeAnchors(before), challengeAnchors(after));
  const afterById = new Map((after.checks ?? []).map((k) => [k.id, k]));
  for (const k of before.checks ?? []) {
    const next = afterById.get(k.id);
    if (!next) continue;
    const lost = (k.skillOptions ?? []).filter((s) => !(next.skillOptions ?? []).includes(s));
    if (lost.length) out.push({ path: `checks[${k.id}].skillOptions`, before: k.skillOptions, after: next.skillOptions, why: `takes away ${lost.join(", ")}` });
    const lostKeys = Object.keys(k.bySkill ?? {}).filter((s) => !(s in (next.bySkill ?? {})));
    if (lostKeys.length) out.push({ path: `checks[${k.id}].bySkill`, before: Object.keys(k.bySkill), after: Object.keys(next.bySkill ?? {}), why: `takes away the line for ${lostKeys.join(", ")}` });
  }
  return out;
}

/** One sentence per violation, for reports and error messages. */
export function describeViolation(v) {
  return `${v.path}${v.why ? ` (${v.why})` : " changed"}`;
}
