import os
import unittest
from collectors import deploys
from model import OK, WARN, CRIT, UNKNOWN

FIX = os.path.join(os.path.dirname(__file__), "fixtures")


class TestDeploys(unittest.TestCase):
    def test_map_status(self):
        self.assertEqual(deploys.map_status("success"), OK)
        self.assertEqual(deploys.map_status("pending"), WARN)
        self.assertEqual(deploys.map_status("failure"), CRIT)
        self.assertEqual(deploys.map_status("error"), CRIT)
        self.assertEqual(deploys.map_status("whatever_unknown"), UNKNOWN)

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
