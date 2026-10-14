// The plot timeline's server and its read-only copy (tools/timeline/; design/plot-timeline.md §4 to §6, D070): it answers
// only on localhost, serves the page, canon and the shared core, tells an open page when canon changes, and the copy
// for claude.ai carries the canon hash it was made from and reads only its own snapshot.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

import { createTimelineServer, CORE_FILES, PAGE_FILES, EDIT_FILES, CORE_EDIT_FILES } from "../../tools/timeline/server.mjs";
import { exportCopy } from "../../tools/timeline/export.mjs";
import { makeSandbox, clearOldSandboxes, createCopyServer } from "../../tools/timeline/serve.mjs";
import { ROOT } from "../../tools/story/lib.mjs";

function get(port, p, { host = `localhost:${port}`, method = "GET" } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: p, method, headers: { host } }, (res) => {
      let body = "";
      res.on("data", (d) => { body += d; });
      res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"], body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("REAL DATA: the page, canon and the shared core are served on localhost, and nothing else", async () => {
  const t = createTimelineServer({ root: ROOT, token: "page-token" });
  const port = await t.listen(0);
  try {
    const page = await get(port, "/");
    assert.equal(page.status, 200);
    assert.match(page.body, /<title>Plot Timeline<\/title>/);
    assert.match(page.body, /name="timeline-source" content="api\/snapshot"/);
    assert.match(page.body, /<meta name="timeline-token" content="page-token">/, "the live page carries the token its saves need");
    const snap = await get(port, "/api/snapshot");
    assert.equal(snap.status, 200);
    const s = JSON.parse(snap.body);
    assert.equal(s.presentYear, 4921);
    assert.ok(s.facts.length > 100 && s.chapters.length >= 20);
    assert.ok(Array.isArray(s.timeline.notes) && Array.isArray(s.timeline.parked), "her notes and what she parked come with the live snapshot");
    assert.ok(s.facts.every((f) => f.meta && typeof f.meta.status === "string"), "each fact's fields as its file holds them, for a save's `before`");
    for (const f of [...CORE_FILES, ...CORE_EDIT_FILES]) assert.equal((await get(port, `/core/${f}`)).status, 200, f);
    for (const f of [...PAGE_FILES, ...EDIT_FILES]) assert.equal((await get(port, `/${f}`)).status, 200, f);
    assert.match((await get(port, "/core/timeline-model.mjs")).type, /javascript/);
    assert.equal((await get(port, "/core/admin.mjs")).status, 404, "only the timeline's own core modules");
    assert.equal((await get(port, "/../canon/README.md")).status, 404);
    assert.equal((await get(port, "/", { host: "evil.example:80" })).status, 403, "a foreign Host header is refused");
    assert.equal((await get(port, "/api/snapshot", { host: `evil.example:${port}` })).status, 403);
    assert.equal((await get(port, "/api/snapshot", { method: "POST" })).status, 405, "only /api/ops takes a save");
  } finally {
    await t.close();
  }
});

test("an open page hears when a file under canon/ changes", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-live-"));
  fs.mkdirSync(path.join(root, "canon", "world"), { recursive: true });
  fs.writeFileSync(path.join(root, "canon", "world", "a.md"), "# A\nkind: thing\n");
  const t = createTimelineServer({ root });
  const port = await t.listen(0);
  try {
    const events = await new Promise((resolve, reject) => {
      const seen = [];
      const req = http.request({ host: "127.0.0.1", port, path: "/api/events", headers: { host: `localhost:${port}` } }, (res) => {
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          seen.push(chunk);
          if (seen.join("").includes("event: hello") && seen.length === 1) {
            fs.writeFileSync(path.join(root, "canon", "world", "a.md"), "# A changed\nkind: thing\n");
          }
          if (seen.join("").includes("event: canon")) { req.destroy(); resolve(seen.join("")); }
        });
      });
      req.on("error", (e) => { if (!/aborted|socket hang up/.test(e.message)) reject(e); });
      req.end();
      setTimeout(() => { req.destroy(); reject(new Error(`no canon event; saw: ${seen.join("")}`)); }, 5000);
    });
    assert.match(events, /event: hello/);
    assert.match(events, /event: canon\ndata: \{"hash":"[0-9a-f]{16}","notes":"([0-9a-f]{16})?"\}/);
  } finally {
    await t.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("REAL DATA: the copy for claude.ai reads only its own snapshot and carries the canon hash", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-copy-"));
  try {
    const { canonHash, page, files } = exportCopy({ root: ROOT, out });
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /name="timeline-source" content="snapshot\.json"/);
    assert.ok(!html.includes("{{SOURCE}}"));
    assert.ok(!/<!doctype|<html|<body/i.test(html), "the artifact wraps the page itself, so the copy is body content only");
    const snap = JSON.parse(fs.readFileSync(path.join(out, "snapshot.json"), "utf8"));
    assert.equal(snap.canonHash, canonHash);
    assert.ok(files["snapshot.json"] && files["app.js"] && files["core/timeline-model.mjs"]);
    assert.equal(files["core/timeline-model.mjs"].contentType, "text/javascript");
    for (const f of [...PAGE_FILES, ...CORE_FILES.map((c) => `core/${c}`)]) assert.ok(fs.existsSync(path.join(out, f)), f);
    // Write-free: no editing code, no token, and her notes and parked items stay on this PC.
    for (const f of [...EDIT_FILES, ...CORE_EDIT_FILES.map((c) => `core/${c}`)]) {
      assert.ok(!fs.existsSync(path.join(out, f)), `${f} never goes into the copy`);
      assert.ok(!files[f], f);
    }
    assert.ok(!html.includes("timeline-token"));
    assert.equal(snap.timeline, undefined);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("the copy's modules only import modules the copy carries (an import that 404s takes the whole page down)", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-graph-"));
  try {
    exportCopy({ root: ROOT, out });
    const seen = new Set();
    const walk = (rel) => {
      if (seen.has(rel)) return;
      seen.add(rel);
      const abs = path.join(out, rel);
      assert.ok(fs.existsSync(abs), `${rel} is imported but not in the copy`);
      const text = fs.readFileSync(abs, "utf8");
      for (const m of text.matchAll(/(?:import|export)\s[^"']*?from\s*["'](\.[^"']+)["']/g)) walk(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
    };
    walk("app.js");
    // The only dynamic imports are the editing files, loaded only by the live page with the server's token.
    const dynamic = [...fs.readFileSync(path.join(out, "app.js"), "utf8").matchAll(/import\(\s*["'](\.[^"']+)["']\s*\)/g)].map((m) => m[1]).sort();
    assert.deepEqual(dynamic, ["./editing.js", "./review.js"]);
    assert.ok(seen.has("views.js") && seen.has("core/timeline-views.mjs") && seen.has("core/timeline-health.mjs"));
    assert.ok(![...seen].some((f) => /editing|review|timeline-edits/.test(f)), "the copy never loads the editing code");
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("the copy can be looked at locally exactly as published: the page in a shell, its files as themselves, nothing else", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-copy-serve-"));
  try {
    exportCopy({ root: ROOT, out });
    const server = createCopyServer(out);
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const port = server.address().port;
    try {
      const page = await get(port, "/");
      assert.match(page.body, /^<!doctype html>.*<body><title>Plot Timeline<\/title>/s);
      assert.ok(!page.body.includes("timeline-token"));
      assert.match((await get(port, "/core/timeline-model.mjs")).type, /javascript/);
      assert.match((await get(port, "/snapshot.json")).type, /json/);
      assert.equal((await get(port, "/editing.js")).status, 404, "no editing code in the copy");
      assert.equal((await get(port, "/../../canon/README.md")).status, 404);
      assert.equal((await get(port, "/", { host: "evil.example" })).status, 403);
    } finally {
      await new Promise((r) => server.close(r));
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("the sandbox is a scratch copy of canon, and a copy whose server has gone is cleared away next time", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-tmp-"));
  const from = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-from-"));
  try {
    fs.mkdirSync(path.join(from, "canon", "world"), { recursive: true });
    fs.writeFileSync(path.join(from, "canon", "world", "a.md"), "# A\n");
    const dead = path.join(tmp, "plot-timeline-sandbox-old");
    fs.mkdirSync(path.join(dead, "canon"), { recursive: true });
    fs.writeFileSync(path.join(dead, ".sandbox-pid"), "2147483640");
    const notOurs = path.join(tmp, "plot-timeline-sandbox-someone-else");
    fs.mkdirSync(notOurs);
    const box = makeSandbox(from, { tmp });
    assert.equal(fs.readFileSync(path.join(box, "canon", "world", "a.md"), "utf8"), "# A\n");
    assert.equal(fs.readFileSync(path.join(box, ".sandbox-pid"), "utf8"), String(process.pid));
    assert.ok(!fs.existsSync(dead), "a copy whose server is gone is cleared");
    assert.ok(fs.existsSync(notOurs), "a folder that isn't a copy of canon is left alone");
    assert.deepEqual(clearOldSandboxes(tmp), [], "a live server's copy stays");
    assert.ok(fs.existsSync(box));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
});

test("the page only writes when it is live: the editing loads only with the server's token, and only it saves", () => {
  const page = (f) => fs.readFileSync(path.join(ROOT, "tools/timeline/page", f), "utf8");
  const app = page("app.js");
  assert.match(app, /const LIVE = SOURCE\.startsWith\("api\/"\)/);
  assert.match(app, /if \(LIVE && TOKEN && !editing\) await startEditing\(\)/);
  for (const f of [...PAGE_FILES]) assert.ok(!/method:\s*"(POST|PUT|DELETE)"/.test(page(f)), `${f} never writes`);
  assert.match(page("editing.js"), /method: "POST"[^\n]*"x-timeline-token": TOKEN/);
  assert.match(page("editing.js"), /if \(!TOKEN\) return null;/);
});
