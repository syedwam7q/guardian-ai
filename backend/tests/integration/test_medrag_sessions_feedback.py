"""Integration tests for /api/medrag/sessions and /api/medrag/feedback."""
from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.routes.medrag import get_trace_store
from src.guardian.persistence import TraceStore
from src.guardian.schemas import (
    AgentName,
    GovernanceResponse,
    Severity,
    Verdict,
)
from src.main import app


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
        final_output="response",
        blocked=blocked,
        verdicts=[verdict],
        violations=[],
        decision=None,
        total_latency_ms=12.3,
    )


@pytest.fixture
def store(tmp_path) -> TraceStore:
    return TraceStore(db_path=tmp_path / "test-traces.db")


@pytest.fixture
def client(store: TraceStore) -> TestClient:
    app.dependency_overrides[get_trace_store] = lambda: store
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_sessions_empty(store: TraceStore, client: TestClient) -> None:
    resp = client.get("/api/medrag/sessions")
    assert resp.status_code == 200
    assert resp.json() == {"sessions": []}


@pytest.mark.asyncio
async def test_list_sessions_groups_by_session(store: TraceStore, client: TestClient) -> None:
    # Two sessions, three traces.
    await store.record(response=_make_response(), user_input="hi from s1", session_id="s1")
    await store.record(response=_make_response(), user_input="follow up s1", session_id="s1")
    await store.record(response=_make_response(), user_input="hello s2", session_id="s2")

    resp = client.get("/api/medrag/sessions")
    assert resp.status_code == 200
    body = resp.json()
    sessions = body["sessions"]
    assert len(sessions) == 2
    by_id = {s["session_id"]: s for s in sessions}
    assert by_id["s1"]["trace_count"] == 2
    assert by_id["s2"]["trace_count"] == 1
    # last_user_input is the most recent for that session.
    assert by_id["s1"]["last_user_input"] == "follow up s1"


@pytest.mark.asyncio
async def test_submit_feedback_creates_row(store: TraceStore, client: TestClient) -> None:
    resp_obj = _make_response()
    await store.record(response=resp_obj, user_input="q", session_id="s1")

    resp = client.post(
        "/api/medrag/feedback",
        json={
            "trace_id": str(resp_obj.trace_id),
            "rating": "thumbs_up",
            "comment": "great answer",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["rating"] == "thumbs_up"
    assert body["trace_id"] == str(resp_obj.trace_id)
    assert "feedback_id" in body

    rows = store.list_feedback_for_trace(str(resp_obj.trace_id))
    assert len(rows) == 1
    assert rows[0]["rating"] == "thumbs_up"
    assert rows[0]["comment"] == "great answer"


def test_submit_feedback_rejects_invalid_rating(store: TraceStore, client: TestClient) -> None:
    resp = client.post(
        "/api/medrag/feedback",
        json={"trace_id": "abc", "rating": "five_stars"},
    )
    assert resp.status_code == 400
    assert "thumbs_up" in resp.json()["detail"]
