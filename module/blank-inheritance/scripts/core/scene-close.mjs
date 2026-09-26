/**
 * The scene-close dialogue — the pure half.
 *
 * REBUILT 2026-09-22, and this supersedes the version design/ux-doctrine.md
 * §10.3a describes. Ingram hit the old dialogue live and it failed in the
 * worst possible way: "Scene close UI has grown so massive I cannot
 * comprehend it and I cannot even scroll down to hit accept. This is a
 * dangerous error since it would kill a session." On a real scene (The Road
 * In) the old form asked for a completion checkbox, one of four endings, one
 * of five costs, a paragraph of notes, and then FIFTY-FIVE 0-10 buttons
 * (five authored prompts x an eleven-button scale) before the Confirm button
 * it had pushed off the bottom of the screen. Sixty-six targets to end a
 * scene.
 *
 * So the brief changed, in Ingram's own words: wide not tall, "50% less
 * choices", and "a set of big buttons at the bottom which are 'Panic!',
 * 'Note' and 'Positive'... if I'm flustered I can pick a course of action
 * quickly if I feel the need to move on quickly."
 *
 * The governing rule of this file is now ONE PRESS CLOSES A SCENE. A verdict
 * is the only required choice; the ending, the carries-forward toggle and
 * the notes are all optional enrichment for a GM who has a spare moment, and
 * NONE of them can ever block the close. That directly reverses §10.3a's own
 * "forced" framing (`canCloseScene` used to refuse until two dropdowns were
 * both set) — deliberately, because a gate that can strand a GM mid-session
 * is a worse failure than a missing field. §10.3a's forced-dropdown spec is
 * superseded; its recap/scene-break half (openSetups, sceneHighlights below)
 * is untouched and still right.
 *
 * WHAT WAS CUT, and why it is not hiding in a flag somewhere:
 *
 * - The 0-10 rating grid (`reactionScores`/`REACTION_SCALE`, added 2026-09-19)
 *   is gone from the dialogue entirely. It was the whole height problem, and
 *   Note's own definition replaces it: "we should examine things of this
 *   scene in depth in our review of the session. You can then ask me
 *   in-depth questions." Rating five prompts mid-session was the wrong place
 *   to do that work. The authored `reactionPrompts` themselves are NOT
 *   deleted — `reviewAgenda()` below turns them into the question list the
 *   later review is conducted from, so the content keeps its job and loses
 *   only the fifty-five buttons.
 *
 * - The cost picker (`COST_OPTIONS_COMBAT`/`_SOCIAL`/`costOptionsFor`) is
 *   gone. Two reasons, and the first alone would have been enough: three of
 *   the seven combat costs named systems that have since been CUT (Bleed, an
 *   Anchor violated, and the Frame/technician economy around them — see
 *   `data/campaign/config.json` and the Systems CUT decision of 2026-09-20),
 *   so the picker was offering consequences that no longer exist, and the
 *   dialogue's own footer was reporting "Anchors violated so far" off a dead
 *   counter. Second, what a *social* scene cost ("information missed", "a
 *   connection missed") is exactly the nuance Note now captures properly
 *   instead of compressing into one five-second tap.
 *
 * - The two mocked counters (casualties, Anchor violations) go with it, since
 *   the only costs that fed them are gone. One real counter replaces them:
 *   how many scenes are flagged for review. That is Law 15 honoured rather
 *   than mocked — the number moves, and the review actually consumes it.
 *
 * `ending` survives as the one optional structured field, because it is
 * genuinely mode-independent, it is one row of four chips, and the Scene
 * Runner's own `advanceAfterClose` already reads the completion state next
 * to it.
 */

/** How the scene ended. OPTIONAL as of the 2026-09-22 rebuild — unpicked means unrecorded, never "Resolved by default", because a panicking GM must not have an outcome invented for them. */
// `label` is plain-English text for the session log (a private GM note,
// never localised anywhere else in this codebase -- log-entry.mjs/
// session-log.mjs have no i18n dependency either). `labelKey` is the
// separate, real BLANKINHERITANCE.* key the UI renders via {{localize}}.
// core/ can never call game.i18n itself (tier-0 lint), so the log line is
// built from `label` here rather than from a raw, unresolved key.
export const ENDING_OPTIONS = Object.freeze([
  { id: "resolved", label: "Resolved", labelKey: "BLANKINHERITANCE.SceneClose.Ending.Resolved" },
  { id: "resolved-with-complications", label: "Resolved with complications", labelKey: "BLANKINHERITANCE.SceneClose.Ending.ResolvedWithComplications" },
  { id: "interrupted", label: "Interrupted", labelKey: "BLANKINHERITANCE.SceneClose.Ending.Interrupted" },
  { id: "abandoned", label: "Abandoned", labelKey: "BLANKINHERITANCE.SceneClose.Ending.Abandoned" }
]);

/**
 * The three verdicts — Ingram's own words for each, 2026-09-22, and the only
 * required choice in the dialogue. Pressing one IS the confirm: there is no
 * separate accept button to scroll to any more, which is the specific
 * failure this rebuild exists to remove.
 *
 * `flagsReview` is what makes Note and Panic mean something later: a flagged
 * closure records this scene's authored prompts as a real agenda (see
 * `reviewAgenda`), so the session review has in-depth questions to ask
 * instead of starting from "how did it go?".
 *
 * `advances` is why Panic does not behave like the other two. Positive and
 * Note are clean ends — the table moves on to the next authored scene, the
 * way closing a scene already did. Panic means "something is going wrong
 * right now" (its eventual job is to reach an LLM that helps correct things
 * mid-session), and teleporting the table to the next location is the last
 * thing that should happen while a GM is in trouble. So a panic closes the
 * record and leaves the table exactly where it is; cueing onward stays a
 * deliberate act.
 *
 * `logPhrase` is the plain-English fragment the session log gets, for the
 * same no-i18n-in-core reason ENDING_OPTIONS carries `label`.
 */
export const VERDICT_OPTIONS = Object.freeze([
  {
    id: "panic",
    label: "Panic",
    logPhrase: "PANIC, something went wrong",
    labelKey: "BLANKINHERITANCE.SceneClose.Verdict.Panic",
    subLabelKey: "BLANKINHERITANCE.SceneClose.Verdict.PanicSub",
    flagsReview: true,
    advances: false
  },
  {
    id: "note",
    label: "Note",
    logPhrase: "flagged for review",
    labelKey: "BLANKINHERITANCE.SceneClose.Verdict.Note",
    subLabelKey: "BLANKINHERITANCE.SceneClose.Verdict.NoteSub",
    flagsReview: true,
    advances: true
  },
  {
    id: "positive",
    label: "Positive",
    logPhrase: "went well",
    labelKey: "BLANKINHERITANCE.SceneClose.Verdict.Positive",
    subLabelKey: "BLANKINHERITANCE.SceneClose.Verdict.PositiveSub",
    flagsReview: false,
    advances: true
  }
]);

/**
 * Setup threads planted earlier that have not yet paid off, surfaced at the
 * one moment doctrine names for exactly this: a scene break. §10.3a: "This
 * also settles what a scene-break suggestion looks like... the suggestions
 * §10.4 promises — an unspent setup, pacing against the session bar, a
 * scene about to expire — belong in this same dialogue."
 *
 * No resolution-tracking exists (a `setup` entry has no "paid off" flag), so
 * this is deliberately the honest, simple version: the GM's own most recent
 * `setup`-tagged log lines, newest first, for their own judgement about
 * which still apply — the same "show the record, let the GM filter it"
 * shape scene-runner.mjs's own outro.alreadyLogged already uses. `limit`
 * keeps this a glance at a scene break, not a second scrollable log to read.
 */
export function openSetups(entries = [], { limit = 5 } = {}) {
  return entries
    .filter((e) => e?.tag === "setup" && e.text)
    .slice()
    .sort((a, b) => new Date(b.at ?? 0) - new Date(a.at ?? 0))
    .slice(0, limit)
    .map((e) => ({ text: e.text, scene: e.context?.scene ?? null }));
}

/**
 * Tags that mark a log line as a real beat in the story, not table chatter --
 * the same doctrine names for the log bar (core/log-entry.mjs#LOG_TAGS)
 * minus `setup` (openSetups above already owns "still open," across every
 * scene, not just this one). `anchor` was a tag until Anchors were CUT on
 * 2026-09-20; a line an old log tagged with it is still readable, but this
 * dialogue must not present it as a live highlight.
 */
const HIGHLIGHT_TAGS = Object.freeze(["decision", "reaction", "thread", "npc", "rule"]);

/**
 * This scene's own tagged log lines, chronologically — the read-before-you-
 * decide half of the dialogue, and the half the 2026-09-22 rebuild kept
 * whole. The scene is about to close, which is exactly when a GM's memory of
 * it is best and exactly when this project's own corpus
 * (design/ux-doctrine.md §10.2) most needs the Director's-log layer filled
 * in — so this surfaces every tagged line from THIS scene right where the GM
 * is about to write the closing notes that will actually get read back later.
 * Costs the GM nothing new to build (every line already exists, typed live
 * during the scene); it just stops those lines from being buried by the time
 * the scene ends.
 *
 * Deliberately scoped to ONE scene (unlike openSetups, which looks across
 * all of them) and to the tags that mark something as having actually
 * mattered -- an untagged aside stays out, the same "don't manufacture
 * structure the GM didn't ask for" restraint openSetups already follows.
 */
export function sceneHighlights(entries = [], sceneName, { limit = 8 } = {}) {
  if (!sceneName) return [];
  return entries
    .filter((e) => e?.context?.scene === sceneName && HIGHLIGHT_TAGS.includes(e?.tag) && e.text)
    .sort((a, b) => new Date(a.at ?? 0) - new Date(b.at ?? 0))
    .slice(-limit)
    .map((e) => ({ tag: e.tag, text: e.text }));
}

function findOption(options, id) {
  return options.find((o) => o.id === id) ?? null;
}

/** The verdict with this id, or null. Exported because both halves of the feature (the dialogue's own button row, and the write path that must not trust it) resolve the same list. */
export function verdictFor(id) {
  return findOption(VERDICT_OPTIONS, id);
}

/**
 * The scene's authored `reactionPrompts`, turned into the agenda for a later
 * in-depth review.
 *
 * This is where the deleted 0-10 grid's content went. Those prompts are real
 * authored work — "the six-spotlight montage keeping its own promised pace",
 * "the violet mark at head height being noticed as an actual repeating
 * detail" — and they are far better as questions someone asks afterwards
 * than as eleven buttons apiece during play. A flagged closure records them
 * verbatim on the log entry, so the review opens with this scene's own
 * specific questions rather than a blank page.
 *
 * Nothing is rated here and nothing is scored. Silence during the session is
 * not data; the questions are the data.
 */
export function reviewAgenda(reactionPrompts = []) {
  if (!Array.isArray(reactionPrompts)) return [];
  return reactionPrompts
    .filter((p) => p && typeof p.id === "string" && p.id && typeof p.text === "string" && p.text.trim())
    .map((p) => ({ id: p.id, text: p.text.trim() }));
}

/**
 * Is this closure legal to confirm?
 *
 * As of 2026-09-22: a real verdict, and nothing else. `ending` is validated
 * only in the sense that an unrecognised id is dropped rather than trusted
 * (see `summarizeClosure`) — it never makes a closure illegal, because the
 * one thing this dialogue must never do is refuse to let a GM out of it.
 */
export function canCloseScene({ verdict } = {}) {
  if (!verdictFor(verdict)) return { ok: false, reason: "verdict-required" };
  return { ok: true, reason: null };
}

/**
 * The whole point of Law 15: closing a scene is the mechanical act, not a
 * record of one. Returns what actually happened — a log line ready for
 * core/log-entry.mjs, the structured review block a flagged scene carries,
 * whether the table should advance, and the one counter that really moves.
 *
 * `carriesForward` is the old `complete` checkbox inverted and demoted: a
 * scene is treated as finished unless the GM says otherwise, because that is
 * the overwhelmingly common case and the rebuild's whole point is that the
 * common case costs one press. An unfinished scene still never advances the
 * table, exactly as before.
 */
export function summarizeClosure({
  verdict,
  ending = null,
  carriesForward = false,
  notes = "",
  reactionPrompts = []
} = {}) {
  const chosen = verdictFor(verdict);
  if (!chosen) return { ok: false, reason: "verdict-required" };

  const complete = !carriesForward;
  const endingOption = findOption(ENDING_OPTIONS, ending);
  const agenda = chosen.flagsReview ? reviewAgenda(reactionPrompts) : [];

  const opening = complete ? "Scene closed" : "Scene left open, carries forward";
  const logLine = [
    `${opening} -- ${chosen.logPhrase}.`,
    endingOption ? `Ended: ${endingOption.label}.` : null,
    (typeof notes === "string" ? notes.trim() : "") || null
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ok: true,
    verdict: chosen.id,
    complete,
    // A panic never advances the table, and neither does an unfinished
    // scene. Both gates matter: one is about the GM needing to stay put,
    // the other about the scene not being over.
    advances: chosen.advances && complete,
    flaggedForReview: chosen.flagsReview,
    logLine,
    review: chosen.flagsReview ? { verdict: chosen.id, agenda } : null,
    delta: { reviewFlags: chosen.flagsReview ? 1 : 0 }
  };
}
