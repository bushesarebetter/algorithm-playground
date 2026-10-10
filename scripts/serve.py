"""Preview this site's runtime files locally, with JavaScript MIME types on Windows."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


RUNTIME = {"index.html", "styles.css", "app.mjs", "visuals.mjs",
           "playground/index.html", "playground/playground.css", "playground/playground.mjs",
           "playground/random.mjs", "playground/maze.mjs", "playground/boids.mjs",
           "playground/connect4.mjs", "playground/connect4-worker.mjs", ".nojekyll"}
ASSET_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ttf", ".otf", ".woff", ".woff2"}
EXCLUDED = {"node_modules", "mocks", "reports", "private", "tests", "scripts"}


class SiteHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript", ".js": "text/javascript",
                      ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2"}

    def send_head(self):
        raw = unquote(urlsplit(self.path).path)
        if "\\" in raw or "\x00" in raw:
            self.send_error(404)
            return None
        root = Path(self.directory).resolve()
        candidate = (root / raw.lstrip("/")).resolve()
        if not candidate.is_relative_to(root):
            self.send_error(404)
            return None
        relative = candidate.relative_to(root).as_posix()
        if candidate.is_dir() and relative in (".", "playground"):
            return super().send_head()
        parts = Path(relative).parts
        allowed_asset = (parts and parts[0] == "assets"
                         and not any(part.startswith(".") or part.lower() in EXCLUDED for part in parts)
                         and (candidate.suffix.lower() in ASSET_EXTENSIONS
                              or relative in ("assets/fourier.json", "assets/fonts/OFL.txt")))
        if relative not in RUNTIME and not allowed_asset:
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404, "Directory listing is disabled")
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--dist", action="store_true", help="serve the packaged dist folder instead of source")
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("port must be between 0 and 65535")
    root = Path(__file__).resolve().parents[1]
    if args.dist:
        root = root / "dist"
        if not (root / "index.html").is_file():
            parser.error("dist/index.html is missing; run npm run build first")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(SiteHandler, directory=str(root)))
    print(f"Preview: http://127.0.0.1:{server.server_port}/ (serving {'dist' if args.dist else 'source'} runtime files)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
