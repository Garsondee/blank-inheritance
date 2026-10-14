/**
 * The choices an ancestry, background or class asks for through a ChoiceSet rule element, and how the
 * induction terminal asks them on its own pages instead of letting Foundry's own dialog interrupt Confirm.
 *
 * Embedding a compendium Item on a new character runs its rule elements, and a ChoiceSet with nothing
 * chosen opens sf2e's "Select a skill" window over whatever is on screen (the one dialog sf2e shows
 * mid-embed). Starship Dweller's real rule is "trained in Crafting or Piloting": a player who picked it saw
 * that window open over the Review page while the page said only "Creating your character...", found by
 * the playtest rig, 2026-10-06 (design/playtest-process.md §12.5, F-0008). Sixteen of the 162 backgrounds
 * and one of the six classes (Envoy: Deception, Diplomacy or Intimidation) carry such a rule.
 *
 * sf2e takes a ready-made answer: a ChoiceSet whose rule data already has a `selection` that matches one of
 * its choices opens no window (ChoiceSetRuleElement's constructor reads `selection`, `preCreate` takes it
 * as the preselection; gamesystems/sf2e/sf2e.mjs). So the terminal asks on the page where the player picks
 * the background or class, keeps the answer as a string, and writes it into the rule before the embed.
 *
 * Two kinds of ChoiceSet are NOT asked:
 *  - one whose answer only feeds a GrantItem rule (the background's skill FEAT: Simulation Programmer,
 *    Brutaris Player, Cult Escapee). The terminal removes every GrantItem (induction-review.mjs's
 *    stripGrantItemRules) because feats are chosen on the real sheet, so a question whose only use is a
 *    grant that was thrown away would be a pointless window. That ChoiceSet is dropped with it.
 *  - a shape this file does not understand. It is reported, never guessed at; the catalogue builder
 *    (tools/character-builder/extract-rule-choices.mjs) and its test fail rather than ship it.
 *
 * This file is pure data in, data out. The catalogues carry the result (`choices` on a background or a
 * class), so a page draws it without reading a compendium; `applyRuleChoices` is the same analysis run
 * on the real item's rules at confirm time, so the two cannot disagree.
 */

import { FALLBACK_SKILL_SLUGS } from "./skills.mjs";

const SKILL_LABEL_KEY = /^PF2E\.Skill\.([A-Za-z]+)$/;
const PLAIN_KEY = /^[a-z][a-z0-9-]*$/;
const cap = (slug) => slug.charAt(0).toUpperCase() + slug.slice(1);
const clone = (value) => JSON.parse(JSON.stringify(value));

/** `PF2E.Skill.Crafting` is the skill "crafting"; anything else is not a skill's label key. */
function skillOfLabelKey(label) {
  const match = typeof label === "string" ? SKILL_LABEL_KEY.exec(label) : null;
  return match ? match[1].toLowerCase() : null;
}

/**
 * The string a form keeps for one choice. A skill's own label wins over the value stored beside it:
 * sf2e's Society Scout lists "Piloting" with the value "society", so the value cannot be trusted to say
 * which skill the player is choosing and the label can.
 */
function keyOfChoice(choice) {
  const fromLabel = skillOfLabelKey(choice?.label);
  if (fromLabel) return fromLabel;
  const value = choice?.value;
  if (typeof value === "string") return PLAIN_KEY.test(value) ? value : null;
  const inner = value && typeof value === "object" ? (value.skill ?? value.slug) : null;
  return typeof inner === "string" && PLAIN_KEY.test(inner) ? inner : null;
}

function labelOfChoice(choice, key) {
  const label = choice?.label;
  if (typeof label === "string" && label && !label.startsWith("PF2E.")) return label;
  return cap(key);
}

/** The options of one ChoiceSet rule as `{key, label}` list, or null when its shape is not one this understands. */
function optionsOfRule(rule) {
  const choices = rule.choices;
  if (Array.isArray(choices)) {
    if (choices.length === 0) return null;
    const options = choices.map((choice) => {
      const key = keyOfChoice(choice);
      return key ? { key, label: labelOfChoice(choice, key) } : null;
    });
    if (options.some((o) => o === null)) return null;
    if (new Set(options.map((o) => o.key)).size !== options.length) return null;
    return options;
  }
  if (choices && typeof choices === "object" && choices.config === "skills" && Object.keys(choices).length === 1) {
    return FALLBACK_SKILL_SLUGS.map((key) => ({ key, label: cap(key) }));
  }
  return null;
}

/** What a choice is for, so a page can say "trained in one of these" instead of a bare "choose". */
function kindOf(options) {
  return options.every((o) => FALLBACK_SKILL_SLUGS.includes(o.key)) ? "skill" : "other";
}

/**
 * Every ChoiceSet in an item's rules, sorted into what the player is asked, what is dropped, and what is not understood.
 * @param {object[]} rules an Item's `system.rules`
 * @returns {{choices: {flag:string, kind:"skill"|"other", options:{key:string,label:string}[]}[], deferred: string[], unsupported: {flag:string|null, reason:string}[]}}
 */
export function analyzeRuleChoices(rules) {
  const list = Array.isArray(rules) ? rules : [];
  const out = { choices: [], deferred: [], unsupported: [] };
  for (const rule of list) {
    if (rule?.key !== "ChoiceSet") continue;
    const flag = typeof rule.flag === "string" && rule.flag ? rule.flag : null;
    if (!flag) {
      out.unsupported.push({ flag: null, reason: "a ChoiceSet with no flag of its own" });
      continue;
    }
    const uses = new RegExp(`rulesSelections\\.${flag}(?![A-Za-z0-9_])`);
    const consumers = list.filter((other) => other !== rule && uses.test(JSON.stringify(other)));
    if (consumers.length > 0 && consumers.every((other) => other.key === "GrantItem")) {
      out.deferred.push(flag);
      continue;
    }
    const options = optionsOfRule(rule);
    if (!options) {
      out.unsupported.push({ flag, reason: "its choices are not a list of skills this form can offer" });
      continue;
    }
    out.choices.push({ flag, kind: kindOf(options), options });
  }
  return out;
}

/** Every choice a catalogue entry carries has an answer that is one of its own options. */
export function choicesComplete(choices, picks) {
  return (choices ?? []).every((choice) => choice.options.some((option) => option.key === picks?.[choice.flag]));
}

/** How many of an entry's choices still wait for an answer. */
export function remainingChoices(choices, picks) {
  return (choices ?? []).filter((choice) => !choice.options.some((option) => option.key === picks?.[choice.flag])).length;
}

/**
 * The choices of a catalogue entry as a page draws them: each option with whether it is the picked one.
 * `labelOf(key, fallback)` is where the caller localizes a skill's name.
 */
export function decorateRuleChoices(choices, picks, { labelOf = (key, label) => label } = {}) {
  return (choices ?? []).map((choice) => ({
    flag: choice.flag,
    kind: choice.kind,
    isSkill: choice.kind === "skill",
    options: choice.options.map((option) => ({
      flag: choice.flag,
      key: option.key,
      label: labelOf(option.key, option.label),
      picked: picks?.[choice.flag] === option.key
    }))
  }));
}

/** What the player picked, as the labels the review shows, in the entry's own order. */
export function pickedChoiceLabels(choices, picks, { labelOf = (key, label) => label } = {}) {
  return (choices ?? []).flatMap((choice) => {
    const option = choice.options.find((o) => o.key === picks?.[choice.flag]);
    return option ? [{ flag: choice.flag, kind: choice.kind, label: labelOf(option.key, option.label) }] : [];
  });
}

/**
 * An item's rules, ready to embed with no question left for Foundry to ask: each answered ChoiceSet carries its
 * `selection`, each ChoiceSet that only fed a discarded grant is gone, and anything not understood is untouched
 * (Foundry will ask about it, which is its own right to). A copy: the rules passed in are never changed.
 * Run it BEFORE the GrantItem rules are stripped, because "only feeds a grant" is read from them.
 * @throws {Error} when a choice the terminal asks has no legal answer in `picks`
 */
export function applyRuleChoices(rules, picks = {}) {
  const analysis = analyzeRuleChoices(rules);
  const missing = analysis.choices.filter((choice) => !choice.options.some((option) => option.key === picks?.[choice.flag]));
  if (missing.length) throw new Error(`Not every choice has been made yet (${missing.map((c) => c.flag).join(", ")}).`);
  const byFlag = new Map(analysis.choices.map((choice) => [choice.flag, choice]));
  const out = [];
  for (const rule of Array.isArray(rules) ? rules : []) {
    const copy = clone(rule);
    if (copy?.key !== "ChoiceSet") {
      out.push(copy);
      continue;
    }
    if (analysis.deferred.includes(copy.flag)) continue;
    if (!byFlag.has(copy.flag)) {
      out.push(copy);
      continue;
    }
    const key = picks[copy.flag];
    if (Array.isArray(copy.choices)) {
      const target = copy.choices.find((choice) => keyOfChoice(choice) === key);
      // sf2e's own data can name one skill and carry another's value (Society Scout's Piloting): the player chose the label.
      if (typeof target.value === "string" && target.value !== key) target.value = key;
      copy.selection = target.value;
    } else {
      copy.selection = key;
    }
    out.push(copy);
  }
  return out;
}
