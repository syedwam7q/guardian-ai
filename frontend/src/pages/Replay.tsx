import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlternativeActionSlider } from "@/components/replay/AlternativeActionSlider";
import { DecisionDetailCard } from "@/components/replay/DecisionDetailCard";
import {
  TimelineScrubber,
  type ReplayDot,
} from "@/components/replay/TimelineScrubber";
import { Skeleton } from "@/components/ui/skeleton";
import { REPLAY_DECISIONS } from "@/lib/mockReplay";

export default function Replay() {
  const [index, setIndex] = useState(REPLAY_DECISIONS.length - 1);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 300);
    return () => window.clearTimeout(id);
  }, []);

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
        {!mounted ? (
          <ReplaySkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
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
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ReplaySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 w-full lg:col-span-2" />
        <Skeleton className="h-96 w-full lg:col-span-1" />
      </div>
    </div>
  );
}
