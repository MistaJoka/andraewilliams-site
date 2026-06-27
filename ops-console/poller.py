import time

import alerts


class Poller:
    def __init__(self, store, collectors, now=time.time):
        self.store = store
        self.collectors = collectors
        self.now = now
        self._last_run = {}
        self.last_cycle_at = None

    def due(self, now):
        ready = []
        for c in self.collectors:
            last = self._last_run.get(c.key)
            if last is None or (now - last) >= c.interval:
                ready.append(c)
        return ready

    def cycle(self, now):
        produced = []
        for c in self.due(now):
            try:
                results = c.run()
            except Exception:
                results = []
            for r in results:
                self.store.record(r)
            alerts.reconcile_incidents(self.store, results, now)
            self._last_run[c.key] = now
            produced.extend(results)
        self.last_cycle_at = now
        return produced
