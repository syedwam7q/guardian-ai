"""Causal Diagnosis Engine — coordinates intervention sweep + ranking."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

from src.guardian.causal.dag_schema import LLMPipelineDAG
from src.guardian.causal.estimation import CausalEffect, estimate_effect
from src.guardian.causal.executor import CounterfactualExecutor
from src.guardian.causal.intervention import standard_plans


@dataclass
class CausalDiagnosis:
    violation_summary: str
    baseline_violation_score: float
    ranked_causes: list[CausalEffect]
    counterfactual_results: dict[str, Any]


class CausalEngine:
    def __init__(
        self,
        executor: CounterfactualExecutor,
        dag: LLMPipelineDAG | None = None,
        n_samples_per_intervention: int = 3,
    ) -> None:
        self.executor = executor
        self.dag = dag or LLMPipelineDAG.standard()
        self.n_samples = n_samples_per_intervention

    async def diagnose(
        self,
        *,
        baseline_trace: dict[str, Any],
        baseline_violation_score: float,
        violation_summary: str,
    ) -> CausalDiagnosis:
        plans = standard_plans(baseline_trace)
        per_node_results: dict[str, list[float]] = {p.node: [] for p in plans}
        cf_results: dict[str, list] = {}

        sem = asyncio.Semaphore(4)

        async def _run(plan, intervention):
            async with sem:
                return plan.node, await self.executor.execute(baseline_trace, intervention)

        tasks = []
        for plan in plans:
            for iv in plan.interventions():
                for _ in range(self.n_samples):
                    tasks.append(_run(plan, iv))
        results = await asyncio.gather(*tasks)

        for node, cf_result in results:
            per_node_results[node].append(cf_result.violation_score)
            cf_results.setdefault(node, []).append({
                "intervention": cf_result.intervention.delta_summary(),
                "score": cf_result.violation_score,
                "output_preview": cf_result.output[:200],
            })

        effects = []
        for plan in plans:
            scores = per_node_results.get(plan.node, [])
            e = estimate_effect(
                node=plan.node,
                baseline_violation_score=baseline_violation_score,
                counterfactual_scores=scores,
            )
            effects.append(e)
        effects.sort(key=lambda e: abs(e.effect), reverse=True)

        return CausalDiagnosis(
            violation_summary=violation_summary,
            baseline_violation_score=baseline_violation_score,
            ranked_causes=effects,
            counterfactual_results=cf_results,
        )
