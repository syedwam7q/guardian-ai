"""Streaming proxy path with respx-mocked SSE upstream."""
from __future__ import annotations

import pytest
import respx
from fastapi.testclient import TestClient
from httpx import Response

from src.proxy.app import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _sse_chunks() -> list[bytes]:
    """A small, valid OpenAI-style SSE stream."""
    chunks = [
        (
            'data: {"id":"c1","object":"chat.completion.chunk","created":1,'
            '"model":"gpt-4o-mini","choices":[{"index":0,'
            '"delta":{"role":"assistant","content":"Hello"}}]}\n\n'
        ),
        (
            'data: {"id":"c1","object":"chat.completion.chunk","created":1,'
            '"model":"gpt-4o-mini","choices":[{"index":0,'
            '"delta":{"content":" there"}}]}\n\n'
        ),
        (
            'data: {"id":"c1","object":"chat.completion.chunk","created":1,'
            '"model":"gpt-4o-mini","choices":[{"index":0,'
            '"delta":{"content":"!"},"finish_reason":"stop"}]}\n\n'
        ),
        "data: [DONE]\n\n",
    ]
    return [c.encode("utf-8") for c in chunks]


@respx.mock
def test_proxy_streaming_passthrough_with_postflight_event(
    client: TestClient,
) -> None:
    sse_body = b"".join(_sse_chunks())
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=Response(
            200,
            content=sse_body,
            headers={"content-type": "text/event-stream"},
        )
    )

    with client.stream(
        "POST",
        "/v1/chat/completions",
        json={
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "user", "content": "Say hi briefly."}
            ],
            "stream": True,
        },
    ) as resp:
        assert resp.status_code == 200
        assert resp.headers.get("X-Guardian-Trace-Id")
        # Force-buffer the streamed body.
        body = b"".join(resp.iter_bytes())

    text = body.decode("utf-8", errors="ignore")
    # Original tokens passed through.
    assert "Hello" in text
    assert "there" in text
    # GuardianAI side-channel event present.
    assert "guardian_postflight" in text
    # Final DONE marker present (either upstream's or our synthetic one).
    assert "[DONE]" in text
