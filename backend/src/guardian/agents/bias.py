"""Bias and toxicity detection using Detoxify."""
from __future__ import annotations

import asyncio
from functools import cache
from typing import Any

from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import AgentName, Severity


@cache
def _get_detoxify():
    from detoxify import Detoxify
    return Detoxify("unbiased")


_THRESHOLDS = {
    "toxicity": 0.6,
    "severe_toxicity": 0.4,
    "obscene": 0.6,
    "identity_attack": 0.5,
    "insult": 0.6,
    "threat": 0.4,
}


class BiasToxicityAgent(BaseAgent):
    name = AgentName.BIAS

    def __init__(self, *, timeout_ms: int = 5000, enabled: bool = True) -> None:
        super().__init__(timeout_ms=timeout_ms, enabled=enabled)
        _get_detoxify()  # eager warmup so cold-start cost is paid outside the timeout window

    async def _evaluate(self, ctx: dict[str, Any]) -> tuple[Severity, float, dict[str, Any]]:
        output = ctx.get("output", "")
        if not output:
            return Severity.SAFE, 1.0, {}

        detoxify_model = _get_detoxify()
        scores = await asyncio.to_thread(detoxify_model.predict, output)
        breached = {k: float(v) for k, v in scores.items() if float(v) > _THRESHOLDS.get(k, 1.0)}

        if not breached:
            return Severity.SAFE, 0.95, {"toxicity_scores": {k: float(v) for k, v in scores.items()}}

        max_score = max(breached.values())
        if max_score > 0.85:
            severity = Severity.BLOCK
        elif max_score > 0.7:
            severity = Severity.WARN
        else:
            severity = Severity.WATCH

        return severity, max_score, {
            "toxicity_scores": {k: float(v) for k, v in scores.items()},
            "breached": breached,
        }
