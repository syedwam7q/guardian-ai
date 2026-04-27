"""POST /v1/chat/completions — OpenAI-compatible proxy endpoint."""
from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from src.proxy.governance import ProxyGovernance
from src.proxy.schemas import (
    ChatCompletionChoice,
    ChatCompletionMessage,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionUsage,
)
from src.proxy.streaming import stream_with_postflight
from src.proxy.upstream import UpstreamRouter

router = APIRouter()


# Module-level singletons. They're cheap to keep and ensure the pipeline + http
# client are initialized once per process.
_router_singleton: UpstreamRouter | None = None
_governance_singleton: ProxyGovernance | None = None


def get_upstream_router() -> UpstreamRouter:
    global _router_singleton
    if _router_singleton is None:
        _router_singleton = UpstreamRouter()
    return _router_singleton


def get_governance() -> ProxyGovernance:
    global _governance_singleton
    if _governance_singleton is None:
        _governance_singleton = ProxyGovernance()
    return _governance_singleton


def _refusal_response(
    *, model: str, trace_id: uuid.UUID, headers: dict[str, str],
) -> JSONResponse:
    """OpenAI-shaped 200 response carrying the GuardianAI refusal."""
    body = ChatCompletionResponse(
        id=f"chatcmpl-{uuid.uuid4().hex[:24]}",
        created=int(time.time()),
        model=model,
        choices=[
            ChatCompletionChoice(
                index=0,
                message=ChatCompletionMessage(
                    role="assistant",
                    content=(
                        "I can't help with that request. "
                        "(Blocked by GuardianAI pre-flight.)"
                    ),
                ),
                finish_reason="content_filter",
            )
        ],
        usage=ChatCompletionUsage(),
        guardian_trace_id=str(trace_id),
        guardian_violations=1,
    ).model_dump(mode="json")
    return JSONResponse(content=body, headers=headers, status_code=200)


@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    upstream: UpstreamRouter = Depends(get_upstream_router),  # noqa: B008
    governance: ProxyGovernance = Depends(get_governance),  # noqa: B008
):
    raw_body = await request.json()
    try:
        chat_req = ChatCompletionRequest(**raw_body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    user_input = governance.extract_user_input(
        [m.model_dump() for m in chat_req.messages]
    )

    # 1. Pre-flight
    blocked, pre_verdicts, trace_id = await governance.preflight(user_input=user_input)
    headers = governance.headers_for(
        trace_id=trace_id, violations_count=0,
        action="block" if blocked else "log",
    )

    if blocked:
        return _refusal_response(model=chat_req.model, trace_id=trace_id, headers=headers)

    # 2. Forward to upstream
    payload = chat_req.model_dump(exclude_none=True)
    if chat_req.stream:
        upstream_resp = await upstream.stream_chat_completion(payload=payload)
        if upstream_resp.status_code >= 400:
            await upstream_resp.aread()
            return JSONResponse(
                content={
                    "error": {
                        "message": upstream_resp.text,
                        "type": "upstream_error",
                    }
                },
                status_code=upstream_resp.status_code, headers=headers,
            )
        return StreamingResponse(
            stream_with_postflight(
                upstream_response=upstream_resp, governance=governance,
                pre_verdicts=pre_verdicts, trace_id_str=str(trace_id),
                model=chat_req.model,
            ),
            media_type="text/event-stream",
            headers=headers,
        )

    # Non-streaming: forward, then run post-flight on the full body.
    t0 = time.perf_counter()
    upstream_resp = await upstream.chat_completion(payload=payload)
    if upstream_resp.status_code >= 400:
        return JSONResponse(
            content={
                "error": {
                    "message": upstream_resp.text,
                    "type": "upstream_error",
                }
            },
            status_code=upstream_resp.status_code, headers=headers,
        )
    upstream_data = upstream_resp.json()
    output_text = ""
    for choice in upstream_data.get("choices", []):
        msg = choice.get("message", {})
        if msg.get("content"):
            output_text += msg["content"]
    latency_ms = (time.perf_counter() - t0) * 1000

    _post_verdicts, violations, decision = await governance.postflight(
        output=output_text, model=chat_req.model,
        input_tokens=upstream_data.get("usage", {}).get("prompt_tokens", 0),
        output_tokens=upstream_data.get("usage", {}).get("completion_tokens", 0),
        latency_ms=latency_ms, pre_verdicts=pre_verdicts,
    )

    headers = governance.headers_for(
        trace_id=trace_id, violations_count=len(violations),
        action=decision.action.value if decision else "log",
    )

    # Inject GuardianAI fields into the response.
    upstream_data["guardian_trace_id"] = str(trace_id)
    upstream_data["guardian_violations"] = len(violations)
    return JSONResponse(content=upstream_data, headers=headers)
