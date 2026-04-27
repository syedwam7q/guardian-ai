from __future__ import annotations

from uuid import uuid4

import pytest

from src.guardian.persistence import TraceStore
from src.guardian.schemas import (
    AgentName,
    GovernanceResponse,
    Severity,
    Verdict,
)


@pytest.fixture
def store(tmp_path):
    return TraceStore(db_path=tmp_path / "traces.db")


def _make_response(*, blocked: bool = False) -> GovernanceResponse:
    verdict = Verdict(
        agent=AgentName.PROMPT_INJECTION,
        severity=Severity.SAFE,
        confidence=0.95,
        evidence={},
        latency_ms=1.2,
    )
    return GovernanceResponse(
        trace_id=uuid4(),
        final_output="all good",
        blocked=blocked,
        verdicts=[verdict],
        violations=[],
        decision=None,
        total_latency_ms=12.3,
    )


@pytest.mark.asyncio
async def test_record_then_query_roundtrip(store):
    response = _make_response(blocked=False)
    await store.record(response=response, user_input="hello", session_id="s1")
    rows = store.query({"session_id": "s1"})
    assert len(rows) == 1
    row = rows[0]
    assert row["session_id"] == "s1"
    assert row["user_input"] == "hello"
    assert row["blocked"] is False
    assert row["total_latency_ms"] == 12.3
    assert isinstance(row["verdicts"], list)
    assert row["verdicts"][0]["agent"] == "prompt_injection"


@pytest.mark.asyncio
async def test_query_no_filters_returns_all(store):
    await store.record(response=_make_response(), user_input="a", session_id="s1")
    await store.record(response=_make_response(blocked=True), user_input="b", session_id="s2")
    rows = store.query()
    assert len(rows) == 2
