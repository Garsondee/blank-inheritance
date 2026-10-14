/**
 * How the occlusion detector's hits are grouped into findings. Pure.
 *
 * The first agent run filed forty "a control is covered" findings, one per covered element and cover, that came down to a handful of
 * causes (the player deck's parts lying over the induction terminal's lower rows; the induction's prompt fields over the hotbar). A
 * board of forty near-identical slips buries the real signal and costs the triage time the run was meant to save
 * (design/playtest-process.md section 13). So a hit is keyed by its CAUSE: the window it happened in and the component doing the
 * covering. Every later hit of the same cause only raises the finding's occurrence count.
 */

/**
 * The component a CSS-ish selector belongs to: the BEM block of its first class (`span.bi-deck-key__plate` -> `bi-deck`,
 * `div.bi-orb-deck` -> `bi-orb`), else of its id (`input#bi-prompt-age...` -> `bi-prompt`), else its first plain class
 * (`li.slot.open` -> `slot`), else its tag (`circle` -> `circle`).
 */
export function componentOf(selector) {
  const sel = String(selector ?? "").trim();
  if (!sel) return "unknown";
  const tag = sel.match(/^[a-z][a-z0-9-]*/i)?.[0]?.toLowerCase() ?? "";
  const id = sel.match(/#([A-Za-z0-9_-]+)/)?.[1] ?? "";
  const cls = sel.match(/\.([A-Za-z0-9_-]+)/)?.[1] ?? "";
  const block = (name) => {
    const base = name.split("__")[0];
    const parts = base.split("-");
    return parts[0] === "bi" && parts.length > 2 ? parts.slice(0, 2).join("-") : base;
  };
  if (cls) return block(cls);
  if (id) return block(id);
  return tag || "unknown";
}

/** The finding key and summary for one occlusion hit, grouped by cause. */
export function occlusionCause(hit) {
  const where = hit.window ?? "page";
  const cover = hit.coveredByKind === "the scene canvas" ? "the scene canvas" : componentOf(hit.coveredBy);
  return {
    key: `detector:occlusion|${where}|${cover}`,
    summary: `Controls in ${where === "page" ? "the page" : where} are covered by ${cover}${hit.element ? ` (first seen: ${hit.element}${hit.coveredBy ? ` under ${hit.coveredBy}` : ""})` : ""}`
  };
}
