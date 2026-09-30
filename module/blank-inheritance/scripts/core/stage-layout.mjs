/**
 * The theatre-of-the-mind stage — the pure half.
 *
 * A scene is a composed stage, not a list of names (design/theatre-of-the-mind-
 * staging.md §1): the location is carried by background art, and the people in
 * it are portraits in frames that the Director reveals and conceals.
 *
 * This file owns two decisions and no rendering:
 *
 *   BLOCKING — where the frames go. Staging is meaning: two figures either
 *   side of a gap reads as a conversation, three against one reads as a
 *   summons, and neither needs a word of explanation. So the arrangement is a
 *   named, tested thing rather than a CSS class the template picks.
 *
 *   WHAT A PLAYER RECEIVES — the Law 11 boundary. A concealed character must
 *   be ABSENT from what a player's client is sent, not merely unrendered. A
 *   scene document reaches every client, so a concealed member's name and
 *   portrait sitting in a scene flag would already have crossed the wire; the
 *   authored cast therefore lives GM-side and only the revealed subset is
 *   published. publishedCast is that boundary, and leaksConcealed is the
 *   guard that proves it still holds.
 */

import { isNameProtected, tableLabel } from "./stage-names.mjs";

/**
 * The arrangements. Five, because five is what the campaign's scenes actually
 * need — a sixth should have to justify itself against these.
 */
export const STAGE_LAYOUTS = Object.freeze({
  /** Everyone in one centred row. The default, and the "who is here" case. */
  LINE: "line",
  /** One side, a gap, the other side. Two people talking. */
  CONVERSATION: "conversation",
  /** Two together in the middle, nobody flanking. A scene being watched. */
  PAIR: "pair",
  /** A cluster left, one or none right. The gap does the work. */
  GROUP_LEFT: "group-left",
  /** The mirror, for when the weight should sit the other way. */
  GROUP_RIGHT: "group-right"
});

export const LAYOUT_LIST = Object.freeze(Object.values(STAGE_LAYOUTS));

/** The three sides a frame can occupy, in render order across the stage. */
export const SIDES = Object.freeze(["left", "centre", "right"]);

/**
 * What may be published to a scene flag, and therefore to every client.
 *
 * An allow-list, not a deny-list. The authored cast is GM-side material that
 * will grow fields (director's notes, a planned entrance, why they are here),
 * and a deny-list would leak each new one until somebody remembered to add it.
 *
 * `stingSeq`, `faction`, `standing` and `kind` all joined for the Splash tier
 * (design/theatre-of-the-mind-staging.md §5, the "loud" rung):
 *   - `stingSeq` is a fresh timestamp stamped on every reveal/sting write —
 *     without it, a REPEAT splash on an already-`sting:"splash"` member is a
 *     byte-identical flag write, and core/splash.mjs#splashArrivals has no
 *     way to tell "nothing changed" from "the Director asked for this again".
 *   - `faction`/`standing` are public performance information once a member
 *     is revealed at all — the same class of information as their name, not
 *     a new redaction concern.
 *   - `kind` ("pc"/"npc") lets core/splash.mjs#splashArrivals independently
 *     refuse to splash a PC even if something upstream ever mis-authors a
 *     cast entry — defense in depth, not the primary gate (the frame
 *     template never renders the splash control for a PC in the first
 *     place).
 */
const PUBLISHABLE = Object.freeze([
  "portraitId", "label", "img", "side", "actorId",
  "sting", "stingSeq", "faction", "standing", "kind",
  "nameSeq", "nameSting"
]);

/**
 * THE Law 11 boundary for the stage.
 *
 * Only revealed members survive, and each survivor is rebuilt from the
 * allow-list above rather than spread — so a concealed character contributes
 * nothing at all to what a player's browser receives: no name, no portrait
 * path, not even a placeholder saying somebody is missing.
 *
 * That last part is deliberate. A frame that says "someone is here but you
 * cannot see who" is worse than no frame: it tells the table there is a
 * surprise coming, which is exactly the information the concealment exists to
 * withhold. Compare core/commitments.mjs, where an occupancy marker IS
 * published — a teammate being busy is a shared game fact, an unannounced
 * arrival is not.
 */
export function publishedCast(authored = [], known) {
  return authored
    .filter((member) => member?.revealed)
    .map((member) => {
      const published = {};
      for (const key of PUBLISHABLE) {
        if (member[key] !== undefined && member[key] !== null) published[key] = member[key];
      }
      // The plate is what the table calls them, never the authored real name
      // unless the table has learned it (core/stage-names.mjs). Only `called`
      // members are touched; everyone else publishes as they always did.
      if (isNameProtected(member)) published.label = tableLabel(member, known);
      return published;
    });
}

/**
 * A testable statement of the rule above: does anything a concealed member
 * authored appear in what was published?
 *
 * Exported so the guard can run against real data in a test rather than only
 * existing as an assertion inside one. Same shape and same purpose as
 * core/social-intel.mjs#leaksUnrevealedText.
 */
export function leaksConcealed(published, authored = []) {
  const serialized = JSON.stringify(published ?? []);

  // A value that a REVEALED member also carries tells the table nothing about
  // the concealed one — "right" is a side, not a secret, and flagging it would
  // make this guard cry wolf on every scene that stages two people opposite
  // each other. Only values unique to a concealed member can be a leak.
  const shared = new Set();
  for (const member of authored) {
    if (!member?.revealed) continue;
    for (const value of Object.values(member)) {
      if (typeof value === "string") shared.add(value);
    }
  }

  const leaks = [];
  for (const member of authored) {
    if (member?.revealed) continue;
    for (const value of Object.values(member ?? {})) {
      if (typeof value !== "string" || value.length < 2 || shared.has(value)) continue;
      if (serialized.includes(value)) leaks.push(value);
    }
  }
  return leaks;
}

/**
 * Split a cast into the sides its layout calls for.
 *
 * Explicit `side` on a member always wins — a Director who has placed someone
 * has made a directing decision, and a layout rule silently moving them would
 * be the console overruling the person running the game. The layout only
 * decides where the UNPLACED go.
 *
 * @returns {Array<{side: string, members: Array<object>}>} always three
 *   entries in left/centre/right order, including empty ones — the template
 *   needs the empty sides to hold the gap open, which is the whole point of
 *   the arrangements that have one.
 */
export function stageGroups(cast = [], layout = STAGE_LAYOUTS.LINE) {
  if (!LAYOUT_LIST.includes(layout)) {
    throw new Error(`stageGroups: unknown layout "${layout}" — expected one of ${LAYOUT_LIST.join(", ")}`);
  }

  const buckets = { left: [], centre: [], right: [] };
  const unplaced = [];
  for (const member of cast) {
    if (SIDES.includes(member?.side)) buckets[member.side].push(member);
    else unplaced.push(member);
  }

  switch (layout) {
    case STAGE_LAYOUTS.CONVERSATION: {
      // Alternate, so an unplaced pair lands facing each other rather than
      // both on the left with a gap to nowhere.
      unplaced.forEach((member, index) => buckets[index % 2 === 0 ? "left" : "right"].push(member));
      break;
    }
    case STAGE_LAYOUTS.GROUP_LEFT:
      unplaced.forEach((member) => buckets.left.push(member));
      break;
    case STAGE_LAYOUTS.GROUP_RIGHT:
      unplaced.forEach((member) => buckets.right.push(member));
      break;
    case STAGE_LAYOUTS.PAIR:
    case STAGE_LAYOUTS.LINE:
    default:
      unplaced.forEach((member) => buckets.centre.push(member));
      break;
  }

  return SIDES.map((side) => ({ side, members: buckets[side] }));
}

/**
 * Build one cast member from a plain descriptor — the shape "summon anyone
 * to any scene" needs. `descriptor` is `{id, name, img?, actorId?, isPc?}`;
 * `id` is required and becomes the member's stable `portraitId`, so summoning
 * the same descriptor twice updates the existing member (moved, re-revealed)
 * rather than duplicating them.
 *
 * Deliberately accepts a summon with no `actorId` at all — a real Foundry
 * Actor does not have to exist for someone to stand on the stage
 * (foundry/stage.mjs's own #onOpenCard already treats "a cast member with no
 * Actor behind them" as a legitimate state, not an error), which matters
 * because most of this campaign's NPCs are still unnamed placeholders per
 * this project's own stub policy.
 */
export function castMemberFromDescriptor(descriptor) {
  if (!descriptor?.id) throw new Error("castMemberFromDescriptor: descriptor needs an id");
  const member = {
    portraitId: `summon-${descriptor.id}`,
    label: descriptor.name ?? descriptor.id,
    kind: descriptor.isPc ? "pc" : "npc",
    revealed: true,
    // An authored scene-brief cast member can carry its own `arrival` tier
    // (scene-brief.schema.json) — a beat calling for a big reveal should not
    // have to rely on the Director remembering to click Announced/Splash by
    // hand every time it's staged. Quiet, same as before, when nothing was
    // authored (a plain summon, or arrival: null — "they are simply already
    // there").
    sting: descriptor.sting || "quiet",
    stingSeq: Date.now()
  };
  if (descriptor.img) member.img = descriptor.img;
  if (descriptor.actorId) member.actorId = descriptor.actorId;
  // A protected person keeps their real name in `label` (GM-side only) and
  // carries the line the table uses until they learn it. `nameKey` is what
  // their name knowledge is filed under; it is never published.
  if (descriptor.called) {
    member.called = descriptor.called;
    member.nameKey = descriptor.nameKey ?? descriptor.id;
  }
  return member;
}

/**
 * How big a frame can be before the stage is full.
 *
 * The staging document's open question 2 asks this and does not settle it.
 * This is a defensible default, not an answer: six PCs plus NPCs will not fit
 * at the size two people get, so the frame shrinks by headcount. Tuned to the
 * real cases — a conversation is 2, the full party is 6, a party plus a
 * Directorate delegation is 9 or 10.
 */
export function frameScale(count) {
  if (count <= 2) return "lg";
  if (count <= 4) return "md";
  if (count <= 7) return "sm";
  return "xs";
}

/**
 * Everything the stage template needs, assembled in one place so both seats
 * get the same blocking from the same code.
 *
 * `canDirect` is passed in rather than derived: this file must not know what a
 * GM is. The caller does.
 */
export function stageState({ cast = [], layout = STAGE_LAYOUTS.LINE, canDirect = false } = {}) {
  const groups = stageGroups(cast, layout);
  return {
    layout,
    canDirect,
    count: cast.length,
    scale: frameScale(cast.length),
    empty: cast.length === 0,
    groups
  };
}
