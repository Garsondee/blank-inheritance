#!/usr/bin/env node
/**
 * Writes the Sign-Off record, and eventually the seal (design/scene-signoff.md §3).
 *
 *   node tools/scene-signoff/seal.mjs pass <scene> <pass> <verdict> [--note "..."] [--rounds N]
 *   node tools/scene-signoff/seal.mjs waive <scene> <checkId> --why "..."
 *   node tools/scene-signoff/seal.mjs na    <scene> <checkId> --why "..."
 *   node tools/scene-signoff/seal.mjs seal <scene> --by Ingram [--session <id>]
 *   node tools/scene-signoff/seal.mjs show <scene>
 *
 * This is the I/O half; every decision lives in core/promote.mjs's seal(),
 * which is pure and tested. The split matters here more than usual, because
 * this file is the ONE path in the repo allowed to write authoring.status
 * "live" -- see data/schema/common/authoring.schema.json's owner declaration
 * and test/tier1-writer-audit.test.mjs, which fails if a second writer appears.
 *
 * Why a CLI and not a silent library call: a seal should be a deliberate,
 * visible act with a record of who granted it. Ingram grants it in the
 * conversation; this records that she did. It cannot manufacture a grant,
 * because seal() refuses any scene whose four passes are not all CLEAR, and
 * the passes are written one at a time as the conversation happens.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { seal as sealEntity, SIGNOFF_PASSES } from "../../module/blank-inheritance/scripts/core/promote.mjs";
import { loadCorpus, findScene } from "./corpus.mjs";

const VERDICTS = ["CLEAR", "FIX", "STOP", "BLOCKED"];
const args = process.argv.slice(2);
const [command, needle, ...rest] = args;

const opt = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : null;
};

function die(message) {
  console.error(`sign-off: ${message}`);
  process.exit(1);
}

const corpus = loadCorpus();
if (!command) die("usage: pass | waive | na | seal | show");
if (!needle) die("which scene?");

const bundle = findScene(corpus, needle);
if (!bundle) die(`no scene matching "${needle}"`);

const episodeFile = bundle.episode.__file;

/** Read-modify-write the episode file, touching only this scene's authoring block. */
function updateScene(mutate) {
  const raw = readFileSync(episodeFile, "utf8");
  const doc = JSON.parse(raw);
  const scene = (doc.scenes ?? []).find((s) => s.id === bundle.scene.id);
  if (!scene) die(`scene "${bundle.scene.id}" vanished from ${episodeFile}`);
  scene.authoring = mutate(scene.authoring ?? { status: "drafted" }) ?? scene.authoring;
  // 2-space indent and a trailing newline: the house format for every data file.
  writeFileSync(episodeFile, `${JSON.stringify(doc, null, 2)}\n`);
  return scene.authoring;
}

const emptyReview = () => ({ checklistVersion: corpus.checklist.version, passes: {}, waived: [], notApplicable: [], sessionRef: null });

if (command === "pass") {
  const [passName, verdict] = rest;
  if (!SIGNOFF_PASSES.includes(passName)) die(`pass must be one of ${SIGNOFF_PASSES.join(", ")}`);
  if (!VERDICTS.includes(verdict)) die(`verdict must be one of ${VERDICTS.join(", ")}`);
  if (verdict === "BLOCKED" && passName !== "place") die("BLOCKED is a Place verdict only -- every other pass is CLEAR, FIX or STOP");

  const rounds = Number(opt("--rounds") ?? 1);
  const next = updateScene((authoring) => {
    const review = authoring.review ?? emptyReview();
    if (review.checklistVersion !== corpus.checklist.version) {
      // A review that spans a checklist bump adopts the newer version, since
      // the later passes were run against it. Announced, not silent.
      console.log(`note: review was against v${review.checklistVersion}, now v${corpus.checklist.version} -- adopting the newer one`);
      review.checklistVersion = corpus.checklist.version;
    }
    review.passes = {
      ...review.passes,
      [passName]: { verdict, date: new Date().toISOString().slice(0, 10), rounds, note: opt("--note") }
    };
    return { ...authoring, review };
  });
  const clear = SIGNOFF_PASSES.filter((p) => next.review.passes[p]?.verdict === "CLEAR");
  console.log(`${bundle.scene.id}: ${passName} = ${verdict} (round ${rounds}). ${clear.length}/${SIGNOFF_PASSES.length} passes clear.`);
  if (clear.length === SIGNOFF_PASSES.length) console.log(`Ready to seal: node tools/scene-signoff/seal.mjs seal ${needle} --by Ingram`);
  process.exit(0);
}

if (command === "waive") {
  const [checkId] = rest;
  const why = opt("--why");
  if (!checkId) die("which check?");
  if (!why) die("a waiver needs --why: the reason is worth more to the next reader than a silent exemption");
  if (!corpus.checklist.checks.some((c) => c.id === checkId)) die(`no check "${checkId}" in checklist v${corpus.checklist.version}`);

  updateScene((authoring) => {
    const review = authoring.review ?? emptyReview();
    review.waived = [...(review.waived ?? []).filter((w) => w.check !== checkId), { check: checkId, why }];
    return { ...authoring, review };
  });
  console.log(`${bundle.scene.id}: ${checkId} waived -- ${why}`);
  process.exit(0);
}

if (command === "na") {
  // Not the same thing as a waiver: a waiver says "this applies and I am
  // declining it", n/a says "this cannot apply here". Only the first is a
  // decision worth seeing on a board. Most structural cases are decided once
  // for the whole corpus by a check's own appliesWhenAuto; this is for the rest.
  const [checkId] = rest;
  const why = opt("--why");
  if (!checkId) die("which check?");
  if (!why) die("marking a check not-applicable needs --why: a silent skip is indistinguishable from forgetting it");
  if (!corpus.checklist.checks.some((c) => c.id === checkId)) {
    die(`no check "${checkId}" in checklist v${corpus.checklist.version}`);
  }

  updateScene((authoring) => {
    const review = authoring.review ?? emptyReview();
    review.notApplicable = [...(review.notApplicable ?? []).filter((n) => n.check !== checkId), { check: checkId, why }];
    return { ...authoring, review };
  });
  console.log(`${bundle.scene.id}: ${checkId} marked not applicable -- ${why}`);
  process.exit(0);
}

if (command === "seal") {
  const by = opt("--by");
  if (!by) die("--by is required: whose seal this is, named rather than assumed");
  const review = bundle.scene.authoring?.review;
  if (!review) die("no review record -- run the four passes first. A seal on no record is the thing this refuses to do.");

  let sealed;
  try {
    sealed = sealEntity(bundle.scene, { sealedBy: by, review, sessionRef: opt("--session") });
  } catch (err) {
    die(err.message);
  }
  updateScene(() => sealed.authoring);
  console.log(`${bundle.scene.id} is LIVE -- sealed by ${by} on ${sealed.authoring.gradedAt}, against checklist v${review.checklistVersion}.`);
  process.exit(0);
}

if (command === "show") {
  const a = bundle.scene.authoring ?? {};
  console.log(`${bundle.scene.title ?? bundle.scene.id}  [${a.status ?? "(none)"}]`);
  if (!a.review) { console.log("no review record yet"); process.exit(0); }
  console.log(`checklist v${a.review.checklistVersion}`);
  for (const p of SIGNOFF_PASSES) {
    const r = a.review.passes?.[p];
    console.log(`  ${p.padEnd(14)} ${r ? `${r.verdict} (${r.date}, round ${r.rounds ?? 1})${r.note ? ` -- ${r.note}` : ""}` : "not run"}`);
  }
  for (const w of a.review.waived ?? []) console.log(`  waived ${w.check}: ${w.why}`);
  for (const n of a.review.notApplicable ?? []) console.log(`  n/a    ${n.check}: ${n.why}`);
  process.exit(0);
}

die(`unknown command "${command}"`);
