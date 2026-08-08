#!/usr/bin/env python3
"""Static server + auto-save for road editors."""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
POINTS_FULL = ROOT / "way-road-points.json"
POINTS_NO_VILLA = ROOT / "way-road-points-no-villa.json"
ALLOWED = {
    "full": POINTS_FULL,
    "no-villa": POINTS_NO_VILLA,
}
PORT = int(os.environ.get("PORT", "8765"))
HOST = os.environ.get("HOST", "0.0.0.0")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        path = urlparse(self.path).path
        if path.endswith((".json", ".js", ".css", ".html")):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/road-points":
            self.send_error(404, "Not found")
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
            if not isinstance(data, dict) or "start" not in data or "segments" not in data:
                raise ValueError("Invalid road points payload")

            qs = parse_qs(parsed.query)
            variant = (
                data.get("variant")
                or (qs.get("variant") or ["full"])[0]
                or "full"
            )
            variant = str(variant).strip().lower()
            if variant in ("no_villa", "novilla"):
                variant = "no-villa"
            target = ALLOWED.get(variant)
            if target is None:
                raise ValueError("Unknown variant (use full or no-villa)")

            payload = {k: v for k, v in data.items() if k != "variant"}
            payload["variant"] = variant
            text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
            target.write_text(text, encoding="utf-8")
        except Exception as exc:  # noqa: BLE001
            body = json.dumps({"ok": False, "error": str(exc)}).encode("utf-8")
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        body = json.dumps({"ok": True, "file": target.name, "variant": variant}).encode(
            "utf-8"
        )
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def main():
    os.chdir(ROOT)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Serving {ROOT}")
    print(f"Invite:              http://127.0.0.1:{PORT}/")
    print(f"Invite (no villa):   http://127.0.0.1:{PORT}/?no-villa=1")
    print(f"Road editor:         http://127.0.0.1:{PORT}/road-editor.html")
    print(f"Road editor no-villa:http://127.0.0.1:{PORT}/road-editor.html?no-villa=1")
    print(f"Saving full → {POINTS_FULL.name}")
    print(f"Saving short → {POINTS_NO_VILLA.name}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
