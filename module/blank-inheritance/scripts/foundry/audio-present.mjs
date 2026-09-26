/**
 * What a musical marker actually puts on screen — design/audio-system.md §5.4.
 *
 * Each client calls this at ITS OWN playback position of the track, not when
 * the GM's copy reached the beat, so a reveal lands on the same note on every
 * screen even though every browser started the track a fraction of a second
 * apart (foundry/audio-director.mjs#delayForSync).
 *
 * The content travels with the reveal rather than being granted in advance:
 * nothing about a handout reaches a player's browser until the moment it
 * lands (doctrine Law 11 — redaction is removal, not hiding).
 */

import { showNotice } from "./sting.mjs";

/** core/notices.mjs's own kinds. An unknown one would throw inside the queue. */
const NOTICE_KINDS = new Set(["info", "caution", "alert"]);

/** Foundry's own image popout, opened locally — no permissions, no broadcast, exact timing. */
function showImage({ src, title }) {
  if (!src) return;
  new foundry.applications.apps.ImagePopout({ src, window: { title: title ?? "" } }).render({ force: true });
}

/**
 * A handout as a PAPER card. The register is deliberate: a document looks like
 * a document whatever screen shows it (design/ux-doctrine.md §7b), and the
 * rest of the console is GLASS.
 */
async function showHandout({ title, body, image }) {
  const parts = [];
  if (image) parts.push(`<img class="bi-audio-handout__image" src="${image}" alt="${foundry.utils.escapeHTML(title ?? "")}">`);
  if (body) parts.push(`<div class="bi-audio-handout__body">${body}</div>`);
  const content = `<div class="bi-doc bi-audio-handout">${parts.join("") || `<p>${foundry.utils.escapeHTML(title ?? "")}</p>`}</div>`;
  const dialog = new foundry.applications.api.DialogV2({
    window: { title: title ?? game.i18n.localize("BLANKINHERITANCE.Audio.Handout") },
    classes: ["bi-theme", "bi-audio-handout-window"],
    content,
    buttons: [{ action: "close", label: "BLANKINHERITANCE.Audio.Close", default: true }],
    modal: false
  });
  return dialog.render({ force: true });
}

/**
 * Present one payload on this client. Never throws: a reveal that fails must
 * not take the music down with it.
 */
export function presentLocally(payload) {
  try {
    switch (payload?.kind) {
      case "banner":
        return showNotice(NOTICE_KINDS.has(payload.noticeKind) ? payload.noticeKind : "info", payload.text);
      case "image":
        return showImage(payload);
      case "handout":
        return showHandout(payload);
      default:
        console.warn(`Blank Inheritance | Unknown audio presentation "${payload?.kind}"`);
        return null;
    }
  } catch (err) {
    console.error(`Blank Inheritance | Could not present ${payload?.kind}:`, err);
    return null;
  }
}
