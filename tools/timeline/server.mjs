// The plot timeline's local server (design/plot-timeline.md §4 and §5, D070).
//
// It serves the page, canon as one plain snapshot (tools/story/snapshot.mjs), and a live feed that tells the page when
// any file under canon/ changes, so Claude's edits arrive while Ingram is looking. Her edits come back as one POST per
// save (tools/timeline/ops.mjs). It answers only on localhost: any other Host header is refused, so no other site can
// read canon through a browser; a save also needs the page's own origin and the token this server put in the page it
// served, so no other page can write.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { ROOT, loadModel } from "../story/lib.mjs";
import { snapshot, canonHash } from "../story/snapshot.mjs";
import { notesOf, parkedOf, readNotesState, NOTES_FILE } from "../story/daybook.mjs";
import { applyOps } from "./ops.mjs";

/** What copy of the timeline was last published to claude.ai, and from which canon (tools/timeline/export.mjs). */
function readPublished(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

export const DEFAULT_PORT = 4193;
// What every copy of the page reads, and what only the live page loads: the copy for claude.ai has no way to write,
// so it never even carries the editing code (tools/timeline/export.mjs).
export const PAGE_FILES = Object.freeze(["app.js", "inspector.js", "views.js", "play.js"]);
export const EDIT_FILES = Object.freeze(["editing.js", "review.js"]);
export const CORE_FILES = Object.freeze(["timeline-model.mjs", "timeline-axis.mjs", "timeline-eras.mjs", "timeline-when.mjs", "timeline-health.mjs", "timeline-views.mjs", "timeline-lanes.mjs", "timeline-play.mjs"]);
export const CORE_EDIT_FILES = Object.freeze(["timeline-edits.mjs"]);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };
const MAX_BODY = 1024 * 1024;

/** The page as a whole document: the same body the claude.ai copy publishes, in a minimal shell. A token makes it editable. */
export function pageDocument(root = ROOT, { source = "api/snapshot", token = null } = {}) {
  const body = fs.readFileSync(path.join(root, "tools/timeline/page/index.html"), "utf8").replace("{{SOURCE}}", source);
  const tokenMeta = token ? `<meta name="timeline-token" content="${token}">` : "";
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${tokenMeta}</head><body>${body}</body></html>`;
}

/** A short stamp of Claude's replies to her notes (harvest/timeline/notes.json), so a reply reaches an open page too. */
export function notesStamp(root = ROOT) {
  try { return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, NOTES_FILE))).digest("hex").slice(0, 16); } catch { return ""; }
}

/** The snapshot, plus what only the local page needs: her notes, what she has parked, the published copy. */
export function liveSnapshot(root = ROOT, { sandbox = false } = {}) {
  const model = loadModel(root);
  return {
    ...snapshot(model, { root }),
    published: readPublished(path.join(root, "tools/timeline/published.json")),
    timeline: { notes: notesOf(model, readNotesState(root)), parked: parkedOf(model), sandbox, notesStamp: notesStamp(root) },
  };
}

/**
 * @param {{ root?: string, codeRoot?: string, token?: string, sandbox?: boolean }} opts  `root` holds the canon it
 *   reads and saves to; `codeRoot` the page and the shared core it serves (the same repo, unless `root` is a sandbox:
 *   a scratch copy of canon, so the editor can be tried, or checked live, without touching the real one).
 */
export function createTimelineServer({ root = ROOT, codeRoot = ROOT, token = crypto.randomBytes(18).toString("hex"), sandbox = false } = {}) {
  const clients = new Set();
  let lastHash = null;
  let lastNotes = null;
  const watchers = [];
  let timer = null;

  const send = (res, status, type, body, extra = {}) => {
    res.writeHead(status, { "content-type": type, "cache-control": "no-store", ...extra });
    res.end(body);
  };
  const json = (res, status, body) => send(res, status, TYPES[".json"], JSON.stringify(body));

  const save = (req, res, origins) => {
    if (!origins.has(req.headers.origin || "")) return json(res, 403, { ok: false, error: "a save comes only from the timeline page itself" });
    if (req.headers["x-timeline-token"] !== token) return json(res, 403, { ok: false, error: "this page is out of date: reload it" });
    if (!/^application\/json\b/.test(req.headers["content-type"] || "")) return json(res, 415, { ok: false, error: "a save is JSON" });
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { json(res, 413, { ok: false, error: "too large" }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (res.writableEnded) return;
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return json(res, 400, { ok: false, error: "not JSON" }); }
      let out;
      try { out = applyOps(root, body?.ops); } catch (e) { return json(res, 500, { ok: false, error: `the save failed: ${e.message}` }); }
      if (out.ok && out.record) notify();
      return json(res, 200, out);
    });
    return undefined;
  };

  const server = http.createServer((req, res) => {
    const port = server.address()?.port;
    const allowed = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
    if (!allowed.has(req.headers.host || "")) return send(res, 403, TYPES[".html"], "This server answers only on localhost.");
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;
    if (req.method === "POST" && p === "/api/ops") return save(req, res, new Set([...allowed].map((h) => `http://${h}`)));
    if (req.method !== "GET") return send(res, 405, TYPES[".html"], "Not here.");
    try {
      if (p === "/" || p === "/index.html") return send(res, 200, TYPES[".html"], pageDocument(codeRoot, { token }));
      if (p === "/api/snapshot") return send(res, 200, TYPES[".json"], JSON.stringify(liveSnapshot(root, { sandbox })));
      if (p === "/api/events") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
        res.write(`event: hello\ndata: ${JSON.stringify({ hash: lastHash || canonHash(root), notes: lastNotes ?? notesStamp(root) })}\n\n`);
        clients.add(res);
        const ping = setInterval(() => res.write(": ping\n\n"), 20000);
        req.on("close", () => { clearInterval(ping); clients.delete(res); });
        return undefined;
      }
      const core = p.match(/^\/core\/([a-z-]+\.mjs)$/);
      if (core && (CORE_FILES.includes(core[1]) || CORE_EDIT_FILES.includes(core[1]))) return send(res, 200, TYPES[".mjs"], fs.readFileSync(path.join(codeRoot, "module/blank-inheritance/scripts/core", core[1]), "utf8"));
      const page = p.slice(1);
      if (PAGE_FILES.includes(page) || EDIT_FILES.includes(page)) return send(res, 200, TYPES[path.extname(page)], fs.readFileSync(path.join(codeRoot, "tools/timeline/page", page), "utf8"));
      return send(res, 404, TYPES[".html"], "Not here.");
    } catch (e) {
      return send(res, 500, TYPES[".html"], `The timeline couldn't read canon: ${String(e.message || e)}`);
    }
  });

  /** Tell every open page that canon (or a reply to her notes) changed; debounced, as one save can touch several files. */
  const notify = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      let hash;
      try { hash = canonHash(root); } catch { return; }
      const notes = notesStamp(root);
      if (hash === lastHash && notes === lastNotes) return;
      lastHash = hash;
      lastNotes = notes;
      for (const c of clients) c.write(`event: canon\ndata: ${JSON.stringify({ hash, notes })}\n\n`);
    }, 250);
  };

  return {
    server,
    token,
    listen(port = DEFAULT_PORT, host = "127.0.0.1") {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          lastHash = canonHash(root);
          lastNotes = notesStamp(root);
          for (const dir of ["canon", "harvest/timeline"]) {
            const full = path.join(root, dir);
            try { fs.mkdirSync(full, { recursive: true }); watchers.push(fs.watch(full, { recursive: true }, notify)); } catch { /* polled by the next save instead */ }
          }
          resolve(server.address().port);
        });
      });
    },
    notify,
    close() {
      clearTimeout(timer);
      for (const w of watchers) w.close();
      for (const c of clients) c.end();
      clients.clear();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
