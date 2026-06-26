from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime, timezone


class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        body = {
            "level": 2,
            "label": "Edge",
            "endpoint": "/api/level-2/echo",
            "methods": ["GET", "POST"],
            "region": os.environ.get("VERCEL_REGION", "local"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        payload = json.dumps(body).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON body"}).encode("utf-8"))
            return

        message = (data.get("message") or "").strip()
        if not message:
            self.send_response(422)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "message is required"}).encode("utf-8"))
            return
        if len(message) > 500:
            self.send_response(422)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "message must be 500 characters or fewer"}).encode("utf-8"))
            return

        body = {
            "echo": message,
            "length": len(message),
            "receivedAt": datetime.now(timezone.utc).isoformat(),
            "region": os.environ.get("VERCEL_REGION", "local"),
            "level": 2,
        }
        payload = json.dumps(body).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(payload)
