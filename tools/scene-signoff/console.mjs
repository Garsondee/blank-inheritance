#!/usr/bin/env node
/**
 * The Sign-Off console (design/scene-signoff.md §6).
 *
 *   node tools/scene-signoff/console.mjs              the board
 *   node tools/scene-signoff/console.mjs --scene <id> one scene's full check report
 *   node tools/scene-signoff/console.mjs --blockers   only what is failing, everywhere
 *   node tools/scene-signoff/console.mjs --travel     every scene change as a travel leg
 *   node tools/scene-signoff/console.mjs --line       one line, for a hook
 *   node tools/scene-signoff/console.mjs --json       the board as data
 *
 * Fast on purpose -- it reads the corpus once and runs only the mechanical
 * checks, so it can be run constantly without thinking about it. It reports
 * and never writes; sealing is tools/scene-signoff/seal.mjs.
 */
import { loadCorpus } from "./corpus.mjs";
import { buildBoard, headline } from "./board.mjs";
import { travelSummary } from "./travel.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const BAR = "-".repeat(78);

// Five glyphs, one per pass: Comprehension, coMpleteness, Place, Seam, Quality.
function passGlyphs(row) {
  const mark = (v) => (v === "CLEAR" ? "+" : v === "FIX" ? "~" : v === "BLOCKED" ? "!" : v === "STOP" ? "x" : ".");
  return ["C", "M", "P", "S", "Q"].map((letter, i) => letter + mark(row.passes[["comprehension", "completeness", "place", "seam", "quality"][i]])).join(" ");
}

const radarCell = (row) => `S${row.radar.short} M${row.radar.medium} L${row.radar.long.length}`;

function statusCell(row) {
  if (row.live && row.stale) return "LIVE(stale)";
  if (row.live) return "LIVE";
  if (row.stopped) return "stopped";
  if (row.blocked) return "blocked";
  if (row.inReview) return "in review";
  return "drafted";
}

function printBoard(board) {
  console.log(`\nSIGN-OFF BOARD${" ".repeat(34)}checklist v${board.checklistVersion} - ${board.checklistDate}`);
  console.log(BAR);
  for (const ep of board.episodes) {
    console.log(`\n${ep.title}  (${ep.id})${" ".repeat(Math.max(1, 44 - ep.title.length - ep.id.length))}${ep.live}/${ep.total} live`);
    for (const row of ep.rows) {
      const flags = [];
      if (row.checks.requiredFail) flags.push(`${row.checks.requiredFail} required failing`);
      if (!row.sited) flags.push("NO LOCATION");
      if ([row.radar.short, row.radar.medium, row.radar.long.length].filter(Boolean).length <= 1) flags.push("one horizon");
      if (row.checks.broken) flags.push(`${row.checks.broken} broken evaluator`);
      if (row.stale) flags.push(`stale: ${row.staleAgainst.join(",")}`);
      console.log(
        `  ${String(row.order).padStart(2)}. ${row.sceneId.padEnd(24)} ${statusCell(row).padEnd(11)} ` +
        `${passGlyphs(row)}  ${radarCell(row).padEnd(10)} ${flags.join(" | ")}`
      );
    }
  }
  const t = board.totals;
  console.log(`\n${BAR}`);
  console.log(`${t.scenes} scenes: ${t.live} live, ${t.inReview} in review, ${t.drafted} drafted` +
    (t.stopped ? `, ${t.stopped} stopped` : ""));
  console.log(`Place:    ${t.sited}/${t.scenes} sited on the map${t.unsited ? `, ${t.unsited} with no location` : ""}`);
  console.log(`Checks:   ${t.requiredFailures} required failing across the corpus` +
    (t.brokenEvaluators ? `, ${t.brokenEvaluators} BROKEN EVALUATOR(S)` : "") +
    (t.stale ? `, ${t.stale} sealed scene(s) stale against v${board.checklistVersion}` : ""));
  console.log(`Travel:   ${t.travelFiring}/${t.travelLegs} scene changes cut to the world map` + (t.travelBroken ? `, ${t.travelBroken} SILENT HARD CUT(S)` : ""));
  console.log(`Horizons: ${t.horizonShort} short, ${t.horizonMedium} medium, ${t.horizonLong} long across the corpus` +
    (t.oneHorizonOnly ? `; ${t.oneHorizonOnly} scene(s) at one horizon only` : ""));
  if (t.missingBriefs) console.log(`Briefs:   ${t.missingBriefs} scene(s) with no brief file`);
  if (board.next) console.log(`\nNext up:  ${board.next.briefRef ?? board.next.key}  (${board.next.title})`);
  console.log("");
}

function printScene(board, needle) {
  const row = board.rows.find((r) => r.briefRef === needle || r.key === needle || r.sceneId === needle);
  if (!row) {
    console.error(`no scene matching "${needle}". Known: ${board.rows.map((r) => r.briefRef ?? r.sceneId).join(", ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n${row.title}  (${row.briefRef ?? row.sceneId})`);
  console.log(`${row.episodeTitle} - scene ${row.order} of ${board.rows.length} in play order`);
  console.log(`status: ${statusCell(row)}   passes: ${passGlyphs(row)}` +
    (row.sealedVersion ? `   sealed against v${row.sealedVersion} by ${row.sealedBy} on ${row.sealedAt}` : ""));
  console.log(`radar:  S:${row.radar.short} short  M:${row.radar.medium} medium  L:${row.radar.long.length} long` + (row.radar.long.length ? ` (${row.radar.long.join(", ")})` : ""));
  console.log(`place:  ${row.sited ? `${row.locationName} (${row.locationRef})` : "NO LOCATION -- not finished until it has one"}`);
  console.log(BAR);

  for (const pass of ["completeness", "place", "seam", "quality", "comprehension"]) {
    const results = row.results.filter((r) => r.pass === pass);
    if (!results.length) continue;
    console.log(`\n${pass.toUpperCase()}`);
    for (const r of results) {
      const glyph = { pass: "  ok ", fail: " FAIL", waived: " wvd ", exempt: " exmp", "n/a": " n/a ", broken: "BROKE" }[r.state] ?? "  ?  ";
      console.log(`  ${glyph} ${r.id.padEnd(4)} ${r.severity === "required" ? "[req]" : "[rec]"} ${r.question}`);
      if (r.detail) console.log(`             ${r.detail}`);
    }
  }
  console.log(`\n${BAR}`);
  console.log(`${row.checks.requiredFail} required failing, ${row.checks.recommendedFail} recommended open, ${row.checks.recommendedExempt} exempt by notes.`);
  console.log("Checks with no evaluator are read by hand in the pass output -- a clean report here is not evidence the scene is good.\n");
}

function printBlockers(board) {
  console.log("");
  let any = false;
  for (const row of board.rows) {
    const bad = row.results.filter((r) => r.state === "fail" && r.severity === "required");
    const broken = row.results.filter((r) => r.state === "broken");
    if (!bad.length && !broken.length) continue;
    any = true;
    console.log(`${row.sceneId} (${row.episodeId})`);
    for (const r of [...bad, ...broken]) console.log(`   ${r.id}  ${r.question}\n       ${r.detail}`);
  }
  if (!any) console.log("No required check is failing anywhere in the corpus.");
  console.log("");
}

const corpus = loadCorpus();

/**
 * Every scene change as a travel leg. `map` means the Scene Runner's automatic
 * cut to the world map fires; `NONE` means needsTravel() returns false and the
 * table is simply somewhere else next beat, with no error raised anywhere.
 */
function printTravel(corpus) {
  const t = travelSummary(corpus);
  console.log("\nTRAVEL LEGS — one per scene change; the runner cuts to the world map when a leg fires");
  console.log(BAR);
  for (const l of t.legs) {
    const mark = l.cutFires ? " map " : l.legitimate ? "  ·  " : " NONE";
    const dist = l.metres === null ? "" : `${l.metres} m`;
    console.log(
      `  ${String(l.order).padStart(2)}.${mark} ${l.fromScene.padEnd(22)} -> ${l.toScene.padEnd(22)} ` +
      `${dist.padStart(8)}  ${l.reason ?? ""}`
    );
  }
  console.log(`\n${BAR}`);
  console.log(`${t.total} scene changes: ${t.firing} cut to the map, ${t.sameLocation} stay in one place, ${t.offMap} off-map by design.`);
  console.log(`${t.broken} SILENT HARD CUT(S) — needsTravel() returns false, so the map is skipped with no error anywhere.`);
  console.log(`Positions declared on both edges: ${t.declared}/${t.total} legs.`);
  if (t.longest) console.log(`Longest leg: ${t.longest.fromScene} -> ${t.longest.toScene}, ${t.longest.metres} m.`);
  console.log("");
}

const board = buildBoard(corpus);

if (flag("--json")) console.log(JSON.stringify(board, null, 2));
else if (flag("--line")) console.log(headline(board));
else if (flag("--blockers")) printBlockers(board);
else if (flag("--travel")) printTravel(corpus);
else if (value("--scene")) printScene(board, value("--scene"));
else printBoard(board);
