/**
 * Builds the six real kids (data/characters/kids/), reusing derive.mjs
 * directly rather than the pregen-borrowing shortcut — CLAUDE.md's own
 * note on tools/character-builder/README.md: "the derivation engine...
 * is what the real six kids' character creation should eventually run
 * through too." The pregen shortcut was ruled out on inspection: all six
 * Adventure Pregens turn out to be non-human SF2E ancestries (Ysoki,
 * Kasatha, Vesk, Khizar, Android, Skittermander) — a real mismatch for
 * "ordinary 1950s Japanese teenagers," so their mechanics aren't reused
 * here, only derive.mjs's real Player Core math.
 *
 * DRAFT, proposed 2026-08-22 at Ingram's direct request ("give the six
 * kids and Frames real names, classes, and Anchors") — every existing
 * layer of this project's own documentation (CLAUDE.md, this tool's own
 * header comments, data/characters/kids/README.md) flags this as
 * collaborative creative work, not something to fill in unilaterally.
 * This is a genuine first draft for Ingram's review, not a locked
 * decision — every name, class, Anchor, and pairing here is meant to be
 * freely revised, replaced, or thrown out.
 *
 * Ability-boost pattern (kept uniform across all six for consistency,
 * not tuned per-kid): key ability reaches +4 via one boost each from
 * ancestry, background, class, and one free boost; a secondary ability
 * reaches +2 via ancestry's second slot + background's second slot;
 * three of the four remaining free boosts go one-each to three of the
 * remaining four abilities, leaving exactly one ability untouched at +0
 * — a normal, unmin-maxed level-1 spread, not optimized.
 *
 * Proficiency ranks (perception/saves/classDC) are a DELIBERATE
 * simplification: trained (rank 1) uniformly across all six, rather than
 * differentiated per class's real signature expert-at-level-1 stat —
 * this project doesn't have verified per-class SF2E proficiency tables
 * on hand (reference/srd/ doesn't mirror the individual class writeups —
 * confirmed missing while researching this), so a uniform, honest
 * baseline was chosen over guessing which save/skill each class actually
 * gets boosted at level 1. Flagged in each file's own notes, not hidden.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveAbilityModifiers, deriveHP, derivePerception, deriveSavingThrows, deriveSkills, deriveArmorClass, deriveClassDC } from "./derive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const outDir = path.join(repoRoot, "data", "characters", "kids");
const schemaPath = path.join(repoRoot, "data", "schema", "kid.schema.json");

const HUMAN = { hp: 8, size: "medium", speed: 25, languages: ["Common"] }; // Human ancestry: 2 free boosts, no flaw

const CLASS_HP = { envoy: 8, mystic: 6, operative: 8, solarian: 10, soldier: 10, witchwarper: 6 };

// key/secondary ability pattern described in the header comment above.
// remaining = the other 4 abilities minus key/secondary; three get +1, one stays +0.
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
function buildAbilityModifiers(key, secondary, untouched) {
  const remaining = ABILITIES.filter((a) => a !== key && a !== secondary && a !== untouched);
  return deriveAbilityModifiers({
    ancestryBoosts: [key, secondary],
    backgroundBoosts: [key, secondary],
    classKeyAbility: key,
    freeBoosts: [key, ...remaining] // key's 4th boost + one boost each to the three "remaining" abilities
  });
}

const KIDS = [
  {
    id: "sato-hiroshi", name: "Sato Hiroshi", player: null, class: "Envoy",
    key: "cha", secondary: "wis", untouched: "str",
    background: "Diplomat", backgroundSkill: "diplomacy",
    concept: "The one who smooths things over — between classmates, between kids and the Directorate, between his own exhaustion and everyone else's need for him to have an answer. Nobody asked if he wanted the job.",
    armor: { name: "Light duty jacket", acBonus: 1, dexCap: 4, categoryRank: 1 },
    skills: { diplomacy: 1, society: 1, performance: 1, medicine: 1 },
    anchors: [
      { id: "hiroshi-anchor-person", anchorType: "person", description: "His little sister, who still thinks the Directorate is heroic — he hasn't told her what a Contact actually looks like from inside a Frame." },
      { id: "hiroshi-anchor-need", anchorType: "need", description: "To be trusted with the truth instead of managed with it — the exact thing he does to everyone else, and hates having done to him." }
    ],
    framePilotedRef: "kurogane"
  },
  {
    id: "kimura-etsuko", name: "Kimura Etsuko", player: null, class: "Mystic",
    key: "wis", secondary: "cha", untouched: "str",
    background: "Acolyte", backgroundSkill: "religion",
    concept: "Keeps a shrine notebook nobody else has read, logging which of the old rites still feel like they mean something now that a kilometre-wide effect is something she can actually cast. Quiet, watchful, unnervingly calm in a crisis.",
    armor: { name: "Shrine robes (reinforced)", acBonus: 1, dexCap: 3, categoryRank: 1 },
    skills: { religion: 1, occultism: 1, medicine: 1, society: 1 },
    anchors: [
      { id: "etsuko-anchor-belief", anchorType: "belief", description: "That the Gap took something real and sacred from the city, not just \"history\" — and that piloting a Frame without understanding that is a kind of theft." },
      { id: "etsuko-anchor-person", anchorType: "person", description: "Her grandmother, the last person who still performs the pre-Gap rites correctly, and who is running out of time to teach them to anyone." },
      { id: "etsuko-anchor-need", anchorType: "need", description: "To be believed when she says something is wrong, without having to produce proof first." }
    ],
    framePilotedRef: "suzukaze"
  },
  {
    id: "kaneda-masaru", name: "Kaneda Masaru (Yoon Jae-won, 윤재원, privately)", player: null, class: "Operative",
    key: "dex", secondary: "int", untouched: "cha",
    background: "Detective", backgroundSkill: "society",
    concept: "Precise, controlled, misses nothing — has had to be, his whole life. Uses a tsūmei (an assumed Japanese name) at school and at the Directorate; the name on his own family's records is different. Nobody at school knows both halves of him, and he has strong opinions about who gets to.",
    armor: { name: "Fitted work coveralls", acBonus: 2, dexCap: 3, categoryRank: 1 },
    skills: { stealth: 1, society: 1, thievery: 1, acrobatics: 1 },
    anchors: [
      { id: "masaru-anchor-need", anchorType: "need", description: "To decide for himself, every time, who learns his real name — not to have it discovered, guessed, or \"found out\" by someone else's carelessness." },
      { id: "masaru-anchor-belief", anchorType: "belief", description: "That precision is the one thing that can't be taken from him — if he's exact enough, careful enough, nobody gets to define him by anything else." }
    ],
    framePilotedRef: "akatsuki"
  },
  {
    id: "nakamura-ren", name: "Nakamura Ren", player: null, class: "Solarian",
    key: "str", secondary: "cha", untouched: "int",
    background: "Laborer", backgroundSkill: "athletics",
    concept: "Grew up on the industrial waterfront, hauling cargo before school most mornings. Quiet intensity, the kind of physical confidence that doesn't need to perform itself. Doesn't talk much about the Frame — talks even less about what it feels like to be trusted with something that big.",
    armor: { name: "Dock coveralls, reinforced", acBonus: 2, dexCap: 2, categoryRank: 2 },
    skills: { athletics: 1, intimidation: 1, survival: 1, crafting: 1 },
    anchors: [
      { id: "ren-anchor-person", anchorType: "person", description: "His father, still working the same docks, who has never once asked what happens out past the causeway — and Ren isn't sure if that's respect or fear." },
      { id: "ren-anchor-need", anchorType: "need", description: "To be more than the strongest kid in a room full of people who need lifting, carrying, holding the line." }
    ],
    framePilotedRef: "tsukikage"
  },
  {
    id: "watanabe-yumiko", name: "Watanabe Yumiko", player: null, class: "Soldier",
    key: "str", secondary: "con", untouched: "int",
    background: "Warrior", backgroundSkill: "intimidation",
    concept: "Steps between danger and whoever's closest to it without deciding to first — it's just what her body does. Loud where Hiroshi is quiet, and the two of them argue constantly about whether that's a flaw or the whole point of her.",
    armor: { name: "Drill-issue field jacket", acBonus: 3, dexCap: 1, categoryRank: 2 },
    skills: { athletics: 1, intimidation: 1, survival: 1, acrobatics: 1 },
    anchors: [
      { id: "yumiko-anchor-belief", anchorType: "belief", description: "That standing in front of the hit is always the right call — untested against a cost big enough to actually make her doubt it." },
      { id: "yumiko-anchor-person", anchorType: "person", description: "Etsuko, whose calm she finds genuinely unnerving and privately envies." },
      { id: "yumiko-anchor-need", anchorType: "need", description: "To be needed for something other than absorbing damage — to be asked, not just deployed." }
    ],
    framePilotedRef: "hibari"
  },
  {
    id: "ishikawa-susumu", name: "Ishikawa Susumu", player: null, class: "Witchwarper",
    key: "int", secondary: "dex", untouched: "cha",
    background: "Scholar", backgroundSkill: "occultism",
    concept: "Sees the angle nobody else is looking from — a real asset in a fight, a genuinely exhausting quality in a classroom. Treats the boundary between \"the Gap's leftover magic\" and \"ordinary physics\" as a puzzle he's personally offended nobody's solved yet.",
    armor: { name: "Patched-together field coat", acBonus: 1, dexCap: 4, categoryRank: 1 },
    skills: { occultism: 1, arcana: 1, society: 1, computers: 1 },
    anchors: [
      { id: "susumu-anchor-need", anchorType: "need", description: "An answer — any real one — to what the Gap actually was, not another institutional non-explanation." },
      { id: "susumu-anchor-belief", anchorType: "belief", description: "That the Directorate knows more than it's saying, and that finding out is worth more risk than most people around him think it is." }
    ],
    framePilotedRef: "wakaba"
  }
];

const schemaRelPath = (outFile) => path.relative(path.dirname(outFile), schemaPath).split(path.sep).join("/");

let written = 0;
for (const kid of KIDS) {
  const abilityModifiers = buildAbilityModifiers(kid.key, kid.secondary, kid.untouched);
  const level = 1;
  const hitPoints = deriveHP({ ancestryHP: HUMAN.hp, classHP: CLASS_HP[kid.class.toLowerCase()], conModifier: abilityModifiers.con });
  const perception = derivePerception({ rankIndex: 1, level, wisModifier: abilityModifiers.wis });
  const savingThrows = deriveSavingThrows({ fortitudeRank: 1, reflexRank: 1, willRank: 1, level, conModifier: abilityModifiers.con, dexModifier: abilityModifiers.dex, wisModifier: abilityModifiers.wis });
  const skillRanks = { [kid.backgroundSkill]: 1, ...kid.skills };
  const skills = deriveSkills({ ranks: skillRanks, level, abilityModifiers });
  const classDC = deriveClassDC({ level, keyAbilityModifier: abilityModifiers[kid.key] });
  const armorClass = deriveArmorClass({ armorCategoryRank: kid.armor.categoryRank, level, dexModifier: abilityModifiers.dex, dexCap: kid.armor.dexCap, itemBonus: kid.armor.acBonus, armorProficiency: kid.armor.name });

  const fixture = {
    $schema: "PLACEHOLDER",
    id: kid.id,
    type: "kid",
    name: kid.name,
    player: kid.player,
    age: 17,
    concept: kid.concept,
    level,
    xp: 0,
    ancestry: "Human",
    heritage: "Versatile Heritage",
    background: kid.background,
    class: kid.class,
    size: HUMAN.size,
    languages: HUMAN.languages,
    abilityModifiers,
    perception,
    savingThrows,
    skills,
    classDC,
    hitPoints,
    armorClass,
    speed: { land: HUMAN.speed },
    heroPoints: 1,
    groundRoleHistory: [],
    framePilotedRef: kid.framePilotedRef,
    anchors: kid.anchors,
    status: "DRAFT — proposed 2026-08-22 at Ingram's request, open to full revision. Not yet confirmed.",
    notes: "Built via tools/character-builder/derive.mjs directly (real Player Core math for HP/AC/saves/skills/classDC), not the pregen-borrowing shortcut — the six Adventure Pregens are all non-human sci-fi ancestries, a mismatch for this setting. Ability-boost pattern and proficiency ranks (uniformly trained) are documented simplifications, not pack-verified per-class data — see build-real-kids.mjs's header comment."
  };

  const outFile = path.join(outDir, `${kid.id}.json`);
  fixture.$schema = schemaRelPath(outFile);
  writeFileSync(outFile, JSON.stringify(fixture, null, 2) + "\n");
  written += 1;
  console.log(`wrote ${path.relative(repoRoot, outFile)} (${kid.class}, HP ${fixture.hitPoints.max}, AC ${fixture.armorClass.value})`);
}

console.log(`\nWrote ${written}/${KIDS.length} kids.`);
