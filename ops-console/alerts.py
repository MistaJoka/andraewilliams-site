from model import worst, OK, WARN, CRIT, UNKNOWN

_BANNER = {
    OK: "ALL SYSTEMS NOMINAL",
    WARN: "DEGRADED — WARNINGS",
    CRIT: "DEGRADED — CRITICAL",
    UNKNOWN: "PARTIAL TELEMETRY",
}


def overall_state(results):
    return worst([r.state for r in results])


def banner_text(state):
    return _BANNER.get(state, "UNKNOWN")


def reconcile_incidents(store, results, now):
    for r in results:
        if r.state == CRIT:
            store.open_incident(r.key, r.label, now)
        elif r.state == OK:
            store.resolve_incident(r.key, now)


def worst_states(states):
    return worst(states)
