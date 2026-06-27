from dataclasses import dataclass, field

OK = "ok"
WARN = "warn"
CRIT = "crit"
UNKNOWN = "unknown"

_SEVERITY = {OK: 0, UNKNOWN: 1, WARN: 2, CRIT: 3}


@dataclass
class CheckResult:
    key: str
    label: str
    state: str
    value: float | None = None
    detail: str = ""
    observed_at: str = ""
    history_key: str | None = None
    meta: dict = field(default_factory=dict)


def worst(states):
    if not states:
        return OK
    return max(states, key=lambda s: _SEVERITY.get(s, 0))
