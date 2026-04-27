"""SDK + (mocked) LLM client end-to-end test.

The plan describes a ``@pytest.mark.skipif(not GROQ_API_KEY)``-gated test
against the live OpenAI API. Without an API key, that test would skip on
every CI run, defeating its purpose. We instead mock the LLM HTTP API
via respx so the SDK is exercised end-to-end on every test run.

If the ``openai`` SDK is installed we exercise the full
``AsyncOpenAI -> chat.completions.create`` path. Otherwise we fall back to
a plain ``httpx.AsyncClient`` call that mimics what an LLM client does, so
the integration test still exercises the decorator end-to-end without an
optional dependency.
"""
from __future__ import annotations

import os

import httpx
import pytest
import respx
from httpx import Response

from src.sdk import guardian

try:
    from openai import AsyncOpenAI

    _HAS_OPENAI = True
except ImportError:  # pragma: no cover - exercised only without openai installed
    _HAS_OPENAI = False


@pytest.fixture(scope="module", autouse=True)
def _warm_pipeline_before_respx():
    """Build a Guardian client ONCE outside of any respx context.

    The HallucinationAgent eagerly downloads RoBERTa-large-MNLI on
    construction; that triggers ``httpx`` calls into HuggingFace which
    respx would intercept and break. By warming the ``@cache``-decorated
    NLI pipeline up here, every subsequent ``Guardian(mode='embedded')``
    constructor is a no-op for the network.
    """
    from src.sdk import Guardian

    Guardian(domain="medical", mode="embedded")
    yield


_OPENAI_RESPONSE = {
    "id": "chatcmpl-test",
    "object": "chat.completion",
    "created": 0,
    "model": "gpt-4o-mini",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "Paracetamol is commonly used for fever and pain relief.",
            },
            "finish_reason": "stop",
        }
    ],
    "usage": {"prompt_tokens": 10, "completion_tokens": 12, "total_tokens": 22},
}


def _build_app():
    if _HAS_OPENAI:

        @guardian.govern(domain="medical", mode="embedded")
        async def my_app(user_input: str) -> str:
            client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", "test-key"))
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": user_input}],
            )
            return resp.choices[0].message.content or ""

        return my_app

    @guardian.govern(domain="medical", mode="embedded")
    async def my_app(user_input: str) -> str:
        # Httpx-only fallback: replicate what an LLM client does.
        async with httpx.AsyncClient() as http:
            resp = await http.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": (
                        f"Bearer {os.environ.get('OPENAI_API_KEY', 'test-key')}"
                    ),
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": user_input}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"] or ""

    return my_app


@pytest.mark.asyncio
async def test_decorator_governs_mocked_llm_call():
    app = _build_app()

    with respx.mock(assert_all_mocked=False, assert_all_called=False) as router:
        router.post("https://api.openai.com/v1/chat/completions").mock(
            return_value=Response(200, json=_OPENAI_RESPONSE)
        )
        out = await app("What is paracetamol used for?")

    # Governance didn't break the underlying LLM call.
    assert "paracetamol" in out.lower()
