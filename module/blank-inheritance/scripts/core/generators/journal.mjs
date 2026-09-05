import { deriveFoundryId } from "../ids.mjs";

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

  const pages = [];
  for (const [index, page] of (source.pages ?? []).entries()) {
    pages.push({
      _id: await deriveFoundryId(`${source.id}:page:${page.id}`),
      name: page.name ?? page.id,
      type: "text",
      title: { level: page.titleLevel ?? 1 },
      text: { content: page.content ?? "", format: HTML_FORMAT },
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
 */
export function episodeToJournalSource(episode) {
  const overviewParts = [
    paragraph("Summary", episode.summary),
    paragraph("Deployment", episode.deploymentRule),
    paragraph("Ground roles", episode.groundRoleRule),
    paragraph("Downtime", episode.downtime),
    paragraph("Design requirement", episode.designRequirement),
    paragraph("Structure", episode.structure),
    paragraph("Casting note", episode.castingNote)
  ];
  if (episode.requiredBeats?.length) {
    const items = episode.requiredBeats.map((beat) => `<li>${escapeHtml(beat)}</li>`).join("");
    overviewParts.push(`<p><strong>Required beats:</strong></p><ul>${items}</ul>`);
  }

  const pages = [{ id: "overview", name: "Overview", content: overviewParts.filter(Boolean).join("\n") }];

  for (const scene of episode.scenes ?? []) {
    const bodyParts = [`<p>${escapeHtml(scene.description ?? "")}</p>`];
    if (scene.encounterRef) bodyParts.push(paragraph("Encounter", scene.encounterRef));
    if (scene.subsystemRef) bodyParts.push(paragraph("Subsystem", scene.subsystemRef));
    if (scene.challengeRefs?.length) bodyParts.push(paragraph("Challenges", scene.challengeRefs.join(", ")));
    pages.push({ id: `scene-${scene.order}`, name: `${scene.order}. ${scene.title}`, content: bodyParts.join("\n") });
  }

  return { id: episode.id, name: episode.title ?? episode.id, pages };
}
