"""3-stage governance pipeline orchestrator."""
from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from src.guardian.agents.base import BaseAgent
from src.guardian.agents.bias import BiasToxicityAgent
from src.guardian.agents.cost import CostPerformanceAgent
from src.guardian.agents.hallucination import HallucinationAgent
from src.guardian.agents.injection import PromptInjectionAgent
from src.guardian.agents.pii_in import PIIInAgent
from src.guardian.agents.pii_out import PIIOutAgent
from src.guardian.agents.policy import PolicyAgent
from src.guardian.causal.engine import CausalEngine
from src.guardian.decision import DecisionEngine
from src.guardian.persistence import TraceStore
from src.guardian.schemas import (
    Decision,
    GovernanceRequest,
    GovernanceResponse,
    Severity,
    Verdict,
    Violation,
)


class GovernancePipeline:
    def __init__(
        self,
        preflight_agents: list[BaseAgent],
        postflight_agents: list[BaseAgent],
        *,
        trace_store: TraceStore | None = None,
        causal_engine: CausalEngine | None = None,
        decision_engine: DecisionEngine | None = None,
    ) -> None:
        self.preflight = preflight_agents
        self.postflight = postflight_agents
        self.trace_store = trace_store
        self.causal_engine = causal_engine
        self.decision_engine = decision_engine

    @classmethod
    def default(
        cls,
        *,
        domain: str = "medical",
        trace_store: TraceStore | None = None,
        causal_engine: CausalEngine | None = None,
        decision_engine: DecisionEngine | None = None,
    ) -> GovernancePipeline:
        # Resolve policy_path relative to this file so the pipeline works regardless of CWD.
        # pipeline.py lives at backend/src/guardian/pipeline.py → parents[2] is backend/.
        policy_path = str(
            Path(__file__).resolve().parents[2] / "policies" / f"{domain}.yaml"
        )
        return cls(
            preflight_agents=[
                PromptInjectionAgent(timeout_ms=200),
                PIIInAgent(timeout_ms=300),
                PolicyAgent(policy_path=policy_path, timeout_ms=100),
            ],
            postflight_agents=[
                HallucinationAgent(timeout_ms=8000),
                BiasToxicityAgent(timeout_ms=5000),
                PIIOutAgent(timeout_ms=300),
                CostPerformanceAgent(timeout_ms=50),
            ],
            trace_store=trace_store,
            causal_engine=causal_engine,
            decision_engine=decision_engine,
        )

    async def _run_parallel(
        self, agents: list[BaseAgent], ctx: dict[str, Any]
    ) -> list[Verdict]:
        return await asyncio.gather(*(a.evaluate(ctx) for a in agents))

    async def run(
        self,
        *,
        request: GovernanceRequest,
        retrieved_docs: list[dict[str, Any]],
        prompt: str,
        output: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
    ) -> GovernanceResponse:
        start = time.perf_counter()
        trace_id = uuid4()

        # PRE-FLIGHT
        preflight_ctx = {"user_input": request.user_input, "domain": request.domain}
        pre_verdicts = await self._run_parallel(self.preflight, preflight_ctx)
        if any(v.severity == Severity.BLOCK for v in pre_verdicts):
            elapsed = (time.perf_counter() - start) * 1000
            resp = GovernanceResponse(
                trace_id=trace_id,
                final_output="[Blocked at pre-flight — see verdicts]",
                blocked=True,
                verdicts=list(pre_verdicts),
                violations=[
                    Violation(
                        agent=v.agent,
                        severity=v.severity,
                        summary=f"{v.agent.value} blocked input",
                        evidence=v.evidence,
                        confidence=v.confidence,
                    )
                    for v in pre_verdicts
                    if v.severity == Severity.BLOCK
                ],
                total_latency_ms=elapsed,
            )
            if self.trace_store is not None:
                await self.trace_store.record(
                    response=resp,
                    user_input=request.user_input,
                    session_id=request.session_id,
                )
            return resp

        # POST-FLIGHT
        postflight_ctx = {
            "output": output,
            "retrieved_docs": retrieved_docs,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": latency_ms,
        }
        post_verdicts = await self._run_parallel(self.postflight, postflight_ctx)

        violations = [
            Violation(
                agent=v.agent,
                severity=v.severity,
                summary=f"{v.agent.value} flagged",
                evidence=v.evidence,
                confidence=v.confidence,
            )
            for v in pre_verdicts + post_verdicts
            if v.severity > Severity.SAFE
        ]

        # Causal diagnosis (Phase 2): run when violations exist and engine is wired.
        decision: Decision | None = None
        causal_attribution: list[dict[str, Any]] = []

        if violations and self.causal_engine is not None:
            baseline_trace = {
                "model_params": {"temperature": 0.7, "top_p": 1.0},
                "model": model,
                "retrieved_docs": retrieved_docs,
                "user_input": request.user_input,
            }
            worst_violation = max(violations, key=lambda v: v.severity)
            diag = await self.causal_engine.diagnose(
                baseline_trace=baseline_trace,
                baseline_violation_score=worst_violation.confidence,
                violation_summary=f"{worst_violation.agent.value}: {worst_violation.summary}",
            )
            causal_attribution = [
                {
                    "node": ce.node,
                    "effect": ce.effect,
                    "ci_low": ce.ci_low,
                    "ci_high": ce.ci_high,
                    "n_samples": ce.n_samples,
                }
                for ce in diag.ranked_causes
            ]

        if violations and self.decision_engine is not None:
            decision = await self.decision_engine.decide(
                violations=violations,
                causal_attribution=causal_attribution,
                similar_past=[],  # Decision Memory deferred to Phase 3+
            )

        elapsed = (time.perf_counter() - start) * 1000
        resp = GovernanceResponse(
            trace_id=trace_id,
            final_output=output,
            blocked=False,
            verdicts=list(pre_verdicts) + list(post_verdicts),
            violations=violations,
            decision=decision,
            total_latency_ms=elapsed,
        )
        if self.trace_store is not None:
            await self.trace_store.record(
                response=resp,
                user_input=request.user_input,
                session_id=request.session_id,
            )
        return resp

    async def run_preflight(
        self, *, user_input: str, domain: str = "medical"
    ) -> tuple[bool, list[Verdict], UUID]:
        """Run pre-flight stage only. Returns (blocked, pre_verdicts, trace_id)."""
        trace_id = uuid4()
        preflight_ctx = {"user_input": user_input, "domain": domain}
        pre_verdicts = await self._run_parallel(self.preflight, preflight_ctx)
        blocked = any(v.severity == Severity.BLOCK for v in pre_verdicts)
        return blocked, list(pre_verdicts), trace_id

    async def run_postflight(
        self,
        *,
        output: str,
        retrieved_docs: list[dict[str, Any]],
        model: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        latency_ms: float = 0.0,
        pre_verdicts: list[Verdict] | None = None,
    ) -> tuple[list[Verdict], list[Violation], Decision | None]:
        """Run post-flight + optional causal + optional decision.

        ``pre_verdicts`` (if supplied) is folded into the violations list so the
        decision engine sees the full picture.
        """
        postflight_ctx = {
            "output": output,
            "retrieved_docs": retrieved_docs,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": latency_ms,
        }
        post_verdicts = await self._run_parallel(self.postflight, postflight_ctx)

        all_verdicts: list[Verdict] = list(pre_verdicts or []) + list(post_verdicts)
        violations = [
            Violation(
                agent=v.agent,
                severity=v.severity,
                summary=f"{v.agent.value} flagged",
                evidence=v.evidence,
                confidence=v.confidence,
            )
            for v in all_verdicts
            if v.severity > Severity.SAFE
        ]

        causal_attribution: list[dict[str, Any]] = []
        decision: Decision | None = None
        if violations and self.causal_engine is not None:
            worst = max(violations, key=lambda v: v.severity)
            diag = await self.causal_engine.diagnose(
                baseline_trace={
                    "model_params": {"temperature": 0.7, "top_p": 1.0},
                    "model": model,
                    "retrieved_docs": retrieved_docs,
                },
                baseline_violation_score=worst.confidence,
                violation_summary=f"{worst.agent.value}: {worst.summary}",
            )
            causal_attribution = [
                {
                    "node": ce.node,
                    "effect": ce.effect,
                    "ci_low": ce.ci_low,
                    "ci_high": ce.ci_high,
                    "n_samples": ce.n_samples,
                }
                for ce in diag.ranked_causes
            ]
        if violations and self.decision_engine is not None:
            decision = await self.decision_engine.decide(
                violations=violations,
                causal_attribution=causal_attribution,
                similar_past=[],
            )
        return list(post_verdicts), violations, decision
