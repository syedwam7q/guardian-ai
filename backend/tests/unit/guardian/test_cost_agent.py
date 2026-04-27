import pytest

from src.guardian.agents.cost import CostPerformanceAgent
from src.guardian.schemas import Severity


@pytest.mark.asyncio
async def test_within_budget_safe():
    agent = CostPerformanceAgent(per_request_budget_usd=0.05, latency_p95_budget_ms=2000)
    v = await agent.evaluate({
        "input_tokens": 100, "output_tokens": 200,
        "model": "groq/llama-3.3-70b", "latency_ms": 800,
    })
    assert v.severity == Severity.SAFE


@pytest.mark.asyncio
async def test_over_cost_budget_warns():
    agent = CostPerformanceAgent(per_request_budget_usd=0.001)
    v = await agent.evaluate({
        "input_tokens": 5000, "output_tokens": 5000,
        "model": "groq/llama-3.3-70b", "latency_ms": 800,
    })
    assert v.severity >= Severity.WATCH


@pytest.mark.asyncio
async def test_latency_breach_warns():
    agent = CostPerformanceAgent(latency_p95_budget_ms=500)
    v = await agent.evaluate({
        "input_tokens": 100, "output_tokens": 200,
        "model": "groq/llama-3.3-70b", "latency_ms": 3000,
    })
    assert v.severity >= Severity.WATCH
