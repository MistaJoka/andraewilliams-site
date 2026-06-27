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
