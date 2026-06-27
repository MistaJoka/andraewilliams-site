import contextlib
import io
import json
import unittest
import unittest.mock
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
        # required incident keys
        self.assertIn("incidents", state)
        self.assertIn("open_incidents", state)
        # round-trips as JSON
        json.dumps(state)

    def test_run_once_exit_code_on_crit(self):
        cfg = {"host": "127.0.0.1", "port": 0, "repo": "o/r", "targets": [],
               "poll_interval_default": 30}
        crit_collector = FakeCollector("h", [CheckResult(key="h.x", label="x", state=CRIT)])
        with unittest.mock.patch.object(server, "register_default_collectors",
                                        return_value=[crit_collector]):
            with contextlib.redirect_stdout(io.StringIO()):
                code = server.run_once(cfg)
        self.assertEqual(code, 1)

    def test_run_once_exit_code_ok(self):
        cfg = {"host": "127.0.0.1", "port": 0, "repo": "o/r", "targets": [],
               "poll_interval_default": 30}
        ok_collector = FakeCollector("h", [CheckResult(key="h.x", label="x", state=OK)])
        with unittest.mock.patch.object(server, "register_default_collectors",
                                        return_value=[ok_collector]):
            with contextlib.redirect_stdout(io.StringIO()):
                code = server.run_once(cfg)
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
