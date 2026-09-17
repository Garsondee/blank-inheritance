/**
 * The Director's Palette — the Foundry half.
 *
 * Builds the live command list out of the world as it currently is (every
 * scene, every actor, every soundscape and cue, the beats of the open scene
 * brief) and runs whichever one the GM picks. All the ranking and keyboard
 * behaviour is in core/director-palette.mjs.
 *
 * GM-ONLY BY CONSTRUCTION, like the Scene Runner and the Sound Desk: the class
 * is never instantiated on a player's client (doctrine Law 11 — redaction is
 * removal, not hiding).
 *
 * Every command is a thin call into machinery that already exists and is
 * already tested. Nothing here reimplements a behaviour; the palette's whole
 * job is to put two hundred existing verbs one keystroke away.
 */

import {
  IMPROVISED_OUTCOMES,
  matchCommands,
  moveSelection,
  paletteModel,
  rememberCommand
} from "../core/director-palette.mjs";

import { cueScene, pullEveryoneHere } from "./director-panel.mjs";
import { openCharacterCard } from "./character-card.mjs";
import { recordLogEntry } from "./session-log.mjs";
import { postInlineCheck } from "./rolls.mjs";
import { removeFromStage, summonToStage } from "./stage.mjs";
import { openSceneCloseDialogue } from "./scene-close.mjs";
import { toggleSoundDesk } from "./sound-desk.mjs";
import { toggleSceneRunner } from "./scene-runner.mjs";
import { toggleSummonPanel } from "./summon-panel.mjs";
import { togglePhone } from "./phone.mjs";
import { toggleCityBoard } from "./city-board.mjs";
import { toggleConsoleWindow } from "./console-window.mjs";
import { advanceSegment } from "./campaign-state.mjs";
import { cachedAudio, loadAudio } from "./audio-store.mjs";
import { applySoundscape, playMusicPool, runCue, stopAllAudio } from "./audio-director.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/palette`;
const SETTING_RECENTS = "paletteRecents";

export function registerPaletteSettings() {
  game.settings.register(MODULE_ID, SETTING_RECENTS, { scope: "client", config: false, type: Array, default: [] });
}

const recents = () => {
  try { return game.settings.get(MODULE_ID, SETTING_RECENTS) ?? []; } catch { return []; }
};

/* ---------------------------------------------------------------- */
/*  Building the live command list                                   */
/* ---------------------------------------------------------------- */

const sceneKind = (scene) => scene.getFlag(MODULE_ID, "kind");

/**
 * Cutting to a scene, one command per scene in the world.
 *
 * `cueScene` rather than `scene.activate()` because that is the verb the
 * Director's panel already uses: it activates AND applies the authored
 * transition, so a cut from the palette looks the same as a cut from the panel.
 */
function sceneCommands() {
  const byKind = { landing: 0, hub: 1, beat: 2, sub: 3, place: 4 };
  return game.scenes.contents
    .slice()
    .sort((a, b) => (byKind[sceneKind(a)] ?? 9) - (byKind[sceneKind(b)] ?? 9) || a.name.localeCompare(b.name))
    .map((scene, i) => ({
      id: `scene.cut.${scene.id}`,
      group: "scene",
      order: i,
      title: `Cut to: ${scene.name}`,
      hint: scene.folder?.name ?? (sceneKind(scene) === "hub" ? "the map" : null),
      icon: "fa-solid fa-clapperboard",
      keywords: ["scene", "cut", "go", scene.folder?.name ?? "", sceneKind(scene) ?? ""],
      run: async () => {
        await cueScene(scene.id);
        await recordLogEntry({ text: `Cut to ${scene.name}.`, nowIso: new Date().toISOString(), scene: scene.name }).catch(() => {});
      }
    }));
}

/** Summoning and dismissing, one command per real character. */
function castCommands() {
  const onStage = new Set((canvas?.scene?.getFlag(MODULE_ID, "stage")?.cast ?? []).map((m) => m.portraitId));
  return game.actors.contents
    .filter((a) => a.type === "character" || a.type === "npc")
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((actor) => {
      const portraitId = `summon-${actor.id}`;
      const here = onStage.has(portraitId);
      return [
        {
          id: `cast.${here ? "dismiss" : "summon"}.${actor.id}`,
          group: "cast",
          title: `${here ? "Dismiss" : "Summon"}: ${actor.name}`,
          hint: here ? "on stage now" : actor.hasPlayerOwner ? "player character" : "NPC",
          icon: here ? "fa-solid fa-person-walking-arrow-right" : "fa-solid fa-person-arrow-down-to-line",
          keywords: ["cast", "stage", "summon", "dismiss", actor.name],
          run: async () => {
            const scene = canvas?.scene;
            if (!scene) return;
            if (here) await removeFromStage(scene, portraitId);
            else await summonToStage(scene, { id: portraitId, label: actor.name, img: actor.img, kind: actor.hasPlayerOwner ? "pc" : "npc", actorId: actor.id });
          }
        },
        {
          id: `cast.card.${actor.id}`,
          group: "cast",
          title: `Character card: ${actor.name}`,
          hint: "facts, attitude, voice",
          icon: "fa-solid fa-id-card",
          keywords: ["card", "npc", "facts", "attitude", actor.name],
          run: () => openCharacterCard(actor.id)
        }
      ];
    });
}

/** Soundscapes and cues, straight off the authored audio (design/audio-system.md). */
function audioCommands() {
  const audio = cachedAudio();
  const out = [
    { id: "audio.desk", group: "audio", order: 0, title: "Open the Sound Desk", icon: "fa-solid fa-sliders", keywords: ["mixer", "faders", "music", "volume"], run: () => toggleSoundDesk() },
    { id: "audio.stop", group: "audio", order: 1, title: "Stop everything", hint: "music and ambience, faded", icon: "fa-solid fa-volume-xmark", keywords: ["silence", "quiet", "stop"], run: () => stopAllAudio({ fadeMs: 1500 }) }
  ];
  if (!audio) return out;

  for (const [id, doc] of audio.soundscapes ?? []) {
    out.push({
      id: `audio.scape.${id}`,
      group: "audio",
      title: `Soundscape: ${doc.title ?? id}`,
      hint: "music, beds and levels together",
      icon: "fa-solid fa-music",
      keywords: ["soundscape", "ambience", "scene audio", id],
      run: () => applySoundscape(id)
    });
  }
  for (const [id, doc] of audio.cues ?? []) {
    out.push({
      id: `audio.cue.${id}`,
      group: "audio",
      title: `Cue: ${doc.title ?? id}`,
      icon: "fa-solid fa-bolt",
      keywords: ["cue", "trigger", id],
      run: () => runCue(id)
    });
  }
  for (const pool of Object.keys(audio.index?.pools ?? {})) {
    out.push({
      id: `audio.pool.${pool}`,
      group: "audio",
      title: `Music: ${pool.replace(/-/g, " ")}`,
      hint: "shuffle the pool",
      icon: "fa-solid fa-shuffle",
      keywords: ["music", "pool", "shuffle", pool],
      run: () => playMusicPool(pool)
    });
  }
  return out;
}

/** The checks a GM reaches for without opening anything. */
function checkCommands() {
  const SKILLS = ["perception", "athletics", "acrobatics", "stealth", "society", "nature", "medicine", "crafting", "computers", "piloting", "survival", "diplomacy", "deception", "intimidation", "thievery", "occultism", "religion", "arcana", "performance"];
  return SKILLS.map((slug, i) => ({
    id: `check.${slug}`,
    group: "check",
    order: i,
    title: `Ask for: ${slug[0].toUpperCase()}${slug.slice(1)}`,
    hint: "posts a rollable check to chat",
    icon: "fa-solid fa-dice-d20",
    keywords: ["check", "roll", "skill", slug],
    run: () => postInlineCheck({ slug })
  }));
}

/**
 * The improvisation floor.
 *
 * design/scene-simulation-testing.md ran a chaos-agent self-play and confirmed
 * the gap this fills: "Chaos Agent refusing outright has nowhere to go...
 * Nothing anywhere addresses a flat refusal of a mandatory beat... a less
 * confident GM has no floor here at all."
 *
 * None of these is clever. They are the five things a GM actually does in the
 * ten seconds after the table goes somewhere nobody wrote down, each made into
 * one keystroke so that reaching for them costs nothing.
 */
function offScriptCommands() {
  const briefId = (() => { try { return game.settings.get(MODULE_ID, "runnerBrief") || null; } catch { return null; } })();

  return [
    {
      id: "off.note",
      group: "off-script",
      order: 0,
      title: "Note what just happened",
      hint: "straight into the session log",
      icon: "fa-solid fa-pen",
      keywords: ["log", "note", "record", "comment", "what happened"],
      run: async () => {
        const text = await promptForText("Note what just happened", "They did something nobody wrote down…");
        if (text) await recordLogEntry({ text, nowIso: new Date().toISOString(), scene: canvas?.scene?.name ?? null });
      }
    },
    {
      id: "off.npc",
      group: "off-script",
      order: 1,
      title: "Improvised NPC — name them and keep them",
      hint: "doctrine §10.3: the thing most forgotten, then contradicted",
      icon: "fa-solid fa-user-plus",
      keywords: ["npc", "improvise", "invent", "name", "stranger"],
      run: async () => {
        const text = await promptForText("Who did you just invent?", "Name, one thing they want, one thing they sound like");
        if (text) await recordLogEntry({ text: `npc ${text}`, nowIso: new Date().toISOString(), scene: canvas?.scene?.name ?? null });
      }
    },
    {
      id: "off.rule",
      group: "off-script",
      order: 2,
      title: "Ruling made at the table",
      hint: "so the same case gets the same answer next time",
      icon: "fa-solid fa-gavel",
      keywords: ["rule", "ruling", "adjudicate", "house rule"],
      run: async () => {
        const text = await promptForText("What did you just rule?", "The case, and what you said");
        if (text) await recordLogEntry({ text: `rule ${text}`, nowIso: new Date().toISOString(), scene: canvas?.scene?.name ?? null });
      }
    },
    {
      id: "off.refused",
      group: "off-script",
      order: 3,
      title: "They refused the beat — mark it and move on",
      hint: briefId ? "marks a beat not-taken in the open scene" : "no scene open in the Runner",
      icon: "fa-solid fa-ban",
      keywords: ["refuse", "refused", "skip", "declined", "walked", "not taken", "chaos"],
      hidden: !briefId,
      run: async () => {
        const text = await promptForText("What did they refuse, and what did it cost?", "A refusal is a real outcome, not an error — say what follows from it");
        if (text) await recordLogEntry({ text: `decision refused: ${text}`, nowIso: new Date().toISOString(), scene: canvas?.scene?.name ?? null });
        toggleSceneRunner();
      }
    },
    {
      id: "off.close",
      group: "off-script",
      order: 4,
      title: "Close this scene",
      hint: "what happened, what it cost",
      icon: "fa-solid fa-flag-checkered",
      keywords: ["close", "end", "finish", "scene close", "outcome", ...IMPROVISED_OUTCOMES],
      run: () => openSceneCloseDialogue()
    },
    {
      id: "off.pull",
      group: "off-script",
      order: 5,
      title: "Pull everyone to this scene",
      hint: "every player's view follows yours",
      icon: "fa-solid fa-people-pulling",
      keywords: ["pull", "everyone", "follow", "here", "drag"],
      run: () => pullEveryoneHere()
    }
  ];
}

/** Panels, and the handful of Foundry-native things a GM reaches for constantly. */
function panelCommands() {
  return [
    { id: "panel.runner", group: "panel", order: 0, title: "Scene Runner", icon: "fa-solid fa-list-check", keywords: ["brief", "beats", "script"], run: () => toggleSceneRunner() },
    { id: "panel.summon", group: "panel", order: 1, title: "Summon panel", icon: "fa-solid fa-users", keywords: ["cast", "stage"], run: () => toggleSummonPanel() },
    { id: "panel.city", group: "panel", order: 2, title: "City board", icon: "fa-solid fa-map", keywords: ["map", "locations"], run: () => toggleCityBoard() },
    { id: "panel.phone", group: "panel", order: 3, title: "Phone", icon: "fa-solid fa-mobile", keywords: ["radio", "apps"], run: () => togglePhone() },
    { id: "panel.console", group: "panel", order: 4, title: "Console", icon: "fa-solid fa-terminal", keywords: ["dossier", "tabs"], run: () => toggleConsoleWindow() },

    { id: "table.pause", group: "table", order: 0, title: () => (game.paused ? "Unpause the game" : "Pause the game"), icon: "fa-solid fa-pause", keywords: ["pause", "break", "stop"], run: () => game.togglePause(!game.paused, { broadcast: true }) },
    { id: "table.segment", group: "table", order: 1, title: "Advance the day ring one segment", hint: "morning → afternoon → evening → night", icon: "fa-solid fa-clock", keywords: ["time", "segment", "day", "advance"], run: () => advanceSegment(1) },
    { id: "table.initiative", group: "table", order: 2, title: "Roll initiative for everyone", hint: "starts combat if it is not started", icon: "fa-solid fa-swords", keywords: ["combat", "initiative", "fight", "roll"], run: async () => {
      const combat = game.combat ?? (await Combat.create({ scene: canvas.scene.id }));
      const missing = canvas.tokens.placeables.filter((t) => !combat.getCombatantByToken(t.id));
      if (missing.length) await combat.createEmbeddedDocuments("Combatant", missing.map((t) => ({ tokenId: t.id, sceneId: canvas.scene.id })));
      await combat.rollAll();
      if (!combat.started) await combat.startCombat();
    } },
    { id: "table.endcombat", group: "table", order: 3, title: "End combat", icon: "fa-solid fa-flag", danger: true, keywords: ["combat", "end", "stop", "over"], hidden: !game.combat, run: () => game.combat?.delete() }
  ];
}

/** Everything, rebuilt each time the palette opens so it is never stale. */
export function directorCommands() {
  return [
    ...offScriptCommands(),
    ...sceneCommands(),
    ...castCommands(),
    ...audioCommands(),
    ...checkCommands(),
    ...panelCommands()
  ].map((c) => ({ ...c, title: typeof c.title === "function" ? c.title() : c.title }));
}

/**
 * A one-field prompt.
 *
 * DialogV2 rather than a bespoke panel: an improvisation tool that takes three
 * seconds to appear is one a GM stops reaching for.
 */
async function promptForText(title, placeholder) {
  const content = `<input type="text" name="text" placeholder="${placeholder}" autofocus style="width:100%">`;
  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content,
      ok: { label: "Save", callback: (_e, button) => button.form.elements.text.value?.trim() || null }
    });
  } catch {
    return null; // dismissed
  }
}

/* ---------------------------------------------------------------- */
/*  The panel                                                        */
/* ---------------------------------------------------------------- */

let open = null;

export class DirectorPalette extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "bi-palette",
    tag: "div",
    classes: ["bi-palette-host"],
    window: { frame: false, positioned: false },
    actions: { run: DirectorPalette.#onRun, close: DirectorPalette.#onClose }
  };

  static PARTS = { palette: { template: `${TEMPLATE_ROOT}/palette.hbs` } };

  #commands = [];
  #query = "";
  #selected = 0;

  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  async _prepareContext() {
    if (!this.#commands.length) this.#commands = directorCommands();
    return paletteModel(this.#query, this.#commands, { recents: recents(), selected: this.#selected });
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    const input = this.element.querySelector(".bi-palette__input");
    if (input) {
      input.value = this.#query;
      input.focus();
      input.selectionStart = input.selectionEnd = input.value.length;
      input.addEventListener("input", (event) => {
        this.#query = event.target.value;
        this.#selected = 0;
        this.render({});
      });
    }
    this.element.addEventListener("keydown", this.#onKey.bind(this));
    this.element.querySelector(".bi-palette__backdrop")?.addEventListener("pointerdown", () => this.close());
  }

  #onKey(event) {
    const matched = matchCommands(this.#query, this.#commands, { recents: recents() });
    if (event.key === "Escape") { event.preventDefault(); this.close(); return; }
    if (event.key === "ArrowDown" || (event.key === "n" && event.ctrlKey)) {
      event.preventDefault();
      this.#selected = moveSelection(this.#selected, 1, matched.length);
      this.render({});
    } else if (event.key === "ArrowUp" || (event.key === "p" && event.ctrlKey)) {
      event.preventDefault();
      this.#selected = moveSelection(this.#selected, -1, matched.length);
      this.render({});
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = matched[this.#selected];
      if (command) this.#execute(command);
    }
  }

  static #onRun(event, target) { this.#execute(this.#commands.find((c) => c.id === target.dataset.commandId)); }
  static #onClose() { this.close(); }

  async #execute(command) {
    if (!command) return;
    await this.close();
    try {
      await game.settings.set(MODULE_ID, SETTING_RECENTS, rememberCommand(recents(), command.id));
      await command.run();
    } catch (err) {
      console.error(`Blank Inheritance | Palette command "${command.id}" failed:`, err);
      ui.notifications.error(game.i18n.format("BLANKINHERITANCE.Palette.Failed", { title: command.title }));
    }
  }

  async close(options) {
    open = null;
    return super.close(options);
  }
}

/** Open it, or close it if it is already up. GM-only by construction. */
export function toggleDirectorPalette() {
  if (!game.user?.isGM) return null;
  if (open?.rendered) { open.close(); open = null; return null; }
  open = new DirectorPalette();
  open.render(true);
  return open;
}

/**
 * Ctrl/Cmd+K, the shortcut every tool with a palette uses.
 *
 * Registered through Foundry's own keybindings so a GM can rebind it, and so
 * it never fires while they are typing into a chat box or a journal.
 */
export function registerPaletteKeybinding() {
  game.keybindings.register(MODULE_ID, "palette", {
    name: game.i18n.localize("BLANKINHERITANCE.Palette.Keybinding"),
    editable: [{ key: "KeyK", modifiers: ["Control"] }],
    restricted: true, // GM only
    onDown: () => { toggleDirectorPalette(); return true; }
  });
}
