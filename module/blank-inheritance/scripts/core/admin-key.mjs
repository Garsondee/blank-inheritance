/**
 * Where the admin key sits (foundry/admin-button.mjs draws it).
 *
 * The key is the big red launch button that opens the admin panel from the
 * main screen (Ingram, 2026-10-01): "on the right side of the UI, to the right
 * of the macro bar stuff but not where the chat toaster popups would appear".
 * Pure geometry, no Foundry: the adapter measures the screen and hands the
 * rectangles here.
 *
 * Three rules decide the spot, in this order:
 *   1. Home is the macro bar's own baseline, against the sidebar's left edge:
 *      the right-hand end of the row the macro bar stands in.
 *   2. Never on top of the macro bar. If its right end would run under the key
 *      (a narrow window, or the scene runner open beside it), the key lifts to
 *      stand just above the macro bar instead of over it.
 *   3. Never where chat toasts appear. Foundry pops floating chat messages
 *      into a column the width of the sidebar (#chat-notifications) that
 *      ends well above the macro bar row, so at home the key is clear of it
 *      in both sidebar states (measured live 2026-10-01: the column's foot
 *      was 93px above the macro bar). It is still checked, not assumed: on a
 *      short window, or when a lift raises the key into the column's height,
 *      the key slides left to stand beside the column instead.
 */

/** The key's own size, in CSS pixels: the plate it is mounted in. */
export const ADMIN_KEY_SIZE = 96;

/** Clear air between the key and whatever is beside it. */
export const ADMIN_KEY_GAP = 20;

/** Distance from the bottom edge when nothing can be measured to anchor on. */
export const ADMIN_KEY_FALLBACK_BOTTOM = 86;

const finite = (n) => typeof n === "number" && Number.isFinite(n);
const isRect = (r) => Boolean(r) && [r.left, r.right, r.top, r.bottom].every(finite) && r.right > r.left && r.bottom > r.top;

const overlaps = (a, b, pad = 0) =>
  a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;

/**
 * @param {object} input
 * @param {number} input.viewportWidth
 * @param {number} input.viewportHeight
 * @param {number} [input.sidebarLeft] - left edge of the sidebar, collapsed or expanded; absent means the screen's edge
 * @param {{left:number,right:number,top:number,bottom:number}|null} [input.hotbar] - the macro bar's rectangle
 * @param {{left:number,right:number,top:number,bottom:number}|null} [input.chat] - the chat toast column's rectangle
 * @param {number} [input.size]
 * @param {number} [input.gap]
 * @returns {{ right: number, bottom: number, lifted: boolean, besideChat: boolean }}
 *   right/bottom: px from the viewport's right/bottom edge to the key's right/bottom edge
 */
export function adminKeyPlacement({ viewportWidth, viewportHeight, sidebarLeft, hotbar = null, chat = null, size = ADMIN_KEY_SIZE, gap = ADMIN_KEY_GAP } = {}) {
  if (!finite(viewportWidth) || !finite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
    return { right: gap, bottom: ADMIN_KEY_FALLBACK_BOTTOM, lifted: false, besideChat: false };
  }

  const macro = isRect(hotbar) ? hotbar : null;
  const toasts = isRect(chat) ? chat : null;

  // The key stands on the macro bar's baseline; with no macro bar to read, on a fixed one.
  const baseBottom = macro ? Math.max(0, viewportHeight - macro.bottom) : ADMIN_KEY_FALLBACK_BOTTOM;
  let right = Math.max(0, viewportWidth - (finite(sidebarLeft) ? sidebarLeft : viewportWidth)) + gap;
  let lift = 0;

  const keyAt = (rightPx, liftPx) => ({
    left: viewportWidth - rightPx - size,
    right: viewportWidth - rightPx,
    top: viewportHeight - baseBottom - liftPx - size,
    bottom: viewportHeight - baseBottom - liftPx
  });

  // Each pass re-asks both questions from the baseline. `right` only ever moves
  // left, so this settles; the cap is a backstop, not an expectation.
  for (let pass = 0; pass < 4; pass++) {
    const wantLift = macro && overlaps(keyAt(right, 0), macro, gap) ? Math.round(macro.bottom - macro.top + gap) : 0;
    const wantRight = toasts && overlaps(keyAt(right, wantLift), toasts, gap) ? Math.max(right, Math.round(viewportWidth - toasts.left + gap)) : right;
    if (wantLift === lift && wantRight === right) break;
    lift = wantLift;
    right = wantRight;
  }

  return {
    right: Math.round(right),
    bottom: Math.round(baseBottom + lift),
    lifted: lift > 0,
    besideChat: Boolean(toasts) && right >= Math.round(viewportWidth - toasts.left + gap)
  };
}
