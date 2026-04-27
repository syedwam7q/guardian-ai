import { AblationCard } from "@/components/eval/AblationCard";
import { BenchmarkScoreboard } from "@/components/eval/BenchmarkScoreboard";
import { LatencyBudgetChart } from "@/components/eval/LatencyBudgetChart";
import { RunPanel } from "@/components/eval/RunPanel";

export default function EvalBench() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border-subtle bg-bg-surface px-8 py-5">
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

      <div className="flex-1 overflow-y-auto p-8">
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
