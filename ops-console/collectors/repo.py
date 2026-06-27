import json
import subprocess
import time

from model import CheckResult, OK, UNKNOWN


def parse_branch(porcelain):
    branch = "?"
    dirty = False
    for line in porcelain.splitlines():
        if line.startswith("# branch.head "):
            branch = line.split(" ", 2)[2].strip()
        elif line and not line.startswith("#"):
            dirty = True
    return branch, dirty


def parse_prs(pr_json):
    out = []
    for p in json.loads(pr_json):
        login = (p.get("author") or {}).get("login", "")
        out.append({
            "number": p["number"],
            "title": p["title"],
            "author": login,
            "dependabot": "dependabot" in login.lower(),
        })
    return out


def _default_gh(args):
    return subprocess.run(["gh", *args], capture_output=True, text=True,
                          check=True, timeout=15).stdout


def _default_git(args):
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          check=True, timeout=15).stdout


class RepoCollector:
    key = "repo"

    def __init__(self, repo, now=time.time, interval=60, gh=_default_gh, git=_default_git):
        self.repo = repo
        self.now = now
        self.interval = interval
        self.gh = gh
        self.git = git

    def run(self):
        observed = self.now()
        results = []
        try:
            branch, dirty = parse_branch(self.git(["status", "--porcelain=v2", "--branch"]))
            results.append(CheckResult(
                key="repo.branch", label="branch", state=OK,
                detail=f"{branch} ({'dirty' if dirty else 'clean'})",
                observed_at=observed, meta={"branch": branch, "dirty": dirty}))
        except Exception as e:
            results.append(CheckResult(
                key="repo.branch", label="branch", state=UNKNOWN,
                detail=f"unavailable: {e}", observed_at=observed))
        try:
            prs = parse_prs(self.gh(["pr", "list", "--json", "number,title,author,isDraft"]))
            bots = sum(1 for p in prs if p["dependabot"])
            results.append(CheckResult(
                key="repo.prs", label="open PRs", state=OK, value=float(len(prs)),
                detail=f"{len(prs)} open ({bots} dependabot)", observed_at=observed,
                history_key="repo.prs.count", meta={"prs": prs}))
        except Exception as e:
            results.append(CheckResult(
                key="repo.prs", label="open PRs", state=UNKNOWN,
                detail=f"unavailable: {e}", observed_at=observed))
        return results
