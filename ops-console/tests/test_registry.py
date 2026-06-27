import unittest
import registry
from model import CheckResult, OK


class FakeCollector:
    def __init__(self, key, interval=30):
        self.key = key
        self.interval = interval

    def run(self):
        return [CheckResult(key=self.key, label=self.key, state=OK)]


class TestRegistry(unittest.TestCase):
    def setUp(self):
        registry.clear()

    def test_register_and_list(self):
        c = FakeCollector("health")
        registry.register(c)
        self.assertEqual([x.key for x in registry.all_collectors()], ["health"])

    def test_clear(self):
        registry.register(FakeCollector("a"))
        registry.clear()
        self.assertEqual(registry.all_collectors(), [])


if __name__ == "__main__":
    unittest.main()
