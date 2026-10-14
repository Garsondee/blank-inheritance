/**
 * The chargen oracle: after Induction, is each made character what its choices say it should be? Pure.
 * (design/playtest-process.md, section 6, Phase 2: "each sheet's HP, AC, saves and attributes against derive.mjs; a mismatch is an S0 or S1".)
 *
 * The terminal does no sheet arithmetic: it embeds the real ancestry, background and class and lets sf2e compute the numbers
 * (design/induction-terminal.md §6). So the check is between two independent derivations of the same picks: what sf2e made, and what
 * tools/character-builder/derive.mjs (held to every Player Core pregen's own published HP) says the picks should give. They share
 * nothing but Player Core's rules, so a disagreement is a real bug in the chain from a click to a sheet.
 *
 * It reads the picks FROM THE ACTOR (the selected boosts on its embedded items), not from what a bot meant to pick, so it is as true for an
 * agent's character as for a scripted one.
 */

import { deriveAbilityModifiers, deriveHP } from "../../character-builder/derive.mjs";

/** A slot that exists: sf2e keeps empty placeholder slots (no options, nothing selected) that are not choices to make. */
export const live = (slots) => (slots ?? []).filter((s) => (s.value?.length ?? 0) > 0 || s.selected);

/** The ability a slot resolved to: its selection, or its only option. null when it is still open. */
export const resolved = (slot) => slot?.selected ?? (slot?.value?.length === 1 ? slot.value[0] : null);

/**
 * The skill an answer to a ChoiceSet names: the string itself, or the `skill` or `slug` of an object answer (Advocate's {skill, feat},
 * Magitech Specialist's {slug, rank}). null for anything that is not a skill answer.
 */
export function skillOfSelection(selection) {
  if (typeof selection === "string") return selection;
  const inner = selection && typeof selection === "object" ? (selection.skill ?? selection.slug) : null;
  return typeof inner === "string" ? inner : null;
}

/**
 * The questions a background or class asks (a ChoiceSet rule: Starship Dweller's Crafting or Piloting, Envoy's Deception, Diplomacy or
 * Intimidation), judged from the made actor: each was answered, and the skill it names is trained on the sheet. The induction terminal
 * asks them itself and writes the answer into the item (core/induction-rule-choices.mjs), so an unanswered one means Foundry was left to
 * ask in a window of its own (the defect the first scripted run found, F-0008) and an untrained skill means the answer never reached the sheet.
 * @returns {string[]} problems
 */
export function checkChoices(raw) {
  const problems = [];
  for (const [item, rules] of Object.entries(raw.choices ?? {})) {
    for (const rule of rules ?? []) {
      const answered = rule.selection !== null && rule.selection !== undefined;
      if (!answered) {
        problems.push(`the ${item}'s question "${rule.flag}" was never answered in the item, so Foundry had to ask it`);
        continue;
      }
      const skill = skillOfSelection(rule.selection);
      if (skill && raw.skillRanks && skill in raw.skillRanks && !(raw.skillRanks[skill] >= 1)) problems.push(`${skill} was chosen for the ${item} but is not trained on the sheet (rank ${raw.skillRanks[skill]})`);
    }
  }
  return problems;
}

/**
 * @param {object} raw one entry of the page's `characters` probe
 * @returns {{ok:boolean, name:string, problems:string[], expected:{mods:object, hp:number}|null, actual:{mods:object, hp:number}}}
 */
export function checkCharacter(raw) {
  const problems = [];
  const actual = { mods: raw.mods, hp: raw.hp };
  if (!raw.ancestry) problems.push("no ancestry item");
  if (!raw.background) problems.push("no background item");
  if (!raw.class) problems.push("no class item");
  if (problems.length) return { ok: false, name: raw.name, problems, expected: null, actual };

  const ancestryBoosts = live(raw.ancestry.boosts).map(resolved);
  const ancestryFlaws = live(raw.ancestry.flaws).map(resolved);
  const backgroundBoosts = live(raw.background.boosts).map(resolved);
  const classKeyAbility = resolved(raw.class.key);
  const open = [["ancestry boost", ancestryBoosts], ["ancestry flaw", ancestryFlaws], ["background boost", backgroundBoosts]].flatMap(([what, list]) => list.map((v, i) => (v === null ? `${what} ${i + 1} was never chosen` : null)).filter(Boolean));
  if (classKeyAbility === null) open.push("the class's key ability was never chosen");
  if ((raw.free ?? []).length !== 4) open.push(`the four free boosts are ${(raw.free ?? []).length}`);
  problems.push(...open);

  const mods = deriveAbilityModifiers({ ancestryBoosts: ancestryBoosts.filter(Boolean), ancestryFlaws: ancestryFlaws.filter(Boolean), backgroundBoosts: backgroundBoosts.filter(Boolean), classKeyAbility, freeBoosts: raw.free ?? [] });
  const hp = deriveHP({ ancestryHP: raw.ancestry.hp, classHP: raw.class.hp, conModifier: mods.con }).max;
  for (const [ability, mod] of Object.entries(mods)) if (raw.mods?.[ability] !== mod) problems.push(`${ability} is ${raw.mods?.[ability]} on the sheet; the picks give ${mod}`);
  if (raw.hp !== hp) problems.push(`HP is ${raw.hp} on the sheet; ancestry ${raw.ancestry.hp} + class ${raw.class.hp} + Con ${mods.con} gives ${hp}`);
  problems.push(...checkChoices(raw));
  return { ok: problems.length === 0, name: raw.name, problems, expected: { mods, hp }, actual };
}

/**
 * The structural half: is the character made the way the process needs?
 * @param {object} raw one probe entry
 * @param {{expectOwner?: string, landingScene?: string}} want the user that should own it, and the scene its token should be on
 */
export function checkPlacement(raw, { expectOwner = null, landingScene = null } = {}) {
  const problems = [];
  if (expectOwner && !raw.owners.includes(expectOwner)) problems.push(`${expectOwner} is not an owner of ${raw.name} (owners: ${raw.owners.join(", ") || "none"})`);
  if (expectOwner && !raw.assignedTo.includes(expectOwner)) problems.push(`${expectOwner}'s own character is not set to ${raw.name}`);
  if (!raw.tokens.length) problems.push("no token on any scene");
  else if (landingScene && !raw.tokens.some((t) => t.scene === landingScene)) problems.push(`no token on the landing scene (${landingScene}); on: ${raw.tokens.map((t) => t.scene).join(", ")}`);
  if (raw.hasAnswers && raw.intakeWhispers < 1) problems.push("the player wrote intake answers but the GM got no whispered intake message naming this character");
  return { ok: problems.length === 0, problems };
}

/** One text report over all characters, and the failures to file. */
export function judgeCharacters(characters, { ownerOf = () => null, landingScene = null } = {}) {
  const lines = [];
  const failures = [];
  for (const raw of characters) {
    const sheet = checkCharacter(raw);
    const placement = checkPlacement(raw, { expectOwner: ownerOf(raw), landingScene });
    const problems = [...sheet.problems, ...placement.problems];
    lines.push(`${problems.length ? "FAIL" : "ok  "} ${raw.name}: ${raw.ancestry?.slug ?? "?"} / ${raw.background?.slug ?? "?"} / ${raw.class?.slug ?? "?"}, HP ${raw.hp}, AC ${raw.ac}${problems.length ? ` -- ${problems.join("; ")}` : ""}`);
    if (problems.length) failures.push({ name: raw.name, problems, sheetProblems: sheet.problems.length > 0 });
  }
  return { lines, failures, ok: failures.length === 0 };
}
