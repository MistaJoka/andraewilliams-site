import unittest
from collectors import health
from model import OK, WARN, CRIT, UNKNOWN


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
        self.assertIn("health.cert", keys)
        cert = next(r for r in results if r.key == "health.cert")
        self.assertEqual(cert.state, OK)

    def test_run_isolates_per_target_failure(self):
        targets = [
            {"name": "bad", "url": "https://bad.example.com", "expect_status": 200},
            {"name": "good", "url": "https://good.example.com", "expect_status": 200},
        ]
        def flaky_fetch(url):
            if "bad" in url:
                raise RuntimeError("boom")
            return (200, "<html>", 10.0)
        c = health.HealthCollector(
            targets, now=lambda: 1000.0, fetch=flaky_fetch,
            cert_probe=lambda host: 1000.0 + 86400 * 30)
        results = {r.key: r for r in c.run()}
        self.assertEqual(results["health.bad"].state, CRIT)
        self.assertEqual(results["health.good"].state, OK)


if __name__ == "__main__":
    unittest.main()
