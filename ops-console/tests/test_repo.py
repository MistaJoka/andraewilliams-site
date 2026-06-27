import os
import unittest
from collectors import repo
from model import OK

FIX = os.path.join(os.path.dirname(__file__), "fixtures")


class TestRepo(unittest.TestCase):
    def test_parse_branch_clean(self):
        out = "# branch.oid abc\n# branch.head main\n"
        branch, dirty = repo.parse_branch(out)
        self.assertEqual(branch, "main")
        self.assertFalse(dirty)

    def test_parse_branch_dirty(self):
        out = "# branch.head main\n1 .M N... 100644 100644 100644 aaa bbb file.py\n"
        branch, dirty = repo.parse_branch(out)
        self.assertTrue(dirty)

    def test_parse_prs_flags_dependabot(self):
        with open(os.path.join(FIX, "pr_list.json")) as f:
            prs = repo.parse_prs(f.read())
        self.assertEqual(len(prs), 2)
        bot = next(p for p in prs if p["number"] == 8)
        self.assertTrue(bot["dependabot"])

    def test_run_emits_branch_and_prs(self):
        with open(os.path.join(FIX, "pr_list.json")) as f:
            pr_json = f.read()
        c = repo.RepoCollector(
            "o/r", now=lambda: 1000.0,
            gh=lambda args: pr_json,
            git=lambda args: "# branch.head main\n")
        results = c.run()
        prs = next(r for r in results if r.key == "repo.prs")
        self.assertEqual(prs.value, 2.0)
        self.assertEqual(prs.state, OK)


if __name__ == "__main__":
    unittest.main()
