/**
 * The Director's Palette — the Foundry half.
 *
 * Builds the live command list out of the world as it currently is (every
 * scene, every actor, every soundscape and cue, every player-visible handout,
 * and — while something is selected — everything a GM does TO a creature)
 * and runs whichever one the GM picks. Typed instructions ("athletics 18",
 * "dmg 2d6", "note …") become a ready-to-run first row. All the ranking and keyboard
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
  PALETTE_CONDITIONS,
  matchCommands,
  moveSelection,
  paletteModel,
  parseQuickIntent,
  rememberCommand
} from "../core/director-palette.mjs";
import { FALLBACK_SKILL_SLUGS, PERCEPTION_SLUG, SAVE_SLUGS, labelForSlug } from "../core/skills.mjs";
import { MARK_TEXT } from "../core/session-rail.mjs";

import { cueScene, openDirectorPanel, pullEveryoneHere } from "./director-panel.mjs";
import { openCharacterCard } from "./character-card.mjs";
import { recordLogEntry } from "./session-log.mjs";
import { postInlineCheck, rollCheck, rollInitiative, runSystemAction } from "./rolls.mjs";
import { removeFromStage, summonToStage } from "./stage.mjs";
import { openSceneCloseDialogue } from "./scene-close.mjs";
import { toggleSoundDesk } from "./sound-desk.mjs";
import { toggleSceneRunner } from "./scene-runner.mjs";
import { togglePhone } from "./phone.mjs";
import { toggleNotebook } from "./notebook.mjs";
import { openConsoleTab, toggleConsoleWindow } from "./console-window.mjs";
import { toggleDemoRunner } from "./demo-runner.mjs";
import { openApprovalsDesk } from "./approvals-desk.mjs";
import { openEquipmentPanel } from "./equipment-panel.mjs";
import { openInductionTerminal } from "./induction-terminal.mjs";
import { advanceSegment } from "./campaign-state.mjs";
import { playOpeningForTable } from "./opening-titles.mjs";
import { currentMode } from "./command-bar.mjs";
import { cachedAudio, loadAudio } from "./audio-store.mjs";
import { applySoundscape, playMusicPool, runCue, stopAllAudio } from "./audio-director.mjs";
import { openAdminPanel } from "./admin-panel.mjs";
import { openLocationEditor } from "./location-editor.mjs";

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
            // The RAW actor id: castMemberFromDescriptor adds the "summon-"
            // prefix, and `name`/`isPc` are the field names it reads.
            else await summonToStage(scene, { id: actor.id, name: actor.name, img: actor.img, actorId: actor.id, isPc: actor.hasPlayerOwner });
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

/**
 * Every check a GM might ask the table for: Perception, SF2E's eighteen
 * skills (core/skills.mjs's own list — the old hand-typed one here had
 * drifted), and the three saves. With a DC, type it: "athletics 18" builds
 * "Ask for Athletics, DC 18" as the first row (core parseQuickIntent).
 */
const ASKABLE_CHECKS = Object.freeze([PERCEPTION_SLUG, ...FALLBACK_SKILL_SLUGS, ...SAVE_SLUGS].map((slug) => ({ slug, label: labelForSlug(slug) })));

function checkCommands() {
  return ASKABLE_CHECKS.map(({ slug, label }, i) => ({
    id: `check.${slug}`,
    group: "check",
    order: i,
    title: `Ask for: ${label}`,
    hint: SAVE_SLUGS.includes(slug) ? "saving throw — type a number after it for a DC" : "type a number after it for a DC",
    icon: SAVE_SLUGS.includes(slug) ? "fa-solid fa-shield-halved" : "fa-solid fa-dice-d20",
    keywords: ["check", "roll", "ask", SAVE_SLUGS.includes(slug) ? "save" : "skill", slug],
    run: () => postInlineCheck({ slug, label })
  }));
}

/* ---------------------------------------------------------------- */
/*  The selected token(s) — added 2026-09-23                          */
/* ---------------------------------------------------------------- */

/** What is selected on the canvas right now, as { token, actor } pairs. */
function selection() {
  return (canvas?.tokens?.controlled ?? []).filter((t) => t.actor).map((t) => ({ token: t, actor: t.actor }));
}

/** "Chk Chk", "Chk Chk + 2 others" — who a Selected command is about to touch. */
function whoLabel(picked) {
  if (!picked.length) return "";
  const first = picked[0].token.name ?? picked[0].actor.name;
  return picked.length === 1 ? first : `${first} + ${picked.length - 1} other${picked.length > 2 ? "s" : ""}`;
}

/**
 * Turn a typed amount into a number: a plain integer as-is, anything else
 * rolled with Foundry's own dice (so "2d6+3" works), the roll whispered to
 * the GM so the table does not see the number. Null for nonsense.
 */
async function resolveAmount(formula, flavor) {
  const text = String(formula ?? "").trim();
  if (/^\d+$/.test(text)) return Number(text);
  if (!foundry.dice.Roll.validate(text)) {
    ui.notifications.warn(`"${text}" is not a number or a dice formula.`);
    return null;
  }
  const roll = await new foundry.dice.Roll(text).evaluate();
  await roll.toMessage({ flavor }, { messageMode: "gm" });
  return Math.max(0, Math.trunc(roll.total));
}

/** Damage (positive) or healing (negative) through each actor's own applyDamage — IWR, shields and the dying chain included. */
async function applyToSelected(amount, picked) {
  for (const { token, actor } of picked) {
    if (typeof actor.applyDamage !== "function") continue;
    await actor.applyDamage({ damage: amount, token: token.document });
  }
}

async function promptAndApply(kind, picked, preset = null) {
  const verb = kind === "heal" ? "Heal" : "Damage";
  const formula = preset ?? (await promptForText(`${verb} ${whoLabel(picked)}`, "A number, or a formula like 2d6+3"));
  if (!formula) return;
  const amount = await resolveAmount(formula, `${verb}: ${whoLabel(picked)}`);
  if (amount === null) return;
  await applyToSelected(kind === "heal" ? -amount : amount, picked);
}

/**
 * Everything a GM does TO a creature mid-scene, for whatever is selected
 * when the palette opens: damage and healing through the system's own
 * applyDamage, every common condition up/down/toggle through the actor's own
 * condition methods, hero points, a secret check of any skill, initiative,
 * hiding the token, showing its portrait, and its sheet. Titles name who
 * they will touch, so a GM never has to wonder which token is selected.
 */
function selectedCommands() {
  const picked = selection();
  if (!picked.length) return [];
  const who = whoLabel(picked);
  const actors = picked.map((p) => p.actor);
  const characters = actors.filter((a) => a.type === "character");
  const out = [
    { id: "sel.damage", order: 0, title: `Damage ${who}…`, hint: "a number or a formula; or type \"dmg 2d6\"", icon: "fa-solid fa-burst", keywords: ["damage", "hurt", "hit", "hp"], run: () => promptAndApply("damage", picked) },
    { id: "sel.heal", order: 1, title: `Heal ${who}…`, hint: "a number or a formula; or type \"heal 5\"", icon: "fa-solid fa-heart-pulse", keywords: ["heal", "hp", "restore", "cure"], run: () => promptAndApply("heal", picked) },
    {
      id: "sel.hero.up", order: 2, title: `Hero point +1: ${who}`, hint: characters.length ? "up to the maximum" : "characters only",
      icon: "fa-solid fa-star", keywords: ["hero", "point", "award", "reward"], hidden: !characters.length,
      run: async () => {
        for (const a of characters) {
          const hp = a.system.resources?.heroPoints;
          if (hp) await a.update({ "system.resources.heroPoints.value": Math.min(hp.max ?? 3, (hp.value ?? 0) + 1) });
        }
      }
    },
    {
      id: "sel.hero.down", order: 3, title: `Hero point −1: ${who}`, icon: "fa-regular fa-star", keywords: ["hero", "point", "spend", "remove"], hidden: !characters.length,
      run: async () => {
        for (const a of characters) {
          const hp = a.system.resources?.heroPoints;
          if (hp) await a.update({ "system.resources.heroPoints.value": Math.max(0, (hp.value ?? 0) - 1) });
        }
      }
    },
    {
      id: "sel.initiative", order: 4, title: `Roll initiative: ${who}`, hint: game.combat ? "into the current encounter" : "adds them to a new encounter first",
      icon: "fa-solid fa-hourglass-start", keywords: ["initiative", "combat", "fight", "encounter"],
      run: async () => {
        const docs = picked.map((p) => p.token.document).filter((d) => !d.inCombat);
        if (docs.length) await foundry.utils.getDocumentClass("Token").createCombatants(docs);
        for (const a of actors) await rollInitiative({ actor: a, event: null });
      }
    },
    {
      id: "sel.hide", order: 5, title: picked.every((p) => p.token.document.hidden) ? `Reveal token: ${who}` : `Hide token: ${who}`,
      hint: "on the canvas, from the players", icon: "fa-solid fa-eye-slash", keywords: ["hide", "reveal", "invisible", "token"],
      run: async () => {
        const hide = !picked.every((p) => p.token.document.hidden);
        for (const p of picked) await p.token.document.update({ hidden: hide });
      }
    },
    {
      id: "sel.portrait", order: 6, title: `Show the table: ${who}'s portrait`, hint: "pops their picture up on every screen",
      icon: "fa-solid fa-image-portrait", keywords: ["show", "portrait", "image", "picture", "reveal"],
      run: () => foundry.documents.collections.Journal.showImage(picked[0].actor.img, { title: picked[0].token.name ?? picked[0].actor.name })
    },
    { id: "sel.sheet", order: 7, title: `Open sheet: ${who}`, icon: "fa-solid fa-id-badge", keywords: ["sheet", "character", "stats"], run: () => picked[0].actor.sheet?.render(true) },
    { id: "sel.treat", order: 8, title: `Treat Wounds: ${who}`, hint: "the system's own Treat Wounds", icon: "fa-solid fa-kit-medical", keywords: ["treat", "wounds", "medicine", "heal", "rest"], run: () => runSystemAction("treatWounds", actors) },
    { id: "sel.breather", order: 9, title: `Take a Breather: ${who}`, hint: "only if the stamina variant is on", icon: "fa-solid fa-wind", keywords: ["breather", "stamina", "rest"], hidden: !characters.length, run: () => runSystemAction("takeABreather", characters) }
  ];

  // A secret check of any statistic, rolled for them and seen only by you.
  ASKABLE_CHECKS.forEach(({ slug, label }, i) => {
    out.push({
      id: `sel.secret.${slug}`, order: 20 + i, searchOnly: true, title: `Secret ${label}: ${who}`, hint: "rolled for them, seen only by you",
      icon: "fa-solid fa-eye-slash", keywords: ["secret", "roll", "blind", "gm", slug],
      run: async () => {
        for (const a of actors) await rollCheck({ actor: a, slug, event: { ctrlKey: true, metaKey: false, shiftKey: false } });
      }
    });
  });

  // Conditions — valued ones step, the rest toggle.
  PALETTE_CONDITIONS.forEach((c, i) => {
    const has = actors.some((a) => a.hasCondition?.(c.slug));
    const base = { order: 60 + i, searchOnly: true, icon: "fa-solid fa-bandage", keywords: ["condition", c.slug, c.label] };
    if (c.valued) {
      out.push({ ...base, keywords: [...base.keywords, "up", "increase", "raise", "worse"], id: `sel.cond.up.${c.slug}`, title: `${c.label} +1: ${who}`, run: async () => { for (const a of actors) await a.increaseCondition?.(c.slug); } });
      out.push({ ...base, keywords: [...base.keywords, "down", "decrease", "lower", "reduce", "better"], id: `sel.cond.down.${c.slug}`, title: `${c.label} −1: ${who}`, hidden: !has, run: async () => { for (const a of actors) await a.decreaseCondition?.(c.slug); } });
    } else {
      out.push({ ...base, id: `sel.cond.toggle.${c.slug}`, title: `${has ? "Remove" : "Apply"} ${c.label}: ${who}`, run: async () => { for (const a of actors) await a.toggleCondition?.(c.slug); } });
    }
  });

  return out.map((c) => ({ ...c, group: "selected" }));
}

/* ---------------------------------------------------------------- */
/*  Show the table, and the log — added 2026-09-23                    */
/* ---------------------------------------------------------------- */

/**
 * Handouts: pop a journal entry up on every player's screen.
 *
 * Law 11 is the whole constraint here. Only entries players are ALREADY
 * allowed to see are offered (default ownership at least Limited), and they
 * are shown without `force` — so a GM-only vault (the social-intel store, the
 * staged-cast vault, a prep journal) can never be pushed to the table by a
 * mis-press, however the palette is searched.
 */
function revealCommands() {
  const LIMITED = CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
  return game.journal.contents
    // The party notebook is open to everyone by design (default OWNER), so it
    // passes the test above; but popping Foundry's plain journal window up on
    // every screen is not how it is meant to be opened (the Notebook command,
    // the N key and any portrait are).
    .filter((j) => (j.ownership?.default ?? 0) >= LIMITED && !j.getFlag(MODULE_ID, "notebook"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry, i) => ({
      id: `reveal.journal.${entry.id}`,
      group: "reveal",
      order: i,
      title: `Show the table: ${entry.name}`,
      hint: entry.folder?.name ?? "handout",
      icon: "fa-solid fa-book-open",
      keywords: ["show", "handout", "journal", "reveal", entry.name],
      run: () => foundry.documents.collections.Journal.show(entry)
    }));
}

function logCommands() {
  return [
    {
      id: "log.mark", group: "log", order: 0, title: "Mark this moment", hint: "a pin on the session rail and a line in the log",
      icon: "fa-solid fa-location-pin", keywords: ["mark", "bookmark", "rail", "flag", "remember"],
      run: () => recordLogEntry({ text: MARK_TEXT, nowIso: new Date().toISOString(), scene: canvas?.scene?.name ?? null, mode: currentMode() })
    },
    {
      id: "log.open", group: "log", order: 1, title: "Open the whole log", hint: "the Console's Log tab — filters, the evening",
      icon: "fa-solid fa-clipboard-list", keywords: ["log", "history", "record", "review"],
      run: () => openConsoleTab("log")
    }
  ];
}

/**
 * The quick intents core parsed out of the box, bound to real calls. Built
 * per keystroke (they only exist for the text typed), and pinned above every
 * other match.
 */
function quickCommands(query) {
  const picked = selection();
  return parseQuickIntent(query, { skills: ASKABLE_CHECKS, hasSelection: picked.length > 0 }).map((intent) => ({
    ...intent,
    run: async () => {
      switch (intent.kind) {
        case "damage": return promptAndApply("damage", picked, intent.formula);
        case "heal": return promptAndApply("heal", picked, intent.formula);
        case "flat": return postInlineCheck({ slug: "flat", label: "Flat check", dc: intent.dc });
        case "ask": return postInlineCheck({ slug: intent.slug, label: labelForSlug(intent.slug), dc: intent.dc });
        case "note": return recordLogEntry({ text: intent.text, nowIso: new Date().toISOString(), scene: canvas?.scene?.name ?? null, mode: currentMode() });
        case "roll": {
          if (!foundry.dice.Roll.validate(intent.formula)) {
            ui.notifications.warn(`"${intent.formula}" is not a dice formula.`);
            return null;
          }
          const roll = await new foundry.dice.Roll(intent.formula).evaluate();
          return roll.toMessage({ flavor: intent.secret ? "Secret roll" : null }, { messageMode: intent.secret ? "gm" : "public" });
        }
        default: return null;
      }
    }
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
    // "Summon" folded into the Scene Runner itself 2026-09-18 (its own
    // standalone panel retired) -- keywords cover both so it stays findable
    // under the name the panel used to have.
    { id: "panel.runner", group: "panel", order: 0, title: "Scene Runner", icon: "fa-solid fa-list-check", keywords: ["brief", "beats", "script", "summon", "cast", "stage"], run: () => toggleSceneRunner() },
    // "Phone" was renamed Comms and rebuilt as the hand-held field set,
    // 2026-09-23 — the old name stays a keyword so it is still found by it.
    { id: "panel.comms", group: "panel", order: 1, title: "Comms", hint: "session log, radio, and the handset's apps", icon: "fa-solid fa-walkie-talkie", keywords: ["phone", "radio", "handset", "apps", "snake", "pet", "fortune"], run: () => togglePhone() },
    { id: "panel.console", group: "panel", order: 2, title: "Console", hint: "the whole sheet, party, hub and log", icon: "fa-solid fa-terminal", keywords: ["dossier", "tabs", "sheet"], run: () => toggleConsoleWindow() },
    { id: "panel.party", group: "panel", order: 3, title: "Console: Party", hint: "every PC's HP, AC and conditions", icon: "fa-solid fa-people-group", keywords: ["party", "players", "hp", "overview"], run: () => openConsoleTab("party") },
    { id: "panel.hub", group: "panel", order: 4, title: "Console: Hub", hint: "every GM panel as a tile", icon: "fa-solid fa-grip", keywords: ["hub", "launcher", "panels"], run: () => openConsoleTab("hub") },
    // The Director's deck is full (a seventh key pushed the last one off its row), so the GM reaches the
    // notebook here, from the N key, and by clicking any portrait.
    { id: "panel.notebook", group: "panel", order: 5, title: "Notebook", hint: "the party's shared notes (N)", icon: "fa-solid fa-book-open", keywords: ["notes", "notebook", "journal", "people", "write", "articles"], run: () => toggleNotebook() },
    { id: "panel.director", group: "panel", order: 6, title: "Director's Panel", hint: "cue a scene with its transition", icon: "fa-solid fa-clapperboard", keywords: ["director", "cue", "scenes", "transition"], run: () => openDirectorPanel() },
    { id: "panel.approvals", group: "panel", order: 7, title: "Approvals Desk", hint: "grade drafted content", icon: "fa-solid fa-stamp", keywords: ["approve", "grade", "review", "desk", "drafted"], run: () => openApprovalsDesk() },
    { id: "panel.equipment", group: "panel", order: 8, title: "Equipment Locker", hint: "Kit Issue's inventory", icon: "fa-solid fa-toolbox", keywords: ["equipment", "kit", "gear", "locker", "items"], run: () => openEquipmentPanel() },
    { id: "panel.induction", group: "panel", order: 9, title: "Induction Terminal", hint: "character creation", icon: "fa-solid fa-id-card", keywords: ["induction", "chargen", "character creation", "new character"], run: () => openInductionTerminal() },
    { id: "panel.demo", group: "panel", order: 10, title: "Demo walkthroughs", hint: "scripted runs against the real world", icon: "fa-solid fa-circle-play", keywords: ["demo", "walkthrough", "test", "tour"], run: () => toggleDemoRunner() },
    { id: "panel.admin", group: "panel", order: 11, title: "Admin", hint: "reset to the start, stand-in players, jump anywhere", icon: "fa-solid fa-screwdriver-wrench", keywords: ["admin", "reset", "restart", "autopilot", "test", "debug", "jump"], run: () => openAdminPanel() },
    { id: "panel.locations", group: "panel", order: 12, title: "Location Editor", hint: "draw and author data/locations on the Campaign Map", icon: "fa-solid fa-map-location-dot", keywords: ["gazetteer", "location", "region", "building", "map", "draw"], run: () => openLocationEditor() },

    { id: "table.pause", group: "table", order: 0, title: () => (game.paused ? "Unpause the game" : "Pause the game"), icon: "fa-solid fa-pause", keywords: ["pause", "break", "stop"], run: () => game.togglePause(!game.paused, { broadcast: true }) },
    { id: "table.segment", group: "table", order: 1, title: "Advance the day ring one segment", hint: "morning → afternoon → evening → night", icon: "fa-solid fa-clock", keywords: ["time", "segment", "day", "advance"], run: () => advanceSegment(1) },
    { id: "table.initiative", group: "table", order: 2, title: "Roll initiative for everyone here", hint: "every token on this scene; starts the encounter", icon: "fa-solid fa-swords", keywords: ["combat", "initiative", "fight", "roll", "encounter"], run: async () => {
      const docs = (canvas?.tokens?.placeables ?? []).map((t) => t.document).filter((d) => d.actor && !d.inCombat);
      if (docs.length) await foundry.utils.getDocumentClass("Token").createCombatants(docs);
      const combat = game.combat;
      if (!combat) return;
      await combat.rollAll();
      if (!combat.started) await combat.startCombat();
    } },
    { id: "table.npcinit", group: "table", order: 3, title: "Roll initiative for the NPCs", hint: "players roll their own", icon: "fa-solid fa-dice", keywords: ["npc", "initiative", "monsters", "enemies"], hidden: !game.combat, run: () => game.combat?.rollNPC() },
    { id: "table.begin", group: "table", order: 4, title: "Begin the encounter", hint: "round 1", icon: "fa-solid fa-play", keywords: ["combat", "start", "begin", "round"], hidden: !game.combat || game.combat.started, run: () => game.combat?.startCombat() },
    { id: "table.next", group: "table", order: 5, title: "Next turn", hint: () => (game.combat?.combatant ? `after ${game.combat.combatant.name}` : null), icon: "fa-solid fa-forward-step", keywords: ["turn", "next", "combat", "advance"], hidden: !game.combat?.started, run: () => game.combat?.nextTurn() },
    { id: "table.prev", group: "table", order: 6, title: "Previous turn", hint: "undo a turn passed too early", icon: "fa-solid fa-backward-step", keywords: ["turn", "previous", "back", "undo", "combat"], hidden: !game.combat?.started, run: () => game.combat?.previousTurn() },
    // Foundry's own endCombat, which asks for confirmation itself. This used
    // to call combat.delete() directly — one mis-press ended a fight.
    { id: "table.endcombat", group: "table", order: 7, title: "End the encounter", hint: "asks first", icon: "fa-solid fa-flag", danger: true, keywords: ["combat", "end", "stop", "over"], hidden: !game.combat, run: () => game.combat?.endCombat() },
    { id: "table.rest", group: "table", order: 8, title: "Rest for the night", hint: "every party member, the system's own rest (asks first)", icon: "fa-solid fa-bed", keywords: ["rest", "sleep", "night", "recover", "daily"], run: () => runSystemAction("restForTheNight", partyActors()) },
    // The same verb as the session rail's Opening key (foundry/opening-titles.mjs):
    // the opening, then the chosen episode's title card, then its first scene.
    { id: "table.opening", group: "table", order: 9, title: "Play the opening titles", hint: "every screen, then an episode's title card and first scene (asks first)", icon: "fa-solid fa-film", keywords: ["opening", "titles", "intro", "video", "reduced motion", "start", "episode", "title card", "session"], run: () => playOpeningForTable() }
  ];
}

/** The party: sf2e's own Party actor's members, falling back to every player-owned character. */
function partyActors() {
  const members = game.actors?.party?.members ?? [];
  return members.length ? members : game.actors.contents.filter((a) => a.type === "character" && a.hasPlayerOwner);
}

/** Everything, rebuilt each time the palette opens so it is never stale. */
export function directorCommands() {
  return [
    ...offScriptCommands(),
    ...selectedCommands(),
    ...sceneCommands(),
    ...castCommands(),
    ...audioCommands(),
    ...revealCommands(),
    ...checkCommands(),
    ...logCommands(),
    ...panelCommands()
  ].map((c) => ({
    ...c,
    title: typeof c.title === "function" ? c.title() : c.title,
    hint: typeof c.hint === "function" ? c.hint() : c.hint
  }));
}

/**
 * A one-field prompt.
 *
 * DialogV2 rather than a bespoke panel: an improvisation tool that takes three
 * seconds to appear is one a GM stops reaching for.
 */
async function promptForText(title, placeholder) {
  const safe = foundry.utils.escapeHTML(placeholder);
  const content = `<input type="text" name="text" placeholder="${safe}" autofocus style="width:100%">`;
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
  #keydownBound = false;

  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  /** The world's commands (built once per opening) plus whatever the typed text itself asks for. */
  #allCommands() {
    if (!this.#commands.length) this.#commands = directorCommands();
    return [...quickCommands(this.#query), ...this.#commands];
  }

  async _prepareContext() {
    const model = paletteModel(this.#query, this.#allCommands(), { recents: recents(), selected: this.#selected });
    const picked = selection();
    return {
      ...model,
      // Shown only while the box is empty: the typed shortcuts are the fast
      // path, and a feature nobody knows exists is a feature that does not.
      showSyntax: !this.#query,
      subject: picked.length ? whoLabel(picked) : null
    };
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
    // _onRender fires on EVERY render (this panel re-renders on each
    // keystroke and on ArrowUp/ArrowDown), and this.element is the SAME DOM
    // node across those renders -- only the Handlebars part inside it (the
    // input, the backdrop) gets torn down and rebuilt. An unconditional
    // addEventListener here would keep stacking one more "keydown" listener
    // per render, so a single ArrowDown/Enter press would fire #onKey once
    // per accumulated listener -- moving the selection several rows per tap,
    // or running the selected command more than once. Guarded to attach
    // exactly once per instance, same as approvals-desk.mjs's #keydownBound.
    if (!this.#keydownBound) {
      this.element.addEventListener("keydown", this.#onKey.bind(this));
      this.#keydownBound = true;
    }
    this.element.querySelector(".bi-palette__backdrop")?.addEventListener("pointerdown", () => this.close());
  }

  #onKey(event) {
    const matched = matchCommands(this.#query, this.#allCommands(), { recents: recents() });
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

  static #onRun(event, target) { this.#execute(this.#allCommands().find((c) => c.id === target.dataset.commandId)); }
  static #onClose() { this.close(); }

  async #execute(command) {
    if (!command) return;
    // An inert row (a typed "dmg 5" with nothing selected) says why, and the
    // palette stays open so the GM can select a token and press Enter again.
    if (command.disabled) {
      ui.notifications.info(command.hint ?? "That cannot run right now.");
      return;
    }
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
