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
        self._conn.execute(_DDL)

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

    def close(self) -> None:
        self._conn.close()
