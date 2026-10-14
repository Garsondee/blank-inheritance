/*
 * Installed in EVERY seat's page before anything else runs (Puppeteer's evaluateOnNewDocument). It is the page's half of the telemetry:
 * it collects what only the page can see, into window.__pt, and the hub drains it. Everything the page can only learn by being inside
 * (windows opening, notifications, the socket, long tasks, DOM activity) is here; console, page errors and failed requests the hub
 * gets from Puppeteer directly. It never changes how the game behaves, with one exception it makes loudly: it wraps ui.notifications
 * to copy each notice into the log before passing it on unchanged.
 *
 * Plain script, not a module (it is read as text and injected). tools/playtest/browser/scripts.mjs loads it; test/playtest/page-scripts
 * checks that it parses and, in a real Chrome, that it collects.
 */
(() => {
  if (window.__pt) return;
  const pt = (window.__pt = { events: [], mutations: 0, requests: 0, refs: new WeakMap(), nextRef: 1, startedAt: Date.now(), windowsSeen: new Set() });
  const push = (type, data) => {
    pt.events.push({ type, t: Date.now(), ...data });
    if (pt.events.length > 3000) pt.events.splice(0, 1000);
  };
  pt.push = push;
  pt.drain = () => pt.events.splice(0);

  addEventListener("unhandledrejection", (e) => push("rejection", { message: String(e.reason?.stack ?? e.reason ?? "rejected").slice(0, 600) }));

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) push("longtask", { durationMs: Math.round(entry.duration) });
    }).observe({ entryTypes: ["longtask"] });
  } catch {
    /* long-task timing is not available everywhere */
  }

  // A cheap "did anything happen" signal for dead-click detection. Our own ref attribute is not activity.
  const observe = () => {
    try {
      new MutationObserver((records) => {
        for (const r of records) if (!(r.type === "attributes" && r.attributeName === "data-pt-ref")) pt.mutations++;
      }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    } catch {
      /* no document yet */
    }
  };
  if (document.documentElement) observe();
  else document.addEventListener("DOMContentLoaded", observe, { once: true });

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    pt.requests++;
    return originalFetch.apply(this, args);
  };

  const when = (test, then, every = 100, limit = 120000) => {
    const started = Date.now();
    const timer = setInterval(() => {
      let ok = false;
      try {
        ok = test();
      } catch {
        ok = false;
      }
      if (ok) {
        clearInterval(timer);
        try {
          then();
        } catch (error) {
          push("rig-error", { message: `page hook failed: ${error?.message ?? error}` });
        }
      } else if (Date.now() - started > limit) {
        clearInterval(timer);
      }
    }, every);
  };

  // Foundry's windows: the first render of each application id is "opened"; a close is "closed".
  when(() => window.Hooks && window.foundry?.applications?.instances, () => {
    Hooks.on("renderApplicationV2", (app) => {
      if (pt.windowsSeen.has(app.id)) return;
      pt.windowsSeen.add(app.id);
      push("window", { opened: app.id, title: String(app.title ?? app.options?.window?.title ?? "") });
    });
    Hooks.on("closeApplicationV2", (app) => {
      pt.windowsSeen.delete(app.id);
      push("window", { closed: app.id });
    });
  });

  // Foundry's own notices (the little toasts): copied into the log, then shown as usual.
  when(() => window.ui?.notifications?.info, () => {
    const n = ui.notifications;
    for (const level of ["info", "warn", "error"]) {
      const original = n[level].bind(n);
      n[level] = (...args) => {
        try {
          push("notification", { level, text: String(args[0]?.message ?? args[0] ?? "").slice(0, 400) });
        } catch {
          /* never let logging break a notice */
        }
        return original(...args);
      };
    }
  });

  // The socket: a drop mid-scene is a finding; a quick reconnect is only information.
  when(() => window.game?.socket?.io, () => {
    const io = game.socket.io;
    io.on("disconnect", (reason) => push("socket", { state: "closed", reason: String(reason) }));
    io.on("connect", () => push("socket", { state: "open" }));
    io.io?.on?.("reconnect_attempt", () => push("socket", { state: "reconnecting" }));
  });

  // Ready, for the hub to wait on and for the build stamp.
  when(() => window.game?.ready === true, () => push("ready", { user: game.user?.name ?? null, world: game.world?.id ?? null, build: game.settings?.get?.("blank-inheritance", "worldSync") ?? null }));
})();
