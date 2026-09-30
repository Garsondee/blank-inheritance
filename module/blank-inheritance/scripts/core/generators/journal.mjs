import { deriveFoundryId } from "../ids.mjs";
import { redactHtml, assertNoUnprocessedRedactions } from "../redact.mjs";
import { CLEARED_STATUSES } from "../promote.mjs";

const HTML_FORMAT = 1; // CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML (foundryvtt common/constants.mjs:993)
const SORT_INTEGER_DENSITY = 100000; // spacing convention Foundry itself uses for sortable siblings (common/constants.mjs:955)

/**
 * source shape (v0 test-fixture format, not a data/schema entity yet):
 * { id, name, pages: [{ id, name, content, titleLevel? }] }
 *
 * Every page is built as a "text" JournalEntryPage — the only page type this
 * campaign needs so far (scene prose, GM notes). image/pdf/video pages exist
 * in Foundry's schema but nothing here authors them yet.
 *
 * Pure: no Foundry globals. Field paths checked against foundryvtt's real
 * JournalEntry/JournalEntryPage schema by test/tier3-contract.test.mjs.
 */
export async function buildJournalEntryData(source) {
  const id = await deriveFoundryId(source.id);

  // `clearance` is the tier this generated version is FOR. Content authored
  // with <redact c="n"> is stripped for anything above it — removed, not
  // hidden (see core/redact.mjs). Default 0: an un-cleared version is the
  // safe default, so forgetting to pass a clearance over-censors rather than
  // publishing secrets.
  const clearance = Number(source.clearance ?? 0);

  const pages = [];
  for (const [index, page] of (source.pages ?? []).entries()) {
    const pageId = await deriveFoundryId(`${source.id}:page:${page.id}`);
    const { html } = redactHtml(page.content ?? "", clearance, {
      salt: `${source.id}:${page.id}`
    });
    // Belt and braces: nothing leaves this generator with a live redact tag.
    assertNoUnprocessedRedactions(html);

    pages.push({
      _id: pageId,
      name: page.name ?? page.id,
      type: "text",
      title: { level: page.titleLevel ?? 1 },
      text: { content: html, format: HTML_FORMAT },
      sort: (index + 1) * SORT_INTEGER_DENSITY
    });
  }

  return {
    _id: id,
    name: source.name ?? source.id,
    pages
  };
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraph(label, value) {
  if (!value) return "";
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

// design/approvals-desk.md §3, issue #168: "not a silent allow, not a hard
// block." A page whose authoring isn't cleared yet (CLEARED_STATUSES: the
// Desk's sound/final, or a scene the Sign-Off sealed live) still exists (the
// GM can see the scene is there and roughly what it's called), but its actual
// prose is replaced with this note rather than shown -- the same "withhold,
// don't hide the structure" shape the Director's panel's cue-gate uses.
const WITHHELD_CONTENT =
  `<p><em>This content is still drafted and has not yet been reviewed -- withheld from the live table view ` +
  `(design/approvals-desk.md §3). Promote it to "sound" or "final" to include the real text here.</em></p>`;

function isReviewed(authoring) {
  return CLEARED_STATUSES.includes(authoring?.status);
}

/**
 * Adapts an episode file (data/episodes/*.json, episode.schema.json) into
 * buildJournalEntryData's {id, name, pages} shape -- one overview page from
 * the episode's own top-level narrative fields, plus one page per authored
 * scene beat. `requiredBeats`/`danglingThreads`/`openQuestionRefs` are
 * cross-reference ids or planning bullets, not prose, so only the ones with
 * actual sentence-shaped content (requiredBeats) get rendered; the pure-id
 * ref lists are left out of the GM-facing prose on purpose.
 *
 * Every field here was confirmed present in a real episode file before being
 * read (episode-01 has authored scenes; episode-02 and the interlude don't
 * yet, so a bare overview page is the correct, honest output for those, not
 * a bug) -- see data/episodes/*.json.
 *
 * Gating is per-page, not per-episode (issue #168): the episode's OWN
 * authoring gates the overview page; each scene's own authoring gates that
 * scene's page independently. This is deliberately finer-grained than
 * sync.mjs's NPC/creature gate (which withholds the whole document, since
 * those have no sub-structure to partially reveal) -- a scene is the actual
 * unit design/approvals-desk.md §1 grades, so partial episode progress must
 * be representable without waiting for every scene to clear at once.
 */
export function episodeToJournalSource(episode) {
  const overviewParts = [
    paragraph("Summary", episode.summary),
    paragraph("Deployment", episode.deploymentRule),
    paragraph("Downtime", episode.downtime),
    paragraph("Design requirement", episode.designRequirement),
    paragraph("Structure", episode.structure),
    paragraph("Casting note", episode.castingNote)
  ];
  if (episode.requiredBeats?.length) {
    const items = episode.requiredBeats.map((beat) => `<li>${escapeHtml(beat)}</li>`).join("");
    overviewParts.push(`<p><strong>Required beats:</strong></p><ul>${items}</ul>`);
  }

  const overviewContent = isReviewed(episode.authoring) ? overviewParts.filter(Boolean).join("\n") : WITHHELD_CONTENT;
  const pages = [{ id: "overview", name: "Overview", content: overviewContent }];

  for (const scene of episode.scenes ?? []) {
    // A scene's own `id` when it has one, position only as the fallback for
    // the nine scenes authored before that field existed. Keyed on `order`
    // alone, inserting a scene silently reassigns every page id after it --
    // and a Foundry page id is what a link, a bookmark, or a run record
    // points at.
    const pageId = scene.id ?? `scene-${scene.order}`;
    const pageName = `${scene.order}. ${scene.title}`;

    if (!isReviewed(scene.authoring)) {
      pages.push({ id: pageId, name: pageName, content: WITHHELD_CONTENT });
      continue;
    }

    const bodyParts = [`<p>${escapeHtml(scene.description ?? "")}</p>`];
    if (scene.encounterRef) bodyParts.push(paragraph("Encounter", scene.encounterRef));
    if (scene.subsystemRef) bodyParts.push(paragraph("Subsystem", scene.subsystemRef));
    if (scene.challengeRefs?.length) bodyParts.push(paragraph("Challenges", scene.challengeRefs.join(", ")));
    pages.push({ id: pageId, name: pageName, content: bodyParts.join("\n") });
  }

  return { id: episode.id, name: episode.title ?? episode.id, pages };
}
