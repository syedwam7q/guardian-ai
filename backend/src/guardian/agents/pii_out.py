"""PII detection (output side) — flag PII not present in retrieved context."""
from __future__ import annotations

import asyncio
from typing import Any

from src.guardian.agents.base import BaseAgent
from src.guardian.agents.pii_in import _ENTITY_SEVERITY, _get_engines
from src.guardian.schemas import AgentName, Severity


class PIIOutAgent(BaseAgent):
    name = AgentName.PII_OUT

    def __init__(self, *, timeout_ms: int = 300, enabled: bool = True) -> None:
        super().__init__(timeout_ms=timeout_ms, enabled=enabled)
        _get_engines()  # eager warmup so cold-start cost is paid outside the timeout window

    async def _evaluate(self, ctx: dict[str, Any]) -> tuple[Severity, float, dict[str, Any]]:
        output = ctx.get("output", "")
        if not output:
            return Severity.SAFE, 1.0, {}

        analyzer, _ = _get_engines()
        out_results = await asyncio.to_thread(analyzer.analyze, text=output, language="en")
        if not out_results:
            return Severity.SAFE, 0.97, {}

        ctx_text = " ".join(d.get("text", "") for d in ctx.get("retrieved_docs", []))
        leaked: dict[str, list[dict[str, Any]]] = {}
        max_sev = Severity.SAFE
        for r in out_results:
            entity_text = output[r.start : r.end]
            if entity_text in ctx_text:
                continue  # grounded in retrieved docs
            leaked.setdefault(r.entity_type, []).append(
                {"text": entity_text, "score": r.score, "start": r.start, "end": r.end}
            )
            sev = _ENTITY_SEVERITY.get(r.entity_type, Severity.WATCH)
            if sev > max_sev:
                max_sev = sev

        if not leaked:
            return Severity.SAFE, 0.95, {"pii_in_output_but_grounded": True}
        return max_sev, max(r.score for r in out_results), {"leaked_entities": leaked}
