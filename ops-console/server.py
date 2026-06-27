import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import alerts
import config
import registry
from store import Store
from poller import Poller
from collectors.health import HealthCollector
from collectors.deploys import DeployCollector
from collectors.repo import RepoCollector

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(HERE, "static")


def register_default_collectors(cfg):
    registry.clear()
    interval = cfg.get("poll_interval_default", 30)
    cols = [
        HealthCollector(cfg["targets"], interval=interval),
        DeployCollector(cfg["repo"], interval=max(interval, 60)),
        RepoCollector(cfg["repo"], interval=max(interval, 60)),
    ]
    for c in cols:
        registry.register(c)
    return cols


def build_state(store, poller, now):
    latest = store.latest()
    checks = []
    for key, row in sorted(latest.items()):
        checks.append({
            "key": key, "label": row["label"], "state": row["state"],
            "value": row["value"], "detail": row["detail"],
            "history_key": row["history_key"], "observed_at": row["observed_at"],
        })
    overall = alerts.worst_states([c["state"] for c in checks]) if checks else "ok"
    return {
        "overall": overall,
        "banner": alerts.banner_text(overall),
        "checks": checks,
        "incidents": store.recent_incidents(20),
        "open_incidents": store.open_incidents(),
        "heartbeat": poller.last_cycle_at,
        "generated_at": now,
    }


def run_once(cfg):
    store = Store(":memory:")
    cols = register_default_collectors(cfg)
    poller = Poller(store, cols)
    now = time.time()
    poller.cycle(now)
    state = build_state(store, poller, now)
    print(json.dumps(state, indent=2))
    return 1 if state["overall"] == "crit" else 0


def serve(cfg):
    db_path = os.path.join(HERE, "data.db")
    store = Store(db_path)
    cols = register_default_collectors(cfg)
    poller = Poller(store, cols)
    interval = cfg.get("poll_interval_default", 30)

    def loop():
        while True:
            poller.cycle(time.time())
            time.sleep(interval)

    threading.Thread(target=loop, daemon=True).start()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _send(self, code, body, ctype="application/json"):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.end_headers()
            if isinstance(body, str):
                body = body.encode()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == "/" or self.path == "/index.html":
                with open(os.path.join(STATIC, "index.html"), "rb") as f:
                    return self._send(200, f.read(), "text/html")
            if self.path.startswith("/static/"):
                name = os.path.basename(self.path)
                fp = os.path.join(STATIC, name)
                if os.path.isfile(fp):
                    ctype = "text/css" if name.endswith(".css") else "application/javascript"
                    with open(fp, "rb") as f:
                        return self._send(200, f.read(), ctype)
                return self._send(404, b"not found", "text/plain")
            if self.path == "/api/state":
                return self._send(200, json.dumps(build_state(store, poller, time.time())))
            if self.path == "/events":
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                try:
                    while True:
                        payload = json.dumps(build_state(store, poller, time.time()))
                        self.wfile.write(f"data: {payload}\n\n".encode())
                        self.wfile.flush()
                        time.sleep(3)
                except (BrokenPipeError, ConnectionResetError):
                    return
            return self._send(404, b"not found", "text/plain")

    httpd = ThreadingHTTPServer((cfg["host"], cfg["port"]), Handler)
    print(f"Ops Console on http://{cfg['host']}:{cfg['port']}")
    httpd.serve_forever()


def main():
    cfg = config.load_config(os.path.join(HERE, "config.json"))
    errs = config.validate_config(cfg)
    if errs:
        for e in errs:
            print(f"CONFIG ERROR: {e}", file=sys.stderr)
        sys.exit(2)
    if "--once" in sys.argv:
        sys.exit(run_once(cfg))
    serve(cfg)


if __name__ == "__main__":
    main()
