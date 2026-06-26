from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone


SEED_NOTES = [
    {
        "id": "seed-1",
        "body": "Welcome to Level 3. Configure Supabase env vars for live persistence.",
        "created_at": "2026-01-01T12:00:00+00:00",
    },
    {
        "id": "seed-2",
        "body": "Until then, notes you add are stored in your browser only (demo mode).",
        "created_at": "2026-01-02T12:00:00+00:00",
    },
]


def supabase_configured():
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_ANON_KEY"))


def supabase_request(method, path, body=None):
    url = os.environ["SUPABASE_URL"].rstrip("/") + path
    headers = {
        "apikey": os.environ["SUPABASE_ANON_KEY"],
        "Authorization": "Bearer " + os.environ["SUPABASE_ANON_KEY"],
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if method == "POST":
        headers["Prefer"] = "return=representation"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        mode = "live" if supabase_configured() else "demo"
        if mode == "demo":
            self._json(200, {"mode": mode, "notes": SEED_NOTES})
            return
        try:
            rows = supabase_request(
                "GET",
                "/rest/v1/level3_notes?select=id,body,created_at&order=created_at.desc&limit=50",
            )
            self._json(200, {"mode": mode, "notes": rows})
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as err:
            self._json(502, {"mode": mode, "error": str(err), "notes": SEED_NOTES})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._json(400, {"error": "Invalid JSON body"})
            return

        body = (data.get("body") or "").strip()
        if not body:
            self._json(422, {"error": "body is required"})
            return
        if len(body) > 1000:
            self._json(422, {"error": "body must be 1000 characters or fewer"})
            return

        if not supabase_configured():
            note = {
                "id": "demo-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"),
                "body": body,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            self._json(201, {"mode": "demo", "note": note, "persisted": False})
            return

        try:
            rows = supabase_request(
                "POST",
                "/rest/v1/level3_notes",
                {"body": body},
            )
            note = rows[0] if isinstance(rows, list) and rows else rows
            self._json(201, {"mode": "live", "note": note, "persisted": True})
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as err:
            self._json(502, {"mode": "live", "error": str(err), "persisted": False})
