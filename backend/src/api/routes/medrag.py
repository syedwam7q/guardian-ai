"""MedRAG chat endpoint — retrieval-augmented generation behind the governance pipeline."""
from __future__ import annotations

import json
import time
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from src.guardian.pipeline import GovernancePipeline
from src.medrag.generation import MedRAGGenerator
from src.medrag.prompts import MEDRAG_SYSTEM_PROMPT
from src.medrag.retrieval import MedRAGRetriever

router = APIRouter(prefix="/api/medrag", tags=["medrag"])


class ChatRequest(BaseModel):
    user_input: str
    session_id: str
    domain: str = "medical"
    k: int = 5
    model: str = "groq/llama-3.3-70b"


# Dependency factories. Each is overridable in tests via app.dependency_overrides.
def get_retriever() -> MedRAGRetriever:
    return MedRAGRetriever()


def get_generator() -> MedRAGGenerator:
    return MedRAGGenerator()


def get_pipeline() -> GovernancePipeline:
    return GovernancePipeline.default(domain="medical")


@router.post("/chat")
async def chat(
    request: ChatRequest,
    retriever: MedRAGRetriever = Depends(get_retriever),  # noqa: B008
    generator: MedRAGGenerator = Depends(get_generator),  # noqa: B008
    pipeline: GovernancePipeline = Depends(get_pipeline),  # noqa: B008
) -> EventSourceResponse:
    async def event_stream():
        t0 = time.perf_counter()

        # 1. Pre-flight
        blocked, pre_verdicts, trace_id = await pipeline.run_preflight(
            user_input=request.user_input, domain=request.domain
        )
        yield {"event": "trace", "data": json.dumps({"trace_id": str(trace_id)})}

        if blocked:
            yield {
                "event": "blocked",
                "data": json.dumps(
                    {
                        "verdicts": [v.model_dump(mode="json") for v in pre_verdicts],
                    }
                ),
            }
            yield {"event": "done", "data": ""}
            return

        # 2. Retrieve
        chunks = await retriever.retrieve(request.user_input, k=request.k)
        yield {
            "event": "retrieval",
            "data": json.dumps(
                {
                    "doc_ids": [c.doc_id for c in chunks],
                    "scores": [c.score for c in chunks],
                }
            ),
        }

        # 3. Generate (streaming)
        full_output = ""
        try:
            async for tok in generator.generate_stream(
                query=request.user_input,
                context=[c.text for c in chunks],
                system=MEDRAG_SYSTEM_PROMPT,
            ):
                full_output += tok
                yield {"event": "token", "data": tok}
        except Exception as exc:  # surface generation errors as SSE event
            yield {"event": "error", "data": json.dumps({"message": str(exc)})}
            yield {"event": "done", "data": ""}
            return

        # 4. Post-flight + optional decision
        latency_ms = (time.perf_counter() - t0) * 1000
        retrieved_docs_payload: list[dict[str, Any]] = [
            {"doc_id": c.doc_id, "text": c.text, "score": c.score} for c in chunks
        ]
        post_verdicts, _violations, decision = await pipeline.run_postflight(
            output=full_output,
            retrieved_docs=retrieved_docs_payload,
            model=request.model,
            input_tokens=len(request.user_input.split()),
            output_tokens=len(full_output.split()),
            latency_ms=latency_ms,
            pre_verdicts=pre_verdicts,
        )
        yield {
            "event": "verdicts",
            "data": json.dumps(
                [v.model_dump(mode="json") for v in pre_verdicts + post_verdicts]
            ),
        }

        if decision is not None:
            yield {"event": "decision", "data": decision.model_dump_json()}

        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_stream())
