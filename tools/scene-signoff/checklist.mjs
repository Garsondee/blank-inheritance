/**
 * The mechanically decidable third of data/campaign/signoff-checklist.json.
 *
 * Pure: takes a scene bundle from corpus.mjs plus the corpus itself, touches
 * no disk and no globals. Every function here is named by a check's `auto`
 * field, so a check and its evaluator cannot drift apart silently -- a check
 * naming an evaluator that does not exist is itself a test failure
 * (test/tier1-signoff.test.mjs).
 *
 * The other two thirds have `auto: null` and are answered by reading, in the
 * pass output. That is not a softer standard; it is an honest one. A check
 * like "does every NPC line sound like something a person would say out loud"
 * has no mechanical form, and faking one would produce exactly the situation
 * design/scene-audit.md warns about: a clean report that is not evidence the
 * scene is any good.
 */

import { positionAt, metresBetween } from "./travel.mjs";

const CUT_SYSTEMS = Object.freeze([
  // All five cut 2026-09-20 (project_systems_flagged_for_rework). Matched on
  // the CAPITALISED proper-noun form on purpose: in this campaign these are
  // the names of systems, and the lowercase words are ordinary English that
  // legitimately appears in a scene. The first version of this check matched
  // case-insensitively and immediately fired on "a player who sits through it
  // can stop bleeding" -- literal first aid in School: Second Period -- which
  // is exactly the kind of false positive that teaches a reviewer to skim past
  // a whole category of finding.
  { name: "Resonance", rx: /\bResonance\b/ },
  { name: "Bleed", rx: /\bBleed\b/ },
  { name: "Anchor", rx: /\bAnchors?\b|\bAnchor Time\b/ },
  { name: "Suppression", rx: /\bSuppression\b/ },
  { name: "ground roles", rx: /\bground roles?\b/i }
]);

// A mention that DISCLAIMS a system is not a dependency on one, and the
// corpus is full of those -- Kit Issue's notes say "no ground roles, all of
// that is Episode Two's business" and The Board's say "Resonance and Anchors
// are both cut; those two are dead text". Both are the writing working
// correctly. Evaluated per sentence rather than per field so that one
// disclaimer in a long note cannot excuse a real dependency elsewhere in it.
const CUT_CONTEXT_OK = /\b(?:cut|removed|retired|deleted|dead|no longer|superseded|formerly|used to|dropped|replaced|under review|do not offer|disregard|ignore|no|none|nothing|never|not|without|pending)\b/i;

const sentencesOf = (text) =>
  String(text ?? "")
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

const KNOWN_ATTRACTORS = Object.freeze([
  // Only constructions actually measured as attractors in this corpus.
  // Deliberately NOT a list of things that sound like writing tics: the first
  // version included "the kind of X that Y" and "less X than Y", which are
  // ordinary English, and it fired twice on The Tram Back for sentences that
  // were fine. A pattern that flags good writing gets the whole check turned
  // off (design/gm-facing-prose-style.md §8c).
  { label: '"not X so much as Y"', rx: /\bnot\b[^.!?]{1,40}\bso much as\b/i },
  { label: '"which is its own"', rx: /\bwhich is its own\b/i }
  // Tried and removed the same day: /\b(\w{5,}), and \1\b/ for immediate word
  // repetition. It caught Nobu's "sign there, there, and--", which is
  // deliberate comic rhythm, and two legitimate uses of anadiplosis. The
  // pattern was flagging a device, not a tic.
]);

/**
 * Notes-based exemptions, for RECOMMENDED checks only (added v2, 2026-09-22).
 *
 * design/scene-audit.md §8 already established this convention: when the answer
 * to a finding is "correct as written", say so in the scene's own notes using
 * the word the audit uses, and the audit stops raising it. The Sign-Off's first
 * dry run flagged The Road In's missing landmark and missing track movement
 * even though its notes say, in words, "NO LANDMARK AND NO TRACK MOVEMENT, BOTH
 * CORRECT... A future audit flagging either of these should read this note and
 * move on." Two mechanisms for one job is the duplication this repo is already
 * in a crisis about, so the older convention wins.
 *
 * A REQUIRED check still needs an explicit `waive` on the record. The harder
 * gate is the point: a keyword in prose is cheap, and cheap is right for an
 * offer and wrong for a requirement.
 */
const NOTE_EXEMPTIONS = Object.freeze({
  M14: /\blandmark\b/i,
  M15: /\bcarries?[-\s]?in\b/i,
  M16: /\bhold(?:ing)?[-\s]in[-\s]reserve\b|\bin reserve\b/i,
  M17: /\bartefacts?\b|\bartifacts?\b/i,
  M18: /\btracks?\b/i,
  M19: /\boffers?\b/i,
  M20: /\bmodifiers?\b/i,
  M24: /\bhorizons?\b|\bconsequences?\b/i,
  P6: /\bdepth\b/i
});

// The keyword alone is not enough: a note saying "we should add a landmark here"
// must not exempt the missing landmark. The same sentence has to also read as a
// deliberate decision.
const DELIBERATE = /\b(?:no|none|nothing|not|never|deliberate(?:ly)?|on purpose|correct|intentional(?:ly)?|by design|absent|omitted)\b/i;

// A chapter number sitting next to payoff language. This is the one prose/Node
// collision this project has actually had: The Road In's own beat claimed "pays
// off Ch5" while the Ledger's payoff column had been cleared (found live
// 2026-09-19, design/node-registry.md §11 Bug A). Which chapter pays a plant off
// is the Node's fact to hold, so naming it here is a duplicate by construction.
const PAYOFF_CHAPTER = /\b(?:pays?(?: it)? off|payoff|resolves?|lands?)\b[^.!?]{0,40}\bch(?:apter)?\.?\s*\d/i;

// A SPECIFIC long-horizon fact stated in prose: a numbered Ledger entry or a
// numbered plant. That number is the Node's own identity, so writing it here
// makes a second copy of the thing the Node owns, and the copies drift. This is
// the hard error.
const NAMED_LEDGER_ENTRY = /\b(?:mystery\s+)?ledger\s*(?:entry|plant)?\s*#?\s*\d+|\bplant\s*#\s*\d+/i;

// GENERIC plant language with no Node -- "PLANT, do not resolve", "seeds the
// consequence", "foreshadows". Worth a prompt, not a block: the plant may be
// real and simply not have earned a Node yet, which is an authoring decision
// rather than a defect.
const PLANT_LANGUAGE = /\bPLANT\b|\bplanted\b|foreshadow\w*|\bseeds?\b/;

// Negation has to attach to the PLANT-ness, not to the resolution. "not a
// planted clue" and "Nothing in this scene foreshadows anything" are the prose
// working correctly; "PLANT, do not resolve" asserts a plant and denies only its
// resolution, and must stay a finding. Both shapes were in the corpus on the
// first run of this check, which is how the distinction got noticed.
// Window widened from 3 words to 12 on 2026-09-22. The Letter's note says
// "Don't build a future beat that treats this line as foreshadowing something
// specific" -- nine words between the negation and the plant word, which a
// 3-word and then an 8-word window both missed, flagging a sentence whose whole
// job is to deny the thing being flagged. Widening the window BEFORE the plant
// word stays safe for "PLANT, do not resolve", where the negation sits after it
// and so never matches at any window size.
const NOT_A_PLANT = /\b(?:not|never|nothing|no|don'?t)\b(?:\s+\w+){0,12}\s+(?:a\s+|any\s+)?(?:plant\w*|foreshadow\w*|seed\w*|ledger)/i;

// An authored, explicit instruction that a beat is NOT planting something, plus
// the shapes a CORRECTION takes. Both needed after the Gen 1 Frame fix: the
// beat's note now explains at length why it must not plant Mystery Ledger #11,
// and M23 read the explanation as the offence. A check that fires on the note
// recording its own past finding is worse than useless -- it punishes writing
// the reason down, which is the thing the process most wants.
const PLANT_DISCLAIMED = /\bdo(?:es)?\s+not\s+plant\b|\bdon'?t\s+plant\b|\bnot\s+a\s+plant\b|\bis\s+not\s+a\s+plant\b|\bno\s+longer\s+plants?\b/i;
const CORRECTION_FRAMING = /\bearlier draft\b|\bwas wrong\b|\bcorrected\b|\bremoved\b|\bused to\b|\bno longer\b|\bpreviously\b|\bcaught it\b|\bmistake\b/i;

const ok = (detail = "") => ({ ok: true, detail });
const no = (detail) => ({ ok: false, detail });

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

/**
 * The words that open a scene at the table: `intro.readAloud`, or the first beat's `readAloud` when the opening IS that beat's speech.
 * The house style says each thing once, where it is used (design/gm-facing-prose-style.md, R27), so a scene whose first beat is the
 * speech (Scene 0's, which is nothing else) must not be asked to copy it into the intro as well. Found by the first episode confidence
 * run (2026-10-07): M2 and M10 failed Scene 0 for "no readAloud" while it held seven spoken beats, and Ingram's note on the finding
 * was "the scene contains lots of spoken aloud text".
 */
function openerOf(brief) {
  if (nonEmpty(brief?.intro?.readAloud)) return brief.intro.readAloud;
  const first = (brief?.beats ?? [])[0];
  return nonEmpty(first?.readAloud) ? first.readAloud : null;
}

/** A check that offers any skill the player names (`anySkill: true`) has declared its skill: the player's approach picks it. */
const checkHasSkill = (check) => check?.anySkill === true || (check?.skillOptions ?? []).length > 0;

export const MIN_EXCEPTION_WHY = 20;

/**
 * AUTHORED EXCEPTIONS. A scene brief may carry `exceptions: [{ check, why }]`: this check does not apply to this scene, and here is
 * the reason. Ingram, 2026-10-06, grading the first episode confidence run: "there has to be the ability to make intelligent
 * exceptions to some rules" (the opening scene has no rolls and no cast; a relax beat has no skill check; a scene can have no place).
 * Before this, the only ways to say so were a `waive` written by the sealing review (seal.mjs) or a sentence in the notes matched by
 * a regex, neither of which an author can write where the scene is. An exception is a DECISION, not a suppression: it shows on the
 * board and in the report with its reason (state `excepted`), it is never silent, and one with no reason, or naming no real check,
 * is itself a failing result (X1).
 * @returns {{ byCheck: Map<string,string>, problems: string[] }}
 */
export function exceptionsOf(brief, checks = []) {
  const byCheck = new Map();
  const problems = [];
  const ids = new Set(checks.map((c) => c.id));
  for (const e of brief?.exceptions ?? []) {
    if (!e || typeof e.check !== "string") { problems.push("an exception names no check"); continue; }
    if (ids.size && !ids.has(e.check)) { problems.push(`${e.check}: no such check`); continue; }
    if (!nonEmpty(e.why) || e.why.trim().length < MIN_EXCEPTION_WHY) { problems.push(`${e.check}: the reason is missing or under ${MIN_EXCEPTION_WHY} characters`); continue; }
    byCheck.set(e.check, e.why.trim());
  }
  return { byCheck, problems };
}
const speaking = (member) => !member.walkOn;

/**
 * The consequence radar (Ingram, 2026-09-22): what this scene leaves behind, at
 * each of three horizons, read from the fields that already exist rather than
 * from a new one.
 *
 *   short   what the GM records tonight        -> outro.writeDown
 *   medium  what lands in a few episodes       -> offers + tracks with a delta + carryForward
 *   long    a campaign-scale plant             -> the canon facts a beat's GM notes rely on (gmFacts), plus the
 *                                                 legacy nodeRefs of the old drafts (the node registry is frozen, D079)
 *
 * `carryForward` and `outro.writeDown` carried word-for-word identical purpose
 * clauses in the schema until this was written, and were used 2 and 26 times
 * respectively. Splitting them by horizon gives the radar two real homes and
 * keeps both fields, rather than deleting the near-unused one.
 */
export function horizonsOf(bundle) {
  const b = bundle.brief ?? {};
  const outro = b.outro ?? {};
  const long = new Set(b.nodeRefs ?? []);
  for (const beat of b.beats ?? []) {
    for (const n of beat.nodeRefs ?? []) long.add(n);
    // A fact the GM relies on but the table is not told here is held back for later: that is the long horizon.
    for (const f of beat.gmFacts ?? []) long.add(f);
  }
  return {
    short: (outro.writeDown ?? []).length,
    medium:
      (b.offers ?? []).length +
      (outro.tracks ?? []).filter((t) => t.delta !== null && t.delta !== undefined).length +
      (b.carryForward ?? []).length,
    long: [...long]
  };
}

/**
 * What holds a plant: a canon fact the beat cites (canon/README.md: a plant is a fact, with `payoff:` and `told:`; D070,
 * D079), or, for the old drafts, a nodeRef. Either one has a status and a home; prose alone does not.
 */
const holdsPlant = (beat) => (beat.facts ?? []).length > 0 || (beat.gmFacts ?? []).length > 0 || (beat.nodeRefs ?? []).length > 0;

/** Every authored prose string on a scene, for the checks that scan text. */
function proseOf(brief) {
  if (!brief) return [];
  const out = [];
  const push = (v) => { if (nonEmpty(v)) out.push(v); };
  push(brief.summary); push(brief.goal); push(brief.howToPlay);
  for (const k of ["where", "firstThing", "readAloud", "landmark", "holdInReserve"]) push(brief.intro?.[k]);
  for (const k of ["endsWhen", "onwards"]) push(brief.outro?.[k]);
  push(brief.outro?.transition?.line);
  for (const beat of brief.beats ?? []) { push(beat.text); push(beat.readAloud); push(beat.direction); }
  for (const member of brief.cast ?? []) {
    push(member.brief?.wants); push(member.brief?.opensWith);
    for (const s of member.brief?.voice?.samples ?? []) push(s);
  }
  for (const t of brief.temptations ?? []) push(t.text);
  return out;
}

/** The read-aloud text specifically -- what reaches a player's ears verbatim. */
function readAloudOf(brief) {
  if (!brief) return [];
  const out = [];
  if (nonEmpty(brief.intro?.readAloud)) out.push(brief.intro.readAloud);
  for (const beat of brief.beats ?? []) if (nonEmpty(beat.readAloud)) out.push(beat.readAloud);
  return out;
}

function challengesFor(bundle, corpus) {
  const ids = new Set([
    ...(bundle.scene.challengeRefs ?? []),
    ...(bundle.brief?.beats ?? []).map((b) => b.challengeRef).filter(Boolean)
  ]);
  return [...ids].map((id) => ({ id, challenge: corpus.challenges[id] ?? null }));
}

function skillsFor(bundle, corpus) {
  const skills = new Set();
  for (const { challenge } of challengesFor(bundle, corpus)) {
    for (const check of challenge?.checks ?? []) {
      for (const s of check.skillOptions ?? []) skills.add(String(s).toLowerCase());
    }
  }
  return skills;
}

/**
 * APPLICABILITY -- whether a check is relevant to this scene at all, which is a
 * different question from whether the scene passes it.
 *
 * Added after the second dry run (The Road In, 2026-09-22) found 7 of 63 checks
 * unanswerable for a six-spotlight montage with no NPCs: four about NPC voice
 * and wants, two about returning to earlier play, one about a decision point the
 * scene does not contain. A manual check had no way to say so, which left a
 * reviewer two bad options -- invent an answer, or skip it silently, the second
 * being indistinguishable from having forgotten it.
 *
 * Deciding these structurally, once, beats hand-marking every montage and every
 * relax beat. A case these cannot reach is recorded per scene instead, on the
 * review record's `notApplicable` list, which is NOT the same thing as a waiver:
 * a waiver says "this applies and I am declining it", n/a says "this cannot
 * apply here". Only the first is a decision worth seeing on a board.
 */
export const APPLICABILITY = {
  hasSpeakingCast(b) {
    const speakers = (b.brief?.cast ?? []).filter(speaking);
    return speakers.length > 0 ? true : "the scene has no speaking cast";
  },
  notTheFirstScene(b, corpus, { allScenes = [] } = {}) {
    if (!allScenes.length) return true;
    return allScenes[0]?.key === b.key ? "this is the first scene in play order -- there is no earlier play to draw on" : true;
  },
  hasChoicePoint(b) {
    const beats = b.brief?.beats ?? [];
    const any = beats.some((beat) => beat.choicePoint) || (b.brief?.temptations ?? []).some((t) => t.choicePoint);
    return any ? true : "the scene contains no decision point -- it asks questions rather than putting a choice";
  },
  beatsAreSequential(b) {
    // A mandatory beat delivered `each` is a round-the-table spotlight: the
    // beats run in parallel across six players, not in causal sequence, so
    // "does each beat happen because of the one before" has no answer.
    const parallel = (b.brief?.beats ?? []).some((beat) => beat.mandatory && beat.delivery === "each");
    return parallel ? "the scene is a round-the-table montage -- its beats run in parallel, not in sequence" : true;
  }
};

export const EVALUATORS = {
  // ---- Completeness, required -------------------------------------------
  coreFields(b) {
    const missing = ["goal", "howToPlay", "runsAbout", "mode"].filter((k) => !nonEmpty(b.brief?.[k]));
    return missing.length ? no(`missing: ${missing.join(", ")}`) : ok("all four present");
  },
  introFields(b) {
    const missing = [];
    if (!nonEmpty(b.brief?.intro?.where)) missing.push("where");
    if (!openerOf(b.brief)) missing.push("words to open on (intro.readAloud, or readAloud on the first beat)");
    return missing.length ? no(`intro missing: ${missing.join(", ")}`) : ok();
  },
  outroFields(b) {
    const missing = [];
    if (!nonEmpty(b.brief?.outro?.endsWhen)) missing.push("endsWhen");
    if (!nonEmpty(b.brief?.outro?.transition?.line) && !nonEmpty(b.brief?.outro?.transition?.mechanism)) missing.push("transition");
    if (!nonEmpty(b.brief?.outro?.onwards)) missing.push("onwards");
    return missing.length ? no(`outro missing: ${missing.join(", ")}`) : ok();
  },
  mandatoryBeat(b) {
    const n = (b.brief?.beats ?? []).filter((x) => x.mandatory).length;
    return n > 0 ? ok(`${n} mandatory of ${(b.brief?.beats ?? []).length}`) : no("no beat is marked mandatory");
  },
  castBriefs(b) {
    const cast = b.brief?.cast ?? [];
    const speakers = cast.filter(speaking);

    // An empty cast used to satisfy "no INCOMPLETE cast members" trivially and
    // report ok. The Road In passed that correctly -- it is a montage with no
    // NPCs at all -- and a scene that simply forgot its cast would have passed
    // identically, which made the check worthless in the only case where it
    // mattered. A scene with nobody in it now has to say so.
    if (cast.length === 0) {
      const sentence = deliberateMention(b.brief?.notes, /\bcast\b|\bnpcs?\b|\bspeaking (?:parts?|roles?)\b|\bnamed characters?\b/i);
      return sentence
        ? ok(`no cast, deliberately: "${sentence.slice(0, 90)}"`)
        : no("no cast at all, and nothing in notes says that is deliberate -- a forgotten cast looks identical to this");
    }

    const faults = [];
    for (const m of speakers) {
      const gaps = [];
      if (!nonEmpty(m.brief?.wants)) gaps.push("wants");
      if (!nonEmpty(m.brief?.opensWith)) gaps.push("opensWith");
      if (!nonEmpty(m.brief?.voice?.register)) gaps.push("voice.register");
      if (!(m.brief?.voice?.samples ?? []).length) gaps.push("voice.samples");
      if (gaps.length) faults.push(`${m.label ?? m.id}: ${gaps.join("/")}`);
    }
    if (faults.length) return no(faults.join("; "));
    if (speakers.length === 0) return ok(`${cast.length} walk-on(s), nobody speaking`);
    return ok(`${speakers.length} speaking cast member(s) complete`);
  },
  checksHaveDcs(b, corpus) {
    const faults = [];
    for (const { id, challenge } of challengesFor(b, corpus)) {
      if (!challenge) { faults.push(`${id}: unresolved`); continue; }
      for (const check of challenge.checks ?? []) {
        const gaps = [];
        if (!checkHasSkill(check)) gaps.push("no skill");
        if (typeof check.dc?.value !== "number") gaps.push("no DC");
        if (!nonEmpty(check.dc?.basis)) gaps.push("no DC basis");
        const outcomes = check.outcomes ?? {};
        const degrees = ["criticalSuccess", "success", "failure", "criticalFailure"].filter((d) => !nonEmpty(outcomes[d]));
        if (degrees.length) gaps.push(`no ${degrees.join("/")}`);
        if (gaps.length) faults.push(`${id}/${check.id}: ${gaps.join(", ")}`);
      }
    }
    return faults.length ? no(faults.join("; ")) : ok("every check names a skill, a DC with a basis, and all four degrees");
  },
  refsResolve(b, corpus) {
    const broken = [];
    const checkRef = (kind, id, table) => { if (id && !table[id]) broken.push(`${kind}:${id}`); };
    for (const id of b.scene.challengeRefs ?? []) checkRef("challenge", id, corpus.challenges);
    checkRef("encounter", b.scene.encounterRef, corpus.encounters);
    checkRef("subsystem", b.scene.subsystemRef, corpus.subsystems);
    if (b.briefRef && !b.brief) broken.push(`brief:${b.briefRef}`);
    for (const m of b.brief?.cast ?? []) checkRef("npc", m.npcRef, corpus.npcs);
    for (const beat of b.brief?.beats ?? []) {
      checkRef("challenge", beat.challengeRef, corpus.challenges);
      checkRef("encounter", beat.encounterRef, corpus.encounters);
      checkRef("subsystem", beat.subsystemRef, corpus.subsystems);
      // A beat's npcRef names a member of THIS scene's cast (cast[].id), not a file in data/npcs: the cast entry carries the data id,
      // and is checked above. Found by the first episode confidence run (2026-10-07): this used to look the cast id up in data/npcs, so
      // five beats whose cast id differs from the NPC's file id (history-teacher / school-history-teacher) were reported as broken.
      if (beat.npcRef && !(b.brief?.cast ?? []).some((m) => m.id === beat.npcRef)) broken.push(`cast:${beat.npcRef}`);
    }
    checkRef("subsystem", b.brief?.clockRef, corpus.subsystems);
    // Every canon fact a beat cites must exist and not be cut (story check holds the same line; this says so in the review).
    if (corpus.facts) {
      for (const beat of b.brief?.beats ?? []) {
        for (const id of [...(beat.facts ?? []), ...(beat.gmFacts ?? [])]) {
          const f = corpus.facts.get(id);
          if (!f) broken.push(`fact:${id}`);
          else if (f.status === "cut") broken.push(`cut fact:${id}`);
        }
      }
    }
    if (b.setEntry?.locationRef) checkRef("location", b.setEntry.locationRef, corpus.locations);
    return broken.length ? no(`${broken.length} broken: ${broken.join(", ")}`) : ok("all refs resolve");
  },
  skillVariety(b, corpus) {
    const open = challengesFor(b, corpus).some(({ challenge }) => (challenge?.checks ?? []).some((c) => c.anySkill === true));
    if (open) return ok("an open check: any skill the player's approach names");
    const skills = skillsFor(b, corpus);
    if (skills.size >= 2) return ok(`${skills.size} skills: ${[...skills].sort().join(", ")}`);
    if (skills.size === 1) return no(`one skill only (${[...skills][0]}) -- widen it, or say in notes why the single route is the design`);
    return no("no skilled check in this scene at all");
  },
  noCutSystems(b) {
    const hits = [];
    for (const text of proseOf(b.brief)) {
      for (const sentence of sentencesOf(text)) {
        for (const sys of CUT_SYSTEMS) {
          if (sys.rx.test(sentence) && !CUT_CONTEXT_OK.test(sentence)) {
            hits.push(`${sys.name}: "${sentence.slice(0, 90)}"`);
          }
        }
      }
    }
    return hits.length ? no(hits.slice(0, 3).join(" | ")) : ok("no dependency on a cut system");
  },
  tableBeatsHaveText(b) {
    const faults = [];
    if (!openerOf(b.brief)) faults.push("the scene has no opening words (no intro.readAloud and no readAloud on the first beat)");
    for (const beat of b.brief?.beats ?? []) {
      if (beat.kind === "reveal" && !nonEmpty(beat.readAloud)) faults.push(`reveal beat "${beat.id}" has no readAloud`);
      if (!nonEmpty(beat.text)) faults.push(`beat "${beat.id}" has no text at all`);
    }
    return faults.length ? no(faults.join("; ")) : ok();
  },
  recordsSomething(b) {
    const n = (b.brief?.carryForward ?? []).length + (b.brief?.outro?.writeDown ?? []).length;
    return n > 0 ? ok(`${n} thing(s) to record`) : no("nothing says what to write down when this closes");
  },
  reactionPrompts(b) {
    const n = (b.brief?.reactionPrompts ?? []).length;
    return n > 0 ? ok(`${n}`) : no("no reaction prompts for the Close Scene dialogue");
  },
  temptations(b) {
    const n = (b.brief?.temptations ?? []).length;
    return n > 0 ? ok(`${n}`) : no("nothing to say to a table that is not biting");
  },

  // ---- Completeness, the consequence radar (v2) -------------------------
  /** M23, required: a SPECIFIC long-horizon fact duplicated into prose. */
  longPlantsHaveNodes(b) {
    const faults = [];
    for (const beat of b.brief?.beats ?? []) {
      const text = [beat.text, beat.note, beat.direction].filter(Boolean).join("\n");
      const hasNode = holdsPlant(beat);
      if (PLANT_DISCLAIMED.test(text)) continue; // the beat says outright it is not planting this
      for (const sentence of sentencesOf(text)) {
        if (NOT_A_PLANT.test(sentence) || CORRECTION_FRAMING.test(sentence)) continue;
        if (PAYOFF_CHAPTER.test(sentence)) {
          faults.push(`beat "${beat.id}" names a payoff chapter in prose, which is the canon fact's to hold (told, payoff): "${sentence.slice(0, 80)}"`);
        } else if (!hasNode && NAMED_LEDGER_ENTRY.test(sentence)) {
          faults.push(`beat "${beat.id}" names a numbered Ledger entry and cites no canon fact for it: "${sentence.slice(0, 80)}"`);
        }
      }
    }
    return faults.length
      ? no(faults.slice(0, 3).join(" | "))
      : ok("no prose names a payoff chapter, or a numbered Ledger entry with no canon fact behind it");
  },
  /** M26, recommended: a plant labelled in prose that has no Node yet. */
  plantsWithoutNodes(b) {
    const loose = [];
    for (const beat of b.brief?.beats ?? []) {
      if (holdsPlant(beat)) continue;
      const text = [beat.text, beat.note, beat.direction].filter(Boolean).join("\n");
      if (PLANT_DISCLAIMED.test(text)) continue;
      for (const sentence of sentencesOf(text)) {
        if (NOT_A_PLANT.test(sentence) || CORRECTION_FRAMING.test(sentence)) continue;
        if (PLANT_LANGUAGE.test(sentence)) {
          loose.push(`"${beat.id}": ${sentence.slice(0, 70)}`);
          break;
        }
      }
    }
    return loose.length
      ? no(`${loose.length} beat(s) plant something with no canon fact to hold it -- ${loose.slice(0, 2).join(" | ")}`)
      : ok("every planting beat cites the canon fact that holds it");
  },
  consequenceRadar(b) {
    const h = horizonsOf(b);
    const label = `S:${h.short} M:${h.medium} L:${h.long.length}`;
    const at = [h.short && "short", h.medium && "medium", h.long.length && "long"].filter(Boolean);
    if (at.length >= 2) return ok(`${label} -- ${at.join(" + ")}`);
    return no(`${label} -- ${at.length ? `registers at the ${at[0]} horizon only` : "registers at no horizon at all"}`);
  },

  // ---- Completeness, recommended ---------------------------------------
  landmark(b) {
    return nonEmpty(b.brief?.intro?.landmark) ? ok() : no("no landmark for the scene to orbit");
  },
  carriesIn(b) {
    const n = (b.brief?.intro?.carriesIn ?? []).length;
    return n > 0 ? ok(`${n} conditional carry-in`) : no("carries nothing in from an earlier scene");
  },
  holdInReserve(b) {
    return nonEmpty(b.brief?.intro?.holdInReserve) ? ok() : no("nothing held in reserve for a table that pushes");
  },
  artefacts(b) {
    const n = (b.brief?.artefacts ?? []).length;
    return n > 0 ? ok(`${n}`) : no("the party leaves owning nothing");
  },
  tracks(b) {
    const moved = (b.brief?.outro?.tracks ?? []).filter((t) => t.delta !== null && t.delta !== undefined);
    const named = (b.brief?.outro?.tracks ?? []).length;
    if (moved.length) return ok(`${moved.map((t) => t.track).join(", ")}`);
    if (named) return no(`${named} track(s) named but none with a delta`);
    return no("moves nothing on the strategy layer");
  },
  offers(b) {
    const n = (b.brief?.offers ?? []).length;
    return n > 0 ? ok(`${n}`) : no("puts no offer on the board");
  },
  gmModifiers(b) {
    const n = (b.brief?.gmModifiers ?? []).length;
    return n > 0 ? ok(`${n}`) : no("no secret circumstance modifier");
  },

  // ---- Place ------------------------------------------------------------
  hasLocation(b, corpus) {
    const id = b.setEntry?.locationRef;
    if (!id && b.setEntry?.offMap?.reason) return ok(`off the map on purpose (${b.setEntry.offMap.reason})`);
    if (!id) return no("no locationRef in scene-set.json -- this scene happens nowhere on the map");
    const loc = corpus.locations[id];
    if (!loc) return no(`locationRef "${id}" does not resolve to a file in data/locations/`);
    return ok(`${loc.name} (${id})`);
  },
  locationNotApproximate(b) {
    if (!b.setEntry?.locationRef && b.setEntry?.offMap?.reason) return ok("off the map on purpose");
    if (!b.setEntry?.locationRef) return no("no location to judge");
    return b.setEntry.approximate ? no("marked approximate -- a guess recorded as a fact is how a map stops being trustworthy") : ok("exact");
  },
  locationHasLore(b, corpus) {
    if (!b.setEntry?.locationRef && b.setEntry?.offMap?.reason) return ok("off the map on purpose");
    const loc = corpus.locations[b.setEntry?.locationRef];
    if (!loc) return no("no location to judge");
    return nonEmpty(loc.lore?.summary) ? ok(`${loc.lore.summary.trim().split(/\s+/).length} words`) : no("the location has no written lore summary");
  },
  locationDepth(b, corpus) {
    if (!b.setEntry?.locationRef && b.setEntry?.offMap?.reason) return ok("off the map on purpose");
    const loc = corpus.locations[b.setEntry?.locationRef];
    if (!loc) return no("no location to judge");
    const depth = loc.depth ?? "unset";
    return depth !== "named" && depth !== "unset" ? ok(depth) : no(`depth is "${depth}" -- a scene is the moment a place earns real detail`);
  },

  // ---- Seam (v4, reworked to coordinates v5) ----------------------------
  // Ingram, 2026-09-22: "I want to literally have a set of coordinates for the
  // players to move between and that needs to happen between EVERY scene
  // change." The first version of these checks tracked only togetherness, which
  // was a miscommunication -- the coordinate is the point, because the Scene
  // Runner's automatic cut to the world map fires on a locationRef CHANGE and
  // silently does nothing when either side is null.
  seamPositionsStated(b) {
    const fromP = positionAt(b, "intro");
    const toP = positionAt(b, "outro");
    const gaps = [];
    if (!fromP.declared) gaps.push("intro.position");
    if (!toP.declared) gaps.push("outro.position");
    if (gaps.length) return no(`${gaps.join(" and ")} not declared -- the scene has no stated coordinate at that edge`);
    if (!fromP.locationRef && fromP.state !== "scattered") {
      return no("opens with no locationRef and is not `scattered` -- every other state owes a real coordinate");
    }
    if (!toP.locationRef && toP.state !== "scattered") {
      return no("closes with no locationRef and is not `scattered` -- the next scene has no coordinate to travel from");
    }
    return ok(`${fromP.state} @ ${fromP.locationRef ?? "off-map"} -> ${toP.state} @ ${toP.locationRef ?? "off-map"}`);
  },
  /** The leg INTO this scene: does the runner's map cut actually fire? */
  seamCutFires(b, corpus, { previous = null } = {}) {
    const from = positionAt(previous, "outro");
    const to = positionAt(b, "intro");
    if (from.state === "scattered" || to.state === "scattered") {
      return ok("off-map by design -- `scattered` is the campaign's own opening and the one legitimate no-coordinate edge");
    }
    if (!from.locationRef) return no(`no coordinate to leave ${previous?.scene?.id ?? "the previous scene"} from -- the cut to the world map will NOT fire, and the table is simply somewhere else with no error raised`);
    if (!to.locationRef) return no("no coordinate to arrive at -- the cut to the world map will NOT fire");
    if (from.locationRef === to.locationRef) return ok(`same location (${to.locationRef}) -- a cut within one place, no journey, correct`);
    const metres = metresBetween(corpus.locations[from.locationRef], corpus.locations[to.locationRef]);
    return ok(`${from.locationRef} -> ${to.locationRef}${metres === null ? "" : `, ${metres} m`} -- the map cut fires`);
  },
  seamStatesReachable(b, corpus, { previous = null } = {}) {
    const from = positionAt(previous, "outro").state;
    const to = positionAt(b, "intro").state;
    if (!from) return no(`the previous scene (${previous?.scene?.id ?? "?"}) does not declare where it leaves the party`);
    if (!to) return no("this scene does not declare where the party is when it opens");
    const LEGAL = {
      scattered: ["scattered", "individual", "converging", "together"],
      individual: ["individual", "converging", "together"],
      converging: ["converging", "together", "individual"],
      together: ["together", "split", "scattered", "converging", "individual"],
      split: ["split", "together", "scattered", "individual"]
    };
    if (!LEGAL[from]?.includes(to)) return no(`"${from}" cannot become "${to}" -- no journey joins them`);
    if ((from === "individual" || from === "scattered") && to === "together") {
      const skip = /\bskip|\blater\b|\bdays?\b|\bmonday\b|\bnext (?:morning|week)\b/i.test(
        [previous?.brief?.outro?.onwards, previous?.brief?.outro?.transition?.line, b.brief?.intro?.where].filter(Boolean).join(" ")
      );
      return skip ? ok(`${from} -> together across a stated time skip`)
                  : no(`${from} -> together with no stated time skip or journey: six people in six places cannot be in one room next beat`);
    }
    return ok(`${from} -> ${to}`);
  },
  seamOnwardsNamesNext(b, corpus, { previous = null } = {}) {
    const onwards = previous?.brief?.outro?.onwards;
    if (!onwards) return no(`the previous scene (${previous?.scene?.id ?? "?"}) has no outro.onwards`);
    const title = b.scene.title ?? b.scene.id;
    const words = title.split(/[:\s]+/).filter((w) => w.length > 3);
    const named = words.length
      ? words.every((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(onwards))
      : false;
    return named ? ok(`"${title}" named in the previous scene's onwards`)
                 : no(`the previous scene's onwards does not name "${title}" -- two fields describe the same moment and only one of them knows where it goes`);
  },
  seamLeavesThemPlaced(b) {
    const p = positionAt(b, "outro");
    if (!p.declared) return no("outro.position not declared -- the next scene has nothing to travel from");
    if (!p.locationRef && p.state !== "scattered") return no("closes with no coordinate, and not `scattered`");
    if ((p.state === "scattered" || p.state === "split") && !nonEmpty(p.note)) {
      return no(`closes \`${p.state}\` with no note -- that state always needs saying where`);
    }
    return ok(`closes ${p.state} @ ${p.locationRef ?? "off-map"}`);
  },
  seamScatterRiskStated(b) {
    const t = b.brief?.outro?.transition;
    if (!t) return no("no outro.transition at all");
    return typeof t.scatterRisk === "boolean"
      ? ok(`scatterRisk: ${t.scatterRisk}`)
      : no("scatterRisk not stated -- false by default is fine, false because nobody asked is not");
  },

  // ---- Quality ----------------------------------------------------------
  prosePatterns(b, corpus, { neighbours = [] } = {}) {
    // proseOf already includes every read-aloud. Concatenating readAloudOf on
    // top of it counted each read-aloud occurrence twice, which tripped the
    // "more than once" threshold on scenes where a construction appeared
    // exactly once -- every hit was a false positive until this was fixed.
    const mine = proseOf(b.brief);
    const hits = [];
    for (const a of KNOWN_ATTRACTORS) {
      const mineHits = mine.filter((t) => a.rx.test(t)).length;
      if (!mineHits) continue;
      const neighbourHits = neighbours.filter((nb) => proseOf(nb.brief).some((t) => a.rx.test(t)));
      if (mineHits > 1 || neighbourHits.length) {
        hits.push(
          `${a.label} appears ${mineHits}x here` +
          (neighbourHits.length ? ` and in ${neighbourHits.map((nb) => nb.scene.title ?? nb.scene.id).join(", ")}` : "")
        );
      }
    }
    return hits.length ? no(hits.join("; ")) : ok("no construction repeated here or in an adjacent scene");
  }
};

/**
 * The sentence in a scene's own notes that exempts a recommended check, or
 * null. Both the check's keyword and a deliberateness marker have to be in the
 * SAME sentence, so "we should add a landmark here" does not exempt anything.
 */
export function noteExemption(bundle, checkId) {
  const rx = NOTE_EXEMPTIONS[checkId];
  if (!rx) return null;
  return deliberateMention(bundle.brief?.notes, rx);
}

/**
 * The sentence asserting that the thing `rx` matches is deliberately absent --
 * with the deliberateness marker WITHIN 40 CHARACTERS of the keyword, not
 * merely somewhere in the same sentence.
 *
 * Same-sentence was the first version and it passed M5 on The Road In for the
 * wrong reason: the notes' zero-stakes paragraph reads "...built that way on
 * purpose: nobody should learn what a bad roll feels like", and "nobody" plus
 * "on purpose" satisfied a check about the CAST. That is the same vacuous pass
 * the M5 fix existed to remove, in a subtler form, so proximity is required.
 */
export function deliberateMention(text, rx) {
  const WINDOW = 40;
  for (const sentence of sentencesOf(text)) {
    const global = new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : `${rx.flags}g`);
    for (const match of sentence.matchAll(global)) {
      const from = Math.max(0, match.index - WINDOW);
      const to = Math.min(sentence.length, match.index + match[0].length + WINDOW);
      if (DELIBERATE.test(sentence.slice(from, to))) return sentence.slice(0, 110);
    }
  }
  return null;
}

/** Neighbouring scenes in play order -- what the cross-scene checks compare against. */
export function neighboursOf(bundle, allScenes) {
  const i = allScenes.findIndex((s) => s.key === bundle.key);
  if (i < 0) return [];
  return [allScenes[i - 1], allScenes[i + 1]].filter(Boolean);
}

/**
 * Runs every auto-evaluable check for one scene. `waived` ids report as
 * `waived` rather than pass or fail -- a waiver is a decision on the record,
 * so it must stay visible instead of quietly counting as green.
 */
export function runAutoChecks(bundle, corpus, { allScenes = [], only = null, includeManual = false } = {}) {
  const review = bundle.scene.authoring?.review ?? {};
  const waived = new Set((review.waived ?? []).map((w) => w.check));
  const notApplicable = new Map((review.notApplicable ?? []).map((n) => [n.check, n.why]));
  const { byCheck: excepted, problems: exceptionProblems } = exceptionsOf(bundle.brief, corpus.checklist.checks);
  const neighbours = neighboursOf(bundle, allScenes);
  const i = allScenes.findIndex((s) => s.key === bundle.key);
  const previous = i > 0 ? allScenes[i - 1] : null;
  const next = i >= 0 && i < allScenes.length - 1 ? allScenes[i + 1] : null;
  const results = [];
  for (const check of corpus.checklist.checks) {
    if (!check.auto && !includeManual) continue;
    if (only && check.pass !== only) continue;

    // Applicability first: a check that cannot apply here must not be answered,
    // passed, failed or waived.
    if (notApplicable.has(check.id)) {
      results.push({ ...check, state: "n/a", detail: notApplicable.get(check.id) });
      continue;
    }
    if (check.appliesWhenAuto) {
      const predicate = APPLICABILITY[check.appliesWhenAuto];
      if (!predicate) {
        results.push({ ...check, state: "broken", detail: `no applicability predicate named "${check.appliesWhenAuto}"` });
        continue;
      }
      const verdict = predicate(bundle, corpus, { allScenes });
      if (verdict !== true) {
        results.push({ ...check, state: "n/a", detail: String(verdict) });
        continue;
      }
    }
    if (excepted.has(check.id)) {
      results.push({ ...check, state: "excepted", detail: `exception: ${excepted.get(check.id)}` });
      continue;
    }
    if (!check.auto) {
      results.push({ ...check, state: "manual", detail: "read by hand in the pass output" });
      continue;
    }
    const fn = EVALUATORS[check.auto];
    if (!fn) {
      results.push({ ...check, state: "broken", detail: `no evaluator named "${check.auto}"` });
      continue;
    }
    if (waived.has(check.id)) {
      const why = (bundle.scene.authoring.review.waived.find((w) => w.check === check.id) ?? {}).why;
      results.push({ ...check, state: "waived", detail: why ?? "waived" });
      continue;
    }
    if (check.dependsOnCheck) {
      const prereq = results.find((r) => r.id === check.dependsOnCheck);
      // A waived prereq is exactly as unanswerable as a failed one: P1 waived
      // (Ingram: "this scene deliberately has no location, and here is why")
      // means P2/P4/P6's own questions ("is the location approximate", "does
      // it have lore") have no location to be asked about. Found live
      // 2026-09-28 -- waiving P1 alone still failed P2/P4/P6 separately,
      // which is the exact "chosen exception, not default" boundary this
      // dependency exists to protect: a real waiver, once recorded, has to
      // actually clear the checks it makes unanswerable.
      if (prereq && (prereq.state === "fail" || prereq.state === "waived" || prereq.state === "excepted")) {
        results.push({ ...check, state: "n/a", detail: `unanswerable: ${prereq.id} is ${prereq.state} (${prereq.detail})` });
        continue;
      }
    }
    let outcome;
    try {
      outcome = fn(bundle, corpus, { neighbours, previous, next, allScenes });
    } catch (err) {
      outcome = no(`evaluator threw: ${err.message}`);
    }
    if (!outcome.ok && check.severity === "recommended") {
      const sentence = noteExemption(bundle, check.id);
      if (sentence) {
        results.push({ ...check, state: "exempt", detail: `notes say it is deliberate: "${sentence}"` });
        continue;
      }
    }
    results.push({ ...check, state: outcome.ok ? "pass" : "fail", detail: outcome.detail });
  }
  // An exception that names no real check, or gives no reason, is a fault in the scene, never a silent pass.
  if ((!only || only === "completeness") && exceptionProblems.length) {
    results.push({ id: "X1", pass: "completeness", severity: "required", auto: "exceptions", question: "Does every authored exception name a real check and give a reason?", why: "An exception is a decision with its reason on the record, not a suppression flag.", source: "design/scene-signoff.md", state: "fail", detail: exceptionProblems.join("; ") });
  }
  return results;
}

export function summariseChecks(results) {
  const tally = (severity, state) => results.filter((r) => r.severity === severity && r.state === state).length;
  return {
    requiredPass: tally("required", "pass"),
    requiredFail: tally("required", "fail"),
    requiredWaived: tally("required", "waived"),
    requiredExcepted: tally("required", "excepted"),
    recommendedPass: tally("recommended", "pass"),
    recommendedFail: tally("recommended", "fail"),
    recommendedExempt: tally("recommended", "exempt"),
    notApplicable: results.filter((r) => r.state === "n/a").length,
    manual: results.filter((r) => r.state === "manual").length,
    broken: results.filter((r) => r.state === "broken").length,
    blockers: results.filter((r) => r.severity === "required" && r.state === "fail")
  };
}
