"""Cipher Console — encoding transforms as a Vercel Python serverless function.

Standard library only (no requirements.txt). The pure `transform()` function holds
all the logic and is unit-testable with plain python3; the `handler` class is the
thin Vercel HTTP wrapper around it.
"""
from http.server import BaseHTTPRequestHandler
import base64
import binascii
import codecs
import json
import urllib.parse

OPS = ("base64", "hex", "rot13", "url")


def transform(op, mode, text):
    """Run one reversible transform. Raises ValueError/binascii.Error on bad input."""
    if op == "base64":
        if mode == "encode":
            return base64.b64encode(text.encode("utf-8")).decode("ascii")
        return base64.b64decode(text.encode("ascii"), validate=True).decode("utf-8")
    if op == "hex":
        if mode == "encode":
            return text.encode("utf-8").hex()
        return bytes.fromhex(text.strip()).decode("utf-8")
    if op == "rot13":
        return codecs.encode(text, "rot_13")  # self-inverse; mode ignored
    if op == "url":
        if mode == "encode":
            return urllib.parse.quote(text, safe="")
        return urllib.parse.unquote(text)
    raise ValueError("unknown op: %r" % op)


class handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            data = json.loads(raw or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._send(400, {"error": "invalid JSON body"})

        op = data.get("op")
        mode = data.get("mode", "encode")
        text = data.get("text", "")

        if op not in OPS:
            return self._send(400, {"error": "unknown op: %r" % op})
        if mode not in ("encode", "decode"):
            return self._send(400, {"error": "unknown mode: %r" % mode})
        if not isinstance(text, str):
            return self._send(400, {"error": "text must be a string"})

        try:
            result = transform(op, mode, text)
        except (binascii.Error, ValueError, UnicodeDecodeError) as exc:
            return self._send(400, {"error": "could not %s %s: %s" % (mode, op, exc)})
        return self._send(200, {"result": result})
