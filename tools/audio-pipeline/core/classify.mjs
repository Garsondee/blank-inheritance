/**
 * The pipeline's first opinion about what a file is for. Pure.
 *
 * This is a PROPOSAL, never a decision (ideas/entries/asset-review-pipeline.json:
 * "AI examines and describes each one and proposes a purpose, a human reviews/
 * confirms"). Every proposal carries its confidence and the reasons behind it,
 * so the review screen can show why the pipeline thought a file was ambience
 * and a human can overrule it in one click.
 *
 * Evidence, strongest first:
 *   1. The folder a human already sorted it into (audio/in-tray/music/<mood>/).
 *   2. The sound library's own embedded description (WAV BEXT `comment`, e.g.
 *      "Police, Dispatch, Phone, Filter, Middle, Age, Female, 911 ...").
 *   3. Words in the filename.
 *   4. Duration — a 90-second file is not a sting, a one-second file is not a bed.
 */

import { slugify, stemToIdBase } from "../../../module/blank-inheritance/scripts/core/audio-library.mjs";

/** Filename prefixes that name a vendor or a pack, not the sound. */
const VENDOR_PREFIXES = [
  /^ESM_(?:PSCWEA|PSULE|WNL|EMDP\d|\d+)_?/i,
  /^ESM_/i,
  /^BRS_/i,
  /^FF_(?:EFX|ES|IE)_/i,
  /^KSHMR_\w+?_fx_/i,
  /^MNT_HV_/i,
  /^OS_UMS_/i,
  /^PREL_SSFX_/i,
  /^GLTCH_SFX_/i,
  /^MMFX_/i,
  /^DS_TD\d_\d+_/i,
  /^Soundiron_\w+?_(?:Environments_)?(?:Civilization_|Wilderness_)?/i
];

/** Stock words sound libraries pad their names with. They describe the catalogue, not the sound. */
const BOILERPLATE = new Set(
  "ambience nature game background atmosphere world fantasy sci fi ancient loop loopwav wav cinematic fx foley fx".split(" ")
);

/**
 * Whole phrases the vendors stamp into every file's description: licensing
 * boilerplate, catalogue keywords, and the channel layout. They are true, and
 * they say nothing about what the sound IS — left in, they crowd out the two
 * or three words that actually distinguish one file from the next.
 */
const DESCRIPTION_NOISE = [
  /distributed exclusively by/i,
  /splice\.?com/i,
  /epic stock media/i,
  /big room sound/i,
  /soundiron/i,
  /pro audio converter/i,
  /^(5[\s.-]?1|7[\s.-]?1|stereo|mono|surround sound)$/i,
  /^(ambien(ce|t)|atmospheric|atmosphere|soundscapes?|environments?|fantasy world|organic nature|game (loop|music)|loopable|seamless looping|sound( effect)?|soundtrack|airy|designed|nature( sounds| atmosphere)?|background|digital elements|loops?|game|item|device|movement|ui)$/i
];

const isNoise = (term) => !term || DESCRIPTION_NOISE.some((re) => re.test(term.trim()));

/**
 * Category rules for samples, in priority order: the first whose pattern
 * matches the evidence wins. Categories are browsing shelves on the Sound
 * Desk, so they name places and situations a GM reaches for, not audio jargon.
 */
const SAMPLE_CATEGORIES = [
  ["interface", /\b(login|log in|password|authori[sz]ed|monitor|data entry|keyboard|terminal|satellite track)\b/],
  ["radio", /\b(dispatch|atc|air traffic|radio|cb|swat|walkie|news broadcast|static|no signal|channel change)\b/],
  ["horror", /\b(horror|creepy|dark lair|lair|dungeon|ominous|shadow|evil|villain|black hole|suspense|tense)\b/],
  ["military", /\b(battle|battlefield|war|warfare|military|soldiers|marching|explosion|explosions|cannon|cannons|gun|guns|takeover|alarm|meltdown|siren|gas mask|jet|aircraft)\b/],
  ["sci-fi", /\b(alien|scanner|force field|forcefield|energy|magnetic|ray|laser|planet|glitch|whoosh|evaporation|spoiler|logo|distort|beacon|homing|laboratory|lab|research)\b/],
  ["medical", /\b(hospital|life support|doctor|waiting room|medical)\b/],
  ["coast", /\b(beach|shore|waves|sea|seagull|seagulls|gull|bay|pier|wharf|harbou?r|fog horn|foghorn|sonar|submarine|ship|freighter|brig|underwater)\b/],
  ["weather", /\b(rain|storm|thunder|thunderstorm|lightning|wind|windy|gust|gusty)\b/],
  ["city", /\b(city|downtown|urban|neighbou?rhood|nightlife|street)\b/],
  ["crowd", /\b(crowd|walla|mall|cafe|coffee|bar|restaurant|casino|party|club|school|schoolyard|playground|children|kids|teens|sports|pedestrians)\b/],
  ["nature", /\b(forest|birds|bird|insect|insects|cicada|cicadas|cricket|crickets|jungle|shrine|fairy|shire|trees|chimes|haven|breeze|cave)\b/],
  ["industrial", /\b(factory|machine|machines|machinery|machine shop|body shop|construction|jackhammer|jackhammers|gear|mechanical|mechanism|flame|burning|fire|earthquake|rumbling|debris)\b/],
  ["transport", /\b(train|subway|metro|station|helicopter|traffic|taxi|car|vehicle|trucks|honk)\b/],
  ["household", /\b(kitchen|knife|chopping|grilling|snap)\b/]
];

// No trailing \b on the first three on purpose: two real files are single run-together
// words ("loginauthorised", "pleaseenteryourpassword").
const INTERFACE_WORDS = /(login|log in|password|authori[sz]|\bmonitor|\bdata entry|\bscanner|\bprocessor|\bcomput|\bsatellite track|\bbeep)/;
/**
 * Deliberately NOT a bare "chatter": a real file's own description reads
 * "chatter, machine, factory, appliance, hum" — machine chatter, not a
 * transmission — and it filed a factory loop as radio traffic.
 */
const VOICE_WORDS = /\b(dispatch|atc|air traffic|voice clip|radio chatter|cb radio|swat|news broadcast|walkie)\b/;
const STING_WORDS = /\b(horror music|melodic|stack|war horn|horn war|villain|logo|spoiler|distort|glitch|whoosh|evaporation|impact|hit|riser|braam|stinger|sting)\b/;
/** Named one-shot events. They keep a short file out of the "no idea" bucket. */
const SFX_WORDS = /\b(explosion|explode|blast|fly ?by|fly ?over|pass ?by|passby|pass|horn|honk|ray|gunshot|shot|crash|slam|door|snap|chopping|knife|whoosh|beam)\b/;
const AMBIENCE_WORDS = /\b(ambience|amb|atmosphere|atmos|room tone|crowd|walla|city|street|traffic|forest|birds|insects?|cicadas?|crickets?|rain|storm|thunderstorm|wind|beach|shore|waves|bay|pier|factory|machines?|machinery|laboratory|lab|mall|cafe|coffee shop|bar|restaurant|casino|school|schoolyard|playground|subway|train|station|hospital|dungeon|lair|jungle|shrine|battle|battlefield|war|explosions|in flight|submarine|force field|takeover|construction|alarm|beacon|breathe|breathing|static|loop|drone|steady|nightlife|pedestrians|life support|fire|burning|flame|grilling|sizzle|water|drips?|cave)\b/;
/** Words that say "this runs and keeps running" outright, whatever else the name mentions. */
const EXPLICIT_BED_WORDS = /\b(ambience|ambient|atmosphere|atmos|room tone|loop|loopable|drone)\b/;

const words = (s) =>
  String(s ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-.,;:/()]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Words too small or too generic to be worth a tag. */
const STOPWORDS = new Set("a an and at by for from in into is it of off on or the to up with what your you my our".split(" "));

const titleCase = (s) =>
  s.replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bAtc\b/g, "ATC").replace(/\bSwat\b/g, "SWAT").replace(/\bCb\b/g, "CB").replace(/\bUi\b/g, "UI");

/**
 * A readable title from a filename stem: vendor prefixes, catalogue codes,
 * catalogue numbers and boilerplate removed. The number that keeps two
 * dispatch calls apart belongs in the id, not in what a GM reads.
 */
export function humaniseStem(stem) {
  let s = String(stem ?? "");
  for (const re of VENDOR_PREFIXES) s = s.replace(re, "");
  const idBase = stemToIdBase(s).replace(/-\d+$/, "");
  const parts = idBase.split("-").filter((w) => w && !BOILERPLATE.has(w));
  const cleaned = (parts.length ? parts : idBase.split("-")).join(" ");
  return titleCase(cleaned);
}

/**
 * A sample's title: the cleaned name, plus whatever the library's own
 * description adds that the name does not already say — "Cicadas — Steady
 * Drone, Insects", "Police Dispatch — Middle Age, Female, 911, What Is Your
 * Emergency". That is what tells thirty dispatch calls apart on a list.
 */
export function sampleTitle(stem, comment) {
  const base = humaniseStem(stem);
  const known = new Set(base.toLowerCase().split(/\s+/));
  const extra = String(comment ?? "")
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter((t) => t && !isNoise(t) && !t.toLowerCase().split(/\s+/).every((w) => known.has(w) || STOPWORDS.has(w)))
    .slice(0, 8);
  return extra.length ? `${base} — ${titleCase(extra.join(", ").toLowerCase())}` : base;
}

/** A readable title for a music file: its tag title if it has a real one, else the filename with underscores read as separators. */
export function musicTitle(stem, tags = {}) {
  const tagTitle = String(tags.title ?? "").trim();
  if (tagTitle && !/^track\s*\d+$/i.test(tagTitle) && tagTitle.length > 2) return tagTitle;
  return String(stem ?? "")
    .replace(/\s+_\s+/g, " — ")
    .replace(/_/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

const splitPath = (relPath) => String(relPath ?? "").replace(/\\/g, "/").split("/").filter(Boolean);

const stemOf = (fileName) => String(fileName).replace(/\.[^.]+$/, "");

/** Keywords worth keeping as tags: the embedded description's own terms, plus the matched rule words. */
function tagsFrom(evidence, extra = []) {
  const out = [];
  const add = (t) => {
    const slug = slugify(t, 32);
    if (slug && slug.length > 2 && !/^\d+$/.test(slug) && !BOILERPLATE.has(slug) && !STOPWORDS.has(slug) && !out.includes(slug)) out.push(slug);
  };
  for (const t of extra) add(t);
  for (const t of String(evidence.comment ?? "").split(/[,;]+/)) if (!isNoise(t)) add(t.trim());
  return out.slice(0, 14);
}

/**
 * Propose a classification for one source file.
 *
 * @param {object} input
 * @param {string} input.relPath   path relative to audio/in-tray/, forward slashes
 * @param {object} [input.probe]   parseProbe() output
 * @param {object} [input.analysis] loudness + silence analysis
 * @returns {{kind, category, title, description, tags, loop, confidence, reasons}}
 */
export function proposeClassification({ relPath, probe = {}, analysis = {} }) {
  const parts = splitPath(relPath);
  const fileName = parts[parts.length - 1] ?? "";
  const stem = stemOf(fileName);
  const duration = Number(probe?.durationSec);
  const tags = probe?.tags ?? {};
  const reasons = [];

  // 1. A folder a human already sorted it into.
  if (parts[0] === "music") {
    const folder = parts.length >= 3 ? parts[1] : null;
    const category = folder ? slugify(folder) : /theme/i.test(stem) ? "themes" : "uncategorised";
    const isSting = !!folder && /\bsting\b/i.test(folder);
    reasons.push(folder ? `Sorted by hand into music/${folder}/.` : "Sits at the top of music/, not in a mood folder.");
    if (isSting) reasons.push(`The folder name says it is a sting.`);
    return {
      kind: isSting ? "sting" : "music",
      category,
      title: musicTitle(stem, tags),
      description: tags.comment ?? null,
      tags: tagsFrom({ comment: tags.genre }, folder ? folder.split(/\s+/) : []),
      loop: false,
      confidence: folder ? "high" : "medium",
      reasons
    };
  }
  if (parts[0] === "dialogue") {
    reasons.push(`Sorted by hand into dialogue/${parts.length >= 3 ? parts[1] + "/" : ""}.`);
    return {
      kind: "voice",
      category: parts.length >= 3 ? slugify(parts[1]) : "dialogue",
      title: humaniseStem(stem),
      description: tags.comment ?? null,
      tags: tagsFrom({ comment: tags.comment }),
      loop: false,
      confidence: "high",
      reasons
    };
  }

  // 2-4. Unsorted samples. The library's own embedded description is stronger
  // evidence than the filename and is tried FIRST — one real file is named
  // ATCVoiceClip_S08TA.24 and is actually five minutes of "Ambience, Forest,
  // Birds, Light, Rain, Loop". Only if the description decides nothing does
  // the filename get a vote.
  const describedText = ` ${words(tags.comment)} ${words(tags.title)} ${words(tags.genre)} `;
  const namedText = ` ${words(stem)} `;
  const evidenceText = `${namedText}${describedText}`;
  const longBed = Number.isFinite(duration) && duration >= 20;
  const shortHit = Number.isFinite(duration) && duration < 8;

  const decide = (text, source) => {
    // An explicit "ambience"/"loop"/"drone" outranks everything below it: a
    // 39-second file called "ambience loop battle field explode impact" is a
    // bed of distant explosions, not an impact sting.
    if (EXPLICIT_BED_WORDS.test(text) && longBed) {
      return { kind: "ambience", confidence: "high", reason: `${source} says it is a background or a loop, and it runs ${Math.round(duration)}s.` };
    }
    if (INTERFACE_WORDS.test(text) && !(Number.isFinite(duration) && duration > 45)) {
      return { kind: "interface", confidence: "medium", reason: `${source} describes a console or computer sound.` };
    }
    if (VOICE_WORDS.test(text)) {
      const long = Number.isFinite(duration) && duration > 120;
      return {
        kind: "voice",
        confidence: long ? "low" : "medium",
        reason: `${source} describes radio traffic or a spoken transmission.${long ? ` It runs ${Math.round(duration)}s though, long for one transmission.` : ""}`
      };
    }
    if (STING_WORDS.test(text) && !(Number.isFinite(duration) && duration > 40)) {
      return { kind: "sting", confidence: "medium", reason: `${source} describes a dramatic hit rather than a sound in the world.` };
    }
    if (AMBIENCE_WORDS.test(text) && longBed) {
      return { kind: "ambience", confidence: "high", reason: `${source} describes a place or a background, and it runs ${Math.round(duration)}s.` };
    }
    if (SFX_WORDS.test(text) && Number.isFinite(duration) && duration <= 40) {
      return { kind: "sfx", confidence: "medium", reason: `${source} describes a one-off event.` };
    }
    return null;
  };

  const described = decide(describedText, "Its embedded description");
  const decision =
    described ??
    decide(namedText, "Its filename") ??
    (longBed && Number(duration) >= 45
      ? { kind: "ambience", confidence: "low", reason: `Nothing in the name or description decides it, but ${Math.round(duration)}s is a bed more often than not.` }
      : {
          kind: "sfx",
          confidence: shortHit ? "medium" : "low",
          reason: shortHit ? `Short (${duration.toFixed(1)}s) and not named as music: a one-shot effect.` : "Nothing decisive either way; defaulting to a one-shot effect."
        });

  const kind = decision.kind;
  const confidence = decision.confidence;
  reasons.push(decision.reason);

  // The shelf comes from whichever evidence decided the kind, falling back to
  // everything else. Otherwise the misnamed forest recording above lands on
  // the radio shelf purely because "ATC" is in its filename.
  // Whichever shelf's word appears EARLIEST wins, with the list order as the
  // tie-break. Sound libraries put the subject first and the qualifiers after
  // it — "Ambience, Forest, Birds, Light, Rain" is a forest with rain in it,
  // not a rainstorm, and the word order is what says so.
  const categoryFrom = (text) => {
    let best = null;
    for (const [name, re] of SAMPLE_CATEGORIES) {
      const at = text.search(re);
      if (at >= 0 && (best === null || at < best.at)) best = { name, at };
    }
    return best?.name ?? null;
  };
  let category = (described ? categoryFrom(describedText) : null) ?? categoryFrom(evidenceText) ?? "misc";
  if (kind === "interface") category = "interface";
  if (kind === "voice" && category !== "radio") category = "radio";

  const loop = kind === "ambience";
  if (loop) reasons.push("Ambience loops by default; the processed file gets a seamless crossfaded loop point.");

  const title = tags.title && !/^\d+$/.test(tags.title) ? tags.title.replace(/\s*,\s*/g, ", ") : sampleTitle(stem, tags.comment);
  return {
    kind,
    category,
    title,
    description: tags.comment ?? null,
    tags: tagsFrom({ comment: tags.comment }, [category]),
    loop,
    confidence,
    reasons
  };
}
