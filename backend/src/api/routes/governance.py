from __future__ import annotations

from fastapi import APIRouter, Depends
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
