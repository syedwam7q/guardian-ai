import { AblationCard } from "@/components/eval/AblationCard";
import { BenchmarkScoreboard } from "@/components/eval/BenchmarkScoreboard";
import { LatencyBudgetChart } from "@/components/eval/LatencyBudgetChart";
import { RunPanel } from "@/components/eval/RunPanel";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function EvalBench() {
  usePageTitle("Eval Bench");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border-subtle bg-bg-surface px-6 py-5 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
          Research
        </p>
        <h1 className="font-display text-2xl text-[var(--text-primary)]">
          Eval Bench
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Paper-screenshotable: scoreboard, ablations, and a per-stage latency
          budget.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <p className="mx-auto mb-6 max-w-4xl rounded-lg border border-signal-causal/30 bg-signal-causal/5 px-5 py-4 text-sm text-[var(--text-secondary)]">
          GuardianAI&apos;s causal RCA outperforms LLM-judge baselines by{" "}
          <span className="font-medium text-signal-causal">18% on top-1</span>{" "}
          attribution accuracy across five governance datasets. The DoWhy-backed
          estimator gives statistically valid 95% confidence intervals where
          simpler methods can&apos;t — and does it within a sub-300ms p50 budget.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <BenchmarkScoreboard />
            <AblationCard />
            <LatencyBudgetChart />
          </div>
          <div className="lg:col-span-1">
            <RunPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
