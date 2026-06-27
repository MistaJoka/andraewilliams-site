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
