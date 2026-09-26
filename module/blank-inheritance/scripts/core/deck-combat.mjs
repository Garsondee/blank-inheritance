/**
 * The two keys under the central instrument's flanks — Initiative and Turn —
 * as pure state. Added 2026-09-23, when the deck grew toward "everything a
 * player or the GM needs to play SF2E from this one panel": rolling into a
 * fight and handing the turn on were the two things every combat round still
 * sent somebody off to Foundry's own tracker for.
 *
 * Both keys live in the same place on both seats (a panel you learn by hand),
 * but what TURN does differs by seat, and that difference is decided here from
 * plain facts — never by a template checking isGM. The adapter reads the live
 * encounter and hands this its shape.
 */

/**
 * The Turn key.
 *
 * The Director drives the encounter: with nothing running, the key pulls the
 * selected tokens into a new one (Foundry's own createCombatants, which makes
 * the encounter if there is none); with one built but not started, it begins
 * it; once running, it passes the turn on. A player may only end their OWN
 * turn — Foundry refuses a player's turn change otherwise
 * (common/documents/combat.mjs, `_canChangeTurn`) — so their key is live only
 * while it is.
 *
 * Every state names an i18n key rather than words, so this stays pure.
 */
export function turnKeyState({ seat, hasCombat = false, started = false, isMyTurn = false, hasSelection = false } = {}) {
  if (seat === "director") {
    if (!hasCombat) {
      return { action: "joinCombat", labelKey: "BLANKINHERITANCE.Deck.Turn.Fight", hintKey: "BLANKINHERITANCE.Deck.Turn.FightHint", disabled: !hasSelection };
    }
    if (!started) {
      return { action: "startCombat", labelKey: "BLANKINHERITANCE.Deck.Turn.Begin", hintKey: "BLANKINHERITANCE.Deck.Turn.BeginHint", disabled: false };
    }
    return { action: "nextTurn", labelKey: "BLANKINHERITANCE.Deck.Turn.Next", hintKey: "BLANKINHERITANCE.Deck.Turn.NextHint", disabled: false };
  }
  return {
    action: "endTurn",
    labelKey: "BLANKINHERITANCE.Deck.Turn.End",
    hintKey: isMyTurn ? "BLANKINHERITANCE.Deck.Turn.EndHint" : "BLANKINHERITANCE.Deck.Turn.NotYours",
    disabled: !(hasCombat && started && isMyTurn)
  };
}

/**
 * The Initiative key. It always carries the number that will be rolled
 * (ux-doctrine Law 1) — Perception for almost everyone, whatever the
 * creature's own initiative statistic is otherwise. Live only while there is
 * an encounter to roll into and the creature has not rolled yet; sf2e would
 * refuse either way, but a key that visibly cannot work beats one that pops
 * an error.
 */
export function initiativeKeyState({ hasSubject = false, hasCombat = false, rolled = false, mod = null } = {}) {
  const modLabel = Number.isFinite(mod) ? (mod >= 0 ? `+${Math.round(mod)}` : `${Math.round(mod)}`) : "";
  return {
    action: "rollInitiative",
    modLabel,
    rolled: !!rolled,
    disabled: !hasSubject || !hasCombat || !!rolled
  };
}

/**
 * Whose turn the collar may name for THIS viewer (ux-doctrine Law 11:
 * redaction is removal). The Director always sees the name. A player never
 * sees a hidden combatant's, nor one whose name the table has not been shown
 * — sf2e's own `playersCanSeeName` when the combatant carries it, else only a
 * player-owned creature's. Null means "say only the round".
 */
export function turnCaptionName({ isGM = false, started = false, name = null, hidden = false, playersCanSeeName = null, hasPlayerOwner = false } = {}) {
  if (!started || !name) return null;
  if (isGM) return name;
  if (hidden) return null;
  const visible = playersCanSeeName ?? hasPlayerOwner;
  return visible ? name : null;
}

/**
 * Which page of the board the current combatant is on, so the board follows
 * the turn rather than making the GM page to find it. -1 (no current
 * combatant) keeps whatever page the GM chose.
 */
export function pageForIndex(index, perPage) {
  if (!(index >= 0) || !(perPage > 0)) return -1;
  return Math.floor(index / perPage);
}
