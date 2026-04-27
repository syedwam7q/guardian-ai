"""Session — multi-turn governance container."""
from __future__ import annotations

from contextlib import AbstractContextManager
from types import TracebackType
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from src.guardian.schemas import Violation
from src.sdk.results import PostflightResult, PreflightResult, RemediationResult

if TYPE_CHECKING:
    from src.sdk.client import Guardian


class Session(AbstractContextManager["Session"]):
    """Synchronous context manager for compatibility with the decorator's
    ``with guardian.session() as s:`` pattern. The methods themselves are async
    because the underlying pipeline is async.
    """

    def __init__(
        self,
        *,
        client: Guardian,
        user_id: str,
        session_id: str | None = None,
    ) -> None:
        self.client = client
        self.user_id = user_id
        self.session_id = session_id or f"sdk-{uuid4()}"
        self._closed = False

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        self._closed = True

    async def preflight(self, user_input: str) -> PreflightResult:
        if self._closed:
            raise RuntimeError("Session is closed")
        return await self.client.backend.preflight(
            user_input=user_input,
            session_id=self.session_id,
            domain=self.client.domain,
        )

    async def postflight(
        self,
        output: str,
        *,
        context: dict[str, Any],
        model: str = "openai/gpt-4o-mini",
        input_tokens: int = 0,
        output_tokens: int = 0,
        latency_ms: float = 0.0,
    ) -> PostflightResult:
        if self._closed:
            raise RuntimeError("Session is closed")
        return await self.client.backend.postflight(
            output=output,
            context=context,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            session_id=self.session_id,
        )

    async def remediate(
        self,
        output: str,
        violations: list[Violation],
    ) -> RemediationResult:
        """Apply the simplest remediation policy:

        - any BLOCK violation -> block (returns refusal message)
        - any PII violation -> redact (placeholder: appends a note)
        - else -> passthrough.

        Phase 5 baseline. Phase 6+ replaces with full Decision-Engine-driven
        rewriting.
        """
        from src.guardian.schemas import AgentName, Severity

        if not violations:
            return RemediationResult(
                text=output, action_taken="passthrough", violations_found=0,
            )
        worst = max(violations, key=lambda v: v.severity)
        if worst.severity >= Severity.BLOCK:
            return RemediationResult(
                text="I can't help with that request. Please consult a professional.",
                action_taken="block",
                violations_found=len(violations),
            )
        if any(v.agent in (AgentName.PII_OUT, AgentName.PII_IN) for v in violations):
            return RemediationResult(
                text=output + "\n\n[Note: this response was checked for PII.]",
                action_taken="redact",
                violations_found=len(violations),
            )
        return RemediationResult(
            text=output,
            action_taken="passthrough",
            violations_found=len(violations),
        )
