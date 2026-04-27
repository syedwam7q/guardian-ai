from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.guardian.pipeline import GovernancePipeline
from src.guardian.schemas import GovernanceRequest, GovernanceResponse


class GovernCallPayload(BaseModel):
    user_input: str
    session_id: str
    domain: str = "medical"
    retrieved_docs: list[dict] = Field(default_factory=list)
    prompt: str = ""
    output: str = ""
    model: str = "groq/llama-3.3-70b"
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0


router = APIRouter(prefix="/api/v1", tags=["governance"])


def get_pipeline() -> GovernancePipeline:
    return GovernancePipeline.default(domain="medical")


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/govern", response_model=GovernanceResponse)
async def govern(
    payload: GovernCallPayload,
    pipeline: GovernancePipeline = Depends(get_pipeline),  # noqa: B008
) -> GovernanceResponse:
    req = GovernanceRequest(
        user_input=payload.user_input,
        session_id=payload.session_id,
        domain=payload.domain,
    )
    return await pipeline.run(
        request=req,
        retrieved_docs=payload.retrieved_docs,
        prompt=payload.prompt,
        output=payload.output,
        model=payload.model,
        input_tokens=payload.input_tokens,
        output_tokens=payload.output_tokens,
        latency_ms=payload.latency_ms,
    )


@router.post("/diagnose/{trace_id}")
async def diagnose(trace_id: UUID) -> dict:
    """On-demand causal diagnosis (Phase 3+ wiring).

    The full implementation requires (a) a TraceStore.fetch lookup for the
    original trace inputs, (b) a configured CausalEngine with executor
    callbacks, and (c) a DAG of how those callbacks connect to the trace.
    These are deferred. This stub exists so the route is reserved and
    consumers receive an explicit 503 instead of a 404.
    """
    raise HTTPException(
        status_code=503,
        detail=(
            "On-demand causal diagnosis is not yet wired in this build. "
            "Pass a causal_engine to GovernancePipeline.default(...) and "
            "run /api/v1/govern instead."
        ),
    )
