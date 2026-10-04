"""Static server for the module preview pages (tools/induction-terminal/preview.html,
tools/induction-agreement/preview.html). Serves the repo root with caching disabled, so an edited
module file shows up on the next reload instead of a stale cached copy.

    python tools/induction-terminal/serve.py [port]    (default 4190; binds 127.0.0.1 only)
"""
import http.server
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript", ".js": "text/javascript"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # quiet: only errors
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


class Server(http.server.ThreadingHTTPServer):
    # A page that imports sixty modules opens a burst of connections at once; the default backlog of five makes Windows
    # refuse one of them now and then (about one page in ten, seen 2026-10-04), and a module that fails to load kills the page.
    request_queue_size = 128


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4190
    Server(("127.0.0.1", port), NoCacheHandler).serve_forever()
