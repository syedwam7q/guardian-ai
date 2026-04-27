"""Base agent contract — timing, error handling, verdict shape."""

import asyncio

import pytest

from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import AgentName, Severity, Verdict


class _FakeAgent(BaseAgent):
    name = AgentName.HALLUCINATION

    async def _evaluate(self, ctx):
        await asyncio.sleep(0.01)
        return Severity.SAFE, 0.99, {}


class _SlowAgent(BaseAgent):
    name = AgentName.HALLUCINATION

    async def _evaluate(self, ctx):
        await asyncio.sleep(2.0)
        return Severity.SAFE, 0.99, {}


class _FailingAgent(BaseAgent):
    name = AgentName.HALLUCINATION

    async def _evaluate(self, ctx):
        raise RuntimeError("boom")


@pytest.mark.asyncio
async def test_agent_evaluate_returns_verdict_with_latency():
    agent = _FakeAgent(timeout_ms=500)
    verdict = await agent.evaluate({"output": "hi"})
    assert isinstance(verdict, Verdict)
    assert verdict.agent == AgentName.HALLUCINATION
    assert verdict.severity == Severity.SAFE
    assert verdict.latency_ms > 0


@pytest.mark.asyncio
async def test_agent_timeout_returns_warn():
    agent = _SlowAgent(timeout_ms=50)
    verdict = await agent.evaluate({"output": "hi"})
    assert verdict.severity == Severity.WATCH
    assert "timeout" in verdict.evidence


@pytest.mark.asyncio
async def test_agent_exception_returns_warn_not_raise():
    agent = _FailingAgent(timeout_ms=500)
    verdict = await agent.evaluate({"output": "hi"})
    assert verdict.severity == Severity.WATCH
    assert "error" in verdict.evidence
