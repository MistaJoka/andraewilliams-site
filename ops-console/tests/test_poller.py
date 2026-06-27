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


class RaisingCollector:
    """A collector whose run() always raises; used to test crash-isolation."""
    key = "bad"
    interval = 30

    def run(self):
        raise RuntimeError("boom")


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

    def test_raising_collector_does_not_crash_cycle(self):
        """A collector that raises must not crash cycle(); other collectors still run."""
        store = Store(":memory:", now=lambda: 1000.0)
        bad = RaisingCollector()
        good = FakeCollector("good", 30, [CheckResult(key="good.x", label="x", state=OK, value=1.0)])
        p = Poller(store, [bad, good], now=lambda: 1000.0)
        produced = p.cycle(1000.0)
        # last_cycle_at is always set
        self.assertEqual(p.last_cycle_at, 1000.0)
        # the good collector's result is still stored
        self.assertIn("good.x", store.latest())
        # produced only contains good collector's results (bad raised, so 0 results from it)
        self.assertTrue(any(r.key == "good.x" for r in produced))


if __name__ == "__main__":
    unittest.main()
