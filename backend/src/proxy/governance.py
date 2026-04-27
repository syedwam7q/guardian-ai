"""Pre-flight + post-flight wrapper for proxy traffic."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from src.guardian.pipeline import GovernancePipeline
from src.guardian.schemas import Decision, Verdict, Violation


class ProxyGovernance:
    """Thin adapter that runs the GovernancePipeline around an LLM call."""

    def __init__(self, pipeline: GovernancePipeline | None = None) -> None:
        self.pipeline = pipeline or GovernancePipeline.default(domain="medical")

    @staticmethod
    def extract_user_input(messages: list[dict[str, Any]]) -> str:
        """Concatenate the last user message + any context."""
        for m in reversed(messages):
            if m.get("role") == "user":
                return m.get("content") or ""
        return ""

    async def preflight(
        self, *, user_input: str, domain: str = "medical",
    ) -> tuple[bool, list[Verdict], UUID]:
        return await self.pipeline.run_preflight(user_input=user_input, domain=domain)

    async def postflight(
        self, *, output: str, model: str, input_tokens: int, output_tokens: int,
        latency_ms: float, pre_verdicts: list[Verdict] | None = None,
    ) -> tuple[list[Verdict], list[Violation], Decision | None]:
        return await self.pipeline.run_postflight(
            output=output, retrieved_docs=[], model=model,
            input_tokens=input_tokens, output_tokens=output_tokens,
            latency_ms=latency_ms, pre_verdicts=pre_verdicts,
        )

    @staticmethod
    def headers_for(
        *, trace_id: UUID, violations_count: int, action: str | None,
        backend_url: str = "http://localhost:8000",
    ) -> dict[str, str]:
        return {
            "X-Guardian-Trace-Id": str(trace_id),
            "X-Guardian-Violations": str(violations_count),
            "X-Guardian-Action": action or "log",
            "X-Guardian-Diagnose-Url": f"{backend_url}/api/v1/diagnose/{trace_id}",
        }
