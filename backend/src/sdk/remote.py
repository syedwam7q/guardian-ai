"""Remote backend — calls the user's running GuardianAI HTTP API."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from src.guardian.schemas import Decision, Verdict, Violation
from src.sdk.results import PostflightResult, PreflightResult

if TYPE_CHECKING:
    from src.sdk.client import Guardian


class RemoteBackend:
    """Calls /api/v1/govern on the user's running backend.

    The remote API doesn't yet expose split preflight/postflight endpoints
    (Phase 6+ proxy work). For now, both methods coalesce into a single
    /govern call: ``preflight()`` builds a stub request to detect BLOCK;
    ``postflight()`` sends the full payload and returns the post-flight
    verdicts only.
    """

    def __init__(self, client: Guardian) -> None:
        self.client = client
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if client.api_key:
            headers["Authorization"] = f"Bearer {client.api_key}"
        self._http = httpx.AsyncClient(
            base_url=client.backend_url,
            headers=headers,
            timeout=client.timeout_s,
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=0.5, max=4.0))
    async def _post_govern(self, payload: dict[str, Any]) -> dict[str, Any]:
        resp = await self._http.post("/api/v1/govern", json=payload)
        resp.raise_for_status()
        return resp.json()

    async def preflight(
        self, *, user_input: str, session_id: str, domain: str,
    ) -> PreflightResult:
        # Send a stub /govern call to detect pre-flight BLOCK only.
        payload = {
            "user_input": user_input,
            "session_id": session_id,
            "domain": domain,
            "retrieved_docs": [],
            "prompt": "",
            "output": "",
            "model": "openai/gpt-4o-mini",
            "input_tokens": 0,
            "output_tokens": 0,
            "latency_ms": 0,
        }
        data = await self._post_govern(payload)
        verdicts = [Verdict(**v) for v in data.get("verdicts", [])]
        blocked = bool(data.get("blocked", False))
        refusal = (
            "Your request was blocked by GuardianAI pre-flight checks." if blocked else ""
        )
        return PreflightResult(
            trace_id=UUID(data["trace_id"]) if data.get("trace_id") else UUID(int=0),
            blocked=blocked,
            verdicts=verdicts,
            refusal_message=refusal,
            context={
                "user_input": user_input,
                "session_id": session_id,
                "domain": domain,
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
        payload = {
            "user_input": context.get("user_input", ""),
            "session_id": session_id,
            "domain": context.get("domain", "medical"),
            "retrieved_docs": context.get("retrieved_docs", []),
            "prompt": "",
            "output": output,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": latency_ms,
        }
        data = await self._post_govern(payload)
        verdicts = [Verdict(**v) for v in data.get("verdicts", [])]
        violations = [Violation(**v) for v in data.get("violations", [])]
        decision_raw = data.get("decision")
        decision = Decision(**decision_raw) if decision_raw else None
        return PostflightResult(
            verdicts=verdicts, violations=violations, decision=decision,
        )

    async def aclose(self) -> None:
        await self._http.aclose()
