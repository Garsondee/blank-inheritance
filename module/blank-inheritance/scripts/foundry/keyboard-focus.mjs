/**
 * Lets a window of this adventure keep the keys it needs, instead of Foundry eating them first.
 *
 * Foundry's keyboard manager listens on `window` for every key and, in the game view, answers the ones it has bindings for (Tab is "Cycle
 * View", the arrow keys, + and -, Page Up and Page Down move or zoom the camera) by calling `preventDefault()` and `stopPropagation()`:
 * the browser never moves focus, a slider never sees its arrow, and the scene behind the window pans or zooms instead
 * (client/helpers/interaction/keyboard-manager.mjs#_processKeyboardContext). It makes one exception: when the focused element "has focus"
 * in its sense, the key is left alone, and `hasFocus` says so for an input, a select, a text area, an editor, a button inside a form, or
 * ANY element carrying `data-keyboard-focus` (empty or "true"). That attribute is Foundry's own way of saying "the keys are this
 * element's".
 *
 * The induction terminal is a form made of buttons and a crop area, none of them inside a <form>, so with the stock behaviour a player who
 * could not use a mouse could not press Begin (Tab did nothing) and a player cropping a photo with the arrow keys moved the scene
 * camera. Found by the playtest rig, 2026-10-06 (design/playtest-process.md §12; the keyboard-only seat could not get past Page 1, and the
 * crop's keys panned the scene behind it). Marking whatever has focus inside the window hands the keys to it for exactly as long as it
 * has focus, and to Foundry the moment focus leaves.
 */

/**
 * Mark the element that has focus inside `root` as owning the keyboard, now and whenever focus moves within it.
 * @param {EventTarget & {contains?: (n: any) => boolean}} root the window's element
 * @param {{ getActive?: () => any }} [options] where to read the focused element from (tests pass a stand-in)
 * @returns {() => void} a function that stops marking (the attribute already set stays on its element, which is harmless)
 */
export function claimKeyboardFor(root, { getActive = () => globalThis.document?.activeElement } = {}) {
  if (!root?.addEventListener) return () => {};
  const mark = (element) => {
    if (element?.dataset) element.dataset.keyboardFocus = "true";
  };
  const onFocusIn = (event) => mark(event.target);
  root.addEventListener("focusin", onFocusIn);
  // A page change focuses its title before anyone is listening on a fresh render: the element focused right now counts too.
  const active = getActive();
  if (active && root.contains?.(active)) mark(active);
  return () => root.removeEventListener("focusin", onFocusIn);
}
