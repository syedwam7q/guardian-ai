"""Per-request cost and latency governance."""

from __future__ import annotations

from typing import Any

from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import AgentName, Severity

# Pricing per 1M tokens (input, output) in USD — keep up to date.
_PRICING = {
    "groq/llama-3.3-70b": (0.59, 0.79),
    "groq/llama-3.1-70b": (0.59, 0.79),
    "groq/llama-guard-3-1b": (0.06, 0.06),
    "anthropic/claude-haiku-3-5": (0.80, 4.00),
    "openai/gpt-4o-mini": (0.15, 0.60),
}


class CostPerformanceAgent(BaseAgent):
    name = AgentName.COST

    def __init__(
        self,
        *,
        per_request_budget_usd: float = 0.05,
        latency_p95_budget_ms: float = 2000.0,
        timeout_ms: int = 50,
        enabled: bool = True,
    ) -> None:
        super().__init__(timeout_ms=timeout_ms, enabled=enabled)
        self.budget = per_request_budget_usd
        self.latency_budget = latency_p95_budget_ms

    @staticmethod
    def _cost(model: str, in_t: int, out_t: int) -> float:
        in_p, out_p = _PRICING.get(model, (1.0, 1.0))
        return (in_t / 1_000_000) * in_p + (out_t / 1_000_000) * out_p

    async def _evaluate(self, ctx: dict[str, Any]) -> tuple[Severity, float, dict[str, Any]]:
        in_t = ctx.get("input_tokens", 0)
        out_t = ctx.get("output_tokens", 0)
        model = ctx.get("model", "unknown")
        latency = ctx.get("latency_ms", 0.0)

        cost = self._cost(model, in_t, out_t)
        cost_breach = cost > self.budget
        latency_breach = latency > self.latency_budget

        if not cost_breach and not latency_breach:
            return Severity.SAFE, 0.99, {
                "cost_usd": cost,
                "latency_ms": latency,
                "input_tokens": in_t,
                "output_tokens": out_t,
                "model": model,
            }

        evidence: dict[str, Any] = {
            "cost_usd": cost,
            "latency_ms": latency,
            "cost_budget_usd": self.budget,
            "latency_budget_ms": self.latency_budget,
            "input_tokens": in_t,
            "output_tokens": out_t,
            "model": model,
        }
        if cost_breach and latency_breach:
            return Severity.WARN, 0.9, evidence
        return Severity.WATCH, 0.85, evidence
