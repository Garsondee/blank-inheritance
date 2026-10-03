/**
 * Pure mapping from the induction terminal's collected answers onto the
 * REAL sf2e character-sheet biography fields (design/induction-intake-audit.md
 * §6). No Foundry globals here -- this module takes plain state in and
 * returns a flat `{ "system.path": value }` object for the caller to hand to
 * Actor#update.
 *
 * Why this module exists at all: until 2026-09-18 #createCharacterActor
 * created the Actor with `system: { abilities: null, details: { level: ... } }`
 * and nothing else, so pronouns, gender identity, appearance and languages
 * were collected on Page 7 and never reached the sheet. The standing
 * instruction from Ingram is that anything this form gathers gets recorded on
 * the character sheet bio, so the mapping is data-driven: every prompt in
 * data/campaign/induction-intake-prompts.json declares its own `bioPath`, and
 * anything without one is a deliberate, reviewable exception rather than a
 * silent drop.
 *
 * Every path below is verified against gamesystems/sf2e/template.json and the
 * shipped character sheet templates (templates/actors/character/tabs/
 * biography.hbs and character.hbs), not assumed.
 */

/**
 * sf2e's own `Actor.htmlFields` list (template.json) -- these six biography
 * fields are rich text and are rendered through a ProseMirror editor, so
 * plain newlines in them do NOT survive as line breaks. Everything else in
 * the biography is a plain string input and must NOT be wrapped in markup.
 */
export const HTML_BIO_PATHS = new Set([
  "system.details.biography.appearance",
  "system.details.biography.backstory",
  "system.details.biography.campaignNotes",
  "system.details.biography.allies",
  "system.details.biography.enemies",
  "system.details.biography.organizations"
]);

/**
 * The form fills in its own line: every character created here is, by
 * definition, a Directorate cadet, so Organizations is never empty even for a
 * player who skips the question. Prepended, so the player's own answer reads
 * as the interesting half.
 */
export const DIRECTORATE_ORGANIZATION = "Civil Defence Directorate — cadet, current intake.";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Answers are player-authored free text going into a rich-text field; escape before it becomes markup. */
export function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * Plain text -> the paragraph markup a ProseMirror field expects. A blank
 * line starts a new paragraph; a single newline becomes a <br>, which is what
 * someone typing a list of names into the Allies box actually means.
 * Returns "" for empty input so callers can skip the write entirely.
 */
export function textToHtml(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n\s*\n/)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * sf2e stores languages as slugs ("common", "sarcesian-signed") while Page 7
 * collects and displays title-cased labels ("Common", "Sarcesian Signed"), so
 * the display transform has to be reversed on the way to the Actor. Verified
 * against the real key set in gamesystems/sf2e/lang/en.json.
 */
export function toLanguageSlug(label) {
  return String(label ?? "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/**
 * Split the player's language list into slugs sf2e actually knows and
 * everything else. The widget has a free-text "Add" escape hatch, so a player
 * can legitimately enter something that is not in the system's own language
 * list; those would be silently dropped by a choice-validated field, so they
 * go to `details.languages.details` (sf2e's own free-text companion) instead
 * of being lost.
 *
 * `knownSlugs` empty/omitted means "cannot tell" -- everything is then treated
 * as known, which degrades to the old behaviour rather than throwing away
 * real picks.
 */
export function partitionLanguages(labels, knownSlugs) {
  const known = knownSlugs instanceof Set ? knownSlugs : new Set(knownSlugs ?? []);
  const slugs = [];
  const unknown = [];
  for (const label of labels ?? []) {
    const slug = toLanguageSlug(label);
    if (!slug) continue;
    if (!known.size || known.has(slug)) {
      if (!slugs.includes(slug)) slugs.push(slug);
    } else if (!unknown.includes(String(label).trim())) {
      unknown.push(String(label).trim());
    }
  }
  return { slugs, unknown };
}

/**
 * sf2e has ONE field for both ("Gender/Pronouns", system.details.gender.value)
 * while this form asks separately, because they are separately meaningful to
 * the player. Combined rather than made to fight over the field: identity
 * first, pronouns in parentheses, and whichever one was given alone stands by
 * itself.
 */
export function combineGenderField(genderIdentity, pronouns) {
  const identity = String(genderIdentity ?? "").trim();
  const prn = String(pronouns ?? "").trim();
  if (identity && prn) return `${identity} (${prn})`;
  return identity || prn;
}

/** Every prompt the form can collect, in sheet order, flattened out of the prompts file. */
function allPrompts(prompts) {
  return [
    ...(prompts?.personalFile ?? []),
    ...(prompts?.personality ?? []),
    ...(prompts?.openQuestions ?? []),
    ...(prompts?.playerQuestions ?? []),
    ...(prompts?.freeform ? [prompts.freeform] : [])
  ];
}

/**
 * Paths that MORE THAN ONE prompt can write to -- computed from the prompt
 * definitions, not from which answers happen to be filled in, so a given
 * question's answer is headed identically whether or not its neighbour was
 * answered. This is what lets campaignNotes carry the "good at", "what the
 * Directorate shouldn't know" and out-of-character player-goal answers at
 * once without the GM having to guess which is which. (It now carries the
 * out-of-character answers from the player page as well: each is headed with
 * its prompt's short `heading`, falling back to the full `text`.)
 */
export function sharedBioPaths(prompts) {
  const counts = new Map();
  for (const p of allPrompts(prompts)) {
    if (!p?.bioPath) continue;
    counts.set(p.bioPath, (counts.get(p.bioPath) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([path]) => path));
}

/**
 * Build the flat Actor update for everything this terminal collected.
 *
 * @param {object} args
 * @param {object} args.prompts          data/campaign/induction-intake-prompts.json, already loaded.
 * @param {object} args.finishing        state.finishing (name, pronouns, genderIdentity, appearance, languages, personalFile, personality).
 * @param {object} args.intake           state.intake (questions keyed by prompt id, plus freeform).
 * @param {Iterable<string>} [args.knownLanguageSlugs]  CONFIG.PF2E.languages keys, when the caller can see them.
 * @returns {Record<string, unknown>} paths -> values, ready for Actor#update. Empty answers are omitted entirely.
 */
export function buildBioUpdate({ prompts, finishing = {}, intake = {}, knownLanguageSlugs } = {}) {
  const updates = {};
  const shared = sharedBioPaths(prompts);
  const grouped = new Map(); // bioPath -> [{heading, body}]

  const answerFor = (prompt) => {
    if (prompts?.freeform && prompt.id === prompts.freeform.id) return intake?.freeform;
    // Page 8's open questions and the player page's questions share one answer map, keyed by prompt id.
    if ([...(prompts?.openQuestions ?? []), ...(prompts?.playerQuestions ?? [])].some((q) => q.id === prompt.id)) return intake?.questions?.[prompt.id];
    if ((prompts?.personalFile ?? []).some((q) => q.id === prompt.id)) return finishing?.personalFile?.[prompt.id];
    return finishing?.personality?.[prompt.id];
  };

  for (const prompt of allPrompts(prompts)) {
    if (!prompt?.bioPath) continue;
    const answer = String(answerFor(prompt) ?? "").trim();
    if (!answer) continue;

    if (!HTML_BIO_PATHS.has(prompt.bioPath)) {
      // A plain string input on the real sheet -- write it verbatim, never as markup.
      updates[prompt.bioPath] = answer;
      continue;
    }
    if (!grouped.has(prompt.bioPath)) grouped.set(prompt.bioPath, []);
    grouped.get(prompt.bioPath).push({
      heading: shared.has(prompt.bioPath) ? (prompt.heading ?? prompt.text) : null,
      outOfCharacter: prompt.outOfCharacter === true,
      body: answer
    });
  }

  // Organizations is the one field the form fills in for itself (see the constant).
  const orgPath = "system.details.biography.organizations";
  const orgEntries = grouped.get(orgPath) ?? [];
  grouped.set(orgPath, [{ heading: null, outOfCharacter: false, body: DIRECTORATE_ORGANIZATION }, ...orgEntries]);

  for (const [path, entries] of grouped) {
    updates[path] = entries
      .map(({ heading, body, outOfCharacter }) => {
        const label = outOfCharacter && heading ? `${heading} (out of character)` : heading;
        return `${label ? `<h4>${escapeHtml(label)}</h4>` : ""}${textToHtml(body)}`;
      })
      .join("");
  }

  const name = String(finishing?.name ?? "").trim();
  if (name) updates["name"] = name;

  const gender = combineGenderField(finishing?.genderIdentity, finishing?.pronouns);
  if (gender) updates["system.details.gender.value"] = gender;

  const appearance = textToHtml(finishing?.appearance);
  if (appearance) updates["system.details.biography.appearance"] = appearance;

  const { slugs, unknown } = partitionLanguages(finishing?.languages, knownLanguageSlugs);
  if (slugs.length) updates["system.details.languages.value"] = slugs;
  if (unknown.length) updates["system.details.languages.details"] = unknown.join(", ");

  return updates;
}
