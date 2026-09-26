// Tier 3 — the travel camera's own contract with Foundry.
//
// foundry/travel-camera.mjs touches Hooks/canvas/Document#isOwner, none of
// which test/support/mock-foundry.mjs models (same situation as
// tier3-travel-contract.test.mjs and tier3-scene-build-contract.test.mjs —
// this reads the real source rather than mounting a mock). The pure framing
// math itself is unit-tested for real in tier1-camera-fit.test.mjs and
// tier1-travel-camera-path.test.mjs; this file pins the wiring: which event
// drives the camera, who it follows, and that the marker's own visibility
// fix and the demo's establishing shot are both actually wired to the real
// functions, not left as dead code.
//
// REWRITTEN 2026-09-23 alongside the camera itself: Ingram's live report
// that a fixed crossing still read as "about 10 small sharp jerky camera
// moves" traced to the OLD design re-fitting the camera independently on
// every single updateToken event. The new design announces one whole
// journey on the hub Scene (foundry/travel.mjs's own announceJourney) and
// drives ONE requestAnimationFrame loop off it per foundry/travel-camera.mjs
// — these tests pin THAT wiring instead of the retired per-hop one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance", "scripts");
const cam = readFileSync(path.join(moduleRoot, "foundry", "travel-camera.mjs"), "utf8");
const travel = readFileSync(path.join(moduleRoot, "foundry", "travel.mjs"), "utf8");
const demoRunner = readFileSync(path.join(moduleRoot, "foundry", "demo-runner.mjs"), "utf8");
const entry = readFileSync(path.join(moduleRoot, "blank-inheritance.mjs"), "utf8");

test("the camera follows updateScene, not a bespoke socket broadcast or the old per-hop updateToken reaction — one real-time channel, not two that can drift", () => {
  assert.match(cam, /Hooks\.on\("updateScene",/);
  assert.doesNotMatch(cam, /game\.socket\.emit/, "a parallel socket broadcast has crept back in alongside the updateScene hook");
  assert.doesNotMatch(cam, /Hooks\.on\("updateToken",/, "the old per-hop reactive camera has crept back in alongside the new journey-curve one");
});

test("the hook only reacts to an actual journey announcement, RE-READS the canonical flag value via getFlag rather than trusting the diff payload, and hands the whole journey to the animation", () => {
  // Found live 2026-09-23: a real crash on every single crossing
  // ("Cannot read properties of undefined (reading 'length')") because
  // Foundry's own updateScene `changes` diff does not reliably carry the
  // FULL nested flag value -- sometimes an object with `startedAt` but no
  // `legs` at all. `changes` may only ever be used to detect that the path
  // was touched; getFlag is the only safe source of the real value.
  const fn = cam.match(/Hooks\.on\("updateScene",\s*\(sceneDoc, changes\)\s*=>\s*\{[\s\S]*?\n\s*\}\);/);
  assert.ok(fn, "could not find the registered updateScene callback");
  assert.match(fn[0], /if\s*\(changes\.flags\?\.\[MODULE_ID\]\?\.\[JOURNEY_FLAG\]\s*===\s*undefined\)\s*return;/, "no longer uses changes only to detect that the journey flag path was touched");
  assert.match(fn[0], /const journey = sceneDoc\.getFlag\(MODULE_ID, JOURNEY_FLAG\);/, "no longer re-reads the real, complete journey via getFlag instead of trusting the diff payload");
  assert.match(fn[0], /if\s*\(!journey\?\.legs\)\s*return;/, "no longer guards against a journey read back with no legs");
  assert.match(fn[0], /runJourneyAnimation\(sceneDoc, journey\);/, "no longer hands the re-read journey to the animation loop");
});

test("announceJourney writes one flag on the hub Scene itself, stamping when the journey started and every leg's own start/end/duration — every client computes the same curve off this one replicated write", () => {
  const fn = cam.match(/export async function announceJourney\([\s\S]*?\n\}/);
  assert.ok(fn, "announceJourney is missing");
  assert.match(fn[0], /await scene\.setFlag\(MODULE_ID, JOURNEY_FLAG, \{ startedAt: Date\.now\(\), legs \}\);/);
});

test("runJourneyAnimation drives ONE ticking loop per journey, computing progress from elapsed wall-clock time against the announced start, not from any per-hop event", () => {
  const fn = cam.match(/function runJourneyAnimation\([\s\S]*?\n\}/);
  assert.ok(fn, "runJourneyAnimation is missing");
  assert.match(fn[0], /stopJourneyAnimation\(scene\.id\);/, "no longer cancels a previous journey's own loop before starting a new one -- two would fight over the same camera");
  assert.match(fn[0], /buildCameraKeyframes\(/, "no longer builds the smooth curve's own keyframes from core/travel-camera-path.mjs");
  assert.match(fn[0], /\(Date\.now\(\) - journey\.startedAt\) \/ durationMs/, "no longer computes progress from real elapsed time against the announced start");
  assert.match(fn[0], /canvas\.pan\(cameraAtProgress\(keyframes, t\)\)/, "no longer drives the canvas directly off the pure curve every frame");
});

test("the ticking loop is plain setTimeout, never requestAnimationFrame — found live 2026-09-23: rAF fully suspends in a backgrounded tab and never fires again until refocused, which would freeze a player's camera the moment they alt-tab away mid-crossing; setTimeout is only throttled there, never stopped", () => {
  const fn = cam.match(/function runJourneyAnimation\([\s\S]*?\n\}/);
  assert.ok(fn, "runJourneyAnimation is missing");
  assert.match(fn[0], /setTimeout\(tick, TICK_MS\);/, "no longer reschedules its own tick via plain setTimeout");
  assert.doesNotMatch(fn[0], /requestAnimationFrame/, "requestAnimationFrame has crept back in -- it would silently freeze on any backgrounded tab");
});

test("relevantLegs gives a GM every leg in the journey, and a player only the legs whose own token they own — falling back to all of them if they own none yet", () => {
  const fn = cam.match(/function relevantLegs\([\s\S]*?\n\}/);
  assert.ok(fn, "relevantLegs is missing");
  assert.match(fn[0], /if\s*\(game\.user\?\.isGM\)\s*return legs;/, "a GM no longer sees every leg in the journey");
  assert.match(fn[0], /const owned = legs\.filter\(\(leg\) => scene\.tokens\.get\(leg\.tokenId\)\?\.isOwner\);/, "no longer filters by real Foundry Document#isOwner -- this is what makes a split party's view split too");
  assert.match(fn[0], /return owned\.length > 0 \? owned : legs;/, "an owner-less viewer (true of everyone today, since no real PC exists yet) no longer falls back to every leg");
});

test("isTravelling recognises both the generic travel-marker AND the six demo candidates — foundry/travel-trail.mjs's own trail-drawing hook still depends on this exact function", () => {
  const fn = cam.match(/export function isTravelling\([\s\S]*?\n\}/);
  assert.ok(fn, "isTravelling is missing");
  assert.match(fn[0], /getFlag\(MODULE_ID, "kind"\)\s*===\s*"travel-marker"/);
  assert.match(fn[0], /getFlag\(MODULE_ID, "demoParty"\)\s*===\s*true/, "no longer recognises the six demo candidates");
});

test("frameCameraOn refuses to pan a scene that isn't the one actually on screen, and never throws when canvas isn't ready", () => {
  const fn = cam.match(/export function frameCameraOn\([\s\S]*?\n\}/);
  assert.ok(fn, "frameCameraOn is missing");
  assert.match(fn[0], /if\s*\(!canvas\?\.ready \|\| canvas\.scene\?\.id !== scene\.id\)\s*return;/);
});

test("registerTravelCameraHook is called during init, on every client — not gated to the GM the way most panels are", () => {
  assert.match(entry, /import\s*\{\s*registerTravelCameraHook\s*\}\s*from\s*"\.\/foundry\/travel-camera\.mjs"/);
  assert.match(entry, /registerTravelCameraHook\(\);/);
});

test("animateOnHub and convergeTokensOnHub both resolve every leg's real token and announce the whole journey BEFORE a single hop plays", () => {
  const onHub = travel.match(/async function animateOnHub\([\s\S]*?\n\}/);
  assert.ok(onHub, "animateOnHub is missing");
  assert.match(onHub[0], /await announceJourney\(/, "animateOnHub no longer announces the journey to foundry/travel-camera.mjs");
  const announceIdx = onHub[0].indexOf("await announceJourney(");
  const animateIdx = onHub[0].indexOf("await Promise.all(withTokens.map((leg) => animateTokenAlongHops");
  assert.ok(announceIdx > 0 && animateIdx > announceIdx, "animateOnHub must announce the journey BEFORE it starts animating any hop");

  const converge = travel.match(/export async function convergeTokensOnHub\([\s\S]*?\n\}/);
  assert.ok(converge, "convergeTokensOnHub is missing");
  assert.match(converge[0], /await announceJourney\(/, "convergeTokensOnHub no longer announces the journey to foundry/travel-camera.mjs");
  const cAnnounceIdx = converge[0].indexOf("await announceJourney(");
  const cAnimateIdx = converge[0].indexOf("await Promise.all(planned.map((p) => animateTokenAlongHops");
  assert.ok(cAnnounceIdx > 0 && cAnimateIdx > cAnnounceIdx, "convergeTokensOnHub must announce the journey BEFORE it starts animating any hop");
});

test("the travel marker uses a real portrait AND carries a Dynamic Token Ring, on both the create path and the get-existing path", () => {
  assert.match(travel, /const PARTY_PORTRAIT = "modules\/blank-inheritance\/assets\/tokens\/demo-party\/party\.webp";/, "the real party marker no longer names a real staged portrait file");
  assert.match(travel, /texture:\s*\{\s*src:\s*PARTY_PORTRAIT\s*\}/, "the newly-created marker no longer uses the real party portrait");
  assert.match(travel, /"texture\.src":\s*PARTY_PORTRAIT,[\s\S]{0,40}"texture\.tint":\s*null,[\s\S]{0,40}ring:\s*resolveTokenRing\("character",\s*\{\}\)/, "an already-existing (pre-ring) marker is no longer healed onto both the real portrait and a ring");
  assert.match(travel, /ring:\s*resolveTokenRing\("character",\s*\{\}\)/, "the newly-created marker no longer carries a Dynamic Token Ring");
  assert.doesNotMatch(travel, /icons\/svg\/direction\.svg/, "the plain white arrow icon has crept back in somewhere");
});

test("the real party portrait is a genuinely staged file, not a path that only looks right", () => {
  const partyFile = path.join(moduleRoot, "..", "assets", "tokens", "demo-party", "party.webp");
  assert.ok(existsSync(partyFile), `travel.mjs's PARTY_PORTRAIT names a file not actually staged at ${partyFile}`);
});

test("scatterDemoParty gives the whole scattered party a real establishing shot once every token is placed", () => {
  assert.match(demoRunner, /import\s*\{\s*frameCameraOn\s*\}\s*from\s*"\.\/travel-camera\.mjs"/);
  const fn = demoRunner.match(/async function scatterDemoParty\(\)[\s\S]*?\n\}/);
  assert.ok(fn, "scatterDemoParty is missing");
  assert.match(fn[0], /frameCameraOn\(hub, plan\.map\(\(p\) => \(\{ x: p\.x, y: p\.y \}\)\)\)/, "scatterDemoParty no longer frames the camera on the scattered party once they're placed");
});

test("the six demo candidates get the same Dynamic Token Ring every real Actor this pipeline creates, on the Actor's prototype AND the get-existing healing path", () => {
  assert.match(demoRunner, /import\s*\{\s*resolveTokenRing\s*\}\s*from\s*"\.\.\/core\/generators\/token-ring\.mjs"/, "demo-runner.mjs no longer imports resolveTokenRing");
  const fn = demoRunner.match(/async function scatterDemoParty\(\)[\s\S]*?\n\}/);
  assert.ok(fn, "scatterDemoParty is missing");
  assert.match(fn[0], /prototypeToken:\s*\{\s*ring:\s*resolveTokenRing\("character",\s*\{\}\)\s*\}/, "a freshly-created candidate Actor no longer gets a ring on its prototype token");
  assert.match(fn[0], /ring:\s*resolveTokenRing\("character",\s*\{\}\)[\s\S]{0,20}\}\);/, "the create-embedded-Token path no longer stamps a ring directly onto the scene token");
  assert.match(fn[0], /"texture\.src":\s*p\.portrait,\s*ring:\s*resolveTokenRing\("character",\s*\{\}\)/, "an already-existing candidate token is no longer healed onto a ring on re-run");
});
