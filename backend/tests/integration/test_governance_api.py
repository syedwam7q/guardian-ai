import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200


def test_govern_endpoint_clean_path(client):
    payload = {
        "user_input": "What is paracetamol used for?",
        "session_id": "s1",
        "retrieved_docs": [{"text": "Paracetamol is for fever and pain.", "doc_id": "d1"}],
        "prompt": "Answer using context.",
        "output": "Paracetamol is for fever and pain relief.",
        "model": "groq/llama-3.3-70b",
        "input_tokens": 50, "output_tokens": 20, "latency_ms": 400,
    }
    resp = client.post("/api/v1/govern", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["blocked"] is False
    assert "verdicts" in body
    assert "trace_id" in body
