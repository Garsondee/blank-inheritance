/**
 * `@Cue[cue-id]{Label}` in any journal page — design/audio-system.md §5.5,
 * the "trigger music from a journal" direction.
 *
 * Written as a Foundry text enricher (CONFIG.TextEditor.enrichers), the same
 * mechanism sf2e's own `@Check[...]` buttons use, so a cue link works anywhere
 * text is enriched: a journal page, a chat message, an item description, a
 * scene-brief beat.
 *
 * Only a GM gets a control. A player's copy of the page renders the label as
 * plain text — not a disabled button, which would advertise that something is
 * there to press (doctrine Law 11: removal, not hiding).
 */

import { cachedAudio } from "./audio-store.mjs";
import { runCue } from "./audio-director.mjs";

const MODULE_ID = "blank-inheritance";
const PATTERN = /@Cue\[([a-z0-9][a-z0-9-]*)\](?:\{([^}]+)\})?/g;

/** The label a link shows: the author's own, else the cue's title, else its id. */
function labelFor(cueId, given) {
  if (given) return given;
  const cue = cachedAudio()?.cues?.get(cueId);
  return cue?.title ?? cueId;
}

export function registerAudioEnricher() {
  CONFIG.TextEditor.enrichers.push({
    pattern: PATTERN,
    enricher: async (match) => {
      const [, cueId, label] = match;
      const text = labelFor(cueId, label);
      if (!game.user.isGM) return document.createTextNode(text);

      const known = !!cachedAudio()?.cues?.has(cueId);
      const anchor = document.createElement("a");
      anchor.className = `bi-cue-link${known ? "" : " bi-cue-link--unknown"}`;
      anchor.dataset.biCue = cueId;
      anchor.innerHTML = `<i class="fa-solid fa-music"></i> ${foundry.utils.escapeHTML(text)}`;
      anchor.dataset.tooltip = known
        ? game.i18n.format("BLANKINHERITANCE.Audio.CueLinkTooltip", { id: cueId })
        : game.i18n.format("BLANKINHERITANCE.Audio.CueLinkUnknown", { id: cueId });
      return anchor;
    }
  });

  // One delegated listener rather than one per rendered link: enriched content
  // is re-rendered constantly (every journal open, every chat message), and
  // binding per element is how listeners quietly multiply.
  document.addEventListener("click", (event) => {
    const link = event.target?.closest?.("a.bi-cue-link");
    if (!link || !game.user.isGM) return;
    event.preventDefault();
    const cueId = link.dataset.biCue;
    runCue(cueId).catch((err) => {
      console.error(`Blank Inheritance | Cue "${cueId}" failed:`, err);
      ui.notifications.warn(game.i18n.format("BLANKINHERITANCE.Audio.CueFailed", { id: cueId }));
    });
  });
}

/** Exported for the tier-1 test: the exact pattern authors type. */
export const CUE_PATTERN = PATTERN;
