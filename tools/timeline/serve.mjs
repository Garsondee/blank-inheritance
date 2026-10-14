#!/usr/bin/env node
// The plot timeline (design/plot-timeline.md, D070).
//
//   npm run timeline                      the page, live, on http://localhost:4193/: reads canon and saves to it
//   npm run timeline -- --port 4200       on another port
//   npm run timeline -- --sandbox         the same page on a scratch copy of canon: try the editing, or check it
//                                         live, and nothing reaches the real canon (the copy goes when it stops)
//   npm run timeline -- export            the read-only copy for claude.ai, in tools/timeline/out/
//   npm run timeline -- copy [--port N]   look at that copy exactly as published, on http://localhost:4195/
//   npm run timeline -- published <url>   record that the copy in out/ was published at <url>
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createTimelineServer, DEFAULT_PORT } from "./server.mjs";
import { exportCopy, recordPublished, OUT } from "./export.mjs";
import { canonHash } from "../story/snapshot.mjs";
import { ROOT } from "../story/lib.mjs";

const SANDBOX_PREFIX = "plot-timeline-sandbox-";
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

/** Clear away scratch copies whose server is gone (on Windows a stopped server can't tidy up after itself). */
export function clearOldSandboxes(tmp = os.tmpdir()) {
  const gone = [];
  for (const name of fs.readdirSync(tmp).filter((n) => n.startsWith(SANDBOX_PREFIX))) {
    const dir = path.join(tmp, name);
    let pid = null;
    try { pid = Number(fs.readFileSync(path.join(dir, ".sandbox-pid"), "utf8")); } catch { /* no owner recorded */ }
    if (pid && alive(pid)) continue;
    if (!fs.existsSync(path.join(dir, "canon"))) continue; // not one of ours
    fs.rmSync(dir, { recursive: true, force: true });
    gone.push(dir);
  }
  return gone;
}

/** A scratch copy of canon (and what its checks read beside it), for --sandbox. */
export function makeSandbox(from = ROOT, { tmp = os.tmpdir() } = {}) {
  clearOldSandboxes(tmp);
  const dir = fs.mkdtempSync(path.join(tmp, SANDBOX_PREFIX));
  fs.writeFileSync(path.join(dir, ".sandbox-pid"), String(process.pid));
  fs.cpSync(path.join(from, "canon"), path.join(dir, "canon"), { recursive: true });
  // What canon's checks read beside it (the old drafts the plan still lists, the built copies, and the NPC files the Actor
  // notes are built from), about a megabyte.
  for (const d of ["data/scene-briefs", "data/challenges", "data/objectives", "data/encounters", "data/subsystems", "data/npcs"]) {
    if (fs.existsSync(path.join(from, d))) fs.cpSync(path.join(from, d), path.join(dir, d), { recursive: true });
  }
  for (const f of ["CLAUDE.md", "tools/timeline/published.json", "data/campaign/told-facts.json", "data/campaign/open-decisions.json", "data/campaign/actor-notes.json"]) {
    if (!fs.existsSync(path.join(from, f))) continue;
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(from, f), path.join(dir, f));
  }
  return dir;
}

/**
 * The read-only copy in out/, served exactly as claude.ai serves it (the page in a minimal shell, every other file as
 * itself, nothing else): so the copy can be looked at before or after publishing, without a sign-in.
 */
export function createCopyServer(out = OUT) {
  const TYPES = { ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
  const server = http.createServer((req, res) => {
    const port = server.address()?.port;
    if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host || "") || req.method !== "GET") { res.writeHead(403); res.end(); return; }
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = p === "/" ? "index.html" : path.normalize(p.slice(1));
    const abs = path.join(out, file);
    if (file.startsWith("..") || path.isAbsolute(file) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); res.end("Not in the copy."); return; }
    if (file === "index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(`<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>${fs.readFileSync(abs, "utf8")}</body></html>`);
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(fs.readFileSync(abs));
  });
  return server;
}

const args = process.argv.slice(2);
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  if (args[0] === "copy") {
    const i = args.indexOf("--port");
    const port = i >= 0 ? Number(args[i + 1]) : 4195;
    if (!fs.existsSync(path.join(OUT, "index.html"))) { console.log("No copy yet: run `npm run timeline -- export` first."); process.exit(1); }
    const server = createCopyServer();
    server.listen(port, "127.0.0.1", () => console.log(`The read-only copy (tools/timeline/out/) is on http://localhost:${server.address().port}/, as claude.ai serves it.`));
  } else if (args[0] === "export") {
    const { canonHash: hash, page, files } = exportCopy();
    console.log(`Wrote the copy to ${OUT} (canon ${hash}): ${page} and ${Object.keys(files).length} files.`);
  } else if (args[0] === "published") {
    if (!args[1]) { console.log("Usage: serve.mjs published <artifact url>"); process.exit(1); }
    recordPublished({ url: args[1], canonHash: canonHash() });
    console.log(`Recorded: ${args[1]} shows canon ${canonHash()}.`);
  } else {
    const i = args.indexOf("--port");
    const port = i >= 0 ? Number(args[i + 1]) : DEFAULT_PORT;
    const sandbox = args.includes("--sandbox");
    const root = sandbox ? makeSandbox() : ROOT;
    const t = createTimelineServer({ root, codeRoot: ROOT, sandbox });
    const actual = await t.listen(port);
    console.log(sandbox
      ? `The plot timeline SANDBOX is on http://localhost:${actual}/: a scratch copy of canon in ${root}. Nothing done there reaches canon. Ctrl+C to stop (the copy is removed).`
      : `The plot timeline is on http://localhost:${actual}/ (follows canon as it changes; Ctrl+C to stop).`);
    const stop = () => t.close().then(() => {
      if (sandbox) fs.rmSync(root, { recursive: true, force: true });
      process.exit(0);
    });
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  }
}
