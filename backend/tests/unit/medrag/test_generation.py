from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any, ClassVar
from unittest.mock import AsyncMock

import pytest

from src.medrag.generation import MedRAGGenerator


def test_build_prompt_formats_context_and_query():
    prompt = MedRAGGenerator._build_prompt(
        query="What is paracetamol?",
        context=["Paracetamol is for pain.", "It's also called acetaminophen."],
    )
    assert "[1] Paracetamol is for pain." in prompt
    assert "[2] It's also called acetaminophen." in prompt
    assert "Question: What is paracetamol?" in prompt
    assert "Cite sources by number" in prompt


def _fake_chunk(delta_content: str | None) -> Any:
    """Build an object that mimics groq's streaming response chunk shape."""

    class _Delta:
        content = delta_content

    class _Choice:
        delta = _Delta()

    class _Chunk:
        choices: ClassVar[list[Any]] = [_Choice()]

    return _Chunk()


@pytest.mark.asyncio
async def test_generate_stream_yields_token_deltas():
    """Inject a stub client whose chat.completions.create returns an async iterator
    of fake chunks. Verify the generator yields exactly the non-empty deltas."""

    async def fake_stream() -> AsyncIterator[Any]:
        for delta in ["Para", "cet", "amol", " is", " safe", None, "."]:
            yield _fake_chunk(delta)

    stub_client = AsyncMock()
    # client.chat.completions.create() must AWAIT to an async iterator.
    stub_client.chat.completions.create = AsyncMock(return_value=fake_stream())

    gen = MedRAGGenerator(client=stub_client, model="llama-stub")
    out = []
    async for tok in gen.generate_stream(
        query="What is paracetamol?",
        context=["Paracetamol is safe."],
        system="You are a medical assistant.",
    ):
        out.append(tok)

    # Non-None deltas only.
    assert out == ["Para", "cet", "amol", " is", " safe", "."]
    # Verify the call shape.
    call = stub_client.chat.completions.create.await_args
    assert call.kwargs["model"] == "llama-stub"
    assert call.kwargs["stream"] is True
    assert call.kwargs["temperature"] == 0.3
    assert call.kwargs["max_tokens"] == 1024
    msgs = call.kwargs["messages"]
    assert msgs[0]["role"] == "system"
    assert msgs[1]["role"] == "user"
    assert "Paracetamol is safe." in msgs[1]["content"]
    assert "What is paracetamol?" in msgs[1]["content"]


@pytest.mark.asyncio
async def test_missing_api_key_raises_clear_error(monkeypatch):
    """When neither api_key nor client is provided AND GROQ_API_KEY is unset,
    accessing .client raises a clear RuntimeError, NOT a KeyError."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    gen = MedRAGGenerator()
    with pytest.raises(RuntimeError, match="GROQ_API_KEY is not set"):
        _ = gen.client
