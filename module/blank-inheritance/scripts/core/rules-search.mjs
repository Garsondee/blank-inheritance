/**
 * The Rules drawer — the pure half.
 *
 * design/ux-doctrine.md §10.7: "a search box over the 205 [now 245] locally
 * mirrored SRD articles in reference/srd/... buildable today and answers the
 * rulebook's own first-listed GM priority, answering questions quickly and
 * decisively. Results are short, with the page citation, because a GM
 * mid-scene needs an answer and a reference, not an article."
 *
 * Not a real inverted index or a fuzzy matcher — with 245 documents, scoring
 * every one of them per query is fast enough not to need either, and a
 * simple, explainable score (title match beats a body match, more
 * occurrences beat fewer) is easier for a GM to trust than a ranking they
 * can't reason about. `tools/rules-search/build-index.mjs` builds the index
 * this operates on, from the real reference/srd/ mirror.
 */

/** Splits a query into lowercase, non-empty words. Shared by the scorer and the excerpt builder so they agree on what "a match" means. */
function termsFor(query) {
  return (query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/**
 * A short window of `text` around the first matched term, so a result reads
 * as "an answer and a reference," never the whole article. Falls back to the
 * article's own opening if no term is found in the body (a title-only
 * match) rather than showing nothing.
 */
export function excerptFor(text, terms, { radius = 90 } = {}) {
  const lower = text.toLowerCase();
  let hitAt = -1;
  for (const term of terms) {
    const at = lower.indexOf(term);
    if (at !== -1 && (hitAt === -1 || at < hitAt)) hitAt = at;
  }
  if (hitAt === -1) return text.length > radius * 2 ? `${text.slice(0, radius * 2).trim()}…` : text;

  const start = Math.max(0, hitAt - radius);
  const end = Math.min(text.length, hitAt + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/**
 * Ranked, short results for `query` against `index` (the shape
 * build-index.mjs produces: {id, title, book, chapter, pageCitation,
 * sourceUrl, text}). An exact title match scores far above anything else,
 * since "what is off-guard" typed against the Off-Guard article is the
 * single most common real case; after that, title occurrences count more
 * than body occurrences, and body occurrences accumulate with repetition.
 * Empty/whitespace query returns no results rather than the whole corpus --
 * this is a lookup, not a browser.
 */
export function searchRules(index = [], query, { limit = 8 } = {}) {
  const terms = termsFor(query);
  if (!terms.length) return [];

  const scored = [];
  for (const article of index) {
    const titleLower = (article.title ?? "").toLowerCase();
    const textLower = (article.text ?? "").toLowerCase();
    let score = 0;
    if (titleLower === terms.join(" ")) score += 1000;
    for (const term of terms) {
      if (titleLower.includes(term)) score += 50;
      score += countOccurrences(textLower, term);
    }
    if (score > 0) {
      scored.push({
        id: article.id,
        title: article.title,
        pageCitation: article.pageCitation ?? null,
        sourceUrl: article.sourceUrl ?? null,
        excerpt: excerptFor(article.text ?? "", terms),
        score
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit).map(({ score, ...result }) => result);
}
