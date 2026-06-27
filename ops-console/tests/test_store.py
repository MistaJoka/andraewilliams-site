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
