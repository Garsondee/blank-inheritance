"""Static dev server for the UI prototypes, with caching turned OFF.

Why this exists rather than `python -m http.server`: the default handler sends
Last-Modified and the browser then serves the stylesheets from cache across
reloads. Editing bi-components.css and refreshing showed the OLD css, which
cost several rounds of chasing a layout bug that had already been fixed — and
would do exactly the same to anyone else iterating on these files.

Serves the repo root so the prototypes can reach ../../module/... .

    python design/ui/serve.py [port]        # default 4175
    http://localhost:4175/design/ui/style-prototype.html
    http://localhost:4175/design/ui/foundry-harness.html
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_response(self, code, message=None):
        # Never let a conditional request short-circuit to a cached copy.
        super().send_response(code, message)

    def log_message(self, fmt, *args):
        # Quiet: one line per asset drowns out anything worth seeing.
        if not str(args[1] if len(args) > 1 else "").startswith("200"):
            super().log_message(fmt, *args)


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4175
    handler = partial(NoCacheHandler, directory=str(REPO))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"serving {REPO} at http://localhost:{port}  (no-cache)")
        print(f"  http://localhost:{port}/design/ui/style-prototype.html")
        print(f"  http://localhost:{port}/design/ui/foundry-harness.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
