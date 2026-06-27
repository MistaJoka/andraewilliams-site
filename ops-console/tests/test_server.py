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
