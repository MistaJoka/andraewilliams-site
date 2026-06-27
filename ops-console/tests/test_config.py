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
