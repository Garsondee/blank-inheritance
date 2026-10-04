/**
 * The stage at player sizes: everything Stagecraft puts on the page (the chalk kit, the box of chalk, the GM's strips and
 * toggle, the health pill, the hover tip) must stay inside the window and out of each other's way at the windows players
 * really have, not only the GM's 2560 x 1271. Headless Chrome, real pointer events.
 *
 *   node tools/stagecraft/bench/sizes-check.mjs        (starts its own web server on port 4197)
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const PORT = 4197;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => { results.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };
const server = spawn("py", [path.join(repo, "tools", "induction-terminal", "serve.py"), String(PORT)], { stdio: "ignore" });
for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch { /* not yet */ } await sleep(200); }
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--hide-scrollbars"] });

const SIZES = [[1920, 1080], [1366, 768], [1280, 720], [1024, 768], [800, 600]];
const SELECTORS = [".stagecraft-kit", ".stagecraft-gm-toggle", ".stagecraft-blocking", ".stagecraft-health", ".stagecraft-board-key", ".stagecraft-chalk-hint"];
const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
try {
  for (const [w, h] of SIZES) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern&seat=gm&tier=high`);
    await page.waitForFunction(() => window.bench?.ready === true, { timeout: 60000 });
    await page.bringToFront();
    await sleep(1500);
    // unfold the GM strips, open the health list, and take the yellow chalk: every panel the stage can show at once
    await page.evaluate(() => { document.querySelector(".stagecraft-gm-toggle")?.click(); });
    await sleep(300);
    const box = await page.evaluate(() => { const h = window.bench.host; const b = h.backend; return h.chalk && b.chalkBox ? (() => { const s = b.chalkBox.sticks.find((x) => x.userData.chalk === "yellow"); const p = new (s.position.constructor)(); s.getWorldPosition(p); return b.project({ X: p.x, Y: p.y, Z: p.z }); })() : null; });
    check(`${w}x${h}: the box of chalk is on the window`, box && box.x > 0 && box.x < w && box.y > 0 && box.y < h, JSON.stringify(box && { x: Math.round(box.x), y: Math.round(box.y) }));
    if (box) { await page.mouse.move(box.x, box.y); await sleep(80); await page.mouse.down(); await page.mouse.up(); await sleep(400); }
    const rects = await page.evaluate((sels) => Object.fromEntries(sels.map((s) => { const el = document.querySelector(`#stagecraft-stage ${s}`); if (!el || getComputedStyle(el).display === "none" || el.hidden) return [s, null]; const r = el.getBoundingClientRect(); return [s, { left: r.left, top: r.top, right: r.right, bottom: r.bottom }]; })), SELECTORS);
    const shown = Object.entries(rects).filter(([, r]) => r);
    const out = shown.filter(([, r]) => r.left < -1 || r.top < -1 || r.right > w + 1 || r.bottom > h + 1);
    check(`${w}x${h}: every panel is inside the window`, out.length === 0, out.map(([s, r]) => `${s} ${Math.round(r.left)},${Math.round(r.top)}-${Math.round(r.right)},${Math.round(r.bottom)}`).join("; ") || shown.map(([s]) => s).join(" "));
    const clash = [];
    for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) if (overlap(shown[i][1], shown[j][1])) clash.push(`${shown[i][0]} / ${shown[j][0]}`);
    check(`${w}x${h}: and none covers another`, clash.length === 0, clash.join("; "));
    await page.screenshot({ path: path.join(repo, "design", "stagecraft", "lab", "shots", "bench", `size-${w}x${h}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
