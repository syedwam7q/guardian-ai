"""Embedded backend — runs the GovernancePipeline in-process."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from src.guardian.pipeline import GovernancePipeline
from src.sdk.results import PostflightResult, PreflightResult

if TYPE_CHECKING:
    from src.sdk.client import Guardian


class EmbeddedBackend:
    def __init__(self, client: Guardian) -> None:
        self.client = client
        self._pipeline = GovernancePipeline.default(domain=client.domain)

    async def preflight(
        self, *, user_input: str, session_id: str, domain: str,
    ) -> PreflightResult:
        blocked, pre_verdicts, trace_id = await self._pipeline.run_preflight(
            user_input=user_input, domain=domain,
        )
        refusal = (
            "Your request was blocked by GuardianAI pre-flight checks." if blocked else ""
        )
        return PreflightResult(
            trace_id=trace_id,
            blocked=blocked,
            verdicts=pre_verdicts,
            refusal_message=refusal,
            context={
                "user_input": user_input,
                "session_id": session_id,
                "domain": domain,
                "_pre_verdicts": pre_verdicts,
            },
        )

    async def postflight(
        self,
        *,
        output: str,
        context: dict[str, Any],
        model: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
        session_id: str,
    ) -> PostflightResult:
        post_verdicts, violations, decision = await self._pipeline.run_postflight(
            output=output,
            retrieved_docs=context.get("retrieved_docs", []),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            pre_verdicts=context.get("_pre_verdicts"),
        )
        return PostflightResult(
            verdicts=post_verdicts, violations=violations, decision=decision,
        )

    async def aclose(self) -> None:
        # Pipeline doesn't need closing.
        pass
