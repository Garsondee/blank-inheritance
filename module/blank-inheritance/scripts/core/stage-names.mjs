/**
 * Names on the stage — the pure half.
 *
 * design/theatre-of-the-mind-staging.md §12.2. Everyone the stage can show has
 * two names: the real one, which only the GM's client ever holds, and what the
 * table calls them until they learn it. This file decides which of the two a
 * given viewer gets and proves nothing else about the real one crosses the wire.
 *
 * A person is PROTECTED when their cast entry carries `called` (an authored
 * line such as "the attendant"). An entry without one behaves exactly as it
 * always has, so old drafts keep working until they are rebuilt in canon.
 *
 * Knowledge is a set of name keys, kept GM-side (foundry/stage.mjs). It is
 * keyed by person, not by scene, so a name learned once is known everywhere
 * that person appears, the way the Character Card's Facts already work.
 *
 * No Foundry, no DOM, no clock.
 */

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

function fnv1a64(text) {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * FNV_PRIME);
  }
  return hash;
}

/**
 * An opaque stand-in for an id, safe to publish. Deterministic, so summoning
 * the same person twice lands on the same stage id and a splash's "already
 * introduced" memory stays coherent.
 *
 * This closes the CASUAL leak (a name sitting in the DOM or the Scene flag).
 * It is not a secret: the salt is in the module source, so anyone determined
 * enough to hash guesses could confirm one. The campaign's own data files are
 * served as static module files anyway, so this was never meant to stop that.
 */
export function stageAlias(id) {
  return `p${fnv1a64(`bi-stage:${id}`).toString(16).padStart(16, "0").slice(0, 12)}`;
}

/** The plain id a scene brief's cast entry goes by: its npc id, its own id, or its display name. */
export function rawStageId(member) {
  return String(member?.npcRef ?? member?.id ?? member?.displayName ?? "unknown");
}

/**
 * The id a cast entry is filed on the stage under. A protected person gets the
 * opaque alias, everyone else keeps their plain id. The Runner (which asks "is
 * this person already up?") and the stage (which publishes them) both call
 * this, so the two can never disagree about who is who.
 */
export function stageIdFor(member) {
  const raw = rawStageId(member);
  return isNameProtected(member) ? stageAlias(raw) : raw;
}

/** A Set from whatever a caller has to hand: a Set, an array, or an object keyed by name key. */
export function knownSet(known) {
  if (known instanceof Set) return known;
  if (Array.isArray(known)) return new Set(known);
  if (known && typeof known === "object") return new Set(Object.keys(known));
  return new Set();
}

/** The key a person's name is remembered under: their npc id, or failing that their stage id. */
export function nameKeyOf(member) {
  return member?.nameKey ?? member?.npcRef ?? member?.portraitId ?? null;
}

/** Whether a cast entry hides its real name until told to show it. */
export function isNameProtected(member) {
  return typeof member?.called === "string" && member.called.trim().length > 0;
}

/** Whether the table already knows this person's real name. Unprotected people are always known. */
export function isNameKnown(member, known) {
  if (!isNameProtected(member)) return true;
  return knownSet(known).has(nameKeyOf(member));
}

/**
 * The name a player's screen shows for this person. Their real name only once
 * it is known (or if they were never protected), otherwise the `called` line.
 */
export function tableLabel(member, known) {
  if (isNameKnown(member, known)) return member?.label;
  return member.called.trim();
}

/**
 * A GM's copy of the authored cast, shown the way the TABLE sees it so the
 * Director's screen and the players' never disagree about who is who, with the
 * real name carried alongside for the frame's tooltip.
 */
export function presentCast(authored = [], known) {
  const set = knownSet(known);
  return authored.map((member) => ({
    ...member,
    label: tableLabel(member, set),
    realName: isNameProtected(member) ? member.label : null,
    nameHidden: isNameProtected(member) && !isNameKnown(member, set)
  }));
}

/**
 * Which visible members had their name revealed between two renders, with the
 * label they had before. Keyed off `nameSeq` (stamped on the member at the
 * moment of the reveal) rather than the label alone, so an ordinary edit to a
 * label is not mistaken for a reveal, and a repeat reveal is not swallowed.
 *
 * @returns {Map<string, string>} portraitId -> the label they had before
 */
export function renamedMembers(previous = [], next = []) {
  const before = new Map(previous.map((member) => [member.portraitId, member]));
  const renamed = new Map();
  for (const member of next) {
    const prior = before.get(member.portraitId);
    if (!prior || !member.nameSeq) continue;
    if (member.nameSeq === prior.nameSeq) continue;
    if (member.label === prior.label) continue;
    renamed.set(member.portraitId, prior.label);
  }
  return renamed;
}

/**
 * The banner line for a name being announced, or null. Only an ANNOUNCED
 * reveal sounds a banner; a quiet one just stamps the plate.
 */
export function noticeForRename(previousLabel, member) {
  if (!member?.label || !previousLabel || member.nameSting !== "announced") return null;
  return { kind: "info", text: `${previousLabel} is ${member.label}.` };
}

/**
 * A testable statement of the rule: does anything that would reveal a
 * protected person's REAL name appear in what was published?
 *
 * Checks the real label and the raw name key (an npc id such as `manako` is a
 * name in all but spelling). Case-insensitive, and only counts people whose
 * name is still hidden: once a name is known, publishing it is the point.
 *
 * Same shape and purpose as core/stage-layout.mjs#leaksConcealed, which guards
 * WHO is on the stage; this guards what the people on it are called.
 */
export function leaksNames(published, authored = [], known) {
  const serialized = JSON.stringify(published ?? []).toLowerCase();
  const set = knownSet(known);
  const leaks = [];
  for (const member of authored) {
    if (!isNameProtected(member) || isNameKnown(member, set)) continue;
    const secrets = [member.label, nameKeyOf(member), member.npcRef, member.actorId].filter(
      (value) => typeof value === "string" && value.length >= 2
    );
    for (const secret of secrets) {
      // A `called` line that happens to contain the secret is the author's own
      // choice and already public; only flag values the table was not given.
      if (String(member.called).toLowerCase().includes(secret.toLowerCase())) continue;
      if (serialized.includes(secret.toLowerCase())) leaks.push(secret);
    }
  }
  return [...new Set(leaks)];
}
