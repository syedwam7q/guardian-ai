"""DuckDB-backed trace logging for Phase 1.

Each call to GovernancePipeline.run() that produces a GovernanceResponse can be
appended to a single `traces` table for audit + offline analysis. Schema:

    trace_id VARCHAR PRIMARY KEY
    session_id VARCHAR
    user_input TEXT
    final_output TEXT
    blocked BOOLEAN
    verdicts JSON   -- list[Verdict]
    violations JSON -- list[Violation]
    decision JSON   -- Decision | null
    total_latency_ms DOUBLE
    timestamp TIMESTAMP DEFAULT now()
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any
from uuid import uuid4

import duckdb

from src.guardian.schemas import GovernanceResponse

_DDL = """
CREATE TABLE IF NOT EXISTS traces (
    trace_id VARCHAR PRIMARY KEY,
    session_id VARCHAR,
    user_input TEXT,
    final_output TEXT,
    blocked BOOLEAN,
    verdicts JSON,
    violations JSON,
    decision JSON,
    total_latency_ms DOUBLE,
    timestamp TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS feedback (
    feedback_id VARCHAR PRIMARY KEY,
    trace_id VARCHAR,
    rating VARCHAR,
    comment TEXT,
    timestamp TIMESTAMP DEFAULT current_timestamp,
    FOREIGN KEY (trace_id) REFERENCES traces(trace_id)
)
"""

_COLUMNS = (
    "trace_id",
    "session_id",
    "user_input",
    "final_output",
    "blocked",
    "verdicts",
    "violations",
    "decision",
    "total_latency_ms",
    "timestamp",
)


class TraceStore:
    """Append-only trace store backed by a single DuckDB file."""

    def __init__(self, *, db_path: str | Path = "data/duckdb/traces.db") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = duckdb.connect(str(self.db_path))
        for stmt in _DDL.strip().split(";"):
            if stmt.strip():
                self._conn.execute(stmt)

    async def record(
        self,
        *,
        response: GovernanceResponse,
        user_input: str,
        session_id: str,
    ) -> None:
        """Persist a single trace. Async; offloads sync DuckDB write to a thread."""
        verdicts_json = json.dumps(
            [v.model_dump(mode="json") for v in response.verdicts]
        )
        violations_json = json.dumps(
            [v.model_dump(mode="json") for v in response.violations]
        )
        decision_json = (
            json.dumps(response.decision.model_dump(mode="json"))
            if response.decision is not None
            else None
        )

        def _insert() -> None:
            self._conn.execute(
                "INSERT OR REPLACE INTO traces (trace_id, session_id, user_input, "
                "final_output, blocked, verdicts, violations, decision, total_latency_ms) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    str(response.trace_id),
                    session_id,
                    user_input,
                    response.final_output,
                    response.blocked,
                    verdicts_json,
                    violations_json,
                    decision_json,
                    response.total_latency_ms,
                ],
            )

        await asyncio.to_thread(_insert)

    def query(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Return matching traces. `filters` is a flat equality-only dict over column names."""
        sql = (
            "SELECT trace_id, session_id, user_input, final_output, blocked, "
            "verdicts, violations, decision, total_latency_ms, timestamp FROM traces"
        )
        params: list[Any] = []
        if filters:
            clauses = []
            for col, val in filters.items():
                clauses.append(f"{col} = ?")
                params.append(val)
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY timestamp DESC"
        rows = self._conn.execute(sql, params).fetchall()
        result = []
        for row in rows:
            entry = dict(zip(_COLUMNS, row, strict=True))
            # JSON columns come back as strings; deserialize
            for k in ("verdicts", "violations", "decision"):
                if entry[k] is not None and isinstance(entry[k], str):
                    entry[k] = json.loads(entry[k])
            result.append(entry)
        return result

    def list_sessions(self, *, limit: int = 50) -> list[dict[str, Any]]:
        """List unique sessions ordered by their most recent trace.

        Returns rows: {session_id, trace_count, last_seen, last_user_input}.
        """
        sql = (
            "SELECT session_id, COUNT(*) AS trace_count, "
            "MAX(timestamp) AS last_seen, "
            "ARG_MAX(user_input, timestamp) AS last_user_input "
            "FROM traces "
            "WHERE session_id IS NOT NULL "
            "GROUP BY session_id "
            "ORDER BY last_seen DESC "
            "LIMIT ?"
        )
        rows = self._conn.execute(sql, [limit]).fetchall()
        return [
            {
                "session_id": r[0],
                "trace_count": r[1],
                "last_seen": r[2],
                "last_user_input": r[3],
            }
            for r in rows
        ]

    async def record_feedback(
        self,
        *,
        trace_id: str,
        rating: str,
        comment: str | None = None,
    ) -> str:
        """Persist feedback on a trace. Returns the new feedback_id (uuid4)."""
        if rating not in ("thumbs_up", "thumbs_down"):
            raise ValueError(
                f"rating must be 'thumbs_up' or 'thumbs_down', got: {rating!r}"
            )
        feedback_id = str(uuid4())

        def _insert() -> None:
            self._conn.execute(
                "INSERT INTO feedback (feedback_id, trace_id, rating, comment) "
                "VALUES (?, ?, ?, ?)",
                [feedback_id, trace_id, rating, comment],
            )

        await asyncio.to_thread(_insert)
        return feedback_id

    def list_feedback_for_trace(self, trace_id: str) -> list[dict[str, Any]]:
        """List all feedback rows for a given trace_id, newest first."""
        rows = self._conn.execute(
            "SELECT feedback_id, trace_id, rating, comment, timestamp "
            "FROM feedback WHERE trace_id = ? ORDER BY timestamp DESC",
            [trace_id],
        ).fetchall()
        return [
            {
                "feedback_id": r[0],
                "trace_id": r[1],
                "rating": r[2],
                "comment": r[3],
                "timestamp": r[4],
            }
            for r in rows
        ]

    def close(self) -> None:
        self._conn.close()
