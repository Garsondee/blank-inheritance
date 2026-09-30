/**
 * Clearance-tiered document redaction.
 *
 * THE SECURITY MODEL, STATED PLAINLY
 * ----------------------------------
 * Redacted text is REMOVED, not hidden. There is no CSS trick here, no
 * `color: transparent`, no `visibility: hidden`, no client-side decryption.
 * A page rendered for a tier holds none of the words that tier is not cleared
 * for, so "view source", "disable CSS", "select all and copy", the
 * accessibility tree, Foundry's own journal source editor, and Ctrl+F on THAT
 * PAGE all find exactly nothing — because there is nothing there to find.
 *
 * That is the only redaction design that survives contact with a curious
 * player looking at the page, and it is cheap: we already generate journal
 * pages per document, so we generate one per clearance tier and let Foundry's
 * own ownership permissions decide who can open which.
 *
 * WHAT OWNERSHIP DOES NOT DO (verified live 2026-09-29, GH #212): it decides
 * who may OPEN a page, not what their browser is SENT. A Player-role client
 * held every document it had no permission on, in full (other players' private
 * handouts, the GM-only vaults), and a higher tier's version is a document like
 * any other. So a higher tier's words are out of reach of the interface and of
 * casual inspection, not of a player who reads the world's documents in the
 * browser's developer tools. This module never claims more than that.
 *
 * WHAT THIS DELIBERATELY DOES NOT PROTECT AGAINST
 * A player who is *granted* a higher-clearance page can read it. That is the
 * point — uncovering less-censored versions is the intended play (see
 * ideas/entries/redacted-document-chain.json). This module controls what is
 * in a given rendered version, not who is handed which version.
 *
 * THE ONE REMAINING LEAK, ACKNOWLEDGED
 * A redaction bar has a width, and width correlates with length. Real
 * redactions leak exactly this and it is part of why they are fun to stare
 * at. We quantise and jitter the width (deterministically, so it does not
 * shimmer between renders) so the exact character count is not recoverable,
 * but a long bar still means a long phrase. That is intended.
 *
 * Pure module: no Foundry globals. See design/testing-strategy.md §1.
 */

/**
 * Clearance tiers. Numbers, not names, so comparisons are ordered — a viewer
 * sees everything at or below their own tier.
 *
 * The Japanese markings are the real ones used on classified documents, and
 * are what the UI stamps on the page.
 */
export const CLEARANCE = Object.freeze({
  OPEN: 0,          // 公開      — public record
  INTERNAL: 1,      // 部外秘    — not for outside distribution
  CONFIDENTIAL: 2,  // 秘        — confidential
  SECRET: 3,        // 機密      — secret
  ABSOLUTE: 4       // 極秘      — top secret
});

export const CLEARANCE_MARKING = Object.freeze({
  0: { kanji: "公開",   romaji: "KOUKAI",   label: "OPEN RECORD" },
  1: { kanji: "部外秘", romaji: "BUGAIHI",  label: "INTERNAL" },
  2: { kanji: "秘",     romaji: "HI",       label: "CONFIDENTIAL" },
  3: { kanji: "機密",   romaji: "KIMITSU",  label: "SECRET" },
  4: { kanji: "極秘",   romaji: "GOKUHI",   label: "ABSOLUTE" }
});

/**
 * Authoring syntax, used in campaign JSON page content:
 *
 *   Units listed below are held pending assessment.
 *   <redact c="3">Kurosawa, Ryuu — deceased 04/11</redact> remains
 *   <redact c="2">unrecoverable</redact> at time of writing.
 *
 * c = the clearance a viewer needs to read it. Anyone below that gets a bar.
 *
 * Chosen over `{{...}}` (collides with Handlebars) and `[[...]]` (collides
 * with Foundry's inline roll syntax). Nesting is not supported and throws.
 */
const REDACT_TAG = /<redact\s+c=["'](\d+)["']\s*>([\s\S]*?)<\/redact>/gi;
const ANY_REDACT_OPEN = /<redact\b/i;

/** FNV-1a. Small, dependency-free, and deterministic across runs/machines —
 *  the bars must look identical every render or they shimmer distractingly. */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The longest single bar we will emit, in `ch`.
 *
 * A bar is an inline-block, so it cannot break across lines. Emitting one
 * 78ch bar for a long classified sentence would shove it off the measure.
 * Real redactions of a long passage are several separate strokes running
 * across several lines, which is both what this should look like and a
 * happy second obscuring: the reader counts bars, not characters.
 */
const MAX_BAR_CH = 17;

/**
 * Total bar width in `ch`, quantised and jittered so the exact character
 * count is not readable off the page, while long phrases still run long.
 */
function totalWidthCh(text, salt) {
  const visible = text.replace(/<[^>]*>/g, "").trim();
  const n = [...visible].length;
  const quantised = Math.max(3, Math.round(n / 1.5) * 1.5);
  const jitter = ((hash32(salt + ":" + n) % 1000) / 1000 - 0.5) * 1.4; // ±0.7ch
  return Math.round((quantised + jitter) * 10) / 10;
}

/**
 * Split a total width into per-bar widths, each at most MAX_BAR_CH, with
 * deterministic jitter so the run looks hand-struck rather than tiled.
 */
function splitIntoBars(total, salt) {
  const count = Math.max(1, Math.ceil(total / MAX_BAR_CH));
  const even = total / count;
  const widths = [];
  for (let i = 0; i < count; i++) {
    const j = ((hash32(`${salt}:bar:${i}`) % 1000) / 1000 - 0.5) * (even * 0.34);
    widths.push(Math.round(Math.min(MAX_BAR_CH, Math.max(2.5, even + j)) * 10) / 10);
  }
  return widths;
}

/** Which of three edge-noise filters this bar uses, so adjacent bars differ. */
function edgeVariant(salt) {
  return (hash32("edge:" + salt) % 3) + 1;
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Redact `html` for a viewer at `viewerClearance`.
 *
 * Returns { html, redactionCount, highestTierSeen } — the html contains NO
 * trace of the removed text.
 *
 * `salt` should be stable per document (the page id works well) so a given
 * document's bars look the same every time it renders, but two different
 * documents do not share an identical pattern of bar widths.
 */
export function redactHtml(html, viewerClearance, { salt = "" } = {}) {
  const source = String(html ?? "");

  // Guard against nesting before we start replacing, because the non-greedy
  // match would close on the wrong tag and could emit inner plaintext.
  assertNoNestedRedactions(source);

  let redactionCount = 0;
  let highestTierSeen = 0;

  let index = 0;
  const out = source.replace(REDACT_TAG, (_match, tierRaw, inner) => {
    const tier = Number(tierRaw);
    highestTierSeen = Math.max(highestTierSeen, tier);
    index += 1;

    // Cleared to read it: unwrap and keep the text.
    if (viewerClearance >= tier) return inner;

    redactionCount += 1;
    const salted = `${salt}#${index}`;
    const marking = CLEARANCE_MARKING[tier] ?? CLEARANCE_MARKING[4];
    const widths = splitIntoBars(totalWidthCh(inner, salted), salted);

    // NOTE what is NOT in this output: `inner`. Only widths, a tier, and a
    // decorative variant survive. The run is labelled once, on the first bar,
    // so a screen reader says "redacted" a single time rather than once per
    // stroke; the rest are explicitly hidden from the accessibility tree.
    // Bars are joined by a real space so the run wraps across lines.
    return widths
      .map((width, i) => {
        const variant = edgeVariant(`${salted}:${i}`);
        const a11y =
          i === 0
            ? `role="img" aria-label="Redacted — clearance ${escapeAttr(marking.label)} required"`
            : `aria-hidden="true"`;
        return (
          `<span class="bi-redacted" data-tier="${tier}" data-edge="${variant}" ` +
          `style="--bi-redact-w:${width}ch" ${a11y} ` +
          `title="${escapeAttr(marking.kanji)} ${escapeAttr(marking.label)}"></span>`
        );
      })
      .join(" ");
  });

  assertNoUnprocessedRedactions(out);
  return { html: out, redactionCount, highestTierSeen };
}

/**
 * Nesting would break the non-greedy regex in a way that leaks text, so it is
 * a hard error rather than a best-effort parse.
 */
export function assertNoNestedRedactions(html) {
  const source = String(html ?? "");
  let depth = 0;
  const token = /<redact\b|<\/redact\s*>/gi;
  let m;
  while ((m = token.exec(source)) !== null) {
    if (m[0].toLowerCase().startsWith("</")) {
      depth -= 1;
      if (depth < 0) throw new Error("redact: closing </redact> with no matching open tag");
    } else {
      depth += 1;
      if (depth > 1) throw new Error("redact: nested <redact> tags are not supported");
    }
  }
  if (depth !== 0) throw new Error("redact: unclosed <redact> tag");
}

/**
 * Last line of defence. If a `<redact>` tag ever survives into generated
 * output it means some path built content without going through redactHtml —
 * and that path would ship every classified word straight to the players.
 * Fail loudly at build time rather than quietly at the table.
 */
export function assertNoUnprocessedRedactions(html) {
  if (ANY_REDACT_OPEN.test(String(html ?? ""))) {
    throw new Error(
      "redact: unprocessed <redact> tag in generated output — some content path " +
        "skipped redactHtml(). This would have published classified text to players."
    );
  }
}

/**
 * GM-side helper: what tiers a source document actually uses, so the module
 * can generate exactly the versions that differ instead of one per tier.
 */
export function redactionTiers(html) {
  const tiers = new Set();
  for (const m of String(html ?? "").matchAll(REDACT_TAG)) tiers.add(Number(m[1]));
  return [...tiers].sort((a, b) => a - b);
}
