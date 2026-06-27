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
