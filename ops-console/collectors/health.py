import math
import ssl
import socket
import time
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlparse

from model import CheckResult, OK, WARN, CRIT, UNKNOWN


def classify_http(target, status, body, latency_ms, latency_warn_ms=1500.0):
    expect = target.get("expect_status", 200)
    if status != expect:
        return CRIT, f"HTTP {status} (expected {expect})"
    contains = target.get("expect_contains")
    if contains and contains not in body:
        return CRIT, f"content missing '{contains}'"
    if latency_ms > latency_warn_ms:
        return WARN, f"slow {int(latency_ms)}ms"
    return OK, f"HTTP {status} in {int(latency_ms)}ms"


def cert_days_remaining(not_after_epoch, now_epoch):
    return math.floor((not_after_epoch - now_epoch) / 86400)


def classify_cert(days):
    if days < 0:
        return CRIT, f"cert expired {abs(days)}d ago"
    if days < 14:
        return WARN, f"cert expires in {days}d"
    return OK, f"cert OK ({days}d)"


def _default_fetch(url):
    start = time.perf_counter()
    req = urllib.request.Request(url, headers={"User-Agent": "ops-console"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read(4096).decode("utf-8", "replace")
            status = resp.status
    except urllib.error.HTTPError as e:
        body, status = "", e.code
    latency_ms = (time.perf_counter() - start) * 1000.0
    return status, body, latency_ms


def _default_cert_probe(host):
    ctx = ssl.create_default_context()
    with socket.create_connection((host, 443), timeout=10) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as ssock:
            cert = ssock.getpeercert()
    not_after = cert["notAfter"]
    dt = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    return dt.timestamp()


class HealthCollector:
    key = "health"

    def __init__(self, targets, now=time.time, interval=30,
                 fetch=_default_fetch, cert_probe=_default_cert_probe):
        self.targets = targets
        self.now = now
        self.interval = interval
        self.fetch = fetch
        self.cert_probe = cert_probe

    def run(self):
        results = []
        observed = self.now()
        for t in self.targets:
            name = t["name"]
            key = f"health.{name}"
            try:
                status, body, latency_ms = self.fetch(t["url"])
                state, detail = classify_http(t, status, body, latency_ms)
                results.append(CheckResult(
                    key=key, label=name, state=state, value=latency_ms,
                    detail=detail, observed_at=observed,
                    history_key=f"{key}.latency", meta={"url": t["url"], "status": status}))
            except Exception as e:  # network/dns/timeout — degrade this check only
                results.append(CheckResult(
                    key=key, label=name, state=CRIT, value=None,
                    detail=f"unreachable: {e}", observed_at=observed,
                    history_key=f"{key}.latency", meta={"url": t["url"]}))
        # one cert check for the primary site host
        host = urlparse(self.targets[0]["url"]).hostname if self.targets else None
        if host:
            try:
                days = cert_days_remaining(self.cert_probe(host), observed)
                state, detail = classify_cert(days)
                results.append(CheckResult(
                    key="health.cert", label="TLS cert", state=state, value=float(days),
                    detail=detail, observed_at=observed, history_key="health.cert.days",
                    meta={"host": host}))
            except Exception as e:
                results.append(CheckResult(
                    key="health.cert", label="TLS cert", state=UNKNOWN,
                    detail=f"cert check failed: {e}", observed_at=observed))
        return results
