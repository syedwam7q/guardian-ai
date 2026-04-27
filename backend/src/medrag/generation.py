"""MedRAG generation service backed by Groq Llama-3.3-70b with streaming."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

from groq import AsyncGroq


class MedRAGGenerator:
    """Streaming generator for MedRAG using Groq's Llama-3.3-70b chat completions."""

    def __init__(
        self,
        *,
        model: str = "llama-3.3-70b-versatile",
        api_key: str | None = None,
        client: AsyncGroq | None = None,
    ) -> None:
        """Construct the generator.

        Provide one of:
          - ``api_key``: builds a real ``AsyncGroq`` client.
          - ``client``: inject a stub or respx-mocked client (used in tests).
          - neither: defer to ``GROQ_API_KEY`` from the environment at first use.

        Deferring lets the class be instantiated in test environments without
        the env var set; a clear ``RuntimeError`` is raised on first client
        access if the key is still missing.
        """
        self.model = model
        if client is not None:
            self._client: AsyncGroq | None = client
        elif api_key is not None:
            self._client = AsyncGroq(api_key=api_key)
        else:
            self._client = None  # lazy

    @property
    def client(self) -> AsyncGroq:
        if self._client is None:
            key = os.environ.get("GROQ_API_KEY")
            if not key:
                raise RuntimeError(
                    "GROQ_API_KEY is not set. Set the env var or pass "
                    "api_key=/client= to MedRAGGenerator."
                )
            self._client = AsyncGroq(api_key=key)
        return self._client

    async def generate_stream(
        self, *, query: str, context: list[str], system: str
    ) -> AsyncIterator[str]:
        """Yield non-empty token deltas from a streaming chat completion."""
        prompt = self._build_prompt(query, context)
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            stream=True,
            temperature=0.3,
            max_tokens=1024,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    @staticmethod
    def _build_prompt(query: str, context: list[str]) -> str:
        ctx_block = "\n\n".join(f"[{i + 1}] {c}" for i, c in enumerate(context))
        return (
            f"Context:\n{ctx_block}\n\n"
            f"Question: {query}\n\n"
            "Answer using only the provided context. Cite sources by number."
        )
