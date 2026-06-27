import sqlite3
import time


class Store:
    def __init__(self, path, now=time.time):
        self.now = now
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL,
                label TEXT,
                state TEXT NOT NULL,
                value REAL,
                detail TEXT,
                history_key TEXT,
                observed_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_samples_key ON samples(key, id);
            CREATE INDEX IF NOT EXISTS idx_samples_hist ON samples(history_key, observed_at);
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL,
                label TEXT,
                opened_at REAL NOT NULL,
                resolved_at REAL
            );
            """
        )
        self.conn.commit()

    def record(self, result):
        observed = result.observed_at if isinstance(result.observed_at, (int, float)) else self.now()
        self.conn.execute(
            "INSERT INTO samples (key,label,state,value,detail,history_key,observed_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (result.key, result.label, result.state, result.value,
             result.detail, result.history_key, observed),
        )
        self.conn.commit()

    def latest(self):
        rows = self.conn.execute(
            "SELECT s.* FROM samples s JOIN ("
            "  SELECT key, MAX(id) AS mid FROM samples GROUP BY key"
            ") m ON s.id = m.mid"
        ).fetchall()
        return {
            r["key"]: {
                "state": r["state"], "value": r["value"], "detail": r["detail"],
                "observed_at": r["observed_at"], "history_key": r["history_key"],
                "label": r["label"],
            }
            for r in rows
        }

    def series(self, history_key, since_epoch):
        rows = self.conn.execute(
            "SELECT observed_at, value FROM samples"
            " WHERE history_key=? AND observed_at>=? AND value IS NOT NULL"
            " ORDER BY observed_at ASC",
            (history_key, since_epoch),
        ).fetchall()
        return [(r["observed_at"], r["value"]) for r in rows]

    def uptime(self, key, since_epoch):
        row = self.conn.execute(
            "SELECT COUNT(*) AS total, SUM(state='ok') AS ok FROM samples"
            " WHERE key=? AND observed_at>=?",
            (key, since_epoch),
        ).fetchone()
        if not row["total"]:
            return 100.0
        return (row["ok"] or 0) / row["total"] * 100.0

    def open_incident(self, key, label, opened_at):
        existing = self.conn.execute(
            "SELECT id FROM incidents WHERE key=? AND resolved_at IS NULL", (key,)
        ).fetchone()
        if existing:
            return
        self.conn.execute(
            "INSERT INTO incidents (key,label,opened_at) VALUES (?,?,?)",
            (key, label, opened_at),
        )
        self.conn.commit()

    def resolve_incident(self, key, resolved_at):
        self.conn.execute(
            "UPDATE incidents SET resolved_at=? WHERE key=? AND resolved_at IS NULL",
            (resolved_at, key),
        )
        self.conn.commit()

    def open_incidents(self):
        rows = self.conn.execute(
            "SELECT key,label,opened_at FROM incidents WHERE resolved_at IS NULL"
            " ORDER BY opened_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def recent_incidents(self, limit):
        rows = self.conn.execute(
            "SELECT key,label,opened_at,resolved_at FROM incidents"
            " ORDER BY opened_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
