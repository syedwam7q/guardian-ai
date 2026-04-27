"""Non-streaming proxy path with respx-mocked upstream."""
from __future__ import annotations

import pytest
import respx
from fastapi.testclient import TestClient
from httpx import Response

from src.proxy.app import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@respx.mock
def test_proxy_non_streaming_passthrough(client: TestClient) -> None:
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=Response(
            200,
            json={
                "id": "chatcmpl-test",
                "object": "chat.completion",
                "created": 1234567890,
                "model": "gpt-4o-mini",
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": "Paracetamol is for fever and pain.",
                        },
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 8,
                    "total_tokens": 18,
                },
            },
        )
    )

    resp = client.post(
        "/v1/chat/completions",
        json={
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "user", "content": "What is paracetamol used for?"}
            ],
            "stream": False,
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert "paracetamol" in body["choices"][0]["message"]["content"].lower()
    # GuardianAI custom fields injected on the body.
    assert "guardian_trace_id" in body
    assert "guardian_violations" in body
    # GuardianAI custom headers always present.
    assert resp.headers.get("X-Guardian-Trace-Id")
    assert resp.headers.get("X-Guardian-Violations") is not None
    assert resp.headers.get("X-Guardian-Action")
    assert "/api/v1/diagnose/" in resp.headers.get("X-Guardian-Diagnose-Url", "")


@respx.mock
def test_proxy_routes_groq_for_llama_models(client: TestClient) -> None:
    """Verify model-glob routing — llama-* maps to Groq, not OpenAI."""
    groq_route = respx.post("https://api.groq.com/openai/v1/chat/completions").mock(
        return_value=Response(
            200,
            json={
                "id": "chatcmpl-groq",
                "object": "chat.completion",
                "created": 1234567890,
                "model": "llama-3.3-70b",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": "Hi from groq."},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": 5,
                    "completion_tokens": 3,
                    "total_tokens": 8,
                },
            },
        )
    )

    resp = client.post(
        "/v1/chat/completions",
        json={
            "model": "llama-3.3-70b",
            "messages": [
                {"role": "user", "content": "Say hi please."}
            ],
            "stream": False,
        },
    )

    assert resp.status_code == 200
    assert groq_route.called


def test_health_endpoint(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "guardianai-proxy"}
