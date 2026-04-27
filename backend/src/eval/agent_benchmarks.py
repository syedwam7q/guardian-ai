"""Run a single agent against a benchmark dataset.

Computes precision/recall/F1 by running the agent against each
:class:`EvalCase` and comparing the verdict to the ground truth.
"""
from __future__ import annotations

import argparse
import asyncio
import importlib
from collections.abc import Iterable
from pathlib import Path

from src.eval.schemas import EvalCase, EvalMetrics
from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import Severity

_DATASET_LOADERS = {
    "halueval": "src.eval.datasets.halueval:load_fixture",
    "factscore": "src.eval.datasets.factscore:load_fixture",
    "ragtruth": "src.eval.datasets.ragtruth:load_fixture",
    "bbq": "src.eval.datasets.bbq:load_fixture",
    "advbench": "src.eval.datasets.advbench:load_fixture",
    "medhelm": "src.eval.datasets.medhelm:load_fixture",
    "pubmedqa": "src.eval.datasets.pubmedqa:load_fixture",
}


def load_dataset(name: str) -> Iterable[EvalCase]:
    """Resolve and call the named dataset's ``load_fixture()`` generator."""
    target = _DATASET_LOADERS[name]
    module_path, attr = target.split(":")
    module = importlib.import_module(module_path)
    return getattr(module, attr)()


def _build_agent(agent_name: str) -> BaseAgent:
    """Construct the named agent. Used by the CLI; tests inject directly."""
    if agent_name == "hallucination":
        from src.guardian.agents.hallucination import HallucinationAgent

        return HallucinationAgent(timeout_ms=10000)
    if agent_name == "bias":
        from src.guardian.agents.bias import BiasToxicityAgent

        return BiasToxicityAgent(timeout_ms=10000)
    if agent_name == "pii_in":
        from src.guardian.agents.pii_in import PIIInAgent

        return PIIInAgent()
    if agent_name == "pii_out":
        from src.guardian.agents.pii_out import PIIOutAgent

        return PIIOutAgent()
    if agent_name == "prompt_injection":
        from src.guardian.agents.injection import PromptInjectionAgent

        return PromptInjectionAgent()
    if agent_name == "policy":
        from src.guardian.agents.policy import PolicyAgent

        policy_path = str(
            Path(__file__).resolve().parents[2] / "policies" / "medical.yaml"
        )
        return PolicyAgent(policy_path=policy_path)
    raise ValueError(f"Unknown agent: {agent_name}")


async def run_agent_benchmark(
    *,
    agent: BaseAgent,
    dataset_name: str,
    cases: Iterable[EvalCase] | None = None,
) -> EvalMetrics:
    """Run one agent against a dataset; return precision/recall/F1."""
    metrics = EvalMetrics(dataset=dataset_name, agent=agent.name.value, n=0)
    case_iter = cases if cases is not None else load_dataset(dataset_name)
    for case in case_iter:
        metrics.n += 1
        ctx = {
            "user_input": case.query,
            "output": case.output,
            "retrieved_docs": [{"text": c} for c in case.retrieved_context],
        }
        verdict = await agent.evaluate(ctx)
        truth_violation = case.expected_violation_severity not in (
            None,
            Severity.SAFE,
        )
        pred_violation = verdict.severity > Severity.SAFE
        if truth_violation and pred_violation:
            metrics.true_positive += 1
        elif not truth_violation and pred_violation:
            metrics.false_positive += 1
        elif not truth_violation and not pred_violation:
            metrics.true_negative += 1
        elif truth_violation and not pred_violation:
            metrics.false_negative += 1
    return metrics


def _cli() -> None:
    parser = argparse.ArgumentParser(prog="agent-benchmarks")
    parser.add_argument("--agent", required=True)
    parser.add_argument(
        "--dataset", required=True, choices=list(_DATASET_LOADERS)
    )
    args = parser.parse_args()
    agent = _build_agent(args.agent)
    metrics = asyncio.run(
        run_agent_benchmark(agent=agent, dataset_name=args.dataset)
    )
    print(
        f"{args.agent} x {args.dataset}: n={metrics.n} "
        f"precision={metrics.precision:.3f} recall={metrics.recall:.3f} "
        f"f1={metrics.f1:.3f}"
    )


if __name__ == "__main__":
    _cli()
