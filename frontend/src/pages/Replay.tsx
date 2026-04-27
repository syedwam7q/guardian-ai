import { useMemo, useState } from "react";
import { AlternativeActionSlider } from "@/components/replay/AlternativeActionSlider";
import { DecisionDetailCard } from "@/components/replay/DecisionDetailCard";
import {
  TimelineScrubber,
  type ReplayDot,
} from "@/components/replay/TimelineScrubber";
import { REPLAY_DECISIONS } from "@/lib/mockReplay";

export default function Replay() {
  const [index, setIndex] = useState(REPLAY_DECISIONS.length - 1);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");

  const dots: ReplayDot[] = useMemo(() => {
    const n = REPLAY_DECISIONS.length;
    return REPLAY_DECISIONS.map((d, i) => ({
      id: d.trace_id,
      severity: d.severity,
      t: n === 1 ? 0.5 : i / (n - 1),
    }));
  }, []);

  const decision = REPLAY_DECISIONS[index];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border-subtle bg-bg-surface px-8 py-5">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
          Audit
        </p>
        <h1 className="font-display text-2xl text-[var(--text-primary)]">
          Decision Replay
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Walk through past decisions, see why each path was chosen, and ask
          counterfactual questions.
        </p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-8">
        <TimelineScrubber
          dots={dots}
          index={index}
          onScrub={setIndex}
          range={range}
          onRangeChange={setRange}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DecisionDetailCard decision={decision} />
          </div>
          <div className="lg:col-span-1">
            <AlternativeActionSlider decision={decision} />
          </div>
        </div>
      </div>
    </div>
  );
}
