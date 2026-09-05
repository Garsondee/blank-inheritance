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
