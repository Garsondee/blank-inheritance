/**
 * The hub's HTTP door: seat verbs, orchestrator ops, the control room and its live stream. Bound to 127.0.0.1 only.
 *
 *   POST /v/<verb>   { seat, token, positionals, flags }   a seat's verb          (token must be that seat's)
 *   POST /o/<op>     { positionals, flags, json }          orchestrator op         (header x-pt-orch must be the orchestrator token)
 *   GET  /           the control room (the orchestrator token is put into the page, which only localhost can fetch)
 *   GET  /api/status, /api/stream (server-sent events), /api/table, /api/findings, /shot/<seat>.jpg
 */

import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";

import { PT_DIR } from "../paths.mjs";
import { checkVerbCall, SEAT_VERBS } from "../core/verbs.mjs";
import { orch } from "./orch.mjs";

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

async function readBody(req, limit = 1_000_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("request too large");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export function createServer(hub) {
  const streams = new Set();

  const push = (event, data) => {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of streams) res.write(frame);
  };
  hub.bus.on("e", (e) => {
    if (e.kind === "table") push("table", e.entry);
    else if (e.kind === "finding") push("finding", e.finding);
    else if (e.kind === "event" && e.event.severity && !e.event.noise) push("event", e.event);
    else if (e.kind === "dice") push("dice", e.entry);
  });
  const statusTimer = setInterval(async () => {
    if (!streams.size) return;
    try {
      push("status", await hub.status());
    } catch {
      /* a status tick that fails is skipped */
    }
  }, 2000);
  statusTimer.unref();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    try {
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const page = readFileSync(path.join(PT_DIR, "control-room", "index.html"), "utf8").replace("__PT_ORCH_TOKEN__", hub.orchToken);
        return send(res, 200, page, "text/html");
      }
      if (req.method === "GET" && url.pathname === "/api/status") return send(res, 200, await hub.status());
      if (req.method === "GET" && url.pathname === "/api/table") {
        const since = Number(url.searchParams.get("since") ?? 0);
        return send(res, 200, (hub.store?.table ?? []).filter((e) => e.n > since));
      }
      if (req.method === "GET" && url.pathname === "/api/findings") return send(res, 200, hub.store?.findings ?? []);
      if (req.method === "GET" && url.pathname === "/api/stream") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
        res.write(": connected\n\n");
        streams.add(res);
        hub.watchers = streams.size;
        res.write(`event: status\ndata: ${JSON.stringify(await hub.status())}\n\n`);
        const ping = setInterval(() => res.write(": ping\n\n"), 15000);
        req.on("close", () => {
          clearInterval(ping);
          streams.delete(res);
          hub.watchers = streams.size;
        });
        return undefined;
      }
      const shot = /^\/shot\/([A-Z0-9]+)\.jpg$/.exec(url.pathname);
      if (req.method === "GET" && shot) {
        const buffer = hub.thumbs.get(shot[1]);
        return buffer ? send(res, 200, buffer, "image/jpeg") : send(res, 404, { error: "no picture yet" });
      }
      const verb = /^\/v\/([a-z-]+)$/.exec(url.pathname);
      if (req.method === "POST" && verb) {
        const body = await readBody(req);
        const seat = hub.seatFor(body.seat, body.token);
        if (!seat) return send(res, 403, { ok: false, text: "That seat or token is not right. Your command must start with the exact prefix in your brief." });
        const problem = checkVerbCall(verb[1], seat.role);
        if (problem) return send(res, 200, { ok: false, text: problem });
        return send(res, 200, await hub.seatVerb(seat, verb[1], { positionals: (body.positionals ?? []).map(String), flags: body.flags ?? {} }));
      }
      const op = /^\/o\/([a-z/-]+)$/.exec(url.pathname);
      if (req.method === "POST" && op) {
        if (!hub.isOrchestrator(req.headers["x-pt-orch"])) return send(res, 403, { ok: false, text: "The orchestrator door needs the orchestrator token." });
        const body = await readBody(req);
        return send(res, 200, await orch(hub, op[1], { positionals: (body.positionals ?? []).map(String), flags: body.flags ?? {}, json: body.json ?? {} }));
      }
      return send(res, 404, { error: "not found", verbs: Object.keys(SEAT_VERBS) });
    } catch (error) {
      return send(res, 500, { ok: false, text: `The hub hit an error: ${error.message}` });
    }
  });
  server.on("close", () => clearInterval(statusTimer));
  return server;
}
