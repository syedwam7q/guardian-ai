"""SSE pass-through that accumulates tokens then runs post-flight at end."""
from __future__ import annotations

import json
import time
from collections.abc import AsyncIterator

import httpx

from src.guardian.schemas import Verdict
from src.proxy.governance import ProxyGovernance


async def stream_with_postflight(
    *,
    upstream_response: httpx.Response,
    governance: ProxyGovernance,
    pre_verdicts: list[Verdict],
    trace_id_str: str,
    model: str,
) -> AsyncIterator[bytes]:
    """Yield each upstream SSE chunk as it arrives, parse into delta tokens,
    accumulate the full output, then on `[DONE]` (or stream end) run post-flight
    and emit a synthetic `guardian_postflight` event before the final `[DONE]`.
    """
    accumulated = ""
    t0 = time.perf_counter()
    final_done_seen = False

    async for chunk in upstream_response.aiter_bytes():
        # Pass through the raw chunk to the client immediately.
        yield chunk
        # Parse out delta content for accumulation.
        for raw_line in chunk.decode("utf-8", errors="ignore").split("\n"):
            line = raw_line.strip()
            if not line.startswith("data: "):
                continue
            payload_raw = line[len("data: "):]
            if payload_raw == "[DONE]":
                final_done_seen = True
                continue
            try:
                payload = json.loads(payload_raw)
                for choice in payload.get("choices", []):
                    delta = choice.get("delta", {}).get("content")
                    if delta:
                        accumulated += delta
            except json.JSONDecodeError:
                continue

    # After the stream has finished, run post-flight and emit a side-channel
    # event with the verdict summary, then the canonical [DONE].
    latency_ms = (time.perf_counter() - t0) * 1000
    _post_verdicts, violations, decision = await governance.postflight(
        output=accumulated, model=model,
        input_tokens=0, output_tokens=len(accumulated.split()),
        latency_ms=latency_ms, pre_verdicts=pre_verdicts,
    )
    summary = {
        "trace_id": trace_id_str,
        "violations": [
            {"agent": v.agent.value, "severity": v.severity.name, "summary": v.summary}
            for v in violations
        ],
        "action": decision.action.value if decision else "log",
    }
    yield f"event: guardian_postflight\ndata: {json.dumps(summary)}\n\n".encode()
    if not final_done_seen:
        yield b"data: [DONE]\n\n"
