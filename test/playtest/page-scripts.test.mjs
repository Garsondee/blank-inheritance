/**
 * The scripts that run INSIDE a seat's page (tools/playtest/browser/*.js) and the pieces of the seat that do not need a game:
 * they must parse, and, in a real Chrome on a page built to contain exactly the faults they look for, they must read the screen the way
 * a person would and find what they are written to find. These are the instruments; an instrument that is never tried on a known fault
 * proves nothing when it reports a clean screen.
 *
 * The Chrome tests are SKIPPED, loudly, on a machine without Chrome (testing-strategy.md: a skipped test announces itself).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { call, detectorsSource, diceGovernorSource, lookSource, pageHooksSource, probeCall, probesSource, stripExports } from "../../tools/playtest/browser/scripts.mjs";
import { findControls, formatLook, refsOf } from "../../tools/playtest/browser/format-look.mjs";
import { Seat, parseKeyCombo } from "../../tools/playtest/browser/seat.mjs";
import { CHROME } from "../../tools/playtest/paths.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, "..", "..", "tools", "playtest", "browser");
const NO_CHROME = !existsSync(CHROME) && `Chrome is not installed at ${CHROME}: the browser tests of the page scripts were SKIPPED`;

test("every page script parses, and the governor is the dice module plus its governor with no exports left", () => {
  for (const file of readdirSync(scripts).filter((f) => f.endsWith(".js"))) assert.doesNotThrow(() => new vm.Script(`(function(){${readFileSync(path.join(scripts, file), "utf8")}\n})`), file);
  assert.doesNotThrow(() => new vm.Script(diceGovernorSource()));
  assert.ok(!/^export\s/m.test(diceGovernorSource()), "the governor is a script, not a module");
  assert.ok(diceGovernorSource().includes("function degreeOf") && diceGovernorSource().includes("G.arm"));
  assert.equal(stripExports("export function a() {}\nexport const b = 1;\nconst c = 2;"), "function a() {}\nconst b = 1;\nconst c = 2;");
  assert.ok(call(lookSource(), { all: true }).endsWith('({"all":true})'));
  assert.ok(pageHooksSource().includes("__pt") && detectorsSource().includes("clickthrough") && probesSource().includes("characters"));
});

test("a key combination is understood the way a person writes it", () => {
  assert.deepEqual(parseKeyCombo("Ctrl+Shift+K"), { modifiers: ["Control", "Shift"], key: "K" });
  assert.deepEqual(parseKeyCombo("Enter"), { modifiers: [], key: "Enter" });
  assert.deepEqual(parseKeyCombo("esc"), { modifiers: [], key: "Escape" });
  assert.deepEqual(parseKeyCombo("Shift+Tab"), { modifiers: ["Shift"], key: "Tab" });
  assert.deepEqual(parseKeyCombo("down"), { modifiers: [], key: "ArrowDown" });
  assert.deepEqual(parseKeyCombo("a"), { modifiers: [], key: "a" });
  assert.throws(() => parseKeyCombo(""), /no key/);
});

test("the text view lists refs, states, context and compression, and a search finds controls by their words", () => {
  const result = {
    meta: { url: "/game", viewport: [1366, 768], zoom: 1, ready: true, user: { name: "PT Player 2", gm: false, character: null }, scene: { id: "s", name: "00. From Up Here" }, title: "t" },
    groups: [
      { kind: "window", id: "app-1", title: "Induction", front: true, rect: [10, 10, 400, 300], text: "Pick an ancestry.", textLength: 17, controls: [{ ref: "r1", role: "button", label: "Continue", state: ["disabled"], rect: [0, 0, 1, 1], where: null }, { ref: "r2", role: "button", label: "Change", state: [], context: "Identity PT-Brann", rect: [0, 0, 1, 1], where: "scroll" }, { ref: "r3", role: "text field", label: "", state: ["empty"], rect: [0, 0, 1, 1], where: null }], hiddenControls: 40 },
      { kind: "hud", id: "bi-deck", title: "deck", front: false, rect: [0, 700, 300, 60], text: "Roll Use", textLength: 8, controls: [], hiddenControls: 0 }
    ],
    toasts: ["Saved"],
    chat: ["GM: welcome"]
  };
  const text = formatLook(result, { seat: "P2", persona: "brute" });
  assert.match(text, /SEAT P2 \(brute\) - PT Player 2, no character yet/);
  assert.match(text, /scene "00. From Up Here"/);
  assert.match(text, /WINDOW "Induction" \(front\)/);
  assert.match(text, /\[r1\] button "Continue" \(disabled\)/);
  assert.match(text, /\[r2\] button "Change" - in "Identity PT-Brann" \[below the fold: scroll\]/);
  assert.match(text, /\[r3\] text field \(unlabelled\) \(empty\)/);
  assert.match(text, /40 more controls like these/);
  assert.match(text, /NOTICES: "Saved"/);
  assert.match(text, /use `shot`/);
  assert.deepEqual(refsOf(result), ["r1", "r2", "r3"]);
  assert.deepEqual(findControls(result, "continue").map((c) => c.ref), ["r1"], "found by its words, any case");
  assert.deepEqual(findControls(result, "chan").map((c) => c.ref), ["r2"], "or by the start of them");
  assert.deepEqual(findControls(result, "nothing like it"), []);
});

const FIXTURE = `<!doctype html><html><body style="margin:0;font:14px sans-serif">
<div class="application" id="win1" style="position:fixed;left:50px;top:50px;width:400px;height:300px;z-index:100;background:#fff">
  <header class="window-header"><h1 class="window-title">Test Window</h1><button data-action="close" aria-label="Close Window" style="width:30px;height:30px">x</button></header>
  <section class="window-content" style="overflow:auto;height:230px">
    <p>Hello world, this is a window.</p>
    <label for="n">Your name</label><input id="n" type="text">
    <button id="go" data-action="go" style="width:80px;height:30px">Continue</button><button disabled style="width:60px;height:30px">Back</button>
    <span id="pill" style="cursor:pointer;display:inline-block;padding:4px">a pill</span>
    <ul id="list">${Array.from({ length: 40 }, (_, i) => `<li><button style="width:90px;height:26px">Option ${i + 1}</button></li>`).join("")}</ul>
  </section>
</div>
<div id="bi-deck" style="position:fixed;left:0;bottom:0;width:320px;height:60px;z-index:200;background:#333;color:#fff"><button id="deck1" style="width:60px;height:30px">Roll</button><svg id="dial" style="position:fixed;left:20px;top:300px;width:180px;height:180px;z-index:201"></svg><span id="clip" style="display:inline-block;width:50px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">a very long line of text that is cut off</span></div>
<div id="swallower" style="position:fixed;left:550px;top:450px;width:440px;height:250px;z-index:99998"></div>
<button id="under" style="position:fixed;left:520px;top:80px;width:80px;height:30px">Hidden-ish</button>
<div id="cover" style="position:fixed;left:510px;top:70px;width:120px;height:60px;z-index:300"></div>
<button id="under2" style="position:fixed;left:60px;top:600px;width:80px;height:30px">Under words</button>
<div id="textcover" style="position:fixed;left:50px;top:590px;width:120px;height:60px;z-index:301;background:#eee">an overlay with words</div>
<div id="editor" contenteditable="true" style="position:fixed;left:800px;top:100px;width:150px;height:80px;z-index:310"></div>
<button id="tiny" style="position:fixed;left:700px;top:300px;width:10px;height:10px">t</button>
<button id="nameless" style="position:fixed;left:700px;top:330px;width:30px;height:30px"></button>
</body></html>`;

test("in a real Chrome, look reads a window like a person: its words, its controls by name, states, refs that stay, a long list compressed, a search", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 700 });
    await page.evaluateOnNewDocument(pageHooksSource());
    await page.setContent(FIXTURE);
    const first = await page.evaluate(call(lookSource(), {}));
    const win = first.groups.find((g) => g.kind === "window");
    assert.equal(win.title, "Test Window");
    assert.ok(win.front);
    assert.match(win.text, /Hello world/);
    const labels = win.controls.map((c) => `${c.role}:${c.label}`);
    assert.ok(labels.includes("button:Close Window"), labels.join(" | "));
    assert.ok(labels.includes("text field:Your name"), "an input is named by its <label>");
    assert.ok(win.controls.find((c) => c.label === "Back").state.includes("disabled"));
    assert.ok(win.controls.some((c) => c.role === "pressable" && c.label === "a pill"), "a pointer-cursor span is pressable");
    assert.ok(win.hiddenControls > 20, `the 40-item list is compressed (${win.hiddenControls} hidden)`);
    const again = await page.evaluate(call(lookSource(), {}));
    const ref = (r, label) => r.groups.find((g) => g.kind === "window").controls.find((c) => c.label === label).ref;
    assert.equal(ref(again, "Continue"), ref(first, "Continue"), "a control keeps its ref");
    const hud = first.groups.find((g) => g.kind === "hud");
    assert.equal(hud.id, "bi-deck");
    assert.ok(hud.controls.some((c) => c.label === "Roll"));
    const found = await page.evaluate(call(lookSource(), { find: "Option 7" }));
    assert.equal(found.groups.flatMap((g) => g.controls).length, 1, "a search covers the whole list, not the compressed view");
    const refEl = await page.$(`[data-pt-ref="${ref(first, "Continue")}"]`);
    assert.ok(refEl, "the ref is on the element, so a click can find it");
    const scroll = (await page.evaluate(call(lookSource(), { all: true }))).groups.find((g) => g.kind === "window").controls.find((c) => c.label === "Option 40");
    assert.equal(scroll.where, "scroll", "a control below the fold of its own window says so");
    const text = formatLook(first, { seat: "P1" });
    assert.match(text, /\[r\d+\] button "Continue"/);
  } finally {
    await browser.close();
  }
});

test("in a real Chrome, look lists sf2e's older-style windows (the character sheet is one) and --chars widens the always-on parts' text", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 700 });
    const long = "The terminal says a very long thing. ".repeat(40);
    await page.setContent(`<body>
      <div id="CharacterSheetPF2e-Actor-abc" class="app window-app sheet actor character" style="position:fixed;left:40px;top:40px;width:520px;height:400px;background:#222;color:#eee;z-index:100">
        <header class="window-header"><h4 class="window-title">Brakka</h4><a class="header-button close">Close</a></header>
        <section class="window-content"><p>Level 1 Soldier</p><button type="button">Strike</button><button type="button">Roll Athletics</button></section>
      </div>
      <div id="bi-induction-terminal" style="position:fixed;left:600px;top:40px;width:380px;height:300px;background:#eee"><p>${long}</p><button type="button">CONTINUE</button></div>
      <div id="bi-console-window" style="position:fixed;left:0;top:0;width:0;height:0"><div class="bi-terminal" style="position:fixed;left:200px;top:300px;width:300px;height:150px;background:#123;color:#fff"><button type="button">Hub</button> The console</div></div>
      <section id="chat" style="position:fixed;left:40px;top:480px;width:400px;height:200px;overflow:auto">${Array.from({ length: 14 }, (_, i) => `<div class="chat-message">Message ${i + 1}: ${"an intake answer, written at length ".repeat(18)}</div>`).join("")}</section>
    </body>`);
    const first = await page.evaluate(call(lookSource(), {}));
    const sheet = first.groups.find((g) => g.kind === "window");
    assert.ok(sheet, "the older-style window is listed as a window");
    assert.equal(sheet.title, "Brakka");
    assert.deepEqual(sheet.controls.map((c) => c.label), ["Strike", "Roll Athletics"], "and its controls are listed by name with refs");
    assert.match(sheet.text, /Level 1 Soldier/);
    const hud = first.groups.find((g) => g.kind === "hud");
    assert.equal(hud.id, "bi-induction-terminal");
    assert.ok(hud.text.length <= 320, "an always-on part is short by default");
    assert.ok(hud.textLength > 1000);
    assert.ok(!first.groups.some((g) => g.kind === "hud" && g.controls.some((c) => c.label === "Strike")), "a control inside the older-style window is not also listed under a part");
    const wide = await page.evaluate(call(lookSource(), { maxText: 2000, hudMax: 2000 }));
    assert.ok(wide.groups.find((g) => g.kind === "hud").text.length > 1000, "--chars widens it");
    const consolePart = first.groups.find((g) => g.id === "bi-console-window");
    assert.ok(consolePart, "a part whose root has no size but whose panel is drawn is listed (the Command Console)");
    assert.deepEqual(consolePart.rect, [200, 300, 300, 150], "with the rectangle of what it draws");
    assert.ok(consolePart.controls.some((c) => c.label === "Hub"));
    assert.equal(first.chat.length, 3, "three chat lines by default");
    assert.ok(first.chat.every((c) => c.length <= 240), "each cut short");
    assert.match(first.chat[2], /^Message 14:/);
    const allChat = await page.evaluate(call(lookSource(), { all: true }));
    assert.equal(allChat.chat.length, 12, "--all shows twelve");
    const longChat = await page.evaluate(call(lookSource(), { chatMax: 2000 }));
    assert.ok(longChat.chat[0].length > 500, "--chars lets a whole message through (the game master reads intake answers here)");
    const probed = await page.evaluate(probeCall("windows"));
    assert.ok(probed.hud.includes("bi-induction-terminal"));
  } finally {
    await browser.close();
  }
});

test("in a real Chrome, a seat's screenshot does not make the page resize itself (Foundry answers a resize with an error notice the player would see)", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const { mkdtempSync } = await import("node:fs");
  const os = await import("node:os");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setContent("<body style='margin:0'><div style='width:3000px;height:3000px;background:linear-gradient(red,blue)'></div></body>");
    await page.evaluate(() => {
      window.__sizes = [];
      window.addEventListener("resize", () => window.__sizes.push([innerWidth, innerHeight]));
    });
    const evidenceDir = mkdtempSync(path.join(os.tmpdir(), "pt-shot-"));
    const seat = { page, profile: { viewport: [1366, 768] }, evidenceDir };
    const small = await Seat.prototype.shot.call(seat, { scale: 0.6 });
    const region = await Seat.prototype.shot.call(seat, { scale: 1, region: [0, 0, 400, 300], format: "png", label: "region" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(small.ok, true, small.text);
    assert.equal(region.ok, true, region.text);
    assert.match(small.text, /820x461/);
    // The first capture in a page may report one resize to the size it already is; what Foundry objects to is a resize to something small (a clipped
    // capture used to make the page 1px by 1px for a moment).
    const sizes = await page.evaluate(() => window.__sizes);
    assert.ok(sizes.every(([w, h]) => w === 1366 && h === 768), `the page was never resized to anything but its own size by being photographed (saw ${JSON.stringify(sizes)})`);
  } finally {
    await browser.close();
  }
});

test("in a real Chrome, the detectors find the planted faults: a swallower, a covered control, a tiny one, a nameless one, clipped text", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 700 });
    await page.setContent(FIXTURE);
    const hits = await page.evaluate(call(detectorsSource(), null));
    assert.ok(hits.clickthrough?.some((h) => /div#swallower/.test(h.element) && h.screenPoints >= 2), "the big empty invisible box that wins the hit test: " + JSON.stringify(hits.clickthrough));
    assert.ok(hits.clickthrough?.some((h) => /div#cover/.test(h.element) && h.covers.includes("Hidden-ish")), "the small invisible cover over a control, which the grid cannot see: " + JSON.stringify(hits.clickthrough));
    assert.ok(hits.occlusion?.some((h) => /button#under2/.test(h.element) && /div#textcover/.test(h.coveredBy)), "a control under a cover with words in it is plain occlusion: " + JSON.stringify(hits.occlusion));
    assert.ok(!hits.occlusion?.some((h) => /div#cover$/.test(h.coveredBy)), "an invisible cover is a click-through, not also an occlusion");
    assert.ok(!hits.clickthrough?.some((h) => /editor/.test(h.element)), "an empty editor is a control, not a swallower");
    assert.ok(!hits.clickthrough?.some((h) => /svg/.test(h.element)), "a decorative part of the HUD (the deck's dial) is meant to take clicks");
    assert.ok(hits.tiny?.some((e) => e.examples.some((x) => /^t \d+x10$/.test(x))), "the button 10 high: " + JSON.stringify(hits.tiny));
    assert.ok(hits.unlabelled?.some((h) => /button#nameless/.test(h.element)), "the button with no name");
    assert.ok(hits["clipped-text"]?.some((h) => /cut off|a very long/.test(h.text)), "the clipped line");
    assert.equal(hits["overflow-x"], undefined, "the page does not scroll sideways");
    const only = await page.evaluate(call(detectorsSource(), ["tiny"]));
    assert.deepEqual(Object.keys(only), ["tiny"], "a detector can be asked for by name");
  } finally {
    await browser.close();
  }
});

test("in a real Chrome, the page hooks keep the page's own log: DOM activity (not the rig's own marks), what the page is told, and a dropped promise reaches the hub", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(pageHooksSource());
    await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent("<body><button id=b>x</button></body>")}`);
    const before = await page.evaluate(() => window.__pt.mutations);
    await page.evaluate(() => document.getElementById("b").setAttribute("data-pt-ref", "r1"));
    assert.equal(await page.evaluate(() => window.__pt.mutations), before, "the rig's own ref marks are not page activity");
    await page.evaluate(() => document.body.append(document.createElement("div")));
    assert.ok((await page.evaluate(() => window.__pt.mutations)) > before, "a real change is");
    // A dropped promise reaches the hub through Puppeteer's own pageerror ("Uncaught (in promise)"); the page's own listener does not
    // see it under DevTools, which is why the seat's telemetry takes it from there (checked here so that stays true).
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.evaluate(() => { setTimeout(() => Promise.reject(new Error("dropped on purpose")), 0); });
    await new Promise((r) => setTimeout(r, 400));
    assert.ok(errors.some((m) => /dropped on purpose/.test(m)), "Puppeteer reports it: " + errors.join("|"));
    await page.evaluate(() => window.__pt.push("window", { opened: "bi-test", title: "A window" }));
    const events = await page.evaluate(() => window.__pt.drain());
    assert.ok(events.some((e) => e.type === "window" && e.opened === "bi-test"), "the page's own log keeps what it is given, with a time");
    assert.ok(events.every((e) => Number.isFinite(e.t)));
    assert.deepEqual(await page.evaluate(() => window.__pt.drain()), [], "draining empties the log");
  } finally {
    await browser.close();
  }
});

test("in a real Chrome, the leak probe finds a GM-only line on the visible page, and ignores short phrases", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const { probeCall } = await import("../../tools/playtest/browser/scripts.mjs");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setContent("<body><p>Welcome. Shucks uses mothers' maiden names to trace the marker through families.</p></body>");
    const found = await page.evaluate(probeCall("leak", ["Shucks uses mothers' maiden names to trace the marker", "short one", "A line that is long enough but is not on this page at all"]));
    assert.equal(found.ui.length, 1, JSON.stringify(found));
    assert.match(found.ui[0].canary, /^Shucks uses/);
    assert.deepEqual(found.documents, [], "no game, so no documents to search");
  } finally {
    await browser.close();
  }
});

test("in a real Chrome, a full-screen overlay that is meant to cover the page is not reported as covering it", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 700 });
    await page.setContent('<body><button id="a" style="position:fixed;left:100px;top:100px;width:80px;height:30px">Under</button><div id="bi-modal" style="position:fixed;inset:0;z-index:500;background:#fff">The terminal, full screen</div></body>');
    const hits = await page.evaluate(call(detectorsSource(), ["occlusion", "clickthrough"]));
    assert.deepEqual(hits, {}, JSON.stringify(hits));
  } finally {
    await browser.close();
  }
});

test("in a real Chrome, an empty text box is a field, not a box that swallows clicks, and a modal dialog covers the page on purpose", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 700 });
    // The Journal's new-objective form: two empty text boxes in a window, each winning the hit test where it is drawn (found by the main run, F-0044 and F-0045).
    await page.setContent('<body><div id="bi-journal" style="position:fixed;left:100px;top:100px;width:500px;height:300px;background:#222"><input id="bi-journal-why" type="text" style="position:absolute;left:10px;top:10px;width:400px;height:40px;background:transparent;border:0"><input id="bi-journal-by" type="text" style="position:absolute;left:10px;top:70px;width:400px;height:40px;background:transparent;border:0"><textarea id="notes" style="position:absolute;left:10px;top:130px;width:400px;height:60px;background:transparent;border:0"></textarea></div></body>');
    const fields = await page.evaluate(call(detectorsSource(), ["clickthrough", "occlusion"]));
    assert.deepEqual(fields, {}, "empty fields are controls: " + JSON.stringify(fields));
    // A control below the fold of its own scrolling list has the page behind the list under that spot: not a cover.
    await page.setContent('<body><canvas id="board" style="position:fixed;inset:0;width:100vw;height:100vh;background:#345"></canvas><div id="bi-scroller" style="position:fixed;left:100px;top:100px;width:300px;height:120px;overflow:auto;background:#eee"><div style="height:600px;position:relative"><button id="top" style="position:absolute;left:10px;top:10px;width:80px;height:30px">Visible</button><button id="far" style="position:absolute;left:10px;top:400px;width:80px;height:30px">Below the fold</button></div></div></body>');
    const fold = await page.evaluate(call(detectorsSource(), ["occlusion", "clickthrough"]));
    assert.deepEqual(fold, {}, "a control scrolled out of view is not covered by what lies behind its list: " + JSON.stringify(fold));
    // Foundry's own main menu is a modal <dialog>: everything under it is covered, by design.
    await page.setContent('<body><button id="a" style="position:fixed;left:100px;top:100px;width:80px;height:30px">Under</button><dialog id="menu" open style="position:fixed;left:0;top:0;width:100vw;height:100vh;margin:0;max-width:none;max-height:none;border:0;padding:0;background:#333;color:#fff;z-index:900"><div style="width:300px;height:200px;margin:40px">Reload Application</div></dialog></body>');
    const modal = await page.evaluate(call(detectorsSource(), ["occlusion", "clickthrough"]));
    assert.deepEqual(modal, {}, "a modal dialog is not a fault: " + JSON.stringify(modal));
    // And the real faults are still found beside them.
    await page.setContent('<body><button id="a" style="position:fixed;left:100px;top:100px;width:80px;height:30px">Under</button><input id="f" type="text" style="position:fixed;left:400px;top:400px;width:200px;height:30px"><div id="swallower" style="position:fixed;left:0;top:0;width:60vw;height:60vh;z-index:90"></div></body>');
    const still = await page.evaluate(call(detectorsSource(), ["clickthrough"]));
    assert.ok(still.clickthrough?.some((h) => /div#swallower/.test(h.element)), JSON.stringify(still));
    assert.ok(!still.clickthrough?.some((h) => /input#f/.test(h.element)));
  } finally {
    await browser.close();
  }
});

test("in a real Chrome, an empty root of the adventure's own HUD that takes clicks is still caught (the Scene Runner's closed host)", { skip: NO_CHROME }, async () => {
  const { launchChrome } = await import("../../tools/playtest/browser/chrome.mjs");
  const browser = await launchChrome();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 700 });
    await page.setContent('<body><div id="bi-scene-runner" style="position:fixed;left:0;top:0;width:60vw;height:100vh;z-index:90"></div></body>');
    const hits = await page.evaluate(call(detectorsSource(), ["clickthrough"]));
    assert.ok(hits.clickthrough?.some((h) => /div#bi-scene-runner/.test(h.element) && h.screenPoints >= 2), JSON.stringify(hits));
  } finally {
    await browser.close();
  }
});
