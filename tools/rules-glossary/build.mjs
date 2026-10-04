#!/usr/bin/env node
/**
 * Builds the rules glossary the Scene Runner's "Rules in this scene" reads (core/scene-rules.mjs, 2026-10-04): every
 * condition and every general action the shipped sf2e system has, each with the compendium UUID that opens the system's
 * own rule card, and a handful of rules that live only in the SRD (flanking, cover, afflictions, difficult terrain...),
 * each with its article in the shipped rules index.
 *
 * Ingram, 2026-10-04, on the Runner's free search box: "The rules search box isn't very useful either." A box asks the GM to
 * think of the word first; the glossary lets the Runner find the rules a scene's own words already name, and the free
 * search moved to the Palette ("rule <words>").
 *
 * Sources, both already in the repo and neither changed here:
 *   - gamesystems/sf2e/packs/{conditions,actions} (the shipped system, read without opening the LevelDB: tools/pack-extractor)
 *   - module/blank-inheritance/data/srd-index.json (tools/rules-search/build-index.mjs)
 *
 * Usage: node tools/rules-glossary/build.mjs [--check]
 *   --check: write nothing; exit 1 if the glossary in the module is not what this would write.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPackDocuments } from "../pack-extractor/read-pack.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
export const PACKS = path.join(repoRoot, "gamesystems", "sf2e", "packs");
export const SRD_INDEX = path.join(repoRoot, "module", "blank-inheritance", "data", "srd-index.json");
export const OUTPUT = path.join(repoRoot, "module", "blank-inheritance", "data", "rules-glossary.json");

/**
 * Conditions whose names are hardly ever ordinary English, so a scene's words name them in any case. Every other condition
 * ("grabbed", "stunned", "hidden", "the attitudes") is only taken when it is written as the rule (capitalised in the middle
 * of a sentence) or with a value ("drained 1").
 */
export const LOOSE_CONDITIONS = new Set(["blinded", "dazzled", "deafened", "encumbered", "enfeebled", "fatigued", "frightened", "immobilized", "off-guard", "paralyzed", "persistent-damage", "prone", "sickened", "stupefied", "unconscious"]);

/** A loose condition that one following word turns back into ordinary English ("prone to gossip"). */
export const NOT_FOLLOWED_BY = { prone: "to" };

/** The action folders a GM reaches for in any scene; the rest are an ancestry's, a class's, a spell's or a vehicle's own. */
export const ACTION_FOLDERS = new Set(["Basic", "Skill", "Exploration", "Downtime"]);

/**
 * The rules that live only in the SRD: which article, under what name, and the words in a scene that name it. `lead` picks
 * the paragraph the summary is taken from, where the article's first mention of the rule is not where it says what it is.
 */
export const SRD_RULES = [
  { id: "flanking", name: "Flanking", title: "Flanking", patterns: ["\\bflank(?:ed|ing|s)?\\b"] },
  { id: "cover", name: "Cover", title: "Cover", patterns: ["\\b(?:lesser|standard|greater) cover\\b"] },
  { id: "afflictions", name: "Afflictions", title: "Afflictions", book: "Player Core", patterns: ["\\bafflictions?\\b", "\\bvenom(?:ous)?\\b", "\\bpoison(?:ed|ous|s)?\\b", "\\bdiseases?\\b"] },
  { id: "difficult-terrain", name: "Difficult terrain", title: "Environment", lead: "^Difficult terrain is", patterns: ["\\b(?:greater )?difficult terrain\\b"] },
  { id: "hero-points", name: "Hero Points", title: "Hero Points", patterns: ["\\bhero points?\\b"] },
  { id: "initiative", name: "Initiative", title: "Encounter Mode", lead: "^When the GM calls for it", patterns: ["\\binitiative\\b"] },
  { id: "recovery-checks", name: "Recovery checks", title: "Hit Points, Healing, and Dying", patterns: ["\\brecovery checks?\\b"] },
  { id: "light-and-darkness", name: "Light and darkness", title: "Perception and Detection", patterns: ["\\bdim light\\b", "\\bpoor light\\b", "\\bdarkness\\b", "\\bdarkvision\\b", "\\blow-light vision\\b"] },
  { id: "hazards", name: "Hazards", title: "Hazards", patterns: ["\\bhazards?\\b"] },
  { id: "victory-points", name: "Victory Points", title: "Victory Points", lead: "^Victory Points \\(or VP\\)", patterns: ["\\bvictory points?\\b"], subsystems: ["victory-points"] },
  { id: "influence", name: "Influence", title: "Influence", patterns: [], subsystems: ["influence"] },
  { id: "research", name: "Research", title: "Research", patterns: [], subsystems: ["research"] },
  { id: "chases", name: "Chases", title: "Chases", patterns: [], subsystems: ["chase", "chases"] },
  { id: "infiltration", name: "Infiltration", title: "Infiltration", patterns: [], subsystems: ["infiltration"] },
  { id: "hacking", name: "Hacking", title: "Hacking", patterns: [], subsystems: ["hacking"] }
];

const BOOKS = ["Player Core", "GM Core", "Galaxy Guide", "Alien Core"];

/** The first sentence of a rule's description, as plain text: what the chip's tooltip says. */
export function summaryOf(html, most = 220) {
  const text = String(html ?? "")
    .replace(/@\w+\[[^\]]*\]\{([^}]*)\}/g, "$1")              // @UUID[...]{Off-Guard} -> Off-Guard
    .replace(/@\w+\[([^\]]*)\]/g, (_, inner) => inner.split(/[|.]/).pop())
    .replace(/\[\[[^\]]*\]\]\{([^}]*)\}/g, "$1")              // [[/act demoralize]]{Intimidation} -> Intimidation
    .replace(/\[\[[^\]]*\]\]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  const first = text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;
  return first.length > most ? `${first.slice(0, most - 1).trimEnd()}…` : first;
}

/**
 * The SRD article's own words about the rule: the first paragraph that names it (an article such as Movement covers a great
 * deal besides difficult terrain), else its first paragraph; never the mirror's retrieval note or a source line.
 */
function articleSummary(article, patterns = [], lead = null, most = 220) {
  const paras = String(article?.text ?? "").split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 40 && !/^RETRIEVAL NOTE:/i.test(p) && !/^Source /.test(p));
  const named = (lead ? paras.find((p) => new RegExp(lead).test(p)) : null) ?? paras.find((p) => patterns.some((re) => new RegExp(re, "i").test(p)));
  return summaryOf((named ?? paras[0] ?? "").replace(/</g, "&lt;"), most);
}

/** Every document of a pack's own collection ("items", "actors"), and its folders by id. */
function packItems(pack) {
  const { documents } = readPackDocuments(path.join(PACKS, pack));
  const folders = new Map(documents.filter((d) => d.collection === "folders").map((d) => [d.doc._id, d.doc]));
  const items = documents.filter((d) => d.collection === "items").map((d) => d.doc);
  return { items, folders };
}

/** The glossary, built from the shipped packs and the rules index. */
export function buildGlossary({ srdIndex = JSON.parse(readFileSync(SRD_INDEX, "utf8")) } = {}) {
  const system = JSON.parse(readFileSync(path.join(PACKS, "..", "system.json"), "utf8"));
  const entries = [];

  const conditions = packItems("conditions").items.sort((a, b) => a.name.localeCompare(b.name));
  for (const c of conditions) {
    const slug = c.system?.slug ?? c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    entries.push({
      id: `condition:${slug}`, kind: "condition", name: c.name,
      match: LOOSE_CONDITIONS.has(slug) ? "loose" : "strict", valued: true,
      ...(NOT_FOLLOWED_BY[slug] ? { notFollowedBy: NOT_FOLLOWED_BY[slug] } : {}),
      uuid: `Compendium.sf2e.conditions.Item.${c._id}`,
      summary: summaryOf(c.system?.description?.value)
    });
  }

  const { items: actions, folders } = packItems("actions");
  const topFolder = (id) => { let f = folders.get(id); while (f?.folder && folders.get(f.folder)) f = folders.get(f.folder); return f?.name ?? null; };
  for (const a of actions.filter((x) => ACTION_FOLDERS.has(topFolder(x.folder))).sort((x, y) => x.name.localeCompare(y.name))) {
    const slug = a.system?.slug ?? a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (entries.some((e) => e.id === `action:${slug}`)) continue;
    entries.push({ id: `action:${slug}`, kind: "action", name: a.name, match: "strict", uuid: `Compendium.sf2e.actions.Item.${a._id}`, summary: summaryOf(a.system?.description?.value) });
  }

  for (const r of SRD_RULES) {
    const candidates = srdIndex.filter((x) => x.title === r.title).sort((x, y) => (r.book && x.book === r.book ? -1 : 0) - (r.book && y.book === r.book ? -1 : 0) || BOOKS.indexOf(x.book) - BOOKS.indexOf(y.book));
    const article = candidates[0];
    if (!article) throw new Error(`The rules index has no article "${r.title}" for ${r.id}`);
    const entry = { id: `rule:${r.id}`, kind: "rule", name: r.name, match: "pattern", patterns: r.patterns, srd: article.id, citation: article.pageCitation ?? null, summary: articleSummary(article, r.patterns, r.lead ?? null) };
    if (r.lead) entry.lead = r.lead;
    if (r.subsystems) entry.subsystems = r.subsystems;
    entries.push(entry);
  }

  return {
    $comment: "GENERATED by tools/rules-glossary/build.mjs from the shipped sf2e packs (conditions, actions) and data/srd-index.json; never edit by hand. Read by the Scene Runner's \"Rules in this scene\" (core/scene-rules.mjs) and the Palette's rules.",
    system: { id: system.id, version: system.version },
    entries
  };
}

const text = (glossary) => `${JSON.stringify(glossary, null, 2)}\n`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = text(buildGlossary());
  if (process.argv.includes("--check")) {
    const now = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8") : "";
    if (now !== out) { console.error("rules-glossary.json is not what the packs and the rules index make: run node tools/rules-glossary/build.mjs"); process.exit(1); }
    console.log("rules-glossary.json is up to date");
  } else {
    writeFileSync(OUTPUT, out);
    const g = JSON.parse(out);
    const by = (k) => g.entries.filter((e) => e.kind === k).length;
    console.log(`wrote ${path.relative(repoRoot, OUTPUT)}: ${by("condition")} conditions, ${by("action")} actions, ${by("rule")} SRD rules (sf2e ${g.system.version})`);
  }
}
