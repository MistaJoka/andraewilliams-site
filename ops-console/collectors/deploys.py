import json
import subprocess
import time

from model import CheckResult, OK, WARN, CRIT, UNKNOWN


def map_status(combined_state):
    return {
        "success": OK,
        "pending": WARN,
        "failure": CRIT,
        "error": CRIT,
    }.get(combined_state, UNKNOWN)


def classify_drift(ahead_count):
    if ahead_count == 0:
        return OK, "production in sync with main"
    return WARN, f"main is {ahead_count} commit(s) ahead of last deploy"


def _default_gh(args):
    return subprocess.run(["gh", *args], capture_output=True, text=True,
                          check=True, timeout=15).stdout


def _default_git(args):
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          check=True, timeout=15).stdout


class DeployCollector:
    key = "deploys"

    def __init__(self, repo, now=time.time, interval=60,
                 gh=_default_gh, git=_default_git):
        self.repo = repo
        self.now = now
        self.interval = interval
        self.gh = gh
        self.git = git

    def run(self):
        observed = self.now()
        results = []
        try:
            head = self.git(["rev-parse", "HEAD"]).strip()
            status = json.loads(self.gh(["api", f"repos/{self.repo}/commits/{head}/status"]))
            state = map_status(status.get("state", "unknown"))
            results.append(CheckResult(
                key="deploys.latest", label="latest deploy", state=state,
                detail=f"{head[:7]}: {status.get('state', '?')}", observed_at=observed,
                meta={"sha": head, "statuses": status.get("statuses", [])}))
        except Exception as e:
            results.append(CheckResult(
                key="deploys.latest", label="latest deploy", state=UNKNOWN,
                detail=f"unavailable: {e}", observed_at=observed))
        try:
            ahead = int(self.git(["rev-list", "--count", "origin/main..HEAD"]).strip() or "0")
            d_state, d_detail = classify_drift(ahead)
            results.append(CheckResult(
                key="deploys.drift", label="deploy drift", state=d_state,
                value=float(ahead), detail=d_detail, observed_at=observed,
                history_key="deploys.drift.count"))
        except Exception as e:
            results.append(CheckResult(
                key="deploys.drift", label="deploy drift", state=UNKNOWN,
                detail=f"unavailable: {e}", observed_at=observed))
        return results
