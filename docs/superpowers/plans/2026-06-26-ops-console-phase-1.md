# Ops Console — Phase 1 (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only command-center web dashboard for andraewilliams.com that shows live site health, deploy status, repo status, and an incident log, with visual alerts.

**Architecture:** A Python stdlib server bound to `127.0.0.1` serves a static tactical-themed dashboard and exposes JSON + SSE endpoints. A background poller thread runs self-registering "collectors" on intervals; each emits normalized `CheckResult`s that are recorded to sqlite (for uptime % and history) and pushed to the browser. Every observable — HTTP target, TLS cert, deploy drift, PR count — is the same `CheckResult` shape, so rendering/history/alerting are uniform.

**Tech Stack:** Python 3.14 stdlib only (`http.server`, `sqlite3`, `ssl`, `urllib`, `subprocess`, `unittest`, `dataclasses`). Static HTML/CSS/JS frontend (no framework). `gh` CLI for deploy/PR data. Tests run with `python3 -m unittest`.

## Global Constraints

- Python **stdlib only** — no `pip install`, no `requirements.txt`. (Matches the established Python-on-Vercel pattern.)
- Server binds **`127.0.0.1` only**, never `0.0.0.0` — `/api/*` shells out to `git`/`gh`, so localhost is the security boundary.
- Lives in `ops-console/` at the **repo root, outside the `_site` build** — never deployed.
- `ops-console/data.db` and `ops-console/__pycache__/` are **gitignored**.
- Default port **7878**.
- Repo slug: **`MistaJoka/andraewilliams-site`**.
- Time is read through an **injectable clock** (a `now() -> float` callable) in all logic modules — never call `time.time()` directly inside testable functions.
- Alerts are **visual only** — overall banner + browser tab-title/favicon. No OS notifications, no daemon.
- `apex` target correctly expects HTTP **308** (it redirects to www by design).
- All collector logic is split into **pure functions** (parsing/classification, unit-tested with fixtures, no network) + a **thin I/O wrapper** (not unit-tested).

---

### Task 1: Foundation — data model, registry, config

**Files:**
- Create: `ops-console/model.py`
- Create: `ops-console/registry.py`
- Create: `ops-console/config.py`
- Create: `ops-console/config.json`
- Create: `ops-console/__init__.py` (empty, makes the dir importable in tests)
- Modify: `.gitignore`
- Test: `ops-console/tests/test_model.py`, `ops-console/tests/test_registry.py`, `ops-console/tests/test_config.py`
- Create: `ops-console/tests/__init__.py` (empty)

**Interfaces:**
- Produces:
  - `model.CheckResult` dataclass with fields: `key: str`, `label: str`, `state: str`, `value: float | None = None`, `detail: str = ""`, `observed_at: str = ""`, `history_key: str | None = None`, `meta: dict = {}` (default via `field(default_factory=dict)`).
  - `model.OK = "ok"`, `model.WARN = "warn"`, `model.CRIT = "crit"`, `model.UNKNOWN = "unknown"`.
  - `model.worst(states: list[str]) -> str` — returns the most severe state present (crit > warn > unknown > ok); empty list → `OK`.
  - `registry.register(collector) -> None`, `registry.all_collectors() -> list`, `registry.clear() -> None`. A "collector" is any object with attributes `key: str`, `interval: int`, and method `run() -> list[CheckResult]`.
  - `config.load_config(path: str) -> dict`, `config.validate_config(cfg: dict) -> list[str]` (returns list of human-readable error strings; empty list = valid).

- [ ] **Step 1: Write failing tests for the model**

`ops-console/tests/test_model.py`:
```python
import unittest
from model import CheckResult, OK, WARN, CRIT, UNKNOWN, worst


class TestModel(unittest.TestCase):
    def test_checkresult_defaults(self):
        r = CheckResult(key="health.apex", label="apex", state=OK)
        self.assertEqual(r.value, None)
        self.assertEqual(r.detail, "")
        self.assertEqual(r.meta, {})
        self.assertIsNone(r.history_key)

    def test_meta_is_independent_per_instance(self):
        a = CheckResult(key="a", label="a", state=OK)
        b = CheckResult(key="b", label="b", state=OK)
        a.meta["x"] = 1
        self.assertEqual(b.meta, {})

    def test_worst_picks_most_severe(self):
        self.assertEqual(worst([OK, WARN, OK]), WARN)
        self.assertEqual(worst([OK, WARN, CRIT]), CRIT)
        self.assertEqual(worst([OK, UNKNOWN]), UNKNOWN)
        self.assertEqual(worst([]), OK)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_model -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'model'`.

- [ ] **Step 3: Implement `model.py`**

`ops-console/model.py`:
```python
from dataclasses import dataclass, field

OK = "ok"
WARN = "warn"
CRIT = "crit"
UNKNOWN = "unknown"

_SEVERITY = {OK: 0, UNKNOWN: 1, WARN: 2, CRIT: 3}


@dataclass
class CheckResult:
    key: str
    label: str
    state: str
    value: float | None = None
    detail: str = ""
    observed_at: str = ""
    history_key: str | None = None
    meta: dict = field(default_factory=dict)


def worst(states):
    if not states:
        return OK
    return max(states, key=lambda s: _SEVERITY.get(s, 0))
```

- [ ] **Step 4: Run model tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_model -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Write failing tests for the registry**

`ops-console/tests/test_registry.py`:
```python
import unittest
import registry
from model import CheckResult, OK


class FakeCollector:
    def __init__(self, key, interval=30):
        self.key = key
        self.interval = interval

    def run(self):
        return [CheckResult(key=self.key, label=self.key, state=OK)]


class TestRegistry(unittest.TestCase):
    def setUp(self):
        registry.clear()

    def test_register_and_list(self):
        c = FakeCollector("health")
        registry.register(c)
        self.assertEqual([x.key for x in registry.all_collectors()], ["health"])

    def test_clear(self):
        registry.register(FakeCollector("a"))
        registry.clear()
        self.assertEqual(registry.all_collectors(), [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 6: Run registry tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_registry -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'registry'`.

- [ ] **Step 7: Implement `registry.py`**

`ops-console/registry.py`:
```python
_collectors = []


def register(collector):
    _collectors.append(collector)


def all_collectors():
    return list(_collectors)


def clear():
    _collectors.clear()
```

- [ ] **Step 8: Run registry tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_registry -v`
Expected: PASS (2 tests).

- [ ] **Step 9: Write failing tests for config**

`ops-console/tests/test_config.py`:
```python
import json
import os
import tempfile
import unittest
import config


class TestConfig(unittest.TestCase):
    def _write(self, obj):
        fd, path = tempfile.mkstemp(suffix=".json")
        with os.fdopen(fd, "w") as f:
            json.dump(obj, f)
        self.addCleanup(os.remove, path)
        return path

    def test_load_config_reads_json(self):
        path = self._write({"repo": "a/b", "targets": []})
        cfg = config.load_config(path)
        self.assertEqual(cfg["repo"], "a/b")

    def test_validate_ok(self):
        cfg = {"repo": "a/b", "targets": [{"name": "x", "url": "https://x"}]}
        self.assertEqual(config.validate_config(cfg), [])

    def test_validate_reports_missing_repo(self):
        errs = config.validate_config({"targets": []})
        self.assertTrue(any("repo" in e for e in errs))

    def test_validate_reports_target_without_url(self):
        errs = config.validate_config({"repo": "a/b", "targets": [{"name": "x"}]})
        self.assertTrue(any("url" in e for e in errs))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 10: Run config tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_config -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'config'`.

- [ ] **Step 11: Implement `config.py`**

`ops-console/config.py`:
```python
import json


def load_config(path):
    with open(path) as f:
        return json.load(f)


def validate_config(cfg):
    errors = []
    if not cfg.get("repo"):
        errors.append("config: missing required 'repo' (e.g. owner/name)")
    targets = cfg.get("targets")
    if not isinstance(targets, list):
        errors.append("config: 'targets' must be a list")
        return errors
    for i, t in enumerate(targets):
        if not t.get("url"):
            errors.append(f"config: targets[{i}] ({t.get('name', '?')}) missing 'url'")
    return errors
```

- [ ] **Step 12: Run config tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_config -v`
Expected: PASS (4 tests).

- [ ] **Step 13: Create `config.json`, package markers, and update `.gitignore`**

`ops-console/__init__.py`: empty file.
`ops-console/tests/__init__.py`: empty file.

`ops-console/config.json`:
```json
{
  "host": "127.0.0.1",
  "port": 7878,
  "poll_interval_default": 30,
  "repo": "MistaJoka/andraewilliams-site",
  "site_origin": "https://www.andraewilliams.com",
  "targets": [
    { "name": "apex",   "url": "https://andraewilliams.com",        "expect_status": 308 },
    { "name": "www",    "url": "https://www.andraewilliams.com",    "expect_status": 200, "expect_contains": "<html" },
    { "name": "level0", "url": "https://level0.andraewilliams.com", "expect_status": 200 },
    { "name": "level1", "url": "https://level1.andraewilliams.com", "expect_status": 200 },
    { "name": "level2", "url": "https://level2.andraewilliams.com", "expect_status": 200 },
    { "name": "level3", "url": "https://level3.andraewilliams.com", "expect_status": 200 },
    { "name": "level4", "url": "https://level4.andraewilliams.com", "expect_status": 200 },
    { "name": "api-echo",  "url": "https://www.andraewilliams.com/api/level-2/echo",  "expect_status": 200 },
    { "name": "api-notes", "url": "https://www.andraewilliams.com/api/level-3/notes", "expect_status": 200 }
  ]
}
```

Append to `.gitignore` (under the `# Python` section):
```
ops-console/data.db
ops-console/__pycache__/
ops-console/**/__pycache__/
```

- [ ] **Step 14: Commit**

```bash
git add ops-console/ .gitignore
git commit -m "feat(ops-console): foundation — model, registry, config"
```

---

### Task 2: Store (sqlite history + incidents)

**Files:**
- Create: `ops-console/store.py`
- Test: `ops-console/tests/test_store.py`

**Interfaces:**
- Consumes: `model.CheckResult`.
- Produces: class `Store`:
  - `Store(path: str, now=time.time)` — `path` may be `":memory:"`; `now` is the injectable clock.
  - `.record(result: CheckResult) -> None` — inserts a sample row (uses `result.observed_at` if set, else `now()` epoch).
  - `.latest() -> dict[str, dict]` — maps `key -> {state, value, detail, observed_at, history_key, label}` for the most recent sample per key.
  - `.series(history_key: str, since_epoch: float) -> list[tuple[float, float]]` — `(epoch, value)` rows for that history_key since the cutoff, oldest first.
  - `.uptime(key: str, since_epoch: float) -> float` — percent of samples (0–100) for `key` whose state is `ok`, since cutoff; `100.0` if no samples.
  - `.open_incident(key, label, opened_at) -> None` — no-op if an unresolved incident already exists for `key`.
  - `.resolve_incident(key, resolved_at) -> None` — resolves the open incident for `key` if present.
  - `.open_incidents() -> list[dict]` — unresolved incidents: `{key, label, opened_at}`.
  - `.recent_incidents(limit: int) -> list[dict]` — most recent incidents (resolved or not), newest first: `{key, label, opened_at, resolved_at}`.

- [ ] **Step 1: Write failing tests**

`ops-console/tests/test_store.py`:
```python
import unittest
from store import Store
from model import CheckResult, OK, CRIT


class TestStore(unittest.TestCase):
    def setUp(self):
        self.t = [1000.0]
        self.store = Store(":memory:", now=lambda: self.t[0])

    def _rec(self, key, state, value=None, history_key=None):
        self.store.record(CheckResult(
            key=key, label=key.upper(), state=state, value=value, history_key=history_key))

    def test_latest_returns_most_recent_per_key(self):
        self._rec("apex", OK, value=100.0)
        self.t[0] = 1001.0
        self._rec("apex", CRIT, value=None)
        latest = self.store.latest()
        self.assertEqual(latest["apex"]["state"], CRIT)

    def test_series_filters_by_history_key_and_time(self):
        self._rec("apex", OK, value=100.0, history_key="apex.latency")
        self.t[0] = 1100.0
        self._rec("apex", OK, value=200.0, history_key="apex.latency")
        rows = self.store.series("apex.latency", since_epoch=1050.0)
        self.assertEqual(rows, [(1100.0, 200.0)])

    def test_uptime_percent(self):
        self._rec("apex", OK)
        self._rec("apex", OK)
        self._rec("apex", CRIT)
        self.assertAlmostEqual(self.store.uptime("apex", since_epoch=0), 66.6666, places=2)

    def test_uptime_no_samples_is_100(self):
        self.assertEqual(self.store.uptime("nope", since_epoch=0), 100.0)

    def test_incident_open_is_idempotent(self):
        self.store.open_incident("apex", "APEX", 1000.0)
        self.store.open_incident("apex", "APEX", 1001.0)
        self.assertEqual(len(self.store.open_incidents()), 1)

    def test_incident_resolve(self):
        self.store.open_incident("apex", "APEX", 1000.0)
        self.store.resolve_incident("apex", 1005.0)
        self.assertEqual(self.store.open_incidents(), [])
        recent = self.store.recent_incidents(10)
        self.assertEqual(recent[0]["resolved_at"], 1005.0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_store -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'store'`.

- [ ] **Step 3: Implement `store.py`**

`ops-console/store.py`:
```python
import sqlite3
import time


class Store:
    def __init__(self, path, now=time.time):
        self.now = now
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL,
                label TEXT,
                state TEXT NOT NULL,
                value REAL,
                detail TEXT,
                history_key TEXT,
                observed_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_samples_key ON samples(key, id);
            CREATE INDEX IF NOT EXISTS idx_samples_hist ON samples(history_key, observed_at);
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL,
                label TEXT,
                opened_at REAL NOT NULL,
                resolved_at REAL
            );
            """
        )
        self.conn.commit()

    def record(self, result):
        observed = result.observed_at if isinstance(result.observed_at, (int, float)) else self.now()
        self.conn.execute(
            "INSERT INTO samples (key,label,state,value,detail,history_key,observed_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (result.key, result.label, result.state, result.value,
             result.detail, result.history_key, observed),
        )
        self.conn.commit()

    def latest(self):
        rows = self.conn.execute(
            "SELECT s.* FROM samples s JOIN ("
            "  SELECT key, MAX(id) AS mid FROM samples GROUP BY key"
            ") m ON s.id = m.mid"
        ).fetchall()
        return {
            r["key"]: {
                "state": r["state"], "value": r["value"], "detail": r["detail"],
                "observed_at": r["observed_at"], "history_key": r["history_key"],
                "label": r["label"],
            }
            for r in rows
        }

    def series(self, history_key, since_epoch):
        rows = self.conn.execute(
            "SELECT observed_at, value FROM samples"
            " WHERE history_key=? AND observed_at>=? AND value IS NOT NULL"
            " ORDER BY observed_at ASC",
            (history_key, since_epoch),
        ).fetchall()
        return [(r["observed_at"], r["value"]) for r in rows]

    def uptime(self, key, since_epoch):
        row = self.conn.execute(
            "SELECT COUNT(*) AS total, SUM(state='ok') AS ok FROM samples"
            " WHERE key=? AND observed_at>=?",
            (key, since_epoch),
        ).fetchone()
        if not row["total"]:
            return 100.0
        return (row["ok"] or 0) / row["total"] * 100.0

    def open_incident(self, key, label, opened_at):
        existing = self.conn.execute(
            "SELECT id FROM incidents WHERE key=? AND resolved_at IS NULL", (key,)
        ).fetchone()
        if existing:
            return
        self.conn.execute(
            "INSERT INTO incidents (key,label,opened_at) VALUES (?,?,?)",
            (key, label, opened_at),
        )
        self.conn.commit()

    def resolve_incident(self, key, resolved_at):
        self.conn.execute(
            "UPDATE incidents SET resolved_at=? WHERE key=? AND resolved_at IS NULL",
            (resolved_at, key),
        )
        self.conn.commit()

    def open_incidents(self):
        rows = self.conn.execute(
            "SELECT key,label,opened_at FROM incidents WHERE resolved_at IS NULL"
            " ORDER BY opened_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def recent_incidents(self, limit):
        rows = self.conn.execute(
            "SELECT key,label,opened_at,resolved_at FROM incidents"
            " ORDER BY opened_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_store -v`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add ops-console/store.py ops-console/tests/test_store.py
git commit -m "feat(ops-console): sqlite store for history and incidents"
```

---

### Task 3: Health collector

**Files:**
- Create: `ops-console/collectors/__init__.py` (empty)
- Create: `ops-console/collectors/health.py`
- Test: `ops-console/tests/test_health.py`

**Interfaces:**
- Consumes: `model.CheckResult`, config `targets`.
- Produces:
  - `health.classify_http(target: dict, status: int, body: str, latency_ms: float, latency_warn_ms: float = 1500.0) -> tuple[str, str]` — pure. Returns `(state, detail)`. Logic: if `status != target.get("expect_status", 200)` → `(CRIT, "...")`; elif `expect_contains` set and not in `body` → `(CRIT, "content mismatch")`; elif `latency_ms > latency_warn_ms` → `(WARN, "slow")`; else `(OK, "...")`.
  - `health.cert_days_remaining(not_after_epoch: float, now_epoch: float) -> int` — pure; `floor((not_after - now) / 86400)`.
  - `health.classify_cert(days: int) -> tuple[str, str]` — pure; `<0`→CRIT expired, `<14`→WARN, else OK.
  - `health.HealthCollector(targets: list[dict], now=time.time, fetch=<default>, cert_probe=<default>)` with `key="health"`, `interval` (default 30), `.run() -> list[CheckResult]`. `fetch(url) -> (status, body, latency_ms)` and `cert_probe(host) -> not_after_epoch` are injectable for tests.

- [ ] **Step 1: Write failing tests**

`ops-console/tests/test_health.py`:
```python
import unittest
from collectors import health
from model import OK, WARN, CRIT


class TestClassifyHttp(unittest.TestCase):
    def test_apex_308_is_ok(self):
        state, _ = health.classify_http({"expect_status": 308}, 308, "", 50.0)
        self.assertEqual(state, OK)

    def test_unexpected_status_is_crit(self):
        state, _ = health.classify_http({"expect_status": 200}, 500, "", 50.0)
        self.assertEqual(state, CRIT)

    def test_content_mismatch_is_crit(self):
        state, _ = health.classify_http(
            {"expect_status": 200, "expect_contains": "<html"}, 200, "nope", 50.0)
        self.assertEqual(state, CRIT)

    def test_slow_is_warn(self):
        state, _ = health.classify_http({"expect_status": 200}, 200, "", 9000.0)
        self.assertEqual(state, WARN)


class TestCert(unittest.TestCase):
    def test_days_remaining(self):
        self.assertEqual(health.cert_days_remaining(1000.0 + 86400 * 10, 1000.0), 10)

    def test_classify_cert(self):
        self.assertEqual(health.classify_cert(-1)[0], CRIT)
        self.assertEqual(health.classify_cert(5)[0], WARN)
        self.assertEqual(health.classify_cert(60)[0], OK)


class TestHealthCollector(unittest.TestCase):
    def test_run_emits_one_result_per_target(self):
        targets = [{"name": "www", "url": "https://www.example.com", "expect_status": 200}]
        c = health.HealthCollector(
            targets,
            now=lambda: 1000.0,
            fetch=lambda url: (200, "<html>", 42.0),
            cert_probe=lambda host: 1000.0 + 86400 * 30,
        )
        results = c.run()
        keys = {r.key for r in results}
        self.assertIn("health.www", keys)
        www = next(r for r in results if r.key == "health.www")
        self.assertEqual(www.state, OK)
        self.assertEqual(www.value, 42.0)
        self.assertEqual(www.history_key, "health.www.latency")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_health -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'collectors'`.

- [ ] **Step 3: Implement `collectors/health.py`**

`ops-console/collectors/health.py`:
```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_health -v`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add ops-console/collectors/ ops-console/tests/test_health.py
git commit -m "feat(ops-console): health collector — HTTP checks + TLS cert"
```

---

### Task 4: Deploys collector

**Files:**
- Create: `ops-console/collectors/deploys.py`
- Test: `ops-console/tests/test_deploys.py`
- Create: `ops-console/tests/fixtures/commit_status_success.json`
- Create: `ops-console/tests/fixtures/commit_status_pending.json`

**Interfaces:**
- Consumes: `model.CheckResult`.
- Produces:
  - `deploys.map_status(combined_state: str) -> str` — pure; maps GitHub combined status (`"success"`→OK, `"pending"`→WARN, `"failure"`/`"error"`→CRIT, else UNKNOWN).
  - `deploys.classify_drift(ahead_count: int) -> tuple[str, str]` — pure; `0`→OK "in sync", `>0`→WARN "N ahead of deploy".
  - `deploys.DeployCollector(repo: str, now=time.time, interval=60, gh=<default>, git=<default>)` with `key="deploys"`, `.run() -> list[CheckResult]`. `gh(args: list[str]) -> str` runs `gh` and returns stdout; `git(args: list[str]) -> str` runs `git`. Both injectable.

- [ ] **Step 1: Create fixtures**

`ops-console/tests/fixtures/commit_status_success.json`:
```json
{ "state": "success", "sha": "abc123", "total_count": 1,
  "statuses": [ { "context": "vercel", "state": "success", "target_url": "https://vercel.com/x" } ] }
```

`ops-console/tests/fixtures/commit_status_pending.json`:
```json
{ "state": "pending", "sha": "def456", "total_count": 1,
  "statuses": [ { "context": "vercel", "state": "pending", "target_url": "https://vercel.com/y" } ] }
```

- [ ] **Step 2: Write failing tests**

`ops-console/tests/test_deploys.py`:
```python
import json
import os
import unittest
from collectors import deploys
from model import OK, WARN, CRIT

FIX = os.path.join(os.path.dirname(__file__), "fixtures")


class TestDeploys(unittest.TestCase):
    def test_map_status(self):
        self.assertEqual(deploys.map_status("success"), OK)
        self.assertEqual(deploys.map_status("pending"), WARN)
        self.assertEqual(deploys.map_status("failure"), CRIT)
        self.assertEqual(deploys.map_status("error"), CRIT)

    def test_classify_drift(self):
        self.assertEqual(deploys.classify_drift(0)[0], OK)
        self.assertEqual(deploys.classify_drift(3)[0], WARN)

    def test_run_uses_injected_gh_and_git(self):
        with open(os.path.join(FIX, "commit_status_success.json")) as f:
            status_json = f.read()

        def fake_gh(args):
            return status_json

        def fake_git(args):
            if args[:2] == ["rev-parse", "HEAD"]:
                return "abc123\n"
            if args[0] == "rev-list":
                return "0\n"
            return ""

        c = deploys.DeployCollector("o/r", now=lambda: 1000.0, gh=fake_gh, git=fake_git)
        results = c.run()
        latest = next(r for r in results if r.key == "deploys.latest")
        self.assertEqual(latest.state, OK)
        drift = next(r for r in results if r.key == "deploys.drift")
        self.assertEqual(drift.state, OK)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_deploys -v`
Expected: FAIL with `ImportError`/`AttributeError` (module/functions missing).

- [ ] **Step 4: Implement `collectors/deploys.py`**

`ops-console/collectors/deploys.py`:
```python
import json
import subprocess
import time

from model import CheckResult, OK, WARN, CRIT, UNKNOWN


def map_status(combined_state):
    return {
        "success": OK,
        "pending": WARN,
        "failure": CRIT,
        "error": CRIT,
    }.get(combined_state, UNKNOWN)


def classify_drift(ahead_count):
    if ahead_count == 0:
        return OK, "production in sync with main"
    return WARN, f"main is {ahead_count} commit(s) ahead of last deploy"


def _default_gh(args):
    return subprocess.run(["gh", *args], capture_output=True, text=True,
                          check=True, timeout=15).stdout


def _default_git(args):
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          check=True, timeout=15).stdout


class DeployCollector:
    key = "deploys"

    def __init__(self, repo, now=time.time, interval=60,
                 gh=_default_gh, git=_default_git):
        self.repo = repo
        self.now = now
        self.interval = interval
        self.gh = gh
        self.git = git

    def run(self):
        observed = self.now()
        results = []
        try:
            head = self.git(["rev-parse", "HEAD"]).strip()
            status = json.loads(self.gh(["api", f"repos/{self.repo}/commits/{head}/status"]))
            state = map_status(status.get("state", "unknown"))
            results.append(CheckResult(
                key="deploys.latest", label="latest deploy", state=state,
                detail=f"{head[:7]}: {status.get('state', '?')}", observed_at=observed,
                meta={"sha": head, "statuses": status.get("statuses", [])}))
        except Exception as e:
            results.append(CheckResult(
                key="deploys.latest", label="latest deploy", state=UNKNOWN,
                detail=f"unavailable: {e}", observed_at=observed))
        try:
            ahead = int(self.git(["rev-list", "--count", "origin/main...HEAD"]).strip() or "0")
            d_state, d_detail = classify_drift(ahead)
            results.append(CheckResult(
                key="deploys.drift", label="deploy drift", state=d_state,
                value=float(ahead), detail=d_detail, observed_at=observed,
                history_key="deploys.drift.count"))
        except Exception as e:
            results.append(CheckResult(
                key="deploys.drift", label="deploy drift", state=UNKNOWN,
                detail=f"unavailable: {e}", observed_at=observed))
        return results
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_deploys -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add ops-console/collectors/deploys.py ops-console/tests/test_deploys.py ops-console/tests/fixtures/
git commit -m "feat(ops-console): deploys collector — commit status + drift"
```

---

### Task 5: Repo collector

**Files:**
- Create: `ops-console/collectors/repo.py`
- Test: `ops-console/tests/test_repo.py`
- Create: `ops-console/tests/fixtures/pr_list.json`

**Interfaces:**
- Consumes: `model.CheckResult`.
- Produces:
  - `repo.parse_branch(porcelain: str) -> tuple[str, bool]` — pure; from `git status --porcelain=v2 --branch` output returns `(branch_name, is_dirty)`. `is_dirty` is `True` if any non-header line exists.
  - `repo.parse_prs(pr_json: str) -> list[dict]` — pure; parses `gh pr list --json number,title,author,isDraft` output into `[{number, title, author, dependabot}]` where `dependabot` is `True` when author login is `app/dependabot` or `dependabot`.
  - `repo.RepoCollector(repo: str, now=time.time, interval=60, gh=<default>, git=<default>)` with `key="repo"`, `.run() -> list[CheckResult]` emitting `repo.branch` (OK, detail = branch + clean/dirty) and `repo.prs` (OK, value = open PR count, detail names dependabot count; WARN never — informational).

- [ ] **Step 1: Create fixture**

`ops-console/tests/fixtures/pr_list.json`:
```json
[
  { "number": 8, "title": "bump vite", "author": { "login": "app/dependabot" }, "isDraft": false },
  { "number": 12, "title": "new tool", "author": { "login": "MistaJoka" }, "isDraft": false }
]
```

- [ ] **Step 2: Write failing tests**

`ops-console/tests/test_repo.py`:
```python
import os
import unittest
from collectors import repo
from model import OK

FIX = os.path.join(os.path.dirname(__file__), "fixtures")


class TestRepo(unittest.TestCase):
    def test_parse_branch_clean(self):
        out = "# branch.oid abc\n# branch.head main\n"
        branch, dirty = repo.parse_branch(out)
        self.assertEqual(branch, "main")
        self.assertFalse(dirty)

    def test_parse_branch_dirty(self):
        out = "# branch.head main\n1 .M N... 100644 100644 100644 aaa bbb file.py\n"
        branch, dirty = repo.parse_branch(out)
        self.assertTrue(dirty)

    def test_parse_prs_flags_dependabot(self):
        with open(os.path.join(FIX, "pr_list.json")) as f:
            prs = repo.parse_prs(f.read())
        self.assertEqual(len(prs), 2)
        bot = next(p for p in prs if p["number"] == 8)
        self.assertTrue(bot["dependabot"])

    def test_run_emits_branch_and_prs(self):
        with open(os.path.join(FIX, "pr_list.json")) as f:
            pr_json = f.read()
        c = repo.RepoCollector(
            "o/r", now=lambda: 1000.0,
            gh=lambda args: pr_json,
            git=lambda args: "# branch.head main\n")
        results = c.run()
        prs = next(r for r in results if r.key == "repo.prs")
        self.assertEqual(prs.value, 2.0)
        self.assertEqual(prs.state, OK)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_repo -v`
Expected: FAIL with `ImportError`/`AttributeError`.

- [ ] **Step 4: Implement `collectors/repo.py`**

`ops-console/collectors/repo.py`:
```python
import json
import subprocess
import time

from model import CheckResult, OK, UNKNOWN


def parse_branch(porcelain):
    branch = "?"
    dirty = False
    for line in porcelain.splitlines():
        if line.startswith("# branch.head "):
            branch = line.split(" ", 2)[2].strip()
        elif line and not line.startswith("#"):
            dirty = True
    return branch, dirty


def parse_prs(pr_json):
    out = []
    for p in json.loads(pr_json):
        login = (p.get("author") or {}).get("login", "")
        out.append({
            "number": p["number"],
            "title": p["title"],
            "author": login,
            "dependabot": "dependabot" in login.lower(),
        })
    return out


def _default_gh(args):
    return subprocess.run(["gh", *args], capture_output=True, text=True,
                          check=True, timeout=15).stdout


def _default_git(args):
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          check=True, timeout=15).stdout


class RepoCollector:
    key = "repo"

    def __init__(self, repo, now=time.time, interval=60, gh=_default_gh, git=_default_git):
        self.repo = repo
        self.now = now
        self.interval = interval
        self.gh = gh
        self.git = git

    def run(self):
        observed = self.now()
        results = []
        try:
            branch, dirty = parse_branch(self.git(["status", "--porcelain=v2", "--branch"]))
            results.append(CheckResult(
                key="repo.branch", label="branch", state=OK,
                detail=f"{branch} ({'dirty' if dirty else 'clean'})",
                observed_at=observed, meta={"branch": branch, "dirty": dirty}))
        except Exception as e:
            results.append(CheckResult(
                key="repo.branch", label="branch", state=UNKNOWN,
                detail=f"unavailable: {e}", observed_at=observed))
        try:
            prs = parse_prs(self.gh(["pr", "list", "--json", "number,title,author,isDraft"]))
            bots = sum(1 for p in prs if p["dependabot"])
            results.append(CheckResult(
                key="repo.prs", label="open PRs", state=OK, value=float(len(prs)),
                detail=f"{len(prs)} open ({bots} dependabot)", observed_at=observed,
                history_key="repo.prs.count", meta={"prs": prs}))
        except Exception as e:
            results.append(CheckResult(
                key="repo.prs", label="open PRs", state=UNKNOWN,
                detail=f"unavailable: {e}", observed_at=observed))
        return results
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_repo -v`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add ops-console/collectors/repo.py ops-console/tests/test_repo.py ops-console/tests/fixtures/pr_list.json
git commit -m "feat(ops-console): repo collector — branch state + open PRs"
```

---

### Task 6: Alerts engine

**Files:**
- Create: `ops-console/alerts.py`
- Test: `ops-console/tests/test_alerts.py`

**Interfaces:**
- Consumes: `model.CheckResult`, `model.worst`, `store.Store`.
- Produces:
  - `alerts.overall_state(results: list[CheckResult]) -> str` — `model.worst` of all states.
  - `alerts.banner_text(state: str) -> str` — `OK`→"ALL SYSTEMS NOMINAL", `WARN`→"DEGRADED — WARNINGS", `CRIT`→"DEGRADED — CRITICAL", `UNKNOWN`→"PARTIAL TELEMETRY".
  - `alerts.reconcile_incidents(store, results: list[CheckResult], now: float) -> None` — for each result: if `state == CRIT` → `store.open_incident(key, label, now)`; if `state == OK` → `store.resolve_incident(key, now)`. (WARN/UNKNOWN leave incidents unchanged.)

- [ ] **Step 1: Write failing tests**

`ops-console/tests/test_alerts.py`:
```python
import unittest
import alerts
from store import Store
from model import CheckResult, OK, WARN, CRIT


def r(key, state):
    return CheckResult(key=key, label=key, state=state)


class TestAlerts(unittest.TestCase):
    def test_overall_state(self):
        self.assertEqual(alerts.overall_state([r("a", OK), r("b", WARN)]), WARN)
        self.assertEqual(alerts.overall_state([r("a", OK), r("b", CRIT)]), CRIT)

    def test_banner_text(self):
        self.assertIn("NOMINAL", alerts.banner_text(OK))
        self.assertIn("CRITICAL", alerts.banner_text(CRIT))

    def test_reconcile_opens_and_resolves(self):
        store = Store(":memory:", now=lambda: 1000.0)
        alerts.reconcile_incidents(store, [r("health.www", CRIT)], 1000.0)
        self.assertEqual(len(store.open_incidents()), 1)
        alerts.reconcile_incidents(store, [r("health.www", OK)], 1005.0)
        self.assertEqual(store.open_incidents(), [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_alerts -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'alerts'`.

- [ ] **Step 3: Implement `alerts.py`**

`ops-console/alerts.py`:
```python
from model import worst, OK, WARN, CRIT, UNKNOWN

_BANNER = {
    OK: "ALL SYSTEMS NOMINAL",
    WARN: "DEGRADED — WARNINGS",
    CRIT: "DEGRADED — CRITICAL",
    UNKNOWN: "PARTIAL TELEMETRY",
}


def overall_state(results):
    return worst([r.state for r in results])


def banner_text(state):
    return _BANNER.get(state, "UNKNOWN")


def reconcile_incidents(store, results, now):
    for r in results:
        if r.state == CRIT:
            store.open_incident(r.key, r.label, now)
        elif r.state == OK:
            store.resolve_incident(r.key, now)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_alerts -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add ops-console/alerts.py ops-console/tests/test_alerts.py
git commit -m "feat(ops-console): alerts engine — overall state + incident reconcile"
```

---

### Task 7: Poller

**Files:**
- Create: `ops-console/poller.py`
- Test: `ops-console/tests/test_poller.py`

**Interfaces:**
- Consumes: `store.Store`, `alerts`, `registry`, `model.CheckResult`.
- Produces:
  - `poller.Poller(store, collectors, now=time.time)`:
    - `.due(now: float) -> list` — collectors whose `interval` has elapsed since their last run (always due on first call). Tracks last-run per collector internally.
    - `.cycle(now: float) -> list[CheckResult]` — runs all due collectors, records each result to the store, reconciles incidents, updates last-run, and updates `.last_cycle_at`. Returns the results produced this cycle.
    - `.last_cycle_at: float | None` — heartbeat for self-monitoring.

- [ ] **Step 1: Write failing tests**

`ops-console/tests/test_poller.py`:
```python
import unittest
from poller import Poller
from store import Store
from model import CheckResult, OK, CRIT


class FakeCollector:
    def __init__(self, key, interval, results):
        self.key = key
        self.interval = interval
        self._results = results
        self.runs = 0

    def run(self):
        self.runs += 1
        return self._results


class TestPoller(unittest.TestCase):
    def test_cycle_records_and_sets_heartbeat(self):
        store = Store(":memory:", now=lambda: 1000.0)
        c = FakeCollector("h", 30, [CheckResult(key="h.x", label="x", state=OK, value=1.0)])
        p = Poller(store, [c], now=lambda: 1000.0)
        produced = p.cycle(1000.0)
        self.assertEqual(len(produced), 1)
        self.assertEqual(p.last_cycle_at, 1000.0)
        self.assertIn("h.x", store.latest())

    def test_due_respects_interval(self):
        store = Store(":memory:", now=lambda: 0.0)
        c = FakeCollector("h", 30, [])
        p = Poller(store, [c], now=lambda: 0.0)
        p.cycle(1000.0)            # first run
        self.assertEqual(p.due(1010.0), [])      # 10s later, interval 30 -> not due
        self.assertEqual(p.due(1031.0), [c])     # 31s later -> due

    def test_cycle_opens_incident_on_crit(self):
        store = Store(":memory:", now=lambda: 1000.0)
        c = FakeCollector("h", 30, [CheckResult(key="h.x", label="x", state=CRIT)])
        p = Poller(store, [c], now=lambda: 1000.0)
        p.cycle(1000.0)
        self.assertEqual(len(store.open_incidents()), 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_poller -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'poller'`.

- [ ] **Step 3: Implement `poller.py`**

`ops-console/poller.py`:
```python
import time

import alerts


class Poller:
    def __init__(self, store, collectors, now=time.time):
        self.store = store
        self.collectors = collectors
        self.now = now
        self._last_run = {}
        self.last_cycle_at = None

    def due(self, now):
        ready = []
        for c in self.collectors:
            last = self._last_run.get(c.key)
            if last is None or (now - last) >= c.interval:
                ready.append(c)
        return ready

    def cycle(self, now):
        produced = []
        for c in self.due(now):
            try:
                results = c.run()
            except Exception:
                results = []
            for r in results:
                self.store.record(r)
            alerts.reconcile_incidents(self.store, results, now)
            self._last_run[c.key] = now
            produced.extend(results)
        self.last_cycle_at = now
        return produced
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_poller -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add ops-console/poller.py ops-console/tests/test_poller.py
git commit -m "feat(ops-console): poller — interval scheduling + cycle"
```

---

### Task 8: Server (HTTP + SSE + `--once`)

**Files:**
- Create: `ops-console/server.py`
- Test: `ops-console/tests/test_server.py`

**Interfaces:**
- Consumes: `config`, `store.Store`, `poller.Poller`, `registry`, `alerts`, the three collectors.
- Produces:
  - `server.build_state(store, poller, now) -> dict` — pure-ish snapshot: `{"overall": state, "banner": str, "checks": [ {key,label,state,value,detail,history_key} ... ], "incidents": [...], "heartbeat": last_cycle_at, "generated_at": now}`. Reads `store.latest()`.
  - `server.register_default_collectors(cfg) -> list` — constructs HealthCollector/DeployCollector/RepoCollector from `cfg`, registers them, returns the list.
  - `server.run_once(cfg) -> int` — builds store+poller, runs one `cycle`, prints `build_state` as JSON to stdout, returns exit code (`0` if overall is OK/WARN/UNKNOWN, `1` if CRIT).
  - `server.serve(cfg)` — starts the background poller thread + `ThreadingHTTPServer` bound to `cfg["host"]`/`cfg["port"]`. Routes: `GET /` → `static/index.html`; `GET /static/<f>` → file; `GET /api/state` → `build_state` JSON; `GET /events` → SSE stream emitting `build_state` every few seconds.
  - CLI: `python3 server.py` → `serve`; `python3 server.py --once` → `run_once` then `sys.exit(code)`.

- [ ] **Step 1: Write failing tests**

`ops-console/tests/test_server.py`:
```python
import json
import unittest
import server
from store import Store
from poller import Poller
from model import CheckResult, OK, CRIT


class FakeCollector:
    def __init__(self, key, results):
        self.key = key
        self.interval = 30
        self._results = results

    def run(self):
        return self._results


class TestServer(unittest.TestCase):
    def test_build_state_shape(self):
        store = Store(":memory:", now=lambda: 1000.0)
        c = FakeCollector("h", [CheckResult(key="h.x", label="x", state=OK, value=5.0)])
        p = Poller(store, [c], now=lambda: 1000.0)
        p.cycle(1000.0)
        state = server.build_state(store, p, now=1000.0)
        self.assertEqual(state["overall"], OK)
        self.assertIn("banner", state)
        self.assertEqual(state["heartbeat"], 1000.0)
        self.assertTrue(any(ch["key"] == "h.x" for ch in state["checks"]))
        # round-trips as JSON
        json.dumps(state)

    def test_run_once_exit_code_on_crit(self):
        cfg = {"host": "127.0.0.1", "port": 0, "repo": "o/r", "targets": [],
               "poll_interval_default": 30}
        # inject a crit collector via monkeypatch of register_default_collectors
        orig = server.register_default_collectors
        server.register_default_collectors = lambda c: [
            FakeCollector("h", [CheckResult(key="h.x", label="x", state=CRIT)])]
        try:
            code = server.run_once(cfg)
        finally:
            server.register_default_collectors = orig
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ops-console && python3 -m unittest tests.test_server -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'server'`.

- [ ] **Step 3: Implement `server.py`**

`ops-console/server.py`:
```python
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
```

Note: `build_state` calls `alerts.worst_states`. Add this thin alias to `alerts.py` so the name is explicit:
```python
def worst_states(states):
    return worst(states)
```
(Append to `ops-console/alerts.py`; keeps `overall_state` for the CheckResult-list path and `worst_states` for the plain-string-list path used by the server.)

- [ ] **Step 4: Run server tests to verify they pass**

Run: `cd ops-console && python3 -m unittest tests.test_server -v`
Expected: PASS (2 tests). (Add the `worst_states` alias before running.)

- [ ] **Step 5: Manual smoke of `--once`**

Run: `cd ops-console && python3 server.py --once`
Expected: prints a JSON object with `overall`, `banner`, `checks` (health/deploys/repo entries from live data), exits 0 (or 1 if something is genuinely down).

- [ ] **Step 6: Commit**

```bash
git add ops-console/server.py ops-console/alerts.py ops-console/tests/test_server.py
git commit -m "feat(ops-console): server — /api/state, SSE, static serving, --once"
```

---

### Task 9: Frontend dashboard

**Files:**
- Create: `ops-console/static/index.html`
- Create: `ops-console/static/dashboard.css`
- Create: `ops-console/static/dashboard.js`

**Interfaces:**
- Consumes: `GET /events` (SSE) with `GET /api/state` fallback; the `build_state` JSON shape from Task 8.
- Produces: a rendered dashboard. No automated test (zero-dep, no JS runner) — verified via the preview workflow in Step 4.

- [ ] **Step 1: Create `index.html`**

`ops-console/static/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OPS CONSOLE</title>
  <link rel="stylesheet" href="/static/dashboard.css">
</head>
<body>
  <header id="banner" class="banner state-ok">
    <span id="banner-text">CONNECTING…</span>
    <span id="heartbeat" class="heartbeat"></span>
  </header>
  <main class="grid">
    <section class="panel" id="panel-health"><h2>SITE HEALTH</h2><div class="rows"></div></section>
    <section class="panel" id="panel-deploys"><h2>DEPLOYS</h2><div class="rows"></div></section>
    <section class="panel" id="panel-repo"><h2>REPO</h2><div class="rows"></div></section>
    <section class="panel" id="panel-incidents"><h2>INCIDENT LOG</h2><div class="rows"></div></section>
  </main>
  <script src="/static/dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `dashboard.css` (operator amber-on-black theme)**

`ops-console/static/dashboard.css`:
```css
:root {
  --bg: #0a0a0a; --panel: #121212; --line: #2a2a2a;
  --amber: #ffb000; --amber-dim: #8a5f00;
  --ok: #3ad17a; --warn: #ffb000; --crit: #ff3b3b; --unknown: #888;
  --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--amber);
  font-family: var(--mono); letter-spacing: .02em; }
.banner { padding: .75rem 1rem; font-weight: 700; border-bottom: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: center; }
.banner.state-ok { color: var(--ok); }
.banner.state-warn { color: var(--warn); }
.banner.state-crit { color: var(--crit); background: #200; }
.banner.state-unknown { color: var(--unknown); }
.heartbeat { font-size: .75rem; color: var(--amber-dim); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 1rem; }
.panel h2 { margin: 0 0 .75rem; font-size: .8rem; color: var(--amber-dim);
  border-bottom: 1px solid var(--line); padding-bottom: .5rem; }
.row { display: flex; align-items: center; gap: .6rem; padding: .35rem 0;
  border-bottom: 1px dotted var(--line); font-size: .85rem; }
.dot { width: .7rem; height: .7rem; border-radius: 50%; flex: 0 0 auto; }
.dot.ok { background: var(--ok); } .dot.warn { background: var(--warn); }
.dot.crit { background: var(--crit); } .dot.unknown { background: var(--unknown); }
.row .label { flex: 0 0 9rem; }
.row .detail { color: #ccc; flex: 1; }
.row .val { color: var(--amber-dim); }
```

- [ ] **Step 3: Create `dashboard.js`**

`ops-console/static/dashboard.js`:
```javascript
const KIND = { health: "panel-health", deploys: "panel-deploys", repo: "panel-repo" };

function render(state) {
  const banner = document.getElementById("banner");
  banner.className = "banner state-" + state.overall;
  document.getElementById("banner-text").textContent = state.banner;
  const hb = state.heartbeat
    ? "last cycle " + new Date(state.heartbeat * 1000).toLocaleTimeString()
    : "no telemetry yet";
  document.getElementById("heartbeat").textContent = hb;

  for (const id of Object.values(KIND)) {
    document.querySelector(`#${id} .rows`).innerHTML = "";
  }
  for (const c of state.checks) {
    const kind = c.key.split(".")[0];
    const panel = document.getElementById(KIND[kind]);
    if (!panel) continue;
    const row = document.createElement("div");
    row.className = "row";
    const val = c.value == null ? "" : Math.round(c.value);
    row.innerHTML =
      `<span class="dot ${c.state}"></span>` +
      `<span class="label">${c.label}</span>` +
      `<span class="detail">${c.detail}</span>` +
      `<span class="val">${val}</span>`;
    panel.querySelector(".rows").appendChild(row);
  }

  const inc = document.querySelector("#panel-incidents .rows");
  inc.innerHTML = "";
  for (const i of state.incidents) {
    const row = document.createElement("div");
    row.className = "row";
    const open = i.resolved_at ? "resolved" : "OPEN";
    row.innerHTML =
      `<span class="dot ${i.resolved_at ? "ok" : "crit"}"></span>` +
      `<span class="label">${i.label}</span>` +
      `<span class="detail">${open} · ${new Date(i.opened_at * 1000).toLocaleString()}</span>`;
    inc.appendChild(row);
  }

  const open = (state.open_incidents || []).length;
  document.title = (state.overall === "ok" ? "🟢" : "🔴") +
    " OPS" + (open ? ` (${open})` : "");
}

function start() {
  try {
    const es = new EventSource("/events");
    es.onmessage = (e) => render(JSON.parse(e.data));
    es.onerror = () => { es.close(); pollFallback(); };
  } catch (_) {
    pollFallback();
  }
}

function pollFallback() {
  const tick = () =>
    fetch("/api/state").then((r) => r.json()).then(render).catch(() => {});
  tick();
  setInterval(tick, 5000);
}

start();
```

- [ ] **Step 4: Verify in the preview workflow**

Start the server: `cd ops-console && python3 server.py` (background).
Then use the preview tools: load `http://127.0.0.1:7878`, take a snapshot/screenshot, confirm the four panels render, the banner reflects overall state, dots are colored, and the tab title shows 🟢/🔴. Check console logs for errors. Fix any issues in the source files and re-verify.

- [ ] **Step 5: Commit**

```bash
git add ops-console/static/
git commit -m "feat(ops-console): tactical dashboard frontend (SSE + poll fallback)"
```

---

### Task 10: Wiring, docs, full-suite verification

**Files:**
- Modify: `package.json` (add `console` script)
- Create: `ops-console/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: `npm run console` entry point and run docs. No new code logic.

- [ ] **Step 1: Add the npm script**

Modify `package.json` `scripts` — add:
```json
"console": "python3 ops-console/server.py"
```

- [ ] **Step 2: Write `README.md`**

`ops-console/README.md`:
```markdown
# Ops Console

Private, local-only command-center for andraewilliams.com. Not deployed.

## Run

    npm run console
    # or: python3 ops-console/server.py

Open http://127.0.0.1:7878

## One-shot (no browser)

    python3 ops-console/server.py --once

Prints a JSON status snapshot and exits non-zero if anything is CRITICAL.

## Tests

    cd ops-console && python3 -m unittest discover -s tests -v

## What it watches

- **Site health** — apex/www + level0–4 + /api endpoints (status, latency, TLS cert)
- **Deploys** — latest deploy state (via `gh` commit status) + drift vs production
- **Repo** — branch/dirty state, open PRs (Dependabot flagged)
- **Incident log** — auto-opened/closed from health state transitions

Config lives in `config.json`. Requires `gh` authenticated and `python3`.
Data is stored in `data.db` (gitignored).
```

- [ ] **Step 3: Run the full test suite**

Run: `cd ops-console && python3 -m unittest discover -s tests -v`
Expected: PASS — all tests from Tasks 1–8 green.

- [ ] **Step 4: Run `--once` end-to-end against live data**

Run: `cd ops-console && python3 server.py --once`
Expected: valid JSON snapshot with real health/deploys/repo entries.

- [ ] **Step 5: Confirm nothing leaks into the deployed build**

Run: `npm run build:site && ls _site | grep -i ops || echo "ops-console correctly absent from _site"`
Expected: prints "ops-console correctly absent from _site".

- [ ] **Step 6: Commit**

```bash
git add package.json ops-console/README.md
git commit -m "feat(ops-console): npm run console entry point + docs"
```

---

## Self-Review

**Spec coverage:**
- Site health / TLS / functional targets → Task 3 (functional synthetics are Phase 2; status+content+cert covered). ✓
- Deploy status + drift → Task 4. ✓
- Repo + PRs/Dependabot → Task 5. ✓
- `Check` abstraction + registry → Tasks 1, 7. ✓
- sqlite history + uptime + incidents → Task 2. ✓
- SSE transport + poll fallback → Tasks 8, 9. ✓
- Visual alerts + tab-title/favicon signal → Tasks 6, 9. ✓
- 127.0.0.1 binding, outside `_site`, gitignored db → Tasks 1, 8, 10. ✓
- `--once` headless + config validation + self-monitoring heartbeat → Tasks 7, 8. ✓
- Injectable clock throughout → all logic tasks. ✓
- Deferred to later plans (not this plan): rollups/retention, σ-baseline, SLO budget, incident ack/MTTR, timeline strip, drill-down, command palette, Vercel adapter, backlog panel, visitor analytics. (Phase 2/3 per spec.)

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `CheckResult` fields, `worst`/`worst_states`, `Store` method names, collector `key`/`interval`/`run()`, `Poller.cycle`/`due`/`last_cycle_at`, `build_state` keys are consistent across tasks. The server uses `alerts.worst_states` (aliased to `worst`) and `alerts.banner_text`; both defined. ✓
