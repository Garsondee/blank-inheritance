/**
 * Builds FORM 1-B, the Service Agreement (induction terminal, page 2), from ./source.mjs.
 *
 *   node tools/induction-agreement/build.mjs            write both outputs
 *   node tools/induction-agreement/build.mjs --check    exit 1 if either output is stale
 *
 * Outputs:
 *   module/blank-inheritance/assets/induction/agreement.dat   SHIPPED: the only copy players' clients see,
 *                                                             packed by core/agreement-codec.mjs
 *   data/induction-agreement/agreement-gm.md                  NEVER SHIPPED (not in SYNCED_CAMPAIGN_DIRS):
 *                                                             the full text with a GM-only hook index
 *
 * Deterministic: the same source always produces byte-identical outputs, so a test can prove the shipped
 * asset is current. All randomness comes from one seeded PRNG (META.seed).
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { META, PARTIES, RECITALS, DEFINITIONS, PARTS, HOOKS, OOC_NOTE, SIGNATURE, VOCAB } from "./source.mjs";
import { pack, encodeUtf8 } from "../../module/blank-inheritance/scripts/core/agreement-codec.mjs";
import { wordCount, readingTime } from "../../module/blank-inheritance/scripts/core/agreement-layout.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const ASSET_PATH = path.join(ROOT, "module/blank-inheritance/assets/induction/agreement.dat");
export const GM_PATH = path.join(ROOT, "data/induction-agreement/agreement-gm.md");

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
const letters = (n) => { let s = ""; n += 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(97 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const upper = (n) => letters(n).toUpperCase();

const FILLER = [
  "The Recruit shall {verb} every {item} issued under this Article, {condition}.",
  "The {office} may, {condition}, require the Recruit to {verb} any {item}.",
  "Nothing in this Clause obliges the {office} to {verb} any {item}, {condition}.",
  "Where the Recruit fails to {verb} a {item}, the {office} may treat that {item} as {state}, and Clause {CLAUSE} shall apply as if it had been {state2}.",
  "A {item} that has been {state} for more than {n} Quarters shall be deemed {state2}, {condition}.",
  "For the purposes of this Article, a {item} includes any part of a {item}, any object of which a {item} forms part, and anything described as a {item} on Form {FORM}.",
  "The obligations in this Clause are in addition to, and not in substitution for, the obligations in Clause {CLAUSE} and Schedule {SCHED}.",
  "Requests under this Clause shall be made on Form {FORM}, {condition}.",
  "The {office} shall keep a Record of every {item} {state}, and that Record shall be conclusive, {condition}.",
  "The Recruit acknowledges that the {office} is not responsible for any {item} left {place}.",
  "Any dispute as to whether a {item} is {state} shall be referred to the {office}, whose decision shall be final, {condition}.",
  "The Recruit shall not {verb} a {item} on behalf of another Recruit, {condition}.",
  "Where this Article and Annex {ANNEX} conflict, Annex {ANNEX} shall prevail, save where it does not.",
  "A reference in this Article to the {office} includes a reference to any person standing at the {office}'s hatch.",
  "The Recruit may apply to the {office} for a replacement {item}, which the {office} may grant, refuse or defer, {condition}.",
  "No {item} shall be treated as {state} without the prior written consent of the {office}, {condition}.",
  "The Recruit shall report any {item} found {place} to the {office} {time}.",
  "This Clause shall be read together with Clause {CLAUSE}, Clause {CLAUSE} and, where relevant, Appendix {APPX}.",
  "Nothing in this Agreement requires the Recruit to {verb} more than one {item} at a time, save during an Exercise.",
  "The {office} reserves the right to {verb} any {item} at any time, and to decline to say why.",
  "Where the Recruit is uncertain whether a {item} is Directorate Equipment, the Recruit shall assume that it is.",
  "The Recruit shall, on request, produce a receipt for any {item}, and a receipt for the receipt.",
  "A {item} returned in a better condition than it was issued in shall be accepted without comment.",
  "Time spent queueing at the {office} counts as time on Duty, save where the queue is unauthorised.",
  "The {office} may issue guidance on this Article, and the guidance binds the Recruit whether or not it has been read.",
  "Should the {office} be closed, the Recruit shall wait outside it, {condition}.",
  "The Recruit shall not carry more than one {item} into the {office} at any one time.",
  "The {office} need not explain any decision taken under this Article, but may do so if asked on Form {FORM}.",
  "Any {item} not collected {time} shall pass to the {office}, which may keep it, lose it, or reissue it to the Recruit at the rate in Schedule {SCHED}.",
  "The Recruit's signature on Form {FORM} is evidence that the Recruit has read Form {FORM}, whether or not Form {FORM} was attached.",
  "The {office} may delegate any function under this Article to the {office2}, which may delegate it back.",
  "Where a {item} is found to be {state}, the Recruit shall not express surprise.",
];

const RECITAL_FILLER = [
  "The {office} has, on {n} occasions, drawn the attention of Recruits to Annex {ANNEX}.",
  "It is expedient that every Recruit be issued with a {item}, and that the issue be recorded.",
  "The {office} wishes to record that it is open, save when it is not.",
  "The {office} and the {office2} have agreed which of them is responsible for the {item}, and have recorded that agreement on Form {FORM}.",
  "Certain Recruits have in the past been uncertain as to the status of the {item}, and this Agreement resolves that uncertainty in Schedule {SCHED}.",
];

const PLACES = ["in a corridor", "on a windowsill", "in the Canteen", "near the Tea Urn", "in a Machine", "on the parade ground", "under a bunk", "in a Waiting Room", "outside the hatch", "on the stairs"];
const TIMES = ["within one Quarter", "on the same Day", "before the next muster", "by the end of the Fortnight", "promptly, and in any case before Thursday"];

export function buildDocument() {
  const r = rng(META.seed);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  // One value per slot per clause, so "the Records Office ... which the Records Office may grant" stays
  // the same office. {office2}/{state2} are the deliberate second picks.
  const fill = (tpl) => {
    const memo = {};
    const once = (k, f) => (memo[k] ??= f());
    const office = () => once("office", () => pick(VOCAB.offices));
    return tpl
      .replace(/\{office\}'s/g, () => { const o = office(); return o.endsWith("s") ? `${o}'` : `${o}'s`; })
      .replace(/\{condition\}/g, () => once("condition", () => pick(VOCAB.conditions)))
      .replace(/\{office2\}/g, () => pick(VOCAB.offices.filter((o) => o !== office())))
      .replace(/\{office\}/g, office)
      .replace(/\{item\}/g, () => once("item", () => pick(VOCAB.items)))
      .replace(/\{verb\}/g, () => once("verb", () => pick(VOCAB.verbs)))
      .replace(/\{state2\}/g, () => pick(VOCAB.states.filter((s) => s !== memo.state)))
      .replace(/\{state\}/g, () => once("state", () => pick(VOCAB.states)))
      .replace(/\{place\}/g, () => once("place", () => pick(PLACES)))
      .replace(/\{time\}/g, () => once("time", () => pick(TIMES)))
      .replace(/\{n\}/g, () => once("n", () => String(int(2, 9))))
      .replace(/\{form\}/g, "{FORM}").replace(/\{article\}/g, "{ART}").replace(/\{annex\}/g, "{ANNEX}")
      .replace(/\{schedule\}/g, "{SCHED}").replace(/\{clause\}/g, "{CLAUSE}").replace(/\{appendix\}/g, "{APPX}");
  };

  const blocks = [];
  const hookRefs = {};
  const articleByTitle = {};
  let art = 0;
  const push = (t, text, num) => blocks.push(num == null ? { t, text } : { t, text, num });

  const fillerClauses = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (r() < 0.16) {
        const k = int(3, 6);
        const items = [];
        for (let j = 0; j < k; j++) items.push(fill(pick(["{verb} each {item} {condition}", "keep every {item} {place} only, {condition}", "not {verb} any {item} {time}", "report any {item} that appears to be {state} to the {office}", "ensure that no {item} is {state} {condition}"])));
        out.push({ lead: "The Recruit shall:", items });
      } else out.push(fill(pick(FILLER)));
    }
    return out;
  };

  const emitArticle = (title, clauses) => {
    art += 1;
    articleByTitle[title] = art;
    push("h2", `Article ${art}. ${title}`);
    let c = 0;
    for (const cl of clauses) {
      c += 1;
      const num = `${art}.${c}`;
      if (cl && typeof cl === "object" && cl.hook) {
        const h = HOOKS[cl.hook];
        if (!h) throw new Error(`Unknown hook ${cl.hook}`);
        hookRefs[cl.hook] = num;
        push("clause", h.text, num);
      } else if (cl && typeof cl === "object" && cl.lead) {
        push("clause", cl.lead, num);
        cl.items.forEach((it, i) => push("item", `${it}${i === cl.items.length - 1 ? "." : i === cl.items.length - 2 ? "; and" : ";"}`, `(${letters(i)})`));
      } else push("clause", cl, num);
    }
  };

  // Front matter
  push("title", `${META.formNumber} — ${META.title}`);
  push("subtitle", META.grade);
  push("subtitle", `(${META.subtitle})`);
  push("subtitle", META.issuedBy);
  push("h1", "Parties");
  for (const p of PARTIES) push("p", p);
  push("h1", "Recitals");
  const recitals = [...RECITALS];
  for (let i = 0; i < 34; i++) recitals.push(fill(pick(RECITAL_FILLER)));
  recitals.forEach((t, i) => push("clause", t, `(${upper(i)})`));
  push("p", "NOW IT IS AGREED as follows.");

  // Part I: definitions
  push("h1", `Part ${ROMAN[1]} — Definitions and Interpretation`);
  art += 1;
  articleByTitle["Definitions"] = art;
  push("h2", `Article ${art}. Definitions`);
  const defs = DEFINITIONS.map(([k, v]) => [k, `"${k}" means ${v};`]);
  for (const term of VOCAB.defTerms) defs.push([term, `"${term}" ${fill(pick(VOCAB.defPhrases))};`]);
  defs.sort((a, b) => a[0].localeCompare(b[0]));
  push("clause", "In this Agreement, unless the context otherwise requires, and in some cases even where it does not:", `${art}.1`);
  defs.forEach(([, text], i) => push("item", text, `(${letters(i)})`));
  emitArticle("Interpretation", fillerClauses(9));
  emitArticle("Precedence of Documents", [...fillerClauses(3), "Where any two documents forming part of this Agreement conflict, the later shall prevail, unless the earlier is stamped, in which case the stamp shall prevail.", ...fillerClauses(4)]);

  // Parts II onwards: the authored spine, each authored article padded, with generated articles between.
  let part = 1;
  const genTitle = () => `${pick(VOCAB.articleTitles)}${pick(["", "", " (Continued)", " (Further Provisions)", " (Supplementary)"])}`;
  for (const [partTitle, articles] of PARTS) {
    part += 1;
    push("h1", `Part ${ROMAN[part] ?? part} — ${partTitle}`);
    for (const [title, authored] of articles) {
      // Authored clauses never come first: bury each one between runs of filler.
      const clauses = [...fillerClauses(int(2, 4))];
      for (const cl of authored) clauses.push(cl, ...fillerClauses(int(1, 4)));
      emitArticle(title, clauses);
      for (let g = int(2, 3); g > 0; g--) emitArticle(genTitle(), fillerClauses(int(5, 9)));
    }
  }
  for (const extra of ["Supplementary Provisions", "Standing Orders Incorporated by Reference", "Transitional Provisions", "Miscellaneous (Further)"]) {
    part += 1;
    push("h1", `Part ${ROMAN[part] ?? part} — ${extra}`);
    for (let g = int(7, 10); g > 0; g--) emitArticle(genTitle(), fillerClauses(int(6, 10)));
  }

  // Signature block comes after the appendices; first the schedules.
  const forms = [
    ["1-A", "Candidate Registration"], ["1-B", "Articles of Enrolment and General Consents (this Agreement)"],
    ["1-B(ii)", "Biscuit Redemption (not available)"], ["7-V", "Visitation at Any Hour"], ["9-F", "Confirmation of Forgetting"],
    ["12b", "Medical Consents"], ["40-C", "Amendment to a Quarter"],
  ];
  const formNouns = ["Requisition", "Return", "Receipt", "Notice", "Declaration", "Application", "Waiver", "Renewal", "Transfer", "Surrender", "Report", "Confirmation", "Objection (Withdrawn)", "Amendment", "Duplicate"];
  const formOf = ["Boots", "Socks", "Keys", "a Locker", "a Quarter", "a Fortnight", "a Hatch", "a Stamp", "Leave", "a Queue", "a Kitbag", "the Tea Urn (Exterior)", "Stationery", "a Waiting Room", "Lost Property", "a Designation", "a Duty"];
  while (forms.length < 140) {
    const code = `${int(2, 99)}-${String.fromCharCode(65 + int(0, 25))}`;
    if (forms.some(([c]) => c === code)) continue;
    forms.push([code, `${pick(formNouns)} of ${pick(formOf)}${r() < 0.2 ? " (in Triplicate)" : ""}`]);
  }
  const formCodes = forms.map(([c]) => c);
  forms.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

  const schedRows = {
    forms: forms.map(([c, t]) => [`Form ${c}`, t]),
    sections: [...VOCAB.sections.map((s) => ["", s]), ["", "Other Sections (not listed)"]],
    socks: VOCAB.socks.map((s, i) => [`${i + 1}.`, s]),
    humming: [["First Quarter", "Permitted, quietly"], ["Second Quarter", "Permitted, except during lessons"], ["Third Quarter", "Permitted in corridors only"], ["Fourth Quarter", "Not permitted"], ["Thursdays", "At the discretion of the Canteen Committee"]],
    menu: VOCAB.menu.map(([d, m]) => [d, m.replace("{CANTEEN}", "")]),
    tariff: VOCAB.items.map((it) => [`${int(1, 40)} cr.`, `Each ${it}, lost, damaged or unaccounted for`]),
    precedence: VOCAB.offices.map((o, i) => [`${i + 1}.`, `Persons with business at the ${o}`]),
    salutes: [["Officers of the Directorate", "Salute"], ["Officers of the Kingdom's army or navy", "Return, neutrally"], ["The Quartermaster", "Nod"], ["The Canteen Committee", "Nod, warmly"], ["Persons presenting Form 7-V", "Every reasonable courtesy and the use of a chair"]],
    enthusiasm: [["1.", "\"Understood.\""], ["2.", "\"Very good.\""], ["3.", "\"Quite.\""], ["4.", "\"Understood\" (enthusiastically)"], ["5.", "A short nod"], ["6.", "A slightly longer nod (Founding Day only)"]],
    stationery: ["HB pencil", "eraser", "notebook", "message pad", "sheet of carbon paper", "paperclip", "drawing pin", "ruler"].map((it) => [`${int(1, 4)} per Quarter`, it]),
    issue: VOCAB.items.slice(0, 30).map((it) => ["1", it]),
    notissued: [["—", "A second pillow"], ["—", "A biscuit (see the Article headed \"Biscuit\")"], ["—", "An explanation"], ["—", "A copy of this Agreement to keep"], ["—", "Anything not listed in Schedule 11"]],
  };
  const genSchedTitles = ["Register of Stamps", "Register of Keys", "Register of Duplicate Keys", "Register of Hatches", "Register of Waiting Rooms", "Table of Permitted Corridors", "Table of Queue Lengths", "Table of Approved Nods", "Inventory of the Tea Urn (Exterior)", "Inventory of the Tea Urn (Interior; not inspected)", "Register of Registers", "Table of Muster Points", "Register of Chits", "Table of Coat Hooks", "Register of Umbrellas (Black)", "Table of Lockers by Row", "Register of Seals", "Table of Noticeboards", "Register of Stairs", "Table of Windowsills", "Register of Lost Property (Unclaimed)", "Register of Lost Property (Claimed in Error)", "Table of Bell Times", "Register of Clipboards", "Table of Laundry Days", "Register of Buckets (Fire)", "Register of Buckets (Sand)", "Register of Buckets (Other)"];

  let sched = 0;
  push("h1", "Schedules");
  for (const [title, key] of VOCAB.schedules) {
    sched += 1;
    push("h2", `Schedule ${sched}. ${title}`);
    for (const [a, b] of schedRows[key]) push("row", b, a || "•");
  }
  for (const title of genSchedTitles) {
    sched += 1;
    push("h2", `Schedule ${sched}. ${title}`);
    for (let i = int(18, 30); i > 0; i--) push("row", fill(pick(["{item} — held by the {office}", "{item} — {state}", "{item} — see Clause {CLAUSE}", "{item} — issued {time}", "{item} — {place}"])), `${upper(int(0, 25))}-${int(100, 999)}`);
  }

  // Annexes A–Z. F is queueing (cited above); Q is reserved and blank.
  push("h1", "Annexes");
  const annexTitles = [...VOCAB.annexTitles.filter((t) => !t.includes("Queueing"))];
  let ai = 0;
  for (let a = 0; a < 26; a++) {
    const L = String.fromCharCode(65 + a);
    if (L === "Q") { push("h2", "Annex Q. (Reserved)"); push("p", "[This Annex is reserved. Its terms will be notified to the Recruit in due course and are agreed now.]"); continue; }
    const title = L === "F" ? "Procedure for the Orderly Queueing of Recruits" : `${annexTitles[ai++ % annexTitles.length]}${ai > annexTitles.length ? " (Supplementary)" : ""}`;
    push("h2", `Annex ${L}. ${title}`);
    for (let s = 1, n = int(12, 22); s <= n; s++) push("clause", fill(pick(["The Recruit shall {verb} the {item} {condition}.", "The Recruit shall proceed to the {office} {time}.", "If the {office} is closed, the Recruit shall return to Step 1.", "The Recruit shall wait {place} until called.", "The Recruit shall present Form {FORM} at the hatch.", "The Recruit shall not {verb} the {item}.", "The {office} shall stamp the Form, or decline to.", "Where the Step above cannot be completed, the Recruit shall complete it."])), `Step ${s}.`);
  }

  // Appendices: abbreviations, an index of defined terms, and a table of cross-references.
  push("h1", "Appendices");
  push("h2", "Appendix 1. Abbreviations");
  for (const o of VOCAB.offices) push("row", o, o.split(/[\s']+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join(".") + ".");
  push("h2", "Appendix 2. Index of Defined Terms");
  for (const [k] of defs) push("row", `"${k}" — Article ${articleByTitle.Definitions}; see also Clause {CLAUSE}, Clause {CLAUSE}`, "•");
  push("h2", "Appendix 3. Table of Cross-References");
  for (let i = 0; i < 360; i++) push("row", `see also Clause {CLAUSE}${r() < 0.4 ? ", Schedule {SCHED}" : ""}${r() < 0.2 ? " and Annex {ANNEX}" : ""}`, "Clause {CLAUSE}");

  push("h1", "Execution");
  for (const s of SIGNATURE) push("sig", s);
  push("ooc", `${OOC_NOTE[0]}. ${OOC_NOTE[1]}`);

  // Second pass: resolve references now that the counts are known.
  const annexLetters = [..."ABCDEFGHIJKLMNOPRSTUVWXYZ"];
  const clauseRef = () => `${int(2, art)}.${int(1, 6)}${r() < 0.3 ? `(${letters(int(0, 5))})` : ""}${r() < 0.1 ? `(${["i", "ii", "iii", "iv"][int(0, 3)]})` : ""}`;
  // Within one block, a form, annex, schedule or appendix named twice is the same one; clause
  // references are always fresh ("read together with Clause 4.2 and Clause 91.3").
  const resolve = (s) => {
    const memo = {};
    const once = (k, f) => (memo[k] ??= f());
    return String(s)
      .replace(/\{CLAUSE\}/g, clauseRef).replace(/\{ART\}/g, () => once("art", () => String(int(2, art))))
      .replace(/\{SCHED\}/g, () => once("sched", () => String(int(1, sched))))
      .replace(/\{ANNEX\}/g, () => once("annex", () => pick(annexLetters)))
      .replace(/\{APPX\}/g, () => once("appx", () => String(int(1, 3))))
      .replace(/\{FORM\}/g, () => once("form", () => pick(formCodes)));
  };
  const AN = /\b([Aa]) (?=(?:eraser|ink pad|oil can|identity disc|HB pencil|umbrella)\b)/g;
  for (const b of blocks) {
    b.text = resolve(b.text).replace(AN, "$1n ");
    if (b.num != null) b.num = resolve(b.num);
  }

  return { blocks, hookRefs, articles: art, schedules: sched, words: wordCount(blocks) };
}

export function renderGmCopy(doc) {
  const lines = [
    "# FORM 1-B — GM COPY. NEVER SHOW PLAYERS, NEVER SYNC.",
    "",
    "Generated by `tools/induction-agreement/build.mjs` from `tools/induction-agreement/source.mjs`. Don't edit by hand.",
    "Players see this agreement once, on page 2 of the induction terminal, and can't go on without signing.",
    `It runs to ${doc.words.toLocaleString("en-GB")} words (about ${readingTime(doc.words)} at 200 words a minute), ${doc.articles} Articles and ${doc.schedules} Schedules.`,
    "Status: DRAFTED. Not to be shown to players until Ingram has read and graded it.",
    "",
    "## Hook index (GM-only)",
    "",
    "| Clause | Hook | What it's for |",
    "|---|---|---|",
    ...Object.entries(HOOKS).map(([id, h]) => `| ${doc.hookRefs[id] ?? "(not placed)"} | ${id} | ${h.use.replace(/\|/g, "/")} |`),
    "",
    "## The text",
    "",
  ];
  for (const b of doc.blocks) {
    if (b.t === "title") lines.push(`## ${b.text}`, "");
    else if (b.t === "subtitle") lines.push(`*${b.text}*`, "");
    else if (b.t === "h1") lines.push(`### ${b.text.toUpperCase()}`, "");
    else if (b.t === "h2") lines.push(`**${b.text}**`, "");
    else if (b.t === "ooc") lines.push("---", "", `> ${b.text}`, "");
    else lines.push(`${b.num != null ? `${b.num} ` : ""}${b.text}`, "");
  }
  return lines.join("\n");
}

export function packDocument(doc) {
  const payload = JSON.stringify({ format: "bi-agreement/1", form: META.formNumber, words: doc.words, blocks: doc.blocks });
  return pack(zlib.deflateRawSync(encodeUtf8(payload), { level: 9 }));
}

function main() {
  const check = process.argv.includes("--check");
  const doc = buildDocument();
  const asset = packDocument(doc);
  const gm = renderGmCopy(doc);
  const unplaced = Object.keys(HOOKS).filter((id) => !doc.hookRefs[id]);
  if (unplaced.length) throw new Error(`Hooks never placed in any Article: ${unplaced.join(", ")}`);
  if (check) {
    const stale = [[ASSET_PATH, asset], [GM_PATH, gm]].filter(([p, s]) => !fs.existsSync(p) || fs.readFileSync(p, "utf8") !== s);
    if (stale.length) { console.error("Stale:", stale.map(([p]) => path.relative(ROOT, p)).join(", ")); process.exit(1); }
    console.log("Service Agreement outputs are current.");
    return;
  }
  fs.mkdirSync(path.dirname(ASSET_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(GM_PATH), { recursive: true });
  fs.writeFileSync(ASSET_PATH, asset);
  fs.writeFileSync(GM_PATH, gm);
  console.log(`FORM 1-B: ${doc.words.toLocaleString("en-GB")} words, ${doc.articles} Articles, ${doc.schedules} Schedules, ${doc.blocks.length} blocks; reading time ${readingTime(doc.words)}.`);
  console.log(`Shipped asset ${Math.round(asset.length / 1024)} KB; GM copy ${Math.round(gm.length / 1024)} KB.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
