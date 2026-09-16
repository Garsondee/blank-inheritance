/**
 * Harvest inference — turning a harvested chat export into something worth
 * reading. design/harvest-inference.md, closing GitHub #42. The pure half:
 * classification only, no Foundry, no filesystem.
 *
 * **An honest scope note, worth keeping current if this file is ever
 * revisited.** The design doc's Tier 1/2 split hinges on pairing a roll
 * against "the active scene brief's checkRef... known from tick state at
 * the time" — i.e. a timestamped record of which scene/beat was live when
 * the roll happened. That record does not exist anywhere in the harvest
 * pipeline yet (the Director's panel's scene.activate() calls are not
 * logged anywhere persistent). Rather than fabricate proximity attribution
 * against data that was never captured, `classifyMessage` accepts an
 * OPTIONAL `expectedSkills` hint and degrades honestly without it: a real,
 * structured check result is Tier 1 on its own terms (the doc's own words:
 * "this is already data, not inference") unless a scene-context hint is
 * actually supplied and contradicts it, in which case it correctly drops to
 * Tier 2. Wiring a real timestamped scene-activity export is a real,
 * separate follow-up, not done here — see this file's own tests for the
 * exact contract the hint must satisfy when that day comes.
 *
 * Tier 3 (bare links, no roll attached) needs no such data and is fully
 * real today. "No sentiment analysis of ordinary chat" (the doc's own rule,
 * stated twice there) — a message with neither a check nor a link is not a
 * candidate at all, not a low-confidence one; it is simply not classified.
 */

export const TIER = Object.freeze({ HIGH: 1, MEDIUM: 2, LOW: 3 });

function capitalize(slug) {
  if (!slug) return "";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

const OUTCOME_LABEL = Object.freeze({
  criticalSuccess: "critical success",
  success: "success",
  failure: "failure",
  criticalFailure: "critical failure"
});

/**
 * One normalized chat record (core/chat-export.mjs#normalizeMessage's
 * output) -> a classified candidate, or null if there is nothing in it
 * worth surfacing (ordinary roleplay text, a damage roll with no check
 * context, etc).
 *
 * `expectedSkills`, when supplied, is a Set of skill slugs the caller
 * knows were legitimately in play (e.g. a scene's own challenge data) --
 * a check against a skill NOT in that set drops from HIGH to MEDIUM. Absent
 * entirely (the honest default today), a check's own structured outcome is
 * trusted on its own terms.
 */
export function classifyMessage(record, { expectedSkills = null } = {}) {
  // A message the adapter that posted it already knows is real, authored
  // content (core/chat-export.mjs's own harvestKind flag -- e.g. the
  // induction terminal's intake-answers summary) skips inference entirely
  // and is trusted outright, same footing as the GM's own typed log lines.
  // This is NOT "sentiment analysis of ordinary chat" (the rule this file's
  // header says never to do) -- it is the opposite: content someone
  // deliberately marked as worth reading, not a guess about what an
  // unmarked message might mean.
  if (record.harvestKind) {
    return { tier: TIER.HIGH, kind: record.harvestKind, at: record.at, summary: record.text, source: record };
  }

  if (record.check) {
    const { slug, outcome, dc } = record.check;
    const who = record.speaker ?? record.author ?? "Someone";
    const outcomeLabel = OUTCOME_LABEL[outcome] ?? outcome;
    const dcText = dc != null ? ` (DC ${dc})` : "";
    const summary = `${who} rolled ${capitalize(slug)}: ${outcomeLabel}${dcText}.`;

    const outOfExpectedContext = expectedSkills instanceof Set && slug && !expectedSkills.has(slug);
    return {
      tier: outOfExpectedContext ? TIER.MEDIUM : TIER.HIGH,
      kind: "check",
      at: record.at,
      summary,
      source: record
    };
  }

  if (record.links.length > 0) {
    // Deliberately verb-free -- "referenced", never "used"/"took"/"gave".
    // A message can carry more than one link; each is its own candidate,
    // since two different links in one message can mean two different things.
    return record.links.map((link) => ({
      tier: TIER.LOW,
      kind: "link",
      at: record.at,
      summary: `${link.label ?? `${link.type} ${link.ref}`} was referenced by ${record.speaker ?? record.author ?? "someone"} (no action recorded).`,
      source: record,
      link
    }));
  }

  return null;
}

/**
 * A whole day's worth: the GM's own typed commentary (already Tier 1 —
 * "a human saying 'that mattered' beats any inference this document can
 * produce") plus every classified chat candidate, split into what's already
 * resolved and what needs a human answer.
 */
export function inferSession({ chatRecords = [], gmLogEntries = [], expectedSkills = null } = {}) {
  const highConfidence = gmLogEntries.map((entry) => ({
    tier: TIER.HIGH,
    kind: "gm-note",
    at: entry.at,
    summary: entry.text,
    source: entry
  }));

  const batch = [];
  for (const record of chatRecords) {
    const classified = classifyMessage(record, { expectedSkills });
    if (!classified) continue;
    const candidates = Array.isArray(classified) ? classified : [classified];
    for (const candidate of candidates) {
      if (candidate.tier === TIER.HIGH) highConfidence.push(candidate);
      else batch.push(candidate);
    }
  }

  highConfidence.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  batch.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));

  return { highConfidence, batch };
}
